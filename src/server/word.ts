import { CSKey, ENV, RequestBody, RequestBodyContentType, Detail } from "../types.d.js"
import { genDeleteSQL, getRes, cloneDetail, genInsertSQL2, getSyncData, getLatestTime, getValue, getJSONResponse, getEmptyRes, getInternalErrorRes } from "./server-utils.js";
import genDetail from "./ai.js"

type DBResultType<T> = {
    success: boolean,
    results: T[],
    meta: {
        changes: number,
    },
}

async function _getDetail(word: string, env: ENV): Promise<DBResultType<Detail>> {
    const result = await env.DB
        .prepare(`
            SELECT
                word,
                ipa,
                meaning,
                level,
                note,
                links,
                time_create,
                time_modify,
                tags
            FROM dictionary
            WHERE word = ?
        `)
        .bind(word)
        .all()
    return result;
}

async function _updateWordListOfLetter(env: ENV, word: string, add: boolean): Promise<boolean> {
    const normalizedWord = word.toLowerCase();
    const letter = normalizedWord[0];

    const row = await env.DB.prepare(`
        SELECT words
        FROM wordlist
        WHERE letter = ?`
    ).bind(letter).first();

    if (!row) {
        return false;
    }

    let wordsArray: string[] = JSON.parse(row.words);

    if (add) {
        if (wordsArray.includes(normalizedWord)) {
            return true;
        }
        wordsArray.push(normalizedWord);
    } else {
        if (!wordsArray.includes(normalizedWord)) {
            return true;
        }
        wordsArray = wordsArray.filter(w => normalizedWord !== w);
    }

    await env.DB.prepare(`
        UPDATE wordlist
        SET words = ?
        WHERE letter = ?`
    ).bind(JSON.stringify(wordsArray), letter).run();

    return true;
}


async function getWordList(data: RequestBody<"getWordList">, env: ENV): Promise<Response> {
    const result = await env.DB
        .prepare(`
            SELECT *
            FROM wordlist
        `)
        .all()

    let list: string[] = [];
    if (result.success) {
        //@ts-ignore;
        result.results?.map(({ words }) => JSON.parse(words)).forEach(wordArray => {
            list.push(...wordArray);
        });

        return getRes<"getWordList">("Succeeded.", { list });
    } else {
        return getInternalErrorRes<"getWordList">("Reading DB failed.");
    }
}

async function getDetail(data: RequestBody<"getDetail">, env: ENV): Promise<Response> {
    const word = data.content.word;
    const result = await _getDetail(word, env);
    if (result.success) {
        if (result.results.length > 0) {
            const d = result.results[0];
            return getRes<"getDetail">("Succeeded.", {
                detail: d,
                word,
                success: true,
            });
        }
    }
    const d = await genDetail(data.content.aiProvider, data.content.apiKey, word);
    if (d.success) {
        await genInsertSQL2(d.detail, d.detail.time_modify, d.detail.time_modify, env).run();
        await _updateWordListOfLetter(env, word, true);
    }

    return getRes<"getDetail">("Succeeded.", {
        detail: d.detail,
        word,
        success: d.success,
    });
}

async function deleteWord(data: RequestBody<"deleteWord">, env: ENV): Promise<Response> {
    const detail = data.content.detail;
    const word: string = detail.word;

    const result = await genDeleteSQL(detail, env).run() as DBResultType<undefined>;
    if (!result.success) {
        return getEmptyRes(`delete word (${word}) failed.`);
    }

    if (result.meta.changes > 0) {
        await _updateWordListOfLetter(env, word, false);
        return getRes<"deleteWord">("Succeeded.", {
            word,
            clientDetail: detail,
            success: true,
        });
    } else {
        const _d = await _getDetail(detail.word, env) as DBResultType<Detail>;
        if (!_d.success) {
            return getInternalErrorRes<"deleteWord">(`delete word (${detail.word}) failed..`);
        }

        const _newestDetail: Detail = _d.results[0];
        return getRes<"deleteWord">("Succeeded.", {
            word,
            clientDetail: detail,
            serverDetail: _newestDetail,
            success: false,
        });
    }
}

async function putDetail(data: RequestBody<"putDetail">, env: ENV): Promise<Response> {
    const detail = data.content.detail;
    const syncTime: number = Date.now();
    const word: string = detail.word;

    const result = await genInsertSQL2(detail, detail.time_modify, syncTime, env).all() as DBResultType<undefined>;
    if (!result.success) {
        return getInternalErrorRes<"putDetail">(`put word (${word}) failed.`);
    }

    // Valid request, but database rejected the update
    // because the incoming version/timestamp was older
    const _d = await _getDetail(word, env) as DBResultType<Detail>;
    if (!_d.success) {
        return getInternalErrorRes<"putDetail">(`get detail of '${word}' failed.`);
    }

    const _newestDetail: Detail = _d.results[0];
    if (_newestDetail.time_modify === syncTime) {
        if (_newestDetail.time_modify === _newestDetail.time_create) {
            await _updateWordListOfLetter(env, word, true);
        }
        return getRes<"putDetail">("Succeeded.", {
            word,
            serverDetail: _newestDetail,
            clientDetail: detail,
            success: true,
        });
    } else {
        return getRes<"putDetail">("Failed.", {
            word,
            serverDetail: _newestDetail,
            clientDetail: detail,
            success: false,
        });
    }
}

/*
function _runMarkSQL(time: number, wordArr: string[], action: number, env: ENV): any {
    env.DB.prepare(`
        INSERT INTO synchronizer ( time_sync, words, action)
        VALUES (?,?,?)`
    ).bind(time, wordArr.join(','), action)
        .run();
}
*/

export default async function respond<T extends CSKey>(request: Request, data: RequestBody<T>, env: ENV): Promise<Response> {
    if (data.requestType === "getDetail") {
        return getDetail(data as RequestBody<"getDetail">, env);
    } else if (data.requestType === "getWordList") {
        return getWordList(data as RequestBody<"getWordList">, env);
    } else if (data.requestType === "putDetail") {
        return putDetail(data as RequestBody<"putDetail">, env);
    } else if (data.requestType === "deleteWord") {
        return deleteWord(data as RequestBody<"deleteWord">, env);
    }
    return getEmptyRes('POST');
}


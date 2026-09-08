import { RequestType, ResponseBody, RequestBody, ResponseData, RequestData, CSType, SyncRecordType, ResponseBodyContentType, RequestBodyContentType, Detail } from "../types.d.js"
import { genDeleteSQL, cloneDetail, genInsertSQL2, getSyncData, getLatestTime, getValue, getJSONResponse, getEmptyRes, getInternalErrorRes } from "./server-utils.js";
import genDetail from "./ai.js"

type DBResultType<T> = {
    success: boolean,
    results: T[],
    meta: {
        changes: number,
    },
}

async function _getDetail(word: string, env: any): Promise<DBResultType<Detail>> {
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

async function _getWordList(env: any): Promise<DBResultType<Detail>> {
    const result = await env.DB
        .prepare(`
            SELECT word
            FROM dictionary
        `)
        .all()

    return result;
}

let _time_sync_wordlist: number = -1;
let _wordlist: string[] = [];

async function getWordList(data: RequestBody<"getWordList">, env: any): Promise<Response> {
    if (data.syncTime < _time_sync_wordlist) {
        return getJSONResponse<"getWordList">({
            info: "Succeeded.",
            syncTime: _time_sync_wordlist,
            content: {
                list: _wordlist,
            },
        });
    } else {
        return getJSONResponse<"getWordList">({
            info: "your word list is already up to date.",
            syncTime: _time_sync_wordlist,
            content: {},
        });
    }
}

async function syncWordlist(env: any): Promise<void> {
    const detail = await _getWordList(env);
    if (detail.success) {
        _wordlist = detail.results?.map(({ word }) => word) as string[];
        _time_sync_wordlist = Date.now();
    }
}

async function getDetail(data: RequestBody<"getDetail">, env: any): Promise<Response> {
    const word = data.content.word;
    const result = await _getDetail(word, env);
    if (result.success) {
        if (result.results.length > 0) {
            const d = result.results[0];
            return getJSONResponse<"getDetail">({
                info: "Succeeded.",
                content: d
            });
        } else {
            const d = await genDetail(data.content.aiProvider, data.content.apiKey, word);
            if (d) {
                await genInsertSQL2(d, d.time_modify, d.time_modify, env).all() as DBResultType<undefined>;
                return getJSONResponse<"getDetail">({
                    info: "Succeeded.",
                    content: d
                });
            } else {
                return getEmptyRes(`No such word: ${word}.`);
            }
        }
    } else {
        return getEmptyRes(`No such word: ${word}.`);
    }
}

async function deleteWord(data: RequestBody<"deleteWord">, env: any): Promise<Response> {
    const detail = data.content.detail;
    const word: string = detail.word;

    const result = await genDeleteSQL(detail, env).run() as DBResultType<undefined>;
    if (!result.success) {
        return getEmptyRes(`delete word (${word}) failed.`);
    }

    if (result.meta.changes > 0) {
        const _index = _wordlist.indexOf(word)
        if (_index !== -1) {
            _wordlist.splice(_index, 1);
            _time_sync_wordlist = Date.now();
        }
        return getJSONResponse<"deleteWord">({
            info: "Succeeded.",
            content: {
                word,
                clientDetail: detail,
                success: true,
            }
        });
    } else {
        const _d = await _getDetail(detail.word, env) as DBResultType<Detail>;
        if (!_d.success) {
            return getEmptyRes(`delete word (${detail.word}) failed..`);
        }

        const _newestDetail: Detail = _d.results[0];
        return getJSONResponse<"deleteWord">({
            info: "Succeeded.",
            content: {
                word,
                clientDetail: detail,
                serverDetail: _newestDetail,
                success: false,
            }
        });
    }
}

async function putDetail(data: RequestBody<"putDetail">, env: any): Promise<Response> {
    const detail = data.content.detail;
    const syncTime: number = Date.now();
    const word: string = detail.word;

    const result = await genInsertSQL2(detail, detail.time_modify, syncTime, env).all() as DBResultType<undefined>;
    if (!result.success) {
        return getEmptyRes(`put word (${word}) failed.`);
    }

    // Valid request, but database rejected the update
    // because the incoming version/timestamp was older
    const _d = await _getDetail(word, env) as DBResultType<Detail>;
    if (!_d.success) {
        return getEmptyRes(`put word (${word}) failed..`);
    }

    const _newestDetail: Detail = _d.results[0];
    if (_newestDetail.time_modify === syncTime) {
        _wordlist.push(word);
        _time_sync_wordlist = Date.now();
        return getJSONResponse<"putDetail">({
            info: "Succeeded.",
            content: {
                word,
                serverDetail: _newestDetail,
                clientDetail: detail,
                success: true,
            }
        });
    } else {
        return getJSONResponse<"putDetail">({
            info: "Failed.",
            content: {
                word,
                serverDetail: _newestDetail,
                clientDetail: detail,
                success: false,
            }
        });
    }
}

/*
function _runMarkSQL(time: number, wordArr: string[], action: number, env: any): any {
    env.DB.prepare(`
        INSERT INTO synchronizer ( time_sync, words, action)
        VALUES (?,?,?)`
    ).bind(time, wordArr.join(','), action)
        .run();
}
*/

export default async function respond(request: Request, data: RequestBodyContentType<any>, env: any): Promise<Response> {
    if (_time_sync_wordlist === -1) {
        await syncWordlist(env);
    }
    if (data.requestType === "getDetail") {
        return getDetail(data, env);
    } else if (data.requestType === "getWordList") {
        return getWordList(data, env);
    } else if (data.requestType === "putDetail") {
        return putDetail(data, env);
    } else if (data.requestType === "deleteWord") {
        return deleteWord(data, env);
    }
    return getEmptyRes('POST');
}


import { genDeleteSQL, genInsertSQL2, getJSONResponse, getEmptyRes } from "./server-utils.js";
import genDetail from "./ai.js";
async function _getDetail(word, env) {
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
        .all();
    return result;
}
async function getWordList(data, env) {
    const result = await env.DB
        .prepare(`
            SELECT *
            FROM wordlist
        `)
        .all();
    let list = [];
    if (result.success) {
        //@ts-ignore;
        result.results?.map(({ words }) => words).forEach(words => {
            if (words.length > 0) {
                list.concat(...words.split(','));
            }
        });
    }
    return getJSONResponse({
        info: "Succeeded.",
        syncTime: -1,
        content: {
            list,
        },
    });
}
async function getDetail(data, env) {
    const word = data.content.word;
    const result = await _getDetail(word, env);
    if (result.success) {
        if (result.results.length > 0) {
            const d = result.results[0];
            return getJSONResponse({
                info: "Succeeded.",
                content: {
                    detail: d,
                    word,
                    success: true,
                }
            });
        }
    }
    const d = await genDetail(data.content.aiProvider, data.content.apiKey, word);
    if (d.success) {
        await genInsertSQL2(d.detail, d.detail.time_modify, d.detail.time_modify, env).all();
    }
    return getJSONResponse({
        info: "Succeeded.",
        content: {
            detail: d.detail,
            word,
            success: d.success,
        }
    });
}
async function deleteWord(data, env) {
    const detail = data.content.detail;
    const word = detail.word;
    const result = await genDeleteSQL(detail, env).run();
    if (!result.success) {
        return getEmptyRes(`delete word (${word}) failed.`);
    }
    if (result.meta.changes > 0) {
        return getJSONResponse({
            info: "Succeeded.",
            content: {
                word,
                clientDetail: detail,
                success: true,
            }
        });
    }
    else {
        const _d = await _getDetail(detail.word, env);
        if (!_d.success) {
            return getEmptyRes(`delete word (${detail.word}) failed..`);
        }
        const _newestDetail = _d.results[0];
        return getJSONResponse({
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
async function putDetail(data, env) {
    const detail = data.content.detail;
    const syncTime = Date.now();
    const word = detail.word;
    const result = await genInsertSQL2(detail, detail.time_modify, syncTime, env).all();
    if (!result.success) {
        return getEmptyRes(`put word (${word}) failed.`);
    }
    // Valid request, but database rejected the update
    // because the incoming version/timestamp was older
    const _d = await _getDetail(word, env);
    if (!_d.success) {
        return getEmptyRes(`put word (${word}) failed..`);
    }
    const _newestDetail = _d.results[0];
    if (_newestDetail.time_modify === syncTime) {
        return getJSONResponse({
            info: "Succeeded.",
            content: {
                word,
                serverDetail: _newestDetail,
                clientDetail: detail,
                success: true,
            }
        });
    }
    else {
        return getJSONResponse({
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
function _runMarkSQL(time: number, wordArr: string[], action: number, env: ENV): any {
    env.DB.prepare(`
        INSERT INTO synchronizer ( time_sync, words, action)
        VALUES (?,?,?)`
    ).bind(time, wordArr.join(','), action)
        .run();
}
*/
export default async function respond(request, data, env) {
    if (data.requestType === "getDetail") {
        return getDetail(data, env);
    }
    else if (data.requestType === "getWordList") {
        return getWordList(data, env);
    }
    else if (data.requestType === "putDetail") {
        return putDetail(data, env);
    }
    else if (data.requestType === "deleteWord") {
        return deleteWord(data, env);
    }
    return getEmptyRes('POST');
}

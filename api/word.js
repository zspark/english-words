import { genInsertSQL2, getJSONResponse, getEmptyRes, getInternalErrorRes } from "./server-utils.js";
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
async function _getWordList(env) {
    const result = await env.DB
        .prepare(`
            SELECT word
            FROM dictionary
        `)
        .all();
    return result;
}
async function getWordList(data, env) {
    const detail = await _getWordList(env);
    if (detail.success) {
        const content = detail.results?.map(({ word }) => word);
        return getJSONResponse({
            info: "Succeeded.",
            content,
        });
    }
    else {
        return getInternalErrorRes(`Internal Error: get word list failed.`);
    }
}
async function getDetail(data, env) {
    const detail = await _getDetail(data.content.word, env);
    if (detail.success) {
        const d = detail.results[0];
        return getJSONResponse({
            info: "Succeeded.",
            content: d
        });
    }
    else {
        return getEmptyRes(`No such word: ${data.content.word}.`);
    }
}
async function putDetail(data, env) {
    const detail = data.content.detail;
    const syncTime = Date.now();
    const result = await genInsertSQL2(detail, syncTime, env).all();
    if (!result.success) {
        return getEmptyRes(`put word (${detail.word}) failed.`);
    }
    // Valid request, but database rejected the update
    // because the incoming version/timestamp was older
    const _d = await _getDetail(detail.word, env);
    if (!_d.success) {
        return getEmptyRes(`put word (${detail.word}) failed..`);
    }
    const _newestDetail = _d.results[0];
    if (_newestDetail.time_modify === syncTime) {
        return getJSONResponse({
            info: "Succeeded.",
            content: {
                detail: _newestDetail,
                success: true,
            }
        });
    }
    else {
        return getJSONResponse({
            info: "Failed.",
            content: {
                detail: _newestDetail,
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
export default async function respond(request, data, env) {
    if (data.requestType === "wordDetail") {
        return getDetail(data, env);
    }
    else if (data.requestType === "wordList") {
        return getWordList(data, env);
    }
    else if (data.requestType === "putDetail") {
        return putDetail(data, env);
    }
    return getEmptyRes('POST');
}

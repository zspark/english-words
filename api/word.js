import { genDeleteSQL, genInsertSQL2, getJSONResponse, getEmptyRes } from "./server-utils.js";
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
let _time_sync_wordlist = -1;
let _wordlist = [];
async function getWordList(data, env) {
    if (data.syncTime < _time_sync_wordlist) {
        return getJSONResponse({
            info: "Succeeded.",
            syncTime: _time_sync_wordlist,
            content: {
                list: _wordlist,
            },
        });
    }
    else {
        return getJSONResponse({
            info: "your word list is already up to date.",
            syncTime: _time_sync_wordlist,
            content: {},
        });
    }
}
async function syncWordlist(env) {
    const detail = await _getWordList(env);
    if (detail.success) {
        _wordlist = detail.results?.map(({ word }) => word);
        _time_sync_wordlist = Date.now();
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
async function deleteWord(data, env) {
    const detail = data.content.detail;
    const word = detail.word;
    const result = await genDeleteSQL(detail, env).run();
    if (!result.success) {
        return getEmptyRes(`delete word (${word}) failed.`);
    }
    if (result.meta.changes > 0) {
        const _index = _wordlist.indexOf(word);
        if (_index !== -1) {
            _wordlist.splice(_index, 1);
            _time_sync_wordlist = Date.now();
        }
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
        _wordlist.push(word);
        _time_sync_wordlist = Date.now();
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
function _runMarkSQL(time: number, wordArr: string[], action: number, env: any): any {
    env.DB.prepare(`
        INSERT INTO synchronizer ( time_sync, words, action)
        VALUES (?,?,?)`
    ).bind(time, wordArr.join(','), action)
        .run();
}
*/
export default async function respond(request, data, env) {
    if (_time_sync_wordlist === -1) {
        await syncWordlist(env);
    }
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

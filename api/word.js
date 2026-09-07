import { genInsertSQL, getJSONResponse, getEmptyRes, getInternalErrorRes } from "./server-utils.js";
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
    const result = await genInsertSQL(detail, env).all();
    if (result.success) {
        return getJSONResponse({
            info: "Succeeded.",
            content: {}
        });
    }
    else {
        return getEmptyRes(`put word (${detail.word}) failed.`);
    }
}
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

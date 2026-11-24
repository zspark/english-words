import { getEmptyRes } from "./server-utils.js";
function _genPutSQL(data, timeSync, currentTime, env) {
    return env.DB.prepare(`
        INSERT INTO notebook ( name, words, time_sync)
        VALUES (?,?,?)
        ON CONFLICT(name) DO UPDATE SET
            words = excluded.words,
            time_sync = ?
        WHERE ? >= dictionary.time_sync`).bind(data.name, JSON.stringify(data.words), currentTime, currentTime, timeSync);
}
async function _getNotebook(name, env) {
    const _nb = await env.DB.prepare(`
            SELECT *
            FROM notebook
            WHERE name = ?`).bind(name).first();
    if (_nb) {
        return { name: _nb.name, words: JSON.parse(_nb.words), time_sync: _nb.time_sync };
    }
    return null;
}
async function _insertNotebook(name, nb, env) {
    const result = await env.DB.prepare(`
            SELECT *
            FROM notebook
            WHERE name = ?`).bind(name).first();
    return result;
}
async function putNotebook(data, env) {
    /*
    const cnb = data.content.notebook;
    const _t = Date.now();
    await _genPutSQL(cnb, cnb.time_sync, _t, env).run();
    const notebook = await _getNotebook(cnb.name, env);
    if (!notebook) {
        return getInternalErrorRes<"putNotebook">("notebook does not exist.", undefined);
    }

    if (_t === notebook.time_sync) {
        return getRes<"getNotebook">("Succeeded.", { notebook: undefined });
    }

    return getRes<"getNotebook">("Failed.", { notebook });
   */
}
async function getNotebook(data, env) {
    /*
    const name = data.content.name;
    const notebook = await _getNotebook(name, env);
    if (!notebook) {
        return getRes<"getNotebook">("notebook does not exist.", { notebook: undefined });
    }
    return getRes<"getNotebook">("Succeeded.", { notebook });
    */
}
export default async function respond(request, data, env) {
    if (data.requestType === "getNotebook") {
        return getNotebook(data, env);
    }
    else if (data.requestType === "putNotebook") {
        return putNotebook(data, env);
    }
    return getEmptyRes('POST to Notebook.');
}

import { getRes, getEmptyRes } from "./server-utils.js";
function _genPutSQL(data, syncTime, env) {
    return env.DB.prepare(`
        INSERT INTO notebook ( name, words, time_sync)
        VALUES (?,?,?)
        ON CONFLICT(name) DO UPDATE SET
            words = excluded.words,
            time_sync = ?
        WHERE ? >= dictionary.time_sync`).bind(data.name, data.words, syncTime, syncTime, data.time_sync);
}
async function _getNotebook(name, env) {
    const result = await env.DB.prepare(`
            SELECT *
            FROM notebook
            WHERE name = ?`).bind(name).first();
    return result;
}
async function _insertNotebook(name, nb, env) {
    const result = await env.DB.prepare(`
            SELECT *
            FROM notebook
            WHERE name = ?`).bind(name).first();
    return result;
}
async function putNotebook(data, env) {
    const name = data.content.name;
    const _t = Date.now();
    await _genPutSQL({ name, words: data.content.list.join(','), time_sync: _t }, _t, env).run();
    const nb = await _getNotebook(name, env);
    if (!nb) {
        return getRes("notebook does not exist.", {
            success: false,
            list: [],
            timeSync: -1,
        });
    }
    if (_t === nb.time_sync) {
        return getRes("Succeeded.", {
            success: true,
            list: [],
            timeSync: _t,
        });
    }
    return getRes("Succeeded.", {
        success: false,
        list: JSON.parse(nb.words),
        timeSync: _t,
    });
}
async function getNotebook(data, env) {
    const name = data.content.name;
    const nb = await _getNotebook(name, env);
    if (!nb) {
        return getRes("notebook does not exist.", {
            success: false,
            list: [],
            timeSync: -1,
        });
    }
    return getRes("Succeeded.", {
        success: true,
        list: JSON.parse(nb.words),
        timeSync: nb.time_sync,
    });
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

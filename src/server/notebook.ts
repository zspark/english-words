import { CSKey, ENV, RequestBody, RequestBodyContentType, Detail } from "../types.d.js"
import { genDeleteSQL, getRes, cloneDetail, genInsertSQL2, getSyncData, getLatestTime, getValue, getJSONResponse, getEmptyRes, getInternalErrorRes } from "./server-utils.js";
import genDetail from "./ai.js"

type NbType = { name: string, words: string, time_sync: number }

function _genPutSQL(data: NbType, syncTime: number, env: ENV): any {
    return env.DB.prepare(`
        INSERT INTO notebook ( name, words, time_sync)
        VALUES (?,?,?)
        ON CONFLICT(name) DO UPDATE SET
            words = excluded.words,
            time_sync = ?
        WHERE ? >= dictionary.time_sync`
    ).bind(
        data.name,
        data.words,
        syncTime,
        syncTime,
        data.time_sync,
    );
}

async function _getNotebook(name: string, env: ENV): Promise<NbType | null> {
    const result = await env.DB.prepare(`
            SELECT *
            FROM notebook
            WHERE name = ?`
    ).bind(name).first()
    return result;
}

async function _insertNotebook(name: string, nb: NbType, env: ENV): Promise<void | null> {
    const result = await env.DB.prepare(`
            SELECT *
            FROM notebook
            WHERE name = ?`
    ).bind(name).first()
    return result;
}

async function putNotebook(data: RequestBody<"putNotebook">, env: ENV): Promise<Response> {
    const name = data.content.name;
    const _t = Date.now();
    await _genPutSQL({ name, words: data.content.list.join(','), time_sync: _t }, _t, env).run();
    const nb = await _getNotebook(name, env);
    if (!nb) {
        return getRes<"putNotebook">("notebook does not exist.", {
            success: false,
            list: [],
            timeSync: -1,
        });
    }
    if (_t === nb.time_sync) {
        return getRes<"putNotebook">("Succeeded.", {
            success: true,
            list: [],
            timeSync: _t,
        });
    }
    return getRes<"putNotebook">("Succeeded.", {
        success: false,
        list: JSON.parse(nb.words),
        timeSync: _t,
    });
}
async function getNotebook(data: RequestBody<"getNotebook">, env: ENV): Promise<Response> {
    const name = data.content.name;
    const nb = await _getNotebook(name, env);
    if (!nb) {
        return getRes<"getNotebook">("notebook does not exist.", {
            success: false,
            list: [],
            timeSync: -1,
        });
    }
    return getRes<"getNotebook">("Succeeded.", {
        success: true,
        list: JSON.parse(nb.words),
        timeSync: nb.time_sync,
    });
}

export default async function respond<T extends CSKey>(request: Request, data: RequestBody<T>, env: ENV): Promise<Response> {
    if (data.requestType === "getNotebook") {
        return getNotebook(data as RequestBody<"getNotebook">, env);
    } else if (data.requestType === "putNotebook") {
        return putNotebook(data as RequestBody<"putNotebook">, env);
    }
    return getEmptyRes('POST to Notebook.');
}


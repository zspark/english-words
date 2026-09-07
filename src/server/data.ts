import { CSType, RequestBodyContentType, Detail } from "../types.d.js"
import { getSyncData, getLatestTime, getValue, getJSONResponse, getEmptyRes, getInternalErrorRes, genInsertSQL } from "./server-utils.js";

async function _getTimeModify(list: string[], env: any): Promise<any> {
    try {
        if (!list?.length) return {};
        const placeholders = list.map(() => "?").join(",");
        const result = await env.DB
            .prepare(`
            SELECT word, time_modify
            FROM dictionary
            WHERE word IN (${placeholders})
        `)
            .bind(...list)
            .all()
        return result;
    } catch (e: any) {
        throw new Error(`_getTimeModify failed: ${e.message}`);
    }
}
async function _getDetails(list: string[], env: any): Promise<any> {
    if (!list?.length) return {};
    const placeholders = list.map(() => "?").join(",");
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
            WHERE word IN (${placeholders})
        `)
        .bind(...list)
        .all()
    return result;
}

function _toObj(result: any): Record<string, Detail> {
    if (result.success) {
        const _obj: Record<string, Detail> = {};
        const _tmp = result.results;
        for (let i = 0, N = _tmp.length; i < N; ++i) {
            let _v = _tmp[i] as Detail;
            _obj[_v.word] = _v;
        }
        return _obj;
    } else return {};
}

async function syncAll(data: RequestBodyContentType<any>, env: any): Promise<Response> {
    try {
        const _credit = await getValue(data.accessToken, env);
        if (!_credit) {
            return getEmptyRes("server need a token to process.");
        }
        const _tv = Number(_credit);
        if (_tv >= 1) {
            const _timeSync = await getLatestTime(env);

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
                    FROM dictionary`
                )
                .all()

            const _obj = _toObj(result);
            return getJSONResponse({
                info: "Succeeded.",
                content: _obj,
                syncTime: _timeSync,
            });
        } else {
            return getEmptyRes(`Can not process. Token value is: ${_tv}.`);
        }
    } catch (e: any) {
        return getInternalErrorRes(`Internal Error: ${e.message} .`);
    }
};

function _genSetValueSQL(key: string, value: any, time: number, env: any): any {
    return env.DB
        .prepare(`
            UPDATE keyvalue
            SET value = ?, time_sync = ?
            WHERE key = ?`
        ).bind(value, time, key)
}

async function _getConfigValues(env: any): Promise<any> {
    const result = await env.DB.prepare(`
        SELECT json_group_object(
            key,
            json_object(
                'value', value,
                'time_sync', time_sync
            )
        ) AS result
        FROM keyvalue
        WHERE key IN ('tags', 'lemmatize')`
    ).first();

    return JSON.parse(result.result);
}

function _genMarkSQL(time: number, wordArr: string[], action: number, env: any): any {
    return env.DB.prepare(`
        INSERT INTO synchronizer ( time_sync, words, action)
        VALUES (?,?,?)`
    ).bind(time, wordArr.join(','), action)
}

function _genDeleteSQL(word: string, env: any): any {
    return env.DB.prepare(`
        DELETE FROM dictionary
        WHERE word = ?`
    ).bind(word);
}

async function _CToS_add(cmd: any[], syncTime: number, content: any, env: any): Promise<void> {
    const _listClient = content.lists?.addlist ?? [];
    if (_listClient.length > 0) {
        const _listExist: string[] = [];
        const _r = await _getTimeModify(_listClient, env);

        _r.results?.forEach((v: Detail) => {
            _listExist.push(v.word as string);
        });

        const _dict = content.dict;
        const _list = _listClient.filter((x: string) => !_listExist.includes(x));
        _list.forEach((w: string) => {
            cmd.push(genInsertSQL(_dict[w], env));
        });
        if (_list.length > 0) {
            cmd.push(_genMarkSQL(Date.now(), _list, 1, env))
        }
    }
}

async function _CToS_del(cmd: any[], syncTime: number, content: any, env: any): Promise<void> {
    const _listClient = content.lists?.dellist ?? [];
    if (_listClient.length > 0) {
        const _list: string[] = [];
        const _r = await _getTimeModify(_listClient, env);
        _r.results?.forEach((v: Detail) => {
            if (v.time_modify <= syncTime) {
                let _w = v.word as string;
                cmd.push(_genDeleteSQL(_w, env));
                _list.push(_w);
            }
        });

        if (_list.length > 0) {
            cmd.push(_genMarkSQL(Date.now(), _list, 2, env))
        }
    }
}

async function _CToS_modify(cmd: any[], syncTime: number, content: any, env: any): Promise<void> {
    const _listClient = content.lists?.modlist ?? [];
    if (_listClient.length > 0) {
        const _dict = content.dict;
        const _list: string[] = [];
        const _r = await _getTimeModify(_listClient, env);
        _r.results?.forEach((v: Detail) => {
            if (v.time_modify <= syncTime) {
                let _w = v.word as string;
                cmd.push(genInsertSQL(_dict[_w], env));
                _list.push(_w);
            }
        });

        if (_list.length > 0) {
            cmd.push(_genMarkSQL(Date.now(), _list, 3, env))
        }
    }
}

async function _clientToServer(data: RequestBodyContentType<any>, env: any) {
    const _syncTime = data.syncTime;
    const _cmd = [];

    if (data.content.tags || data.content.lemmatize) {
        const _out = await _getConfigValues(env);
        if (data.content.tags) {
            if (_out['tags'].time_sync <= _syncTime) {
                _cmd.push(_genSetValueSQL('tags', data.content.tags.join(','), Date.now(), env));
            }
        }
        if (data.content.lemmatize) {
            if (_out['lemmatize'].time_sync <= _syncTime) {
                _cmd.push(_genSetValueSQL('lemmatize', data.content.lemmatize.join(','), Date.now(), env));
            }
        }
    }

    await _CToS_add(_cmd, _syncTime, data.content, env);
    await _CToS_del(_cmd, _syncTime, data.content, env);
    await _CToS_modify(_cmd, _syncTime, data.content, env);

    if (_cmd.length > 0) {
        await env.DB.batch(_cmd);
        _server_newest_sync_time = await getLatestTime(env);
    }
}

let _server_newest_sync_time = -1;

async function _serverToClient(data: RequestBodyContentType<any>, env: any): Promise<Response> {
    const result = await env.DB
        .prepare(`
            SELECT *
            FROM synchronizer
            WHERE time_sync > ?
            ORDER BY time_sync ASC
        `)
        .bind(data.syncTime)
        .all();

    if (result.success) {
        const lists = getSyncData(result.results);
        const _o = await _getDetails([...lists.addlist, ...lists.modlist], env);
        const dict = _toObj(_o);

        const _config = await _getConfigValues(env);
        return getJSONResponse({
            info: "Succeeded.",
            syncTime: _server_newest_sync_time,
            content: {
                lists,
                dict,
                tags: _config.tags.value,
                lemmatize: _config.lemmatize.value,
            }
        });
    } else {
        return getJSONResponse({
            info: "sync failed.",
            content: {},
        });
    }
}

async function sync(data: CSType['sync']['C'], env: any): Promise<Response> {
    type S = CSType['sync']['S'];
    try {
        const _credit = await getValue(data.accessToken, env);
        if (!_credit) {
            return getEmptyRes("server need a token to process.");
        }
        const _tv = Number(_credit);
        if (_tv >= 2) {
            await _clientToServer(data, env);
        }
        if (_tv >= 1) {
            return await _serverToClient(data, env);
        }
        return getEmptyRes(`Can not process. Token value is: ${_tv}.`);
    } catch (e: any) {
        return getInternalErrorRes(`Internal Error: sync failed, ${e.message} .`);
    }
}

export default async function respond_POST(request: Request, data: RequestBodyContentType<any>, env: any): Promise<Response> {
    if (_server_newest_sync_time < 0) {
        _server_newest_sync_time = await getLatestTime(env);
    }
    if (data.requestType === "sync") {
        return sync(data, env);
    } else if (data.requestType === "syncAll") {
        return syncAll(data, env);
    }
    return getEmptyRes('POST');
}


import { getSyncData, getLatestTime, getValue, getJSONResponse, getEmptyRes, getInternalErrorRes } from "../server-utils.js";

async function _getTimeModify(list, env) {
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
    } catch (e) {
        throw new Error(`_getTimeModify failed: ${e.message}`);
    }
}
async function _getDetails(list, env) {
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

function _toObj(result) {
    if (result.success) {
        const _obj = {};
        const _tmp = result.results;
        for (let i = 0, N = _tmp.length; i < N; ++i) {
            let _v = _tmp[i];
            _obj[_v.word] = {
                ipa: _v.ipa,
                meaning: _v.meaning,
                level: _v.level,
                note: _v.note,
                links: _v.links,
                time_create: _v.time_create,
                time_modify: _v.time_modify,
                tags: _v.tags,
            }
        }
        return _obj;
    } else return {};
}

async function syncAll(data, env) {
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
    } catch (e) {
        return getInternalErrorRes(`Internal Error: ${e.message} .`);
    }
};

function _genSetValueSQL(key, value, time, env) {
    return env.DB
        .prepare(`
            UPDATE keyvalue
            SET value = ?, time_sync = ?
            WHERE key = ?`
        ).bind(value, time, key)
}

async function _getConfigValues(env) {
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

function _genMarkSQL(time, wordArr, action, env) {
    return env.DB.prepare(`
        INSERT INTO synchronizer ( time_sync, words, action)
        VALUES (?,?,?)`
    ).bind(time, wordArr.join(','), action)
}

function _genDeleteSQL(word, env) {
    return env.DB.prepare(`
        DELETE FROM dictionary
        WHERE word = ?`
    ).bind(word);
}

function _genInsertSQL(word, detail, env) {
    return env.DB.prepare(`
        INSERT OR REPLACE INTO dictionary (
            word, ipa, meaning, level,
            note, links, tags,
            time_create, time_modify
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        word,
        detail.ipa ?? "",
        detail.meaning ?? "",
        detail.level ?? "",

        detail.note ?? "",
        detail.links ?? "",
        detail.tags ?? "",

        detail.time_create ?? Date.now(),
        detail.time_modify ?? Date.now()
    );
}

async function _CToS_add(cmd, syncTime, content, env) {
    const _listClient = content.lists?.addlist ?? [];
    if (_listClient.length > 0) {
        const _listExist = [];
        const _r = await _getTimeModify(_listClient, env);
        _r.results?.forEach(v => {
            _listExist.push(v.word);
        });

        const _dict = content.dict;
        const _list = _listClient.filter(x => !_listExist.includes(x));
        _list.forEach((w) => {
            cmd.push(_genInsertSQL(w, _dict[w], env));
        });
        if (_list.length > 0) {
            cmd.push(_genMarkSQL(Date.now(), _list, 1, env))
        }
    }
}

async function _CToS_del(cmd, syncTime, content, env) {
    const _listClient = content.lists?.dellist ?? [];
    if (_listClient.length > 0) {
        const _list = [];
        const _r = await _getTimeModify(_listClient, env);
        _r.results?.forEach(v => {
            if (v.time_modify <= syncTime) {
                cmd.push(_genDeleteSQL(v.word, env));
                _list.push(v.word);
            }
        });

        if (_list.length > 0) {
            cmd.push(_genMarkSQL(Date.now(), _list, 2, env))
        }
    }
}

async function _CToS_modify(cmd, syncTime, content, env) {
    const _listClient = content.lists?.modlist ?? [];
    if (_listClient.length > 0) {
        const _dict = content.dict;
        const _list = [];
        const _r = await _getTimeModify(_listClient, env);
        _r.results?.forEach(v => {
            if (v.time_modify <= syncTime) {
                cmd.push(_genInsertSQL(v.word, _dict[v.word], env));
                _list.push(v.word);
            }
        });

        if (_list.length > 0) {
            cmd.push(_genMarkSQL(Date.now(), _list, 3, env))
        }
    }
}

async function _clientToServer(data, env) {
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
    }
}

let _server_newest_sync_time = -1;

async function _serverToClient(data, env) {
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
        const _timeSync = await getLatestTime(env);
        return getJSONResponse({
            info: "Succeeded.",
            syncTime: _timeSync,
            content: {
                lists,
                dict,
                tags: _config.tags,
                lemmatize: _config.lemmatize,
                _server_newest_sync_time,
            }
        });
    } else {
        return getJSONResponse({
            info: "sync failed.",
        });
    }
}

async function sync(data, env) {
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
    } catch (e) {
        return getInternalErrorRes(`Internal Error: sync failed, ${e.message} .`);
    }
}

export async function respond_POST(request, data, env) {
    if (_server_newest_sync_time < 0) {
        _server_newest_sync_time = await getLatestTime(env);
    }
    if (data.requestType === "sync") {
        return sync(data, env);
    } else if (data.requestType === "sync-all") {
        return syncAll(data, env);
    }
    return getEmptyRes('POST');
}



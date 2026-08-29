import { getJSONResponse, getEmptyRes, getParseFailureRes, getInternalErrorRes } from "../server-utils.js";

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

async function getDetail(request, data, env) {

    /*
    try {
    } catch (e) {
        return getInternalErrorRes(`Internal Error: ${e} .`);
    }
    */

    const _o = await _getDetails(data.content.words, env);
    const _obj = _toObj(_o);
    return getJSONResponse({
        info: "Succeeded.",
        content: _obj,
    });
};

async function syncAll(request, data, env) {

    const _time_sync = await _getLatestTime();
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
FROM dictionary`)
        .all()

    const _obj = _toObj(result);
    return getJSONResponse({
        info: "Succeeded.",
        content: _obj,
        syncTime: _time_sync,
    });
};

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
    const _listClient = content.lists.addlist;
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
    const _listClient = content.lists.dellist;
    if (_listClient.length > 0) {
        const _list = [];
        const _r = await _getTimeModify(_listClient, env);
        _r.results?.forEach(v => {
            if (v.time_modify < syncTime) {
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
    const _listClient = content.lists.modlist;
    if (_listClient.length > 0) {
        const _dict = content.dict;
        const _list = [];
        const _r = await _getTimeModify(_listClient, env);
        _r.results?.forEach(v => {
            if (v.time_modify < syncTime) {
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

    // data.content:{ wordsObj_add, wordsArr_del, wordsObj_mod}
    await _CToS_add(_cmd, _syncTime, data.content, env);
    await _CToS_del(_cmd, _syncTime, data.content, env);
    await _CToS_modify(_cmd, _syncTime, data.content, env);

    if (_cmd.length > 0) {
        await env.DB.batch(_cmd);
    }
}

const _SYMBOLIC_LOGIC_ = Object.freeze({
    // add:1 delete:2 modify:3
    '21': '3',// first 'delete' then 'add' -> it is a 'modify' operation.
    '22': '-1',// doesn't logic, delete then delete?
    '23': '-1',
    '11': '-1',
    '12': '',// ignore
    '13': '1',
    '31': '-1',
    '32': '2',
    '33': '3',
});

function _getSyncData(arr) {
    const _logicObj = {};
    arr.forEach(({ wordsStr, action }) => {
        wordsStr
            .split(',')
            .filter(w => w.trim().length > 0)
            .forEach(w => {
                if (!_logicObj[w]) _logicObj[w] = action + "";
                else {
                    let _l = _SYMBOLIC_LOGIC_[_logicObj[w] + action];
                    if (_l === '-1') {
                        logger.vital(`Logic error about word (${w}) action: ${_logicObj[w] + action}`);
                    } else {
                        _logicObj[w] = _l
                    }
                }
            });
    });

    let wordsObj_add = [];
    let wordsObj_del = [];
    let wordsObj_mod = [];
    Object.entries(_logicObj).forEach(([w, action]) => {
        if (action === '1') {
            wordsObj_add.push(w);
        } else if (action === '2') {
            wordsObj_del.push(w);
        } else if (action === '3') {
            wordsObj_mod.push(w);
        }
    });
    return {
        wordsObj_add, wordsObj_del, wordsObj_mod,
    }
}

async function sync(request, data, env) {
    try {
        await _clientToServer(data, env);

        /*
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
            const _obj = _getSyncData(result.results);
            const _o = await _getDetails([..._obj.wordsObj_add, ..._obj.wordsObj_mod], env);
            const _outputObj = _toObj(_o);
    
            return getJSONResponse({
                info: "Succeeded.",
                syncTime: _newestSyncTime,
                content: {
                    add: _outputObj,
                    del: _obj.wordsObj_del
                }
            });
        } else {
            return getJSONResponse({
                info: "sync failed.",
            });
        }
        */
        return getEmptyRes('sync');
    } catch (e) {
        return getEmptyRes(`sync failed: ${e.message}`);
    }
}

async function _getLatestTime() {
    const _time = await env.DB
        .prepare(`
        SELECT MAX(time_sync) AS max_time_sync
        FROM synchronizer
    `).first();
    return _time.max_time_sync;
}

async function _mark(wordsStr, action) {
    const _newSyncTime = Date.now();
    await env.DB
        .prepare(`
INSERT INTO synchronizer (
    time_sync,
    words,
    action,
)
VALUES (?,?,?)`
        )
        .bind(_newSyncTime, wordsStr, action)
        .run()
    return _newSyncTime;
}

export async function respond_POST(request, data, env) {
    if (data.requestType === "sync") {
        return sync(request, data, env);
    } else if (data.requestType === "sync-all") {
        return syncAll(request, data, env);
    }
    return getEmptyRes('POST');
}




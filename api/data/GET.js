import { getJSONResponse, getEmptyRes, getParseFailureRes, getInternalErrorRes } from "../server-utils.js";

async function _getDetails(list, env) {

    if (!list?.length) return {};

    const placeholders = list.map(() => "?").join(",");

    const result = await env.DB
        .prepare(`
            SELECT json_group_object(
                word,
                json_object(
                    'ipa', ipa,
                    'meaning', meaning,
                    'level', level,
                    'note', note,
                    'links', links,
                    'time_create', time_create,
                    'time_modify', time_modify,
                    'tags', tags
                )
            ) AS json
            FROM dictionary
            WHERE word IN (${placeholders})
        `)
        .bind(...list)
        .first();

    if (!result?.json) return {};

    return JSON.parse(result.json);
}

async function getDetail(request, data, env) {

    /*
    try {
    } catch (e) {
        return getInternalErrorRes(`Internal Error: ${e} .`);
    }
    */

    const result = _getDetails(data.content.words, env);

    return getJSONResponse({
        info: "Succeeded.",
        content: result,
    });
};

async function syncAll(request, data, env) {

    const _time = await env.DB
        .prepare(`
        SELECT MAX(time_sync) AS max_time_sync
        FROM synchronizer
    `).first();

    const result = await env.DB
        .prepare(`
SELECT json_group_object(
    word,
    json_object(
        'ipa', ipa,
        'meaning', meaning,
        'level', level,
        'note', note,
        'links', links,
        'time_create', time_create,
        'time_modify', time_modify,
        'tags', tags
    )
) AS json
FROM dictionary`)
        .first();

    return getJSONResponse({
        info: "Succeeded.",
        content: JSON.parse(result.content),
        syncTime: _time.max_time_sync,
    });
};

async function sync(request, data, env) {
    const _syncTime = data.syncTime;

    const result = await env.DB
        .prepare(`
        SELECT *
        FROM synchronizer
        WHERE time_sync > ?
        ORDER BY time_sync ASC
    `)
        .bind(_syncTime)
        .all();

    if (result.success) {
        let _newestSyncTime = 0;
        const _addWords = new Set()
        const _delWords = new Set()
        const _modWords = new Set()

        const _tmp = result.results;
        for (let i = 0, N = _tmp.length; i < N; ++i) {
            let _rcd = _tmp[i];
            if (_rcd.action == 1) {
                let _wl = _rcd.words.split(',').map(w => w.trim());
                _wl.forEach(w => {
                    if (_delWords.has(w)) _delWords.delete(w);
                    _addWords.add(w);
                });
            } else if (_rcd.action == 2) {
                let _wl = _rcd.words.split(',').map(w => w.trim());
                _wl.forEach(w => {
                    if (_addWords.has(w)) _addWords.delete(w);
                    else _delWords.add(w);

                    if (_modWords.has(w)) _modWords.delete(w);
                });
            } else if (_rcd.action == 3) {
                let _wl = _rcd.words.split(',').map(w => w.trim());
                _wl.forEach(w => {
                    _modWords.add(w);
                });
            }
        }
        _newestSyncTime = _tmp[_tmp.length - 1].time_sync;
        const _combined = new Set([..._addWords, ..._modWords]);

        const _outJSON = await _getDetails([..._combined], env);

        return getJSONResponse({
            info: "Succeeded.",
            syncTime: _newestSyncTime,
            content: {
                add: _outJSON,
                del: [..._delWords],
            }
        });
    } else {
        return getJSONResponse({
            info: "sync failed.",
        });
    }
}

export async function respond_GET(request, data, env) {
    if (data.requestType === "sync") {
        return sync(request, data, env);
    } else if (data.requestType === "sync-all") {
        return syncAll(request, data, env);
    }
    return getEmptyRes('GET');
}




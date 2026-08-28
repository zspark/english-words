import { getJSONResponse, getEmptyRes, getParseFailureRes, getInternalErrorRes } from "../server-utils.js";

async function _getDetails(str) {
    // if not exist, would return {}
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
WHERE word IN (?)`)
        .bind(str)

    if (result.success) return result.results;
    else return {};
}

async function getDetail(request, data, env) {

    /*
    try {
    } catch (e) {
        return getInternalErrorRes(`Internal Error: ${e} .`);
    }
    */

    const result = _getDetails(data.content.words);

    return getJSONResponse({
        info: "Succeeded.",
        content: JSON.parse(result.content)
    });
};

async function getDictionary(request, data, env) {

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
        .bind(userID)
        .first();

    return getJSONResponse({
        info: "Succeeded.",
        content: JSON.parse(result.content)
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

        for (let i = 0, N = result.results.length; i < N; ++i) {
            let _rcd = result.results[i];
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
        _newestSyncTime = result.results[result.results.length - 1].time_sync;

        const _combined = new Set([..._addWords, ..._modWords]);
        const _outJSON = _getDetails([..._combined].join(","));

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
            info: "Failed.",
        });
    }
}

export async function respond_GET(request, data, env) {
    if (data.requestType === "sync") {
        return sync(request, data, env);
    }
    return getEmptyRes();
}




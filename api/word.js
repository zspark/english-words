import { getSyncData, getLatestTime, getValue, getJSONResponse, getEmptyRes, getInternalErrorRes } from "./server-utils.js";

async function _getDetails(list, env) {
    if (!list?.length <= 0) return {};
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
        .all()
    return result;
}

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
            WHERE word = ${word}
        `)
        .all()
    return result;
}

async function _getWordList(env) {
    const result = await env.DB
        .prepare(`
            SELECT word
            FROM dictionary
        `)
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

async function getWordList(data, env) {
    try {
        const _credit = await getValue(data.accessToken, env);
        if (!_credit) {
            return getEmptyRes("server need a token to process.");
        }
        const _tv = Number(_credit);
        if (_tv >= 1) {
            const detail = await _getWordList(env);
            if (detail.success) {
                const wordList = [];
                const _tmp = result.results;
                for (let i = 0, N = _tmp.length; i < N; ++i) {
                    let _v = _tmp[i];
                    wordList.push(_v.word)
                }
                return getJSONResponse({
                    info: "Succeeded.",
                    content: {
                        wordList,
                    }
                });
            } else {
                return getInternalErrorRes(`Internal Error: get word list failed.`);
            }
        }
        return getEmptyRes(`Can not process. Token value is: ${_tv}.`);
    } catch (e) {
        return getInternalErrorRes(`Internal Error: get word list failed, ${e.message} .`);
    }
}
async function getDetail(data, env) {
    try {
        const _credit = await getValue(data.accessToken, env);
        if (!_credit) {
            return getEmptyRes("server need a token to process.");
        }
        const _tv = Number(_credit);
        if (_tv >= 1) {
            const detail = await _getDetail(data.content.word, env);
            if (detail.success) {
                return getJSONResponse({
                    info: "Succeeded.",
                    content: {
                        word: data.content.word,
                        detail,
                    }
                });
            } else {
                return getEmptyRes(`No such word: ${data.content.word}.`);
            }
        }
        return getEmptyRes(`Can not process. Token value is: ${_tv}.`);
    } catch (e) {
        return getInternalErrorRes(`Internal Error: sync failed, ${e.message} .`);
    }
}

export default async function respond(request, data, env) {
    if (data.requestType === "get-detail") {
        return getDetail(data, env);
    } else if (data.requestType === "get-word-list") {
        return getWordList(data, env);
    }
    return getEmptyRes('POST');
}


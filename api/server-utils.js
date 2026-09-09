export function getJSONResponse(data, status = 200) {
    return Response.json(data, {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    });
}
export function getRes(info, content) {
    return getJSONResponse({
        info,
        syncTime: Date.now(),
        content
    }, 200);
}
export function getParseFailureRes() {
    return getJSONResponse({
        info: "Invalid JSON-like format, can not decode from string.",
        content: {}
    }, 400);
}
export function getInternalErrorRes(info, content = undefined) {
    return getJSONResponse({
        info,
        syncTime: Date.now(),
        content
    }, 500);
}
export function getEmptyRes(info) {
    return getJSONResponse({ info, content: {} }, 200);
}
export async function parseJSONString(request) {
    try {
        const data = await request.json();
        return data;
    }
    catch {
        return undefined;
    }
}
export async function getValue(key, env) {
    try {
        const result = await env.DB
            .prepare(`
                SELECT value
                FROM keyvalue
                WHERE key = ?
            `)
            .bind(key)
            .first();
        return result?.value;
    }
    catch (e) {
        throw Error(`Database query error: ${e.message}`);
    }
}
const _SYMBOLIC_LOGIC_ = Object.freeze({
    // add:1 delete:2 modify:3
    '21': '3', // first 'delete' then 'add' -> it is a 'modify' operation.
    '22': '-1', // irrational, delete then delete?
    '23': '-1',
    '11': '-1',
    '12': '', // ignore
    '13': '1',
    '31': '-1',
    '32': '2',
    '33': '3',
});
/*
 [
    {id:number, time_sync:number, words:string, action:number},
    ...
 ]
 */
export function getSyncData(arr) {
    const _logicObj = {};
    arr.forEach(({ words, action }) => {
        words
            .split(',')
            .filter(w => w.trim().length > 0)
            .forEach(w => {
            if (!_logicObj[w])
                _logicObj[w] = action + "";
            else {
                //@ts-ignore
                let _l = _SYMBOLIC_LOGIC_[_logicObj[w] + action];
                if (_l != '-1') {
                    _logicObj[w] = _l;
                }
            }
        });
    });
    let addlist = [];
    let dellist = [];
    let modlist = [];
    Object.entries(_logicObj).forEach(([w, action]) => {
        if (action === '1') {
            addlist.push(w);
        }
        else if (action === '2') {
            dellist.push(w);
        }
        else if (action === '3') {
            modlist.push(w);
        }
    });
    return {
        addlist, dellist, modlist,
    };
}
export async function getLatestTime(env) {
    const _time = await env.DB
        .prepare(`
        SELECT MAX(time_sync) AS max_time_sync
        FROM synchronizer
    `).first();
    return _time.max_time_sync;
}
export function genInsertSQL2(detail, lastModifyTime, syncTime, env) {
    return env.DB.prepare(`
        INSERT INTO dictionary (
            word, ipa, meaning, level,
            note, links, tags,
            time_create, time_modify
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(word) DO UPDATE SET
            ipa = excluded.ipa,
            meaning = excluded.meaning,
            level = excluded.level,
            note = excluded.note,
            links = excluded.links,
            tags = excluded.tags,
            time_modify = ?
        WHERE ? >= dictionary.time_modify`).bind(detail.word, detail.ipa, detail.meaning, detail.level, detail.note, detail.links, detail.tags, syncTime, syncTime, syncTime, lastModifyTime);
}
export function genDeleteSQL(detail, env) {
    return env.DB.prepare(`
        DELETE FROM dictionary
        WHERE word = ? AND time_modify <= ?
    `).bind(detail.word, detail.time_modify);
}
export function genInsertSQL(detail, env) {
    return env.DB.prepare(`
        INSERT OR REPLACE INTO dictionary (
            word, ipa, meaning, level,
            note, links, tags,
            time_create, time_modify
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(detail.word, detail.ipa ?? "", detail.meaning ?? "", detail.level ?? "", detail.note ?? "", detail.links ?? "", detail.tags ?? "", detail.time_create ?? Date.now(), detail.time_modify ?? Date.now());
}
export function cloneDetail(from, time_modify, time_create) {
    return {
        word: from.word,
        ipa: from.word,
        meaning: from.meaning,
        level: from.level,
        tags: from.tags,
        note: from.note,
        links: from.links,
        time_create: time_create ?? from.time_create,
        time_modify: time_modify ?? from.time_modify,
    };
}
export function createDetail(note) {
    const _t = Date.now();
    return {
        word: "word",
        ipa: "ipa",
        meaning: "meaning",
        level: "ALL",
        tags: "",
        note,
        links: "",
        time_create: _t,
        time_modify: _t,
    };
}

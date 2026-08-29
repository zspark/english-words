
export function getJSONResponse(data, status = 200) {
    return Response.json(
        data,
        {
            status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }
    );
}

export function getParseFailureRes() {
    return getJSONResponse({
        info: "Invalid JSON-like format, can not decode from string."
    }, 400);
}

export function getInternalErrorRes(msg) {
    return getJSONResponse({
        info: msg,
    }, 500);
}

export function getEmptyRes(msg) {
    return getJSONResponse({ info: msg }, 200);
}

export async function parseJSONString(request) {
    try {
        const data = await request.json();
        return data;
    } catch {
        return null;
    }
}

export async function checkAuthority(userID, pwd, env) {
    try {
        const result = await env.DB
            .prepare(`
                SELECT password
                FROM user_id
                WHERE userID = ?
            `)
            .bind(userID)
            .first();

        return result?.password === pwd;
    } catch (error) {
        console.error("Database query error:", error);
        return false;
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
                if (!_logicObj[w]) _logicObj[w] = action + "";
                else {
                    let _l = _SYMBOLIC_LOGIC_[_logicObj[w] + action];
                    if (_l != '-1') {
                        _logicObj[w] = _l
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
        } else if (action === '2') {
            dellist.push(w);
        } else if (action === '3') {
            modlist.push(w);
        }
    });
    return {
        addlist, dellist, modlist,
    }
}


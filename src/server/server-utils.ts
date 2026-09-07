import { SyncRecordType, ResponseData, ResponseBody, CSKey, ResponseBodyContentType, RequestBodyContentType, Detail } from "../types.d.js"

export function getJSONResponse<K extends CSKey>(data: ResponseBody<K>, status = 200): Response {
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

export function getParseFailureRes(): Response {
    return getJSONResponse({
        info: "Invalid JSON-like format, can not decode from string.",
        content: {}
    }, 400);
}

export function getInternalErrorRes(info: string): Response {
    return getJSONResponse({ info, content: {} }, 500);
}

export function getEmptyRes(info: string): Response {
    return getJSONResponse({ info, content: {} }, 200);
}

export async function parseJSONString(request: Request): Promise<RequestBodyContentType<any> | undefined> {
    try {
        const data = await request.json() as RequestBodyContentType<any>;
        return data;
    } catch {
        return undefined;
    }
}

export async function getValue(key: string, env: any): Promise<any> {
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
    } catch (e: any) {
        throw Error(`Database query error: ${e.message}`);
    }
}

const _SYMBOLIC_LOGIC_ = Object.freeze({
    // add:1 delete:2 modify:3
    '21': '3',// first 'delete' then 'add' -> it is a 'modify' operation.
    '22': '-1',// irrational, delete then delete?
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
export function getSyncData(arr: SyncRecordType[]): any {
    const _logicObj: any = {};
    arr.forEach(({ words, action }) => {
        words
            .split(',')
            .filter(w => w.trim().length > 0)
            .forEach(w => {
                if (!_logicObj[w]) _logicObj[w] = action + "";
                else {
                    //@ts-ignore
                    let _l = _SYMBOLIC_LOGIC_[_logicObj[w] + action];
                    if (_l != '-1') {
                        _logicObj[w] = _l
                    }
                }
            });
    });

    let addlist: string[] = [];
    let dellist: string[] = [];
    let modlist: string[] = [];
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

export async function getLatestTime(env: any): Promise<number> {
    const _time = await env.DB
        .prepare(`
        SELECT MAX(time_sync) AS max_time_sync
        FROM synchronizer
    `).first();
    return _time.max_time_sync;
}


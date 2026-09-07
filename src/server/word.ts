import { RequestType, ResponseBody, RequestBody, ResponseData, RequestData, CSType, SyncRecordType, ResponseBodyContentType, RequestBodyContentType, Detail } from "../types.d.js"
import { genDeleteSQL, cloneDetail, genInsertSQL2, getSyncData, getLatestTime, getValue, getJSONResponse, getEmptyRes, getInternalErrorRes } from "./server-utils.js";

type DBResultType<T> = {
    success: boolean,
    results: T[],
    meta: {
        changes: number,
    },
}

async function _getDetail(word: string, env: any): Promise<DBResultType<Detail>> {
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
            WHERE word = ?
        `)
        .bind(word)
        .all()
    return result;
}

async function _getWordList(env: any): Promise<DBResultType<Detail>> {
    const result = await env.DB
        .prepare(`
            SELECT word
            FROM dictionary
        `)
        .all()

    return result;
}

async function getWordList(data: RequestBody<"wordList">, env: any): Promise<Response> {
    const detail = await _getWordList(env);
    if (detail.success) {
        const content = detail.results?.map(({ word }) => word) as string[];
        return getJSONResponse<"wordList">({
            info: "Succeeded.",
            content,
        });
    } else {
        return getInternalErrorRes(`Internal Error: get word list failed.`);
    }
}

async function getDetail(data: RequestBody<"getDetail">, env: any): Promise<Response> {
    const detail = await _getDetail(data.content.word, env);
    if (detail.success) {
        const d = detail.results[0];
        return getJSONResponse<"getDetail">({
            info: "Succeeded.",
            content: d
        });
    } else {
        return getEmptyRes(`No such word: ${data.content.word}.`);
    }
}

async function deleteWord(data: RequestBody<"deleteWord">, env: any): Promise<Response> {
    const detail = data.content.detail;

    const result = await genDeleteSQL(detail, env).run() as DBResultType<undefined>;
    if (!result.success) {
        return getEmptyRes(`delete word (${detail.word}) failed.`);
    }

    if (result.meta.changes > 0) {
        return getJSONResponse<"deleteWord">({
            info: "Succeeded.",
            content: {
                detail,
                success: true,
            }
        });
    } else {
        const _d = await _getDetail(detail.word, env) as DBResultType<Detail>;
        if (!_d.success) {
            return getEmptyRes(`delete word (${detail.word}) failed..`);
        }

        const _newestDetail: Detail = _d.results[0];
        return getJSONResponse<"deleteWord">({
            info: "Succeeded.",
            content: {
                detail: _newestDetail,
                success: false,
            }
        });
    }
}

async function putDetail(data: RequestBody<"putDetail">, env: any): Promise<Response> {
    const detail = data.content.detail;
    const syncTime: number = Date.now();

    const result = await genInsertSQL2(detail, syncTime, env).all() as DBResultType<undefined>;
    if (!result.success) {
        return getEmptyRes(`put word (${detail.word}) failed.`);
    }

    // Valid request, but database rejected the update
    // because the incoming version/timestamp was older
    const _d = await _getDetail(detail.word, env) as DBResultType<Detail>;
    if (!_d.success) {
        return getEmptyRes(`put word (${detail.word}) failed..`);
    }

    const _newestDetail: Detail = _d.results[0];
    if (_newestDetail.time_modify === syncTime) {
        return getJSONResponse<"putDetail">({
            info: "Succeeded.",
            content: {
                detail: _newestDetail,
                success: true,
            }
        });
    } else {
        return getJSONResponse<"putDetail">({
            info: "Failed.",
            content: {
                detail: _newestDetail,
                success: false,
            }
        });
    }
}

/*
function _runMarkSQL(time: number, wordArr: string[], action: number, env: any): any {
    env.DB.prepare(`
        INSERT INTO synchronizer ( time_sync, words, action)
        VALUES (?,?,?)`
    ).bind(time, wordArr.join(','), action)
        .run();
}
*/

export default async function respond(request: Request, data: RequestBodyContentType<any>, env: any): Promise<Response> {
    if (data.requestType === "getDetail") {
        return getDetail(data, env);
    } else if (data.requestType === "wordList") {
        return getWordList(data, env);
    } else if (data.requestType === "putDetail") {
        return putDetail(data, env);
    } else if (data.requestType === "deleteWord") {
        return deleteWord(data, env);
    }
    return getEmptyRes('POST');
}


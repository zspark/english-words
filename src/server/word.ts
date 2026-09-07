import { CSKey, ResponseBody, RequestBody, ResponseData, RequestData, CSType, SyncRecordType, ResponseBodyContentType, RequestBodyContentType, Detail } from "../types.d.js"
import { getSyncData, getLatestTime, getValue, getJSONResponse, getEmptyRes, getInternalErrorRes } from "./server-utils.js";

type DBResultType<T> = {
    success: boolean,
    results: T[],
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

async function getDetail(data: RequestBody<"wordDetail">, env: any): Promise<Response> {
    const detail = await _getDetail(data.content.word, env);
    if (detail.success) {
        const d = detail.results[0];
        return getJSONResponse<"wordDetail">({
            info: "Succeeded.",
            content: d
        });
    } else {
        return getEmptyRes(`No such word: ${data.content.word}.`);
    }
}

export default async function respond(request: Request, data: RequestBodyContentType<any>, env: any): Promise<Response> {
    if (data.requestType === "get-detail") {
        return getDetail(data, env);
    } else if (data.requestType === "get-word-list") {
        return getWordList(data, env);
    }
    return getEmptyRes('POST');
}


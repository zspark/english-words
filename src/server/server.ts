import { SyncRecordType, ResponseBodyContentType, RequestBodyContentType, Detail } from "../types.d.js"
import { getInternalErrorRes, getValue, getParseFailureRes, getEmptyRes, parseJSONString } from "./server-utils.js";
import respond_POST from "./data.js";
import respond from "./word.js";
import respondNotebook from "./notebook.js";
//import { getNews } from "./rss/rss.js";

export default {
    /**
     const Request = {
        // Properties
        method: "GET",
        url: "https://example.com/",
        headers: new Headers(),
        body: null,
        bodyUsed: false,

        mode: "cors",
        credentials: "same-origin",
        cache: "default",
        redirect: "follow",
        referrer: "about:client",
        referrerPolicy: "",
        integrity: "",
        keepalive: false,
        signal: new AbortSignal(),

        // Methods
        json: async function () {},
        text: async function () {},
        formData: async function () {},
        arrayBuffer: async function () {},
        blob: async function () {},
        bytes: async function () {},

        clone: function () {}
    };

    data:{
        requestType: str,
        accessToken: str,
        syncTime: number,
    }

    const Response = {
        // Properties
        status: 200,
        statusText: "OK",
        ok: true,
        headers: new Headers(),
        body: ReadableStream,
        bodyUsed: false,

        redirected: false,
        type: "basic",
        url: "https://example.com/api",

        // Methods
        json: async function () {},
        text: async function () {},
        blob: async function () {},
        formData: async function () {},
        arrayBuffer: async function () {},
        bytes: async function () {},

        clone: function () {}
    };
     */
    async fetch(request: Request, env: any): Promise<Response> {
        try {
            const _data: RequestBodyContentType<any> = await parseJSONString(request) as RequestBodyContentType<any>;
            if (!_data) {
                return getParseFailureRes();
            }

            const _credit = await getValue(_data.accessToken, env);
            if (!_credit) {
                return getEmptyRes("server need a token to process.");
            }
            if (Number(_credit) < 1) {
                return getEmptyRes("your token is restricted.");
            }

            const url = new URL(request.url);
            if (url.pathname === "/api/rss") {
                return getEmptyRes('ROOT');
                //return getNews(request, _data, env);
            } else if (url.pathname === "/api/notebook") {
                return respondNotebook(request, _data, env);
            } else if (url.pathname === "/api/word") {
                return respond(request, _data, env);
            } else if (url.pathname === "/api/data") {
                if (request.method === "POST") {
                    return respond_POST(request, _data, env);
                }
            }
            return getEmptyRes('ROOT');
        } catch (e: any) {
            return getInternalErrorRes(`Internal Error: ${e.message}`);
        }
    }
};

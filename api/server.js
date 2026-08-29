
import { getParseFailureRes, getEmptyRes, parseJSONString } from "./server-utils.js";
import { respond_POST } from "./data/data.js";
import { getNews } from "./rss/rss.js";

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
    async fetch(request, env) {
        const _data = await parseJSONString(request);
        if (!_data) {
            return getParseFailureRes();
        }

        const url = new URL(request.url);
        if (url.pathname === "/api/rss") {
            return getNews(request, _data, env);
        } else if (url.pathname === "/api/data") {
            if (request.method === "POST") {
                return respond_POST(request, _data, env);
            }
        }
        return getEmptyRes('ROOT');
    }
};

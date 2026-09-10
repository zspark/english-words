/**
 *
response = fetch(_, {
        method: "GET",
        headers: new Headers(),
        body: null,

        mode: "cors",
        credentials: "same-origin",
        cache: "default",
        redirect: "follow",
        referrer: "about:client",
        referrerPolicy: "",
        integrity: "",
        keepalive: false,

        signal: new AbortSignal(),

        // other options
    })

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
 *
 */
import logger from "./logger.js";
import cacher from "./cacher.js";
const _localCacher = cacher.localProxy;
async function _toServer_mock(url, requestType, content) {
    // clide side;
    const req = {
        accessToken: _localCacher.get("sec_setting.userID") || "",
        syncTime: _localCacher.get("sec_setting.syncTime") || -1,
        requestType,
        content
    };
    logger.log(`C -> S request type: ${req.requestType}`);
    const request = new Request(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(req),
    });
    /// simulate server side;
    {
        function getJSONResponse(data, status = 200) {
            return Response.json(data, {
                status,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }
        let response = null;
        const data = await request.json();
        const url = new URL(request.url);
        if (url.pathname === "/api/rss") {
            //return getEmptyRes('ROOT');
            //return getNews(request, _data, env);
        }
        else if (url.pathname === "/api/notebook") {
            if (data.requestType === "getNotebook") {
                const _data = data;
                if (_data.content.name === 'default') {
                    response = getJSONResponse({
                        info: "",
                        content: {
                            success: true,
                            list: ['a', 'jjjj', 'mother'],
                            timeSync: -11,
                        }
                    });
                }
                else {
                    response = getJSONResponse({
                        info: "",
                        content: {
                            success: true,
                            list: ['this', 'is', 'another', 'notebook'],
                            timeSync: -11,
                        }
                    });
                }
            }
        }
        else if (url.pathname === "/api/word") {
            if (data.requestType === "getDetail") {
                let _data = data;
                response = getJSONResponse({
                    info: "",
                    content: {
                        word: _data.content.word,
                        success: true,
                        detail: {
                            word: _data.content.word,
                            ipa: "/ɑrˈtɪkjələt/",
                            level: "C1",
                            meaning: "adj. 善于表达的；表达清晰的；v. 清楚地表达",
                            links: "articulately,articulation",
                            tags: '',
                            note: "She is very articulate and can explain complex ideas clearly. 她很善于表达，能够清楚地解释复杂的想法。\n\nThe professor articulated his concerns about the new policy. 教授清楚地表达了他对新政策的担忧。\n\nThe two bones articulate at the knee joint. 这两块骨头在膝关节处连接。",
                            time_create: Date.now(),
                            time_modify: Date.now()
                        }
                    }
                });
            }
            else if (data.requestType === "getWordList") {
                //return getWordList(data, env);
            }
            else if (data.requestType === "putDetail") {
                //return putDetail(data, env);
            }
            else if (data.requestType === "deleteWord") {
                //return deleteWord(data, env);
            }
        }
        else if (url.pathname === "/api/data") {
        }
        try {
            if (!response)
                return null;
            const responseData = await response.json();
            logger.log(`S -> C\n\turl: ${response.url}\n\tstatus: ${response.status}\n\tstatus text: ${response.statusText}\n\tinfo: ${responseData.info}`);
            if (response.ok) {
                if (responseData.syncTime) {
                    _localCacher.set("sec_setting.syncTime", responseData.syncTime);
                }
                return responseData.content;
            }
            return null;
        }
        catch (err) {
            logger.vital(`S -> C ${err}`);
            return null;
        }
    }
}
async function _toServer_real(url, requestType, content) {
    const req = {
        accessToken: _localCacher.get("sec_setting.userID") || "",
        syncTime: _localCacher.get("sec_setting.syncTime") || -1,
        requestType,
        content
    };
    logger.log(`C -> S request type: ${req.requestType}`);
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(req),
    });
    try {
        const responseData = await response.json();
        logger.log(`S -> C\n\turl: ${response.url}\n\tstatus: ${response.status}\n\tstatus text: ${response.statusText}\n\tinfo: ${responseData.info}`);
        if (response.ok) {
            if (responseData.syncTime) {
                _localCacher.set("sec_setting.syncTime", responseData.syncTime);
            }
            return responseData.content;
        }
        return null;
    }
    catch (err) {
        logger.vital(`S -> C ${err}`);
        return null;
    }
}
let _toServer = window.location.href.includes("localhost") ? _toServer_mock : _toServer_real;
class ServerProxy {
    EVT_NEWS = "EVT_NEWS";
    EVT_SYNC_ALL = "EVT_SYNC_ALL";
    EVT_SYNC = "EVT_SYNC";
    EVT_GET_NOTEBOOK = "EVT_GET_NOTEBOOK";
    EVT_PUT_NOTEBOOK = "EVT_PUT_NOTEBOOK";
    EVT_GET_DETAIL = "EVT_GET_DETAIL";
    EVT_PUT_DETAIL = "EVT_PUT_DETAIL";
    EVT_DELETE_WORD = "EVT_DELETE_WORD";
    EVT_GET_WORDLIST = "EVT_GET_WORDLIST";
    #_et = new EventTarget();
    addEventListener(type, cb) {
        this.#_et.addEventListener(type, cb);
    }
    async sync(content) {
        const detail = await _toServer("../api/data", "sync", content);
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_SYNC, { detail }));
        }
    }
    async syncAll() {
        const detail = await _toServer("../api/data", "syncAll", {});
        this.#_et.dispatchEvent(new CustomEvent(this.EVT_SYNC_ALL, { detail }));
    }
    async getWordList() {
        const detail = await _toServer("../api/word", "getWordList", {});
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_WORDLIST, { detail }));
        }
    }
    async deleteWord(detail) {
        const out = await _toServer("../api/word", "deleteWord", { detail });
        if (out) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_DELETE_WORD, { detail: out }));
        }
    }
    async getDetail(word, aiProvider = "_NONE_", apiKey = "") {
        const detail = await _toServer("../api/word", "getDetail", { word, aiProvider, apiKey });
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_DETAIL, { detail }));
        }
    }
    async putDetail(detail) {
        const out = await _toServer("../api/word", "putDetail", { detail });
        if (out) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_PUT_DETAIL, { detail: out }));
        }
    }
    async putNotebook(name, list) {
        const detail = await _toServer("../api/notebook", "putNotebook", { name, list });
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_PUT_NOTEBOOK, { detail }));
        }
    }
    async getNotebook(name) {
        const detail = await _toServer("../api/notebook", "getNotebook", { name });
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_NOTEBOOK, { detail }));
        }
    }
    async getNews(vendor) {
        const detail = await _toServer("../api/word", "getNews", { vendor });
        this.#_et.dispatchEvent(new CustomEvent(this.EVT_NEWS, { detail }));
    }
}
const __this__ = Object.freeze(new ServerProxy());
export default __this__;

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
const _localProxy = cacher.localProxy;
const _data = _localProxy.get("sec_setting", {});
async function _toServer(url, requestType, content) {
    const req = {
        accessToken: _data["userID"] || "",
        syncTime: _data['syncTime'] || 1,
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
        logger.log(`S -> C ${response.url}: ${response.status}: ${response.statusText}`);
        const responseData = await response.json();
        if (response.ok) {
            if (responseData.syncTime) {
                _data["syncTime"] = responseData.syncTime;
                _localProxy.save();
            }
            return responseData.content;
        }
        logger.error(`S -> C respnse info: ${responseData.info}`);
        return null;
    }
    catch (err) {
        logger.vital(`S -> C ${err}`);
        return null;
    }
}
class ServerProxy {
    EVT_NEWS = "EVT_NEWS";
    EVT_SYNC_ALL = "EVT_SYNC_ALL";
    EVT_SYNC = "EVT_SYNC";
    EVT_GET_DETAIL = "EVT_GET_DETAIL";
    EVT_PUT_DETAIL = "EVT_PUT_DETAIL";
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
        const detail = await _toServer("../api/word", "wordList", undefined);
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_WORDLIST, { detail }));
        }
    }
    async getDetail(word) {
        const detail = await _toServer("../api/word", "getDetail", { word });
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
    async getNews(vendor) {
        const detail = await _toServer("../api/word", "getNews", { vendor });
        this.#_et.dispatchEvent(new CustomEvent(this.EVT_NEWS, { detail }));
    }
}
const __this__ = Object.freeze(new ServerProxy());
export default __this__;

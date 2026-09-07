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
const _connectionBreakRes = Object.freeze({
    info: 'Internet Disconnected.',
    content: undefined,
});
const _localProxy = cacher.localProxy;
const _data = _localProxy.get("sec_setting", {});
async function _toServer(url, data) {
    logger.log(`C -> S request type: ${data.requestType}`);
    const _response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data, null, 4),
    });
    try {
        logger.log(`S -> C ${_response.url}: ${_response.status}: ${_response.statusText}`);
        const _responseData = await _response.json();
        logger.log(`S -> C ${_responseData}`);
        if (_response.ok) {
            if (_responseData.syncTime) {
                _data['syncTime'] = _responseData.syncTime;
                _localProxy.save();
            }
            // logger.debug(`${_responseData}`);
            return _responseData.content;
        }
        return _connectionBreakRes;
    }
    catch (err) {
        logger.vital(`To server: ${err}`);
        return _connectionBreakRes;
    }
}
function _composeRquestData(requestType, content) {
    return {
        accessToken: _data["userID"] || "",
        syncTime: _data['syncTime'] || 1,
        requestType,
        content
    };
}
class ServerProxy {
    EVT_NEWS = "EVT_NEWS";
    EVT_SYNC_ALL = "EVT_SYNC_ALL";
    EVT_SYNC = "EVT_SYNC";
    EVT_GET_DETAIL = "EVT_GET_DETAIL";
    EVT_GET_WORDLIST = "EVT_GET_WORDLIST";
    #_et = new EventTarget();
    addEventListener(type, cb) {
        this.#_et.addEventListener(type, cb);
    }
    async sync(content) {
        const detail = await _toServer("../api/data", _composeRquestData("sync", content));
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_SYNC, { detail }));
        }
    }
    async syncAll() {
        const detail = await _toServer("../api/data", _composeRquestData("sync-all", {}));
        this.#_et.dispatchEvent(new CustomEvent(this.EVT_SYNC_ALL, { detail }));
    }
    async getWordList() {
        const detail = await _toServer("../api/word", _composeRquestData("get-word-list", undefined));
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_WORDLIST, { detail }));
        }
    }
    async getDetail(word) {
        const detail = await _toServer("../api/word", _composeRquestData("get-detail", { word }));
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_DETAIL, { detail }));
        }
    }
    async getNews(vendor) {
        const detail = await _toServer("../api/word", _composeRquestData("get-news", { vendor }));
        this.#_et.dispatchEvent(new CustomEvent(this.EVT_NEWS, { detail }));
    }
}
const __this__ = Object.freeze(new ServerProxy());
export default __this__;

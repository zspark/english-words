
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
import logger from "./logger.js"
import cacher from "./cacher.js"
import { ResponseData, ResponseCallback, RequestData } from "./types.js"

const _localProxy = cacher.localProxy;
const _data = _localProxy.get("sec_setting", {});

type OutTpye = Promise<ResponseData>;

async function _toServer(url: string, data: RequestData): OutTpye {
    logger.log(`C -> S request type: ${data.requestType}`);

    data.accessToken = _data["userID"] || "";
    data.syncTime = _data['syncTime'] || 1;

    const _response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data, null, 4),
    });

    try {
        const _responseData = await _response.json();
        logger.log(`S -> C ${_response.status} ${_responseData.info}`);
        if (_response.ok) {
            if (_responseData.syncTime) {
                _data['syncTime'] = _responseData.syncTime;
                _localProxy.save();
            }
            // logger.debug(`${_responseData}`);
            return _responseData.content;
        }
        return null;
    } catch (err) {
        logger.vital(`To server: ${err}`);
        return null;
    }
}

class ServerProxy {
    readonly EVT_NEWS = "EVT_NEWS";
    readonly EVT_SYNC_ALL = "EVT_SYNC_ALL";
    readonly EVT_SYNC = "EVT_SYNC";
    #_et: EventTarget = new EventTarget();


    addEventListener(type: string, cb: ResponseCallback) {
        this.#_et.addEventListener(type, cb as EventListener);
    }

    async sync(content: {}): Promise<void> {
        const detail: ResponseData = await _toServer("../api/data", {
            requestType: "sync",
            content,
        })
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent<ResponseData>(this.EVT_SYNC, { detail }));
        }
    }

    async syncAll(): Promise<void> {
        const detail: ResponseData = await _toServer("../api/data", {
            requestType: "sync-all",
            content: {},
        })
        this.#_et.dispatchEvent(new CustomEvent(this.EVT_SYNC_ALL, { detail }));
    }

    async getNews(vendor: string): Promise<void> {
        const detail: ResponseData = await _toServer("../api/rss", {
            requestType: "get-news",
            content: {
                vendor
            },
        })
        this.#_et.dispatchEvent(new CustomEvent(this.EVT_NEWS, { detail }));
    }

}

const __this__ = Object.freeze(new ServerProxy());

export default __this__;



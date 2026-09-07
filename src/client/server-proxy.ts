
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
import { CSType, RequestType, Detail, RequestBodyContentType, ResponseBodyContentType, ResponseCallback } from "../types.d.js"

const _connectionBreakRes: ResponseBodyContentType<undefined> = Object.freeze({
    info: 'Internet Disconnected.',
    content: undefined,
});

const _localProxy = cacher.localProxy;
const _data = _localProxy.get("sec_setting", {});

async function _toServer<C extends RequestBodyContentType<any>, S extends ResponseBodyContentType<any>>(url: string, data: C): Promise<S> {
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
        return _connectionBreakRes as S;
    } catch (err) {
        logger.vital(`To server: ${err}`);
        return _connectionBreakRes as S;
    }
}

function _composeRquestData<T>(requestType: RequestType, content: T): RequestBodyContentType<T> {
    return {
        accessToken: _data["userID"] || "",
        syncTime: _data['syncTime'] || 1,
        requestType,
        content
    }
}

class ServerProxy {
    readonly EVT_NEWS = "EVT_NEWS";
    readonly EVT_SYNC_ALL = "EVT_SYNC_ALL";
    readonly EVT_SYNC = "EVT_SYNC";
    readonly EVT_GET_DETAIL = "EVT_GET_DETAIL";
    readonly EVT_GET_WORDLIST = "EVT_GET_WORDLIST";

    #_et: EventTarget = new EventTarget();

    addEventListener<T>(type: string, cb: ResponseCallback<T>) {
        this.#_et.addEventListener(type, cb as EventListener);
    }

    async sync(content: {}): Promise<void> {
        type C = CSType['sync']['C'];
        type S = CSType['sync']['S'];
        const detail: S = await _toServer<C, S>(
            "../api/data",
            _composeRquestData("sync", content)
        )
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent<S>(this.EVT_SYNC, { detail }));
        }
    }

    async syncAll(): Promise<void> {
        type C = CSType['syncAll']['C'];
        type S = CSType['syncAll']['S'];
        const detail: S = await _toServer<C, S>(
            "../api/data",
            _composeRquestData("sync-all", {})
        )

        this.#_et.dispatchEvent(new CustomEvent<S>(this.EVT_SYNC_ALL, { detail }));
    }

    async getWordList(): Promise<void> {
        type C = CSType['wordList']['C'];
        type S = CSType['wordList']['S'];
        const detail: S = await _toServer<C, S>(
            "../api/word",
            _composeRquestData<C['content']>("get-word-list", undefined)
        )
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent<S>(this.EVT_GET_WORDLIST, { detail }));
        }
    }
    async getDetail(word: string): Promise<void> {
        type C = CSType['wordDetail']['C'];
        type S = CSType['wordDetail']['S'];
        const detail: S = await _toServer<C, S>(
            "../api/word",
            _composeRquestData<C['content']>("get-detail", { word })
        );
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent<S>(this.EVT_GET_DETAIL, { detail }));
        }
    }

    async getNews(vendor: string): Promise<void> {
        type C = CSType['getNews']['C'];
        type S = CSType['getNews']['S'];
        const detail: S = await _toServer<C, S>(
            "../api/word",
            _composeRquestData<C['content']>("get-news", { vendor })
        );
        this.#_et.dispatchEvent(new CustomEvent<S>(this.EVT_NEWS, { detail }));
    }

}

const __this__ = Object.freeze(new ServerProxy());

export default __this__;



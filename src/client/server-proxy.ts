
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
import { RequestData, ResponseData, RequestBody, ResponseBody, CSKey, CSType, RequestType, Detail, RequestBodyContentType, ResponseBodyContentType, ResponseCallback } from "../types.d.js"

const _localCacher = cacher.localProxy;

async function _toServer<K extends CSKey>(url: string, requestType: RequestType, content: RequestData<K>): Promise<ResponseData<K> | null> {
    const req: RequestBody<K> = {
        accessToken: _localCacher.get("sec_setting.userID") || "",
        syncTime: _localCacher.get("sec_setting.syncTime") || -1,
        requestType,
        content
    }
    logger.log(`C -> S request type: ${req.requestType}`);

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(req),
    });

    try {
        const responseData = await response.json() as ResponseBody<K>;
        logger.log(`S -> C\n\turl: ${response.url}\n\tstatus: ${response.status}\n\tstatus text: ${response.statusText}\n\tinfo: ${responseData.info}`);

        if (response.ok) {
            if (responseData.syncTime) {
                _localCacher.set("sec_setting.syncTime", responseData.syncTime);
            }

            return responseData.content;
        }

        return null;
    } catch (err: any) {
        logger.vital(`S -> C ${err}`);
        return null;
    }
}

class ServerProxy {
    readonly EVT_NEWS = "EVT_NEWS";
    readonly EVT_SYNC_ALL = "EVT_SYNC_ALL";
    readonly EVT_SYNC = "EVT_SYNC";
    readonly EVT_GET_DETAIL = "EVT_GET_DETAIL";
    readonly EVT_PUT_DETAIL = "EVT_PUT_DETAIL";
    readonly EVT_DELETE_WORD = "EVT_DELETE_WORD";
    readonly EVT_GET_WORDLIST = "EVT_GET_WORDLIST";

    #_et: EventTarget = new EventTarget();

    addEventListener<K extends CSKey>(type: string, cb: ResponseCallback<ResponseData<K>>) {
        this.#_et.addEventListener(type, cb as EventListener);
    }

    async sync(content: {}): Promise<void> {
        const detail = await _toServer<"sync">(
            "../api/data",
            "sync",
            content,
        )
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_SYNC, { detail }));
        }
    }

    async syncAll(): Promise<void> {
        const detail = await _toServer<"syncAll">(
            "../api/data",
            "syncAll",
            {}
        )

        this.#_et.dispatchEvent(new CustomEvent(this.EVT_SYNC_ALL, { detail }));
    }

    async getWordList(): Promise<void> {
        const detail = await _toServer<"getWordList">(
            "../api/word",
            "getWordList",
            {}
        )
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_WORDLIST, { detail }));
        }
    }
    async deleteWord(detail: Detail): Promise<void> {
        const out = await _toServer<"deleteWord">(
            "../api/word",
            "deleteWord",
            { detail }
        );
        if (out) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_DELETE_WORD, { detail: out }));
        }
    }
    async getDetail(word: string): Promise<void> {
        const detail = await _toServer<"getDetail">(
            "../api/word",
            "getDetail",
            { word }
        );
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_DETAIL, { detail }));
        }
    }
    async putDetail(detail: Detail): Promise<void> {
        const out = await _toServer<"putDetail">(
            "../api/word",
            "putDetail",
            { detail }
        );
        if (out) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_PUT_DETAIL, { detail: out }));
        }
    }

    async getNews(vendor: string): Promise<void> {
        const detail = await _toServer<"getNews">(
            "../api/word",
            "getNews",
            { vendor }
        );
        this.#_et.dispatchEvent(new CustomEvent(this.EVT_NEWS, { detail }));
    }

}

const __this__ = Object.freeze(new ServerProxy());

export default __this__;



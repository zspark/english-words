
import { fetchJsonData, objectToBase64 } from "./utils.js"
import logger from "./logger.js"
import cacher from "./cacher.js"
import { LocalSettingCacheType, TGithubPush, TNotebook, TNotebooks, AIProvider, RequestData, ResponseData, RequestBody, ResponseBody, CSKey, CSType, RequestType, Detail, RequestBodyContentType, ResponseBodyContentType, ResponseCallback } from "../types.d.js"

const _localCacher = cacher.localProxy;

//type CSFn = <K extends CSKey>(url: string, t: RequestType, c: RequestData<K>) => Promise<ResponseData<K> | null>;

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
    readonly EVT_GET_CONFIG = "EVT_GET_CONFIG";
    readonly EVT_GET_NOTEBOOK = "EVT_GET_NOTEBOOK";
    readonly EVT_PUT_NOTEBOOK = "EVT_PUT_NOTEBOOK";
    readonly EVT_GET_DETAIL = "EVT_GET_DETAIL";
    readonly EVT_PUT_DETAIL = "EVT_PUT_DETAIL";
    readonly EVT_DELETE_WORD = "EVT_DELETE_WORD";
    readonly EVT_GET_WORDLIST = "EVT_GET_WORDLIST";
    readonly EVT_GET_DICTIONARY = "EVT_GET_DICTIONARY";

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
    async getDetail(word: string, aiProvider: AIProvider = "_NONE_", apiKey: string = ""): Promise<void> {
        const detail = await _toServer<"getDetail">(
            "../api/word",
            "getDetail",
            { word, aiProvider, apiKey }
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
    async putNotebook(notebook: TNotebooks): Promise<void> {
        const detail = await _toServer<"putNotebook">(
            "../api/notebook",
            "putNotebook",
            { notebook }
        );
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_PUT_NOTEBOOK, { detail }));
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

    async pushToGithub(content: any, fileURL: string): Promise<void> {
        const _localData: LocalSettingCacheType = cacher.localProxy.get<any>('sec_setting', {});
        if (_localData.githubToken === '') return;
        const _data: TGithubPush = {
            token: _localData.githubToken,
            rep: 'english-tmp',
            path: fileURL,
            content: objectToBase64(content),
            message: content.message ?? `commit at : ${Date.now()}`,
            branch: content.branch ?? "main",
        }
        const detail = await _toServer<"push">(
            "../api/github",
            "push",
            _data,
        );
        logger.debug("pushed to github");
    }

    async getDictionary(): Promise<void> {
        const data = await fetchJsonData(`https://raw.githubusercontent.com/zspark/english-tmp/main/dictionary.json`);
        if (data) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_DICTIONARY, { detail: { content: data, sha: "" } }));
        }
    }

    async getNotebook(): Promise<void> {
        const data = await fetchJsonData(`https://raw.githubusercontent.com/zspark/english-tmp/main/notebooks.json`);
        if (data) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_NOTEBOOK, { detail: { content: data, sha: "" } }));
        }
    }

    async getConfig(): Promise<void> {
        const data = await fetchJsonData(`https://raw.githubusercontent.com/zspark/english-tmp/main/config.json`);
        if (data) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_CONFIG, { detail: { content: data, sha: "" } }));
        }
    }

    async pullFromGithub(branch: string, url: string): Promise<void> {
        /*
        const detail = await _toServer<"pull">(
            "../api/github",
            "pull",
            { branch, url }
        );

        logger.log(detail?.content);
        */

        const data = await fetchJsonData(`https://raw.githubusercontent.com/zspark/english-tmp/main/${url}`);
        if (data) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_DICTIONARY, { detail: { content: data, sha: "" } }));
        }
    }
}

const __this__ = Object.freeze(new ServerProxy());

export default __this__;



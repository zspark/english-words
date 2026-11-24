import { fetchJsonData, objectToBase64 } from "./utils.js";
import logger from "./logger.js";
import cacher from "./cacher.js";
const _localCacher = cacher.localProxy;
//type CSFn = <K extends CSKey>(url: string, t: RequestType, c: RequestData<K>) => Promise<ResponseData<K> | null>;
async function _toServer(url, requestType, content) {
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
class ServerProxy {
    EVT_NEWS = "EVT_NEWS";
    EVT_SYNC_ALL = "EVT_SYNC_ALL";
    EVT_SYNC = "EVT_SYNC";
    EVT_GET_CONFIG = "EVT_GET_CONFIG";
    EVT_GET_NOTEBOOK = "EVT_GET_NOTEBOOK";
    EVT_PUT_NOTEBOOK = "EVT_PUT_NOTEBOOK";
    EVT_GET_DETAIL = "EVT_GET_DETAIL";
    EVT_PUT_DETAIL = "EVT_PUT_DETAIL";
    EVT_DELETE_WORD = "EVT_DELETE_WORD";
    EVT_GET_WORDLIST = "EVT_GET_WORDLIST";
    EVT_GET_DICTIONARY = "EVT_GET_DICTIONARY";
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
    async putNotebook(notebook) {
        const detail = await _toServer("../api/notebook", "putNotebook", { notebook });
        if (detail) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_PUT_NOTEBOOK, { detail }));
        }
    }
    async getNews(vendor) {
        const detail = await _toServer("../api/word", "getNews", { vendor });
        this.#_et.dispatchEvent(new CustomEvent(this.EVT_NEWS, { detail }));
    }
    async pushToGithub(content, fileURL) {
        const _localData = cacher.localProxy.get('sec_setting', {});
        if (_localData.githubToken === '')
            return;
        const _data = {
            token: _localData.githubToken,
            rep: 'english-tmp',
            path: fileURL,
            content: objectToBase64(content),
            message: content.message ?? `commit at : ${Date.now()}`,
            branch: content.branch ?? "main",
        };
        const detail = await _toServer("../api/github", "push", _data);
        logger.debug("pushed to github");
    }
    async getDictionary() {
        const data = await fetchJsonData(`https://raw.githubusercontent.com/zspark/english-tmp/main/dictionary.json`);
        if (data) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_DICTIONARY, { detail: { content: data, sha: "" } }));
        }
    }
    async getNotebook() {
        const data = await fetchJsonData(`https://raw.githubusercontent.com/zspark/english-tmp/main/notebooks.json`);
        if (data) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_NOTEBOOK, { detail: { content: data, sha: "" } }));
        }
    }
    async getConfig() {
        const data = await fetchJsonData(`https://raw.githubusercontent.com/zspark/english-tmp/main/config.json`);
        if (data) {
            this.#_et.dispatchEvent(new CustomEvent(this.EVT_GET_CONFIG, { detail: { content: data, sha: "" } }));
        }
    }
    async pullFromGithub(branch, url) {
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

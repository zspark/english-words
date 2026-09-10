import { assertTrue } from "./assert.js";
import logger from "./logger.js";
import cacher, { StorageCacher } from "./cacher.js";
import serverProxy from "./server-proxy.js";
const _notebookCache = new StorageCacher('__notebook__');
const _DEFAULT_NB_NAME_ = "default";
export default class Notebook extends EventTarget {
    static EVT_LIST_CHANGED = "EVT_LIST_CHANGED";
    static EVT_LIST_CONFLICT = "EVT_LIST_CONFLICT";
    #_name;
    #_dict;
    #_words = {};
    constructor(dict) {
        super();
        this.#_dict = dict;
        this.#_name = cacher.localProxy.get("sec_setting.notebook", _DEFAULT_NB_NAME_);
        serverProxy.addEventListener(serverProxy.EVT_GET_NOTEBOOK, (event) => {
            const _data = event.detail;
            logger.debug('getNotebook, server feedback notebook content:', _data);
            if (_data) {
                this.#_words = {};
                _data.list.forEach(w => {
                    this.#_words[w] = dict.getWord(w, true);
                });
                this.dispatchEvent(new CustomEvent(Notebook.EVT_LIST_CHANGED));
            }
        });
        serverProxy.addEventListener(serverProxy.EVT_PUT_NOTEBOOK, (event) => {
            const _data = event.detail;
            logger.debug('putNotebook, server feedback notebook content:', _data);
            if (_data) {
                if (_data.success) {
                    assertTrue(_data.list.length === 0);
                    logger.debug(`putNotebook success`);
                    this.dispatchEvent(new CustomEvent(Notebook.EVT_LIST_CHANGED));
                    return;
                }
                logger.debug(`putNotebook failed, maybe server has a newer version.`);
                this.dispatchEvent(new CustomEvent(Notebook.EVT_LIST_CONFLICT, { detail: _data }));
            }
        });
        this.changeNotebook(this.#_name);
    }
    get name() { return this.#_name; }
    getWords(searchQuery, level, tag) {
        if (this.#_name === _DEFAULT_NB_NAME_) {
            return this.#_dict.getWords(searchQuery, level, tag);
        }
        else
            return this.#_words;
    }
    changeNotebook(name) {
        name = name ?? _DEFAULT_NB_NAME_;
        this.#_name = name;
        if (name === _DEFAULT_NB_NAME_) {
            this.dispatchEvent(new CustomEvent(Notebook.EVT_LIST_CHANGED));
        }
        else {
            serverProxy.getNotebook(name);
        }
    }
    addWords(...words) {
        words.forEach(w => {
            this.#_words[w] = this.#_dict.getWord(w, true);
        });
        serverProxy.putNotebook(this.#_name, Object.keys(this.#_words));
    }
    getWordsCount() {
        if (this.#_name === _DEFAULT_NB_NAME_) {
            return this.#_dict.getWordsCount();
        }
        else {
            return Object.keys(this.#_words).length;
        }
    }
}

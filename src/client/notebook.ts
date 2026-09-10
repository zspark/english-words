import { AIProvider, ActionWord, Detail, Words, Results, Result, Dict, DictSyncData, WordLevelType } from "../types.d.js"
import { assertTrue } from "./assert.js"
import Dictionary from "./dictionary.js"
import logger from "./logger.js"
import cacher, { StorageCacher } from "./cacher.js"
import serverProxy from "./server-proxy.js"

const _notebookCache = new StorageCacher('__notebook__');

const _DEFAULT_NB_NAME_: string = "default";

export default class Notebook extends EventTarget {

    static EVT_LIST_CHANGED: string = "EVT_LIST_CHANGED";
    static EVT_LIST_CONFLICT: string = "EVT_LIST_CONFLICT";

    #_name: string;
    #_dict: Dictionary;
    #_words: Words = {};

    constructor(dict: Dictionary) {
        super();
        this.#_dict = dict;
        this.#_name = cacher.localProxy.get<string>("sec_setting.notebook", _DEFAULT_NB_NAME_);

        serverProxy.addEventListener<'getNotebook'>(serverProxy.EVT_GET_NOTEBOOK, (event) => {
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

        serverProxy.addEventListener<'putNotebook'>(serverProxy.EVT_PUT_NOTEBOOK, (event) => {
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

    get name(): string { return this.#_name; }

    getWords(searchQuery: string, level: WordLevelType, tag: string): Words {
        if (this.#_name === _DEFAULT_NB_NAME_) {
            return this.#_dict.getWords(searchQuery, level, tag);
        } else return this.#_words;
    }

    changeNotebook(name?: string): void {
        name = name ?? _DEFAULT_NB_NAME_;
        this.#_name = name;
        if (name === _DEFAULT_NB_NAME_) {
            this.dispatchEvent(new CustomEvent(Notebook.EVT_LIST_CHANGED));
        } else {
            serverProxy.getNotebook(name);
        }
    }

    addWords(...words: string[]): void {
        words.forEach(w => {
            this.#_words[w] = this.#_dict.getWord(w, true);
        })
        serverProxy.putNotebook(this.#_name, Object.keys(this.#_words));

    }

    getWordsCount(): number {
        if (this.#_name === _DEFAULT_NB_NAME_) {
            return this.#_dict.getWordsCount();
        } else {
            return Object.keys(this.#_words).length;
        }
    }
}

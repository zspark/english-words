import serverProxy from "./server-proxy.js";
import Dictionary from "./dictionary.js";
import logger from "./logger.js";
import cacher from "./cacher.js";
const _DEFAULT_NB_NAME_ = "default";
export default class NotebookManager extends EventTarget {
    static EVT_CONTENT_FETCHED = "EVT_CONTENT_FETCHED";
    static EVT_LIST_CHANGED = "EVT_LIST_CHANGED";
    static EVT_LIST_CONFLICT = "EVT_LIST_CONFLICT";
    static EVT_CREATED = "EVT_CREATED";
    static get defaultName() { return _DEFAULT_NB_NAME_; }
    #_dict;
    #_name;
    #_notebooks = {};
    #_words = {};
    constructor(dict) {
        super();
        this.#_name = _DEFAULT_NB_NAME_;
        this.#_dict = dict;
        serverProxy.addEventListener(serverProxy.EVT_GET_NOTEBOOK, (event) => {
            logger.debug("notebook list received from server");
            const _data = event.detail;
            if (_data?.content) {
                let dict = this.#_dict;
                Object.keys(_data.content).forEach(name => {
                    const nb = this.#_notebooks[name] = {};
                    Object.entries(_data.content[name]).forEach(r => {
                        nb[r[0]] = {
                            tested: r[1].tested,
                            passed: r[1].passed,
                        };
                    });
                    const _ws = this.#_words[name] = {};
                    Object.entries(_data.content[name]).forEach(r => {
                        _ws[r[0]] = dict.getWord(r[0], false);
                    });
                });
                const _name = cacher.localProxy.get("sec_setting.notebook", _DEFAULT_NB_NAME_);
                this.#_changeNotebook(_name === _DEFAULT_NB_NAME_ ? undefined : _name);
                this.dispatchEvent(new CustomEvent(NotebookManager.EVT_CONTENT_FETCHED));
            }
        });
        dict.addEventListener(Dictionary.EVT_DICT_FETCHED, () => {
            serverProxy.getNotebook();
        });
    }
    get name() { return this.#_name; }
    get isDefaultNotebook() { return this.#_name === _DEFAULT_NB_NAME_; }
    async upload() {
        // this.#_dispDictEvt(`begin:sync`);
        //checkUsers();
        await serverProxy.pushToGithub(this.#_notebooks, 'notebooks.json');
        // this.#_dispDictEvt(`end:sync`);
    }
    getWords(searchQuery, level, tag) {
        if (this.#_name === _DEFAULT_NB_NAME_) {
            return this.#_dict.getWords(searchQuery, level, tag);
        }
        else {
            return this.#_words[this.#_name];
        }
    }
    #_changeNotebook(name) {
        if (name) {
            if (name === this.#_name)
                return;
            if (this.#_notebooks[name]) {
                this.#_name = name;
            }
        }
        else {
            this.#_name = _DEFAULT_NB_NAME_;
        }
        cacher.localProxy.set("sec_setting.notebook", this.#_name);
    }
    changeNotebook(name) {
        this.#_changeNotebook(name);
        this.dispatchEvent(new CustomEvent(NotebookManager.EVT_LIST_CHANGED));
    }
    addWords(name, ...words) {
        if (words.length <= 0)
            return;
        name = name ?? this.#_name;
        if (name === _DEFAULT_NB_NAME_)
            return;
        const _ws = this.#_words[name];
        if (!_ws)
            return;
        const _nb = this.#_notebooks[name];
        words.forEach(w => {
            _ws[w] = this.#_dict.getWord(w);
            _nb[w] = { tested: 0, passed: false };
        });
        this.dispatchEvent(new CustomEvent(NotebookManager.EVT_LIST_CHANGED));
    }
    removeWords(name, ...words) {
        if (words.length <= 0)
            return;
        name = name ?? this.#_name;
        if (name === _DEFAULT_NB_NAME_)
            return;
        const _ws = this.#_words[name];
        if (!_ws)
            return;
        const _nb = this.#_notebooks[name];
        words.forEach(w => {
            delete _ws[w];
            delete _nb[w];
        });
        this.dispatchEvent(new CustomEvent(NotebookManager.EVT_LIST_CHANGED));
    }
    getWordsCount() {
        if (this.#_name === _DEFAULT_NB_NAME_) {
            return this.#_dict.getWordsCount();
        }
        else {
            return Object.keys(this.#_notebooks[this.#_name]).length;
        }
    }
    createNotebook(name) {
        name = name.trim();
        if (name.length <= 0)
            return;
        if (name === _DEFAULT_NB_NAME_)
            return;
        if (this.#_notebooks[name])
            return;
        this.#_notebooks[name] = {};
        this.#_words[name] = {};
        this.dispatchEvent(new CustomEvent(NotebookManager.EVT_CREATED));
    }
    getNotebookNames() {
        return Object.keys(this.#_notebooks);
    }
}

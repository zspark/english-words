// ===============================
// Word Cache Management
// ===============================
var _a;
import { cloneDetail, readOnly } from "./utils.js";
import logger from "./logger.js";
import cacher, { StorageCacher } from "./cacher.js";
import serverProxy from "./server-proxy.js";
import Compare, { compareET, EVT_CMP_MODIFY, EVT_CMP_DELETE } from "./compare.js";
const __VERSION__ = "0.3.0";
let _needToUpload = false;
const _localProxy = cacher.localProxy;
const _metaProxy = cacher.metaProxy;
const _recordsProxy = cacher.recordsProxy;
const _detailCacher = cacher.wordsProxy;
const _listCacher = new StorageCacher('__listCache__');
class SearchHelper {
    #_flexSearch;
    constructor() {
        this.#_flexSearch = this.#_create();
        this.addWords(_listCacher.data());
    }
    #_create() {
        return new FlexSearch.Index({
            preset: "memory",
            tokenize: "full",
            resolution: 5,
            minlength: 2
        });
    }
    addWord(word) {
        this.#_flexSearch.add(word, word);
    }
    addWords(words) {
        const _arr = Object.keys(words);
        _arr.forEach(w => this.#_flexSearch.add(w, w));
    }
    search(query) {
        if (query.length <= 0)
            return null;
        return this.#_flexSearch.search(query);
    }
    removeWord(word) {
        this.#_flexSearch.remove(word);
    }
    clear() {
        this.#_flexSearch = this.#_create();
    }
}
const _MOCK_NO_LOCAL_DETAIL_ = Object.freeze({
    word: '',
    ipa: "",
    meaning: "",
    level: "ALL",
    tags: "",
    note: "this word has NOT been downloaded.",
    links: "",
    time_create: -1,
    time_modify: -1,
});
const _MOCK_FETCH_DETAIL_ = Object.freeze({
    word: '',
    ipa: "",
    meaning: "",
    level: "ALL",
    tags: "",
    note: "fetching from the server ...",
    links: "",
    time_create: -1,
    time_modify: -1,
});
const _SYMBOLIC_LOGIC_ = Object.freeze({
    // add:1 delete:2 modify:3
    '21': '3', // first 'delete' then 'add' -> it is a 'modify' operation.
    '22': '-1', // doesn't logic, delete then delete?
    '23': '-1',
    '11': '-1',
    '12': '', // ignore
    '13': '1',
    '31': '-1',
    '32': '2',
    '33': '3',
});
class Dictionary extends EventTarget {
    static EVT_RECORD = "EVT_RECORD";
    static EVT_DICT = "EVT_DICT";
    static EVT_WORD_MODIFY = "EVT_WORD_MODIFY";
    static EVT_WORD_ADD = "EVT_WORD_ADD";
    static EVT_WORD_DELETE = "EVT_WORD_DELETE";
    #_arr = [];
    #_syncTimer;
    #_searchAPI;
    constructor() {
        super();
        this.#_searchAPI = new SearchHelper();
        this.setSyncInterval(_localProxy.get("sec_setting.syncInterval", 10));
        serverProxy.addEventListener(serverProxy.EVT_SYNC_ALL, (event) => {
            const _data = event.detail;
            if (_data) {
                _detailCacher.clear();
                this.importDictionaryByContent(_data);
            }
        });
        serverProxy.addEventListener(serverProxy.EVT_GET_DETAIL, (event) => {
            const _data = event.detail;
            if (_data) {
                if (_data.success) {
                    _detailCacher.set(_data.word, _data.detail);
                    _listCacher.set(_data.detail.word, true);
                }
                this.#_dispEvt(_a.EVT_WORD_MODIFY, _data.detail);
            }
        });
        serverProxy.addEventListener(serverProxy.EVT_GET_WORDLIST, (event) => {
            const _data = event.detail;
            if (_data?.list) {
                _listCacher.clear();
                _data.list.forEach(w => {
                    _listCacher.set(w, true);
                });
            }
        });
        /*
        serverProxy.addEventListener<'sync'>(serverProxy.EVT_SYNC, (event) => {
            const _data = event.detail;
            if (_data) {
                this.assignWords((_data as DictSyncData).dict);
                (_data as DictSyncData).lists.dellist.forEach(w => this.deleteWord(w, false));
                this.#_dispDictEvt("delete");
            }
        });
        */
        serverProxy.addEventListener(serverProxy.EVT_DELETE_WORD, (event) => {
            const _data = event.detail;
            if (_data) {
                if (_data.success) {
                    const _detail = _detailCacher.get(_data.word);
                    if (!_detail)
                        return;
                    const word = _detail.word;
                    const _parseLinks = (str) => {
                        if (!str)
                            return [];
                        return str.split(',').map(w => w.trim()).filter(w => w.length > 0);
                    };
                    const _linksArray = _parseLinks(_detail.links);
                    _linksArray.forEach(_linkedWord => {
                        this.#_removeLink(_linkedWord, word);
                    });
                    _listCacher.remove(word);
                    _detailCacher.remove(word);
                    this.#_searchAPI.removeWord(word);
                    this.#_dispEvt(_a.EVT_WORD_DELETE, _detail);
                }
                else {
                    /// show different panel;
                    new Compare(_data.clientDetail, _data.serverDetail, "modify");
                }
            }
        });
        serverProxy.addEventListener(serverProxy.EVT_PUT_DETAIL, (event) => {
            const _data = event.detail;
            if (_data) {
                if (_data.success) {
                    const word = _data.word;
                    const _oldDetail = _detailCacher.get(word);
                    this.#_updateLink(word, _oldDetail?.links, _data.serverDetail.links);
                    _detailCacher.set(word, _data.serverDetail);
                    if (_data.serverDetail.time_modify === _data.serverDetail.time_create) {
                        _listCacher.set(word, true);
                        _detailCacher.set(word, _data.serverDetail);
                        this.#_dispEvt(_a.EVT_WORD_ADD, word);
                        this.#_searchAPI.addWord(word);
                    }
                    else {
                        this.#_dispEvt(_a.EVT_WORD_MODIFY, _data.serverDetail);
                    }
                }
                else {
                    /// show different panel;
                    new Compare(_data.clientDetail, _data.serverDetail, "modify");
                }
            }
        });
        compareET.addEventListener(EVT_CMP_MODIFY, (e) => {
            const _cr = e.detail;
            const word = _cr.word;
            const _detail = _cr.detail;
            const _oldDetail = _detailCacher.get(word);
            _detailCacher.set(word, _detail);
            this.#_updateLink(word, _oldDetail?.links, _detail.links);
            this.#_dispEvt(_a.EVT_WORD_MODIFY, _cr.detail);
            if (_cr.prefer === "client") {
                serverProxy.putDetail(_detail);
            }
        });
        compareET.addEventListener(EVT_CMP_DELETE, (e) => {
            const _cr = e.detail;
            const _detail = _cr.detail;
            if (_cr.prefer === "delete") {
                serverProxy.deleteWord(_detail);
            }
            else if (_cr.prefer === "modify") {
                const word = _cr.word;
                const _oldDetail = _detailCacher.get(word);
                _detailCacher.set(word, _detail);
                this.#_updateLink(word, _oldDetail?.links, _detail.links);
                this.#_dispEvt(_a.EVT_WORD_MODIFY, _cr.detail);
            }
        });
    }
    #_push(wordsStr, action) {
        this.#_arr.push({ wordsStr, action });
    }
    #_getSyncData() {
        const _logicObj = {};
        this.#_arr.forEach(({ wordsStr, action }) => {
            wordsStr
                .split(',')
                .filter(w => w.trim().length > 0)
                .forEach(w => {
                if (!_logicObj[w])
                    _logicObj[w] = action;
                else {
                    let _l = _SYMBOLIC_LOGIC_[_logicObj[w] + action];
                    if (_l === '-1') {
                        logger.vital(`Logic error about word (${w}) action: ${_logicObj[w] + action}`);
                    }
                    else {
                        _logicObj[w] = _l;
                    }
                }
            });
        });
        this.#_arr.length = 0;
        let addlist = [];
        let dellist = [];
        let modlist = [];
        const dict = {};
        Object.entries(_logicObj).forEach(([w, action]) => {
            if (action === '1') {
                addlist.push(w);
                dict[w] = this.getWord(w);
            }
            else if (action === '2') {
                dellist.push(w);
            }
            else if (action === '3') {
                modlist.push(w);
                dict[w] = this.getWord(w);
            }
        });
        return {
            lists: {
                addlist, dellist, modlist,
            },
            dict,
        };
    }
    #_assemblePermenentData() {
        return {
            __VERSION__,
            "meta": _metaProxy.data(),
            "record": _recordsProxy.data(),
            "dict": _detailCacher.data()
        };
    }
    exportDatabase() {
        const json = JSON.stringify(this.#_assemblePermenentData(), null, 4);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "english_words_cache.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.#_dispDictEvt("exported");
    }
    ;
    #_addToDic(data) {
        let _words;
        if (data.__VERSION__) {
            _metaProxy.append(data.meta);
            _recordsProxy.append(data.record);
            _words = data.dict;
        }
        else {
            _words = data;
        }
        _detailCacher.append(_words);
        //this.#_searchAPI.addWords(_words)
    }
    ;
    // Import JSON
    importDictionaryByContent(data) {
        this.#_addToDic(data);
        this.#_dispDictEvt("imported");
    }
    ;
    assignWords(dict) {
        this.#_addToDic(dict);
        this.#_dispDictEvt("add");
    }
    importDictionaryByFile(file) {
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(reader.result);
                if (imported === null || typeof imported !== "object") {
                    throw new Error("Invalid JSON format");
                }
                this.importDictionaryByContent(imported);
            }
            catch (err) {
                if (err instanceof Error) {
                    logger.vital(`Import failed: ${err.message}`);
                }
                else {
                    logger.vital(`Import failed: ${String(err)}`);
                }
            }
        };
        reader.readAsText(file);
    }
    clearDictionary() {
        _localProxy.set("sec_setting.syncTime", 1);
        _localProxy.save();
        _metaProxy.clear();
        _recordsProxy.clear();
        _detailCacher.clear();
        this.#_searchAPI.clear();
        this.#_dispDictEvt("clear");
    }
    ;
    updateWord(word, ipa, meaning, level, note, links, tags) {
        if (!word)
            return;
        let _detail = _detailCacher.get(word);
        if (_detail) {
            _detail = cloneDetail(_detail);
            _detail.ipa = ipa;
            _detail.meaning = meaning;
            _detail.level = level ?? _detail.level;
            _detail.note = note;
            _detail.links = links;
            _detail.tags = tags;
        }
        else {
            _detail = {
                word,
                ipa: ipa || '',
                meaning: meaning || '',
                level: level || 'ALL',
                note: note || '',
                links: links || '',
                tags: tags || '',
                time_create: -1,
                time_modify: -1,
            };
        }
        serverProxy.putDetail(_detail);
    }
    #_updateLink(word, oldLink, newlink) {
        if (newlink != oldLink) {
            const parseLinks = (str) => str.split(',').map(w => w.trim()).filter(w => w.length > 0);
            if (oldLink && oldLink.length > 0) {
                const arrOldLink = parseLinks(oldLink);
                arrOldLink.forEach(w => {
                    this.#_removeLink(w, word);
                });
            }
            if (newlink && newlink.length > 0) {
                const arrNewLink = parseLinks(newlink);
                arrNewLink.forEach(w => {
                    this.#_addLink(w, word);
                });
            }
        }
    }
    #_addLink(word, linkedWord) {
        const _detail = _detailCacher.get(word);
        if (!_detail)
            return;
        const checkRegex = new RegExp(`\\b${linkedWord}\\b`, "i");
        if (!checkRegex.test(_detail.links)) {
            if (_detail.links.trim().length > 0) {
                _detail.links += `, ${linkedWord}`;
            }
            else {
                _detail.links += linkedWord;
            }
        }
    }
    #_removeLink(word, linkedWord) {
        const _detail = _detailCacher.get(word);
        if (!_detail)
            return;
        const regex = new RegExp(`,*\s*\\b${linkedWord}\\b`, "gi");
        _detail.links.replace(regex, "");
    }
    deleteWord(word) {
        if (!word || !_detailCacher.has(word))
            return;
        const _detail = _detailCacher.get(word);
        serverProxy.deleteWord(_detail);
    }
    #_dispDictEvt(action, msg = '') {
        this.dispatchEvent(new CustomEvent(_a.EVT_DICT, { detail: { action, message: msg } }));
    }
    #_dispRecordEvt(action) {
        this.dispatchEvent(new CustomEvent(_a.EVT_RECORD, { detail: { action } }));
    }
    #_dispEvt(eventName, data) {
        this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
    getWordsCount() {
        return Object.keys(_listCacher.data()).length;
    }
    searchWords(searchQuery) {
        const _selected = this.#_searchAPI.search(searchQuery) ?? [];
        return _selected;
    }
    getWords(searchQuery, level, tag) {
        tag = tag.toUpperCase();
        const _allWords = Object.entries(_detailCacher.data());
        const _selected = this.#_searchAPI.search(searchQuery) ?? Object.keys(_detailCacher.data());
        const out = {};
        for (const [word, detail] of _allWords) {
            const matchesLevel = (level === 'ALL' || detail.level?.toUpperCase() === level);
            const matchesTag = (tag === 'ALL' || detail.tags?.toUpperCase().includes(tag));
            const matchesSearch = _selected.includes(word);
            if (matchesLevel && matchesTag && matchesSearch) {
                out[word] = detail;
            }
        }
        return readOnly(out);
    }
    hasWordDetail(word) {
        if ((!word) || (word.length <= 0))
            return false;
        return _detailCacher.has(word);
    }
    hasWord(word) {
        if ((!word) || (word.length <= 0))
            return false;
        return _listCacher.has(word);
    }
    getWord(word, fetchIfMissing = true) {
        if ((!word) || (word.length <= 0))
            return _MOCK_NO_LOCAL_DETAIL_;
        const _out = _detailCacher.get(word);
        if (_out) {
            return _out;
        }
        if (fetchIfMissing) {
            const aiProvider = _localProxy.get("sec_setting.ai_provider", "");
            const apiKey = _localProxy.get("sec_setting.ai_key", "");
            serverProxy.getDetail(word, aiProvider, apiKey);
            return _MOCK_FETCH_DETAIL_;
        }
        return _MOCK_NO_LOCAL_DETAIL_;
    }
    getNRandomWords(n, out = []) {
        const N = n + out.length;
        const _tmp = Object.keys(_detailCacher.data());
        while (out.length < N) {
            let _w = _tmp[Math.floor(Math.random() * _tmp.length)];
            if (!out.includes(_w)) {
                out.push(_w);
            }
        }
        return out;
    }
    /**
     * [{word:String, correct:Boolean},...]
     */
    setTestingResult(results) {
        results.forEach(item => {
            const _w = item.word;
            const _out = _recordsProxy.get(_w, { attempts: 0, correct: 0 });
            _out.attempts++;
            if (item.correct) {
                _out.correct++;
            }
            _recordsProxy.set(_w, _out);
        });
        _recordsProxy.save();
        _needToUpload = true;
        this.#_dispRecordEvt("new");
    }
    getRecords() {
        return readOnly(_recordsProxy.data());
    }
    setSyncInterval(second) {
        if (this.#_syncTimer !== undefined) {
            clearInterval(this.#_syncTimer);
        }
        if (second <= 0) {
            return;
        }
        this.#_syncTimer = window.setInterval(async () => {
            if (_needToUpload) {
                _needToUpload = false;
                await this.sync();
            }
        }, second * 1000);
    }
    ;
    getMissingWords(wordsStr) {
        const _out = wordsStr
            .split(',')
            .map(word => word.trim().toLowerCase())
            .filter(word => word.length > 0 && !this.hasWord(word))
            .join(',');
        return _out;
    }
    markUpload() {
        _needToUpload = true;
    }
    async sync() {
        this.#_dispDictEvt(`begin:sync`);
        _needToUpload = false;
        await serverProxy.sync(this.#_getSyncData());
        this.#_dispDictEvt(`end:sync`);
    }
    async syncAll() {
        this.#_dispDictEvt(`begin:sync`);
        await serverProxy.syncAll();
        this.#_dispDictEvt(`end:sync`);
    }
}
_a = Dictionary;
export default Dictionary;

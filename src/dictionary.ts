// ===============================
// Word Cache Management
// ===============================


import { readOnly } from "./utils.js"
import logger from "./logger.js"
import cacher from "./cacher.js"
import serverProxy from "./server-proxy.js"
import { Detail, Words, Results, Result, Dict, DictSyncData, ResponseData, WordLevelType } from "./types.js"

declare const FlexSearch: any;
type ActionWord = "delete" | "add" | "modify";
type ActionDict = "exported" | "imported" | "add" | "clear" | "delete" | "begin:sync" | "end:sync";
type ActionRecord = "new"
type ActionType = '1' | '2' | '3' | '-1' | "";
type Action = {
    wordsStr: string,
    action: ActionType,
}


const __VERSION__ = "0.3.0"

let _needToUpload = false;

const _localProxy = cacher.localProxy;
const _metaProxy = cacher.metaProxy;
const _recordsProxy = cacher.recordsProxy;
const _wordsProxy = cacher.wordsProxy;

class SearchHelper {

    #_flexSearch;

    constructor() {
        this.#_flexSearch = this.#_create();
        this.addWords(_wordsProxy.data() as Words)
    }

    #_create() {
        return new FlexSearch.Index({
            preset: "memory",
            tokenize: "full",
            resolution: 5,
            minlength: 2
        });
    }

    addWord(word: string) {
        this.#_flexSearch.add(word, word);
    }

    addWords(words: Words) {
        const _arr = Object.entries(words);
        for (let i = 0, N = _arr.length; i < N; ++i) {
            this.#_flexSearch.add(_arr[i][0], _arr[i][0]);
        }
    }

    search(query: string) {
        if (query.length <= 0) return null;
        return this.#_flexSearch.search(query);
    }

    removeWord(word: string) {
        this.#_flexSearch.remove(word)
    }

    clear() {
        this.#_flexSearch = this.#_create();
    }
}

const _SYMBOLIC_LOGIC_: Record<string, ActionType> = Object.freeze({
    // add:1 delete:2 modify:3
    '21': '3',// first 'delete' then 'add' -> it is a 'modify' operation.
    '22': '-1',// doesn't logic, delete then delete?
    '23': '-1',
    '11': '-1',
    '12': '',// ignore
    '13': '1',
    '31': '-1',
    '32': '2',
    '33': '3',
});


export default class Dictionary extends EventTarget {

    static EVT_RECORD = "EVT_RECORD";
    static EVT_WORD = "EVT_WORD";
    static EVT_DICT = "EVT_DICT";

    #_arr: Action[] = [];
    #_syncTimer: number | undefined;
    #_searchAPI: SearchHelper;

    constructor() {
        super();

        this.#_searchAPI = new SearchHelper();

        this.setSyncInterval(_localProxy.get("sec_setting", {})["syncInterval"] || 10);
        serverProxy.addEventListener(serverProxy.EVT_SYNC_ALL, (event) => {
            const _data = event.detail?.content;
            if (_data) {
                _wordsProxy.clear();
                this.importDictionaryByContent(_data);
            }
        });
        serverProxy.addEventListener(serverProxy.EVT_SYNC, (event) => {
            const _data = event.detail?.content;
            if (_data) {
                this.assignWords((_data as DictSyncData).dict);
                (_data as DictSyncData).lists.dellist.forEach(w => this.deleteWord(w, false));
                this.#_dispDictEvt("delete");
            }
        });
    }

    #_push(wordsStr: string, action: ActionType): void {
        this.#_arr.push({ wordsStr, action });
    }

    #_getSyncData(): DictSyncData {
        const _logicObj: Record<string, ActionType> = {};
        this.#_arr.forEach(({ wordsStr, action }) => {
            wordsStr
                .split(',')
                .filter(w => w.trim().length > 0)
                .forEach(w => {
                    if (!_logicObj[w]) _logicObj[w] = action;
                    else {
                        let _l = _SYMBOLIC_LOGIC_[_logicObj[w] + action];
                        if (_l === '-1') {
                            logger.vital(`Logic error about word (${w}) action: ${_logicObj[w] + action}`);
                        } else {
                            _logicObj[w] = _l
                        }
                    }
                });
        });
        this.#_arr.length = 0;

        let addlist: string[] = [];
        let dellist: string[] = [];
        let modlist: string[] = [];
        const dict: Words = {};
        Object.entries(_logicObj).forEach(([w, action]) => {
            if (action === '1') {
                addlist.push(w);
                dict[w] = this.getWord(w) as Detail;
            } else if (action === '2') {
                dellist.push(w);
            } else if (action === '3') {
                modlist.push(w);
                dict[w] = this.getWord(w) as Detail;
            }
        });
        return {
            lists: {
                addlist, dellist, modlist,
            },
            dict,
        }
    }

    #_assemblePermenentData(): any {
        return {
            __VERSION__,
            "meta": _metaProxy.data(),
            "record": _recordsProxy.data(),
            "dict": _wordsProxy.data()
        };
    }

    exportDatabase(): void {
        const json = JSON.stringify(this.#_assemblePermenentData(), null, 4);
        const blob = new Blob(
            [json],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "english_words_cache.json";

        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.#_dispDictEvt("exported");
    };


    #_addToDic(data: Dict | Words): void {
        let _words: Words;
        if ((data as Dict).__VERSION__) {
            _metaProxy.append((data as Dict).meta);
            _recordsProxy.append((data as Dict).record);
            _words = (data as Dict).dict;
        } else {
            _words = data as Words;
        }
        for (const detail of Object.values(_words)) {
            this.#_fillDetailInfosIfMissing(detail);
        }
        _wordsProxy.append(_words);
        this.#_searchAPI.addWords(_words)
    };

    // Import JSON
    importDictionaryByContent(data: Dict | Words): void {
        this.#_addToDic(data);
        this.#_dispDictEvt("imported");
    };

    assignWords(dict: Words): void {
        this.#_addToDic(dict);
        this.#_dispDictEvt("add");
    }

    importDictionaryByFile(file: File): void {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(reader.result as string);
                if (imported === null || typeof imported !== "object") {
                    throw new Error("Invalid JSON format");
                }
                this.importDictionaryByContent(imported);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    logger.vital(`Import failed: ${err.message}`);
                } else {
                    logger.vital(`Import failed: ${String(err)}`);
                }
            }
        };
        reader.readAsText(file);
    }

    clearDictionary(): void {
        _localProxy.get("sec_setting", {})["syncTime"] = 1;
        _localProxy.save();
        _metaProxy.clear();
        _recordsProxy.clear();
        _wordsProxy.clear();
        this.#_searchAPI.clear();
        this.#_dispDictEvt("clear");
    };

    #_fillDetailInfosIfMissing(detail: Detail): void {
        if (!detail) return;
        detail.ipa = detail.ipa || '';
        detail.meaning = detail.meaning || '';
        detail.level = detail.level || '';
        detail.note = detail.note || '';
        detail.links = detail.links || '';
        detail.tags = detail.tags || '';
    }

    updateWord(
        word: string,
        ipa: string,
        meaning: string,
        level: WordLevelType,
        note: string,
        links: string,
        tags: string
    ): void {
        if (!word) return;

        let _action: ActionWord;
        let _detail: Detail | null = _wordsProxy.get(word) as Detail | null;
        if (_detail) {
            _detail.ipa = ipa;
            _detail.meaning = meaning;
            _detail.level = level;
            _detail.note = note;
            _detail.links = links;
            _detail.tags = tags;
            _detail.time_modify = Date.now();
            _action = "modify";
            this.#_push(word, '3');
        } else {
            _detail = {
                ipa: ipa || '',
                meaning: meaning || '',
                level: level || '',
                note: note || '',
                links: links || '',
                tags: tags || '',
                time_create: Date.now(),
                time_modify: Date.now(),
            };
            _action = "add";
            this.#_push(word, '1');
        }
        const oldLinks = _detail.links;
        if (links != oldLinks) {
            const parseLinks = (str: string) => str.split(',').map(w => w.trim()).filter(w => w.length > 0);

            if (oldLinks?.length > 0) {
                const arrOldLink = parseLinks(oldLinks);
                arrOldLink.forEach(w => {
                    this.#_removeLink(w, word);
                });
            }

            if (links?.length > 0) {
                const arrNewLink = parseLinks(links);
                arrNewLink.forEach(w => {
                    this.#_addLink(w, word);
                });
            }
        }

        _wordsProxy.set(word, _detail);
        this.#_dispWordEvt(word, _action);
        _needToUpload = true;
    }

    #_addLink(word: string, linkedWord: string): void {
        const _detail: Detail = _wordsProxy.get(word);
        if (!_detail) return;

        const checkRegex = new RegExp(`\\b${linkedWord}\\b`, "i");
        if (!checkRegex.test(_detail.links)) {
            if (_detail.links.trim().length > 0) {
                _detail.links += `, ${linkedWord}`;
            } else {
                _detail.links += linkedWord;
            }
        }
        _wordsProxy.delaySave();
    }

    #_removeLink(word: string, linkedWord: string): void {
        const _detail = _wordsProxy.get(word);
        if (!_detail) return;

        const regex = new RegExp(`,*\s*\\b${linkedWord}\\b`, "gi");
        _detail.links.replace(regex, "");
        _wordsProxy.save();
    }

    deleteWord(word: string, dispatch = true): void {
        if (!word || !_wordsProxy.has(word)) return;

        const _parseLinks = (str: string): string[] => {
            if (!str) return [];
            return str.split(',').map(w => w.trim()).filter(w => w.length > 0);
        };

        const _linksArray = _parseLinks(_wordsProxy.get(word)['links']);
        _linksArray.forEach(_linkedWord => {
            this.#_removeLink(_linkedWord, word)
        });

        _wordsProxy.remove(word);
        this.#_searchAPI.removeWord(word);
        if (dispatch) this.#_dispWordEvt(word, "delete");
        this.#_push(word, '2');
        _needToUpload = true;
    }

    #_dispWordEvt(word: string, action: ActionWord): void {
        this.dispatchEvent(new CustomEvent(Dictionary.EVT_WORD, { detail: { word, action } }));
    }

    #_dispDictEvt(action: ActionDict, msg = ''): void {
        this.dispatchEvent(new CustomEvent(Dictionary.EVT_DICT, { detail: { action, message: msg } }));
    }

    #_dispRecordEvt(action: ActionRecord): void {
        this.dispatchEvent(new CustomEvent(Dictionary.EVT_RECORD, { detail: { action } }));
    }

    getWordsCount() {
        return Object.keys(_wordsProxy.data()).length;
    }

    getWords(searchQuery: string, level: WordLevelType, tag: string): Words {
        tag = tag.toUpperCase();

        const _allWords = Object.entries(_wordsProxy.data());
        const _selected = this.#_searchAPI.search(searchQuery) ?? Object.keys(_wordsProxy.data());
        const out: Words = {};
        for (const [word, detail] of _allWords) {
            const matchesLevel = (level === 'ALL' || detail.level?.toUpperCase() === level);
            const matchesTag = (tag === 'ALL' || detail.tags?.toUpperCase().includes(tag));
            const matchesSearch = _selected.includes(word);

            if (matchesLevel && matchesTag && matchesSearch) {
                out[word] = detail
            }
        }

        return readOnly(out);
    }

    hasWord(word: string): boolean {
        if ((!word) || (word.length <= 0)) return false;
        return _wordsProxy.has(word);
    }

    getWord(word: string): Detail | null {
        if ((!word) || (word.length <= 0)) return null;
        const _out = _wordsProxy.get(word) as Detail;
        this.#_fillDetailInfosIfMissing(_out);
        return _out;
    }

    getTags(): readonly string[] {
        return readOnly(_metaProxy.get('tags', []) as string[]);
    }

    getNRandomWords(n: number, out: string[] = []): string[] {
        const N = n + out.length;
        const _tmp = Object.keys(_wordsProxy.data());
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
    setTestingResult(results: Result[]): void {
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

    getRecords(): Results {
        return readOnly(_recordsProxy.data() as Results);
    }

    setSyncInterval(second: number): void {

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
    };

    getMissingWords(wordsStr: string): string {
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

    async sync(): Promise<void> {
        this.#_dispDictEvt(`begin:sync`);
        _needToUpload = false;
        await serverProxy.sync(this.#_getSyncData());
        this.#_dispDictEvt(`end:sync`);
    }

    async syncAll(): Promise<void> {
        this.#_dispDictEvt(`begin:sync`);
        await serverProxy.syncAll();
        this.#_dispDictEvt(`end:sync`);
    }
}


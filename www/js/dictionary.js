// ===============================
// Word Cache Management
// ===============================

const __VERSION__ = "0.2.0"

function initDictionary(logger, cacher, serverProxy) {

    let _needToUpload = false;

    const _localProxy = cacher.localProxy;
    const _metaProxy = cacher.metaProxy;
    const _recordsProxy = cacher.recordsProxy;
    const _wordsProxy = cacher.wordsProxy;

    const _searchAPI = (function() {
        function _create() {
            return new FlexSearch.Index({
                preset: "memory",
                tokenize: "full",
                resolution: 5,
                minlength: 2
            });
        }

        let _flexSearch = _create();

        function addWord(word) {
            _flexSearch.add(word, word);
        }

        function addWords(words) {
            const _arr = Object.entries(words);
            for (let i = 0, N = _arr.length; i < N; ++i) {
                _flexSearch.add(_arr[i][0], _arr[i][0]);
            }
        }

        function search(query) {
            if (query.length <= 0) return null;
            return _flexSearch.search(query);
        }

        function removeWord(word) {
            _flexSearch.remove(word)
        }
        function clear() {
            _flexSearch = _create();
        }

        addWords(_wordsProxy.data())

        return {
            search,
            addWord,
            addWords,
            removeWord,
            clear,
        }
    })()

    function _assemblePermenentData() {
        return {
            __VERSION__,
            "meta": _metaProxy.data(),
            "record": _recordsProxy.data(),
            "dict": _wordsProxy.data()
        };
    }

    function isDatabaseEmpty() {
        return _metaProxy.isEmpty() && _recordsProxy.isEmpty() && _wordsProxy.isEmpty();
    }

    function exportDatabase() {
        const json = JSON.stringify(_assemblePermenentData(), null, 4);
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
        _dispDictEvt("exported");
    };


    // Import JSON
    function importDictionaryByContent(data) {
        if (data.__VERSION__) {
            for (const detail of Object.values(data.meta)) {
                _fillDetailInfosIfMissing(detail);
            }
            _metaProxy.append(data.meta, true);
            _recordsProxy.append(data.record, true);
            _wordsProxy.append(data.dict, true);
            _searchAPI.addWords(data.dict)
        } else {
            for (const detail of Object.values(data)) {
                _fillDetailInfosIfMissing(detail);
            }
            _wordsProxy.append(data, true);
            _searchAPI.addWords(data)
        }

        _dispDictEvt("imported");
    };

    function importDictionaryByFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (typeof imported !== "object") {
                    throw new Error("Invalid JSON format");
                }
                importDictionaryByContent(imported);
            } catch (err) {
                logger.vital(`Import failed: ${err.message}`);
            }
        };
        reader.readAsText(file);
    }

    function clearDictionary() {
        getLocalData("sec_setting")["syncTime"] = 1;
        _localProxy.save();
        _metaProxy.clear();
        _recordsProxy.clear();
        _wordsProxy.clear();
        _searchAPI.clear();
        _dispDictEvt("delete");
    };

    function clearRecords() {
        _recordsProxy.clear();
        _needToUpload = true;
    };

    function _fillDetailInfosIfMissing(detail) {
        if (!detail) return;
        detail.ipa = detail.ipa || '';
        detail.meaning = detail.meaning || '';
        detail.level = detail.level || '';
        detail.note = detail.note || '';
        detail.links = detail.links || '';
        detail.tags = detail.tags || '';
    }

    function updateWord(word, ipa, meaning, level, note, links, tags) {
        if (!word) return;

        let _action = "";
        let _detail = _wordsProxy.get(word);
        if (_detail) {
            _detail.time_modify = Date.now();
            _action = "modify";
        } else {
            _detail = {
                time_create: Date.now(),
                time_modify: Date.now(),
            };
            _action = "add";
        }
        _fillDetailInfosIfMissing(_detail);
        const oldLinks = _detail.links;
        _detail.ipa = ipa || '';
        _detail.meaning = meaning || '';
        _detail.level = level || '';
        _detail.note = note || '';
        _detail.links = links || '';
        _detail.tags = tags || '';

        if (links != oldLinks) {
            const parseLinks = (str) => str.split(',').map(w => w.trim()).filter(w => w.length > 0);

            if (oldLinks?.length > 0) {
                const arrOldLink = parseLinks(oldLinks);
                arrOldLink.forEach(w => {
                    _removeLink(w, word);
                });
            }

            if (links?.length > 0) {
                const arrNewLink = parseLinks(links);
                arrNewLink.forEach(w => {
                    _addLink(w, word);
                });
            }
        }

        _wordsProxy.set(word, _detail, true);
        _dispWordEvt(word, _action);
        _needToUpload = true;
    }

    function _addLink(word, linkedWord) {
        const _detail = _wordsProxy.get(word);
        if (!_detail) return;

        const checkRegex = new RegExp(`\\b${linkedWord}\\b`, "i");
        if (!checkRegex.test(_detail.links)) {
            if (_detail.links.trim().length > 0) {
                _detail.links += `, ${linkedWord}`;
            } else {
                _detail.links += linkedWord;
            }
        }
        _wordsProxy.save();
    }

    function _removeLink(word, linkedWord) {
        const _detail = _wordsProxy.get(word);
        if (!_detail) return;

        const regex = new RegExp(`,*\s*\\b${linkedWord}\\b`, "gi");
        _detail.links.replace(regex, "");
        _wordsProxy.save();
    }

    function deleteWord(word, dispatch = true) {
        if (!word || !_wordsProxy.has(word)) return;

        const _parseLinks = (str) => {
            if (!str) return [];
            return str.split(',').map(w => w.trim()).filter(w => w.length > 0);
        };

        const _linksArray = _parseLinks(_wordsProxy.get(word)['links']);
        _linksArray.forEach(_linkedWord => {
            _removeLink(_linkedWord, word)
        });

        _wordsProxy.remove(word, true);
        _searchAPI.removeWord(word);
        if (dispatch) _dispWordEvt(word, "delete");
        _needToUpload = true;
    }

    function _dispWordEvt(word, action) {
        __this__.dispatchEvent(new CustomEvent(__this__.EVT_WORD, { detail: { word, action } }));
    }

    function _dispDictEvt(action, msg = '') {
        __this__.dispatchEvent(new CustomEvent(__this__.EVT_DICT, { detail: { action, message: msg } }));
    }

    function _dispRecordEvt(action) {
        __this__.dispatchEvent(new CustomEvent(__this__.EVT_RECORD, { detail: { action } }));
    }

    function getWordsCount() {
        return Object.keys(_wordsProxy.data()).length;
    }

    function getWords(searchQuery, level, tag) {
        level = level.toUpperCase();
        tag = tag.toUpperCase();

        const _allWords = Object.entries(_wordsProxy.data());
        const _selected = _searchAPI.search(searchQuery) ?? Object.keys(_wordsProxy.data());
        const out = {};
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

    function hasWord(word) {
        if ((!word) || (word.length <= 0)) return false;
        return _wordsProxy.has(word);
    }

    function getWord(word) {
        if ((!word) || (word.length <= 0)) return null;
        const _out = _wordsProxy.get(word);
        _fillDetailInfosIfMissing(_out);
        return _out;
    }

    function getTags() {
        return readOnly(_metaProxy.get('tags', []));
    }

    function getNRandomWords(n, out = []) {
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
    function setTestingResult(results) {
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
        _dispRecordEvt("new");
    }

    function getRecords() {
        return readOnly(_recordsProxy.data());
    }

    function setArticle(content, save = false) {
        _metaProxy.set("article", content, save);
        _needToUpload = true;
    }
    function getArticle() {
        return _metaProxy.get("article", "");
    }

    function getLocalData(sectionName) {
        return _localProxy.get(sectionName, {});
    }

    function saveLocalData() {
        _localProxy.delaySave();
    }

    function setSyncInterval(second) {
        _timer(second);
    }

    const _timer = (function() {
        let _syncTimer;

        const _fn = function(second) {
            clearInterval(_syncTimer);
            _syncTimer = setInterval(async () => {
                if (_needToUpload) {
                    await saveDictionary();
                    _needToUpload = false;
                }
            }, second * 1000);
        }

        const _localData = _localProxy.get('sec_setting', {});
        _fn(_localData['syncInterval'] || 10);
        return _fn;
    })()

    function getAIKey() {
        return getLocalData("sec_setting")['ai_key'] || "";
    }

    function getAIProvider() {
        return getLocalData("sec_setting")['ai_provider'] || "";
    }

    function getMissingPronunciationWords(existingAudios) {
        const missingWords = Object.keys(_wordsProxy.data())
            .filter(word => !Object.hasOwn(existingAudios, word))
            .join(',');

        return missingWords;
    }

    function getMissingWords(wordsStr) {
        const _out = wordsStr
            .split(',')
            .map(word => word.trim().toLowerCase())
            .filter(word => word.length > 0 && !hasWord(word))
            .join(',');

        return _out;
    }

    serverProxy.addEventListener(serverProxy.EVT_SYNC_ALL, (e) => {
        const _data = e.detail.data;
        if (_data) {
            _wordsProxy.clear();
            importDictionaryByContent(_data);
        }
    });
    serverProxy.addEventListener(serverProxy.EVT_SYNC, (e) => {
        const _data = e.detail.data;
        if (_data) {
            importDictionaryByContent(_data.add);
            _data.del.forEach(w => deleteWord(w, false));
        }
    });
    serverProxy.addEventListener(serverProxy.EVT_UPLOAD, (e) => {
    });

    async function saveDictionary() {
        _dispDictEvt(`begin:sync`);
        await serverProxy.saveData(_assemblePermenentData());
        _dispDictEvt(`end:sync`);
    }

    async function loadDictionary() {
        _dispDictEvt(`begin:sync`);
        await serverProxy.loadData();
        _dispDictEvt(`end:sync`);
    }
    async function sync() {
        _dispDictEvt(`begin:sync`);
        await serverProxy.sync();
        _dispDictEvt(`end:sync`);
    }

    async function syncAll() {
        _dispDictEvt(`begin:sync`);
        await serverProxy.syncAll();
        _dispDictEvt(`end:sync`);
    }

    const __this__ = new EventTarget()
    Object.assign(__this__, {
        EVT_RECORD: "EVT_RECORD",
        EVT_WORD: "EVT_WORD",
        EVT_DICT: "EVT_DICT",

        syncAll,
        sync,
        loadDictionary,
        saveDictionary,

        isDatabaseEmpty,
        exportDatabase,
        importDictionaryByContent,
        importDictionaryByFile,
        clearDictionary,
        getWordsCount,
        getWords,
        getWord,
        hasWord,
        updateWord,
        deleteWord,
        getNRandomWords,
        setTestingResult,

        getRecords,
        clearRecords,
        setArticle,
        getArticle,

        getLocalData,
        saveLocalData,

        getTags,
        getAIKey,
        getAIProvider,
        setSyncInterval,

        getMissingPronunciationWords,
        getMissingWords,

        markUpload: () => {
            _needToUpload = true;
        }

    })
    return __this__;
}

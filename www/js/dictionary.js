// ===============================
// Word Cache Management
// ===============================

const __VERSION__ = "0.2.0"

function initDictionary(ff) {

    let _needToUpload = false;
    function createStorageProxy(key) {
        let _tmp = JSON.parse(localStorage.getItem(key));
        let _obj = _tmp || {};

        function isEmpty() {
            return !_tmp;
        }
        function data() {
            return _obj;
        }
        function append(data, save = false) {
            Object.assign(_obj, data);
            if (save) saveToLocal();
        }
        function saveToLocal() {
            try {
                localStorage.setItem(key, JSON.stringify(_obj));
            } catch (e) {
                logger.vital(e);
            }
        }
        function set(key, value, save = false) {
            _obj[key] = value;
            if (save) saveToLocal();
        }
        function get(key, defaultValue = null) {
            let _v = _obj[key];
            if (!_v) {
                _v = defaultValue;
                if (defaultValue) _obj[key] = defaultValue;
            }
            return _v;
        }
        function has(key) {
            return !!_obj[key];
        }
        function remove(key, save = false) {
            delete _obj[key];
            if (save) saveToLocal();
        }
        function clear() {
            localStorage.removeItem(key);
            _tmp = null;
            _obj = {};
        }
        return { saveToLocal, get, set, clear, isEmpty, has, remove, data, append }
    }
    const _localProxy = createStorageProxy('__localCache__');
    const _metaProxy = createStorageProxy('__metaCache__');
    const _recordsProxy = createStorageProxy('__recordCache__');
    const _wordsProxy = createStorageProxy('__wordCache__');

    async function _toServer(data) {
        const userID = getLocalData("sec_setting")['userID'] || "";
        if (!userID) {
            const _s = `Need to provide user ID`;
            logger.error(_s);
            _dispDictEvt(`sync`, _s);
            return;
        }

        // _dispDictEvt(`begin:${data.requestType}`);
        logger.log(`C -> S request type: ${data.requestType}`);
        _dispDictEvt(`begin:sync`);
        data.userID = userID;
        const _response = await fetch("../api/data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data, null, 4),
        });

        try {
            if (_response.status === 200) {
                const _responseData = await _response.json();
                if (_responseData.success) {
                    if (_responseData.code === 200) {
                        _metaProxy.set("syncTime", _responseData.syncTime, true);
                    }
                    if (_responseData.content) {
                        importDictionaryByContent(_responseData.content);
                        logger.debug(`${_responseData.content}`);
                    }
                    logger.log(`S -> C ${_responseData.info}`);
                } else {
                    logger.error(`S -> C ${_responseData.info}`);
                }
                _dispDictEvt(`end:sync`, _responseData.info);
            } else {
                logger.error(`S -> C ${_response.status}`);
                _dispDictEvt(`end:sync`, `Vital Error: ${_response.status}`);
            }
        } catch (err) {
            logger.vital(`To server: ${err}`);
            _dispDictEvt(`end:sync`, err);
        }
        // _dispDictEvt(`end:${data.requestType}`);
    }

    async function loadData() {
        await _toServer({
            requestType: "get",
            syncTime: _metaProxy.get("syncTime", 1),
        })
    }

    function _assemblePermenentData() {
        return {
            __VERSION__,
            "meta": _metaProxy.data(),
            "record": _recordsProxy.data(),
            "dict": _wordsProxy.data()
        };
    }

    async function saveData() {
        await _toServer({
            requestType: "save",
            content: _assemblePermenentData(),
        })
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
            _metaProxy.append(data.meta, true);
            _recordsProxy.append(data.record, true);
            _wordsProxy.append(data.dict, true);
        } else {
            _wordsProxy.append(data, true);
        }

        _dispDictEvt("imported");
    };

    function importDictionaryByFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
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
        //_localProxy.clear();
        _metaProxy.clear();
        _recordsProxy.clear();
        _wordsProxy.clear();
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
        detail.time = detail.time || Date.now();
        detail.tags = detail.tags || '';
    }

    function updateWord(word, ipa, meaning, level, note, links, tags) {
        if (!word) return;

        let _action = "";
        let _detail = _wordsProxy.get(word);
        if (_detail) {
            _action = "modify";
        } else {
            _detail = {};
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
        _wordsProxy.saveToLocal();
    }

    function _removeLink(word, linkedWord) {
        const _detail = _wordsProxy.get(word);
        if (!_detail) return;

        const regex = new RegExp(`,*\s*\\b${linkedWord}\\b`, "gi");
        _detail.links.replace(regex, "");
        _wordsProxy.saveToLocal();
    }

    function deleteWord(word) {
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
        _dispWordEvt(word, "delete");
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

        const out = {};
        for (const [word, detail] of Object.entries(_wordsProxy.data())) {
            const matchesLevel = (level === 'ALL' || detail.level?.toUpperCase() === level);
            const matchesTag = (tag === 'ALL' || detail.tags?.toUpperCase().includes(tag));

            if (matchesLevel && matchesTag) {
                out[word] = detail
            }
        }

        const out2 = {};
        const _keys = Object.keys(out)
        const _selected = ff.find(_keys, searchQuery)
        _selected.forEach(w => {
            out2[w] = out[w];
        });

        return readOnly(out2);
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

    function setTags(tags) {
        const _tagArr = _metaProxy.get('tags', []);
        _tagArr.length = 0;
        _tagArr.push(...tags);
        _needToUpload = true;
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
        _recordsProxy.saveToLocal();
        _needToUpload = true;
        _dispRecordEvt("new");
    }

    function getRecords() {
        return readOnly(_recordsProxy.data());
    }

    function getLocalData(sectionName) {
        return _localProxy.get(sectionName, {});
    }

    function saveLocalData() {
        _localProxy.saveToLocal();
    }

    function getSyncInterval() {
        return _metaProxy.get("syncInterval", 10);
    }

    function setSyncInterval(second) {
        second = second > 0 ? second : getSyncInterval();
        _metaProxy.set("syncInterval", second, true);
        _needToUpload = true;
        _timer();
    }

    const _timer = (function () {
        let _syncTimer;

        const _fn = function () {
            clearInterval(_syncTimer);
            _syncTimer = setInterval(() => {
                if (_needToUpload) {
                    saveData();
                    _needToUpload = false;
                }
            }, getSyncInterval() * 1000);
        }

        _fn();
        return _fn;
    })()

    function setArticle(content, save = false) {
        _metaProxy.set("article", content, save);
        _needToUpload = true;
    }
    function getArticle() {
        return _metaProxy.get("article", "");
    }


    function getAIKey() {
        return getLocalData("sec_setting")['ai_key'] || "";
    }

    function getAIProvider() {
        return getLocalData("sec_setting")['ai_provider'] || "";
    }


    const __this__ = new EventTarget()
    Object.assign(__this__, {
        EVT_RECORD: "EVT_RECORD",
        EVT_WORD: "EVT_WORD",
        EVT_DICT: "EVT_DICT",

        loadData,
        saveData,

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
        getTags,
        setTags,
        getNRandomWords,
        setTestingResult,

        getRecords,
        clearRecords,
        setArticle,
        getArticle,
        getSyncInterval,
        setSyncInterval,

        getLocalData,
        saveLocalData,

        getAIKey,
        getAIProvider,

    })
    return __this__;
}

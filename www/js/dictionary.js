// ===============================
// Word Cache Management
// ===============================

const __VERSION__ = "0.1.0"

function initDictionary(ff) {
    function createStorageProxy(key) {
        const _tmp = JSON.parse(localStorage.getItem(key));
        const _obj = _tmp || {};

        function empty() {
            return !_tmp;
        }
        function save() {
            localStorage.setItem(key, JSON.stringify(_obj));
        }
        function get() {
            return _obj;
        }
        function remove() {
            localStorage.removeItem(key);
            Object.keys(_obj).forEach(key => delete _obj[key]);
        }
        return { save, get, remove, empty }
    }

    async function _toServer(data) {
        const userID = ai_api.userID
        if (!userID) {
            logger.warn(`Need to provide user ID`);
            return;
        }

        _dispDictEvt(`begin:${data.requestType}`);
        logger.log(`C -> S request type: ${data.requestType}`);
        data.userID = userID;
        const _response = await fetch("../api/data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data, null, 4),
        });

        try {
            const _responseData = await _response.json();
            if (_responseData.success) {
                if (_responseData.content) importDictionaryByContent(_responseData.content);
                logger.log(`S -> C ${_responseData.info}`);
            } else {
                logger.error(`S -> C ${_responseData.info}`);
            }
        } catch (err) {
            logger.vital(`To server: ${err}`);
        }
        _dispDictEvt(`end:${data.requestType}`);
    }

    async function loadData() {
        _toServer({
            requestType: "get",
            lastSyncTime: meta.lastSyncTime || 1,
        })
    }

    async function saveData() {
        _toServer({
            requestType: "save",
            content: { __VERSION__, meta, record, dict },
        })
    }

    const _AIProxy = createStorageProxy('__AICache__');
    const _metaProxy = createStorageProxy('__metaCache__');
    const _recordsProxy = createStorageProxy('__recordCache__');
    const _wordsProxy = createStorageProxy('__wordCache__');

    const ai_api = _AIProxy.get();
    const meta = _metaProxy.get();
    const record = _recordsProxy.get();
    const dict = _wordsProxy.get();

    function isDatabaseEmpty() {
        return _metaProxy.empty() && _recordsProxy.empty() && _wordsProxy.empty();
    }

    function exportDatabase() {
        const json = JSON.stringify({ __VERSION__, meta, record, dict }, null, 4);
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
            Object.assign(meta, data.meta);
            Object.assign(record, data.record);
            Object.assign(dict, data.dict);
            _metaProxy.save();
            _recordsProxy.save();
            _wordsProxy.save();
            alert(`Imported ${Object.keys(data.dict).length} words`);
        } else {
            Object.assign(dict, data);
            _wordsProxy.save();
            alert(`Imported ${Object.keys(data).length} words`);
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
        _metaProxy.remove();
        _recordsProxy.remove();
        _wordsProxy.remove();
        _dispDictEvt("delete");
    };

    function clearRecords() {
        _recordsProxy.remove();
    };

    function _fillDetailInfosIfMissing(detail) {
        if (!detail) return;
        detail.ipa = detail.ipa || '';
        detail.meaning = detail.meaning || '';
        detail.level = detail.level || '';
        detail.note = detail.note || '';
        detail.links = detail.links || '';
        detail.time = detail.time || new Date().toISOString();
        detail.tags = detail.tags || '';
    }

    function updateWord(word, ipa, meaning, level, note, links, tags) {
        if (!word) return;

        let _action = "";
        let _detail = dict[word];
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

        dict[word] = _detail;
        _dispWordEvt(word, _action);
        _wordsProxy.save();
        meta.lastSyncTime = Date.now();
        _metaProxy.save();
        _needToUpload = true;
    }

    function _addLink(word, linkedWord) {
        const _detail = dict[word];
        if (!_detail) return;

        const checkRegex = new RegExp(`\\b${linkedWord}\\b`, "i");
        if (!checkRegex.test(_detail.links)) {
            if (_detail.links.trim().length > 0) {
                _detail.links += `, ${linkedWord}`;
            } else {
                _detail.links += linkedWord;
            }
        }
        dict[word] = _detail;
    }

    function _removeLink(word, linkedWord) {
        const _detail = dict[word];
        if (!_detail) return;

        const regex = new RegExp(`,*\s*\\b${linkedWord}\\b`, "gi");
        _detail.links.replace(regex, "");
    }

    function deleteWord(word) {
        if (!word || !dict[word]) return;

        const _parseLinks = (str) => {
            if (!str) return [];
            return str.split(',').map(w => w.trim()).filter(w => w.length > 0);
        };

        const linksArray = _parseLinks(dict[word].links);
        linksArray.forEach(linkedWord => {
            _removeLink(linkedWord, word)
        });

        delete dict[word];
        _dispWordEvt(word, "delete");
        _wordsProxy.save();
        meta.lastSyncTime = Date.now();
        _metaProxy.save();
        _needToUpload = true;
    }

    function _dispWordEvt(word, action) {
        __this__.dispatchEvent(new CustomEvent(EVT_WORD, { detail: { word, action } }));
    }

    function _dispDictEvt(action) {
        __this__.dispatchEvent(new CustomEvent(EVT_DICT, { detail: { action } }));
    }

    function getWordsCount() {
        return Object.keys(dict).length;
    }

    function getWords(searchQuery, level, tag) {
        level = level.toUpperCase();
        tag = tag.toUpperCase();

        const out = {};
        for (const [word, detail] of Object.entries(dict)) {
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
        return !!dict[word];
    }

    function getWord(word) {
        if ((!word) || (word.length <= 0)) return null;
        const _out = dict[word];
        _fillDetailInfosIfMissing(_out);
        return _out;
    }

    function getTags() {
        if (!meta.tags) meta.tags = [];
        return readOnly(meta.tags);
    }

    function setTags(tags) {
        meta.tags.length = 0;
        meta.tags.push(...tags);
        meta.lastSyncTime = Date.now();
        _metaProxy.save();
        _needToUpload = true;
    }

    function getNRandomWords(n, out = []) {
        const N = n + out.length;
        const _tmp = Object.keys(dict);
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
            if (!record[_w]) {
                record[_w] = { attempts: 0, correct: 0 };
            }

            record[_w].attempts++;

            if (item.correct) {
                record[_w].correct++;
            }
        });
        _recordsProxy.save();
        meta.lastSyncTime = Date.now();
        _metaProxy.save();
        _needToUpload = true;
    }

    function getRecords() {
        return readOnly(record);
    }

    function getRuntimeStatus(sectionName) {
        if (!meta.runtime) {
            meta.runtime = {}
        }

        if (!meta.runtime[sectionName]) {
            meta.runtime[sectionName] = {}
        }

        return meta.runtime[sectionName];
    }

    function saveRuntimeStatus() {
        _metaProxy.save();
    }

    function getAPI() {
        if (!ai_api.key) return ''
        return ai_api.key;
    }

    function setAPI(key) {
        ai_api.key = key;
        _AIProxy.save();
    }

    function getUserID() {
        if (!ai_api.userID) return ''
        return ai_api.userID;
    }

    function setUserID(userID) {
        ai_api.userID = userID;
        _AIProxy.save();
    }

    function getSyncInterval() {
        if (!meta.syncTime) return 10;
        return Number(meta.syncTime);
    }

    let _needToUpload = false;
    function setSyncInterval(second) {
        second = second > 0 ? second : getSyncInterval();
        meta.syncTime = second;
        meta.lastSyncTime = Date.now();
        _metaProxy.save();
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


    const EVT_WORD = "evt_word";
    const EVT_DICT = "evt_dict";
    const __this__ = new EventTarget()
    Object.assign(__this__, {
        EVT_WORD,
        EVT_DICT,

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

        getRuntimeStatus,
        saveRuntimeStatus,

        getAPI,
        setAPI,
        getUserID,
        setUserID,
        getSyncInterval,
        setSyncInterval,
    })
    return __this__;
}

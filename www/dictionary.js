// ===============================
// Word Cache Management
// ===============================

const __VERSION__ = "0.1.0"

function initDictionary() {
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

    async function loadData() {
        const userID = ai_api.userID
        if (!userID) return;
        const response = await fetch("/api/data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userID, requestType: "get" }, null, 4),
        });
        const data = await response.json();
        if (data.success) {
            importDictionaryByContent(data.content);
        } else {
            logger.error(data.info);
        }
    }

    async function saveData() {
        const userID = ai_api.userID
        if (!userID) return;
        const json = JSON.stringify({
            content: { __VERSION__, meta, record, dict },
            userID,
            requestType: "save"
        }, null, 4);
        await fetch("/api/data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: json,
        });
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
        //alert(`Content has been imported`);
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
                alert("Import failed: " + err.message);
            }
        };
        reader.readAsText(file);
    }

    function clearDictionary() {
        _metaProxy.remove();
        _recordsProxy.remove();
        _wordsProxy.remove();
        _dispDictEvt("cleared");
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
        _dispEvt(word, _action);
        _wordsProxy.save();
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
        _wordsProxy.save();
    }

    function _removeLink(word, linkedWord) {
        const _detail = dict[word];
        if (!_detail) return;

        const regex = new RegExp(`,*\s*\\b${linkedWord}\\b`, "gi");
        _detail.links.replace(regex, "");
    }

    function deleteWord(word) {
        if (!word || !dict[word]) return;

        // 辅助函数：将字符串安全的转为干净的数组
        const parseLinks = (str) => {
            if (!str) return [];
            return str.split(',').map(w => w.trim()).filter(w => w.length > 0);
        };

        // 1. 获取当前单词关联的所有词，转为数组
        const linksArray = parseLinks(dict[word].links);

        // 2. 移除双向绑定的反向关联（对称清理）
        linksArray.forEach(linkedWord => {
            _removeLink(linkedWord, word)
        });

        // 4. 从内存字典中彻底删除该单词
        delete dict[word];
        _dispEvt(word, "delete");
        _wordsProxy.save();
    }

    function _dispEvt(word, action) {
        __this__.dispatchEvent(new CustomEvent(EVT_WORD, { detail: { word, action } }));
    }

    function _dispDictEvt(action) {
        __this__.dispatchEvent(new CustomEvent(EVT_DICT, { detail: { action } }));
    }

    function getWordsCount() {
        return Object.keys(dict).length;
    }

    function getWords(searchQuery, level, tag) {
        searchQuery = searchQuery.toLowerCase();
        level = level.toUpperCase();
        tag = tag.toUpperCase();

        const out = {};
        for (const [word, details] of Object.entries(dict)) {
            const matchesSearch = word.toLowerCase().includes(searchQuery) ||
                details.meaning.toLowerCase().includes(searchQuery);
            const matchesLevel = (level === 'ALL' || details.level?.toUpperCase() === level);
            const matchesTag = (tag === 'ALL' || details.tags?.toUpperCase().includes(tag));

            if (matchesSearch && matchesLevel && matchesTag) {
                out[word] = details
            }
        }
        return out;
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
        _metaProxy.save();
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

    function getSyncTime() {
        if (!meta.syncTime) return 60;
        return meta.syncTime;
    }

    let _syncTimer = null;
    function setSyncTime(second) {
        meta.syncTime = second > 0 ? second : 1000;
        _metaProxy.save();
        /*
        clearInterval(_syncTimer);
        _syncTimer = setInterval(e => {
            saveData();
        }, second);
        */
    }

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
        getSyncTime,
        setSyncTime,
    })
    return __this__;
}

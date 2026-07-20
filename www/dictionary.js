// ===============================
// Word Cache Management
// ===============================

const VERSION = "0.1.0"

function initDictionary() {
    function createStorageProxy(key) {
        const obj = JSON.parse(localStorage.getItem(key)) || {};
        function save() {
            localStorage.setItem(key, JSON.stringify(obj));
        }
        function get() {
            return obj;
        }
        function remove() {
            localStorage.removeItem(key);
            Object.keys(obj).forEach(key => delete obj[key]);
        }
        return { save, get, remove }
    }

    const _AIProxy = createStorageProxy('__AICache__');
    const _metaProxy = createStorageProxy('__metaCache__');
    const _recordsProxy = createStorageProxy('__recordCache__');
    const _wordsProxy = createStorageProxy('__wordCache__');
    /*
    meta: {
        tags: ["", ""],
        runtime: {
            activedWord: "last",
            selectedWords: ["a", 'ab'],
            filter: {
                search: "",
                level: "A1",
                tag: "ALL"
            }
        }
    },
    */
    const ai_api = _AIProxy.get();
    const meta = _metaProxy.get();
    const record = _recordsProxy.get();
    const dict = _wordsProxy.get();

    // Export JSON
    function exportDictionary() {
        const json = JSON.stringify({ VERSION, meta, record, dict }, null, 4);
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
    };


    // Import JSON
    function importDictionaryByContent(data) {
        Object.assign(meta, data.meta);
        Object.assign(record, data.record);
        Object.assign(dict, data.dict);
        _metaProxy.save();
        _recordsProxy.save();
        _wordsProxy.save();
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
                alert(
                    `Imported ${Object.keys(imported.dict).length} words`
                );
            } catch (err) {
                alert(
                    "Import failed: " + err.message
                );
            }
        };
        reader.readAsText(file);
    }


    // Clear cache
    function clearDictionary() {
        _metaProxy.remove();
        _recordsProxy.remove();
        _wordsProxy.remove();
    };

    // 异步调用 API 获取数据
    async function fetchExternalDict(word) {
        const resultContainer = document.getElementById("dict-external-result");
        resultContainer.innerHTML = `<div class="api-loading">⏳ 正在联网获取 "${word}" 释义...</div>`;

        // 过滤掉短语中的空格，提取主词组以便 API 正常识别
        const queryWord = word.split(' ')[0].replace(/[^a-zA-Z]/g, "");

        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${queryWord}`);
            if (!response.ok) throw new Error();

            const data = await response.json();
            renderExternalResult(data[0]);
        } catch (error) {
            resultContainer.innerHTML = `<div class="api-error">⚠️ 未能获取到该词的网络释义。(不支持短语或网络连接受限)</div>`;
        }
    }

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

        const data = dict[word] || {};
        _fillDetailInfosIfMissing(data);
        const oldLinks = data.links;
        data.ipa = ipa || '';
        data.meaning = meaning || '';
        data.level = level || '';
        data.note = note || '';
        data.links = links || '';
        data.tags = tags || '';

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

        // 5. 写回字典并持久化
        dict[word] = data;
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
        _wordsProxy.save();
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

    function getWord(word) {
        if (!word) return null;
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


    return {
        exportDictionary,
        importDictionaryByContent,
        importDictionaryByFile,
        clearDictionary,
        getWords,
        getWord,
        updateWord,
        deleteWord,
        getTags,
        setTags,
        getNRandomWords,
        setTestingResult,
        getRecords,

        getRuntimeStatus,
        saveRuntimeStatus,

        getAPI,
        setAPI,
    }
}

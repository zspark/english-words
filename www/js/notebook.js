
function initNotebook(dictionary, cacherCreator) {

    function create(name) {

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

        const __this__ = new EventTarget()
        Object.assign(__this__, {
            getWords,
            getWord,
            hasWord,
        });
        return __this__;
    }

    return {
        create,
    }
}

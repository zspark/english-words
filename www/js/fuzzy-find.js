
function initFuzzyFind() {
    function _score(word, query) {
        //word = word.toLowerCase();

        let score = 0;
        let j = 0;

        for (let i = 0; i < word.length && j < query.length; i++) {
            if (word[i] === query[j]) {
                score++;
                j++;
            }
        }

        return j === query.length ? score : -1;
    }

    function find(words, query) {
        query = query.toLowerCase();
        return words
            .map(word => ({
                word,
                score: _score(word, query)
            }))
            .filter(item => item.score >= 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.word);
    }

    return {
        find,
    }
}

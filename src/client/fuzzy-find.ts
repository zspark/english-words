
function _score(word: string, query: string): number {
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

export function find(words: string[], query: string): string[] {
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


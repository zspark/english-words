function initSectionPronunciation(dictionary) {
    const MP3_PATH = "./audio/";

    function _stopCurrentAudio(audio) { }

    function printMissings() {
        console.debug(`These words have no audio files:

${[..._missingAudios].join(",")}

done!`)
    }

    let _currentAudio = null;
    let _currentLoadingAudio = null;
    const _missingAudios = new Set();

    function _playExistMp3(word) {
        const _p = new Promise((resolve, reject) => {
            const _audio = new Audio();
            _audio.word = word;
            _audio.src = `${MP3_PATH}/${word}.mp3`;
            _audio.oncanplaythrough = () => {
                console.debug(`Audio can play through. ${_audio.word}`);
                resolve(_audio);
            };
            _audio.onerror = () => {
                console.error(`Invalid audio or file not found: ${_audio.word}`);
                reject(_audio);
            };

            _currentLoadingAudio = _audio;
            _audio.load();
        }).finally(() => {
            console.debug(`Finally called by ${_currentLoadingAudio.word}`);
            _currentLoadingAudio.oncanplaythrough = null;
            _currentLoadingAudio.onerror = null;
            _currentLoadingAudio = null;
        });

        return _p;
    }


    async function _generateByAI(str, fileName) {
        const apiKey = dictionary.getAPI();
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini-tts",
                voice: "alloy",
                input: str
            })
        });

        if (!response.ok) {
            console.error(await response.text());
            // alert("Request failed.");
            return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        audio.onended = () => {
            URL.revokeObjectURL(url);
        }
        audio.onerror = () => {
            URL.revokeObjectURL(url);
        }
        await audio.play();

        if (fileName) {
            const a = document.createElement("a");
            a.href = url;
            a.download = `${fileName}.mp3`;
            a.click();
        }
    }

    function pronounce(word) {
        if (typeof word !== "string" || word.trim() === "")
            return;

        word = word.trim().toLowerCase();
        if (_currentAudio) {
            if (_currentAudio.word == word) {
                if (_currentAudio.ended) {
                    console.debug(`${word} ended, just play from beginning.`);
                    _currentAudio.currentTime = 0;
                    _currentAudio.play();
                }
                return;
            } else {
                if (!_currentAudio.ended) {
                    console.debug(`pausing current playing audio. ${_currentAudio.word}`);
                    _currentAudio.pause();
                }
                _currentAudio = null;
            }
        }

        if (_currentLoadingAudio) {
            if (_currentLoadingAudio.word == word) {
                console.debug(`continue loading ${word}...`);
                return;
            }
            console.debug(`cancling current loading audio. ${_currentAudio.word}`);
            _currentLoadingAudio.removeAttribute("src");
            _currentLoadingAudio.load();
            _currentLoadingAudio = null;
        }

        _playExistMp3(word).then((audio) => {
            console.debug(`Then.resolve called by ${audio.word}`);
            audio.play();
            _currentAudio = audio;
            _missingAudios.delete(audio.word);
        }, (audio) => {
            console.debug(`Then.reject called by ${audio.word}`);
            _currentAudio = null;
            const utterance = new SpeechSynthesisUtterance(audio.word);
            utterance.lang = "en-US";
            utterance.rate = 0.8; //speed of pronunciation.
            speechSynthesis.speak(utterance);
            _missingAudios.add(audio.word);
        });
    }

    async function read(sentence, fileName = null) {
        if (typeof sentence !== "string" || sentence.trim() === "")
            return;

        sentence = sentence.trim();
        await _generateByAI(sentence, fileName);
    }

    return {
        pronounce,
        read,
        printMissings,
    }
}

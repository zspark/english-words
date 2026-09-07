
import { fetchJsonData } from "./utils.js"
import logger from "./logger.js"
import cacher from "./cacher.js"

const MP3_PATH = "./audio/";

function printMissings() {
    const _missingWords = Object.keys(cacher.wordsProxy.data())
        .filter(word => !Object.hasOwn(_existingAudios, word))
        .join(',');

    logger.log(`These words have no audio files:
start -----------------

${_missingWords}

----------------- end`)
}

//@ts-ignore
window.printWrodsMissingPronunciations = printMissings;

let _existingAudios: Record<string, boolean>;
let _currentAudio: HTMLAudioElement | null = null;
let _currentLoadingAudio: HTMLAudioElement | null = null;

function _playExistMp3(word: string): Promise<HTMLAudioElement> {
    const _p = new Promise<HTMLAudioElement>((resolve, reject) => {
        const _audio = new Audio();
        //@ts-ignore
        _audio.word = word;
        _audio.src = `${MP3_PATH}/${word}.mp3`;
        _audio.oncanplaythrough = () => {
            //logger.debug(`Audio can play through. ${_audio.word}`);
            resolve(_audio);
        };
        _audio.onerror = () => {
            //@ts-ignore
            logger.error(`Audio file: ${_currentLoadingAudio.word}.mp3 not exist, but exist in audio database.`);
            reject(_audio);
        };

        _currentLoadingAudio = _audio;
        _audio.load();
    }).finally(() => {
        //logger.debug(`Finally called by ${_currentLoadingAudio.word}`);
        if (_currentLoadingAudio) {
            _currentLoadingAudio.oncanplaythrough = null;
            _currentLoadingAudio.onerror = null;
            _currentLoadingAudio = null;
        }
    });

    return _p;
}

function _pronounceSynthetic(word: string): void {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.8; //speed of pronunciation.
    speechSynthesis.speak(utterance);
}

function _pronounce(word: string): void {
    if (typeof word !== "string" || word.trim() === "")
        return;

    word = word.trim().toLowerCase();

    if (_currentAudio) {
        //@ts-ignore
        if (_currentAudio.word == word) {
            if (_currentAudio.ended) {
                //logger.debug(`${word} ended, just play from beginning.`);
                _currentAudio.currentTime = 0;
                _currentAudio.play();
            }
            return;
        } else {
            if (!_currentAudio.ended) {
                //logger.debug(`pausing current playing audio. ${_currentAudio.word}`);
                _currentAudio.pause();
            }
            _currentAudio = null;
        }
    }

    if (_currentLoadingAudio) {
        //@ts-ignore
        if (_currentLoadingAudio.word == word) {
            //logger.debug(`continue loading ${word}...`);
            return;
        }
        //logger.debug(`cancling current loading audio. ${_currentAudio.word}`);
        _currentLoadingAudio.removeAttribute("src");
        _currentLoadingAudio.load();
        _currentLoadingAudio = null;
    }

    if (_existingAudios[word]) {
        _playExistMp3(word).then((audio) => {
            //logger.debug(`Then.resolve called by ${audio.word}`);
            audio.play();
            _currentAudio = audio;
        }, (audio) => {
            //logger.debug(`Then.reject called by ${audio.word}`);
            _currentAudio = null;
            _pronounceSynthetic(audio.word);
        });
    } else {
        // logger.debug(`Audio file ${word}.mp3 has not collectied yet.`);
        _pronounceSynthetic(word);
    }
}

(async function() {
    fetchJsonData('./audio/__audios__.json').then(data => {
        logger.log('Received Audio Database.');
        _existingAudios = data;
    }).catch(error => {
        logger.error('Audio Database Request failed:', error);
        _existingAudios = {};
    }).finally(() => {
        _api.pronounce = _pronounce;
    });
})()

const _api = {
    pronounce: (word: string): void => {
        if (typeof word !== "string" || word.trim() === "")
            return;
        word = word.trim().toLowerCase();
        _pronounceSynthetic(word);
    }
}

export default _api;


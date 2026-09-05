import logger from "./logger.js"
import { assertExist } from "./assert.js"
import { shuffle } from "./utils.js"
import ai from "./ai.js"
import Dictionary from "./dictionary.js"
import Card from "./card.js"
import cacher from "./cacher.js"
import serverProxy from "./server-proxy.js"
import prpc from "./pronunciation.js"
import cmp from "./components.js"
import words from "./section-words.js"
import { HTMLString, Detail, Words, Results, Result, Dict, DictSyncDataSC, DictSyncData, ResponseData, ResponseEvent } from "./types.js"
import { SectionBase, SectionUIBase } from "./section-base.js"


function _getQuestionStemSource(exclude: string): HTMLString {
    const selectedIndics = _rts.questionForm;
    exclude = exclude.toLowerCase();
    const _options = ['Word', 'IPA', 'Pronunciation', 'Meaning'].filter(w => w.toLowerCase() != exclude);
    return cmp.checkboxSource("id-question", "What Will Display As Question Stem?", _options, selectedIndics)
}

type LocalTestCacheType = {
    repeat: number,
    timeEach: number,
    optionCount: number,
    upperCase: boolean,
    questionForm: string[],
    toTest: keyof Detail,
    answerForm: string,
}

const _rts: LocalTestCacheType = cacher.localProxy.get('sec_test', {});
_rts.repeat = _rts.repeat ?? 1;
_rts.timeEach = _rts.timeEach ?? 5;
_rts.optionCount = _rts.optionCount ?? 4;
_rts.upperCase = _rts.upperCase ?? false;
_rts.questionForm = _rts.questionForm ?? ["word"];
_rts.toTest = _rts.toTest ?? "meaning";
_rts.answerForm = _rts.answerForm ?? "multichoice";

//${cmp.buttonGroupSource("id-actions", ["Reset", 'Start', 'Delete'])}
const _source = `
<div id="id-form" class='bs-panel bs-panel-middle'>

    ${cmp.dropdownSource("id-toTest", "What Do You Want To Test?", ['Meaning', 'Word', 'IPA'], _rts.toTest)}
    ${_getQuestionStemSource(_rts.toTest)}
    ${cmp.dropdownSource("id-answer-form", "Answer Form", ['Multichoice', 'Input', 'Voice'], _rts.answerForm)}
    ${cmp.sliderSource("id-timeEach", "Each Remain x Seconds?", 1, 10, _rts.timeEach)}
    ${cmp.sliderSource("id-hmotc", "How Many Options to Choose?", 2, 8, _rts.optionCount)}
    ${cmp.sliderSource("id-repeat", "Each Question Repeat n Times?", 1, 4, _rts.repeat)}
    ${cmp.switcherSource("id-case", "Capitalize Word?", _rts.upperCase)}

    <div class="bs-right-align mt20px">
        ${cmp.buttonGroupSource("id-actions", ['Start'])}
    </div>
</div>
<div id="id-test" class='bs-panel'>
    <div class="cc-test">
        <div class="cc-top">
            <div><span id="id-questions">10/20</span></div>
            <div>Time: <span id="id-time">5</span>s</div>
        </div>

        <div class="cc-progress">
            <div class="cc-bar" id="id-bar"></div>
        </div>

        <div class="cc-card">
            <div class="cc-word" id="id-word"></div>
            
            <div id="id-input-container">
                <div class="cc-options" id="id-options"></div>
                <input id="id-test-input" contenteditable="true"></input>
                <div id="id-voice">voice</div>
            </div>
        </div>
    </div>

</div>

<div id="id-result" class="bs-panel">
    <div class="bs-test-summary bs-group"></div>
    <ul id="wordList" class="word-list" style="list-style: none;"></ul>
    ${cmp.buttonGroupSource("id-post-actions", ['ReConfig', "Restart"])}
</div>`;



type RTContext = {
    currentWordRandomNumber: number,
    currentWord: string,
    remain: number,
    results: { word: string, yours?: string, correct: boolean }[],
};

const quiz: string[] = [];
export default class SectionTest extends SectionBase {
    #_ele_action_input: HTMLInputElement | null | undefined;

    _runtimeContext: RTContext = {
        currentWordRandomNumber: 0,
        currentWord: "",
        remain: 0,
        results: [],
    };
    timer: number = -1;
    totalQuestion: number = 0;
    _scrollY: number = 0;

    ele_form: HTMLElement;
    ele_test: HTMLElement;
    ele_result: HTMLElement;

    constructor(dict: Dictionary, card: Card) {
        super("container-col-1", _source, dict, card);

        const ele_form = this.ele_form = this.ui.get("#id-form");
        const ele_test = this.ele_test = this.ui.get("#id-test");
        ele_test.remove();
        const ele_result = this.ele_result = this.ui.get("#id-result");
        ele_result.remove();

        this.ui.get("#id-form #id-toTest").addEventListener("change", (e) => {
            // logger.debug("Selected value:", e.target.value);
            const _tar = e.target as HTMLInputElement;

            const ele_question = ele_form.querySelector<HTMLElement>("#id-question");
            if (ele_question) {
                ele_question.outerHTML = _getQuestionStemSource(_tar.value);
            }

            const _elem = ele_form.querySelector<HTMLInputElement>('#id-answer-form select');
            if (_elem) {
                let _s = "";
                switch (_tar.value) {
                    case "Word":
                        _s = cmp.dropdownOptionSource(['Multichoice', 'Input', 'Voice'], _rts.answerForm);
                        break;
                    case "IPA":
                    case "Meaning":
                        _s = cmp.dropdownOptionSource(['Multichoice'], 0);
                        break;
                }
                _elem.innerHTML = _s;
                _elem.dispatchEvent(new Event("change", { bubbles: true }));
            }
        });

        this.ui.get("#id-form #id-answer-form").addEventListener("change", (e) => {
            // logger.debug("Answer Selected Value:", e.target.value);

            const ele_hmotc = ele_form.querySelector<HTMLInputElement>("#id-hmotc");
            const ele_input_container = ele_test.querySelector("#id-input-container");

            if (ele_hmotc && ele_input_container) {
                switch ((e.target as HTMLInputElement).value) {
                    case "Multichoice":
                        ele_hmotc.removeAttribute("hidden");
                        ele_input_container.replaceChildren(ele_action_options as Node);
                        break;
                    case "Input":
                        ele_hmotc.setAttribute("hidden", "");
                        ele_input_container.replaceChildren(this.#_ele_action_input as Node);
                        break;
                    case "Voice":
                        ele_hmotc.setAttribute("hidden", "");
                        ele_input_container.replaceChildren(ele_action_voice as Node);
                        break;
                }
            }
        });

        this.ui.get("#id-form #id-actions").addEventListener("click", (e) => {
            const _tar = e.target as HTMLElement;
            if (_tar.dataset.index === "0") {
                this._genInfosFromQuestionaire();
                if (_rts.questionForm.length <= 0) {
                    const _s = `need to assign question form!!`;
                    logger.error(_s);
                    alert(_s);
                    return;
                }
                if ([].length <= 0) {
                    const _s = 'Try pick some words first, then give it a go!';
                    logger.error(_s);
                    alert(_s);
                    return;
                }
                this._setupBeforeText();
            }
        })


        const ele_input_container = ele_test.querySelector("#id-input-container");
        ele_input_container?.replaceChildren();
        const ele_action_options = ele_input_container?.querySelector("#id-options");
        ele_action_options?.addEventListener("click", (e) => {
            const _tar = e.target as HTMLElement;
            if (_tar.tagName === "BUTTON") {
                this._checkByIndex(Number(_tar.dataset.index));
            }
        });

        const ele_action_input = this.#_ele_action_input = ele_input_container?.querySelector<HTMLInputElement>("#id-test-input");
        ele_action_input?.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key !== "Enter")
                return;

            e.preventDefault();

            const value = ele_action_input.value.trim();
            this._checkByWord(value);
            ele_action_input.value = '';
        });


        const ele_action_voice = ele_input_container?.querySelector("#id-voice");


        const ele_post_actions = ele_result.querySelector("#id-post-actions");
        ele_post_actions?.addEventListener("click", (e) => {
            const _tar = e.target as HTMLElement;
            if (_tar.dataset.index === "0") {//reconfig
                this.ui.getRoot().replaceChildren(ele_form);
            } else if (_tar.dataset.index === "1") {//restart
                this._setupBeforeText();
            }
        })
    }


    _setupBeforeText(): void {
        this._runtimeContext = {
            currentWordRandomNumber: 0,
            currentWord: "",
            remain: 0,
            results: [],
        };

        this._genTestingWords();
        this._newQuestion();
        this.ui.getRoot().replaceChildren(this.ele_test);
        this.#_ele_action_input?.focus();
    }

    #_getValue(selector: string): string {
        return this.ui.get<HTMLInputElement>(selector).value;
    }

    _genInfosFromQuestionaire(): boolean {
        const ops = this.ui.getAll<HTMLInputElement>("#id-form #id-question .bs-option input");
        const _requirement = {
            repeat: parseInt(this.#_getValue("#id-form #id-repeat input")),
            timeEach: parseInt(this.#_getValue("#id-form #id-timeEach input")),
            optionCount: parseInt(this.#_getValue("#id-form id-hmotc input")),
            upperCase: this.ui.get<HTMLInputElement>("id-form #id-case").checked,
            questionForm: [...ops].filter(o => o.checked).map(o => o.id.toLowerCase()),
            toTest: this.#_getValue("#id-form #id-toTest select").toLowerCase(),
            answerForm: this.#_getValue("#id-form id-answer-form select").toLowerCase(),
        }

        if (_requirement.questionForm.length <= 0) {
            logger.error(`Need to Select at Least One Question Form!`);
            return false;
        }

        Object.assign(_rts, _requirement);

        logger.debug(`The gathered Infos are:
${JSON.stringify(_requirement, null, 4)}`);
        return true;
    }

    _genTestingWords(): void {
        const _arr: string[] = [];
        quiz.length = 0;
        for (let i = 0, N = _rts.repeat; i < N; ++i) {
            shuffle(_arr);
            quiz.push(..._arr);
        }
        this.totalQuestion = quiz.length;
    }

    _renderQuestion(word: string): void {
        const _detail = this._dict.getWord(word);
        if (!_detail) {
            logger.vital(`Word ${word} doesn't exist in the dictionary.`);
            return;
        }

        let _s: HTMLString = "";
        const _questionName = _rts.questionForm[Math.floor(Math.random() * (_rts.questionForm.length))];
        switch (_questionName) {
            case "word":
                _s = _rts.upperCase ? word.toUpperCase() : word.toLowerCase();
                break;
            case "ipa":
                _s = _detail.ipa
                break;
            case "pronunciation":
                _s = `<button id="btn-pronounce" class="icon-btn icon s28px">
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">

        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </svg>
</button>`;
                prpc.pronounce(word);
                break;
            case "meaning":
                _s = _detail.meaning;
                break;
        }
        this.ui.setInnerHTML("#id-test #id-word", _s);
    }

    _renderAnswers(word: string, options: string[]): void {
        this._runtimeContext.currentWord = word;
        if (_rts.answerForm === "multichoice") {
            let _s = '';
            for (let i = 0, N = options.length; i < N; ++i) {
                let _w = options[i];
                if (_w === word) {
                    this._runtimeContext.currentWordRandomNumber = i;
                }
                if (_rts.toTest == 'word') {
                    _s += `<button class="cc-option" data-index=${i}>${_w}</button> `
                } else {
                    let _detail = this._dict.getWord(_w);
                    if (_detail) {
                        _s += `<button class="cc-option" data-index=${i}>${_detail[_rts.toTest]}</button> `
                    }
                }
            };
            this.ui.setInnerHTML("#id-test #id-input-container #id-options", _s);
        } else if (_rts.answerForm === "input") {
        } else {
        }
    }

    _newQuestion(): void {
        clearInterval(this.timer);

        let _w = quiz.pop();
        if (!_w) {
            logger.log("finished!!!!!");
            this.renderTestResult(this._runtimeContext.results);
            this.ui.getRoot().replaceChildren(this.ele_result);
            this._dict.setTestingResult(this._runtimeContext.results);
            return
        }

        let options: string[] = [_w];
        this._dict.getNRandomWords(_rts.optionCount - 1, options);
        shuffle(options);
        this._renderQuestion(_w);
        this._renderAnswers(_w, options);
        this.ui.setInnerHTML("#id-test #id-questions", `${this.totalQuestion - quiz.length}/${this.totalQuestion}`);
        this._startTimer();
    }

    _startTimer(): void {
        const ele_action_time = this.ele_test.querySelector("#id-time") as HTMLElement;
        const ele_action_bar = this.ele_test.querySelector("#id-bar") as HTMLElement;
        assertExist(ele_action_time);
        assertExist(ele_action_bar);

        const _updateBar = (): void => {
            ele_action_time.innerHTML = this._runtimeContext.remain + "";
            ele_action_bar.style.width = (this._runtimeContext.remain / _rts.timeEach * 100) + "%";
        }

        this._runtimeContext.remain = _rts.timeEach;
        _updateBar();
        this.timer = setInterval(() => {
            this._runtimeContext.remain--;
            _updateBar();
            if (this._runtimeContext.remain <= 0) {
                this._checkByIndex(-1);
            }
        }, 1000);
    }

    _checkByWord(word: string): void {
        const pass = word.toLowerCase() === this._runtimeContext.currentWord.toLowerCase();
        this._runtimeContext.results.push({ word: this._runtimeContext.currentWord, yours: word, correct: pass });
        this._newQuestion();
    }

    _checkByIndex(index: number): void {
        const pass = index === this._runtimeContext.currentWordRandomNumber;
        this._runtimeContext.results.push({ word: this._runtimeContext.currentWord, correct: pass });
        this._newQuestion();
    }

    deactive(): void {
        this._scrollY = window.scrollY;
    }

    active(): void {
        window.scrollTo(0, this._scrollY);
        this.ui.get("#id-form #id-toTest select").dispatchEvent(new Event("change", { bubbles: true }));
    }


    renderTestResult(results: Result[]): void {
        const summaryElem = this.ele_result.querySelector(".bs-test-summary");
        if (summaryElem) {
            const correctCount = results.filter(x => x.correct).length;
            const accuracy = Math.round(correctCount * 100 / results.length);
            summaryElem.innerHTML = `<h2>Test Summary</h2>
                                <div> Total: ${results.length} </div>
                                <div> Correct: ${correctCount} </div>
                                ${cmp.progressBarSource("", accuracy)}`;
        }

        let _s: HTMLString = '';
        results.forEach(result => {
            const word = result.word;
            const detail = this._dict.getWord(word);
            if (!detail) return;

            _s += `<li class="word-card" data-word="${word}">
    <div class="word-card-content">
        <label>
            <span class="word-name ${result.correct ? "bs-word-correct" : "bs-word-wrong"}" >${word}</span>
            <span class="word-ipa">${detail.ipa}</span>
            <span class="tag word-level">${detail.level}</span>
            <span class="word-meaning">${detail.meaning}</span>
        </label>
    </div>
</li>`;
        });

        this.ui.setInnerHTML("#id-result #wordList", _s)
    }

    setSync(scrollY: number): void { }

    keyEvent(event: Event): void { }

}



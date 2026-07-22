

function initTestSection(ai, dictionary, cmp, secWords, pronunciation) {
    const _rts = dictionary.getRuntimeStatus('sec_test');
    _rts.requirement = _rts.requirement || {
        repeat: 1,
        timeEach: 5,
        optionCount: 4,
        upperCase: false,
        questionForm: [
            "word"
        ],
        toTest: "meaning",
        answerForm: "multichoice"
    }

    //${cmp.buttonGroupSource("id-actions", ["Reset", 'Start', 'Delete'])}
    const _source = `
<div id="id-form" class='bs-panel'>

    ${cmp.dropdownSource("id-toTest", "What Do You Want To Test?", ['Meaning', 'Word', 'IPA'], _rts.requirement.toTest)}
    ${_getQuestionStemSource(_rts.requirement.toTest)}
    ${cmp.dropdownSource("id-answer-form", "Answer Form", ['Multichoice', 'Input', 'Voice'], _rts.requirement.answerForm)}
    ${cmp.sliderSource("id-timeEach", "Each Remain x Seconds?", 1, 10, _rts.requirement.timeEach)}
    ${cmp.sliderSource("id-hmotc", "How Many Options to Choose?", 2, 8, _rts.requirement.optionCount)}
    ${cmp.sliderSource("id-repeat", "Each Question Repeat n Times?", 1, 4, _rts.requirement.repeat)}
    ${cmp.switcherSource("id-case", "Capitalize Word?", _rts.requirement.upperCase)}

    ${cmp.buttonGroupSource("id-actions", ['Start'])}
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
</div>
`;



    const ele_root = document.createElement('div');
    ele_root.className = "container";
    ele_root.innerHTML = _source;

    const ele_form = ele_root.querySelector("#id-form");
    const ele_timeEach = ele_form.querySelector("#id-timeEach");
    const ele_testingType = ele_form.querySelector("#id-toTest");
    const ele_answerForm = ele_form.querySelector("#id-answer-form");
    const ele_hmotc = ele_form.querySelector("#id-hmotc");
    const ele_case = ele_form.querySelector("#id-case");
    const ele_repeat = ele_form.querySelector("#id-repeat");
    const ele_action = ele_form.querySelector("#id-actions");

    const ele_test = ele_root.querySelector("#id-test");
    ele_test.remove();
    const ele_action_questions = ele_test.querySelector("#id-questions");
    const ele_action_time = ele_test.querySelector("#id-time");
    const ele_action_bar = ele_test.querySelector("#id-bar");
    const ele_action_word = ele_test.querySelector("#id-word");
    const ele_input_container = ele_test.querySelector("#id-input-container");
    const ele_action_options = ele_input_container.querySelector("#id-options");
    const ele_action_input = ele_input_container.querySelector("#id-test-input");
    const ele_action_voice = ele_input_container.querySelector("#id-voice");
    ele_input_container.replaceChildren();

    const ele_result = ele_root.querySelector("#id-result");
    ele_result.remove();
    const ele_wordList = ele_result.querySelector('#wordList');
    const ele_post_actions = ele_result.querySelector("#id-post-actions");

    ele_testingType.addEventListener("change", (e) => {
        console.debug("Selected value:", e.target.value);
        const ele_question = ele_form.querySelector("#id-question");
        let _s = _getQuestionStemSource(e.target.value);
        ele_question.outerHTML = _s;

        _s = "";
        switch (e.target.value) {
            case "Word":
                _s = cmp.dropdownOptionSource(['Multichoice', 'Input', 'Voice'], _rts.requirement.answerForm);
                break;
            case "IPA":
            case "Meaning":
                _s = cmp.dropdownOptionSource(['Multichoice'], 0);
                break;
        }
        const _elem = ele_answerForm.querySelector('select');
        _elem.innerHTML = _s;
        _elem.dispatchEvent(new Event("change", { bubbles: true }));
    });

    ele_answerForm.addEventListener("change", (e) => {
        console.debug("Answer Selected Value:", e.target.value);

        switch (e.target.value) {
            case "Multichoice":
                ele_hmotc.removeAttribute("hidden");
                ele_input_container.replaceChildren(ele_action_options);
                break;
            case "Input":
                ele_hmotc.setAttribute("hidden", "");
                ele_input_container.replaceChildren(ele_action_input);
                break;
            case "Voice":
                ele_hmotc.setAttribute("hidden", "");
                ele_input_container.replaceChildren(ele_action_voice);
                break;
        }
    });

    ele_post_actions.addEventListener("click", (e) => {
        if (e.target.dataset.index === "0") {//reconfig
            ele_root.replaceChildren(ele_form);
        } else if (e.target.dataset.index === "1") {//restart
            _setupBeforeText();
        }
    })


    function _setupBeforeText() {
        _runtimeContext = {
            currentWordRandomNumber: 0,
            currentWord: "",
            remain: 0,
            results: [],
        };

        _genTestingWords();
        _newQuestion();
        ele_root.replaceChildren(ele_test);
        ele_action_input.focus();
    }

    ele_action.addEventListener("click", (e) => {
        if (e.target.dataset.index === "0") {
            _genInfosFromQuestionaire();
            if (_rts.requirement.questionForm.length <= 0) {
                const _s = `need to assign question form!!`;
                console.error(_s);
                alert(_s);
                return;
            }
            if (secWords.getSelectedWords().length <= 0) {
                const _s = 'Try pick some words first, then give it a go!';
                console.error(_s);
                alert(_s);
                return;
            }
            _setupBeforeText();
        }
    })

    ele_action_options.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON") {
            _checkByIndex(e.target.dataset.index);
        }
    });

    ele_action_input.addEventListener("keydown", function(e) {
        if (e.key !== "Enter")
            return;

        e.preventDefault();

        const value = ele_action_input.value.trim();
        _checkByWord(value);
        ele_action_input.value = '';
    });


    function _genInfosFromQuestionaire() {
        const ops = ele_form.querySelectorAll("#id-question .bs-option input");
        const _requirement = {
            repeat: parseInt(ele_repeat.querySelector("input").value),
            timeEach: parseInt(ele_timeEach.querySelector("input").value),
            optionCount: parseInt(ele_hmotc.querySelector("input").value),
            upperCase: ele_case.querySelector("input").checked,
            questionForm: [...ops].filter(o => o.checked).map(o => o.id.toLowerCase()),
            toTest: ele_testingType.querySelector("select").value.toLowerCase(),
            answerForm: ele_answerForm.querySelector("select").value.toLowerCase(),
        }

        if (_requirement.questionForm.length <= 0) {
            console.error(`Need to Select at Least One Question Form!`);
            return false;
        }

        Object.assign(_rts.requirement, _requirement);
        dictionary.saveRuntimeStatus();

        console.debug(`The gathered Infos are:
${JSON.stringify(_requirement, null, 4)}`);
        return true;
    }

    function _genTestingWords() {
        const _arr = [...secWords.getSelectedWords()];
        quiz.length = 0;
        for (let i = 0, N = _rts.requirement.repeat; i < N; ++i) {
            shuffle(_arr);
            quiz.push(..._arr);
        }
        totalQuestion = quiz.length;
    }

    function _renderQuestion(word) {
        let _s = "";
        const _detail = dictionary.getWord(word);
        const _questionName = _rts.requirement.questionForm[Math.floor(Math.random() * (_rts.requirement.questionForm.length))];
        switch (_questionName) {
            case "word":
                _s = _rts.requirement.upperCase ? word.toUpperCase() : word.toLowerCase();
                break;
            case "ipa":
                _s = _detail.ipa
                break;
            case "pronunciation":
                _s = `<button id="btn-pronounce" class="icon-btn s28px" title="发音">
    <svg xmlns="http://www.w3.org/2000/svg"
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
                pronunciation.pronounce(word);
                break;
            case "meaning":
                _s = _detail.meaning;
                break;
        }
        ele_action_word.innerHTML = _s;
    }

    function _renderAnswers(word, options) {
        _runtimeContext.currentWord = word;
        if (_rts.requirement.answerForm === "multichoice") {
            let _s = '';
            for (let i = 0, N = options.length; i < N; ++i) {
                let _w = options[i];
                if (_w === word) {
                    _runtimeContext.currentWordRandomNumber = i + "";
                }
                if (_rts.requirement.toTest == 'word') {
                    _s += `<button class="cc-option" data-index=${i}>${_w}</button> `
                } else {
                    let _detail = dictionary.getWord(_w);
                    _s += `<button class="cc-option" data-index=${i}>${_detail[_rts.requirement.toTest]}</button> `
                }
            };
            ele_action_options.innerHTML = _s;
        } else if (_rts.requirement.answerForm === "input") {
        } else {
        }
    }

    let _runtimeContext = null;
    const quiz = [];
    let timer = null;
    let totalQuestion = 0;
    function _newQuestion() {
        clearInterval(timer);
        if (quiz.length <= 0) {
            console.error("finished!!!!!");
            saveTestResult(_runtimeContext.results);
            ele_root.replaceChildren(ele_result);
            renderTestResult(_runtimeContext.results);
            dictionary.setTestingResult(_runtimeContext.results);
            return
        }
        let _w = quiz.pop();
        let options = [_w];
        dictionary.getNRandomWords(_rts.requirement.optionCount - 1, options);
        shuffle(options);
        _renderQuestion(_w);
        _renderAnswers(_w, options);
        ele_action_questions.innerHTML = `${totalQuestion - quiz.length}/${totalQuestion}`;
        _startTimer();
    }

    function _startTimer() {
        _runtimeContext.remain = _rts.requirement.timeEach;
        _updateBar();
        timer = setInterval(() => {
            _runtimeContext.remain--;
            _updateBar();
            if (_runtimeContext.remain <= 0) {
                _checkByIndex(-1);
            }
        }, 1000);
    }

    function _checkByWord(word) {
        const pass = word.toLowerCase() === _runtimeContext.currentWord.toLowerCase();
        _runtimeContext.results.push({ word: _runtimeContext.currentWord, yours: word, correct: pass });
        _newQuestion();
    }

    function _checkByIndex(index) {
        const pass = index === _runtimeContext.currentWordRandomNumber;
        _runtimeContext.results.push({ word: _runtimeContext.currentWord, correct: pass });
        _newQuestion();
    }

    function _updateBar() {
        ele_action_time.innerHTML = _runtimeContext.remain;
        ele_action_bar.style.width = (_runtimeContext.remain / _rts.requirement.timeEach * 100) + "%";
    }

    function _getQuestionStemSource(exclude) {
        const selectedIndics = _rts.requirement.questionForm;
        exclude = exclude.toLowerCase();
        const _options = ['Word', 'IPA', 'Pronunciation', 'Meaning'].filter(w => w.toLowerCase() != exclude);
        return cmp.checkboxSource("id-question", "What Will Display As Question Stem?", _options, selectedIndics)
    }

    function update() {
        ele_testingType.querySelector("select").dispatchEvent(new Event("change", { bubbles: true }));
    }

    function keyEvent(event) {
        // if (!_activedWordElem) return;

        if (event.key === "d") {
            // _activeWord(_activedWordElem.nextElementSibling);
        } else if (event.key === "e") {
            // _activeWord(_activedWordElem.previousElementSibling);
        } else if (event.key === "f") {
            // card.pronounceShownWord();
        } else if (event.key === "s") {
            // _toggleWordSelection(_activedWordElem, true);
            // _updateStatus();
        }

    }

    function saveTestResult(results) {
        results.forEach(item => {
            updateWordStatistics(item.word, item.correct);
        });
    }

    function updateWordStatistics(word, correct) {
        const stats =
            JSON.parse(
                localStorage.getItem("word_test_statistics")
                || "{}"
            );

        if (!stats[word]) {
            stats[word] = {
                attempts: 0,
                correct: 0
            };
        }

        stats[word].attempts++;

        if (correct) {
            stats[word].correct++;
        }

        localStorage.setItem(
            "word_test_statistics",
            JSON.stringify(stats)
        );
    }

    function renderTestResult(results) {
        const summaryElem = ele_result.querySelector(".bs-test-summary");
        const stats =
            JSON.parse(
                localStorage.getItem(
                    "word_test_statistics"
                ) || "{}"
            );

        const correctCount = results.filter(x => x.correct).length;
        const accuracy = Math.round(correctCount * 100 / results.length);

        summaryElem.innerHTML = `
        <h2>Test Summary</h2>
        <div> Total: ${results.length} </div>
        <div> Correct: ${correctCount} </div>
        ${cmp.progressBarSource("", accuracy)}
    `;

        let _s = '';
        results.forEach(result => {
            const word = result.word;
            const detail = dictionary.getWord(word);

            _s += `
<li class="word-card" data-word="${word}">
    <div class="word-card-content">
        <label>
            <span class="word-name ${result.correct ? "bs-word-correct" : "bs-word-wrong"}" >${word}</span>
            <span class="word-ipa">${detail.ipa}</span>
            <span class="tag word-level">${detail.level}</span>
            <span class="word-meaning">${detail.meaning}</span>
        </label>
    </div>
</li>
`;
        });

        ele_wordList.innerHTML = _s;
    }

    return {
        ele_root,
        update,
        keyEvent,
    }
}



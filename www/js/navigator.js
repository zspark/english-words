function initNavigator(bodyElem, cmp, dictionary, leftCallbackFn, rightCallbackFn) {
    const _source = `
<div id="top-bar-left" class="horizon">
    <div id="sec-dictionary" class="sec-btn"><span>WORDS</span></div>
    <div id="sec-read" class="sec-btn"><span>ARTICLE</span></div>
    <div id="sec-test" class="sec-btn"><span>TEST</span></div>
    <div id="sec-result" class="sec-btn"><span>STATISTIC</span></div>
    <div id="sec-setting" class="sec-btn icon-2">
        <svg viewBox="0 0 36 36">
            <path d="M34 15h-3.362a12.915 12.915 0 0 0-1.582-3.814l2.379-2.379a2 2 0 0 0 0-2.829l-1.414-1.414a2 2 0 0 0-2.828 0l-2.379 2.379A12.924 12.924 0 0 0 21 5.362V2a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3.362a12.915 12.915 0 0 0-3.814 1.582L8.808 4.565a2 2 0 0 0-2.828 0L4.565 5.979a2.002 2.002 0 0 0-.001 2.829l2.379 2.379A12.918 12.918 0 0 0 5.362 15H2a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h3.362a12.92 12.92 0 0 0 1.582 3.813l-2.379 2.379c-.78.78-.78 2.048.001 2.829l1.414 1.414c.78.78 2.047.78 2.828 0l2.379-2.379a12.889 12.889 0 0 0 3.814 1.582V34a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-3.362a12.92 12.92 0 0 0 3.813-1.582l2.379 2.379a2 2 0 0 0 2.828 0l1.414-1.414a2 2 0 0 0 0-2.829l-2.379-2.379a12.889 12.889 0 0 0 1.582-3.814H34a2 2 0 0 0 2-2v-2A2 2 0 0 0 34 15zM18 26a8 8 0 1 1 0-16a8 8 0 0 1 0 16z">
            </path>
        </svg>
    </div>
</div>

<div id="top-bar-right" class="horizon">
    ${cmp.searchSource("id-searchInput", "Search word while inputting")}
</div>`;

    const ele_root = document.createElement('div');
    ele_root.id = "navigator";
    ele_root.innerHTML = _source;

    const ele_left = ele_root.querySelector("#top-bar-left");
    const ele_sec_words = ele_left.querySelector("#sec-dictionary");
    const ele_sec_article = ele_left.querySelector("#sec-read");
    const ele_sec_test = ele_left.querySelector("#sec-test");
    const ele_sec_result = ele_left.querySelector("#sec-result");
    const ele_sec_setting = ele_left.querySelector("#sec-setting")

    const ele_right = ele_root.querySelector("#top-bar-right");
    const searchInput = ele_right.querySelector('#id-searchInput input');
    const searchBtn = ele_right.querySelector('#id-searchInput button');

    searchInput.addEventListener('input', (e) => {
        const word = searchInput.value;
        if (word.length <= 0 || dictionary.hasWord(word)) {
            searchInput.classList.remove("color-red");
        } else {
            searchInput.classList.add("color-red");
        }

        _delaySaver.save();
    });
    searchBtn.addEventListener('click', resetFilter);

    function resetFilter() {
        searchInput.value = "";
        searchInput.classList.remove("color-red");
        __this__.dispatchEvent(new CustomEvent(EVT_FILTER, { detail: { word: "" } }));
    }
    function isFocused() {
        return document.activeElement === searchInput;
    }
    function setFocus() {
        searchInput.focus();
    }
    function setBlur() {
        searchInput.blur();
    }

    let _currentSectionElemBtn = null;

    function activeWord() {
        if (_currentSectionElemBtn == ele_sec_words) return;
        _currentSectionElemBtn?.removeAttribute("active");
        ele_sec_words.setAttribute("active", "");
        _currentSectionElemBtn = ele_sec_words;
    }
    function activeArticle() {
        if (_currentSectionElemBtn == ele_sec_article) return;
        _currentSectionElemBtn?.removeAttribute("active");
        ele_sec_article.setAttribute("active", "");
        _currentSectionElemBtn = ele_sec_article;
    }
    function activeTest() {
        if (_currentSectionElemBtn == ele_sec_test) return;
        _currentSectionElemBtn?.removeAttribute("active");
        ele_sec_test.setAttribute("active", "");
        _currentSectionElemBtn = ele_sec_test;
    }
    function activeResult() {
        if (_currentSectionElemBtn == ele_sec_result) return;
        _currentSectionElemBtn?.removeAttribute("active");
        ele_sec_result.setAttribute("active", "");
        _currentSectionElemBtn = ele_sec_result;
    }
    function activeSetting() {
        if (_currentSectionElemBtn == ele_sec_setting) return;
        _currentSectionElemBtn?.removeAttribute("active");
        ele_sec_setting.setAttribute("active", "");
        _currentSectionElemBtn = ele_sec_setting;
    }

    ele_left.addEventListener('click', (e) => {
        leftCallbackFn(e.target.id);
    })
    ele_right.addEventListener('click', (e) => {
        rightCallbackFn(e.target.id);
    })

    bodyElem.prepend(ele_root);

    function keyEvent(event) {
        if (isFocused()) {
            if (event.key === "Enter") {
                if (event.ctrlKey) {
                } else {
                    setBlur();
                }
            } else if (event.key === "Escape") {
                resetFilter();
            }
            return false;
        } else {
            if (!isEditing()) {
                if (event.key === "Enter") {
                    setFocus();
                    return false;
                }
            }
            return true;
        }
    }

    const _delaySaver = (function () {
        let _timer = null;
        function save() {
            if (!_timer) {
                _timer = setTimeout((e) => {
                    dictionary.saveLocalData();
                    _timer = null;
                }, 1000);
            }
        }
        return {
            save,
        }
    })();

    const EVT_FILTER = "evt_filter";
    const __this__ = new EventTarget()
    Object.assign(__this__, {
        activeWord,
        activeArticle,
        activeTest,
        activeResult,
        activeSetting,

        keyEvent,

        EVT_FILTER,
    });
    return __this__;
}


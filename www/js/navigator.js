function initNavigator(bodyElem, cmp, dictionary) {
    const _source = `
<div id="top-bar-left" class="horizon">
    <div id="sec-dictionary" class="sec-btn clickable"><span>WORDS</span></div>
    <div id="sec-read" class="sec-btn clickable"><span>ARTICLE</span></div>
    <div id="sec-test" class="sec-btn clickable"><span>TEST</span></div>
    <div id="sec-result" class="sec-btn clickable"><span>STATISTIC</span></div>
    <div id="sec-setting" class="sec-btn clickable">
        <svg viewBox="0 0 36 36">
            <path d="M34 15h-3.362a12.915 12.915 0 0 0-1.582-3.814l2.379-2.379a2 2 0 0 0 0-2.829l-1.414-1.414a2 2 0 0 0-2.828 0l-2.379 2.379A12.924 12.924 0 0 0 21 5.362V2a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v3.362a12.915 12.915 0 0 0-3.814 1.582L8.808 4.565a2 2 0 0 0-2.828 0L4.565 5.979a2.002 2.002 0 0 0-.001 2.829l2.379 2.379A12.918 12.918 0 0 0 5.362 15H2a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h3.362a12.92 12.92 0 0 0 1.582 3.813l-2.379 2.379c-.78.78-.78 2.048.001 2.829l1.414 1.414c.78.78 2.047.78 2.828 0l2.379-2.379a12.889 12.889 0 0 0 3.814 1.582V34a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-3.362a12.92 12.92 0 0 0 3.813-1.582l2.379 2.379a2 2 0 0 0 2.828 0l1.414-1.414a2 2 0 0 0 0-2.829l-2.379-2.379a12.889 12.889 0 0 0 1.582-3.814H34a2 2 0 0 0 2-2v-2A2 2 0 0 0 34 15zM18 26a8 8 0 1 1 0-16a8 8 0 0 1 0 16z">
            </path>
        </svg>
    </div>
</div>

<div id="top-bar-right" class="horizon content-right">
</div>`;

    const ele_root = document.createElement('div');
    ele_root.id = "navigator";
    ele_root.className = "hTop";
    ele_root.innerHTML = _source;

    const ele_left = ele_root.querySelector("#top-bar-left");
    const ele_right = ele_root.querySelector("#top-bar-right");

    const ele_sec_words = ele_root.querySelector("#sec-dictionary");
    const ele_sec_article = ele_root.querySelector("#sec-read");
    const ele_sec_test = ele_root.querySelector("#sec-test");
    const ele_sec_result = ele_root.querySelector("#sec-result");
    const ele_sec_setting = ele_root.querySelector("#sec-setting")

    let _currentSectionElemBtn = null;
    function _highlightSection(elem) {
        if (_currentSectionElemBtn == elem) return;
        _currentSectionElemBtn?.removeAttribute("active");
        elem.setAttribute("active", "");
        _currentSectionElemBtn = elem;
    }
    const activeWord = _highlightSection.bind(null, ele_sec_words);
    const activeArticle = _highlightSection.bind(null, ele_sec_article);
    const activeTest = _highlightSection.bind(null, ele_sec_test);
    const activeResult = _highlightSection.bind(null, ele_sec_result);
    const activeSetting = _highlightSection.bind(null, ele_sec_setting);

    ele_left.addEventListener('click', (e) => {
        __this__.dispatchEvent(new CustomEvent(EVT_SECTION, { detail: { id: e.target.id } }));
    });
    ele_right.addEventListener('click', (e) => {
        // __this__.dispatchEvent(new CustomEvent(EVT_SECTION, { detail: { id: e.target.id } }));
    });

    (function () {
        const _syncDiv = document.createElement("div");
        _syncDiv.innerHTML = `<svg class="cls-rotating" viewBox="0 0 24 24">
    <path d="M19.91 15.51h-4.53a1 1 0 0 0 0 2h2.4A8 8 0 0 1 4 12a1 1 0 0 0-2 0 10 10 0 0 0 16.88 7.23V21a1 1 0 0 0 2 0v-4.5a1 1 0 0 0-.97-.99M12 2a10 10 0 0 0-6.88 2.77V3a1 1 0 0 0-2 0v4.5a1 1 0 0 0 1 1h4.5a1 1 0 0 0 0-2h-2.4A8 8 0 0 1 20 12a1 1 0 0 0 2 0A10 10 0 0 0 12 2" />
</svg>`;
        _syncDiv.className = "sec-btn";

        dictionary.addEventListener(dictionary.EVT_DICT, e => {
            if (e.detail.action === "begin:sync") {
                ele_left.append(_syncDiv);
            } else if (e.detail.action === "end:sync") {
                _syncDiv.remove();
            }
        });
    })()

    bodyElem.prepend(ele_root);

    const EVT_SECTION = "evt_section";
    const __this__ = new EventTarget()
    Object.assign(__this__, {
        activeWord,
        activeArticle,
        activeTest,
        activeResult,
        activeSetting,

        EVT_SECTION,
    });
    return __this__;
}


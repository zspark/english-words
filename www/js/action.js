async function fetchJsonData(url) {
    try {
        const response = await fetch(url);

        // Check if the HTTP status code is in the 200–299 range
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse and return the JSON body
        const data = await response.json();
        return data;
    } catch (error) {
        logger.error('Failed to fetch JSON:', error);
        throw error; // Re-throw so caller can handle it if needed
    }
}

const _PLF_WINDOWS_ = "Windows";
const _PLF_IOS_ = "iOS";
const _PLF_MACOS_ = "macOS";
const _PLF_LINUX_ = "Linux";
const _PLF_ANDROID_ = "Android";

const _PLATFORM_ = (function() {
    const ua = navigator.userAgent;

    if (/Android/i.test(ua)) return _PLF_ANDROID_;
    if (/iPhone|iPad|iPod/i.test(ua)) return _PLF_IOS_;
    if (/Windows/i.test(ua)) return _PLF_WINDOWS_;
    if (/Macintosh|Mac OS X/i.test(ua)) return _PLF_MACOS_;
    if (/Linux/i.test(ua)) return _PLF_LINUX_;

    return "Unknown";
})()
logger.log(_PLATFORM_);

function isDesktop() {
    return _PLATFORM_ === _PLF_LINUX_ || _PLATFORM_ === _PLF_WINDOWS_ || _PLATFORM_ === _PLF_MACOS_;
}

function isMobile() {
    return _PLATFORM_ === _PLF_IOS_ || _PLATFORM_ === _PLF_ANDROID_;
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function readOnly(obj) {
    return new Proxy(obj, {
        set() {
            throw new Error("Object is read-only");
        },
        deleteProperty() {
            throw new Error("Object is read-only");
        },
        defineProperty() {
            throw new Error("Object is read-only");
        }
    });
}

function isEditing() {
    const el = document.activeElement;

    return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el.isContentEditable
    );
}

const ele_container = document.getElementById("middle");

let _navigator = null;
let section_test = null
let section_result = null
let section_words = null
let section_article = null
let section_setting = null;
let section_card = null;
let _currentSection = null;
let _currentSectionElemBtn = null;

document.addEventListener("DOMContentLoaded", (e) => {
    const dictionary = initDictionary();
    const components = initComponents();
    const _ai = initAI(dictionary);
    const pronunciation = initSectionPronunciation(dictionary);

    function _switchToSection(id) {
        if (id === "sec-dictionary") {
            if (_currentSection == section_words) return;
            _currentSection = section_words;
            _navigator.activeWord();
        } else if (id === "sec-read") {
            if (_currentSection == section_article) return;
            _currentSection = section_article;
            _navigator.activeArticle();
        } else if (id === "sec-test") {
            if (_currentSection == section_test) return;
            _currentSection = section_test;
            _navigator.activeTest();
        } else if (id === "sec-result") {
            if (_currentSection == section_result) return;
            _currentSection = section_result;
            _navigator.activeResult();
        } else if (id === "sec-setting") {
            if (_currentSection == section_setting) return;
            _currentSection = section_setting;
            _navigator.activeSetting();
        } else {
            logger.error(`Should not be here. secion id is: ${id}`);
            return;
        }
        _rts.sectionID = id;
        dictionary.saveRuntimeStatus();
        _currentSection.update();
        ele_container.replaceChildren(_currentSection.ele_root)
    }


    const _rts = dictionary.getRuntimeStatus('homepage');
    _rts.sectionID = _rts.sectionID || "sec-dictionary";

    _navigator = initNavigator(document.body, components, dictionary, _switchToSection, () => { });
    section_card = initCardSection(_ai, dictionary, components, pronunciation);
    section_words = initDictionarySection(_ai, dictionary, components, section_card, pronunciation, _navigator);
    section_article = initArticleSection(_ai, dictionary, components, section_card, pronunciation);
    section_test = initTestSection(_ai, dictionary, components, section_words, pronunciation);
    section_result = initResultSection(dictionary, components, section_card, pronunciation);
    section_setting = initSectionImport(_ai, dictionary, components);

    document.addEventListener("keydown", (event) => {
        // logger.debug(event.key);
        if (isEditing()) return;
        _currentSection?.keyEvent(event);
        event.stopImmediatePropagation()
    })

    _switchToSection(_rts.sectionID);

    if (dictionary.isDatabaseEmpty()) {
        components.showMask(`
<p>This website is still under developing, more patience and tolerance would be much appriciated.</p>
<p>use 'd','e' to navigate to a new word.</p>`,
            "Got It, Close", () => { },
        );
    }

});


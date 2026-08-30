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

function isControlKey(key) {
    return key === 'Control' ||
        key === 'Shift' ||
        key === 'Alt' ||
        key === 'Enter' ||
        key === 'Escape' ||
        key === 'Meta'; // Windows key / Command key
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

function isEditing(event) {
    const el = document.activeElement;

    const _r = (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el.isContentEditable
    );
    if (_r && event.key === "Escape") {
        el.blur();
    }
    return _r;
}

const ele_container = document.getElementById("middle");
const ele_button = document.getElementById('back-to-top');

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
    const _cacher = initCacher(logger);
    const _lemmatizer = initLemmatizer(logger, _cacher);
    const _serverProxy = initServerProxy(logger, _cacher);
    const _dictionary = initDictionary(logger, _cacher, _serverProxy);
    const _components = initComponents();
    const _ai = initAI(logger, _cacher);
    const _pronunciation = initPronunciation(_dictionary);

    _navigator = initNavigator(document.body, _components, _dictionary);
    section_card = initCardSection(_ai, _dictionary, _components, _pronunciation);
    section_words = initDictionarySection(_ai, _dictionary, _components, section_card, _pronunciation);
    section_article = initArticleSection(_ai, _dictionary, _components, section_card, _pronunciation, _serverProxy, _lemmatizer);
    section_test = initTestSection(_ai, _dictionary, _components, section_words, _pronunciation);
    section_result = initResultSection(logger, _cacher, _dictionary, _components, section_card, _pronunciation);
    section_setting = initSectionImport(_ai, _dictionary, _components, _cacher, _serverProxy);

    document.addEventListener("keydown", (event) => {
        // logger.debug(event.key)
        if (isEditing(event)) return;
        section_card?.keyEvent(event);
        _currentSection?.keyEvent(event);
    });

    (function() {
        const _localData = _cacher.localProxy.get("sec_setting", {});
        const _darkTheme = _localData['theme'];
        if (_darkTheme) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    })();

    function _switchToSection(id) {
        let _nextSection;
        if (id === "sec-dictionary") {
            if (_currentSection == section_words) return;
            _nextSection = section_words;
            _navigator.activeWord();
        } else if (id === "sec-read") {
            if (_currentSection == section_article) return;
            _nextSection = section_article;
            _navigator.activeArticle();
        } else if (id === "sec-test") {
            if (_currentSection == section_test) return;
            _nextSection = section_test;
            _navigator.activeTest();
        } else if (id === "sec-result") {
            if (_currentSection == section_result) return;
            _nextSection = section_result;
            _navigator.activeResult();
        } else if (id === "sec-setting") {
            if (_currentSection == section_setting) return;
            _nextSection = section_setting;
            _navigator.activeSetting();
        } else {
            logger.error(`Should not be here. secion id is: ${id}`);
            return;
        }
        _rts.sectionID = id;
        _dictionary.saveLocalData();
        _currentSection?.deactive();
        _currentSection = _nextSection;
        ele_container.replaceChildren(_currentSection.ele_root)
        _currentSection.active();
    }


    const _rts = _cacher.localProxy.get("homepage", {});
    logger.log(`current section id: ${_rts.sectionID}`);
    _switchToSection(_rts.sectionID || "sec-dictionary");

    window.addEventListener('scroll', () => {
        //logger.debug(window.scrollY);
        ele_button.style.display = window.scrollY > 200 ? 'block' : 'none';
        _currentSection.setSync(window.scrollY);
        _dictionary.saveLocalData();
    });

    ele_button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // _dictionary.addEventListener(_dictionary.EVT_DICT, (e) => {
    //     if (e.detail.action === "begin:sync") {
    //         const _mask = _components.showMask(`<p>Dictionary is Sync ...</p>`);
    //     } else if (e.detail.action === "end:sync") {
    //         logger.log("syncd");
    //     }
    // });


    if (_cacher.wordsProxy.isEmpty()) {
        _components.showMask(`
<p>This website is still under developing, more patience and tolerance would be much appriciated.</p>`,
            "Got It, Close", () => { },
        );
    }

    _navigator.addEventListener(_navigator.EVT_SECTION, (e) => {
        _switchToSection(e.detail.id);
    });

    _dictionary.addEventListener(_dictionary.EVT_DICT, e => {
        if (e.detail.action === "imported") {
            _components.showMask(`
<p>Succefully Imported Data to Dictionary.</p>`,
                "Got It", () => { },
            );
        } else if (e.detail.action === "exported") {
            _components.showMask(`
<p>Succefully Exported Data to Local File.</p>`,
                "Got It", () => { },
            );
        } else if (e.detail.action === "clear") {
            _components.showMask(`
<p>Succefully Clear the Dictionary.</p>`,
                "Got It", () => { },
            );
        }
    });

    //_dictionary.sync();
});


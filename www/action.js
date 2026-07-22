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

const ele_sections = document.getElementById("section-switcher");
const ele_sec_words = ele_sections.querySelector("#sec-dictionary");
const ele_sec_article = ele_sections.querySelector("#sec-read");
const ele_sec_test = ele_sections.querySelector("#sec-test");
const ele_sec_result = ele_sections.querySelector("#sec-result");

const ele_btn_import = document.getElementById("import-btn")
const ele_btn_config = document.getElementById("config-btn")

// Export JSON
document.getElementById("export-btn").addEventListener("click", () => {
    dictionary.exportDatabase();
});

let pronunciation = null;
let dictionary = null;
let panel_config = null;
let section_test = null
let section_result = null
let section_words = null
let section_article = null
let section_import = null;
let section_card = null;
let _currentSection = null;
let _currentSectionElemBtn = null;
let _ai = null;

document.addEventListener("DOMContentLoaded", (e) => {

    function _switchToSection(id) {
        let _preElemBtn = _currentSectionElemBtn;
        if (id === "sec-dictionary") {
            if (_currentSection == section_words) return;
            _currentSection = section_words;
            _currentSectionElemBtn = ele_sec_words;
        } else if (id === "sec-read") {
            if (_currentSection == section_article) return;
            _currentSection = section_article;
            _currentSectionElemBtn = ele_sec_article;
        } else if (id === "sec-test") {
            if (_currentSection == section_test) return;
            _currentSection = section_test;
            _currentSectionElemBtn = ele_sec_test;
        } else if (id === "sec-result") {
            if (_currentSection == section_result) return;
            _currentSection = section_result;
            _currentSectionElemBtn = ele_sec_result;
        } else {
            return;
        }
        _rts.sectionID = id;
        dictionary.saveRuntimeStatus();
        _currentSection.update();
        ele_container.replaceChildren(_currentSection.ele_root)
        _preElemBtn?.removeAttribute("active");
        _currentSectionElemBtn.setAttribute("active", "");
    }


    components = initComponents();
    dictionary = initDictionary();
    const _rts = dictionary.getRuntimeStatus('homepage');
    _rts.sectionID = _rts.sectionID || "sec-dictionary";
    _ai = initAI(dictionary);
    panel_config = initConfigPanel(dictionary, components);
    pronunciation = initSectionPronunciation(dictionary);

    section_card = initCardSection(_ai, dictionary, components, pronunciation);
    section_words = initDictionarySection(_ai, dictionary, components, section_card, pronunciation);
    section_article = initArticleSection(_ai, dictionary, components, section_card, pronunciation);
    section_test = initTestSection(_ai, dictionary, components, section_words, pronunciation);
    section_result = initResultSection(dictionary, components, section_card, pronunciation);
    section_import = initSectionImport(_ai, dictionary, components);

    function _globalKeyEventHandler(event) {
        // console.debug(event.key);
        if (isEditing()) return;
        _currentSection?.keyEvent(event);
        event.stopImmediatePropagation()
    }

    /*
    section_card.addEventListener(section_card.EVT_MODE_EDIT, e => {
        document.removeEventListener("keydown", _globalKeyEventHandler);
    });
    section_card.addEventListener(section_card.EVT_MODE_READ, e => {
        document.addEventListener("keydown", _globalKeyEventHandler);
    });
    */


    ele_sections.addEventListener('click', (e) => {
        _switchToSection(e.target.id);
    })

    ele_btn_import.addEventListener("click", (e) => {
        if (_currentSection == section_import) return;
        _currentSection = section_import;
        _currentSection.update();
        ele_container.replaceChildren(_currentSection.ele_root)
        ele_sec_article.removeAttribute("active")
        ele_sec_words.removeAttribute("active", "")
    });

    ele_btn_config.addEventListener("click", (e) => {
        if (e.altKey && e.ctrlKey && e.shiftKey) {
            dictionary.clearDictionary()
            _currentSection.update();
            return;
        }
        _currentSection = panel_config;
        _currentSection.update();
        ele_container.replaceChildren(_currentSection.ele_root)
    });

    _switchToSection(_rts.sectionID);
    document.addEventListener("keydown", _globalKeyEventHandler);

});


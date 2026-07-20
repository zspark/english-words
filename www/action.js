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
    dictionary.exportDictionary();
});

// Clear cache
document.getElementById("clear-btn").addEventListener("click", () => {
    dictionary.clearDictionary()
    _currentSection.update();
});


// 优雅渲染 API 返回的排版结构
function renderExternalResult(word) {
    const container = document.getElementById("dict-external-result");
    container.innerHTML = "";

    if (!word.meanings || word.meanings.length === 0) {
        container.innerHTML = `<div class="api-error">未找到详细释义。</div>`;
        return;
    }

    // 1. Extract Phonetics (IPA)
    let ipa = "";
    if (word.phonetics) {
        const p = word.phonetics.find(x => x.text);
        if (p) ipa = p.text;
    }

    // 2. Extract Audio
    let audio = "";
    if (word.phonetics) {
        const a = word.phonetics.find(x => x.audio);
        if (a) audio = a.audio;
    }

    // 3. Build Header Header & IPA 
    let html = `
        <div class="dict-word-wrap">
            <span class="dict-word">${word.word}</span>
            ${ipa ? `<span class="dict-ipa">${normalizeIPA(ipa)}</span>` : ''}
        </div>
    `;

    // 4. Add Audio Button if available
    if (audio) {
        html += `
            <button onclick="new Audio('${audio}').play()" class="dict-pronounce" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                🔊 Listen
            </button>
        `;
    }

    // 5. Build Meanings, Definitions, and Examples using your CSS classes
    for (const meaning of word.meanings) {
        // Class: dict-partOfSpeech
        html += `<div class="dict-partOfSpeech">${meaning.partOfSpeech}</div>`;

        for (const [index, def] of meaning.definitions.slice(0, 3).entries()) {
            // Class: dict-definition
            html += `
                <div class="dict-definition">
                    ${index + 1}. ${def.definition}
                </div>
            `;

            // Class: dict-example
            if (def.example) {
                html += `
                    <div class="dict-example">
                        “${def.example}”
                    </div>
                `;
            }
        }
    }

    container.innerHTML = html;
}

function normalizeIPA(ipa) {
    return ipa
        .replace(/\(?ɹ\)?/g, "r");
}


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

    section_card = initCardSection(_ai, dictionary, pronunciation);
    section_article = initArticleSection(_ai, dictionary, components, section_card);
    section_words = initDictionarySection(_ai, dictionary, components, section_card);
    section_import = initSectionImport(_ai, dictionary);
    section_test = initTestSection(_ai, dictionary, components, section_words);
    section_result = initResultSection(components, dictionary, section_card);


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
        _currentSection = panel_config;
        _currentSection.update();
        ele_container.replaceChildren(_currentSection.ele_root)
    });

    _switchToSection(_rts.sectionID);

});

document.addEventListener("keydown", (event) => {
    // console.debug(event.key);
    _currentSection?.keyEvent(event);
    event.stopImmediatePropagation()
});


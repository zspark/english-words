
import { isDesktop, isMobile, readOnly, shuffle } from "./utils.js"
import logger from "./logger.js"
import { HTMLString, WordLevelType, Detail, Words, Results, Result, Dict, DictSyncDataSC, DictSyncData, ResponseData, ResponseEvent } from "./types.js"
import cacher from "./cacher.js"
import cmp from "./components.js"
import ai from "./ai.js"
import Dictionary from "./dictionary.js"
import prpc from "./pronunciation.js"
import { SectionBase, SectionUIBase } from "./section-base.js"

const _svg = `<svg viewBox="0 0 44 44">
    <path d="m43.607 16.7-4.6-3.8V5.5a1 1 0 0 0-.6-.9l-9.9-4.5h-.4l-.6.2-5.5 3.6-5.5-3.7-.6-.2h-.4l-9.9 4.6a1 1 0 0 0-.6.9v7.4l-4.6 3.8a.8.8 0 0 0-.4.8v9a.8.8 0 0 0 .4.8l4.6 3.8v7.4a1 1 0 0 0 .6.9l9.9 4.5h.4l.6-.2 5.5-3.6 5.5 3.7.6.2h.4l9.9-4.5a1 1 0 0 0 .6-.9v-7.5l4.6-3.8a.8.8 0 0 0 .4-.7v-9.2a.8.8 0 0 0-.4-.7m-5.1 6.8h1.5v1.6l-3.5 2.8-.4.3-.4-.2a1.4 1.4 0 0 0-2 .7 1.5 1.5 0 0 0 .6 2l.7.3v5.4l-6.6 3.1-4.2-2.8-.7-.5V23.5h1.5a1.5 1.5 0 0 0 0-3h-1.5V7.7l.7-.5 4.2-2.8 6.6 3.1v5.4l-.7.3a1.5 1.5 0 0 0-.6 2 1.4 1.4 0 0 0 1.3.9l.7-.2.4-.2.4.3 3.5 2.9v1.6h-1.5a1.5 1.5 0 0 0 0 3m-19.5 0h1.5v12.8l-.7.5-4.2 2.8-6.6-3.1v-5.4l.7-.3a1.5 1.5 0 0 0 .6-2 1.4 1.4 0 0 0-2-.7l-.4.2-.4-.3-3.5-2.9v-1.6h1.5a1.5 1.5 0 0 0 0-3h-1.5v-1.6l3.5-2.8.4-.3.4.2.7.2a1.4 1.4 0 0 0 1.3-.9 1.5 1.5 0 0 0-.6-2l-.7-.3V7.5l6.6-3.1 4.2 2.8.7.5v12.8h-1.5a1.5 1.5 0 0 0 0 3"/>
    <path d="M11.907 7.9a1.8 1.8 0 0 0 0 2.2l2.6 2.5v2.8l-4 4v5.2l4 4v2.8l-2.6 2.5a1.8 1.8 0 0 0 0 2.2 1.5 1.5 0 0 0 1.1.4 1.5 1.5 0 0 0 1.1-.4l3.4-3.5v-5.2l-4-4v-2.8l4-4v-5.2l-3.4-3.5a1.8 1.8 0 0 0-2.2 0m17.6 4.7 2.6-2.5a1.8 1.8 0 0 0 0-2.2 1.8 1.8 0 0 0-2.2 0l-3.4 3.5v5.2l4 4v2.8l-4 4v5.2l3.4 3.5a1.7 1.7 0 0 0 2.2 0 1.8 1.8 0 0 0 0-2.2l-2.6-2.5v-2.8l4-4v-5.2l-4-4z"/>
</svg>`;

const _ss = isMobile() ? `<div class="bs-right-align mt20px">
        ${cmp.buttonGroupSource('id-actionsAA', [' Back '], [])}
    </div>` : "";

const source = `
<div class="search-container">
    ${cmp.inputSource("id-searchInput", "", "Input word to search")}
    <div id="card-searchResult" class="search-dropdown display-none">
    </div>
</div>

<div id="card-content">
    <div id="card-display" class="card">

        <div id="id-body" class="mt10px">
            <div class="vocab-header">
                <div id="vocab"></div>
                <div id="btn-pronounce" class="icon card-icon">
                    <svg viewBox="0 0 24 24">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                </div>
                <div id="btn-ai" class="icon card-icon">
                    ${_svg}
                </div>
                <div id="card-edit-btn" class="icon card-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                </div>
            </div>
            <div class="vocab-header mt10px">
                <div id="level" class="tag word-level"></div>
                <div id="tags" class="tag word-tag"></div>
            </div>
            <div id="ipa"></div>
            <div id="meaning"></div>
            <div id="note"></div>
            <div id="linked-words"></div>
        </div>
        ${_ss}
    </div>

    <div id="card-edit" class="card">

        <div id="new-word-form" class='bs-panel-plain'>
            <div class="vocab-header w100pct">
                ${cmp.inputSource("id-new-vocab", "", "word", true)}
                ${cmp.dropdownSource("id-new-level", null, ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], 0)}
            </div>
            ${cmp.inputSource("id-new-ipa", "", "Phonetic (IPA)", false)}
            ${cmp.inputSource("id-new-meaning", "", "Meaning", false)}
            ${cmp.textareaSource("id-new-note", null, "h150px", "Note ...")}
            ${cmp.inputSource("id-new-links", "", "Related Words (Comma Separated)", false)}
            ${cmp.clickableBlockSource("id-new-tags", "Tags")}
        </div>

        <div class="bs-right-align mt20px">
            ${cmp.buttonGroupSource('id-actions', ['Cancel', 'Fill (AI)', 'Save', 'Delete'], ['', '', '', ''])}
        </div>
    </div>
</div>`;

const MODE_EDIT = 1;
const MODE_READ = 2;

export default class Card extends EventTarget {

    static CARD_EVT_WORD = "evt_word";
    static CARD_EVT_MODE_EDIT = "evt_mode_edit";
    static CARD_EVT_MODE_READ = "evt_mode_read";

    #_ui: SectionUIBase;
    #_dict: Dictionary;
    currentWord: string = '';
    _currentMode: 1 | 2 = MODE_READ;


    ele_searchInput: HTMLInputElement;
    ele_card_content: HTMLElement;

    ele_voc: HTMLElement;
    ele_ipa: HTMLElement;
    ele_meaning: HTMLElement;
    ele_level: HTMLElement;
    ele_tag: HTMLElement;
    ele_note: HTMLElement;
    ele_linkedWords: HTMLElement;

    ele_card_display: HTMLElement;
    ele_new_voc: HTMLInputElement;
    ele_new_ipa: HTMLInputElement;
    ele_new_meaning: HTMLInputElement;
    ele_new_level: HTMLInputElement;
    ele_new_note: HTMLTextAreaElement;
    ele_new_linkedWords: HTMLInputElement;

    ele_searchResult: HTMLElement;
    ele_available: HTMLElement;
    ele_selected: HTMLElement;
    ele_btnFill: HTMLElement;
    ele_btnDelete: HTMLElement;
    ele_btnSave: HTMLElement;

    ele_card_edit: HTMLElement;

    constructor(dict: Dictionary) {
        super();

        this.#_dict = dict;
        const ui = this.#_ui = new SectionUIBase("cls-card", source);

        const ele_searchInput = this.ele_searchInput = ui.get<HTMLInputElement>('#id-searchInput input');
        ele_searchInput.addEventListener('input', (e) => {
            this.#_handleSearchInputStyle(ele_searchInput);
            const word = ele_searchInput.value;
            this.#_updateWordList(word);
        });
        ele_searchInput.addEventListener('focus', () => {
            ele_searchResult.classList.remove("display-none");
        });
        ele_searchInput.addEventListener('blur', () => {
            ele_searchResult.classList.add("display-none");
        });
        ele_searchInput.addEventListener('keydown', (event) => {
            if (event.key === "Enter") {
                const _w = ele_searchInput.value;
                if (dict.hasWord(_w)) {
                    this.renderCard(_w);
                }
                if (event.ctrlKey) {
                    this.#_renderEditPanel(_w);
                    this.#_enterEditMode();
                }

                ele_searchInput.blur();
                event.stopImmediatePropagation()
            }
        });


        this.ele_card_content = ui.get('#card-content');
        this.ele_card_display = ui.get("#card-display");
        const editBtnCard = ui.get("#card-edit-btn");
        editBtnCard.addEventListener("click", e => {
            this.#_renderEditPanel(this.currentWord);
            this.#_enterEditMode();
        })

        const ele_voc = this.ele_voc = ui.get("#vocab");
        const ele_btn_pronounce = ui.get("#btn-pronounce")
        ele_btn_pronounce.addEventListener("click", () => {
            const word = ele_voc.textContent.trim();
            if (!word) return;
            prpc.pronounce(word);
        });

        const ele_btn_ai = ui.get("#btn-ai")
        ele_btn_ai.addEventListener("click", () => {
            const word = ele_voc.textContent.trim();
            if (!word) return;
            const _q = ai.getQuestionAboutWord(word);
            window.open(`https://chatgpt.com/?q=${_q}`, "_blank");
        });

        this.ele_ipa = ui.get("#ipa");
        this.ele_meaning = ui.get("#meaning");
        this.ele_level = ui.get("#level");
        this.ele_tag = ui.get("#tags");
        this.ele_note = ui.get("#note");
        this.ele_linkedWords = ui.get("#linked-words");
        this.ele_linkedWords.addEventListener("click", (e) => {
            // logger.log(e.target);
            const _tmp = e.target as HTMLElement;
            if (_tmp.tagName === "A") {
                const _w = _tmp.outerText.toLowerCase();
                if (dict.hasWord(_w)) {
                    this.renderCard(_w);
                    this.#_enterReadMode();
                } else {
                    this.#_renderEditPanel(_w);
                    this.#_enterEditMode();
                }
            }
        })

        const ele_available = this.ele_available = ui.get("#card-edit #id-new-tags #id-A");
        ele_available.addEventListener("click", this.moveTag);
        const ele_selected = this.ele_selected = ui.get("#card-edit #id-new-tags #id-B");
        ele_selected.addEventListener("click", this.moveTag);

        const ele_new_voc = this.ele_new_voc = ui.get<HTMLInputElement>("#card-edit #id-new-vocab input");
        ele_new_voc.addEventListener('input', (e) => {
            const word = ele_new_voc.value;
            this.#_updateCardContentInEditMode(word, dict.getWord(word));
        })
        this.ele_new_ipa = ui.get<HTMLInputElement>("#card-edit #id-new-ipa input");
        this.ele_new_meaning = ui.get<HTMLInputElement>("#card-edit #id-new-meaning input");
        this.ele_new_level = ui.get("#card-edit #id-new-level select");
        this.ele_new_note = ui.get("#card-edit #id-new-note textarea");
        this.ele_new_linkedWords = ui.get<HTMLInputElement>("#card-edit #id-new-links input");

        const ele_action = ui.get("#card-edit #id-actions");
        ele_action.addEventListener("click", async e => {

            this.ele_btnSave?.classList.remove('bs-bg-twinkle');

            const _index = (e.target as HTMLElement).dataset.index;
            if (_index === "1") {
                //fill by ai
                await this.#_fillByAI();
            } else if (_index === "0") {
                //canel
                this.renderCard(this.currentWord);
                this.#_enterReadMode();
            } else if (_index === "2") {
                //save
                this.#_save();
            } else if (_index === "3") {
                //delete;
                const word = ele_new_voc.value.trim();
                dict.deleteWord(word);

                this.renderCard(word);
                this.#_enterReadMode();
            } else if (_index === "4") {
            } else if (_index === "5") {
            }
        })

        // const ele_btnCancel = ele_action.querySelector("button[data-index='0']");
        this.ele_btnFill = ele_action.querySelector("button[data-index='1']") as HTMLElement;
        this.ele_btnSave = ele_action.querySelector("button[data-index='2']") as HTMLElement;
        this.ele_btnDelete = ele_action.querySelector("button[data-index='3']") as HTMLElement;


        const ele_searchResult = this.ele_searchResult = ui.get('#card-searchResult');
        ele_searchResult.addEventListener("mousedown", (e) => {
            const _targetElem = this.#_selectTargetElement(e.target as HTMLElement);
            if (!_targetElem) return;

            const _w = _targetElem.dataset.word ?? '';
            this.ele_searchInput.value = _w;
            if (_w.length <= 0 || dict.hasWord(_w)) {
                this.ele_searchInput.classList.remove("color-red");
            } else {
                this.ele_searchInput.classList.add("color-red");
            }
            this.renderCard(_w);
        })

        if (isMobile()) {
            /*
            const ele_actionAA = ui.get("#id-actionsAA");
            ele_actionAA.addEventListener("click", e => {
                if ((e.target as HTMLInputElement)?.dataset.index === "0") {
                    this.#_ui.parentElement.parentElement.classList.remove("card-only");
                    window.scrollTo(0, window._scrollY);
                }
            })
            */
        }

        dict.addEventListener(Dictionary.EVT_WORD, e => {
            // logger.log(e);
            this.#_handleSearchInputStyle(ele_searchInput);
        });

        this.#_updateTagList([]);
        this.renderCard('');

        this.ele_card_edit = ui.remove("#card-edit");
    }

    setParent(p: HTMLElement | null): void {
        this.#_ui.setParent(p);
    }

    #_handleSearchInputStyle(elem: HTMLInputElement): void {
        const word = elem.value;
        const _out = word.length <= 0 || this.#_dict.hasWord(word);
        if (_out) {
            elem.classList.remove("color-red");
        } else {
            elem.classList.add("color-red");
        }
    }

    async keyEvent(event: KeyboardEvent): Promise<void> {
        const c = this.#_ui.isConnected;
        if (!c) return;

        if (this._currentMode == MODE_READ) {
            if (event.key === 'Enter') {
                this.ele_searchInput.focus();
            } else if (event.key === "t") {
                this.#_renderEditPanel(this.currentWord);
                this.#_enterEditMode();
            }
        } else if (this._currentMode == MODE_EDIT) {
            if (event.key === "Escape") {
                this.#_enterReadMode();
            } else if (event.key === 'Enter') {

                if (event.altKey) {
                    await this.#_fillByAI()
                }
                if (event.ctrlKey) {
                    this.#_save();
                }
            }
        }
    }

    #_selectTargetElement(elem: HTMLElement | null): HTMLElement | null {
        while (elem) {
            if (elem.classList.contains("search-result")) {
                return elem;
            }
            elem = elem.parentElement;
        }
        return null;
    }

    #_updateWordList(word: string): void {
        let htmlBuffer = '';
        const _words = word.length < 2 ? [] : Object.entries(this.#_dict.getWords(word, 'ALL', 'ALL'));
        for (let i = 0; i < _words.length; ++i) {
            const _word: string = _words[i][0];
            const _detail: Detail = _words[i][1];
            htmlBuffer += `<div class="search-result" data-word="${_word}">
    <span class="word-name">${_word}</span>
    <span class="word-meaning">${_detail.meaning}</span>
</div>`;
        }

        this.ele_searchResult.innerHTML = htmlBuffer;
    }

    moveTag(event: MouseEvent): void {

        if (!event.target) return;
        const tag = event.target as HTMLElement;
        if (!tag.classList.contains("tag")) return;

        if (tag.parentElement === this.ele_available) {
            this.ele_selected.appendChild(tag);
        } else {
            this.ele_available.appendChild(tag);
        }
    }

    #_updateCardContentInEditMode(word: string, detail: Detail | null): void {
        if (this.#_dict.hasWord(word)) {
            this.ele_new_voc.classList.remove('color-red');
        } else {
            this.ele_new_voc.classList.add('color-red');
        }

        if (word) {
            this.ele_btnFill.removeAttribute("disabled");
        } else {
            this.ele_btnFill.setAttribute("disabled", "");
        }

        if (detail) {
            this.ele_btnDelete.removeAttribute("disabled");
        } else {
            this.ele_btnDelete.setAttribute("disabled", "");
        }
        this.ele_new_voc.value = word || "";
        this.ele_new_ipa.value = detail?.ipa || "";
        this.ele_new_meaning.value = detail?.meaning || "";
        this.ele_new_level.value = detail?.level || "";
        this.ele_new_note.value = detail?.note || "";
        this.ele_new_linkedWords.value = detail?.links || "";
        const sTag = detail?.tags?.split(',').map(t => t.trim()).filter(s => s.length > 0) || [];
        this.#_updateTagList(sTag);
    }

    #_updateTagList(sTags: string[]): void {
        const aTags = this.#_dict.getTags()

        let _s = ''; let _a = '';
        aTags.forEach(tag => {
            if (sTags.includes(tag)) {
                _s += `<span class="tag word-tag-edit">${tag}</span>`;
            } else {
                _a += `<span class="tag word-tag-edit">${tag}</span>`;
            }
        });
        this.ele_available.innerHTML = _a;
        this.ele_selected.innerHTML = _s;
    }

    #_enterEditMode(): void {
        if (this._currentMode === MODE_EDIT) return;
        this._currentMode = MODE_EDIT;
        this.ele_card_content.replaceChildren(this.ele_card_edit);
        this.ele_searchInput.classList.add('hide');
        this.dispatchEvent(new CustomEvent(Card.CARD_EVT_MODE_EDIT, { detail: {} }));
    }

    #_enterReadMode(): void {
        if (this._currentMode === MODE_READ) return;
        this._currentMode = MODE_READ;
        this.ele_searchInput.classList.remove('hide');
        this.ele_card_content.replaceChildren(this.ele_card_display);
        this.dispatchEvent(new CustomEvent(Card.CARD_EVT_MODE_READ, { detail: {} }));
    }

    renderCard(word: string): void {
        if (word != this.currentWord) {
            let previousWord = this.currentWord;
            this.currentWord = word;
            this.dispatchEvent(new CustomEvent(Card.CARD_EVT_WORD, { detail: { currentWord: this.currentWord, previousWord } }));
        }

        if (word) {
            this.#_ui.removeAttrib('#id-body', 'hidden');
        } else {
            this.#_ui.addAttrib('#id-body', 'hidden');
        }

        const _detail = this.#_dict.getWord(word);
        this.ele_voc.textContent = word;
        this.ele_ipa.textContent = _detail?.ipa || "<need implement>";
        this.ele_meaning.textContent = _detail?.meaning || "<need implement>";
        this.ele_level.textContent = _detail?.level || "";
        this.ele_tag.textContent = _detail?.tags || "";
        this.ele_note.innerHTML = ((notes) => {
            let _s = '';
            notes.forEach(s => { _s += `<p>${s}</p>`; })
            return _s;
        })(_detail?.note?.split('\n\n').map(line => line.trim()).filter(line => line.length > 0) || []);
        this.ele_linkedWords.innerHTML = ((links) => {
            let _s = '';
            links.forEach(w => { _s += `<a>${w}</a>`; });
            return _s;
        })(_detail?.links?.split(',').map(line => line.trim()).filter(line => line.length > 0) || []);
    };

    async #_fillByAI() {
        const word = this.ele_new_voc.value.trim();
        const resultText = await ai.genMeaning(word);
        // logger.debug(`AI content: ${resultText}`);
        if (!resultText) return;
        try {
            const _detail = JSON.parse(resultText)[word];
            this.#_updateCardContentInEditMode(word, _detail);
            this.ele_btnSave.classList.add('bs-bg-twinkle');
        } catch (e) {
            logger.error(`parse error: ${e}`);
            return;
        }
    }

    #_save(): void {
        const word = this.ele_new_voc.value.trim();
        const ipa = this.ele_new_ipa.value.trim();
        const meaning = this.ele_new_meaning.value.trim();
        const level: WordLevelType = this.ele_new_level.value.trim() as WordLevelType;
        const note = this.ele_new_note.value.trim();
        const links = this.ele_new_linkedWords.value.trim();
        const tags = [...this.ele_selected.querySelectorAll(".tag")].map(span => span.textContent.trim()).join(", ");
        this.#_dict.updateWord(word, ipa, meaning, level, note, links, tags)

        this.renderCard(word);
        this.#_enterReadMode();
    }

    #_renderEditPanel(word: string): void {
        const _detail = this.#_dict.getWord(word);
        this.#_updateCardContentInEditMode(word, _detail);
    }

    update(): void {
        this.renderCard(this.currentWord);
    }

}


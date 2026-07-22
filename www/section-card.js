

function initCardSection(ai, dictionary, cmp, pronunciation) {

    const EVT_WORD = "evt_word";
    const EVT_MODE_EDIT = "evt_mode_edit";
    const EVT_MODE_READ = "evt_mode_read";

    const source = `
<div id="card-display" class="card">
    <button id="card-edit-btn" class="icon-btn icon-btn-edit">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
    </button>

    <div id="id-body">
        <div class="vocab-header">
            <div id="vocab"></div>
            <button id="btn-pronounce" class="icon-btn s28px">
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
            </button>
        </div>
        <div class="vocab-header">
            <div id="level" class="tag word-level"></div>
            <div id="tags" class="tag word-tag"></div>
        </div>
        <div id="ipa"></div>
        <div id="meaning"></div>
        <div id="note"></div>
        <div id="linked-words"></div>
    </div>
</div>

<div id="card-edit" class="card">

    <div id="new-word-form" class='bs-panel-plain'>
        ${cmp.inputSource("id-new-vocab", "", "word", true)}
        ${cmp.dropdownSource("id-new-level", "Level", ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], 0)}
        ${cmp.clickableBlockSource("id-new-tags", "Tags")}
        ${cmp.inputSource("id-new-ipa", "Phonetic (IPA)", "", false)}
        ${cmp.inputSource("id-new-meaning", "Meaning", "", false)}
        ${cmp.textareaSource("id-new-note", "Note", "h150px", "", false)}
        ${cmp.inputSource("id-new-links", "Linked Words (Comma Separated)", "", false)}
        <div class="bs-right-align">
            ${cmp.buttonGroupSource('id-actions', ['Cancel', 'Fill (AI)', 'Save', 'Delete'], ['', '', '', ''])}
        </div>
    </div>
</div>`



    const ele_root = document.createElement('div');
    ele_root.innerHTML = source;
    ele_root.className = "fixed";
    const ele_card_display = ele_root.querySelector("#card-display");
    const ele_card_edit = ele_root.querySelector("#card-edit");
    ele_card_edit.remove();
    const editBtnCard = ele_root.querySelector("#card-edit-btn");
    const ele_body = ele_root.querySelector("#id-body");

    const ele_voc = ele_card_display.querySelector("#vocab");
    const ele_btn_pronounce = ele_root.querySelector("#btn-pronounce")
    const ele_ipa = ele_card_display.querySelector("#ipa");
    const ele_meaning = ele_card_display.querySelector("#meaning");
    const ele_level = ele_card_display.querySelector("#level");
    const ele_tag = ele_card_display.querySelector("#tags");
    const ele_note = ele_card_display.querySelector("#note");
    const ele_linkedWords = ele_card_display.querySelector("#linked-words");

    const ele_new_voc = ele_card_edit.querySelector("#id-new-vocab input");
    const ele_new_ipa = ele_card_edit.querySelector("#id-new-ipa input");
    const ele_new_meaning = ele_card_edit.querySelector("#id-new-meaning input");
    const ele_new_level = ele_card_edit.querySelector("#id-new-level select");
    const ele_new_note = ele_card_edit.querySelector("#id-new-note textarea");
    const ele_new_linkedWords = ele_card_edit.querySelector("#id-new-links input");

    const ele_action = ele_card_edit.querySelector("#id-actions");
    const ele_btnCancel = ele_action.querySelector("button[data-index='0']");
    const ele_btnFill = ele_action.querySelector("button[data-index='1']");
    const ele_btnSave = ele_action.querySelector("button[data-index='2']");
    const ele_btnDelete = ele_action.querySelector("button[data-index='3']");

    const ele_available = ele_card_edit.querySelector("#id-new-tags #id-A");
    const ele_selected = ele_card_edit.querySelector("#id-new-tags #id-B");

    function moveTag(event) {
        if (!event.target.classList.contains("tag")) return;

        const tag = event.target;

        if (tag.parentElement === ele_available) {
            ele_selected.appendChild(tag);
        } else {
            ele_available.appendChild(tag);
        }
    }
    ele_available.addEventListener("click", moveTag);
    ele_selected.addEventListener("click", moveTag);


    let currentWord = "";
    const MODE_EDIT = 1;
    const MODE_READ = 2;
    let _currentMode = MODE_READ;


    function _updateCardContentInEditMode(word, detail) {
        if (dictionary.hasWord(word)) {
            ele_new_voc.classList.remove('color-red');
        } else {
            ele_new_voc.classList.add('color-red');
        }

        if (word) {
            ele_btnFill.removeAttribute("disabled");
        } else {
            ele_btnFill.setAttribute("disabled", "");
        }

        if (detail) {
            ele_btnSave.removeAttribute("disabled");
            ele_btnDelete.removeAttribute("disabled");
        } else {
            ele_btnSave.setAttribute("disabled", "");
            ele_btnDelete.setAttribute("disabled", "");
        }
        ele_new_voc.value = word || "";
        ele_new_ipa.value = detail?.ipa || "";
        ele_new_meaning.value = detail?.meaning || "";
        ele_new_level.value = detail?.level || "";
        ele_new_note.value = detail?.note || "";
        ele_new_linkedWords.value = detail?.links || "";
        const sTag = detail?.tags?.split(',').map(t => t.trim()).filter(s => s.length > 0) || [];
        _updateTagList(sTag);
    }

    function _updateTagList(sTags) {
        const aTags = dictionary.getTags()

        let _s = ''; let _a = '';
        aTags.forEach(tag => {
            if (sTags.includes(tag)) {
                _s += `<span class="tag word-tag-edit">${tag}</span>`;
            } else {
                _a += `<span class="tag word-tag-edit">${tag}</span>`;
            }
        });
        ele_available.innerHTML = _a;
        ele_selected.innerHTML = _s;
    }

    function _enterEditMode() {
        if (_currentMode === MODE_EDIT) return;
        _currentMode = MODE_EDIT;
        ele_root.replaceChildren(ele_card_edit);
        __this__.dispatchEvent(new CustomEvent(EVT_MODE_EDIT, { detail: {} }));
    }

    function _enterReadMode() {
        if (_currentMode === MODE_READ) return;
        _currentMode = MODE_READ;
        ele_root.replaceChildren(ele_card_display);
        __this__.dispatchEvent(new CustomEvent(EVT_MODE_READ, { detail: {} }));
    }

    function renderCard(word) {
        if (word != currentWord) {
            let previousWord = currentWord;
            currentWord = word;
            __this__.dispatchEvent(new CustomEvent(EVT_WORD, { detail: { currentWord, previousWord } }));
        }

        const _detail = dictionary.getWord(word);

        if (word) {
            ele_body.removeAttribute("hidden");
        } else {
            ele_body.setAttribute("hidden", "");
        }

        ele_voc.textContent = word;
        ele_ipa.textContent = _detail?.ipa || "<need implement>";
        ele_meaning.textContent = _detail?.meaning || "<need implement>";
        ele_level.textContent = _detail?.level || "";
        ele_tag.textContent = _detail?.tags || "";
        ele_note.innerHTML = ((notes) => {
            let _s = '';
            notes.forEach(s => { _s += `<p>${s}</p>`; })
            return _s;
        })(_detail?.note?.split('\n').map(line => line.trim()).filter(line => line.length > 0) || []);
        ele_linkedWords.innerHTML = ((links) => {
            let _s = '';
            links.forEach(w => { _s += `<a>${w}</a>`; });
            return _s;
        })(_detail?.links?.split(',').map(line => line.trim()).filter(line => line.length > 0) || []);
    };

    ele_btn_pronounce.addEventListener("click", () => {
        const word = ele_voc.textContent.trim();
        if (!word) return;
        pronunciation.pronounce(word);
    });

    ele_new_voc.addEventListener("input", (event) => {
        const _word = ele_new_voc.value.trim().toLowerCase();
        _renderEditPanel(_word);
        _enterEditMode();
    });

    ele_action.addEventListener("click", async e => {
        if (e.target.dataset.index === "1") {
            //fill by ai
            const word = ele_new_voc.value.trim();
            if (word.length <= 0) {
                ele_new_voc.focus();
                const _s = `Word input is essential, this is the key to database`;
                console.warn(_s);
                alert(_s);
                return;
            }
            const resultText = await ai.askChatGPTForWordsInfo(word);
            if (!resultText) return;
            const _detail = JSON.parse(resultText)[word];
            _updateCardContentInEditMode(word, _detail);
            ele_btnSave.classList.add('bs-bg-twinkle');
        } else if (e.target.dataset.index === "0") {
            //canel
            renderCard(currentWord);
            _enterReadMode();
        } else if (e.target.dataset.index === "2") {
            //save
            const word = ele_new_voc.value.trim();
            const ipa = ele_new_ipa.value.trim();
            const meaning = ele_new_meaning.value.trim();
            const level = ele_new_level.value.trim();
            const note = ele_new_note.value.trim();
            const links = ele_new_linkedWords.value.trim();
            const tags = [...ele_selected.querySelectorAll(".tag")].map(span => span.textContent.trim()).join(", ");
            dictionary.updateWord(word, ipa, meaning, level, note, links, tags)

            renderCard(currentWord);
            _enterReadMode();
        } else if (e.target.dataset.index === "3") {
            //delete;
            const word = ele_new_voc.value.trim();
            dictionary.deleteWord(word);

            renderCard(currentWord);
            _enterReadMode();
        } else if (e.target.dataset.index === "4") {
        } else if (e.target.dataset.index === "5") {
        }

        if (e.target.dataset.index != "0") {
            ele_btnSave.classList.remove('bs-bg-twinkle');
        }
    })

    editBtnCard.addEventListener("click", e => {
        _renderEditPanel(currentWord);
        _enterEditMode();
    })

    ele_linkedWords.addEventListener("click", (e) => {
        // console.log(e.target);
        if (e.target.tagName === "A") {
            const _w = e.target.outerText;
            if (dictionary.hasWord(_w)) {
                renderCard(_w);
                _enterReadMode();
            } else {
                _renderEditPanel(_w);
                _enterEditMode();
            }
        }
    })

    function _renderEditPanel(word) {
        const _detail = dictionary.getWord(word);
        _updateCardContentInEditMode(word, _detail);
    }

    function update() {
        const c = ele_root.isConnected;
        if (c) {
            ele_root.remove()
        }
        renderCard(currentWord);

        if (c) {
            ele_container.replaceChildren(ele_root)
        }
    }

    function getShownWord() { return currentWord; }

    _updateTagList([]);
    renderCard('');
    //_recordOriginalValues();

    const __this__ = new EventTarget()
    Object.assign(__this__, {
        ele_root,
        update,
        renderCard,
        getShownWord,
        EVT_MODE_EDIT,
        EVT_MODE_READ,
        EVT_WORD,
    })
    return __this__;
}

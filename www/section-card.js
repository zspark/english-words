

function initCardSection(ai, dictionary, pronunciation) {

    const source = `
<div id="card-display" class="card">
    <button id="card-edit-btn" class="icon-btn icon-btn-edit" title="编辑单词">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
    </button>

    <div id="vocab"></div>
    <div class="vocab-header">
        <div id="level" class="word-level"></div>
        <div id="tags" class="word-tags"></div>
        <button id="btn-pronounce" class="icon-btn s28px" title="发音">
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
    <div id="ipa"></div>
    <div id="meaning"></div>
    <div id="note"></div>
    <div id="linked-words"></div>
</div>

<div id="card-edit" class="card">

    <div id="new-word-form" class="word-form">
        <div class="form-group">
            <input type="text" id="new-vocab" placeholder="单词" required autocomplete="off">
        </div>

        <div class="form-group flex-1">
            <label for="new-level">Level</label>
            <select id="new-level">
                <option value="">None</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
            </select>
        </div>

        <div class="form-group">
            <label>Tags</label>
            <div>
                <div id="available-tags" class="tag-container">
                </div>
            </div>
            <div>
                <div id="selected-tags" class="tag-container">
                </div>
            </div>
        </div>

        <div class="form-group flex-2">
            <label for="new-ipa">Phonetic (IPA)</label>
            <input type="text" id="new-ipa" placeholder="音标" autocomplete="off">
        </div>

        <div class="form-group">
            <label for="new-meaning">Meaning</label>
            <input type="text" id="new-meaning" placeholder="示意" required autocomplete="off">
        </div>

        <div class="form-group">
            <label for="new-note">Notes</label>
            <textarea id="new-note" placeholder="笔记" class="h150px"></textarea>
        </div>

        <div class="form-group">
            <label for="new-links">Linked Words (Comma separated)</label>
            <input type="text" id="new-links" placeholder="关联词" autocomplete="off">
        </div>

        
        <div class="btn-group">
            <button id="ai-btn">auto fill</button>
            <button id="cancel-btn">cancel</button>
            <button id="save-btn">save</button>
            <button id="delete-btn">delete</button>
        </div>
    </div>
</div>`



    const ele_root = document.createElement('div');
    ele_root.innerHTML = source;
    ele_root.className = "fixed";
    const ele_card_display = ele_root.querySelector("#card-display");
    const ele_card_edit = ele_root.querySelector("#card-edit");
    const editBtnCard = ele_root.querySelector("#card-edit-btn");
    const apiBtn = ele_root.querySelector("#ai-btn");
    const cancelBtn = ele_root.querySelector("#cancel-btn");
    const saveBtn = ele_root.querySelector("#save-btn");
    const deleteBtn = ele_root.querySelector("#delete-btn");

    const ele_voc = ele_card_display.querySelector("#vocab");
    const ele_btn_pronounce = ele_root.querySelector("#btn-pronounce")
    const ele_ipa = ele_card_display.querySelector("#ipa");
    const ele_meaning = ele_card_display.querySelector("#meaning");
    const ele_level = ele_card_display.querySelector("#level");
    const ele_tag = ele_card_display.querySelector("#tags");
    const ele_note = ele_card_display.querySelector("#note");
    const ele_linkedWords = ele_card_display.querySelector("#linked-words");

    const ele_new_voc = ele_card_edit.querySelector("#new-vocab");
    const ele_new_ipa = ele_card_edit.querySelector("#new-ipa");
    const ele_new_meaning = ele_card_edit.querySelector("#new-meaning");
    const ele_new_level = ele_card_edit.querySelector("#new-level");
    const ele_new_note = ele_card_edit.querySelector("#new-note");
    const ele_new_linkedWords = ele_card_edit.querySelector("#new-links");


    const ele_available = ele_card_edit.querySelector("#available-tags");
    const ele_selected = ele_card_edit.querySelector("#selected-tags");

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

    ele_card_edit.remove();

    let currentWord = "";

    function _updateCardContentInEditMode(detail = {}) {
        ele_new_ipa.value = detail.ipa || "";
        ele_new_meaning.value = detail.meaning || "";
        ele_new_level.value = detail.level || "";
        ele_new_note.value = detail.note || "";
        ele_new_linkedWords.value = detail.links || "";
        const sTag = detail.tags?.split(',').map(t => t.trim()).filter(s => s.length > 0) || [];
        _updateTagList(sTag);
    }

    function _updateTagList(sTags) {
        const aTags = dictionary.getTags()

        let _s = ''; let _a = '';
        aTags.forEach(tag => {
            if (sTags.includes(tag)) {
                _s += `<span class="tag word-tags">${tag.toUpperCase()}</span>`;
            } else {
                _a += `<span class="tag word-tags">${tag.toUpperCase()}</span>`;
            }
        });
        ele_available.innerHTML = _a;
        ele_selected.innerHTML = _s;
    }

    function renderCard(word, toEditMode = false) {
        currentWord = word;
        const details = dictionary.getWord(word);
        if (toEditMode) {
            ele_new_voc.value = word;
            _updateCardContentInEditMode(details);
            ele_root.replaceChildren(ele_card_edit);

        } else {

            ele_voc.textContent = word;
            if (details) {

                ele_ipa.textContent = details.ipa;
                ele_meaning.textContent = details.meaning;
                ele_level.textContent = details.level;
                ele_tag.textContent = details.tags.toUpperCase();
                const notes = details.note.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                let _s = '';
                notes.forEach(s => { _s += `<p>${s}</p>`; })
                ele_note.innerHTML = _s;

                const links = details.links.split(',').map(line => line.trim()).filter(line => line.length > 0);
                _s = '';
                links.forEach(w => { _s += `<a>${w}</a>`; });
                ele_linkedWords.innerHTML = _s;
            } else {
                ele_ipa.innerHTML = "";
                ele_meaning.innerHTML = "";
                ele_linkedWords.innerHTML = "";
                ele_note.innerHTML = "";
                ele_level.innerHTML = "";
            }

            ele_root.replaceChildren(ele_card_display);
        }

    };

    ele_btn_pronounce.addEventListener("click", () => {
        const word = ele_voc.textContent.trim();
        if (!word) return;
        pronunciation.pronounce(word);
    });
    ele_new_voc.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            const word = ele_new_voc.value.trim();
            if (word.length <= 0) return;
            renderCard(word, true);
        }
    });

    apiBtn.addEventListener("click", async e => {
        const word = ele_new_voc.value.trim();
        if (word.length <= 0) return;
        const question = `你是一个优秀的英语单词大师。将以下指定的英语单词或者短语以json格式输出。

这些单词或者短语是: ${word}
格式如下：
{
    "generic": {
        "ipa": "/dʒǝ'nerɪk/ (美英为主)",
        "level": "B2",
        "meaning": "adj. 一般的;属的;类的;非商标的",
        "links": "一些关联的词语，比如它的名词形式，动词形式，三单，ing等等，用英文逗号隔开",
        "note": "例句，多个例句用'\n'隔开"，
    },
    ...
}
    
要求：
1）只有meaning使用中文，其他一律英文；
2）例句一个就好，极少数可以最多有2个例句；
3）提供的单词在json中全部用小写；`


        const resultText = await ai.askChatGPT(question);
        const _detail = JSON.parse(resultText)[word];
        _updateCardContentInEditMode(_detail);
        saveBtn.classList.add('bs-bg-twinkle');
    })

    cancelBtn.addEventListener("click", e => {
        renderCard(currentWord, false);
    })

    editBtnCard.addEventListener("click", e => {
        renderCard(currentWord, true);
    })

    deleteBtn.addEventListener("click", e => {
        dictionary.deleteWord(currentWord);
        currentWord = '';
        renderCard('', false);
    })

    saveBtn.addEventListener("click", () => {
        const word = ele_new_voc.value.trim();
        const ipa = ele_new_ipa.value.trim();
        const meaning = ele_new_meaning.value.trim();
        const level = ele_new_level.value.trim();
        const note = ele_new_note.value.trim();
        const links = ele_new_linkedWords.value.trim();
        const tags = [...ele_selected.querySelectorAll(".tag")].map(span => span.textContent.trim()).join(",");

        dictionary.updateWord(word, ipa, meaning, level, note, links, tags)

        currentWord = word;
        renderCard(currentWord, false);
        saveBtn.classList.remove('bs-bg-twinkle');

    });

    ele_linkedWords.addEventListener("click", (e) => {
        // console.log(e.target);
        if (e.target.tagName === "A") {
            currentWord = e.target.outerText
            renderCard(currentWord, false);
        }
    })

    function update() {
        const c = ele_root.isConnected;
        if (c) {
            ele_root.remove()
        }
        renderCard(currentWord, false);

        if (c) {
            ele_container.replaceChildren(ele_root)
        }
    }

    function getShownWord() { return currentWord; }

    function pronounceShownWord() {
        pronunciation.pronounce(currentWord);
    }

    _updateTagList([]);
    return {
        ele_root,
        update,
        renderCard,
        getShownWord,
        pronounceShownWord,
    }
}

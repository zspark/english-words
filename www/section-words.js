

function initDictionarySection(ai, dictionary, cmp, card, pronunciation) {
    const _rts = dictionary.getRuntimeStatus('sec_dict');
    _rts.selectedWords = _rts.selectedWords || [];
    _rts.activedWord = _rts.activedWord || '';
    _rts.filter = _rts.filter || {
        search: "",
        level: "ALL",
        tag: "ALL"
    }

    const selectedWords = _rts.selectedWords;
    let _activedWordElem = null;

    const wordListSource = `
<div id="panel-left" class="panel-left">
    <div class="controls">

        ${cmp.inputSource("id-searchInput", null, "Search word while inputting")}
        ${cmp.dropdownSource("id-levelFilter", null, ["ALL", "A1", "A2", "B1", "B2", "C1", "C2"], 0)}
        ${cmp.dropdownSource("id-tagFilter", null, [], -1)}
        ${cmp.buttonGroupSource('id-resetFilter', ['Reset'])}
    </div>

    <div class="controls">
        ${cmp.buttonGroupSource('id-btns', ['Clear Pick', 'Pick 5', 'Pick 10', 'Pick 20', 'Pick All'])}
    </div>

    <div id="current-status" class="status-bar">
        <span id="selectedCount">0</span> word(s) selected, <span id="_filteredCount">0</span> word(s) filtered
    </div>

    <ul id="wordList" class="word-list" style="list-style: none;"></ul>
</div>

<div id="panel-right" class="panel-right">
</div>`



    const ele_root = document.createElement("div");
    ele_root.className = "container";
    ele_root.innerHTML = wordListSource;

    const ele_panel = ele_root.querySelector("#panel-right");
    const filteredCountSpan = ele_root.querySelector('#_filteredCount');
    const selectedCountSpan = ele_root.querySelector('#selectedCount');
    const btnRestFilter = ele_root.querySelector('#id-resetFilter');
    const ele_btns = ele_root.querySelector('#id-btns');
    const ele_wordList = ele_root.querySelector('#wordList');
    const searchInput = ele_root.querySelector('#id-searchInput input');
    const levelFilter = ele_root.querySelector('#id-levelFilter select');
    const tagFilter = ele_root.querySelector('#id-tagFilter select');
    tagFilter.innerHTML = cmp.dropdownOptionSource(["ALL", ...dictionary.getTags()], 0);

    let _filteredCount = 0;
    function _renderWords() {
        // _clearSelected();

        const words = Object.entries(dictionary.getWords(searchInput.value, levelFilter.value, tagFilter.value));
        let htmlBuffer = '';
        _filteredCount = words.length;

        const shownWord = card.getShownWord();
        for (const [word, details] of words) {
            const isChecked = selectedWords.includes(word) ? 'checked' : '';
            const isClicked = shownWord === word ? 'active' : '';

            htmlBuffer += `
<li class="word-card" ${isClicked} data-word="${word}">
    <div class="word-card-content">
        <input type="checkbox" class="word-checkbox" ${isChecked}>
        <label>
            <span class="word-name">${word}</span>
            <span class="word-ipa">${details.ipa}</span>
            <span class="tag word-level">${details.level}</span>
            <span class="word-meaning">${details.meaning}</span>
        </label>
    </div>
</li>
`;
        }

        if (_filteredCount === 0) {
            ele_wordList.innerHTML = '<li class="no-results">没有找到相关的单词。</li>';
        } else {
            ele_wordList.innerHTML = htmlBuffer;
        }

        _updateStatus();
    }

    function _updateFilterAndRender() {
        _rts.filter.search = searchInput.value;
        _rts.filter.level = levelFilter.value;
        _rts.filter.tag = tagFilter.value;
        dictionary.saveRuntimeStatus();
        _renderWords()
    }
    searchInput.addEventListener('input', _updateFilterAndRender);
    levelFilter.addEventListener('change', _updateFilterAndRender);
    tagFilter.addEventListener('change', _updateFilterAndRender);
    btnRestFilter.addEventListener('click', () => {
        levelFilter.selectedIndex = 0;
        tagFilter.selectedIndex = 0;
        searchInput.value = '';
        _updateFilterAndRender('', "ALL", "ALL");
    });

    function _updateStatus() {
        filteredCountSpan.textContent = _filteredCount;
        selectedCountSpan.textContent = selectedWords.length;
    }

    ele_wordList.addEventListener('change', (event) => {
        if (event.target.classList.contains('word-checkbox')) {
            let _e = event.target
            while (_e) {
                if (_e.dataset.word) break;
                _e = _e.parentElement;
            }

            if (_e) {
                const word = _e.dataset.word;
                event.target.checked ? _add(word) : _remove(word);
                _updateStatus();
                dictionary.saveRuntimeStatus();
            }
        }
    });

    function _add(word) {
        if (!selectedWords.includes(word)) {
            selectedWords.push(word);
        }
    }
    function _remove(word) {
        const index = selectedWords.indexOf(word);
        if (index !== -1) {
            selectedWords.splice(index, 1);
        }
    }


    ele_wordList.addEventListener('click', (e) => {
        let _elem = e.target;
        // console.debug(`${_elem.tagName}`);

        if (_elem.tagName === "INPUT") return;
        while (_elem) {
            if (_elem.dataset.word) {
                break;
            }
            _elem = _elem.parentElement;
        }
        if (_elem) {
            _activeWord(_elem);
        }
    });

    function _activeWord(wordElem) {
        if (_activedWordElem === wordElem) return;

        if (_activedWordElem) {
            _activedWordElem.removeAttribute("active");
        }
        _activedWordElem = wordElem
        if (_activedWordElem) {
            _activedWordElem.setAttribute('active', "");
            pronunciation.pronounce(_activedWordElem.dataset.word)
            card.renderCard(wordElem.dataset.word)
        }
    }



    ele_btns.addEventListener('click', (e) => {
        const visibleUncheckedBoxes = ele_wordList.querySelectorAll('.word-card');
        if (visibleUncheckedBoxes.length === 0) {
            // console.debug('当前可见列表中的单词已全部勾选！');
            return;
        }
        _clearSelected();

        if (e.target.dataset.index === "1") {//5
            _randomPickN(5, visibleUncheckedBoxes);
        } else if (e.target.dataset.index === "2") {//10
            _randomPickN(10, visibleUncheckedBoxes);
        } else if (e.target.dataset.index === "3") {//20
            _randomPickN(20, visibleUncheckedBoxes);
        } else if (e.target.dataset.index === "4") {//all
            _randomPickN(9999999, visibleUncheckedBoxes);
        } else {
            //clear
        }

        dictionary.saveRuntimeStatus();
        _updateStatus();
    });

    function _randomPickN(countToPick, visibleBoxes) {
        const _arr = [...visibleBoxes];
        shuffle(_arr);

        countToPick = Math.min(countToPick, _arr.length);
        for (let i = 0; i < countToPick; i++) {
            const targetBox = _arr[i];
            _toggleWordSelection(targetBox, false);
        }
    };

    function _clearSelected() {
        const _checkedBoxes = ele_root.querySelectorAll('.word-checkbox:checked');
        _checkedBoxes.forEach(box => {
            box.checked = false;
        });

        selectedWords.length = 0;
        dictionary.saveRuntimeStatus();
    }

    function _toggleWordSelection(elemLi, save = false) {
        const _checked = !elemLi.querySelector(".word-checkbox").checked;
        elemLi.querySelector(".word-checkbox").checked = _checked;
        _checked ? _add(elemLi.dataset.word) : _remove(elemLi.dataset.word);

        if (save) {
            dictionary.saveRuntimeStatus();
        }
    }

    function update() {
        const c = ele_root.isConnected;
        if (c) {
            ele_root.remove()
        }

        levelFilter.value = _rts.filter.level;
        tagFilter.value = _rts.filter.tag;
        searchInput.value = _rts.filter.search;

        _renderWords();
        ele_panel.replaceChildren(card.ele_root)

        if (c) {
            ele_container.replaceChildren(ele_root)
        }
    }

    function keyEvent(event) {
        if (!_activedWordElem) return;

        if (event.key === "d") {
            _activeWord(_activedWordElem.nextElementSibling);
        } else if (event.key === "e") {
            _activeWord(_activedWordElem.previousElementSibling);
        } else if (event.key === "f") {
            pronunciation.pronounce(_activedWordElem?.dataset?.word)
        } else if (event.key === "s") {
            _toggleWordSelection(_activedWordElem, true);
            _updateStatus();
        } else if (event.key === "Delete") {
            if (selectedWords.length != 0) {
                selectedWords.forEach(w => {
                    dictionary.deleteWord(w);
                })
                selectedWords.length = 0;
                dictionary.saveRuntimeStatus();
                _renderWords();
            }
        }
    }

    function getSelectedWords() {
        return readOnly(selectedWords)
    }

    dictionary.addEventListener(dictionary.EVT_DICT, e => {
        if (e.detail.action === "imported") {
            _renderWords();
        }
    });

    card.addEventListener(card.EVT_WORD, e => {
        //console.debug("card changed current shown word");
        const eleArray = ele_root.querySelectorAll("li.word-card");
        eleArray.forEach(ele => {
            if (ele.dataset.word === e.detail.currentWord) {
                _activeWord(ele);
                return;
            }
        });
    });

    return {
        ele_root,
        update,
        keyEvent,
        getSelectedWords,
    }
}


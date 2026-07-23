

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

    //${cmp.buttonGroupSource('id-btns', ['Clear Pick', 'Pick 5', 'Pick 10', 'Pick 20', 'Pick All'])}
    //${cmp.dropdownSource("id-levelFilter", null, ["ALL", "A1", "A2", "B1", "B2", "C1", "C2"], 0)}
    const wordListSource = `
<div id="panel-left" class="panel-left">
    <div class="controls">

        ${cmp.inputSource("id-searchInput", null, "Search word while inputting")}
        ${cmp.dropdownSource("id-tagFilter", null, [], -1)}
        ${cmp.buttonGroupSource('id-resetFilter', ['Reset'])}
    </div>

    <div class="controls">
        ${cmp.buttonGroupSource('id-btns-sort', ['Time', 'A-Z', 'Level', 'Random'], ["active"])}
    </div>

    <div id="current-status" class="status-bar">
        <span id="selectedCount">0</span> selected / <span id="_filteredCount">0</span> filtered / <span id="_total">0</span> total.
    </div>

    <ul id="wordList" class="word-list" style="list-style: none;"></ul>
</div>

<div id="panel-right" class="panel-right">
</div>`



    const ele_root = document.createElement("div");
    ele_root.className = "container";
    ele_root.innerHTML = wordListSource;

    const ele_panel = ele_root.querySelector("#panel-right");
    const totalCountSpan = ele_root.querySelector('#_total');
    const filteredCountSpan = ele_root.querySelector('#_filteredCount');
    const selectedCountSpan = ele_root.querySelector('#selectedCount');
    const btnRestFilter = ele_root.querySelector('#id-resetFilter');
    const ele_wordList = ele_root.querySelector('#wordList');
    const searchInput = ele_root.querySelector('#id-searchInput input');
    //const levelFilter = ele_root.querySelector('#id-levelFilter select');
    const tagFilter = ele_root.querySelector('#id-tagFilter select');
    tagFilter.innerHTML = cmp.dropdownOptionSource(["ALL", ...dictionary.getTags()], 0);

    const _sortFnMap = {
        "0": {
            "N": (r) => { },
            "R": (r) => { r.reverse() },
        },
        "1": {
            "N": (r) => { r.sort((a, b) => { return a[0] > b[0] }); },
            "R": (r) => { r.sort((a, b) => { return a[0] < b[0] }); },
        },
        "2": {
            "N": (r) => { r.sort((a, b) => { return a[1].level > b[1].level }); },
            "R": (r) => { r.sort((a, b) => { return a[1].level < b[1].level }); },
        },
        "3": {
            "N": shuffle,
            "R": shuffle,
        }
    }

    let _sortFn = undefined;
    let _filteredCount = 0;
    function _renderWords() {
        const words = Object.entries(dictionary.getWords(searchInput.value, /*levelFilter.value*/'ALL', tagFilter.value));
        _sortFn && _sortFn(words);
        _filteredCount = words.length;
        let htmlBuffer = '';

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
        //_rts.filter.level = levelFilter.value;
        _rts.filter.tag = tagFilter.value;
        dictionary.saveRuntimeStatus();
        _renderWords()
    }
    searchInput.addEventListener('input', _updateFilterAndRender);
    //levelFilter.addEventListener('change', _updateFilterAndRender);
    tagFilter.addEventListener('change', _updateFilterAndRender);
    btnRestFilter.addEventListener('click', () => {
        //levelFilter.selectedIndex = 0;
        tagFilter.selectedIndex = 0;
        searchInput.value = '';
        _updateFilterAndRender('', "ALL", "ALL");
    });

    function _updateStatus() {
        selectedCountSpan.textContent = selectedWords.length;
        filteredCountSpan.textContent = _filteredCount;
        totalCountSpan.textContent = dictionary.getWordsCount();
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

    const ele_btnsSort = ele_root.querySelector('#id-btns-sort');
    let _currentSortBtn = [...ele_btnsSort.querySelectorAll("button")]
        .map(ele => {
            ele.dataset.order = 'N';
            ele.dataset.caption = ele.innerHTML;
            return ele;
        })
        .filter(ele => ele.classList.contains('active'))[0];
    ele_btnsSort.addEventListener('click', (e) => {
        _currentSortBtn?.classList.remove('active');
        _currentSortBtn = e.target;
        _currentSortBtn.classList.add("active");

        const _ds = _currentSortBtn.dataset;
        if (_ds.order === "N") {
            _ds.order = "R";
            _currentSortBtn.innerHTML = _ds.caption.split('').reverse().join('');
        } else {
            _ds.order = "N";
            _currentSortBtn.innerHTML = _ds.caption
        }
        _sortFn = _sortFnMap[_ds.index][_ds.order]

        if (_ds.caption == 'Random') _currentSortBtn.innerHTML = _ds.caption;
        _renderWords();
    });

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

        //levelFilter.value = _rts.filter.level;
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


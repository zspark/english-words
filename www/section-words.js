

function initDictionarySection(ai, dictionary, cmp, card, pronunciation) {
    const _rts = dictionary.getRuntimeStatus('sec_dict');
    _rts.selectedWords = _rts.selectedWords || [];
    _rts.activedWord = _rts.activedWord || '';
    _rts.filter = _rts.filter || {
        search: "",
        level: "ALL",
        tag: "ALL"
    }
    _rts.sort = _rts.sort || {
        "0": "N",
        "1": "N",
        "2": "R",
        "3": "N",
        active: 0,
    }

    const selectedWords = _rts.selectedWords;
    //${cmp.buttonGroupSource('id-btns', ['Clear Pick', 'Pick 5', 'Pick 10', 'Pick 20', 'Pick All'])}
    //${cmp.dropdownSource("id-levelFilter", null, ["ALL", "A1", "A2", "B1", "B2", "C1", "C2"], 0)}
    const wordListSource = `
<div id="panel-left" class="bs-panel">
    <div class="controls">
        ${cmp.inputSource("id-searchInput", null, "Search word while inputting")}
        ${cmp.dropdownSource("id-tagFilter", null, [], -1)}
        ${cmp.buttonGroupSource('id-resetFilter', ['Reset'])}
    </div>

    <div class="controls">
        ${cmp.buttonGroupSource('id-btnsSort', ['Time', 'AZ', 'Level', 'Random'], ["active"])}
    </div>

    <div id="current-status" class="status-bar">
        <span id="selectedCount">0</span> selected / <span id="_filteredCount">0</span> filtered / <span id="_total">0</span> total.
    </div>

    <div id="id-content">
        <ul id="id-wordList" class="word-list" style="list-style: none;"></ul>
        <div id="id-card" class="panel-right-a"> </div>
    </div>

</div>`



    const ele_root = document.createElement("div");
    ele_root.className = "container";
    ele_root.innerHTML = wordListSource;

    const ele_content = ele_root.querySelector("#id-content");
    const ele_wordList = ele_root.querySelector('#id-wordList');
    const ele_card = ele_root.querySelector("#id-card");
    ele_card.remove();
    const totalCountSpan = ele_root.querySelector('#_total');
    const filteredCountSpan = ele_root.querySelector('#_filteredCount');
    const selectedCountSpan = ele_root.querySelector('#selectedCount');
    const btnRestFilter = ele_root.querySelector('#id-resetFilter');
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

        for (const [word, detail] of words) {
            const _isSelected = selectedWords.includes(word) ? 'select' : '';
            const _isActived = _rts.activedWord === word ? 'active' : '';

            htmlBuffer += `
<li class="word-card" data-word="${word}" ${_isSelected} ${_isActived}>
    <div>
        <span class="word-name">${word}</span>
        <span class="word-ipa">${detail.ipa}</span>
        <span class="tag word-level">${detail.level}</span>
        <span class="tag word-tag">${detail.tags || ""}</span>
    </div>
    <span class="word-meaning">${detail.meaning}</span>
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
        _activeWord(null);
        _clearSelection();
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
        dictionary.saveRuntimeStatus();
    }

    function _add(elemLi, save = false) {
        const _w = elemLi.dataset.word;
        if (!selectedWords.includes(_w)) {
            selectedWords.push(_w);
            elemLi.setAttribute('select', "");
        }
        if (save) dictionary.saveRuntimeStatus();
    }
    /*
    function _remove(elemLi, save = false) {
        const _w = elemLi.dataset.word;
        const index = selectedWords.indexOf(_w);
        if (index !== -1) {
            selectedWords.splice(index, 1);
            elemLi.removeAttribute('select', "");
        }
        if (save) dictionary.saveRuntimeStatus();
    }
    function _hasSelected(elemLi) {
        return selectedWords.indexOf(elemLi.dataset.word) > 0;
    }
    function _toggleSelection(elemLi, save = false) {
        if (elemLi.hasAttribute("select")) {
            _remove(elemLi, save);
        } else _add(elemLi, save);
    }
    */

    function _clearSelection() {
        ele_wordList.querySelectorAll("li[select]").forEach(elemLi => {
            elemLi.removeAttribute('select', "");
        });
        selectedWords.length = 0;
    }

    (function() {
        function _getSiblingsBetween(el1, el2) {
            if (el1.parentElement !== el2.parentElement) {
                return [];
            }

            const children = [...el1.parentElement.children];
            const i1 = children.indexOf(el1);
            const i2 = children.indexOf(el2);

            const start = Math.min(i1, i2);
            const end = Math.max(i1, i2);

            return children.slice(start, end + 1);
        }
        function _selectRightElement(elem) {
            while (elem) {
                if (elem.dataset.word) {
                    return elem;
                }
                elem = elem.parentElement;
            }
            return null;
        }
        let _lastCurrentElem = null;
        function _moveFn(e) {
            //console.debug(e.target);
            let _currentElem = _selectRightElement(e.target);
            if (_currentElem === _lastCurrentElem) return;
            if (_currentElem) {
                _clearSelection();
                const _betweenElem = _getSiblingsBetween(_downElem, _currentElem);
                _betweenElem.forEach(elem => _add(elem, false))
                _lastCurrentElem = _currentElem;
            }
            _updateStatus();
        };
        const TIME_SHRESHOLD = 200; //ms
        let _timeStart = 0;
        let _downElem = null;
        let _currentElem = null;
        ele_wordList.addEventListener('mousedown', (e) => {
            console.debug("mouse down.");
            document.body.classList.add("no-select");
            // console.debug(`${_elem.tagName}`);
            _timeStart = performance.now();
            _downElem = _selectRightElement(e.target);
            _clearSelection();
            _add(_downElem);
            _lastCurrentElem = _currentElem = _downElem;
            _updateStatus();
            ele_wordList.addEventListener('mousemove', _moveFn);
        });
        ele_wordList.addEventListener('mouseup', (e) => {
            console.debug("mouse up.");
            document.body.classList.remove("no-select");
            const _timeElapsed = performance.now() - _timeStart;
            const _upElem = _selectRightElement(e.target);
            if (_upElem === _downElem) {
                if (_timeElapsed < TIME_SHRESHOLD) {
                    console.debug("click");
                    if (_downElem) {
                        _activeWord(_downElem);
                    }
                } else {
                    console.log("long click");
                }
            } else {
                console.debug("long click");
            }
            ele_wordList.removeEventListener('mousemove', _moveFn);
            dictionary.saveRuntimeStatus();
        });
    }())

    let _activedWordElem = null;
    function _activeWord(wordElem) {
        if (_activedWordElem === wordElem) return;

        if (_activedWordElem) {
            _activedWordElem.removeAttribute("active");
            _activedWordElem = null;
            _rts.activedWord = '';
        }
        if (wordElem) {
            const _w = wordElem.dataset.word;
            pronunciation.pronounce(_w);
            card.renderCard(_w);
            wordElem.setAttribute("active", "");
            _activedWordElem = wordElem;
            _rts.activedWord = _w;
        }
    }

    const ele_btnsSort = ele_root.querySelector('#id-btnsSort');
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
        _rts.sort[_ds.index] = _ds.order;
        dictionary.saveRuntimeStatus();

        if (_ds.caption == 'Random') _currentSortBtn.innerHTML = _ds.caption;
        _renderWords();
    });

    function update() {
        const c = ele_root.isConnected;
        if (c) {
            ele_root.remove()
        }

        //levelFilter.value = _rts.filter.level;
        tagFilter.value = _rts.filter.tag;
        searchInput.value = _rts.filter.search;

        _renderWords();
        _activedWordElem = [...ele_wordList.querySelectorAll("li")].filter(ele => ele.hasAttribute('active'))[0];
        ele_card.replaceChildren(card.ele_root)

        if (c) {
            ele_container.replaceChildren(ele_root)
        }
    }

    let _scrollPos = 0;
    function keyEvent(event) {
        if (!_activedWordElem) return;

        if (event.key === "d") {
            _activeWord(_activedWordElem.nextElementSibling);
        } else if (event.key === "e") {
            _activeWord(_activedWordElem.previousElementSibling);
        } else if (event.key === "a") {
            pronunciation.pronounce(_activedWordElem?.dataset?.word)
        } else if (event.key === "s") {
            ele_content.replaceChildren(ele_wordList);
            window.scrollTo(0, _scrollPos);
        } else if (event.key === "f") {
            _scrollPos = window.scrollY;
            ele_content.replaceChildren(ele_card);
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
        return;
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


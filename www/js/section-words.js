

function initDictionarySection(ai, dictionary, cmp, card, pronunciation, navigator) {
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
<div class="bs-panel">
    <div class="controls">
        ${cmp.buttonGroupSource('id-btnsSort', ['Time', 'AZ', 'Level', 'Random'], ["active"])}
    </div>

    <div id="current-status" class="status-bar">
        <span id="selectedCount">0</span> selected / <span id="id_filteredCount">0</span> filtered / <span id="_total">0</span> total.
    </div>

    <ul id="id-wordList" class="word-list" style="list-style: none;"></ul>
</div>

<div id="id-cardContainer"> </div>
`



    const ele_root = document.createElement("div");
    ele_root.className = "container";
    ele_root.innerHTML = wordListSource;

    const ele_panel = ele_root.querySelector('.bs-panel');
    const ele_wordList = ele_root.querySelector('#id-wordList');
    const ele_card = ele_root.querySelector("#id-cardContainer");
    const totalCountSpan = ele_root.querySelector('#_total');
    const filteredCountSpan = ele_root.querySelector('#id_filteredCount');
    const selectedCountSpan = ele_root.querySelector('#selectedCount');

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
        ({ word, tag } = navigator.getFilter());
        const words = Object.entries(dictionary.getWords(word, 'ALL', tag));
        _sortFn && _sortFn(words);
        _filteredCount = words.length;
        let htmlBuffer = '';

        for (const [_word, _detail] of words) {
            const _isSelected = selectedWords.includes(_word) ? 'select' : '';
            const _isActived = _rts.activedWord === _word ? 'active' : '';

            htmlBuffer += `<li class="cls-word-item" data-word="${_word}" ${_isSelected} ${_isActived}>
    ${_genWordContentSource(_word, _detail)}
</li>`;
        }

        ele_wordList.remove();
        if (_filteredCount === 0) {
            ele_wordList.innerHTML = '<li class="no-results">word not found.</li>';
        } else {
            ele_wordList.innerHTML = htmlBuffer;
        }
        ele_panel.append(ele_wordList);

        _updateStatus();
    }

    function _genWordContentSource(word, detail) {
        return `<div>
    <span class="word-name">${word}</span>
    <span class="word-ipa">${detail.ipa}</span>
    <span class="tag word-level">${detail.level}</span>
    <span class="tag word-tag">${detail.tags || ""}</span>
</div>
<span class="word-meaning">${detail.meaning}</span>`;
    }

    function _deleteWord(word) {
        if (!word) return;
        const _elem = ele_root.querySelector(`li[data-word="${word}"]`);
        _elem?.remove();
    }

    function _updateWord(word) {
        if (!word) return '';
        const _elem = ele_root.querySelector(`li[data-word="${word}"]`);
        if (_elem) {
            const _detail = dictionary.getWord(word);
            const _source = _genWordContentSource(word, _detail);
            _elem.innerHTML = _source;
        } else { return '' }
    }

    navigator.addEventListener(navigator.EVT_FILTER, (e) => {
        ({ word, tag } = e.detail);
        _rts.filter.search = word;
        _rts.filter.tag = tag;
        _activeWord(null);
        _clearSelection();
        dictionary.saveRuntimeStatus();
        _renderWords()
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
        /*
        let _currentElem = null;
        function _moveFn(e) {
            //logger.debug(e.target);
        };
        */
        function _highlight(elem) {
            _clearSelection();
            const _betweenElem = _getSiblingsBetween(_activedWordElem, elem);
            _betweenElem.forEach(elem => _add(elem, false))
            _updateStatus();
        }
        const TIME_SHRESHOLD = 200; //ms
        let _timeStart = 0;
        let _timeEnd = 0;
        let _downElem = null;
        let _consecutiveTimes = 0;
        ele_wordList.addEventListener('pointerdown', (e) => {
            //logger.debug("mouse down.");
            // logger.debug(`${_elem.tagName}`);
            _timeStart = performance.now();
            if (_timeStart - _timeEnd < TIME_SHRESHOLD) {
                _consecutiveTimes++;
            } else {
                _consecutiveTimes = 0;
            }
            _downElem = _selectRightElement(e.target);
            //ele_wordList.addEventListener('pointermove', _moveFn);
        });
        ele_wordList.addEventListener('pointerup', (e) => {
            //logger.debug("mouse up.");
            //ele_wordList.removeEventListener('pointermove', _moveFn);
            const _upElem = _selectRightElement(e.target);
            if (!_upElem) return;
            if (_upElem === _downElem) {
                _timeEnd = performance.now();
                const _timeElapsed = _timeEnd - _timeStart;
                if (_timeElapsed < TIME_SHRESHOLD) {
                    //logger.debug("click");
                    if (_downElem) {
                        _activeWord(_downElem);
                    }
                    if (_consecutiveTimes === 1) {
                        _consecutiveTimes++;
                        if (isMobile()) {
                            //logger.debug("dblclick");
                            window._scrollPos = window.scrollY;
                            //logger.debug(`window scrollY is: ${window.scrollY}`);
                            ele_root.classList.add("card-only");
                            window.scrollTo(0, 0);
                        }
                    }

                } else {
                    //logger.log("long click (same)");
                    _highlight(_upElem);
                }
            } else {
                //logger.debug("long click (different)");
                _highlight(_upElem);
            }
            dictionary.saveRuntimeStatus();
        });
    }())

    let _activedWordElem = null;
    function _activeWord(wordElem) {
        if (_activedWordElem === wordElem && wordElem) {
            const _w = wordElem.dataset.word;
            pronunciation.pronounce(_w);
            return;
        }

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
        navigator.setFilter(_rts.filter.search, _rts.filter.tag);

        _renderWords();
        _activedWordElem = [...ele_wordList.querySelectorAll("li")].filter(ele => ele.hasAttribute('active'))[0];
        ele_card.replaceChildren(card.ele_root)

        if (c) {
            ele_container.replaceChildren(ele_root)
        }
    }

    function keyEvent(event) {
        if (event.key === "Enter") {
            navigator.setFocus();
        } else if (event.key === "Escape") {
            navigator.setBlur();
            navigator.resetFilter();
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

        if (!_activedWordElem) return;
        if (event.key === "d") {
            _activeWord(_activedWordElem.nextElementSibling);
        } else if (event.key === "e") {
            _activeWord(_activedWordElem.previousElementSibling);
        } else if (event.key === "a") {
            pronunciation.pronounce(_activedWordElem?.dataset?.word)
        } else if (event.key === "s") {
            //ele_content.replaceChildren(ele_wordList);
            //window.scrollTo(0, _scrollPos);
        } else if (event.key === "f") {
            //_scrollPos = window.scrollY;
            //ele_content.replaceChildren(ele_card);
        }
    }

    function getSelectedWords() {
        return readOnly(selectedWords)
    }

    dictionary.addEventListener(dictionary.EVT_DICT, e => {
        // logger.log(e);
        if (e.detail.action === "imported") {
            _renderWords();
        }
    });
    dictionary.addEventListener(dictionary.EVT_WORD, e => {
        // logger.log(e);
        if (e.detail.action === "modify") {
            _updateWord(e.detail.word);
        } else if (e.detail.action === "delete") {
            _deleteWord(e.detail.word);
        }
    });

    card.addEventListener(card.EVT_WORD, e => {
        //logger.log(e);
        return;
        /*
        //logger.debug("card changed current shown word");
        const eleArray = ele_root.querySelectorAll("li.word-card");
        eleArray.forEach(ele => {
            if (ele.dataset.word === e.detail.currentWord) {
                _activeWord(ele);
                return;
            }
        });
        */
    });

    return {
        ele_root,
        update,
        keyEvent,
        getSelectedWords,
    }
}


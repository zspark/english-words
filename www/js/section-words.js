

function initDictionarySection(ai, dictionary, cmp, card, pronunciation, navigator) {

    const _rts = dictionary.getLocalData('sec_dict');
    _rts.selectedWords = _rts.selectedWords || [];
    _rts.activedWord = _rts.activedWord || '';
    _rts.filter = _rts.filter || {
        search: "",
        level: "ALL",
        tag: "ALL"
    }
    _rts.scrollY = _rts.scrollY || 0;
    _rts.sort = _rts.sort || {
        "0": "N",
        "1": "N",
        "2": "R",
        "3": "N",
        "active": "0",
    }

    const selectedWords = _rts.selectedWords;
    //${cmp.buttonGroupSource('id-btns', ['Clear Pick', 'Pick 5', 'Pick 10', 'Pick 20', 'Pick All'])}
    //${cmp.dropdownSource("id-levelFilter", null, ["ALL", "A1", "A2", "B1", "B2", "C1", "C2"], 0)}
    const wordListSource = `
<div class="bs-panel">
    <div class="controls">
        ${cmp.buttonGroupSource('id-btnsSort', ['Time', 'AZ', 'Level', 'Random'], [])}
    </div>

    <div id="current-status" class="status-bar">
        <span id="selectedCount">0</span> selected / <span id="id_filteredCount">0</span> filtered / <span id="_total">0</span> total.
    </div>

    <ul id="id-wordList" class="word-list"></ul>
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


    const _wordsHandler = (function () {

        const _ITEM_HEIGHT = 88 // px;
        const _ITEMS_EACH_SIDE = 4;
        const _SORT_FN_MAP_ = {
            "0": {
                "N": (r) => { r.sort((a, b) => { return a[1].time > b[1].time }); },
                "R": (r) => { r.sort((a, b) => { return a[1].time < b[1].time }); },
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

        let _sortFn = _SORT_FN_MAP_['0']['N'];
        let _filteredCount = 0;
        let _words = [];
        let _previousStartIndex = -1;
        let _previousEndIndex = -1;

        function _getVisibleRange() {
            const _topY = Math.max(0, _rts.scrollY - _ITEMS_EACH_SIDE * _ITEM_HEIGHT);
            const startIndex = Math.min(Math.floor(_topY / _ITEM_HEIGHT), _filteredCount);
            const _bottomY = _rts.scrollY + window.innerHeight + _ITEMS_EACH_SIDE * _ITEM_HEIGHT;
            const endIndex = Math.min(Math.ceil(_bottomY / _ITEM_HEIGHT), _filteredCount);
            // logger.debug(`startIndex:${startIndex}, endIndex:${endIndex}`);

            return {
                startIndex,
                endIndex,
                startY: startIndex * _ITEM_HEIGHT,
            };
        }

        function chooseSortFunc(index, order) {
            _sortFn = _SORT_FN_MAP_[index][order];
        }

        function updateWordList() {
            ({ word, level, tag } = navigator.getFilter());
            _words = Object.entries(dictionary.getWords(word, level, tag));
            _filteredCount = _words.length;
            ele_wordList.style.height = `${_filteredCount * _ITEM_HEIGHT}px`;
        }

        function sortWordList() {
            _sortFn && _sortFn(_words);
        }

        function renderWords(force = false) {
            //console.time('search');
            if (_filteredCount === 0) {
                ele_wordList.innerHTML = '<li class="no-results">word not found.</li>';
            } else {
                const { startIndex, endIndex, startY } = _getVisibleRange();
                if (!force) {
                    if (startIndex === _previousStartIndex && endIndex === _previousEndIndex) return;
                    _previousStartIndex = startIndex;
                    _previousEndIndex = endIndex;
                }

                let htmlBuffer = '';
                for (let i = startIndex; i < endIndex; ++i) {
                    [_word, _detail] = _words[i]

                    const _isSelected = selectedWords.includes(_word) ? 'select' : '';
                    const _isActived = _rts.activedWord === _word ? 'active' : '';

                    htmlBuffer += `<li class="cls-word-item" style="top:${startY + (i - startIndex) * _ITEM_HEIGHT}px;" data-word="${_word}" ${_isSelected} ${_isActived}>
                                        ${_genWordHTMLSource(_word, _detail)}
                                    </li>`;
                }

                ele_wordList.innerHTML = htmlBuffer;

                _activedWordElem = [...ele_wordList.querySelectorAll("li")].filter(ele => ele.hasAttribute('active'))[0];
            }
            _updateStatus();
            //console.timeEnd('search');
        }

        function getWordsBetween_include(w1, w2) {
            if (!w1 || !w2) return [];
            if (w1.length <= 0 || w2.length <= 0) return [];
            if (w1 === w2) return w1;

            let _i1 = _words.findIndex(item => item[0] === w1);
            let _i2 = _words.findIndex(item => item[0] === w2);
            if (_i1 > _i2) {
                let _tmp = _i1;
                _i1 = _i2;
                _i2 = _tmp;
            }

            return _words.slice(_i1, _i2 + 1);
        }

        return {
            chooseSortFunc,
            sortWordList,
            updateWordList,
            renderWords,
            getWordsBetween_include,
            get filteredCount() { return _filteredCount; },
        }
    })();

    function _genWordHTMLSource(word, detail) {
        return ` <div>
                    <span class="word-name">${word}</span>
                    <span class="tag word-level">${detail.level}</span>
                    <span class="tag word-tag">${detail.tags || ""}</span>
                </div>
                <div>
                    <span class="word-ipa">${detail.ipa}</span>
                </div>
                <div>
                    <span class="word-meaning">${detail.meaning}</span>
                </div>`;
    }

    function _updateStatus() {
        selectedCountSpan.textContent = selectedWords.length;
        filteredCountSpan.textContent = _wordsHandler.filteredCount;
        totalCountSpan.textContent = dictionary.getWordsCount();
    }

    function _clearSelection() {
        ele_wordList.querySelectorAll("li[select]").forEach(elemLi => {
            elemLi.removeAttribute('select', "");
        });
        selectedWords.length = 0;
    }

    (function () {
        function _selectTargetElement(elem) {
            while (elem) {
                if (elem.dataset.word) {
                    return elem;
                }
                elem = elem.parentElement;
            }
            return null;
        }

        function _highlight(elem) {
            const _arr = _wordsHandler.getWordsBetween_include(_rts.activedWord, elem.dataset.word);
            selectedWords.length = 0;
            _arr.forEach((item) => {
                selectedWords.push(item[0]);
            });
            _wordsHandler.renderWords(true);
        }
        const TIME_SHRESHOLD = 200; //ms
        let _timeStart = 0;
        let _timeEnd = 0;
        let _downElem = null;
        let _consecutiveTimes = 0;
        ele_wordList.addEventListener('pointerdown', (e) => {
            // logger.debug("mouse down.");
            // logger.debug(`${_elem.tagName}`);
            _timeStart = performance.now();
            if (_timeStart - _timeEnd < TIME_SHRESHOLD) {
                _consecutiveTimes++;
            } else {
                _consecutiveTimes = 0;
            }
            _downElem = _selectTargetElement(e.target);
        });
        ele_wordList.addEventListener('pointerup', (e) => {
            // logger.debug("mouse up.");
            const _upElem = _selectTargetElement(e.target);
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
                            window._scrollY = window.scrollY;
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
            dictionary.saveLocalData();
        });
    })()

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

    (function () {
        let _currentSortBtn = null;

        function _renderSortCaption(sortBtn, targetCaption = null) {
            const _ds = sortBtn.dataset;
            if (!targetCaption) {
                targetCaption = _ds.order == "R" ? "N" : "R";
            }
            _ds.order = targetCaption;
            if (_ds.caption == 'Random') return;
            if (targetCaption === "R") {
                sortBtn.innerHTML = _ds.caption.split('').reverse().join('');
            } else {
                sortBtn.innerHTML = _ds.caption;
            }
        }

        const ele_btnsSort = ele_root.querySelector('#id-btnsSort');
        ele_btnsSort.addEventListener('click', (e) => {
            const _ds = e.target.dataset;
            e.target.classList.add("active");
            if (e.target != _currentSortBtn) {
                _currentSortBtn?.classList.remove('active');
                _currentSortBtn = e.target;
            } else {
                _renderSortCaption(_currentSortBtn);
            }
            _rts.sort['active'] = _ds.index;
            _rts.sort[_ds.index] = _ds.order;
            dictionary.saveLocalData();
            _wordsHandler.chooseSortFunc(_ds.index, _ds.order);
            _wordsHandler.sortWordList();
            _wordsHandler.renderWords(true);
        });

        const _arr = [...ele_btnsSort.querySelectorAll("button")];
        for (let i = 0, N = _arr.length; i < N; ++i) {
            let _ds = _arr[i].dataset;
            let _o = _rts.sort[i + ""];
            _ds.order = _o;
            _ds.caption = _arr[i].innerHTML;
            _renderSortCaption(_arr[i], _o);
        }
        _currentSortBtn = _arr[Number(_rts.sort.active)]
        _currentSortBtn.classList.add("active");
        const _ds = _currentSortBtn.dataset;
        _wordsHandler.chooseSortFunc(_ds.index, _ds.order);
    })()

    function setSync(scrollY) {
        _rts.scrollY = scrollY;
        _wordsHandler.renderWords();
    }
    function deactive() {
        _rts.scrollY = window.scrollY;
    }

    function active() {
        window.scrollTo(0, _rts.scrollY);
        navigator.setFilter(_rts.filter.search, _rts.filter.level, _rts.filter.tag);
        ele_card.replaceChildren(card.ele_root)
    }

    function keyEvent(event) {
        if (event.key === "Delete") {
            if (selectedWords.length != 0) {
                selectedWords.forEach(w => {
                    dictionary.deleteWord(w, false);
                })
                selectedWords.length = 0;
                dictionary.saveLocalData();
                _wordsHandler.updateWordList();
                _wordsHandler.sortWordList();
                _wordsHandler.renderWords(true);
            }
        }

        if (!_activedWordElem) return;
        if (event.key === "d") {
            _activeWord(_activedWordElem.nextElementSibling);
        } else if (event.key === "e") {
            _activeWord(_activedWordElem.previousElementSibling);
        } else if (event.key === "f") {
            pronunciation.pronounce(_activedWordElem?.dataset?.word)
        } else if (event.key === "s") {
        }
    }

    function getSelectedWords() {
        return readOnly(selectedWords)
    }

    dictionary.addEventListener(dictionary.EVT_DICT, e => {
        // logger.log(e);
        _wordsHandler.updateWordList();
        _wordsHandler.sortWordList();
        _wordsHandler.renderWords(true);
        if (e.detail.action === "imported") {
        } else if (e.detail.action === "delete") {
        }
    });
    dictionary.addEventListener(dictionary.EVT_WORD, e => {
        // logger.log(e);
        if (e.detail.action === "modify") {
        } else if (e.detail.action === "delete") {
            _wordsHandler.updateWordList();
        } else if (e.detail.action === "add") {
            _wordsHandler.updateWordList();
        }
        _wordsHandler.sortWordList();
        _wordsHandler.renderWords(true);
    });

    card.addEventListener(card.EVT_WORD, e => {
        //logger.log(e);
    });

    navigator.setFilter(_rts.filter.search, _rts.filter.level, _rts.filter.tag);
    navigator.addEventListener(navigator.EVT_FILTER, (e) => {
        ({ word, level, tag } = e.detail);
        _rts.filter.search = word;
        _rts.filter.level = level;
        _rts.filter.tag = tag;
        _activeWord(null);
        _clearSelection();
        dictionary.saveLocalData();
        _updateStatus();
        _wordsHandler.updateWordList();
        _wordsHandler.sortWordList();
        _wordsHandler.renderWords(true);
    });

    _wordsHandler.updateWordList();
    _wordsHandler.sortWordList();
    _wordsHandler.renderWords(true);

    return {
        ele_root,
        active,
        setSync,
        deactive,
        keyEvent,
        getSelectedWords,
    }
}


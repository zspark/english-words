import { isDesktop, isMobile, shuffle } from "./utils.js";
import Cacher from "./cacher.js";
import cmp from "./components.js";
import Dictionary from "./dictionary.js";
import prpc from "./pronunciation.js";
import { SectionBase } from "./section-base.js";
const _metaProxy = Cacher.metaProxy;
const _localProxy = Cacher.localProxy;
const _rts = _localProxy.get('sec_dict', {});
_rts.activedWord = _rts.activedWord || '';
_rts.filter = _rts.filter || {
    search: "",
    level: "ALL",
    tag: "ALL"
};
_rts.scrollY = _rts.scrollY || 0;
_rts.sort = _rts.sort || {
    "0": "N",
    "1": "N",
    "2": "R",
    "3": "N",
};
_rts.sortIndex = _rts.sortIndex ?? 0;
const wordListSource = `
<div class="bs-panel">
    <div class="word-header">

        <div class="controls">
            ${cmp.buttonGroupSource('id-btnsSort', ['Time', 'AZ', 'Random'], [])}
        </div>
        <div class="controls">
            ${cmp.dropdownSource("id-levelFilter", null, ["ALL", "A1", "A2", "B1", "B2", "C1", "C2"], -1)}
            ${cmp.dropdownSource("id-tagFilter", null, [], -1)}
        </div>
    </div>

    <div id="current-status" class="status-bar">
        <span id="selectedCount">0</span> selected / <span id="id_filteredCount">0</span> filtered / <span id="_total">0</span> total.
    </div>

    <ul id="id-wordList" class="word-list"></ul>
</div>

<div id="id-cardContainer"> </div>
`;
const _ITEM_HEIGHT = isDesktop() ? 33 : 53; // px;
const _ITEMS_EACH_SIDE = 4;
const sort0N = (r) => { r.sort((a, b) => { return a[1].time_modify - b[1].time_modify; }); };
const sort0R = (r) => { r.sort((a, b) => { return b[1].time_modify - a[1].time_modify; }); };
const sort1N = (r) => { r.sort((a, b) => { return a[0].localeCompare(b[0]); }); };
const sort1R = (r) => { r.sort((a, b) => { return b[0].localeCompare(a[0]); }); };
class WordsHandler {
    #_dict;
    #_sortFn;
    #_filteredCount = 0;
    #_words = [];
    #_previousStartIndex = -1;
    #_previousEndIndex = -1;
    selectedCountSpan;
    filteredCountSpan;
    totalCountSpan;
    #_levelFilter;
    #_tagFilter;
    #_ele_wordList;
    constructor(dict, ui, wordList) {
        this.#_dict = dict;
        this.#_levelFilter = ui.get('#id-levelFilter select');
        this.#_tagFilter = ui.get('#id-tagFilter select');
        this.#_levelFilter.value = _rts.filter.level;
        this.#_tagFilter.innerHTML = cmp.dropdownOptionSource(["ALL", ..._metaProxy.get('tags', [])], 0);
        this.#_tagFilter.value = _rts.filter.tag;
        const that = this;
        function _disp() {
            _rts.filter.level = that.#_levelFilter.value;
            _rts.filter.tag = that.#_tagFilter.value;
            that.#_clearSelection();
            that.#_updateStatus();
            that.updateWordList();
            that.sortWordList();
            that.renderWords(true);
        }
        this.#_levelFilter.addEventListener('change', _disp);
        this.#_tagFilter.addEventListener('change', _disp);
        this.selectedCountSpan = ui.get('#selectedCount');
        this.filteredCountSpan = ui.get('#id_filteredCount');
        this.totalCountSpan = ui.get('#_total');
        this.#_ele_wordList = wordList;
        this.#_sortFn = this.chooseSortFunc('0', 'N');
        this.#_filteredCount = 0;
        this.#_words = [];
        this.#_previousStartIndex = -1;
        this.#_previousEndIndex = -1;
    }
    #_updateStatus() {
        // this.selectedCountSpan.textContent = selectedWords.length + "";
        this.filteredCountSpan.textContent = this.#_filteredCount + "";
        this.totalCountSpan.textContent = this.#_dict.getWordsCount() + "";
    }
    #_clearSelection() {
        this.#_ele_wordList.querySelectorAll("li[select]").forEach(elemLi => {
            elemLi.removeAttribute('select');
        });
        // selectedWords.length = 0;
    }
    #_getVisibleRange() {
        const _topY = Math.max(0, _rts.scrollY - _ITEMS_EACH_SIDE * _ITEM_HEIGHT);
        const startIndex = Math.min(Math.floor(_topY / _ITEM_HEIGHT), this.#_filteredCount);
        const _bottomY = _rts.scrollY + window.innerHeight + _ITEMS_EACH_SIDE * _ITEM_HEIGHT;
        const endIndex = Math.min(Math.ceil(_bottomY / _ITEM_HEIGHT), this.#_filteredCount);
        // logger.debug(`startIndex:${startIndex}, endIndex:${endIndex}`);
        return {
            startIndex,
            endIndex,
            startY: startIndex * _ITEM_HEIGHT,
        };
    }
    chooseSortFunc(index, order) {
        switch (index) {
            case "0":
                this.#_sortFn = order === "N" ? sort0N : sort0R;
                break;
            case "1":
                this.#_sortFn = order === "N" ? sort1N : sort1R;
                break;
            case "2":
                this.#_sortFn = shuffle;
                break;
        }
        return this.#_sortFn;
    }
    updateWordList() {
        let level = this.#_levelFilter.value;
        let tag = this.#_tagFilter.value;
        this.#_words = Object.entries(this.#_dict.getWords('', level, tag));
        this.#_filteredCount = this.#_words.length;
        this.#_ele_wordList.style.height = `${this.#_filteredCount * _ITEM_HEIGHT}px`;
    }
    sortWordList() {
        this.#_sortFn(this.#_words);
    }
    renderWords(force = false) {
        //console.time('search');
        if (this.#_filteredCount === 0) {
            this.#_ele_wordList.innerHTML = '<li class="no-results">word not found.</li>';
        }
        else {
            const { startIndex, endIndex, startY } = this.#_getVisibleRange();
            if (!force) {
                if (startIndex === this.#_previousStartIndex && endIndex === this.#_previousEndIndex)
                    return;
                this.#_previousStartIndex = startIndex;
                this.#_previousEndIndex = endIndex;
            }
            let htmlBuffer = '';
            for (let i = startIndex; i < endIndex; ++i) {
                const [_word, _detail] = this.#_words[i];
                // const _isSelected = selectedWords.includes(_word) ? 'select' : '';
                const _isActived = _rts.activedWord === _word ? 'active' : '';
                htmlBuffer += `<li class="cls-word-item"
                    style="top:${startY + (i - startIndex) * _ITEM_HEIGHT}px;"
                    data-word="${_word}"
                    ${_isActived}>
                    ${this.#_genWordHTMLSource(i, _word, _detail)}
                </li>`;
            }
            this.#_ele_wordList.innerHTML = htmlBuffer;
        }
        this.#_updateStatus();
        //console.timeEnd('search');
    }
    #_genWordHTMLSource(index, word, detail) {
        //        <span class="tag word-tag">${detail.tags || ""}</span>
        return `<div>
                    <span class="word-num">${index + 1}</span>
                    &nbsp;&nbsp;
                    <span class="word-name">${word}</span>
                    <span class="tag word-level">${detail.level}</span>
                    <span class="word-ipa">${detail.ipa}</span>
                </div>
                <div>
                    <span class="word-meaning">${detail.meaning}</span>
                </div>`;
    }
}
export default class SectionWords extends SectionBase {
    static TIME_SHRESHOLD = 200; //ms
    #_wordsHandler;
    ele_cardContainer;
    ele_wordList;
    constructor(dict, card) {
        super("container", wordListSource, dict, card);
        this.ele_cardContainer = this.ui.get("#id-cardContainer");
        this.ele_wordList = this.ui.get('#id-wordList');
        this.#_wordsHandler = new WordsHandler(dict, this.ui, this.ele_wordList);
        let _timeStart = 0;
        let _timeEnd = 0;
        let _downElem = null;
        let _consecutiveTimes = 0;
        this.ele_wordList.addEventListener('pointerdown', (e) => {
            // logger.debug("mouse down.");
            // logger.debug(`${_elem.tagName}`);
            _timeStart = performance.now();
            if (_timeStart - _timeEnd < SectionWords.TIME_SHRESHOLD) {
                _consecutiveTimes++;
            }
            else {
                _consecutiveTimes = 0;
            }
            _downElem = SectionWords.#_selectTargetElement(e.target);
        });
        this.ele_wordList.addEventListener('pointerup', (e) => {
            // logger.debug("mouse up.");
            const _upElem = SectionWords.#_selectTargetElement(e.target);
            if (!_upElem)
                return;
            if (_upElem === _downElem) {
                _timeEnd = performance.now();
                const _timeElapsed = _timeEnd - _timeStart;
                if (_timeElapsed < SectionWords.TIME_SHRESHOLD) {
                    //logger.debug("click");
                    if (_downElem) {
                        this.#_activeWord(_downElem.dataset.word ?? "");
                    }
                    if (_consecutiveTimes === 1) {
                        _consecutiveTimes++;
                        if (isMobile()) {
                            //logger.debug("dblclick");
                            //@ts-ignore
                            window._scrollY = window.scrollY;
                            //logger.debug(`window scrollY is: ${window.scrollY}`);
                            //@ts-ignore
                            this.ui.classList.add("card-only");
                            window.scrollTo(0, 0);
                        }
                    }
                }
                else {
                    //logger.log("long click (same)");
                    // this.#_wordsHandler.highlight(_upElem);
                }
            }
            else {
                //logger.debug("long click (different)");
                // this.#_wordsHandler.highlight(_upElem);
            }
        });
        let _currentSortBtn = null;
        const ele_btnsSort = this.ui.get('#id-btnsSort');
        ele_btnsSort.addEventListener('click', (e) => {
            const _tar = e.target;
            const _ds = _tar.dataset;
            _tar.classList.add("active");
            if (_tar != _currentSortBtn) {
                _currentSortBtn?.classList.remove('active');
                _currentSortBtn = _tar;
            }
            else {
                this.#_renderSortCaption(_currentSortBtn);
            }
            const _index = Number(_ds.index);
            const _order = _ds.order;
            _rts.sortIndex = _index;
            _rts.sort[_rts.sortIndex] = _order;
            this.#_wordsHandler.chooseSortFunc(_index + "", _order);
            this.#_wordsHandler.sortWordList();
            this.#_wordsHandler.renderWords(true);
        });
        const _arr = [...ele_btnsSort.querySelectorAll("button")];
        for (let i = 0, N = _arr.length; i < N; ++i) {
            let _ds = _arr[i].dataset;
            let _o = _rts.sort[i];
            _ds.order = _o;
            _ds.caption = _arr[i].innerHTML;
            this.#_renderSortCaption(_arr[i], _o);
        }
        _currentSortBtn = _arr[_rts.sortIndex];
        _currentSortBtn.classList.add("active");
        const _ds = _currentSortBtn.dataset;
        this.#_wordsHandler.chooseSortFunc(_ds.index + "", _ds.order);
        const _fn = (e) => {
            // logger.log(e);
            this.#_wordsHandler.updateWordList();
            this.#_wordsHandler.sortWordList();
            this.#_wordsHandler.renderWords(true);
        };
        dict.addEventListener(Dictionary.EVT_WORD_ADD, _fn);
        dict.addEventListener(Dictionary.EVT_WORD_DELETE, _fn);
        dict.addEventListener(Dictionary.EVT_WORD_MODIFY, _fn);
        this.#_wordsHandler.updateWordList();
        this.#_wordsHandler.sortWordList();
        this.#_wordsHandler.renderWords(true);
    }
    #_renderSortCaption(sortBtn, targetOrder = null) {
        const _ds = sortBtn.dataset;
        if (!targetOrder) {
            targetOrder = _ds.order == "R" ? "N" : "R";
        }
        _ds.order = targetOrder;
        const _cap = _ds.caption;
        if (_cap == 'Random')
            return;
        if (targetOrder === "R") {
            sortBtn.innerHTML = _cap.split('').reverse().join('');
        }
        else {
            sortBtn.innerHTML = _cap;
        }
    }
    static #_selectTargetElement(elem) {
        while (elem) {
            if (elem?.dataset.word) {
                return elem;
            }
            elem = elem.parentElement;
        }
        return null;
    }
    #_activeWord(word) {
        const _tmp = [...this.ele_wordList.querySelectorAll("li")];
        let _activedWordElem = _tmp.filter(ele => ele.hasAttribute('active'))[0];
        if (_activedWordElem) {
            if (_activedWordElem.dataset.word === word) {
                prpc.pronounce(word);
                this._card.renderCard(word);
                return;
            }
            _activedWordElem.removeAttribute("active");
            _rts.activedWord = '';
        }
        if (!word || word.length <= 0)
            return;
        _activedWordElem = _tmp.filter(ele => ele.dataset.word === word)[0];
        if (_activedWordElem) {
            prpc.pronounce(word);
            this._card.renderCard(word);
            _activedWordElem.setAttribute("active", "");
            _rts.activedWord = word;
        }
    }
    setSync(scrollY) {
        _rts.scrollY = scrollY;
        this.#_wordsHandler.renderWords();
    }
    deactive() {
        _rts.scrollY = window.scrollY;
    }
    active() {
        window.scrollTo(0, _rts.scrollY);
        this._card.setParent(this.ele_cardContainer);
    }
    keyEvent(event) {
        const _tmp = [...this.ele_wordList.querySelectorAll("li")];
        if (_tmp.length <= 0)
            return;
        let _activedWordElem = _tmp.filter(ele => ele.hasAttribute('active'))[0];
        if (event.key === "d") {
            const _w = (_activedWordElem?.nextElementSibling ?? _tmp[0]).dataset.word ?? "";
            this.#_activeWord(_w);
        }
        else if (event.key === "e") {
            const _w = (_activedWordElem?.previousElementSibling ?? _tmp[_tmp.length - 1]).dataset.word ?? "";
            this.#_activeWord(_w);
        }
        else if (event.key === "f") {
            prpc.pronounce(_activedWordElem.dataset.word);
        }
        else if (event.key === "s") {
        }
    }
}

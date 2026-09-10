import cacher from "./cacher.js";
import cmp from "./components.js";
import Dictionary from "./dictionary.js";
import prpc from "./pronunciation.js";
import { SectionBase } from "./section-base.js";
const _source = `
<div class="bs-panel">
    ${cmp.buttonGroupSource('id-action', ['Delete All'])}
    <div class="bs-word-result-list bs-group"></div>
</div>

<div id="id-cardContainer"> </div>
`;
export default class SectionResult extends SectionBase {
    _activedWordElem = null;
    constructor(dict, nb, card) {
        super("container", _source, dict, nb, card);
        this.ui.get("#id-action").addEventListener("click", async (e) => {
            const _tar = e.target;
            if (_tar.dataset.index === "0") {
                cacher.recordsProxy.clear();
                dict.markUpload();
                this.ui.setInnerHTML(".bs-word-result-list", '');
            }
        });
        this.ui.get(".bs-word-result-list").addEventListener('click', (e) => {
            let _tar = e.target;
            //logger.debug(`${_tar.tagName}`);
            //if (_tar.classList.contains("bs-word-name")) { }
            while (_tar) {
                if (_tar.dataset.word) {
                    break;
                }
                _tar = _tar.parentElement;
            }
            if (_tar) {
                this._activeWord(_tar);
            }
        });
        this._dict.addEventListener(Dictionary.EVT_RECORD, e => {
            // logger.log(e);
            if (e.detail.action === "new") {
                this._renderResult();
            }
        });
        this._dict.addEventListener(Dictionary.EVT_DICT, e => {
            // logger.log(e);
            this._renderResult();
            if (e.detail.action === "imported") {
            }
            else if (e.detail.action === "clear") {
            }
        });
    }
    _activeWord(wordElem) {
        if (this._activedWordElem === wordElem)
            return;
        if (this._activedWordElem) {
            this._activedWordElem.removeAttribute("active");
        }
        this._activedWordElem = wordElem;
        if (this._activedWordElem) {
            this._activedWordElem.setAttribute('active', "");
            this._card.renderCard(this._activedWordElem.dataset.word);
        }
    }
    setSync(scrollY) {
        cacher.localProxy.set('sec_record.scrollY', scrollY);
    }
    deactive() {
        cacher.localProxy.set('sec_record.scrollY', window.scrollY);
    }
    active() {
        window.scrollTo(0, cacher.localProxy.get('sec_record.scrollY', 0) ?? 0);
        const ele_card = this.ui.get("#id-cardContainer");
        this._card.setParent(ele_card);
    }
    keyEvent(event) {
        if (!this._activedWordElem)
            return;
        if (event.key === "d") {
            this._activeWord(this._activedWordElem.nextElementSibling);
        }
        else if (event.key === "e") {
            this._activeWord(this._activedWordElem.previousElementSibling);
        }
        else if (event.key === "a") {
            prpc.pronounce(this._activedWordElem.dataset.word);
        }
    }
    _renderResult() {
        const _record = this._dict.getRecords();
        let _s = '';
        for (const [word, detail] of Object.entries(_record)) {
            const wordAccuracy = detail.attempt === 0 ? 0 : Math.round(detail.correct * 100 / detail.attempt);
            _s += `<div class="bs-word-result" data-word="${word}">
    <div class="bs-word-name"> ${word} </div>
    ${cmp.progressBarSource("", wordAccuracy)}
</div>`;
        }
        ;
        this.ui.setInnerHTML(".bs-word-result-list", _s);
    }
}

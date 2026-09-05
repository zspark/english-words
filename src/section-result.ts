
import cacher from "./cacher.js"
import cmp from "./components.js"
import Dictionary from "./dictionary.js"
import prpc from "./pronunciation.js"
import Card from "./card.js"
import { SectionBase, SectionUIBase } from "./section-base.js"

const _rts = cacher.localProxy.get('sec_record', {});
_rts.scrollY = _rts.scrollY || 0;

const _source = `
<div class="bs-panel">
    ${cmp.buttonGroupSource('id-action', ['Delete All'])}
    <div class="bs-word-result-list bs-group"></div>
</div>

<div id="id-cardContainer"> </div>
`;

export default class SectionResult extends SectionBase {

    _activedWordElem: Element | null = null;

    constructor(dict: Dictionary, card: Card) {

        super("container", _source, dict, card);

        this.ui.get("#id-action").addEventListener("click", async e => {
            const _tar = e.target as HTMLElement;
            if (_tar.dataset.index === "0") {
                cacher.recordsProxy.clear();
                dict.markUpload();
                this.ui.setInnerHTML(".bs-word-result-list", '');
            }
        })

        this.ui.get(".bs-word-result-list").addEventListener('click', (e) => {
            let _tar = e.target as HTMLElement | null;
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


        card.addEventListener(Card.CARD_EVT_WORD, (e) => {
            let _target: HTMLElement | null = null;
            this.ui.getAll("div.bs-word-result").find(ele => {
                if (ele.dataset.word === (e as CustomEvent).detail.currentWord) {
                    _target = ele;
                    return;
                }
            });
            this._activeWord(_target);
        });

        this._dict.addEventListener(Dictionary.EVT_RECORD, e => {
            // logger.log(e);
            if ((e as CustomEvent).detail.action === "new") {
                this._renderResult();
            }
        });

        this._dict.addEventListener(Dictionary.EVT_DICT, e => {
            // logger.log(e);
            this._renderResult();
            if ((e as CustomEvent).detail.action === "imported") {
            } else if ((e as CustomEvent).detail.action === "clear") {
            }
        });
    }

    _activeWord(wordElem: Element | null): void {
        if (this._activedWordElem === wordElem) return;

        if (this._activedWordElem) {
            this._activedWordElem.removeAttribute("active");
        }
        this._activedWordElem = wordElem;
        if (this._activedWordElem) {
            this._activedWordElem.setAttribute('active', "");
            this._card.renderCard((this._activedWordElem as HTMLElement).dataset.word as string)
        }
    }

    setSync(scrollY: number): void {
        _rts.scrollY = scrollY;
    }

    deactive(): void {
        _rts.scrollY = window.scrollY;
    }

    active(): void {
        window.scrollTo(0, _rts.scrollY);
        const ele_card = this.ui.get("#id-cardContainer");
        this._card.setParent(ele_card);
    }

    keyEvent(event: KeyboardEvent): void {
        if (!this._activedWordElem) return;

        if (event.key === "d") {
            this._activeWord(this._activedWordElem.nextElementSibling);
        } else if (event.key === "e") {
            this._activeWord(this._activedWordElem.previousElementSibling);
        } else if (event.key === "a") {
            prpc.pronounce((this._activedWordElem as HTMLElement).dataset.word as string)
        }
    }

    _renderResult(): void {
        const _record = this._dict.getRecords();
        let _s = '';
        for (const [word, detail] of Object.entries(_record)) {
            const wordAccuracy = detail.attempt === 0 ? 0 : Math.round(detail.correct * 100 / detail.attempt);


            _s += `<div class="bs-word-result" data-word="${word}">
    <div class="bs-word-name"> ${word} </div>
    ${cmp.progressBarSource("", wordAccuracy)}
</div>`
        };
        this.ui.setInnerHTML(".bs-word-result-list", _s);
    }
}



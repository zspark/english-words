

function initResultSection(dictionary, cmp, card, pronunciation) {

    const _rts = dictionary.getLocalData('sec_record');
    _rts.scrollY = _rts.scrollY || 0;

    const _source = `
<div class="bs-panel">
    ${cmp.buttonGroupSource('id-action', ['Delete All'])}
    <div class="bs-word-result-list bs-group"></div>
</div>

<div id="id-cardContainer"> </div>
`;

    const ele_root = document.createElement('div');
    ele_root.className = "container";
    ele_root.innerHTML = _source;

    const listElem = ele_root.querySelector(".bs-word-result-list");
    const ele_card = ele_root.querySelector("#id-cardContainer");

    const ele_action = ele_root.querySelector("#id-action");
    ele_action.addEventListener("click", async e => {
        if (e.target.dataset.index === "0") {
            dictionary.clearRecords();
            listElem.innerHTML = '';
        }
    })

    listElem.addEventListener('click', (e) => {
        let _elem = e.target;
        //logger.debug(`${_elem.tagName}`);

        //if (_elem.classList.contains("bs-word-name")) { }
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

    let _activedWordElem = null;
    function _activeWord(wordElem) {
        if (_activedWordElem === wordElem) return;

        if (_activedWordElem) {
            _activedWordElem.removeAttribute("active");
        }
        _activedWordElem = wordElem;
        if (_activedWordElem) {
            _activedWordElem.setAttribute('active', "");
            card.renderCard(_activedWordElem.dataset.word)
        }
    }

    function setSync(scrollY) {
        _rts.scrollY = scrollY;
    }
    function deactive() {
        _rts.scrollY = window.scrollY;
    }

    function active() {
        window.scrollTo(0, _rts.scrollY);
        ele_card.replaceChildren(card.ele_root)
    }

    function keyEvent(event) {
        if (!_activedWordElem) return;

        if (event.key === "d") {
            _activeWord(_activedWordElem.nextElementSibling);
        } else if (event.key === "e") {
            _activeWord(_activedWordElem.previousElementSibling);
        } else if (event.key === "a") {
            pronunciation.pronounce(_activedWordElem?.dataset.word)
        }
    }

    function _renderResult() {
        const _record = dictionary.getRecords();
        let _s = '';
        for (const [word, detail] of Object.entries(_record)) {
            const wordAccuracy = detail.attempts === 0 ? 0 : Math.round(detail.correct * 100 / detail.attempts);


            _s += `<div class="bs-word-result" data-word="${word}">
    <div class="bs-word-name"> ${word} </div>
    ${cmp.progressBarSource("", wordAccuracy)}
</div>`
        };

        listElem.innerHTML = _s;
    }

    card.addEventListener(card.EVT_WORD, e => {
        const eleArray = ele_root.querySelectorAll("div.bs-word-result");
        let _target = null;
        eleArray.forEach(ele => {
            if (ele.dataset.word === e.detail.currentWord) {
                _target = ele;
                return;
            }
        });
        _activeWord(_target);
    });

    dictionary.addEventListener(dictionary.EVT_RECORD, e => {
        // logger.log(e);
        if (e.detail.action === "new") {
            _renderResult();
        }
    });

    dictionary.addEventListener(dictionary.EVT_DICT, e => {
        // logger.log(e);
        _renderResult();
        if (e.detail.action === "imported") {
        } else if (e.detail.action === "delete") {
        }
    });

    _renderResult()
    return {
        ele_root,
        setSync,
        active,
        deactive,
        keyEvent,
    }
}



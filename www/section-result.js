

function initResultSection(dictionary, cmp, card, pronunciation) {

    const _source = `
<div id="panel-left" class="panel-left">
    <div class="bs-word-result-list bs-group"></div>
</div>

<div id="panel-right" class="panel-right">
</div>
`;

    const ele_root = document.createElement('div');
    ele_root.className = "container";
    ele_root.innerHTML = _source;

    const listElem = ele_root.querySelector(".bs-word-result-list");
    const ele_panel = ele_root.querySelector("#panel-right");

    listElem.addEventListener('click', (e) => {
        let _elem = e.target;
        //console.debug(`${_elem.tagName}`);

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
        if (!wordElem) return;
        if (_activedWordElem === wordElem) return;

        if (_activedWordElem) {
            _activedWordElem.removeAttribute("active");
        }
        _activedWordElem = wordElem
        _activedWordElem.setAttribute('active', "");

        card.renderCard(wordElem.dataset.word)
    }

    function update() {
        const c = ele_root.isConnected;
        if (c) {
            ele_root.remove()
        }
        _renderResult()
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
            pronunciation.pronounce(_activedWordElem?.dataset.word)
        } else if (event.key === "s") {
        }
    }

    function _renderResult() {
        const _record = dictionary.getRecords();
        let _s = '';
        for (const [word, detail] of Object.entries(_record)) {
            const wordAccuracy = detail.attempts === 0 ? 0 : Math.round(detail.correct * 100 / detail.attempts);

            _s += `
            <div class="bs-word-result" data-word="${word}">
                <div class="bs-word-name"> ${word} </div>
                ${cmp.progressBarSource("", wordAccuracy)}
            </div>
            `
        };

        listElem.innerHTML = _s;
    }

    return {
        ele_root,
        update,
        keyEvent,
    }
}



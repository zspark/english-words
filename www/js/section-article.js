

function initArticleSection(ai, dictionary, cmp, card, pronunciation) {
    function _getRTS() {
        _rts = dictionary.getLocalData('sec_article');
        _rts.scrollY = _rts.scrollY || 0;
    }
    _getRTS()

    const articleSource = `
<div class="bs-panel lh2p4">
    ${cmp.buttonGroupSource('id-action', ['Generate'])}
    <div id="article-content"></div>
</div>

<div id="id-cardContainer"> </div>
</div>`

    const ele_root = document.createElement('div');
    ele_root.className = "container";
    ele_root.innerHTML = articleSource;
    const ele_action_gen = ele_root.querySelector("#id-action");
    const ele_article = ele_root.querySelector("#article-content");
    const ele_card = ele_root.querySelector("#id-cardContainer");

    ele_action_gen.addEventListener("click", async (e) => {
        if (e.target.dataset.index === "0") {
            // alert("Function is under construction!");
            const pickedArray = section_words.getSelectedWords();

            if (pickedArray.length === 0) {
                alert('Pick some words first, then give it a go!');
                return;
            }

            ele_action_gen.disabled = true;
            ele_article.innerHTML = "AI is generating articles ...";
            const resultText = await ai.genArticle(pickedArray.join(', '));
            if (resultText) {
                dictionary.setArticle(resultText, true);
            }
            _renderArticle();

            ele_action_gen.disabled = false;

        }
    });

    /*
    const easyWords = new Set(`
a an the and or but if then else
of to in on at by for from with
is am are was were be been being
do does did have has had
i you he she it we they
me him her us them
my your his its our their
this that these those
who what which when where why how
can could will would shall should
may might must
not no yes
very more most some any all
one two three first last
as so than too also
up down out over under
here there
get got make made take took
go went come came see saw
say said know knew think thought
want need use used
good bad big small new old
easy hard long short high low
`.trim().split(/\s+/));
*/

    function _getWordUnderCursor(e) {
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (!range || range.startContainer.nodeType !== Node.TEXT_NODE)
            return null;

        const text = range.startContainer.textContent;
        const pos = range.startOffset;
        const before = text.slice(0, pos);
        const after = text.slice(pos);
        const left = before.match(/[\w'-]+$/)?.[0] ?? "";
        const right = after.match(/^[\w'-]+/)?.[0] ?? "";
        const word = (left + right).toLowerCase();

        /*
        if (!word || easyWords.has(word)) {
            // logger.debug(`ignored word: ${word}`);
            return null;
        }
        */
        return word;
    }

    let ele_actived_word = null;
    ele_article.addEventListener("click", (e) => {
        let ele_clicked = e.target
        if (ele_clicked.tagName === "SPAN") {
            ele_actived_word?.removeAttribute("active")
            ele_actived_word = ele_clicked;
            ele_clicked.setAttribute("active", '');

            card.renderCard(ele_clicked.outerText)
            return;
        }

        if (e.ctrlKey) {
            const _w = _getWordUnderCursor(e)
            if (_w) {
                card.renderCard(_w)
            }
        }
    });
    ele_article.addEventListener("dblclick", (e) => {
        const _w = _getWordUnderCursor(e)
        if (_w) {
            card.renderCard(_w)
        }
    });

    function _renderArticle() {
        const _paragraphs = dictionary.getArticle()?.split(/\n/).filter(para => para.trim() !== '');
        const finalHtml = _paragraphs?.map(para => { return `<p>${para}</p>`; }).join('');

        ele_article.innerHTML = finalHtml ?? "";
    }

    function setSync(scrollY) {
        _rts.scrollY = scrollY;
    }
    function deactive() {
        _rts.scrollY = window.scrollY;
    }
    function active() {
        window.scrollTo(0, _rts.scrollY);
        _renderArticle();
        ele_card.replaceChildren(card.ele_root)
    }

    function keyEvent(event) {
        if (event.key === "Delete") {
            if (event.ctrlKey) {
            }
        }
    }

    dictionary.addEventListener(dictionary.EVT_DICT, (e) => {
        // logger.debug("[article]");
        if (e.detail.action === "exported") return;
        _getRTS();
        if (ele_root.isConnected) {
            _renderArticle();
        }
    });

    return {
        ele_root,
        setSync,
        active,
        deactive,
        keyEvent,
    }
}

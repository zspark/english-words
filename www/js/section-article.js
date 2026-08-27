

function initArticleSection(ai, dictionary, cmp, card, pronunciation, serverProxy) {
    function _getRTS() {
        _rts = dictionary.getLocalData('sec_article');
        _rts.scrollY = _rts.scrollY || 0;
    }
    _getRTS()

    const articleSource = `
<div class="bs-panel lh2p4">
    <div class="word-header">
        <div class="controls">
            ${cmp.buttonGroupSource('id-action-2', ['Read', 'Edit'])}
        </div>
        <div class="controls">
            ${cmp.buttonGroupSource('id-action', ['Generate'])}
        </div>
    </div>
    <div id="article-container">
        <div id="article-content"></div>
        ${cmp.textareaSource("article-input", null, 'h300px', "Paste article to read.")}
    </div>
</div>

<div id="id-cardContainer"> </div>
</div>`

    const ele_root = document.createElement('div');
    ele_root.className = "container";
    ele_root.innerHTML = articleSource;
    const ele_action_gen = ele_root.querySelector("#id-action");
    const ele_container = ele_root.querySelector("#article-container");
    const ele_article = ele_root.querySelector("#article-content");
    const ele_input = ele_root.querySelector("#article-input");
    ele_input.remove();
    const ele_inputArea = ele_input.querySelector("textarea");
    const ele_card = ele_root.querySelector("#id-cardContainer");

    const ele_action = ele_root.querySelector("#id-action-2");
    let _currentSortBtn = [...ele_action.querySelectorAll("button")][0];
    ele_action.addEventListener('click', (e) => {
        e.target.classList.add("active");
        if (e.target != _currentSortBtn) {
            _currentSortBtn?.classList.remove('active');
            _currentSortBtn = e.target;
        }
        if (e.target.dataset.index === "0") {
            serverProxy.getNews();
            /*
            const _text = ele_inputArea.value.trim();
            dictionary.setArticle(_text, true);
            _renderArticle(_text);
            */
            ele_container.replaceChildren(ele_article);
        } else if (e.target.dataset.index === "1") {
            const _paragraphs = dictionary.getArticle() ?? "";
            ele_inputArea.value = _paragraphs;
            ele_container.replaceChildren(ele_input);
        }
    });
    _currentSortBtn.classList.add("active");

    serverProxy.addEventListener(serverProxy.EVT_NEWS, (e) => {
        logger.debug(e.detail.data);
        _renderRNZNews(e.detail.data);
    })

    function _renderRNZNews(content) {
        let _str = '';
        content.content.forEach(str => {
            _str += `<p>${str}<\p>`;
        });

        //<p id="news-description" class="news-description">${content.description}</p>
        ele_article.innerHTML = `<article class="news-article">
    <h1 id="news-title">${content.title}</h1>

    <div class="news-meta">
        <time id="news-date">${content.pub_date}</time>
    </div>

    <div id="news-content" class="news-content">${_str}</div>

    <a id="news-link" class="news-source" target="_blank" rel="noopener noreferrer">
        ${content.link}
    </a>
</article>`;

    }

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
        ele_card.replaceChildren(card.ele_root)
    }

    function keyEvent(event) { }

    dictionary.addEventListener(dictionary.EVT_DICT, (e) => {
        // logger.debug("[article]");
    });

    _renderArticle();

    return {
        ele_root,
        setSync,
        active,
        deactive,
        keyEvent,
    }
}

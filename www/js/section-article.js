

function initArticleSection(ai, dictionary, cmp, card, pronunciation, serverProxy, lemmatizer) {
    function _getRTS() {
        _rts = dictionary.getLocalData('sec_article');
        _rts.scrollY = _rts.scrollY || 0;
    }
    _getRTS()

    const articleSource = `
<div class="bs-panel lh2p4">
    <div class="word-header">
        <div class="controls">
            ${cmp.buttonGroupSource('id-action', ['Generate'])}
        </div>
        <div class="controls">
            ${cmp.buttonGroupSource('id-action-2', ['RSS'])}
            ${cmp.dropdownSource("id-tagRSS", null, ["RNZ", "XXX"], 0)}
        </div>
    </div>
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
    const ele_RSSVendor = ele_root.querySelector('#id-tagRSS select');

    const ele_action = ele_root.querySelector("#id-action-2");
    ele_action.addEventListener('click', (e) => {
        if (e.target.dataset.index === "0") {
            const _vendor = ele_RSSVendor.value;
            serverProxy.getNews(_vendor);
        }
    });

    serverProxy.addEventListener(serverProxy.EVT_NEWS, (e) => {
        logger.debug(e.detail.data);
        _renderNews(e.detail.data);
    })

    function _renderNews(content) {
        content = content ?? {
            content: [
                "At least five New Zealanders have been reported missing following a ",
                "flash flood and landslide",
                " hit the Nepal-China border that killed at least 162 people.",
                "Former Honorary Consul of Nepal to Auckland Dinesh Khadka told RNZ Nepal Police had given him the names of five New Zealanders unaccounted for.",
                "Follow updates in our live blog below:",
                "Are you or is someone you know affected? Email",
                " iwitness@rnz.co.nz",
                "Prime Minister Christopher Luxon described the images coming out of Nepal and China as &quot;heartbreaking&quot; and said New Zealand is in touch with Nepal authorities about New Zealanders who may be affected.",
                "&quot;My deep condolences to those affected and to impacted communities,&quot; he wrote in a post on X.",
                "Foreign Minister Winston Peters echoed his sentiments, saying New Zealand is &quot;deeply concerned&quot;.",
                "Rescuers carry in their arms a flood survivor, following flash floods and a landslide disaster in Nepal.",
                "PRAKASH MATHEMA",
                "Aid workers said entire settlements had been &quot;wiped out&quot;. Surveillance footage verified by AFP shows dozens of people running for their lives as a stories-tall surge of debris slammed into the Chinese side of a border area, tossing lorries and buses aside.",
                "A resident walks along a street covered in mud following flash floods and a landslide disaster in Devighat.",
                "PRAKASH MATHEMA",
                "Chinese state media reported &quot;major casualties&quot; from a mudslide at a Tibet border hub, reporting three dead and another 265 people missing.",
                "Nepali police said that they had recovered 157 bodies after &quot;devastating floods&quot;, with officers &quot;working to move families in flood-risk areas... to safer locations.&quot;",
                "In a post on social media, humanitarian organisation the Himalayan Trust said they were &quot;deeply saddened&quot; by news of the flood.",
                "&quot;The flood originated by the Tibetan border impacting the Bhote Koshi valley. This is in the Langtang region halfway between Mt Everest and Mt Annapurna.",
                "&quot;The scale of the loss is heartbreaking,&quot; they wrote.",
                "&quot;Our thoughts are with everyone affected, and with the Nepali rescue teams working in extraordinarily difficult conditions.&quot;"
            ],
            description: "The three Otago councils say they are now seeking clarification about what will be explored as an alternative to the accommodation levy.",
            link: "https://www.rnz.co.nz/news/political/1153984/otago-councils-pause-regional-deals-after-national-backtracks-on-bed-tax",
            pub_date: "Thu, 27 Aug 2026 20:23:49 +1200",
            title: "Otago councils pause regional deals after National backtracks on bed tax",
        };

        let _str = '';
        let _s = content.content[0];
        for (let i = 1, N = content.content.length - 1; i < N; ++i) {
            let str = content.content[i];
            if (str[0] != " " && str[0] === str[0].toUpperCase()) {
                _str += `<p>${_s}<\p>`;
                _s = "";
            }
            _s += str;
        }
        _str += `<p>${_s}<\p>`;

        //<p id="news-description" class="news-description">${content.description}</p>
        ele_article.innerHTML = `<article class="news-article">
    <h1 id="news-title">${content.title}</h1>

    <div class="news-meta">
        <time id="news-date">${content.pub_date}</time>
        <span><a href="${content.link}" target="_blank">link<a></span>
    </div>

    <div id="news-content" class="news-content">${_str}</div>
</article>`;
    }

    ele_action_gen.addEventListener("click", async (e) => {
        if (e.target.dataset.index === "0") {
            // alert("Function is under construction!");
            const pickedArray = section_words.getSelectedWords();

            if (pickedArray.length === 0) {
                logger.error('Pick some words first, then give it a go!');
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
            const _w = lemmatizer.lemmatize(_getWordUnderCursor(e))
            if (_w) {
                card.renderCard(_w)
            }
        }
    });
    ele_article.addEventListener("dblclick", (e) => {
        const _w = lemmatizer.lemmatize(_getWordUnderCursor(e))
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

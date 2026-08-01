

function initArticleSection(ai, dictionary, cmp, card, pronunciation) {
    function _getRTS() {
        _rts = dictionary.getRuntimeStatus('sec_article');
        _rts.generatedArticle = _rts.generatedArticle || "";
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
            ele_article.innerHTML = "AI正在构思故事中...";
            const resultText = await ai.genArticle(pickedArray.join(', '));
            if (resultText) {
                _rts.generatedArticle = resultText;
                dictionary.saveRuntimeStatus();
            }
            _renderArticle();

            ele_action_gen.disabled = false;

        }
    });


    let ele_actived_word = null;
    ele_article.addEventListener("click", (e) => {
        let ele_clicked = e.target
        if (ele_clicked.tagName === "SPAN") {
            ele_actived_word?.removeAttribute("active")
            ele_actived_word = ele_clicked;
            ele_clicked.setAttribute("active", '');

            card.renderCard(ele_clicked.outerText)
        }
    });

    function _renderArticle() {
        const _paragraphs = _rts.generatedArticle?.split(/\n/).filter(para => para.trim() !== '');
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

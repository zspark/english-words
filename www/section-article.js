

function initArticleSection(ai, dictionary, cmp, card) {

    const _rts = dictionary.getRuntimeStatus('sec_article');
    _rts.generatedArticle = _rts.generatedArticle || "";

    const articleSource = `
<div id="panel-left" class="panel-left lh2p4">
    ${cmp.buttonGroupSource('id-action', ['Clear', 'Generate', 'Delete'])}
    <div id="article-content"></div>
</div>

<div id="panel-right" class="panel-right">
</div>`



    const ele_root = document.createElement('div');
    ele_root.className = "container";
    ele_root.innerHTML = articleSource;
    const ele_action_gen = ele_root.querySelector("#id-action");
    const ele_article = ele_root.querySelector("#article-content");
    const ele_panel = ele_root.querySelector("#panel-right");

    ele_action_gen.addEventListener("click", async (e) => {
        if (e.target.dataset.index === "1") {
            const pickedArray = section_words.getSelectedWords();

            if (pickedArray.length === 0) {
                alert('请先勾选一些单词，再尝试生成短文！');
                return;
            }

            ele_action_gen.disabled = true;
            ele_article.innerHTML = "AI正在构思故事中...";

            const wordsListString = pickedArray.join(', ');
            const _question = `你是一个优秀的英语创意写作导师。

请使用以下指定的英语单词串联编写一篇简短、流畅且富有创意的英语短文或小故事（字数在 100-150 字左右）。
必须包含的单词是：[ ${wordsListString} ]。
要求：
 1. 文中的这些目标单词请用<span class="word">（HTML元素）标注出来。
 2. 语言要自然，不要生硬堆砌。
 3. 指定单词可以重复。
 4. 必要的时候用\n开启新的段落。
`;
            const resultText = await ai.askChatGPT(_question);
            _rts.generatedArticle = resultText;
            dictionary.saveRuntimeStatus();
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

    function update() {
        const c = ele_root.isConnected;
        if (c) {
            ele_root.remove()
        }
        _renderArticle();
        ele_panel.replaceChildren(card.ele_root)

        if (c) {
            ele_container.replaceChildren(ele_root)
        }
    }

    function keyEvent(event) {
        // if (!_activedWordElem) return;

        if (event.key === "d") {
            // _activeWord(_activedWordElem.nextElementSibling);
        } else if (event.key === "e") {
            // _activeWord(_activedWordElem.previousElementSibling);
        } else if (event.key === "f") {
            card.pronounceShownWord();
        } else if (event.key === "s") {
            // _toggleWordSelection(_activedWordElem, true);
            // _updateStatus();
        }

    }

    return {
        ele_root,
        update,
        keyEvent,
    }
}

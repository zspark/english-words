import logger from "./logger.js"
import ai from "./ai.js"
import Dictionary from "./dictionary.js"
import cacher from "./cacher.js"
import serverProxy from "./server-proxy.js"
import cmp from "./components.js"
import words from "./section-words.js"
import Card from "./card.js"
import { lemmatize } from "./lemmatize.js"
import { ArticleContentType, HTMLString, Detail, Words, Results, Result, Dict, DictSyncDataSC, DictSyncData, ResponseData, ResponseEvent } from "./types.js"
import { SectionBase, SectionUIBase } from "./section-base.js"

const _rts = cacher.localProxy.get('sec_article', {});
_rts.scrollY = _rts.scrollY || 0;

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

export default class SectionArticle extends SectionBase {

    constructor(dict: Dictionary, card: Card) {
        super("container", articleSource, dict, card);

        this.ui.get("#id-action").addEventListener("click", async (e) => {
            const _tar = e.target as HTMLButtonElement;
            if (_tar.dataset.index === "0") {
                // alert("Function is under construction!");
                const pickedArray: string[] = [];
                if (pickedArray.length === 0) {
                    logger.error('Pick some words first, then give it a go!');
                    return;
                }

                _tar.disabled = true;
                ele_article.innerHTML = "AI is generating articles ...";
                const resultText = await ai.genArticle(pickedArray.join(', '));
                if (resultText) {
                    this.#_setArticle(resultText);
                }
                this._renderArticle();

                _tar.disabled = false;
            }
        });


        this.ui.get("#id-action-2").addEventListener('click', (e) => {
            if ((e.target as HTMLElement)?.dataset.index === "0") {
                const ele_RSSVendor = this.ui.get<HTMLInputElement>('#id-tagRSS select');
                const _vendor = ele_RSSVendor.value;
                serverProxy.getNews(_vendor);
            }
        });

        this._dict.addEventListener(Dictionary.EVT_DICT, (e) => {
            // logger.debug("[article]");
        });

        serverProxy.addEventListener(serverProxy.EVT_NEWS, (e) => {
            //@ts-ignore
            const _v = e.detail.data as ArticleContentType;
            // logger.debug(_v);
            this._renderNews(_v);
        })

        const _renderWord = (e: MouseEvent): void => {
            let _w = this._getWordUnderCursor(e);
            if (!this._dict.hasWord(_w)) {
                _w = lemmatize(_w)
            }
            if (_w) {
                card.renderCard(_w)
            }
        }
        let ele_actived_word: HTMLElement;
        const ele_article = this.ui.get("#article-content");
        ele_article.addEventListener("click", (e) => {
            let ele_clicked = e.target as HTMLElement;
            if (ele_clicked.tagName === "SPAN") {
                ele_actived_word?.removeAttribute("active")
                ele_actived_word = ele_clicked;
                ele_clicked.setAttribute("active", '');

                card.renderCard(ele_clicked.outerText)
                return;
            }

            if (e.ctrlKey) {
                _renderWord(e);
            }
        });
        ele_article.addEventListener("dblclick", (e) => {
            _renderWord(e);
        });

    }

    #_setArticle(content: string) {
        cacher.metaProxy.set("article", content);
    }


    _renderNews(content: ArticleContentType): void {
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
        this.ui.setInnerHTML("#article-content",
            `<article class="news-article">
    <h1 id="news-title">${content.title}</h1>

    <div class="news-meta">
        <time id="news-date">${content.pub_date}</time>
        <span><a href="${content.link}" target="_blank">link<a></span>
    </div>

    <div id="news-content" class="news-content">${_str}</div>
</article>`);
    }

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

    _getWordUnderCursor(e: MouseEvent): string {
        const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
        if (!pos || pos.offsetNode.nodeType !== Node.TEXT_NODE)
            return '';

        const text = pos.offsetNode.textContent;
        const offset = pos.offset;
        const before = text?.slice(0, offset);
        const after = text?.slice(offset);
        const left = before?.match(/[\w'-]+$/)?.[0] ?? '';
        const right = after?.match(/^[\w'-]+/)?.[0] ?? '';

        return (left + right).toLowerCase();
    }

    _renderArticle(): void {
        const _ar = cacher.metaProxy.get("article", "") as string;
        const _paragraphs = _ar.split(/\n/).filter(para => para.trim() !== '');
        const finalHtml = _paragraphs?.map(para => { return `<p>${para}</p>`; }).join('');
        this.ui.setInnerHTML("#article-content", finalHtml ?? "");
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

    keyEvent(event: Event): void { }
}


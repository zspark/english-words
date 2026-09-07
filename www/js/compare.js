import { cloneDetail } from "./utils.js";
import cmp from "./components.js";
const compareET = new EventTarget();
const EVT_CMP_DELETE = "EVT_CMP_DELETE";
const EVT_CMP_MODIFY = "EVT_CMP_MODIFY";
export { compareET, EVT_CMP_DELETE, EVT_CMP_MODIFY };
export default class Compare {
    constructor(clientDetail, serverDetail, action) {
        let _elem;
        if (action === "modify") {
            _elem = cmp.showMask(this.#genHTMLString(clientDetail, serverDetail), "Prefer Left", (e) => {
                compareET.dispatchEvent(new CustomEvent(EVT_CMP_MODIFY, {
                    detail: {
                        client: clientDetail,
                        server: serverDetail,
                        perfer: "client",
                        detail: cloneDetail(clientDetail, serverDetail.time_modify, serverDetail.time_create),
                        word: serverDetail.word,
                    }
                }));
            }, "Prefer Right", (e) => {
                compareET.dispatchEvent(new CustomEvent(EVT_CMP_MODIFY, {
                    detail: {
                        client: clientDetail,
                        server: serverDetail,
                        perfer: "server",
                        detail: serverDetail,
                        word: serverDetail.word,
                    }
                }));
            });
        }
        else {
            _elem = cmp.showMask(this.#genHTMLString(clientDetail, serverDetail), "Delte", (e) => {
                compareET.dispatchEvent(new CustomEvent(EVT_CMP_DELETE, {
                    detail: {
                        perfer: "delete",
                        detail: serverDetail,
                        word: serverDetail.word,
                    }
                }));
            }, "Update", (e) => {
                compareET.dispatchEvent(new CustomEvent(EVT_CMP_DELETE, {
                    detail: {
                        client: clientDetail,
                        server: serverDetail,
                        perfer: "server",
                        detail: serverDetail,
                        word: serverDetail.word,
                    }
                }));
            });
        }
        _elem.firstElementChild?.classList.add("w-90pct");
    }
    #genHTMLString(a, b) {
        return `
<div id="card-display" class="card horizon">
    <div id="id_detail_a" class="mt10px">
        <div id="vocab">${a.word}</div>
        <div class="vocab-header mt10px">
            <div id="level" class="tag word-level">${a.level}</div>
            <div id="tags" class="tag word-tag">${a.tags}</div>
        </div>
        <div id="ipa">${a.ipa}</div>
        <div id="meaning">${a.meaning}</div>
        <div id="note">${a.note}</div>
        <div id="linked-words">${a.links}</div>
    </div>
    <div id="id_detail_b" class="mt10px">
        <div id="vocab">${b.word}</div>
        <div class="vocab-header mt10px">
            <div id="level" class="tag word-level">${b.level}</div>
            <div id="tags" class="tag word-tag">${b.tags}</div>
        </div>
        <div id="ipa">${b.ipa}</div>
        <div id="meaning">${b.meaning}</div>
        <div id="note">${b.note}</div>
        <div id="linked-words">${b.links}</div>
    </div>
</div>`;
    }
}

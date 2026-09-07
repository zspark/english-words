
import { cloneDetail } from "./utils.js"
import { ActionWord, HTMLString, Detail } from "../types.d.js"
import cmp from "./components.js"

type CompareResult = {
    client: Detail,
    server: Detail,
    prefer: "client" | "server" | "delete" | "modify",
    detail: Detail,
    word: string,
}
const compareET = new EventTarget();
const EVT_CMP_DELETE: string = "EVT_CMP_DELETE";
const EVT_CMP_MODIFY: string = "EVT_CMP_MODIFY";

export { compareET, EVT_CMP_DELETE, EVT_CMP_MODIFY, CompareResult }

export default class Compare {

    constructor(clientDetail: Detail, serverDetail: Detail, action: ActionWord) {
        if (action === "modify") {
            cmp.showMask(this.#genHTMLString(clientDetail, serverDetail),
                "Prefer Left", (e) => {
                    compareET.dispatchEvent(new CustomEvent(EVT_CMP_MODIFY, {
                        detail: {
                            client: clientDetail,
                            server: serverDetail,
                            perfer: "client",
                            detail: cloneDetail(clientDetail, serverDetail.time_modify, serverDetail.time_create),
                            word: serverDetail.word,
                        }
                    }));
                },
                "Prefer Right", (e) => {
                    compareET.dispatchEvent(new CustomEvent(EVT_CMP_MODIFY, {
                        detail: {
                            client: clientDetail,
                            server: serverDetail,
                            perfer: "server",
                            detail: serverDetail,
                            word: serverDetail.word,
                        }
                    }));
                }
            )
        } else {
            cmp.showMask(this.#genHTMLString(clientDetail, serverDetail),
                "Delte", (e) => {
                    compareET.dispatchEvent(new CustomEvent(EVT_CMP_DELETE, {
                        detail: {
                            perfer: "delete",
                            detail: serverDetail,
                            word: serverDetail.word,
                        }
                    }));
                },
                "Update", (e) => {
                    compareET.dispatchEvent(new CustomEvent(EVT_CMP_DELETE, {
                        detail: {
                            client: clientDetail,
                            server: serverDetail,
                            perfer: "server",
                            detail: serverDetail,
                            word: serverDetail.word,
                        }
                    }));
                }
            )
        }
    }

    #genHTMLString(a: Detail, b: Detail): HTMLString {
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


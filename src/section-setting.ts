import logger from "./logger.js"
import ai from "./ai.js"
import cacher from "./cacher.js"
import serverProxy from "./server-proxy.js"
import { Detail, Words, Results, Result, Dict, DictSyncDataSC, DictSyncData, ResponseData, ResponseEvent } from "./types.js"
import cmp from "./components.js"
import Dictionary from "./dictionary.js"
import Card from "./card.js"
import { SectionBase, SectionUIBase } from "./section-base.js"

type LocalSettingCacheType = {
    syncInterval: number,
    ai_key: string,
    ai_provider: string,
    userID: string,
    theme: boolean,
}

const _localProxy = cacher.localProxy;
const _localData: LocalSettingCacheType = _localProxy.get('sec_setting', {});
const _metaProxy = cacher.metaProxy;
const _proxy = cacher.lemmatizerProxy;

function _getTags(): string[] { return _metaProxy.get('tags', []) as string[]; }


const _jsonSource = `
${cmp.textareaSource("import-ai", null, 'h300px', "Input words that you wanna import into your database. Words are separated with english comma (,)\n\nBetter not more than 50 words.")}
${cmp.textareaSource("import-text", null, 'h300px', "Paste your JSON database content here.")}
<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-modal-submit', ['Generate', 'Append'])}
</div>`;


const _fileSource = `
<input type="file" id="import-file" accept=".json" class="bs-file-input" style="display:none;">

<label for="import-file" class="bs-file-box h300px">
    <div class="bs-file-icon">📁</div>
    <div class="bs-file-title">Click to Select File</div>
    <div class="bs-file-desc"> Only Supports .json</div>
</label>

<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-file-submit', ['Export', 'Delete'])}
</div>`;

const _configSource = `
${cmp.inputSource("id-tags", "Tags", "input tags, separate with ','", false)}
${cmp.inputSource("id-userID", "User Account", "input user account.", false)}
${cmp.inputSource("id-syncInterval", "Sync Interval (seconds)", "<= 0 means stop auto sync.", false)}
<div class="form-row">
    ${cmp.inputSource("id-APIKEY", "", "input ChatGPT API KEY.", false)}
    ${cmp.dropdownSource("id-provider", null, ["ChatGPT", "DeepSeek"], 0)}
</div>
${cmp.switcherSource("id-theme", "Dark Theme?", false)}
<div class="mt20px bs-flex-between">
    <div class="bs-left-align">
        ${cmp.buttonGroupSource(
    'btn-modal-sync',
    ['Sync', 'Sync All']
)}
    </div>
    <div class="bs-right-align">
        ${cmp.buttonGroupSource('btn-config-submit', ['Save'])}
    </div>
</div>`;

const _notebooks = `
${cmp.dropdownSource("id-notebook", "Select Notebook.", ['notebook A', 'notebook B', 'notebook C'])}
<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-notebook-confirm', ['Create', 'Switch'])}
</div>`;

const _lemmatizer = `
${cmp.textareaSource("id-lemmatizer", null, 'h300px', "men:man,running:run,...")}
<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-lemmatizer-submit', ['Save'])}
</div>`;

const source = `
<div id="id-form" class='bs-panel bs-panel-middle'>

    <div class="tab-header">
        <button class="tab-btn active" data-tab="json-tab">AI Support</button>
        <button class="tab-btn" data-tab="file-tab">Local File</button>
        <button class="tab-btn" data-tab="lemmatizer-tab">Lemmatizer</button>
        <button class="tab-btn" data-tab="notebook">Notebook</button>
        <button class="tab-btn" data-tab="config-tab">Config</button>
    </div>

    <div id="id-tab-body">
        <div id="json-tab" class="tab-content active"> ${_jsonSource} </div>
        <div id="notebook" class="tab-content"> ${_notebooks} </div>
        <div id="lemmatizer-tab" class="tab-content"> ${_lemmatizer} </div>
        <div id="file-tab" class="tab-content"> ${_fileSource} </div>
        <div id="config-tab" class="tab-content"> ${_configSource} </div>
    </div>
</div>`;


export default class SectionSetting extends SectionBase {

    #_elem_tags: HTMLInputElement;
    #_ele_lemmaArea: HTMLTextAreaElement;

    _activeTab: string = "file-tab";

    constructor(dict: Dictionary, card: Card) {

        super("container-col-1", source, dict, card);

        this.#_elem_tags = this.ui.get<HTMLInputElement>("#id-tags input");
        const elem_user = this.ui.get<HTMLInputElement>("#id-userID input");
        elem_user.type = 'password';
        const elem_syncInerval = this.ui.get<HTMLInputElement>("#id-syncInterval input");
        elem_syncInerval.type = 'number';
        //elem_syncInerval.inputmode = "numeric";
        const elem_key = this.ui.get<HTMLInputElement>("#id-APIKEY input");
        elem_key.type = 'password';
        const elem_provider = this.ui.get<HTMLSelectElement>("#id-provider select");
        const elem_theme = this.ui.get<HTMLInputElement>("#id-theme input");
        this.#_ele_lemmaArea = this.ui.get<HTMLTextAreaElement>("#id-tab-body #id-lemmatizer textarea");
        const _ele_importByJSON = this.ui.get<HTMLTextAreaElement>("#id-tab-body #import-text textarea");
        const _ele_importByAI = this.ui.get<HTMLTextAreaElement>("#id-tab-body #import-ai textarea");

        this.#_updateTags();

        elem_syncInerval.value = (_localData.syncInterval || 10) + '';
        elem_key.value = _localData.ai_key || "";
        elem_provider.value = _localData.ai_provider || "";
        elem_user.value = _localData.userID || "";
        elem_theme.checked = _localData.theme;

        this.ui.getAll('.tab-btn').forEach(btn => {
            btn.addEventListener("click", () => {
                this.ui.getAll(`.tab-btn`).forEach(b => b.classList.remove("active"));
                this.ui.getAll(`.tab-content`).forEach(c => c.classList.remove("active"));

                btn.classList.add("active");
                this._activeTab = btn.getAttribute("data-tab") as string;
                this.ui.get(`#${this._activeTab}`).classList.add("active");
            });
        });

        this.ui.get("#id-tab-body #import-file").addEventListener("change", (event: Event) => {
            const _files = (event.target as HTMLInputElement).files;
            if (_files && _files.length > 0) {

                //const fileName = _file.name;
                //const extension = fileName.split(".").pop();
                this.#_importData(_files[0], true);
            } else {
                alert("Choose a Json file!");
                logger.error("Choose a Json file!");
                return;
            }
        });

        this.ui.get("#id-notebook").addEventListener("change", (e) => {
            logger.debug("Selected value:", (e.target as HTMLInputElement).value);
        });

        this.ui.get("#btn-config-submit").addEventListener("click", async (e: Event) => {
            const _target = e.target as HTMLInputElement;
            if (_target.dataset.index === "0") {//save
                this.#_saveTags(this.#_elem_tags.value);

                const _sec = _localData['syncInterval'] = Number(elem_syncInerval.value) || 10;
                _localData['ai_key'] = elem_key.value;
                _localData['ai_provider'] = elem_provider.value;
                _localData['userID'] = elem_user.value;
                _localData['theme'] = elem_theme.checked;
                _localProxy.delaySave();

                this._dict.setSyncInterval(_sec);

                if (elem_theme.checked) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                    document.documentElement.removeAttribute('data-theme');
                }
            }
        });

        this.ui.get("#btn-notebook-confirm").addEventListener("click", async (e) => {
            const _target = e.target as HTMLInputElement;
            if (_target.dataset.index === "0") {// create
                let _m = cmp.showMask(`
                    ${cmp.inputSource("id-name", "Input New Notebook Name:", "Input notebook name.", false)}`,
                    "Create", (maskElem) => {
                        const _eleInput = maskElem.querySelector("#id-name input") as HTMLInputElement;
                        logger.debug(`Create clicked, name is: ${_eleInput.value}`);
                    },
                    "Cancel", () => { logger.debug('Cancel clicked') },
                );
                (_m.querySelector("#id-name input") as HTMLInputElement).focus();
            } else if (_target.dataset.index === "1") {
                // logger.debug("WIP");
                cmp.showMask(`<p> Switch notebook WIP.</p> `, "Got It", () => { },);
            }
        });

        this.ui.get("#btn-lemmatizer-submit").addEventListener("click", async (e) => {
            const _target = e.target as HTMLInputElement;
            if (_target.dataset.index === "0") {// save
                this.#_saveLemma(this.#_ele_lemmaArea.value);
            }
        });

        this.ui.get("#btn-modal-sync").addEventListener("click", async (e) => {
            const _target = e.target as HTMLInputElement;
            if (_target.dataset.index == "0") {
                this._dict.sync();
            } else if (_target.dataset.index == "1") {
                this._dict.syncAll();
            }
        });

        this.ui.get("#btn-modal-submit").addEventListener("click", async (e) => {
            const _target = e.target as HTMLInputElement;
            if (_target.dataset.index == "1") {
                const _rawData = _ele_importByJSON.value.trim();
                this.#_importData(_rawData, false);
            } else if (_target.dataset.index == "0") {
                const _rawData = this._dict.getMissingWords(_ele_importByAI.value.trim());
                if (!_rawData) {
                    logger.log(`no words detected`);
                    return;
                }

                const _question = ai.getAIMeaningQuestion(_rawData);
                this.#_copyText(_question);
            }
        });

        this.ui.get("#btn-file-submit").addEventListener("click", async (e) => {
            const _target = e.target as HTMLInputElement;
            if (_target.dataset.index == "0") {
                this._dict.exportDatabase();
            } else if (_target.dataset.index === "1") {
                this._dict.clearDictionary();
            }
        });

        serverProxy.addEventListener(serverProxy.EVT_SYNC, (e: ResponseEvent) => {
            const _data: DictSyncDataSC = e.detail?.content as DictSyncDataSC
            if (_data) {
                this.#_saveTags(_data.tags);
                this.#_ele_lemmaArea.value = _data.lemmatize;
                this.#_elem_tags.value = _data.tags;
                this.#_saveLemma(_data.lemmatize);
            }
        });
    }

    #_importData(content: File | string, isFile: boolean): void {
        if (!content) {
            logger.log(`no JSON detected`);
            alert(`no JSON detected`);
            return;
        }

        if (isFile) {
            this._dict.importDictionaryByFile(content as File)
        } else {
            logger.log(content);
            const importedData: Words | Dict = JSON.parse(content as string);
            this._dict.importDictionaryByContent(importedData);
        }
    }

    async #_copyText(text: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(text);
            logger.log("Copied!");
            alert(`Copied`);
        } catch (err) {
            logger.error("Failed to copy:", err);
            alert("Failed to copy:");
        }
    }

    #_saveTags(tagsStr: string): void {
        const _tags = tagsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const _tagArr = _getTags();
        _tagArr.length = 0;
        _tagArr.push(..._tags);
        _metaProxy.delaySave()
    }

    #_saveLemma(str: string): void {
        _proxy.clear();

        str.split(',')
            .map(s => s.trim())
            .filter(s => !!s)
            .forEach(p => {
                let _t = p.split(":");
                _proxy.set(_t[0], _t[1]);
            });
    }

    #_updateTags(): void {
        this.#_elem_tags.value = _getTags().join(',') ?? '';
        this.#_ele_lemmaArea.value = Object.entries(_proxy.data()).map(([a, b]) => `${a}: ${b}`).join(',');
    }

}



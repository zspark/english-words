import logger from "./logger.js";
import ai from "./ai.js";
import Cacher from "./cacher.js";
import serverProxy from "./server-proxy.js";
import cmp from "./components.js";
import { SectionBase } from "./section-base.js";
const _metaProxy = Cacher.metaProxy;
const _localProxy = Cacher.localProxy;
const _proxy = Cacher.lemmatizerProxy;
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
        ${cmp.buttonGroupSource('btn-modal-sync', ['Sync', 'Sync All'])}
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
    #_elem_tags;
    #_ele_lemmaArea;
    _activeTab = "file-tab";
    constructor(dict, card) {
        super("container-col-1", source, dict, card);
        this.#_elem_tags = this.ui.get("#id-tags input");
        const elem_user = this.ui.get("#id-userID input");
        elem_user.type = 'password';
        const elem_syncInerval = this.ui.get("#id-syncInterval input");
        elem_syncInerval.type = 'number';
        //elem_syncInerval.inputmode = "numeric";
        const elem_key = this.ui.get("#id-APIKEY input");
        elem_key.type = 'password';
        const elem_provider = this.ui.get("#id-provider select");
        const elem_theme = this.ui.get("#id-theme input");
        this.#_ele_lemmaArea = this.ui.get("#id-tab-body #id-lemmatizer textarea");
        const _ele_importByJSON = this.ui.get("#id-tab-body #import-text textarea");
        const _ele_importByAI = this.ui.get("#id-tab-body #import-ai textarea");
        this.#_updateTags();
        const _localData = _localProxy.get('sec_setting', {});
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
                this._activeTab = btn.getAttribute("data-tab");
                this.ui.get(`#${this._activeTab}`).classList.add("active");
            });
        });
        this.ui.get("#id-tab-body #import-file").addEventListener("change", (event) => {
            const _files = event.target.files;
            if (_files && _files.length > 0) {
                //const fileName = _file.name;
                //const extension = fileName.split(".").pop();
                this.#_importData(_files[0], true);
            }
            else {
                alert("Choose a Json file!");
                logger.error("Choose a Json file!");
                return;
            }
        });
        this.ui.get("#id-notebook").addEventListener("change", (e) => {
            logger.debug("Selected value:", e.target.value);
        });
        this.ui.get("#btn-config-submit").addEventListener("click", async (e) => {
            const _target = e.target;
            if (_target.dataset.index === "0") { //save
                this.#_saveTags(this.#_elem_tags.value);
                const _value = {
                    syncInterval: Number(elem_syncInerval.value),
                    ai_key: elem_key.value,
                    ai_provider: elem_provider.value,
                    userID: elem_user.value,
                    theme: elem_theme.checked,
                };
                _localProxy.set('sec_setting', _value);
                this._dict.setSyncInterval(_value.syncInterval);
                if (elem_theme.checked) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                }
                else {
                    document.documentElement.removeAttribute('data-theme');
                }
            }
        });
        this.ui.get("#btn-notebook-confirm").addEventListener("click", async (e) => {
            const _target = e.target;
            if (_target.dataset.index === "0") { // create
                let _m = cmp.showMask(`
                    ${cmp.inputSource("id-name", "Input New Notebook Name:", "Input notebook name.", false)}`, "Create", (maskElem) => {
                    const _eleInput = maskElem.querySelector("#id-name input");
                    logger.debug(`Create clicked, name is: ${_eleInput.value}`);
                }, "Cancel", () => { logger.debug('Cancel clicked'); });
                _m.querySelector("#id-name input").focus();
            }
            else if (_target.dataset.index === "1") {
                // logger.debug("WIP");
                cmp.showMask(`<p> Switch notebook WIP.</p> `, "Got It", () => { });
            }
        });
        this.ui.get("#btn-lemmatizer-submit").addEventListener("click", async (e) => {
            const _target = e.target;
            if (_target.dataset.index === "0") { // save
                this.#_saveLemma(this.#_ele_lemmaArea.value);
            }
        });
        this.ui.get("#btn-modal-sync").addEventListener("click", async (e) => {
            const _target = e.target;
            if (_target.dataset.index == "0") {
                this._dict.sync();
            }
            else if (_target.dataset.index == "1") {
                this._dict.syncAll();
            }
        });
        this.ui.get("#btn-modal-submit").addEventListener("click", async (e) => {
            const _target = e.target;
            if (_target.dataset.index == "1") {
                const _rawData = _ele_importByJSON.value.trim();
                this.#_importData(_rawData, false);
            }
            else if (_target.dataset.index == "0") {
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
            const _target = e.target;
            if (_target.dataset.index == "0") {
                this._dict.exportDatabase();
            }
            else if (_target.dataset.index === "1") {
                this._dict.clearDictionary();
            }
        });
        serverProxy.addEventListener(serverProxy.EVT_SYNC, (e) => {
            const _data = e.detail?.content;
            if (_data) {
                this.#_saveTags(_data.tags);
                this.#_ele_lemmaArea.value = _data.lemmatize;
                this.#_elem_tags.value = _data.tags;
                this.#_saveLemma(_data.lemmatize);
            }
        });
    }
    #_importData(content, isFile) {
        if (!content) {
            logger.log(`no JSON detected`);
            alert(`no JSON detected`);
            return;
        }
        if (isFile) {
            this._dict.importDictionaryByFile(content);
        }
        else {
            logger.log(content);
            const importedData = JSON.parse(content);
            this._dict.importDictionaryByContent(importedData);
        }
    }
    async #_copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            logger.log("Copied!");
            alert(`Copied`);
        }
        catch (err) {
            logger.error("Failed to copy:", err);
            alert("Failed to copy:");
        }
    }
    #_saveTags(tagsStr) {
        _metaProxy.set('tags', tagsStr.split(',').map(s => s.trim()).filter(s => s.length > 0));
    }
    #_saveLemma(str) {
        _proxy.clear();
        str.split(',')
            .map(s => s.trim())
            .filter(s => !!s)
            .forEach(p => {
            let _t = p.split(":");
            _proxy.set(_t[0], _t[1]);
        });
    }
    #_updateTags() {
        this.#_elem_tags.value = _metaProxy.get('tags', []).join(',') ?? '';
        this.#_ele_lemmaArea.value = Object.entries(_proxy.data()).map(([a, b]) => `${a}: ${b}`).join(',');
    }
}

import logger from "./logger.js";
import Cacher from "./cacher.js";
import cmp from "./components.js";
import Notebook from "./notebook.js";
import serverProxy from "./server-proxy.js";
import { SectionBase } from "./section-base.js";
const _localProxy = Cacher.localProxy;
const _proxy = Cacher.configProxy;
const _meta = Cacher.metaProxy;
;
const _jsonSource = `
${cmp.textareaSource("import-ai", null, 'h300px', "Input words that you wanna import into your database. Words are separated with english comma (,)\n\nBetter not more than 50 words.")}
${cmp.textareaSource("import-text", null, 'h300px', "Paste your JSON database content here.")}
<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-modal-submit', ['Generate', 'Append'])}
</div>`;
const _configSource = `
${cmp.inputSource("id-userID", "User Account:", "input user account.", false)}
${cmp.inputSource("id-syncInterval", "Sync Interval (seconds):", "<= 0 means stop auto sync.", false)}
${cmp.inputSource("id-githubToken", "Github Token:", "", false)}
<div class="form-row">
    ${cmp.inputSource("id-APIKEY", "", "input ChatGPT API KEY.", false)}
    ${cmp.dropdownSource("id-provider", null, ["_NONE_", "ChatGPT", "DeepSeek"], 0)}
</div>
${cmp.switcherSource("id-theme", "Dark Theme", false)}
${cmp.switcherSource("id-auto-gen-detail", "Auto Ask AI For Detail", true)}
<div class="mt20px bs-flex-between">
    <div class="bs-left-align">
        ${cmp.buttonGroupSource('btn-modal-sync', ['Push', 'Pull'])}
    </div>
    <div class="bs-right-align">
        ${cmp.buttonGroupSource('btn-config-submit', ['Save'])}
    </div>
</div>`;
const _notebooks = `
${cmp.dropdownSource("id-notebook", "Select Notebook.", [])}
<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-notebook-confirm', ['Create', 'Push'])}
</div>`;
const _lemmatizer = `
${cmp.inputSource("id-tags", "Tags", "input tags, separate with ','", false)}
${cmp.textareaSource("id-lemmatizer", null, 'h300px', "men:man,running:run,...")}
<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-lemmatizer-submit', ['Push'])}
</div>`;
const source = `
<div id="id-form" class='bs-panel bs-panel-middle'>

    <div class="tab-header">
        <button class="tab-btn active" data-tab="json-tab">AI Support</button>
        <button class="tab-btn" data-tab="lemmatizer-tab">Custom</button>
        <button class="tab-btn" data-tab="notebook">Notebook</button>
        <button class="tab-btn" data-tab="config-tab">Config</button>
    </div>

    <div id="id-tab-body">
        <div id="json-tab" class="tab-content active"> ${_jsonSource} </div>
        <div id="notebook" class="tab-content"> ${_notebooks} </div>
        <div id="lemmatizer-tab" class="tab-content"> ${_lemmatizer} </div>
        <div id="config-tab" class="tab-content"> ${_configSource} </div>
    </div>
</div>`;
export default class SectionSetting extends SectionBase {
    #_elem_tags;
    #_ele_lemmaArea;
    _activeTab = "file-tab";
    constructor(dict, notebook, card) {
        super("container-col-1", source, dict, notebook, card);
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
        const elem_askAI = this.ui.get("#id-auto-gen-detail input");
        const elem_github = this.ui.get("#id-githubToken input");
        elem_github.type = 'password';
        this.#_ele_lemmaArea = this.ui.get("#id-tab-body #id-lemmatizer textarea");
        const _ele_importByJSON = this.ui.get("#id-tab-body #import-text textarea");
        const _ele_importByAI = this.ui.get("#id-tab-body #import-ai textarea");
        const _localData = _localProxy.get('sec_setting', {});
        elem_syncInerval.value = (_localData.syncInterval || 10) + '';
        elem_github.value = _localData.githubToken || "";
        elem_key.value = _localData.ai_key || "";
        elem_provider.value = _localData.ai_provider || "";
        elem_user.value = _localData.userID || "";
        elem_theme.checked = !!_localData.theme;
        elem_askAI.checked = !!_localData.autoAsk;
        this.ui.getAll('.tab-btn').forEach(btn => {
            btn.addEventListener("click", () => {
                this.ui.getAll(`.tab-btn`).forEach(b => b.classList.remove("active"));
                this.ui.getAll(`.tab-content`).forEach(c => c.classList.remove("active"));
                btn.classList.add("active");
                this._activeTab = btn.getAttribute("data-tab");
                this.ui.get(`#${this._activeTab}`).classList.add("active");
            });
        });
        this.ui.get("#btn-config-submit").addEventListener("click", async (e) => {
            const _target = e.target;
            if (_target.dataset.index === "0") { //save
                const _obj = { tags: [], lemmatizer: {} };
                _obj.tags = this.#_elem_tags.value.split(',');
                this.#_ele_lemmaArea.value.split(',').forEach(s => {
                    let a = s.split(':');
                    _obj.lemmatizer[a[0]] = a[1];
                });
                const _value = {
                    githubToken: elem_github.value,
                    syncInterval: Number(elem_syncInerval.value),
                    ai_key: elem_key.value,
                    ai_provider: elem_provider.value,
                    userID: elem_user.value,
                    theme: elem_theme.checked,
                    autoAsk: elem_askAI.checked,
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
        this.ui.get("#id-notebook").addEventListener("change", (e) => {
            const _name = e.target.value;
            logger.debug("Selected value:", e.target.value);
            this._nb.changeNotebook(_name === "default" ? undefined : _name);
        });
        this.ui.get("#btn-notebook-confirm").addEventListener("click", async (e) => {
            const _target = e.target;
            if (_target.dataset.index === "0") { // create
                let _m = cmp.showMask(`
                    ${cmp.inputSource("id-name", "Input New Notebook Name:", "Input notebook name.", false)}`, "Create", (maskElem) => {
                    const _eleInput = maskElem.querySelector("#id-name input");
                    logger.debug(`Create clicked, name is: ${_eleInput.value}`);
                    notebook.createNotebook(_eleInput.value);
                }, "Cancel", () => { logger.debug('Cancel clicked'); });
                _m.querySelector("#id-name input").focus();
            }
            else if (_target.dataset.index === "1") { // push notebook to Github
                //this.#_dispDictEvt(`begin:sync`);
                await notebook.upload();
                //this.#_dispDictEvt(`end:sync`);
            }
        });
        this.ui.get("#btn-lemmatizer-submit").addEventListener("click", async (e) => {
            const _target = e.target;
            if (_target.dataset.index === "0") { // save
                const _data = {
                    tags: this.#_elem_tags.value.split(","),
                    lemmatizer: Object.fromEntries(this.#_ele_lemmaArea.value.split(",").map(item => item.split(":")))
                };
                await serverProxy.pushToGithub(_data, 'config.json');
                // store;
                _meta.set('tags', _data.tags);
                _meta.set('lemmatizer', _data.lemmatizer);
                _meta.broadcast();
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
                // TODO: never do
                // const _question = ai.getAIMeaningQuestion(_rawData);
                // this.#_copyText(_question);
            }
        });
        const _updateNotebookList = () => {
            const _tagFilter = this.ui.get('#id-notebook select');
            const _names = notebook.getNotebookNames();
            const _name = notebook.name ?? Notebook.defaultName;
            _tagFilter.innerHTML = cmp.dropdownOptionSource(["default", ..._names], _name);
        };
        notebook.addEventListener(Notebook.EVT_CREATED, _updateNotebookList);
        notebook.addEventListener(Notebook.EVT_CONTENT_FETCHED, _updateNotebookList);
        serverProxy.addEventListener(serverProxy.EVT_GET_CONFIG, (event) => {
            logger.debug(`config got. in settings`);
            const _data = event.detail;
            if (_data?.content) {
                this.#_elem_tags.value = _data.content.tags.join(',');
                let tmp = [];
                Object.entries(_data.content.lemmatizer).forEach((v) => {
                    tmp.push(`${v[0]}:${v[1]}`);
                });
                this.#_ele_lemmaArea.value = tmp.join(',');
                // store;
                _meta.set('tags', _data.content.tags);
                _meta.set('lemmatizer', _data.content.lemmatizer);
                _meta.broadcast();
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
    #_saveLemma(str) {
        /*
        _proxy.clear();
    
        str.split(',')
            .map(s => s.trim())
            .filter(s => !!s)
            .forEach(p => {
                let _t = p.split(":");
                _proxy.set(_t[0], _t[1]);
            });
            */
    }
}


function initSectionImport(ai, dictionary, cmp, cacher, serverProxy) {

    const _localProxy = cacher.localProxy;
    const _localData = _localProxy.get('sec_setting', {});
    const _metaProxy = cacher.metaProxy;
    const _proxy = cacher.lemmatizerProxy;

    function _getTags() { return _metaProxy.get('tags', []); }


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


    const ele_root = document.createElement("div");
    ele_root.className = "container-col-1";
    ele_root.innerHTML = source;

    const elem_tags = ele_root.querySelector("#id-tags input");
    const elem_user = ele_root.querySelector("#id-userID input");
    elem_user.type = 'password';
    const elem_syncInerval = ele_root.querySelector("#id-syncInterval input");
    elem_syncInerval.type = 'number';
    elem_syncInerval.inputmode = "numeric";
    const elem_key = ele_root.querySelector("#id-APIKEY input");
    elem_key.type = 'password';
    const elem_provider = ele_root.querySelector("#id-provider select");
    const elem_theme = ele_root.querySelector("#id-theme input");

    const _ele_importByFile = ele_root.querySelector("#id-tab-body #import-file");
    _ele_importByFile.addEventListener("change", (event) => {
        if (!event.target.files || (!event.target.files.length === 0)) {
            alert("Choose a Json file!");
            logger.warn("Choose a Json file!");
            return;
        }

        const _file = event.target.files[0];
        //const fileName = _file.name;
        //const extension = fileName.split(".").pop();
        _importData(_file, true);
    });

    function _importData(content, isFile) {
        if (!content) {
            logger.log(`no JSON detected`);
            alert(`no JSON detected`);
            return;
        }

        if (isFile) {
            dictionary.importDictionaryByFile(content)
        } else {
            logger.log(content);
            const importedData = JSON.parse(content);
            dictionary.importDictionaryByContent(importedData);
        }
    }

    const _ele_importByJSON = ele_root.querySelector("#id-tab-body #import-text textarea");
    const _ele_importByAI = ele_root.querySelector("#id-tab-body #import-ai textarea");


    ele_root.querySelector("#id-notebook").addEventListener("change", (e) => {
        logger.debug("Selected value:", e.target.value);
    });

    async function _copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            logger.log("Copied!");
            alert(`Copied`);
        } catch (err) {
            logger.error("Failed to copy:", err);
            alert("Failed to copy:");
        }
    }

    let activeTab = "file-tab";
    function _registTabComponent(parentElem, tabName, contentName) {
        parentElem.querySelectorAll(`.${tabName}`).forEach(btn => {
            btn.addEventListener("click", () => {
                parentElem.querySelectorAll(`.${tabName}`).forEach(b => b.classList.remove("active"));
                parentElem.querySelectorAll(`.${contentName}`).forEach(c => c.classList.remove("active"));

                btn.classList.add("active");
                activeTab = btn.getAttribute("data-tab");
                parentElem.querySelector(`#${activeTab}`).classList.add("active");
            });
        });
    }

    function _saveTags(tagsStr) {
        const _tags = tagsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
        const _tagArr = _getTags();
        _tagArr.length = 0;
        _tagArr.push(..._tags);
        _metaProxy.delaySave()
    }

    const btnConfig = ele_root.querySelector("#btn-config-submit");
    btnConfig.addEventListener("click", async (e) => {
        if (e.target.dataset.index === "0") {//save
            _saveTags(elem_tags.value);

            const _sec = _localData['syncInterval'] = Number(elem_syncInerval.value) || 10;
            _localData['ai_key'] = elem_key.value;
            _localData['ai_provider'] = elem_provider.value;
            _localData['userID'] = elem_user.value;
            _localData['theme'] = elem_theme.checked;
            _localProxy.delaySave();

            dictionary.setSyncInterval(_sec);

            if (elem_theme.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
    });

    const _notebookConfirm = ele_root.querySelector("#btn-notebook-confirm");
    _notebookConfirm.addEventListener("click", async (e) => {
        if (e.target.dataset.index === "0") {// create
            let _m = cmp.showMask(`
    ${cmp.inputSource("id-name", "Input New Notebook Name:", "Input notebook name.", false)}`,
                "Create", (maskElem) => {
                    const _eleInput = maskElem.querySelector("#id-name input");
                    logger.debug(`Create clicked, name is: ${_eleInput.value}`);
                },
                "Cancel", () => { logger.debug('Cancel clicked') },
            );
            _m.querySelector("#id-name input").focus();
        } else if (e.target.dataset.index === "1") {
            // logger.debug("WIP");
            cmp.showMask(`<p> Switch notebook WIP.</p> `, "Got It", () => { },);
        }
    });

    function _saveLemma(str) {
        _proxy.clear();

        str.split(',')
            .map(s => s.trim())
            .filter(s => !!s)
            .forEach(p => {
                let _t = p.split(":");
                _proxy.set(_t[0], _t[1]);
            });
    }

    const _ele_lemmaArea = ele_root.querySelector("#id-tab-body #id-lemmatizer textarea");
    const _btnLemma = ele_root.querySelector("#btn-lemmatizer-submit");
    _btnLemma.addEventListener("click", async (e) => {
        if (e.target.dataset.index === "0") {// save
            _saveLemma(_ele_lemmaArea.value);
        }
    });

    _registTabComponent(ele_root, "tab-btn", "tab-content");
    const btnSync = ele_root.querySelector("#btn-modal-sync");
    btnSync.addEventListener("click", async (e) => {
        if (e.target.dataset.index == "0") {
            dictionary.sync();
        } else if (e.target.dataset.index == "1") {
            dictionary.syncAll();
        }
    });
    const btnSubmit = ele_root.querySelector("#btn-modal-submit");
    btnSubmit.addEventListener("click", async (e) => {
        if (e.target.dataset.index == "1") {
            const _rawData = _ele_importByJSON.value.trim();
            _importData(_rawData, false);
        } else if (e.target.dataset.index == "0") {
            const _rawData = dictionary.getMissingWords(_ele_importByAI.value.trim());
            if (!_rawData) {
                logger.log(`no words detected`);
                return;
            }

            const _question = ai.getAIMeaningQuestion(_rawData);
            _copyText(_question);
        }
    });
    const btnExport = ele_root.querySelector("#btn-file-submit");
    btnExport.addEventListener("click", async (e) => {
        if (e.target.dataset.index == "0") {
            dictionary.exportDatabase();
        } else if (e.target.dataset.index === "1") {
            dictionary.clearDictionary();
        }
    });

    function deactive() {
    }

    function active() {
    }

    function keyEvent() { }

    function setSync(scrollY) { }

    serverProxy.addEventListener(serverProxy.EVT_SYNC, (e) => {
        const _data = e.detail.data;
        if (_data) {
            _saveTags(_data.tags);
            elem_tags.value = _data.tags;
            _saveLemma(_data.lemmatize);
            _ele_lemmaArea.value = _data.lemmatize;
        }
    });

    (function() {
        //init;
        elem_tags.value = _getTags().join(',') ?? '';
        _ele_lemmaArea.value = Object.entries(_proxy.data()).map(([a, b]) => `${a}: ${b}`).join(',');

        elem_syncInerval.value = _localData['syncInterval'] || 10;
        elem_key.value = _localData['ai_key'] || "";
        elem_provider.value = _localData['ai_provider'] || "";
        elem_user.value = _localData['userID'] || "";
        elem_theme.checked = !!_localData['theme'];

    })()


    return {
        ele_root,
        active,
        setSync,
        deactive,
        keyEvent,
    }
}

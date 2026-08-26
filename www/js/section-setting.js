


function initSectionImport(ai, dictionary, cmp) {
    const _jsonSource = `
${cmp.textareaSource("import-text", null, 'h300px', "Paste your JSON database content here.")}
<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-modal-submit', ['Append'])}
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
${cmp.inputSource("id-syncInterval", "Sync Interval", "how many seconds?.", false)}
<div class="form-row">
    ${cmp.inputSource("id-APIKEY", "", "input ChatGPT API KEY.", false)}
    ${cmp.dropdownSource("id-provider", null, ["ChatGPT", "DeepSeek"], 0)}
</div>
${cmp.switcherSource("id-theme", "Dark Theme?", false)}
<div class="mt20px bs-flex-between">
    <div class="bs-left-align">
        ${cmp.buttonGroupSource(
        'btn-modal-sync',
        ['upload', 'download']
    )}
    </div>
    <div class="bs-right-align">
        ${cmp.buttonGroupSource('btn-config-submit', ['Save'])}
    </div>
</div>`;

    const _aiAssist = `
${cmp.textareaSource("import-ai", null, 'h300px', "Input words that you wanna import into your database. Words are separated with english comma (,)\n\nBetter not more than 50 words.")}
<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-ai-submit', ['Generate'])}
</div>`;


    const source = `
<div id="id-form" class='bs-panel bs-panel-middle'>

    <div class="tab-header">
        <button class="tab-btn active" data-tab="json-tab">Pure JSON Text</button>
        <button class="tab-btn" data-tab="ai-tab">AI Support</button>
        <button class="tab-btn" data-tab="file-tab">Local File</button>
        <button class="tab-btn" data-tab="config-tab">Config</button>
    </div>

    <div id="id-tab-body">
        <div id="json-tab" class="tab-content active"> ${_jsonSource} </div>
        <div id="ai-tab" class="tab-content"> ${_aiAssist} </div>
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

    const btnConfig = ele_root.querySelector("#btn-config-submit");
    btnConfig.addEventListener("click", async (e) => {
        if (e.target.dataset.index === "0") {//save
            const _tags = elem_tags.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
            dictionary.setTags(_tags);
            dictionary.setSyncInterval(Number(elem_syncInerval.value));

            const _localData = dictionary.getLocalData("sec_setting");
            _localData['ai_key'] = elem_key.value;
            _localData['ai_provider'] = elem_provider.value;
            _localData['userID'] = elem_user.value;
            _localData['theme'] = elem_theme.checked;
            dictionary.saveLocalData();

            if (elem_theme.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
    });

    const _btnAi = ele_root.querySelector("#btn-ai-submit");
    _btnAi.addEventListener("click", async (e) => {
        if (e.target.dataset.index === "0") {//generate
            const _rawData = dictionary.getMissingWords(_ele_importByAI.value.trim());
            if (!_rawData) {
                logger.log(`no words detected`);
                return;
            }

            const _question = ai.getAIMeaningQuestion(_rawData);
            _copyText(_question);
        }
    });

    _registTabComponent(ele_root, "tab-btn", "tab-content");
    const btnSync = ele_root.querySelector("#btn-modal-sync");
    btnSync.addEventListener("click", async (e) => {
        if (e.target.dataset.index == "0") {
            dictionary.saveDictionary();
        } else if (e.target.dataset.index == "1") {
            dictionary.loadDictionary();
        }
    });
    const btnSubmit = ele_root.querySelector("#btn-modal-submit");
    btnSubmit.addEventListener("click", async (e) => {
        if (e.target.dataset.index == "0") {
            const _rawData = _ele_importByJSON.value.trim();
            _importData(_rawData, false);
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
        elem_tags.value = dictionary.getTags().join(',');
        elem_syncInerval.value = dictionary.getSyncInterval();

        const _localData = dictionary.getLocalData("sec_setting");
        elem_key.value = _localData['ai_key'] || "";
        elem_provider.value = _localData['ai_provider'] || "";
        elem_user.value = _localData['userID'] || "";
        elem_theme.checked = !!_localData['theme'];
    }

    function keyEvent() { }

    function setSync(scrollY) { }
    return {
        ele_root,
        active,
        setSync,
        deactive,
        keyEvent,
    }
}

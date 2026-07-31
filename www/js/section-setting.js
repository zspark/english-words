
function initSectionImport(ai, dictionary, cmp) {
    const _dataSource = `
${cmp.radioButtonSource("id-radio-label", "Merge Strategy", ['Append', 'Replace'], 0)}

<div>
    <label class="bs-title"> Import Methods </label>
    <div class="tab-header">
        <button class="tab-btn active" data-tab="text-tab">Pure JSON Text</button>
        <button class="tab-btn" data-tab="file-tab">Local File</button>
    </div>

    <div id="id-tab-body">
        <div id="text-tab" class="tab-content active">
            ${cmp.textareaSource("import-text", null, 'h300px', "Paste your JSON database content here.")}
        </div>

        <div id="file-tab" class="tab-content">
            <input type="file" id="import-file" accept=".json" class="bs-file-input" style="display:none;">

            <label for="import-file" class="bs-file-box h300px">
                <div class="bs-file-icon">📁</div>
                <div class="bs-file-title">Click to Select File</div>
                <div class="bs-file-desc"> Only Supports .json</div>
            </label>
        </div>

    </div>
</div>

<div class="mt20px bs-flex-between">
    <div class="bs-left-align">
        ${cmp.buttonGroupSource(
        'btn-modal-sync',
        [
            `<svg class="icon s21px" fill="#8e2fe6" viewBox="0 0 512 512" enable-background="new 0 0 512 512" xml:space="preserve">
<path d="M470.7,277.2c3-11.2,4.7-22.9,4.7-35c0-75.8-61.4-137.1-137.1-137.1c-19.5,0-38,4.1-54.7,11.4
	c-16.8-39-55.6-66.3-100.7-66.3c-60.6,0-109.7,49.1-109.7,109.7c0,4.1,0.8,7.9,1.2,11.9C30.5,192.1,0,236.3,0,287.9
	c0,70.7,57.3,128,128,128h310.9c40.4,0,73.1-32.7,73.1-73.1C512,313.8,495.1,289.1,470.7,277.2z M292.6,251.3v91.4h-73.1v-91.4
	h-54.9l91.4-91.4l91.4,91.4H292.6z"/>
</svg>`,
            `<svg class="icon s21px" fill="#3642ff" viewBox="0 0 512 512" enable-background="new 0 0 512 512" xml:space="preserve">
<path d="M470.7,280.2c3-11.2,4.7-22.9,4.7-35c0-75.8-61.4-137.1-137.1-137.1c-19.5,0-38,4.1-54.7,11.4
	c-16.8-39-55.6-66.3-100.7-66.3c-60.6,0-109.7,49.1-109.7,109.7c0,4.1,0.8,7.9,1.2,11.9C30.5,195.1,0,239.3,0,290.9
	c0,70.7,57.3,128,128,128h310.9c40.4,0,73.1-32.7,73.1-73.1C512,316.8,495.1,292.1,470.7,280.2z M256,364l-91.4-91.4h54.9v-91.4
	h73.1v91.4h54.9L256,364z"/>
</svg>`
        ],
    )}
    </div>
    <div class="bs-right-align">
        ${cmp.buttonGroupSource(
        'btn-modal-submit',
        [
            'Export',
            'Import',
            'Delete'
        ],
    )}
    </div>
</div>`;

    const _configSource = `
${cmp.inputSource("id-tags", "Tags", "input tags, separate with ','", false)}
${cmp.inputSource("id-userID", "User Account", "input user account.", false)}
${cmp.inputSource("id-syncInterval", "Sync Interval", "how many seconds?.", false)}
${cmp.inputSource("id-APIKEY-chatGPT", "API KEY", "input ChatGPT API KEY.", false)}
<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-config-submit', ['Save'])}
</div>`;

    const _aiAssist = `
${cmp.textareaSource("import-ai", null, 'h300px', "Input words that you wanna import into your database. Words are separated with english comma (,)\n\nBetter not more than 50 words.")}
<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-ai-submit', ['Generate'])}
</div>`;

    const source = `
<div id="id-form" class='bs-panel bs-panel-middle'>

    <div class="tab-header">
        <button class="tab-btn-22 active" data-tab="dict-tab">Dictionary</button>
        <button class="tab-btn-22" data-tab="ai-tab">AI Support</button>
        <button class="tab-btn-22" data-tab="config-tab">Config</button>
    </div>

    <div id="id-tab-body">
        <div id="dict-tab" class="tab-content-22 active"> ${_dataSource} </div>
        <div id="ai-tab" class="tab-content-22"> ${_aiAssist} </div>
        <div id="config-tab" class="tab-content-22"> ${_configSource} </div>
    </div>
</div>`;


    const ele_root = document.createElement("div");
    ele_root.className = "container-col-1";
    ele_root.innerHTML = source;

    const elem_tags = ele_root.querySelector("#id-tags input");
    const elem_user = ele_root.querySelector("#id-userID input");
    elem_user.type = 'password';
    const elem_syncInerval = ele_root.querySelector("#id-syncInterval input");
    const elem_key = ele_root.querySelector("#id-APIKEY-chatGPT input");

    const _ele_importByFile = ele_root.querySelector("#id-tab-body #import-file");
    _ele_importByFile.addEventListener("change", (event) => {
        if (!event.target.files || (!event.target.files.length === 0)) {
            alert("请先选择一个 JSON 文件！");
            return;
        }

        const _file = event.target.files[0];
        //const fileName = _file.name;
        //const extension = fileName.split(".").pop();
        _importss(_file, true);
    });

    function _importss(content, isFile) {
        if (!content) {
            logger.log(`no JSON detected`);
            alert(`no JSON detected`);
            return;
        }

        const _mode = _ele_radios.querySelector('input[type="radio"]:checked').id.toLowerCase().trim(); // 'append' or 'replace'
        if (_mode === "replace") {
            dictionary.clearDictionary()
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
    const _ele_radios = ele_root.querySelector('#id-radio-label');
    ////_ele_radios.addEventListener("change", e => { logger.log('aaa'); });

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
            dictionary.setAPI(elem_key.value);
            dictionary.setUserID(elem_user.value);
            dictionary.setSyncTime(elem_syncInerval.value);
        }
    });

    const _btnAi = ele_root.querySelector("#btn-ai-submit");
    _btnAi.addEventListener("click", async (e) => {
        if (e.target.dataset.index === "0") {//generate
            const _rawData = _ele_importByAI.value.trim();
            if (!_rawData) {
                logger.log(`no words detected`);
                return;
            }

            const _question = ai.askChatGPTForWordsInfo(_rawData);
            _copyText(_question);

            //const resultText = await ai.askChatGPTForWordsInfo(_rawData);
            //_importss(resultText, false);
        }
    });

    _registTabComponent(ele_root, "tab-btn-22", "tab-content-22");
    _registTabComponent(ele_root, "tab-btn", "tab-content");
    const btnSync = ele_root.querySelector("#btn-modal-sync");
    btnSync.addEventListener("click", async (e) => {
        if (e.target.dataset.index == "0") {
            dictionary.saveData();
        } else if (e.target.dataset.index == "1") {
            dictionary.loadData();
        }
    });
    const btnSubmit = ele_root.querySelector("#btn-modal-submit");
    btnSubmit.addEventListener("click", async (e) => {
        if (e.target.dataset.index == "0") {
            dictionary.exportDatabase();
        } else if (e.target.dataset.index === "2") {
            dictionary.clearDictionary();
        } else if (e.target.dataset.index === "1") {
            if (activeTab === "text-tab") {
                const _rawData = _ele_importByJSON.value.trim();

                _importss(_rawData, false);
            }
        }
    });

    function deactive() {
    }

    function active() {
        elem_tags.value = dictionary.getTags().join(',');
        elem_key.value = dictionary.getAPI();
        elem_user.value = dictionary.getUserID();
        elem_syncInerval.value = dictionary.getSyncTime();
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

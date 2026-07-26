
function initSectionImport(ai, dictionary, cmp) {
    const _dataSource = `
${cmp.radioButtonSource("id-radio-label", "Save Strategy", ['Append', 'Replace'], 0)}

<div>
    <label class="bs-title"> Import Methods </label>
    <div class="tab-header">
        <button class="tab-btn active" data-tab="file-tab">Local File</button>
        <button class="tab-btn" data-tab="text-tab">Pure JSON Text</button>
        <button class="tab-btn" data-tab="ai-tab">AI Support</button>
    </div>

    <div id="id-tab-body">
        <div id="file-tab" class="tab-content active">
            <input type="file" id="import-file" accept=".json" class="bs-file-input" style="display:none;">

            <label for="import-file" class="bs-file-box h300px">
                <div class="bs-file-icon">📁</div>
                <div class="bs-file-title">Click to Select File</div>
                <div class="bs-file-desc"> Only Supports .json</div>
            </label>
        </div>
        <div id="text-tab" class="tab-content">
            ${cmp.textareaSource("import-text", null, 'h300px', "Paste your JSON database content here.")}
        </div>
        <div id="ai-tab" class="tab-content">
            ${cmp.textareaSource("import-ai", null, 'h300px', "Input words that you wanna import into your database. Words are separated with english comma (,)\n\nBetter not more than 50 words.")}
        </div>
    </div>
</div>

<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-modal-submit', ['Download', 'Upload', 'Export', 'Import'])}
</div>
`

    const _configSource = `
${cmp.inputSource("id-tags", "Tags", "input tags, separate with ','", false)}
${cmp.inputSource("id-userID", "User Account", "input user account.", false)}
${cmp.inputSource("id-syncInterval", "Sync Interval", "how many seconds?.", false)}
${cmp.inputSource("id-APIKEY-chatGPT", "API KEY", "input ChatGPT API KEY.", false)}
<div class="bs-right-align mt20px">
    ${cmp.buttonGroupSource('btn-config-submit', ['Save'])}
</div>`;

    const source = `
<div id="id-form" class='bs-panel'>

    <div class="tab-header">
        <button class="tab-btn-22 active" data-tab="dict-tab">Dictionary</button>
        <button class="tab-btn-22" data-tab="config-tab">Config</button>
    </div>

    <div id="id-tab-body">
        <div id="dict-tab" class="tab-content-22 active"> ${_dataSource} </div>
        <div id="config-tab" class="tab-content-22"> ${_configSource} </div>
    </div>
</div>
`

    const ele_root = document.createElement("div");
    ele_root.className = "container";
    ele_root.innerHTML = source;

    const elem_tags = ele_root.querySelector("#id-tags input");
    const elem_user = ele_root.querySelector("#id-userID input");
    const elem_syncInerval = ele_root.querySelector("#id-syncInterval input");
    const elem_key = ele_root.querySelector("#id-APIKEY-chatGPT input");

    const _ele_importByFile = ele_root.querySelector("#id-tab-body #import-file");
    const _ele_importByJSON = ele_root.querySelector("#id-tab-body #import-text textarea");
    const _ele_importByAI = ele_root.querySelector("#id-tab-body #import-ai textarea");
    const _ele_radios = ele_root.querySelector('#id-radio-label');
    ////_ele_radios.addEventListener("change", e => { console.log('aaa'); });

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

    _registTabComponent(ele_root, "tab-btn-22", "tab-content-22");
    _registTabComponent(ele_root, "tab-btn", "tab-content");
    const btnSubmit = ele_root.querySelector("#btn-modal-submit");
    btnSubmit.addEventListener("click", async (e) => {
        if (e.target.dataset.index == "3") {
        } else if (e.target.dataset.index == "0") {
            dictionary.loadData();
        } else if (e.target.dataset.index == "1") {
            dictionary.saveData();
        } else if (e.target.dataset.index == "2") {
            const _mode = _ele_radios.querySelector('input[type="radio"]:checked').id.toLowerCase().trim(); // 'append' or 'replace'
            if (_mode === "replace") {
                dictionary.clearDictionary()
            }

            if (activeTab === "file-tab") {
                if (!_ele_importByFile.files || (!_ele_importByFile.files.length === 0)) {
                    alert("请先选择一个 JSON 文件！");
                    return;
                }
                dictionary.importDictionaryByFile(_ele_importByFile.files[0]);
            } else if (activeTab === "text-tab") {
                const _rawData = _ele_importByJSON.value.trim();
                if (!_rawData) {
                    console.info(`no JSON detected`);
                    return;
                }

                const importedData = JSON.parse(_rawData);
                dictionary.importDictionaryByContent(importedData);
            } else {
                const _rawData = _ele_importByAI.value.trim();
                if (!_rawData) {
                    console.info(`no words detected`);
                    return;
                }

                const resultText = await ai.askChatGPTForWordsInfo(_rawData);
                if (!resultText) {
                    return;
                }
                //console.info(resultText);
                const importedData = JSON.parse(resultText);
                dictionary.importDictionaryByContent(importedData);
            }
        } else if (e.target.dataset.index === "3") {//save
            dictionary.exportDatabase();
        }
    });

    function update() {
        elem_tags.value = dictionary.getTags().join(',');
        elem_key.value = dictionary.getAPI();
        elem_user.value = dictionary.getUserID();
        elem_syncInerval.value = dictionary.getSyncTime();
    }
    function keyEvent() { }

    return {
        ele_root,
        update,
        keyEvent,
    }
}

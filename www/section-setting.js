
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
    ${cmp.buttonGroupSource('btn-modal-submit', [`<svg class='icon' viewBox="0 0 24 24"> <path d="M18.944 11.112C18.507 7.67 15.56 5 12 5 9.244 5 6.85 6.61 5.757 9.149 3.609 9.792 2 11.82 2 14c0 2.657 2.089 4.815 4.708 4.971V19H17.99v-.003L18 19c2.206 0 4-1.794 4-4a4.008 4.008 0 0 0-3.056-3.888zM8 12h3V9h2v3h3l-4 5-4-5z"/></svg>`, `<svg class='icon' viewBox="0 0 640 512"><path d="M537.6 226.6c4.1-10.7 6.4-22.4 6.4-34.6 0-53-43-96-96-96-19.7 0-38.1 6-53.3 16.2C367 64.2 315.3 32 256 32c-88.4 0-160 71.6-160 160 0 2.7.1 5.4.2 8.1C40.2 219.8 0 273.2 0 336c0 79.5 64.5 144 144 144h368c70.7 0 128-57.3 128-128 0-61.9-44-113.6-102.4-125.4zM393.4 288H328v112c0 8.8-7.2 16-16 16h-48c-8.8 0-16-7.2-16-16V288h-65.4c-14.3 0-21.4-17.2-11.3-27.3l105.4-105.4c6.2-6.2 16.4-6.2 22.6 0l105.4 105.4c10.1 10.1 2.9 27.3-11.3 27.3z"/></svg>`, 'Export', 'Import'], ['', ""])}
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
    _ele_importByFile.addEventListener("change", (event) => {
        if (!event.target.files || (!event.target.files.length === 0)) {
            alert("请先选择一个 JSON 文件！");
            return;
        }
        const _mode = _ele_radios.querySelector('input[type="radio"]:checked').id.toLowerCase().trim(); // 'append' or 'replace'
        if (_mode === "replace") {
            dictionary.clearDictionary()
        }
        dictionary.importDictionaryByFile(event.target.files[0]);
    });

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
            dictionary.exportDatabase();
        } else if (e.target.dataset.index === "3") {
            if (activeTab === "text-tab") {
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

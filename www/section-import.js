
function initSectionImport(ai, dictionary, cmp) {
    const source = `
<div id="id-form" class='bs-panel'>
    ${cmp.radioButtonSource("id-radio-label", "Save Strategy", ['Append', 'Replace'], 0)}

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

    <div class="bs-right-align">
        <button id="btn-modal-submit" class="btn-primary">Operate</button>
    </div>
</div>
`

    const ele_root = document.createElement("div");
    ele_root.className = "container-import";
    ele_root.innerHTML = source;

    const _ele_importByFile = ele_root.querySelector("#id-tab-body #import-file");
    const _ele_importByJSON = ele_root.querySelector("#id-tab-body #import-text textarea");
    const _ele_importByAI = ele_root.querySelector("#id-tab-body #import-ai textarea");
    const _ele_radios = ele_root.querySelector('#id-radio-label');
    ////_ele_radios.addEventListener("change", e => { console.log('aaa'); });

    let activeTab = "file-tab";
    ele_root.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            ele_root.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            ele_root.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            activeTab = btn.getAttribute("data-tab");
            ele_root.querySelector(`#${activeTab}`).classList.add("active");
        });
    });

    const btnSubmit = ele_root.querySelector("#btn-modal-submit");
    btnSubmit.addEventListener("click", async () => {
        const _mode = _ele_radios.querySelector('input[type="radio"]:checked').id.toLowerCase(); // 'append' or 'replace'
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
            _ele_importByAI.value = resultText;
            // const importedData = JSON.parse(resultText);
            // debugger
            // dictionary.importDictionaryByContent(importedData);



        }
    });

    function update() { }
    function keyEvent() { }

    return {
        ele_root,
        update,
        keyEvent,
    }
}

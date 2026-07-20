
function initSectionImport(ai, dictionary) {
    const source = `
<div class="word-form">
    <div class="form-group">
        <label class="section-label">1. 导入方式</label>
        <div class="radio-group">
            <label class="radio-label">
                <input type="radio" name="import-mode" value="append" checked>
                <span>追加 (Append)</span>
            </label>
            <label class="radio-label">
                <input type="radio" name="import-mode" value="replace">
                <span>覆盖 (Replace)</span>
            </label>
        </div>
    </div>

    <div class="form-group">
        <label class="section-label">2. 数据提供方式</label>
        <div class="tab-header">
            <button class="tab-btn active" data-tab="file-tab">本地文件</button>
            <button class="tab-btn" data-tab="text-tab">纯文本</button>
            <button class="tab-btn" data-tab="ai-tab">AI辅助</button>
        </div>

        <div class="tab-body">
            <div id="file-tab" class="tab-content active">
                <input type="file" id="import-file" accept=".json,.txt" class="file-input">
            </div>
            <div id="text-tab" class="tab-content">
                <textarea id="import-text" placeholder="请在此粘贴 JSON 格式的数据..." class="text-input  w100pct h300px"></textarea>
            </div>
            <div id="ai-tab" class="tab-content">
                <textarea id="import-ai" placeholder="请在此处输入需要加入的单词或短语，用英文逗号隔开。" class="text-input  w100pct h300px"></textarea>
            </div>
        </div>
    </div>
</div>

<div class="modal-footer">
    <button id="btn-modal-submit" class="btn-primary">开始导入</button>
</div>`

    const ele_root = document.createElement("div");
    ele_root.className = "container-import";
    ele_root.innerHTML = source;

    const btnSubmit = ele_root.querySelector("#btn-modal-submit");

    let activeTab = "file-tab"; // 默认处于“文件”标签页

    // 2. Tab 页签切换逻辑
    ele_root.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            activeTab = btn.getAttribute("data-tab");
            ele_root.querySelector(`#${activeTab}`).classList.add("active");
        });
    });

    // 3. 提交处理
    btnSubmit.addEventListener("click", async () => {
        const mode = document.querySelector('input[name="import-mode"]:checked').value; // 'append' or 'replace'

        if (mode === "replace") {
            dictionary.clearDictionary()
        }

        if (activeTab === "file-tab") {
            // 从本地文件读取
            const fileInput = document.getElementById("import-file");
            if (!fileInput.files || fileInput.files.length === 0) {
                alert("请先选择一个 JSON 文件！");
                return;
            }
            dictionary.importDictionaryByFile(fileInput.files[0]);
        } else if (activeTab === "text-tab") {
            // 从纯文本框读取
            const rawData = document.getElementById("import-text").value.trim();
            if (!rawData) {
                alert("请先粘贴词典数据！");
                return;
            }

            const importedData = JSON.parse(rawData);
            dictionary.importDictionaryByContent(importedData);
        } else {
            const rawData = document.getElementById("import-ai").value.trim();
            if (!rawData) {
                alert("请先粘贴词典数据！");
                return;
            }

            const systemPrompt = "你是一个优秀的英语单词大师。";
            const userPrompt = `将以下指定的英语单词或者短语以json格式输出。

这些单词或者短语是: ${rawData}
格式如下：
{
    "generic": {
        "ipa": "/dʒǝ'nerɪk/ (美英为主)",
        "level": "B2",
        "meaning": "adj. 一般的;属的;类的;非商标的",
        "links": "一些关联的词语，比如它的名词形式，动词形式，三单，ing等等，用逗号隔开",
        "note": "例句，多个例句用'\n'隔开"，
    },
    ...
}
    
要求：
1）只有meaning使用中文，其他一律英文；
2）例句一个就好，极少数可以最多有2个例句；
3）提供的单词在json中全部用小写；`


            const resultText = await ai.askAI(systemPrompt, userPrompt);
            document.getElementById("import-ai").value = resultText;
            // const importedData = JSON.parse(resultText);
            // debugger
            // dictionary.importDictionaryByContent(importedData);



        }
    });

    function update() {
    }

    return {
        ele_root,
        update,
    }
}
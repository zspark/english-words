
function initConfigPanel(dictionary, cmp) {
    //${cmp.dropdownSource("id-answer-form", "Answer Form", _tags, _rts.requirement.answerForm)}

    const source = `
<div class="bs-panel">
    ${cmp.inputSource("id-tags", "Tags", "input tags, separate with ','", false)}
    ${cmp.inputSource("id-APIKEY-chatGPT", "API KEY", "input ChatGPT API KEY.", false)}
    <div class='bs-right-align'>
        ${cmp.buttonGroupSource("id-actions", ["Save"])}
    </div>
</div>`

    const ele_root = document.createElement("div");
    ele_root.className = "plane-config";
    ele_root.innerHTML = source;
    const elem_tags = ele_root.querySelector("#id-tags input");
    const elem_key = ele_root.querySelector("#id-APIKEY-chatGPT input");
    const elem_actions = ele_root.querySelector("#id-actions");


    elem_actions.addEventListener("click", (e) => {
        if (e.target.dataset.index === "0") {//save
            const _tags = elem_tags.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
            dictionary.setTags(_tags);
            dictionary.setAPI(elem_key.value);
        }
    });

    function update() {
        elem_tags.value = dictionary.getTags().join(',');
        elem_key.value = dictionary.getAPI();
    }
    function keyEvent(e) { }

    return {
        ele_root,
        update,
        keyEvent,
    }
}

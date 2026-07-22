
function initComponents() {

    function checkboxSource(id, title, list, checkedIndices = []) {
        let _l = "";
        if (checkedIndices.length > 0 && typeof (checkedIndices[0]) === "string") {
            const arr = [...checkedIndices].map(s => s.toLowerCase());
            for (let i = 0, N = list.length; i < N; ++i) {
                let o = list[i];

                _l += `<div class="bs-option">
                    <input type="checkbox" id="${o}" ${arr.includes(o.toLowerCase()) ? "checked" : ""}>
                    <label for="${o}"> ${o} </label>
                </div>`
            };
        } else {
            for (let i = 0, N = list.length; i < N; ++i) {
                let o = list[i];

                _l += `<div class="bs-option">
                    <input type="checkbox" id="${o}" ${checkedIndices.includes(i) ? "checked" : ""}>
                    <label for="${o}"> ${o} </label>
                </div>`
            };
        }

        let _s = `<div id="${id}">
    <label class="bs-title"> ${title} </label>
    ${_l}
</div>`;
        return _s;
    }

    function dropdownSource(id, title, list, selectedIndex = 0) {
        let _titleElem = title ? `<label class="bs-title">${title}</label>` : ``;
        let _s = `<div id="${id}">
    ${_titleElem}
    <select class="bs-component">
        ${dropdownOptionSource(list, selectedIndex)}
    </select>
</div>`;

        return _s;
    }

    function dropdownOptionSource(list, selectedIndex = 0) {
        let _index;
        if (typeof (selectedIndex) == "string") {
            _index = [...list].map(s => s.toLowerCase()).indexOf(selectedIndex.toLowerCase());
            if (_index < 0) _index = 0;
        } else if (typeof (selectedIndex) == "number") {
            _index = selectedIndex;
        }

        let _s = '';

        for (let i = 0, N = list.length; i < N; ++i) {
            _s += `<option ${i === _index ? "selected" : ""}>${list[i]}</option>`
        }

        return _s;
    }

    let _radioGroupNameIndex = 1;
    function radioButtonSource(id, title, list, selectedIndex = 0) {
        _radioGroupNameIndex += 1;

        let _s = `<div id="${id}">
            <label class="bs-title"> ${title} </label>`;

        for (let i = 0, N = list.length; i < N; ++i) {
            let o = list[i];

            _s += `<div class="bs-option">
                <input type="radio" name="level-${_radioGroupNameIndex}" id=" ${o}" ${i === selectedIndex ? "checked" : ""}>
                <label for=" ${o}"> ${o} </label>
            </div>`
        }

        _s += `</div>`;

        return _s;
    }

    function sliderSource(id, title, min, max, current) {
        let _s = `<div id="${id}">
            <label class="bs-title"> ${title} </label>
            <div class="bs-slider-wrapper">
                <input
                    class="bs-component"
                    type="range"
                    min="${min}"
                    max="${max}"
                    value="${current}"
                    oninput="this.nextElementSibling.textContent = this.value"
                >
                <div class="bs-value">  ${current}  </div>
            </div>
        </div>`


        // const slider = document.getElementById("bsSlider");
        // const sliderValue = document.getElementById("bsSliderValue");
        // slider.addEventListener(
        //     "input",
        //     () => {

        //         sliderValue.textContent =
        //             slider.value;

        //     }
        // );
        return _s;
    }

    function switcherSource(id, title, checked = false) {
        let _s = `<div id="${id}">
            <label class="bs-switch">
                <input type="checkbox" ${checked ? "checked" : ""}>
                <span class="bs-switch-slider"></span>
            </label>
            <span>${title}</span>
        </div>`
        return _s;
    }

    function buttonGroupSource(id, list, classList = []) {
        let _b = '';
        for (let i = 0, N = list.length; i < N; ++i) {
            let _cls = classList[i] || "";
            _b += `<button class="${_cls} bs-btn" data-index="${i}">${list[i]}</button>`
        }
        let _s = `<div id="${id}" class="bs-btn-group"> ${_b} </div>`
        return _s;
    }

    function progressBarSource(id, pct) {
        return `<div id="${id}" class="bs-progress">
    <div class="bs-progress-fill" style="width:${pct}%;"></div>
    <span class="bs-progress-text">${pct}%</span>
</div>`
    }

    function inputSource(id, title, placeholder = '', required = false) {
        const _t = title ? `<label class="bs-title">${title}</label>` : "";
        return `<div id="${id}">
    ${_t}
    <input class="bs-input" type="text" placeholder="${placeholder}" ${required ? "required" : ""} autocomplete="off">
</div>`
    }

    function textareaSource(id, title, additionalClasses = '', placeholder = '') {
        const _t = title ? `<label class="bs-title">${title}</label>` : "";
        return `<div id="${id}">
    ${_t}
    <textarea class="bs-input ${additionalClasses}" placeholder="${placeholder}"></textarea>
</div>`
    }

    function clickableBlockSource(id, title) {
        return `<div id="${id}">
    <label class="bs-title">${title}</label>
    <div id="id-A" class="bs-component" style="margin-bottom:5px"> </div>
    <div id="id-B" class="bs-component"> </div>
</div>`
    }

    function showMask(message = "This is a message.",
        okText = "OK", onOK = null,
        cancelText = "Cancel", onCancel = null
    ) {

        document.getElementById("bs-mask")?.remove();

        const mask = document.createElement("div");
        mask.id = "bs-mask";

        const _okBtnStr = onOK ? `<button class="bs-btn bs-btn-ok"> ${okText} </button>` : '';
        const _cancelBtnStr = onCancel ? `<button class="bs-btn bs-btn-cancel"> ${cancelText} </button>` : '';

        mask.innerHTML = `
        <div class="bs-mask-dialog">

            <div class="bs-mask-message"> ${message} </div>
            <div class="bs-mask-buttons">
                ${_okBtnStr}
                ${_cancelBtnStr}
            </div>
        </div>
    `;

        document.body.appendChild(mask);

        const _a = mask.querySelector(".bs-btn-ok")
        if (_a) {
            _a.onclick = () => {
                onOK();
                mask.remove();
            };
        }

        const _b = mask.querySelector(".bs-btn-cancel")
        if (_b) {
            _b.onclick = () => {
                onCancel();
                mask.remove();
            };
        }
    }

    return {
        clickableBlockSource,
        progressBarSource,
        buttonGroupSource,
        checkboxSource,
        radioButtonSource,
        dropdownSource,
        dropdownOptionSource,
        sliderSource,
        inputSource,
        textareaSource,
        switcherSource,
        showMask,
    }
}

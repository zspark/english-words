
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
    <select class="bs-select">
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
            <input class="bs-slider" id="bsSlider" type="range" min="${min}" max="${max}" value="${current}">
            <div class="bs-value"> Value: <span id="bsSliderValue"> ${current} </span> </div>
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

    function inputSource(id, title, placeholder = '') {
        let _s = `<div id="${id}">
            <label class="bs-title">${title}</label>
            <input class="bs-input" type="text" placeholder="${placeholder}">
        </div>`

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

    function buttonGroupSource(id, list, activeIndex = 0) {
        let _b = '';
        for (let i = 0, N = list.length; i < N; ++i) {
            let o = list[i];
            _b += `<button class="bs-btn ${i == activeIndex ? "active" : ''}" data-index="${i}">${o}</button>`
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
        return `<div id="${id}">
        <label class="bs-title">${title}</label>
        <input class="bs-input" type="text" placeholder="${placeholder}" ${required ? "required" : ""} autocomplete="off">
</div>`
    }

    return {
        inputSource,
        progressBarSource,
        buttonGroupSource,
        checkboxSource,
        radioButtonSource,
        dropdownSource,
        dropdownOptionSource,
        sliderSource,
        inputSource,
        switcherSource
    }
}

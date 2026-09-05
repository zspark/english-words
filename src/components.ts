
import { HTMLString } from "./types.js"

function checkboxSource(
    id: string,
    title: string,
    list: string[],
    checkedIndices: Array<string | number> = []
): HTMLString {
    let _l = "";
    if (checkedIndices.length > 0 && typeof (checkedIndices[0]) === "string") {
        const arr = checkedIndices.map(s => (s as string).toLowerCase());
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

function dropdownSource(id: string, title: string | null, list: string[], selectedIndex: number | string = 0): HTMLString {
    let _titleElem = title ? `<label class="bs-title">${title}</label>` : ``;
    let _s = `<div id="${id}">
    ${_titleElem}
    <select class="bs-select">
        ${dropdownOptionSource(list, selectedIndex)}
    </select>
</div>`;

    return _s;
}

function dropdownOptionSource(list: string[], selectedIndex: number | string = 0): HTMLString {
    let _index: number = 0;
    if (typeof (selectedIndex) == "string") {
        _index = list.map(s => s.toLowerCase()).indexOf(selectedIndex.toLowerCase());
        if (_index < 0) _index = 0;
    } else if (typeof (selectedIndex) == "number") {
        _index = selectedIndex;
    }

    let _s: HTMLString = '';

    for (let i = 0, N = list.length; i < N; ++i) {
        _s += `<option ${i === _index ? "selected" : ""}>${list[i]}</option>`
    }

    return _s;
}

let _radioGroupNameIndex = 1;

function radioButtonSource(id: string, title: string, list: string[], selectedIndex = 0): HTMLString {
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

function sliderSource(id: string, title: string, min: number, max: number, current: number): HTMLString {
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

function switcherSource(id: string, title: string, checked = false): HTMLString {
    let _s = `<div id="${id}">
            <label class="bs-switch">
                <input type="checkbox" ${checked ? "checked" : ""}>
                <span class="bs-switch-slider"></span>
            </label>
            <span>${title}</span>
        </div>`
    return _s;
}

function buttonGroupSource(id: string, list: string[], classList: string[] = []): HTMLString {
    let _b = '';
    for (let i = 0, N = list.length; i < N; ++i) {
        let _cls = classList[i] || "";
        _b += `<button class="${_cls} bs-btn" data-index="${i}">${list[i]}</button>`
    }
    let _s = `<div id="${id}" class="bs-btn-group"> ${_b} </div>`
    return _s;
}

function progressBarSource(id: string, pct: number): HTMLString {
    return `<div id="${id}" class="bs-progress">
    <div class="bs-progress-fill" style="width:${pct}%;"></div>
    <span class="bs-progress-text">${pct}%</span>
</div>`
}

function inputSource(id: string, title: string | null, placeholder = '', required = false): HTMLString {
    const _t = title ? `<label class="bs-title">${title}</label>` : "";
    return `<div id="${id}" class="w100pct">
    ${_t}
    <input class="bs-input" type="text" placeholder="${placeholder}" ${required ? "required" : ""} autocomplete="off">
</div>`
}

function searchSource(id: string, placeholder = ''): HTMLString {
    return `<div id="${id}" class="w100pct bs-input-wrapper">
    <input class="bs-input" type="text" placeholder="${placeholder}" autocomplete="off">
    <button class="bs-input-clear" type="button" aria-label="Clear">×</button>
</div>`
}

function textareaSource(id: string, title: string | null, additionalClasses = '', placeholder = ''): HTMLString {
    const _t = title ? `<label class="bs-title">${title}</label>` : "";
    return `<div id="${id}">
    ${_t}
    <textarea class="bs-input ${additionalClasses}" placeholder="${placeholder}"></textarea>
</div>`
}

function clickableBlockSource(id: string, title: string): HTMLString {
    return `<div id="${id}">
    <label class="bs-title">${title}</label>
    <div id="id-A" class="bs-component" style="margin-bottom:5px"> </div>
    <div id="id-B" class="bs-component"> </div>
</div>`
}

type maskCallbackFn = (e: HTMLElement) => void;

function showMask(
    message = "This is a message.",
    okText = "OK", onOK: maskCallbackFn | null = null,
    cancelText = "Cancel", onCancel: maskCallbackFn | null = null
): HTMLElement {

    document.getElementById("bs-mask")?.remove();

    const mask: HTMLDivElement = document.createElement("div");
    mask.id = "bs-mask";

    const _okBtnStr = onOK ? `<button class="bs-btn bs-btn-ok"> ${okText} </button>` : '';
    const _cancelBtnStr = onCancel ? `<button class="bs-btn bs-btn-cancel"> ${cancelText} </button>` : '';

    mask.innerHTML = `
        <div class="bs-mask-dialog">

            <div class="bs-mask-message"> ${message} </div>
            <div class="bs-mask-buttons">
                ${_cancelBtnStr}
                ${_okBtnStr}
            </div>
        </div>`;

    document.body.appendChild(mask);

    const _a = mask.querySelector<HTMLButtonElement>(".bs-btn-ok")
    if (_a) {
        _a.onclick = () => {
            if (onOK) onOK(mask);
            mask.remove();
        };
    }

    const _b = mask.querySelector<HTMLButtonElement>(".bs-btn-cancel")
    if (_b) {
        _b.onclick = () => {
            if (onCancel) onCancel(mask);
            mask.remove();
        };
    }

    return mask;
}

export default {
    clickableBlockSource,
    progressBarSource,
    buttonGroupSource,
    checkboxSource,
    radioButtonSource,
    dropdownSource,
    dropdownOptionSource,
    sliderSource,
    inputSource,
    searchSource,
    textareaSource,
    switcherSource,
    showMask,
}

export { HTMLString }


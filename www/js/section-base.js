export class SectionUIBase {
    #ele_root;
    constructor(cls, source) {
        this.#ele_root = document.createElement("div");
        this.#ele_root.className = cls;
        this.#ele_root.innerHTML = source;
    }
    get isConnected() { return this.#ele_root.isConnected; }
    setParent(p, mode = "removeall") {
        if (p) {
            if (mode === "removeall") {
                p.replaceChildren(this.#ele_root);
            }
            else if (mode === "append-first") {
                p.prepend(this.#ele_root);
            }
            else if (mode === "append-last") {
                p.append(this.#ele_root);
            }
        }
        else {
            this.#ele_root.remove();
        }
    }
    getRoot() {
        return this.#ele_root;
    }
    get(selector) {
        return this.#ele_root.querySelector(selector);
    }
    getAll(selector) {
        return [...this.#ele_root.querySelectorAll(selector)];
    }
    removeAttrib(selector, attrib) {
        const _elem = this.get(selector);
        _elem?.removeAttribute(attrib);
        return _elem;
    }
    addAttrib(selector, attrib, value = '') {
        const _elem = this.get(selector);
        _elem?.setAttribute(attrib, value);
        return _elem;
    }
    addClass(selector, cls) {
        const _elem = this.get(selector);
        if (typeof cls === "string") {
            _elem.classList?.add(cls);
        }
        else {
            _elem.classList?.add(...cls);
        }
        return _elem;
    }
    removeClass(selector, cls) {
        const _elem = this.get(selector);
        if (typeof cls === "string") {
            _elem.classList?.remove(cls);
        }
        else {
            _elem.classList?.remove(...cls);
        }
        return _elem;
    }
    setInnerHTML(selector, source) {
        const _elem = this.get(selector);
        _elem.innerHTML = source;
        return _elem;
    }
    remove(selector) {
        const _elem = this.get(selector);
        _elem?.remove();
        return _elem;
    }
}
export class SectionBase {
    #_ui;
    _card;
    _dict;
    constructor(cls, source, dict, card) {
        this.#_ui = new SectionUIBase(cls, source);
        this._card = card;
        this._dict = dict;
    }
    get ui() { return this.#_ui; }
    active() { }
    deactive() { }
    setSync(y) { }
    keyEvent(event) { }
}

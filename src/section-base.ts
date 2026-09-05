import { ChildMode } from "./types.js"
import { HTMLString } from "./components.js"
import Dictionary from "./dictionary.js"
import Card from "./card.js"

export class SectionUIBase {
    #ele_root: HTMLDivElement;
    constructor(cls: string, source: HTMLString) {
        this.#ele_root = document.createElement("div");
        this.#ele_root.className = cls;
        this.#ele_root.innerHTML = source;
    }

    get isConnected(): boolean { return this.#ele_root.isConnected; }

    setParent(p: HTMLElement | null, mode: ChildMode = "removeall"): void {
        if (p) {
            if (mode === "removeall") {
                p.replaceChildren(this.#ele_root);
            } else if (mode === "append-first") {
                p.prepend(this.#ele_root);
            } else if (mode === "append-last") {
                p.append(this.#ele_root);
            }
        } else {
            this.#ele_root.remove();
        }
    }

    getRoot(): HTMLElement {
        return this.#ele_root;
    }

    get<T extends Element = HTMLElement>(selector: string): T {
        return this.#ele_root.querySelector(selector) as T;
    }

    getAll<T extends Element = HTMLElement>(selector: string): T[] {
        return [...this.#ele_root.querySelectorAll<T>(selector)];
    }

    removeAttrib<T extends Element = HTMLElement>(selector: string, attrib: string): T {
        const _elem = this.get<T>(selector);
        _elem?.removeAttribute(attrib);
        return _elem;
    }

    addAttrib<T extends Element = HTMLElement>(selector: string, attrib: string, value: string = ''): T {
        const _elem = this.get<T>(selector);
        _elem?.setAttribute(attrib, value);
        return _elem;
    }

    addClass<T extends Element = HTMLElement>(selector: string, cls: string[] | string): T {
        const _elem = this.get<T>(selector);
        if (typeof cls === "string") {
            _elem.classList?.add(cls);
        } else {
            _elem.classList?.add(...cls);
        }
        return _elem;
    }

    removeClass<T extends Element = HTMLElement>(selector: string, cls: string[] | string): T {
        const _elem = this.get<T>(selector);
        if (typeof cls === "string") {
            _elem.classList?.remove(cls);
        } else {
            _elem.classList?.remove(...cls);
        }
        return _elem;
    }

    setInnerHTML<T extends Element = HTMLElement>(selector: string, source: HTMLString): T {
        const _elem = this.get<T>(selector);
        _elem.innerHTML = source;
        return _elem;
    }

    remove<T extends Element = HTMLElement>(selector: string): T {
        const _elem = this.get<T>(selector);
        _elem?.remove();
        return _elem;
    }
}

export class SectionBase {

    #_ui: SectionUIBase;
    protected _card: Card;
    protected _dict: Dictionary;

    constructor(cls: string, source: HTMLString, dict: Dictionary, card: Card) {
        this.#_ui = new SectionUIBase(cls, source);
        this._card = card;
        this._dict = dict;
    }

    get ui(): SectionUIBase { return this.#_ui; }

    active(): void { }
    deactive(): void { }

    setSync(y: number) { }
    keyEvent(event: KeyboardEvent): void { }
}

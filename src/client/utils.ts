import { Detail } from "../types.d.js"

export async function fetchJsonData(url: string): Promise<any> {
    try {
        const response = await fetch(url);

        // Check if the HTTP status code is in the 200–299 range
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse and return the JSON body
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch JSON:', error);
        throw error; // Re-throw so caller can handle it if needed
    }
}

const _PLF_WINDOWS_: string = "Windows";
const _PLF_IOS_: string = "iOS";
const _PLF_MACOS_: string = "macOS";
const _PLF_LINUX_: string = "Linux";
const _PLF_ANDROID_: string = "Android";

const _PLATFORM_: string = (function(): string {
    const ua = navigator.userAgent;

    if (/Android/i.test(ua)) return _PLF_ANDROID_;
    if (/iPhone|iPad|iPod/i.test(ua)) return _PLF_IOS_;
    if (/Windows/i.test(ua)) return _PLF_WINDOWS_;
    if (/Macintosh|Mac OS X/i.test(ua)) return _PLF_MACOS_;
    if (/Linux/i.test(ua)) return _PLF_LINUX_;

    return "Unknown";
})()

export function isDesktop(): boolean {
    return _PLATFORM_ === _PLF_LINUX_ || _PLATFORM_ === _PLF_WINDOWS_ || _PLATFORM_ === _PLF_MACOS_;
}

export function isMobile(): boolean {
    return _PLATFORM_ === _PLF_IOS_ || _PLATFORM_ === _PLF_ANDROID_;
}

export function isControlKey(key: string): boolean {
    return key === 'Control' ||
        key === 'Shift' ||
        key === 'Alt' ||
        key === 'Enter' ||
        key === 'Escape' ||
        key === 'Meta'; // Windows key / Command key
}

export function shuffle(arr: Array<any>): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

export function readOnly<T extends object>(obj: T): Readonly<T> {
    return new Proxy(obj, {
        set() {
            throw new Error("Object is read-only");
        },

        deleteProperty() {
            throw new Error("Object is read-only");
        },

        defineProperty() {
            throw new Error("Object is read-only");
        }
    });
}

export function isEditing(event: KeyboardEvent): boolean {
    const el = document.activeElement as HTMLElement;

    const _r = (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el.isContentEditable
    );
    if (_r && event.key === "Escape") {
        el.blur();
    }
    return _r;
}

export function findNearestElement<T extends HTMLElement>(
    fromElem: Node,
    selector: string
): T | null {
    const elem = fromElem instanceof Element ? fromElem : fromElem.parentElement;
    return elem ? elem.closest(selector) : null;
}

export function cloneDetail(from: Detail, time_modify?: number, time_create?: number): Detail {
    return {
        word: from.word,
        ipa: from.ipa,
        meaning: from.meaning,
        level: from.level,
        tags: from.tags,
        note: from.note,
        links: from.links,
        time_create: time_create ?? from.time_create,
        time_modify: time_modify ?? from.time_modify,
    }
}

export function objectToBase64(obj: any): string {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));

    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}

export function base64ToObject(base64: string): any {
    const binary = atob(base64.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
}

export function createDetail(note: string): Detail {
    const _t = Date.now();
    return {
        word: "word",
        ipa: "ipa",
        meaning: "meaning",
        level: "ALL",
        tags: "",
        note,
        links: "",
        time_create: _t,
        time_modify: _t,
    }
}

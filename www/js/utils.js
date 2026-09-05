export async function fetchJsonData(url) {
    try {
        const response = await fetch(url);
        // Check if the HTTP status code is in the 200–299 range
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        // Parse and return the JSON body
        const data = await response.json();
        return data;
    }
    catch (error) {
        console.error('Failed to fetch JSON:', error);
        throw error; // Re-throw so caller can handle it if needed
    }
}
const _PLF_WINDOWS_ = "Windows";
const _PLF_IOS_ = "iOS";
const _PLF_MACOS_ = "macOS";
const _PLF_LINUX_ = "Linux";
const _PLF_ANDROID_ = "Android";
const _PLATFORM_ = (function () {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua))
        return _PLF_ANDROID_;
    if (/iPhone|iPad|iPod/i.test(ua))
        return _PLF_IOS_;
    if (/Windows/i.test(ua))
        return _PLF_WINDOWS_;
    if (/Macintosh|Mac OS X/i.test(ua))
        return _PLF_MACOS_;
    if (/Linux/i.test(ua))
        return _PLF_LINUX_;
    return "Unknown";
})();
export function isDesktop() {
    return _PLATFORM_ === _PLF_LINUX_ || _PLATFORM_ === _PLF_WINDOWS_ || _PLATFORM_ === _PLF_MACOS_;
}
export function isMobile() {
    return _PLATFORM_ === _PLF_IOS_ || _PLATFORM_ === _PLF_ANDROID_;
}
export function isControlKey(key) {
    return key === 'Control' ||
        key === 'Shift' ||
        key === 'Alt' ||
        key === 'Enter' ||
        key === 'Escape' ||
        key === 'Meta'; // Windows key / Command key
}
export function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
export function readOnly(obj) {
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
export function isEditing(event) {
    const el = document.activeElement;
    const _r = (el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el.isContentEditable);
    if (_r && event.key === "Escape") {
        el.blur();
    }
    return _r;
}
export function findNearestElementWithTag(fromElem, tagName) {
    tagName = tagName.toUpperCase();
    while (fromElem) {
        if (fromElem.tagName === tagName)
            return fromElem;
        fromElem = fromElem.parentElement;
    }
    return null;
}

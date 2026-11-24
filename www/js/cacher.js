import { readOnly } from "./utils.js";
import logger from "./logger.js";
export class RuntimeCacher extends EventTarget {
    #_name;
    #_isEmpty = true;
    #_obj;
    constructor(name, data = undefined) {
        super();
        this.#_name = name;
        this.#_obj = (!!data) ? data : {};
    }
    get name() { return this.#_name; }
    isEmpty() {
        return this.#_isEmpty;
    }
    data() {
        return readOnly(this.#_obj);
    }
    append(data, event = false) {
        Object.assign(this.#_obj, data);
        if (event)
            this.dispatchEvent(new Event('changed'));
    }
    /**
     * key will be separated by '.';
     */
    set(key, value, event = false) {
        const _arr = key.split('.');
        let _obj = this.#_createObject(_arr);
        _obj[_arr[_arr.length - 1]] = value;
        if (event)
            this.dispatchEvent(new Event('changed'));
    }
    get(key, defaultValue = undefined) {
        const _arr = key.split('.');
        let _obj = this.#_createObject(_arr);
        let _name = _arr[_arr.length - 1];
        let _v = _obj[_name];
        if (!_v) {
            _v = defaultValue;
            if (defaultValue) {
                _obj[_name] = defaultValue;
            }
        }
        return _v;
    }
    #_createObject(path) {
        const N = path.length;
        if (N <= 0)
            return;
        let _obj = this.#_obj;
        for (let i = 0; i < N - 1; ++i) {
            let _name = path[i];
            if (!_obj[_name]) {
                _obj[_name] = {};
            }
            _obj = _obj[_name];
        }
        return _obj;
    }
    has(key) {
        return !!this.#_obj[key];
    }
    remove(key, event = false) {
        delete this.#_obj[key];
        if (event)
            this.dispatchEvent(new Event('changed'));
    }
    clear(data = undefined, event = false) {
        this.#_obj = (!!data) ? data : {};
        if (event)
            this.dispatchEvent(new Event('changed'));
    }
    broadcast() {
        this.dispatchEvent(new Event('changed'));
    }
    toString() {
        return JSON.stringify(this.#_obj);
    }
}
export class StorageCacher extends RuntimeCacher {
    #_delayMS;
    #_timer = 0;
    constructor(name, delayMS = 1000) {
        let _obj;
        const _a = localStorage.getItem(name);
        if (_a) {
            _obj = JSON.parse(_a);
        }
        else {
            _obj = {};
        }
        super(name, _obj);
        this.#_delayMS = delayMS;
    }
    append(data, event = false) {
        super.append(data, event);
        this.#_delaySave();
    }
    set(key, value, event = false) {
        super.set(key, value, event);
        this.#_delaySave();
    }
    remove(key, event = false) {
        super.remove(key, event);
        this.#_delaySave();
    }
    clear(data = undefined, event = false) {
        super.clear(data, event);
        this.#_delaySave();
    }
    #_delaySave() {
        if (this.#_delayMS <= 0) {
            this.save();
            return;
        }
        if (!this.#_timer) {
            this.#_timer = setTimeout(() => {
                this.save();
                this.#_timer = 0;
            }, this.#_delayMS);
        }
    }
    save() {
        try {
            localStorage.setItem(this.name, this.toString());
        }
        catch (e) {
            logger.vital(e);
        }
    }
}
const localProxy = new StorageCacher('__localCache__');
const metaProxy = new RuntimeCacher('__metaCache__');
const lemmatizerProxy = new StorageCacher('__lemmatizerCache__');
const recordsProxy = new StorageCacher('__recordCache__');
const configProxy = new RuntimeCacher('__configCache__');
export default {
    localProxy,
    metaProxy,
    recordsProxy,
    lemmatizerProxy,
    configProxy,
};

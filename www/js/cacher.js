import { readOnly } from "./utils.js";
import logger from "./logger.js";
export class RuntimeCacher {
    #_name;
    #_isEmpty = true;
    #_obj;
    constructor(name, data = undefined) {
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
    append(data) {
        Object.assign(this.#_obj, data);
    }
    /**
     * key will be separated by '.';
     */
    set(key, value) {
        const _arr = key.split('.');
        let _obj = this.#_createObject(_arr);
        _obj[_arr[_arr.length - 1]] = value;
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
    remove(key) {
        delete this.#_obj[key];
    }
    clear(data = undefined) {
        this.#_obj = (!!data) ? data : {};
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
    append(data) {
        super.append(data);
        this.#_delaySave();
    }
    set(key, value) {
        super.set(key, value);
        this.#_delaySave();
    }
    remove(key) {
        super.remove(key);
        this.#_delaySave();
    }
    clear(data = undefined) {
        super.clear(data);
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
const metaProxy = new StorageCacher('__metaCache__');
const lemmatizerProxy = new StorageCacher('__lemmatizerCache__');
const recordsProxy = new StorageCacher('__recordCache__');
const wordsProxy = new StorageCacher('__wordCache__');
export default {
    localProxy,
    metaProxy,
    recordsProxy,
    wordsProxy,
    lemmatizerProxy,
};

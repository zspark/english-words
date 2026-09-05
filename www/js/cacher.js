import { readOnly } from "./utils.js";
import logger from "./logger.js";
class Cacher {
    #_name;
    #_delayMS;
    #_isEmpty = true;
    #_obj = {};
    #_timer = 0;
    constructor(name, delayMS = 1000) {
        this.#_name = name;
        this.#_delayMS = delayMS;
        const _a = localStorage.getItem(name);
        if (_a) {
            this.#_isEmpty = false;
            this.#_obj = JSON.parse(_a);
        }
    }
    delaySave() {
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
    isEmpty() {
        return this.#_isEmpty;
    }
    data() {
        return readOnly(this.#_obj);
    }
    append(data) {
        Object.assign(this.#_obj, data);
        this.delaySave();
    }
    save() {
        try {
            localStorage.setItem(this.#_name, JSON.stringify(this.#_obj));
        }
        catch (e) {
            logger.vital(e);
        }
    }
    /**
     * key will be separated by '.';
     */
    set(key, value) {
        const _arr = key.split('.');
        let _obj = this.#_createObject(_arr);
        _obj[_arr[_arr.length - 1]] = value;
        this.delaySave();
    }
    get(key, defaultValue = null) {
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
        this.delaySave();
    }
    clear() {
        localStorage.removeItem(this.#_name);
        this.#_obj = {};
    }
}
const localProxy = new Cacher('__localCache__');
const metaProxy = new Cacher('__metaCache__');
const lemmatizerProxy = new Cacher('__lemmatizerCache__');
const recordsProxy = new Cacher('__recordCache__');
const wordsProxy = new Cacher('__wordCache__');
export default {
    localProxy,
    metaProxy,
    recordsProxy,
    wordsProxy,
    lemmatizerProxy,
};

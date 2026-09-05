import { readOnly } from "./utils.js"
import logger from "./logger.js"

class Cacher {

    #_name: string;
    #_delayMS: number;

    #_isEmpty: boolean = true;
    #_obj: Record<string, any> = {};
    #_timer: number = 0;

    constructor(name: string, delayMS: number = 1000) {
        this.#_name = name;
        this.#_delayMS = delayMS;

        const _a = localStorage.getItem(name);
        if (_a) {
            this.#_isEmpty = false;
            this.#_obj = JSON.parse(_a);
        }
    }

    delaySave(): void {
        if (this.#_delayMS <= 0) {
            this.save();
            return;
        }
        if (!this.#_timer) {
            this.#_timer = setTimeout(() => {
                this.save();
                this.#_timer = 0;
            }, this.#_delayMS)
        }
    }

    isEmpty(): boolean {
        return this.#_isEmpty;
    }

    data(): object {
        return readOnly(this.#_obj);
    }

    append(data: Record<string, any>): void {
        Object.assign(this.#_obj, data);
        this.delaySave();
    }

    save(): void {
        try {
            localStorage.setItem(this.#_name, JSON.stringify(this.#_obj));
        } catch (e) {
            logger.vital(e);
        }
    }

    /**
     * key will be separated by '.';
     */
    set(key: string, value: any): void {
        const _arr = key.split('.');
        let _obj = this.#_createObject(_arr);
        _obj[_arr[_arr.length - 1]] = value;
        this.delaySave();
    }

    get(key: string, defaultValue: any = null): any {
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

    #_createObject(path: string[]): any {
        const N = path.length;
        if (N <= 0) return;

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

    has(key: string): boolean {
        return !!this.#_obj[key];
    }

    remove(key: string): void {
        delete this.#_obj[key];
        this.delaySave();
    }

    clear(): void {
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
}


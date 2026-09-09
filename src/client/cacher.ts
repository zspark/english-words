import { readOnly } from "./utils.js"
import logger from "./logger.js"


export class RuntimeCacher {

    #_name: string;
    #_isEmpty: boolean = true;
    #_obj: Record<string, any>;

    constructor(name: string, data: Record<string, any> | undefined = undefined) {
        this.#_name = name;
        this.#_obj = (!!data) ? data : {};
    }

    get name(): string { return this.#_name; }

    isEmpty(): boolean {
        return this.#_isEmpty;
    }

    data(): object {
        return readOnly(this.#_obj);
    }

    append(data: Record<string, any>): void {
        Object.assign(this.#_obj, data);
    }

    /**
     * key will be separated by '.';
     */
    set<T>(key: string, value: T): void {
        const _arr = key.split('.');
        let _obj = this.#_createObject(_arr);
        _obj[_arr[_arr.length - 1]] = value;
    }

    get<T>(key: string, defaultValue: T | undefined = undefined): T {
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
    }

    clear(data: Record<string, any> | undefined = undefined): void {
        this.#_obj = (!!data) ? data : {};
    }

    toString(): string {
        return JSON.stringify(this.#_obj);
    }
}

export class StorageCacher extends RuntimeCacher {

    #_delayMS: number;
    #_timer: number = 0;

    constructor(name: string, delayMS: number = 1000) {

        let _obj: Record<string, any>;
        const _a = localStorage.getItem(name);
        if (_a) {
            _obj = JSON.parse(_a);
        } else {
            _obj = {};
        }
        super(name, _obj);
        this.#_delayMS = delayMS;
    }

    append(data: Record<string, any>): void {
        super.append(data);
        this.#_delaySave();
    }

    set<T>(key: string, value: T): void {
        super.set(key, value);
        this.#_delaySave();
    }

    remove(key: string): void {
        super.remove(key);
        this.#_delaySave();
    }

    clear(data: Record<string, any> | undefined = undefined): void {
        super.clear(data);
        this.#_delaySave();
    }

    #_delaySave(): void {
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

    save(): void {
        try {
            localStorage.setItem(this.name, this.toString());
        } catch (e) {
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
}


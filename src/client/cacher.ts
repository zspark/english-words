import { readOnly } from "./utils.js"
import logger from "./logger.js"


export class RuntimeCacher extends EventTarget {

    #_name: string;
    #_isEmpty: boolean = true;
    #_obj: Record<string, any>;

    constructor(name: string, data: Record<string, any> | undefined = undefined) {
        super();
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

    append(data: Record<string, any>, event: boolean = false): void {
        Object.assign(this.#_obj, data);
        if (event) this.dispatchEvent(new Event('changed'));
    }

    /**
     * key will be separated by '.';
     */
    set<T>(key: string, value: T, event: boolean = false): void {
        const _arr = key.split('.');
        let _obj = this.#_createObject(_arr);
        _obj[_arr[_arr.length - 1]] = value;

        if (event) this.dispatchEvent(new Event('changed'));
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

    remove(key: string, event: boolean = false): void {
        delete this.#_obj[key];
        if (event) this.dispatchEvent(new Event('changed'));
    }

    clear(data: Record<string, any> | undefined = undefined, event: boolean = false): void {
        this.#_obj = (!!data) ? data : {};
        if (event) this.dispatchEvent(new Event('changed'));
    }

    broadcast(): void {
        this.dispatchEvent(new Event('changed'));
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

    append(data: Record<string, any>, event: boolean = false): void {
        super.append(data, event);
        this.#_delaySave();
    }

    set<T>(key: string, value: T, event: boolean = false): void {
        super.set(key, value, event);
        this.#_delaySave();
    }

    remove(key: string, event: boolean = false): void {
        super.remove(key, event);
        this.#_delaySave();
    }

    clear(data: Record<string, any> | undefined = undefined, event: boolean = false): void {
        super.clear(data, event);
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
}


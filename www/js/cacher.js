
function initCacher(logger) {

    function _create(name, delayMS = 1000) {
        let _timer = null;
        let _tmp = JSON.parse(localStorage.getItem(name));
        let _obj = _tmp || {};

        function delaySave() {
            if (delayMS <= 0) {
                save();
                return;
            }
            if (!_timer) {
                _timer = setTimeout(() => {
                    save();
                    _timer = null;
                }, delayMS)
            }
        }

        function isEmpty() {
            return !_tmp;
        }
        function data() {
            return readOnly(_obj);
        }
        function append(data) {
            Object.assign(_obj, data);
            delaySave();
        }
        function save() {
            try {
                localStorage.setItem(name, JSON.stringify(_obj));
            } catch (e) {
                logger.vital(e);
            }
        }
        function set(key, value) {
            _obj[key] = value;
            delaySave();
        }
        function get(key, defaultValue = null) {
            let _v = _obj[key];
            if (!_v) {
                _v = defaultValue;
                if (defaultValue) {
                    set(key, defaultValue);
                }
            }
            return _v;
        }
        function has(key) {
            return !!_obj[key];
        }
        function remove(key) {
            delete _obj[key];
            delaySave();
        }
        function clear() {
            localStorage.removeItem(name);
            _tmp = null;
            _obj = {};
        }
        return { delaySave, save, get, set, clear, isEmpty, has, remove, data, append }
    }

    const localProxy = _create('__localCache__');
    const metaProxy = _create('__metaCache__');
    const recordsProxy = _create('__recordCache__');
    const wordsProxy = _create('__wordCache__');

    return {
        localProxy,
        metaProxy,
        recordsProxy,
        wordsProxy,
    }
}

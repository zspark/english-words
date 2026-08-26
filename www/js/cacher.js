
function initCacher(logger) {

    function create(name, delaySave = 1000) {
        let _timer = null;
        let _tmp = JSON.parse(localStorage.getItem(name));
        let _obj = _tmp || {};

        function _delaySave() {
            if (delaySave <= 0) {
                save();
                return;
            }
            if (!_timer) {
                _timer = setTimeout(() => {
                    save();
                    _timer = null;
                }, delaySave)
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
            _delaySave();
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
            _delaySave();
        }
        function get(key, defaultValue = null) {
            let _v = _obj[key];
            if (!_v) {
                _v = defaultValue;
                if (defaultValue) _obj[key] = defaultValue;
            }
            return _v;
        }
        function has(key) {
            return !!_obj[key];
        }
        function remove(key) {
            delete _obj[key];
            _delaySave();
        }
        function clear() {
            localStorage.removeItem(name);
            _tmp = null;
            _obj = {};
        }
        return { save, get, set, clear, isEmpty, has, remove, data, append }
    }

    return {
        create,
    }
}

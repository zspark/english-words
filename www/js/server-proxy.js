
function initServerProxy(logger, cacherCreator) {

    const _localProxy = cacherCreator.create('__localCache__');
    function getLocalData() {
        return _localProxy.get("sec_setting", {});
    }

    function _dispDictEvt(action, msg = '') {
        __this__.dispatchEvent(new CustomEvent(__this__.EVT_DICT_LOADED, { detail: { action, message: msg } }));
    }

    async function _toServer(data) {
        logger.log(`C -> S request type: ${data.requestType}`);
        _dispDictEvt(`begin:sync`);

        const _accessToken = getLocalData()['userID'] || "";
        if (_accessToken && (_accessToken.length > 0)) {
            data.accessToken = _accessToken;
        }

        const _response = await fetch("../api/data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data, null, 4),
        });

        try {
            if (_response.status === 200) {
                const _responseData = await _response.json();
                if (_responseData.success) {
                    if (_responseData.code === 200) {
                        getLocalData()["syncTime"] = _responseData.syncTime;
                    }
                    // logger.debug(`${_responseData.content}`);
                    logger.log(`S -> C ${_responseData.info}`);
                    return _responseData.content ?? "";
                } else {
                    logger.error(`S -> C ${_responseData.info}`);
                }
                _dispDictEvt(`end:sync`, _responseData.info);
            } else {
                logger.error(`S -> C ${_response.status}`);
                _dispDictEvt(`end:sync`, `Vital Error: ${_response.status}`);
            }
        } catch (err) {
            logger.vital(`To server: ${err}`);
            _dispDictEvt(`end:sync`, err);
        }
    }

    async function loadData() {
        await _toServer({
            requestType: "get",
            syncTime: getLocalData()['syncTime'] || 1,
        })
    }

    async function saveData() {
        await _toServer({
            requestType: "save",
            content: _assemblePermenentData(),
        })
    }

    /**
     * format:
     * { wordA: {ipa:"", meaning:""} }
     */
    async function loadDictionary() {
        return await _toServer({
            requestType: "dictionary",
            syncTime: getLocalData()['syncTime'] || 1,
        })
    }

    const __this__ = new EventTarget()
    Object.assign(__this__, {
        EVT_RECORD: "EVT_RECORD",
        EVT_WORD: "EVT_WORD",
        EVT_DICT_LOADED: "EVT_DICT_LOADED",

        loadData,
        saveData,
        loadDictionary,
    })
    return __this__;
}

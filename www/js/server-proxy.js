
function initServerProxy(logger, cacherCreator) {

    const _localProxy = cacherCreator.create('__localCache__');
    const _data = _localProxy.get("sec_setting", {});

    async function _toServer(data) {
        logger.log(`C -> S request type: ${data.requestType}`);

        const _accessToken = _data["userID"] || "";
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
                        _data['syncTime'] = _responseData.syncTime;
                        _localProxy.save();
                    }
                    // logger.debug(`${_responseData.content}`);
                    logger.log(`S -> C ${_responseData.info}`);
                    return _responseData.content ?? "";
                } else {
                    logger.error(`S -> C ${_responseData.info}`);
                }
            } else {
                logger.error(`S -> C ${_response.status}`);
            }
            return null;
        } catch (err) {
            logger.vital(`To server: ${err}`);
            return null;
        }
    }

    async function saveData(data) {
        await _toServer({
            requestType: "save",
            content: data,
        })
        __this__.dispatchEvent(new CustomEvent(__this__.EVT_UPLOAD));
    }

    /**
     * format:
     * { wordA: {ipa:"", meaning:""} }
     */
    async function loadData() {
        const data = await _toServer({
            requestType: "get",
            syncTime: _data['syncTime'] || 1,
        })
        __this__.dispatchEvent(new CustomEvent(__this__.EVT_DOWNLOAD, { detail: { data } }));
    }

    const __this__ = new EventTarget()
    Object.assign(__this__, {
        EVT_DOWNLOAD: "EVT_DOWNLOAD",
        EVT_UPLOAD: "EVT_UPLOAD",

        loadData,
        saveData,
    })
    return __this__;
}

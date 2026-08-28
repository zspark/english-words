
/**
 *
response = fetch(_, {
        method: "GET",
        headers: new Headers(),
        body: null,

        mode: "cors",
        credentials: "same-origin",
        cache: "default",
        redirect: "follow",
        referrer: "about:client",
        referrerPolicy: "",
        integrity: "",
        keepalive: false,

        signal: new AbortSignal(),

        // other options
    })

const Response = {
    // Properties
    status: 200,
    statusText: "OK",
    ok: true,
    headers: new Headers(),
    body: ReadableStream,
    bodyUsed: false,

    redirected: false,
    type: "basic",
    url: "https://example.com/api",

    // Methods
    json: async function () {},
    text: async function () {},
    blob: async function () {},
    formData: async function () {},
    arrayBuffer: async function () {},
    bytes: async function () {},

    clone: function () {}
};
 *
 */
function initServerProxy(logger, cacher) {

    const _localProxy = cacher.localProxy;
    const _data = _localProxy.get("sec_setting", {});

    async function _toServer(url, data) {
        logger.log(`C -> S request type: ${data.requestType}`);

        const _accessToken = _data["userID"] || "";
        if (_accessToken && (_accessToken.length > 0)) {
            data.accessToken = _accessToken;
        }

        const _response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data, null, 4),
        });

        try {
            const _responseData = await _response.json();
            logger.error(`S -> C ${_response.status} ${_responseData.info}`);
            if (_response.ok) {
                if (_responseData.syncTime) {
                    _data['syncTime'] = _responseData.syncTime;
                    _localProxy.save();
                }
                logger.debug(`${_responseData}`);
                return _responseData.content;
            }
            return null;
        } catch (err) {
            logger.vital(`To server: ${err}`);
            return null;
        }
    }

    async function saveData(data) {
        await _toServer("../api/data", {
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
        const data = await _toServer("../api/data", {
            requestType: "sync",
            syncTime: 1787844254762,//_data['syncTime'] || 1,
        })
        //__this__.dispatchEvent(new CustomEvent(__this__.EVT_DOWNLOAD, { detail: { data } }));
    }

    async function getNews(vendor) {
        const data = await _toServer("../api/rss", {
            requestType: "get-news",
            vendor,
        })
        __this__.dispatchEvent(new CustomEvent(__this__.EVT_NEWS, { detail: { data } }));
    }

    const __this__ = new EventTarget()
    Object.assign(__this__, {
        EVT_NEWS: "EVT_NEWS",
        EVT_DOWNLOAD: "EVT_DOWNLOAD",
        EVT_UPLOAD: "EVT_UPLOAD",

        loadData,
        saveData,
        getNews,
    })
    return __this__;
}

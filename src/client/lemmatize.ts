import logger from "./logger.js"
import serverProxy from "./server-proxy.js"
import Cacher from "./cacher.js"
const _proxy = Cacher.configProxy;

serverProxy.addEventListener<'getConfig'>(serverProxy.EVT_GET_CONFIG, (event) => {
    logger.debug(`config got in lemmatize.`);
    const _data = event.detail;
    if (_data?.content) {
        Object.entries(_data.content.lemmatizer).forEach((v: any) => {
            _proxy.set<string>(v[0], v[1]);
        });
    }
});

serverProxy.getConfig();

export function lemmatize(word: string): string {

    if (!word) {
        return word;
    }

    const lower = word.toLowerCase();
    let _w = _proxy.get<string>(lower);
    if (_w) {
        return _w;
    }

    // ----------------------------------------
    // 3. Plurals
    // ----------------------------------------

    // cities → city
    if (lower.endsWith("ies") && lower.length > 3) {
        return lower.slice(0, -3) + "y";
    }

    // boxes → box
    if (
        lower.endsWith("xes") ||
        lower.endsWith("ches") ||
        lower.endsWith("shes") ||
        lower.endsWith("zes")
    ) {
        return lower.slice(0, -2);
    }

    // words → word
    if (
        lower.endsWith("s") &&
        !lower.endsWith("ss") &&
        !lower.endsWith("us")
    ) {
        return lower.slice(0, -1);
    }


    // ----------------------------------------
    // 4. -ing verbs
    // ----------------------------------------
    if (lower.endsWith("ing") && lower.length > 5) {

        let stem = lower.slice(0, -3);
        // making → make
        // taking → take
        // writing → write
        if (stem.endsWith("k")) {
            return stem + "e";
        }
        return stem;
    }


    // ----------------------------------------
    // 5. -ed verbs
    // ----------------------------------------

    // studied → study
    if (lower.endsWith("ied") && lower.length > 4) {
        return lower.slice(0, -3) + "y";
    }

    // walked → walk
    // played → play
    // wanted → want
    if (lower.endsWith("ed") && lower.length > 4) {

        let stem = lower.slice(0, -2);
        if (stem.endsWith("lik") ||
            stem.endsWith("lov") ||
            stem.endsWith("us") ||
            stem.endsWith("mov") ||
            stem.endsWith("sav")
        ) {
            return stem + "e";
        }

        return stem;
    }

    return lower;
}


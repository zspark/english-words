function initLemmatizer(logger, cacher) {
    const _metaProxy = cacher.metaProxy;
    const _obj = _metaProxy.get('lemmatizer', {});

    function lemmatize(word) {

        if (!word) {
            return word;
        }

        const lower = word.toLowerCase();
        if (_obj[lower]) {
            return _obj[lower];
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

            // running → run
            // stopping → stop
            // getting → get
            if (
                stem.length >= 3 &&
                stem.at(-1) === stem.at(-2) &&
                /[b-df-hj-np-tv-z]/.test(stem.at(-1))
            ) {
                return stem.slice(0, -1);
            }

            // making → make
            // taking → take
            // writing → write
            if (stem.endsWith("k")) {
                return stem + "e";
            }
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

            // stopped → stop
            // planned → plan
            if (
                stem.length >= 3 &&
                stem.at(-1) === stem.at(-2) &&
                /[b-df-hj-np-tv-z]/.test(stem.at(-1))
            ) {
                return stem.slice(0, -1);
            }

            // liked → like
            // loved → love
            // used → use
            if (stem.endsWith("lik") ||
                stem.endsWith("lov") ||
                stem.endsWith("us") ||
                stem.endsWith("mov") ||
                stem.endsWith("sav")
            ) {
                return stem + "e";
            }
        }

        return lower;
    }

    return {
        lemmatize
    }
}


function initAI(logger, cacher) {
    const _chatGPT = initChatGPT();
    const _deepseek = initDeepSeek();
    const _localProxy = cacher.localProxy;

    function _getAIKey() {
        return _localProxy.get("sec_setting", {})['ai_key'] || "";
    }

    function _getAIProvider() {
        return _localProxy.get("sec_setting", {})['ai_provider'] || "";
    }

    function _getAI() {
        const _apiKey = _getAIKey();
        if (_apiKey == "") {
            const _s = `You do not config ChatGPT API KEY.`;
            alert(_s);
            logger.log(_s);
            return null;
        }

        const _provider = _getAIProvider().toLowerCase();
        switch (_provider) {
            case "chatgpt":
                return { api: _apiKey, provider: _chatGPT };
            case "deepseek":
                return { api: _apiKey, provider: _deepseek };
        }

        return null;
    }

    async function genArticle(wordsString) {
        const _ai = _getAI();
        if (_ai) {
            const question = `你是一个优秀的英语创意写作导师。

请使用以下指定的英语单词串联编写一篇简短、流畅且富有创意的英语短文或小故事。
必须包含的单词是：[ ${wordsString} ]。

要求：
1. 文中的这些目标单词请用<span class="word">（HTML元素）标注出来。
2. 语言要自然，不要生硬堆砌。
3. 指定单词可以重复。
4. 必要的时候用\\n开启新的段落。
5. 没有废话，比如重复我的问题，直接给出短文即可。
`;
            logger.log(question);
            return await _ai.provider.askAI(_ai.api, question);
        } else {
            return "";
        }
    }

    async function genMeaning(wordsString) {
        const _ai = _getAI();
        if (_ai) {
            const _question = getAIMeaningQuestion(wordsString);
            return await _ai.provider.askAI(_ai.api, _question);
        } else {
            return "";
        }
    }

    function getAIMeaningQuestion(wordsString) {
        const _question = `你是一个优秀的英语单词大师。将以下指定的英语单词或者短语以json格式输出。

这些单词或者短语是（用逗号分开）:
${wordsString}

json格式如下：
{
    "generic": {
        "ipa": "/dʒəˈnerɪk/",
        "level": "A1~C2",
        "meaning": "adj. 一般的；普通的",
        "links": "generically,genericity",
        "note": "This is a generic solution that can be applied to many different problems. 这是一个通用的解决方案，可以应用于许多不同的问题。\n\n"
    }
}

要求：
2. 以上json内容中的generic单词只是示例；
3. 所有单词作为JSON键时全部小写；
4. links去重，英文逗号分隔，不要出现常规复数、副词形式，不要出现常规动名词形式；
6. 严格使用提供的json字段，不多也不少，所有的value都是字符串，且是正确格式的JSON；
7. note字段提供至少2个使用不同意思的例句，意思多的单词可以提供3个例句，附带汉语翻译。例句之间用'\n\n'（两个\n）分开`;

        logger.log(_question);
        return _question;
    }

    function getQuestionAboutWord(word) {
        const _question = `详细用汉语解释这个英语单词：${word} 

要求：
1. 要有汉语意思与音标；
2. 要有例句；`;

        logger.log(_question);
        return _question;
    }

    return {
        genArticle,
        genMeaning,
        getAIMeaningQuestion,
        getQuestionAboutWord,
    }
}

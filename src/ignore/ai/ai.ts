import { Detail } from "../../types.d.js"
import { AI_API, AIProvider } from "../utils.js"
import logger from "../logger.js"
import cacher from "../cacher.js"
import chatGPT from "./chatGPT.js"
import deepseek from "./deepseek.js"

const _localProxy = cacher.localProxy;

function _getAIKey(): AI_API {
    return _localProxy.get("sec_setting,ai_key", "");
}

function _getAIProvider(): string {
    return _localProxy.get("sec_setting.ai_provider", "");
}

type output = {
    api: AI_API,
    provider: AIProvider,
};

function _getAI(): output | null {
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
            return { api: _apiKey, provider: chatGPT };
        case "deepseek":
            return { api: _apiKey, provider: deepseek };
        default:
            return null;
    }
}

type AIRespondMeaning = {
    success: boolean,
    word: string,
    detail: Detail,
    rawContent?: string,
}

class AIProxy extends EventTarget {

    constructor() {
        super();
    }

    async #_askAI(p: output | null, question: string): Promise<string> {
        if (!p) {
            logger.log(`you do not have a AI provider.`);
            return '';
        }
        // logger.log(question);
        return await p.provider.ask(p.api, question);
    }

    async genArticle(wordsString: string): Promise<void> {
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
        const rawContent = await this.#_askAI(_getAI(), question);
        try {
            const detail = JSON.parse(rawContent)
            this.dispatchEvent(new CustomEvent<AIRespondMeaning>(EVT_AI_RESPOND_ARTICLE, {
                detail: {
                    success: true,
                    word: "",
                    detail
                }
            }))
        } catch (e) {
            logger.error(`parse article string error: ${e}`);
            return;
        }
    }

    async genMeaning(word: string): Promise<void> {
        const question = this.getAIMeaningQuestion(word);
        const rawContent = await this.#_askAI(_getAI(), question);
        try {
            const detail = JSON.parse(rawContent)[word] as Detail;
            detail.word = word;
            this.dispatchEvent(new CustomEvent<AIRespondMeaning>(EVT_AI_RESPOND_MEANING, {
                detail: {
                    success: true,
                    word,
                    detail
                }
            }))
        } catch (e) {
            logger.error(`parse word detail string error: ${e}`);
            return;
        }
    }

    getAIMeaningQuestion(wordsString: string): string {
        const _question = `You are absolutely an English word master, please provide the json format of the following words:

words are:

${wordsString}

JSON format:

{
    "generic": {
        "ipa": "/dʒəˈnerɪk/",
        "level": "B1",
        "meaning": "adj. 一般的；普通的",
        "links": "generically,genericity",
        "note": "This is a generic solution that can be applied to many different problems. 这是一个通用的解决方案，可以应用于许多不同的问题。\n\n"
    }
}

Requirements：

1. The above json content is just a mock sample;
2. All keys in the json must be lower case english, and all values are strings instead of numbers or arrays or objects;
3. Only provide American pronunciation for "ipa";
4. Choose only one proper value from "A1,A2,B1,B2,C1,C2" for "level";
5. Chinese characters for meanings, short form (adj. n. v. ad. prep. etc.) for the part of speech;
6. Remove basic plural form of nouns, basic adjectives and adverbs, and NO basic -ing and -ed words as values of links;
7. Strictly obey the format of the providing structure, the final json-like string must be parsed using 'JSON.parse()' function;
8. Content of "note" should provide at least TWO examples that use different meanings of the word (including Chinese translations); More examples are accepted if the word has many varies meanings; Sentences MUST be separated by '\n\n';
`;

        // logger.log(_question);
        return _question;
    }

    getQuestionAboutWord(word: string): string {
        const _question = `详细用汉语解释这个英语单词：${word} 

要求：
1. 要有汉语意思与音标；
2. 要有例句；`;

        // logger.log(_question);
        return _question;
    }

}

const _aiProxy = new AIProxy();
export default _aiProxy;


const EVT_AI_RESPOND_MEANING: string = "EVT_AI_RESPOND_MEANING";
const EVT_AI_RESPOND_ARTICLE: string = "EVT_AI_RESPOND_ARTICLE";
export { EVT_AI_RESPOND_MEANING, EVT_AI_RESPOND_ARTICLE, AIRespondMeaning }

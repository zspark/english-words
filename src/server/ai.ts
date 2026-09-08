import { Detail, AIProvider } from "../types.d.js"
import { cloneDetail } from "./server-utils.js"

function _stripJsonMarkdown(text: string): string {
    return text
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?```$/, "")
        .trim();
}

async function askChatGPT(api: string, question: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${api}`
        },
        body: JSON.stringify({
            model: "gpt-5.5",
            input: question
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const json = await response.json();
    return json.output.find((item: any) => item.type === "message")
        ?.content.find((c: any) => c.type === "output_text")
        ?.text;
}

async function askDeepseek(apiKey: string, question: string): Promise<string> {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
                {
                    role: "user",
                    content: question
                }
            ]
        })
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }

    const json = await response.json();

    const _out = json.choices?.[0]?.message?.content ?? "";
    return _stripJsonMarkdown(_out);
}

type _T = (apiKey: string, question: string) => Promise<string>;
const _providerMap: Map<AIProvider, _T> = new Map();
_providerMap.set("DeepSeek", askDeepseek);
_providerMap.set("ChatGPT", askChatGPT);

export default async function genDetailByAI(aiProvider: AIProvider, apiKey: string, word: string): Promise<Detail | undefined> {
    const question = getAIMeaningQuestion(word);
    const _fn = _providerMap.get(aiProvider);
    if (_fn) {
        const rawContent = await _fn(apiKey, question);
        try {
            const _t = Date.now();
            const detail = JSON.parse(rawContent)[word] as Detail;
            detail.word = word;
            return cloneDetail(detail, _t, _t);
        } catch (e) {
            //logger.error(`parse word detail string error: ${e}`);
            return undefined;
        }
    }
    return undefined;
}

function getAIMeaningQuestion(wordsString: string): string {
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



function initAI(dictionary) {

    async function askChatGPT(question) {
        const apiKey = dictionary.getAPI();
        if (apiKey == "") {
            const _s = `You do not config ChatGPT API KEY.`;
            alert(_s);
            console.info(_s);
            return
        }

        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
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
        return json.output.find(item => item.type === "message")
            ?.content.find(c => c.type === "output_text")
            ?.text;
    }

    async function askChatGPTForWordsInfo(words) {
        const _question = `你是一个优秀的英语单词大师。将以下指定的英语单词或者短语以json格式输出。

这些单词或者短语是（用逗号分开）: ${words}
json格式如下：
{
    "generic": {
        "ipa": "/dʒǝ'nerɪk/ (美英为主)",
        "level": "B2",
        "meaning": "adj. 一般的;属的;类的;非商标的",
        "links": "一些关联的词语，比如它的名词形式，动词形式，容易读混或者拼写弄错的词，特殊的三单，特殊的ing等等，用英文逗号隔开",
        "note": "例句，多个例句用'\n'隔开"，
    },
    ...
}
    
要求：
1）只有meaning使用中文，其他一律英文；
2）按照常用含义排序，然后依次用不同的意思各造一个句子，最多不要超过5个；
3）提供的单词在json中全部用小写，例句除外。；`

        const resultText = await askChatGPT(_question);
        return resultText;
    }

    // 使用
    /*
    askChatGPT("介绍一下JavaScript")
        .then(console.log)
        .catch(console.error);
        */

    return {
        askChatGPT,
        askChatGPTForWordsInfo,
    }
}


function initAI(dictionary) {
    // 1. 配置 DeepSeek API 信息 (前端直接测试用，正式环境建议走后端转发)
    const API_KEY = ""; // 💡 在这里填入你的 DeepSeek API Key
    const API_URL = "https://api.deepseek.com/v1/chat/completions";

    async function askAI(systemPrompt, userPrompt, maxToken = 1024) {
        if (API_KEY === "") return;
        try {
            // 发起 Fetch 请求
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat", // 官方标准对话模型
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: maxToken
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP 错误！状态码: ${response.status}`);
            }

            const data = await response.json();

            // 获取返回的文本并将其 return 出来
            const resultText = data.choices[0].message.content;
            return resultText;

        } catch (error) {
            console.error("API 请求失败:", error);
            // 如果失败，可以返回 null 或抛出错误，方便外部判断
            return null;
        } finally {
            // 这里可以放一些收尾逻辑，比如隐藏 loading 动画
        }
    }

    async function askChatGPT(question) {
        const apiKey = dictionary.getAPI();
        if (apiKey == "") {
            console.info(`You do not config ChatGPT API KEY.`);
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

    // 使用
    /*
    askChatGPT("介绍一下JavaScript")
        .then(console.log)
        .catch(console.error);
        */

    return {
        askAI,
        askChatGPT,
    }
}

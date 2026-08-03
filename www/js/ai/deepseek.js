function initDeepSeek() {

    function _stripJsonMarkdown(text) {
        return text
            .replace(/^```(?:json)?\s*\n?/i, "")
            .replace(/\n?```$/, "")
            .trim();
    }

    async function askAI(api, question) {
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${api}`
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

    return {
        askAI,
    };
}
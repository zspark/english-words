import { AI_API, AIProvider } from "../utils.js"

function _stripJsonMarkdown(text: string): string {
    return text
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?```$/, "")
        .trim();
}

async function ask(api: AI_API, question: string): Promise<string> {
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

const _p: AIProvider = {
    ask,
}

export default _p;


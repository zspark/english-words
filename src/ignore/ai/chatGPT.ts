
import { AI_API, AIProvider } from "../utils.js"

async function ask(api: AI_API, question: string): Promise<string> {
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

const _p: AIProvider = {
    ask,
}

export default _p;

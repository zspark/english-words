
function initChatGPT() {

    async function askAI(api, question) {
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
        return json.output.find(item => item.type === "message")
            ?.content.find(c => c.type === "output_text")
            ?.text;
    }

    return {
        askAI
    }
}

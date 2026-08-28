import { getJSONResponse } from "./server-utils.js";

export default {

    async fetch(request, env) {
        if (request.method !== "POST") {
            return getJSONResponse({
                info: "Only POST is allowed"
            }, 400);
        }

        // =========================
        // SAVE DATA
        // =========================
        try {
            let data = await request.json();
            const _content = data.content;
            if (_content === undefined) {
                return getJSONResponse({
                    info: "Content is required."
                }, 400);
            }

            const entries = Object.entries(_content.dict);
            const BATCH_SIZE = 500;
            for (let i = 0; i < entries.length; i += BATCH_SIZE) {

                const batch = entries
                    .slice(i, i + BATCH_SIZE)
                    .map(([word, data]) => {
                        return env.DB.prepare(`
INSERT INTO dictionary (
    word,
    ipa,
    meaning,
    level,
    note,
    links,
    time_create,
    time_modify,
    tags
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                        ).bind(
                            word,
                            data.ipa ?? "",
                            data.meaning ?? "",
                            data.level ?? "",
                            data.note ?? "",
                            data.links ?? "",
                            data.time ?? Date.now(),
                            data.time ?? Date.now(),
                            data.tags ?? ""
                        );
                    });

                await env.DB.batch(batch);

                console.log(
                    `Inserted ${Math.min(i + BATCH_SIZE, entries.length)} / ${entries.length}`
                );
            }




            return getJSONResponse({
                info: "Successfully created!!!.",
            });

        } catch {
            return getJSONResponse({
                info: "Invalid JSON"
            }, 400);
        }

    }
}

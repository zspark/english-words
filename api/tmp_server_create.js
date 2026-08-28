import { getJSONResponse } from "./server-utils.js";

export default {

    async fetch(request, env) {
        if (request.method !== "POST") {
            return getJSONResponse({
                info: "Only POST is allowed"
            }, 405); // 405 Method Not Allowed is more standard here
        }

        let data;
        try {
            data = await request.json();
        } catch {
            return getJSONResponse({
                info: "Invalid JSON"
            }, 400);
        }

        // =========================
        // SAVE DATA
        // =========================
        try {
            const _content = data.content;
            if (!_content || !_content.dict) {
                return getJSONResponse({
                    info: "Content and content.dict are required."
                }, 400);
            }

            const entries = Object.entries(_content.dict);
            const BATCH_SIZE = 500;
            
            for (let i = 0; i < entries.length; i += BATCH_SIZE) {
                const batch = entries
                    .slice(i, i + BATCH_SIZE)
                    .map(([word, itemData]) => {
                        // FIXED: Added the 9th placeholder (?) to match the 9 columns
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
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).bind(
                            word,
                            itemData.ipa ?? "",
                            itemData.meaning ?? "",
                            itemData.level ?? "",
                            itemData.note ?? "",
                            itemData.links ?? "",
                            itemData.time ?? Date.now(),
                            itemData.time ?? Date.now(),
                            itemData.tags ?? ""
                        );
                    });

                await env.DB.batch(batch);

                console.log(
                    `Inserted ${Math.min(i + BATCH_SIZE, entries.length)} / ${entries.length}`
                );
            }

            return getJSONResponse({
                info: "Successfully created!!!",
            });

        } catch (err) {
            console.error("Database error:", err);
            return getJSONResponse({
                info: "Database operation failed",
                error: err.message
            }, 500);
        }
    }
}

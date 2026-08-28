async function _checkUserExists(env, userID, pwd) {
    try {
        const result = await env.DB
            .prepare(`
                SELECT password
                FROM user_id
                WHERE userID = ?
            `)
            .bind(userID)
            .first();

        return result?.password === pwd;
    } catch (error) {
        console.error("Database query error:", error);
        throw error;
    }
}

export default {

    async fetch(request, env) {

        // =========================
        // SAVE DATA
        // =========================
        if (requestType === "save") {
            const _token = data.accessToken;
            const _canPass = await _checkUserExists(env, userID, _token);
            if (!_canPass) {
                return getJSONResponse({
                    info: "Wrong token."
                }, 400);
            }

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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
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
        }

        // =========================
        // Unknown request type
        // =========================

        return getJSONResponse({
            info: "Unknown requestType"
        }, 400);
    }
}

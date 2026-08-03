
async function checkUserExists(env, userID) {
    try {
        // Query COUNT(1) to check if at least one row matches
        const result = await env.DB
            .prepare(`
                SELECT COUNT(1) AS count 
                FROM user_id 
                WHERE userID = ?
            `)
            .bind(userID)
            .first();

        // returns true if count > 0, otherwise false
        return result.count > 0;
    } catch (error) {
        console.error("Database query error:", error);
        throw error;
    }
}

export default {
    async fetch(request, env) {

        // =========================
        // Only POST
        // =========================

        if (request.method !== "POST") {
            return Response.json(
                {
                    success: false,
                    info: "Only POST is allowed"
                }
            );
        }

        // =========================
        // Parse JSON
        // =========================

        let data;

        try {
            data = await request.json();
        } catch {
            return Response.json(
                {
                    success: false,
                    info: "Invalid JSON"
                }
            );
        }

        const userID = data.userID;


        // =========================
        // Check userID
        // =========================
        const _exist = await checkUserExists(env, userID);
        if (!_exist) {
            return Response.json(
                {
                    success: false,
                    info: "User Not Found"
                }
            );
        }



        const requestType = data.requestType;
        const syncTime = data.syncTime;
        // =========================
        // GET DATA
        // =========================
        if (requestType === "get") {
            try {
                const result = await env.DB.prepare(`
                        SELECT updated_at, content
                        FROM user_data
                        WHERE userID = ?
                    `).bind(userID).first();
                if (!result) {
                    return Response.json({
                        success: false,
                        info: "User data not found"
                    });
                }

                if (syncTime >= result.updated_at) {
                    return Response.json({
                        success: true,
                        info: "Your dictionary is already up to date.",
                        userID: userID
                    });
                } else {
                    return Response.json({
                        success: true,
                        info: "Successfully Synced.",
                        userID: userID,
                        content: JSON.parse(result.content)
                    });
                }
            } catch {
                return Response.json({
                    success: false,
                    info: "Content parsing error, consult administrator!"
                });
            }
        }

        // =========================
        // SAVE DATA
        // =========================

        if (requestType === "save") {

            const content = data.content;

            if (content === undefined) {
                return Response.json({
                    success: false,
                    info: "Content is required"
                });
            }

            const updatedAt = Date.now();
            const contentJSON = JSON.stringify(content);

            await env.DB
                .prepare(`
                    INSERT INTO user_data
                        (userID, content, updated_at)
                    VALUES
                        (?, ?, ?)
                    ON CONFLICT(userID)
                    DO UPDATE SET
                        content = excluded.content,
                        updated_at = excluded.updated_at
                `)
                .bind(
                    userID,
                    contentJSON,
                    updatedAt
                )
                .run();

            return Response.json({
                success: true,
                userID: userID,
                info: "Successfully saved.",
                syncTime: updatedAt
            });
        }

        // =========================
        // Unknown request type
        // =========================

        return Response.json({
            success: false,
            info: "Unknown requestType"
        });
    }
};

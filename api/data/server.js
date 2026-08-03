
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
                },
                { status: 405 }
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
                },
                { status: 400 }
            );
        }

        const requestType = data.requestType;
        const userID = data.userID;


        // =========================
        // Check userID
        // =========================
        const _exist = await checkUserExists(env, userID);
        if (!_exist) {
            return Response.json(
                {},
                {
                    status: 400,
                    statusText: "User Not Found"
                }
            );
        }


        // =========================
        // GET DATA
        // =========================
        if (requestType === "get") {

            const result = await env.DB
                .prepare(`
                    SELECT content
                    FROM user_data
                    WHERE userID = ?
                `)
                .bind(userID)
                .first();

            if (!result) {
                return Response.json({}, {
                    status: 404,
                    statusText: "User data not found"
                });
            }

            try {
                const content = JSON.parse(result.content);
                return Response.json({
                    success: true,
                    info: "Going to Sync.",
                    userID: userID,
                    content: content
                });
            } catch {
                return Response.json({}, {
                    status: 500,
                    statusText: "Stored content is invalid JSON"
                });
            }


        }

        // =========================
        // SAVE DATA
        // =========================

        if (requestType === "save") {

            const content = data.content;

            if (content === undefined) {
                return Response.json({}, {
                    status: 400,
                    statusText: "content is required"
                });
            }

            const contentJSON = JSON.stringify(content);
            const updatedAt = Date.now();

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
                userID: userID
            });
        }

        // =========================
        // Unknown request type
        // =========================

        return Response.json({}, {
            status: 400,
            statusText: "Unknown requestType"
        });
    }
};

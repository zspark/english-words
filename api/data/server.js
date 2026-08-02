
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
        const _exist = await checkUserExists(env, userID);
        if (!_exist) {
            return Response.json(
                {
                    success: false,
                    info: "User not Exist."
                },
                { status: 400 }
            );
        }

        // =========================
        // Check userID
        // =========================

        if (!userID || typeof userID !== "string") {
            return Response.json(
                {
                    success: false,
                    info: "Valid userID is required",
                    userID: userID ?? null
                },
                { status: 400 }
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
                return Response.json({
                    success: false,
                    info: "User data not found",
                    userID: userID
                }, { status: 404 });
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
                return Response.json({
                    success: false,
                    info: "Stored content is invalid JSON",
                    userID: userID
                }, { status: 500 });
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
                    info: "content is required",
                    userID: userID
                }, { status: 400 });
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

        return Response.json({
            success: false,
            info: "Unknown requestType",
            userID: userID
        }, { status: 400 });
    }
};

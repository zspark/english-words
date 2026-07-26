

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
                return Response.json(
                    {
                        success: false,
                        info: "User data not found",
                        userID: userID
                    },
                    { status: 404 }
                );
            }

            let content;

            try {
                content = JSON.parse(result.content);
            } catch {
                return Response.json(
                    {
                        success: false,
                        info: "Stored content is invalid JSON",
                        userID: userID
                    },
                    { status: 500 }
                );
            }

            return Response.json({
                success: true,
                userID: userID,
                content: content
            });
        }

        // =========================
        // SAVE DATA
        // =========================

        if (requestType === "save") {

            const content = data.content;

            if (content === undefined) {
                return Response.json(
                    {
                        success: false,
                        info: "content is required",
                        userID: userID
                    },
                    { status: 400 }
                );
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

        return Response.json(
            {
                success: false,
                info: "Unknown requestType",
                userID: userID
            },
            { status: 400 }
        );
    }
};

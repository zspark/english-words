
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

export async function getData(request) {

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

    const userID = "jerry-chaos";
    const requestType = data.requestType;
    // =========================
    // GET DATA
    // =========================
    if (requestType === "get") {

        const _syncTime = data.syncTime;
        try {
            const result = await env.DB
                .prepare(`
                        SELECT updated_at, content
                        FROM user_data
                        WHERE userID = ?
                    `)
                .bind(userID)
                .first();

            if (!result) {
                return Response.json({
                    success: false,
                    info: "User data not found"
                });
            }

            if (_syncTime >= result.updated_at) {
                return Response.json({
                    success: true,
                    code: 400,
                    info: "Your dictionary is already up to date."
                });
            } else {
                return Response.json({
                    success: true,
                    code: 200,
                    info: "Successfully Synced.",
                    syncTime: result.updated_at,
                    content: JSON.parse(result.content)
                });
            }
        } catch {
            return Response.json({
                success: false,
                info: "Content parsing error, consult administrator."
            });
        }
    }



    // =========================
    // SAVE DATA
    // =========================
    if (requestType === "save") {
        const _token = data.accessToken;
        const _canPass = await _checkUserExists(env, userID, _token);
        if (!_canPass) {
            return Response.json({
                success: false,
                info: "Wrong token."
            });
        }

        const _content = data.content;
        if (_content === undefined) {
            return Response.json({
                success: false,
                info: "Content is required."
            });
        }

        const updatedAt = Date.now();
        const contentJSON = JSON.stringify(_content);

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
            code: 200,
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
};

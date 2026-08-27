import { getJSONResponse } from "../server-utils.js";

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

export async function getData(request, env) {

    // =========================
    // Only POST
    // =========================

    if (request.method !== "POST") {
        return getJSONResponse({
            info: "Only POST is allowed"
        }, 400);
    }

    // =========================
    // Parse JSON
    // =========================

    let data;
    try {
        data = await request.json();
    } catch {
        return getJSONResponse({
            info: "Invalid JSON"
        }, 400);
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
                return getJSONResponse({
                    info: "User data not found"
                }, 400);
            }

            if (_syncTime >= result.updated_at) {
                return getJSONResponse({
                    info: "Your dictionary is already up to date."
                }, 200);
            } else {
                return getJSONResponse({
                    info: "Successfully Synced.",
                    syncTime: result.updated_at,
                    content: JSON.parse(result.content)
                });
            }
        } catch (e) {
            return getJSONResponse({
                info: `internal error: ${e} .`
            }, 500);
        }
    }



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

        return getJSONResponse({
            info: "Successfully saved.",
            syncTime: updatedAt
        });
    }

    // =========================
    // Unknown request type
    // =========================

    return getJSONResponse({
        info: "Unknown requestType"
    }, 400);
};


export default {
    async fetch(request, env) {

        if (request.method !== "POST") {
            return Response.json({
                success: false,
                info: "Only POST is allowed",
                userID: userID,
                status: 405,
            });
        }

        let data;

        try {
            data = await request.json();
        } catch {
            return Response.json({
                success: false,
                info: "Invalid JSON",
                userID: userID,
                status: 400,
            });
        }

        const requestType = data.requestType;
        const userID = data.userID;

        // =========================
        // Check userID
        // =========================

        if (!userID || typeof userID !== "string") {
            return Response.json({
                success: false,
                info: "Valid userID is required",
                userID: userID,
                status: 400,
            });
        }

        // =========================
        // GET DATA
        // =========================

        if (requestType === "get") {

            const key = `users/${userID}/data.json`;

            const object = await env.DATA.get(key);

            if (!object) {
                return Response.json({
                    success: false,
                    info: "data.json not found",
                    userID: userID,
                    status: 404,
                });
            }

            const content = await object.json();

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
                return Response.json({
                    success: false,
                    info: "content is required",
                    userID: userID,
                    status: 400,
                });
            }

            const key = `users/${userID}/data.json`;

            await env.DATA.put(
                key,
                JSON.stringify(content, null, 2),
                {
                    httpMetadata: {
                        contentType: "application/json"
                    }
                }
            );

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
            userID: userID,
            status: 400,
        });
    }
};

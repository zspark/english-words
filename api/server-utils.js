
export function getJSONResponse(data, status = 200) {
    return Response.json(
        data,
        {
            status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }
    );
}

export function getParseFailureRes() {
    return getJSONResponse({
        info: "Invalid JSON-like format, can not decode from string."
    }, 400);
}

export function getInternalErrorRes(msg) {
    return getJSONResponse({
        info: msg,
    }, 500);
}

export function getEmptyRes() {
    return getJSONResponse({ info: "Empty Response." }, 200);
}

export async function parseJSONString(request) {
    try {
        const data = await request.json();
        return data;
    } catch {
        return null;
    }
}

export async function checkAuthority(userID, pwd, env) {
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
        return false;
    }

}

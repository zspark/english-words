
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

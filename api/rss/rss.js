import { getRNZNews } from "./rnz.js";

export async function getNews(request, env) {

    try {
        const _data = await request.json();
        if (_data.vendor === "RNZ") {
            return getRNZNews(_data, request, env);
        } else if (_data.vendor === "xxxxx???sfsf") {
        }
    } catch (error) {
        return getJSONResponse({
            info: error.message,
        }, 500);
    }

};



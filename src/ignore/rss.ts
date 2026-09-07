import { RequestBodyContentType, getJSONResponse } from "./server-utils.js";
import { getRNZNews } from "./rss/rnz.js";

export async function getNews(request: Request, _data: RequestBodyContentType, env: any): Promise<Response> {

    try {
        if (_data.vendor === "RNZ") {
            return await getRNZNews(_data, env);
        } else if (_data.vendor === "xxxxx???sfsf") {
        }
    } catch (error) {
        return getJSONResponse({
            info: error.message,
        }, 500);
    }

};



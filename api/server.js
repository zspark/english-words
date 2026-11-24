import { getInternalErrorRes, getParseFailureRes, getEmptyRes, parseJSONString } from "./server-utils.js";
import respondGithub from "./forward.js";
export default {
    async fetch(request, env) {
        try {
            const _data = await parseJSONString(request);
            if (!_data) {
                return getParseFailureRes();
            }
            console.log(request.url, request.method);
            /*
            const _credit = await getValue(_data.accessToken, env);
            if (!_credit) {
                return getEmptyRes("server need a token to process.");
            }
            if (Number(_credit) < 1) {
                return getEmptyRes("your token is restricted.");
            }
            */
            const url = new URL(request.url);
            if (url.pathname === "/api/rss") {
                return getEmptyRes('ROOT');
                //return getNews(request, _data, env);
            }
            else if (url.pathname === "/api/github") {
                return respondGithub(request, _data, env);
            }
            return getEmptyRes('ROOT');
        }
        catch (e) {
            return getInternalErrorRes(`Internal Error: ${e.message}`);
        }
    }
};

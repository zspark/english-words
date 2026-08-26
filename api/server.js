
import { getRNZNews } from "./rss/rnz.js";
import { getData } from "./data/data.js";

export default {
    async fetch(request, env) {

        const url = new URL(request.url);
        if (url.pathname === "/api/rss") {
            return getRNZNews(request, env);
        } else if (url.pathname === "/api/data") {
            return getData(request, env);
        }

    }
};

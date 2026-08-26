
import { getRNZNews } from "./rss/rnz.js";
import { getData } from "./data/data.js";

export default {
    async fetch(request, env) {

        /*
        const url = new URL(request.url);

        // =========================
        // RNZ
        // =========================

        if (url.pathname === "/api/rss" && request.method === "GET") {
            try {
                const article = await getRNZNews();
                return Response.json({
                    success: true,
                    article
                });

            } catch (error) {
                return Response.json({
                    success: false,
                    info: error.message
                }, {
                    status: 502
                });
            }
        }
        */



        // =========================
        // Only POST
        // =========================
        return getData(request, env);

    }
};

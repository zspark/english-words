import { getJSONResponse } from "../server-utils.js";

export async function getRNZNews(data, request, env) {

    const RSS_URL = "https://www.rnz.co.nz/rss/national.xml";

    // --------------------------------------------------
    // 1. Get RSS
    // --------------------------------------------------

    const rssResponse = await fetch(RSS_URL, {
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    });

    if (!rssResponse.ok) {
        throw new Error(`RSS request failed: ${rssResponse.status}`);
    }

    const rssText = await rssResponse.text();

    // --------------------------------------------------
    // 2. Parse RSS
    // --------------------------------------------------

    const itemMatch = rssText.match(
        /<item\b[^>]*>([\s\S]*?)<\/item>/i
    );

    if (!itemMatch) {
        throw new Error("No RSS article found");
    }

    const item = itemMatch[1];

    function getTag(tag) {
        const regex = new RegExp(
            `<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`,
            "i"
        );

        const match = item.match(regex);

        if (!match) {
            return null;
        }

        return decodeHtmlEntities(
            stripCdata(match[1].trim())
        );
    }

    const title = getTag("title");
    const link = getTag("link");
    const pubDate = getTag("pubDate");
    const description = getTag("description");

    if (!link) {
        throw new Error("RSS item has no link");
    }

    // --------------------------------------------------
    // 3. Get actual article
    // --------------------------------------------------

    const articleResponse = await fetch(link, {
        headers: {
            "User-Agent": "Mozilla/5.0"
        }
    });

    if (!articleResponse.ok) {
        throw new Error(`Article request failed: ${articleResponse.status}`);
    }

    // --------------------------------------------------
    // 4. Extract article paragraphs
    // --------------------------------------------------

    const paragraphs = [];
    const transformed = new HTMLRewriter()
        .on("article p", {
            text(text) {
                paragraphs.push(text.text);
            }
        })
        .transform(articleResponse);

    await transformed.arrayBuffer();

    // --------------------------------------------------
    // 5. Return JSON
    // --------------------------------------------------

    return getJSONResponse({
        info: "Succeed.",
        content: {
            title,
            link,
            pub_date: pubDate,
            description,
            content: paragraphs
        }
    });
}


// ============================================================
// Helpers
// ============================================================

function cleanText(text) {
    return text
        .replace(/\s+/g, " ")
        .trim();
}


function stripCdata(text) {
    return text
        .replace(/^<!\[CDATA\[/, "")
        .replace(/\]\]>$/, "");
}


function decodeHtmlEntities(text) {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/&#(\d+);/g, (_, code) =>
            String.fromCharCode(Number(code))
        );
}

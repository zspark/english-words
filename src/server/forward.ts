import { CSKey, ENV, RequestBody } from "../types.d.js"
import { getRes, getEmptyRes } from "./server-utils.js";

function debugHeader(response: Response): void {
    console.log("GitHub status:", response.status);
    console.log("GitHub headers:", Object.fromEntries(response.headers));
    /*
    if (isJsonContent(response)) {
        console.log("json");
        console.log(await response.json());
    } else {
        console.log("text");
        console.log(await response.text());
    }
    */
}

function getResponseHeader(): Headers {
    const headers = new Headers();
    for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
    }
    return headers;
};

function getRequestHeader(token: string): Headers {
    const headers = new Headers();
    headers.set("Accept", "application/vnd.github+json");
    headers.set("X-GitHub-Api-Version", "2026-03-10");
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("User-Agent", "my-cloudflare-worker");
    headers.set("Content-Type", "application/json");
    return headers;
}

const corsHeaders = Object.freeze({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
});

const GITHUB_TOKEN = "hello...";

function isJsonContent(response: Response): boolean {
    return response.headers.get("Content-Type")?.split(";")[0] === "application/json";
}

function getURL(rep: string, path: string): string {
    return `https://api.github.com/repos/zspark/${rep}/contents/${path}`;
}

async function getFileSha(token: string, rep: string, path: string): Promise<string | undefined> {
    const response = await fetch(getURL(rep, path), { headers: getRequestHeader(token) });

    if (!response.ok) {
        return undefined;
        // throw new Error(`GitHub ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    // console.log(`sha of file ${path} is: ${data.sha}`);
    return data.sha;
}

async function pullFromGithub(request: Request, data: RequestBody<"pull">, env: ENV): Promise<Response> {
    const response = await fetch(
        getURL(data.content.rep, data.content.path),
        {
            headers: getRequestHeader(data.content.token),
        }
    );

    // console.count(request.method);
    if (!response.ok) {
        throw new Error(
            `GitHub ${response.status}: ${await response.text()}`
        );
    }

    debugHeader(response);
    const _data = await response.json();
    // console.log(_data);
    const fileResponse = await fetch(_data.download_url);
    const text = await fileResponse.text();

    return getRes<"pull">("Success.", {
        content: JSON.parse(text),
        sha: _data.sha,
    });
}

async function pushToGithub(request: Request, data: RequestBody<"push">, env: ENV): Promise<Response> {

    // console.count(request.method);
    // CORS preflight
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        });
    }
    // console.count(request.method);

    try {
        // console.count(request.method);
        data.content.sha = await getFileSha(data.content.token, data.content.rep, data.content.path);
        const response = await fetch(
            getURL(data.content.rep, data.content.path),
            {
                method: "PUT",
                headers: getRequestHeader(data.content.token),
                body: JSON.stringify(data.content),
            }
        );

        // console.log("GitHub status:", response.status);
        //console.log("GitHub headers:", Object.fromEntries(response.headers));
        /*
        if (isJsonContent(response)) {
            console.log("json");
            console.log(await response.json());
        } else {
            console.log("text");
            console.log(await response.text());
        }
        */

        // Forward GitHub response
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: getResponseHeader(),
        });

    } catch (error: any) {
        return new Response(
            JSON.stringify({
                error: error.message
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders
                }
            }
        );
    }
}

export default async function respond<T extends CSKey>(request: Request, data: RequestBody<T>, env: ENV): Promise<Response> {
    if (data.requestType === "push") {
        return pushToGithub(request, data as RequestBody<"push">, env);
    } else if (data.requestType === "pull") {
        return pullFromGithub(request, data as RequestBody<"pull">, env);
    }
    return getEmptyRes('POST to Notebook.');
}


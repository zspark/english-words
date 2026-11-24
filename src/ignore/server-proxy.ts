
import logger from "./logger.js"
import cacher from "./cacher.js"

const token: string = 'hello';

export async function checkUsers(): Promise<any> {
    const response = await fetch(
        "https://api.github.com/user",
        {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        }
    );

    logger.log(response.status);
    logger.log(await response.json());
}
export async function commitObjectToGitHubs(
    object: any,
    message: string = `message at ${Date.now()}`,
    path: string = "tmp.json",
    branch: string = "main",
    repo: string = "english-tmp",
    owner: string = "zspark",
): Promise<any> {
    // const url = `https://api.github.com/repos/${owner}/${repo}`;
    const url = `https://api.github.com/repos/${owner}/${repo}/${path}`;

    const response = await fetch(
        `${url}?ref=${encodeURIComponent(branch)}`,
        {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        }
    );
    const repoInfo = await response.json();
    logger.log(repoInfo);
}
export async function commitObjectToGitHub(
    object: any,
    message: string = `message at ${Date.now()}`,
    path: string = "tmp.json",
    branch: string = "main",
    repo: string = "english-tmp",
    owner: string = "zspark",
): Promise<any> {
    //const url = `https://api.github.com/repos/${owner}/${repo}`;
    const url = `https://api.github.com/repos/${owner}/${repo}/${path}`;

    // Object -> JSON -> UTF-8 -> Base64
    const json = JSON.stringify(object);
    const bytes = new TextEncoder().encode(json);

    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    const content = btoa(binary);


    // Create or update the file
    const body: {
        message: string;
        content: string;
        branch: string;
        sha?: string;
    } = {
        message,
        content,
        branch
    };

    const response = await fetch(url, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28"
        },
        body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message);
    }

    return result;
}



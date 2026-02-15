import log4js from "log4js";
import sleep from "sleep-promise";
import * as cheerio from "cheerio";
import dotenvFlow from "dotenv-flow";
import fs from "fs";

// Initialize environment variables
dotenvFlow.config();
if (!process.env.TIMEOUT) {
    throw new Error("Please set the TIMEOUT variable in the .env file.")
}
const TIMEOUT = parseInt(process.env.TIMEOUT);

// Initialize log4js
const logger = log4js.getLogger("core-fetch");
logger.level = log4js.levels.INFO;

// ----
// Fetches and saves html from the given URL.
// Returns Cheerio's root object.
// ----
export async function cheerioFetchHtml(
    userId: string,
    url: string,
    options?: {
		filename?: string | undefined,
		searchParams?: Record<string, string> | undefined,
	}
) : Promise<cheerio.CheerioAPI> {
    let fetchUrl = "";

    // Build the url string with search params if needed
    if (options?.searchParams) {
		const searchParams = new URLSearchParams(options.searchParams);
		fetchUrl = `${url}?${searchParams}`;
	} else {
		fetchUrl = url;
	}

    // Fetch the html file from url
    await sleep(TIMEOUT);
    const res = await fetch(fetchUrl, {
		headers: { Cookie: `userId=${userId}` }
	});

    // Check response and return html string
	if (!res.ok) {
		throw new Error(`An error occurred while fetching the page ${fetchUrl}: Status (${res.status} ${res.statusText})`);
	}
	const html = await res.text().then((t) => t);

    // If filename provided, save the html file
    if (options?.filename) {
        fs.writeFileSync(options.filename, html);
    }

    // Load to cheerio and return the root
    const $ = cheerio.load(html);
	if ($(':contains("ERROR CODE")').length > 0) {
		throw new Error(`An error occurred while fetching the page: ${fetchUrl}`);
	}
    return $;
}

// ----
// Fetch and save image from url
// ----
export async function fetchImage (
	userId: string, 
	url: string, 
) {
    // Get the filename from the url
	const filename = url.split('/').pop()
	if (!filename) {
		throw new Error(`downloadImage: Cannot find filename from URL ${url}`)
	}

    // Fetch the image
	await sleep(TIMEOUT)	
	const res = await fetch(url, {
		headers: {
			Cookie: `userId=${userId}`,
		},
	});

    // Check response then get blob
	if (!res.ok) {
		throw new Error(`An error occurred while fetching the page ${url}: Status (${res.status} ${res.statusText})`);
	}
	const blob = await res.blob().then((t) => t);

    // Download image with buffer
	const buffer = Buffer.from(await blob.arrayBuffer());
	fs.writeFileSync(`./out/img/${filename}`, buffer);
}
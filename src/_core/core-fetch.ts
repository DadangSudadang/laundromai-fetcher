import * as cheerio from "cheerio";
import fs from "fs";

// ----
// Initialization
// ----
import dotenvFlow from "dotenv-flow";
dotenvFlow.config();

import log4js from "log4js";
const logger = log4js.getLogger("core-fetch");
logger.level = log4js.levels.INFO;

import sleep from "sleep-promise";
if (!process.env.TIMEOUT) {
    throw new Error("Please set the TIMEOUT variable in the .env file.")
}
const TIMEOUT = parseInt(process.env.TIMEOUT);


// ----
// Returns the desired region base URL
// ----
export function getRegionUrl(region: string) {
	if (!process.env.JP_SITE || !process.env.INTL_SITE) {
		throw new Error(
			"Please set JP_SITE and INTL_SITE in the .env file",
		);
	}

	switch(region) {
		case "intl":
			return process.env.INTL_SITE;
		case "jp":
			return process.env.JP_SITE;
		default:
			throw new Error("getRegionUrl: invalid region string. Use 'intl' or 'jp' for region parameter.");
	}
}


// ----
// Fetches and saves html from the given URL.
// Returns Cheerio's root object.
// ----
export async function cheerioFetchHtml(
    path: string,
	region: string,
    options?: {
    	userId?: string,
		filename?: string | undefined,
		searchParams?: Record<string, string> | undefined,
	}
) : Promise<cheerio.CheerioAPI> {
    // Get the appropriate base URL for the region
    let fetchUrl = new URL(path, getRegionUrl(region));

    // Build the url string with search params if needed
    if (options?.searchParams) {
		const params = new URLSearchParams(options.searchParams);
		fetchUrl.search = params.toString();
	}

    // Fetch the html file from url,
	// Uses userId cookie if provided.
    await sleep(TIMEOUT);
	let res;
	if (options?.userId != undefined) {
		res = await fetch(fetchUrl, {
			headers: { Cookie: `userId=${options.userId}` }
		});
	} else {
		res = await fetch(fetchUrl);
	}

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
// Fetch and save image from url.
// Mostly used in fetching Jacket images.
// ----
export async function fetchImage (
	url: string, 
	userId?: string, 
) {
    // Get the filename from the url
	const filename = url.split('/').pop()
	if (!filename) {
		throw new Error(`downloadImage: Cannot find filename from URL ${url}`)
	}

    // Fetch the image
	// Uses userId cookie if provided.
	await sleep(TIMEOUT);
	let res;
	if (userId) {
		res = await fetch(url, {
			headers: { Cookie: `userId=${userId}` },
		});
	} else {
		res = await fetch(url)
	}

    // Check response then get blob
	if (!res.ok) {
		throw new Error(`An error occurred while fetching image ${url}: Status (${res.status} ${res.statusText})`);
	}
	const blob = await res.blob().then((t) => t);

    // Download image with buffer
	const buffer = Buffer.from(await blob.arrayBuffer());
	fs.writeFileSync(`./out/img/${filename}`, buffer);
}


// ----
// Fetch json, used to fetch maiami_songs.json
// ----
export async function fetchJson (
	url: string, 
	userId?: string, 
) {
    // Fetch json, uses userId cookie if provided.
	await sleep(TIMEOUT);
	let res;
	if (userId) {
		res = await fetch(url, {
			headers: { Cookie: `userId=${userId}` },
		});
	} else {
		res = await fetch(url)
	}

	const jsonStr = await res.json().then((t) => t);
	return JSON.parse(jsonStr)
}
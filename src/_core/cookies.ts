import puppeteer from "puppeteer";

// ----
// Initialization
// ----
import dotenvFlow from 'dotenv-flow';
dotenvFlow.config();

import log4js from "log4js";
const logger = log4js.getLogger("cookies");
logger.level = log4js.levels.INFO;


// ----
// Logs in to Japan maimaiNET by simulating clicks to get the login cookie.
// Returns cookie key-value pairs
// ----
async function getJpCookies() {
	if (!process.env.MAIMAI_JP_SEGA_ID || !process.env.MAIMAI_JP_SEGA_PASSWORD) {
		throw new Error(
			"Please set your MAIMAI_JP_SEGA_ID and MAIMAI_JP_SEGA_PASSWORD in the .env file",
		);
	}
	
	if (!process.env.JP_SITE) {
		throw new Error(
			"Please set JP_SITE in the .env file",
		);
	}
	const JP_SITE = process.env.JP_SITE;

    logger.info("Logging in JP maimaiNET...")

	const browser = await puppeteer.launch();

	const page = await browser.newPage();
	await page.goto(JP_SITE);

	await page.type('input[name="segaId"]', process.env.MAIMAI_JP_SEGA_ID);
	await page.type(
		'input[name="password"]',
		process.env.MAIMAI_JP_SEGA_PASSWORD,
	);

	await Promise.all([
		page.waitForNavigation(),
		page.click(
			`form[action="${JP_SITE}/submit/"] button[type="submit"]`,
		),
	]);

	await Promise.all([
		page.waitForNavigation(),
		page.click(
			`form[action="${JP_SITE}/aimeList/submit/"] button[type="submit"]`,
		),
	]);

	const cookies = await browser.cookies();
	await browser.close();

    logger.info("Successfully fetched cookies.")
	return Object.fromEntries(
		cookies.map((cookie) => [cookie.name, cookie.value]),
	);
}

// ----
// Logs in to International maimaiNET by simulating clicks to get the login cookie.
// Returns cookie key-value pairs
// ----
async function getIntlCookies() {
    if (!process.env.MAIMAI_INTL_SEGA_ID || !process.env.MAIMAI_INTL_SEGA_PASSWORD) {
        throw new Error('Please set your MAIMAI_INTL_SEGA_ID and MAIMAI_INTL_SEGA_PASSWORD in the .env file');
    }

    if (!process.env.USER_AGENT) {
        throw new Error('Please set a valid USER_AGENT in the .env file.');
    }

	if (!process.env.INTL_SITE || !process.env.INTL_LOGIN_SITE) {
		throw new Error(
			"Please set INTL_SITE and INTL_LOGIN_SITE in the .env file.",
		);
	}
	const INTL_SITE = process.env.INTL_SITE;
	const INTL_LOGIN_SITE = process.env.INTL_LOGIN_SITE;

    logger.info("Logging in INTL maimaiNET...")

    const browser = await puppeteer.launch();
    const url = new URL(INTL_LOGIN_SITE);
    url.searchParams.set('site_id', 'maimaidxex');
    url.searchParams.set('redirect_url', INTL_SITE);

    const page = await browser.newPage();
    await page.setUserAgent(process.env.USER_AGENT);

    await page.goto(url.toString());

    await page.click('#agree-maimaidxex #agree');
    await page.click('.c-button--openid--segaId');
    await page.type('#sid', process.env.MAIMAI_INTL_SEGA_ID);
    await page.type('#password', process.env.MAIMAI_INTL_SEGA_PASSWORD);

    await Promise.all([
        page.waitForNavigation(),
        page.click('#btnSubmit'),
    ]);

    const cookies = await browser.cookies();
    await browser.close();
    
    logger.info("Successfully fetched cookies.")
    return Object.fromEntries(cookies.map((cookie) => [cookie.name, cookie.value]));
}

// ----
// Get the userId from intl or jp cookies
// ----
export async function getUserId(region:string) {
	let cookies;
	switch(region) {
		case "intl":
			cookies = await getIntlCookies();
			break;
		case "jp":
			cookies = await getJpCookies();
			break;
		default:
			throw new Error("getUserId: invalid region string. Use 'intl' or 'jp' for region parameter.");
	}

	return cookies.userId as string;
}
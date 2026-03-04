import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import fs from "fs";
import path from "path";
import { cheerioFetchHtml } from "@_core/core-fetch";
import { jpGenreMap, intlGenreMap, diffMap } from "@_core/maps";
import { chartGenreInterface, chartUtageInterface } from "@_core/types";


// ----
// Initialization
// ----
import dotenvFlow from "dotenv-flow";
dotenvFlow.config();

import log4js from "log4js";
const logger = log4js.getLogger("fetch-genre");
logger.level = log4js.levels.INFO;

const outputDir = "./dist/genre/";
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

import sleep from "sleep-promise";
if (!process.env.TIMEOUT) {
    throw new Error("Please set the TIMEOUT variable in the .env file.")
}
const TIMEOUT = parseInt(process.env.TIMEOUT);


// ----
// Parses genre page, either Genre > Master or Genre > Re:Master.
// Returns an object array. See chartGenreInterface.
// ----
function parseGenrePage(
	$: cheerio.CheerioAPI,
	region: string,
	filename?: string | undefined
) {
	let genreList: chartGenreInterface[] = [];
	let currGenre : (number | undefined) = -1;

	// Get all the song info blocks in the genre page
	const main_wrapper = $('div[class^="wrapper main_wrapper"]');
	const div_list = main_wrapper.find(
		'div[class^="w_450"],div[class^="screw_block"]',
	);

	// Parse each song info block
	const parseSongInfo = (self : Element) => {
		const typeIconURL = $(self)
			.find('img[class^="music_kind_icon"]')
			.attr("src");
		let isDX = false;

		if (typeIconURL) {
			const typeIcon = typeIconURL.split("/").pop();
			if (typeIcon === "music_dx.png") {
				isDX = true;
			}
		}

		return {
			id: $(self).find("input[name=idx]").attr("value"),
			title: $(self).find('div[class^="music_name_block"]').text(),
			genre: currGenre as number,
			isDX: isDX,
		};
	}

	// Updates the current genre value based on region.
	const updateCurrGenre = (self: Element) => {
		const genreText = $(self).text()

		switch(region) {
			case "intl":
				currGenre = intlGenreMap.get(genreText) as number;
				break;
			case "jp":
				currGenre = jpGenreMap.get(genreText) as number;
				break;
			default:
				throw new Error("getRegionUrl: invalid region string. Use 'intl' or 'jp' for region parameter.");
		}

		if (currGenre == undefined) {
			currGenre = -1;
			logger.error(`parseGenrePage: cannot find valid category order for ${genreText}`)
		}
	}

	// Iterate over all song info blocks
	div_list.each(function (this: Element) {
		let self = this;

		if ($(self).hasClass("screw_block")) {
			// If the current block contains the genre name text,
			// set the current genre number.
			updateCurrGenre(self);
		} else if ($(self).hasClass("w_450 m_15")) {
			// Otherwise it's a song block. Parse it.
			genreList.push(parseSongInfo(self));
		}
	});
	
	if (filename) {
		fs.writeFileSync(filename, JSON.stringify(genreList, null, '\t'))
	}

	return genreList;
}


// ----
// Parses utage page.
// Returns an object array. See chartUtageInterface.
// ----
function parseUtagePage(
	$: cheerio.CheerioAPI,
	filename?: string | undefined
) {
	let utageSongs: chartUtageInterface[] = [];

	// Get all the song info blocks in the utage page
	const main_wrapper = $('div[class^="wrapper main_wrapper"]');
	const div_list = main_wrapper.find(
		'div[class^="w_450"]',
	);

	// Parse each song info block
	const parseSongInfo = (self: Element) => {
		const utageBadges = $(self).find('div[class^="music_kind_icon_utage"]')
		const utageType = $(utageBadges[0]).text().trim();

		let isBuddy = false;
		if (utageBadges.length > 1) {
			isBuddy = true;
		}
	
		return {
			id: $(self).find("input[name=idx]").attr("value"),
			title: $(self).find('div[class^="music_name_block"]').text(),
			utageType: utageType,
			isBuddy: isBuddy,
		};
	}

	// Iterate over all song info blocks
	div_list.each(function (this: Element) {
		let self = this;
		if ($(self).hasClass("w_450 m_15")) {
			utageSongs.push(parseSongInfo(self));
		}
	});
	
	if (filename) {
		fs.writeFileSync(filename, JSON.stringify(utageSongs, null, '\t'))
	}
	return utageSongs;
}


// ----
// Fetches genre page from a specified difficulty.
// ----
export async function fetchGenreList(
	diff: string,
	region: string,
	userId: string,
) {
	let songGenreList: (chartGenreInterface[] | chartUtageInterface[]) = [];
	let cheerioRoot: cheerio.CheerioAPI;

	const getCheerioRoot = async (diff: string) => {
		const diffNum = String(diffMap.get(diff))
		await sleep(TIMEOUT)
		const cheerioRoot = await cheerioFetchHtml('record/musicGenre/search', region, {
				userId: userId,
				searchParams: {genre: "99", diff: diffNum},
				filename: path.join(outputDir, `${diff}.html`)
			}
		)
		return cheerioRoot
	}

	switch(diff) {
		case "master":
		case "remaster":
			cheerioRoot = await getCheerioRoot(diff);
			songGenreList = parseGenrePage(cheerioRoot, region,
				path.join(outputDir, `${diff}.json`)
			)
			break;

		case "utage":
			cheerioRoot = await getCheerioRoot(diff);
			songGenreList = parseUtagePage(cheerioRoot,
				path.join(outputDir, `${diff}.json`)
			)
			break;

		default:
			throw new Error(`fetchGenreList - Invalid diff value: ${diff} (allowed values are "master", "remaster", and "utage".)`)
	}

	logger.info(`Found ${songGenreList.length} song(s) from the ${diff} page.`);
	return songGenreList;
}
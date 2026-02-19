import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import fs from "fs";
import path from "path";
import { cheerioFetchHtml } from "@_core/core-fetch";
import { TwoWayMap } from "@_core/map";


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


// ----
// Interfaces
// ----
export interface chartGenreInterface {
    id: string | undefined;
    title: string;
    genre: number;
    isDX: boolean;
    artist?: string;
    jacket?: string;
    levels?: Record<string, string>;
}

export interface chartUtageInterface {
    id: string | undefined;
    title: string;
    utageType: string;
    isBuddy: boolean;
    artist?: string;
    jacket?: string;
    level?: string;
}


// ----
// Define maps for genre and difficulty
// ----
export const jpGenreMap = new TwoWayMap([
	["POPS＆アニメ", 0],
	["niconico＆ボーカロイド", 1],
	["東方Project", 2],
	["ゲーム＆バラエティ", 3],
	["maimai", 4],
	["オンゲキ＆CHUNITHM", 5],
])

export const intlGenreMap = new TwoWayMap([
	["POPS＆ANIME", 0],
	["niconico＆VOCALOID™", 1],
	["東方Project", 2],
	["GAME＆VARIETY", 3],
	["maimai", 4],
	["オンゲキ＆CHUNITHM", 5],
])

export const diffMap = new TwoWayMap([
	["basic", 0],
	["advanced", 1],
	["expert", 2],
	["master", 3],
	["remaster", 4],
	["utage", 10],
]);


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

	// Iterate over all song info blocks
	div_list.each(function (this: Element) {
		let self = this;

		// If the current block contains the genre name text,
		// set the current genre number.
		if ($(self).hasClass("screw_block")) {
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
				console.log(`parseGenrePage: cannot find valid category order for ${genreText}`)
			}

		// otherwise it's a song block
		} else if ($(self).hasClass("w_450 m_15")) {
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
	let songGenreList: (chartGenreInterface[] | chartUtageInterface[])= [];
	let cheerioRoot: cheerio.CheerioAPI;

	const getCheerioRoot = async (diff: string) => {
		const diffNum = String(diffMap.get(diff))
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
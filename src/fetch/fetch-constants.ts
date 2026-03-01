import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import fs from "fs";
import path from "path";
import { getRegionUrl, cheerioFetchHtml } from "@_core/core-fetch";
import { chartConstantInterface, chartGenreInterface } from "@_core/types";
import { diffMap, levelMap } from "@_core/maps";


// ----
// Initialization
// ----
import dotenvFlow from "dotenv-flow";
dotenvFlow.config();

import log4js from "log4js";
const logger = log4js.getLogger("fetch-constants");
logger.level = log4js.levels.INFO;

// Save folder
const outputDir = "./dist/level-constants/";
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

// Constant lists for level 5 and 6 due to missing entries.
// Note: use the string name if you want to add a level (e.g "13+")
const fixedConst = {
	"5": [0, 8],
	"6": [0, 2, 4, 5, 6, 7, 8, 9]
} as Record<string, number[]>

// The current border for plus difficulties (e.g 13+ = 13.6)
const plusConst = 6

// ----
// Get the title of the song with a check.
// ----
function getTitle($: cheerio.CheerioAPI, block: Element) {
	const title = $(block).find('div[class^="music_name_block"]').text();

	if (title == null || title == undefined) {
		logger.error(
			`getTitle - Cannot find the song title of current block.`
		);
		return undefined;
	}

	return title;
}


// ----
// Get the chart type from the chart type icon url.
// ----
function isDxChart($: cheerio.CheerioAPI, block: Element) {
	const iconUrl = $(block).find('img[class^="music_kind_icon"]').attr("src");
	if (!iconUrl) {
		logger.error(
			`isDxChart - Cannot find icon URL.`
		)
		return undefined;
	}

	const typeIcon = iconUrl.split("/").pop();
	switch (typeIcon) {
		case "music_dx.png":
			return true;
		case "music_standard.png":
			return false;
		default:
			logger.error(
				`isDxChart - Chart type icon for ${iconUrl} is not valid.`
			);
			return undefined;
	}
}


// ----
// Get the difficulty from the difficulty icon url.
// (The one that says "MASTER", "EXPERT", etc.)
// ----
function getDifficulty($: cheerio.CheerioAPI, block: Element) {
	const iconUrl = $(block).find('img[class="h_20 f_l"]').attr("src");
	if (!iconUrl) {
		throw new Error(`getDifficulty - Cannot find difficulty type icon.`)
	}

	// Extract the difficulty name from url using regex
	let diff = undefined;
	const diffText = /(?<=diff_)([a-z]*)(?=\.)/.exec(iconUrl);

	if (diffText) {
		diff = diffMap.get(diffText[0]);
	}

	if (diff == null || diff == undefined) {
		logger.error(
			`getDifficulty - Cannot find difficulty for ${iconUrl}.`
		);
		return undefined;
	}

	return diff as number;
}


// ----
// Find the current title in the genreList with checks
// ----
function getGenre(
	title: string,
	isDX: boolean,
	songList: chartGenreInterface[]
) {
	const song = songList.find((s) => 
		s.title === title 
		&& s.isDX == isDX
	);

	if (!song) {
		logger.error(
			`getGenre - Cannot find song in genre list: ${title} (${isDX ? "DX" : "ST"})`,
		);
		return undefined;

	} else if (song.genre < 0 || song.genre == undefined) { // -1 genre means invalid
		logger.error(
			`getGenre - Genre value is invalid for song ${title} (${isDX ? "DX" : "ST"})`,
		);
		return undefined;	
	}

	return song.genre;
}


// ----
// Extracts information from the block and
// determines the constant of the current chart (block)
// ----
function parseChartBlock(
	$: cheerio.CheerioAPI, 
	block: Element,
	songList: chartGenreInterface[],
	levelStr: string,
	passRef: { // Pass by reference, allowing modifying without returning
		prevGenreValue: number, // The genre of the previous block
		currConst: number,
	}
) {	
	// Extract info from the block
	const title = getTitle($, block);
	const isDX = isDxChart($, block);
	const diff = getDifficulty($, block);
	
	if (
		title == undefined
		|| isDX == undefined
		|| diff == undefined
	) {
		logger.error(
			'parseChartBlock - Current block has missing values.'
		)
		return undefined;
	}


	// Find genre
	let genre;

	if (title === "Link") { 
		// Two songs with identical name "Link", 
		// Use the previous song instead to determine genre
		genre = passRef.prevGenreValue;
	} else {
		genre = getGenre(title, isDX, songList);
	}

	if (genre == undefined || genre < 0) {
		logger.error(
			`parseChartBlock - Cannot find the genre of current song: ${title}:${isDX? "DX":"ST"}:${diff}`
		)
		return undefined;
	}


	// Increase constant value by one whenever the category switches back to pops & anime genre
	if (passRef.prevGenreValue > genre) {
		passRef.currConst += 1;
	}
	passRef.prevGenreValue = genre;


	// Determine the level constant
	let finalConst;
	if (levelStr in Object.keys(fixedConst)) {
		// Some levels have incomplete entries for certain constants. Example: level 5 and 6.
		// This will use a predetermined constant list instead.
		finalConst = fixedConst[levelStr][passRef.currConst];
	} else {
		finalConst = passRef.currConst;

		if (levelStr.slice(-1) == "+") {
			finalConst += plusConst;
		}
	}


	return {
		title: title,
		genre: genre,
		isDX: isDX,
		diff: diff,
		level: levelStr,
		constant: finalConst
	}
}


// ----
// Fetch constants from a level page
// ----
export async function fetchConstantsList(
	levelStr: string,
	songList: chartGenreInterface[],
	region: string,
	userId: string
) {
	// Replace + with p. "+" is usually not allowed for file names.
	let levelName;
	if (levelStr.slice(-1) == "+") {
		levelName = levelStr.slice(0, -1) + "p";
	} else {
		levelName = levelStr;
	}

	// Get internal level value
	const levelValue = levelMap.get(levelStr);
	if (levelValue == null || levelValue == undefined) {
		throw new Error(`fetchConstantsList - Cannot find level value for ${levelStr}`)
	}

	// Fetch the level page
	logger.info(`Fetching constants for level ${levelStr} (${levelValue})...`)
	const $ = await cheerioFetchHtml('record/musicLevel/search', region, {
			userId: userId,
			searchParams: {level: levelValue as string},
			filename: path.join(outputDir, `${levelName}.html`)
		}
	)

	// Get the list of blocks
	const mainWrapper = $('div[class^="wrapper main_wrapper"]');

	let formUrl = getRegionUrl(region) + "/record/musicDetail/"
	const blockList = mainWrapper.find(
		`form[action="${formUrl}"]`,
	);
	logger.info(`fetchConstantsList: Found ${blockList.length} blocks in level ${levelStr}.`)


	// Pass by reference, these values will be modified by parseChartBlock below.
	let passRef = {
		prevGenreValue: -1,
		currConst: 0
	}

	// Parse each block and collect it to constantsList
	let constantsList: chartConstantInterface[] = []
	blockList.each(function (this: Element) {
		const currConstantInfo = parseChartBlock($, this, songList, levelStr, passRef)

		if (currConstantInfo) {
			constantsList.push(currConstantInfo)
		}
	})

	fs.writeFileSync(
		path.join(outputDir, `${levelName}.json`),
		JSON.stringify(constantsList, null, "\t"),
	);

	return constantsList;
}
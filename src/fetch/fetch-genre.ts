import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import fs from "fs";
import { TwoWayMap } from "../_core/map";

// ----
// Initialization
// ----
import dotenvFlow from "dotenv-flow";
dotenvFlow.config();

import log4js from "log4js";
const logger = log4js.getLogger("fetch-genre");
logger.level = log4js.levels.INFO;


// ----
// Interfaces
// ----
interface chartGenreInterface {
    id: string | undefined;
    title: string;
    genre: number;
    isDX: boolean;
    artist?: string;
    jacket?: string;
    levels?: Record<string, string>;
}

interface chartUtageInterface {
    id: string | undefined;
    title: string;
    utageType: string;
    isBuddy: boolean;
    artist?: string;
    jacket?: string;
    level?: string;
}


// ----
// Genre maps to order numbers
// ----
const jpGenreMap = new TwoWayMap([
	["POPS＆アニメ", 0],
	["niconico＆ボーカロイド", 1],
	["東方Project", 2],
	["ゲーム＆バラエティ", 3],
	["maimai", 4],
	["オンゲキ＆CHUNITHM", 5],
])

const intlGenreMap = new TwoWayMap([
	["POPS＆ANIME", 0],
	["niconico＆VOCALOID™", 1],
	["東方Project", 2],
	["GAME＆VARIETY", 3],
	["maimai", 4],
	["オンゲキ＆CHUNITHM", 5],
])


// ----
// Parses genre page, either Genre > Master or Genre > Re:Master.
// ----
function parseGenrePage(
	region: string,
	$: cheerio.CheerioAPI,
	filename?: string | undefined
) {
	let genreList: chartGenreInterface[] = [];
	let currGenre : (number | undefined) = -1;

	// Get all the song info blocks in the genre page
	const main_wrapper = $('div[class^="wrapper main_wrapper"]');
	const div_list = main_wrapper.find(
		'div[class^="w_450"],div[class^="screw_block"]',
	);

	// Parse every song info block
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
		// If the current block contains the genre name text,
		// set the current genre number.
		if ($(this).hasClass("screw_block")) {
			const genreText = $(this).text()

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
		} else if ($(this).hasClass("w_450 m_15")) {
			genreList.push(parseSongInfo(this));
		}
	});
	
	if (filename) {
		fs.writeFileSync(filename, JSON.stringify(genreList, null, '\t'))
	}

	return genreList;
}
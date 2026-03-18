import fs from "fs";

import { getUserId } from "@_core/cookies";
import { getOutputDir } from "@_core/environment";
import { diffMap, intlGenreMap, jpGenreMap } from "@_core/maps";
import { chartConstantInterface, chartGenreInterface } from "@_core/types";

import { fetchGenreList } from "@fetch/fetch-genre";
import { fetchAllConstants } from "@fetch/fetch-constants";
import { fetchJson } from "@_core/core-fetch";

import log4js from "log4js";
const logger = log4js.getLogger("fetch-combined-data");
logger.level = log4js.levels.INFO;

interface officialListInterface {
    title: string,
    artist: string,
    catcode: string,
    image_url: string,
}

export async function fetchCombinedData(
    genreList: chartGenreInterface[],
    region: string,
    userId: string
) {
    logger.info("fetchCombinedData: Fetching all data...")

    // Get the genre strings for each region
    let genreMap;
	switch(region) {
		case "intl":
            genreMap = intlGenreMap;
            break;
		case "jp":
            genreMap = jpGenreMap;
            break;
		default:
			throw new Error(`fetchCombinedData: invalid region string: "${region}". Use 'intl' or 'jp' for region parameter.`);
	}


    // Fetch the necessary lists
    // const userId = await getUserId(region)

    // const genreList = await fetchGenreList(
    //     "master", region, userId
    // ) as chartGenreInterface[]

    const allConstants = await fetchAllConstants(
        genreList, region, userId
    )

    const officialList = await fetchJson(
        "https://maimai.sega.jp/data/maimai_songs.json",
        getOutputDir("constants")
    ) as officialListInterface[]


    // Uncomment this if you wish to load an existing file instead.
    // const genreList: chartGenreInterface[] = JSON.parse(
    //     fs.readFileSync('./dist/genre/master.json', 'utf-8')
    // )
    // const officialList: officialListInterface[] = JSON.parse(
    //     fs.readFileSync('./dist/level-constants/maimai_songs.json', 'utf-8')
    // )
    // const allConstants: chartConstantInterface[] = JSON.parse(
    //     fs.readFileSync('./dist/level-constants/all.json', 'utf-8')
    // )


    // Parse every song, combine all the constant values into one object (separated by ST and DX)
    logger.info("fetchCombinedData: Parsing fetched lists...")
    let completeList: Record<string, string | boolean | Record<string, number>>[] = [];

    const combineConstants = (
        currSong: Record<string, string | number>,
        currList: chartConstantInterface[], 
        isDX: boolean
    ) => {
        // Skip if empty
        if (currList.length < 1) return;

        // Combine all the separate constants data into one "levels" object
        let levels: Record<string, number> = {};        
        for (const currEntry of currList) {
            // Get difficulty name
            const diff = diffMap.revGet(currEntry.diff) as string; 
            
            // Remove plus from level name string if any
            const levelBase = currEntry.level.slice(-1) === "+"? 
                Number.parseInt(currEntry.level.slice(0, -1)):
                Number.parseInt(currEntry.level)

            // Multiply by 10 for easier comparison
            levels[diff] = (levelBase * 10) + currEntry.constant 
        }

        completeList.push({
            ...currSong,
            isDX: isDX, 
            levels: levels
        })
    }

    for (const song of genreList) {
        // Get genre name
        const genreStr = genreMap.revGet(song.genre) 
        if (!genreStr) {
            logger.error(`fetchCombinedData: Cannot find genre name for song ${song.title} (Genre ${song.genre}).`)
            continue;
        }

        // Get necessary information
        const songInfo = officialList.filter((g) =>  // Find Jacket filename
            g.title === song.title && 
            g.catcode === genreStr
        )
        const constList = allConstants.filter((c) =>  // Find all thechart constants
            c.title === song.title &&
            c.genre === song.genre
        )

        // Skip current song if results are empty
        if (songInfo.length < 1) {
            logger.error(`fetchCombinedData: No entry in genreList found for song ${song.title} (${genreStr}).`)
            continue;
        }
        if (constList.length < 1) {
            logger.error(`fetchCombinedData: No constants found for song ${song.title} (${genreStr}).`)
            continue;
        }

        // Define base info
        let currSong = {
            orderId: song.orderId,
            id: song.id as string,
            title: song.title,
            artist: song.artist as string,
            imageName: songInfo[0].image_url,
            genre: genreStr
        }

        // Separate standard and dx charts
        const stList = constList.filter((c) => !c.isDX)
        const dxList = constList.filter((c) => c.isDX)

        combineConstants(currSong, stList, false);
        combineConstants(currSong, dxList, true);
    }

    const sorted = completeList.sort((a: any, b: any) => a.orderId - b.orderId)

    fs.writeFileSync('./dist/level-constants/complete.json',
        JSON.stringify(sorted, null, '\t')
    )
}
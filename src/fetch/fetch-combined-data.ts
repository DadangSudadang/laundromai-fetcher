import fs from "fs";

import { getTimeout, getOutputDir } from "@_core/environment";
import { diffMap, intlGenreMap, jpGenreMap } from "@_core/maps";
import { chartConstantInterface, chartGenreInterface, combinedDataInterface } from "@_core/types";

import { fetchAllConstants } from "@fetch/fetch-constants";
import { fetchJson } from "@_core/core-fetch";

import log4js from "log4js";
const logger = log4js.getLogger("fetch-combined-data");
logger.level = log4js.levels.INFO;

import sleep from "sleep-promise";
const TIMEOUT = getTimeout();

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
) : Promise<combinedDataInterface[]> {
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
    const allConstants = await fetchAllConstants(
        genreList, region, userId
    )

    logger.info(`fetchCombinedData: Fetching maimai_songs.json...`)
    await sleep(TIMEOUT);
    const officialList = await fetchJson(
        "https://maimai.sega.jp/data/maimai_songs.json",
        getOutputDir("constants")
    ) as officialListInterface[]


    // Parse every song, combine all the constant values into one object (separated by ST and DX)
    logger.info("fetchCombinedData: Parsing fetched lists...")
    let completeList: combinedDataInterface[] = [];

    const combineConstants = (
        currSong: Record<string, string | number | boolean>,
        currList: chartConstantInterface[], 
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

        const pushValue = {
            ...currSong,
            levels: levels
        }

        completeList.push(pushValue as combinedDataInterface)
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
            c.genre === song.genre &&
            c.isDX == song.isDX
        )

        // maimai_songs.json are updated later, so do not skip for new songs.
        let imageurl = ""
        if (songInfo.length < 1) {
            logger.error(`fetchCombinedData: No entry in maimai_songs.json found for song ${song.title} (${genreStr}).`)
        } else {
            imageurl = songInfo[0].image_url
        }

        // Skip current song if there are no constant values
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
            imageName:  imageurl,
            genre: genreStr,
            isDX: song.isDX
        }

        combineConstants(currSong, constList);
    }

    const sorted = completeList.sort((a: any, b: any) => a.orderId - b.orderId)

    const completeFileName = getOutputDir("constants") + "completeList.json";
    fs.writeFileSync(completeFileName ,JSON.stringify(sorted, null, '\t'))

    logger.info(`Finished creating combined data: ${completeFileName}`)
    return sorted
}
// check if file is there or not
// - compare function
// - fetching song page
// - download jacket image
// - get levels
// - fetch each level constants > make it a function and combine both for loops
// 
// make two: fetchNewSongs (param: difficulty) and fetchNewUtageSongs?

import { chartConstantInterface, chartGenreInterface, chartUtageInterface } from "@_core/types";
import { cheerioFetchHtml } from "@_core/core-fetch";
import { fetchGenreList } from "@fetch/fetch-genre";
import { fetchConstantsList } from "@fetch/fetch-constants";
import { diffMap } from "@_core/maps";
import fs from "fs";
import path from "path";

// ----
// Initialization
// ----
import dotenvFlow from "dotenv-flow";
dotenvFlow.config();

import log4js from "log4js";
const logger = log4js.getLogger("fetch-new-songs");
logger.level = log4js.levels.INFO;

const outputDir = "./dist/songs/";
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

import sleep from "sleep-promise";
if (!process.env.TIMEOUT) {
    throw new Error("Please set the TIMEOUT variable in the .env file.")
}
const TIMEOUT = parseInt(process.env.TIMEOUT);


// Check if list is Genre list
function isGenreList (list: chartGenreInterface[] | chartUtageInterface[]) {
    const dxBool = (list[0] as chartGenreInterface).isDX;
    if (dxBool != undefined || dxBool != null) {return true}
    return false
}

// Check if list is Utage list
function isUtageList (list: chartGenreInterface[] | chartUtageInterface[]) {
    const buddyBool = (list[0] as chartUtageInterface).isBuddy;
    if (buddyBool != undefined || buddyBool != null) {return true}
    return false
}

function compareDiffs(
    prevList: chartGenreInterface[] | chartUtageInterface[], 
    currList: chartGenreInterface[] | chartUtageInterface[]
) {
    let diff;

    // Genre has isDX entry,while Utage has isBuddy entry.
    if (isGenreList(prevList) && isGenreList(currList)) {
        diff = currList.filter( (x: any) => 
            prevList.every(
                (y: any) => y.title !== x.title || y.isDX !== x.isDX
            )
        );
    } else if (isUtageList(prevList) && isUtageList(currList)) {
        diff = currList.filter( (x: any) => 
            prevList.every(
                (y: any) => y.title !== x.title || y.isBuddy !== x.isBuddy
            )
        );
    } else {
        throw new Error("compareDiffs: prevList and currList types are mismatched.")
    }

    return diff;
}

async function fetchSongDetails(
    currSong: chartGenreInterface | chartUtageInterface,
    region: string,
    userId: string,
) {
    if (!currSong.id) {
        throw new Error(`ID not found in song ${currSong.title}!`);
    }

    // Fetch song details page
    logger.info(`Fetching song ${currSong.title}...`)
    await sleep(TIMEOUT);
    const $ = await cheerioFetchHtml('record/musicDetail', region, {
            userId: userId,
            searchParams: {idx: currSong.id},
            filename: path.join(outputDir, `${currSong.title}.html`)
        }
    )

    // Get the jacket url and artist name
    const jacket = $('img[class^="w_180"]').attr('src');
    const artist = $('div[class^="m_5 f_12 break"]').text();

    // Get a list of level strings
    const table = $('table[class^="music_detail_table"]');
	const levelBlocks = table.find('div[class^="music_lv_back"]');

    // Parse level values
    let levels: Record<string, Record<string, string>> = {};
    levelBlocks.each(function(i: number) {
        // Level name
        const levelStr = $(this).text();
        
        // Get difficulty, return utage utage list.
        let diffStr;
        if (isGenreList([currSong as chartGenreInterface])) {
            diffStr = diffMap.revGet(i);
        } else if (isUtageList([currSong as chartUtageInterface])) {
            diffStr = diffMap.revGet(10);
        }

        // Skip if null
        if (!levelStr) {
            const song = currSong as chartGenreInterface
            logger.error(`fetchSongDetails: Cannot find level text on block number ${i} for song ${song.title} (${song.isDX? "DX" : "ST"})`)
            return;
        } else if (!diffStr) {
            const song = currSong as chartGenreInterface
            logger.error(`fetchSongDetails: Cannot find difficulty number ${i} for song ${song.title} (${song.isDX? "DX" : "ST"})`)
            return;
        }

        // In case of plus levels, get the base level (13+ -> 13)
        let levelBase;
		if (levelStr.slice(-1) === "+") {
            levelBase = levelStr.slice(0, -1);
        } else {
            levelBase = levelStr;
        };

        // Append to levels
        levels[diffStr as string] = {
            level: levelStr,
            base: levelBase,
        }
    }) 

    logger.info(`Artist: ${artist}`)
    logger.info(`Jacket: ${jacket}`)
    logger.info(`Levels: ${JSON.stringify(levels)}`)
    return {jacket, artist, levels}
}

async function getConstantValue(
    currSong: chartGenreInterface,
    currLevel: string,
    currGenreList: chartGenreInterface[],
    region: string,
    userId: string
) {
    const constList = await fetchConstantsList(
        currLevel,
        currGenreList as chartGenreInterface[],
        region,
        userId
    )

    const currConstEntry = constList.find(
        (x: chartConstantInterface) =>
            x.title === currSong.title &&
            x.genre === currSong.genre &&
            x.isDX == currSong.isDX,
    )

    if (!currConstEntry) {
        logger.error(`fetchNewSongs: No constant entry for song ${currSong.title} ${currSong.isDX} (level ${currLevel})`)
        return undefined;
    }

    return currConstEntry.constant;
}

async function parseEachSong(
    song: chartGenreInterface | chartUtageInterface,
    currGenreList: chartGenreInterface[] | chartUtageInterface[],
    region: string,
    userId: string
) {
    let constants: Record<string, string> = {};
    const {jacket, artist, levels} = await fetchSongDetails(song, region, userId);

    let isUtage = false;
    for (const diff of Object.keys(levels)){
        const currLevel = levels[diff].level;
        const currLevelBase = levels[diff].base;

        if (diff !== "utage") {
            isUtage = false;

            const constantVal = await getConstantValue(
                song as chartGenreInterface, 
                currLevel, 
                currGenreList as chartGenreInterface[], 
                region, 
                userId
            )
            
            const levelConstantStr = `${currLevelBase}.${constantVal}`
            constants[diff] = levelConstantStr;
        } else {
            isUtage = true;
            constants[diff] = currLevel;
        }
    }

    if (isUtage) {
        return {
            title: song.title,
            artist: artist,
            jacket: jacket,
            isDX: (song as chartGenreInterface).isDX,
            levels: constants
        };
    } else {{
        return {
            title: song.title,
            artist: artist,
            jacket: jacket,
            isBuddy: (song as chartUtageInterface).isBuddy,
            levels: constants
        };
    }
    }
}

export async function fetchNewSongs(
    diff: string,
    prevGenreList: chartGenreInterface[] | chartUtageInterface[],
    region: string,
    userId: string
) {
    const currGenreList = await fetchGenreList(diff, region, userId);
    const newSongList = compareDiffs(prevGenreList, currGenreList);
    logger.info(`New songs: ${newSongList.length} song(s).`)


    interface newSong {
        title: string,
        artist: string,
        isDX? : boolean,
        isBuddy?: boolean,
        levels: Record<string, string>
    }

    let songs: newSong[] = [];

    for (const song of newSongList) {
        await sleep(TIMEOUT);
        const songDetail = await parseEachSong(song, currGenreList, region, userId);
        songs.push(songDetail);
    }

    console.log(songs)
}
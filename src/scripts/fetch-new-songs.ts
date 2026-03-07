// check if file is there or not
// - download jacket image
// - global list for downloaded constants
// - change fetch user id to also contain region

import fs from "fs";
import path from "path";

import { outputDirs } from "@_core/environment";
import { diffMap } from "@_core/maps";
import { 
    chartConstantInterface, 
    chartGenreInterface, 
    chartUtageInterface 
} from "@_core/types";
import { cheerioFetchHtml, fetchImage } from "@_core/core-fetch";
import { fetchGenreList } from "@fetch/fetch-genre";
import { fetchConstantsList } from "@fetch/fetch-constants";


// ----
// Initialization
// ----
import dotenvFlow from "dotenv-flow";
dotenvFlow.config();

import log4js from "log4js";
const logger = log4js.getLogger("fetch-new-songs");
logger.level = log4js.levels.INFO;


// ----
// Check if list is Genre list
// ----
function isGenreList (list: chartGenreInterface[] | chartUtageInterface[]) {
    const dxBool = (list[0] as chartGenreInterface).isDX;
    if (dxBool != undefined || dxBool != null) {return true}
    return false
}


// ----
// Check if list is Utage list
// ----
function isUtageList (list: chartGenreInterface[] | chartUtageInterface[]) {
    const buddyBool = (list[0] as chartUtageInterface).isBuddy;
    if (buddyBool != undefined || buddyBool != null) {return true}
    return false
}


// ----
// Check for new songs by comparing both lists
// ----
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


// ----
// From fetched html, get the artist, jacket URL and level texts.
// ----
async function fetchSongDetails(
    currSong: chartGenreInterface | chartUtageInterface,
    diff: string,
    region: string,
    userId: string,
) {
    if (!currSong.id) {
        throw new Error(`fetchSongDetails: ID not found in song ${currSong.title}!`);
    }

    // Fetch song details page
    logger.info(`fetchSongDetails: Fetching song ${currSong.title}...`)
    const $ = await cheerioFetchHtml('record/musicDetail', region, {
            userId: userId,
            searchParams: {idx: currSong.id},
            filename: path.join(outputDirs.songs, `${currSong.title}.html`)
        }
    )

    // Get the artist name
    const artist = $('div[class^="m_5 f_12 break"]').text().trim();

    // Get the jacketUrl and download it
    const jacketUrl = $('img[class^="w_180"]').attr('src') as string;
    let jacket; 
    if (jacketUrl) {
        logger.info(`fetchSongDetails: Fetching jacket for ${currSong.title}...`)
        jacket = await fetchImage(
            jacketUrl, outputDirs.jackets, userId
        )
    } else {
        throw new Error(`fetchSongDetails: jacket URL cannot be found for song ${currSong.title}.`)
    }

    // Get a list of level strings
    const table = $('table[class^="music_detail_table"]');
	const levelBlocks = table.find('div[class^="music_lv_back"]');

    // Parse level values
    let levels: Record<string, Record<string, string>> = {};
    levelBlocks.each(function(i: number) {
        // Level name
        const levelStr = $(this).text();
        
        // Get difficulty
        let diffStr;
        if (diff === "utage") {
            diffStr = diffMap.revGet(10);
        } else {
            diffStr = diffMap.revGet(i);
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
    logger.info(`Levels: ${JSON.stringify(levels, null, '\t')}`)
    return {jacket, artist, levels}
}


// ----
// Finds the constant value of a song's level.
// ----
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


// ----
// Fetches the max DX score and calculate the note count of the chart
// ----
async function getNoteCount() {}


// ----
// From fetched html, get the artist, jacket URL and level texts.
// ----
async function parseEachSong(
    song: chartGenreInterface | chartUtageInterface,
    currGenreList: chartGenreInterface[] | chartUtageInterface[],
    diff: string,
    region: string,
    userId: string
) {
    const {jacket, artist, levels} = await fetchSongDetails(
        song, diff, region, userId
    );

    let constants: Record<string, string> = {};
    for (const diff of Object.keys(levels)){
        const currLevel = levels[diff].level;
        const currLevelBase = levels[diff].base;

        if (diff === "utage") {
            constants[diff] = currLevel;
        } else {
            logger.info(`parseEachSong: Fetching constants for ${currLevel}...`);
            const constantVal = await getConstantValue(
                song as chartGenreInterface, 
                currLevel, 
                currGenreList as chartGenreInterface[], 
                region, 
                userId
            )
            
            const levelConstantStr = `${currLevelBase}.${constantVal}`
            constants[diff] = levelConstantStr;
        }
    }

    if (diff == "utage") {
        return {
            title: song.title,
            artist: artist,
            jacket: jacket,
            isBuddy: (song as chartUtageInterface).isBuddy,
            levels: constants
        };
    } else {
        return {
            title: song.title,
            artist: artist,
            jacket: jacket,
            isDX: (song as chartGenreInterface).isDX,
            levels: constants
        };
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
        const songDetail = await parseEachSong(
            song, currGenreList, diff, region, userId
        );
        songs.push(songDetail);
    }

    console.log(songs)
}
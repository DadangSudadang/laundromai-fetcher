import fs from "fs";
import path from "path";

import { getOutputDir } from "@_core/environment";
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
            filename: path.join(getOutputDir("songs"), `${currSong.title}.html`)
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
            jacketUrl, getOutputDir("jackets"), userId
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
    // If already fetched, use the saved one instead of fetching new one.
    const levelName = (currLevel.slice(-1) == "+")? currLevel.slice(0, -1) + "p": currLevel;
    let filePath = path.join(getOutputDir("constants"), `${levelName}.json`)

    let constList;
    if (fs.existsSync(filePath)) {
        logger.info(`getConstantValue: Using parsed constants file for ${currLevel}...`);
        constList = JSON.parse(
            fs.readFileSync(filePath, 'utf-8')
        )
    } else {
        constList = await fetchConstantsList(
            currLevel,
            currGenreList as chartGenreInterface[],
            region,
            userId
        )
    }

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
// Fetches the max DX score and finds the total note count of the chart
// ----
async function getNoteCount(
    currSong: chartGenreInterface | chartUtageInterface,
    diff: string,
    region: string,
    userId: string,
) {
    // Fetch song details page
    logger.info(`getNoteCount: Fetching ${diff} note count of ${currSong.title}...`)

    try {
        if (!currSong.id) {
            throw new Error(`ID not found in song ${currSong.title}!`);
        }

        const diffNum = diffMap.get(diff)
        if (diffNum == undefined) {
            throw new Error(`Cannot find difficulty ${diff} for ${currSong.title}!`);
        }

        // Skip if utage buddy chart, as mainet does not list the max DX score
        if (diff == "utage" && (currSong as chartUtageInterface).isBuddy) {
            throw new Error(`${currSong.title} is an utage buddy chart and maimaiNET does not list the note count. Skipping...`);
        }

        // Fetch HTML
        const $ = await cheerioFetchHtml('ranking/musicRankingDetail', region, {
                userId: userId,
                searchParams: {
                    scoreType: "1",
                    rankingType: "99",
                    diff: diffNum.toString(),
                    idx: currSong.id
                },
                filename: path.join(getOutputDir("songs"), `${currSong.title}-${diff}.html`)
            }
        )
        if(!$) {
            throw new Error(`Fetched HTML is empty for ${diff} - ${currSong.title}`)
        }

        // Find the block that contains the text
        const scoreBlock = $('div[class^="basic_block m_5 p_5"]')
        if(!scoreBlock) {
            throw new Error(`Cannot find the max DX score text for ${diff} - ${currSong.title}`)
        }

        // Example string: "\tあなたのスコア―／3,855"
        // This will parse the text to retrieve "3855" string
        const maxDxStr = scoreBlock.text()
            .trim()
            .split("／")[1]
            .replace(",", "");

        // Max dx score = max combo * 3
        return (Number.parseInt(maxDxStr) / 3).toString();
    } catch (e) {
        logger.error(`getNoteCount: ${e}`)
        return undefined;
    }
}


// ----
// From fetched html, get the artist, jacket URL and level texts.
// ----
async function parseEachSong(
    currSong: chartGenreInterface | chartUtageInterface,
    currGenreList: chartGenreInterface[] | chartUtageInterface[],
    diff: string,
    region: string,
    userId: string
) {
    const {jacket, artist, levels} = await fetchSongDetails(
        currSong, diff, region, userId
    );

    let constants: Record<string, string> = {};
    let noteCounts: Record<string, string | undefined> = {};

    for (const diff of Object.keys(levels)){
        const currLevel = levels[diff].level;
        const currLevelBase = levels[diff].base;

        // Fetch the constant value
        if (diff === "utage") {
            constants[diff] = currLevel;
        } else {
            const constantVal = await getConstantValue(
                currSong as chartGenreInterface, 
                currLevel, 
                currGenreList as chartGenreInterface[], 
                region, 
                userId
            )            
            const levelConstantStr = `${currLevelBase}.${constantVal}`
            constants[diff] = levelConstantStr;
        }

        // Fetch the note count of the chart
        const noteCount = await getNoteCount(
            currSong, diff, region, userId 
        );
        noteCounts[diff] = noteCount
    }

    if (diff == "utage") {
        return {
            title: currSong.title,
            artist: artist,
            genre: currSong.genre,
            jacket: jacket,
            utageType: (currSong as chartUtageInterface).utageType,
            isBuddy: (currSong as chartUtageInterface).isBuddy,
            levels: constants,
            noteCounts: noteCounts
        };
    } else {
        return {
            title: currSong.title,
            artist: artist,
            genre: currSong.genre,
            jacket: jacket,
            isDX: (currSong as chartGenreInterface).isDX,
            levels: constants,
            noteCounts: noteCounts
        };
    }
}

export async function fetchNewSongs(
    diff: string,
    prevGenreList: chartGenreInterface[] | chartUtageInterface[],
    currGenreList: chartGenreInterface[] | chartUtageInterface[],
    region: string,
    userId: string
) {
    // const currGenreList = await fetchGenreList(diff, region, userId);
    const newSongList = compareDiffs(prevGenreList, currGenreList);
    logger.info(`New songs: ${newSongList.length} song(s).`)

    interface newSong {
        title: string,
        artist: string,
        genre: number,
        isDX? : boolean,
        isBuddy?: boolean,
        levels: Record<string, string>
        noteCounts: Record<string, string | undefined>,
    }

    let songs: newSong[] = [];

    for (const song of newSongList) {
        const songDetail = await parseEachSong(
            song, currGenreList, diff, region, userId
        );
        songs.push(songDetail);
    }

    fs.writeFileSync(
        path.join(getOutputDir("dist"), `newSongs-${diff}-${region}.json`),
        JSON.stringify(songs, null, '\t')
    )
}
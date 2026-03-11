import fs from "fs";

import { getUserId } from "@_core/cookies";
import { diffMap, intlGenreMap, jpGenreMap, levelMap } from "@_core/maps";
import { chartConstantInterface, chartGenreInterface } from "@_core/types";

import { fetchGenreList } from "@fetch/fetch-genre";
import { fetchConstantsList, fetchAllConstants } from "@fetch/fetch-constants";
import { fetchJson } from "@_core/core-fetch";


interface officialListInterface {
    title: string,
    artist: string,
    catcode: string,
    image_url: string,
}

async function fetchCombinedData(region: string) {
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

    // const userId = await getUserId(region)

    // const genreList = await fetchGenreList(
    //     "master", region, userId
    // ) as chartGenreInterface[]

    // const allConstants = fetchAllConstants(
    //     genreList, region, userId
    // )

    // const officialList = await fetchJson(
    //     "https://maimai.sega.jp/data/maimai_songs.json"
    // )

    // Uncomment this if you wish to load an existing file instead.
    const officialList: officialListInterface[] = JSON.parse(
        fs.readFileSync('./dist/level-constants/maimai_songs.json', 'utf-8')
    )
    const allConstants: chartConstantInterface[] = JSON.parse(
        fs.readFileSync('./dist/level-constants/all.json', 'utf-8')
    )

    let completeList: Record<string, string | boolean | Record<string, number>>[] = [];
    for (const song of officialList) {
        if (song.catcode === "宴会場") {
            continue;
        }

        const genre = jpGenreMap.get(song.catcode)
        let currSong = {
            title: song.title,
            artist: song.artist,
            imageName: song.image_url,
            genre: song.catcode
        }


        const constList = allConstants.filter((c) => 
            c.title === song.title &&
            c.genre === genre
        )

        if (constList.length < 4) {
            console.log(`${song.title} ${song.catcode}`)
            continue;
        }

        const combineConstants = (currList: chartConstantInterface[], isDX: boolean) => {
            if (currList.length < 4) return;

            let levels: Record<string, number> = {};        
            for (const currEntry of currList) {
                const diff = diffMap.revGet(currEntry.diff) as string;
                const levelBase = currEntry.level.slice(-1) === "+"?
                    Number.parseInt(currEntry.level.slice(0, -1)):
                    Number.parseInt(currEntry.level)

                levels[diff] = (levelBase * 10) + currEntry.constant
            }

            completeList.push({
                ...currSong,
                isDX: isDX, 
                levels: levels
            })
        }

        const stList = constList.filter((c) => !c.isDX)
        const dxList = constList.filter((c) => c.isDX)
        
        combineConstants(stList, false);
        combineConstants(dxList, true);
    }


    fs.writeFileSync('./dist/level-constants/complete.json',
        JSON.stringify(completeList, null, '\t')
    )
    // const uniqueVer = [...new Set(officialList.map((o: any) => Number.parseInt(o.version.slice(0, 3))))];
    // uniqueVer.sort()
    // console.log(uniqueVer)
}

fetchCombinedData("jp")

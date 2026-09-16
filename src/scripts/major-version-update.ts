import fs from 'fs';
import { getUserId } from '@_core/cookies';
import { chartGenreInterface, chartUtageInterface, combinedDataInterface } from '@_core/types';
import { fetchGenreList } from '@fetch/fetch-genre';
import { fetchCombinedData } from '@fetch/fetch-combined-data';
import { fetchNewSongs } from '@fetch/fetch-new-songs';
import sleep from "sleep-promise";

function getChanges(oldData: combinedDataInterface[], newData: combinedDataInterface[]) {
    let changes: {
        title: string,
        imageName: string,
        isDX: boolean,
        hasBoth: boolean,
        diff: string,
        prev: number,
        after: number
    }[] = []

    for (const song of oldData) {
        const findRes = newData.filter( (x: any) => (
            x.title === song.title
            && x.genre === song.genre
        ))

        let result;
        let hasBoth = false;

        if (findRes.length == 1) {
            result = findRes[0]
        } else if (findRes.length > 2) {
            hasBoth = true;
            result = findRes.find( (x: any) => x.isDX == song.isDX )
        } else {
            console.error("Result mismatch: " + `${song.title} ${song.isDX}`)
            continue;
        }

        if (!result) {
            throw new Error("Result is null!")
        }

        for (const [key, value] of Object.entries(song.levels)) {
            if (result.levels[key] != value) {
                changes.push(
                    {
                        title: result.title,
                        imageName: result.imageName,
                        isDX: result.isDX,
                        hasBoth: hasBoth,
                        diff: key,
                        prev: value,
                        after: result.levels[key]
                    }
                )
            }
        }
    }

    changes = changes.sort((a, b) => a.prev - b.prev)
                        .sort((a, b) => a.after - b.after)
    console.log(changes.length)

    fs.writeFileSync('./dist/changes.json', JSON.stringify(changes, null, '\t'))
    console.log("Saved changes on ./dist/changes.json")
}

async function run(region: string) {
    // Get cookies
    const userId = await getUserId(region)

    // Fetch the genre lists and the complete data (constants and song info from maimai_songs.json)
    const masterNewList = await fetchGenreList(
        "master", region, userId
    ) as chartGenreInterface[]
    const utageNewList = await fetchGenreList(
        "utage", region, userId
    ) as chartUtageInterface[]
    const combinedNewData = await fetchCombinedData(masterNewList, region, userId)

    // Uncomment this if you want to use an existing file instead (for testing)
    // const masterNewList = JSON.parse(
    //     fs.readFileSync('./dist/genre/master.json', 'utf-8')
    // )
    // const utageNewList = JSON.parse(
    //     fs.readFileSync('./dist/genre/utage.json', 'utf-8')
    // )
    // const combinedNewData = JSON.parse(
    //     fs.readFileSync('./dist/level-constants/complete.json', 'utf-8')
    // )

    // Load the previous genre lists and complete data
    const masterOldList = JSON.parse(
        fs.readFileSync('./data/cricle-plus/master.json', 'utf-8')
    )
    const utageOldList = JSON.parse(
        fs.readFileSync('./data/circle-plus/utage.json', 'utf-8')
    )
    const combinedOldData = JSON.parse(
        fs.readFileSync('./data/circle-plus/level-constants/complete.json', 'utf-8')
    )

    // Get changes
    getChanges(combinedOldData, combinedNewData)

    // Get new songs
    await fetchNewSongs("master", masterOldList, masterNewList, region, userId);
    await fetchNewSongs("utage", utageOldList, utageNewList, region, userId);
}


function run_bak() {
    const combinedOldData = JSON.parse(
        fs.readFileSync('./data/circle/complete_data.json', 'utf-8')
        // fs.readFileSync('./data/test/complete_data.json', 'utf-8')
    )
    const combinedNewData = JSON.parse(
        fs.readFileSync('./dist/level-constants/complete.json', 'utf-8')
        // fs.readFileSync('./data/test/complete.json', 'utf-8')
    )
    getChanges(combinedOldData, combinedNewData)
}

async function waitUntil7am() {
    const now = new Date(); 
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 2, 0);
    const millisTilTarget =  target.getTime() - now.getTime();
    
    if (millisTilTarget > 0) {
        console.log(`Waiting until ${target.toLocaleTimeString()}...`);
        await sleep(millisTilTarget);
    }
}

await waitUntil7am();
await run("jp")
// await run_bak()
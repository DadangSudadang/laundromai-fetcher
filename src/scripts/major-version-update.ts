import fs from 'fs';
import { getUserId } from '@_core/cookies';
import { chartGenreInterface, chartUtageInterface, combinedDataInterface } from '@_core/types';
import { fetchGenreList } from '@fetch/fetch-genre';
import { fetchCombinedData } from '@fetch/fetch-combined-data';
import { fetchNewSongs } from '@fetch/fetch-new-songs';

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
        } else if (findRes.length == 2) {
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

    // Load the previous genre lists and complete data
    const masterOldList = JSON.parse(
        fs.readFileSync('./data/circle/master.json', 'utf-8')
    )
    const utageOldList = JSON.parse(
        fs.readFileSync('./data/circle/utage.json', 'utf-8')
    )
    const combinedOldData = JSON.parse(
        fs.readFileSync('./data/circle/complete_data.json', 'utf-8')
    )

    // Get new songs
    await fetchNewSongs("master", masterOldList, masterNewList, region, userId);
    await fetchNewSongs("utage", utageOldList, utageNewList, region, userId);

    // Get changes
    getChanges(combinedOldData, combinedNewData)
}

await run("jp")
import { getUserId } from "@_core/cookies";
import { fetchGenreList } from "@fetch/fetch-genre";
import { fetchNewSongs } from "@fetch/fetch-new-songs";
import sleep from "sleep-promise";
import fs from "fs";

const region = "jp"
let userId: string;

async function fetchNewMasters() {
    const pmasList = JSON.parse(
        fs.readFileSync("data/latest/genre/master.json", "utf-8"),
    )
    const masList = await fetchGenreList("master", region, userId)
    fetchNewSongs("master", pmasList, masList, region, userId)
}

async function fetchNewUtage() {
    const putgList = JSON.parse(
        fs.readFileSync("data/latest/genre/utage.json", "utf-8"),
    )
    const utgList = await fetchGenreList("utage", "jp", userId)
    fetchNewSongs("utage", putgList, utgList, "jp", userId)
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
userId = await getUserId(region)
await fetchNewMasters();
await fetchNewUtage();
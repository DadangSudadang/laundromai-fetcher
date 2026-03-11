import { getUserId } from "@_core/cookies";
import { diffMap } from "@_core/maps";
import { fetchNewSongs } from "@scripts/fetch-new-songs";
import fs from "fs";

const userId = await getUserId("jp")
const prevList = JSON.parse(
    fs.readFileSync("./src/tests/master.json", "utf-8"),
)

fetchNewSongs("master", prevList, "jp", userId)

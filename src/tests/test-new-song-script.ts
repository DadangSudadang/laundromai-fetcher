import { getUserId } from "@_core/cookies";
import { fetchNewSongs } from "@scripts/fetch-new-songs";
import fs from "fs";

const userId = await getUserId("jp")
const prevList = JSON.parse(
    fs.readFileSync("./src/tests/utage.json", "utf-8"),
)

fetchNewSongs("utage", prevList, "jp", userId)

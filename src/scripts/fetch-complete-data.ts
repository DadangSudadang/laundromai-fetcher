import fs from 'fs';
import { getUserId } from "@_core/cookies";
import { fetchGenreList } from "@fetch/fetch-genre";
import { fetchConstantsList, fetchAllConstants } from "@fetch/fetch-constants";
import { chartGenreInterface } from "@_core/types";
import { fetchCombinedData } from "@fetch/fetch-combined-data";

const userId = await getUserId("jp");
const genreList = await fetchGenreList("master", "jp", userId) as chartGenreInterface[];
try {
    // Uncomment this if you wish to load an existing file instead.
    // const genreList: chartGenreInterface[] = JSON.parse(
    //     fs.readFileSync('./dist/genre/master.json', 'utf-8')
    // )

    fetchCombinedData(genreList, "jp", "");
} catch (e) {
    console.log(e)
}
import fs from 'fs';
import { getUserId } from "@_core/cookies";
import { fetchGenreList } from "@fetch/fetch-genre";
import { fetchConstantsList, fetchAllConstants } from "@fetch/fetch-constants";
import { chartGenreInterface } from "@_core/types";
import { fetchCombinedData } from "@fetch/fetch-combined-data";

const userId = await getUserId("jp");
const genreList = await fetchGenreList("master", "jp", userId) as chartGenreInterface[];
try {
    fetchCombinedData(genreList, "jp", userId);
} catch (e) {
    console.log(e)
}
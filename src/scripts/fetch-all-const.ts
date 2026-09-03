import { getUserId } from "@_core/cookies";
import { fetchGenreList } from "@fetch/fetch-genre";
import { fetchConstantsList, fetchAllConstants } from "@fetch/fetch-constants";
import { chartGenreInterface } from "@_core/types";

const userId = await getUserId("jp");
const genreList = await fetchGenreList("master", "jp", userId) as chartGenreInterface[];
try {
    // fetchConstantsList("5", genreList, "jp", userId);
    fetchAllConstants(genreList, "jp", userId);
} catch (e) {
    console.log(e)
}
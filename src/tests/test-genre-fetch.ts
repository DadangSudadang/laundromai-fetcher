import { getUserId } from "@_core/cookies";
import { fetchGenreList } from "@fetch/fetch-genre";

const userId = await getUserId("jp")
fetchGenreList("master", "jp", userId)
fetchGenreList("remaster", "jp", userId)
fetchGenreList("utage", "jp", userId)
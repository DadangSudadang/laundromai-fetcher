import dotenvFlow from "dotenv-flow";
dotenvFlow.config();

import fs from 'fs';
export const outputDirs: Record<string, string> = {
    genre: "./dist/level-constants/",
    songs: "./dist/songs/",
    constants: "./dist/level-constants/",
    jackets: "./dist/jackets/"
}
for (const idx of Object.keys(outputDirs)) {
    const dir = outputDirs[idx];
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

if (!process.env.TIMEOUT) {
    throw new Error("Please set the TIMEOUT variable in the .env file.")
}
export const TIMEOUT = parseInt(process.env.TIMEOUT);
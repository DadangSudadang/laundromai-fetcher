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

export function getTimeout() {
    if (!process.env.TIMEOUT) {
        throw new Error("environment: Please set the TIMEOUT variable in the .env file.")
    }
    
    const isInteger = (/^\d+$/.test(process.env.TIMEOUT));
    if (!isInteger) {
        throw new Error(`environment: TIMEOUT variable has to be an integer. Value "${process.env.TIMEOUT}" is not accepted.`)
    }

    return parseInt(process.env.TIMEOUT);
}
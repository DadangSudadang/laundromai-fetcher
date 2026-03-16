import fs from 'fs';

export function getOutputDir(dir: string) {
    const outputDirs: Record<string, string> = {
        dist: "./dist",
        genre: "./dist/genre/",
        songs: "./dist/songs/",
        constants: "./dist/level-constants/",
        jackets: "./dist/jackets/",
    };

    if (Object.keys(outputDirs).includes(dir)) {
        const path = outputDirs[dir];
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
        };
        return path;
    } else {
        throw new Error(`environment: "${dir}" is not a valid directory value. Valid values: ${Object.keys(outputDirs)}`)
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
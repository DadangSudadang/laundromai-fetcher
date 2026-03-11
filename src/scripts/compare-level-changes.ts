import fs from 'fs';

interface songInfoType {
    title: string,
    artist: string,
    imageName: string,
    imageURL: string,
    genre: string,
    version: string
    isDX: boolean,
    levels: Record<string, number>
}

function getChanges(oldData: songInfoType[], newData: songInfoType[]) {

    let changes: {
        title: string,
        imageName: string,
        isDX: boolean,
        hasBoth: boolean,
        diff: string,
        prev: number,
        after: number
    }[] = []

    for (const song of oldData) {
        const findRes = newData.filter( (x: any) => (
            x.title === song.title
            && x.genre === song.genre
        ))

        let result;
        let hasBoth = false;

        if (findRes.length == 1) {
            result = findRes[0]
        } else if (findRes.length == 2) {
            hasBoth = true;
            result = findRes.find( (x: any) => x.isDX == song.isDX )
        } else {
            console.error("Result mismatch: " + `${song.title} ${song.isDX}`)
            continue;
        }

        if (!result) {
            throw new Error("Result is null!")
        }

        for (const [key, value] of Object.entries(song.levels)) {
            if (result.levels[key] != value) {
                changes.push(
                    {
                        title: result.title,
                        imageName: result.imageName,
                        isDX: result.isDX,
                        hasBoth: hasBoth,
                        diff: key,
                        prev: value,
                        after: result.levels[key]
                    }
                )
            }
        }
    }

    changes = changes.sort((a, b) => a.prev - b.prev)
                        .sort((a, b) => a.after - b.after)
    console.log(changes.length)

    fs.writeFileSync('./dist/changes.json', JSON.stringify(changes, null, '\t'))
}

const oldData = JSON.parse(
    // fs.readFileSync('./dist/level-constants/all.json', 'utf-8')
    fs.readFileSync('./src/tests/lomo_after.json', 'utf-8')
)
const newData = JSON.parse(
    fs.readFileSync('./dist/level-constants/complete.json', 'utf-8')
)

getChanges(oldData, newData)

// const oldTitles = lomoData.map(x => x.title);
// let difference = completeData.filter((x: any) => !oldTitles.includes(x.title) );
// const versions = new Set(difference.map((d: any) => d.version))
// console.log(difference.length)
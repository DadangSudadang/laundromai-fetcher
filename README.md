# laundromai-fetcher

Data fetching scripts for the [Laundromai](https://x.com/laundromai) Twitter account.  
This repository only contains the data fetching scripts and not the graphic generating tool.

This project is borrows a lot of elements from [arcade-songs-fetch](https://github.com/zetaraku/arcade-songs-fetch), particularly the environment setup and user ID fetching logic. Special thanks to Zetaraku for open-sourcing their code and allowing me to learn more about data fetching.

I am currently still inexperienced in Node.js and open source development. If you have feedback, please let me know by [creating an issue](https://github.com/DadangSudadang/laundromai-fetcher/issues) or contact me directly through social media.

## Prerequisites
- Node.js (LTS or above)
- Bash shell  
  The NPM run scripts are meant to run in a Bash environment. If you are on Windows, you can use [WSL to use a Linux environment](https://learn.microsoft.com/en-us/windows/wsl/install) (recommended), or Git Bash from [installing Git in Windows](https://git-scm.com/).  
  Git Bash requires configuring [`script-shell`](https://docs.npmjs.com/cli/v8/using-npm/config#script-shell) to run NPM run scripts. See:   [https://stackoverflow.com/questions/23243353/how-to-set-shell-for-npm-run-scripts-in-windows/46006249#46006249](https://stackoverflow.com/questions/23243353/how-to-set-shell-for-npm-run-scripts-in-windows/46006249#46006249)

I am currently using a Linux environment and I have not tested running these scripts in Windows environments.

## Setup
- Download this repository, either with `git clone` or Download ZIP.
- Make a copy of `.env.example` file, and rename the copy to `.env` and fill in the required fields.
- Run the command below:  
  ```
  npm install
  ```

## Usage 
First, set a reasonable fetch timeout value between 1500-3000 ms (1.5-3 sec) per request in the `.env` file. Do not set it too low.  
Currently only two commands are implemented:
  - `npm run new-songs`  
    Runs `src/scripts/fetch-new-songs.ts` script.  
    Finds new songs by fetching the master and utage difficulty of the genre page, and compare it with the previous `master.json` and `utage.json` in `data/latest/`. Next, it fetches the chart constant, jacket and note count of each chart and puts it in the `dist` folder.  
    Outputs `newSongs*.json` in `dist` folder containing details of the new songs.

  - `npm run version-update`  
    Runs `src/scripts/major-version-update.ts` script.
    Finds new songs similar to the command above, but also compares the chart constant changes with the specified chart constant data of previous version.  
    Running it may causes timeout issues on your end. Please set the timeout value larger than usual.

These scripts are still work in progress, so expect a lot of code spaghetti and some inconveniences in some places. Please send me any suggestions by creating an issue.

## Current Limitations
- On every update day, you need to delete `dist/level-constants` folder manually. The `new-songs` scripts reuse the previously parsed chart constant files to reduce the amount of fetches. Without deleting the folder, the script will not be able to find new chart constants.

## Special Thanks
- Zetaraku (arcade-songs-fetch)

## Copyright
- Licensed under the [MIT License](https://github.com/DadangSudadang/laundromai-fetcher/blob/main/LICENSE).
- This is a fan project. It is not affiliated nor endorsed by SEGA in any way.
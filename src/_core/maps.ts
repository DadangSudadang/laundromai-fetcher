// ----
// Creates a reversible Map.
// Allows querying from either key side or value side.
// ----
export class TwoWayMap {
    map: Map<(string | number), (string | number)>;
    reverseMap: Map<(string | number), (string | number)>;
	arr: [(string | number), (string | number)][];

    constructor(arr: Iterable<readonly [string | number, string | number]>) {
       this.map = new Map(arr);
       this.reverseMap = new Map();
	   this.arr = Array.from(arr).concat() as [(string | number), (string | number)][];

       for(const key in this.map) {
          const value = this.map.get(key) as (string | number);
          this.reverseMap.set(value, key);   
       }
    }
    
    get(key: (string | number)) { return this.map.get(key); }
    revGet(key: (string | number)) { return this.reverseMap.get(key); }
	getArr() {return this.arr}
}

export const jpGenreMap = new TwoWayMap([
	["POPS＆アニメ", 0],
	["niconico＆ボーカロイド", 1],
	["東方Project", 2],
	["ゲーム＆バラエティ", 3],
	["maimai", 4],
	["オンゲキ＆CHUNITHM", 5],
])

export const intlGenreMap = new TwoWayMap([
	["POPS＆ANIME", 0],
	["niconico＆VOCALOID™", 1],
	["東方Project", 2],
	["GAME＆VARIETY", 3],
	["maimai", 4],
	["オンゲキ＆CHUNITHM", 5],
])

export const diffMap = new TwoWayMap([
	["basic", 0],
	["advanced", 1],
	["expert", 2],
	["master", 3],
	["remaster", 4],
	["utage", 10],
]);

export const levelMap = new TwoWayMap([
	["1", 1],
	["2", 2],
	["3", 3],
	["4", 4],
	["5", 5],
	["6", 6],
	["7", 7],
	["7+", 8],
	["8", 9],
	["8+", 10],
	["9", 11],
	["9+", 12],
	["10", 13],
	["10+", 14],
	["11", 15],
	["11+", 16],
	["12", 17],
	["12+", 18],
	["13", 19],
	["13+", 20],
	["14", 21],
	["14+", 22],
	["15", 23],
]);

export const jpVersionMap = new TwoWayMap([
    ['maimai', 0],
    ['maimai PLUS', 1],
    ['GreeN', 2],
    ['GreeN PLUS', 3],
    ['ORANGE', 4],
    ['ORANGE PLUS', 5],
    ['PiNK', 6],
    ['PiNK PLUS', 7],
    ['MURASAKi', 8],
    ['MURASAKi PLUS', 9],
    ['MiLK', 10],
    ['MiLK PLUS', 11],
    ['FiNALE', 12],
    ['でらっくす', 13],
    ['でらっくす PLUS', 14],
    ['スプラッシュ', 15],
    ['スプラッシュ PLUS', 16],
    ['UNiVERSE', 17],
    ['UNiVERSE PLUS', 18],
    ['FESTiVAL', 19],
    ['FESTiVAL PLUS', 20],
    ['BUDDiES', 21],
    ['BUDDiES PLUS', 22],
    ['PRiSM', 23],
    ['PRiSM PLUS', 24],
    ['CiRCLE', 25],
])

export const intlVersionMap = new TwoWayMap([
    ['maimai', 0],
    ['maimai PLUS', 1],
    ['GreeN', 2],
    ['GreeN PLUS', 3],
    ['ORANGE', 4],
    ['ORANGE PLUS', 5],
    ['PiNK', 6],
    ['PiNK PLUS', 7],
    ['MURASAKi', 8],
    ['MURASAKi PLUS', 9],
    ['MiLK', 10],
    ['MiLK PLUS', 11],
    ['FiNALE', 12],
    ['でらっくす', 13],
    ['でらっくす PLUS', 14],
    ['Splash', 15],
    ['Splash PLUS', 16],
    ['UNiVERSE', 17],
    ['UNiVERSE PLUS', 18],
    ['FESTiVAL', 19],
    ['FESTiVAL PLUS', 20],
    ['BUDDiES', 21],
    ['BUDDiES PLUS', 22],
    ['PRiSM', 23],
    ['PRiSM PLUS', 24],
    ['CiRCLE', 25],
])
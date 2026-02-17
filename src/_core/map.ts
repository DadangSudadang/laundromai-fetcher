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
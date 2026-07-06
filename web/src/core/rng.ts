// 決定論的な乱数 (シード付き) — マップ生成・エンカウント再現用
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
    if (this.s === 0) this.s = 0x9e3779b9;
  }

  /** [0,1) */
  next(): number {
    // mulberry32
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [0, maxExclusive) の整数 */
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /** [min, maxExclusive) の整数 */
  range(min: number, maxExclusive: number): number {
    return min + this.int(maxExclusive - min);
  }

  /** [min, max] の実数 */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

/** 非決定論的な用途 (戦闘の乱数など Unity 版 Random.Range 相当) */
export const battleRandom = {
  value: () => Math.random(),
  range: (minInclusive: number, maxExclusive: number) =>
    minInclusive + Math.floor(Math.random() * (maxExclusive - minInclusive)),
  float: (min: number, max: number) => min + Math.random() * (max - min),
};

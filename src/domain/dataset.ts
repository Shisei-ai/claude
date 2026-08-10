/**
 * 品目・設備・レシピの索引（参照実装の `reindex()` と グローバル `IX` に相当）。
 *
 * 参照実装では IX がグローバルで、データを編集するたびに全体を作り直していた。
 * ここでは「データ一式から作る読み取り専用の値」にして、計算関数へ引数で渡す。
 * こうしておくと domain の関数が DOM もグローバルも見なくて済む（HANDOFF §2 の境界）。
 */

import { BELT_CAP, DEFAULT_PIPE_CAP, defaultPortCounts, type GameConfig } from './constants';
import type { Facility, Item, Phase, Port, Recipe, Save, Side } from './types';

/** 辺の長さ。0=北/2=南 は幅、1=東/3=西 は奥行き */
export function sideLen(f: Pick<Facility, 'w' | 'h'>, s: Side): number {
  return s & 1 ? f.h : f.w;
}

/**
 * 口を辺に沿って並べる。
 * start の辺から順に、埋まっていない位置へ1つずつ置いていき、
 * その辺を使い切ったら次の辺（時計回り）へ回る。
 * 搬出口と搬入口は同じ `taken` を共有するので、同じマスに両方が来ることはない。
 */
export function allocSide(
  f: Pick<Facility, 'w' | 'h'>,
  start: Side,
  n: number,
  taken: Set<string>,
): { s: Side; o: number }[] {
  const ps: { s: Side; o: number }[] = [];
  let s = (start & 3) as Side;
  let o = 0;
  let guard = 0;
  while (ps.length < n && guard++ < 200) {
    if (o >= sideLen(f, s)) {
      s = ((s + 1) & 3) as Side;
      o = 0;
      continue;
    }
    const k = s + ':' + o;
    if (!taken.has(k)) {
      taken.add(k);
      ps.push({ s, o });
    }
    o++;
  }
  return ps;
}

/**
 * 設備のポート配置。搬出口を先に、そのあと搬入口を割り当てる。
 * この順序がそのままポート番号（Belt.fromPort / toPort）になるので、
 * 保存済みのベルトを壊さないために参照実装と同じ順を守ること。
 */
export function computePorts(f: Facility): Port[] {
  if (f.ports) return f.ports;
  const { nIn, nOut, inSide, outSide } = defaultPortCounts(f);
  const taken = new Set<string>();
  const outs: Port[] = allocSide(f, outSide, nOut, taken).map((p) => ({ t: 'out', s: p.s, o: p.o }));
  const ins: Port[] = allocSide(f, inSide, nIn, taken).map((p) => ({ t: 'in', s: p.s, o: p.o }));
  return outs.concat(ins);
}

export class Dataset {
  readonly items = new Map<string, Item>();
  readonly facs = new Map<string, Facility>();
  readonly recs = new Map<string, Recipe>();
  /** 設備 id → その設備で作れるレシピ */
  readonly recByFac = new Map<string, Recipe[]>();
  /** 品目 id → その品目を（副産物としてでも）出すレシピ */
  readonly recOut = new Map<string, Recipe[]>();
  readonly cfg: GameConfig;

  private readonly portCache = new Map<string, Port[]>();

  constructor(data: Pick<Save, 'items' | 'facs' | 'recs'>, cfg?: GameConfig) {
    this.cfg = cfg ?? { pipeCap: DEFAULT_PIPE_CAP };
    for (const i of data.items) this.items.set(i.id, i);
    for (const f of data.facs) {
      this.facs.set(f.id, f);
      this.recByFac.set(f.id, []);
    }
    for (const r of data.recs) {
      this.recs.set(r.id, r);
      let byFac = this.recByFac.get(r.fac);
      if (!byFac) this.recByFac.set(r.fac, (byFac = []));
      byFac.push(r);
      for (const o of r.out) {
        let byOut = this.recOut.get(o.item);
        if (!byOut) this.recOut.set(o.item, (byOut = []));
        byOut.push(r);
      }
    }
  }

  item(id: string | null | undefined): Item | undefined {
    return id == null ? undefined : this.items.get(id);
  }
  fac(id: string | null | undefined): Facility | undefined {
    return id == null ? undefined : this.facs.get(id);
  }
  rec(id: string | null | undefined): Recipe | undefined {
    return id == null ? undefined : this.recs.get(id);
  }
  recipesFor(facId: string): readonly Recipe[] {
    return this.recByFac.get(facId) ?? [];
  }
  /** その品目を出すレシピ（副産物として出すものも含む） */
  producedBy(itemId: string): readonly Recipe[] {
    return this.recOut.get(itemId) ?? [];
  }

  /** 未登録の品目は固体として扱う（参照実装と同じ） */
  phaseOf(itemId: string | null | undefined): Phase {
    return this.item(itemId)?.phase ?? 'solid';
  }

  /** ライン1本の上限。固体はベルト（確認済 30個/分）、液体・ガスはパイプ（要確認） */
  capOf(itemId: string | null | undefined): number {
    return this.phaseOf(itemId) === 'solid' ? BELT_CAP : this.cfg.pipeCap;
  }

  lineName(itemId: string | null | undefined): string {
    return this.phaseOf(itemId) === 'solid' ? 'ベルト' : 'パイプ';
  }

  itemName(itemId: string | null | undefined): string {
    return this.item(itemId)?.name ?? '?';
  }

  itemColor(itemId: string | null | undefined): string {
    return this.item(itemId)?.color ?? '#888';
  }

  /**
   * 口の数（既定値を補ったもの）。
   *
   * 初期データには nIn / nOut を持たない設備がある（粉砕機・組立機・成形機など）。
   * 参照実装は reindex() の中で facDefaults がそれらを書き込んでいたので、
   * 以降のコードは常に値が入っている前提で書かれている。
   * こちらは設備定義を書き換えないぶん、読むときに既定値を補う必要がある。
   * ここを素の f.nIn で読むと、分流器・合流器の要否判定がずれる。
   */
  portCounts(facId: string | null | undefined): { nIn: number; nOut: number; inSide: Side; outSide: Side } {
    const f = this.fac(facId);
    if (!f) return { nIn: 0, nOut: 0, inSide: 3, outSide: 1 };
    return defaultPortCounts(f);
  }

  /** 設備のポート配置。設備定義は編集されるまで変わらないので都度キャッシュする */
  ports(facId: string): readonly Port[] {
    const hit = this.portCache.get(facId);
    if (hit) return hit;
    const f = this.facs.get(facId);
    const ps = f ? computePorts(f) : [];
    this.portCache.set(facId, ps);
    return ps;
  }

  /** 発電設備と、そこで使う発電レシピ */
  generatorFac(): Facility | undefined {
    for (const f of this.facs.values()) if (f.kind === 'generator' && (f.gen || 0) > 0) return f;
    return undefined;
  }
  generatorRec(preferred?: string | null): Recipe | undefined {
    const g = this.generatorFac();
    if (!g) return undefined;
    const list = this.recipesFor(g.id);
    if (preferred) {
      const hit = list.find((r) => r.id === preferred);
      if (hit) return hit;
    }
    return list[0];
  }
}

export function buildDataset(data: Pick<Save, 'items' | 'facs' | 'recs'>, cfg?: GameConfig): Dataset {
  return new Dataset(data, cfg);
}

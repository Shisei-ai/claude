/**
 * 保存・読込（HANDOFF §6-7 の後方互換）
 *
 * 要件は「現行ファイルがそのまま読めること」。
 * 参照実装が書き出す JSON の形は次のとおりで、こちらの Save 型と同じ:
 *
 *   { meta:{name, ver, basePower, autoGrow, pipeCap, genRec, goal, region},
 *     items:[…], facs:[…], recs:[…], areas:[…], cur:0 }
 *
 * さらに参照実装は、areas を持たない古い形（盤面がトップレベルにある）も
 * 読めるようにしてあった。ここでも同じ寛容さを保つ。
 */

import { BOARD_H_DEFAULT, BOARD_W_DEFAULT, DEFAULT_PIPE_CAP, REGIONS, type GameConfig } from '../domain/constants';
import { buildDataset } from '../domain/dataset';
import { boardOf, type Board } from '../domain/geometry';
import { repairBelts } from '../domain/routing';
import type { Area, LegacySave, Save } from '../domain/types';

export interface LoadResult {
  save: Save;
  cfg: GameConfig;
  /** 引き直したライン。端の口を持たない古いファイルを読んだときに出る */
  repaired: number;
  /** 引き直せずに失われたライン */
  lost: number;
}

/**
 * 現在の状態を JSON にする。
 * 参照実装の dump() と同じキー順・同じインデント（1スペース）にしてあるので、
 * 同じ状態なら文字列として一致する。
 */
export function dumpSave(save: Save, cfg: GameConfig): string {
  return JSON.stringify(
    {
      meta: { ...save.meta, pipeCap: cfg.pipeCap },
      items: save.items,
      facs: save.facs,
      recs: save.recs,
      areas: save.areas,
      cur: save.cur,
    },
    null,
    1,
  );
}

/**
 * エリアに既定値を埋める。古いファイルには無いフィールドがある。
 *
 * 元のオブジェクトを展開してから足りないものを足すので、
 * **読み込んだファイルのキー順がそのまま残る**。
 * 書き出したときに元ファイルと同じ並びになり、差分が読みやすい。
 */
function normalizeArea(a: Partial<Area>): Area {
  const out = { ...a } as Area;
  if (out.id == null) out.id = 'a0';
  if (out.region == null) out.region = REGIONS[0]!;
  if (out.name == null) out.name = 'エリア1';
  if (!out.w) out.w = BOARD_W_DEFAULT;
  if (!out.h) out.h = BOARD_H_DEFAULT;
  if (out.cap == null) out.cap = 0;
  if (out.zip == null) out.zip = 0;
  if (out.combat == null) out.combat = 0;
  if (out.field == null) out.field = [];
  if (out.nodes == null) out.nodes = [];
  if (out.belts == null) out.belts = [];
  if (out.net == null) out.net = {};
  return out;
}

/**
 * JSON を読む。壊れていれば例外を投げる（呼び出し側がメッセージを出す）。
 *
 * 端のポート番号を持たないライン（さらに古い形式）が混ざっていたら、
 * 経路を引き直して復元する。
 */
export function loadSave(json: string): LoadResult {
  const o: LegacySave = JSON.parse(json);
  for (const k of ['items', 'facs', 'recs'] as const) {
    if (!Array.isArray(o[k])) throw new Error(k + ' がありません');
  }

  /* areas が無いのは、エリアの概念が入る前のファイル。
     トップレベルの盤面を1エリアとして受け止める */
  const rawAreas: Partial<Area>[] =
    Array.isArray(o.areas) && o.areas.length
      ? o.areas
      : [
          {
            id: 'a0',
            region: REGIONS[0]!,
            name: 'エリア1',
            cap: 0,
            zip: 0,
            combat: 0,
            w: BOARD_W_DEFAULT,
            h: BOARD_H_DEFAULT,
            net: {},
            nodes: o.nodes ?? [],
            belts: o.belts ?? [],
            field: o.field ?? [],
          },
        ];
  const areas = rawAreas.map(normalizeArea);

  // meta も同じくキー順を保つ（知らないフィールドも落とさない）
  const meta = { ...(o.meta ?? {}) } as Save['meta'];
  if (meta.name == null) meta.name = '読み込んだプラン';
  if (meta.basePower == null) meta.basePower = 240;

  const save: Save = {
    meta,
    items: o.items!,
    facs: o.facs!,
    recs: o.recs!,
    areas,
    cur: Math.max(0, Math.min(+(o.cur ?? 0) || 0, areas.length - 1)),
  };

  const cfg: GameConfig = { pipeCap: (save.meta.pipeCap ?? 0) > 0 ? +save.meta.pipeCap! : DEFAULT_PIPE_CAP };

  /* 端の口を持たないラインは引き直す。
     参照実装は「開いているエリアの盤面だけ」を直していたが、
     開かなかったエリアが壊れたままになるので、全エリアを見る */
  const ds = buildDataset(save, cfg);
  let repaired = 0;
  let lost = 0;
  for (const a of areas) {
    if (!a.belts.some((b) => b.fromPort === undefined || b.toPort === undefined)) continue;
    const board = boardOf(a.w, a.h, a.nodes, a.belts);
    const before = a.belts.length;
    lost += repairBelts(ds, board);
    a.belts = board.belts;
    repaired += before;
  }

  return { save, cfg, repaired, lost };
}

/** エリアを開く。参照実装の loadArea に相当（uid の採番をやり直す） */
export function boardOfArea(area: Area): Board {
  return boardOf(area.w || BOARD_W_DEFAULT, area.h || BOARD_H_DEFAULT, area.nodes, area.belts);
}

/** 盤面の状態をエリアへ書き戻す。参照実装の syncArea に相当 */
export function syncArea(area: Area, board: Board): void {
  area.nodes = board.nodes;
  area.belts = board.belts;
  area.w = board.w;
  area.h = board.h;
}

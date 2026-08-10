/**
 * ゲーム定数（HANDOFF §4）
 *
 * 出典と確度:
 *   BELT_CAP  30 個/分（1個/2秒）      … 確認済
 *   PIPE_CAP  30 個/分                  … 要確認。ユーザーが設定で変更できる前提
 *   SPLIT_MAX 分流器の分岐上限 3        … 確認済
 *   GEN_SEC   発電機がバッテリー1個を消費する秒数 40 … 確認済
 *
 * レシピの比率は公開されている生産ライン実数から逆算したもので、
 * 1周期の秒数はライン本数からの推定を含む。数値の大半は暫定なので、
 * 「ユーザーがゲーム内の製造プロセス画面を見て上書きする」前提で設計すること。
 */

import type { Facility, Kind, Phase, Region, Side } from './types';

/** ベルト1本 30個/分（1個/2秒）。確認済 */
export const BELT_CAP = 30;

/** パイプ1本の上限。要確認なので既定値であって定数ではない（GameConfig で上書きする） */
export const DEFAULT_PIPE_CAP = 30;

/** 分流器の分岐上限。確認済 */
export const SPLIT_MAX = 3;

/** 発電機がバッテリー1個を消費する秒数。確認済 */
export const GEN_SEC = 40;

/** 盤面の既定サイズと上限 */
export const BOARD_W_DEFAULT = 80;
export const BOARD_H_DEFAULT = 56;
export const BOARD_W_MAX = 240;
export const BOARD_H_MAX = 160;
export const BOARD_MIN = 12;

/**
 * 参照実装のグローバル `PIPE_CAP` に相当する可変値。
 * グローバル変数にはせず、計算に持ち回る設定として明示的に渡す（HANDOFF §2 の境界）。
 */
export interface GameConfig {
  pipeCap: number;
}

export const defaultConfig = (): GameConfig => ({ pipeCap: DEFAULT_PIPE_CAP });

/** 方角。N,E,S,W の順で、Side の番号と添字が対応する */
export const DIRS: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export const SIDE_JP: readonly string[] = ['上', '右', '下', '左'];

export const KIND: Record<Kind, { label: string; color: string }> = {
  field: { label: '採取ゾーン', color: '#7FD48A' },
  source: { label: '倉庫搬出', color: '#4FD8C2' },
  process: { label: '生産', color: '#5AA9E6' },
  generator: { label: '発電', color: '#F0A93C' },
  power: { label: '送電', color: '#E0B24A' },
  logistics: { label: '物流', color: '#9092DE' },
  sink: { label: '倉庫搬入', color: '#93A3AA' },
};

export const REGIONS: readonly Region[] = ['四号谷地', '武陵'];

/** レシピの確度の表示。UI からも診断からも使う */
export const CONF_LABEL = {
  ok: { label: '確認済', color: 'var(--mint)' },
  part: { label: '一部', color: 'var(--amber)' },
  guess: { label: '推定', color: 'var(--coral)' },
} as const;

/**
 * 相ごとの搬送上限。固体はベルト、液体・ガスはパイプ。
 * パイプ側は要確認の値なので config から取る。
 */
export function capOfPhase(phase: Phase, cfg: GameConfig): number {
  return phase === 'solid' ? BELT_CAP : cfg.pipeCap;
}

export function lineNameOfPhase(phase: Phase): string {
  return phase === 'solid' ? 'ベルト' : 'パイプ';
}

/**
 * 協約容量の消費。
 * 工業エリア内の設備はおおむね0で、フィールドの採取機やタンク・散布機の類が消費する
 * （攻略サイトのコメント情報にもとづく推定値）。設備に cap があればそれが優先。
 */
export function capCostOf(f: Facility | undefined | null): number {
  if (!f) return 0;
  if (f.cap != null) return f.cap;
  if (f.field) return 2;
  if (f.kind === 'power') return 1;
  if (f.env || f.phase === 'liquid' || f.phase === 'gas') return 2;
  return 0;
}

/**
 * 口の数と並べ始める辺の既定値。
 *
 * 参照実装の facDefaults は設備オブジェクトを破壊的に書き換えていて、
 * その結果が保存 JSON にも載っていた。ここでは値を返すだけにして、
 * 「既に持っている設備はその値を尊重する」という後方互換だけを保つ。
 */
export function defaultPortCounts(f: Facility): {
  nIn: number;
  nOut: number;
  inSide: Side;
  outSide: Side;
} {
  const nIn =
    f.nIn != null
      ? f.nIn
      : f.kind === 'sink'
        ? Math.min(4, 2 * (f.w + f.h))
        : f.kind === 'generator'
          ? 1
          : f.kind === 'logistics'
            ? f.split
              ? 1
              : 3
            : f.kind === 'source'
              ? 0
              : 2;
  const nOut =
    f.nOut != null
      ? f.nOut
      : f.kind === 'sink'
        ? 0
        : f.kind === 'generator'
          ? 0
          : f.kind === 'logistics'
            ? f.split
              ? 3
              : 1
            : 1;
  // 既定は左から入れて右へ出す
  const inSide: Side = f.inSide != null ? f.inSide : 3;
  const outSide: Side = f.outSide != null ? f.outSide : 1;
  return { nIn, nOut, inSide, outSide };
}

/**
 * 地域ごとの採取上限のプリセット。
 * 武陵は Ver1.4 の実測メモ（源石540／青鉄120／赤銅420／不活性ガス460／息壌ガス100 個/分）。
 * 実際は地域建設レベルや解放状況で変わるので、読み込んだあとユーザーが直す前提。
 */
export const REGION_PRESETS: Record<Region, { fac: string; item: string; count: number; rate: number }[]> = {
  四号谷地: [
    { fac: 'miner2', item: 'ore_gen', count: 1, rate: 180 },
    { fac: 'miner2', item: 'ore_blue', count: 1, rate: 60 },
    { fac: 'miner2', item: 'ore_pur', count: 1, rate: 30 },
    { fac: 'pump', item: 'water', count: 2, rate: 60 },
  ],
  武陵: [
    { fac: 'miner2', item: 'ore_gen', count: 1, rate: 540 },
    { fac: 'miner2', item: 'ore_blue', count: 1, rate: 120 },
    { fac: 'minerW', item: 'ore_red', count: 1, rate: 420 },
    { fac: 'gaspump', item: 'gas_in', count: 1, rate: 460 },
    { fac: 'gaspump', item: 'gas_soku', count: 1, rate: 100 },
    { fac: 'pump', item: 'water', count: 12, rate: 60 },
  ],
};

/** 盤面サイズの正規化。参照実装の setBoard と同じ丸め方 */
export function clampBoard(w: number, h: number): { w: number; h: number } {
  return {
    w: Math.max(BOARD_MIN, Math.min(BOARD_W_MAX, Math.round(w))),
    h: Math.max(BOARD_MIN, Math.min(BOARD_H_MAX, Math.round(h))),
  };
}

/** 数値の表示整形（参照実装の fmt と同じ。100以上は整数、それ未満は小数第1位） */
export function fmt(v: number): string {
  return (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toLocaleString('ja-JP');
}

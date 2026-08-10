/**
 * §6-1 の合否判定：型・定数・seed データの切り出しが参照実装と一致しているか。
 *
 * fixtures/reference-seed.json は、参照実装 aic-planner.html の seed() を
 * そのまま実行して書き出したもの。ここが一致していれば、
 * 以降の移植（geometry / solver / planner / layout）は
 * 「参照実装と同じ入力から始まっている」ことが保証される。
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  BELT_CAP,
  DEFAULT_PIPE_CAP,
  GEN_SEC,
  REGION_PRESETS,
  SPLIT_MAX,
  capCostOf,
  capOfPhase,
  clampBoard,
  defaultConfig,
  defaultPortCounts,
} from '../src/domain/constants';
import { AREA_DEFAULTS, SEED_FACS, SEED_ITEMS, SEED_RECS, seed } from '../src/data/seed';
import type { Facility, Save } from '../src/domain/types';

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8'));

describe('seed データが参照実装と一致する', () => {
  it('seed() の出力が参照実装の seed() と完全に一致する', () => {
    // JSON 経由で比べる。キーの順序まで揃えてあるので文字列比較でよい
    const ref = fixture('reference-seed.json');
    expect(JSON.parse(JSON.stringify(seed()))).toEqual(ref);
    expect(JSON.stringify(seed())).toBe(JSON.stringify(ref));
  });

  it('件数が HANDOFF §2 の記載どおり（品目68・設備40・レシピ50・エリア15）', () => {
    expect(SEED_ITEMS).toHaveLength(68);
    expect(SEED_FACS).toHaveLength(40);
    expect(SEED_RECS).toHaveLength(50);
    expect(AREA_DEFAULTS).toHaveLength(15);
  });

  it('seed() は毎回まっさらな複製を返す（呼び出し側が壊しても次に響かない）', () => {
    const a = seed();
    a.items[0]!.name = '書き換えた';
    a.areas[0]!.nodes.push({ uid: 'u1', fac: 'wh_out', x: 0, y: 0, rot: 0 });
    const b = seed();
    expect(b.items[0]!.name).toBe('源石鉱物');
    expect(b.areas[0]!.nodes).toHaveLength(0);
  });
});

describe('seed データの参照整合性', () => {
  const s: Save = seed();
  const itemIds = new Set(s.items.map((i) => i.id));
  const facIds = new Set(s.facs.map((f) => f.id));

  it('id が重複していない', () => {
    expect(itemIds.size).toBe(s.items.length);
    expect(facIds.size).toBe(s.facs.length);
    expect(new Set(s.recs.map((r) => r.id)).size).toBe(s.recs.length);
    expect(new Set(s.areas.map((a) => a.id)).size).toBe(s.areas.length);
  });

  it('レシピが実在する設備と品目だけを参照している', () => {
    for (const r of s.recs) {
      expect(facIds, `${r.name} の設備 ${r.fac}`).toContain(r.fac);
      for (const io of [...r.in, ...r.out]) {
        expect(itemIds, `${r.name} の品目 ${io.item}`).toContain(io.item);
      }
    }
  });

  it('レシピの秒数と数量が正の値', () => {
    for (const r of s.recs) {
      expect(r.sec, r.name).toBeGreaterThan(0);
      for (const io of [...r.in, ...r.out]) expect(io.qty, `${r.name} / ${io.item}`).toBeGreaterThan(0);
    }
  });

  it('採取ゾーンの初期登録が実在する設備・品目を指している', () => {
    for (const a of s.areas) {
      for (const f of a.field) {
        expect(facIds, `${a.name}`).toContain(f.fac);
        expect(itemIds, `${a.name}`).toContain(f.item);
        expect(f.count).toBeGreaterThan(0);
        expect(f.rate).toBeGreaterThan(0);
      }
    }
  });

  it('採取設備の takes が実在する品目を指している', () => {
    for (const f of s.facs) {
      for (const t of f.takes ?? []) expect(itemIds, f.name).toContain(t);
    }
  });

  it('採取ゾーンのプリセットが実在する設備・品目を指している', () => {
    for (const rows of Object.values(REGION_PRESETS)) {
      for (const r of rows) {
        expect(facIds).toContain(r.fac);
        expect(itemIds).toContain(r.item);
      }
    }
  });

  it('地域は 四号谷地 と 武陵 の2つだけ', () => {
    expect([...new Set(s.areas.map((a) => a.region))].sort()).toEqual(['四号谷地', '武陵']);
  });

  it('確度が ok のレシピは4件だけ（HANDOFF §4）', () => {
    expect(s.recs.filter((r) => r.conf === 'ok')).toHaveLength(4);
  });
});

describe('ゲーム定数（HANDOFF §4）', () => {
  it('確認済みの固定値', () => {
    expect(BELT_CAP).toBe(30); // 1個/2秒
    expect(SPLIT_MAX).toBe(3);
    expect(GEN_SEC).toBe(40);
  });

  it('パイプの上限は既定30だが設定で変えられる', () => {
    expect(DEFAULT_PIPE_CAP).toBe(30);
    const cfg = defaultConfig();
    expect(capOfPhase('solid', cfg)).toBe(BELT_CAP);
    expect(capOfPhase('liquid', cfg)).toBe(30);
    cfg.pipeCap = 60;
    expect(capOfPhase('gas', cfg)).toBe(60);
    expect(capOfPhase('solid', cfg)).toBe(BELT_CAP); // 固体はベルトなので影響を受けない
  });

  it('発電機は 1台あたり 1.5個/分 の燃料を要求する', () => {
    // GEN_SEC=40 秒でバッテリー1個 → 60/40 = 1.5個/分
    expect(60 / GEN_SEC).toBe(1.5);
  });

  it('協約容量の消費：工業設備は0、採取機やタンク・散布機が消費する', () => {
    const by = (id: string) => SEED_FACS.find((f) => f.id === id)!;
    expect(capCostOf(by('smelt'))).toBe(0); // 精錬炉＝工業エリア内
    expect(capCostOf(by('miner2'))).toBe(2); // 採取機
    expect(capCostOf(by('tank'))).toBe(2); // 液体貯蔵タンク
    expect(capCostOf(by('gastank'))).toBe(2); // ガス貯蔵タンク
    expect(capCostOf(by('gasdif'))).toBe(2); // ガス散布機（env）
    expect(capCostOf(by('pole'))).toBe(1); // 送電
    expect(capCostOf(undefined)).toBe(0);
    // 設備に cap があれば推定ルールより優先する
    expect(capCostOf({ ...by('miner2'), cap: 7 })).toBe(7);
    expect(capCostOf({ ...by('miner2'), cap: 0 })).toBe(0);
  });

  it('盤面サイズは 12〜240 × 12〜160 に丸められる', () => {
    expect(clampBoard(80, 56)).toEqual({ w: 80, h: 56 });
    expect(clampBoard(1, 1)).toEqual({ w: 12, h: 12 });
    expect(clampBoard(9999, 9999)).toEqual({ w: 240, h: 160 });
    expect(clampBoard(80.4, 56.6)).toEqual({ w: 80, h: 57 });
  });
});

describe('口の数の既定値（参照実装の facDefaults と同じ）', () => {
  const base: Facility = { id: 'x', name: 'x', kind: 'process', w: 2, h: 2, power: 0, gen: 0 };

  it('種別ごとの既定', () => {
    expect(defaultPortCounts(base)).toEqual({ nIn: 2, nOut: 1, inSide: 3, outSide: 1 });
    expect(defaultPortCounts({ ...base, kind: 'source' })).toMatchObject({ nIn: 0, nOut: 1 });
    expect(defaultPortCounts({ ...base, kind: 'generator' })).toMatchObject({ nIn: 1, nOut: 0 });
    expect(defaultPortCounts({ ...base, kind: 'sink' })).toMatchObject({ nIn: 4, nOut: 0 });
    expect(defaultPortCounts({ ...base, kind: 'sink', w: 1, h: 1 })).toMatchObject({ nIn: 4, nOut: 0 });
    // 分流器は 1→3、合流器は 3→1
    expect(defaultPortCounts({ ...base, kind: 'logistics', split: true })).toMatchObject({ nIn: 1, nOut: 3 });
    expect(defaultPortCounts({ ...base, kind: 'logistics' })).toMatchObject({ nIn: 3, nOut: 1 });
  });

  it('既に持っている値は上書きしない（保存ファイルの値が生きる）', () => {
    expect(defaultPortCounts({ ...base, nIn: 0, nOut: 9, inSide: 0, outSide: 2 })).toEqual({
      nIn: 0,
      nOut: 9,
      inSide: 0,
      outSide: 2,
    });
  });

  it('参照実装が保存した設備データの口の数を、そのまま再現できる', () => {
    // reference-save.json は facDefaults を通したあとの設備（＝現行アプリが書き出す形）
    const saved = fixture('reference-save.json') as Save;
    for (const f of saved.facs) {
      const fresh = SEED_FACS.find((x) => x.id === f.id)!;
      expect(defaultPortCounts(fresh), f.name).toEqual({
        nIn: f.nIn,
        nOut: f.nOut,
        inSide: f.inSide,
        outSide: f.outSide,
      });
    }
  });
});

/**
 * §6-7 保存形式の後方互換 ── 現行ファイルがそのまま読めること。
 * あわせて「まとめて入力」のべき等性（§6）と網羅状況。
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { seed } from '../src/data/seed';
import { parseRecipes, recipesToText } from '../src/domain/bulk';
import { coverage } from '../src/domain/coverage';
import { buildDataset } from '../src/domain/dataset';
import { solve } from '../src/domain/solver';
import { boardOfArea, dumpSave, loadSave, syncArea } from '../src/store/save';
import { loadReference } from './helpers/reference';

const fixture = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');

describe('現行ファイルがそのまま読める', () => {
  it('現行アプリが書き出した設計図（配置ずみ2エリア）を読める', () => {
    // reference-plan.json は参照実装の dump() をそのまま保存したもの
    const json = fixture('reference-plan.json');
    const { save, cfg, repaired, lost } = loadSave(json);

    expect(repaired).toBe(0); // 引き直しは不要
    expect(lost).toBe(0);
    expect(cfg.pipeCap).toBe(30);
    expect(save.items).toHaveLength(68);
    expect(save.facs).toHaveLength(40);
    expect(save.recs).toHaveLength(50);
    expect(save.areas).toHaveLength(15);
    expect(save.meta.name).toBe('四号谷地 プラン1');
    expect(save.meta.ver).toBe(2); // 知らないフィールドも捨てない

    const chusu = save.areas.find((a) => a.id === 'a_chusu')!;
    expect(chusu.nodes.length).toBeGreaterThan(0);
    expect(chusu.belts.length).toBeGreaterThan(0);
    const jo = save.areas.find((a) => a.id === 'w_jo')!;
    expect(jo.nodes.length).toBeGreaterThan(0);
  });

  it('読み込んだ盤面が、そのまま計算できる', () => {
    const { save, cfg } = loadSave(fixture('reference-plan.json'));
    const ds = buildDataset(save, cfg);
    const cur = save.areas.findIndex((a) => a.id === 'a_chusu');
    const board = boardOfArea(save.areas[cur]!);
    const res = solve({ ds, board, areas: save.areas, cur, basePower: save.meta.basePower });
    // 小容量谷地バッテリー30個/分の構成が入っている
    expect(res.cons).toBe(216);
    expect(res.core['batS']!.ship).toBeGreaterThan(0);
    // 配線が壊れていない
    expect(res.diag.some((d) => d.t.includes('行き先を失った'))).toBe(false);
  });

  it('読んで書き出したファイルが、参照実装の dump() と同じ内容になる', () => {
    /* 同じ内容を書き出せていれば、このアプリが書いたファイルを
       現行アプリがそのまま読めることも保証できる（往復可能）。 */
    const json = fixture('reference-plan.json');
    const { save, cfg } = loadSave(json);
    const out = dumpSave(save, cfg) + '\n';
    expect(JSON.parse(out)).toEqual(JSON.parse(json)); // 内容が一致
    expect(out).toBe(json); // キーの並びまで一致（差分が読みやすい）
  });

  it('読み書きを往復しても内容が変わらない', () => {
    const json = fixture('reference-plan.json');
    const a = loadSave(json);
    const b = loadSave(dumpSave(a.save, a.cfg));
    expect(dumpSave(b.save, b.cfg)).toBe(dumpSave(a.save, a.cfg));
  });

  it('初期状態の保存ファイルも読める', () => {
    const { save } = loadSave(fixture('reference-save.json'));
    expect(save.areas).toHaveLength(15);
    expect(save.cur).toBe(0);
  });

  it('パイプの上限が保存・復元される', () => {
    const save = seed();
    const cfg = { pipeCap: 45 };
    const back = loadSave(dumpSave(save, cfg));
    expect(back.cfg.pipeCap).toBe(45);
    expect(buildDataset(back.save, back.cfg).capOf('water')).toBe(45);
  });
});

describe('もっと古い形式にも耐える', () => {
  it('areas が無いファイル（盤面がトップレベル）を1エリアとして読む', () => {
    const s = seed();
    const legacy = JSON.stringify({
      meta: { name: '古いプラン', basePower: 180 },
      items: s.items,
      facs: s.facs,
      recs: s.recs,
      nodes: [{ uid: 'u1', fac: 'wh_out', x: 2, y: 2, rot: 0, item: 'ore_gen' }],
      belts: [],
      field: [{ fac: 'miner2', item: 'ore_gen', count: 2, rate: 15 }],
    });
    const { save } = loadSave(legacy);
    expect(save.areas).toHaveLength(1);
    expect(save.areas[0]!.region).toBe('四号谷地');
    expect(save.areas[0]!.nodes).toHaveLength(1);
    expect(save.areas[0]!.field).toHaveLength(1);
    expect(save.areas[0]!.w).toBe(80);
    expect(save.meta.basePower).toBe(180);
  });

  it('端の口を持たないラインは経路を引き直して復元する', () => {
    const s = seed();
    const area = s.areas[0]!;
    area.nodes = [
      { uid: 'u1', fac: 'wh_out', x: 2, y: 5, rot: 0, item: 'ore_gen' },
      { uid: 'u2', fac: 'smelt', x: 8, y: 5, rot: 0, rec: 'r_shell' },
    ];
    // fromPort / toPort / cells を持たない、さらに古い形のライン
    area.belts = [{ uid: 'u3', from: 'u1', to: 'u2', item: 'ore_gen' } as never];
    const { save, repaired, lost } = loadSave(JSON.stringify(s));
    expect(repaired).toBe(1);
    expect(lost).toBe(0);
    const b = save.areas[0]!.belts[0]!;
    expect(b.fromPort).toBe(0);
    expect(typeof b.toPort).toBe('number');
    expect(b.cells.length).toBeGreaterThan(0);
    expect(b.item).toBe('ore_gen');
  });

  it('壊れたファイルはきちんと失敗する', () => {
    expect(() => loadSave('{')).toThrow();
    expect(() => loadSave('{"items":[]}')).toThrow('facs がありません');
    expect(() => loadSave(JSON.stringify({ items: [], facs: [] }))).toThrow('recs がありません');
  });

  it('cur が範囲外でも落ちない', () => {
    const s = seed();
    const { save } = loadSave(JSON.stringify({ ...s, cur: 999 }));
    expect(save.cur).toBe(14);
  });
});

describe('エリアの開閉', () => {
  it('エリアを開くと uid の採番が続きから始まる', () => {
    const { save } = loadSave(fixture('reference-plan.json'));
    const area = save.areas.find((a) => a.id === 'a_chusu')!;
    const board = boardOfArea(area);
    const maxUid = Math.max(...area.nodes.concat(area.belts as never[]).map((o) => +/^u(\d+)$/.exec(o.uid)![1]!));
    expect(board.uidSeq).toBe(maxUid + 1);
  });

  it('盤面の変更がエリアへ書き戻される', () => {
    const { save } = loadSave(fixture('reference-plan.json'));
    const area = save.areas.find((a) => a.id === 'a_tsuro')!;
    const board = boardOfArea(area);
    board.nodes.push({ uid: 'u9', fac: 'wh_in', x: 3, y: 3, rot: 0 });
    board.w = 100;
    syncArea(area, board);
    expect(area.nodes).toHaveLength(1);
    expect(area.w).toBe(100);
  });
});

describe('「まとめて入力」の書式（§6 — 維持すること）', () => {
  it('書き出しの書式が仕様どおり', () => {
    const s = seed();
    const text = recipesToText(s);
    expect(text.split('\n')).toHaveLength(50);
    expect(text).toContain('包装機 10s: 鉱物粉末*2 -> 小容量谷地バッテリー*1  #推定');
    expect(text).toContain('採種機 6s: サンドリーフ*1 -> サンドリーフの種*2  #確');
    // 発電レシピは産物なし
    expect(text).toContain('発電機 40s: 小容量谷地バッテリー*1 -> (なし)  #確');
  });

  it('往復してもレシピ数が変わらない（べき等性）', () => {
    const s = seed();
    const before = recipesToText(s);
    const log1 = parseRecipes(s, before);
    expect(log1.added).toBe(0); // 全部が既存レシピの更新になる
    expect(log1.updated).toBe(50);
    expect(log1.newItems).toEqual([]);
    expect(log1.errors).toEqual([]);
    expect(s.recs).toHaveLength(50);
    expect(s.items).toHaveLength(68);

    // 2周目も同じ
    const after = recipesToText(s);
    expect(after).toBe(before);
    const log2 = parseRecipes(s, after);
    expect(log2.added).toBe(0);
    expect(s.recs).toHaveLength(50);
    expect(recipesToText(s)).toBe(before);
  });

  it('参照実装の書き出しと1文字も違わない', () => {
    const ref = loadReference();
    expect(recipesToText(seed())).toBe(ref.recipesToText(seed()));
  });

  it('読み込みの結果も参照実装と一致する', () => {
    const ref = loadReference();
    const text = [
      '精錬炉 5s: 未知の鉱石*3 -> 未知の合金*1 #一部',
      '包装機 8s: 鉱物粉末*3 -> 小容量谷地バッテリー*1 #確',
      'これは書式ではない',
      '電動採鉱機Ⅱ 4s: 水*1 -> 源石鉱物*1',
      '化学反応炉 6s：水×2 → 汚水*1 + 沈殿酸*1 ＃推定',
    ].join('\n');

    const mine = seed();
    const mineLog = parseRecipes(mine, text);
    const want = ref.parseRecipes(seed(), text);

    expect(mineLog.added).toBe(want.log.added);
    expect(mineLog.updated).toBe(want.log.updated);
    expect(mineLog.newItems).toEqual(want.log.newItems);
    expect(mineLog.errors).toEqual(want.log.errors);
    expect(mine.recs).toHaveLength(want.recs.length);
    expect(mine.items).toHaveLength(want.items.length);
    // 追加・更新されたレシピの中身も一致（id と name は生成規則が時刻依存なので除く）
    const shape = (rs: unknown[]): string[] =>
      (rs as { fac: string; sec: number; conf: string; in: { qty: number }[]; out: { qty: number }[] }[]).map(
        (r) => `${r.fac} ${r.sec} ${r.conf} ${r.in.map((x) => x.qty).join(',')} -> ${r.out.map((x) => x.qty).join(',')}`,
      );
    expect(shape(mine.recs)).toEqual(shape(want.recs));
  });

  it('知らない品目名は自動で品目を作る', () => {
    const s = seed();
    const n0 = s.items.length;
    const log = parseRecipes(s, '精錬炉 5s: 未知の鉱石*3 -> 未知の合金*1 #一部');
    expect(log.added).toBe(1);
    expect(log.newItems).toEqual(['未知の鉱石', '未知の合金']);
    expect(s.items).toHaveLength(n0 + 2);
    const rec = s.recs.at(-1)!;
    expect(rec.conf).toBe('part');
    expect(rec.sec).toBe(5);
    expect(rec.name).toBe('精錬：未知の合金');
    expect(s.items.find((i) => i.id === rec.out[0]!.item)!.name).toBe('未知の合金');
  });

  it('同じ設備・同じ産物のレシピは上書きする', () => {
    const s = seed();
    const n0 = s.recs.length;
    parseRecipes(s, '包装機 8s: 鉱物粉末*3 -> 小容量谷地バッテリー*1 #確');
    expect(s.recs).toHaveLength(n0);
    const r = s.recs.find((x) => x.id === 'r_batS')!;
    expect(r.sec).toBe(8);
    expect(r.in[0]!.qty).toBe(3);
    expect(r.conf).toBe('ok');
  });

  it('読めない行・採取設備の行はエラーとして報告する', () => {
    const s = seed();
    const log = parseRecipes(s, ['これは書式ではない', '無い設備 4s: 水*1 -> 汚水*1', '電動採鉱機Ⅱ 4s: 水*1 -> 源石鉱物*1', '# コメント行', ''].join('\n'));
    expect(log.errors).toHaveLength(3);
    expect(log.errors[0]).toContain('書式が読めません');
    expect(log.errors[1]).toContain('見つかりません');
    expect(log.errors[2]).toContain('採取ゾーンの設備');
    expect(log.added).toBe(0);
  });

  it('全角の記号や → でも読める', () => {
    const s = seed();
    const log = parseRecipes(s, '精錬炉 5s：青鉄鉱物×2 → 精錬材*1 ＃確');
    expect(log.errors).toEqual([]);
    expect(s.recs.find((r) => r.id === 'r_ingot')!.sec).toBe(5);
  });
});

describe('網羅状況', () => {
  it('初期データの確度の内訳', () => {
    const s = seed();
    const cov = coverage(buildDataset(s), s.areas[0]!.field);
    expect(cov.byConf.ok).toBe(4); // 確認済は4件だけ（HANDOFF §4）
    expect(cov.byConf.ok + cov.byConf.part + cov.byConf.guess).toBe(50);
  });

  it('作れず採取もされない品目を行き止まりとして挙げる', () => {
    const s = seed();
    const cov = coverage(buildDataset(s), s.areas[0]!.field);
    const names = cov.deadEnd.map((i) => i.name);
    // 灰麦などの未使用の植物は、作り方も採取登録も無い
    expect(names).toContain('灰麦');
    // 中枢エリアで採れる源石鉱物は行き止まりではない
    expect(names).not.toContain('源石鉱物');
  });

  it('作れる品目は到達可能として広がる', () => {
    const s = seed();
    const cov = coverage(buildDataset(s), s.areas[0]!.field);
    // 源石鉱物（採取）→ 結晶外殻
    expect(cov.reach.has('ore_gen')).toBe(true);
    expect(cov.reach.has('shell')).toBe(true);
    // 青鉄 → 精錬材 → 鉄製部品 → 中容量バッテリー
    expect(cov.reach.has('part_fe')).toBe(true);
    expect(cov.reach.has('batM')).toBe(true);
  });

  it('最終製品は「使われない品目」に挙がる', () => {
    const s = seed();
    const cov = coverage(buildDataset(s), s.areas[0]!.field);
    expect(cov.unused.map((i) => i.name)).toContain('大容量谷地バッテリー');
  });
});

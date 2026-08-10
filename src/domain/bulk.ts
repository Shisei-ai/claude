/**
 * 「まとめて入力」の書式（HANDOFF §6 —— 維持すること）
 *
 *   設備名 秒数s: 材料*数 + 材料*数 -> 産物*数   #確 / #一部 / #推定
 *   包装機 10s: 鉱物粉末*2 -> 小容量谷地バッテリー*1 #確
 *
 * - 知らない品目名は自動で品目を作る。
 * - 現在の内容を同じ書式で書き出せる。
 * - **往復してもレシピ数が変わらないこと**（べき等性）はテストで担保する。
 */

import type { Conf, Item, Recipe, RecipeIO, Save } from './types';

const TAG: Record<Conf, string> = { ok: '#確', part: '#一部', guess: '#推定' };

/** 現在のレシピを書式どおりに書き出す */
export function recipesToText(data: Pick<Save, 'facs' | 'items' | 'recs'>): string {
  const facName = new Map(data.facs.map((f) => [f.id, f.name]));
  const itemName = new Map(data.items.map((i) => [i.id, i.name]));
  const side = (a: RecipeIO[]): string =>
    a.length ? a.map((x) => (itemName.get(x.item) ?? '?') + '*' + x.qty).join(' + ') : '(なし)';
  return data.recs
    .map((r) => `${facName.get(r.fac) ?? '?'} ${r.sec}s: ${side(r.in)} -> ${side(r.out)}  ${TAG[r.conf || 'guess']}`)
    .join('\n');
}

export interface ParseLog {
  added: number;
  updated: number;
  newItems: string[];
  errors: string[];
}

/**
 * 書式を読んでレシピを追加・更新する。data は破壊的に更新される。
 * 同じ設備で同じ産物（産物が無いものは同じ材料）のレシピがあれば置き換える。
 */
export function parseRecipes(data: Pick<Save, 'facs' | 'items' | 'recs'>, text: string): ParseLog {
  const lines = String(text ?? '').split(/\r?\n/);
  const log: ParseLog = { added: 0, updated: 0, newItems: [], errors: [] };
  const facByName = new Map(data.facs.map((f) => [f.name, f]));
  const itemByName = new Map(data.items.map((i) => [i.name, i]));

  const ensureItem = (nm: string): Item => {
    const hit = itemByName.get(nm);
    if (hit) return hit;
    const it: Item = {
      id: 'it' + Date.now().toString(36).slice(-4) + Math.floor(Math.random() * 900 + 100),
      name: nm,
      cat: '未分類',
      color: '#8FA6B2',
      phase: 'solid',
      conf: 'guess',
    };
    data.items.push(it);
    itemByName.set(nm, it);
    log.newItems.push(nm);
    return it;
  };

  const parseSide = (str: string): { name: string; qty: number }[] => {
    str = str.trim();
    if (!str || /^\(?なし\)?$/.test(str) || str === '-') return [];
    return str
      .split('+')
      .map((tok) => {
        const m = /^\s*(.+?)\s*(?:[*x×]\s*([\d.]+))?\s*$/.exec(tok);
        if (!m) return null;
        return { name: m[1]!.trim(), qty: m[2] ? +m[2] : 1 };
      })
      .filter((x): x is { name: string; qty: number } => !!x);
  };

  lines.forEach((raw, ln) => {
    let line = raw.trim();
    if (!line || line[0] === '#' || line[0] === '＃') return;

    let conf: Conf = 'guess';
    const tm = /[#＃]\s*(確|一部|推定)\s*$/.exec(line);
    if (tm) {
      conf = tm[1] === '確' ? 'ok' : tm[1] === '一部' ? 'part' : 'guess';
      line = line.slice(0, tm.index).trim();
    }

    const m = /^(.+?)\s+([\d.]+)\s*s\s*[:：]\s*(.*?)\s*(?:->|→|=>)\s*(.*)$/.exec(line);
    if (!m) {
      log.errors.push(`${ln + 1}行目：書式が読めません → ${raw.slice(0, 40)}`);
      return;
    }
    const facName = m[1]!.trim();
    const sec = Math.max(0.5, +m[2]! || 1);
    const fac = facByName.get(facName);
    if (!fac) {
      log.errors.push(`${ln + 1}行目：設備「${facName}」が見つかりません`);
      return;
    }
    if (fac.field) {
      log.errors.push(
        `${ln + 1}行目：「${facName}」は採取ゾーンの設備です（レシピではなく採取ゾーンに登録してください）`,
      );
      return;
    }
    const ins: RecipeIO[] = parseSide(m[3]!).map((x) => ({ item: ensureItem(x.name).id, qty: x.qty }));
    const outs: RecipeIO[] = parseSide(m[4]!).map((x) => ({ item: ensureItem(x.name).id, qty: x.qty }));
    if (!outs.length && fac.kind !== 'generator') {
      log.errors.push(`${ln + 1}行目：産物がありません`);
      return;
    }

    // 同じ設備で同じ産物のレシピがあれば置き換える（産物が無いものは材料で見る）
    const sig = (o: RecipeIO[], i2: RecipeIO[]): string =>
      o.length ? 'O:' + o.map((x) => x.item).sort().join(',') : 'I:' + i2.map((x) => x.item).sort().join(',');
    const key = sig(outs, ins);
    const hit = data.recs.find((r) => r.fac === fac.id && sig(r.out, r.in) === key);
    const nameOf = (id: string): string => data.items.find((i) => i.id === id)?.name ?? '?';
    const name = outs[0] ? fac.name.replace(/機$|炉$/, '') + '：' + nameOf(outs[0].item) : fac.name;

    if (hit) {
      hit.sec = sec;
      hit.in = ins;
      hit.out = outs;
      hit.conf = conf;
      hit.name = name;
      log.updated++;
    } else {
      const rec: Recipe = {
        id: 'rec' + Date.now().toString(36).slice(-4) + Math.floor(Math.random() * 900 + 100),
        name,
        conf,
        fac: fac.id,
        sec,
        in: ins,
        out: outs,
      };
      data.recs.push(rec);
      log.added++;
    }
  });

  return log;
}

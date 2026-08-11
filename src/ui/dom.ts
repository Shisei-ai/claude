/** 画面まわりの小さな道具。ここだけが DOM を直接触る前提の共有部分 */

import type { Dataset } from '../domain/dataset';

export const esc = (s: unknown): string =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** HTML 文字列から要素を1つ作る */
export function h<T extends HTMLElement = HTMLElement>(html: string): T {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild as T;
}

export const byId = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

export const qs = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string): T | null =>
  root.querySelector(sel);

export const qsa = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string): T[] =>
  Array.from(root.querySelectorAll(sel));

/**
 * 品目のプルダウン。品目が68件あるので分類ごとにまとめる。
 * 色の点は option に置けないので、選択後に呼び出し側が示す。
 */
export function itemOptions(ds: Dataset, selected?: string | null, blank?: string): string {
  const cats: string[] = [];
  for (const i of ds.items.values()) {
    const c = i.cat || 'その他';
    if (!cats.includes(c)) cats.push(c);
  }
  const items = [...ds.items.values()];
  return (
    (blank ? `<option value="">${esc(blank)}</option>` : '') +
    cats
      .map(
        (c) =>
          `<optgroup label="${esc(c)}">` +
          items
            .filter((i) => (i.cat || 'その他') === c)
            .map((i) => `<option value="${esc(i.id)}" ${selected === i.id ? 'selected' : ''}>${esc(i.name)}</option>`)
            .join('') +
          `</optgroup>`,
      )
      .join('')
  );
}

/** 品目名を色の点つきで */
export const itemChip = (ds: Dataset, id: string): string =>
  `<span class="dot" style="background:${esc(ds.itemColor(id))}"></span>${esc(ds.itemName(id))}`;

/** 確度の見た目。推定に依存していることを前面に出すため、どこでも同じ形で使う */
export const CONF_VIEW = {
  ok: { label: '確認済', cls: 'conf-ok' },
  part: { label: '一部確認', cls: 'conf-part' },
  guess: { label: '推定', cls: 'conf-guess' },
} as const;

export const confBadge = (conf: 'ok' | 'part' | 'guess' | undefined): string => {
  const c = CONF_VIEW[conf ?? 'guess'];
  return `<span class="pill ${c.cls}">${c.label}</span>`;
};

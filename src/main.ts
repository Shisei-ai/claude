/**
 * エントリポイント。
 *
 * UI の組み直しは HANDOFF §6-6 —— §7 の回帰ケースが通るまで着手しない。
 * それまでは、seed データが読めていることだけを確認する足場として置いておく。
 */

import { seed } from './data/seed';

const d = seed();
const app = document.getElementById('app');
if (app) {
  app.textContent =
    `移植中（HANDOFF §6-1 まで完了）: ` +
    `品目 ${d.items.length} / 設備 ${d.facs.length} / レシピ ${d.recs.length} / エリア ${d.areas.length}`;
}

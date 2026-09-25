// データの整合性チェック:  node tests/validate.js
// ・参照しているアイテム/設備/レシピ/魔法/フィールドが全て存在するか
// ・書物をレベル順に読み進めたとき、【賢者の石】まで素材が手に入る道筋があるか
const D = require('../js/data.js');
const errors = [];
const check = (cond, msg) => { if (!cond) errors.push(msg); };

for (const [id, r] of Object.entries(D.RECIPES)) {
  check(D.MACHINES[r.m], `${id}: 設備 ${r.m} が存在しない`);
  for (const k of [...Object.keys(r.in), ...Object.keys(r.out)]) check(D.ITEMS[k], `${id}: アイテム ${k} が存在しない`);
}
for (const m of Object.values(D.MACHINES)) for (const k of Object.keys(m.cost)) check(D.ITEMS[k], `設備コスト: ${k} が存在しない`);
for (const b of D.BOOKS) {
  const u = b.unlock;
  (u.recipes || []).forEach(r => check(D.RECIPES[r], `${b.id}: レシピ ${r} が存在しない`));
  (u.machines || []).forEach(m => check(D.MACHINES[m], `${b.id}: 設備 ${m} が存在しない`));
  (u.spells || []).forEach(s => check(D.SPELLS[s], `${b.id}: 魔法 ${s} が存在しない`));
  (u.fields || []).forEach(f => check(D.FIELDS[f], `${b.id}: フィールド ${f} が存在しない`));
}
for (const [id, f] of Object.entries(D.FIELDS)) {
  f.nodes.forEach(n => check(D.ITEMS[n[0]], `${id}: 採取物 ${n[0]} が存在しない`));
  f.enemies.forEach(e => check(D.ENEMIES[e[0]], `${id}: 敵 ${e[0]} が存在しない`));
}
for (const [id, e] of Object.entries(D.ENEMIES)) e.drops.forEach(d => check(D.ITEMS[d[0]], `${id}: ドロップ ${d[0]} が存在しない`));
for (const id of Object.keys(D.SPELLS)) check(D.BOOKS.some(b => (b.unlock.spells || []).includes(id)), `魔法 ${id} を覚える書物がない`);
for (const id of Object.keys(D.RECIPES)) check(D.BOOKS.some(b => (b.unlock.recipes || []).includes(id)), `レシピ ${id} を解放する書物がない`);

// ---- 進行シミュレーション ----
// 入手可能なアイテムの集合を、解放状況が変わらなくなるまで広げていく
const obtainable = new Set();
const machines = new Set(), recipes = new Set(), fields = new Set();
let changed = true, guard = 0;
while (changed && guard++ < 100) {
  changed = false;
  const add = x => { if (!obtainable.has(x)) { obtainable.add(x); changed = true; } };
  for (const b of D.BOOKS) {
    (b.unlock.machines || []).forEach(m => { if (!machines.has(m)) { machines.add(m); changed = true; } });
    (b.unlock.recipes || []).forEach(r => { if (!recipes.has(r)) { recipes.add(r); changed = true; } });
    (b.unlock.fields || []).forEach(f => { if (!fields.has(f)) { fields.add(f); changed = true; } });
  }
  for (const id of fields) {
    const f = D.FIELDS[id];
    if (f.need && !obtainable.has(f.need)) continue;
    f.nodes.forEach(n => add(n[0]));
    f.enemies.forEach(([e]) => D.ENEMIES[e].drops.forEach(d => add(d[0])));
    if (f.boss) D.ENEMIES[f.boss].drops.forEach(d => add(d[0]));
  }
  for (const id of recipes) {
    const r = D.RECIPES[id];
    const m = D.MACHINES[r.m];
    const built = r.m === 'pot' || Object.keys(m.cost).every(k => obtainable.has(k));
    if (built && machines.has(r.m) && Object.keys(r.in).every(k => obtainable.has(k))) Object.keys(r.out).forEach(add);
  }
}
check(obtainable.has('philosopher_stone'), '賢者の石に到達できない');
const unreachable = Object.keys(D.ITEMS).filter(k => !obtainable.has(k));
check(unreachable.length === 0, `入手できないアイテム: ${unreachable.join(', ')}`);

if (errors.length) { console.error('NG\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`OK: アイテム${Object.keys(D.ITEMS).length} / レシピ${Object.keys(D.RECIPES).length} / 書物${D.BOOKS.length} — 賢者の石まで到達可能`);

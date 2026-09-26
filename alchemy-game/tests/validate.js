// データの整合性チェック:  node tests/validate.js
// ・参照しているアイテム/設備/レシピ/魔法/フィールドが全て存在するか
// ・書物をレベル順に読み進めたとき、【賢者の石】まで素材が手に入る道筋があるか
// data.js と data_post.js を同じ環境で順に実行し、定義データを取り出す
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = ['data.js', 'data_post.js', 'data_equip.js', 'data_homunculus.js'].map(f => fs.readFileSync(path.join(__dirname, '../js', f), 'utf8')).join('\n');
const D = vm.runInNewContext(src + '\n;({ ITEMS, MACHINES, RECIPES, SPELLS, BOOKS, ENEMIES, FIELDS, EQUIPS, BOSS_ARENAS, TRANSMUTES, EQUIP_LINES, GRADE_LABEL, HOMUNCULI, HOMU_RARITIES, HOMU_SKILLS, HOMU_STAT_MAX })', {});
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
  (u.spells || []).forEach(s => { const [id, g = 1] = s.split(':'); check(D.SPELLS[id] && +g >= 1 && +g <= D.SPELLS[id].grades.length, `${b.id}: 魔法 ${s} が存在しない`); });
  (u.fields || []).forEach(f => check(D.FIELDS[f], `${b.id}: フィールド ${f} が存在しない`));
}
for (const [id, f] of Object.entries(D.FIELDS)) {
  f.nodes.forEach(n => check(D.ITEMS[n[0]], `${id}: 採取物 ${n[0]} が存在しない`));
  f.enemies.forEach(e => check(D.ENEMIES[e[0]], `${id}: 敵 ${e[0]} が存在しない`));
}
for (const [id, e] of Object.entries(D.ENEMIES)) {
  e.drops.forEach(d => check(D.ITEMS[d[0]], `${id}: ドロップ ${d[0]} が存在しない`));
  if (e.pattern && e.pattern.summon) check(D.ENEMIES[e.pattern.summon], `${id}: 召喚する敵 ${e.pattern.summon} が存在しない`);
}
for (const [f, type] of Object.entries(D.BOSS_ARENAS)) check(D.FIELDS[f] && D.ENEMIES[type] && D.ENEMIES[type].boss, `強化ボス ${f}: 定義が不正`);
for (const [id, e] of Object.entries(D.EQUIPS)) {
  check(D.ITEMS[id] && D.ITEMS[id].cat === 'equip', `装備 ${id}: アイテムとして登録されていない`);
  check(Object.values(D.RECIPES).some(r => r.out[id]), `装備 ${id}: 作るレシピがない`);
}
for (const [line, L] of Object.entries(D.EQUIP_LINES)) {
  L.tiers.forEach((t, i) => {
    const book = D.BOOKS.find(b => b.id === t.book);
    check(book, `装備 ${line}${i + 1}: 書物 ${t.book} が存在しない`);
    if (i > 0) {
      const prev = D.BOOKS.find(b => b.id === L.tiers[i - 1].book);
      check(!book || !prev || (book.lv >= prev.lv && (!prev.after || book.after)), `装備 ${line}${i + 1}: 下の段階より早く解放される`);
    }
  });
}
for (const [id, sp] of Object.entries(D.SPELLS)) {
  check(sp.grades && sp.grades.length >= 1 && sp.grades.length <= D.GRADE_LABEL.length, `魔法 ${id}: グレード数が不正(表記は${D.GRADE_LABEL.length}段階まで)`);
  (sp.grades || []).forEach((g, i) => check(g.name && g.mp != null && g.cd != null, `魔法 ${id}: グレード${i + 1} に name/mp/cd がない`));
  // 各グレードを記した書物がちょうど1冊あり、上位ほど必要M.Lvが高いこと
  const lvs = sp.grades.map((_, gi) => gi + 1).map(g => {
    const books = D.BOOKS.filter(b => (b.unlock.spells || []).some(v => { const [i, gg = 1] = v.split(':'); return i === id && +gg === g; }));
    check(books.length === 1, `魔法 ${id}: グレード${g} を記した書物が ${books.length} 冊`);
    return books[0] ? books[0].lv : 0;
  });
  for (let i = 1; i < lvs.length; i++) check(lvs[i] >= lvs[i - 1], `魔法 ${id}: グレード${i + 1} の書物が下位より低レベルで読める`);
}
for (const type of Object.keys(D.HOMUNCULI)) {
  for (const R of D.HOMU_RARITIES) {
    const id = `${type}_${R.id}`;
    check(D.ITEMS[id] && D.ITEMS[id].cat === 'homu', `ホムンクルス ${id}: アイテムとして登録されていない`);
    check(D.RECIPES[`r_${id}`] && D.RECIPES[`r_${id}`].m === 'incubator', `ホムンクルス ${id}: 培養の瓶のレシピがない`);
    check(R.iv[0] >= 1 && R.iv[1] <= D.HOMU_STAT_MAX && R.iv[0] <= R.iv[1], `レアリティ ${R.id}: 個体値の範囲が不正`);
    for (const rank of R.skills) check(Object.values(D.HOMU_SKILLS).some(sk => sk.rank === rank && (!sk.type || sk.type === type)), `ホムンクルス ${id}: ${rank} のスキル候補がない`);
  }
}
const ids = new Set();
for (const b of D.BOOKS) { check(!ids.has(b.id), `書物ID ${b.id} が重複`); ids.add(b.id); }
for (const id of Object.keys(D.RECIPES)) check(D.BOOKS.some(b => (b.unlock.recipes || []).includes(id)), `レシピ ${id} を解放する書物がない`);

// ---- 進行シミュレーション ----
// 入手可能なアイテムの集合を、解放状況が変わらなくなるまで広げていく
// books: 読める書物の一覧(本編のみ / クリア後を含む全て)
function reachable(books) {
  const obtainable = new Set();
  const machines = new Set(), recipes = new Set(), fields = new Set();
  let changed = true, guard = 0;
  while (changed && guard++ < 100) {
    changed = false;
    const add = x => { if (!obtainable.has(x)) { obtainable.add(x); changed = true; } };
    for (const b of books) {
      if ((b.unlock.features || []).includes('bosses')) {
        for (const type of Object.values(D.BOSS_ARENAS)) D.ENEMIES[type].drops.forEach(d => add(d[0]));
      }
      (b.unlock.machines || []).forEach(m => { if (!machines.has(m)) { machines.add(m); changed = true; } });
      (b.unlock.recipes || []).forEach(r => { if (!recipes.has(r)) { recipes.add(r); changed = true; } });
      (b.unlock.fields || []).forEach(f => { if (!fields.has(f)) { fields.add(f); changed = true; } });
    }
    for (const id of fields) {
      const f = D.FIELDS[id];
      if (f.need && !obtainable.has(f.need)) continue;
      f.nodes.forEach(n => add(n[0]));
      f.enemies.forEach(([e]) => D.ENEMIES[e].drops.forEach(d => add(d[0])));
      (f.extraDrops || []).forEach(d => add(d[0]));
      if (f.boss) D.ENEMIES[f.boss].drops.forEach(d => add(d[0]));
    }
    for (const id of recipes) {
      const r = D.RECIPES[id];
      const m = D.MACHINES[r.m];
      const built = r.m === 'pot' || Object.keys(m.cost).every(k => obtainable.has(k));
      if (built && machines.has(r.m) && Object.keys(r.in).every(k => obtainable.has(k))) Object.keys(r.out).forEach(add);
    }
  }
  return obtainable;
}

// 本編の書物だけで: 賢者の石と、本編の段階の装備、全てのホムンクルスが作れること
const story = reachable(D.BOOKS.filter(b => !b.after));
check(story.has('philosopher_stone'), '賢者の石に到達できない');
for (const [line, L] of Object.entries(D.EQUIP_LINES)) {
  L.tiers.forEach((t, i) => {
    const book = D.BOOKS.find(b => b.id === t.book);
    if (book && !book.after) check(story.has(`${line}${i + 1}`), `本編の装備 ${line}${i + 1} が本編の素材だけでは作れない`);
  });
}
// 【極】以外のレアリティは本編中に作れること
for (const type of Object.keys(D.HOMUNCULI)) for (const R of D.HOMU_RARITIES) {
  const book = R.book && D.BOOKS.find(b => b.id === R.book);
  if (!book || !book.after) check(story.has(`${type}_${R.id}`), `ホムンクルス ${type}_${R.id} が本編の素材だけでは作れない`);
}
// クリア後も含めて: 全てのアイテムに入手手段があること
const all = reachable(D.BOOKS);
const unreachable = Object.keys(D.ITEMS).filter(k => !all.has(k));
check(unreachable.length === 0, `入手できないアイテム: ${unreachable.join(', ')}`);

if (errors.length) { console.error('NG\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`OK: アイテム${Object.keys(D.ITEMS).length} / レシピ${Object.keys(D.RECIPES).length} / 書物${D.BOOKS.length} — 賢者の石まで到達可能・本編装備は本編内で作成可能`);

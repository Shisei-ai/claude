// =============================================================
//  state.js — プレイヤーの進行状況(セーブデータ)と、
//             レベル・技能・生産処理などの「ルール」
// =============================================================

const SAVE_KEY = 'alchemist_of_the_deep_forest_v1';
const MAX_LV = 30;               // レベル上限(シナリオ進行はLv15前後まで。以降はクリア後の育成用)
const MACHINE_BASE_MAX = 2;       // 設備の基本建造上限(1種類あたり)
const OFFLINE_MAX_SEC = 4 * 3600; // 放置生産の上限(4時間)

let S = null; // 現在のゲーム状態(State)

function newState() {
  return {
    version: 1,
    savedAt: Date.now(),
    inv: { herb: 4, wood: 6, stone: 4 },
    mlv: 1, mxp: 0,   // 魔術レベル(戦闘で上がる)
    alv: 1, axp: 0,   // 錬金レベル(生産で上がる)
    sp: 0,            // スキルポイント
    books: {},        // 読んだ書物 { id: true }
    skills: {},       // 習得した技能 { id: ランク }
    machines: [newMachine('pot')],     // 工房にある設備(最初から壺が1つある)
    slots: [null, null, null, null, null, null], // 数字キー1〜6の魔法 ('fire:2' = 火球のグレードII)
    flags: { prologue: false, bossDefeated: false, ended: false },
    equip: { staff: null, robe: null, catalyst: null },  // 装備中のアイテムID
    post: { abyssBest: 0, bossRank: {}, bossBestTime: {} }, // やり込みの記録
    stats: { made: {}, visited: {}, kills: 0, playSec: 0 },
    log: [],
  };
}

function newMachine(type) {
  return { type, recipe: null, prog: 0, busy: false, on: true, limit: 0 };
}

// ---- セーブ / ロード ----------------------------------------
function saveGame() {
  S.savedAt = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 保存できない環境では無視 */ }
}

function loadGame() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* noop */ }
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    // 古いセーブに無い項目は新規データで補う
    S = Object.assign(newState(), data);
    S.flags = Object.assign(newState().flags, data.flags);
    S.stats = Object.assign(newState().stats, data.stats);
    S.equip = Object.assign(newState().equip, data.equip);
    S.post = Object.assign(newState().post, data.post);
    // 旧バージョンの装備IDを読み替え(触媒が段階制になったため)
    for (const [from, to] of Object.entries(EQUIP_RENAMES)) {
      if (S.inv[from]) { addItem(to, S.inv[from]); delete S.inv[from]; }
      if (S.equip.catalyst === from) S.equip.catalyst = to;
    }
    // 旧形式の魔法スロット('fire')を新形式('fire:1')へ変換
    S.slots = S.slots.map(v => (v && !v.includes(':') ? v + ':1' : v));
    if (S.skills.exp_keep) { S.sp += S.skills.exp_keep * 2; delete S.skills.exp_keep; } // 廃止した技能はSPを返却
    return true;
  } catch (e) {
    return false;
  }
}

function resetGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ }
  S = newState();
}

// ---- 便利関数 -----------------------------------------------
const has = (id, n = 1) => (S.inv[id] || 0) >= n;
const count = id => Math.floor(S.inv[id] || 0);
function addItem(id, n) {
  S.inv[id] = (S.inv[id] || 0) + n;
  if (S.inv[id] <= 0) delete S.inv[id];
}
const skill = id => S.skills[id] || 0;

function log(msg, type = '') {
  S.log.unshift({ t: Date.now(), msg, type });
  if (S.log.length > 80) S.log.length = 80;
  if (typeof UI !== 'undefined') UI.toast(msg, type);
}

// ---- 解放状況(読んだ書物から計算する) -----------------------
function unlocked(kind) {
  const set = new Set();
  for (const b of BOOKS) {
    if (S.books[b.id] && b.unlock[kind]) b.unlock[kind].forEach(x => set.add(x));
  }
  return set;
}

// ---- レベル --------------------------------------------------
// 次のレベルまでに必要な経験値
// 目安: シナリオクリア(M.Lv/A.Lv 15前後)まで約10時間を想定した暫定値
const xpNeed = lv => Math.round(25 * Math.pow(lv, 1.6));

function gainMXP(n) {
  if (S.mlv >= MAX_LV) return;
  S.mxp += n;
  while (S.mlv < MAX_LV && S.mxp >= xpNeed(S.mlv)) {
    S.mxp -= xpNeed(S.mlv);
    S.mlv++;
    log(`M.Lv が ${S.mlv} に上がった！`, 'lv');
    if (typeof Field !== 'undefined' && Field.active) Field.onLevelUp();
  }
  if (S.mlv >= MAX_LV) S.mxp = 0;
}

function gainAXP(n) {
  if (S.alv >= MAX_LV) return;
  S.axp += n * (1 + 0.25 * skill('ind_xp'));
  while (S.alv < MAX_LV && S.axp >= xpNeed(S.alv)) {
    S.axp -= xpNeed(S.alv);
    S.alv++;
    log(`A.Lv が ${S.alv} に上がった！`, 'lv');
  }
  if (S.alv >= MAX_LV) S.axp = 0;
}

// ---- 書物 ----------------------------------------------------
// 書庫に現れているか(クリア後の書物は、物語を終えるまで現れない)
function bookVisible(b) {
  return !b.after || S.flags[b.after];
}
function canRead(b) {
  return bookVisible(b) && !S.books[b.id] && (b.kind === 'magic' ? S.mlv : S.alv) >= b.lv;
}

function readBook(b) {
  if (!canRead(b)) return false;
  S.books[b.id] = true;
  S.sp += b.sp;
  // 新しく覚えた魔法は空いているスロットに自動で割り当てる
  // 覚えた魔法をスロットへ: 同じ魔法の下位グレードが入っていれば昇格、無ければ空きスロットへ
  for (const v of b.unlock.spells || []) {
    const { id, g } = parseSlot(v);
    const j = S.slots.findIndex(x => x && parseSlot(x).id === id);
    if (j >= 0) { if (parseSlot(S.slots[j]).g < g) S.slots[j] = `${id}:${g}`; }
    else { const i = S.slots.indexOf(null); if (i >= 0) S.slots[i] = `${id}:${g}`; }
  }
  log(`『${b.name}』を読んだ（SP +${b.sp}）`, 'book');
  return true;
}

// ---- 技能 ----------------------------------------------------
function skillReqMet(id) {
  const req = SKILLS[id].req || {};
  return Object.entries(req).every(([k, v]) => skill(k) >= v);
}
function canLearn(id) {
  const sk = SKILLS[id];
  return skill(id) < sk.max && S.sp >= sk.cost && skillReqMet(id);
}
function learnSkill(id) {
  if (!canLearn(id)) return false;
  S.sp -= SKILLS[id].cost;
  S.skills[id] = skill(id) + 1;
  log(`技能【${SKILLS[id].name}】がランク${S.skills[id]}になった`, 'skill');
  return true;
}

// ---- 魔法のグレード --------------------------------------------
// スロットの値 'fire:2' を { id: 'fire', g: 2 } に分解する
function parseSlot(v) {
  if (!v) return null;
  const [id, g] = v.split(':');
  return { id, g: +g || 1 };
}
// その魔法で習得済みの最高グレード(未習得なら0)。対応する書物を読んだかどうかで決まる
function spellMaxGrade(id) {
  let g = 0;
  for (const v of unlocked('spells')) {
    const p = parseSlot(v);
    if (p.id === id) g = Math.max(g, p.g);
  }
  return g;
}
// 習得済みの魔法IDの一覧
function learnedSpells() {
  return Object.keys(SPELLS).filter(id => spellMaxGrade(id) > 0);
}
// その魔法のグレード g を記した書物
function gradeBook(id, g) {
  return BOOKS.find(b => (b.unlock.spells || []).some(v => { const p = parseSlot(v); return p.id === id && p.g === g; }));
}
// グレード g の性能(基本値 + グレードごとの上書き)
function spellAt(id, g) {
  return Object.assign({ id, g }, SPELLS[id], SPELLS[id].grades[g - 1]);
}

// ---- 設備 ----------------------------------------------------
function machineMax() { return MACHINE_BASE_MAX + skill('ind_slots'); }
function machineCost(type) {
  const n = countMachines(S, type);
  const mult = Math.pow(1.6, Math.max(0, n - (type === 'pot' ? 1 : 0)));
  const cost = {};
  for (const [k, v] of Object.entries(MACHINES[type].cost)) cost[k] = Math.ceil(v * mult);
  return cost;
}
function canAfford(cost) { return Object.entries(cost).every(([k, v]) => has(k, v)); }
function buildMachine(type) {
  const cost = machineCost(type);
  if (countMachines(S, type) >= machineMax() || !canAfford(cost)) return false;
  for (const [k, v] of Object.entries(cost)) addItem(k, -v);
  S.machines.push(newMachine(type));
  log(`【${MACHINES[type].name}】を建造した`, 'build');
  return true;
}

// ---- 生産処理(毎フレーム呼ばれる) ---------------------------
// 仕組み:
//   1. 設備が「待機中」なら、倉庫から材料を取り出して作業開始(busy=true)
//   2. 作業中は時間を進め、所要時間に達したら生産物を倉庫へ
//   3. 「在庫上限」を設定していれば、その数に達した時点で作業を始めない
function productionSpeed() { return 1 + 0.15 * skill('ind_speed'); }

function machineStatus(m) {
  if (!m.recipe) return 'idle';
  if (m.busy) return 'work';
  if (!m.on) return 'off';
  const r = RECIPES[m.recipe];
  const mainOut = Object.keys(r.out)[0];
  if (m.limit > 0 && count(mainOut) >= m.limit) return 'limit';
  if (!Object.entries(r.in).every(([k, v]) => has(k, v))) return 'wait';
  return 'ready';
}

function tickProduction(dt) {
  const speed = productionSpeed();
  const saveChance = 0.08 * skill('ind_save');
  const doubleChance = 0.08 * skill('ind_double');
  for (const m of S.machines) {
    if (!m.recipe) continue;
    const r = RECIPES[m.recipe];
    if (!m.busy) {
      if (machineStatus(m) !== 'ready') continue;
      for (const [k, v] of Object.entries(r.in)) {
        if (Math.random() >= saveChance) addItem(k, -v);
      }
      m.busy = true;
      m.prog = 0;
    }
    m.prog += dt * speed;
    if (m.prog >= r.t) {
      const mult = Math.random() < doubleChance ? 2 : 1;
      for (const [k, v] of Object.entries(r.out)) {
        addItem(k, v * mult);
        S.stats.made[k] = (S.stats.made[k] || 0) + v * mult;
      }
      gainAXP(r.xp);
      m.busy = false;
      m.prog = 0;
    }
  }
}

// 画面を閉じていた間の生産をまとめて計算する(放置要素)
function simulateOffline(sec) {
  sec = Math.min(sec, OFFLINE_MAX_SEC);
  if (sec < 2) return null;
  const before = Object.assign({}, S.inv);
  const alv = S.alv;
  let left = sec;
  while (left > 0) {
    const step = Math.min(0.5, left);
    tickProduction(step);
    left -= step;
  }
  const gained = [];
  for (const k of Object.keys(S.inv)) {
    const d = Math.floor(S.inv[k]) - Math.floor(before[k] || 0);
    if (d > 0) gained.push([k, d]);
  }
  return { sec, gained, alvUp: S.alv - alv };
}

// ---- 装備 ----------------------------------------------------
// 装備中で、かつ倉庫に実物があるものだけ効果を持つ
// (上位装備の素材として使われて無くなった場合は、自動的に外れる)
function equipped(slot) {
  const id = S.equip[slot];
  return id && has(id) ? EQUIPS[id] : null;
}
function setEquip(slot, id) {
  if (id && (!EQUIPS[id] || EQUIPS[id].slot !== slot || !has(id))) return false;
  S.equip[slot] = id || null;
  return true;
}

// ---- 探索用のプレイヤー能力値 ---------------------------------
function playerStats() {
  const staff = equipped('staff') || {}, robe = equipped('robe') || {}, cat = equipped('catalyst') || {};
  return {
    maxHp: Math.round((100 + 12 * (S.mlv - 1) + 20 * skill('cmb_hp') + (robe.hp || 0)) * (1 + (cat.hpMult || 0))),
    maxMp: 50 + 6 * (S.mlv - 1) + 15 * skill('cmb_mp'),
    mpRegen: (3 + 0.25 * S.mlv) * (1 + 0.35 * skill('cmb_regen') + (cat.regen || 0)),
    dmgMult: (1 + 0.08 * (S.mlv - 1)) * (1 + 0.1 * skill('cmb_dmg')) * (1 + (staff.dmg || 0)),
    spellBoost: cat.boost || {},           // 触媒による魔法ごとの威力上昇
    healMult: 1 + (cat.heal || 0),
    guard: robe.guard || 0,                // 被ダメージ軽減
    cdMult: (1 - 0.1 * skill('cmb_cd')) * (1 - (cat.cd || 0)),
    speed: 190 * (1 + 0.1 * skill('exp_speed')),
    gatherTime: 0.9 * (1 - 0.2 * skill('exp_gather')),
    yieldMult: 1 + 0.2 * skill('exp_yield'),
    luck: 1 + 0.15 * skill('exp_luck'),
    lossOnDeath: 1,                        // 力尽きたら採取袋の中身は全て失う
    recallTime: 3 - skill('exp_recall'),
  };
}

function fieldUnlocked(id) {
  return unlocked('fields').has(id);
}
function fieldAccessible(id) {
  const f = FIELDS[id];
  return fieldUnlocked(id) && (!f.need || has(f.need));
}

if (typeof module !== 'undefined') {
  module.exports = { newState, xpNeed };
}

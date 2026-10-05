// 1ラン通しのバランス・シミュレーター。
// ゲーム本体の関数 (マップ生成・遭遇・戦闘エンジン・報酬・レリック抽選・装備・イベント定義・
// レベル/JP) をそのまま使い、各シーンの処理 (BattleScene.onVictory / onFloorClear,
// NodeEventScene の商人・宝箱・焚き火・呪われた間・イベント, PhantomJoin, Finale) を
// 画面を除いて再現する。プレイヤーの判断は「そこそこ上手い人」程度の決め打ち方針。
//
// 実行 (web/ で): npx esbuild tools/balance-sim.ts --bundle --platform=node --format=esm --outfile=/tmp/balance-sim.mjs && node /tmp/balance-sim.mjs [ラン数=200] [full|norandom|meta|nophantom]
// 1ランの経過を見る: TRACE=<キャラID> node /tmp/balance-sim.mjs  (TRACE2=1 で最終盤のボス戦の行動も表示)
import { BattleEngine, Combatant } from '../src/battle/engine';
import { pickEncounter, buildHeroes, buildEnemies, computeRewards } from '../src/battle/setup';
import { RelicBattleState } from '../src/battle/relicHooks';
import {
  createRun, getEffectiveMaxHP, healRun, damageRun, earnGold, addSanity, canEquip, equipItem,
  createPartyMember, partyUnits, addMaxHP, equippedIds, restAtCampfire, getMaxMP, healMP, fullRestore, type RunState, type UnitState,
} from '../src/core/run';
import { addExp, addJP, MAX_CHARACTER_LEVEL, unitHasSkill } from '../src/core/level';
import { generateMap, getAvailableNodes, getStartNodes, getNode } from '../src/core/mapgen';
import {
  buildBattleLoot, addRelicToRun, modifyGoldDrop, hasEffect, sumEffect, drawRelic, rollRelicRarity,
  modifyShopPrice, modifyHealAmount, modifyEventGold, eventMasterBonus, riskRewardMultiplier, randomCurse,
} from '../src/core/relics';
import { getRelic, type RelicDef, type RelicRarity } from '../src/data/relics';
import { RANDOM_EVENTS, ENDING_RELIC_ID, type EventChoiceDef } from '../src/data/events';
import { drawEquipmentForFloor, getEquipment } from '../src/data/equipment';
import { CHARACTERS, getCharacter } from '../src/data/characters';
import { BLESSINGS } from '../src/data/blessings';
import { FLOORS } from '../src/data/enemies';
import { Rng } from '../src/core/rng';
import { rollCursedRoom, applyCursedRoom, canReceive, COFFIN_GOLD_MULT } from '../src/core/cursedRoom';
import { META_NODES, grimoireCarrySlots, canUnlockNode, tryUnlockNode, recordRunEnd } from '../src/core/meta';
import { loadMeta, recordGrimoire } from '../src/core/save';
import { findEnemySkillById } from '../src/data/enemies';
import { GRIMOIRE_SKILLS, isCarryableGrimoireSkill } from '../src/data/codex';
import type { NodeType, SkillDef } from '../src/core/types';

// ── 戦闘の操作方針 ──────────────────────────────────────────────────────
// 回復 (HP40%未満) > 状態異常を入れる (付与系の技・未付与の敵) > 弱点を突く > 最大威力。
// Break中の敵や BP 満タン時にブースト。ゼノは弱った通常敵に吸収を試す。
// 行動ごとの期待値 (与えるダメージ・毒の総量・吸収で消せるHP など) を見積もり、最大のものを選ぶ。
// 回復が必要なとき (HP40%未満の味方 / 戦闘不能の味方) は回復・蘇生を優先する。
type Foe = BattleEngine['enemies'][number];
function hitValue(h: Combatant, e: Foe, power: number, dmgType: string, element: string, hits: number, undeadMult = 1): number {
  const atk = dmgType === 'Physical' ? h.patk : h.matk;
  const weak = e.enemyDef?.elementWeaknesses.includes(element as never) ? 1.5 : 1;
  const raw = atk * power * weak * (e.isBroken ? 1.5 : 1) * (e.enemyDef?.isUndead ? undeadMult : 1);
  const def = dmgType === 'Physical' ? e.pdef : dmgType === 'Magical' ? e.mdef : 0;
  const per = Math.max(1, raw - def);
  // シールドを削れるなら Break に近づく分を少し上乗せ
  const breakBonus = weak > 1 && !e.isBroken && e.currentShields > 0 ? per * 0.3 : 0;
  return Math.min(e.hp, per * hits) + breakBonus;
}
function skillValue(h: Combatant, s: SkillDef, e: Foe, foes: Foe[]): number {
  const targets = s.hitsAllEnemies ? foes : [e];
  let v = 0;
  for (const t of targets) {
    if (s.basePower > 0) {
      const power = s.basePower + (s.powerPerStatus ?? 0) * Math.min(4, t.statuses.length);
      v += hitValue(h, t, power, s.damageType, s.element, s.hitCount, s.undeadMult ?? 1);
    }
    if (s.appliedStatus && s.statusChance && !t.statuses.some((x) => x.type === s.appliedStatus!.type)) {
      const st = s.appliedStatus;
      const dot = st.type === 'Poison' || st.type === 'Bleed' || st.type === 'Burn';
      v += s.statusChance * (dot
        ? Math.min(t.hp, t.base.maxHP * st.value * st.duration)
        : Math.max(t.patk, t.matk) * 0.6 * st.duration);   // 行動阻害系: 防げる被害の目安
    }
    if (s.debuff) v += s.debuff.reduce((a, d) => a + Math.max(t.patk, t.matk) * d.value * d.duration * 0.5, 0);
    if (s.deathSentence) v += t.enemyDef?.rank === 'Boss' || t.enemyDef?.rank === 'TrueFinalBoss' ? t.base.maxHP * s.deathSentence.bossDmgPct * 0.5 : t.hp * 0.6;
  }
  if (s.absorb) {
    const rank = e.enemyDef?.rank ?? 'Normal';
    const mult = rank === 'Normal' ? 1 : rank === 'Elite' ? (s.absorb.eliteMult ?? 0) : 0;
    const chance = Math.min(1, (s.absorb.baseChance + s.absorb.maxBonus * (1 - e.hpRatio)) * mult);
    // 吸収は投資: 持っていない攻撃技を覚えられるなら、その分の価値を上乗せ
    const newSkill = (e.enemyDef?.actions ?? []).some((a) => a.skill.basePower > 0 && !h.skills.some((x) => x.id === a.skill.id));
    const grimoireSize = h.skills.filter((x) => x.fromGrimoire).length;
    const invest = newSkill ? Math.max(0, 90 - grimoireSize * 20) : 0;
    v = chance * (e.hp * 1.3 + invest) - h.base.maxHP * s.absorb.hpCostPct * 0.4;
  }
  return v;
}
function chooseCommand(eng: BattleEngine) {
  const h = eng.activeCombatant!;
  const foes = eng.enemies.filter((e) => e.isAlive);
  const usable = h.skills.filter((s) => !s.isPassive && !s.isFieldSkill && s.mpCost <= h.mp);
  const lowAlly = eng.heroes.filter((x) => x.isAlive).sort((a, b) => a.hpRatio - b.hpRatio)[0];
  const heal = usable.find((s) => s.isHeal);
  const revive = usable.find((s) => s.revive);
  const idx = (e: Foe) => eng.enemies.indexOf(e);
  let best: { v: number; skill?: SkillDef; target: Foe } = { v: -1, target: foes[0] };
  if (revive && eng.heroes.some((x) => !x.isAlive)) best = { v: 1e9, skill: revive, target: foes[0] };
  else if (heal && lowAlly && lowAlly.hpRatio < 0.4) best = { v: 1e9, skill: heal, target: foes[0] };
  else {
    const atkEl = h.weaponElement !== 'None' ? h.weaponElement : 'Physical';
    for (const e of foes) {
      const va = hitValue(h, e, 1, 'Physical', atkEl, 1);
      if (va > best.v) best = { v: va, target: e };
      for (const s of usable) {
        if (s.isHeal || s.revive || s.buff || s.barrier || s.cleanse || s.regenFlat) continue;
        // MPが心許ないときは安い手を優先 (見積もりをMP比で少し割り引く)
        const v = skillValue(h, s, e, foes) * (h.mp - s.mpCost < h.base.maxMP * 0.15 ? 0.7 : 1);
        if (v > best.v) best = { v, skill: s, target: e };
      }
    }
  }
  const tgt = best.target;
  const boostLevel = tgt && (tgt.isBroken || h.bp >= 5) ? Math.min(3, h.bp) : 0;
  const targetIndex = tgt ? idx(tgt) : 0;
  return best.skill
    ? { type: 'skill' as const, skill: best.skill, targetIndex, boostLevel }
    : { type: 'attack' as const, targetIndex, boostLevel };
}

const stats = { battleTurns: 0, battles: 0 };
/** シナリオ: full=全要素 / norandom=レリック・装備なし / meta=墓標全解放 / nophantom=幻影を拒む */
const SCENARIO = process.argv[3] ?? 'full';
const NO_RANDOM = SCENARIO === 'norandom';
/** 周回: 碑文を貯めて墓標を解放し、ゼノは刻んだ技を次の旅へ持ち込みながら、同じキャラで旅を続ける */
const CAMPAIGN = SCENARIO === 'campaign';
const gainRelic = (run: RunState, relic: RelicDef | null | undefined) => { if (relic && !NO_RANDOM) addRelicToRun(run, relic); };

/** BattleScene と同じ準備で戦い、勝敗と戦闘後の状態をランへ反映 */
function battle(run: RunState, nodeType: NodeType, seed: number, coffin = false): boolean {
  const defs = pickEncounter(run, nodeType, seed);
  // 比較用: MP_CARRY=0 で以前の「戦闘ごとにMP全回復」に戻す
  if (process.env.MP_CARRY === '0') for (const u of partyUnits(run)) u.currentMP = getMaxMP(run, u);
  const heroes = buildHeroes(run);
  const hero = heroes[0];
  const isFirstCombat = run.battlesWon === 0;
  const enemies = buildEnemies(run, defs, nodeType, isFirstCombat);
  if (isFirstCombat && run.blessingFirstCombatShieldReduction) run.blessingFirstCombatShieldReduction = false;
  const eng = new BattleEngine(heroes, enemies, run.metaStartBP, new RelicBattleState(run));
  let t = 0;
  let st = eng.advance(); eng.drainEvents();
  while (!eng.over && t < 400) {
    if (st === 'awaitInput') {
      const cmd = chooseCommand(eng);
      if (process.env.TRACE2 && nodeType === 'Boss' && run.currentFloor >= 3) console.log(`    >> ${eng.activeCombatant!.name} ${cmd.type} ${cmd.skill?.name ?? ''} boost${cmd.boostLevel}`);
      st = eng.executePlayerCommand(cmd); t++;
    }
    else st = eng.advance();
    const evs = eng.drainEvents();
    if (process.env.TRACE2 && nodeType === 'Boss' && run.currentFloor >= 3) {
      for (const e of evs) {
        if (e.kind === 'message') console.log('      ' + e.text);
        else if (e.kind === 'damage' || e.kind === 'dot') console.log(`      ${e.kind} -> ${e.target.name} ${e.amount}${(e as any).isCrit ? ' CRIT' : ''}${(e as any).isWeak ? ' WEAK' : ''}`);
        else if (e.kind === 'skillUse') console.log(`      ${e.user.name}: ${e.skillName}`);
        else if (e.kind === 'break') console.log(`      BREAK ${e.target.name}`);
      }
    }
  }
  stats.battleTurns += t; stats.battles++;
  if (process.env.TRACE) console.log(`  F${run.currentFloor + 1} ${nodeType.padEnd(11)} ${defs.map((d) => d.name).join('+').padEnd(40)} turns ${String(t).padStart(3)} HP ${heroes[0].hp}/${heroes[0].base.maxHP} party ${heroes.length} ${eng.over} Lv${run.characterLevel} relics ${run.relics.length}`);
  // 刻んだ技は勝敗に関係なく記録 (BattleScene.onBattleEnd と同じ)
  if (CAMPAIGN && eng.absorbedThisBattle.length > 0) recordGrimoire(eng.absorbedThisBattle);
  if (eng.over !== 'victory') { run.currentHP = 0; return false; }

  // ── BattleScene.onVictory ──
  run.currentHP = Math.max(1, hero.hp);
  run.currentMP = hero.mp;
  run.partyMembers.forEach((m, i) => { const c = heroes[i + 1]; if (c) { m.currentHP = c.hp; m.currentMP = c.mp; } });
  run.battlesWon++; run.totalRoomsCleared++; run.enemiesKilled += defs.length;
  const units = partyUnits(run);
  for (const { skillId, user } of eng.absorbedBy) {
    const u = units[heroes.indexOf(user)] ?? run;
    if (!u.absorbedSkillIds.includes(skillId)) u.absorbedSkillIds.push(skillId);
  }
  const isElite = nodeType === 'EliteBattle';
  const isBoss = nodeType === 'Boss';
  const rewards = computeRewards(defs);
  let gold = modifyGoldDrop(run, rewards.gold);
  if (isElite && hasEffect(run, 'EliteHunter')) gold *= 2;
  if (coffin) gold = Math.round(gold * COFFIN_GOLD_MULT * riskRewardMultiplier(run));
  run.gold += gold; run.goldEarned += gold;
  if (coffin) run.equipmentInventory.push(drawEquipmentForFloor(run.currentFloor, new Rng(seed ^ 0x5eed)).id);
  // 比較用: MEMBER_GAIN で仲間の EXP/JP の割合を変えられる
  const mg = Number(process.env.MEMBER_GAIN ?? 1);
  for (const u of units) {
    const k = u === run ? 1 : mg;
    addExp(run, Math.round(rewards.exp * k), u); addJP(run, Math.round(rewards.jp * k), u);
  }
  const loot = coffin ? [] : buildBattleLoot(run, isElite, isBoss);
  for (let i = 0; i < eng.soulSiphonRewards; i++) {
    const bonus = drawRelic(run, rollRelicRarity(run.sanity, false));
    if (bonus) loot.push(bonus);
  }
  gainRelic(run, pickRelic(loot.filter((r) => !run.relics.includes(r.id))));
  return true;
}

const RARITY_RANK: Record<string, number> = { Boss: 5, Event: 4, Rare: 3, Uncommon: 2, Common: 1, Cursed: 0 };
function pickRelic(choices: RelicDef[]): RelicDef | undefined {
  // 呪われたレリックは他が無いときだけ (強力だが代償が重い)
  return [...choices].sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity])[0];
}

// ── 装備: 手に入れたら、その枠で強ければ付け替える ──────────────────────
function equipScore(run: UnitState, id: string): number {
  const e = getEquipment(id); if (!e) return 0;
  const c = getCharacter(run.characterId);
  const magic = c.baseStats.magicAttack > c.baseStats.physicalAttack;
  const s = e.bonusStats;
  return (s.maxHP ?? 0) * 0.3 + (s.maxMP ?? 0) * 0.2
    + (magic ? (s.magicAttack ?? 0) * 2 : (s.physicalAttack ?? 0) * 2)
    + (s.physicalDefense ?? 0) + (s.magicDefense ?? 0) + (s.speed ?? 0) * 1.5
    + (s.criticalRate ?? 0) + (s.luck ?? 0) * 0.3;
}
const slotOf = (u: UnitState, slot: string) => slot === 'Weapon' ? u.equippedWeapon : slot === 'Armor' ? u.equippedArmor : u.equippedAccessory;
/** 装備の伸びが一番大きい人 (主人公優先) */
function bestHolder(run: RunState, id: string): { u: UnitState; gain: number } | null {
  const e = getEquipment(id); if (!e) return null;
  let best: { u: UnitState; gain: number } | null = null;
  for (const u of partyUnits(run)) {
    if (!canEquip(u, id)) continue;
    const cur = slotOf(u, e.slot);
    const gain = equipScore(u, id) - (cur ? equipScore(u, cur) : 0);
    if (!best || gain > best.gain) best = { u, gain };
  }
  return best;
}
function autoEquip(run: RunState): void {
  if (NO_RANDOM) return;
  for (const id of [...run.equipmentInventory]) {
    const b = bestHolder(run, id);
    if (b && b.gain > 0) equipItem(run, id, b.u);
  }
}
/** 一番HPの割合が低い人 (戦闘不能を含む) */
const mostHurt = (run: RunState) => [...partyUnits(run)].sort((a, b) => a.currentHP / getEffectiveMaxHP(run, a) - b.currentHP / getEffectiveMaxHP(run, b))[0];
/** JP を渡す相手: 職レベルが一番低い人 (同じなら主人公) */
const jpTarget = (run: RunState) => [...partyUnits(run)].sort((a, b) => a.jobLevel - b.jobLevel)[0];

// ── 商人 (NodeEventScene.buildShopSpecs + shopEntry) ────────────────────
function shop(run: RunState, rng: Rng): void {
  const floor = run.currentFloor;
  const price = (b: number) => modifyShopPrice(run, b);
  type Item = { kind: string; price: number; value: number; buy: () => void };
  const items: Item[] = [];
  const skillCount = rng.range(3, 5);
  const skillPrice = price(Math.round(75 * (1 + floor * 0.3)));
  for (let i = 0; i < skillCount; i++) items.push({ kind: 'skill', price: skillPrice, value: 1, buy: () => { addJP(run, 25, jpTarget(run)); } });
  const BASE: Partial<Record<RelicRarity, number>> = { Common: 80, Uncommon: 150, Rare: 250, Cursed: 50 };
  const used = new Set<string>();
  const relicSlot = (cursed: boolean) => {
    const relic = drawRelic(run, cursed ? 'Cursed' : rollRelicRarity(run.sanity, false), used);
    if (!relic) return;
    items.push({ kind: 'relic', price: price(Math.round((BASE[relic.rarity] ?? 100) * (1 + floor * 0.25))),
      value: NO_RANDOM || relic.rarity === 'Cursed' ? 0 : 2 + RARITY_RANK[relic.rarity],
      buy: () => { if (!run.relics.includes(relic.id)) gainRelic(run, relic); } });
  };
  const relicCount = rng.range(2, 4);
  for (let i = 0; i < relicCount; i++) relicSlot(false);
  if (hasEffect(run, 'BlackMarket')) relicSlot(true);
  const hurt = mostHurt(run);
  const hurtR = hurt.currentHP / getEffectiveMaxHP(run, hurt);
  const drained = [...partyUnits(run)].sort((a, b) => a.currentMP / Math.max(1, getMaxMP(run, a)) - b.currentMP / Math.max(1, getMaxMP(run, b)))[0];
  const drainedR = drained.currentMP / Math.max(1, getMaxMP(run, drained));
  const potion = (pct: number) => () => { const u = mostHurt(run); healRun(run, modifyHealAmount(run, Math.round(getEffectiveMaxHP(run, u) * pct)), u); };
  const pool = [
    { kind: 'potion', value: hurtR < 0.6 ? 4 : 0, buy: potion(0.30) },
    { kind: 'bigpotion', value: hurtR < 0.45 ? 6 : 0, buy: potion(0.60) },
    { kind: 'charm', value: run.sanity < 0 ? 1 : 0, buy: () => addSanity(run, 1) },
    { kind: 'elixir', value: 1.5, buy: () => { addMaxHP(run, 10); } },
    { kind: 'mana', value: drainedR < 0.4 ? 4 : 0, buy: () => { healMP(run, Math.round(getMaxMP(run, drained) * 0.5), drained); } },
  ];
  const idx = [0, 1, 2, 3, 4];
  for (let i = 0; i < 2; i++) { const p = idx.splice(rng.int(idx.length), 1)[0]; items.push({ ...pool[p], price: price(40) }); }
  const equipCount = rng.range(1, 3);
  const owned = new Set([...run.equipmentInventory, ...equippedIds(run)]);
  for (let i = 0; i < equipCount; i++) {
    for (let a = 0; a < 6; a++) {
      const cand = drawEquipmentForFloor(floor, rng);
      if (partyUnits(run).some((u) => canEquip(u, cand.id)) && !owned.has(cand.id)) {
        owned.add(cand.id);
        const gain = bestHolder(run, cand.id)?.gain ?? 0;
        items.push({ kind: 'equip', price: price(cand.value), value: gain > 5 ? 3 + gain / 20 : 0,
          buy: () => { run.equipmentInventory.push(cand.id); autoEquip(run); } });
        break;
      }
    }
  }
  items.push({ kind: 'purge', price: hasEffect(run, 'FreeRemove') ? 0 : price(100), value: run.curses.length > 0 ? 3 : 0, buy: () => { run.curses.pop(); } });
  items.push({ kind: 'upgrade', price: price(120), value: 1.2, buy: () => { addJP(run, 50, jpTarget(run)); } });
  // 価値の高い順に、買えるだけ買う (修練は所持金に余裕があるときだけ)
  items.sort((a, b) => b.value / Math.max(20, b.price) - a.value / Math.max(20, a.price));
  for (const it of items) {
    if (it.value <= 0 || run.gold < it.price) continue;
    if ((it.kind === 'skill' || it.kind === 'upgrade') && run.gold - it.price < 60) continue;
    run.gold -= it.price;
    it.buy();
  }
}

// ── 宝箱 (NodeEventScene.createTreasure) ─────────────────────────────────
function treasure(run: RunState, rng: Rng): void {
  const floor = FLOORS[Math.min(run.currentFloor, FLOORS.length - 1)];
  let gold = floor.baseGoldReward + rng.range(10, 41);
  if (partyUnits(run).some((u) => unitHasSkill(u, 'SKL_A_Lockpicking'))) gold += 30 + rng.range(0, 31);
  if (rng.next() < 0.40) { run.equipmentInventory.push(drawEquipmentForFloor(run.currentFloor, rng).id); autoEquip(run); }
  let rarity = rollRelicRarity(run.sanity, false);
  if (hasEffect(run, 'TreasureNose')) {
    const bump: Record<string, RelicRarity> = { Common: 'Uncommon', Uncommon: 'Rare', Rare: 'Rare', Cursed: 'Rare' };
    rarity = bump[rarity] ?? rarity;
  }
  gainRelic(run, drawRelic(run, rarity));
  earnGold(run, gold);
}

// ── イベント (createRandomEvent + resolveChoice) ─────────────────────────
function scoreChoice(run: RunState, c: EventChoiceDef): number {
  const r = c.result;
  const hpR = run.currentHP / getEffectiveMaxHP(run);
  let s = 0;
  if (c.goldCost) { if (run.gold < c.goldCost) return -1e9; s -= c.goldCost / 15; }
  if (r.fullHeal) s += (1 - hpR) * 40;
  if (r.hpPct) s += r.hpPct > 0 ? Math.min(r.hpPct, 1 - hpR) * 60 : r.hpPct * (hpR < 0.5 ? 200 : 80);
  if (r.gold) s += r.gold === -9999 ? -run.gold / 10 : r.gold / 10;
  if (r.relicPool) s += 14 + (RARITY_RANK[r.relicPool] ?? 1) * 3;
  if (r.curse) s -= 14;
  if (r.removeCurse) s += run.curses.length * 8;
  if (r.maxHP) s += r.maxHP * 0.6;
  if (r.skillDraft) s += r.skillDraft * 4;
  if (r.battle) s -= hpR < 0.5 ? 40 : r.elite ? 12 : 4;
  if (r.endingPath) s += 25;   // 最終層を目指す
  return s;
}
function event(run: RunState, rng: Rng): 'ok' | 'dead' | { battle: NodeType; seed: number } {
  run.eventsVisited++;
  const pool = RANDOM_EVENTS.filter((ev) => {
    if (run.currentFloor < ev.minFloor || run.currentFloor > ev.maxFloor) return false;
    if (ev.oneTime && run.seenOneTimeEvents.includes(ev.id)) return false;
    if (ev.requiredCharacter && ev.requiredCharacter !== run.characterId) return false;
    if (ev.isEndingEvent && run.activeEnding) return false;
    return true;
  });
  const weights = pool.map((ev) => Math.max(0.1, 1 + (ev.sanityWeight ?? 0) * run.sanity));
  let roll = rng.next() * weights.reduce((a, b) => a + b, 0);
  let ev = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll <= 0) { ev = pool[i]; break; } }
  if (ev.oneTime) run.seenOneTimeEvents.push(ev.id);

  const choice = [...ev.choices].sort((a, b) => scoreChoice(run, b) - scoreChoice(run, a))[0];
  const r = choice.result;
  if (choice.goldCost) run.gold = Math.max(0, run.gold - choice.goldCost);
  if (r.fullHeal) for (const u of partyUnits(run)) fullRestore(run, u);
  else if (r.hpPct) {
    for (const u of partyUnits(run)) {
      if (u.currentHP <= 0) continue;
      const delta = Math.round(getEffectiveMaxHP(run, u) * r.hpPct);
      if (delta > 0) healRun(run, modifyHealAmount(run, delta), u); else damageRun(run, -delta, u);
    }
  }
  if (r.gold) {
    if (r.gold > 0) earnGold(run, modifyEventGold(run, modifyGoldDrop(run, r.gold)));
    else run.gold = Math.max(0, run.gold - (r.gold === -9999 ? run.gold : -r.gold));
  }
  if (r.maxHP) addMaxHP(run, r.maxHP);
  if (r.sanity) addSanity(run, r.sanity);
  if (r.relicPool) gainRelic(run, drawRelic(run, r.relicPool === 'Event' ? 'Rare' : r.relicPool));
  if (r.curse) run.curses.push(randomCurse());
  if (r.removeCurse && run.curses.length) { const n = r.removeCurse >= 99 ? run.curses.length : Math.min(r.removeCurse, run.curses.length); for (let i = 0; i < n; i++) run.curses.pop(); }
  if (r.skillDraft) addJP(run, r.skillDraft * 25, jpTarget(run));
  if (r.removeSkill) run.currentJobJP = Math.max(0, run.currentJobJP - 50);
  if (r.endingPath) {
    run.activeEnding = r.endingPath;
    const sealId = ENDING_RELIC_ID[r.endingPath];
    if (sealId && !run.relics.includes(sealId)) { run.relics.push(sealId); run.relicsFound++; }
  }
  const diary = eventMasterBonus(run); if (diary > 0) earnGold(run, diary);
  if (run.currentHP <= 0) return 'dead';
  if (r.battle) return { battle: r.elite ? 'EliteBattle' : 'Battle', seed: rng.int(0x7fffffff) };
  return 'ok';
}

// ── 進路選び: 状況に応じた好みでノードを選ぶ ───────────────────────────
function nodeScore(run: RunState, type: NodeType): number {
  const hpR = run.currentHP / getEffectiveMaxHP(run);
  switch (type) {
    case 'RestSite': return hpR < 0.6 || run.currentMP / Math.max(1, getMaxMP(run)) < 0.35 ? 10 : 1;
    case 'Shop': return run.gold >= 150 ? 6 : 1;
    case 'Treasure': return 7;
    case 'EliteBattle': return hpR > 0.75 ? 5 : hpR > 0.5 ? 1 : -10;
    case 'Battle': return hpR > 0.4 ? 4 : 0;
    case 'CursedRoom': return hpR > 0.6 ? 2 : -2;
    case 'Boss': return 100;
    default: return 3;   // 未知
  }
}

export interface RunResult { won: boolean; floor: number; diedAt: string; level: number; relics: number; ending: string | null }

function playRun(charId: string, seed: number, blessingIdx: number): RunResult {
  const rng = new Rng(seed);
  const blessing = BLESSINGS[blessingIdx].type;
  const run = createRun(charId, 1, blessing);
  run.seed = seed;
  // 魔獣の書 (墓標の全解放時): ゼノはこれまでに刻んだ技から強い2つを持ち込む想定
  if (SCENARIO === 'meta' && charId === 'zeno') {
    run.absorbedSkillIds = [...GRIMOIRE_SKILLS]
      .filter((s) => s.basePower > 0 && isCarryableGrimoireSkill(s.id))
      .sort((a, b) => b.basePower * b.hitCount * (b.hitsAllEnemies ? 1.5 : 1) - a.basePower * a.hitCount * (a.hitsAllEnemies ? 1.5 : 1))
      .slice(0, grimoireCarrySlots()).map((s) => s.id);
  }
  // 周回: これまでに刻んだ技から、持ち込める数だけ強い順に選ぶ (旅立ちの画面で選ぶのと同じ)
  if (CAMPAIGN && charId === 'zeno') {
    run.absorbedSkillIds = loadMeta().grimoireArchive
      .map((id) => findEnemySkillById(id)).filter((sk): sk is SkillDef => !!sk && isCarryableGrimoireSkill(sk.id) && sk.basePower > 0)
      .sort((a, b) => b.basePower * b.hitCount * (b.hitsAllEnemies ? 1.5 : 1) - a.basePower * a.hitCount * (a.hitsAllEnemies ? 1.5 : 1))
      .slice(0, grimoireCarrySlots()).map((sk) => sk.id);
    campaignCarried = run.absorbedSkillIds.length;
  }
  let diedAt = '';
  const nodeRng = (s: number) => new Rng(s);

  for (;;) {
    run.map = generateMap(run.seed, run.currentFloor);
    run.currentNodeId = -1;
    let bossCleared = false;
    while (!bossCleared) {
      const avail = run.currentNodeId < 0 ? getStartNodes(run.map) : getAvailableNodes(run.map, run.currentNodeId);
      if (avail.length === 0) break;
      // 3手先まで見て進路を選ぶ (その先で一番良い道の点を割り引いて足す)
      const look = (id: number, depth: number): number => {
        const n = getNode(run.map!, id)!;
        const s0 = nodeScore(run, n.type);
        if (depth === 0 || n.nextIDs.length === 0) return s0;
        return s0 + 0.6 * Math.max(...n.nextIDs.map((x) => look(x, depth - 1)));
      };
      const node = [...avail].map((n) => ({ n, s: look(n.id, 3) + (rng.next() - 0.5) * 2 }))
        .sort((a, b) => b.s - a.s)[0].n;
      getNode(run.map, node.id)!.visited = true;
      run.currentNodeId = node.id;
      if (hasEffect(run, 'AncientCurse')) run.currentHP = Math.max(1, run.currentHP - Math.round(getEffectiveMaxHP(run) * 0.05));
      const r2 = nodeRng(node.contentSeed);
      const t = node.type;
      if (t === 'Battle' || t === 'EliteBattle' || t === 'Boss') {
        if (!battle(run, t, node.contentSeed)) { diedAt = `F${run.currentFloor + 1} ${t}`; return result(false); }
        if (t === 'Boss') bossCleared = true;
      } else if (t === 'RestSite') {
        restAtCampfire(run);
        addSanity(run, 1);
      } else if (t === 'Shop') shop(run, r2);
      else if (t === 'Treasure') treasure(run, r2);
      else if (t === 'CursedRoom') {
        // NodeEventScene.createCursedRoom: 部屋の型ごとに受けるか決める
        const offer = rollCursedRoom(run, r2);
        const hpR = run.currentHP / getEffectiveMaxHP(run);
        const someoneDown = run.partyMembers.some((m) => m.currentHP <= 0);
        const take: Record<string, UnitState | null> = {
          bloodAltar: hpR > 0.6 ? run : null,
          cursedAltar: hpR > 0.5 && !NO_RANDOM ? run : null,
          whisperMirror: run.curses.length < 2 ? partyUnits(run).filter((u) => canReceive(offer, u)).sort((a, b) => a.jobLevel - b.jobLevel)[0] ?? null : null,
          sealedCoffin: hpR > 0.75 ? run : null,
          taintedSpring: hpR < 0.6 || someoneDown ? run : null,
          deadBargain: run.gold < 150 ? [...partyUnits(run)].sort((a, b) => b.maxHPBase - a.maxHPBase)[0] : null,
        };
        const unit = take[offer.room.id];
        if (unit) {
          const out = applyCursedRoom(run, offer, unit);
          if (run.currentHP <= 0) { diedAt = `F${run.currentFloor + 1} 呪われた間`; return result(false); }
          if (out.battle && !battle(run, 'EliteBattle', r2.int(0x7fffffff), true)) { diedAt = `F${run.currentFloor + 1} 封じられた棺`; return result(false); }
        }
      } else {
        const ev = event(run, r2);
        if (ev === 'dead') { diedAt = `F${run.currentFloor + 1} イベント`; return result(false); }
        if (typeof ev === 'object' && !battle(run, ev.battle, ev.seed)) { diedAt = `F${run.currentFloor + 1} イベント戦`; return result(false); }
      }
      autoEquip(run);
    }

    // ── BattleScene.onFloorClear ──
    if (run.currentFloor >= 4) return result(true);
    if (run.currentFloor >= FLOORS.length - 1) {
      if (!run.activeEnding) return result(true);   // 証印なし: ヴァルゴット撃破でデフォルトエンディング
      run.currentFloor = 4;
      const pct = 0.30 + (run.metaFloorClearExtraHeal ? 0.05 : 0) + sumEffect(run, 'FloorClearHeal');
      floorHeal(pct);
      // 最終層はボス1戦のみ (FinaleScene)
      if (!battle(run, 'Boss', rng.int(0x7fffffff))) { diedAt = 'F5 最終ボス'; return result(false); }
      return result(true);
    }
    const pct = 0.30 + (run.metaFloorClearExtraHeal ? 0.05 : 0) + sumEffect(run, 'FloorClearHeal');
    floorHeal(pct);
    const maxHP = getEffectiveMaxHP(run);
    const shieldPct = sumEffect(run, 'ShieldPerFloor');
    if (shieldPct > 0) run.shieldBarrier += Math.round(maxHP * shieldPct);
    const wasFloor0 = run.currentFloor === 0;
    run.currentFloor++;
    // PhantomJoin: 現れた2名のうち1名を受け入れる (Lv1・職Lv1 で加入)
    if (wasFloor0 && !run.phantomEventDone && SCENARIO === 'nophantom') {
      const ch = getCharacter(run.characterId);
      for (let i = 0; i < 2 && run.characterLevel < MAX_CHARACTER_LEVEL; i++) {
        run.characterLevel++; run.maxHPBase += ch.growthRates.maxHP;
      }
      run.soloVow = true;   // 孤高の誓い
      fullRestore(run);
      run.phantomEventDone = true;
    }
    if (wasFloor0 && !run.phantomEventDone) {
      const others = CHARACTERS.filter((c) => c.id !== run.characterId);
      const prng = new Rng(run.seed + 0x5a17);
      for (let i = others.length - 1; i > 0; i--) { const j = prng.range(0, i + 1); [others[i], others[j]] = [others[j], others[i]]; }
      // 比較用: JOIN_LV / JOIN_JOB (数値 or hero) で加入時のレベルを変えられる
      const joinLv = Number(process.env.JOIN_LV ?? 1);
      const joinJob = process.env.JOIN_JOB === 'hero' ? run.jobLevel : Number(process.env.JOIN_JOB ?? 1);
      for (const c of others.slice(0, 1)) run.partyMembers.push(createPartyMember(run, c.id, joinLv, joinJob));
      run.phantomEventDone = true;
    }
  }

  /** BattleScene.floorClearHeal と同じ (仲間は墓標の+5%なし・戦闘不能でも起き上がる) */
  function floorHeal(heroPct: number): void {
    for (const u of partyUnits(run)) {
      const max = getEffectiveMaxHP(run, u);
      const pct = u === run ? heroPct : heroPct - (run.metaFloorClearExtraHeal ? 0.05 : 0);
      u.currentHP = Math.min(max, u.currentHP + Math.round(max * pct));
      healMP(run, Math.round(getMaxMP(run, u) * pct), u);
    }
  }

  function result(won: boolean): RunResult {
    if (process.env.TRACE) {
      const cnt = new Map<string, number>();
      for (const id of run.relics) cnt.set(id, (cnt.get(id) ?? 0) + 1);
      console.log('relics:', [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => `${getRelic(id)?.name}(${getRelic(id)?.effect} ${getRelic(id)?.value})×${n}`).join(', '));
      console.log('relicsFound', run.relicsFound, 'distinct', cnt.size);
    }
    if (CAMPAIGN) recordRunEnd(run, won);
    return { won, floor: run.currentFloor, diedAt, level: run.characterLevel, relics: run.relics.length, ending: run.activeEnding };
  }
}

// ── 墓標の強化を全解放した状態 (createRun が localStorage のメタを読む) ──
if (SCENARIO === 'meta') {
  // 比較用: META_SCALE で墓標の能力値ボーナス (%・会心・MP) を一律に縮める / META_NO=型,型 で特定の効果を外す
  const k = Number(process.env.META_SCALE ?? 1);
  const scaled = new Set(['MaxHPPercent', 'PhysAtkPercent', 'MagAtkPercent', 'PhysDefPercent', 'MagDefPercent', 'CritRateFlat', 'MaxMPFlat']);
  const off = new Set((process.env.META_NO ?? '').split(',').filter(Boolean));
  // META_ECON: 所持金・割引の倍率 / META_DROP: 外すノードのID (効果を消す)
  const econ = Number(process.env.META_ECON ?? 1);
  const drop = new Set((process.env.META_DROP ?? '').split(',').filter(Boolean));
  for (const n of META_NODES) {
    if (drop.has(n.id)) n.bonuses = [];
    n.bonuses = n.bonuses.map((b) => b.type === 'StartingGold' || b.type === 'ShopDiscount' ? { ...b, value: b.value * econ } : b);
  }
  for (const n of META_NODES) {
    n.bonuses = n.bonuses.filter((b) => !off.has(b.type)).map((b) => scaled.has(b.type) ? { ...b, value: b.value * k } : b);
  }
  const meta = { totalEpitaphs: 0, totalRuns: 0, totalWins: 0, maxFloor: 0, unlockedNodes: META_NODES.map((n) => n.id) };
  (globalThis as any).localStorage = { getItem: () => JSON.stringify(meta), setItem: () => {}, removeItem: () => {} };
}

// ── 周回 (campaign): キャラごとに、まっさらな記録から R 回続けて旅をする。これを C 回くり返して平均する ──
let campaignCarried = 0;
if (CAMPAIGN) {
  const pctC = (x: number, d: number) => `${((x / Math.max(1, d)) * 100).toFixed(0).padStart(3)}%`;
  const R = Number(process.argv[2] ?? 30);
  const C = Number(process.env.CAMPAIGNS ?? 20);
  // ゼノが「魔獣の書」を優先して解放するか (ZENO_GRIM=0 で他のキャラと同じく安い順)
  const zenoGrimFirst = process.env.ZENO_GRIM !== '0';
  const step = Math.max(1, Math.round(R / 6));
  const windows = Array.from({ length: Math.ceil(R / step) }, (_, i) => [i * step, Math.min(R, (i + 1) * step)]);
  console.log(`\n■ 周回 — 各キャラ ${R} 回の旅 × ${C} 通り (まっさらな記録から。碑文が貯まるたびに墓標を解放)`);
  console.log('キャラ        ' + windows.map(([a, b]) => `${a + 1}-${b}回目`.padStart(8)).join(' ') + '   全体   最後の解放数  持ち込み技');
  for (const ch of CHARACTERS) {
    const winsBy = windows.map(() => 0);
    const n = windows.map(() => 0);
    let total = 0, unlockedSum = 0, carriedSum = 0, archiveSum = 0;
    for (let c = 0; c < C; c++) {
      const store = new Map<string, string>();
      (globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };
      campaignCarried = 0;
      for (let r = 0; r < R; r++) {
        const res = playRun(ch.id, 50000 + c * 104729 + r * 7919, (c + r) % BLESSINGS.length);
        const w = windows.findIndex(([a, b]) => r >= a && r < b);
        if (w >= 0) { n[w]++; if (res.won) winsBy[w]++; }
        if (res.won) total++;
        // 旅の後: 解放できる墓標を解放する (ゼノは魔獣の書を優先、ほかは安い順)
        for (;;) {
          const cands = META_NODES.filter((m) => canUnlockNode(m.id))
            .sort((a, b) => (zenoGrimFirst && ch.id === 'zeno' ? (a.pathName === '魔獣の書' ? -1000 : 0) - (b.pathName === '魔獣の書' ? -1000 : 0) : 0) + a.epitaphCost - b.epitaphCost);
          if (cands.length === 0 || !tryUnlockNode(cands[0].id)) break;
        }
      }
      unlockedSum += loadMeta().unlockedNodes.length;
      if (ch.id === 'zeno') archiveSum += loadMeta().grimoireArchive.filter((id) => isCarryableGrimoireSkill(id)).length;
      carriedSum += campaignCarried;
    }
    console.log(`${ch.name.split('・')[0].padEnd(8, '　')} ` + windows.map((_, i) => pctC(winsBy[i], n[i]).padStart(8)).join(' ')
      + `   ${pctC(total, R * C)}      ${(unlockedSum / C).toFixed(1).padStart(4)}       ${ch.id === 'zeno' ? `${(carriedSum / C).toFixed(1)} (刻んだ技 ${(archiveSum / C).toFixed(1)})` : '-'}`);
  }
  process.exit(0);
}

// ── 集計 ─────────────────────────────────────────────────────────────
if (process.env.TRACE) {
  const r = playRun(process.env.TRACE, 1000, 0);
  console.log(r);
  process.exit(0);
}
const N = Number(process.argv[2] ?? 200);
const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(0).padStart(3)}%`;
const LABEL: Record<string, string> = { full: 'ランダム強化あり (標準)', norandom: 'レリック・装備なし', meta: '墓標の強化を全解放', nophantom: '幻影を拒む (Lv+2・孤高の誓い)' };
console.log(`\n■ ${LABEL[SCENARIO]} — 各キャラ ${N} ラン (難易度: 標準 / 加護: ランダム)`);
console.log('キャラ          踏破率  第2層到達 第3層到達 第4層到達 最終層到達  平均Lv  平均レリック  主な敗因');
const ALL = { n: 0, won: 0, f1: 0 };
for (const ch of CHARACTERS) {
  const res: RunResult[] = [];
  for (let i = 0; i < N; i++) res.push(playRun(ch.id, 1000 + i * 7919, i % BLESSINGS.length));
  const reach = (f: number) => res.filter((r) => r.won || r.floor >= f).length;
  ALL.n += N; ALL.won += res.filter((r) => r.won).length; ALL.f1 += reach(1);
  const causes = new Map<string, number>();
  for (const r of res) if (!r.won) causes.set(r.diedAt, (causes.get(r.diedAt) ?? 0) + 1);
  const top = [...causes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${pct(v, N).trim()}`).join(' / ');
  const avg = (f: (r: RunResult) => number) => (res.reduce((a, r) => a + f(r), 0) / N).toFixed(1);
  console.log(`${ch.name.split('・')[0].padEnd(8, '　')} ${pct(res.filter((r) => r.won).length, N)}    ${pct(reach(1), N)}     ${pct(reach(2), N)}     ${pct(reach(3), N)}     ${pct(res.filter((r) => r.floor >= 4).length, N)}      ${avg((r) => r.level).padStart(4)}   ${avg((r) => r.relics).padStart(5)}      ${top}`);
}
console.log(`\n平均手番/戦闘: ${(stats.battleTurns / stats.battles).toFixed(1)}　全キャラ平均: 踏破 ${(ALL.won / ALL.n * 100).toFixed(0)}% / 第1層突破 ${(ALL.f1 / ALL.n * 100).toFixed(0)}%`);
void MAX_CHARACTER_LEVEL; void Combatant; void getRelic;

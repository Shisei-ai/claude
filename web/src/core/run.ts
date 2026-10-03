// 1ランの全状態 — Unity版 Roguelike/RunData.cs の移植
// (JSONシリアライズ可能な形にするため、スキルはID参照で保持する)
import type { BlessingType, CharacterStats, MapData, NodeType } from './types';
import { getCharacter } from '../data/characters';
import { getDifficulty } from '../data/difficulty';
import { applyMetaBonuses } from './meta';
import { grantRandomCommonRelic, randomCurse, hasEffect, sumEffect, modifyHealAmount } from './relics';
import { getEquipment as getEquipmentDef } from '../data/equipment';
import { addJP } from './level';

/** ショップ在庫1枠の保存形式。入店時に確定し、再開しても引き直さない */
export type ShopSpec =
  | { k: 'skill'; price: number }
  | { k: 'relic'; id: string; price: number }
  | { k: 'consumable'; i: number; price: number }
  | { k: 'equip'; id: string; price: number }
  | { k: 'purge'; price: number }
  | { k: 'upgrade'; price: number };

/** 進行中のノード */
export interface PendingEncounter {
  scene: 'Battle' | 'NodeEvent';
  nodeType: NodeType;
  contentSeed: number;
  /** 戦闘に勝利済みで、報酬 (付与済み) の遺物選択待ち */
  reward?: { lines: string[]; loot: string[]; isBoss: boolean };
  /** ショップ: 確定した在庫と購入済みの枠番号 */
  shop?: { stock: ShopSpec[]; sold: number[] };
  /** 呪われた間「封じられた棺」の強敵戦: 勝てばゴールド増量と装備1つ、レリックは出ない */
  coffin?: boolean;
}

export interface RunState {
  // Identity
  characterId: string;
  seed: number;
  difficultyLevel: number;
  blessing: BlessingType;

  // Progress
  currentFloor: number;
  currentNodeId: number;     // -1 = フロア開始(未選択)
  totalRoomsCleared: number;
  isRunActive: boolean;
  map: MapData | null;

  // Resources
  currentHP: number;
  maxHPBase: number;         // ベース最大HP(レベル成長込み・メタ倍率適用前)
  gold: number;
  sanity: number;            // -3 〜 +3

  // Level / Job
  characterLevel: number;
  currentEXP: number;
  jobLevel: number;
  currentJobJP: number;
  totalExpGained: number;
  totalJPGained: number;
  unlockedSkillIds: string[];
  absorbedSkillIds: string[];   // ゼノ: グリモワールに刻んだ敵スキル

  // Relics / Curses
  relics: string[];             // RelicDef.id (重複所持あり = 強欲の合わせ鏡)
  curses: string[];             // CurseType
  soulSiphonCount: number;      // 魂の吊灯籠: 撃破カウント
  shieldBarrier: number;        // 巡礼者の礎石: フロア跨ぎバリア蓄積

  // Events / Ending
  activeEnding: string | null;  // エンディング分岐 (DemonKing等 / 1ラン1つ)
  seenOneTimeEvents: string[];  // OneTimeOnly イベントの既読ID

  // Equipment (RunData.EquippedWeapon/Armor/Accessory + EquipmentInventory)
  equippedWeapon: string | null;
  equippedArmor: string | null;
  equippedAccessory: string | null;
  equipmentInventory: string[];

  // Party (RunData.PartyMembers — Floor0→1の幻影加入)
  partyMembers: PartyMember[];
  phantomEventDone: boolean;    // 幻影イベント消化済みか
  /** 孤高の誓い: 幻影を拒んで1人で進む見返り (この旅の間、主人公の最大HP・攻撃・防御+50%) */
  soloVow: boolean;
  /** 進行中のノード。完了するまで残し、中断→再開時はここから再開する
   *  (戦闘を飛ばせる・ボス戦中断で進めなくなる不具合の対策) */
  pendingEncounter: PendingEncounter | null;
  /** 入ったときの台詞を表示済みの層 (同じ層で繰り返さない) */
  floorIntroSeen: number[];
  /** デイリー挑戦の日付 (YYYY-MM-DD)。通常の旅は null */
  dailyDate: string | null;

  // Statistics
  damageDealt: number;
  damageTaken: number;
  enemiesKilled: number;
  goldEarned: number;
  relicsFound: number;
  eventsVisited: number;
  battlesWon: number;

  // Blessing one-shots
  blessingFirstCombatSkillBonus: number;
  blessingFirstCombatShieldReduction: boolean;

  // Meta bonuses (applied at run start)
  metaMaxHPMult: number;
  metaPhysAtkMult: number;
  metaMagAtkMult: number;
  metaPhysDefMult: number;
  metaMagDefMult: number;
  metaCritRateBonus: number;
  metaMaxMPBonus: number;
  metaExtraStartGold: number;
  metaExtraRelicChoices: number;
  metaStartBP: number;
  metaShopDiscount: number;
  metaCurseDmgReduction: number;
  metaFloorClearExtraHeal: boolean;
  metaStartWithCommonRelic: boolean;
  metaCurseHPReductionImmune: boolean;
  // 彼方の墓標・深層 (Web版で追加)
  metaRestHealBonus: number;     // 焚き火の回復 +最大HP比
  metaStartJP: number;           // 旅立ち時のJP
  metaExtraStartRelics: number;  // 旅立ち時に追加で携えるコモンレリック
}

/** 主人公と仲間に共通する、1人ぶんの成長・装備・HP。
 *  主人公はこれらを RunState に直接持ち (RunState 自身がこの形を満たす)、仲間は PartyMember として持つ。
 *  Web版の拡張: Unity版の仲間はレベル固定・スキルなしだったが、主人公と同じく成長・装備する */
export interface UnitState {
  characterId: string;
  characterLevel: number;
  currentEXP: number;
  jobLevel: number;
  currentJobJP: number;
  unlockedSkillIds: string[];
  absorbedSkillIds: string[];   // ゼノ: グリモワールに刻んだ敵スキル
  equippedWeapon: string | null;
  equippedArmor: string | null;
  equippedAccessory: string | null;
  currentHP: number;
  maxHPBase: number;            // レベル成長込みの最大HP (主人公のみ、ここに墓標・加護の倍率が掛かる)
}

export type PartyMember = UnitState;

/** 主人公 → 仲間の順に全員 */
export function partyUnits(run: RunState): UnitState[] {
  return [run, ...run.partyMembers];
}

/** 仲間を作る (幻影の加入)。指定の職レベルまでのスキルを覚え、初期武器を持つ */
export function createPartyMember(run: RunState, characterId: string, level: number, jobLevel: number): PartyMember {
  const char = getCharacter(characterId);
  const member: PartyMember = {
    characterId,
    characterLevel: level,
    currentEXP: 0,
    jobLevel,
    currentJobJP: 0,
    unlockedSkillIds: char.learnableSkills.filter((e) => e.jobLevel <= jobLevel).map((e) => e.skill.id)
      .filter((id, i, a) => a.indexOf(id) === i),
    absorbedSkillIds: [],
    equippedWeapon: char.starterWeapon ?? null,
    equippedArmor: null,
    equippedAccessory: null,
    currentHP: 0,
    maxHPBase: char.baseStats.maxHP + char.growthRates.maxHP * (level - 1),
  };
  member.currentHP = getEffectiveMaxHP(run, member);
  return member;
}

/** ランスタート (RoguelikeManager.MainFlow 冒頭 + PendingRunConfig 消費に相当) */
export function createRun(
  characterId: string,
  difficultyLevel: number,
  blessing: BlessingType,
): RunState {
  const char = getCharacter(characterId);
  const diff = getDifficulty(difficultyLevel);

  const run: RunState = {
    characterId,
    seed: (Math.random() * 0x7fffffff) | 0,
    difficultyLevel,
    blessing,

    currentFloor: 0,
    currentNodeId: -1,
    totalRoomsCleared: 0,
    isRunActive: true,
    map: null,

    currentHP: 0,
    maxHPBase: char.baseStats.maxHP,
    gold: diff.startingGold,
    sanity: 0,

    characterLevel: 1,
    currentEXP: 0,
    jobLevel: 1,
    currentJobJP: 0,
    totalExpGained: 0,
    totalJPGained: 0,
    unlockedSkillIds: [],
    absorbedSkillIds: [],

    relics: [],
    curses: [],
    soulSiphonCount: 0,
    shieldBarrier: 0,

    activeEnding: null,
    seenOneTimeEvents: [],

    equippedWeapon: char.starterWeapon ?? null,   // Web版の調整: 初期武器を持って旅立つ
    equippedArmor: null,
    equippedAccessory: null,
    equipmentInventory: [],

    partyMembers: [],
    phantomEventDone: false,
    soloVow: false,
    pendingEncounter: null,
    floorIntroSeen: [],
    dailyDate: null,

    damageDealt: 0,
    damageTaken: 0,
    enemiesKilled: 0,
    goldEarned: 0,
    relicsFound: 0,
    eventsVisited: 0,
    battlesWon: 0,

    blessingFirstCombatSkillBonus: 0,
    blessingFirstCombatShieldReduction: false,

    metaMaxHPMult: 1, metaPhysAtkMult: 1, metaMagAtkMult: 1,
    metaPhysDefMult: 1, metaMagDefMult: 1,
    metaCritRateBonus: 0, metaMaxMPBonus: 0, metaExtraStartGold: 0,
    metaExtraRelicChoices: 0, metaStartBP: 0,
    metaShopDiscount: 0, metaCurseDmgReduction: 0,
    metaFloorClearExtraHeal: false, metaStartWithCommonRelic: false,
    metaCurseHPReductionImmune: false,
    metaRestHealBonus: 0, metaStartJP: 0, metaExtraStartRelics: 0,
  };

  // メタ強化 → 加護 の順に適用 (Unity版 MainFlow と同順)
  applyMetaBonuses(run);
  run.gold += run.metaExtraStartGold;
  let pendingCommonRelics = 0;

  switch (blessing) {
    case 'VitalGuard':
      run.metaMaxHPMult += 0.25;
      break;
    case 'GoldenCompass':
      run.gold += 150;
      break;
    case 'IronWill':
      pendingCommonRelics++;
      break;
    case 'AncientKnowledge':
      run.blessingFirstCombatSkillBonus = 1;
      break;
    case 'ShadowVeil':
      run.blessingFirstCombatShieldReduction = true;
      break;
  }

  // メタ「運命の寵児」: コモンレリック1つ所持で開始
  if (run.metaStartWithCommonRelic) pendingCommonRelics++;
  pendingCommonRelics += run.metaExtraStartRelics;   // 墓標「星の導き」

  // 深淵難易度: 呪いを1つ背負って開始 (DifficultyTier.StartWithCurse)
  if (diff.startWithCurse) run.curses.push(randomCurse());

  // 初期スキル解放 (LevelSystem.InitStartingSkills)
  for (const entry of char.learnableSkills) {
    if (entry.jobLevel <= 1 && !run.unlockedSkillIds.includes(entry.skill.id)) {
      run.unlockedSkillIds.push(entry.skill.id);
    }
  }

  // 開始レリック付与 (加護「鉄の意志」/ メタ「運命の寵児」「星の導き」)
  for (let i = 0; i < pendingCommonRelics; i++) grantRandomCommonRelic(run);
  // 墓標「修練の記憶」: 旅立ち時にJP
  if (run.metaStartJP > 0) addJP(run, run.metaStartJP);

  run.currentHP = getEffectiveMaxHP(run);
  return run;
}

/** 孤高の誓いで上乗せする割合 (墓標の倍率に足す) */
export const SOLO_VOW_BONUS = 0.5;

/** メタ倍率適用後の最大HP (墓標・加護・孤高の誓いの倍率は主人公のみ) */
export function getEffectiveMaxHP(run: RunState, unit: UnitState = run): number {
  if (unit !== run) return unit.maxHPBase;
  return Math.round(run.maxHPBase * (run.metaMaxHPMult + (run.soloVow ? SOLO_VOW_BONUS : 0)));
}

/** 墓標・加護の補正。仲間には掛けない */
const NO_META = {
  metaPhysAtkMult: 1, metaMagAtkMult: 1, metaPhysDefMult: 1, metaMagDefMult: 1,
  metaMaxMPBonus: 0, metaCritRateBonus: 0,
};

/** 主人公に掛かる補正 (墓標・加護 + 孤高の誓い) */
function heroMeta(run: RunState): typeof NO_META {
  const v = run.soloVow ? SOLO_VOW_BONUS : 0;
  return {
    metaPhysAtkMult: run.metaPhysAtkMult + v, metaMagAtkMult: run.metaMagAtkMult + v,
    metaPhysDefMult: run.metaPhysDefMult + v, metaMagDefMult: run.metaMagDefMult + v,
    metaMaxMPBonus: run.metaMaxMPBonus, metaCritRateBonus: run.metaCritRateBonus,
  };
}

/** レベル・メタ・レリック補正込みの戦闘用ステータスを構築
 *  (RelicManager.GetGoldToHPBonus / GetAncientCurseStatMultiplier /
 *   GetMirrorCurseHPPenalty / BerserkerRage 防御-50% 相当) */
export function buildBattleStats(run: RunState, unit: UnitState = run): CharacterStats {
  const char = getCharacter(unit.characterId);
  const g = char.growthRates;
  const levels = unit.characterLevel - 1;
  const meta = unit === run ? heroMeta(run) : NO_META;

  // レリック由来のステータス補正
  const ancientCurse = hasEffect(run, 'AncientCurse') ? 0.30 : 0;      // 全ステ+30%
  const mirrorPenalty = hasEffect(run, 'MirrorCurse') ? run.curses.length * 0.10 : 0; // 最大HP-10%/呪い
  const goldToHP = hasEffect(run, 'GoldToHP') ? Math.floor(run.gold / 50) : 0;
  const berserkDef = hasEffect(run, 'BerserkerRage') ? 0.5 : 1;        // 防御-50%
  const statMult = 1 + ancientCurse;

  let maxHP = Math.round(getEffectiveMaxHP(run, unit) * statMult * (1 - Math.min(0.9, mirrorPenalty))) + goldToHP;
  maxHP = Math.max(1, maxHP);

  // 装備ボーナス (RunData.EquipmentBonusStats)
  const eq = equipmentBonusStats(unit);

  return {
    maxHP: Math.max(1, maxHP + (eq.maxHP ?? 0)),
    maxMP: Math.round(char.baseStats.maxMP + g.maxMP * levels) + meta.metaMaxMPBonus + (eq.maxMP ?? 0),
    physicalAttack: Math.max(1, Math.round((char.baseStats.physicalAttack + g.physicalAttack * levels) * meta.metaPhysAtkMult * statMult) + (eq.physicalAttack ?? 0)),
    magicAttack: Math.max(1, Math.round((char.baseStats.magicAttack + g.magicAttack * levels) * meta.metaMagAtkMult * statMult) + (eq.magicAttack ?? 0)),
    physicalDefense: Math.max(0, Math.round((char.baseStats.physicalDefense + g.physicalDefense * levels) * meta.metaPhysDefMult * statMult * berserkDef) + (eq.physicalDefense ?? 0)),
    magicDefense: Math.max(0, Math.round((char.baseStats.magicDefense + g.magicDefense * levels) * meta.metaMagDefMult * statMult * berserkDef) + (eq.magicDefense ?? 0)),
    speed: char.baseStats.speed + g.speed * levels + (eq.speed ?? 0),
    luck: char.baseStats.luck + g.luck * levels + Math.round(sumEffect(run, 'LuckUp')) + (eq.luck ?? 0),
    criticalRate: Math.min(100, char.baseStats.criticalRate + meta.metaCritRateBonus + Math.round(sumEffect(run, 'CritRateUp')) + (eq.criticalRate ?? 0)),
    accuracyRate: char.baseStats.accuracyRate,
  };
}

// ── 装備 (RunData.Equip/CanEquip/EquipmentBonusStats の移植) ────────────

export function equipmentBonusStats(unit: UnitState): Partial<CharacterStats> {
  const out: Partial<CharacterStats> = {};
  for (const id of [unit.equippedWeapon, unit.equippedArmor, unit.equippedAccessory]) {
    if (!id) continue;
    const eq = getEquipmentDef(id);
    if (!eq) continue;
    for (const [k, v] of Object.entries(eq.bonusStats)) {
      out[k as keyof CharacterStats] = (out[k as keyof CharacterStats] ?? 0) + (v as number);
    }
  }
  return out;
}

export function canEquip(unit: UnitState, equipId: string): boolean {
  const eq = getEquipmentDef(equipId);
  if (!eq) return false;
  const char = getCharacter(unit.characterId);
  switch (eq.slot) {
    case 'Weapon': return !!eq.weaponCategory && char.allowedWeapons.includes(eq.weaponCategory);
    case 'Armor': return !!eq.armorCategory && char.allowedArmors.includes(eq.armorCategory);
    case 'Accessory': return true;
  }
}

/** 装備する。所持品はパーティ共有、装備枠は1人ずつ */
export function equipItem(run: RunState, equipId: string, unit: UnitState = run): boolean {
  const eq = getEquipmentDef(equipId);
  if (!eq || !canEquip(unit, equipId)) return false;
  const slotKey = eq.slot === 'Weapon' ? 'equippedWeapon'
    : eq.slot === 'Armor' ? 'equippedArmor' : 'equippedAccessory';
  const old = unit[slotKey];
  if (old) run.equipmentInventory.push(old);
  const idx = run.equipmentInventory.indexOf(equipId);
  if (idx >= 0) run.equipmentInventory.splice(idx, 1);
  unit[slotKey] = equipId;
  // 最大HP変化後のクランプ
  unit.currentHP = Math.min(unit.currentHP, buildBattleStats(run, unit).maxHP);
  return true;
}

export function unequipSlot(run: RunState, slot: 'Weapon' | 'Armor' | 'Accessory', unit: UnitState = run): void {
  const slotKey = slot === 'Weapon' ? 'equippedWeapon'
    : slot === 'Armor' ? 'equippedArmor' : 'equippedAccessory';
  const cur = unit[slotKey];
  if (!cur) return;
  run.equipmentInventory.push(cur);
  unit[slotKey] = null;
  unit.currentHP = Math.min(unit.currentHP, buildBattleStats(run, unit).maxHP);
}

/** 全員が装備している物 (所持品と合わせて「持っている装備」) */
export function equippedIds(run: RunState): string[] {
  return partyUnits(run).flatMap((u) => [u.equippedWeapon, u.equippedArmor, u.equippedAccessory])
    .filter((id): id is string => !!id);
}

export function healRun(run: RunState, amount: number, unit: UnitState = run): number {
  const max = getEffectiveMaxHP(run, unit);
  const healed = Math.max(0, Math.min(amount, max - unit.currentHP));
  unit.currentHP += healed;
  return healed;
}

export function damageRun(run: RunState, amount: number, unit: UnitState = run): void {
  unit.currentHP = Math.max(0, unit.currentHP - amount);
}

// ── 焚き火 (RestSiteController。Web版: 回復30%→25%、仲間対応) ───────────
export const REST_HEAL_PCT = 0.25;
/** 戦闘不能の仲間が焚き火で起き上がるときのHP */
export const REST_REVIVE_HP = 100;

/** 焚き火で休む: 生きている者は最大HPの25% (レリック補正あり)、倒れた仲間はHP100で起き上がる。
 *  戻り値は各自の回復量 */
export function restAtCampfire(run: RunState): number[] {
  return partyUnits(run).map((u) => {
    const max = getEffectiveMaxHP(run, u);
    if (u.currentHP <= 0) {
      u.currentHP = Math.min(max, REST_REVIVE_HP);
      return u.currentHP;
    }
    // 墓標「焚き火の心得」は主人公のみ (墓標の強化は主人公に効く)
    const pct = REST_HEAL_PCT + (u === run ? run.metaRestHealBonus : 0);
    return healRun(run, modifyHealAmount(run, Math.round(max * pct)), u);
  });
}

/** 1人の最大HPを増減する (生命の霊薬・イベント) */
export function addMaxHP(run: RunState, delta: number, unit: UnitState = run): void {
  unit.maxHPBase = Math.max(1, unit.maxHPBase + delta);
  if (delta > 0 && unit.currentHP > 0) healRun(run, delta, unit);
  unit.currentHP = Math.min(unit.currentHP, getEffectiveMaxHP(run, unit));
}

export function earnGold(run: RunState, amount: number): void {
  run.gold += amount;
  run.goldEarned += amount;
}

export function addSanity(run: RunState, delta: number): void {
  run.sanity = Math.max(-3, Math.min(3, run.sanity + delta));
}

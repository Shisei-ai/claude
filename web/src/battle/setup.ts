// エンカウント選択と Combatant 構築
// Unity版 RoguelikeManager のエンカウント選択 + EnemyScaling を移植
import { Combatant } from './engine';
import type { EnemyDef, NodeType } from '../core/types';
import type { RunState, UnitState } from '../core/run';
import { buildBattleStats } from '../core/run';
import { getCharacter } from '../data/characters';
import { getDifficulty } from '../data/difficulty';
import { FLOORS, findEnemySkillById, type EncounterGroup } from '../data/enemies';
import { getEnding } from '../data/endings';
import { getEquipment as getEquipmentDefById } from '../data/equipment';
import { getActiveSkills, getPassiveIds } from '../core/level';
import { toGrimoireSkill } from './traits';
import { Rng } from '../core/rng';

/** Sanity補正付き重み (EnemyEncounterGroup.AdjustedWeight) */
function adjustedWeight(g: EncounterGroup, sanity: number): number {
  return Math.max(0.1, g.weight + sanity * 0.1);
}

export function pickEncounter(
  run: RunState, nodeType: NodeType, contentSeed: number,
): EnemyDef[] {
  // Floor 4 (最終層): エンディング分岐ボス
  if (run.currentFloor >= 4) {
    const ending = getEnding(run.activeEnding);
    if (ending) return [ending.boss];
  }

  const floor = FLOORS[Math.min(run.currentFloor, FLOORS.length - 1)];
  const rng = new Rng(contentSeed);

  if (nodeType === 'Boss') {
    const pool = floor.bossPool;
    return pool[rng.int(pool.length)];
  }

  const groups = nodeType === 'EliteBattle' ? floor.eliteEncounters : floor.normalEncounters;
  const total = groups.reduce((s, g) => s + adjustedWeight(g, run.sanity), 0);
  let roll = rng.next() * total;
  for (const g of groups) {
    roll -= adjustedWeight(g, run.sanity);
    if (roll <= 0) return g.enemies;
  }
  return groups[groups.length - 1].enemies;
}

/** 1人ぶんの戦闘者を作る。unit を省くと主人公 (仲間も同じ規則でスキル・装備・レリック補正が付く) */
export function buildHero(run: RunState, unit: UnitState = run): Combatant {
  const char = getCharacter(unit.characterId);
  const stats = buildBattleStats(run, unit);

  // ゼノ: グリモワールに刻んだ敵スキルをコマンドに追加
  const skills = [...getActiveSkills(unit)];
  for (const id of unit.absorbedSkillIds) {
    const sk = findEnemySkillById(id);
    if (sk && !skills.some((s) => s.id === sk.id)) {
      skills.push(toGrimoireSkill(sk));
    }
  }

  const hero = new Combatant({
    isPlayer: true,
    name: char.name,
    characterId: unit.characterId,
    stats,
    skills,
    passives: getPassiveIds(unit),
    initialHP: Math.max(0, Math.min(unit.currentHP, stats.maxHP)),
    // MPは前の戦闘から持ち越す (満月の聖杯などの効果は開戦時に別途)
    initialMP: unit.currentMP,
  });

  // 装備効果: 武器属性 + 蘇生の護符
  if (unit.equippedWeapon) {
    const weapon = getEquipmentDefById(unit.equippedWeapon);
    if (weapon) hero.weaponElement = weapon.weaponElement;
  }
  if (unit.equippedAccessory === 'Equip_RevivalAmulet') {
    hero.revivalAmuletAvailable = true;
  }

  return hero;
}

/** 主人公 + 仲間 (幻影) のパーティを構築。heroes[i] は partyUnits(run)[i] に対応する
 *  (Unity版の仲間はスキルなし・レベル固定。Web版は主人公と同じくスキル・装備を持つ) */
export function buildHeroes(run: RunState): Combatant[] {
  return [buildHero(run), ...run.partyMembers.map((m) => buildHero(run, m))];
}

/** 敵の基礎ステータスの底上げ (Web版の難易度調整: 第2層以降の最大HP・物攻・魔攻・物防・魔防を+33%。
 *  第1層と、速さ・命中・会心はそのまま) */
export const ENEMY_STAT_MULT = 1.33;

/** 層ごとの敵の強化率 (第1層=0、第2層=+1段…最終層=+4段)。難易度の倍率に掛け合わせる */
// 仲間が主人公と同じく成長・装備するようになった分、第2層以降の強化を上げた (旧: HP0.80 / 攻撃0.30)
export const DEPTH_HP_PER_FLOOR = 1.30;
export const DEPTH_ATK_PER_FLOOR = 0.60;

export function buildEnemies(
  run: RunState, defs: EnemyDef[], nodeType: NodeType, isFirstCombat: boolean,
): Combatant[] {
  const diff = getDifficulty(run.difficultyLevel);
  const floor = FLOORS[Math.min(run.currentFloor, FLOORS.length - 1)];
  const scale = floor.interimScale ?? 1;
  // Web版の難易度調整: 第2層以降は層が深いほど敵が強くなる (レリック・装備で強くなる分への対抗)
  const depth = Math.min(run.currentFloor, 4);
  const depthHP = 1 + DEPTH_HP_PER_FLOOR * depth;
  const depthAtk = 1 + DEPTH_ATK_PER_FLOOR * depth;
  const statMult = run.currentFloor >= 1 ? ENEMY_STAT_MULT : 1;

  return defs.map((def) => {
    const hpMult = diff.enemyHPMult * scale * depthHP;
    const dmgMult = diff.enemyDamageMult * Math.sqrt(scale) * depthAtk;

    let shields = def.shieldPoints + diff.extraAllEnemyShields;
    if (def.rank === 'Elite') shields += diff.extraEliteShields;
    if (def.rank === 'Boss') shields += 2;  // FloorData.BossShieldBonus
    // 影の帳: 最初の戦闘で全敵シールド-1
    if (isFirstCombat && run.blessingFirstCombatShieldReduction) {
      shields = Math.max(0, shields - 1);
    }

    return new Combatant({
      isPlayer: false,
      name: def.name,
      enemyDef: def,
      stats: {
        ...def.stats,
        maxHP: Math.round(def.stats.maxHP * hpMult * statMult),
        physicalAttack: Math.round(def.stats.physicalAttack * dmgMult * statMult),
        magicAttack: Math.round(def.stats.magicAttack * dmgMult * statMult),
        physicalDefense: Math.round(def.stats.physicalDefense * statMult),
        magicDefense: Math.round(def.stats.magicDefense * statMult),
      },
      shields,
    });
  });
}

/** 戦闘報酬 (LevelSystem.ComputeBattleRewards + ゴールド) */
export function computeRewards(defs: EnemyDef[]): { exp: number; jp: number; gold: number } {
  let exp = 0, jp = 0, gold = 0;
  for (const d of defs) {
    exp += d.expReward;
    jp += d.jpReward;
    gold += d.goldReward;
  }
  return { exp, jp, gold };
}

// エンカウント選択と Combatant 構築
// Unity版 RoguelikeManager のエンカウント選択 + EnemyScaling を移植
import { Combatant } from './engine';
import type { EnemyDef, NodeType } from '../core/types';
import type { RunState } from '../core/run';
import { buildBattleStats } from '../core/run';
import { getCharacter } from '../data/characters';
import { getDifficulty } from '../data/difficulty';
import { FLOORS, findEnemySkillById, type EncounterGroup } from '../data/enemies';
import { getEnding } from '../data/endings';
import { getEquipment as getEquipmentDefById } from '../data/equipment';
import { getActiveSkills, getPassiveIds } from '../core/level';
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

export function buildHero(run: RunState): Combatant {
  const char = getCharacter(run.characterId);
  const stats = buildBattleStats(run);

  // ゼノ: グリモワールに刻んだ敵スキルをコマンドに追加
  const skills = [...getActiveSkills(run)];
  for (const id of run.absorbedSkillIds) {
    const sk = findEnemySkillById(id);
    if (sk && !skills.some((s) => s.id === sk.id)) {
      skills.push({ ...sk, mpCost: Math.max(4, sk.mpCost || 8) });
    }
  }

  const hero = new Combatant({
    isPlayer: true,
    name: char.name,
    characterId: run.characterId,
    stats,
    skills,
    passives: getPassiveIds(run),
    initialHP: Math.min(run.currentHP, stats.maxHP),
  });

  // 装備効果: 武器属性 + 蘇生の護符
  if (run.equippedWeapon) {
    const weapon = getEquipmentDefById(run.equippedWeapon);
    if (weapon) hero.weaponElement = weapon.weaponElement;
  }
  if (run.equippedAccessory === 'Equip_RevivalAmulet') {
    hero.revivalAmuletAvailable = true;
  }

  return hero;
}

export function buildEnemies(
  run: RunState, defs: EnemyDef[], nodeType: NodeType, isFirstCombat: boolean,
): Combatant[] {
  const diff = getDifficulty(run.difficultyLevel);
  const floor = FLOORS[Math.min(run.currentFloor, FLOORS.length - 1)];
  const scale = floor.interimScale ?? 1;

  return defs.map((def) => {
    const hpMult = diff.enemyHPMult * scale;
    const dmgMult = diff.enemyDamageMult * Math.sqrt(scale);

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
        maxHP: Math.round(def.stats.maxHP * hpMult),
        physicalAttack: Math.round(def.stats.physicalAttack * dmgMult),
        magicAttack: Math.round(def.stats.magicAttack * dmgMult),
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

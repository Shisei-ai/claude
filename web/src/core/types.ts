// ── Unity版 Data/CharacterData.cs からの移植 ────────────────────────────

export type ElementType =
  | 'None' | 'Physical' | 'Fire' | 'Ice' | 'Lightning' | 'Wind'
  | 'Dark' | 'Light' | 'Poison' | 'Bleed';

export type DamageType = 'Physical' | 'Magical' | 'True';

export type StatusEffectType =
  | 'Poison' | 'Bleed' | 'Burn' | 'Freeze' | 'Paralysis' | 'Sleep'
  | 'Blind' | 'Silence'
  | 'AtkUp' | 'AtkDown' | 'DefUp' | 'DefDown' | 'SpdUp' | 'SpdDown'
  | 'Regen' | 'ActionSeal' | 'MatkUp' | 'MatkDown';

export const STATUS_DISPLAY_NAME: Record<StatusEffectType, string> = {
  Poison: '毒', Bleed: '出血', Burn: '炎上', Freeze: '凍結',
  Paralysis: '麻痺', Sleep: '睡眠', Blind: '暗闇', Silence: '沈黙',
  AtkUp: '物理攻撃UP', AtkDown: '物理攻撃DOWN',
  MatkUp: '魔法攻撃UP', MatkDown: '魔法攻撃DOWN',
  DefUp: '防御UP', DefDown: '防御DOWN',
  SpdUp: '速度UP', SpdDown: '速度DOWN',
  Regen: '再生', ActionSeal: '行動封じ',
};

export interface CharacterStats {
  maxHP: number;
  maxMP: number;
  physicalAttack: number;
  magicAttack: number;
  physicalDefense: number;
  magicDefense: number;
  speed: number;
  luck: number;
  criticalRate: number;   // 0-100
  accuracyRate: number;   // base 85
}

export function emptyStats(): CharacterStats {
  return {
    maxHP: 0, maxMP: 0, physicalAttack: 0, magicAttack: 0,
    physicalDefense: 0, magicDefense: 0, speed: 0, luck: 0,
    criticalRate: 0, accuracyRate: 0,
  };
}

export function addStats(a: CharacterStats, b: CharacterStats): CharacterStats {
  return {
    maxHP: a.maxHP + b.maxHP,
    maxMP: a.maxMP + b.maxMP,
    physicalAttack: a.physicalAttack + b.physicalAttack,
    magicAttack: a.magicAttack + b.magicAttack,
    physicalDefense: a.physicalDefense + b.physicalDefense,
    magicDefense: a.magicDefense + b.magicDefense,
    speed: a.speed + b.speed,
    luck: a.luck + b.luck,
    criticalRate: a.criticalRate + b.criticalRate,
    accuracyRate: a.accuracyRate + b.accuracyRate,
  };
}

export function scaleStats(s: CharacterStats, n: number): CharacterStats {
  return {
    maxHP: s.maxHP * n, maxMP: s.maxMP * n,
    physicalAttack: s.physicalAttack * n, magicAttack: s.magicAttack * n,
    physicalDefense: s.physicalDefense * n, magicDefense: s.magicDefense * n,
    speed: s.speed * n, luck: s.luck * n,
    criticalRate: s.criticalRate * n, accuracyRate: s.accuracyRate * n,
  };
}

// ── Status Effect ───────────────────────────────────────────────────────

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;   // turns
  value: number;      // DoT/HoT: MaxHP比 / バフ: 倍率(0.25 = +25%)
}

// ── Skill ───────────────────────────────────────────────────────────────

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  element: ElementType;
  damageType: DamageType;
  mpCost: number;
  basePower: number;        // 0 = 非攻撃
  hitCount: number;
  hitsAllEnemies: boolean;
  hitsAllAllies: boolean;
  canBreak: boolean;        // Break(シールド削り)寄与
  shieldDamage?: number;    // canBreak時の削り数(既定1)
  appliedStatus?: StatusEffect;
  statusChance?: number;    // 0-1
  isHeal: boolean;
  healPower: number;        // <1: MaxHP比 / >=1: 固定値 (Unity版準拠)
  buff?: { type: StatusEffectType; value: number; duration: number; toAllAllies?: boolean; toSelf?: boolean }[];
  debuff?: { type: StatusEffectType; value: number; duration: number }[];
  critBonus?: number;       // このスキル使用時の会心率ボーナス
  isPassive?: boolean;      // パッシブ(コマンドとして出さない)
  shieldRestore?: number;   // 敵専用: シールド回復
  healAmountFlat?: number;  // 敵専用: 固定回復
}

// ── Enemy ───────────────────────────────────────────────────────────────

export type EnemyRank = 'Normal' | 'Elite' | 'Boss' | 'TrueFinalBoss';

export interface EnemyActionDef {
  skill: SkillDef;
  priority: number;
  useChance: number;
  healthThreshold: number;  // 0=常時 / それ以外: HP%以下で使用可
}

export interface EnemyDef {
  id: string;
  name: string;
  lore: string;
  rank: EnemyRank;
  stats: CharacterStats;
  shieldPoints: number;
  elementWeaknesses: ElementType[];
  isUndead: boolean;
  actions: EnemyActionDef[];
  actionsPerTurn: number;
  expReward: number;
  jpReward: number;
  goldReward: number;
  tint: number;             // 暫定描画色 (スプライト未実装のため)
}

// ── Character (Job込み・Web版は1キャラ=1ジョブ固定) ─────────────────────

export interface JobSkillEntry {
  jobLevel: number;
  skill: SkillDef;
  jpCost: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  jobName: string;
  backstory: string;
  themeColor: number;
  baseStats: CharacterStats;
  growthRates: CharacterStats;
  learnableSkills: JobSkillEntry[];
}

// ── Map (Roguelike/RunData.cs NodeType) ────────────────────────────────

export type NodeType =
  | 'Battle' | 'EliteBattle' | 'Boss' | 'Shop' | 'RestSite'
  | 'RandomEvent' | 'Treasure' | 'CursedRoom' | 'Start';

export interface MapNode {
  id: number;
  row: number;
  column: number;
  type: NodeType;
  visited: boolean;
  nextIDs: number[];
  contentSeed: number;
}

export interface MapData {
  floorIndex: number;
  seed: number;
  nodes: MapNode[];
}

// ── Blessing (PendingRunConfig.cs) ──────────────────────────────────────

export type BlessingType =
  | 'None' | 'VitalGuard' | 'GoldenCompass' | 'IronWill'
  | 'AncientKnowledge' | 'ShadowVeil';

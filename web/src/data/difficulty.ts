// Unity版 Roguelike/DifficultyConfig.cs の忠実移植
export interface DifficultyTier {
  level: number;
  displayName: string;
  description: string;
  enemyHPMult: number;
  enemyDamageMult: number;
  startingGold: number;
  extraEliteShields: number;
  extraAllEnemyShields: number;
  startWithCurse: boolean;
}

export const DIFFICULTY_TIERS: DifficultyTier[] = [
  {
    level: 0, displayName: '物語',
    description: '敵が弱い。',
    enemyHPMult: 0.85, enemyDamageMult: 0.85, startingGold: 150,
    extraEliteShields: 0, extraAllEnemyShields: 0, startWithCurse: false,
  },
  {
    level: 1, displayName: '標準',
    description: '標準。',
    enemyHPMult: 1.00, enemyDamageMult: 1.00, startingGold: 100,
    extraEliteShields: 0, extraAllEnemyShields: 0, startWithCurse: false,
  },
  {
    level: 2, displayName: '強敵',
    description: '敵が強い。',
    enemyHPMult: 1.15, enemyDamageMult: 1.10, startingGold: 75,
    extraEliteShields: 0, extraAllEnemyShields: 0, startWithCurse: false,
  },
  {
    level: 3, displayName: '試練',
    description: '強敵のシールドが増える。',
    enemyHPMult: 1.30, enemyDamageMult: 1.20, startingGold: 50,
    extraEliteShields: 1, extraAllEnemyShields: 0, startWithCurse: false,
  },
  {
    level: 4, displayName: '覇者',
    description: 'すべての敵が強靭。',
    enemyHPMult: 1.50, enemyDamageMult: 1.35, startingGold: 25,
    extraEliteShields: 1, extraAllEnemyShields: 1, startWithCurse: false,
  },
  {
    level: 5, displayName: '深淵',
    description: '呪いを背負って旅立つ。最難関。',
    enemyHPMult: 1.75, enemyDamageMult: 1.55, startingGold: 100,
    extraEliteShields: 2, extraAllEnemyShields: 2, startWithCurse: true,
  },
];

export function getDifficulty(level: number): DifficultyTier {
  return DIFFICULTY_TIERS[Math.max(0, Math.min(level, DIFFICULTY_TIERS.length - 1))];
}

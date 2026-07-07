// エンジン検証: 全キャラの全アクティブスキルを実行して例外がないか確認
// 実行: npx esbuild engine.test.ts --bundle --format=esm --outfile=engine.test.mjs && node engine.test.mjs
import { BattleEngine, Combatant } from './src/battle/engine';
import { CHARACTERS } from './src/data/characters';
import { GOBLIN, ROTTING_ZOMBIE, GARM, F0_BOSS_GARM_LORD } from './src/data/enemies';
import type { EnemyDef } from './src/core/types';

let failures = 0;

function makeEnemies(defs: EnemyDef[]): Combatant[] {
  return defs.map((d) => new Combatant({
    isPlayer: false, name: d.name, enemyDef: d, stats: { ...d.stats },
    shields: d.shieldPoints,
  }));
}

for (const char of CHARACTERS) {
  const actives = char.learnableSkills.filter((e) => !e.skill.isPassive);
  const passives = new Set(char.learnableSkills.filter((e) => e.skill.isPassive).map((e) => e.skill.id));

  for (const entry of actives) {
    const skill = entry.skill;
    try {
      const hero = new Combatant({
        isPlayer: true, name: char.name, characterId: char.id,
        stats: { ...char.baseStats, maxMP: 999, speed: 999 },
        skills: actives.map((e) => e.skill), passives,
      });
      hero.mp = 999;
      const enemies = makeEnemies([GOBLIN, ROTTING_ZOMBIE, GARM]);
      const engine = new BattleEngine([hero], enemies, 3);
      const state = engine.advance();
      if (state !== 'awaitInput') throw new Error(`expected awaitInput, got ${state}`);
      engine.drainEvents();

      // スキル実行 (全ブースト段階: テーブル定義の×1〜×3も通す)
      for (const boost of [0, 1, 2, 3]) {
        if (engine.over) break;
        if (engine.activeCombatant?.isPlayer) {
          engine.executePlayerCommand({ type: 'skill', skill, targetIndex: 0, boostLevel: boost });
          engine.drainEvents();
        }
      }

      // 不変条件チェック
      for (const c of [hero, ...enemies]) {
        if (c.hp < 0) throw new Error(`${c.name} hp<0`);
        if (Number.isNaN(c.hp)) throw new Error(`${c.name} hp NaN`);
      }
    } catch (err) {
      failures++;
      console.error(`✗ ${char.name} / ${skill.name}: ${(err as Error).message}`);
    }
  }
  console.log(`✓ ${char.name}: ${actives.length} スキル実行OK`);
}

// ボス戦での死の宣告・吸収不可を確認
{
  const zeno = CHARACTERS.find((c) => c.id === 'zeno')!;
  const actives = zeno.learnableSkills.filter((e) => !e.skill.isPassive).map((e) => e.skill);
  const hero = new Combatant({
    isPlayer: true, name: 'ゼノ', characterId: 'zeno',
    stats: { ...zeno.baseStats, maxMP: 999, speed: 999, maxHP: 5000 },
    skills: actives, passives: new Set(),
  });
  hero.hp = 5000; hero.mp = 999;
  const enemies = makeEnemies([F0_BOSS_GARM_LORD]);
  const engine = new BattleEngine([hero], enemies, 3);
  engine.advance();
  const absorb = actives.find((s) => s.id === 'SKL_Z_Absorb')!;
  engine.executePlayerCommand({ type: 'skill', skill: absorb, targetIndex: 0, boostLevel: 0 });
  const events = engine.drainEvents();
  const blocked = events.some((e) => e.kind === 'message' && e.text.includes('吸収できない'));
  if (!blocked && enemies[0].isAlive) { console.error('✗ ボスに吸収が通っている可能性'); failures++; }
  else console.log('✓ ボスへの吸収は無効');

  if (engine.activeCombatant?.isPlayer && !engine.over) {
    const ds = actives.find((s) => s.id === 'SKL_Z_DeathSentence')!;
    engine.executePlayerCommand({ type: 'skill', skill: ds, targetIndex: 0, boostLevel: 0 });
    engine.drainEvents();
    // 敵ターンを回して発動を待つ (ヒーローは攻撃で回す)
    for (let i = 0; i < 20 && !engine.over && enemies[0].isAlive; i++) {
      if (engine.activeCombatant?.isPlayer) {
        engine.executePlayerCommand({ type: 'attack', targetIndex: 0, boostLevel: 0 });
      }
      const evs = engine.drainEvents();
      const fired = evs.some((e) => e.kind === 'message' && e.text.includes('死の宣告が発動'));
      if (fired) { console.log('✓ 死の宣告がボスにMaxHP%ダメージで発動'); break; }
    }
  }
}

// ゼノ吸収成功パス (通常敵・低HP)
{
  const zeno = CHARACTERS.find((c) => c.id === 'zeno')!;
  const actives = zeno.learnableSkills.filter((e) => !e.skill.isPassive).map((e) => e.skill);
  let absorbed = false;
  for (let trial = 0; trial < 30 && !absorbed; trial++) {
    const hero = new Combatant({
      isPlayer: true, name: 'ゼノ', characterId: 'zeno',
      stats: { ...zeno.baseStats, maxMP: 999, speed: 999 },
      skills: [...actives], passives: new Set(),
    });
    hero.mp = 999;
    const enemies = makeEnemies([GOBLIN]);
    enemies[0].hp = 5;   // ほぼ死にかけ → 高確率
    const engine = new BattleEngine([hero], enemies, 0);
    engine.advance();
    const absorb = actives.find((s) => s.id === 'SKL_Z_Absorb')!;
    engine.executePlayerCommand({ type: 'skill', skill: absorb, targetIndex: 0, boostLevel: 0 });
    const evs = engine.drainEvents();
    if (evs.some((e) => e.kind === 'absorb')) absorbed = true;
  }
  if (absorbed) console.log('✓ 吸収成功でスキル獲得イベント発火');
  else { console.error('✗ 吸収が30回試行で一度も成功しない'); failures++; }
}

// ── ブーストテーブル (BoostSkillResolver) ────────────────────────────────
import { BOOST_TABLE_KEYS, getBoostUpgrade } from './src/battle/boost';

// 1. テーブルの全キーが実在スキル名と一致するか (タイポ検出)
{
  const allNames = new Set<string>();
  for (const c of CHARACTERS) {
    for (const e of c.learnableSkills) allNames.add(e.skill.name.replace(/＋$/, ''));
  }
  const orphans = BOOST_TABLE_KEYS.filter((k) => !allNames.has(k));
  if (orphans.length > 0) {
    console.error(`✗ テーブルキーがスキル名と不一致: ${orphans.join(', ')}`);
    failures++;
  } else {
    console.log(`✓ ブーストテーブル ${BOOST_TABLE_KEYS.length} キー全てがスキル名と一致`);
  }
}

// 2. 強化版スキル (○○＋) も基本名のテーブルを引けるか
{
  const bern = CHARACTERS.find((c) => c.id === 'bernhard')!;
  const anySkill = bern.learnableSkills[0].skill;
  const plus = { ...anySkill, name: '影矢＋' };
  const u = getBoostUpgrade(plus, 3);
  if (u.grantShadowState && u.guaranteedCrit) console.log('✓ 強化版スキル(＋)も基本名テーブルを参照');
  else { console.error('✗ 影矢＋ が影矢テーブルを引けていない'); failures++; }
}

// 3. 二段斬り×3: ヒット数 1+3=4 (通常時1ヒット)
{
  const bern = CHARACTERS.find((c) => c.id === 'bernhard')!;
  const actives = bern.learnableSkills.filter((e) => !e.skill.isPassive).map((e) => e.skill);
  const doubleSlash = actives.find((s) => s.name === '二段斬り')!;
  const countHits = (boost: number): number => {
    const hero = new Combatant({
      isPlayer: true, name: 'B', characterId: 'bernhard',
      stats: { ...bern.baseStats, maxMP: 999, speed: 999, physicalAttack: 1 },
      skills: actives, passives: new Set(),
    });
    hero.mp = 999;
    const enemies = makeEnemies([F0_BOSS_GARM_LORD]);   // 高HPで倒れない
    const engine = new BattleEngine([hero], enemies, 3);
    engine.advance();
    engine.executePlayerCommand({ type: 'skill', skill: doubleSlash, targetIndex: 0, boostLevel: boost });
    return engine.drainEvents().filter((e) => e.kind === 'damage' && e.target === enemies[0]).length;
  };
  const h0 = countHits(0);
  const h3 = countHits(3);
  if (h3 === h0 + 3) console.log(`✓ 二段斬り×3でヒット数+3 (${h0}→${h3})`);
  else { console.error(`✗ 二段斬りヒット数: boost0=${h0} boost3=${h3} (期待差+3)`); failures++; }
}

// 4. 雷迸り×2: BP+1 (消費2 - 回復1 = 差し引き-1)
{
  const bern = CHARACTERS.find((c) => c.id === 'bernhard')!;
  const actives = bern.learnableSkills.filter((e) => !e.skill.isPassive).map((e) => e.skill);
  const bolt = actives.find((s) => s.name === '雷迸り')!;
  const hero = new Combatant({
    isPlayer: true, name: 'B', characterId: 'bernhard',
    stats: { ...bern.baseStats, maxMP: 999, speed: 999 },
    skills: actives, passives: new Set(),
  });
  hero.mp = 999;
  const enemies = makeEnemies([F0_BOSS_GARM_LORD]);
  const engine = new BattleEngine([hero], enemies, 3);
  engine.advance();
  const before = hero.bp;
  engine.executePlayerCommand({ type: 'skill', skill: bolt, targetIndex: 0, boostLevel: 2 });
  engine.drainEvents();
  if (hero.bp === before - 2 + 1) console.log(`✓ 雷迸り×2でBP+1回復 (${before}→${hero.bp})`);
  else { console.error(`✗ 雷迸り×2 BP: ${before}→${hero.bp} (期待${before - 1})`); failures++; }
}

// 5. 吸収×3: HP消費なし (absorbHPCostMult=0)
{
  const zeno = CHARACTERS.find((c) => c.id === 'zeno')!;
  const actives = zeno.learnableSkills.filter((e) => !e.skill.isPassive).map((e) => e.skill);
  const absorb = actives.find((s) => s.id === 'SKL_Z_Absorb')!;
  const hero = new Combatant({
    isPlayer: true, name: 'Z', characterId: 'zeno',
    stats: { ...zeno.baseStats, maxMP: 999, speed: 999 },
    skills: actives, passives: new Set(),
  });
  hero.mp = 999;
  const enemies = makeEnemies([F0_BOSS_GARM_LORD]);   // ボス: 吸収は必ず失敗するがHP消費は先
  const engine = new BattleEngine([hero], enemies, 3);
  engine.advance();
  const hpBefore = hero.hp;
  engine.executePlayerCommand({ type: 'skill', skill: absorb, targetIndex: 0, boostLevel: 3 });
  engine.drainEvents();
  if (hero.hp === hpBefore) console.log('✓ 吸収×3はHP消費なし');
  else { console.error(`✗ 吸収×3でHPが減少: ${hpBefore}→${hero.hp}`); failures++; }
}

// 6. 未定義スキルは汎用フォールバック (×1.5/2.0/2.5)
{
  const dummy = { ...CHARACTERS[0].learnableSkills[0].skill, name: '存在しない技' };
  const u = getBoostUpgrade(dummy, 2);
  if (u.powerMult === 2.0) console.log('✓ テーブル未定義スキルは汎用ブースト (×2.0)');
  else { console.error(`✗ 汎用フォールバック異常: powerMult=${u.powerMult}`); failures++; }
}

console.log(failures === 0 ? '\nALL OK' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);

// エンジン検証: 全キャラの全アクティブスキルを実行して例外がないか確認
// 実行: npx esbuild engine.test.ts --bundle --format=esm --outfile=engine.test.mjs && node engine.test.mjs
import { BattleEngine, Combatant } from './src/battle/engine';
import { CHARACTERS } from './src/data/characters';
import { GOBLIN, ROTTING_ZOMBIE, GARM, F0_BOSS_MORVA } from './src/data/enemies';
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
  const enemies = makeEnemies([F0_BOSS_MORVA]);
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
    const enemies = makeEnemies([F0_BOSS_MORVA]);   // 高HPで倒れない
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
  const enemies = makeEnemies([F0_BOSS_MORVA]);
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
  const enemies = makeEnemies([F0_BOSS_MORVA]);   // ボス: 吸収は必ず失敗するがHP消費は先
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

// ── Floor0〜2 専用ボス (⑩) ────────────────────────────────────────────
import { F0_BOSS_MORVA as MORVA } from './src/data/enemies';
import { F1_BOSS_GRISELDA, F2_BOSS_SANGUINA } from './src/data/enemies_floor123';

for (const boss of [MORVA, F1_BOSS_GRISELDA, F2_BOSS_SANGUINA]) {
  // 基本不変条件: Boss / 2行動 / フェーズ2アクション (healthThreshold>0) を持つ /
  // 防御無視 True ダメージ技を持つ / MATK>0 (True は MATK スケール)
  const phase2 = boss.actions.filter((a) => a.healthThreshold > 0);
  const trueHit = boss.actions.find((a) => a.skill.damageType === 'True' && a.skill.basePower > 0);
  const ok = boss.rank === 'Boss' && boss.actionsPerTurn === 2
    && phase2.length >= 2 && !!trueHit && boss.stats.magicAttack > 0
    && boss.elementWeaknesses.length >= 1;
  if (!ok) { console.error(`✗ ${boss.name}: ボス設計の不変条件を満たさない`); failures++; continue; }

  // 実戦: 低HPからフェーズ2アクションが発火し True ダメージが通るか
  let phase2Fired = false, trueDamageDealt = false;
  for (let trial = 0; trial < 40 && !(phase2Fired && trueDamageDealt); trial++) {
    const hero = new Combatant({
      isPlayer: true, name: '勇者', characterId: 'bernhard',
      stats: { maxHP: 9000, maxMP: 999, physicalAttack: 30, magicAttack: 0,
        physicalDefense: 200, magicDefense: 200, speed: 1, luck: 0,
        criticalRate: 0, accuracyRate: 100 },
      skills: [], passives: new Set(),
    });
    hero.hp = 9000; hero.mp = 999;
    const enemies = makeEnemies([boss]);
    enemies[0].hp = Math.round(boss.stats.maxHP * 0.30);   // フェーズ2圏内
    const engine = new BattleEngine([hero], enemies, 3);
    engine.advance();
    for (let i = 0; i < 12 && !engine.over; i++) {
      if (engine.activeCombatant?.isPlayer) {
        engine.executePlayerCommand({ type: 'attack', targetIndex: 0, boostLevel: 0 });
      }
      const evs = engine.drainEvents();
      const hpBefore = hero.hp;
      for (const e of evs) {
        if (e.kind === 'skillUse' && e.user === enemies[0]
            && phase2.some((a) => a.skill.name === e.skillName)) phase2Fired = true;
        if (e.kind === 'damage' && e.target === hero && e.amount > 0) {
          // 防御200を貫通した大ダメージ = True ヒットの痕跡
          if (e.amount > 100) trueDamageDealt = true;
        }
      }
      void hpBefore;
      if (!enemies[0].isAlive) break;
    }
  }
  if (phase2Fired) console.log(`✓ ${boss.name}: フェーズ2アクション発火`);
  else { console.error(`✗ ${boss.name}: フェーズ2アクションが発火しない`); failures++; }
  if (trueDamageDealt) console.log(`✓ ${boss.name}: 防御無視Trueダメージが貫通`);
  else { console.error(`✗ ${boss.name}: Trueダメージが確認できない`); failures++; }
}

// ── 固有トレイト (Unity版 Character/Traits) ─────────────────────────
{
  const check = (ok: boolean, label: string) => {
    if (ok) console.log(`✓ ${label}`);
    else { console.error(`✗ ${label}`); failures++; }
  };
  const lilia = CHARACTERS.find((c) => c.id === 'lilia')!;
  const zeno = CHARACTERS.find((c) => c.id === 'zeno')!;
  const mk = (ch: typeof lilia, keepTraits = true) => {
    const c = new Combatant({
      isPlayer: true, name: ch.name, characterId: ch.id,
      stats: { ...ch.baseStats, maxMP: 999, speed: 999, criticalRate: 0 },
      skills: ch.learnableSkills.filter((e) => !e.skill.isPassive).map((e) => e.skill),
    });
    c.mp = 999;
    if (!keepTraits) c.traits.clear();
    return c;
  };
  check(mk(lilia).traits.size === 3 && mk(zeno).traits.size === 3, 'リリア・ゼノに固有トレイトが3つずつ付く');
  check(makeEnemies([GOBLIN])[0].traits.size === 0, '敵にはトレイトが付かない');

  // 1回のスキル使用で対象に与えた平均ダメージ
  const avgDamage = (hero: () => Combatant, skillName: string, enemy: EnemyDef, prep?: (e: Combatant) => void) => {
    let total = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const h = hero();
      const skill = h.skills.find((s) => s.name === skillName)!;
      const enemies = makeEnemies([enemy]);
      enemies[0].base.maxHP = enemies[0].hp = 999999;
      prep?.(enemies[0]);
      const eng = new BattleEngine([h], enemies, 0);
      let st = eng.advance(); eng.drainEvents();
      while (st !== 'awaitInput' && !eng.over) { st = eng.advance(); eng.drainEvents(); }
      prep?.(enemies[0]);
      eng.executePlayerCommand({ type: 'skill', skill, targetIndex: 0, boostLevel: 0 });
      for (const e of eng.drainEvents()) if (e.kind === 'damage' && e.target === enemies[0]) { total += e.amount; break; }
    }
    return total / N;
  };

  // 聖光の加護: 光属性+40%、アンデッドに×1.5 → 防御差し引き前で×2.1。防御があるので比は2.1よりやや大きくなる
  const holyWith = avgDamage(() => mk(lilia), '聖光弾', ROTTING_ZOMBIE);
  const holyWithout = avgDamage(() => mk(lilia, false), '聖光弾', ROTTING_ZOMBIE);
  const holyRatio = holyWith / holyWithout;
  check(holyRatio > 1.9 && holyRatio < 2.6, `聖光の加護: アンデッドへの聖光弾 ×${holyRatio.toFixed(2)} (期待 約2.1〜2.4)`);

  // 呪詛増幅: 状態異常2種で+30%
  const twoDebuffs = (e: Combatant) => {
    e.statuses = [{ type: 'Poison', value: 0, remainingTurns: 9 }, { type: 'AtkDown', value: 0, remainingTurns: 9 }];
  };
  const curseWith = avgDamage(() => mk(zeno), '呪縛', GOBLIN, twoDebuffs);
  const curseBase = avgDamage(() => mk(zeno), '呪縛', GOBLIN);
  const curseRatio = curseWith / curseBase;
  check(curseRatio > 1.25, `呪詛増幅: 状態異常2種の敵へ ×${curseRatio.toFixed(2)} (期待 1.3以上)`);

  // 呪詛解放 (Web版で追加): 状態異常2種の敵へは威力 0.8 → 1.6 (2倍前後)
  const burstWith = avgDamage(() => mk(zeno), '呪詛解放', GOBLIN, twoDebuffs);
  const burstBase = avgDamage(() => mk(zeno), '呪詛解放', GOBLIN);
  const burstRatio = burstWith / burstBase;
  check(burstRatio > 1.9, `呪詛解放: 状態異常2種の敵へ ×${burstRatio.toFixed(2)} (期待 約2倍以上・呪詛増幅込み)`);

  // 吸収の代価: 吸収に成功すると、その技を即座に1回放つ
  {
    let freeCast = false;
    for (let i = 0; i < 30 && !freeCast; i++) {
      const z = mk(zeno);
      z.passives.add('SKL_Z_Passive_PriceOfAbsorption');
      const enemies = makeEnemies([GOBLIN, GOBLIN]);
      enemies[0].hp = 1;   // 吸収しやすくする
      enemies[1].base.maxHP = enemies[1].hp = 99999;
      const eng = new BattleEngine([z], enemies, 0);
      let st = eng.advance(); eng.drainEvents();
      while (st !== 'awaitInput' && !eng.over) { st = eng.advance(); eng.drainEvents(); }
      eng.executePlayerCommand({ type: 'skill', skill: z.skills.find((s) => s.name === '吸収')!, targetIndex: 0, boostLevel: 0 });
      freeCast = eng.drainEvents().some((e) => e.kind === 'message' && e.text.startsWith('吸収の代価'));
    }
    check(freeCast, '吸収の代価: 吸収成功後に刻んだ技を即座に放つ');
  }

  // 奇跡の手: 行動後に最もHPの低い味方を自動回復
  {
    const h = mk(lilia);
    h.hp = Math.round(h.base.maxHP * 0.5);
    const enemies = makeEnemies([GOBLIN]);
    enemies[0].base.maxHP = enemies[0].hp = 999999;
    const eng = new BattleEngine([h], enemies, 0);
    let st = eng.advance(); eng.drainEvents();
    while (st !== 'awaitInput' && !eng.over) { st = eng.advance(); eng.drainEvents(); }
    eng.executePlayerCommand({ type: 'attack', targetIndex: 0, boostLevel: 0 });
    const healed = eng.drainEvents().some((e) => e.kind === 'heal' && e.target === h);
    check(healed, '奇跡の手: 行動後に自動回復が発動');
  }

  // 影舞踊: アッシュの回避率+20%
  const ash = CHARACTERS.find((c) => c.id === 'ash')!;
  const ashC = new Combatant({ isPlayer: true, name: ash.name, characterId: 'ash', stats: { ...ash.baseStats } });
  check(Math.abs(ashC.dodgeBonus - 0.20) < 1e-9, '影舞踊: アッシュの回避率+20%');
}

// 撃破は1体につき1回だけ / 画面用の状態はイベントの時点の値 (レリックありの複数戦)
import { RelicBattleState } from './src/battle/relicHooks';
import { createRun } from './src/core/run';
{
  const check = (ok: boolean, label: string) => {
    if (ok) console.log(`✓ ${label}`);
    else { console.error(`✗ ${label}`); failures++; }
  };
  for (let trial = 0; trial < 30; trial++) {
    const run = createRun('bernhard', 1, 'VitalGuard');
    const char = CHARACTERS.find((c) => c.id === 'bernhard')!;
    const hero = new Combatant({ isPlayer: true, name: char.name, characterId: 'bernhard', stats: { ...char.baseStats, maxHP: 5000 } });
    const enemies = makeEnemies([GOBLIN, GOBLIN, ROTTING_ZOMBIE]);
    const eng = new BattleEngine([hero], enemies, 0, new RelicBattleState(run));
    eng.recordSnapshots = true;
    const defeats = new Map<Combatant, number>();
    let snapOk = true;
    let heroHpOk = true;
    let st = eng.advance();
    for (let guard = 0; guard < 400 && !eng.over; guard++) {
      let evs;
      if (st === 'awaitInput') {
        const before = hero.hp;
        st = eng.executePlayerCommand({ type: 'attack', targetIndex: enemies.findIndex((e) => e.isAlive), boostLevel: 0 });
        evs = eng.drainEvents();
        // 自分の攻撃が当たった時点では、まだ自分のHPは減っていない
        const firstHit = evs.find((e) => e.kind === 'damage' && !e.target.isPlayer);
        if (firstHit && eng.snapshotAt(firstHit)!.get(hero)!.hp !== before) heroHpOk = false;
      } else {
        st = eng.advance();
        evs = eng.drainEvents();
      }
      for (const e of evs) {
        if (e.kind === 'defeat') defeats.set(e.target, (defeats.get(e.target) ?? 0) + 1);
        const sn = eng.snapshotAt(e);
        if (!sn || sn.size !== 4) snapOk = false;
      }
    }
    if (![...defeats.values()].every((n) => n === 1)) check(false, `撃破は1体につき1回 (試行${trial})`);
    if (!snapOk) check(false, '各イベントに全員の状態が記録される');
    if (!heroHpOk) check(false, '自分の攻撃の時点では自分のHPは減っていない');
  }
  check(true, '撃破の重複なし・行動時点の状態の記録 (30戦)');
}

// 固有のパッシブ: キャラLv2・4・6で解放 / 元素共鳴 / 鷲の目
import { buildHero } from './src/battle/setup';
import { LAVINIA_SKILLS } from './src/data/skills';
import { RESONANCE_PASSIVE_ID, levelPassivesOf } from './src/data/levelPassives';
{
  const check = (ok: boolean, label: string) => {
    if (ok) console.log(`✓ ${label}`);
    else { console.error(`✗ ${label}`); failures++; }
  };
  const run = createRun('lilia', 1, 'VitalGuard');
  const t1 = buildHero(run).traits;
  check(t1.size === 1 && t1.has('MiracleHands'), 'リリアLv1: 奇跡の手だけ');
  run.characterLevel = 3;
  const t3 = buildHero(run).traits;
  check(t3.has('MiracleHands') && t3.has('PureheartHealer') && !t3.has('HolyGrace'), 'リリアLv3: 奇跡の手・清心の治癒師');
  run.characterLevel = 5;
  check(buildHero(run).traits.size === 3, 'リリアLv5: 3つすべて');
  const b = createRun('bernhard', 1, 'VitalGuard');
  const bp = buildHero(b).passives;
  check(bp.has('SKL_Passive_IronConstitution') && !bp.has('SKL_Passive_BattleHardened'), 'ベルンハルトLv1: 鋼の肉体だけ');
  const a = createRun('ash', 1, 'VitalGuard');
  a.characterLevel = 5;
  check(buildHero(a).passives.has('SKL_A_DarkVision'), 'アッシュLv5: 盗賊の技で暗視術 (盲目無効) も有効');
  // 職Lvでパッシブを覚えることはない
  check(CHARACTERS.every((c) => c.learnableSkills.every((e) => !e.skill.isPassive)), '職Lvで覚えるパッシブは無い');
  check(CHARACTERS.every((c) => levelPassivesOf(c.id).length === 3), '全キャラ、キャラLvのパッシブは3つ');

  // 元素共鳴: 炎 → 氷 で蒸気爆発 (+80%)、同じ属性を続けるとボーナスなし
  const lav = CHARACTERS.find((c) => c.id === 'lavinia')!;
  const mk = (withRes: boolean) => {
    const h = new Combatant({ isPlayer: true, name: lav.name, characterId: 'lavinia',
      stats: { ...lav.baseStats, maxMP: 999, speed: 999, criticalRate: 0 }, skills: [LAVINIA_SKILLS.fireBolt, LAVINIA_SKILLS.iceSpike],
      passives: new Set(withRes ? [RESONANCE_PASSIVE_ID] : []) });
    h.mp = 999;
    return h;
  };
  const dmgOf = (withRes: boolean) => {
    const h = mk(withRes);
    const target = makeEnemies([GARM])[0];
    target.base.maxHP = target.hp = 999999;
    const eng = new BattleEngine([h], [target], 0);
    let st = eng.advance(); eng.drainEvents();
    eng.executePlayerCommand({ type: 'skill', skill: LAVINIA_SKILLS.fireBolt, targetIndex: 0, boostLevel: 0 });
    eng.drainEvents();
    while (!eng.activeCombatant?.isPlayer && !eng.over) { st = eng.advance(); eng.drainEvents(); }
    const before = target.hp;
    eng.executePlayerCommand({ type: 'skill', skill: LAVINIA_SKILLS.iceSpike, targetIndex: 0, boostLevel: 0 });
    const evs = eng.drainEvents();
    return { dealt: before - target.hp, msg: evs.some((e) => e.kind === 'message' && e.text.includes('蒸気爆発')) };
  };
  let withSum = 0, withoutSum = 0, msg = false;
  for (let i = 0; i < 20; i++) { const w = dmgOf(true); withSum += w.dealt; msg ||= w.msg; withoutSum += dmgOf(false).dealt; }
  check(msg, '元素共鳴: 炎→氷で「蒸気爆発」');
  check(withSum > withoutSum * 1.5, `元素共鳴: 威力が上がる (${withoutSum} → ${withSum})`);
}

console.log(failures === 0 ? '\nALL OK' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);

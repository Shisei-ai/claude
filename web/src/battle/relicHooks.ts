// バトル内レリック効果 — Unity版 Roguelike/Relics/RelicManager.cs の移植
// エンジンから各タイミングで呼ばれる。1バトル = 1インスタンス。
import type { RunState } from '../core/run';
import { hasEffect, sumEffect, hasCurse, heldRelics } from '../core/relics';
import { battleRandom as rnd } from '../core/rng';
import type { ElementType, StatusEffectType } from '../core/types';
import type { Combatant } from './engine';

export class RelicBattleState {
  private run: RunState;

  // 1バトル1回系
  private firstHitUsed = false;
  private firstHitImmuneUsed = false;
  private reviveUsed = false;
  private freeBoostUsed = false;
  private echoUsed = false;
  private skillCopyAvailable = false;
  private jumpStartAvailable = false;

  // スタック・状態系
  private stackingRageStacks = 0;
  private adaptiveArmorStacks = 0;
  private critChainActive = false;
  private boostSurgeActive = false;
  private chainBonusActive = false;
  private chainSkillTurnCount = 0;
  private battleRhythmLastSkillId = '';
  private battleRhythmStreak = 0;
  private mirrorImageBonus = 0;
  private damageTakenCount = 0;
  private sacrificialBonusActive = false;
  private doubleOrNothingMult = 1;
  private randomSkillBuffArmed = false;
  private turnCount = 0;
  private lastBoostLevel = 0;
  private breakSealActive = false;

  // バリア (被ダメ吸収)
  private fortifiedWallBarrier = 0;
  private transcendenceBarrier = 0;
  private bossShieldBarrier = 0;

  constructor(run: RunState) {
    this.run = run;
    this.skillCopyAvailable = hasEffect(run, 'SkillCopy');
  }

  private has(e: Parameters<typeof hasEffect>[1]): boolean { return hasEffect(this.run, e); }
  private sum(e: Parameters<typeof sumEffect>[1]): number { return sumEffect(this.run, e); }

  // ── 戦闘開始時 (OnBattleStart) ────────────────────────────────────
  // 戻り値: UIメッセージ
  onBattleStart(heroes: Combatant[], enemies: Combatant[]): string[] {
    const msgs: string[] = [];
    const hero = heroes[0];

    // StartWithBP
    const bp = Math.round(this.sum('StartWithBP'));
    if (bp > 0) for (const h of heroes) h.addBP(bp);

    // HealAtBattleStart
    const healPct = this.sum('HealAtBattleStart');
    if (healPct > 0 && hero) {
      hero.heal(Math.round(hero.base.maxHP * healPct));
    }

    // 状態異常オーラ
    for (const e of enemies) {
      if (this.has('PoisonAura')) e.applyStatus({ type: 'Poison', duration: 3, value: 0.03 }, 1);
      if (this.has('BurnAura')) e.applyStatus({ type: 'Burn', duration: 3, value: 0.02 }, 1);
      if (this.has('ChillAura')) e.applyStatus({ type: 'Freeze', duration: 2, value: 0 }, 1);
    }
    if (this.has('PoisonAura')) msgs.push('瘴気が敵を蝕む…');
    if (this.has('BurnAura')) msgs.push('燃殻の火の粉が敵に降りかかる…');
    if (this.has('ChillAura')) msgs.push('霜の風鈴が鳴り、敵が凍りつく…');

    // 死印の烙印: 通常敵1体に死の宣告(2ターン)
    if (this.has('DeathMark')) {
      const target = enemies.find((e) => e.enemyDef?.rank === 'Normal' && e.isAlive);
      if (target) {
        target.applyStatus({ type: 'DeathSentence', duration: 3, value: 0.5 }, 1);
        msgs.push(`死印が${target.name}に刻まれた…`);
      }
    }

    // バリア系
    if (this.has('FortifiedWall') && hero) this.fortifiedWallBarrier = hero.base.maxHP * 0.10;
    if (this.has('Transcendence') && hero) this.transcendenceBarrier += hero.base.maxHP * 0.10;
    if (this.has('BossShield') && hero) {
      const hasBoss = enemies.some((e) =>
        e.enemyDef?.rank === 'Boss' || e.enemyDef?.rank === 'TrueFinalBoss');
      if (hasBoss) {
        this.bossShieldBarrier = hero.base.maxHP * 0.15;
        msgs.push('王盾の破片が輝き、バリアを張った！');
      }
    }

    // 生贄の祭壇石: HP-30% / 戦闘中+60%
    if (this.has('SacrificialPact') && hero) {
      const cost = Math.round(hero.base.maxHP * 0.30);
      hero.hp = Math.max(1, hero.hp - cost);
      this.sacrificialBonusActive = true;
      msgs.push(`祭壇が血を要求した… (HP-${cost})`);
    }

    // 両面のコイン
    if (this.has('DoubleOrNothing')) {
      this.doubleOrNothingMult = rnd.value() < 0.5 ? 2 : 0.5;
      msgs.push(this.doubleOrNothingMult === 2
        ? 'コインは表！ 与ダメージ2倍！' : 'コインは裏… 与ダメージ半減…');
    }

    if (this.has('JumpStart')) this.jumpStartAvailable = true;
    if (this.has('StartWithFullMP') && hero) hero.mp = hero.base.maxMP;

    return msgs;
  }

  // ── ヒーローのターン開始時 (OnTurnStart) ──────────────────────────
  // 戻り値: [heal, selfDamage, enemyDrainTotal]
  onHeroTurnStart(hero: Combatant, enemies: Combatant[]): { heal: number; selfDamage: number } {
    this.turnCount++;
    this.randomSkillBuffArmed = this.has('RandomSkillBuff');

    let heal = 0;
    let selfDamage = 0;

    const regenPct = this.sum('RegenEachTurn');
    if (regenPct > 0) heal += Math.max(1, Math.round(hero.base.maxHP * regenPct));

    const mpRegen = Math.round(this.sum('MPRegenEachTurn'));
    if (mpRegen > 0) hero.mp = Math.min(hero.base.maxMP, hero.mp + mpRegen);

    if (this.has('BreakRegen') && enemies.some((e) => e.isAlive && e.isBroken)) {
      heal += Math.max(1, Math.round(hero.base.maxHP * 0.05));
    }

    if (this.has('HungryBlade')) selfDamage += 5;
    if (this.has('BloodPact')) selfDamage += Math.max(1, Math.round(hero.base.maxHP * 0.03));

    // 蛭の王冠: 全敵から1%吸収
    if (this.has('LifeDrain')) {
      for (const e of enemies) {
        if (!e.isAlive) continue;
        const drain = Math.max(1, Math.round(e.base.maxHP * 0.01));
        e.hp = Math.max(0, e.hp - drain);
        heal += drain;
      }
    }

    hero.heal(heal);
    hero.hp = Math.max(1, hero.hp - selfDamage);   // レリック自傷では死なない
    return { heal, selfDamage };
  }

  // ── 与ダメージ補正 (ModifyOutgoingDamage) ─────────────────────────
  modifyOutgoingDamage(
    hero: Combatant, target: Combatant, rawDamage: number, element: ElementType,
    activeSkillCount: number,
  ): number {
    let mult = 1;
    rawDamage += Math.round(this.sum('FlatDamageUp'));
    mult += this.sum('PercentDamageUp') / 100;

    if (!this.firstHitUsed && this.has('FirstHitDoubleDamage')) {
      mult *= 2;
      this.firstHitUsed = true;
    }

    const hpRatio = hero.hpRatio;
    if (hpRatio < 0.5 && this.has('LastStandDamage')) mult += this.sum('LastStandDamage') / 100;
    if (this.has('BerserkerRage')) mult += (1 - hpRatio) * 1.5;
    if (this.has('ForbiddenGrimoire')) mult *= 2;

    // 属性ボーナス
    const elemEffect: Partial<Record<ElementType, Parameters<typeof sumEffect>[1]>> = {
      Fire: 'FireDamageUp', Ice: 'IceDamageUp', Lightning: 'LightningDamageUp',
      Dark: 'DarkDamageUp', Light: 'LightDamageUp', Poison: 'PoisonDamageUp',
      Bleed: 'BleedDamageUp',
    };
    const ee = elemEffect[element];
    if (ee) mult += this.sum(ee) / 100;

    if (target.isBroken) {
      mult += this.sum('BonusDamageOnBreak') / 100;
      mult += this.sum('BreakDamageBonus') / 100;
    }

    if (this.turnCount <= 1 && this.has('FirstTurnBoost')) mult += 0.50;

    if (this.has('StackingRage')) {
      mult += this.stackingRageStacks * 0.03;
      this.stackingRageStacks = Math.min(10, this.stackingRageStacks + 1);
    }

    if (this.has('NecroticPower')) mult += Math.min(0.40, this.run.enemiesKilled * 0.02);
    if (this.has('SpiritualBalance')) mult += Math.max(-0.30, Math.min(0.30, this.run.sanity * 0.10));
    if (this.has('PoisonMaster') && target.hasStatus('Poison')) mult += 0.30;
    if (this.has('BleedMaster') && target.hasStatus('Bleed')) mult += 0.30;
    if (this.has('Opportunist') && target.statuses.length > 0) mult += 0.20;
    if (this.has('CurseWeaver')) mult += this.run.curses.length * 0.10;
    if (this.has('SpecializedDeck') && activeSkillCount <= 10) mult += 0.20;

    if (this.boostSurgeActive) { mult += 0.30; this.boostSurgeActive = false; }
    if (this.chainBonusActive) { mult *= 2; this.chainBonusActive = false; }

    rawDamage += Math.round(this.mirrorImageBonus);
    this.mirrorImageBonus = 0;

    if (this.has('SurgeProtection') && this.damageTakenCount >= 3) mult += 0.30;
    if (this.has('CorruptedCore')) mult += 0.50;
    if (this.has('GlassCannon')) mult += 0.80;
    if (this.has('BloodPact') && hpRatio <= 0.5) mult += 1.00;
    if (this.has('ChaosCore')) mult += rnd.float(-0.30, 0.30);
    if (this.has('HungryBlade')) mult += 0.40;
    if (this.sacrificialBonusActive) mult += 0.60;
    if (this.has('MirrorCurse')) mult += this.run.curses.length * 0.15;
    mult *= this.doubleOrNothingMult;
    if (this.has('CursedButPowerful') && this.run.curses.length > 0) mult += 0.30;

    if (this.lastBoostLevel > 0 && this.has('BoostDamageMultiplier')) {
      mult += (this.sum('BoostDamageMultiplier') / 100) * this.lastBoostLevel;
    }

    // 道化の五面体: 毎ターン最初のスキル+50%
    if (this.randomSkillBuffArmed) {
      mult *= 1.50;
      this.randomSkillBuffArmed = false;
    }

    // 満溢の杯: MP満タンで+20%
    if (this.has('ManaOverflow') && hero.mp >= hero.base.maxMP) mult += 0.20;

    return Math.max(1, Math.round(rawDamage * mult));
  }

  // ── 被ダメージ補正 (ModifyIncomingDamage) ─────────────────────────
  // 戻り値: [補正後ダメージ, メッセージ, counterDamage(全敵への反撃)]
  modifyIncomingDamage(hero: Combatant, rawDamage: number): {
    damage: number; messages: string[]; counterDamage: number;
  } {
    const messages: string[] = [];
    let dmg = rawDamage;

    dmg = Math.round(dmg * (1 - this.sum('PercentDamageReduction') / 100));
    dmg -= Math.round(this.sum('FlatDefenseUp'));

    if (!this.firstHitImmuneUsed && this.has('FirstHitImmune')) {
      this.firstHitImmuneUsed = true;
      messages.push('朝露の雫が最初の一撃を受け流した！');
      return { damage: 0, messages, counterDamage: 0 };
    }

    if (this.has('DeathMark')) dmg = Math.round(dmg * 1.25);
    if (hasCurse(this.run, 'FragileHP')) {
      dmg = Math.round(dmg * (1 + 0.10 * (1 - this.run.metaCurseDmgReduction)));
    }
    if (this.has('GlassCannon')) dmg = Math.round(dmg * 1.60);
    if (this.has('LastStandGuard') && hero.hpRatio <= 0.20) dmg = Math.round(dmg * 0.60);

    if (this.has('AdaptiveArmor')) {
      if (this.adaptiveArmorStacks > 0) {
        dmg = Math.round(dmg * (1 - this.adaptiveArmorStacks * 0.03));
      }
      this.adaptiveArmorStacks = Math.min(10, this.adaptiveArmorStacks + 1);
    }

    if (this.has('DamageCap')) dmg = Math.min(dmg, Math.round(hero.base.maxHP * 0.20));

    // バリア吸収 (塁壁 → ボス盾 → 礎石 → 光輪 の順)
    const absorbFrom = (barrier: number): [number, number] => {
      const absorbed = Math.min(barrier, dmg);
      dmg -= Math.round(absorbed);
      return [barrier - absorbed, absorbed];
    };
    let a: number;
    if (this.fortifiedWallBarrier > 0) { [this.fortifiedWallBarrier, a] = absorbFrom(this.fortifiedWallBarrier); }
    if (this.bossShieldBarrier > 0) { [this.bossShieldBarrier, a] = absorbFrom(this.bossShieldBarrier); }
    if (this.run.shieldBarrier > 0) { [this.run.shieldBarrier, a] = absorbFrom(this.run.shieldBarrier); }
    if (this.transcendenceBarrier > 0) { [this.transcendenceBarrier, a] = absorbFrom(this.transcendenceBarrier); }

    // 沈黙の枷: Break直後の敵の攻撃を無効化
    if (this.breakSealActive) {
      this.breakSealActive = false;
      messages.push('沈黙の枷が敵の一撃を封じた！');
      dmg = 0;
    }

    // 黄金の盾: ゴールドで相殺 (最大50G)
    if (dmg > 0 && this.has('GoldShield') && this.run.gold > 0) {
      const absorb = Math.min(dmg, Math.min(50, this.run.gold));
      this.run.gold -= absorb;
      dmg -= absorb;
      if (absorb > 0) messages.push(`黄金の盾が${absorb}Gでダメージを相殺！`);
    }

    if (this.has('MirrorImage')) this.mirrorImageBonus += dmg * 0.25;
    this.damageTakenCount++;

    // 怨霊の壺: 15%で全敵に最大HP10%の反撃
    let counterDamage = 0;
    if (this.has('Counterstrike') && rnd.value() < 0.15) {
      counterDamage = Math.round(hero.base.maxHP * 0.10);
    }

    return { damage: Math.max(0, dmg), messages, counterDamage };
  }

  // ── ダメージ確定後 (OnDamageDealt: 敵に与えた時) ───────────────────
  onDamageDealt(hero: Combatant, target: Combatant, amount: number): { heal: number; statuses: StatusEffectType[] } {
    let heal = 0;
    const statuses: StatusEffectType[] = [];

    if (this.has('VampiricBlade')) {
      heal = Math.round(amount * 0.2);
      hero.heal(heal);
    }
    if (!target.isPlayer && target.isAlive) {
      if (this.has('BleedOnCrit') && rnd.value() < 0.15) {
        if (target.applyStatus({ type: 'Bleed', duration: 2, value: 0.04 }, 1)) statuses.push('Bleed');
      }
      if (this.has('ThunderMark') && rnd.value() < 0.20) {
        if (target.applyStatus({ type: 'Paralysis', duration: 1, value: 0 }, 1)) statuses.push('Paralysis');
      }
    }
    return { heal, statuses };
  }

  // ── Break発生時 ────────────────────────────────────────────────────
  onEnemyBroken(heroes: Combatant[]): string[] {
    const msgs: string[] = [];
    if (this.has('BPOnBreak')) {
      for (const h of heroes) if (h.isAlive) h.addBP(2);
      msgs.push('破砕者の勲章が輝く！ BP+2');
    }
    if (this.has('BreakSeal')) this.breakSealActive = true;
    return msgs;
  }

  // ── 敵撃破時 (OnCharacterDefeated) ─────────────────────────────────
  // 戻り値: soulSiphonレリック獲得の要求
  onEnemyKilled(heroes: Combatant[]): { heal: number; soulReward: boolean } {
    let heal = 0;
    const healPct = this.sum('OnKillHeal');
    const hero = heroes[0];
    if (healPct > 0 && hero?.isAlive) {
      heal = Math.max(1, Math.round(hero.base.maxHP * healPct));
      hero.heal(heal);
    }
    if (this.has('OnKillBP')) {
      for (const h of heroes) if (h.isAlive) h.addBP(1);
    }

    let soulReward = false;
    if (this.has('SoulSiphon')) {
      this.run.soulSiphonCount++;
      if (this.run.soulSiphonCount >= 10) {
        this.run.soulSiphonCount = 0;
        soulReward = true;
      }
    }
    return { heal, soulReward };
  }

  // ── 復活判定 (TryRevive) ───────────────────────────────────────────
  tryRevive(hero: Combatant): boolean {
    if (this.reviveUsed || !this.has('ReviveOnce')) return false;
    this.reviveUsed = true;
    hero.hp = Math.max(1, Math.round(hero.base.maxHP * 0.01));
    return true;
  }

  // ── Break系 ────────────────────────────────────────────────────────
  breakShieldDamageBonus(): number {
    let bonus = 0;
    if (this.has('ShieldHitBonus')) bonus += 1;
    if (this.has('QuickBreak')) bonus += 1;
    return bonus;
  }

  breakExtendTurns(): number { return this.has('BreakExtend') ? 1 : 0; }
  hasAoEShieldDamage(): boolean { return this.has('AoEShieldDamage'); }
  hasWeaknessReveal(): boolean { return this.has('WeaknessReveal'); }

  // ── スキル系 ───────────────────────────────────────────────────────
  modifySkillMPCost(baseCost: number): number {
    let cost = baseCost;
    if (this.has('ForbiddenGrimoire')) cost *= 2;
    if (hasCurse(this.run, 'SkillCostUp')) cost += 1;
    cost -= Math.round(this.sum('SkillMPDiscount'));

    // 起動石: 戦闘最初のスキル無料
    if (this.jumpStartAvailable) {
      this.jumpStartAvailable = false;
      return 0;
    }
    // 虚無の小袋: 確率でコスト0
    const negate = this.sum('NegateSkillCost');
    if (negate > 0 && rnd.value() < negate) return 0;

    return Math.max(0, cost);
  }

  /** スキル発動後: エコー/コピーで再発動するか + BattleRhythm倍率 */
  onSkillUsed(skillId: string, hero: Combatant): { repeat: boolean; rhythmMult: number; selfDamage: number } {
    let rhythmMult = 1;
    if (this.has('BattleRhythm')) {
      if (skillId && skillId === this.battleRhythmLastSkillId) {
        this.battleRhythmStreak++;
        if (this.battleRhythmStreak >= 1) rhythmMult = 1.50;
      } else {
        this.battleRhythmStreak = 0;
      }
      this.battleRhythmLastSkillId = skillId;
    }

    this.chainSkillTurnCount++;
    if (this.chainSkillTurnCount >= 3 && this.has('ChainBonus')) this.chainBonusActive = true;

    let selfDamage = 0;
    if (this.has('CorruptedCore')) {
      selfDamage = 5;
      hero.hp = Math.max(1, hero.hp - 5);
    }

    // 残響水晶 / 双詠の護符: 1戦闘1回の再発動
    let repeat = false;
    if (!this.echoUsed && this.has('EchoSkill')) {
      this.echoUsed = true;
      repeat = true;
    } else if (this.skillCopyAvailable && this.has('SkillCopy')) {
      this.skillCopyAvailable = false;
      repeat = true;
    }

    return { repeat, rhythmMult, selfDamage };
  }

  // ── 会心系 ─────────────────────────────────────────────────────────
  critRateBonus(): number {
    let bonus = 0;
    if (this.critChainActive && this.has('CritChain')) {
      this.critChainActive = false;
      bonus += Math.round(this.sum('CritChain'));
    }
    return bonus;
  }

  critDamageBonus(): number { return this.sum('CritDamageUp') / 100; }

  notifyCriticalHit(): void {
    if (this.has('CritChain')) this.critChainActive = true;
  }

  tryExtraHitOnCrit(): boolean {
    return this.has('ExtraHitOnCrit') && rnd.value() < 0.40;
  }

  tryShadowStrike(): boolean {
    return this.has('ShadowStrike') && rnd.value() < 0.25;
  }

  tryExecuteLowHP(target: Combatant): boolean {
    return !target.isPlayer && this.has('ExecuteLowHP') && target.hpRatio <= 0.10;
  }

  tryExecuteOnBreak(target: Combatant): boolean {
    return !target.isPlayer && this.has('ExecuteOnBreak')
      && target.isBroken && target.hpRatio <= 0.20;
  }

  // ── 回避系 ─────────────────────────────────────────────────────────
  evasionBonus(): number {
    let e = this.sum('EvasionUp') / 100;
    if (this.has('LuckyDodge')) {
      e += Math.max(0, Math.min(30, Math.round(sumEffect(this.run, 'LuckUp')))) * 0.003;
    }
    return e;
  }

  // ── BP / ブースト系 ────────────────────────────────────────────────
  bpGainBonus(): number { return Math.round(this.sum('BPGainUp')); }
  maxBPBonus(): number { return Math.round(this.sum('MaxBPUp')); }

  /** ブースト実行時のBP消費を返す (EfficientBoost / BoostFree) */
  boostBPCost(level: number): number {
    if (level <= 0) return 0;
    let cost = level;
    if (this.has('EfficientBoost')) cost = Math.max(1, cost - 1);
    if (!this.freeBoostUsed && this.has('BoostFree')) {
      this.freeBoostUsed = true;
      return 0;
    }
    return cost;
  }

  notifyBoostUsed(level: number): void {
    this.lastBoostLevel = level;
    if (this.has('BoostSurge')) this.boostSurgeActive = true;
  }

  boostBuffExtendTurns(): number { return this.has('BoostExtend') ? 1 : 0; }

  // ── 状態異常無効 ───────────────────────────────────────────────────
  isImmuneToStatus(type: StatusEffectType): boolean {
    return heldRelics(this.run).some(
      (r) => r.effect === 'StatusImmunity' && r.immuneStatus === type);
  }
}

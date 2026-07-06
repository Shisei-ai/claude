// バトルエンジン — Unity版 Battle/BattleCharacter.cs + BattleManager.cs の移植
//
// ダメージ式:   RAW  = ATK × power × critMult × elemMult × var(0.9-1.1)
//               DEALT = max(1, RAW − DEF)   / True は防御無視 / Break中 ×1.5
// 会心倍率:     物理 2.0 / 魔法 1.5
// ターン順:     ターンゲージ (速度で加算、100で行動)
// BP:           敵の手番終了ごとに味方全員 +1 (最大5)。1行動で最大3ブースト。
// Break:        弱点属性ヒットでシールド-1 (CanBreakスキルは指定数)。
//               0でBreak → 2ターン気絶 + 被ダメ1.5倍 → シールド全回復
import type {
  CharacterStats, DamageType, ElementType, EnemyDef, SkillDef,
  StatusEffect, StatusEffectType,
} from '../core/types';
import { STATUS_DISPLAY_NAME } from '../core/types';
import { battleRandom as rnd } from '../core/rng';

const BREAK_STUN_TURNS = 2;
const MAX_BP = 5;

// ── 戦闘中の1体 ─────────────────────────────────────────────────────────

export interface ActiveStatus {
  type: StatusEffectType;
  value: number;
  remainingTurns: number;
}

export class Combatant {
  isPlayer: boolean;
  name: string;
  base: CharacterStats;
  enemyDef?: EnemyDef;
  skills: SkillDef[];
  passives: Set<string>;

  hp: number;
  mp: number;
  bp = 0;
  currentBoost = 0;

  maxShields = 0;
  currentShields = 0;
  brokenTurnsRemaining = 0;

  statuses: ActiveStatus[] = [];
  turnGauge = 0;

  // パッシブ用の戦闘内状態
  battleHardenedStacks = 0;   // 歴戦の鎧
  indomitableUsed = false;    // 不撓不屈

  constructor(opts: {
    isPlayer: boolean; name: string; stats: CharacterStats;
    enemyDef?: EnemyDef; skills?: SkillDef[]; passives?: Set<string>;
    initialHP?: number; shields?: number;
  }) {
    this.isPlayer = opts.isPlayer;
    this.name = opts.name;
    this.base = { ...opts.stats };
    this.enemyDef = opts.enemyDef;
    this.skills = opts.skills ?? [];
    this.passives = opts.passives ?? new Set();
    this.hp = opts.initialHP ?? this.base.maxHP;
    this.mp = this.base.maxMP;
    if (!opts.isPlayer) {
      this.maxShields = opts.shields ?? 0;
      this.currentShields = this.maxShields;
    }
  }

  get isAlive(): boolean { return this.hp > 0; }
  get isBroken(): boolean { return !this.isPlayer && this.maxShields > 0 && this.currentShields <= 0; }
  get isSilenced(): boolean { return this.hasStatus('Silence'); }
  get hpRatio(): number { return this.hp / this.base.maxHP; }

  private statusStatBonus(base: number, up: StatusEffectType, down: StatusEffectType): number {
    let pct = 0;
    for (const s of this.statuses) {
      if (s.type === up) pct += s.value;
      else if (s.type === down) pct -= s.value;
    }
    return Math.round(base * pct);
  }

  get patk(): number { return Math.max(1, this.base.physicalAttack + this.statusStatBonus(this.base.physicalAttack, 'AtkUp', 'AtkDown')); }
  get matk(): number { return Math.max(1, this.base.magicAttack + this.statusStatBonus(this.base.magicAttack, 'MatkUp', 'MatkDown')); }
  get pdef(): number {
    let d = this.base.physicalDefense + this.statusStatBonus(this.base.physicalDefense, 'DefUp', 'DefDown');
    // 歴戦の鎧: 被弾ごとに物理防御+3% (最大5スタック)
    d += Math.round(this.base.physicalDefense * 0.03 * this.battleHardenedStacks);
    return Math.max(0, d);
  }
  get mdef(): number { return Math.max(0, this.base.magicDefense + this.statusStatBonus(this.base.magicDefense, 'DefUp', 'DefDown')); }
  get speed(): number { return Math.max(1, this.base.speed + this.statusStatBonus(this.base.speed, 'SpdUp', 'SpdDown')); }
  get crit(): number { return Math.max(0, Math.min(100, this.base.criticalRate)); }
  get accuracy(): number { return Math.max(0, Math.min(100, this.base.accuracyRate)); }

  hasStatus(type: StatusEffectType): boolean {
    return this.statuses.some((s) => s.type === type);
  }

  applyStatus(effect: StatusEffect, chance: number): boolean {
    if (rnd.value() > chance) return false;
    this.statuses = this.statuses.filter((s) => s.type !== effect.type);
    this.statuses.push({ type: effect.type, value: effect.value, remainingTurns: effect.duration });
    return true;
  }

  /** DoT/HoT を処理して [dot, hot] を返す */
  tickStatuses(): [number, number] {
    let dot = 0;
    let hot = 0;
    for (const s of this.statuses) {
      switch (s.type) {
        case 'Poison':
        case 'Bleed':
        case 'Burn': {
          let dmg = Math.max(1, Math.round(this.base.maxHP * s.value));
          // 鋼の肉体: 毒・出血ダメージ30%軽減
          if ((s.type === 'Poison' || s.type === 'Bleed') && this.passives.has('SKL_Passive_IronConstitution')) {
            dmg = Math.max(1, Math.round(dmg * 0.7));
          }
          dot += dmg;
          break;
        }
        case 'Regen':
          hot += Math.max(1, Math.round(this.base.maxHP * s.value));
          break;
      }
      s.remainingTurns--;
    }
    this.statuses = this.statuses.filter((s) => s.remainingTurns > 0);
    this.hp = Math.max(0, this.hp - dot);
    this.hp = Math.min(this.base.maxHP, this.hp + hot);
    return [dot, hot];
  }

  takeDamage(raw: number, type: DamageType, ignoreDefPct = 0): number {
    if (!this.isAlive) return 0;
    const defense = type === 'Physical' ? this.pdef : this.mdef;
    const effectiveDef = type === 'True' ? 0 : Math.round(defense * (1 - Math.min(1, ignoreDefPct)));
    let damage = Math.max(1, raw - effectiveDef);
    if (this.isBroken) damage = Math.round(damage * 1.5);
    this.hp = Math.max(0, this.hp - damage);
    return damage;
  }

  heal(amount: number): number {
    if (!this.isAlive) return 0;
    const healed = Math.min(amount, this.base.maxHP - this.hp);
    this.hp += healed;
    return healed;
  }

  addBP(amount = 1): void { this.bp = Math.min(MAX_BP, this.bp + amount); }

  useBoost(boosts: number): boolean {
    if (this.bp < boosts || this.currentBoost + boosts > 3) return false;
    this.bp -= boosts;
    this.currentBoost += boosts;
    return true;
  }

  /** 弱点属性ヒット → シールド削り。Breakした瞬間 true */
  hitShield(shieldDamage = 1): boolean {
    if (this.isPlayer || this.maxShields <= 0 || this.isBroken) return false;
    this.currentShields = Math.max(0, this.currentShields - shieldDamage);
    if (this.currentShields === 0) {
      this.brokenTurnsRemaining = BREAK_STUN_TURNS;
      return true;
    }
    return false;
  }

  tickBreak(): void {
    if (!this.isBroken) return;
    this.brokenTurnsRemaining--;
    if (this.brokenTurnsRemaining <= 0) this.currentShields = this.maxShields;
  }

  restoreShields(amount: number): void {
    if (this.isPlayer) return;
    this.currentShields = Math.min(this.maxShields, this.currentShields + amount);
  }
}

// ── バトルイベント (UI側が逐次アニメーション) ──────────────────────────

export type BattleEvent =
  | { kind: 'message'; text: string }
  | { kind: 'damage'; target: Combatant; amount: number; isCrit: boolean; isWeak: boolean }
  | { kind: 'heal'; target: Combatant; amount: number }
  | { kind: 'status'; target: Combatant; status: StatusEffectType; applied: boolean }
  | { kind: 'break'; target: Combatant }
  | { kind: 'shieldHit'; target: Combatant }
  | { kind: 'defeat'; target: Combatant }
  | { kind: 'skillUse'; user: Combatant; skillName: string }
  | { kind: 'dot'; target: Combatant; amount: number }
  | { kind: 'victory' }
  | { kind: 'defeat_party' };

export interface PlayerCommand {
  type: 'attack' | 'skill';
  skill?: SkillDef;
  targetIndex: number;   // 敵index / 味方対象は無視(単独パーティ)
  boostLevel: number;    // 0-3
}

// ── エンジン本体 ────────────────────────────────────────────────────────

export class BattleEngine {
  heroes: Combatant[];
  enemies: Combatant[];
  events: BattleEvent[] = [];
  over: 'victory' | 'defeat' | null = null;
  activeCombatant: Combatant | null = null;

  constructor(heroes: Combatant[], enemies: Combatant[], startBP = 0) {
    this.heroes = heroes;
    this.enemies = enemies;
    for (const h of heroes) h.addBP(startBP);
  }

  get all(): Combatant[] { return [...this.heroes, ...this.enemies]; }

  private emit(e: BattleEvent): void { this.events.push(e); }

  /** イベントを取り出してクリア */
  drainEvents(): BattleEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /**
   * 次にプレイヤー入力が必要になるまで進める。
   * 戻り値: 'awaitInput' = プレイヤーの手番 / 'over' = 決着
   */
  advance(): 'awaitInput' | 'over' {
    while (!this.over) {
      // ターンゲージを最速到達まで一括加算
      while (!this.all.some((c) => c.isAlive && c.turnGauge >= 100)) {
        for (const c of this.all) {
          if (c.isAlive) c.turnGauge += c.speed;
        }
      }

      const actor = this.all
        .filter((c) => c.isAlive && c.turnGauge >= 100)
        .sort((a, b) => b.turnGauge - a.turnGauge || b.speed - a.speed)[0];
      actor.turnGauge -= 100;
      this.activeCombatant = actor;

      // DoT/HoT
      const [dot, hot] = actor.tickStatuses();
      if (dot > 0) this.emit({ kind: 'dot', target: actor, amount: dot });
      if (hot > 0) this.emit({ kind: 'heal', target: actor, amount: hot });

      if (!actor.isAlive) {
        this.handleDefeat(actor);
        if (this.checkEnd()) return 'over';
        continue;
      }

      actor.tickBreak();

      const stunned =
        actor.hasStatus('Sleep') || actor.hasStatus('Paralysis') ||
        actor.hasStatus('ActionSeal') || actor.hasStatus('Freeze') ||
        (actor.isBroken && !actor.isPlayer);
      if (stunned) {
        if (actor.isBroken && !actor.isPlayer) {
          this.emit({ kind: 'message', text: `${actor.name} はBreak中で動けない！` });
        } else {
          this.emit({ kind: 'message', text: `${actor.name} は行動できない！` });
        }
        this.afterAction(actor);
        if (this.checkEnd()) return 'over';
        continue;
      }

      if (actor.isPlayer) {
        return 'awaitInput';
      }

      this.enemyTurn(actor);
      this.afterAction(actor);
      if (this.checkEnd()) return 'over';
    }
    return 'over';
  }

  /** プレイヤーコマンド実行後、次の入力待ちまで進める */
  executePlayerCommand(cmd: PlayerCommand): 'awaitInput' | 'over' {
    const hero = this.activeCombatant;
    if (!hero || !hero.isPlayer) return this.over ? 'over' : 'awaitInput';

    if (cmd.boostLevel > 0) hero.useBoost(cmd.boostLevel);

    if (cmd.type === 'attack') {
      this.executeBasicAttack(hero, cmd.targetIndex, cmd.boostLevel);
    } else if (cmd.skill) {
      this.executeSkill(hero, cmd.skill, cmd.targetIndex, cmd.boostLevel);
    }

    hero.currentBoost = 0;
    this.afterAction(hero);
    if (this.checkEnd()) return 'over';
    return this.advance();
  }

  private afterAction(actor: Combatant): void {
    // 敵の手番終了 → 味方全員 BP+1 (BattleManager MainFlow)
    if (!actor.isPlayer) {
      for (const h of this.heroes) if (h.isAlive) h.addBP(1);
    }
  }

  private checkEnd(): boolean {
    if (this.enemies.every((e) => !e.isAlive)) {
      this.over = 'victory';
      this.emit({ kind: 'victory' });
      return true;
    }
    if (this.heroes.every((h) => !h.isAlive)) {
      this.over = 'defeat';
      this.emit({ kind: 'defeat_party' });
      return true;
    }
    return false;
  }

  // ── 通常攻撃 (威力1.0 × (1+boost)ヒット / Physical属性でBreak判定) ──
  private executeBasicAttack(attacker: Combatant, targetIndex: number, boostLevel: number): void {
    const foes = attacker.isPlayer ? this.enemies : this.heroes;
    let target = foes[targetIndex];
    if (!target?.isAlive) target = foes.find((f) => f.isAlive)!;
    if (!target) return;

    this.emit({ kind: 'skillUse', user: attacker, skillName: '攻撃' });
    const hitCount = 1 + boostLevel;
    for (let hit = 0; hit < hitCount; hit++) {
      if (!target.isAlive) break;
      this.dealHit(attacker, target, 1.0, 'Physical', 'Physical', 0, 0);
      this.tryBreakShield(attacker, target, 'Physical', 1);
    }
  }

  // ── スキル実行 ─────────────────────────────────────────────────────
  private executeSkill(user: Combatant, skill: SkillDef, targetIndex: number, boostLevel: number): void {
    if (user.isPlayer && skill.mpCost > 0) {
      if (user.mp < skill.mpCost) return;
      user.mp -= skill.mpCost;
    }

    // ブースト強化 (BoostSkillResolver.Default: 威力 ×(1+0.5×level))
    // ※ スキル個別のブーストテーブルはフェーズ2で移植
    const boostPowerMult = 1 + boostLevel * 0.5;

    this.emit({ kind: 'skillUse', user, skillName: skill.name });

    // 回復
    if (skill.isHeal) {
      const targets = skill.hitsAllAllies
        ? (user.isPlayer ? this.heroes : this.enemies).filter((c) => c.isAlive)
        : [user.isPlayer ? this.heroes[0] : user];
      for (const t of targets) {
        // HealPower <1 は MaxHP比 / >=1 は固定値+魔攻スケール (Unity版準拠)
        const amount = skill.healPower < 1
          ? Math.round(t.base.maxHP * skill.healPower * boostPowerMult)
          : Math.round((skill.healPower + user.matk * 0.5) * boostPowerMult);
        const healed = t.heal(amount);
        if (healed > 0) this.emit({ kind: 'heal', target: t, amount: healed });
      }
    }

    // バフ
    if (skill.buff) {
      for (const b of skill.buff) {
        const targets = b.toAllAllies
          ? (user.isPlayer ? this.heroes : this.enemies).filter((c) => c.isAlive)
          : [user];
        for (const t of targets) {
          t.applyStatus({ type: b.type, duration: b.duration + (boostLevel >= 1 ? boostLevel : 0), value: b.value }, 1);
          this.emit({ kind: 'status', target: t, status: b.type, applied: true });
        }
      }
    }

    // 清浄 (リリア): 状態異常全解除
    if (skill.id === 'SKL_L2_Purify') {
      const t = user.isPlayer ? this.heroes[0] : user;
      t.statuses = t.statuses.filter((s) =>
        ['AtkUp', 'MatkUp', 'DefUp', 'SpdUp', 'Regen'].includes(s.type));
      this.emit({ kind: 'message', text: `${t.name} の状態異常が浄化された` });
    }

    // 攻撃
    if (skill.basePower > 0 || skill.appliedStatus || skill.debuff) {
      const foes = user.isPlayer ? this.enemies : this.heroes;
      const targets = skill.hitsAllEnemies
        ? foes.filter((f) => f.isAlive)
        : (() => {
            let t = foes[targetIndex];
            if (!t?.isAlive) t = foes.find((f) => f.isAlive)!;
            return t ? [t] : [];
          })();

      for (const target of targets) {
        if (!target.isAlive) continue;

        if (skill.basePower > 0) {
          for (let hit = 0; hit < skill.hitCount; hit++) {
            if (!target.isAlive) break;
            this.dealHit(
              user, target,
              skill.basePower * boostPowerMult,
              skill.damageType, skill.element,
              skill.critBonus ?? 0,
              0,
              skill,
            );
            // Break判定: CanBreakスキルは指定削り数 / それ以外は弱点属性で1
            if (skill.canBreak) {
              this.tryBreakShield(user, target, skill.element, skill.shieldDamage ?? 1, true);
            } else {
              this.tryBreakShield(user, target, skill.element, 1);
            }
          }
        }

        if (target.isAlive && skill.appliedStatus && skill.statusChance) {
          const applied = target.applyStatus(skill.appliedStatus, skill.statusChance + boostLevel * 0.1);
          this.emit({ kind: 'status', target, status: skill.appliedStatus.type, applied });
        }

        if (target.isAlive && skill.debuff) {
          for (const d of skill.debuff) {
            target.applyStatus({ type: d.type, duration: d.duration, value: d.value }, 1);
            this.emit({ kind: 'status', target, status: d.type, applied: true });
          }
        }
      }
    }
  }

  // ── 1ヒットのダメージ処理 (ComputeRawDamage + ApplyDamageToTarget) ──
  private dealHit(
    attacker: Combatant, target: Combatant,
    power: number, dmgType: DamageType, element: ElementType,
    critBonus: number, ignoreDefPct: number,
    skill?: SkillDef,
  ): void {
    // 命中判定 (プレイヤーのみ回避可 — Unity版の非対称設計)
    if (target.isPlayer) {
      let hitChance = attacker.accuracy / 100;
      if (attacker.hasStatus('Blind')) hitChance -= 0.25;
      if (rnd.value() > Math.max(0, Math.min(1, hitChance))) {
        this.emit({ kind: 'message', text: `${target.name} は攻撃を回避した！` });
        return;
      }
    }

    const critRate = Math.min(100, attacker.crit + critBonus);
    const isCrit = rnd.range(0, 100) < critRate;
    const critMult = isCrit ? (dmgType === 'Magical' ? 1.5 : 2.0) : 1;

    const isWeak = this.isElementWeak(target, element);
    const elemMult = isWeak ? 1.5 : 1;

    // 聖光弾: アンデッド×2.0 (リリア)
    let extraMult = 1;
    if (skill?.id === 'SKL_L2_HolyBolt' && target.enemyDef?.isUndead) extraMult = 2.0;

    const atk = dmgType === 'Physical' ? attacker.patk : attacker.matk;
    const raw = Math.max(1, Math.round(
      atk * power * critMult * elemMult * extraMult * rnd.float(0.9, 1.1),
    ));

    const dealt = target.takeDamage(raw, dmgType, ignoreDefPct);

    // 歴戦の鎧スタック
    if (target.isPlayer && target.passives.has('SKL_Passive_BattleHardened')) {
      target.battleHardenedStacks = Math.min(5, target.battleHardenedStacks + 1);
    }

    // 不撓不屈: 致死ダメージをHP1で耐える (1戦闘1回)
    if (!target.isAlive && target.isPlayer &&
        target.passives.has('SKL_Passive_IndomitableWill') && !target.indomitableUsed) {
      target.indomitableUsed = true;
      target.hp = 1;
      this.emit({ kind: 'damage', target, amount: dealt, isCrit, isWeak });
      this.emit({ kind: 'message', text: `${target.name} は踏みとどまった！` });
      return;
    }

    this.emit({ kind: 'damage', target, amount: dealt, isCrit, isWeak });
    if (!target.isAlive) this.handleDefeat(target);
  }

  private isElementWeak(target: Combatant, element: ElementType): boolean {
    if (element === 'None' || !target.enemyDef) return false;
    return target.enemyDef.elementWeaknesses.includes(element);
  }

  private tryBreakShield(
    attacker: Combatant, target: Combatant,
    element: ElementType, shieldDamage: number, forceHit = false,
  ): void {
    if (target.isPlayer || !target.isAlive || target.isBroken) return;
    if (!forceHit && !this.isElementWeak(target, element)) return;
    if (target.currentShields <= 0) return;
    const broke = target.hitShield(shieldDamage);
    this.emit({ kind: 'shieldHit', target });
    if (broke) {
      this.emit({ kind: 'break', target });
      this.emit({ kind: 'message', text: `${target.name} をBreakした！` });
    }
  }

  private handleDefeat(target: Combatant): void {
    this.emit({ kind: 'defeat', target });
  }

  // ── 敵ターン (BattleManager.EnemyTurn) ─────────────────────────────
  private enemyTurn(enemy: Combatant): void {
    const def = enemy.enemyDef!;
    const actionsToTake = def.actionsPerTurn;

    for (let i = 0; i < actionsToTake; i++) {
      if (!enemy.isAlive) return;

      const valid = def.actions
        .filter((a) =>
          a.useChance >= rnd.value() &&
          (a.healthThreshold === 0 || enemy.hpRatio * 100 <= a.healthThreshold))
        .sort((a, b) => b.priority - a.priority);

      const chosen = valid.length > 0 ? valid[0] : def.actions[0];
      if (!chosen) continue;
      const skill = chosen.skill;

      // シールド回復系
      if (skill.shieldRestore && skill.shieldRestore > 0) {
        enemy.restoreShields(skill.shieldRestore);
        this.emit({ kind: 'message', text: `${enemy.name} がシールドを${skill.shieldRestore}回復！` });
        continue;
      }

      // 自己回復系 (亡者の意地)
      if (skill.healAmountFlat && skill.healAmountFlat > 0) {
        const healed = enemy.heal(skill.healAmountFlat);
        this.emit({ kind: 'skillUse', user: enemy, skillName: skill.name });
        this.emit({ kind: 'heal', target: enemy, amount: healed });
        continue;
      }

      // 味方バフ系 (死霊鼓舞)
      if (skill.buff && skill.basePower === 0 && !skill.appliedStatus) {
        this.emit({ kind: 'skillUse', user: enemy, skillName: skill.name });
        for (const ally of this.enemies.filter((e) => e.isAlive)) {
          for (const b of skill.buff) {
            ally.applyStatus({ type: b.type, duration: b.duration, value: b.value }, 1);
          }
          this.emit({ kind: 'status', target: ally, status: skill.buff[0].type, applied: true });
        }
        continue;
      }

      // 攻撃 / 状態異常 — HitsAllEnemies は「プレイヤー全員」を意味する
      const livingHeroes = this.heroes.filter((h) => h.isAlive);
      if (livingHeroes.length === 0) return;
      const targets = skill.hitsAllEnemies
        ? livingHeroes
        : [livingHeroes[rnd.range(0, livingHeroes.length)]];

      this.emit({ kind: 'skillUse', user: enemy, skillName: skill.name });
      for (const target of targets) {
        if (!target.isAlive) continue;
        if (skill.basePower > 0) {
          for (let hit = 0; hit < skill.hitCount; hit++) {
            if (!target.isAlive) break;
            this.dealHit(enemy, target, skill.basePower, skill.damageType, skill.element, 0, 0);
          }
        }
        if (target.isAlive && skill.appliedStatus && skill.statusChance) {
          const applied = target.applyStatus(skill.appliedStatus, skill.statusChance);
          this.emit({ kind: 'status', target, status: skill.appliedStatus.type, applied });
          if (applied) {
            this.emit({
              kind: 'message',
              text: `${target.name} は${STATUS_DISPLAY_NAME[skill.appliedStatus.type]}状態になった！`,
            });
          }
        }
      }
    }
  }
}

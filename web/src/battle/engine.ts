// バトルエンジン — Unity版 Battle/BattleCharacter.cs + BattleManager.cs の移植
//
// ダメージ式:   RAW  = ATK × power × critMult × elemMult × var(0.9-1.1)
//               DEALT = max(1, RAW − DEF)   / True は防御無視 / Break中 ×1.5
// 会心倍率:     物理 2.0 / 魔法 1.5 (会心強化: 2.5 / 魔法の極意: 2.5)
// ターン順:     ターンゲージ (速度で加算、100で行動)
// BP:           敵の手番終了ごとに味方全員 +1 (最大5)。1行動で最大3ブースト。
// Break:        弱点属性ヒットでシールド-1 (CanBreakスキルは指定数)。
//               0でBreak → 2ターン気絶 + 被ダメ1.5倍 → シールド全回復
//
// キャラ固有: Shadow State(アッシュ) / グリモワール吸収(ゼノ) / 因果の鎖 /
//             死の宣告 / 罠設置 / 元素収束(ラヴィニア) / 自動慈愛(リリア)
import type {
  CharacterStats, DamageType, ElementType, EnemyDef, SkillDef,
  StatusEffect, StatusEffectType,
} from '../core/types';
import { STATUS_DISPLAY_NAME } from '../core/types';
import { battleRandom as rnd } from '../core/rng';
import type { RelicBattleState } from './relicHooks';

const BREAK_STUN_TURNS = 2;

// バフ系 (cleanseで消さない)
const BUFF_TYPES: StatusEffectType[] = [
  'AtkUp', 'MatkUp', 'DefUp', 'SpdUp', 'Regen', 'RegenFlat',
  'CritUp', 'Afterimage', 'Barrier',
];

// ── 戦闘中の1体 ─────────────────────────────────────────────────────────

export interface ActiveStatus {
  type: StatusEffectType;
  value: number;
  remainingTurns: number;
}

export class Combatant {
  isPlayer: boolean;
  characterId?: string;
  name: string;
  base: CharacterStats;
  enemyDef?: EnemyDef;
  skills: SkillDef[];
  passives: Set<string>;

  hp: number;
  mp: number;
  bp = 0;
  maxBP = 5;
  currentBoost = 0;

  maxShields = 0;
  currentShields = 0;
  brokenTurnsRemaining = 0;

  statuses: ActiveStatus[] = [];
  turnGauge = 0;

  // キャラ固有の戦闘内状態
  battleHardenedStacks = 0;    // 歴戦の鎧 (ベルンハルト)
  indomitableUsed = false;     // 不撓不屈 (ベルンハルト)
  shadowState = false;         // Shadow State (アッシュ)
  critStacks = 0;              // 会心強化スタック (アッシュ, 最大3)
  lastElement: ElementType = 'None'; // 元素収束用 (ラヴィニア)

  constructor(opts: {
    isPlayer: boolean; name: string; stats: CharacterStats;
    enemyDef?: EnemyDef; skills?: SkillDef[]; passives?: Set<string>;
    initialHP?: number; shields?: number; characterId?: string;
  }) {
    this.isPlayer = opts.isPlayer;
    this.characterId = opts.characterId;
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
  get mpRatio(): number { return this.base.maxMP > 0 ? this.mp / this.base.maxMP : 0; }

  private statusStatBonus(base: number, up: StatusEffectType, down: StatusEffectType): number {
    let pct = 0;
    for (const s of this.statuses) {
      if (s.type === up) pct += s.value;
      else if (s.type === down) pct -= s.value;
    }
    return Math.round(base * pct);
  }

  get patk(): number { return Math.max(1, this.base.physicalAttack + this.statusStatBonus(this.base.physicalAttack, 'AtkUp', 'AtkDown')); }

  get matk(): number {
    let m = this.base.magicAttack + this.statusStatBonus(this.base.magicAttack, 'MatkUp', 'MatkDown');
    // 過負荷詠唱: MP40%以下で魔法攻撃力+25%
    if (this.passives.has('SKL_L_Passive_Overloaded') && this.mpRatio <= 0.40) {
      m = Math.round(m * 1.25);
    }
    return Math.max(1, m);
  }

  get pdef(): number {
    let d = this.base.physicalDefense + this.statusStatBonus(this.base.physicalDefense, 'DefUp', 'DefDown');
    // 歴戦の鎧: 被弾ごとに物理防御+3% (最大5スタック)
    d += Math.round(this.base.physicalDefense * 0.03 * this.battleHardenedStacks);
    return Math.max(0, d);
  }

  get mdef(): number { return Math.max(0, this.base.magicDefense + this.statusStatBonus(this.base.magicDefense, 'DefUp', 'DefDown')); }

  get speed(): number {
    let s = this.base.speed + this.statusStatBonus(this.base.speed, 'SpdUp', 'SpdDown');
    // 過負荷詠唱: MP60%以上で速度+10%
    if (this.passives.has('SKL_L_Passive_Overloaded') && this.mpRatio >= 0.60) {
      s = Math.round(s * 1.10);
    }
    return Math.max(1, s);
  }

  get crit(): number {
    let c = this.base.criticalRate;
    for (const s of this.statuses) if (s.type === 'CritUp') c += s.value;
    c += this.critStacks * 10;   // 会心強化スタック
    return Math.max(0, Math.min(100, c));
  }

  get accuracy(): number {
    let a = this.base.accuracyRate;
    for (const s of this.statuses) if (s.type === 'AccDown') a -= Math.round(s.value * 100);
    return Math.max(0, Math.min(100, a));
  }

  /** 回避率 (プレイヤーのみ) — 流麗回避 + 残影 */
  get dodgeBonus(): number {
    let d = 0;
    if (this.passives.has('SKL_A_Passive_FluidEvasion')) d += 0.15;
    return d;
  }

  hasStatus(type: StatusEffectType): boolean {
    return this.statuses.some((s) => s.type === type);
  }

  getStatus(type: StatusEffectType): ActiveStatus | undefined {
    return this.statuses.find((s) => s.type === type);
  }

  applyStatus(effect: StatusEffect, chance: number): boolean {
    if (rnd.value() > chance) return false;
    // 暗視術: 盲目無効
    if (effect.type === 'Blind' && this.passives.has('SKL_A_DarkVision')) return false;
    this.statuses = this.statuses.filter((s) => s.type !== effect.type);
    this.statuses.push({ type: effect.type, value: effect.value, remainingTurns: effect.duration });
    return true;
  }

  /** 状態異常(デバフ)のみ解除 */
  cleanse(): void {
    this.statuses = this.statuses.filter((s) => BUFF_TYPES.includes(s.type));
  }

  /** DoT/HoT を処理して [dot, hot] を返す (DeathSentenceは engine 側で先に処理) */
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
        case 'RegenFlat':
          hot += Math.max(1, Math.round(s.value));
          break;
      }
      // 死の宣告のカウントは engine.advance() 側で管理する (二重減算防止)
      if (s.type !== 'DeathSentence') s.remainingTurns--;
    }
    this.statuses = this.statuses.filter((s) => s.remainingTurns > 0);
    this.hp = Math.max(0, this.hp - dot);
    this.hp = Math.min(this.base.maxHP, this.hp + hot);
    return [dot, hot];
  }

  takeDamage(raw: number, type: DamageType, ignoreDefPct = 0): number {
    if (!this.isAlive) return 0;
    // 祝福の障壁: 次の被ダメ1回を50%軽減
    const barrier = this.getStatus('Barrier');
    if (barrier) {
      raw = Math.round(raw * 0.5);
      this.statuses = this.statuses.filter((s) => s.type !== 'Barrier');
    }
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

  addBP(amount = 1): void { this.bp = Math.min(this.maxBP, this.bp + amount); }

  useBoost(boosts: number): boolean {
    if (this.bp < boosts || this.currentBoost + boosts > 3) return false;
    this.bp -= boosts;
    this.currentBoost += boosts;
    return true;
  }

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
  | { kind: 'absorb'; skillId: string; skillName: string }
  | { kind: 'shadow'; target: Combatant; active: boolean }
  | { kind: 'victory' }
  | { kind: 'defeat_party' };

export interface PlayerCommand {
  type: 'attack' | 'skill';
  skill?: SkillDef;
  targetIndex: number;
  boostLevel: number;   // 0-3
}

interface HeroTrap {
  power: number;
  stunChance: number;
  attackerPatk: number;
  owner: Combatant;
}

interface ChainLink {
  a: Combatant | null;   // null = 全体連鎖
  b: Combatant | null;
  pct: number;
  remainingTurns: number;
  all: boolean;
}

// ── エンジン本体 ────────────────────────────────────────────────────────

export class BattleEngine {
  heroes: Combatant[];
  enemies: Combatant[];
  events: BattleEvent[] = [];
  over: 'victory' | 'defeat' | null = null;
  activeCombatant: Combatant | null = null;

  private heroTrap: HeroTrap | null = null;
  private chainLinks: ChainLink[] = [];
  /** このバトルで吸収したスキルID (ラン永続化用) */
  absorbedThisBattle: string[] = [];
  /** 魂の吊灯籠: このバトルでレリック獲得権が発生したか */
  soulSiphonRewards = 0;
  relics: RelicBattleState | null;

  constructor(heroes: Combatant[], enemies: Combatant[], startBP = 0, relics: RelicBattleState | null = null) {
    this.heroes = heroes;
    this.enemies = enemies;
    this.relics = relics;
    if (relics) {
      const maxBPBonus = relics.maxBPBonus();
      for (const h of heroes) h.maxBP += maxBPBonus;
      for (const msg of relics.onBattleStart(heroes, enemies)) {
        this.emit({ kind: 'message', text: msg });
      }
    }
    for (const h of heroes) h.addBP(startBP);
  }

  get all(): Combatant[] { return [...this.heroes, ...this.enemies]; }

  private emit(e: BattleEvent): void { this.events.push(e); }

  drainEvents(): BattleEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  advance(): 'awaitInput' | 'over' {
    while (!this.over) {
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

      // 死の宣告カウント (自身の手番開始時に進む)
      const sentence = actor.getStatus('DeathSentence');
      if (sentence && sentence.remainingTurns <= 1) {
        actor.statuses = actor.statuses.filter((s) => s.type !== 'DeathSentence');
        const isBoss = actor.enemyDef?.rank === 'Boss' || actor.enemyDef?.rank === 'TrueFinalBoss';
        if (isBoss) {
          const dmg = Math.round(actor.base.maxHP * sentence.value);
          actor.hp = Math.max(1, actor.hp - dmg);
          this.emit({ kind: 'message', text: `死の宣告が発動！ ${actor.name} に${dmg}ダメージ！` });
          this.emit({ kind: 'damage', target: actor, amount: dmg, isCrit: false, isWeak: false });
        } else {
          actor.hp = 0;
          this.emit({ kind: 'message', text: `死の宣告が発動！ ${actor.name} は塵と化した！` });
        }
      } else if (sentence) {
        sentence.remainingTurns--;
        this.emit({ kind: 'message', text: `${actor.name} の死の刻印… 残り${sentence.remainingTurns}` });
      }

      if (!actor.isAlive) {
        this.handleDefeat(actor);
        if (this.checkEnd()) return 'over';
        continue;
      }

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

      // 因果の鎖の持続を進める (術者側ヒーローの手番で減少)
      if (actor.isPlayer) {
        for (const link of this.chainLinks) link.remainingTurns--;
        this.chainLinks = this.chainLinks.filter((l) => l.remainingTurns > 0);
      }

      // 罠発動 (敵の手番開始時)
      if (!actor.isPlayer && this.heroTrap) {
        const trap = this.heroTrap;
        this.heroTrap = null;
        this.emit({ kind: 'message', text: `罠が炸裂した！` });
        const raw = Math.max(1, Math.round(trap.attackerPatk * trap.power * rnd.float(0.9, 1.1)));
        const dealt = actor.takeDamage(raw, 'Physical');
        this.emit({ kind: 'damage', target: actor, amount: dealt, isCrit: false, isWeak: false });
        this.propagateChain(actor, dealt);
        if (actor.isAlive && rnd.value() < trap.stunChance) {
          actor.applyStatus({ type: 'Paralysis', duration: 1, value: 0 }, 1);
          this.emit({ kind: 'status', target: actor, status: 'Paralysis', applied: true });
        }
        if (!actor.isAlive) {
          this.handleDefeat(actor);
          this.afterAction(actor);
          if (this.checkEnd()) return 'over';
          continue;
        }
      }

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
        // レリック: ターン開始効果 (リジェネ・MP回復・自傷・吸命など)
        if (this.relics) {
          const { heal, selfDamage } = this.relics.onHeroTurnStart(actor, this.enemies);
          if (heal > 0) this.emit({ kind: 'heal', target: actor, amount: heal });
          if (selfDamage > 0) this.emit({ kind: 'dot', target: actor, amount: selfDamage });
          // LifeDrainで敵が死んでいる可能性
          for (const e of this.enemies) {
            if (!e.isAlive && !this.events.some((ev) => ev.kind === 'defeat' && ev.target === e)) {
              this.handleDefeat(e);
            }
          }
          if (this.checkEnd()) return 'over';
        }
        return 'awaitInput';
      }

      this.enemyTurn(actor);
      this.afterAction(actor);
      if (this.checkEnd()) return 'over';
    }
    return 'over';
  }

  executePlayerCommand(cmd: PlayerCommand): 'awaitInput' | 'over' {
    const hero = this.activeCombatant;
    if (!hero || !hero.isPlayer) return this.over ? 'over' : 'awaitInput';

    if (cmd.boostLevel > 0) {
      // 倹約家の指輪/賭博師の骰子: BP消費軽減
      const cost = this.relics ? this.relics.boostBPCost(cmd.boostLevel) : cmd.boostLevel;
      if (hero.bp >= cost) {
        hero.bp -= cost;
        hero.currentBoost = cmd.boostLevel;
        this.relics?.notifyBoostUsed(cmd.boostLevel);
      } else {
        cmd = { ...cmd, boostLevel: 0 };
      }
    }

    if (cmd.type === 'attack') {
      this.executeBasicAttack(hero, cmd.targetIndex, cmd.boostLevel);
    } else if (cmd.skill) {
      this.executeSkill(hero, cmd.skill, cmd.targetIndex, cmd.boostLevel);
      // 残響水晶/双詠の護符: 1戦闘1回スキル再発動
      if (this.relics && !this.over) {
        const { repeat, selfDamage } = this.relics.onSkillUsed(cmd.skill.id, hero);
        if (selfDamage > 0) this.emit({ kind: 'dot', target: hero, amount: selfDamage });
        if (repeat && this.enemies.some((e) => e.isAlive)) {
          this.emit({ kind: 'message', text: `スキルが残響する！` });
          this.executeSkill(hero, cmd.skill, cmd.targetIndex, 0, true);
        }
      }
    }

    hero.currentBoost = 0;
    this.afterAction(hero);
    if (this.checkEnd()) return 'over';
    return this.advance();
  }

  private afterAction(actor: Combatant): void {
    // 敵の手番終了 → 味方全員 BP+1 (闘気の導線: +BPGainUp)
    if (!actor.isPlayer) {
      const gain = 1 + (this.relics?.bpGainBonus() ?? 0);
      for (const h of this.heroes) if (h.isAlive) h.addBP(gain);
    }

    // 自動慈愛 (リリア): 毎アクション後、最もHP%が低い味方を回復
    const compassion = this.heroes.find(
      (h) => h.isAlive && h.passives.has('SKL_L2_Passive_AutoCompassion'));
    if (compassion) {
      const injured = this.heroes
        .filter((h) => h.isAlive && h.hp < h.base.maxHP)
        .sort((a, b) => a.hpRatio - b.hpRatio)[0];
      if (injured) {
        const amount = Math.max(1, Math.round(compassion.matk * 0.30));
        const healed = injured.heal(amount);
        if (healed > 0) this.emit({ kind: 'heal', target: injured, amount: healed });
      }
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
    this.consumeShadowState(attacker);
  }

  // ── スキル実行 ─────────────────────────────────────────────────────
  private executeSkill(user: Combatant, skill: SkillDef, targetIndex: number, boostLevel: number, isEcho = false): void {
    // MPコスト (過負荷詠唱: MP60%以上でコスト-2 / レリック補正 / エコーは無料)
    if (user.isPlayer && skill.mpCost > 0 && !isEcho) {
      let cost = skill.mpCost;
      if (user.passives.has('SKL_L_Passive_Overloaded') && user.mpRatio >= 0.60) {
        cost = Math.max(0, cost - 2);
      }
      if (this.relics) cost = this.relics.modifySkillMPCost(cost);
      if (user.mp < cost) return;
      var mpRatioBefore = user.mpRatio;   // 魔力爆発のスケーリングは支払い前
      user.mp -= cost;
    } else {
      var mpRatioBefore = user.mpRatio;
    }

    const boostPowerMult = 1 + boostLevel * 0.5;
    this.emit({ kind: 'skillUse', user, skillName: skill.name });

    // ── 吸収 (グリモワール) ──
    if (skill.absorb) {
      this.executeAbsorb(user, skill, targetIndex);
      if (skill.extendDebuffs) this.extendEnemyDebuffs(skill.extendDebuffs);
      return;
    }

    // ── 罠設置 ──
    if (skill.trap) {
      this.heroTrap = {
        power: skill.trap.power, stunChance: skill.trap.stunChance,
        attackerPatk: user.patk, owner: user,
      };
      this.emit({ kind: 'message', text: `${user.name} は罠を仕掛けた…` });
    }

    // ── Shadow State付与 ──
    if (skill.grantsShadowState && !user.shadowState) {
      user.shadowState = true;
      this.emit({ kind: 'shadow', target: user, active: true });
      this.emit({ kind: 'message', text: `${user.name} は影に溶けた…` });
    }

    // ── 蘇生 ──
    if (skill.revive) {
      const deadAllies = (user.isPlayer ? this.heroes : this.enemies).filter((c) => !c.isAlive);
      const targets = skill.revive.all ? deadAllies : deadAllies.slice(0, 1);
      for (const t of targets) {
        t.hp = Math.max(1, Math.round(t.base.maxHP * skill.revive.pct));
        this.emit({ kind: 'message', text: `${t.name} が蘇った！` });
        this.emit({ kind: 'heal', target: t, amount: t.hp });
      }
    }

    // ── 回復 ──
    if (skill.isHeal || skill.fullHeal) {
      const allies = user.isPlayer ? this.heroes : this.enemies;
      const targets = skill.hitsAllAllies
        ? allies.filter((c) => c.isAlive)
        : [allies.find((c) => c.isAlive) ?? user];
      for (const t of targets) {
        let amount: number;
        if (skill.fullHeal) {
          amount = t.base.maxHP - t.hp;
        } else if (skill.healPower < 1) {
          amount = Math.round(t.base.maxHP * skill.healPower * boostPowerMult);
        } else {
          amount = Math.round((skill.healPower + user.matk * 0.5) * boostPowerMult);
        }
        // 癒しの心得: 回復量+25%
        if (user.passives.has('SKL_L2_Passive_HealingMastery')) {
          amount = Math.round(amount * 1.25);
        }
        const healed = t.heal(amount);
        if (healed > 0) this.emit({ kind: 'heal', target: t, amount: healed });
      }
    }

    // ── 状態異常解除 ──
    if (skill.cleanse) {
      const allies = user.isPlayer ? this.heroes : this.enemies;
      const targets = skill.cleanse === 'allAllies'
        ? allies.filter((c) => c.isAlive)
        : [allies.find((c) => c.isAlive) ?? user];
      for (const t of targets) {
        t.cleanse();
      }
      this.emit({ kind: 'message', text: `状態異常が浄化された` });
    }

    // ── 固定値リジェネ ──
    if (skill.regenFlat) {
      const allies = user.isPlayer ? this.heroes : this.enemies;
      const targets = skill.regenFlat.toAllAllies
        ? allies.filter((c) => c.isAlive)
        : [allies.find((c) => c.isAlive) ?? user];
      const perTurn = Math.max(1, Math.round(user.matk * skill.regenFlat.matkMult));
      for (const t of targets) {
        t.applyStatus({ type: 'RegenFlat', duration: skill.regenFlat.duration, value: perTurn }, 1);
        this.emit({ kind: 'status', target: t, status: 'RegenFlat', applied: true });
      }
    }

    // ── バリア ──
    if (skill.barrier) {
      const allies = user.isPlayer ? this.heroes : this.enemies;
      for (const t of allies.filter((c) => c.isAlive)) {
        t.applyStatus({ type: 'Barrier', duration: 9, value: 0.5 }, 1);
        this.emit({ kind: 'status', target: t, status: 'Barrier', applied: true });
      }
    }

    // ── バフ ──
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

    // ── 因果の鎖 ──
    if (skill.causalChain) {
      const living = this.enemies.filter((e) => e.isAlive);
      if (skill.causalChain.all || living.length >= 2) {
        if (skill.causalChain.all) {
          this.chainLinks.push({
            a: null, b: null, pct: skill.causalChain.pct,
            remainingTurns: skill.causalChain.duration + 1, all: true,
          });
          this.emit({ kind: 'message', text: `全ての敵が因果の鎖で繋がれた！` });
        } else {
          let primary = living[Math.min(targetIndex, living.length - 1)];
          const other = living.find((e) => e !== primary)!;
          this.chainLinks.push({
            a: primary, b: other, pct: skill.causalChain.pct,
            remainingTurns: skill.causalChain.duration + 1, all: false,
          });
          this.emit({ kind: 'message', text: `${primary.name} と ${other.name} が鎖で繋がれた！` });
        }
      } else {
        this.emit({ kind: 'message', text: `繋ぐ相手がいない…` });
      }
    }

    // ── 攻撃 / デバフ / 状態異常 ──
    const isOffensive = skill.basePower > 0 || skill.appliedStatus || skill.debuff
      || skill.deathSentence || skill.randomDebuff;
    if (isOffensive) {
      const foes = user.isPlayer ? this.enemies : this.heroes;

      // 死の踊り: ランダム対象連打
      if (skill.randomTargets) {
        this.executeRandomBarrage(user, skill, boostPowerMult);
        this.consumeShadowState(user);
        if (user.isPlayer && skill.element !== 'None') user.lastElement = skill.element;
        return;
      }

      const targets = skill.hitsAllEnemies
        ? foes.filter((f) => f.isAlive)
        : (() => {
            let t = foes[targetIndex];
            if (!t?.isAlive) t = foes.find((f) => f.isAlive)!;
            return t ? [t] : [];
          })();

      // 元素収束: 直前属性から反応属性を決定
      let element = skill.element;
      let convergeMult = 1;
      if (skill.isConverge) {
        const reaction: Partial<Record<ElementType, ElementType>> = {
          Fire: 'Ice', Ice: 'Lightning', Lightning: 'Fire',
        };
        const reacted = reaction[user.lastElement];
        if (reacted) {
          element = reacted;
          convergeMult = 1.5 * 1.5;   // 共鳴1.5倍 × 反応ボーナス+50%
          this.emit({ kind: 'message', text: `元素が共鳴した！ (${user.lastElement}→${element})` });
        } else if (user.lastElement !== 'None') {
          element = user.lastElement;
          convergeMult = 1.5;
        }
      }

      // 魔力爆発: MP残量スケーリング
      let mpMult = 1;
      if (skill.mpScaling) {
        mpMult = skill.mpScaling.min + (skill.mpScaling.max - skill.mpScaling.min) * mpRatioBefore;
      }

      // Shadow State威力加算
      let shadowBonus = 0;
      let extraHits = 0;
      if (user.shadowState) {
        shadowBonus = skill.shadowPowerBonus ?? 0;
        extraHits = skill.shadowExtraHits ?? 0;
      }

      for (const target of targets) {
        if (!target.isAlive) continue;

        if (skill.basePower > 0) {
          const hits = skill.hitCount + extraHits;
          for (let hit = 0; hit < hits; hit++) {
            if (!target.isAlive) break;
            this.dealHit(
              user, target,
              (skill.basePower + shadowBonus) * boostPowerMult * convergeMult * mpMult,
              skill.damageType, element,
              skill.critBonus ?? 0,
              skill.ignoreDefPct ?? 0,
              skill,
            );
            if (skill.canBreak) {
              this.tryBreakShield(user, target, element, skill.shieldDamage ?? 1, true);
            } else {
              this.tryBreakShield(user, target, element, 1);
            }
          }

          // 連鎖雷撃: 追加対象へ同威力
          if (skill.chainCount && skill.chainCount > 1) {
            const others = this.enemies.filter((e) => e.isAlive && e !== target)
              .slice(0, skill.chainCount - 1);
            for (const o of others) {
              this.emit({ kind: 'message', text: `雷が${o.name}へ連鎖！` });
              this.dealHit(user, o,
                (skill.basePower + shadowBonus) * boostPowerMult,
                skill.damageType, element, skill.critBonus ?? 0, 0, skill);
              this.tryBreakShield(user, o, element, 1);
            }
          }

          // 即死判定 (必殺狙撃)
          if (target.isAlive && skill.executeChance && skill.executeThreshold) {
            const isBoss = target.enemyDef?.rank === 'Boss' || target.enemyDef?.rank === 'TrueFinalBoss';
            if (!isBoss && target.hpRatio <= skill.executeThreshold && rnd.value() < skill.executeChance) {
              target.hp = 0;
              this.emit({ kind: 'message', text: `急所を射抜いた！ ${target.name} は絶命した！` });
              this.handleDefeat(target);
            }
          }
        }

        // 状態異常付与
        if (target.isAlive && skill.appliedStatus && skill.statusChance) {
          let chance = skill.statusChance + boostLevel * 0.1;
          let status = { ...skill.appliedStatus };
          // 呪術の心得: 確率+20%、持続+1
          if (user.passives.has('SKL_Z_Passive_CurseMastery')) {
            chance += 0.20;
            status.duration += 1;
          }
          const applied = target.applyStatus(status, chance);
          this.emit({ kind: 'status', target, status: status.type, applied });
        }

        // デバフ
        if (target.isAlive && skill.debuff) {
          for (const d of skill.debuff) {
            let dur = d.duration;
            if (user.passives.has('SKL_Z_Passive_CurseMastery')) dur += 1;
            target.applyStatus({ type: d.type, duration: dur, value: d.value }, 1);
            this.emit({ kind: 'status', target, status: d.type, applied: true });
          }
        }

        // ランダムデバフ (呪詛の霧 / 混沌の呪い)
        if (target.isAlive && skill.randomDebuff) {
          const rd = skill.randomDebuff;
          if (rd.count > 0) {
            const pool: StatusEffectType[] = ['AtkDown', 'DefDown', 'SpdDown', 'AccDown'];
            for (let i = 0; i < rd.count; i++) {
              const type = pool[rnd.range(0, pool.length)];
              target.applyStatus({ type, duration: rd.duration, value: rd.amount }, 1);
              this.emit({ kind: 'status', target, status: type, applied: true });
            }
          }
          if (rd.statusChance > 0) {
            const stPool: { type: StatusEffectType; value: number }[] = [
              { type: 'Poison', value: 0.05 }, { type: 'Bleed', value: 0.05 },
              { type: 'Burn', value: 0.06 }, { type: 'Blind', value: 0 },
            ];
            const st = stPool[rnd.range(0, stPool.length)];
            let chance = rd.statusChance;
            let dur = rd.duration;
            if (user.passives.has('SKL_Z_Passive_CurseMastery')) { chance += 0.20; dur += 1; }
            const applied = target.applyStatus({ type: st.type, duration: dur, value: st.value }, chance);
            this.emit({ kind: 'status', target, status: st.type, applied });
          }
        }

        // 死の宣告
        if (target.isAlive && skill.deathSentence) {
          target.applyStatus({
            type: 'DeathSentence',
            duration: skill.deathSentence.delay + 1,
            value: skill.deathSentence.bossDmgPct,
          }, 1);
          this.emit({ kind: 'status', target, status: 'DeathSentence', applied: true });
          this.emit({ kind: 'message', text: `${target.name} に死の刻印が刻まれた…` });
        }
      }

      this.consumeShadowState(user);
    }

    // 元素記録 (ラヴィニアの元素収束用)
    if (user.isPlayer && skill.element !== 'None' && skill.basePower > 0) {
      user.lastElement = skill.element;
    }
  }

  /** Shadow State消費 (攻撃行動後) */
  private consumeShadowState(user: Combatant): void {
    if (user.shadowState) {
      user.shadowState = false;
      this.emit({ kind: 'shadow', target: user, active: false });
    }
  }

  // ── 死の踊り: ランダム対象連打 (会心で追加ヒット) ─────────────────
  private executeRandomBarrage(user: Combatant, skill: SkillDef, boostMult: number): void {
    const maxHits = skill.hitCount * 2;
    let hits = skill.hitCount;
    let executed = 0;
    while (executed < hits && executed < maxHits) {
      const living = this.enemies.filter((e) => e.isAlive);
      if (living.length === 0) break;
      const target = living[rnd.range(0, living.length)];
      const wasCrit = this.dealHit(
        user, target, skill.basePower * boostMult,
        skill.damageType, skill.element, skill.critBonus ?? 0, 0, skill);
      this.tryBreakShield(user, target, skill.element, 1);
      if (wasCrit && skill.critExtraHit && hits < maxHits) hits++;
      executed++;
    }
  }

  // ── 吸収 (ゼノ・グリモワール) ─────────────────────────────────────
  private executeAbsorb(user: Combatant, skill: SkillDef, targetIndex: number): void {
    const living = this.enemies.filter((e) => e.isAlive);
    let target = this.enemies[targetIndex];
    if (!target?.isAlive) target = living[0];
    if (!target) return;

    const rank = target.enemyDef?.rank ?? 'Normal';
    const ab = skill.absorb!;

    // HP消費 (吸収の代価: 半減)
    let hpCost = Math.round(user.base.maxHP * ab.hpCostPct);
    if (user.passives.has('SKL_Z_Passive_PriceOfAbsorption')) hpCost = Math.round(hpCost * 0.5);
    if (hpCost > 0) {
      user.hp = Math.max(1, user.hp - hpCost);
      this.emit({ kind: 'damage', target: user, amount: hpCost, isCrit: false, isWeak: false });
    }

    if (rank === 'Boss' || rank === 'TrueFinalBoss') {
      this.emit({ kind: 'message', text: `${target.name} の魂は強大すぎる… 吸収できない！` });
      return;
    }
    if (rank === 'Elite' && (!ab.eliteMult || ab.eliteMult <= 0)) {
      this.emit({ kind: 'message', text: `${target.name} の魂は強い… 吸収できない！` });
      return;
    }

    let chance = ab.baseChance + ab.maxBonus * (1 - target.hpRatio);
    if (rank === 'Elite') chance *= ab.eliteMult ?? 1;
    if (rank === 'Normal' && ab.instantNormal) chance = 1;

    if (rnd.value() < chance) {
      // 吸収成功: 敵の技を1つ獲得して敵は消滅
      const actions = target.enemyDef?.actions.filter((a) => a.skill.basePower > 0 || a.skill.appliedStatus) ?? [];
      const pick = actions.length > 0 ? actions[rnd.range(0, actions.length)] : null;
      target.hp = 0;
      this.emit({ kind: 'message', text: `${target.name} の魂を喰らった！` });
      if (pick && !user.skills.some((s) => s.id === pick.skill.id)) {
        user.skills = [...user.skills, { ...pick.skill, mpCost: Math.max(4, pick.skill.mpCost || 8) }];
        this.absorbedThisBattle.push(pick.skill.id);
        this.emit({ kind: 'absorb', skillId: pick.skill.id, skillName: pick.skill.name });
        this.emit({ kind: 'message', text: `「${pick.skill.name}」をグリモワールに刻んだ！` });
      }
      this.handleDefeat(target);
    } else {
      this.emit({ kind: 'message', text: `吸収に失敗した… (成功率${Math.round(chance * 100)}%)` });
    }
  }

  /** 冥界の扉: 全敵デバフ持続+N */
  private extendEnemyDebuffs(turns: number): void {
    for (const e of this.enemies) {
      if (!e.isAlive) continue;
      for (const s of e.statuses) {
        if (!BUFF_TYPES.includes(s.type)) s.remainingTurns += turns;
      }
    }
    this.emit({ kind: 'message', text: `呪いの刻が引き延ばされた…` });
  }

  // ── 1ヒットのダメージ処理。戻り値: 会心だったか ─────────────────────
  private dealHit(
    attacker: Combatant, target: Combatant,
    power: number, dmgType: DamageType, element: ElementType,
    critBonus: number, ignoreDefPct: number,
    skill?: SkillDef,
    isRelicExtraHit = false,
  ): boolean {
    // 命中判定 (プレイヤーのみ回避可 — Unity版の非対称設計)
    if (target.isPlayer && !skill?.neverMiss) {
      let hitChance = attacker.accuracy / 100;
      if (attacker.hasStatus('Blind')) hitChance -= 0.25;
      let dodge = target.dodgeBonus;
      if (this.relics) dodge += this.relics.evasionBonus();
      const isSingleTarget = !skill?.hitsAllEnemies;
      const afterimage = target.getStatus('Afterimage');
      if (afterimage && isSingleTarget) dodge += afterimage.value;
      if (target.hasStatus('Blind')) dodge -= 0.15;

      if (rnd.value() > Math.max(0, Math.min(1, hitChance - dodge))) {
        this.emit({ kind: 'message', text: `${target.name} は攻撃を回避した！` });
        // 流麗回避: 回避でBP+1
        if (target.passives.has('SKL_A_Passive_FluidEvasion')) target.addBP(1);
        // アッシュ: 回避成功でShadow State
        if (target.characterId === 'ash' && !target.shadowState) {
          target.shadowState = true;
          this.emit({ kind: 'shadow', target, active: true });
        }
        // 残影: 反撃
        if (afterimage && isSingleTarget && attacker.isAlive) {
          const counterRaw = Math.max(1, Math.round(target.patk * 0.50 * rnd.float(0.9, 1.1)));
          const dealt = attacker.takeDamage(counterRaw, 'Physical');
          this.emit({ kind: 'message', text: `${target.name} の反撃！` });
          this.emit({ kind: 'damage', target: attacker, amount: dealt, isCrit: false, isWeak: false });
          if (!attacker.isAlive) this.handleDefeat(attacker);
        }
        return false;
      }
    }

    // 会心率 (魔法の極意: MagATK/5 加算 / レリック: 連鎖の照準器)
    let critRate = attacker.crit + critBonus;
    if (dmgType === 'Magical' && attacker.passives.has('SKL_L_Passive_ArcaneMastery')) {
      critRate += Math.floor(attacker.matk / 5);
    }
    if (attacker.isPlayer && this.relics) critRate += this.relics.critRateBonus();
    const isCrit = rnd.range(0, 100) < Math.min(100, critRate);

    // 会心倍率 (物理2.0 / 魔法1.5、会心強化2.5 / 魔法の極意2.5)
    let critMult = 1;
    if (isCrit) {
      if (dmgType === 'Magical') {
        critMult = attacker.passives.has('SKL_L_Passive_ArcaneMastery') ? 2.5 : 1.5;
      } else {
        critMult = attacker.passives.has('SKL_A_Passive_CritEnhance') ? 2.5 : 2.0;
      }
      if (attacker.isPlayer && this.relics) {
        critMult += this.relics.critDamageBonus();
        this.relics.notifyCriticalHit();
      }
      // 会心強化: スタック加算
      if (attacker.passives.has('SKL_A_Passive_CritEnhance')) {
        attacker.critStacks = Math.min(3, attacker.critStacks + 1);
      }
    }

    const isWeak = this.isElementWeak(target, element);
    const elemMult = isWeak ? 1.5 : 1;

    // アンデッド特効
    let extraMult = 1;
    if (skill?.undeadMult && target.enemyDef?.isUndead) extraMult = skill.undeadMult;

    // Shadow State: 攻撃全般+30% (Trait_ShadowDance)
    let shadowMult = 1;
    if (attacker.shadowState && attacker.characterId === 'ash') shadowMult = 1.30;

    const atk = dmgType === 'Physical' ? attacker.patk : attacker.matk;
    let raw = Math.max(1, Math.round(
      atk * power * critMult * elemMult * extraMult * shadowMult * rnd.float(0.9, 1.1),
    ));

    // レリック: 与ダメ補正 (ヒーロー→敵) / 被ダメ補正 (敵→ヒーロー)
    let counterDamage = 0;
    if (this.relics) {
      if (attacker.isPlayer && !target.isPlayer) {
        raw = this.relics.modifyOutgoingDamage(
          attacker, target, raw, element,
          attacker.skills.filter((s) => !s.isPassive).length);
      } else if (target.isPlayer && dmgType !== 'True') {
        const result = this.relics.modifyIncomingDamage(target, raw);
        raw = result.damage;
        for (const m of result.messages) this.emit({ kind: 'message', text: m });
        counterDamage = result.counterDamage;
        if (raw <= 0) {
          this.emit({ kind: 'damage', target, amount: 0, isCrit: false, isWeak: false });
          return false;
        }
      }
    }

    const dealt = target.takeDamage(raw, dmgType, ignoreDefPct);

    // 怨霊の壺: 全敵へ反撃
    if (counterDamage > 0) {
      this.emit({ kind: 'message', text: `怨霊の壺が唸りを上げる！` });
      for (const e of this.enemies) {
        if (!e.isAlive) continue;
        const cd = e.takeDamage(counterDamage, 'True');
        this.emit({ kind: 'damage', target: e, amount: cd, isCrit: false, isWeak: false });
        if (!e.isAlive) this.handleDefeat(e);
      }
    }

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
      return isCrit;
    }

    // 不死鳥の綿羽: 1ランに1回HP1で復活
    if (!target.isAlive && target.isPlayer && this.relics?.tryRevive(target)) {
      this.emit({ kind: 'damage', target, amount: dealt, isCrit, isWeak });
      this.emit({ kind: 'message', text: `不死鳥の綿羽が燃え上がり、${target.name} は蘇った！` });
      return isCrit;
    }

    this.emit({ kind: 'damage', target, amount: dealt, isCrit, isWeak });

    // レリック: 与ダメ確定後の効果 (吸血・出血/麻痺付与)
    if (this.relics && attacker.isPlayer && !target.isPlayer) {
      const after = this.relics.onDamageDealt(attacker, target, dealt);
      if (after.heal > 0) this.emit({ kind: 'heal', target: attacker, amount: after.heal });
      for (const st of after.statuses) this.emit({ kind: 'status', target, status: st, applied: true });

      // 即死系レリック
      if (target.isAlive &&
          (this.relics.tryExecuteLowHP(target) || this.relics.tryExecuteOnBreak(target))) {
        const isBoss = target.enemyDef?.rank === 'Boss' || target.enemyDef?.rank === 'TrueFinalBoss';
        if (!isBoss) {
          target.hp = 0;
          this.emit({ kind: 'message', text: `${target.name} は刈り取られた！` });
        }
      }

      // 影の従者/双牙の首飾り: 追加ヒット (連鎖防止のためこのヒットが追加ヒットでない時のみ)
      if (!isRelicExtraHit && target.isAlive &&
          ((isCrit && this.relics.tryExtraHitOnCrit()) || this.relics.tryShadowStrike())) {
        this.emit({ kind: 'message', text: `追撃！` });
        this.dealHit(attacker, target, power * 0.5, dmgType, element, 0, ignoreDefPct, skill, true);
      }
    }

    // 因果の鎖伝播
    this.propagateChain(target, dealt);

    if (!target.isAlive) this.handleDefeat(target);
    return isCrit;
  }

  /** 因果の鎖: ダメージ伝播 (Trueダメージ・再帰なし) */
  private propagateChain(source: Combatant, dealt: number): void {
    if (source.isPlayer || dealt <= 0) return;
    for (const link of this.chainLinks) {
      let targets: Combatant[] = [];
      if (link.all) {
        targets = this.enemies.filter((e) => e.isAlive && e !== source);
      } else if (link.a === source && link.b?.isAlive) {
        targets = [link.b];
      } else if (link.b === source && link.a?.isAlive) {
        targets = [link.a];
      }
      for (const t of targets) {
        const chainDmg = Math.max(1, Math.round(dealt * link.pct));
        const chainDealt = t.takeDamage(chainDmg, 'True');
        this.emit({ kind: 'message', text: `因果連鎖！` });
        this.emit({ kind: 'damage', target: t, amount: chainDealt, isCrit: false, isWeak: false });
        if (!t.isAlive) this.handleDefeat(t);
      }
    }
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
    // 薙ぎの鑿: 弱点でなくてもシールドを削れる
    const aoeOverride = attacker.isPlayer && this.relics?.hasAoEShieldDamage();
    if (!forceHit && !aoeOverride && !this.isElementWeak(target, element)) return;
    if (target.currentShields <= 0) return;

    // 攻城鶴嘴/金剛の鑿: 削り数ボーナス
    if (attacker.isPlayer && this.relics) shieldDamage += this.relics.breakShieldDamageBonus();

    const broke = target.hitShield(shieldDamage);
    this.emit({ kind: 'shieldHit', target });
    if (broke) {
      // 苦悶の砂時計: Break延長
      if (attacker.isPlayer && this.relics) {
        target.brokenTurnsRemaining += this.relics.breakExtendTurns();
        for (const m of this.relics.onEnemyBroken(this.heroes)) {
          this.emit({ kind: 'message', text: m });
        }
      }
      this.emit({ kind: 'break', target });
      this.emit({ kind: 'message', text: `${target.name} をBreakした！` });
    }
  }

  private handleDefeat(target: Combatant): void {
    this.emit({ kind: 'defeat', target });

    // レリック: 撃破時効果 (喰屍鬼の歯・魂鳴りの角笛・魂の吊灯籠)
    if (!target.isPlayer && this.relics) {
      const { heal, soulReward } = this.relics.onEnemyKilled(this.heroes);
      if (heal > 0) this.emit({ kind: 'heal', target: this.heroes[0], amount: heal });
      if (soulReward) {
        this.soulSiphonRewards++;
        this.emit({ kind: 'message', text: '魂の吊灯籠が満ちた… 宝の在り処が視える！' });
      }
    }
  }

  // ── 敵ターン (BattleManager.EnemyTurn) ─────────────────────────────
  private enemyTurn(enemy: Combatant): void {
    const def = enemy.enemyDef!;
    const actionsToTake = def.actionsPerTurn;

    for (let i = 0; i < actionsToTake; i++) {
      if (!enemy.isAlive) return;

      let candidates = def.actions;
      // 恐怖: 物理攻撃不可
      if (enemy.hasStatus('Fear')) {
        candidates = candidates.filter(
          (a) => !(a.skill.damageType === 'Physical' && a.skill.basePower > 0));
        if (candidates.length === 0) {
          this.emit({ kind: 'message', text: `${enemy.name} は恐怖で動けない！` });
          continue;
        }
      }

      const valid = candidates
        .filter((a) =>
          a.useChance >= rnd.value() &&
          (a.healthThreshold === 0 || enemy.hpRatio * 100 <= a.healthThreshold))
        .sort((a, b) => b.priority - a.priority);

      const chosen = valid.length > 0 ? valid[0] : candidates[0];
      if (!chosen) continue;
      const skill = chosen.skill;

      // 沈黙: 技を使えず通常攻撃に切り替え
      // (Unity版は敵スキルのMPCostが全て0のため実質無効だったが、設計意図に沿い修正)
      if (enemy.isSilenced) {
        const livingHeroes0 = this.heroes.filter((h) => h.isAlive);
        if (livingHeroes0.length === 0) return;
        this.emit({ kind: 'message', text: `${enemy.name} は沈黙中！通常攻撃に切り替え` });
        const t = livingHeroes0[rnd.range(0, livingHeroes0.length)];
        this.emit({ kind: 'skillUse', user: enemy, skillName: '攻撃' });
        this.dealHit(enemy, t, 1.0, 'Physical', 'Physical', 0, 0);
        continue;
      }

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
            this.dealHit(enemy, target, skill.basePower, skill.damageType, skill.element, 0, 0, skill);
          }
        }
        if (target.isAlive && skill.appliedStatus && skill.statusChance) {
          // 解毒のロケット等: 状態異常無効レリック
          if (this.relics?.isImmuneToStatus(skill.appliedStatus.type)) {
            this.emit({ kind: 'message', text: `護符が${STATUS_DISPLAY_NAME[skill.appliedStatus.type]}を弾いた！` });
            continue;
          }
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

// ブースト強化テーブル — Unity版 Battle/BoostSkillResolver.cs +
// BoostSkillResolver_{Bernhard,Ash,Lavinia,Lilia,Zeno}.cs の移植。
// スキル名 → [×1, ×2, ×3] の強化定義。テーブルにないスキルは
// 従来通りの汎用ブースト (威力 ×(1+0.5×level)) にフォールバックする。
//
// Web版適応:
// - BurnChanceBonus / ApplyStatusChanceBonus → statusChanceBonus に統合
//   (Web版のスキルは appliedStatus を1つだけ持つため)
// - BindDurationBonus → statusDurationBonus に統合 (行動不能も appliedStatus)
// - SelfBuffIncluded は省略 (Web版のバフは元々使用者自身に乗る)
// - CurseChainAll (毒伝播・束縛伝播) は未実装のためフレーバーのみ
// - 魔力加速×3「次の魔法が会心確定」→ CritUp バフ (grantCritUp) で近似
// - 清浄/守護の祈り/蘇生×3 の被ダメ軽減バリア → Barrier 状態 (grantBarrier)
// - 呪縛×3「次ターン全敵行動不能」→ ActionSeal 付与 (bindTurns)
import type { SkillDef } from '../core/types';

export interface BoostUpgrade {
  flavor: string;
  powerMult?: number;            // 威力倍率 (省略時 ×1.0)
  extraHits?: number;            // ヒット数追加
  extraShieldDamage?: number;    // シールド削り追加
  forceBreakIfShielded?: boolean;// 残シールド無視で強制Break
  critRateBonus?: number;        // 会心率+% (加算)
  guaranteedCrit?: boolean;      // 会心確定
  lastHitGuaranteedCrit?: boolean; // 最終ヒットのみ会心確定
  ignoreDefPct?: number;         // 防御無視率 (スキル側と加算)
  buffDurationBonus?: number;    // バフ/デバフ持続+N (未定義なら汎用: +boostLevel)
  alsoBuffMagicAtk?: boolean;    // 魔法攻撃バフも追加付与
  alsoBuffPhysicalDef?: boolean; // 物理防御バフも追加付与
  healPartyHPPct?: number;       // 味方全員をMaxHP比で回復
  statusChanceBonus?: number;    // 状態異常付与率+ (未定義なら汎用: +0.1×level)
  statusDurationBonus?: number;  // 状態異常持続+N
  paralyzeStun?: boolean;        // 麻痺中の敵に行動封じを重ねる
  grantRegen?: boolean;          // 対象味方にリジェネ付与
  grantBarrier?: boolean;        // 対象味方に被ダメ軽減バリア付与
  grantCritUp?: number;          // 使用者に会心UPバフ (+N%)
  knockback?: boolean;           // 全敵の速度ダウン
  hitsAllEnemies?: boolean;      // 全体化 (攻撃/因果の鎖)
  hitsAllAllies?: boolean;       // 全体化 (回復/バフ/蘇生)
  splashToAdjacent?: boolean;    // 他の敵2体に50%威力スプラッシュ
  gainBP?: number;               // 使用後BP回復 (簒奪系は成功時)
  instantKillOnBrokenChance?: number; // Break中の敵への即死確率
  grantShadowState?: boolean;    // 使用後Shadow State付与
  executeChanceBonus?: number;   // 即死確率+ (必殺狙撃)
  executeThreshold?: number;     // 即死判定HP閾値の上書き
  bindTurns?: number;            // 対象に行動封じ(ActionSeal)をNターン付与
  healPowerMult?: number;        // 回復量倍率 (蘇生HP/リジェネ量も対象)
  alsoRevive?: boolean;          // 回復時に戦闘不能者も蘇生
  alsoRevivePct?: number;        // alsoRevive時の蘇生HP割合
  healRemovesAllStatus?: boolean;// 回復対象の状態異常を全解除
  undeadBonusMult?: number;      // アンデッド特効倍率+ (聖光弾/神罰)
  debuffAmplify?: number;        // デバフ量増幅 (加算 / 因果の鎖は連鎖率+)
  drainPct?: number;             // 与ダメージのN%をHP吸収 (暗黒波・吸収。スキル側と加算)
  randomDebuffCountBonus?: number; // ランダムデバフ種数+ (呪詛の霧)
  absorbChanceBonus?: number;    // 簒奪成功率+
  absorbHPCostMult?: number;     // 簒奪HP消費倍率 (0=無消費)
  delayReduction?: number;       // 死の宣告カウント短縮
}

type Table = Record<string, [BoostUpgrade, BoostUpgrade, BoostUpgrade]>;

const NONE: BoostUpgrade = { flavor: '', powerMult: 1 };

// ── 共通+ベルンハルト (BoostSkillResolver.BoostTable + _Bernhard) ──────
const BERNHARD: Table = {
  二段斬り: [
    { flavor: 'ヒット数+1', extraHits: 1 },
    { flavor: 'ヒット数+2', extraHits: 2 },
    { flavor: 'ヒット数+3、威力×1.2、最後は会心',
      extraHits: 3, powerMult: 1.2, lastHitGuaranteedCrit: true },
  ],
  盾砕き: [
    { flavor: 'シールドダメージ+1', extraShieldDamage: 1 },
    { flavor: 'シールドダメージ+1、威力×1.3', extraShieldDamage: 1, powerMult: 1.3 },
    { flavor: 'シールドダメージ+2、威力×1.5、即Break',
      extraShieldDamage: 2, powerMult: 1.5, forceBreakIfShielded: true },
  ],
  雄叫び: [
    { flavor: 'バフ持続+1T', buffDurationBonus: 1 },
    { flavor: 'バフ持続+2T、自分にも同じバフ', buffDurationBonus: 2 },
    { flavor: '物理+魔法バフ、自分含む、HP5%回復、+2T',
      buffDurationBonus: 2, alsoBuffMagicAtk: true, healPartyHPPct: 0.05 },
  ],
  強撃: [
    { flavor: '威力×1.5、会心+10%', powerMult: 1.5, critRateBonus: 10 },
    { flavor: '威力×2.0、会心+20%', powerMult: 2.0, critRateBonus: 20 },
    { flavor: '威力×2.5、会心確定、防御を50%無視',
      powerMult: 2.5, critRateBonus: 30, guaranteedCrit: true, ignoreDefPct: 0.5 },
  ],
  旋風斬: [
    { flavor: '威力×1.3', powerMult: 1.3 },
    { flavor: '威力×1.6、全敵シールド+1削る', powerMult: 1.6, extraShieldDamage: 1 },
    { flavor: '威力×2.0、シールド+2、全敵の速度ダウン',
      powerMult: 2.0, extraShieldDamage: 2, knockback: true },
  ],
  百烈斬: [
    { flavor: 'ヒット数+2', extraHits: 2 },
    { flavor: 'ヒット数+4、威力×1.2', extraHits: 4, powerMult: 1.2 },
    { flavor: 'ヒット数+5、全体化、シールドを削る',
      extraHits: 5, powerMult: 1.3, hitsAllEnemies: true },
  ],
  炎の刃: [
    { flavor: '威力×1.4、炎付与+1T', powerMult: 1.4, statusDurationBonus: 1 },
    { flavor: '威力×1.8、炎付与+2T、炎上確率+20%',
      powerMult: 1.8, statusDurationBonus: 2, statusChanceBonus: 0.20 },
    { flavor: '威力×2.2、炎上確率+40%、延焼',
      powerMult: 2.2, statusDurationBonus: 3, statusChanceBonus: 0.40, splashToAdjacent: true },
  ],
  雷迸り: [
    { flavor: '威力×1.3、麻痺確率+15%', powerMult: 1.3, statusChanceBonus: 0.15 },
    { flavor: '威力×1.6、麻痺確率+25%、BP+1',
      powerMult: 1.6, statusChanceBonus: 0.25, gainBP: 1 },
    { flavor: '威力×2.0、麻痺確率最大化、BP+2、麻痺の敵を封じる',
      powerMult: 2.0, statusChanceBonus: 0.35, gainBP: 2, paralyzeStun: true },
  ],
  覇剣: [
    { flavor: '威力×1.5', powerMult: 1.5 },
    { flavor: '威力×2.0、防御を30%無視', powerMult: 2.0, ignoreDefPct: 0.3 },
    { flavor: '威力×2.5、防御完全無視、Break中の敵に10%で即死',
      powerMult: 2.5, ignoreDefPct: 1.0, instantKillOnBrokenChance: 0.10 },
  ],
  大地の盾: [
    { flavor: '回復+5%、バフ+1T', healPartyHPPct: 0.05, buffDurationBonus: 1 },
    { flavor: '回復+10%、バフ+2T、物理防御も上昇',
      healPartyHPPct: 0.10, buffDurationBonus: 2, alsoBuffPhysicalDef: true },
    { flavor: '回復+15%、全防御UP、+3T、リジェネ付与',
      healPartyHPPct: 0.15, buffDurationBonus: 3, alsoBuffPhysicalDef: true, grantRegen: true },
  ],
  守りの構え: [
    { flavor: '防御バフ持続+1T', buffDurationBonus: 1 },
    { flavor: '防御バフ持続+2T、物理防御バフ効果も上昇',
      buffDurationBonus: 2, alsoBuffPhysicalDef: true },
    { flavor: '防御バフ持続+3T、全防御UP、リジェネ付与',
      buffDurationBonus: 3, alsoBuffPhysicalDef: true, grantRegen: true },
  ],
};

// ── アッシュ (BoostSkillResolver_Ash) ──────────────────────────────────
const ASH: Table = {
  影矢: [
    { flavor: '威力×1.5', powerMult: 1.5 },
    { flavor: '威力×2.0、会心率+20%', powerMult: 2.0, critRateBonus: 20 },
    { flavor: '威力×2.5、会心確定、影状態',
      powerMult: 2.5, guaranteedCrit: true, grantShadowState: true },
  ],
  毒矢: [
    { flavor: '毒持続+1T', statusDurationBonus: 1 },
    { flavor: '威力×1.3、毒持続+2T', powerMult: 1.3, statusDurationBonus: 2 },
    { flavor: '全体化、毒+3T', powerMult: 1.5, statusDurationBonus: 3, hitsAllEnemies: true },
  ],
  残影: [
    { flavor: '持続+1T', buffDurationBonus: 1 },
    { flavor: '持続+2T、反撃時の会心率+15%', buffDurationBonus: 2, critRateBonus: 15 },
    { flavor: '持続+3T、BP+1、影状態',
      buffDurationBonus: 3, gainBP: 1, grantShadowState: true },
  ],
  鷹の目: [
    { flavor: 'バフ+1T', buffDurationBonus: 1 },
    { flavor: 'バフ+2T、会心率追加+20%', buffDurationBonus: 2, critRateBonus: 20 },
    { flavor: 'バフ+3T、会心確定', buffDurationBonus: 3, guaranteedCrit: true },
  ],
  二連射: [
    { flavor: 'ヒット数+1', extraHits: 1 },
    { flavor: 'ヒット数+2、威力×1.1', extraHits: 2, powerMult: 1.1 },
    { flavor: 'ヒット数+3、威力×1.2、最後は会心',
      extraHits: 3, powerMult: 1.2, lastHitGuaranteedCrit: true },
  ],
  罠設置: [
    { flavor: '罠威力×1.3', powerMult: 1.3 },
    { flavor: '罠威力×1.6、スタン確率+20%', powerMult: 1.6, statusChanceBonus: 0.20 },
    { flavor: '罠威力×2.0、スタン確率最大、影状態',
      powerMult: 2.0, statusChanceBonus: 0.30, grantShadowState: true },
  ],
  スモーク: [
    { flavor: '弱体+1T', buffDurationBonus: 1 },
    { flavor: '弱体+2T、全敵の速度ダウン強化', buffDurationBonus: 2, knockback: true },
    { flavor: '弱体+3T、速度ダウン最大、影状態、BP+1',
      buffDurationBonus: 3, knockback: true, grantShadowState: true, gainBP: 1 },
  ],
  必殺狙撃: [
    { flavor: '威力×1.3、即死確率+10%',
      powerMult: 1.3, executeChanceBonus: 0.10, executeThreshold: 0.35 },
    { flavor: '威力×1.6、防御25%無視、即死確率+15%',
      powerMult: 1.6, ignoreDefPct: 0.25, executeChanceBonus: 0.15, executeThreshold: 0.35 },
    { flavor: '威力×2.0、防御50%無視、会心確定、即死率UP',
      powerMult: 2.0, ignoreDefPct: 0.50, guaranteedCrit: true,
      executeChanceBonus: 0.25, executeThreshold: 0.50 },
  ],
  矢の雨: [
    { flavor: 'ヒット数+1', extraHits: 1 },
    { flavor: 'ヒット数+2、威力×1.1', extraHits: 2, powerMult: 1.1 },
    { flavor: 'ヒット数+3、威力×1.2、盲目付与率最大',
      extraHits: 3, powerMult: 1.2, statusChanceBonus: 0.50 },
  ],
  影縫い: [
    { flavor: '威力×1.3', powerMult: 1.3 },
    { flavor: '威力×1.6、バインド+1T', powerMult: 1.6, statusDurationBonus: 1 },
    { flavor: '威力×2.0、バインド+2T、防御30%無視',
      powerMult: 2.0, statusDurationBonus: 2, ignoreDefPct: 0.30 },
  ],
  死の踊り: [
    { flavor: 'ヒット数+1、威力×1.1', extraHits: 1, powerMult: 1.1 },
    { flavor: 'ヒット数+2、威力×1.2、BP+1', extraHits: 2, powerMult: 1.2, gainBP: 1 },
    { flavor: 'ヒット数+3、威力×1.3、会心確定、BP+2',
      extraHits: 3, powerMult: 1.3, gainBP: 2, guaranteedCrit: true },
  ],
};

// ── ラヴィニア (BoostSkillResolver_Lavinia) ────────────────────────────
const LAVINIA: Table = {
  火炎弾: [
    { flavor: '威力×1.5、炎上確率+15%', powerMult: 1.5, statusChanceBonus: 0.15 },
    { flavor: '威力×2.0、炎上確率+30%', powerMult: 2.0, statusChanceBonus: 0.30 },
    { flavor: '威力×2.5、全体化、炎上確率最大',
      powerMult: 2.5, statusChanceBonus: 0.50, hitsAllEnemies: true },
  ],
  業火: [
    { flavor: '威力×1.4', powerMult: 1.4 },
    { flavor: '威力×1.8、魔法防御30%無視', powerMult: 1.8, ignoreDefPct: 0.30 },
    { flavor: '威力×2.3、魔法防御50%無視、Break中に15%で即死',
      powerMult: 2.3, ignoreDefPct: 0.50, instantKillOnBrokenChance: 0.15 },
  ],
  氷棘: [
    { flavor: 'ヒット数+1、凍結確率+10%', extraHits: 1, statusChanceBonus: 0.10 },
    { flavor: 'ヒット数+2、凍結確率+20%', extraHits: 2, statusChanceBonus: 0.20 },
    { flavor: 'ヒット数+3、凍結確率+30%、会心確定',
      extraHits: 3, statusChanceBonus: 0.30, guaranteedCrit: true },
  ],
  氷嵐: [
    { flavor: '威力×1.35、凍結確率+10%', powerMult: 1.35, statusChanceBonus: 0.10 },
    { flavor: '威力×1.7、凍結確率+20%、全敵の速度ダウン',
      powerMult: 1.7, statusChanceBonus: 0.20, knockback: true },
    { flavor: '威力×2.1×2ヒット、凍結確率最大、速度ダウン',
      powerMult: 2.1, statusChanceBonus: 0.30, knockback: true, extraHits: 1 },
  ],
  連鎖雷撃: [
    { flavor: '威力×1.3、麻痺確率+10%', powerMult: 1.3, statusChanceBonus: 0.10 },
    { flavor: '威力×1.6、麻痺確率+20%、BP+1',
      powerMult: 1.6, statusChanceBonus: 0.20, gainBP: 1 },
    { flavor: '威力×2.0、麻痺中の敵を完全スタン、BP+2',
      powerMult: 2.0, statusChanceBonus: 0.30, gainBP: 2, paralyzeStun: true },
  ],
  風刃嵐: [
    { flavor: 'ヒット数+1、威力×1.1', extraHits: 1, powerMult: 1.1 },
    { flavor: 'ヒット数+2、威力×1.2、全敵の速度ダウン',
      extraHits: 2, powerMult: 1.2, knockback: true },
    { flavor: 'ヒット数+3、威力×1.3、速度ダウン延長',
      extraHits: 3, powerMult: 1.3, knockback: true },
  ],
  暗黒波: [
    { flavor: '威力×1.4（必中維持）', powerMult: 1.4 },
    { flavor: '威力×1.8、魔法防御25%無視', powerMult: 1.8, ignoreDefPct: 0.25 },
    { flavor: '威力×2.2、防御50%無視、HP吸収',
      powerMult: 2.2, ignoreDefPct: 0.50, drainPct: 0.30 },
  ],
  聖光閃: [
    { flavor: '威力×1.4', powerMult: 1.4 },
    { flavor: '威力×1.7、全体化', powerMult: 1.7, hitsAllEnemies: true },
    { flavor: '威力×2.2、全体、味方全員にリジェネ付与',
      powerMult: 2.2, hitsAllEnemies: true, grantRegen: true },
  ],
  魔力爆発: [
    { flavor: '威力×1.4（MPスケーリング維持）', powerMult: 1.4 },
    { flavor: '威力×1.8、防御20%無視', powerMult: 1.8, ignoreDefPct: 0.20 },
    { flavor: '3連続発動（×2.3×3）/ 防御50%無視',
      powerMult: 2.3, ignoreDefPct: 0.50, extraHits: 2 },
  ],
  元素収束: [
    { flavor: '全元素収束威力×1.3', powerMult: 1.3 },
    { flavor: '×1.6、爆発後BP+1', powerMult: 1.6, gainBP: 1 },
    { flavor: '×2.0、全体化、BP+2', powerMult: 2.0, gainBP: 2, hitsAllEnemies: true },
  ],
  魔力加速: [
    { flavor: 'バフ+1T', buffDurationBonus: 1 },
    { flavor: 'バフ+2T、魔法攻撃力+20%も追加', buffDurationBonus: 2, alsoBuffMagicAtk: true },
    { flavor: 'バフ+3T、魔法攻撃+20%、会心UP大付与',
      buffDurationBonus: 3, alsoBuffMagicAtk: true, grantCritUp: 50 },
  ],
  沈黙の呪詛: [
    { flavor: '沈黙持続+1T', statusDurationBonus: 1 },
    { flavor: '全体化、沈黙+2T', statusDurationBonus: 2, hitsAllEnemies: true },
    { flavor: '全体沈黙+3T', statusDurationBonus: 3, hitsAllEnemies: true },
  ],
};

// ── リリア (BoostSkillResolver_Lilia) ──────────────────────────────────
const LILIA: Table = {
  治癒: [
    { flavor: '回復量×1.5', healPowerMult: 1.5 },
    { flavor: '回復量×2.0、状態異常も全回復', healPowerMult: 2.0, healRemovesAllStatus: true },
    { flavor: '回復量×2.5、全体化、状態異常も治す',
      healPowerMult: 2.5, healRemovesAllStatus: true, hitsAllAllies: true },
  ],
  清浄: [
    { flavor: '全体化（全員の状態異常を同時に解除）', hitsAllAllies: true },
    { flavor: '全体化、浄化後にリジェネも付与', hitsAllAllies: true, grantRegen: true },
    { flavor: '全体化、リジェネ付与、バリア',
      hitsAllAllies: true, grantRegen: true, grantBarrier: true },
  ],
  聖光弾: [
    { flavor: '威力×1.5、対アンデッド+0.5', powerMult: 1.5, undeadBonusMult: 0.5 },
    { flavor: '威力×2.0、対アンデッド+1.0', powerMult: 2.0, undeadBonusMult: 1.0 },
    { flavor: '威力×2.5、全体化、対アンデッド+1.5',
      powerMult: 2.5, undeadBonusMult: 1.5, hitsAllEnemies: true },
  ],
  守護の祈り: [
    { flavor: 'バフ+1T、自分にも適用', buffDurationBonus: 1 },
    { flavor: '全体化、バフ+2T、全員に守護', buffDurationBonus: 2, hitsAllAllies: true },
    { flavor: '全体化、バフ+3T、守護＋リジェネ、バリア',
      buffDurationBonus: 3, hitsAllAllies: true, grantRegen: true, grantBarrier: true },
  ],
  聖癒: [
    { flavor: '回復量×1.4', healPowerMult: 1.4 },
    { flavor: '回復量×1.8、リジェネも付与', healPowerMult: 1.8, grantRegen: true },
    { flavor: '回復量×2.3、リジェネ付与、蘇生30%',
      healPowerMult: 2.3, grantRegen: true, alsoRevive: true, alsoRevivePct: 0.30 },
  ],
  蘇生: [
    { flavor: '蘇生HP+30%', healPowerMult: 1.3 },
    { flavor: '蘇生HP+30%、リジェネ付与', healPowerMult: 1.3, grantRegen: true },
    { flavor: '全員蘇生、全員にリジェネ、バリア',
      healPowerMult: 1.3, hitsAllAllies: true, grantRegen: true, grantBarrier: true },
  ],
  再生の光: [
    { flavor: 'リジェネ持続+2T', buffDurationBonus: 2 },
    { flavor: 'リジェネ持続+3T、回復量×1.3', buffDurationBonus: 3, healPowerMult: 1.3 },
    { flavor: 'リジェネ持続+5T、回復量×1.6、状態異常も治す',
      buffDurationBonus: 5, healPowerMult: 1.6, healRemovesAllStatus: true },
  ],
  全体治癒: [
    { flavor: '全体回復量×1.4', healPowerMult: 1.4 },
    { flavor: '全体回復量×1.8、状態異常も全回復', healPowerMult: 1.8, healRemovesAllStatus: true },
    { flavor: '全体回復×2.3、状態異常も治す、リジェネ、蘇生40%',
      healPowerMult: 2.3, healRemovesAllStatus: true, grantRegen: true,
      alsoRevive: true, alsoRevivePct: 0.40 },
  ],
  神罰: [
    { flavor: '威力×1.4、対アンデッド+0.5', powerMult: 1.4, undeadBonusMult: 0.5 },
    { flavor: '威力×1.8、ヒット+1、対アンデッド+1.0',
      powerMult: 1.8, undeadBonusMult: 1.0, extraHits: 1 },
    { flavor: '威力×2.2、ヒット+2、確定Break、ボーナス+1.5',
      powerMult: 2.2, undeadBonusMult: 1.5, extraHits: 2, forceBreakIfShielded: true },
  ],
  聖域: [
    { flavor: 'バフ持続+1T', buffDurationBonus: 1 },
    { flavor: 'バフ持続+2T、物理防御バフも追加', buffDurationBonus: 2, alsoBuffPhysicalDef: true },
    { flavor: 'バフ持続+3T、物理防御バフ、蘇生50%、BP+1',
      buffDurationBonus: 3, alsoBuffPhysicalDef: true,
      alsoRevive: true, alsoRevivePct: 0.50, gainBP: 1 },
  ],
  奇跡の祝福: [
    { flavor: 'バフ持続+1T、リジェネ付与', grantRegen: true, buffDurationBonus: 1 },
    { flavor: 'バフ+2T、リジェネ、BP+1', grantRegen: true, buffDurationBonus: 2, gainBP: 1 },
    { flavor: 'バフ+3T、リジェネ、BP+2、蘇生100%',
      grantRegen: true, buffDurationBonus: 3, gainBP: 2, alsoRevive: true, alsoRevivePct: 1.0 },
  ],
};

// ── ゼノ (BoostSkillResolver_Zeno) ─────────────────────────────────────
const ZENO: Table = {
  呪縛: [
    { flavor: '速度弱体+1T', buffDurationBonus: 1 },
    { flavor: '全体化、弱体+2T', buffDurationBonus: 2, hitsAllEnemies: true },
    { flavor: '全体化、弱体増幅、+3T、全敵を封じる',
      buffDurationBonus: 3, hitsAllEnemies: true, debuffAmplify: 0.20, bindTurns: 1 },
  ],
  毒霧: [
    { flavor: '毒持続+2T', statusDurationBonus: 2 },
    { flavor: '毒持続+3T、付与確率+10%', statusDurationBonus: 3, statusChanceBonus: 0.10 },
    { flavor: '毒持続+4T、付与確率+20%', statusDurationBonus: 4, statusChanceBonus: 0.20 },
  ],
  恐怖の叫び: [
    { flavor: '恐怖+1T、弱体-10%増幅', statusDurationBonus: 1, debuffAmplify: 0.10 },
    { flavor: '全体化、恐怖+2T、弱体増幅',
      statusDurationBonus: 2, debuffAmplify: 0.20, hitsAllEnemies: true },
    { flavor: '全体化、恐怖+3T、弱体増幅、麻痺の敵を封じる',
      statusDurationBonus: 3, debuffAmplify: 0.30, hitsAllEnemies: true, paralyzeStun: true },
  ],
  呪いの眼差し: [
    { flavor: '全ステータス弱体増幅、持続+1T', debuffAmplify: 0.05, buffDurationBonus: 1 },
    { flavor: '全ステータス弱体増幅、持続+2T', debuffAmplify: 0.10, buffDurationBonus: 2 },
    { flavor: '全体化、弱体増幅、持続+3T',
      debuffAmplify: 0.15, buffDurationBonus: 3, hitsAllEnemies: true },
  ],
  吸収: [
    { flavor: '威力×1.4', powerMult: 1.4 },
    { flavor: '威力×1.7、回復量+25%', powerMult: 1.7, drainPct: 0.25 },
    { flavor: '威力×2.0、全体化、回復量+50%', powerMult: 2.0, hitsAllEnemies: true, drainPct: 0.50 },
  ],
  簒奪: [
    { flavor: '簒奪確率+15%', absorbChanceBonus: 0.15 },
    { flavor: '簒奪確率+25%、HP消費-50%', absorbChanceBonus: 0.25, absorbHPCostMult: 0.5 },
    { flavor: '簒奪確率+35%、HP消費なし、簒奪成功時BP+1',
      absorbChanceBonus: 0.35, absorbHPCostMult: 0, gainBP: 1 },
  ],
  魂縛: [
    { flavor: '行動不能+1T', statusDurationBonus: 1 },
    { flavor: '全体化、行動不能+2T', statusDurationBonus: 2, hitsAllEnemies: true },
    { flavor: '全体化、行動不能+3T', statusDurationBonus: 3, hitsAllEnemies: true },
  ],
  呪詛の霧: [
    { flavor: '状態異常付与確率+20%、弱体+1T',
      statusChanceBonus: 0.20, buffDurationBonus: 1 },
    { flavor: '付与確率+30%、弱体+2T、弱体増幅+10%',
      statusChanceBonus: 0.30, buffDurationBonus: 2, debuffAmplify: 0.10 },
    { flavor: 'ランダム弱体3種、付与確率+40%、持続+3T、増幅+20%',
      statusChanceBonus: 0.40, buffDurationBonus: 3, debuffAmplify: 0.20,
      randomDebuffCountBonus: 1 },
  ],
  因果の鎖: [
    { flavor: '鎖持続+1T', buffDurationBonus: 1 },
    { flavor: '持続+2T、連鎖ダメージ+20%増幅', buffDurationBonus: 2, debuffAmplify: 0.20 },
    { flavor: '持続+3T、全敵を連結、連鎖ダメージ最大',
      buffDurationBonus: 3, debuffAmplify: 0.50, hitsAllEnemies: true },
  ],
  魂喰い: [
    { flavor: '簒奪確率+15%', absorbChanceBonus: 0.15 },
    { flavor: '簒奪確率+30%、成功時BP+1', absorbChanceBonus: 0.30, gainBP: 1 },
    { flavor: '簒奪確率+50%、成功時BP+2', absorbChanceBonus: 0.50, gainBP: 2 },
  ],
  死の宣告: [
    { flavor: '発動-1T', delayReduction: 1 },
    { flavor: '発動-2T、ボスへのダメージ+20%増幅', delayReduction: 2, debuffAmplify: 0.20 },
    { flavor: '即時発動、ボスへの宣告ダメージ倍増', delayReduction: 3, debuffAmplify: 1.0 },
  ],
  混沌の呪い: [
    { flavor: '全弱体持続+1T、効果量+5%', buffDurationBonus: 1, debuffAmplify: 0.05 },
    { flavor: '持続+2T、効果量+10%、付与率+10%',
      buffDurationBonus: 2, debuffAmplify: 0.10, statusChanceBonus: 0.10 },
    { flavor: '持続+3T、効果量+20%、付与率+20%',
      buffDurationBonus: 3, debuffAmplify: 0.20, statusChanceBonus: 0.20 },
  ],
  冥界の扉: [
    { flavor: '強敵への簒奪率+10%、弱体延長+1',
      absorbChanceBonus: 0.10, buffDurationBonus: 1 },
    { flavor: '強敵への簒奪率+20%、弱体延長+2、BP+1',
      absorbChanceBonus: 0.20, buffDurationBonus: 2, gainBP: 1 },
    { flavor: '強敵への簒奪率+40%、弱体延長+3、BP+2',
      absorbChanceBonus: 0.40, buffDurationBonus: 3, gainBP: 2 },
  ],
};

const ALL_TABLES: Table = { ...BERNHARD, ...ASH, ...LAVINIA, ...LILIA, ...ZENO };

/** テーブルの全キー (テスト用: スキル名との突合に使う) */
export const BOOST_TABLE_KEYS = Object.keys(ALL_TABLES);

/** BoostSkillResolver.GetUpgrade の移植。強化版スキル (○○＋) は基本名で参照する */
export function getBoostUpgrade(skill: SkillDef, boostLevel: number): BoostUpgrade {
  if (boostLevel <= 0) return NONE;
  const key = skill.name.replace(/＋$/, '');
  const entry = ALL_TABLES[key];
  if (entry) return entry[Math.min(boostLevel, 3) - 1];
  // 汎用フォールバック (BoostUpgrade.Default): 威力×(1+0.5×level)
  const mult = 1 + boostLevel * 0.5;
  return { flavor: `威力×${mult.toFixed(1)}`, powerMult: mult };
}

/** BoostSkillResolver.GetBoostPreviewText の移植 (UIプレビュー用) */
export function getBoostPreview(skill: SkillDef, boostLevel: number): string {
  return getBoostUpgrade(skill, boostLevel).flavor;
}

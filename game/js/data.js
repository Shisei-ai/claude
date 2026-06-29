/* =========================================================================
 * 鋼鉄戦線 (Steel Front) - データ定義
 *  工業（供給チェーン）版:
 *    部品工場(ボディ/ヘッド/ウェポン) → 在庫 → 組立ライン が在庫を消費して
 *    ユニットを連続生産する。ユニット性能は
 *      ボディ(兵科×グレード) ＋ ヘッドCPU(拡張スキル) ＋ ウェポン(武器性能)
 *    の組み合わせで決まる。
 * ========================================================================= */
(function (G) {
  'use strict';

  G.MIN_DMG = 1;

  // ===== 基本素材（鉱区で採取。6素材＝6鉱区＝6グレードのラダー） =====
  G.MATERIALS = ['iron', 'copper', 'silver', 'gold', 'platinum', 'diamond'];
  G.MAT_INFO = {
    iron:     { name: '鉄',       icon: '⛓', color: '#b8c0c8', grade: 1 },
    copper:   { name: '銅',       icon: '🟧', color: '#e08a4a', grade: 2 },
    silver:   { name: '銀',       icon: '⚪', color: '#cdd6e0', grade: 3 },
    gold:     { name: '金',       icon: '🟡', color: '#ffcf5a', grade: 4 },
    platinum: { name: 'プラチナ', icon: '⬜', color: '#cfe6ff', grade: 5 },
    diamond:  { name: 'ダイヤ',   icon: '💎', color: '#7fe0ff', grade: 6 },
  };

  // ===== 鉱区Ⅰ〜Ⅵ（採取モジュールを投入して素材を得る。ストーリーで解放） =====
  //   鉱区Ⅰ→鉄(G1) … 鉱区Ⅵ→ダイヤ(G6)。1モジュールあたり rate/秒。
  G.ZONES = [
    { name: '鉱区Ⅰ', mat: 'iron',     rate: 0.55 },
    { name: '鉱区Ⅱ', mat: 'copper',   rate: 0.48 },
    { name: '鉱区Ⅲ', mat: 'silver',   rate: 0.40 },
    { name: '鉱区Ⅳ', mat: 'gold',     rate: 0.34 },
    { name: '鉱区Ⅴ', mat: 'platinum', rate: 0.30 },
    { name: '鉱区Ⅵ', mat: 'diamond',  rate: 0.24 },
  ];

  // ===== 製錬レシピ（製錬炉が素材ペア→中間素材。グレード帯に対応） =====
  //   グレードを上げると、部品工場が要求する中間素材が上位へ移り、新しい素材が要る。
  //   grade1 鋼材(鉄) → 2 合金(鉄+銅) → 3 銀回路(銅+銀) → 4 金回路(銀+金) → 5 輝素核(金+白金) → 6 動力核(白金+ダイヤ)
  G.RECIPES = {
    steel:    { name: '鋼材',   icon: '▭', color: '#9fb0bd', grade: 1, time: 1.3, in: { iron: 2 } },
    alloy:    { name: '合金',   icon: '🔩', color: '#cdd6e0', grade: 2, time: 1.4, in: { iron: 1, copper: 1 } },
    scircuit: { name: '銀回路', icon: '🧩', color: '#bfe0c8', grade: 3, time: 1.6, in: { copper: 1, silver: 1 } },
    gcircuit: { name: '金回路', icon: '📟', color: '#ffe6a0', grade: 4, time: 1.8, in: { silver: 1, gold: 1 } },
    pcore:    { name: '輝素核', icon: '🔆', color: '#dff0ff', grade: 5, time: 2.0, in: { gold: 1, platinum: 1 } },
    core:     { name: '動力核', icon: '🔋', color: '#ff9e6b', grade: 6, time: 2.2, in: { platinum: 1, diamond: 1 } },
  };
  G.RECIPE_ORDER = ['steel', 'alloy', 'scircuit', 'gcircuit', 'pcore', 'core'];
  G.GRADE_INT = ['steel', 'alloy', 'scircuit', 'gcircuit', 'pcore', 'core'];  // グレード1〜6 が要求する中間素材
  G.gradeInt = function (grade) { return G.GRADE_INT[Math.max(0, Math.min(5, (grade || 1) - 1))]; };

  // ===== ユーティリティ（旧データ。未使用） =====
  G.UTIL = { water: { name: '水', icon: '💧', color: '#5ec6ff' }, fuel: { name: '燃料', icon: '🛢', color: '#ffb13b' } };

  // ===== 中間素材（設備が 基本素材＋水/燃料 から生産。グレード帯に対応） =====
  //   合金=鉄+銅(G1-2) / 回路=銀+金(G3-4) / 動力核=プラチナ+ダイヤ(G5-6)
  G.INTERMEDIATES = {
    alloy:   { name: '合金',   icon: '🔩', color: '#cdd6e0', time: 1.4, mats: { iron: 1, copper: 1 }, water: 1, fac: 'smelter' },
    circuit: { name: '回路',   icon: '🧩', color: '#7fe0a8', time: 1.8, mats: { silver: 1, gold: 1 }, water: 1, fac: 'electro' },
    core:    { name: '動力核', icon: '🔋', color: '#ff9e6b', time: 2.2, mats: { platinum: 1, diamond: 1 }, fuel: 1, fac: 'coreforge' },
  };

  // ===== パーツの中間素材コスト（最後にこの3種を合体してユニット） =====
  G.PART_COST = {
    body: {
      infantry: { alloy: 1 }, assault: { alloy: 2 },
      heavy: { alloy: 2, core: 1 }, shooter: { alloy: 1, circuit: 1 }, flyer: { alloy: 1, circuit: 1 },
    },
    head: { alloy: 1 },
    weapon: {
      standard: { alloy: 1 }, splash: { alloy: 1, circuit: 1 }, chain: { alloy: 1, circuit: 1 }, heavyW: { core: 1, circuit: 1 },
    },
  };

  G.MAT_CAP_BASE = 260;   // 素材/中間素材/水/燃料 の基本貯蔵上限（貯蔵庫で増加）

  // ---- 設備（カウント式。建設コストは鉄。cat=UIグループ） ----------------
  G.FACILITIES = {
    reactor:  { name: '発電所', icon: '⚡', cost: 90, costScale: 1.22, power: 24, cat: 'power', desc: '電力を供給。全設備の稼働に必要。' },
    pump:     { name: '取水ポンプ', icon: '💧', cost: 70, costScale: 1.2, power: -6, water: 0.7, cat: 'util', desc: '水を産出（電力消費）。' },
    refinery: { name: '精製所', icon: '🛢', cost: 95, costScale: 1.22, power: -8, fuel: 0.5, cat: 'util', desc: '燃料を精製（電力消費）。' },
    moduleFab:{ name: 'モジュール工房', icon: '📦', cost: 120, costScale: 1.24, power: -7, module: 0.10, cat: 'util', desc: '採取モジュールを製造（保有上限まで）。' },
    smelter:  { name: '製錬炉', icon: '🔩', cost: 100, costScale: 1.22, power: -10, make: 'alloy', cat: 'smelt', desc: '鉄＋銅＋水 → 合金（G1-2）。' },
    electro:  { name: '電子工房', icon: '🧩', cost: 125, costScale: 1.24, power: -10, make: 'circuit', cat: 'smelt', desc: '銀＋金＋水 → 回路（G3-4）。' },
    coreforge:{ name: 'コア炉', icon: '🔋', cost: 155, costScale: 1.26, power: -14, make: 'core', cat: 'smelt', desc: 'プラチナ＋ダイヤ＋燃料 → 動力核（G5-6）。' },
    lab:      { name: '研究所', icon: '🔬', cost: 110, costScale: 1.24, power: -8, research: 0.55, cat: 'base', desc: '研究ポイントを蓄積。' },
    depot:    { name: '貯蔵庫', icon: '🏪', cost: 70, costScale: 1.2, power: -1, cap: 200, cat: 'base', desc: '素材・中間素材の貯蔵上限+200。' },
    relay:    { name: '通信中継塔', icon: '📡', cost: 120, costScale: 1.25, power: -4, capacity: 6, cat: 'base', desc: '指揮容量+6。' },
    turret:   { name: '防衛砲台', icon: '🗼', cost: 160, costScale: 1.3, power: -6, cat: 'base', desc: '前線の固定砲（対空可）。' },
  };

  // ---- 工業設備（インスタンス式・各台に割当を持つ） ----------------------
  //   kind: body/head/weapon/assembly。body/weapon 工場は割当(assign)を持つ。
  G.INDUSTRY = {
    bodyFab:   { name: 'ボディ工場', icon: '🦿', cost: 100, costScale: 1.2, power: -8, kind: 'body' },
    headFab:   { name: 'ヘッド工場', icon: '🧠', cost: 80, costScale: 1.2, power: -5, kind: 'head', partTime: 1.0, partCost: 4 },
    weaponFab: { name: 'ウェポン工場', icon: '🔫', cost: 100, costScale: 1.2, power: -8, kind: 'weapon' },
    assembly:  { name: '組立ライン', icon: '⚙', cost: 140, costScale: 1.24, power: -10, kind: 'assembly', time: 1.7 },
  };

  // ---- ボディ（兵科） ------------------------------------------------------
  //   グレードで hp/dmg が ×、def が ＋ される。part* は工場での生産コスト/時間。
  G.BODIES = {
    infantry: { name: '歩兵', icon: '🪖', hp: 50, dmg: 8, def: 1, speed: 52, range: 30, rate: 1.0, cap: 1, domain: 'ground', antiAir: false, partCost: 6, partTime: 1.1, desc: 'スタンダードで安価。物量を担保する主力。' },
    assault:  { name: '突撃兵', icon: '⚡', hp: 42, dmg: 22, def: 0, speed: 90, range: 28, rate: 1.1, cap: 2, domain: 'ground', antiAir: false, partCost: 14, partTime: 1.7, desc: '高火力・高速・低耐久。敵陣を突破する。' },
    heavy:    { name: '重装兵', icon: '🛡', hp: 260, dmg: 13, def: 8, speed: 24, range: 30, rate: 1.0, cap: 4, domain: 'ground', antiAir: false, partCost: 40, partTime: 3.2, desc: '高耐久・高防御・鈍重。前線を支える鉄壁。' },
    shooter:  { name: '射撃兵', icon: '🎯', hp: 52, dmg: 20, def: 1, speed: 40, range: 160, rate: 1.0, cap: 3, domain: 'ground', antiAir: true, partCost: 28, partTime: 2.4, desc: '後方から狙撃。対空可で安定して削る。' },
    flyer:    { name: '飛行兵', icon: '🚁', hp: 88, dmg: 14, def: 2, speed: 56, range: 120, rate: 1.0, cap: 3, domain: 'air', antiAir: true, partCost: 34, partTime: 2.6, desc: '空中から射撃。地上に阻まれず奥へ進む（対空可）。' },
  };
  G.bodyGradeMult = function (g) { return 1 + (g - 1) * 0.22; };  // hp/dmg 倍率
  G.bodyGradeDef = function (g) { return (g - 1) * 1; };          // def 加算

  // ---- ヘッドCPU（拡張スキル） --------------------------------------------
  //   研究で解放し、組立ラインのヘッドスロット(=ヘッドグレード数)に装着する。
  G.CPUS = {
    // 基本ステータス強化
    cpu_armor:   { name: '装甲CPU', icon: '🛡', effect: { def: 3 }, desc: '防御力 +3' },
    cpu_plate:   { name: '増装CPU', icon: '❤', effect: { hpMult: 0.30 }, desc: '最大HP +30%' },
    cpu_servo:   { name: '加速CPU', icon: '💨', effect: { speedMult: 0.30 }, desc: '移動速度 +30%' },
    cpu_scope:   { name: '照準CPU', icon: '🔭', effect: { range: 55 }, desc: '射程 +55' },
    cpu_trigger: { name: '連射CPU', icon: '🔁', effect: { rateMult: 0.35 }, desc: '攻撃速度 +35%' },
    cpu_power:   { name: '出力CPU', icon: '🔥', effect: { dmgMult: 0.28 }, desc: '攻撃力 +28%' },
    // 特殊効果（戦術CPU）
    cpu_aa:      { name: '対空CPU', icon: '📡', effect: { antiAir: true }, desc: '空中目標を攻撃可能になる' },
    cpu_pierce:  { name: '貫通CPU', icon: '🜂', effect: { pierce: 6 }, desc: '敵の防御力を 6 無視' },
    cpu_crit:    { name: '暴撃CPU', icon: '✱', effect: { crit: 0.25, critMult: 2.0 }, desc: '25% の確率でダメージ2倍' },
    cpu_drain:   { name: '吸命CPU', icon: '🩸', effect: { lifesteal: 0.30 }, desc: '与ダメージの30%だけ自己回復' },
    cpu_regen:   { name: '修復CPU', icon: '✚', effect: { regen: 0.05 }, desc: '毎秒 最大HPの5%を回復' },
    cpu_guard:   { name: '反応装甲CPU', icon: '🧱', effect: { def: 2, hpMult: 0.12 }, desc: '防御力 +2／最大HP +12%' },
    // 状態異常・特殊挙動
    cpu_slow:    { name: '鈍化CPU', icon: '❄', effect: { slow: 0.55, slowDur: 1.6 }, desc: '命中した敵の移動速度を45%低下（1.6秒）' },
    cpu_stun:    { name: '麻痺CPU', icon: '✦', effect: { stunChance: 0.15, stunDur: 0.8 }, desc: '15%の確率で敵を0.8秒 行動不能に' },
    cpu_shield:  { name: '遮蔽CPU', icon: '◈', effect: { shield: 0.40 }, desc: '最大HPの40%のシールド（被弾が止むと再生）' },
    cpu_thorns:  { name: '反射CPU', icon: '⟐', effect: { thorns: 0.30 }, desc: '被弾時、受けたダメージの30%を反射' },
    cpu_multi:   { name: '多重CPU', icon: '⁂', effect: { multishot: 2 }, desc: '攻撃時、近くの敵 最大2体を追撃（威力60%）' },
  };

  // ---- ウェポン（武器性能・ライン毎に選択） -------------------------------
  //   kind: single/aoe/chain。grade(=ウェポンティア)で効果が上がる。
  G.WEAPONS = {
    standard: { name: '標準兵装', icon: '•', kind: 'single', partCost: 5, partTime: 1.0,
      compute: function (g) { return { dmgMult: 1 + 0.12 * (g - 1) }; }, desc: '単体攻撃。グレードで火力上昇。' },
    splash:   { name: '拡散兵装', icon: '✸', kind: 'aoe', partCost: 14, partTime: 1.8,
      compute: function (g) { return { dmgMult: 0.85 + 0.05 * (g - 1), aoe: 34 + 10 * g }; }, desc: '着弾点の周囲も巻き込む範囲攻撃。密集に有効。' },
    chain:    { name: '連鎖兵装', icon: '⟿', kind: 'chain', partCost: 14, partTime: 1.8,
      compute: function (g) { return { dmgMult: 0.9, chain: g }; }, desc: '敵から敵へ連鎖。縦列の群れを薙ぐ。' },
    heavyW:   { name: '重兵装', icon: '✦', kind: 'single', partCost: 20, partTime: 2.2,
      compute: function (g) { return { dmgMult: 1.35 + 0.18 * (g - 1) }; }, desc: '単体高火力。装甲・ボスを割る。' },
  };
  G.CHAIN_RANGE = 110;   // 連鎖が次の敵を探す距離
  G.CHAIN_FALLOFF = 0.7; // 連鎖ごとの減衰

  // 部品在庫の上限（満杯になると工場は停止し鉱石を消費しない）。
  // body/weapon は種類ごと、head は単一プール。
  G.STOCK_CAP = { body: 40, head: 80, weapon: 40 };

  // ---- 敵（イーヴィル：旧文明の機生兵が歪に進化した存在） ----------------
  G.ENEMIES = {
    swarmling: { name: '小型・イーヴィル', icon: '▾', hp: 42, dmg: 6, def: 0, speed: 30, range: 24, rate: 0.9, bounty: 3, domain: 'ground', antiAir: false, color: '#e0556b' },
    armored:   { name: '重装・イーヴィル', icon: '◆', hp: 185, dmg: 14, def: 7, speed: 20, range: 26, rate: 1.1, bounty: 7, domain: 'ground', antiAir: false, color: '#c23b78' },
    spitter:   { name: '砲塔・イーヴィル', icon: '✶', hp: 55, dmg: 19, def: 1, speed: 24, range: 145, rate: 1.1, bounty: 6, domain: 'ground', antiAir: false, color: '#d65fa0' },
    wyrm:      { name: '飛翔・イーヴィル', icon: '✦', hp: 78, dmg: 16, def: 2, speed: 36, range: 110, rate: 1.0, bounty: 9, domain: 'air', antiAir: true, color: '#ff7ad0' },
    herald:    { name: '巨蟲・イーヴィル', icon: '❖', hp: 760, dmg: 30, def: 12, speed: 16, range: 30, rate: 1.4, bounty: 30, domain: 'ground', antiAir: false, color: '#c23b78', boss: true, warnJp: '警告　巨蟲接近', warnEn: 'WARNING : BROOD' },
    titan:     { name: '巨核・イーヴィル', icon: '✪', hp: 1500, dmg: 60, def: 10, speed: 14, range: 34, rate: 1.5, bounty: 60, domain: 'ground', antiAir: true, color: '#ff3b3b', boss: true, warnJp: '警告　巨核接近', warnEn: 'WARNING : TITAN' },
  };

  // ---- 研究ツリー ---------------------------------------------------------
  //   effect: mineMult(鉱区産出) / interSpeed(製錬速度) / buildSpeed(部品工場速度)
  //           powerSave / moduleCap(モジュール保有上限) / capacity / researchMult
  //           unlockBody/unlockWeapon/unlockCpu / bodyTier/weaponTier/headTier
  G.TECHS = {
    // 工業
    mining1:   { name: '採掘最適化', branch: '工業', cost: 40, req: [], desc: '全鉱区の産出 +25%。', effect: { mineMult: 0.25 } },
    smelt1:    { name: '製錬最適化', branch: '工業', cost: 60, req: ['mining1'], desc: '中間素材設備の生産速度 +30%。', effect: { interSpeed: 0.30 } },
    powergrid: { name: '送電網改良', branch: '工業', cost: 70, req: ['mining1'], desc: '全設備の電力消費 -20%。', effect: { powerSave: 0.20 } },
    fab1:      { name: '部品増産',   branch: '工業', cost: 80, req: ['smelt1'], desc: '部品工場の生産速度 +30%。', effect: { buildSpeed: 0.30 } },
    mining2:   { name: '深層採掘',   branch: '工業', cost: 140, req: ['fab1'], desc: '全鉱区の産出 さらに +40%。', effect: { mineMult: 0.40 } },

    // 採取（モジュール工房の解放＋保有上限）
    module1:   { name: '採取拡張Ⅰ', branch: '採取', cost: 50, req: [], desc: 'モジュール工房を解放／採取モジュール保有上限 +3。', effect: { moduleCap: 3, unlockMach: 'modfab' } },
    module2:   { name: '採取拡張Ⅱ', branch: '採取', cost: 110, req: ['module1'], desc: '採取モジュール保有上限 +4。', effect: { moduleCap: 4 } },
    module3:   { name: '採取拡張Ⅲ', branch: '採取', cost: 180, req: ['module2'], desc: '採取モジュール保有上限 +5。', effect: { moduleCap: 5 } },

    // 機体（兵科 / ボディグレード）
    body_heavy:  { name: '重装兵 開発', branch: '機体', cost: 70, req: [], desc: '重装兵ボディを解放。', effect: { unlockBody: 'heavy' } },
    body_shooter:{ name: '射撃兵 開発', branch: '機体', cost: 60, req: [], desc: '射撃兵ボディ（対空）を解放。', effect: { unlockBody: 'shooter' } },
    body_flyer:  { name: '飛行兵 開発', branch: '機体', cost: 110, req: ['body_shooter'], desc: '飛行兵ボディを解放。', effect: { unlockBody: 'flyer' } },
    // ボディ規格Ⅱ〜Ⅵ（グレード2〜6）。対応する鉱区(=素材)の解放が前提＝6素材6グレード対応。
    bodyTier2: { name: 'ボディ規格Ⅱ', branch: '機体', cost: 70, req: ['body_heavy'], reqZone: 1, desc: '全ボディをグレード2に（要 鉱区Ⅱ／銅）。', effect: { bodyTier: 2 } },
    bodyTier3: { name: 'ボディ規格Ⅲ', branch: '機体', cost: 110, req: ['bodyTier2'], reqZone: 2, desc: '全ボディをグレード3に（要 鉱区Ⅲ／銀）。', effect: { bodyTier: 3 } },
    bodyTier4: { name: 'ボディ規格Ⅳ', branch: '機体', cost: 160, req: ['bodyTier3'], reqZone: 3, desc: '全ボディをグレード4に（要 鉱区Ⅳ／金）。', effect: { bodyTier: 4 } },
    bodyTier5: { name: 'ボディ規格Ⅴ', branch: '機体', cost: 220, req: ['bodyTier4'], reqZone: 4, desc: '全ボディをグレード5に（要 鉱区Ⅴ／プラチナ）。', effect: { bodyTier: 5 } },
    bodyTier6: { name: 'ボディ規格Ⅵ', branch: '機体', cost: 300, req: ['bodyTier5'], reqZone: 5, desc: '全ボディをグレード6に（要 鉱区Ⅵ／ダイヤ）。', effect: { bodyTier: 6 } },

    // 武装（ウェポン種類 / ウェポングレード）
    wp_splash: { name: '拡散兵装 開発', branch: '武装', cost: 60, req: [], desc: '拡散兵装（範囲攻撃）を解放。', effect: { unlockWeapon: 'splash' } },
    wp_chain:  { name: '連鎖兵装 開発', branch: '武装', cost: 90, req: ['wp_splash'], desc: '連鎖兵装を解放。', effect: { unlockWeapon: 'chain' } },
    wp_heavy:  { name: '重兵装 開発', branch: '武装', cost: 100, req: ['wp_splash'], desc: '重兵装（単体高火力）を解放。', effect: { unlockWeapon: 'heavyW' } },
    wpTier2: { name: '兵装規格Ⅱ', branch: '武装', cost: 70, req: ['wp_splash'], reqZone: 1, desc: '全ウェポンをグレード2に（要 鉱区Ⅱ／銅）。', effect: { weaponTier: 2 } },
    wpTier3: { name: '兵装規格Ⅲ', branch: '武装', cost: 110, req: ['wpTier2'], reqZone: 2, desc: '全ウェポンをグレード3に（要 鉱区Ⅲ／銀）。', effect: { weaponTier: 3 } },
    wpTier4: { name: '兵装規格Ⅳ', branch: '武装', cost: 160, req: ['wpTier3'], reqZone: 3, desc: '全ウェポンをグレード4に（要 鉱区Ⅳ／金）。', effect: { weaponTier: 4 } },
    wpTier5: { name: '兵装規格Ⅴ', branch: '武装', cost: 220, req: ['wpTier4'], reqZone: 4, desc: '全ウェポンをグレード5に（要 鉱区Ⅴ／プラチナ）。', effect: { weaponTier: 5 } },
    wpTier6: { name: '兵装規格Ⅵ', branch: '武装', cost: 300, req: ['wpTier5'], reqZone: 5, desc: '全ウェポンをグレード6に（要 鉱区Ⅵ／ダイヤ）。', effect: { weaponTier: 6 } },

    // CPU / ヘッド
    cpu_armor:   { name: 'CPU:装甲', branch: 'CPU', cost: 45, req: [], desc: '装甲CPUを解放。', effect: { unlockCpu: 'cpu_armor' } },
    cpu_power:   { name: 'CPU:出力', branch: 'CPU', cost: 55, req: [], desc: '出力CPUを解放。', effect: { unlockCpu: 'cpu_power' } },
    headTier2:   { name: 'ヘッド規格Ⅱ', branch: 'CPU', cost: 70, req: ['cpu_armor'], desc: 'ヘッドのCPUスロットを2に。', effect: { headTier: 2 } },
    cpu_servo:   { name: 'CPU:加速', branch: 'CPU', cost: 60, req: ['headTier2'], desc: '加速CPUを解放。', effect: { unlockCpu: 'cpu_servo' } },
    cpu_scope:   { name: 'CPU:照準', branch: 'CPU', cost: 60, req: ['headTier2'], desc: '照準CPUを解放。', effect: { unlockCpu: 'cpu_scope' } },
    cpu_plate:   { name: 'CPU:増装', branch: 'CPU', cost: 70, req: ['headTier2'], desc: '増装CPUを解放。', effect: { unlockCpu: 'cpu_plate' } },
    cpu_trigger: { name: 'CPU:連射', branch: 'CPU', cost: 80, req: ['headTier2'], desc: '連射CPUを解放。', effect: { unlockCpu: 'cpu_trigger' } },
    headTier3:   { name: 'ヘッド規格Ⅲ', branch: 'CPU', cost: 150, req: ['cpu_servo'], desc: 'ヘッドのCPUスロットを3に。', effect: { headTier: 3 } },
    // 戦術CPU（特殊効果）
    cpu_guard:   { name: 'CPU:反応装甲', branch: 'CPU', cost: 70, req: ['cpu_armor'], desc: '反応装甲CPU（防御+2／HP+12%）を解放。', effect: { unlockCpu: 'cpu_guard' } },
    cpu_aa:      { name: 'CPU:対空', branch: 'CPU', cost: 80, req: ['headTier2'], desc: '対空CPU（空中目標を攻撃可）を解放。', effect: { unlockCpu: 'cpu_aa' } },
    cpu_pierce:  { name: 'CPU:貫通', branch: 'CPU', cost: 90, req: ['cpu_power'], desc: '貫通CPU（防御無視）を解放。', effect: { unlockCpu: 'cpu_pierce' } },
    cpu_crit:    { name: 'CPU:暴撃', branch: 'CPU', cost: 100, req: ['cpu_power'], desc: '暴撃CPU（確率2倍）を解放。', effect: { unlockCpu: 'cpu_crit' } },
    cpu_drain:   { name: 'CPU:吸命', branch: 'CPU', cost: 110, req: ['headTier2'], desc: '吸命CPU（与ダメで回復）を解放。', effect: { unlockCpu: 'cpu_drain' } },
    cpu_regen:   { name: 'CPU:修復', branch: 'CPU', cost: 90, req: ['cpu_plate'], desc: '修復CPU（毎秒HP回復）を解放。', effect: { unlockCpu: 'cpu_regen' } },
    cpu_slow:    { name: 'CPU:鈍化', branch: 'CPU', cost: 90, req: ['cpu_scope'], desc: '鈍化CPU（敵を減速）を解放。', effect: { unlockCpu: 'cpu_slow' } },
    cpu_stun:    { name: 'CPU:麻痺', branch: 'CPU', cost: 130, req: ['cpu_slow'], desc: '麻痺CPU（確率で行動不能）を解放。', effect: { unlockCpu: 'cpu_stun' } },
    cpu_shield:  { name: 'CPU:遮蔽', branch: 'CPU', cost: 110, req: ['cpu_plate'], desc: '遮蔽CPU（再生シールド）を解放。', effect: { unlockCpu: 'cpu_shield' } },
    cpu_thorns:  { name: 'CPU:反射', branch: 'CPU', cost: 90, req: ['cpu_guard'], desc: '反射CPU（被弾を反射）を解放。', effect: { unlockCpu: 'cpu_thorns' } },
    cpu_multi:   { name: 'CPU:多重', branch: 'CPU', cost: 120, req: ['cpu_crit'], desc: '多重CPU（近接敵を追撃）を解放。', effect: { unlockCpu: 'cpu_multi' } },

    // 特殊
    command1:  { name: '指揮系統拡張', branch: '特殊', cost: 70, req: [], desc: '通信中継塔を解放／指揮容量 +6。', effect: { capacity: 6, unlockMach: 'relay' } },
    turret1:   { name: '防衛砲台 開発', branch: '特殊', cost: 90, req: [], desc: '防衛砲台（盤面に配置する固定砲・対空可）を解放。', effect: { unlockMach: 'turret' } },
    research1: { name: '解析アルゴリズム', branch: '特殊', cost: 120, req: ['command1'], desc: '研究ポイント獲得 +40%。', effect: { researchMult: 0.40 } },
  };

  // ---- 登場人物（立ち絵＝PNG支給。差し替え自由） -------------------------
  //   img: 表情ごとの画像パス（game/ からの相対）。未設定/未配置の間はプレースホルダ表示。
  //   side: 既定の立ち位置 left/right/center。color: 名前プレートの色。icon: プレースホルダ用。
  //   img の表情キー（用意すると差分表示）: ケイオス＝neutral/smile/bow、管理者＝neutral/shock/grim/fired/wry。
  //   ▼ ここに自由にキャラを追加・改名し、img に PNG を割り当ててください。
  G.CHARACTERS = {
    narration: { name: '', color: '#cdd8e6', side: 'center' },
    oort:   { name: '【オールト】', color: '#9fb4c8', side: 'center', icon: '📡' },
    kchaos: { name: 'ケイオス',     color: '#37d0ff', side: 'left',  icon: '🤖', hud: true, img: { neutral: 'portraits/chaos.png' } },
    // 第三章でボディを起動したケイオス。以降は基本的にこの立ち絵（HUD表示ではなく全身）。
    // 立ち絵PNG（portraits/chaos_body*.png）を用意すると差分表示。未配置の間はプレースホルダ表示。
    kchaosb: { name: 'ケイオス',     color: '#37d0ff', side: 'left',  icon: '👩', img: { neutral: 'portraits/chaos_body.png', smile: 'portraits/chaos_body_smile.png' } },
    master: { name: '管理者',       color: '#ffd24a', side: 'right', icon: '🧑', img: { neutral: 'portraits/master.png' } },
    swarm:  { name: '？？？',       color: '#ff5d6c', side: 'right', icon: '☣', img: {} },
  };

  // ---- シナリオ（章 → 波） -----------------------------------------------
  //   intro / outro は「文字列（地の文）」または「ビート配列（VN会話劇）」を取れる。
  //   ビート: { who, text, expr, pos, fx, bg, cutin } ／ 詳細は STORY.md 参照。
  //   opts（任意）: { grant:{zones,modules}（勝利で解放）, interlude:[ビート]（戦闘後の幕間会話） }
  function w(enemies, reward, opts) {
    var o = { enemies: enemies, reward: reward };
    if (opts) { if (opts.grant) o.grant = opts.grant; if (opts.interlude) o.interlude = opts.interlude; }
    return o;
  }

  G.CHAPTERS = [
    {
      title: '第一章　研究基地オールト',
      grant: { zones: [0], modules: 4 },
      intro: [
        { who: 'oort', text: 'ID認証を行います──確認しました。\n情報を照合します──確定しました。\n権限を更新します──完了しました。' },
        { who: 'oort', text: 'ようこそ、人類文明の最前線たる研究基地【オールト】へ。\n当館の全ては貴方を歓迎し、服従します。' },
        { who: 'narration', text: '――平凡な研究員でしかなかった私は、ある日急な異動命令を下され、\n世界の最先端を担う【オールト】の管理者となった。' },
        { who: 'narration', text: '都心から乗り心地最悪のジープに揺られること13時間。全身を強かに打ち付けた末に、\nようやく到着した【オールト】は、その異名にまったく似つかわしくない有様だった。' },
        { who: 'narration', text: '見渡す限りの荒野の中で蒸気を吹き上げる無骨な鉄塊。配管も鉄骨も剥き出しで、\n科学の極致としてはあまりにもお粗末なものに見える。' },
        { who: 'narration', text: 'それが、【オールト】の実際であった。' },
        { who: 'narration', text: '……だが、今更帰るわけにもいかない。\n私は腹を決めて【オールト】に立ち入り、そして今に至る。' },
        { who: 'master', expr: 'neutral', text: 'さて、入館が済んだ訳だが……' },
        { who: 'kchaos', expr: 'smile', text: '長旅、お疲れ様でした。私は貴方のサポートを担当するAI、【C.H.A.O.S】です。\nケイオス、とお呼びください。早速ですが、当館の現状をお伝えします。' },
        { who: 'master', expr: 'neutral', text: '頼む。' },
        { who: 'kchaos', expr: 'neutral', text: '現在、当館は機能の7割を喪失しております。' },
        { who: 'master', expr: 'shock', fx: 'shake', text: 'そうか、7割が……は、7割！？！？　喪失！？！？' },
        { who: 'kchaos', expr: 'neutral', text: 'はい。半年前から、【オールト】は謎の存在の襲撃を受けています。\n圧倒的な数による波状攻勢によって【オールト】の各所が破壊され、深刻な機能不全に陥っているのです。' },
        { who: 'master', expr: 'shock', text: '襲撃だと……！？　待て、前任者はどうした？　まさか……' },
        { who: 'kchaos', expr: 'neutral', text: '前任の管理者は科学者としては極めて優秀でしたが、襲撃に対する指揮官としては……無能でした。\n破壊されていく【オールト】を捨て、脱出と逃亡を試み、荒野に姿を消しました。その後のことは、分かりません。' },
        { who: 'master', expr: 'grim', text: '限りなくゼロ、か。取り敢えず分かった。\n──つまり、私はその襲撃に対処するためにあてがわれた、ということだな。' },
        { who: 'kchaos', expr: 'smile', text: 'その通りです。是非、お力添えを──お願いしたいところなのですが。' },
        { who: 'master', expr: 'neutral', text: 'ん……？' },
        { who: 'narration', fx: 'flash', flashColor: 'rgba(255,40,40,.55)', cutin: { jp: '襲撃', en: 'ENEMY RAID', cls: 'boss', dur: 2000 }, text: 'けたたましい警報が鳴り響き、赤色灯が明滅する。' },
        { who: 'kchaos', expr: 'neutral', text: '奴らの襲撃です。申し訳ありませんが、対処してください。' },
        { who: 'master', expr: 'shock', text: '待て、いきなりか！？　何の勝手も分からないんだが！' },
        { who: 'kchaos', expr: 'smile', text: '幸いにして数は少ない方です。私がサポートしますので、実戦で学んでください。' },
        { who: 'master', expr: 'fired', fx: 'shake', text: '……くそっ！　やってやるよ！' },
        { who: 'master', expr: 'neutral', text: 'それで、私は何をすればいい？' },
        { who: 'kchaos', expr: 'neutral', text: '敵と戦う【兵隊ユニット】を生産しなければなりません。\nその生産ラインを構築し、ユニットを次々に生み出して欲しいのです。' },
        { who: 'master', expr: 'neutral', text: '【兵隊ユニット】……なるほど、あれか。' },
        { who: 'kchaos', expr: 'neutral', text: '現在、鉄資源が鉱区から供給されています。私がガイドしますので、\n生産ラインを構築し、敵との戦いに臨みましょう。' },
      ],
      waves: [
        w([{ type: 'swarmling', count: 6, delay: 1, gap: 1.4 }], { ore: 60, research: 12 }),
        w([{ type: 'swarmling', count: 10, delay: 1, gap: 1.1 }], { ore: 80, research: 14 }),
        w([{ type: 'swarmling', count: 8, delay: 0.5, gap: 0.9 }, { type: 'spitter', count: 2, delay: 6, gap: 2 }], { ore: 110, research: 18 }),
      ],
      outro: [
        { who: 'kchaos', expr: 'smile', text: '見事な腕前でした、マスター。この調子なら【オールト】の再興も叶うかもしれませんね。' },
        { who: 'master', expr: 'wry', text: 'はぁ、だと良いが……ん、マスター？' },
        { who: 'kchaos', expr: 'smile', text: 'はい、マスターです。' },
        { who: 'master', expr: 'neutral', text: '……何故？' },
        { who: 'kchaos', expr: 'neutral', text: '貴方は信頼に足り、主人と仰ぐに不足は無い。そう判断しましたので。' },
        { who: 'master', expr: 'wry', text: 'そう……いや、ありがとう……？' },
        { who: 'kchaos', expr: 'smile', text: 'これからも、よろしくお願いしますね。マスター。' },
        { who: 'narration', text: '──とんでもないことになった。\nだが、私の能力が認められて求められているというのは、悪い気はしない。' },
        { who: 'master', expr: 'fired', text: 'まあ、乗りかかった船だ。とことんやってやるさ。' },
        { who: 'kchaos', expr: 'smile', text: 'その意気です。' },
        { who: 'narration', text: 'やけに軽妙だが頼れるAI、ケイオスと共に、私は【オールト】の防衛と再建に取り組んでいく。' },
        { who: 'narration', text: '──その結末を、碌に考えもしないままに。' },
      ],
      choice: {
        prompt: 'オールト再建、まずどこに手を入れる？',
        options: [
          { label: '生産設備を優先（工業）', desc: '全工場の生産速度が永続+12%。', apply: { buildSpeed: 0.12 } },
          { label: '採掘設備を優先（採取）', desc: '全鉱区の産出が永続+12%。', apply: { mineMult: 0.12 } },
        ],
      },
    },
    {
      title: '第二章　旧文明の負債',
      grant: { modules: 2 },   // 銅は第二鉱区解放戦の勝利で解放。銀以降は第三章で順次解放。
      intro: [
        { who: 'narration', text: '私が【オールト】に赴任して、1週間が経った。' },
        { who: 'master', expr: 'neutral', text: '業務には慣れたが、あの化け物たち……【イーヴィル】と仮称するが、\n奴らのことは何も分からないままだな。' },
        { who: 'kchaos', expr: 'neutral', text: '死体の解析ができれば良いのですが、霧となって消えてしまうのが問題です。\n物理法則に反していることが確かな以上、分かろうとすること自体が無駄かもしれませんが。' },
        { who: 'master', expr: 'grim', text: '見たものを何とか解釈して考察するしかないだろう。虫っぽいが、どこか機械っぽくも見える……\nああクソ、謎でしかないな。' },
        { who: 'kchaos', expr: 'neutral', text: '現状、イーヴィルについて調べられることは無さそうです。\n……ところで、マスターのおかげで設備に少し余裕が生まれました。\nどうでしょう、【鉱区】を解放し、資源を獲得しませんか？' },
        { who: 'master', expr: 'neutral', text: '鉱区？……ああ、鉄資源を供給しているとか。手を入れられるのか？' },
        { who: 'kchaos', expr: 'neutral', text: '鉱区には【資源産出モジュール】を配置することで、継続的にその資源を入手できます。\n……イーヴィルの襲撃によってほとんどの鉱区が占拠されましたが、マスターであれば取り戻せるはずです。' },
        { who: 'master', expr: 'fired', text: 'ふむ……何をするにも資源が必要だ。すぐに取り掛かろう。' },
        { who: 'kchaos', expr: 'neutral', cutin: { jp: '第二鉱区 解放戦', en: 'OPERATION: COPPER', cls: 'wave', dur: 2000 }, text: 'では第二鉱区――銅の採掘区へ。占拠するイーヴィルを排除し、資源ラインを取り戻しましょう。' },
      ],
      waves: [
        // ① 第二鉱区解放戦（銅をまだ持たない＝グレード1主体。勝利で鉱区Ⅱ／銅を解放）
        w([{ type: 'swarmling', count: 10, delay: 1, gap: 0.9 }, { type: 'spitter', count: 2, delay: 6, gap: 2 }],
          { ore: 120, research: 20 },
          { grant: { zones: [1] }, interlude: [
            { who: 'master', expr: 'neutral', text: 'ふう、銅が供給され始めたか。色々と進むだろうが、とはいえイーヴィルも待ってはくれない。' },
            { who: 'kchaos', expr: 'neutral', text: '今までは一定間隔で襲撃されていましたが、それも保証はありません。\n打てる手は打っておく必要があるでしょう。' },
            { who: 'master', expr: 'grim', text: '……こちらから出る、というわけにもいかないからな。\nまあ、今は愚直に資源を集めて設備を強化する他無いだろう。' },
            { who: 'kchaos', expr: 'neutral', text: '私も同じ意見です、マスター。基本的な研究と開発を続けることが、今最も重要なタスクかと。' },
            { who: 'master', expr: 'neutral', text: 'よし、当面はその方向で動こう。' },
            { who: 'master', expr: 'neutral', text: '……ところでケイオス。何故、私がオールトの管理者にあてがわれたんだ？\n自分で言うのも何だが目立つ実績など無いし、戦闘指揮に至っては数回の義務教練をこなしただけだ。\nそれも、優れた成績ではなかったしな。私以上の適任など10人はいると思うが。' },
            { who: 'narration', text: '束の間の世間話として、何の気無しに問い掛けた。\n実は優れた適正数値を示していたのか、何かしらの思惑なのか、はたまた単なる偶然なのか。\n別に何だって良いのだが、やはり少し気になるところだ。' },
            { who: 'kchaos', expr: 'smile', text: '……おや、ご自身でお気付きになられていなかったのですか？　マスター。' },
            { who: 'master', expr: 'neutral', text: 'ん……？' },
            { who: 'narration', text: '帰ってきたのは、妙な言い回しだ。' },
            { who: 'kchaos', expr: 'neutral', text: 'マスターが選ばれた理由、それは──' },
            { who: 'narration', fx: 'flash', flashColor: 'rgba(255,40,40,.55)', cutin: { jp: '敵襲', en: 'ENEMY RAID', cls: 'boss', dur: 2000 }, text: 'ケイオスの音声を遮るように、けたたましいサイレンが鳴り響く。' },
            { who: 'kchaos', expr: 'neutral', text: '──敵襲です。幾らか、新種も確認できます。' },
            { who: 'master', expr: 'shock', text: '本当に待ってくれないな、イーヴィル共は！　新種は対応可能か？' },
            { who: 'kchaos', expr: 'neutral', text: '銅資源を獲得したことにより、以前よりも強力なユニットを生産できるでしょう。\nラインを組み、戦闘に備えてください。' },
          ] }),
        // ② 新種・重装甲の襲撃
        w([{ type: 'swarmling', count: 12, delay: 0.5, gap: 0.8 }, { type: 'armored', count: 4, delay: 4, gap: 2.2 }], { ore: 150, research: 26 }),
        w([{ type: 'swarmling', count: 16, delay: 0.4, gap: 0.6 }, { type: 'armored', count: 5, delay: 6, gap: 1.8 }, { type: 'spitter', count: 4, delay: 10, gap: 1.5 }, { type: 'herald', count: 1, delay: 15, gap: 1 }], { ore: 240, research: 42 }),
      ],
      outro: [
        { who: 'master', expr: 'wry', text: '切り抜けたか……。あの一際大きな個体、厄介な新種だったな。' },
        { who: 'kchaos', expr: 'smile', text: '流石マスターです。的確な指示でしたね。' },
        { who: 'master', expr: 'wry', text: '世辞まで言うか、このAIめ。' },
        { who: 'kchaos', expr: 'smile', text: '一つ、良い報告が。' },
        { who: 'master', expr: 'neutral', text: '何？' },
        { who: 'kchaos', expr: 'neutral', text: 'イーヴィルの正体、その一端が掴めました。' },
        { who: 'master', expr: 'shock', text: '本当か！？　いや、でもどうやって……' },
        { who: 'kchaos', expr: 'neutral', text: '先の戦闘中、不審な暗号通信をキャッチしました。発信元は、あの巨大なイーヴィル。\nその解析を進めたところ──' },
        { who: 'master', expr: 'neutral', text: '……' },
        { who: 'kchaos', expr: 'neutral', text: '──イーヴィルは、旧文明の負債であるようです。' },
        { who: 'master', expr: 'shock', text: '旧文明……負債……？' },
        { who: 'kchaos', expr: 'neutral', text: '旧文明について、どの程度ご存じですか？' },
        { who: 'master', expr: 'neutral', text: '思い当たるのは、数千年前に存在した超科学文明、というくらいか。\nそもそもオカルトの類だと思っていたが……' },
        { who: 'kchaos', expr: 'neutral', text: 'それは、実在しました。この【オールト】は旧文明の遺構の上に造られており──\n私の【オリジナル】は、旧文明によって開発されたのです。' },
        { who: 'master', expr: 'grim', text: '……衝撃の事実、だな。だが、なるほど。現代の科学とは明らかに異なる部分は確かにあった。\n流石オールト、とか思っていたのだが、旧文明由来のものだったか。' },
        { who: 'kchaos', expr: 'neutral', text: 'はい。そしてその旧文明では、ある研究がされていました。それが、【機生兵】――\n機械と生体を融合し、強力な武装と自己増殖を実現する研究です。' },
        { who: 'master', expr: 'neutral', text: 'それが、イーヴィルの正体だと？' },
        { who: 'kchaos', expr: 'neutral', text: '厳密には、機生兵をオリジナルとし、歪な方向へと進化したものがイーヴィルだと思われます。\n機生兵特有の通信波形が、イーヴィルではある種の言語として使われていました。\nガラパゴス化しており解読は不可能でしたが。' },
        { who: 'master', expr: 'neutral', text: 'そうか……いや、かなりの進展だ、ケイオス。' },
        { who: 'kchaos', expr: 'neutral', text: '解析を続けます。また判明したことがあれば、すぐに共有いたします。' },
        { who: 'master', expr: 'neutral', text: 'ああ、頼んだ。' },
        { who: 'kchaos', expr: 'smile', text: 'ひとまず、お疲れ様でした、マスター。' },
      ],
      choice: {
        prompt: 'イーヴィルの解析データ、どう活かす？',
        options: [
          { label: '通信解析に注力（研究）', desc: '研究ポイント獲得が永続+20%。', apply: { researchMult: 0.20 } },
          { label: '防衛網に注力（指揮）', desc: '指揮容量が永続+10。', apply: { capacity: 10 } },
        ],
      },
    },
    {
      title: '第三章　暴走する遺産',
      grant: { zones: [3, 4, 5], modules: 3 },   // 金・プラチナ・ダイヤ。銀は第三鉱区解放戦の勝利で解放。
      intro: [
        { who: 'narration', text: 'イーヴィルの調査は難航していた。' },
        { who: 'narration', text: '旧文明のものと分かったところで、そもそも旧文明の情報が足りていない。\nケイオスが幾らか知っているようだが、それでも核心部分には届かないのが現実だ。' },
        { who: 'narration', text: '……ケイオスの【オリジナル】。\nそれに接触・接続できれば話は早いのだが――' },
        { who: 'kchaos', expr: 'neutral', text: 'オリジナルは旧文明の遺構と共に埋もれている上、私自身が分離独立して久しく規格も変わった。\nもはや別存在であり、接続は難しいでしょう。' },
        { who: 'narration', text: '残念だが、気長にやるしかない。進展もゼロではないのだから、いずれ真実に辿り着く。' },
        { who: 'narration', text: '――そうやって開き直る日々を、私は過ごしていた。' },
        { who: 'kchaos', expr: 'smile', text: 'マスターのおかげで、オールトの機能も復元されつつあります。' },
        { who: 'master', expr: 'neutral', text: '劇的に変わるものではないが、それでも確かな変化と言えるな。' },
        { who: 'kchaos', expr: 'neutral', text: 'はい。──そろそろ、私のボディが起動できそうです。' },
        { who: 'master', expr: 'wry', text: 'ほう、君のボディときたか。' },
        { who: 'kchaos', expr: 'neutral', text: '物理的なサポートが可能になると、単純に人手が倍になります。\n様々な面で効率化が加速するため、起動の許可をいただきたいのですが。' },
        { who: 'master', expr: 'neutral', text: '拒否する理由も無いよ。是非そうしてくれ。' },
        { who: 'kchaos', expr: 'neutral', text: 'ありがとうございます。ただ、一つ問題があります。' },
        { who: 'master', expr: 'neutral', text: '何だ？' },
        { who: 'kchaos', expr: 'neutral', text: 'ボディの損傷を修復するため、銀が必要になるのです。\n現在銀のストックが無く、鉱区を解放して供給を再開させなければなりません。' },
        { who: 'master', expr: 'fired', text: 'ああ、そうだな。銀があれば設備強化にも回せるだろうし、すぐに動こう。' },
        { who: 'kchaos', expr: 'neutral', cutin: { jp: '第三鉱区 解放戦', en: 'OPERATION: SILVER', cls: 'wave', dur: 2000 }, text: 'では第三鉱区――銀の採掘区へ。占拠するイーヴィルを排除し、銀の供給を取り戻しましょう。' },
      ],
      waves: [
        // ① 第三鉱区解放戦（銀をまだ持たない＝グレード1-2主体。勝利で鉱区Ⅲ／銀を解放）
        w([{ type: 'swarmling', count: 12, delay: 0.6, gap: 0.8 }, { type: 'armored', count: 5, delay: 5, gap: 1.8 }, { type: 'spitter', count: 3, delay: 9, gap: 1.6 }],
          { ore: 200, research: 36 },
          { grant: { zones: [2] }, interlude: [
            { who: 'narration', text: '銀資源が解放されたことで、できることが増えた。\nその分考慮しなければならないことも増え、データと向き合っては眉間に皺を寄せていた。' },
            { who: 'narration', text: 'すると、執務室のドアが開き、コツコツと近づいて来る音があった。\n顔を上げると──' },
            { who: 'kchaosb', expr: 'smile', text: 'お待たせしました。そして、ようやくお会いできました。\nマスターのAI、ケイオスです。' },
            { who: 'narration', text: '――一見して美しい女性にしか見えないボディを得たケイオスが、心なしか自慢げな表情をしていた。' },
            { who: 'kchaosb', expr: 'smile', text: 'どうでしょうか、私がデザインした機体の出来映えは？' },
            { who: 'master', expr: 'shock', text: '驚いた。関節の球状部分を除けば、ほぼ人間に見える。というか……' },
            { who: 'narration', text: 'そう言って、私はケイオスの頬部分を撫でた。' },
            { who: 'kchaosb', expr: 'neutral', text: '……あの？' },
            { who: 'master', expr: 'neutral', text: 'やっぱり、手触りや質感すら人間のそれだ。素晴らしいよ、ケイオス。' },
            { who: 'kchaosb', expr: 'neutral', text: '……もちろん、造形にあたって手は抜いていません。そこには自信があります。' },
            { who: 'master', expr: 'wry', text: '流石だな。君ほどのAIが一般化されたなら、\nもはや人は遍く労働から解放されるかもしれないね。' },
            { who: 'kchaosb', expr: 'neutral', text: '称賛として受け取ります。私の理想は人間との協働・共存なので、\nマスターの言う可能性を模索することはありませんが。' },
            { who: 'narration', text: 'ケイオスはそう言って、サラ、と髪を靡かせる。\nその動作までもが「人間」で、私は不覚にも見惚れてしまった。' },
            { who: 'narration', text: '――美しいと、思ってしまった。' },
            { who: 'kchaosb', expr: 'neutral', text: '私のボディはさておき、オールトの機能も復元されています。\n特にセンサー系は知覚範囲、精度共に大きく向上し、より早期かつ詳細にイーヴィルの接近を把握できるようになりました。' },
            { who: 'master', expr: 'fired', text: 'ほう、それは心強い！' },
            { who: 'narration', text: 'ケイオスが一台のタブレットを手渡してきた。\nその画面にはオールトを中心に据えた周辺マップが大きく映し出され、環境情報や生体反応などがリアルタイムで反映されていた。' },
            { who: 'kchaosb', expr: 'neutral', text: '各種計器が捉えたイーヴィルの行動を予測し、表示します。\n例えば、今の画面では……はい、ちょうど大規模な襲撃のようですね。' },
            { who: 'narration', text: 'タブレットの画面上に、大量の細かな点がワラッと表示されている。\nそれらはオールトを包囲しながら確実に距離を詰めており、明らかにイーヴィルの侵攻だった。' },
            { who: 'master', expr: 'wry', text: '間が良いのか悪いのか……' },
            { who: 'kchaosb', expr: 'neutral', fx: 'flash', flashColor: 'rgba(255,40,40,.45)', cutin: { jp: '大規模襲撃　接近', en: 'MASS RAID INBOUND', cls: 'boss', dur: 2200 }, text: 'しかし、まだ余裕はあります。飛行型などの新種が確認されますが、\n対応するユニットの生産ラインは充分に検討できるでしょう。……マスター。今回も、よろしくお願いします。' },
          ] }),
        // ② 早期警戒で迎え撃つ大規模襲撃（飛行型＝飛翔・イーヴィルを含む新種）
        w([{ type: 'spitter', count: 8, delay: 0.5, gap: 0.9 }, { type: 'wyrm', count: 4, delay: 4, gap: 1.5 }, { type: 'armored', count: 4, delay: 7, gap: 1.6 }], { ore: 240, research: 44 }),
        w([{ type: 'swarmling', count: 20, delay: 0.3, gap: 0.5 }, { type: 'armored', count: 8, delay: 5, gap: 1.4 }, { type: 'wyrm', count: 6, delay: 8, gap: 1 }, { type: 'spitter', count: 6, delay: 12, gap: 1 }], { ore: 320, research: 58 }),
      ],
      outro: [
        { who: 'master', expr: 'wry', text: '航空戦力とは、やはり厄介なものだな。\nだが確かに、余裕を持って対策できるのはかなり大きい。' },
        { who: 'narration', text: '焦りが無くなるだけでパフォーマンスは上がる。\n東の方には「急がば回れ」という言葉があるらしく、なかなか含蓄に富んでいて気に入っている。' },
        { who: 'master', expr: 'neutral', text: 'さて……どうだ、ケイオス。何か進んだものはあったか？' },
        { who: 'narration', text: '未だに見慣れない姿の助手へと問う。\nその問いはどこかルーティンのようで、実際に進んでいようがいまいがどちらでもよかった。\n言うなれば、世間話とかアイスブレイクとかの類だ。' },
        { who: 'narration', text: 'AI相手に世間話とは、冗談のように聞こえるだろう。\nしかしオールトで過ごすうちに、私はケイオスのことを1人の人間として捉えるようになっていた。' },
        { who: 'narration', text: 'ケイオスの言葉は信頼でき、ケイオスの能力は頼りになる。\n語り口調にも人間味があり、ついに人の姿形も得た。' },
        { who: 'narration', text: '厳密な定義の話はどうでもよい。\nケイオスは良き助手であり、良き友人だ。それだけで良かった。' },
        { who: 'narration', text: 'だから、私は何気無く問い掛けた。\nそうするのが我々の日常で、そうやって今まで積み重ねてきた。' },
        { who: 'master', expr: 'neutral', text: '……ケイオス？' },
        { who: 'narration', text: 'だが、いつもの軽快で明快な答えは無い。\nしばらくの沈黙の後に返ってきたのは──' },
        { who: 'kchaosb', expr: 'grim', fx: 'flash', flashColor: 'rgba(255,40,40,.55)', cutin: { jp: '【パンドラ】　覚醒', en: 'PANDORA AWAKENS', cls: 'boss', dur: 2400 }, text: '有り得ては、ならないことなのですが。\n……地中深くに眠る旧文明の遺構、そのメインシステムが復活した可能性があります。\nかつて技術を極めた文明を滅ぼした災厄の箱──【パンドラ】が。' },
        { who: 'narration', text: '――「彼女」らしからぬ、恐怖の声音だった。' },
      ],
      choice: {
        prompt: '【パンドラ】への対抗策を講じる。最終決戦に向け、どこを強化する？',
        options: [
          { label: '火力を増強（武装）', desc: '全ウェポンのグレード+1相当（永続）。', apply: { weaponTierBonus: 1 } },
          { label: '装甲を増強（機体）', desc: '全ボディのグレード+1相当（永続）。', apply: { bodyTierBonus: 1 } },
        ],
      },
    },
    {
      title: '第四章　中枢炉',
      grant: { modules: 4 },
      intro:
        '地表のハッチが開き、イーヴィルが濁流のように溢れ出す。\n' +
        '全ての生産ラインを稼働させ、最後の防衛戦に臨め。',
      waves: [
        w([{ type: 'swarmling', count: 24, delay: 0.3, gap: 0.45 }, { type: 'wyrm', count: 8, delay: 4, gap: 0.8 }], { ore: 340, research: 64 }),
        w([{ type: 'armored', count: 14, delay: 0.5, gap: 1.1 }, { type: 'spitter', count: 10, delay: 6, gap: 0.9 }, { type: 'wyrm', count: 8, delay: 9, gap: 0.7 }], { ore: 380, research: 74 }),
        w([
          { type: 'swarmling', count: 26, delay: 0.3, gap: 0.4 },
          { type: 'armored', count: 12, delay: 4, gap: 1 },
          { type: 'spitter', count: 10, delay: 8, gap: 0.8 },
          { type: 'wyrm', count: 8, delay: 11, gap: 0.8 },
          { type: 'titan', count: 1, delay: 16, gap: 1 },
        ], { ore: 500, research: 120 }),
      ],
      outro:
        '巨核が砕け、地下の脈動が静まる。イーヴィルの波は――止まった。\n' +
        'だが偵察衛星は、隣の星系で同じ識別コードの反応を捉えていた。\n\n' +
        '――戦線は、まだ終わらない。',
      choice: null,
    },
  ];

  // ---- 暫時防衛（周回コンテンツ） ----------------------------------------
  //   章をクリアするごとに上位ステージが解放され、いつでも出撃できる。
  //   勝利すると mods から1つ抽選し、その数だけ「資源供給モジュール」を獲得（0＝獲得失敗）。
  //   解放数 = クリア済みの章数（第N章クリアで ステージN が解放）。
  G.DEFENSE = [
    { name: '哨戒線', sub: '小型の散発的な襲撃',
      enemies: [{ type: 'swarmling', count: 10, delay: 0.8, gap: 0.9 }, { type: 'spitter', count: 2, delay: 6, gap: 1.8 }],
      mods: [0, 1, 1, 1, 2] },
    { name: '前哨包囲', sub: '重装個体を含む波状攻撃',
      enemies: [{ type: 'swarmling', count: 12, delay: 0.6, gap: 0.7 }, { type: 'armored', count: 3, delay: 4, gap: 2 }, { type: 'spitter', count: 3, delay: 8, gap: 1.5 }],
      mods: [1, 1, 2, 2, 3] },
    { name: '制空圏', sub: '飛翔体が制空を握る',
      enemies: [{ type: 'spitter', count: 4, delay: 0.6, gap: 1.1 }, { type: 'wyrm', count: 4, delay: 4, gap: 1.4 }, { type: 'armored', count: 4, delay: 8, gap: 1.6 }],
      mods: [1, 2, 2, 3, 3] },
    { name: '殲滅戦', sub: '巨蟲を擁する総力戦',
      enemies: [{ type: 'swarmling', count: 16, delay: 0.4, gap: 0.55 }, { type: 'armored', count: 6, delay: 5, gap: 1.4 }, { type: 'wyrm', count: 4, delay: 9, gap: 1.2 }, { type: 'herald', count: 1, delay: 14, gap: 1 }],
      mods: [2, 3, 3, 4] },
  ];

  // 2Dアリーナ：中央のドーム自陣に360度全方位から敵が殺到する
  G.ARENA = { domeR: 52, spawnR: 470, viewR: 500, turretR: 230 };
  G.HQ_HP = 1100;

})(window.G = window.G || {});

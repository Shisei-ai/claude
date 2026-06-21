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

  // ===== ユーティリティ（設備を駆動する。電気=フロー、水/燃料=ストック） =====
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

    // 採取（モジュール保有上限）
    module1:   { name: '採取拡張Ⅰ', branch: '採取', cost: 50, req: [], desc: '採取モジュール保有上限 +3。', effect: { moduleCap: 3 } },
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

    // 特殊
    command1:  { name: '指揮系統拡張', branch: '特殊', cost: 70, req: [], desc: '指揮容量 +12。', effect: { capacity: 12 } },
    research1: { name: '解析アルゴリズム', branch: '特殊', cost: 100, req: ['command1'], desc: '研究ポイント獲得 +40%。', effect: { researchMult: 0.40 } },
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
      grant: { zones: [2, 3], modules: 2 },   // 銀・金（銅は第二鉱区解放戦の勝利で解放）
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
      grant: { zones: [4, 5], modules: 3 },
      intro:
        '空に飛翔する影。地上を無視して基地へ迫る。\n' +
        '対空（射撃兵・飛行兵・防衛砲台）が無ければ空から喰い破られる。',
      waves: [
        w([{ type: 'spitter', count: 8, delay: 0.5, gap: 0.9 }, { type: 'wyrm', count: 3, delay: 4, gap: 1.6 }], { ore: 210, research: 38 }),
        w([{ type: 'armored', count: 8, delay: 1, gap: 1.6 }, { type: 'wyrm', count: 5, delay: 5, gap: 1.2 }, { type: 'spitter', count: 4, delay: 9, gap: 1.2 }], { ore: 240, research: 44 }),
        w([{ type: 'swarmling', count: 20, delay: 0.3, gap: 0.5 }, { type: 'armored', count: 8, delay: 5, gap: 1.4 }, { type: 'wyrm', count: 6, delay: 8, gap: 1 }, { type: 'spitter', count: 6, delay: 12, gap: 1 }], { ore: 300, research: 54 }),
      ],
      outro: '発信源は基地の地下深く――旧文明の中枢炉が脈動している。\nそれを止めぬ限り、攻勢は永遠に続く。',
      choice: {
        prompt: '中枢へ向けた最終攻勢の準備。',
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

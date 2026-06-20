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
    cpu_armor:   { name: '装甲CPU', icon: '🛡', effect: { def: 3 }, desc: '防御力 +3' },
    cpu_plate:   { name: '増装CPU', icon: '❤', effect: { hpMult: 0.30 }, desc: '最大HP +30%' },
    cpu_servo:   { name: '加速CPU', icon: '💨', effect: { speedMult: 0.30 }, desc: '移動速度 +30%' },
    cpu_scope:   { name: '照準CPU', icon: '🔭', effect: { range: 55 }, desc: '射程 +55' },
    cpu_trigger: { name: '連射CPU', icon: '🔁', effect: { rateMult: 0.35 }, desc: '攻撃速度 +35%' },
    cpu_power:   { name: '出力CPU', icon: '🔥', effect: { dmgMult: 0.28 }, desc: '攻撃力 +28%' },
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

  // ---- 敵（群体） ---------------------------------------------------------
  G.ENEMIES = {
    swarmling: { name: '小型・群体', icon: '▾', hp: 42, dmg: 6, def: 0, speed: 30, range: 24, rate: 0.9, bounty: 3, domain: 'ground', antiAir: false, color: '#e0556b' },
    armored:   { name: '装甲・群体', icon: '◆', hp: 185, dmg: 14, def: 7, speed: 20, range: 26, rate: 1.1, bounty: 7, domain: 'ground', antiAir: false, color: '#c23b78' },
    spitter:   { name: '砲塔・群体', icon: '✶', hp: 55, dmg: 19, def: 1, speed: 24, range: 145, rate: 1.1, bounty: 6, domain: 'ground', antiAir: false, color: '#d65fa0' },
    wyrm:      { name: '飛翔・群体', icon: '✦', hp: 78, dmg: 16, def: 2, speed: 36, range: 110, rate: 1.0, bounty: 9, domain: 'air', antiAir: true, color: '#ff7ad0' },
    titan:     { name: '巨核・群体', icon: '✪', hp: 1500, dmg: 60, def: 10, speed: 14, range: 34, rate: 1.5, bounty: 60, domain: 'ground', antiAir: true, color: '#ff3b3b', boss: true },
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

    // 特殊
    command1:  { name: '指揮系統拡張', branch: '特殊', cost: 70, req: [], desc: '指揮容量 +12。', effect: { capacity: 12 } },
    research1: { name: '解析アルゴリズム', branch: '特殊', cost: 100, req: ['command1'], desc: '研究ポイント獲得 +40%。', effect: { researchMult: 0.40 } },
  };

  // ---- 登場人物（立ち絵＝PNG支給。差し替え自由） -------------------------
  //   img: 表情ごとの画像パス（game/ からの相対）。未設定/未配置の間はプレースホルダ表示。
  //   side: 既定の立ち位置 left/right。color: 名前プレートの色。icon: プレースホルダ用。
  //   ▼ ここに自由にキャラを追加・改名し、img に PNG を割り当ててください。
  G.CHARACTERS = {
    narration: { name: '', color: '#cdd8e6', side: 'center' },
    ai:    { name: '指揮AI',       color: '#37d0ff', side: 'left',  icon: '🛰', img: {} },
    op:    { name: 'オペレーター', color: '#ffd24a', side: 'right', icon: '🎧', img: {} },
    swarm: { name: '？？？',       color: '#ff5d6c', side: 'right', icon: '☣', img: {} },
  };

  // ---- シナリオ（章 → 波） -----------------------------------------------
  //   intro / outro は「文字列（地の文）」または「ビート配列（VN会話劇）」を取れる。
  //   ビート: { who, text, expr, pos, fx, bg, cutin } ／ 詳細は STORY.md 参照。
  function w(enemies, reward) { return { enemies: enemies, reward: reward }; }

  G.CHAPTERS = [
    {
      title: '第一章　辺境基地カストル',
      grant: { zones: [0, 1], modules: 4 },
      // ▼ VN会話劇のサンプル（提出シナリオはこの形式に流し込みます）
      intro: [
        { who: 'narration', text: '辺境採掘基地カストル。最後の通信から、72時間。' },
        { who: 'ai', text: '……システム再起動。〈指揮AI〉、起動。基地の防衛権限を掌握した。' },
        { who: 'op', expr: 'neutral', text: '指揮官、お目覚めですか。周辺に多数の反応――生体ではありません。' },
        { who: 'op', expr: 'alert', fx: 'shake', text: 'これは……機械の群れ。基地を全周から囲んでいます！' },
        { who: 'ai', text: '数で来るなら、こちらも数で返す。工業ラインを起こせ。' },
        { who: 'narration', text: '鉱区に採取モジュールを送り、素材を中間素材に。\n3つの部品を組み上げれば、量産機が際限なく流れ出す。' },
        { who: 'ai', expr: 'alert', text: '量産で押し返す。――防衛開始だ。' },
      ],
      waves: [
        w([{ type: 'swarmling', count: 6, delay: 1, gap: 1.4 }], { ore: 60, research: 12 }),
        w([{ type: 'swarmling', count: 10, delay: 1, gap: 1.1 }], { ore: 80, research: 14 }),
        w([{ type: 'swarmling', count: 8, delay: 0.5, gap: 0.9 }, { type: 'spitter', count: 2, delay: 6, gap: 2 }], { ore: 110, research: 18 }),
      ],
      outro: '群体は退いた。残骸は自己増殖する「工場」そのもの――\nならば、こちらはより速く、より賢く量産するまでだ。',
      choice: {
        prompt: '残骸の解析方針を決定せよ。',
        options: [
          { label: '構造を解析（研究重視）', desc: '研究所の出力が永続+15%。', apply: { researchMult: 0.15 } },
          { label: '素材を回収（工業重視）', desc: '全鉱区の産出が永続+15%。', apply: { mineMult: 0.15 } },
        ],
      },
    },
    {
      title: '第二章　増殖する前線',
      grant: { zones: [2, 3], modules: 2 },
      intro:
        '装甲を持つ個体が現れた。低火力の物量では装甲を割れない。\n' +
        'ボディのグレード、出力CPU、あるいは重兵装――設計を見直せ。',
      waves: [
        w([{ type: 'swarmling', count: 12, delay: 0.5, gap: 0.8 }, { type: 'armored', count: 3, delay: 4, gap: 2.5 }], { ore: 130, research: 22 }),
        w([{ type: 'spitter', count: 6, delay: 1, gap: 1.2 }, { type: 'armored', count: 4, delay: 5, gap: 2 }], { ore: 150, research: 26 }),
        w([{ type: 'swarmling', count: 16, delay: 0.4, gap: 0.6 }, { type: 'armored', count: 5, delay: 6, gap: 1.8 }, { type: 'spitter', count: 4, delay: 10, gap: 1.5 }], { ore: 190, research: 32 }),
      ],
      outro: '捕獲個体のコアに旧文明の識別コード。この星はかつて、\n無人兵器工場の実験場だったのだ。',
      choice: {
        prompt: '旧文明の管制プロトコルを部分復元できる。',
        options: [
          { label: '生産網に統合（工業）', desc: '全工場の生産速度が永続+12%。', apply: { buildSpeed: 0.12 } },
          { label: '指揮網に統合（特殊）', desc: '指揮容量が永続+8。', apply: { capacity: 8 } },
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
        '地表のハッチが開き、群体が濁流のように溢れ出す。\n' +
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
        '巨核が砕け、地下の脈動が静まる。群体の波は――止まった。\n' +
        'だが偵察衛星は、隣の星系で同じ識別コードの反応を捉えていた。\n\n' +
        '――戦線は、まだ終わらない。',
      choice: null,
    },
  ];

  // 2Dアリーナ：中央のドーム自陣に360度全方位から敵が殺到する
  G.ARENA = { domeR: 52, spawnR: 470, viewR: 500, turretR: 230 };
  G.HQ_HP = 1100;

})(window.G = window.G || {});

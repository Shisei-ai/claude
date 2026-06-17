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

  // ---- 基盤設備（カウント式・経済の土台） --------------------------------
  G.BASE_BUILDINGS = {
    reactor: { name: '発電所', icon: '⚡', cost: 80, costScale: 1.22, power: 22, desc: '電力を供給。全生産は電力に依存する。' },
    miner:   { name: '採掘機', icon: '⛏', cost: 55, costScale: 1.17, power: -5, ore: 0.9, desc: '鉱石を毎秒採掘する。' },
    lab:     { name: '研究所', icon: '🔬', cost: 110, costScale: 1.24, power: -8, research: 0.55, desc: '研究ポイントを蓄積。' },
    depot:   { name: '補給庫', icon: '📦', cost: 70, costScale: 1.2, power: -1, oreCap: 250, desc: '鉱石の貯蔵上限を増やす。' },
    relay:   { name: '通信中継塔', icon: '📡', cost: 120, costScale: 1.25, power: -4, capacity: 6, desc: '指揮容量を拡張。' },
    turret:  { name: '防衛砲台', icon: '🗼', cost: 160, costScale: 1.3, power: -6, desc: '前線の固定砲。対空可。' },
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
  //   effect の解釈: mineMult/researchMult/buildSpeed/powerSave/capacity（経済系）
  //                  unlockBody/unlockWeapon/unlockCpu（解放）
  //                  bodyTier/weaponTier/headTier（グレード/スロットの引上げ=その値以上に）
  G.TECHS = {
    // 工業
    mining1:   { name: '採掘最適化', branch: '工業', cost: 40, req: [], desc: '鉱石産出 +25%。', effect: { mineMult: 0.25 } },
    fabspeed1: { name: '生産自動化', branch: '工業', cost: 60, req: ['mining1'], desc: '全工場の生産速度 +30%。', effect: { buildSpeed: 0.30 } },
    powergrid: { name: '送電網改良', branch: '工業', cost: 70, req: ['mining1'], desc: '全設備の電力消費 -20%。', effect: { powerSave: 0.20 } },
    mining2:   { name: '深層採掘', branch: '工業', cost: 130, req: ['fabspeed1'], desc: '鉱石産出 さらに +40%。', effect: { mineMult: 0.40 } },

    // 機体（兵科 / ボディグレード）
    body_heavy:  { name: '重装兵 開発', branch: '機体', cost: 70, req: [], desc: '重装兵ボディを解放。', effect: { unlockBody: 'heavy' } },
    body_shooter:{ name: '射撃兵 開発', branch: '機体', cost: 60, req: [], desc: '射撃兵ボディ（対空）を解放。', effect: { unlockBody: 'shooter' } },
    body_flyer:  { name: '飛行兵 開発', branch: '機体', cost: 110, req: ['body_shooter'], desc: '飛行兵ボディを解放。', effect: { unlockBody: 'flyer' } },
    bodyTier2:   { name: 'ボディ規格Ⅱ', branch: '機体', cost: 80, req: ['body_heavy'], desc: '全ボディのグレードを2に。', effect: { bodyTier: 2 } },
    bodyTier3:   { name: 'ボディ規格Ⅲ', branch: '機体', cost: 160, req: ['bodyTier2'], desc: '全ボディのグレードを3に。', effect: { bodyTier: 3 } },

    // 武装（ウェポン種類 / ウェポングレード）
    wp_splash: { name: '拡散兵装 開発', branch: '武装', cost: 60, req: [], desc: '拡散兵装（範囲攻撃）を解放。', effect: { unlockWeapon: 'splash' } },
    wp_chain:  { name: '連鎖兵装 開発', branch: '武装', cost: 90, req: ['wp_splash'], desc: '連鎖兵装を解放。', effect: { unlockWeapon: 'chain' } },
    wp_heavy:  { name: '重兵装 開発', branch: '武装', cost: 100, req: ['wp_splash'], desc: '重兵装（単体高火力）を解放。', effect: { unlockWeapon: 'heavyW' } },
    wpTier2:   { name: '兵装規格Ⅱ', branch: '武装', cost: 80, req: ['wp_splash'], desc: '全ウェポンのグレードを2に。', effect: { weaponTier: 2 } },
    wpTier3:   { name: '兵装規格Ⅲ', branch: '武装', cost: 160, req: ['wpTier2'], desc: '全ウェポンのグレードを3に。', effect: { weaponTier: 3 } },

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

  // ---- シナリオ（章 → 波） -----------------------------------------------
  function w(enemies, reward) { return { enemies: enemies, reward: reward }; }

  G.CHAPTERS = [
    {
      title: '第一章　辺境基地カストル',
      intro:
        '辺境採掘基地カストル、通信途絶から72時間。\n' +
        '指揮AI〈あなた〉は休眠から目覚め、防衛権限を掌握する。\n\n' +
        'まず工業を立ち上げよ。部品工場でボディ・ヘッド・ウェポンを生産し、\n' +
        '組立ラインに設計を組めば、戦闘中に量産ロボットが流れ出す。',
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
          { label: '素材を回収（工業重視）', desc: '採掘機の産出が永続+15%。', apply: { mineMult: 0.15 } },
        ],
      },
    },
    {
      title: '第二章　増殖する前線',
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

  G.LANE = 1000;
  G.WALL_X = 235;
  G.HQ_HP = 1000;

})(window.G = window.G || {});

/* =========================================================================
 * 鋼鉄戦線 (Steel Front) - データ定義
 *  ・建物 / ユニット / 敵 / 研究ツリー / シナリオ（章・波）をここに集約。
 *  ・数値はバランス調整しやすいようすべてこのファイルに置く。
 * ========================================================================= */
(function (G) {
  'use strict';

  // ---- 3すくみ（属性相性） ------------------------------------------------
  //   軽(light) は 射(ranged) に強い / 射(ranged) は 重(heavy) に強い / 重(heavy) は 軽(light) に強い
  G.STRONG_AGAINST = { light: 'ranged', ranged: 'heavy', heavy: 'light' };
  G.ADV_MULT = 1.6;   // 有利時のダメージ倍率
  G.DIS_MULT = 0.65;  // 不利時のダメージ倍率

  // ---- 建物 ---------------------------------------------------------------
  //   power: 正=供給(発電)、負=消費。cost は鉱石。costScale で買うほど高くなる。
  G.BUILDINGS = {
    reactor: {
      name: '発電所', icon: '⚡', cost: 80, costScale: 1.22, power: 22,
      desc: '電力を供給する。全ての生産は電力に依存する。',
    },
    miner: {
      name: '採掘機', icon: '⛏', cost: 55, costScale: 1.17, power: -5, ore: 0.9,
      desc: '鉱石を毎秒採掘する。電力を消費。',
    },
    factory: {
      name: '製造工場', icon: '🏭', cost: 130, costScale: 1.26, power: -10, slot: 1,
      desc: 'ユニットを建造する生産ライン。台数だけ並行建造できる。',
    },
    lab: {
      name: '研究所', icon: '🔬', cost: 110, costScale: 1.24, power: -8, research: 0.55,
      desc: '研究ポイントを蓄積する。テック解放に必須。',
    },
    depot: {
      name: '補給庫', icon: '📦', cost: 70, costScale: 1.2, power: -1, oreCap: 250,
      desc: '鉱石の貯蔵上限を増やす。',
    },
    relay: {
      name: '通信中継塔', icon: '📡', cost: 120, costScale: 1.25, power: -4, capacity: 6,
      desc: '指揮容量を拡張し、より多くのユニットを展開できる。',
    },
    turret: {
      name: '防衛砲台', icon: '🗼', cost: 160, costScale: 1.3, power: -6,
      desc: '前線の壁に固定砲台を増設。敵を自動で射撃する。',
    },
  };

  // ---- ユニット -----------------------------------------------------------
  //   atkType: 攻撃属性 / 進軍してきた敵を自動で迎撃する自走ユニット。
  G.UNITS = {
    scout: {
      name: '軽兵ロボ', icon: '🤖', atkType: 'light', cost: 22, cap: 1, build: 1.8,
      hp: 34, dmg: 7, speed: 70, range: 26, rate: 0.8,
      desc: '安価で快速。物量で押す。射撃型に強い。',
    },
    trooper: {
      name: '歩兵ロボ', icon: '🛡', atkType: 'light', cost: 40, cap: 2, build: 3.2,
      hp: 78, dmg: 12, speed: 52, range: 30, rate: 1.0,
      desc: '汎用バランス型。前線の主力。',
    },
    heavy: {
      name: '重装ロボ', icon: '🦾', atkType: 'heavy', cost: 95, cap: 4, build: 6.0,
      hp: 240, dmg: 22, speed: 30, range: 30, rate: 1.3, locked: true,
      desc: '頑強で打たれ強い壁役。軽量型を踏み潰す。',
    },
    gunner: {
      name: '射撃ロボ', icon: '🎯', atkType: 'ranged', cost: 70, cap: 3, build: 4.5,
      hp: 60, dmg: 26, speed: 42, range: 150, rate: 1.1, locked: true,
      desc: '遠距離から高火力。重装型を溶かすが脆い。',
    },
    engineer: {
      name: '工兵ロボ', icon: '🔧', atkType: 'none', cost: 55, cap: 2, build: 4.0,
      hp: 70, dmg: 0, speed: 48, range: 90, rate: 1.0, heal: 14, locked: true,
      desc: '味方ユニットと砲台を継続修理する支援機。',
    },
    drone: {
      name: '自爆ドローン', icon: '💥', atkType: 'light', cost: 30, cap: 1, build: 2.2,
      hp: 26, dmg: 60, speed: 95, range: 22, rate: 1.0, kamikaze: true, aoe: 60, locked: true,
      desc: '敵に突撃し自爆、範囲ダメージ。密集した群体に有効。',
    },
  };

  // ---- 敵（群体） ---------------------------------------------------------
  G.ENEMIES = {
    swarmling: { name: '小型・群体', icon: '▾', atkType: 'light', hp: 40, dmg: 6, speed: 30, range: 24, rate: 0.9, bounty: 3, color: '#e0556b' },
    armored:   { name: '装甲・群体', icon: '◆', atkType: 'heavy', hp: 170, dmg: 14, speed: 20, range: 26, rate: 1.2, bounty: 7, color: '#c23b78' },
    spitter:   { name: '砲塔・群体', icon: '✶', atkType: 'ranged', hp: 55, dmg: 20, speed: 24, range: 140, rate: 1.2, bounty: 6, color: '#d65fa0' },
    titan:     { name: '巨核・群体', icon: '✪', atkType: 'heavy', hp: 1400, dmg: 60, speed: 14, range: 34, rate: 1.5, bounty: 60, color: '#ff3b3b', boss: true },
  };

  // ---- 研究ツリー ---------------------------------------------------------
  //   req: 前提テックID配列 / branch: 表示用カテゴリ / effects はゲーム側で解釈。
  G.TECHS = {
    // 工業系
    mining1:   { name: '採掘最適化', branch: '工業', cost: 40, req: [], desc: '採掘機の鉱石産出 +25%。', effect: { mineMult: 0.25 } },
    factory1:  { name: '生産ライン高速化', branch: '工業', cost: 60, req: ['mining1'], desc: 'ユニット建造速度 +30%。', effect: { buildSpeed: 0.30 } },
    powergrid: { name: '送電網改良', branch: '工業', cost: 70, req: ['mining1'], desc: '全建物の電力消費 -20%。', effect: { powerSave: 0.20 } },
    mining2:   { name: '深層採掘', branch: '工業', cost: 130, req: ['factory1'], desc: '採掘機の鉱石産出 さらに +40%。', effect: { mineMult: 0.40 } },

    // 軍事系
    armor1:    { name: '装甲合金', branch: '軍事', cost: 50, req: [], desc: '全ユニットHP +25%。', effect: { hpMult: 0.25 } },
    unlockHeavy:{ name: '重装ロボ開発', branch: '軍事', cost: 80, req: ['armor1'], desc: '重装ロボを建造可能にする。', effect: { unlock: 'heavy' } },
    weapon1:   { name: '火器強化', branch: '軍事', cost: 90, req: ['armor1'], desc: '全ユニット攻撃力 +25%。', effect: { dmgMult: 0.25 } },
    unlockDrone:{ name: '自爆ドローン', branch: '軍事', cost: 110, req: ['weapon1'], desc: '自爆ドローンを建造可能にする。', effect: { unlock: 'drone' } },

    // 特殊・支援系
    unlockGunner:{ name: '射撃管制', branch: '特殊', cost: 60, req: [], desc: '射撃ロボを建造可能にする。', effect: { unlock: 'gunner' } },
    command1:  { name: '指揮系統拡張', branch: '特殊', cost: 70, req: ['unlockGunner'], desc: '指揮容量 +10。', effect: { capacity: 10 } },
    unlockEng: { name: '野戦修理', branch: '特殊', cost: 90, req: ['unlockGunner'], desc: '工兵ロボを建造可能にする。', effect: { unlock: 'engineer' } },
    research1: { name: '解析アルゴリズム', branch: '特殊', cost: 100, req: ['command1'], desc: '研究ポイント獲得 +40%。', effect: { researchMult: 0.40 } },
  };

  // ---- シナリオ（章 → 波） -----------------------------------------------
  //   各 wave: enemies=[{type,count,delay,gap}], reward={ore,research}
  //   章の終わりに story（本文）と任意の choice（選択肢で恒久ボーナス）を挟む。
  function w(enemies, reward) { return { enemies: enemies, reward: reward }; }

  G.CHAPTERS = [
    {
      title: '第一章　辺境基地カストル',
      intro:
        '辺境採掘基地カストル、通信途絶から72時間。\n' +
        '最後の通信は「機械の群れ」という断片だけを残していた。\n' +
        '指揮AI〈あなた〉は休眠から目覚め、防衛権限を掌握する。\n' +
        'まず工業を立ち上げ、最初の群体を迎え撃て。',
      waves: [
        w([{ type: 'swarmling', count: 6, delay: 1, gap: 1.4 }], { ore: 60, research: 10 }),
        w([{ type: 'swarmling', count: 10, delay: 1, gap: 1.1 }], { ore: 80, research: 12 }),
        w([{ type: 'swarmling', count: 8, delay: 0.5, gap: 0.9 }, { type: 'spitter', count: 2, delay: 6, gap: 2 }], { ore: 100, research: 16 }),
      ],
      outro: '群体は退いた。残骸を解析すると――それは既知のどの兵器でもない、\n自己増殖する「工場」そのものだった。誰が、何のために？',
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
        '群体は数を増して戻ってきた。装甲を持つ個体が確認される。\n' +
        '単一の物量では押し負ける――編成の相性を考えろ。',
      waves: [
        w([{ type: 'swarmling', count: 12, delay: 0.5, gap: 0.8 }, { type: 'armored', count: 3, delay: 4, gap: 2.5 }], { ore: 120, research: 20 }),
        w([{ type: 'spitter', count: 6, delay: 1, gap: 1.2 }, { type: 'armored', count: 4, delay: 5, gap: 2 }], { ore: 140, research: 24 }),
        w([{ type: 'swarmling', count: 16, delay: 0.4, gap: 0.6 }, { type: 'armored', count: 5, delay: 6, gap: 1.8 }, { type: 'spitter', count: 4, delay: 10, gap: 1.5 }], { ore: 180, research: 30 }),
      ],
      outro: '捕獲した個体のコアに、旧文明の識別コードが刻まれていた。\nこの星はかつて、無人兵器工場の実験場だったのだ。',
      choice: {
        prompt: '旧文明の管制プロトコルが部分的に復元できる。',
        options: [
          { label: '防衛網に統合（軍事）', desc: '全ユニットHPが永続+10%。', apply: { hpMult: 0.10 } },
          { label: '指揮網に統合（特殊）', desc: '指揮容量が永続+8。', apply: { capacity: 8 } },
        ],
      },
    },
    {
      title: '第三章　暴走する遺産',
      intro:
        '復元したログは警告していた――「中枢が目覚めれば、星は喰われる」。\n' +
        '群体の波はもはや止まらない。砲塔型の群れが射程の外から基地を狙う。',
      waves: [
        w([{ type: 'spitter', count: 8, delay: 0.5, gap: 0.9 }, { type: 'swarmling', count: 14, delay: 3, gap: 0.6 }], { ore: 200, research: 36 }),
        w([{ type: 'armored', count: 8, delay: 1, gap: 1.6 }, { type: 'spitter', count: 6, delay: 6, gap: 1.2 }], { ore: 230, research: 40 }),
        w([{ type: 'swarmling', count: 20, delay: 0.3, gap: 0.5 }, { type: 'armored', count: 8, delay: 5, gap: 1.4 }, { type: 'spitter', count: 8, delay: 9, gap: 1 }], { ore: 280, research: 50 }),
      ],
      outro: '群体の発信源を逆探知した。基地の地下深く――旧文明の中枢炉が脈動している。\nそれを止めぬ限り、攻勢は永遠に続く。',
      choice: {
        prompt: '中枢へ向けた最終攻勢の準備。',
        options: [
          { label: '火力に全振り（軍事）', desc: '全ユニット攻撃力が永続+15%。', apply: { dmgMult: 0.15 } },
          { label: '兵站に全振り（工業）', desc: 'ユニット建造速度が永続+20%。', apply: { buildSpeed: 0.20 } },
        ],
      },
    },
    {
      title: '第四章　中枢炉',
      intro:
        '地表のハッチが開き、群体が濁流のように溢れ出す。\n' +
        'これが最後の防衛戦だ。すべての生産力を戦線に注ぎ込め。',
      waves: [
        w([{ type: 'swarmling', count: 24, delay: 0.3, gap: 0.45 }, { type: 'spitter', count: 10, delay: 4, gap: 0.9 }], { ore: 320, research: 60 }),
        w([{ type: 'armored', count: 14, delay: 0.5, gap: 1.1 }, { type: 'spitter', count: 10, delay: 6, gap: 0.9 }, { type: 'swarmling', count: 20, delay: 9, gap: 0.4 }], { ore: 360, research: 70 }),
        w([
          { type: 'swarmling', count: 26, delay: 0.3, gap: 0.4 },
          { type: 'armored', count: 12, delay: 4, gap: 1 },
          { type: 'spitter', count: 12, delay: 8, gap: 0.8 },
          { type: 'titan', count: 1, delay: 14, gap: 1 },
        ], { ore: 500, research: 120 }),
      ],
      outro:
        '巨核が砕け、地下の脈動が静まる。群体の波は――止まった。\n' +
        '基地カストルは陥落しなかった。だが偵察衛星は、隣の星系で\n' +
        '同じ識別コードの反応が点滅し始めたのを捉えていた。\n\n' +
        '――戦線は、まだ終わらない。',
      choice: null,
    },
  ];

  // 進軍レーンの長さ（論理座標）。0=基地、LANE=敵出現端。
  G.LANE = 1000;
  G.WALL_X = 235;      // 防衛砲台の設置位置
  G.HQ_HP = 1000;      // 司令部HP（0で敗北）

})(window.G = window.G || {});

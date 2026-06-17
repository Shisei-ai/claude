/* =========================================================================
 * 鋼鉄戦線 (Steel Front) - データ定義
 *  ・建物 / ユニット / 敵 / 研究ツリー / シナリオ（章・波）をここに集約。
 *  ・数値はバランス調整しやすいようすべてこのファイルに置く。
 * ========================================================================= */
(function (G) {
  'use strict';

  // ---- 戦闘モデルの基礎値 ------------------------------------------------
  //   ・相性は抽象的な3すくみではなく、具体的な「ドメイン(地上/空中)」「装甲(防御力)」
  //     「射程」の噛み合いで表現する。
  //   ・ダメージ = max(MIN_DMG, 攻撃力 - 相手の防御力)。
  //       → 低火力の物量(歩兵)は装甲持ちに刺さらず、高火力(突撃兵/射撃兵)が装甲を割る。
  //   ・空中(domain:'air')ユニットは「対空(antiAir)」を持つ相手にしか攻撃されない。
  //       射撃兵・飛行兵・防衛砲台が対空を担う。
  G.MIN_DMG = 1;

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
  //   domain : 'ground'（地上）/ 'air'（空中・地上敵から攻撃されない）
  //   def    : 防御力。被ダメージを軽減（max(MIN_DMG, 攻撃 - def)）
  //   antiAir: 空中の敵を攻撃できるか
  //   range  : 射程（小さい=近接、大きい=後方射撃）
  G.UNITS = {
    infantry: {
      name: '歩兵', icon: '🪖', cost: 22, cap: 1, build: 1.8,
      hp: 65, dmg: 9, def: 1, speed: 52, range: 30, rate: 1.0,
      domain: 'ground', antiAir: false,
      desc: '最もスタンダードで安価。量産して物量を担保する主力。',
    },
    assault: {
      name: '突撃兵', icon: '⚡', cost: 46, cap: 2, build: 3.0,
      hp: 46, dmg: 27, def: 0, speed: 92, range: 28, rate: 1.1,
      domain: 'ground', antiAir: false,
      desc: '火力と機動力が高いが脆い。敵陣を突破して活路を開く。',
    },
    heavy: {
      name: '重装兵', icon: '🛡', cost: 95, cap: 4, build: 6.0,
      hp: 300, dmg: 15, def: 9, speed: 24, range: 30, rate: 1.0, locked: true,
      domain: 'ground', antiAir: false,
      desc: '体力・防御力が高く鈍重。前線を支える鉄壁の防衛線。',
    },
    shooter: {
      name: '射撃兵', icon: '🎯', cost: 70, cap: 3, build: 4.2,
      hp: 55, dmg: 24, def: 1, speed: 40, range: 165, rate: 1.0, locked: true,
      domain: 'ground', antiAir: true,
      desc: '後方から高火力で狙撃。対空も可能で安定して敵戦力を削る。',
    },
    flyer: {
      name: '飛行兵', icon: '🚁', cost: 82, cap: 3, build: 4.8,
      hp: 95, dmg: 16, def: 2, speed: 56, range: 120, rate: 1.0, locked: true,
      domain: 'air', antiAir: true,
      desc: '空中から地上・空中の敵を射撃。地上敵に阻まれず敵陣の奥へ進む。',
    },
  };

  // ---- 敵（群体） ---------------------------------------------------------
  //   domain/def/antiAir はユニットと同じ意味。空中型は対空ユニットでしか落とせない。
  G.ENEMIES = {
    swarmling: { name: '小型・群体', icon: '▾', hp: 42, dmg: 6, def: 0, speed: 30, range: 24, rate: 0.9, bounty: 3, domain: 'ground', antiAir: false, color: '#e0556b' },
    armored:   { name: '装甲・群体', icon: '◆', hp: 185, dmg: 14, def: 7, speed: 20, range: 26, rate: 1.1, bounty: 7, domain: 'ground', antiAir: false, color: '#c23b78' },
    spitter:   { name: '砲塔・群体', icon: '✶', hp: 55, dmg: 19, def: 1, speed: 24, range: 145, rate: 1.1, bounty: 6, domain: 'ground', antiAir: false, color: '#d65fa0' },
    wyrm:      { name: '飛翔・群体', icon: '✦', hp: 78, dmg: 16, def: 2, speed: 36, range: 110, rate: 1.0, bounty: 9, domain: 'air', antiAir: true, color: '#ff7ad0' },
    titan:     { name: '巨核・群体', icon: '✪', hp: 1500, dmg: 60, def: 10, speed: 14, range: 34, rate: 1.5, bounty: 60, domain: 'ground', antiAir: true, color: '#ff3b3b', boss: true },
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
    unlockHeavy:{ name: '重装兵 開発', branch: '軍事', cost: 80, req: ['armor1'], desc: '重装兵を建造可能にする。', effect: { unlock: 'heavy' } },
    weapon1:   { name: '火器強化', branch: '軍事', cost: 90, req: ['armor1'], desc: '全ユニット攻撃力 +25%。', effect: { dmgMult: 0.25 } },
    armor2:    { name: '複合装甲', branch: '軍事', cost: 110, req: ['unlockHeavy'], desc: '全ユニットの防御力 +2。', effect: { defBonus: 2 } },

    // 特殊・支援系
    unlockShooter:{ name: '射撃管制', branch: '特殊', cost: 55, req: [], desc: '射撃兵（対空可）を建造可能にする。', effect: { unlock: 'shooter' } },
    command1:  { name: '指揮系統拡張', branch: '特殊', cost: 70, req: ['unlockShooter'], desc: '指揮容量 +10。', effect: { capacity: 10 } },
    unlockFlyer:{ name: '航空戦力 配備', branch: '特殊', cost: 115, req: ['unlockShooter'], desc: '飛行兵を建造可能にする。', effect: { unlock: 'flyer' } },
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
        '空に新たな影。飛翔する個体が地上を無視して基地へ迫る。\n' +
        '対空（射撃兵・飛行兵・防衛砲台）が無ければ、空から喰い破られるぞ。',
      waves: [
        w([{ type: 'spitter', count: 8, delay: 0.5, gap: 0.9 }, { type: 'wyrm', count: 3, delay: 4, gap: 1.6 }], { ore: 200, research: 36 }),
        w([{ type: 'armored', count: 8, delay: 1, gap: 1.6 }, { type: 'wyrm', count: 5, delay: 5, gap: 1.2 }, { type: 'spitter', count: 4, delay: 9, gap: 1.2 }], { ore: 230, research: 42 }),
        w([{ type: 'swarmling', count: 20, delay: 0.3, gap: 0.5 }, { type: 'armored', count: 8, delay: 5, gap: 1.4 }, { type: 'wyrm', count: 6, delay: 8, gap: 1 }, { type: 'spitter', count: 6, delay: 12, gap: 1 }], { ore: 290, research: 52 }),
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
        w([{ type: 'swarmling', count: 24, delay: 0.3, gap: 0.45 }, { type: 'wyrm', count: 8, delay: 4, gap: 0.8 }], { ore: 320, research: 60 }),
        w([{ type: 'armored', count: 14, delay: 0.5, gap: 1.1 }, { type: 'spitter', count: 10, delay: 6, gap: 0.9 }, { type: 'wyrm', count: 8, delay: 9, gap: 0.7 }], { ore: 360, research: 70 }),
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

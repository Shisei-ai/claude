// ──────────────────────────────────────────────────────────
//  Gear System  (Slay the Spire "Relic"-style passive items)
//  Sources:
//    - Elite enemy kill  → 40% chance
//    - Boss (wave % 5)   → guaranteed
//    - Event choices
// ──────────────────────────────────────────────────────────

function hasGear(gs, id) {
  return !!(gs && gs.gears && gs.gears.includes(id));
}

const GEAR_POOL = [

  // ── Production ─────────────────────────────────────────
  {
    id: 'steam_core', name: '蒸気コア', icon: '♨', rarity: 'common', category: 'production',
    desc: '全設備の処理速度が恒久的に20%向上する。',
    apply(gs) {
      gs.upgrades.minerSpeed     = Math.floor((gs.upgrades.minerSpeed     || 120) * 0.83);
      gs.upgrades.conveyorSpeed  = Math.floor((gs.upgrades.conveyorSpeed  ||  60) * 0.83);
      gs.upgrades.furnaceSpeed   = Math.floor((gs.upgrades.furnaceSpeed   || 180) * 0.83);
      gs.upgrades.assemblerSpeed = Math.floor((gs.upgrades.assemblerSpeed || 240) * 0.83);
      gs.upgrades.chemSpeed      = Math.floor((gs.upgrades.chemSpeed      || 240) * 0.83);
    }
  },
  {
    id: 'craftsman_anvil', name: '職人の金床', icon: '⚒', rarity: 'rare', category: 'production',
    desc: '組立機・高度組立機の生産ごとにボーナス出力+2。',
    apply(gs) { gs.gearFlags.craftsmanBonus = (gs.gearFlags.craftsmanBonus || 0) + 2; }
  },
  {
    id: 'factory_soul', name: '工場の魂', icon: '🔧', rarity: 'common', category: 'production',
    desc: 'Minerが採掘するたびに25%の確率で産出量が2倍になる。',
    apply(_gs) {}
  },
  {
    id: 'memory_alloy', name: '記憶合金', icon: '🔄', rarity: 'rare', category: 'production',
    desc: '設備撤去時のリソース還付率が50%→100%になる。',
    apply(_gs) {}
  },
  {
    id: 'mine_blessing', name: '採掘の祝福', icon: '⛏', rarity: 'rare', category: 'production',
    desc: '全Minerの産出量が+1される。',
    apply(gs) { gs.upgrades.minerYield = (gs.upgrades.minerYield || 1) + 1; }
  },
  {
    id: 'amplifier_coil', name: '増幅コイル', icon: '🔊', rarity: 'rare', category: 'production',
    desc: 'ストレージへのアイテム追加10回ごとに同じアイテムが1個追加される。',
    apply(gs) { gs.gearFlags.amplifierCount = gs.gearFlags.amplifierCount || 0; }
  },
  {
    id: 'auto_smelter', name: '自動製錬炉', icon: '🏭', rarity: 'rare', category: 'production',
    desc: 'Furnaceの処理時間が50%短縮され、常に2倍の効率で稼働する。',
    apply(_gs) {}
  },
  {
    id: 'golden_gear', name: '黄金歯車', icon: '⭐', rarity: 'epic', category: 'production',
    desc: '各Wave開始時に鉄板・銅板をそれぞれWave数分獲得する。',
    apply(_gs) {}
  },

  // ── Chemistry ──────────────────────────────────────────
  {
    id: 'catalyst_stone', name: '触媒石', icon: '💎', rarity: 'rare', category: 'chemistry',
    desc: '化学プラントの各レシピ入力コストが1ずつ減少する（最低1）。',
    apply(gs) { gs.upgrades.chemSave = true; }
  },
  {
    id: 'ancient_fire', name: '古代の炎', icon: '🔥', rarity: 'common', category: 'chemistry',
    desc: 'コークス炉の産出量が2倍（石炭×2でコークス×2）になる。',
    apply(gs) { gs.gearFlags.doubleCokeYield = true; }
  },
  {
    id: 'water_deity', name: '水の神', icon: '🌊', rarity: 'common', category: 'chemistry',
    desc: 'Water Pumpが毎回水×2を産出するようになる（通常×1）。',
    apply(gs) { gs.gearFlags.doubleWater = true; }
  },
  {
    id: 'oil_stratum', name: '油層', icon: '🛢', rarity: 'rare', category: 'chemistry',
    desc: 'Oil Pumpの産出量が+2増加する。',
    apply(gs) { gs.upgrades.pumpYield = (gs.upgrades.pumpYield || 1) + 2; }
  },
  {
    id: 'distill_master', name: '蒸留の達人', icon: '🧪', rarity: 'rare', category: 'chemistry',
    desc: '蒸留塔がバッチあたり原油×6を処理し、全出力が2倍になる。',
    apply(gs) { gs.gearFlags.distillMaster = true; }
  },
  {
    id: 'alchemist_still', name: '錬金釜', icon: '⚗', rarity: 'rare', category: 'chemistry',
    desc: '化学プラントが3回反応するたびに同じ出力物を1個追加産出する。',
    apply(gs) { gs.gearFlags.alchemistCount = gs.gearFlags.alchemistCount || 0; }
  },

  // ── Combat ─────────────────────────────────────────────
  {
    id: 'era_armor', name: '時代の鎧', icon: '🛡', rarity: 'rare', category: 'combat',
    desc: '全Wallの最大HPが3倍になる（設置済み・新規設置両方）。',
    apply(gs) {
      gs.gearFlags.eraArmor = true;
      for (let y = 0; y < C.ROWS; y++) {
        for (let x = 0; x < C.COLS; x++) {
          const eq = gs.map.grid[y][x].equipment;
          if (eq?.type === C.EQ.WALL) eq.hp = Math.min(eq.hp * 3, EQ_DEF.wall.hp * 3);
        }
      }
    }
  },
  {
    id: 'emp_generator', name: 'EMPジェネレーター', icon: '📡', rarity: 'epic', category: 'combat',
    desc: 'Wave開始時に全敵を180ティック（約3秒）スタンさせる。',
    apply(_gs) {}
  },
  {
    id: 'fortification', name: '要塞化', icon: '🏯', rarity: 'common', category: 'combat',
    desc: '敵がWallを攻撃するたびに攻撃した敵に5ダメージを跳ね返す。',
    apply(_gs) {}
  },
  {
    id: 'rapid_fire', name: '速射装置', icon: '🎯', rarity: 'common', category: 'combat',
    desc: 'タレットのクールダウンが15ティック短縮される。',
    apply(gs) { gs.gearFlags.rapidFireBonus = (gs.gearFlags.rapidFireBonus || 0) + 15; }
  },
  {
    id: 'black_powder', name: '黒色火薬', icon: '💣', rarity: 'rare', category: 'combat',
    desc: 'タレットがHP30%以下の敵に+50%ダメージを与える（処刑ボーナス）。',
    apply(_gs) {}
  },
  {
    id: 'iron_curtain', name: '鉄のカーテン', icon: '🧱', rarity: 'common', category: 'combat',
    desc: 'Wallが毎ティック0.15HP自然回復する（turretなしでも機能）。',
    apply(_gs) {}
  },
  {
    id: 'targeting_computer', name: '照準コンピュータ', icon: '🖥', rarity: 'rare', category: 'combat',
    desc: 'タレットが最近傍ではなく最もHPの低い敵を優先攻撃する。',
    apply(_gs) {}
  },
  {
    id: 'core_reactor', name: 'コアリアクター', icon: '⚛', rarity: 'epic', category: 'combat',
    desc: 'Wave終了時に撃破数×2のコアHPを回復する（1Wave最大50）。',
    apply(_gs) {}
  },

  // ── Economy / Utility ──────────────────────────────────
  {
    id: 'market_network', name: 'マーケットネット', icon: '💼', rarity: 'common', category: 'economy',
    desc: 'Wave終了後、5個以上所持しているリソースに対してそれぞれ+3獲得する。',
    apply(_gs) {}
  },
  {
    id: 'efficiency_algorithm', name: '効率アルゴリズム', icon: '📊', rarity: 'rare', category: 'economy',
    desc: '全設備の建設コストが各素材1個ずつ削減される（最低0）。',
    apply(gs) { gs.gearFlags.buildCostReduction = (gs.gearFlags.buildCostReduction || 0) + 1; }
  },
  {
    id: 'chemical_arsenal', name: '化学兵器庫', icon: '🧨', rarity: 'rare', category: 'economy',
    desc: 'Wave終了時、過剰な流体リソース（5個超）を5個ごとに爆薬1個へ変換する。',
    apply(_gs) {}
  },
  {
    id: 'element_transmuter', name: '元素変換器', icon: '🔁', rarity: 'rare', category: 'economy',
    desc: 'Wave終了時、鉄板20以上→銅板5個に、銅板20以上→鉄板5個に自動変換する。',
    apply(_gs) {}
  },
  {
    id: 'black_market_access', name: 'ブラックマーケット', icon: '🌑', rarity: 'epic', category: 'economy',
    desc: '全化学系設備が即座に解放される（レーザー・発電機含む）。',
    apply(_gs) {
      EQ_DEF.laser.unlocked         = true;
      EQ_DEF.generator.unlocked     = true;
      EQ_DEF.distillation.unlocked  = true;
      EQ_DEF.chem_plant.unlocked    = true;
      EQ_DEF.electrolyzer.unlocked  = true;
      EQ_DEF.adv_assembler.unlocked = true;
    }
  },

  // ── Special ────────────────────────────────────────────
  {
    id: 'phoenix_protocol', name: 'フェニックスプロトコル', icon: '🦅', rarity: 'epic', category: 'special',
    desc: '1回限り：コアHPが0になった時、代わりに50HPで復活する。',
    apply(_gs) {}
  },
  {
    id: 'industrial_gospel', name: '工業の福音書', icon: '📖', rarity: 'epic', category: 'special',
    desc: 'シナジーが発動するたびに、そのシナジー効果をもう1回適用する（2倍ボーナス）。',
    apply(_gs) {}
  },

  // ── Cursed ─────────────────────────────────────────────
  {
    id: 'blood_pact', name: '血の契約', icon: '🩸', rarity: 'cursed', category: 'cursed',
    desc: 'アップグレード選択肢が+2増えるが、コア最大HP-50。覚悟を決めろ。',
    apply(gs) {
      gs.coreMaxHp = Math.max(50, gs.coreMaxHp - 50);
      gs.coreHp    = Math.min(gs.coreHp, gs.coreMaxHp);
      gs.gearFlags.extraUpgradeChoices = (gs.gearFlags.extraUpgradeChoices || 0) + 2;
    }
  },
  {
    id: 'unstable_reactor', name: '不安定炉', icon: '☢', rarity: 'cursed', category: 'cursed',
    desc: '化学プラントが2倍速で動作するが、10%の確率で入力リソースを1個余分に消費する。',
    apply(gs) {
      gs.upgrades.chemSpeed   = Math.floor((gs.upgrades.chemSpeed || 240) * 0.5);
      gs.gearFlags.unstableReactor = true;
    }
  },
  {
    id: 'overclock_mandate', name: '強制オーバークロック', icon: '⚙', rarity: 'cursed', category: 'cursed',
    desc: '全生産設備50%高速化するが、Waveの敵数が20%増加する。',
    apply(gs) {
      gs.upgrades.minerSpeed     = Math.floor((gs.upgrades.minerSpeed     || 120) * 0.67);
      gs.upgrades.conveyorSpeed  = Math.floor((gs.upgrades.conveyorSpeed  ||  60) * 0.67);
      gs.upgrades.furnaceSpeed   = Math.floor((gs.upgrades.furnaceSpeed   || 180) * 0.67);
      gs.upgrades.assemblerSpeed = Math.floor((gs.upgrades.assemblerSpeed || 240) * 0.67);
      gs.gearFlags.extraEnemies  = (gs.gearFlags.extraEnemies || 0) + 0.2;
    }
  },
];

// ── Gear selection helpers ─────────────────────────────────

function getGearChoices(gs, count = 3) {
  const owned = new Set(gs.gears || []);
  const available = GEAR_POOL.filter(g => !owned.has(g.id));
  if (available.length === 0) return [];

  // Weighted random: common=5, rare=3, epic=1, cursed=2
  const weighted = [];
  for (const g of available) {
    const w = g.rarity === 'common' ? 5 : g.rarity === 'rare' ? 3 : g.rarity === 'epic' ? 1 : 2;
    for (let i = 0; i < w; i++) weighted.push(g);
  }

  const chosen = [], seen = new Set();
  let tries = 0;
  while (chosen.length < Math.min(count, available.length) && tries < 300) {
    tries++;
    const g = weighted[Math.floor(Math.random() * weighted.length)];
    if (g && !seen.has(g.id)) { chosen.push(g); seen.add(g.id); }
  }
  return chosen;
}

function showGearScreen(choices, onComplete) {
  const titleEl = document.getElementById('gear-screen-title');
  if (titleEl) titleEl.textContent = 'ギアを1つ選択';

  const container = document.getElementById('gear-cards');
  container.innerHTML = '';

  for (const g of choices) {
    const card = document.createElement('div');
    card.className = `gear-card rarity-border-${g.rarity}`;
    card.innerHTML = `
      <div class="gear-card-icon">${g.icon}</div>
      <div class="gear-card-name">${g.name}</div>
      <div class="gear-card-desc">${g.desc}</div>
      <div class="gear-card-rarity gear-rarity-${g.rarity}">${g.rarity.toUpperCase()}</div>
    `;
    card.onclick = () => {
      gs.gears.push(g.id);
      g.apply(gs);
      updateGearDisplay();
      onComplete();
    };
    container.appendChild(card);
  }
  showScreen('gear-screen');
}

// ── Per-wave callbacks ─────────────────────────────────────

function gearWaveStart(gs) {
  if (hasGear(gs, 'golden_gear')) {
    addRes(gs, C.RES.IRON_PLATE,   gs.wave);
    addRes(gs, C.RES.COPPER_PLATE, gs.wave);
  }
  if (hasGear(gs, 'emp_generator')) {
    for (const e of gs.enemies) e.stunTimer = (e.stunTimer || 0) + 180;
  }
}

function gearWaveEnd(gs) {
  if (hasGear(gs, 'market_network')) {
    for (const [k, v] of Object.entries(gs.resources)) {
      if (v >= 5) addRes(gs, k, 3);
    }
  }

  if (hasGear(gs, 'core_reactor')) {
    const heal = Math.min(50, (gs.waveKills || 0) * 2);
    gs.coreHp = Math.min(gs.coreMaxHp, gs.coreHp + heal);
  }

  if (hasGear(gs, 'chemical_arsenal')) {
    const liquidRes = [C.RES.PETRO_GAS, C.RES.LIGHT_OIL, C.RES.HEAVY_OIL, C.RES.LUBRICANT];
    for (const r of liquidRes) {
      const excess = Math.max(0, (gs.resources[r] || 0) - 5);
      const convert = Math.floor(excess / 5);
      if (convert > 0) { gs.resources[r] -= convert * 5; addRes(gs, C.RES.EXPLOSIVES, convert); }
    }
  }

  if (hasGear(gs, 'element_transmuter')) {
    if ((gs.resources[C.RES.IRON_PLATE]   || 0) >= 20) { gs.resources[C.RES.IRON_PLATE]   -= 5; addRes(gs, C.RES.COPPER_PLATE, 5); }
    if ((gs.resources[C.RES.COPPER_PLATE] || 0) >= 20) { gs.resources[C.RES.COPPER_PLATE] -= 5; addRes(gs, C.RES.IRON_PLATE,   5); }
  }
}

// ── UI helpers ─────────────────────────────────────────────

function updateGearDisplay() {
  const el = document.getElementById('gear-display');
  if (!el || !gs) return;
  el.innerHTML = '';
  if (!gs.gears || gs.gears.length === 0) {
    el.innerHTML = '<span style="color:#333;font-size:0.55rem">なし</span>';
    return;
  }
  for (const id of gs.gears) {
    const g = GEAR_POOL.find(x => x.id === id);
    if (!g) continue;
    const span = document.createElement('span');
    span.className = `gear-icon-small gear-rarity-${g.rarity}`;
    span.textContent = g.icon;
    span.title = `【${g.name}】${g.desc}`;
    el.appendChild(span);
  }
}

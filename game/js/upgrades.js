// ──────────────────────────────────────────────────────────
//  Roguelike upgrade pool
//  Each upgrade has:
//    tags[]  — used for build-path weighting
//    rarity  — common/rare/epic (weight 6/3/1)
//    onlyIf  — availability predicate
//    apply   — effect on gs
// ──────────────────────────────────────────────────────────

const UPGRADE_POOL = [

  // ── Production ─────────────────────────────────────────
  {
    id: 'miner_speed', name: 'オーバークロック採掘', icon: '⛏', rarity: 'common',
    tags: ['production'],
    desc: 'Minerの採掘速度が50%向上する',
    apply(gs) { gs.upgrades.minerSpeed = Math.floor((gs.upgrades.minerSpeed || 120) * 0.67); }
  },
  {
    id: 'miner_yield', name: '大量採掘', icon: '💎', rarity: 'rare',
    tags: ['production'],
    desc: '採掘量が2倍になる',
    apply(gs) { gs.upgrades.minerYield = (gs.upgrades.minerYield || 1) * 2; }
  },
  {
    id: 'conveyor_speed', name: '高速コンベア', icon: '➡', rarity: 'common',
    tags: ['production'],
    desc: 'Conveyorの搬送速度が2倍になる',
    apply(gs) { gs.upgrades.conveyorSpeed = Math.floor((gs.upgrades.conveyorSpeed || 60) * 0.5); }
  },
  {
    id: 'furnace_speed', name: '炉の改良', icon: '🔥', rarity: 'common',
    tags: ['production'],
    desc: '製錬速度が40%向上する',
    apply(gs) { gs.upgrades.furnaceSpeed = Math.floor((gs.upgrades.furnaceSpeed || 180) * 0.6); }
  },
  {
    id: 'furnace_yield', name: '精錬マスター', icon: '🔶', rarity: 'rare',
    tags: ['production'],
    desc: '炉の出力が2倍になる',
    apply(gs) { gs.upgrades.furnaceYield = (gs.upgrades.furnaceYield || 1) * 2; }
  },
  {
    id: 'assembler_speed', name: 'ロボット組立', icon: '⚙', rarity: 'common',
    tags: ['production'],
    desc: '組立速度が50%向上する',
    apply(gs) { gs.upgrades.assemblerSpeed = Math.floor((gs.upgrades.assemblerSpeed || 300) * 0.5); }
  },
  {
    id: 'assembler_yield', name: '量産ライン', icon: '📦', rarity: 'rare',
    tags: ['production'],
    desc: '組立機の出力が2倍になる',
    apply(gs) { gs.upgrades.assemblerYield = (gs.upgrades.assemblerYield || 1) * 2; }
  },

  // ── Behavioral: Production ─────────────────────────────
  {
    id: 'auto_protocol', name: '自動化プロトコル', icon: '🔗', rarity: 'rare',
    tags: ['production'],
    desc: 'Minerが隣接するFurnaceに直接投入できるようになる（コンベア不要）',
    onlyIf: gs => !gs.upgrades.autoProtocol,
    apply(gs) { gs.upgrades.autoProtocol = true; }
  },
  {
    id: 'wall_regen', name: '自己修復装甲', icon: '🔧', rarity: 'rare',
    tags: ['combat', 'production'],
    desc: 'Turretが隣接するWallを毎秒ゆっくり修復する',
    onlyIf: gs => !gs.upgrades.wallRegen,
    apply(gs) { gs.upgrades.wallRegen = true; }
  },

  // ── Chemistry Unlocks ───────────────────────────────────
  {
    id: 'unlock_distillation', name: '設計図：蒸留塔', icon: '🏭', rarity: 'rare',
    tags: ['chemistry'],
    desc: '蒸留塔が建設可能になる。原油→石油ガス・軽油・重油に分留する。',
    onlyIf: _gs => !EQ_DEF.distillation.unlocked,
    apply() { EQ_DEF.distillation.unlocked = true; }
  },
  {
    id: 'unlock_chem_plant', name: '設計図：化学プラント', icon: '⚗', rarity: 'rare',
    tags: ['chemistry'],
    desc: '化学プラントが建設可能になる。6種の化学レシピを実行できる。',
    onlyIf: _gs => !EQ_DEF.chem_plant.unlocked,
    apply() { EQ_DEF.chem_plant.unlocked = true; }
  },
  {
    id: 'unlock_electrolyzer', name: '設計図：電解槽', icon: '⚡', rarity: 'rare',
    tags: ['chemistry'],
    desc: '電解槽が建設可能になる。水→水素+酸素に電気分解する。',
    onlyIf: _gs => !EQ_DEF.electrolyzer.unlocked,
    apply() { EQ_DEF.electrolyzer.unlocked = true; }
  },
  {
    id: 'unlock_adv_assembler', name: '設計図：高度組立機', icon: '🤖', rarity: 'epic',
    tags: ['chemistry', 'production'],
    desc: '高度組立機が建設可能になる。高度回路基板・潤滑ギアを生産できる。',
    onlyIf: _gs => !EQ_DEF.adv_assembler.unlocked,
    apply() { EQ_DEF.adv_assembler.unlocked = true; }
  },
  {
    id: 'unlock_generator', name: '設計図：発電機', icon: '🔌', rarity: 'rare',
    tags: ['chemistry'],
    desc: '発電機が建設可能になる。コークスを消費して電力を生産する。',
    onlyIf: _gs => !EQ_DEF.generator.unlocked,
    apply() { EQ_DEF.generator.unlocked = true; }
  },

  // ── Chemistry Efficiency ────────────────────────────────
  {
    id: 'chem_speed', name: '触媒添加', icon: '🧪', rarity: 'rare',
    tags: ['chemistry'],
    desc: '化学プラント・電解槽の処理速度が40%向上する',
    apply(gs) { gs.upgrades.chemSpeed = Math.floor((gs.upgrades.chemSpeed || 240) * 0.6); }
  },
  {
    id: 'chem_yield', name: '収率改善', icon: '⚗', rarity: 'epic',
    tags: ['chemistry'],
    desc: '化学プラントの全出力が2倍になる',
    apply(gs) { gs.upgrades.chemYield = (gs.upgrades.chemYield || 1) * 2; }
  },
  {
    id: 'pump_speed', name: 'ポンプ強化', icon: '🛢', rarity: 'common',
    tags: ['chemistry'],
    desc: 'Oil Pumpの抽出速度が50%向上する',
    apply(gs) { gs.upgrades.pumpSpeed = Math.floor((gs.upgrades.pumpSpeed || 90) * 0.5); }
  },
  {
    id: 'pump_yield', name: '高圧ポンプ', icon: '🔵', rarity: 'rare',
    tags: ['chemistry'],
    desc: 'Oil Pumpの採取量が2倍になる',
    apply(gs) { gs.upgrades.pumpYield = (gs.upgrades.pumpYield || 1) * 2; }
  },
  {
    id: 'distill_yield', name: '精密蒸留', icon: '🏭', rarity: 'rare',
    tags: ['chemistry'],
    desc: '蒸留塔の全出力が50%増加する',
    onlyIf: _gs => EQ_DEF.distillation.unlocked && !_gs.upgrades.distillYield,
    apply(gs) { gs.upgrades.distillYield = true; }
  },

  // ── Behavioral: Chemistry ──────────────────────────────
  {
    id: 'chem_save', name: '省エネ化学', icon: '💡', rarity: 'epic',
    tags: ['chemistry'],
    desc: '化学プラントの各レシピで消費するリソースが1ずつ減少する（最低1）',
    onlyIf: gs => !gs.upgrades.chemSave && EQ_DEF.chem_plant.unlocked,
    apply(gs) { gs.upgrades.chemSave = true; }
  },

  // ── Combat ─────────────────────────────────────────────
  {
    id: 'turret_dmg', name: '徹甲弾', icon: '💥', rarity: 'rare',
    tags: ['combat'],
    desc: 'タレット・レーザーのダメージが2倍になる',
    apply(gs) { gs.upgrades.turretDmgMult = (gs.upgrades.turretDmgMult || 1) * 2; }
  },
  {
    id: 'turret_fire_rate', name: '連射装置', icon: '🔫', rarity: 'rare',
    tags: ['combat'],
    desc: 'タレットの発射速度が2倍になる',
    apply(gs) { gs.upgrades.turretFireRate = (gs.upgrades.turretFireRate || 1) * 2; }
  },
  {
    id: 'turret_range', name: '長距離砲', icon: '🎯', rarity: 'common',
    tags: ['combat'],
    desc: 'タレットの射程が1.5倍になる',
    apply(gs) { gs.upgrades.turretRange = (gs.upgrades.turretRange || 4) * 1.5; }
  },
  {
    id: 'chain_lightning', name: 'チェーンライトニング', icon: '⚡', rarity: 'epic',
    tags: ['combat'],
    desc: 'タレットが対象の周囲の敵1体にも連鎖攻撃する',
    onlyIf: gs => !gs.upgrades.chainLightning,
    apply(gs) { gs.upgrades.chainLightning = true; }
  },
  {
    id: 'unlock_laser', name: '設計図：レーザー砲', icon: '🔴', rarity: 'epic',
    tags: ['combat'],
    desc: '高威力レーザー砲台が建設可能になる。潤滑油でクールダウン半減。',
    onlyIf: _gs => !EQ_DEF.laser.unlocked,
    apply() { EQ_DEF.laser.unlocked = true; }
  },
  {
    id: 'explosive_shells', name: '爆発弾', icon: '💣', rarity: 'epic',
    tags: ['combat'],
    desc: 'タレットが爆薬を消費して範囲ダメージを追加する',
    onlyIf: gs => !gs.upgrades.explosiveShells,
    apply(gs) { gs.upgrades.explosiveShells = true; }
  },

  // ── Behavioral: Combat ────────────────────────────────
  {
    id: 'overcharge', name: '過充電システム', icon: '⚡', rarity: 'rare',
    tags: ['combat'],
    desc: 'タレットが10%の確率で二連射する',
    onlyIf: gs => !gs.upgrades.overcharge,
    apply(gs) { gs.upgrades.overcharge = true; }
  },

  // ── Utility ────────────────────────────────────────────
  {
    id: 'core_heal', name: '緊急修復', icon: '🛡', rarity: 'common',
    tags: ['utility'],
    desc: 'ファクトリーコアを50HP回復する',
    apply(gs) { gs.coreHp = Math.min(gs.coreMaxHp, gs.coreHp + 50); }
  },
  {
    id: 'core_max_hp', name: '装甲強化', icon: '🏰', rarity: 'rare',
    tags: ['utility'],
    desc: 'コアの最大HPが150増加する',
    apply(gs) { gs.coreMaxHp += 150; gs.coreHp += 150; }
  },
  {
    id: 'free_wall', name: '即席防衛壁', icon: '🧱', rarity: 'common',
    tags: ['utility', 'combat'],
    desc: 'コア周辺に壁を3枚無料で設置する',
    apply(gs) {
      // Place 3 walls on the east side of the 3×3 core block
      const positions = [
        [C.CORE_X + 3, C.CORE_Y],
        [C.CORE_X + 3, C.CORE_Y + 1],
        [C.CORE_X + 3, C.CORE_Y + 2],
      ];
      positions.forEach(([x, y]) => {
        if (inBounds(x, y) && !gs.map.grid[y][x].equipment && gs.map.grid[y][x].terrain === C.EMPTY) {
          gs.map.grid[y][x].equipment = makeEquipment(C.EQ.WALL);
        }
      });
      gs.flowFieldDirty = true;
    }
  },
];

// ── Upgrade pool weighting by current factory build ────────
function getPlayerStrategy(gs) {
  let chem = 0, combat = 0, prod = 0;
  for (let y = 0; y < C.ROWS; y++) {
    for (let x = 0; x < C.COLS; x++) {
      const eq = gs.map.grid[y][x].equipment;
      if (!eq) continue;
      if ([C.EQ.TURRET, C.EQ.LASER, C.EQ.WALL].includes(eq.type)) combat++;
      if ([C.EQ.CHEM_PLANT, C.EQ.DISTILLATION, C.EQ.ELECTROLYZER, C.EQ.OIL_PUMP].includes(eq.type)) chem++;
      if ([C.EQ.MINER, C.EQ.FURNACE, C.EQ.ASSEMBLER, C.EQ.ADV_ASSEMBLER, C.EQ.COKE_OVEN].includes(eq.type)) prod++;
    }
  }
  const total = Math.max(1, chem + combat + prod);
  return { chem: chem/total, combat: combat/total, prod: prod/total };
}

function getUpgradeChoices(gs, count = 3, forceRarity = null) {
  const strategy  = getPlayerStrategy(gs);
  const available = UPGRADE_POOL.filter(u => !u.onlyIf || u.onlyIf(gs));

  if (forceRarity === 'epic') {
    // Only epic upgrades
    const epics = available.filter(u => u.rarity === 'epic');
    if (epics.length >= count) return shuffled(epics).slice(0, count);
  }
  if (forceRarity === 'rare') {
    const rares = available.filter(u => u.rarity !== 'common');
    if (rares.length >= count) return shuffled(rares).slice(0, count);
  }
  if (forceRarity === 'two_epics') {
    const epics  = shuffled(available.filter(u => u.rarity === 'epic')).slice(0, 2);
    return epics.length >= 2 ? epics : getUpgradeChoices(gs, count);
  }

  // Build weighted pool, boosted by player strategy
  const weighted = [];
  for (const u of available) {
    let w = u.rarity === 'common' ? 6 : u.rarity === 'rare' ? 3 : 1;
    // Boost upgrades matching player's dominant build
    if (u.tags?.includes('chemistry')  && strategy.chem   > 0.3) w = Math.ceil(w * 1.8);
    if (u.tags?.includes('combat')     && strategy.combat > 0.3) w = Math.ceil(w * 1.8);
    if (u.tags?.includes('production') && strategy.prod   > 0.3) w = Math.ceil(w * 1.5);
    for (let i = 0; i < w; i++) weighted.push(u);
  }

  const chosen = [], seen = new Set();
  let tries = 0;
  while (chosen.length < count && tries < 300) {
    tries++;
    const u = weighted[Math.floor(Math.random() * weighted.length)];
    if (u && !seen.has(u.id)) { chosen.push(u); seen.add(u.id); }
  }
  return chosen;
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

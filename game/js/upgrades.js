// ──────────────────────────────────────────────────────────
//  Roguelike upgrade pool
//  Rarity weights: common=6, rare=3, epic=1
// ──────────────────────────────────────────────────────────

const UPGRADE_POOL = [

  // ── Solid Production ────────────────────────────────────
  {
    id: 'miner_speed', name: 'オーバークロック採掘', icon: '⛏', rarity: 'common',
    desc: 'Minerの採掘速度が50%向上',
    apply(gs) { gs.upgrades.minerSpeed = Math.floor((gs.upgrades.minerSpeed || 120) * 0.67); }
  },
  {
    id: 'miner_yield', name: '大量採掘', icon: '💎', rarity: 'rare',
    desc: '採掘量が2倍になる',
    apply(gs) { gs.upgrades.minerYield = (gs.upgrades.minerYield || 1) * 2; }
  },
  {
    id: 'conveyor_speed', name: '高速コンベア', icon: '➡', rarity: 'common',
    desc: 'Conveyorの搬送速度が2倍',
    apply(gs) { gs.upgrades.conveyorSpeed = Math.floor((gs.upgrades.conveyorSpeed || 60) * 0.5); }
  },
  {
    id: 'furnace_speed', name: '炉の改良', icon: '🔥', rarity: 'common',
    desc: '製錬速度が40%向上',
    apply(gs) { gs.upgrades.furnaceSpeed = Math.floor((gs.upgrades.furnaceSpeed || 180) * 0.6); }
  },
  {
    id: 'furnace_yield', name: '精錬マスター', icon: '🔶', rarity: 'rare',
    desc: '炉の出力が2倍',
    apply(gs) { gs.upgrades.furnaceYield = (gs.upgrades.furnaceYield || 1) * 2; }
  },
  {
    id: 'assembler_speed', name: 'ロボット組立', icon: '🤖', rarity: 'common',
    desc: '組立速度が50%向上',
    apply(gs) { gs.upgrades.assemblerSpeed = Math.floor((gs.upgrades.assemblerSpeed || 300) * 0.5); }
  },
  {
    id: 'assembler_yield', name: '量産ライン', icon: '📦', rarity: 'rare',
    desc: '組立出力が2倍',
    apply(gs) { gs.upgrades.assemblerYield = (gs.upgrades.assemblerYield || 1) * 2; }
  },

  // ── Chemistry Unlocks ────────────────────────────────────
  {
    id: 'unlock_distillation', name: '設計図：蒸留塔', icon: '🏭', rarity: 'rare',
    desc: '蒸留塔が建設可能に。原油を石油ガス・軽油・重油に分留する。',
    onlyIf(gs) { return !EQ_DEF.distillation.unlocked; },
    apply(_gs) { EQ_DEF.distillation.unlocked = true; }
  },
  {
    id: 'unlock_chem_plant', name: '設計図：化学プラント', icon: '⚗', rarity: 'rare',
    desc: '化学プラントが建設可能に。6種の化学レシピを実行できる。',
    onlyIf(gs) { return !EQ_DEF.chem_plant.unlocked; },
    apply(_gs) { EQ_DEF.chem_plant.unlocked = true; }
  },
  {
    id: 'unlock_electrolyzer', name: '設計図：電解槽', icon: '⚡', rarity: 'rare',
    desc: '電解槽が建設可能に。水→水素+酸素。',
    onlyIf(_gs) { return !EQ_DEF.electrolyzer.unlocked; },
    apply(_gs) { EQ_DEF.electrolyzer.unlocked = true; }
  },
  {
    id: 'unlock_adv_assembler', name: '設計図：高度組立機', icon: '🤖', rarity: 'epic',
    desc: '高度組立機が建設可能に。高度回路基板・潤滑ギアを生産できる。',
    onlyIf(_gs) { return !EQ_DEF.adv_assembler.unlocked; },
    apply(_gs) { EQ_DEF.adv_assembler.unlocked = true; }
  },
  {
    id: 'unlock_generator', name: '設計図：発電機', icon: '🔌', rarity: 'rare',
    desc: '発電機が建設可能に。コークスを消費して電力を供給する。',
    onlyIf(_gs) { return !EQ_DEF.generator.unlocked; },
    apply(_gs) { EQ_DEF.generator.unlocked = true; }
  },

  // ── Chemistry Efficiency ─────────────────────────────────
  {
    id: 'chem_speed', name: '触媒添加', icon: '🧪', rarity: 'rare',
    desc: '化学プラント・電解槽の処理速度が40%向上',
    apply(gs) { gs.upgrades.chemSpeed = Math.floor((gs.upgrades.chemSpeed || 240) * 0.6); }
  },
  {
    id: 'chem_yield', name: '収率改善', icon: '⚗', rarity: 'epic',
    desc: '化学プラントの出力が2倍',
    apply(gs) { gs.upgrades.chemYield = (gs.upgrades.chemYield || 1) * 2; }
  },
  {
    id: 'pump_speed', name: 'ポンプ強化', icon: '🛢', rarity: 'common',
    desc: 'Oil Pumpの抽出速度が50%向上',
    apply(gs) { gs.upgrades.pumpSpeed = Math.floor((gs.upgrades.pumpSpeed || 90) * 0.5); }
  },
  {
    id: 'pump_yield', name: '高圧ポンプ', icon: '🔵', rarity: 'rare',
    desc: 'Oil Pumpの採取量が2倍',
    apply(gs) { gs.upgrades.pumpYield = (gs.upgrades.pumpYield || 1) * 2; }
  },
  {
    id: 'distill_yield', name: '精密蒸留', icon: '🏭', rarity: 'rare',
    desc: '蒸留塔の各出力が50%増加',
    onlyIf(_gs) { return EQ_DEF.distillation.unlocked; },
    apply(gs) { gs.upgrades.distillYield = true; }
  },

  // ── Defense ──────────────────────────────────────────────
  {
    id: 'turret_dmg', name: '徹甲弾', icon: '💥', rarity: 'rare',
    desc: 'タレット・レーザーのダメージが2倍',
    apply(gs) { gs.upgrades.turretDmgMult = (gs.upgrades.turretDmgMult || 1) * 2; }
  },
  {
    id: 'turret_fire_rate', name: '連射装置', icon: '🔫', rarity: 'rare',
    desc: 'タレットの発射速度が2倍',
    apply(gs) { gs.upgrades.turretFireRate = (gs.upgrades.turretFireRate || 1) * 2; }
  },
  {
    id: 'turret_range', name: '長距離砲', icon: '🎯', rarity: 'common',
    desc: 'タレット射程が1.5倍',
    apply(gs) { gs.upgrades.turretRange = (gs.upgrades.turretRange || 4) * 1.5; }
  },
  {
    id: 'chain_lightning', name: 'チェーンライトニング', icon: '⚡', rarity: 'epic',
    desc: 'タレットが近くの敵にも連鎖攻撃',
    onlyIf(gs) { return !gs.upgrades.chainLightning; },
    apply(gs) { gs.upgrades.chainLightning = true; }
  },
  {
    id: 'unlock_laser', name: '設計図：レーザー砲', icon: '🔴', rarity: 'epic',
    desc: '高威力レーザー砲台が建設可能に。潤滑油で冷却速度向上。',
    onlyIf(_gs) { return !EQ_DEF.laser.unlocked; },
    apply(_gs) { EQ_DEF.laser.unlocked = true; }
  },
  {
    id: 'explosive_shells', name: '爆発弾', icon: '💣', rarity: 'epic',
    desc: 'タレットが爆薬を消費して範囲ダメージを追加',
    onlyIf(gs) { return !gs.upgrades.explosiveShells; },
    apply(gs) { gs.upgrades.explosiveShells = true; }
  },

  // ── Utility ──────────────────────────────────────────────
  {
    id: 'core_heal', name: '緊急修復', icon: '🛡', rarity: 'common',
    desc: 'ファクトリーコアを50HP回復',
    apply(gs) { gs.coreHp = Math.min(gs.coreMaxHp, gs.coreHp + 50); }
  },
  {
    id: 'core_max_hp', name: '装甲強化', icon: '🏰', rarity: 'rare',
    desc: 'コアの最大HPが150増加',
    apply(gs) { gs.coreMaxHp += 150; gs.coreHp += 150; }
  },
  {
    id: 'free_wall', name: '即席防衛壁', icon: '🧱', rarity: 'common',
    desc: 'コア周辺に壁を3枚設置',
    apply(gs) {
      const cx = gs.map.coreX, cy = gs.map.coreY;
      [[cx+1,cy-1],[cx+1,cy],[cx+1,cy+1]].forEach(([x,y]) => {
        if (inBounds(x,y) && !gs.map.grid[y][x].equipment && gs.map.grid[y][x].terrain === C.EMPTY) {
          const w = makeEquipment(C.EQ.WALL);
          w.type = C.EQ.WALL;
          gs.map.grid[y][x].equipment = w;
        }
      });
    }
  },
];

function getUpgradeChoices(gs, count = 3) {
  const available = UPGRADE_POOL.filter(u => !u.onlyIf || u.onlyIf(gs));

  const weighted = [];
  for (const u of available) {
    const w = u.rarity === 'common' ? 6 : u.rarity === 'rare' ? 3 : 1;
    for (let i = 0; i < w; i++) weighted.push(u);
  }

  const chosen = [], seen = new Set();
  let tries = 0;
  while (chosen.length < count && tries < 200) {
    tries++;
    const u = weighted[Math.floor(Math.random() * weighted.length)];
    if (u && !seen.has(u.id)) { chosen.push(u); seen.add(u.id); }
  }
  return chosen;
}

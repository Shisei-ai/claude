const UPGRADE_POOL = [
  {
    id: 'miner_speed',
    name: 'オーバークロック採掘',
    icon: '⛏',
    desc: '採掘速度が50%向上する',
    rarity: 'common',
    apply(gs) { gs.upgrades.minerSpeed = (gs.upgrades.minerSpeed || 120) * 0.67; }
  },
  {
    id: 'miner_yield',
    name: '大量採掘',
    icon: '💎',
    desc: '採掘量が2倍になる',
    rarity: 'rare',
    apply(gs) { gs.upgrades.minerYield = (gs.upgrades.minerYield || 1) * 2; }
  },
  {
    id: 'conveyor_speed',
    name: '高速コンベア',
    icon: '➡',
    desc: 'コンベア速度が2倍になる',
    rarity: 'common',
    apply(gs) { gs.upgrades.conveyorSpeed = (gs.upgrades.conveyorSpeed || 60) * 0.5; }
  },
  {
    id: 'furnace_speed',
    name: '炉の改良',
    icon: '🔥',
    desc: '製錬速度が40%向上',
    rarity: 'common',
    apply(gs) { gs.upgrades.furnaceSpeed = (gs.upgrades.furnaceSpeed || 180) * 0.6; }
  },
  {
    id: 'furnace_yield',
    name: '精錬マスター',
    icon: '⚗',
    desc: '炉の出力が2倍になる',
    rarity: 'rare',
    apply(gs) { gs.upgrades.furnaceYield = (gs.upgrades.furnaceYield || 1) * 2; }
  },
  {
    id: 'assembler_speed',
    name: 'ロボット組立',
    icon: '🤖',
    desc: '組立速度が50%向上',
    rarity: 'common',
    apply(gs) { gs.upgrades.assemblerSpeed = (gs.upgrades.assemblerSpeed || 300) * 0.5; }
  },
  {
    id: 'assembler_yield',
    name: '量産ライン',
    icon: '📦',
    desc: '組立の出力が2倍になる',
    rarity: 'rare',
    apply(gs) { gs.upgrades.assemblerYield = (gs.upgrades.assemblerYield || 1) * 2; }
  },
  {
    id: 'turret_dmg',
    name: '徹甲弾',
    icon: '💥',
    desc: 'タレットのダメージが2倍',
    rarity: 'rare',
    apply(gs) { gs.upgrades.turretDmgMult = (gs.upgrades.turretDmgMult || 1) * 2; }
  },
  {
    id: 'turret_fire_rate',
    name: '連射装置',
    icon: '🔫',
    desc: 'タレットの発射速度が2倍',
    rarity: 'rare',
    apply(gs) { gs.upgrades.turretFireRate = (gs.upgrades.turretFireRate || 1) * 2; }
  },
  {
    id: 'turret_range',
    name: '長距離砲',
    icon: '🎯',
    desc: 'タレットの射程が1.5倍',
    rarity: 'common',
    apply(gs) { gs.upgrades.turretRange = (gs.upgrades.turretRange || 4) * 1.5; }
  },
  {
    id: 'chain_lightning',
    name: 'チェーンライトニング',
    icon: '⚡',
    desc: 'タレットが追加で近くの敵1体を攻撃',
    rarity: 'epic',
    apply(gs) { gs.upgrades.chainLightning = true; }
  },
  {
    id: 'unlock_laser',
    name: '設計図：レーザー砲',
    icon: '🔴',
    desc: 'レーザー砲台を建設可能になる',
    rarity: 'epic',
    apply(gs) { EQ_DEF.laser.unlocked = true; }
  },
  {
    id: 'core_heal',
    name: '緊急修復',
    icon: '🛡',
    desc: 'ファクトリーコアを50HP回復',
    rarity: 'common',
    apply(gs) { gs.coreHp = Math.min(gs.coreMaxHp, gs.coreHp + 50); }
  },
  {
    id: 'core_max_hp',
    name: '装甲強化',
    icon: '🏰',
    desc: 'コアの最大HPが100増加',
    rarity: 'rare',
    apply(gs) { gs.coreMaxHp += 100; gs.coreHp += 100; }
  },
  {
    id: 'free_wall',
    name: '即席防衛壁',
    icon: '🧱',
    desc: 'コアの周囲に壁を3枚設置',
    rarity: 'common',
    apply(gs) {
      const cx = gs.map.coreX, cy = gs.map.coreY;
      [[cx+1,cy-1],[cx+1,cy],[cx+1,cy+1]].forEach(([x,y]) => {
        if (inBounds(x,y) && !gs.map.grid[y][x].equipment && gs.map.grid[y][x].terrain === C.EMPTY) {
          gs.map.grid[y][x].equipment = makeEquipment(C.EQ.WALL);
          gs.map.grid[y][x].equipment.type = C.EQ.WALL;
        }
      });
    }
  },
];

function getUpgradeChoices(gs, count = 3) {
  const available = UPGRADE_POOL.filter(u => {
    if (u.id === 'unlock_laser' && EQ_DEF.laser.unlocked) return false;
    if (u.id === 'chain_lightning' && gs.upgrades.chainLightning) return false;
    return true;
  });

  // Weighted by rarity
  const weighted = [];
  for (const u of available) {
    const w = u.rarity === 'common' ? 6 : u.rarity === 'rare' ? 3 : 1;
    for (let i = 0; i < w; i++) weighted.push(u);
  }

  const chosen = [];
  const seen = new Set();
  let tries = 0;
  while (chosen.length < count && tries < 100) {
    tries++;
    const u = weighted[Math.floor(Math.random() * weighted.length)];
    if (!seen.has(u.id)) { chosen.push(u); seen.add(u.id); }
  }
  return chosen;
}

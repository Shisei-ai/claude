// Equipment definitions
const EQ_DEF = {
  miner: {
    name: 'Miner', icon: '⛏',
    desc: '鉱石ノード上に設置。資源を採掘してコンベアに送る。',
    buildCost: {},
    unlocked: true,
    color: '#445566',
    tickRate: 120, // frames per operation
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.timer = Math.floor(gs.upgrades.minerSpeed || 120);
      const t = cell.terrain;
      let res = null;
      if (t === C.IRON_ORE)   res = C.RES.IRON_ORE;
      if (t === C.COPPER_ORE) res = C.RES.COPPER_ORE;
      if (t === C.COAL)       res = C.RES.COAL;
      if (!res) return;
      // Output in facing direction
      const dir = cell.equipment.dir;
      const dv = C.DIR_VEC[dir];
      const nx = cell.x + dv.x, ny = cell.y + dv.y;
      if (!inBounds(nx, ny)) return;
      const nc = gs.map.grid[ny][nx];
      if (nc.equipment && nc.equipment.type === C.EQ.CONVEYOR && !nc.item) {
        nc.item = res;
      } else if (!nc.item && nc.terrain !== C.CORE) {
        // Buffer to global storage directly if no conveyor
        gs.resources[res] = (gs.resources[res] || 0) + (gs.upgrades.minerYield || 1);
      }
    }
  },

  conveyor: {
    name: 'Conveyor', icon: '➡',
    desc: 'アイテムを方向に沿って隣のセルへ運ぶ。',
    buildCost: {},
    unlocked: true,
    color: '#334455',
    tickRate: 60,
    onTick(cell, gs) {
      if (!cell.item) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.timer = Math.floor(gs.upgrades.conveyorSpeed || 60);
      const dir = cell.equipment.dir;
      const dv = C.DIR_VEC[dir];
      const nx = cell.x + dv.x, ny = cell.y + dv.y;
      if (!inBounds(nx, ny)) return;
      const nc = gs.map.grid[ny][nx];
      if (nc.terrain === C.CORE) {
        // Deliver to storage
        gs.resources[cell.item] = (gs.resources[cell.item] || 0) + 1;
        cell.item = null;
        return;
      }
      if (nc.equipment) {
        const t = nc.equipment.type;
        if (t === C.EQ.CONVEYOR && !nc.item) {
          nc.item = cell.item;
          cell.item = null;
        } else if ((t === C.EQ.FURNACE || t === C.EQ.ASSEMBLER) && nc.equipment.canAccept(cell.item, nc, gs)) {
          nc.equipment.accept(cell.item, nc, gs);
          cell.item = null;
        }
      }
    }
  },

  furnace: {
    name: 'Furnace', icon: '🔥',
    desc: '鉄鉱石→鉄板、銅鉱石→銅板に製錬する。',
    buildCost: {},
    unlocked: true,
    color: '#553322',
    tickRate: 180,
    recipes: {
      [C.RES.IRON_ORE]:   C.RES.IRON_PLATE,
      [C.RES.COPPER_ORE]: C.RES.COPPER_PLATE,
    },
    canAccept(item, cell, gs) {
      return this.recipes[item] !== undefined && !cell.equipment.inputItem;
    },
    accept(item, cell, gs) {
      cell.equipment.inputItem = item;
      cell.equipment.timer = Math.floor(gs.upgrades.furnaceSpeed || 180);
    },
    onTick(cell, gs) {
      if (!cell.equipment.inputItem) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const out = EQ_DEF.furnace.recipes[cell.equipment.inputItem];
      cell.equipment.inputItem = null;
      // Output to adjacent conveyor facing away, or drop to storage
      const outputDir = cell.equipment.dir;
      const dv = C.DIR_VEC[outputDir];
      const nx = cell.x + dv.x, ny = cell.y + dv.y;
      const count = gs.upgrades.furnaceYield || 1;
      if (inBounds(nx, ny)) {
        const nc = gs.map.grid[ny][nx];
        if (nc.equipment && nc.equipment.type === C.EQ.CONVEYOR && !nc.item) {
          nc.item = out;
          if (count > 1) gs.resources[out] = (gs.resources[out] || 0) + (count - 1);
          return;
        }
      }
      gs.resources[out] = (gs.resources[out] || 0) + count;
    }
  },

  assembler: {
    name: 'Assembler', icon: '⚙',
    desc: '鉄板+銅板→回路基板を生産する。',
    buildCost: {},
    unlocked: true,
    color: '#224433',
    tickRate: 300,
    recipe: { inputs: { [C.RES.IRON_PLATE]: 1, [C.RES.COPPER_PLATE]: 1 }, output: C.RES.CIRCUIT, count: 1 },
    canAccept(item, cell, gs) {
      const inv = cell.equipment.inventory;
      const need = EQ_DEF.assembler.recipe.inputs[item];
      return need !== undefined && (inv[item] || 0) < need;
    },
    accept(item, cell, gs) {
      const inv = cell.equipment.inventory;
      inv[item] = (inv[item] || 0) + 1;
      // Check if we have all inputs
      const recipe = EQ_DEF.assembler.recipe;
      const ready = Object.keys(recipe.inputs).every(k => (inv[k] || 0) >= recipe.inputs[k]);
      if (ready && !cell.equipment.crafting) {
        for (const k in recipe.inputs) inv[k] -= recipe.inputs[k];
        cell.equipment.crafting = true;
        cell.equipment.timer = Math.floor(gs.upgrades.assemblerSpeed || 300);
      }
    },
    onTick(cell, gs) {
      if (!cell.equipment.crafting) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.crafting = false;
      const out = EQ_DEF.assembler.recipe.output;
      const count = (gs.upgrades.assemblerYield || 1);
      const outputDir = cell.equipment.dir;
      const dv = C.DIR_VEC[outputDir];
      const nx = cell.x + dv.x, ny = cell.y + dv.y;
      if (inBounds(nx, ny)) {
        const nc = gs.map.grid[ny][nx];
        if (nc.equipment && nc.equipment.type === C.EQ.CONVEYOR && !nc.item) {
          nc.item = out;
          if (count > 1) gs.resources[out] = (gs.resources[out] || 0) + (count - 1);
          return;
        }
      }
      gs.resources[out] = (gs.resources[out] || 0) + count;
    }
  },

  turret: {
    name: 'Turret', icon: '🔫',
    desc: '射程内の敵を自動で攻撃する。',
    buildCost: {},
    unlocked: true,
    color: '#334422',
    tickRate: 60,
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const range = (gs.upgrades.turretRange || 4) * C.CELL;
      const dmg = gs.upgrades.turretDmg || 15;
      const cx = cell.x * C.CELL + C.CELL / 2;
      const cy = cell.y * C.CELL + C.CELL / 2;
      let best = null, bestDist = Infinity;
      for (const e of gs.enemies) {
        const dx = e.x - cx, dy = e.y - cy;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < range && d < bestDist) { best = e; bestDist = d; }
      }
      if (best) {
        best.hp -= dmg * (gs.upgrades.turretDmgMult || 1);
        cell.equipment.timer = Math.floor(60 / (gs.upgrades.turretFireRate || 1));
        gs.projectiles.push({ x: cx, y: cy, tx: best.x, ty: best.y, life: 8 });
        if (gs.upgrades.chainLightning) {
          // Hit 1 additional enemy
          for (const e2 of gs.enemies) {
            if (e2 !== best) {
              const dx2 = e2.x - best.x, dy2 = e2.y - best.y;
              if (Math.sqrt(dx2*dx2+dy2*dy2) < 80) {
                e2.hp -= dmg * 0.5;
                gs.projectiles.push({ x: best.x, y: best.y, tx: e2.x, ty: e2.y, life: 6 });
                break;
              }
            }
          }
        }
      }
    }
  },

  wall: {
    name: 'Wall', icon: '🧱',
    desc: '敵の進路を塞ぐ壁。HPあり。',
    buildCost: {},
    unlocked: true,
    color: '#443322',
    hp: 200,
    onTick(cell, gs) { /* walls don't tick */ }
  },

  generator: {
    name: 'Generator', icon: '⚡',
    desc: 'パワーを供給。（現在は装飾のみ）',
    buildCost: {},
    unlocked: false,
    color: '#225544',
    onTick(cell, gs) {}
  },

  laser: {
    name: 'Laser', icon: '🔴',
    desc: '高威力レーザー砲台。射程が長い。',
    buildCost: {},
    unlocked: false,
    color: '#442233',
    tickRate: 120,
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const range = (gs.upgrades.turretRange || 4) * C.CELL * 1.8;
      const dmg = (gs.upgrades.turretDmg || 15) * 3;
      const cx = cell.x * C.CELL + C.CELL / 2;
      const cy = cell.y * C.CELL + C.CELL / 2;
      let best = null, bestDist = Infinity;
      for (const e of gs.enemies) {
        const dx = e.x - cx, dy = e.y - cy;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < range && d < bestDist) { best = e; bestDist = d; }
      }
      if (best) {
        best.hp -= dmg;
        cell.equipment.timer = 120;
        gs.projectiles.push({ x: cx, y: cy, tx: best.x, ty: best.y, life: 12, laser: true });
      }
    }
  }
};

function makeEquipment(type, dir = C.DIR.RIGHT) {
  const base = { type, dir, timer: 0 };
  if (type === C.EQ.ASSEMBLER) base.inventory = {};
  if (type === C.EQ.WALL) base.hp = EQ_DEF.wall.hp;
  return base;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < C.COLS && y < C.ROWS;
}

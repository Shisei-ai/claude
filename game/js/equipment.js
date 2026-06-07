// ─────────────────────────────────────────────────────────
//  Equipment definitions
//  Design rule: chemistry equipment reads/writes gs.resources
//  (global storage). Solid-tier equipment uses the conveyor
//  item transport system and falls back to gs.resources.
// ─────────────────────────────────────────────────────────

const EQ_DEF = {

  // ── Tier 1 : Solid Production ─────────────────────────

  miner: {
    name: 'Miner', icon: '⛏',
    desc: '鉱石・石炭・硫黄ノード上に設置。隣接コンベアがなければ直接ストレージへ。',
    color: '#445566', unlocked: true, tickRate: 120,
    validTerrain: [C.IRON_ORE, C.COPPER_ORE, C.COAL, C.SULFUR_DEP],
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.timer = Math.floor(gs.upgrades.minerSpeed || 120);
      const t = cell.terrain;
      const resMap = {
        [C.IRON_ORE]:   C.RES.IRON_ORE,
        [C.COPPER_ORE]: C.RES.COPPER_ORE,
        [C.COAL]:       C.RES.COAL,
        [C.SULFUR_DEP]: C.RES.SULFUR,
      };
      const res = resMap[t];
      if (!res) return;
      const yield_ = gs.upgrades.minerYield || 1;
      const dir = cell.equipment.dir;
      const dv = C.DIR_VEC[dir];
      const nx = cell.x + dv.x, ny = cell.y + dv.y;
      if (inBounds(nx, ny)) {
        const nc = gs.map.grid[ny][nx];
        if (nc.equipment?.type === C.EQ.CONVEYOR && !nc.item) {
          nc.item = res;
          if (yield_ > 1) addRes(gs, res, yield_ - 1);
          return;
        }
      }
      addRes(gs, res, yield_);
    }
  },

  conveyor: {
    name: 'Conveyor', icon: '➡',
    desc: 'アイテムを向いた方向の隣セルへ搬送する。',
    color: '#334455', unlocked: true, tickRate: 60,
    onTick(cell, gs) {
      if (!cell.item) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.timer = Math.floor(gs.upgrades.conveyorSpeed || 60);
      const dv = C.DIR_VEC[cell.equipment.dir];
      const nx = cell.x + dv.x, ny = cell.y + dv.y;
      if (!inBounds(nx, ny)) return;
      const nc = gs.map.grid[ny][nx];
      if (nc.terrain === C.CORE) {
        addRes(gs, cell.item, 1);
        cell.item = null;
        return;
      }
      const nt = nc.equipment?.type;
      if (nt === C.EQ.CONVEYOR && !nc.item) {
        nc.item = cell.item; cell.item = null;
      } else if (nt === C.EQ.FURNACE || nt === C.EQ.ASSEMBLER) {
        const def = EQ_DEF[nt];
        if (def.canAccept(cell.item, nc, gs)) { def.accept(cell.item, nc, gs); cell.item = null; }
      }
    }
  },

  furnace: {
    name: 'Furnace', icon: '🔥',
    desc: '鉄鉱石→鉄板 / 銅鉱石→銅板 / コークス炉と組合せて高品質製錬も可。',
    color: '#553322', unlocked: true, tickRate: 180,
    recipes: {
      [C.RES.IRON_ORE]:   C.RES.IRON_PLATE,
      [C.RES.COPPER_ORE]: C.RES.COPPER_PLATE,
    },
    canAccept(item, cell, _gs) { return this.recipes[item] && !cell.equipment.inputItem; },
    accept(item, cell, gs) {
      cell.equipment.inputItem = item;
      cell.equipment.timer = Math.floor(gs.upgrades.furnaceSpeed || 180);
    },
    onTick(cell, gs) {
      if (!cell.equipment.inputItem) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const out = EQ_DEF.furnace.recipes[cell.equipment.inputItem];
      cell.equipment.inputItem = null;
      const count = gs.upgrades.furnaceYield || 1;
      if (!outputToConveyor(cell, out, gs)) addRes(gs, out, count);
      else if (count > 1) addRes(gs, out, count - 1);
    }
  },

  assembler: {
    name: 'Assembler', icon: '⚙',
    desc: '鉄板+銅板→回路基板。投入はコンベアで行う。',
    color: '#224433', unlocked: true, tickRate: 300,
    recipe: { inputs: { [C.RES.IRON_PLATE]: 1, [C.RES.COPPER_PLATE]: 1 }, output: C.RES.CIRCUIT },
    canAccept(item, cell, _gs) {
      const inv = cell.equipment.inventory;
      const need = EQ_DEF.assembler.recipe.inputs[item];
      return need !== undefined && (inv[item] || 0) < need;
    },
    accept(item, cell, gs) {
      const inv = cell.equipment.inventory;
      inv[item] = (inv[item] || 0) + 1;
      const r = EQ_DEF.assembler.recipe;
      const ready = Object.keys(r.inputs).every(k => (inv[k] || 0) >= r.inputs[k]);
      if (ready && !cell.equipment.crafting) {
        for (const k in r.inputs) inv[k] -= r.inputs[k];
        cell.equipment.crafting = true;
        cell.equipment.timer = Math.floor(gs.upgrades.assemblerSpeed || 300);
      }
    },
    onTick(cell, gs) {
      if (!cell.equipment.crafting) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.crafting = false;
      const out = EQ_DEF.assembler.recipe.output;
      const count = gs.upgrades.assemblerYield || 1;
      if (!outputToConveyor(cell, out, gs)) addRes(gs, out, count);
      else if (count > 1) addRes(gs, out, count - 1);
    }
  },

  // ── Defense ───────────────────────────────────────────

  turret: {
    name: 'Turret', icon: '🔫',
    desc: '射程内の敵を自動攻撃する。',
    color: '#334422', unlocked: true, tickRate: 60,
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const range = (gs.upgrades.turretRange || 4) * C.CELL;
      const dmg   = (gs.upgrades.turretDmg || 15) * (gs.upgrades.turretDmgMult || 1);
      const rate  = gs.upgrades.turretFireRate || 1;
      const cx = cell.x * C.CELL + C.CELL / 2;
      const cy = cell.y * C.CELL + C.CELL / 2;
      const best = nearestEnemy(cx, cy, range, gs);
      if (!best) return;
      best.hp -= dmg;
      cell.equipment.timer = Math.floor(60 / rate);
      gs.projectiles.push({ x: cx, y: cy, tx: best.x, ty: best.y, life: 8 });
      if (gs.upgrades.chainLightning) {
        for (const e2 of gs.enemies) {
          if (e2 !== best) {
            const d2 = dist(e2, best);
            if (d2 < 80) { e2.hp -= dmg * 0.5; gs.projectiles.push({ x: best.x, y: best.y, tx: e2.x, ty: e2.y, life: 6 }); break; }
          }
        }
      }
      // Explosive shells: splash damage
      if (gs.upgrades.explosiveShells && (gs.resources[C.RES.EXPLOSIVES] || 0) >= 1) {
        gs.resources[C.RES.EXPLOSIVES]--;
        for (const e2 of gs.enemies) {
          if (dist(e2, best) < 50) e2.hp -= dmg * 0.5;
        }
      }
    }
  },

  wall: {
    name: 'Wall', icon: '🧱',
    desc: '敵の進路を塞ぐ壁。HPあり。',
    color: '#443322', unlocked: true,
    hp: 200,
    onTick() {}
  },

  laser: {
    name: 'Laser', icon: '🔴',
    desc: '高威力レーザー砲。射程が長く貫通ダメージ。',
    color: '#442233', unlocked: false, tickRate: 120,
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const range = (gs.upgrades.turretRange || 4) * C.CELL * 2;
      const dmg   = (gs.upgrades.turretDmg || 15) * 3 * (gs.upgrades.turretDmgMult || 1);
      const cx = cell.x * C.CELL + C.CELL / 2;
      const cy = cell.y * C.CELL + C.CELL / 2;
      const best = nearestEnemy(cx, cy, range, gs);
      if (!best) return;
      best.hp -= dmg;
      // Lubricant boosts laser cooling
      const cooldown = (gs.resources[C.RES.LUBRICANT] || 0) >= 1 ? 60 : 120;
      if (cooldown === 60) gs.resources[C.RES.LUBRICANT]--;
      cell.equipment.timer = cooldown;
      gs.projectiles.push({ x: cx, y: cy, tx: best.x, ty: best.y, life: 12, laser: true });
    }
  },

  generator: {
    name: 'Generator', icon: '⚡',
    desc: 'コークスを消費して電力を供給。現在は電解槽・高度組立機の動作に必要。',
    color: '#225544', unlocked: false, tickRate: 300,
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      if ((gs.resources[C.RES.COKE] || 0) < 1) return;
      gs.resources[C.RES.COKE]--;
      gs.power = (gs.power || 0) + 10;
      cell.equipment.timer = 300;
    }
  },

  // ── Tier 2 : Chemistry ────────────────────────────────

  oil_pump: {
    name: 'Oil Pump', icon: '🛢',
    desc: '油田（OIL）に設置。原油をストレージへ継続的に抽出する。',
    color: '#222233', unlocked: true, tickRate: 90,
    validTerrain: [C.OIL_WELL],
    onTick(cell, gs) {
      if (cell.terrain !== C.OIL_WELL) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.timer = Math.floor(gs.upgrades.pumpSpeed || 90);
      addRes(gs, C.RES.CRUDE_OIL, gs.upgrades.pumpYield || 1);
    }
  },

  water_pump: {
    name: 'Water Pump', icon: '💧',
    desc: '周囲から水を収集。電解槽・化学プラントの水素源として使用。',
    color: '#1a2f44', unlocked: true, tickRate: 120,
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.timer = 120;
      addRes(gs, C.RES.WATER, 1);
    }
  },

  coke_oven: {
    name: 'Coke Oven', icon: '🟤',
    desc: '石炭 x2 → コークス x1。炉の高品質燃料・発電機の燃料になる。',
    color: '#332211', unlocked: true, tickRate: 180,
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      if ((gs.resources[C.RES.COAL] || 0) < 2) return;
      gs.resources[C.RES.COAL] -= 2;
      cell.equipment.timer = 180;
      addRes(gs, C.RES.COKE, 1);
    }
  },

  distillation: {
    name: 'Distillation', icon: '🏭',
    desc: '原油 x3 → 石油ガス x2 + 軽油 x2 + 重油 x1 に分留する。',
    color: '#334433', unlocked: false, tickRate: 200,
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      if ((gs.resources[C.RES.CRUDE_OIL] || 0) < 3) return;
      gs.resources[C.RES.CRUDE_OIL] -= 3;
      cell.equipment.timer = 200;
      addRes(gs, C.RES.PETRO_GAS,  gs.upgrades.distillYield ? 3 : 2);
      addRes(gs, C.RES.LIGHT_OIL,  gs.upgrades.distillYield ? 3 : 2);
      addRes(gs, C.RES.HEAVY_OIL,  gs.upgrades.distillYield ? 2 : 1);
    }
  },

  chem_plant: {
    name: 'Chem Plant', icon: '⚗',
    desc: '左クリックでレシピ切替。各種化学品を合成する。',
    color: '#1e3322', unlocked: false, tickRate: 240,

    // All inputs/outputs use gs.resources (liquid/gas pipeline model)
    recipes: [
      {
        id: 'plastic',
        name: 'プラスチック棒',
        icon: '🟡',
        inputs: { [C.RES.PETRO_GAS]: 3, [C.RES.COAL]: 2 },
        output: C.RES.PLASTIC, count: 2,
      },
      {
        id: 'lubricant',
        name: '潤滑油',
        icon: '🟠',
        inputs: { [C.RES.HEAVY_OIL]: 3 },
        output: C.RES.LUBRICANT, count: 4,
      },
      {
        id: 'sulfuric_acid',
        name: '硫酸',
        icon: '🟢',
        inputs: { [C.RES.SULFUR]: 2, [C.RES.WATER]: 3 },
        output: C.RES.SULFURIC_ACID, count: 3,
      },
      {
        id: 'refined_copper',
        name: '精錬銅',
        icon: '🔵',
        inputs: { [C.RES.COPPER_ORE]: 3, [C.RES.SULFURIC_ACID]: 2 },
        output: C.RES.REFINED_COPPER, count: 4,
      },
      {
        id: 'explosives',
        name: '爆薬',
        icon: '🔴',
        inputs: { [C.RES.COAL]: 3, [C.RES.SULFUR]: 2, [C.RES.LIGHT_OIL]: 2 },
        output: C.RES.EXPLOSIVES, count: 2,
      },
      {
        id: 'water_synth',
        name: '水（合成）',
        icon: '💙',
        inputs: { [C.RES.HYDROGEN]: 2, [C.RES.OXYGEN]: 1 },
        output: C.RES.WATER, count: 3,
      },
    ],

    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const idx = cell.equipment.recipeIdx || 0;
      const recipe = EQ_DEF[C.EQ.CHEM_PLANT].recipes[idx];
      // Check inputs
      for (const [res, amt] of Object.entries(recipe.inputs)) {
        if ((gs.resources[res] || 0) < amt) return;
      }
      // Consume
      for (const [res, amt] of Object.entries(recipe.inputs)) {
        gs.resources[res] -= amt;
      }
      const mult = gs.upgrades.chemYield || 1;
      addRes(gs, recipe.output, recipe.count * mult);
      cell.equipment.timer = Math.floor((gs.upgrades.chemSpeed || 240));
    }
  },

  electrolyzer: {
    name: 'Electrolyzer', icon: '⚡',
    desc: '水 x2 → 水素 x2 + 酸素 x1 に電気分解する。発電機が必要。',
    color: '#1a2244', unlocked: false, tickRate: 150,
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      if ((gs.resources[C.RES.WATER] || 0) < 2) return;
      gs.resources[C.RES.WATER] -= 2;
      cell.equipment.timer = 150;
      addRes(gs, C.RES.HYDROGEN, 2);
      addRes(gs, C.RES.OXYGEN,   1);
    }
  },

  adv_assembler: {
    name: 'Adv. Assembler', icon: '🤖',
    desc: 'ストレージから直接消費して高度品を生産する。左クリックでレシピ切替。',
    color: '#1a3322', unlocked: false, tickRate: 400,

    recipes: [
      {
        id: 'adv_circuit',
        name: '高度回路基板',
        icon: '💚',
        inputs: { [C.RES.CIRCUIT]: 2, [C.RES.PLASTIC]: 2, [C.RES.REFINED_COPPER]: 1 },
        output: C.RES.ADV_CIRCUIT, count: 1,
      },
      {
        id: 'lubri_gear',
        name: '潤滑ギア',
        icon: '⚙',
        inputs: { [C.RES.IRON_PLATE]: 3, [C.RES.LUBRICANT]: 1 },
        output: C.RES.CIRCUIT, count: 3,  // gives circuits as "precision part"
      },
      {
        id: 'explosive_shell',
        name: '爆発弾',
        icon: '💣',
        inputs: { [C.RES.EXPLOSIVES]: 2, [C.RES.IRON_PLATE]: 1 },
        output: C.RES.EXPLOSIVES, count: 3, // nets +1 with iron casing
      },
    ],

    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const idx = cell.equipment.recipeIdx || 0;
      const recipe = EQ_DEF[C.EQ.ADV_ASSEMBLER].recipes[idx];
      for (const [res, amt] of Object.entries(recipe.inputs)) {
        if ((gs.resources[res] || 0) < amt) return;
      }
      for (const [res, amt] of Object.entries(recipe.inputs)) {
        gs.resources[res] -= amt;
      }
      addRes(gs, recipe.output, recipe.count);
      cell.equipment.timer = Math.floor(gs.upgrades.assemblerSpeed || 400);
    }
  },
};

// ─── Helpers ──────────────────────────────────────────────

function addRes(gs, key, n) {
  gs.resources[key] = (gs.resources[key] || 0) + n;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < C.COLS && y < C.ROWS;
}

function outputToConveyor(cell, item, gs) {
  const dv = C.DIR_VEC[cell.equipment.dir];
  const nx = cell.x + dv.x, ny = cell.y + dv.y;
  if (!inBounds(nx, ny)) return false;
  const nc = gs.map.grid[ny][nx];
  if (nc.equipment?.type === C.EQ.CONVEYOR && !nc.item) {
    nc.item = item;
    return true;
  }
  return false;
}

function nearestEnemy(cx, cy, range, gs) {
  let best = null, bestDist = Infinity;
  for (const e of gs.enemies) {
    const d = dist({ x: e.x, y: e.y }, { x: cx, y: cy });
    if (d < range && d < bestDist) { best = e; bestDist = d; }
  }
  return best;
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function makeEquipment(type, dir = C.DIR.RIGHT) {
  const base = { type, dir, timer: 0 };
  if (type === C.EQ.ASSEMBLER) base.inventory = {};
  if (type === C.EQ.WALL) base.hp = EQ_DEF.wall.hp;
  if (type === C.EQ.CHEM_PLANT || type === C.EQ.ADV_ASSEMBLER) base.recipeIdx = 0;
  return base;
}

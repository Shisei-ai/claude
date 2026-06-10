// ─────────────────────────────────────────────────────────
//  Equipment definitions
//  - Chemistry equipment reads/writes gs.resources (global storage)
//  - Solid-tier equipment uses conveyor transport + storage fallback
//  - cost: {} = build cost (deducted from gs.resources on placement)
// ─────────────────────────────────────────────────────────

const RES_NAMES = {
  iron_ore: '鉄鉱石', copper_ore: '銅鉱石', coal: '石炭', sulfur: '硫黄',
  iron_plate: '鉄板', copper_plate: '銅板', coke: 'コークス', plastic: 'プラスチック',
  refined_copper: '精錬銅', explosives: '爆薬',
  circuit: '回路基板', adv_circuit: '高度回路基板',
  crude_oil: '原油', petro_gas: '石油ガス', light_oil: '軽油', heavy_oil: '重油',
  sulfuric_acid: '硫酸', lubricant: '潤滑油', water: '水', hydrogen: '水素', oxygen: '酸素',
};

const EQ_DEF = {

  // ── Tier 1 : Solid Production ─────────────────────────

  miner: {
    name: 'Miner', icon: '⛏', color: '#445566', unlocked: true, size: 1, place: 'mission',
    cost: {},
    desc: '【出撃先専用】鉱石・石炭・硫黄ノード上に設置。採掘物はコンベアへ、なければ直接倉庫へ。',
    validTerrain: [C.IRON_ORE, C.COPPER_ORE, C.COAL, C.SULFUR_DEP],
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.timer = Math.floor(gs.upgrades.minerSpeed || 120);
      const resMap = {
        [C.IRON_ORE]:   C.RES.IRON_ORE,
        [C.COPPER_ORE]: C.RES.COPPER_ORE,
        [C.COAL]:       C.RES.COAL,
        [C.SULFUR_DEP]: C.RES.SULFUR,
      };
      const res = resMap[cell.terrain];
      if (!res) return;
      let yield_ = gs.upgrades.minerYield || 1;
      // factory_soul gear: 25% chance to double yield
      if (hasGear(gs, 'factory_soul') && Math.random() < 0.25) yield_ *= 2;

      if (gs.upgrades.autoProtocol) {
        for (const dv of C.DIR_VEC) {
          const nx = cell.x + dv.x, ny = cell.y + dv.y;
          if (!inBounds(nx, ny)) continue;
          let nc = gs.map.grid[ny][nx];
          if (nc.equipment?.type === '_occ') nc = gs.map.grid[nc.equipment.rootY][nc.equipment.rootX];
          if (nc.equipment?.type === C.EQ.FURNACE && EQ_DEF.furnace.canAccept(res, nc, gs)) {
            EQ_DEF.furnace.accept(res, nc, gs);
            if (yield_ > 1) addRes(gs, res, yield_ - 1);
            return;
          }
        }
      }

      const dv = C.DIR_VEC[cell.equipment.dir];
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
    name: 'Conveyor', icon: '➡', color: '#334455', unlocked: true, size: 1,
    cost: {},
    desc: 'アイテムを向いた方向の隣セルへ搬送する。R で向きを変えること。',
    onTick(cell, gs) {
      if (!cell.item) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.timer = Math.floor(gs.upgrades.conveyorSpeed || 60);
      const dv = C.DIR_VEC[cell.equipment.dir];
      const nx = cell.x + dv.x, ny = cell.y + dv.y;
      if (!inBounds(nx, ny)) return;
      const nc = gs.map.grid[ny][nx];
      if (nc.terrain === C.CORE) { addRes(gs, cell.item, 1); cell.item = null; return; }
      let rc = nc;
      if (nc.equipment?.type === '_occ') rc = gs.map.grid[nc.equipment.rootY][nc.equipment.rootX];
      const nt = rc.equipment?.type;
      if (nt === C.EQ.CONVEYOR && !rc.item) {
        rc.item = cell.item; cell.item = null;
      } else if (nt && EQ_DEF[nt]?.canAccept) {
        if (EQ_DEF[nt].canAccept(cell.item, rc, gs)) { EQ_DEF[nt].accept(cell.item, rc, gs); cell.item = null; }
      }
    }
  },

  furnace: {
    name: 'Furnace', icon: '🔥', color: '#553322', unlocked: true, size: 2,
    cost: { iron_plate: 2 },
    desc: '鉄鉱石→鉄板 / 銅鉱石→銅板。コンベアで鉱石を投入。出力はコンベアへ。',
    recipes: {
      [C.RES.IRON_ORE]:   C.RES.IRON_PLATE,
      [C.RES.COPPER_ORE]: C.RES.COPPER_PLATE,
    },
    canAccept(item, cell, _gs) { return this.recipes[item] && !cell.equipment.inputItem; },
    accept(item, cell, gs) {
      cell.equipment.inputItem = item;
      // auto_smelter gear: 50% faster
      cell.equipment.timer = Math.floor((gs.upgrades.furnaceSpeed || 180) * (hasGear(gs, 'auto_smelter') ? 0.5 : 1));
    },
    onTick(cell, gs) {
      if (flushOutput(cell, gs)) return;   // back-pressure: stall until queue drains
      if (!cell.equipment.inputItem || cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const out = EQ_DEF.furnace.recipes[cell.equipment.inputItem];
      cell.equipment.inputItem = null;
      pushOutput(cell, out, gs.upgrades.furnaceYield || 1);
      flushOutput(cell, gs);
    }
  },

  assembler: {
    name: 'Assembler', icon: '⚙', color: '#224433', unlocked: false, size: 2,
    cost: { iron_plate: 4, copper_plate: 2 },
    desc: '鉄板+銅板→回路基板。コンベアで投入。出力はコンベアへ。【要研究: 組立工学】',
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
        cell.equipment.timer = Math.floor(gs.upgrades.assemblerSpeed || 240);
      }
    },
    onTick(cell, gs) {
      if (flushOutput(cell, gs)) return;
      if (!cell.equipment.crafting) {
        const r   = EQ_DEF.assembler.recipe;
        const inv = cell.equipment.inventory;
        if (Object.keys(r.inputs).every(k => (inv[k] || 0) >= r.inputs[k])) {
          for (const k in r.inputs) inv[k] -= r.inputs[k];
          cell.equipment.crafting = true;
          cell.equipment.timer = Math.floor(gs.upgrades.assemblerSpeed || 240);
        }
        if (!cell.equipment.crafting) return;
      }
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.crafting = false;
      const count = (gs.upgrades.assemblerYield || 1) + (gs.gearFlags?.craftsmanBonus || 0);
      pushOutput(cell, EQ_DEF.assembler.recipe.output, count);
      flushOutput(cell, gs);
    }
  },

  // ── Defense ───────────────────────────────────────────

  turret: {
    name: 'Turret', icon: '🔫', color: '#334422', unlocked: true, size: 2, place: 'mission',
    cost: { iron_plate: 4, copper_plate: 2 },
    desc: '【出撃先専用】射程内の最も近い敵を自動攻撃する。ミッション終了時にコストは全額還付。',
    onTick(cell, gs) {
      if (!gs._missionTick) return;
      if (gs.upgrades.wallRegen) {
        const maxHp = wallMaxHp(gs);
        const perim = [
          [cell.x-1,cell.y],[cell.x+2,cell.y],[cell.x-1,cell.y+1],[cell.x+2,cell.y+1],
          [cell.x,cell.y-1],[cell.x+1,cell.y-1],[cell.x,cell.y+2],[cell.x+1,cell.y+2],
        ];
        for (const [nx, ny] of perim) {
          if (!inBounds(nx, ny)) continue;
          const nc = gs.map.grid[ny][nx];
          if (nc.equipment?.type === C.EQ.WALL)
            nc.equipment.hp = Math.min(maxHp, nc.equipment.hp + 0.03);
        }
      }

      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const range  = gs.upgrades.infiniteRange ? 99999 : (gs.upgrades.turretRange || 4) * C.CELL;
      const dmg    = (gs.upgrades.turretDmg || 20) * (gs.upgrades.turretDmgMult || 1);
      const rate   = gs.upgrades.turretFireRate || 1;
      const cx     = (cell.x + 1) * C.CELL;
      const cy     = (cell.y + 1) * C.CELL;
      const best   = nearestEnemy(cx, cy, range, gs);
      if (!best) return;

      // black_powder gear: +50% damage to low HP enemies
      let actualDmg = dmg;
      if (hasGear(gs, 'black_powder') && best.hp < best.maxHp * 0.3) actualDmg *= 1.5;

      // Explosive shells
      if (gs.upgrades.explosiveShells) {
        const free = gs.upgrades.freeExplosives;
        if (free || (gs.resources[C.RES.EXPLOSIVES] || 0) >= 1) {
          if (!free) gs.resources[C.RES.EXPLOSIVES]--;
          for (const e of gs.enemies) {
            if (e !== best && dist(e, best) < 60) e.hp -= dmg * 0.6;
          }
        }
      }

      best.hp -= actualDmg;
      // rapid_fire gear reduces cooldown by 15 ticks
      const rapidBonus = gs.gearFlags?.rapidFireBonus || 0;
      cell.equipment.timer = Math.max(1, Math.floor(60 / rate) - rapidBonus);
      gs.projectiles.push({ x: cx, y: cy, tx: best.x, ty: best.y, life: 8 });

      const chainAll = gs.upgrades.globalChain;
      if (gs.upgrades.chainLightning) {
        const targets = chainAll ? gs.enemies.filter(e => e !== best) : [];
        if (!chainAll) {
          for (const e2 of gs.enemies) {
            if (e2 !== best && dist(e2, best) < 80) { targets.push(e2); break; }
          }
        }
        for (const e2 of targets) {
          e2.hp -= dmg * 0.5;
          gs.projectiles.push({ x: best.x, y: best.y, tx: e2.x, ty: e2.y, life: 5 });
        }
      }

      if (gs.upgrades.overcharge && Math.random() < 0.10) {
        const best2 = nearestEnemy(cx, cy, range, gs);
        if (best2) { best2.hp -= actualDmg; gs.projectiles.push({ x: cx, y: cy, tx: best2.x, ty: best2.y, life: 6 }); }
      }
    }
  },

  wall: {
    name: 'Wall', icon: '🧱', color: '#443322', unlocked: true, size: 1, place: 'mission',
    cost: { iron_plate: 1 },
    desc: '【出撃先専用】敵の進路を塞ぐ壁。HPあり。ギアで自然回復・HP3倍化が可能。',
    hp: 200,
    onTick(cell, gs) {
      // iron_curtain gear: passive HP regen
      if (hasGear(gs, 'iron_curtain')) {
        const maxHp = wallMaxHp(gs);
        if (cell.equipment.hp < maxHp) cell.equipment.hp = Math.min(maxHp, cell.equipment.hp + 0.15);
      }
    }
  },

  laser: {
    name: 'Laser', icon: '🔴', color: '#442233', unlocked: false, size: 2, place: 'mission',
    cost: { iron_plate: 8, copper_plate: 4, circuit: 3 },
    desc: '【出撃先専用】高威力レーザー砲。射程が長い。電力×2消費。潤滑油でクールダウン半減。',
    powerCost: 2,
    onTick(cell, gs) {
      if (!gs._missionTick) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const pwCost = Math.max(0, (EQ_DEF.laser.powerCost) - (gs.upgrades.powerEfficiency || 0));
      if ((gs.power || 0) < pwCost) return;
      const range = gs.upgrades.infiniteRange ? 99999 : (gs.upgrades.turretRange || 4) * C.CELL * 2;
      const dmg   = (gs.upgrades.turretDmg || 15) * 3 * (gs.upgrades.turretDmgMult || 1);
      const cx    = (cell.x + 1) * C.CELL;
      const cy    = (cell.y + 1) * C.CELL;
      const best  = nearestEnemy(cx, cy, range, gs);
      if (!best) return;
      gs.power -= pwCost;
      let actualDmg = dmg;
      if (hasGear(gs, 'black_powder') && best.hp < best.maxHp * 0.3) actualDmg *= 1.5;
      best.hp -= actualDmg;
      const hasLube = (gs.resources[C.RES.LUBRICANT] || 0) >= 1;
      if (hasLube) gs.resources[C.RES.LUBRICANT]--;
      cell.equipment.timer = hasLube ? 60 : 120;
      gs.projectiles.push({ x: cx, y: cy, tx: best.x, ty: best.y, life: 14, laser: true });
    }
  },

  generator: {
    name: 'Generator', icon: '🔌', color: '#225544', unlocked: false, size: 2,
    cost: { iron_plate: 6, copper_plate: 3 },
    desc: 'コークス×1を消費して電力+15を生産（毎300tick）。コンベアでコークスを投入。',
    canAccept(item, cell, _gs) { return item === C.RES.COKE && (cell.equipment.fuel || 0) < 4; },
    accept(item, cell, _gs) { cell.equipment.fuel = (cell.equipment.fuel || 0) + 1; },
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      if ((cell.equipment.fuel || 0) < 1) return;
      cell.equipment.fuel--;
      gs.power = Math.min(gs.powerMax || 500, (gs.power || 0) + 15);
      cell.equipment.timer = 300;
    }
  },

  // ── Tier 2 : Chemistry ────────────────────────────────

  oil_pump: {
    name: 'Oil Pump', icon: '🛢', color: '#222233', unlocked: true, size: 1, place: 'mission',
    cost: {},
    desc: '【出撃先専用】油田（OIL）ノードに設置。原油を倉庫へ継続的に抽出する。',
    validTerrain: [C.OIL_WELL],
    onTick(cell, gs) {
      if (cell.terrain !== C.OIL_WELL) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.timer = Math.floor(gs.upgrades.pumpSpeed || 90);
      addRes(gs, C.RES.CRUDE_OIL, gs.upgrades.pumpYield || 1);
    }
  },

  water_pump: {
    name: 'Water Pump', icon: '💧', color: '#1a2f44', unlocked: true, size: 1,
    cost: {},
    desc: '周囲から水を収集してコンベアへ流す。電解槽・化学プラントの水源。',
    onTick(cell, gs) {
      if (flushOutput(cell, gs)) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.timer = 120;
      // water_deity gear: produce 2 water instead of 1
      pushOutput(cell, C.RES.WATER, gs.gearFlags?.doubleWater ? 2 : 1);
      flushOutput(cell, gs);
    }
  },

  coke_oven: {
    name: 'Coke Oven', icon: '🟤', color: '#332211', unlocked: false, size: 2,
    cost: { iron_plate: 3 },
    desc: '石炭×2→コークス×1。コンベアで石炭を投入。出力はコンベアへ。【要研究: コークス精製】',
    canAccept(item, cell, _gs) { return item === C.RES.COAL && (cell.equipment.inventory?.coal || 0) < 4; },
    accept(item, cell, _gs) { cell.equipment.inventory = cell.equipment.inventory || {}; cell.equipment.inventory.coal = (cell.equipment.inventory.coal || 0) + 1; },
    onTick(cell, gs) {
      if (flushOutput(cell, gs)) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      cell.equipment.inventory = cell.equipment.inventory || {};
      if ((cell.equipment.inventory.coal || 0) < 2) return;
      cell.equipment.inventory.coal -= 2;
      cell.equipment.timer = 150;
      // ancient_fire gear: double output
      pushOutput(cell, C.RES.COKE, gs.gearFlags?.doubleCokeYield ? 2 : 1);
      flushOutput(cell, gs);
    }
  },

  distillation: {
    name: 'Distillation', icon: '🏭', color: '#334433', unlocked: false, size: 2,
    cost: { iron_plate: 8, copper_plate: 4 },
    desc: '原油×3→石油ガス×2＋軽油×2＋重油×1に分留する。コンベアで原油を投入。【要研究: 石油化学】',
    canAccept(item, cell, _gs) { return item === C.RES.CRUDE_OIL && (cell.equipment.oilStock || 0) < 9; },
    accept(item, cell, _gs) { cell.equipment.oilStock = (cell.equipment.oilStock || 0) + 1; },
    onTick(cell, gs) {
      if (flushOutput(cell, gs)) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const master    = hasGear(gs, 'distill_master');
      const batchSize = master ? 6 : 3;
      if ((cell.equipment.oilStock || 0) < batchSize) return;
      cell.equipment.oilStock -= batchSize;
      cell.equipment.timer = 200;
      const mult = (gs.upgrades.distillYield ? 1.5 : 1) * (master ? 2 : 1);
      pushOutput(cell, C.RES.PETRO_GAS, Math.floor(2 * mult));
      pushOutput(cell, C.RES.LIGHT_OIL, Math.floor(2 * mult));
      pushOutput(cell, C.RES.HEAVY_OIL, Math.floor(1 * mult));
      flushOutput(cell, gs);
    }
  },

  chem_plant: {
    name: 'Chem Plant', icon: '⚗', color: '#1e3322', unlocked: false, size: 2,
    cost: { iron_plate: 6, copper_plate: 4, circuit: 2 },
    desc: '左クリックでレシピ切替。コンベアで素材を投入。電力×2消費。【要研究: 化学合成】',
    powerCost: 2,
    recipes: [
      { id:'plastic',     name:'プラスチック棒', icon:'🟡', inputs:{ [C.RES.PETRO_GAS]:3, [C.RES.COAL]:2 },           output:C.RES.PLASTIC,       count:2, time:240 },
      { id:'lubricant',   name:'潤滑油',         icon:'🟠', inputs:{ [C.RES.HEAVY_OIL]:3 },                            output:C.RES.LUBRICANT,     count:4, time:200 },
      { id:'sulfuric',    name:'硫酸',           icon:'🟢', inputs:{ [C.RES.SULFUR]:2, [C.RES.WATER]:3 },             output:C.RES.SULFURIC_ACID, count:3, time:220, tech:'chem_acid' },
      { id:'ref_copper',  name:'精錬銅',         icon:'🔵', inputs:{ [C.RES.COPPER_ORE]:3, [C.RES.SULFURIC_ACID]:2 }, output:C.RES.REFINED_COPPER,count:4, time:260, tech:'chem_acid' },
      { id:'explosives',  name:'爆薬',           icon:'🔴', inputs:{ [C.RES.COAL]:3, [C.RES.SULFUR]:2, [C.RES.LIGHT_OIL]:2 }, output:C.RES.EXPLOSIVES, count:2, time:280, tech:'mil_explosives' },
      { id:'water_synth', name:'水（合成）',     icon:'💙', inputs:{ [C.RES.HYDROGEN]:2, [C.RES.OXYGEN]:1 },          output:C.RES.WATER,         count:3, time:180, tech:'chem_electro' },
    ],
    canAccept(item, cell, _gs) {
      const recipe = EQ_DEF[C.EQ.CHEM_PLANT].recipes[cell.equipment.recipeIdx || 0];
      const inv = cell.equipment.inventory || {};
      const need = recipe.inputs[item];
      return need !== undefined && (inv[item] || 0) < need * 2;
    },
    accept(item, cell, _gs) {
      cell.equipment.inventory = cell.equipment.inventory || {};
      cell.equipment.inventory[item] = (cell.equipment.inventory[item] || 0) + 1;
    },
    onTick(cell, gs) {
      if (flushOutput(cell, gs)) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const pwCost = Math.max(0, (EQ_DEF.chem_plant.powerCost) - (gs.upgrades.powerEfficiency || 0));
      if ((gs.power || 0) < pwCost) return;
      const recipe = EQ_DEF[C.EQ.CHEM_PLANT].recipes[cell.equipment.recipeIdx || 0];
      if (!recipeAvailable(recipe, gs)) return;
      const save = gs.upgrades.chemSave ? 1 : 0;
      const inv = cell.equipment.inventory || {};
      for (const [res, amt] of Object.entries(recipe.inputs)) {
        if ((inv[res] || 0) < Math.max(1, amt - save)) return;
      }
      gs.power -= pwCost;
      for (const [res, amt] of Object.entries(recipe.inputs)) {
        inv[res] -= Math.max(1, amt - save);
      }
      cell.equipment.inventory = inv;
      if (gs.gearFlags?.unstableReactor && Math.random() < 0.10) {
        const keys = Object.keys(recipe.inputs);
        const rk = keys[Math.floor(Math.random() * keys.length)];
        if ((inv[rk] || 0) > 0) inv[rk]--;
      }
      let count = Math.floor(recipe.count * (gs.upgrades.chemYield || 1));
      if (hasGear(gs, 'alchemist_still')) {
        gs.gearFlags.alchemistCount = (gs.gearFlags.alchemistCount || 0) + 1;
        if (gs.gearFlags.alchemistCount % 3 === 0) count++;
      }
      pushOutput(cell, recipe.output, count);
      flushOutput(cell, gs);
      cell.equipment.timer = Math.floor(gs.upgrades.chemSpeed || recipe.time);
    }
  },

  electrolyzer: {
    name: 'Electrolyzer', icon: '⚡', color: '#1a2244', unlocked: false, size: 2,
    cost: { iron_plate: 8, copper_plate: 6, circuit: 2 },
    desc: '水×2→水素×2＋酸素×1。コンベアで水を投入。電力×2消費。【要研究: 電気分解】',
    powerCost: 2,
    canAccept(item, cell, _gs) { return item === C.RES.WATER && (cell.equipment.waterStock || 0) < 4; },
    accept(item, cell, _gs) { cell.equipment.waterStock = (cell.equipment.waterStock || 0) + 1; },
    onTick(cell, gs) {
      if (flushOutput(cell, gs)) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const pwCost = Math.max(0, (EQ_DEF.electrolyzer.powerCost) - (gs.upgrades.powerEfficiency || 0));
      if ((gs.power || 0) < pwCost) return;
      if ((cell.equipment.waterStock || 0) < 2) return;
      gs.power -= pwCost;
      cell.equipment.waterStock -= 2;
      cell.equipment.timer = Math.floor(gs.upgrades.chemSpeed || 150);
      pushOutput(cell, C.RES.HYDROGEN, 2);
      pushOutput(cell, C.RES.OXYGEN, 1);
      flushOutput(cell, gs);
    }
  },

  adv_assembler: {
    name: 'Adv. Assembler', icon: '🤖', color: '#1a3322', unlocked: false, size: 2,
    cost: { iron_plate: 10, copper_plate: 5, circuit: 4 },
    desc: '左クリックでレシピ切替。コンベアで素材を投入。電力×3消費。【要研究: 高度組立】',
    powerCost: 3,
    recipes: [
      { id:'adv_circuit', name:'高度回路基板', icon:'💚', inputs:{ [C.RES.CIRCUIT]:2, [C.RES.PLASTIC]:2, [C.RES.REFINED_COPPER]:1 }, output:C.RES.ADV_CIRCUIT,    count:1, time:300 },
      { id:'lubri_gear',  name:'潤滑ギア',    icon:'⚙',  inputs:{ [C.RES.IRON_PLATE]:3, [C.RES.LUBRICANT]:1 },                     output:C.RES.CIRCUIT,        count:3, time:240, tech:'eng_lubri' },
      { id:'expl_shell',  name:'爆発弾頭',    icon:'💣',  inputs:{ [C.RES.EXPLOSIVES]:2, [C.RES.IRON_PLATE]:1 },                    output:C.RES.EXPLOSIVES,     count:3, time:200, tech:'mil_explosives' },
    ],
    canAccept(item, cell, _gs) {
      const recipe = EQ_DEF[C.EQ.ADV_ASSEMBLER].recipes[cell.equipment.recipeIdx || 0];
      const inv = cell.equipment.inventory || {};
      const need = recipe.inputs[item];
      return need !== undefined && (inv[item] || 0) < need * 2;
    },
    accept(item, cell, _gs) {
      cell.equipment.inventory = cell.equipment.inventory || {};
      cell.equipment.inventory[item] = (cell.equipment.inventory[item] || 0) + 1;
    },
    onTick(cell, gs) {
      if (flushOutput(cell, gs)) return;
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const pwCost = Math.max(0, (EQ_DEF.adv_assembler.powerCost) - (gs.upgrades.powerEfficiency || 0));
      if ((gs.power || 0) < pwCost) return;
      const recipe = EQ_DEF[C.EQ.ADV_ASSEMBLER].recipes[cell.equipment.recipeIdx || 0];
      if (!recipeAvailable(recipe, gs)) return;
      const inv = cell.equipment.inventory || {};
      for (const [res, amt] of Object.entries(recipe.inputs)) {
        if ((inv[res] || 0) < amt) return;
      }
      gs.power -= pwCost;
      for (const [res, amt] of Object.entries(recipe.inputs)) inv[res] -= amt;
      cell.equipment.inventory = inv;
      pushOutput(cell, recipe.output, recipe.count + (gs.gearFlags?.craftsmanBonus || 0));
      flushOutput(cell, gs);
      cell.equipment.timer = Math.floor(gs.upgrades.assemblerSpeed || recipe.time);
    }
  },

  // ── Factory logistics ─────────────────────────────────

  extractor: {
    name: 'Extractor', icon: '📤', color: '#3a4a22', unlocked: true, size: 1, place: 'factory',
    cost: { iron_plate: 1 },
    desc: '【工場専用】倉庫から選択素材をコンベアへ取り出す。クリックでアイテム選択。',
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const item = cell.equipment.selectedItem;
      if (!item || (gs.resources[item] || 0) < 1) return;
      const dv = C.DIR_VEC[cell.equipment.dir];
      const nx = cell.x + dv.x, ny = cell.y + dv.y;
      if (!inBounds(nx, ny)) return;
      const nc = gs.map.grid[ny][nx];
      if (nc.equipment?.type === C.EQ.CONVEYOR && !nc.item) {
        nc.item = item;
        gs.resources[item]--;
        cell.equipment.timer = Math.floor(gs.upgrades.portSpeed || 60);
      }
    }
  },

  inserter: {
    name: 'Inserter', icon: '📥', color: '#223a44', unlocked: true, size: 1, place: 'factory',
    cost: { iron_plate: 1 },
    desc: '【工場専用】コンベアのアイテムを倉庫へ格納する。向いた方向のコンベアから回収。',
    onTick(cell, gs) {
      if (cell.equipment.timer > 0) { cell.equipment.timer--; return; }
      const dv = C.DIR_VEC[cell.equipment.dir];
      const nx = cell.x + dv.x, ny = cell.y + dv.y;
      if (!inBounds(nx, ny)) return;
      const nc = gs.map.grid[ny][nx];
      if (nc.equipment?.type === C.EQ.CONVEYOR && nc.item) {
        addRes(gs, nc.item, 1);
        nc.item = null;
        cell.equipment.timer = Math.floor(gs.upgrades.portSpeed || 60);
      }
    }
  },
};

// ─── Helpers ─────────────────────────────────────────────

function addRes(gs, key, n) {
  gs.resources[key] = (gs.resources[key] || 0) + n;
  if (n <= 0) return;

  // amplifier_coil gear: every 10th addition, +1 bonus
  if (hasGear(gs, 'amplifier_coil')) {
    gs.gearFlags.amplifierCount = (gs.gearFlags.amplifierCount || 0) + 1;
    if (gs.gearFlags.amplifierCount % 10 === 0) gs.resources[key]++;
  }

  // Production tracking (during battle missions)
  if (gs.mission?.combatActive) {
    gs.waveProductionCount = (gs.waveProductionCount || 0) + n;

    // Wave objective tracking
    if (gs.waveObjective && !gs.waveObjective.met && key === gs.waveObjective.res) {
      gs.waveObjective.progress = (gs.waveObjective.progress || 0) + n;
      if (gs.waveObjective.progress >= gs.waveObjective.target)
        gs.waveObjective.met = true;
    }

    // Factory Heart upgrade: production heals core
    if (gs.upgrades.factoryHeart) {
      gs.productionHealAccum = (gs.productionHealAccum || 0) + n;
      if (gs.productionHealAccum >= 6) {
        gs.productionHealAccum -= 6;
        gs.coreHp = Math.min(gs.coreMaxHp, (gs.coreHp || 0) + 1);
      }
    }
  }
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < C.COLS && y < C.ROWS;
}

// Production output queue — machines never write to the warehouse directly.
// pushOutput queues items; flushOutput moves the head onto the output conveyor.
// Returns true while the queue still holds items (machine should stall).
function pushOutput(cell, item, n = 1) {
  cell.equipment.outQueue = cell.equipment.outQueue || [];
  for (let i = 0; i < n; i++) cell.equipment.outQueue.push(item);
}

function flushOutput(cell, gs) {
  const q = cell.equipment.outQueue;
  if (!q || !q.length) return false;
  while (q.length && outputToConveyor(cell, q[0], gs)) q.shift();
  return q.length > 0;
}

function recipeAvailable(recipe, gs) {
  return !recipe.tech || !!gs.tech?.has(recipe.tech);
}

function wallMaxHp(gs) {
  return EQ_DEF.wall.hp
    * (gs.gearFlags?.eraArmor ? 3 : 1)
    * (gs.upgrades?.wallHpMult || 1);
}

function outputToConveyor(cell, item, gs) {
  const dv = C.DIR_VEC[cell.equipment.dir];
  const sz = EQ_DEF[cell.equipment.type]?.size || 1;
  // for size>1, RIGHT/DOWN exits must clear the full footprint
  const nx = cell.x + (dv.x > 0 ? sz : dv.x);
  const ny = cell.y + (dv.y > 0 ? sz : dv.y);
  if (!inBounds(nx, ny)) return false;
  const nc = gs.map.grid[ny][nx];
  if (nc.equipment?.type === C.EQ.CONVEYOR && !nc.item) { nc.item = item; return true; }
  return false;
}

function nearestEnemy(cx, cy, range, gs) {
  // targeting_computer gear: target weakest HP instead of nearest
  const useWeakest = hasGear(gs, 'targeting_computer');
  let best = null, bestDist = Infinity, bestHp = Infinity;
  for (const e of gs.enemies) {
    const d = dist({ x: e.x, y: e.y }, { x: cx, y: cy });
    if (d < range) {
      if (useWeakest) {
        if (e.hp < bestHp) { best = e; bestHp = e.hp; }
      } else {
        if (d < bestDist) { best = e; bestDist = d; }
      }
    }
  }
  return best;
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function resolveCell(cell, gs) {
  if (cell?.equipment?.type === '_occ')
    return gs.map.grid[cell.equipment.rootY][cell.equipment.rootX];
  return cell;
}

function canAffordEquipment(type, gs) {
  const cost      = EQ_DEF[type]?.cost || {};
  const reduction = gs?.gearFlags?.buildCostReduction || 0;
  return Object.entries(cost).every(([k, v]) => (gs.resources[k] || 0) >= Math.max(0, v - reduction));
}

function deductEquipmentCost(type, gs) {
  const cost      = EQ_DEF[type]?.cost || {};
  const reduction = gs?.gearFlags?.buildCostReduction || 0;
  for (const [k, v] of Object.entries(cost)) {
    const actual = Math.max(0, v - reduction);
    if (actual > 0) gs.resources[k] -= actual;
  }
}

function formatEquipmentCost(type) {
  const cost      = EQ_DEF[type]?.cost || {};
  const reduction = gs?.gearFlags?.buildCostReduction || 0;
  const entries   = Object.entries(cost);
  if (!entries.length) return '無料';
  return entries.map(([k, v]) => `${RES_NAMES[k] || k}×${Math.max(0, v - reduction)}`).join(' + ');
}

function makeEquipment(type, dir = C.DIR.RIGHT) {
  const base = { type, dir, timer: 0 };
  if (type === C.EQ.ASSEMBLER || type === C.EQ.CHEM_PLANT || type === C.EQ.ADV_ASSEMBLER)
    base.inventory = {};
  if (type === C.EQ.COKE_OVEN)    base.inventory = { coal: 0 };
  if (type === C.EQ.WALL)         base.hp = gs ? wallMaxHp(gs) : EQ_DEF.wall.hp;
  if (type === C.EQ.CHEM_PLANT || type === C.EQ.ADV_ASSEMBLER) base.recipeIdx = 0;
  if (type === C.EQ.EXTRACTOR)    base.selectedItem = null;
  return base;
}

// Applies surge multiplier: if Production Surge buff is active, halve timer durations
function surgeTimer(gs, base) {
  return (gs?.surgeTimer > 0) ? Math.max(1, Math.floor(base / 2)) : base;
}

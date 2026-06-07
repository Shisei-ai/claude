const TERRAIN_COLOR = {
  [C.EMPTY]:      '#111118',
  [C.IRON_ORE]:   '#445566',
  [C.COPPER_ORE]: '#553322',
  [C.COAL]:       '#222228',
  [C.CORE]:       '#1a3a1a',
  [C.OIL_WELL]:   '#1a1a2a',
  [C.SULFUR_DEP]: '#3a3a11',
};

const TERRAIN_LABEL = {
  [C.IRON_ORE]:   { text: 'Fe', color: '#7799bb' },
  [C.COPPER_ORE]: { text: 'Cu', color: '#aa7755' },
  [C.COAL]:       { text: 'Co', color: '#666677' },
  [C.OIL_WELL]:   { text: 'OIL', color: '#5566aa' },
  [C.SULFUR_DEP]: { text: 'S',  color: '#aaaa44' },
};

const ITEM_COLOR = {
  [C.RES.IRON_ORE]:      '#6688aa',
  [C.RES.COPPER_ORE]:    '#aa6644',
  [C.RES.COAL]:          '#555560',
  [C.RES.SULFUR]:        '#cccc44',
  [C.RES.IRON_PLATE]:    '#8899aa',
  [C.RES.COPPER_PLATE]:  '#cc8844',
  [C.RES.CIRCUIT]:       '#44aa66',
  [C.RES.COKE]:          '#443333',
  [C.RES.PLASTIC]:       '#eeee66',
  [C.RES.REFINED_COPPER]:'#ff9922',
  [C.RES.EXPLOSIVES]:    '#ff4444',
  [C.RES.ADV_CIRCUIT]:   '#44ffaa',
  [C.RES.CRUDE_OIL]:     '#444455',
  [C.RES.PETRO_GAS]:     '#8888cc',
  [C.RES.LIGHT_OIL]:     '#aaaa88',
  [C.RES.HEAVY_OIL]:     '#445544',
  [C.RES.SULFURIC_ACID]: '#88cc44',
  [C.RES.LUBRICANT]:     '#cc8833',
  [C.RES.WATER]:         '#4488cc',
  [C.RES.HYDROGEN]:      '#aaccff',
  [C.RES.OXYGEN]:        '#ccddff',
};

function render(canvas, gs) {
  const ctx = canvas.getContext('2d');
  const cs  = C.CELL;

  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < C.ROWS; y++) {
    for (let x = 0; x < C.COLS; x++) {
      const cell = gs.map.grid[y][x];
      const px = x * cs, py = y * cs;

      // Terrain fill
      ctx.fillStyle = TERRAIN_COLOR[cell.terrain] ?? '#111118';
      ctx.fillRect(px, py, cs, cs);

      // Grid line
      ctx.strokeStyle = '#1a1a22';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, cs, cs);

      // Terrain label
      if (cell.terrain === C.CORE) {
        ctx.fillStyle = '#33bb33';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CORE', px + cs/2, py + cs/2 + 4);
        ctx.textAlign = 'left';
      } else {
        const lbl = TERRAIN_LABEL[cell.terrain];
        if (lbl) {
          ctx.fillStyle = lbl.color;
          ctx.font = '9px monospace';
          ctx.fillText(lbl.text, px + 2, py + cs - 3);
        }
      }

      // Equipment
      if (cell.equipment) drawEquipment(ctx, cell, px, py, cs, gs);

      // Item dot on conveyor
      if (cell.item) {
        ctx.fillStyle = ITEM_COLOR[cell.item] ?? '#ffffff';
        ctx.fillRect(px + cs/2 - 4, py + cs/2 - 4, 8, 8);
      }
    }
  }

  // Enemies
  for (const e of gs.enemies) {
    const bw = e.size * 2;
    ctx.fillStyle = '#330000';
    ctx.fillRect(e.x - bw/2, e.y - e.size - 6, bw, 3);
    ctx.fillStyle = e.elite ? '#ff6600' : '#ff2222';
    ctx.fillRect(e.x - bw/2, e.y - e.size - 6, bw * (e.hp / e.maxHp), 3);
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);
    if (e.elite) {
      ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 2;
      ctx.strokeRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);
    }
  }

  // Projectiles
  for (const p of gs.projectiles) {
    ctx.strokeStyle = p.laser ? '#ff2244' : '#ffdd44';
    ctx.lineWidth = p.laser ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.tx, p.ty);
    ctx.stroke();
  }

  // Hover ghost
  if (gs.hover && gs.selectedTool) {
    const { hx, hy } = gs.hover;
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 2;
    ctx.strokeRect(hx * cs + 1, hy * cs + 1, cs - 2, cs - 2);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = EQ_DEF[gs.selectedTool]?.color || '#555';
    ctx.fillRect(hx * cs + 2, hy * cs + 2, cs - 4, cs - 4);
    ctx.globalAlpha = 1;
  }
}

function drawEquipment(ctx, cell, px, py, cs, gs) {
  const eq  = cell.equipment;
  const def = EQ_DEF[eq.type];
  if (!def) return;

  ctx.fillStyle = def.color || '#444';
  ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);

  // Direction indicator for transport/processing equipment
  const hasDir = [C.EQ.MINER, C.EQ.CONVEYOR, C.EQ.FURNACE, C.EQ.ASSEMBLER].includes(eq.type);
  if (hasDir) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.save();
    ctx.translate(px + cs/2, py + cs/2);
    ctx.rotate(eq.dir * Math.PI / 2);
    ctx.fillRect(-2, -6, 4, 12);
    ctx.restore();
  }

  // Progress bars
  const maxFurnace = gs.upgrades.furnaceSpeed || 180;
  if (eq.type === C.EQ.FURNACE && eq.inputItem) {
    drawProgressBar(ctx, px, py, cs, 1 - eq.timer / maxFurnace, '#ff6622');
  }
  const maxAssembler = gs.upgrades.assemblerSpeed || 300;
  if (eq.type === C.EQ.ASSEMBLER && eq.crafting) {
    drawProgressBar(ctx, px, py, cs, 1 - eq.timer / maxAssembler, '#22cc66');
  }
  const maxChem = gs.upgrades.chemSpeed || 240;
  if (eq.type === C.EQ.CHEM_PLANT && eq.timer > 0) {
    drawProgressBar(ctx, px, py, cs, 1 - eq.timer / maxChem, '#44ccaa');
  }
  const maxAdv = gs.upgrades.assemblerSpeed || 400;
  if (eq.type === C.EQ.ADV_ASSEMBLER && eq.timer > 0) {
    drawProgressBar(ctx, px, py, cs, 1 - eq.timer / maxAdv, '#44ffaa');
  }
  if (eq.type === C.EQ.DISTILLATION && eq.timer > 0) {
    drawProgressBar(ctx, px, py, cs, 1 - eq.timer / 200, '#88ccaa');
  }
  if (eq.type === C.EQ.COKE_OVEN && eq.timer > 0) {
    drawProgressBar(ctx, px, py, cs, 1 - eq.timer / 180, '#cc7733');
  }

  // Wall HP bar
  if (eq.type === C.EQ.WALL) {
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(px + 2, py + 2, (cs - 4) * (eq.hp / EQ_DEF.wall.hp), 3);
  }

  // Recipe indicator for multi-recipe machines
  if ((eq.type === C.EQ.CHEM_PLANT || eq.type === C.EQ.ADV_ASSEMBLER) && eq.recipeIdx !== undefined) {
    const recipes = EQ_DEF[eq.type].recipes;
    const r = recipes[eq.recipeIdx];
    if (r) {
      ctx.font = '9px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(r.icon, px + cs/2, py + 10);
      ctx.textAlign = 'left';
    }
  }

  // Main icon
  ctx.font = '14px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(def.icon, px + cs/2, py + cs/2 + 5);
  ctx.textAlign = 'left';
}

function drawProgressBar(ctx, px, py, cs, progress, color) {
  ctx.fillStyle = color;
  ctx.fillRect(px + 2, py + cs - 5, (cs - 4) * Math.max(0, Math.min(1, progress)), 3);
}

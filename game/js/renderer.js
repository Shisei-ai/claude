const TERRAIN_COLORS = {
  [C.EMPTY]:      '#111118',
  [C.IRON_ORE]:   '#556677',
  [C.COPPER_ORE]: '#664433',
  [C.COAL]:       '#333338',
  [C.CORE]:       '#224422',
};

const ITEM_COLORS = {
  [C.RES.IRON_ORE]:     '#6688aa',
  [C.RES.COPPER_ORE]:   '#aa6644',
  [C.RES.COAL]:         '#555560',
  [C.RES.IRON_PLATE]:   '#8899aa',
  [C.RES.COPPER_PLATE]: '#cc8844',
  [C.RES.CIRCUIT]:      '#44aa66',
  [C.RES.GEAR]:         '#999999',
};

function render(canvas, gs) {
  const ctx = canvas.getContext('2d');
  const cs = C.CELL;

  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grid cells
  for (let y = 0; y < C.ROWS; y++) {
    for (let x = 0; x < C.COLS; x++) {
      const cell = gs.map.grid[y][x];
      const px = x * cs, py = y * cs;

      // Terrain
      ctx.fillStyle = TERRAIN_COLORS[cell.terrain] || '#111118';
      ctx.fillRect(px, py, cs, cs);

      // Grid line
      ctx.strokeStyle = '#1a1a22';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, cs, cs);

      // Terrain icon
      if (cell.terrain === C.IRON_ORE) {
        ctx.fillStyle = '#778899';
        ctx.font = '10px monospace';
        ctx.fillText('Fe', px + 2, py + cs - 4);
      } else if (cell.terrain === C.COPPER_ORE) {
        ctx.fillStyle = '#aa7755';
        ctx.font = '10px monospace';
        ctx.fillText('Cu', px + 2, py + cs - 4);
      } else if (cell.terrain === C.COAL) {
        ctx.fillStyle = '#555566';
        ctx.font = '10px monospace';
        ctx.fillText('Co', px + 2, py + cs - 4);
      } else if (cell.terrain === C.CORE) {
        ctx.fillStyle = '#33aa33';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CORE', px + cs/2, py + cs/2 + 4);
        ctx.textAlign = 'left';
      }

      // Equipment
      if (cell.equipment) {
        drawEquipment(ctx, cell, px, py, cs, gs);
      }

      // Item on conveyor
      if (cell.item) {
        ctx.fillStyle = ITEM_COLORS[cell.item] || '#ffffff';
        ctx.fillRect(px + cs/2 - 4, py + cs/2 - 4, 8, 8);
      }
    }
  }

  // Draw enemies
  for (const e of gs.enemies) {
    // HP bar
    const barW = e.size * 2;
    ctx.fillStyle = '#330000';
    ctx.fillRect(e.x - barW/2, e.y - e.size - 6, barW, 3);
    ctx.fillStyle = e.elite ? '#ff6600' : '#ff2222';
    ctx.fillRect(e.x - barW/2, e.y - e.size - 6, barW * (e.hp / e.maxHp), 3);

    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);
    if (e.elite) {
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2;
      ctx.strokeRect(e.x - e.size/2, e.y - e.size/2, e.size, e.size);
    }
  }

  // Draw projectiles
  for (const p of gs.projectiles) {
    ctx.strokeStyle = p.laser ? '#ff2244' : '#ffdd44';
    ctx.lineWidth = p.laser ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.tx, p.ty);
    ctx.stroke();
  }

  // Hover highlight
  if (gs.hover && gs.selectedTool) {
    const { hx, hy } = gs.hover;
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 2;
    ctx.strokeRect(hx * cs + 1, hy * cs + 1, cs - 2, cs - 2);

    // Ghost preview
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = EQ_DEF[gs.selectedTool]?.color || '#555';
    ctx.fillRect(hx * cs + 2, hy * cs + 2, cs - 4, cs - 4);
    ctx.globalAlpha = 1;
  }
}

function drawEquipment(ctx, cell, px, py, cs, gs) {
  const eq = cell.equipment;
  const def = EQ_DEF[eq.type];
  if (!def) return;

  ctx.fillStyle = def.color || '#444';
  ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);

  // Direction arrow for directional equipment
  if ([C.EQ.MINER, C.EQ.CONVEYOR, C.EQ.FURNACE, C.EQ.ASSEMBLER].includes(eq.type)) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.save();
    ctx.translate(px + cs/2, py + cs/2);
    ctx.rotate(eq.dir * Math.PI / 2);
    ctx.fillRect(-3, -6, 6, 12);
    ctx.restore();
  }

  // Progress bar for processing equipment
  if (eq.type === C.EQ.FURNACE && eq.inputItem) {
    const maxT = gs.upgrades.furnaceSpeed || 180;
    const prog = 1 - eq.timer / maxT;
    ctx.fillStyle = '#ff6622';
    ctx.fillRect(px + 2, py + cs - 5, (cs - 4) * prog, 3);
  }
  if (eq.type === C.EQ.ASSEMBLER && eq.crafting) {
    const maxT = gs.upgrades.assemblerSpeed || 300;
    const prog = 1 - eq.timer / maxT;
    ctx.fillStyle = '#22cc66';
    ctx.fillRect(px + 2, py + cs - 5, (cs - 4) * prog, 3);
  }

  // Wall HP bar
  if (eq.type === C.EQ.WALL) {
    const maxHp = EQ_DEF.wall.hp;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(px + 2, py + 2, (cs - 4) * (eq.hp / maxHp), 3);
  }

  // Icon
  ctx.font = '14px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(def.icon, px + cs/2, py + cs/2 + 5);
  ctx.textAlign = 'left';
}

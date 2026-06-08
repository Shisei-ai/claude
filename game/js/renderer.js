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
  [C.IRON_ORE]:   { text: 'Fe',  color: '#7799bb' },
  [C.COPPER_ORE]: { text: 'Cu',  color: '#aa7755' },
  [C.COAL]:       { text: 'Co',  color: '#666677' },
  [C.OIL_WELL]:   { text: 'OIL', color: '#5566aa' },
  [C.SULFUR_DEP]: { text: 'S',   color: '#aaaa44' },
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
  const cam = gs.cam || { x: 0, y: 0 };

  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Visible cell range
  const startX = Math.max(0, Math.floor(cam.x));
  const startY = Math.max(0, Math.floor(cam.y));
  const endX   = Math.min(C.COLS, startX + Math.ceil(canvas.width  / cs) + 1);
  const endY   = Math.min(C.ROWS, startY + Math.ceil(canvas.height / cs) + 1);

  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      const cell = gs.map.grid[gy][gx];
      const px   = Math.round((gx - cam.x) * cs);
      const py   = Math.round((gy - cam.y) * cs);

      ctx.fillStyle = TERRAIN_COLOR[cell.terrain] ?? '#111118';
      ctx.fillRect(px, py, cs, cs);

      ctx.strokeStyle = '#1a1a22';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, cs, cs);

      if (cell.terrain === C.CORE) {
        ctx.fillStyle = '#33bb33';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CORE', px + cs / 2, py + cs / 2 + 4);
        ctx.textAlign = 'left';
      } else {
        const lbl = TERRAIN_LABEL[cell.terrain];
        if (lbl) {
          ctx.fillStyle = lbl.color;
          ctx.font = '9px monospace';
          ctx.fillText(lbl.text, px + 2, py + cs - 3);
        }
      }

      if (cell.equipment) drawEquipment(ctx, cell, px, py, cs, gs);
      if (cell.item) {
        ctx.fillStyle = ITEM_COLOR[cell.item] ?? '#ffffff';
        ctx.fillRect(px + cs / 2 - 4, py + cs / 2 - 4, 8, 8);
      }
    }
  }

  // Spawn point markers
  if (gs.spawnPoints) {
    for (const sp of gs.spawnPoints) {
      const sx = Math.round((sp.x - cam.x) * cs + cs / 2);
      const sy = Math.round((sp.y - cam.y) * cs + cs / 2);
      if (sx < -cs || sx > canvas.width + cs || sy < -cs || sy > canvas.height + cs) continue;
      ctx.strokeStyle = '#ff2222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, cs * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#ff4444';
      ctx.textAlign = 'center';
      ctx.fillText('⚠', sx, sy + 5);
      ctx.textAlign = 'left';
    }
  }

  // Enemies
  for (const e of gs.enemies) {
    const sx = e.x - cam.x * cs;
    const sy = e.y - cam.y * cs;
    if (sx < -60 || sx > canvas.width + 60 || sy < -60 || sy > canvas.height + 60) continue;

    const bw = e.size * 2;
    ctx.fillStyle = '#330000';
    ctx.fillRect(sx - bw / 2, sy - e.size - 6, bw, 3);
    const hpColor = e.boss ? '#ffcc00' : (e.elite ? '#ff6600' : '#ff2222');
    ctx.fillStyle = hpColor;
    ctx.fillRect(sx - bw / 2, sy - e.size - 6, bw * (e.hp / e.maxHp), 3);

    ctx.fillStyle = e.stunTimer > 0 ? '#8888ff' : e.color;
    ctx.fillRect(sx - e.size / 2, sy - e.size / 2, e.size, e.size);

    if (e.boss) {
      ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 3;
      ctx.strokeRect(sx - e.size / 2, sy - e.size / 2, e.size, e.size);
      ctx.font = '10px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffcc00';
      ctx.fillText('★', sx, sy - e.size - 8);
      ctx.textAlign = 'left';
    } else if (e.elite) {
      ctx.strokeStyle = e.gearCarrier ? '#ffee44' : '#ff6600';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - e.size / 2, sy - e.size / 2, e.size, e.size);
      if (e.gearCarrier) {
        ctx.font = '8px serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#ffee44';
        ctx.fillText('⚙', sx, sy - e.size - 7);
        ctx.textAlign = 'left';
      }
    }
  }

  // Projectiles
  for (const p of gs.projectiles) {
    ctx.strokeStyle = p.laser ? '#ff2244' : '#ffdd44';
    ctx.lineWidth = p.laser ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(p.x  - cam.x * cs, p.y  - cam.y * cs);
    ctx.lineTo(p.tx - cam.x * cs, p.ty - cam.y * cs);
    ctx.stroke();
  }

  // Hover ghost
  if (gs.hover && gs.selectedTool && gs.state === 'build') {
    const { hx, hy } = gs.hover;
    const px = Math.round((hx - cam.x) * cs);
    const py = Math.round((hy - cam.y) * cs);
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = EQ_DEF[gs.selectedTool]?.color || '#555';
    ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);
    ctx.globalAlpha = 1;
  }

  drawMinimap(ctx, canvas, gs);
}

// ── Minimap ──────────────────────────────────────────────
function drawMinimap(ctx, canvas, gs) {
  const mw = C.COLS, mh = C.ROWS; // 100×100 pixels = 1px per cell
  const mx = canvas.width  - mw - 4;
  const my = canvas.height - mh - 4;

  const imgData = ctx.createImageData(mw, mh);
  const d = imgData.data;

  for (let y = 0; y < C.ROWS; y++) {
    for (let x = 0; x < C.COLS; x++) {
      const cell = gs.map.grid[y][x];
      const idx  = (y * mw + x) * 4;
      let r = 17, g = 17, b = 24;
      switch (cell.terrain) {
        case C.CORE:       r = 34;  g = 187; b = 34;  break;
        case C.IRON_ORE:   r = 68;  g = 85;  b = 102; break;
        case C.COPPER_ORE: r = 85;  g = 51;  b = 34;  break;
        case C.COAL:       r = 34;  g = 34;  b = 40;  break;
        case C.OIL_WELL:   r = 26;  g = 26;  b = 42;  break;
        case C.SULFUR_DEP: r = 58;  g = 58;  b = 17;  break;
      }
      if (cell.equipment) { r = Math.min(255, r + 90); g = Math.min(255, g + 90); b = Math.min(255, b + 90); }
      d[idx] = r; d[idx+1] = g; d[idx+2] = b; d[idx+3] = 210;
    }
  }

  for (const e of gs.enemies) {
    const ex = Math.min(mw - 1, Math.max(0, Math.floor(e.x / C.CELL)));
    const ey = Math.min(mh - 1, Math.max(0, Math.floor(e.y / C.CELL)));
    const idx = (ey * mw + ex) * 4;
    d[idx] = 255; d[idx+1] = 50; d[idx+2] = 50; d[idx+3] = 255;
  }

  if (gs.spawnPoints) {
    for (const sp of gs.spawnPoints) {
      const sx = Math.min(mw - 1, Math.max(0, sp.x));
      const sy = Math.min(mh - 1, Math.max(0, sp.y));
      const idx = (sy * mw + sx) * 4;
      d[idx] = 255; d[idx+1] = 255; d[idx+2] = 0; d[idx+3] = 255;
    }
  }

  ctx.putImageData(imgData, mx, my);

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx - 0.5, my - 0.5, mw + 1, mh + 1);

  // Viewport rect
  const cam = gs.cam || { x: 0, y: 0 };
  const vw  = Math.ceil(canvas.width  / C.CELL);
  const vh  = Math.ceil(canvas.height / C.CELL);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + cam.x, my + cam.y, vw, vh);
}

// ── Equipment drawing ──────────────────────────────────────
function drawEquipment(ctx, cell, px, py, cs, gs) {
  const eq  = cell.equipment;
  const def = EQ_DEF[eq.type];
  if (!def) return;

  ctx.fillStyle = def.color || '#444';
  ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);

  const hasDir = [C.EQ.MINER, C.EQ.CONVEYOR, C.EQ.FURNACE, C.EQ.ASSEMBLER].includes(eq.type);
  if (hasDir) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.save();
    ctx.translate(px + cs / 2, py + cs / 2);
    ctx.rotate(eq.dir * Math.PI / 2);
    ctx.fillRect(-2, -6, 4, 12);
    ctx.restore();
  }

  const maxFurnace = gs.upgrades.furnaceSpeed || 180;
  if (eq.type === C.EQ.FURNACE && eq.inputItem)
    drawProgressBar(ctx, px, py, cs, 1 - eq.timer / maxFurnace, '#ff6622');

  const maxAssembler = gs.upgrades.assemblerSpeed || 300;
  if (eq.type === C.EQ.ASSEMBLER && eq.crafting)
    drawProgressBar(ctx, px, py, cs, 1 - eq.timer / maxAssembler, '#22cc66');

  const maxChem = gs.upgrades.chemSpeed || 240;
  if (eq.type === C.EQ.CHEM_PLANT && eq.timer > 0)
    drawProgressBar(ctx, px, py, cs, 1 - eq.timer / maxChem, '#44ccaa');

  if (eq.type === C.EQ.ADV_ASSEMBLER && eq.timer > 0)
    drawProgressBar(ctx, px, py, cs, 1 - eq.timer / (gs.upgrades.assemblerSpeed || 400), '#44ffaa');

  if (eq.type === C.EQ.DISTILLATION && eq.timer > 0)
    drawProgressBar(ctx, px, py, cs, 1 - eq.timer / 200, '#88ccaa');

  if (eq.type === C.EQ.COKE_OVEN && eq.timer > 0)
    drawProgressBar(ctx, px, py, cs, 1 - eq.timer / 180, '#cc7733');

  if (eq.type === C.EQ.WALL) {
    const maxWallHp = EQ_DEF.wall.hp * (gs.gearFlags?.eraArmor ? 3 : 1);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(px + 2, py + 2, (cs - 4) * Math.min(1, eq.hp / maxWallHp), 3);
  }

  if ((eq.type === C.EQ.CHEM_PLANT || eq.type === C.EQ.ADV_ASSEMBLER) && eq.recipeIdx !== undefined) {
    const r = EQ_DEF[eq.type].recipes[eq.recipeIdx];
    if (r) {
      ctx.font = '9px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(r.icon, px + cs / 2, py + 10);
      ctx.textAlign = 'left';
    }
  }

  ctx.font = '14px serif'; ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(def.icon, px + cs / 2, py + cs / 2 + 5);
  ctx.textAlign = 'left';
}

function drawProgressBar(ctx, px, py, cs, progress, color) {
  ctx.fillStyle = color;
  ctx.fillRect(px + 2, py + cs - 5, (cs - 4) * Math.max(0, Math.min(1, progress)), 3);
}

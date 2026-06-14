// Warm industrial terrain palette
const TERRAIN_COLOR = {
  [C.EMPTY]:      '#1c1a16',   // warm dark earth
  [C.IRON_ORE]:   '#2c3e50',   // slate grey-blue
  [C.COPPER_ORE]: '#4a2e1a',   // copper brown
  [C.COAL]:       '#1a1814',   // near-black coal
  [C.CORE]:       '#162a18',   // dark forest green
  [C.OIL_WELL]:   '#181822',   // dark indigo
  [C.SULFUR_DEP]: '#2e2c14',   // dark sulphur
};

const TERRAIN_LABEL = {
  [C.IRON_ORE]:   { text: 'Fe',  color: '#6890b0' },
  [C.COPPER_ORE]: { text: 'Cu',  color: '#b07050' },
  [C.COAL]:       { text: 'Co',  color: '#606070' },
  [C.OIL_WELL]:   { text: 'OIL', color: '#5870b8' },
  [C.SULFUR_DEP]: { text: 'S',   color: '#b8b030' },
};

const ITEM_COLOR = {
  [C.RES.IRON_ORE]:       '#6888a8',   // muted steel blue
  [C.RES.COPPER_ORE]:     '#a86030',   // raw copper
  [C.RES.COAL]:           '#484050',   // coal dark
  [C.RES.SULFUR]:         '#c8c028',   // bright sulphur
  [C.RES.IRON_PLATE]:     '#8898b0',   // polished steel
  [C.RES.COPPER_PLATE]:   '#c87838',   // bright copper
  [C.RES.CIRCUIT]:        '#3ca860',   // circuit green
  [C.RES.COKE]:           '#382c2c',   // dark coke
  [C.RES.PLASTIC]:        '#c8d040',   // plastic yellow
  [C.RES.REFINED_COPPER]: '#e07820',   // refined amber-copper
  [C.RES.EXPLOSIVES]:     '#c82820',   // explosive red
  [C.RES.ADV_CIRCUIT]:    '#30d890',   // adv circuit teal
  [C.RES.CRUDE_OIL]:      '#383840',   // crude oil
  [C.RES.PETRO_GAS]:      '#7070c0',   // petro gas
  [C.RES.LIGHT_OIL]:      '#a8b060',   // light oil olive
  [C.RES.HEAVY_OIL]:      '#386050',   // heavy oil dark teal
  [C.RES.SULFURIC_ACID]:  '#68c028',   // acid green
  [C.RES.LUBRICANT]:      '#b87820',   // lubricant amber
  [C.RES.WATER]:          '#3080c8',   // water blue
  [C.RES.HYDROGEN]:       '#88c0f0',   // hydrogen light
  [C.RES.OXYGEN]:         '#b0d0f0',   // oxygen pale
};

function render(canvas, gs) {
  const ctx = canvas.getContext('2d');
  const cs  = C.CELL;
  const cam = gs.cam || { x: 0, y: 0 };

  ctx.fillStyle = '#100e0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startX = Math.max(0, Math.floor(cam.x));
  const startY = Math.max(0, Math.floor(cam.y));
  const endX   = Math.min(C.COLS, startX + Math.ceil(canvas.width  / cs) + 2);
  const endY   = Math.min(C.ROWS, startY + Math.ceil(canvas.height / cs) + 2);

  // Pass 1: Terrain
  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      const cell = gs.map.grid[gy][gx];
      const px   = Math.round((gx - cam.x) * cs);
      const py   = Math.round((gy - cam.y) * cs);

      ctx.fillStyle = TERRAIN_COLOR[cell.terrain] ?? '#181826';
      ctx.fillRect(px, py, cs, cs);

      // Subtle grid line
      ctx.strokeStyle = '#201e18';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, py, cs, cs);

      if (cell.terrain === C.CORE) {
        ctx.fillStyle = '#58c860';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CORE', px + cs / 2, py + cs / 2 + 3);
        ctx.textAlign = 'left';
      } else {
        const lbl = TERRAIN_LABEL[cell.terrain];
        if (lbl) {
          ctx.fillStyle = lbl.color;
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText(lbl.text, px + 2, py + cs - 3);
        }
      }
    }
  }

  // Map border — warmer tint while on a mission map
  const mx0 = Math.round(-cam.x * cs);
  const my0 = Math.round(-cam.y * cs);
  ctx.strokeStyle = gs.view === 'mission' ? '#402838' : '#2e2820';
  ctx.lineWidth = 2;
  ctx.strokeRect(mx0, my0, C.COLS * cs, C.ROWS * cs);

  // Pass 2: Equipment (root cells only)
  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      const cell = gs.map.grid[gy][gx];
      const eq   = cell.equipment;
      if (!eq || eq.type === '_occ') continue;
      const def = EQ_DEF[eq.type];
      if (!def) continue;
      const px = Math.round((gx - cam.x) * cs);
      const py = Math.round((gy - cam.y) * cs);
      const sz = (def.size || 1) * cs;
      drawEquipmentBody(ctx, cell, px, py, cs, sz, gs);
    }
  }

  // Pass 3: Items
  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      const cell = gs.map.grid[gy][gx];
      if (!cell.item) continue;
      const px = Math.round((gx - cam.x) * cs);
      const py = Math.round((gy - cam.y) * cs);
      ctx.fillStyle = ITEM_COLOR[cell.item] ?? '#ffffff';
      const hs = 5;
      ctx.fillRect(px + cs / 2 - hs, py + cs / 2 - hs, hs * 2, hs * 2);
    }
  }

  // Combat layer only renders on mission maps
  const showCombat = gs.view === 'mission' && gs.mission;

  // Spawn point markers
  if (showCombat && gs.spawnPoints) {
    for (const sp of gs.spawnPoints) {
      const sx = Math.round((sp.x - cam.x) * cs + cs / 2);
      const sy = Math.round((sp.y - cam.y) * cs + cs / 2);
      if (sx < -cs || sx > canvas.width + cs || sy < -cs || sy > canvas.height + cs) continue;
      ctx.strokeStyle = '#dd3030';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, cs * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '11px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ff5050';
      ctx.fillText('⚠', sx, sy + 4);
      ctx.textAlign = 'left';
    }
  }

  // Enemies
  for (const e of (showCombat ? gs.enemies : [])) {
    const sx = e.x - cam.x * cs;
    const sy = e.y - cam.y * cs;
    if (sx < -60 || sx > canvas.width + 60 || sy < -60 || sy > canvas.height + 60) continue;

    // HP bar
    const bw = e.size * 2;
    ctx.fillStyle = '#2a1010';
    ctx.fillRect(sx - bw / 2, sy - e.size - 6, bw, 3);
    const hpColor = e.boss ? '#ffcc00' : (e.elite ? '#ff8030' : '#ff3030');
    ctx.fillStyle = hpColor;
    ctx.fillRect(sx - bw / 2, sy - e.size - 6, bw * (e.hp / e.maxHp), 3);

    ctx.fillStyle = e.stunTimer > 0 ? '#8080dd' : e.color;
    ctx.fillRect(sx - e.size / 2, sy - e.size / 2, e.size, e.size);

    if (e.boss) {
      ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2.5;
      ctx.strokeRect(sx - e.size / 2, sy - e.size / 2, e.size, e.size);
      ctx.font = '9px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffcc00';
      ctx.fillText('★', sx, sy - e.size - 8);
      ctx.textAlign = 'left';
    } else if (e.elite) {
      ctx.strokeStyle = e.gearCarrier ? '#ffee44' : '#ff7030';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx - e.size / 2, sy - e.size / 2, e.size, e.size);
      if (e.gearCarrier) {
        ctx.font = '8px serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#ffee44';
        ctx.fillText('⚙', sx, sy - e.size - 6);
        ctx.textAlign = 'left';
      }
    }
  }

  // Projectiles
  for (const p of (showCombat ? gs.projectiles : [])) {
    ctx.strokeStyle = p.laser ? 'rgba(255,80,80,0.85)' : 'rgba(255,220,80,0.85)';
    ctx.lineWidth   = p.laser ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(p.x  - cam.x * cs, p.y  - cam.y * cs);
    ctx.lineTo(p.tx - cam.x * cs, p.ty - cam.y * cs);
    ctx.stroke();
  }

  // Pending placement ghost (solid — locked position, awaiting direction + confirm)
  if (gs.pendingPlacement && gs.state === 'play') {
    const p   = gs.pendingPlacement;
    const def = EQ_DEF[p.tool];
    const sz  = (def?.size || 1) * cs;
    const px  = Math.round((p.x - cam.x) * cs);
    const py  = Math.round((p.y - cam.y) * cs);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = def?.color || '#555';
    ctx.fillRect(px + 2, py + 2, sz - 4, sz - 4);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(232,160,40,0.95)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.strokeRect(px + 1, py + 1, sz - 2, sz - 2);
    drawDirArrow(ctx, px, py, sz, p.dir);
  } else if (gs.hover && gs.selectedTool && gs.state === 'play') {
    // Hover ghost (dashed — preview)
    const { hx, hy } = gs.hover;
    const def   = EQ_DEF[gs.selectedTool];
    const cellSz = def?.size || 1;
    const sz    = cellSz * cs;
    const px    = Math.round((hx - cam.x) * cs);
    const py    = Math.round((hy - cam.y) * cs);
    const valid = isHoverPlacementValid(gs, hx, hy, gs.selectedTool);
    ctx.strokeStyle = valid ? 'rgba(232,150,40,0.88)' : 'rgba(200,70,70,0.88)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(px + 1, py + 1, sz - 2, sz - 2);
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = valid ? (def?.color || '#555') : '#aa2020';
    ctx.fillRect(px + 2, py + 2, sz - 4, sz - 4);
    ctx.globalAlpha = 1;
  }
}

// ── Equipment body drawing ──────────────────────────────
function drawEquipmentBody(ctx, cell, px, py, cs, sz, gs) {
  const eq  = cell.equipment;
  const def = EQ_DEF[eq.type];
  const t   = eq.type;

  // State assessment
  const isActive     = eq.timer > 0 || !!eq.inputItem || !!eq.crafting || (eq.outQueue?.length > 0);
  const hasPowerIssue = def.powerCost > 0 && (gs.power || 0) < def.powerCost;

  // Background
  ctx.fillStyle = def.color || '#333';
  ctx.fillRect(px + 1, py + 1, sz - 2, sz - 2);

  // Border — colour-coded by state
  const borderColor = hasPowerIssue ? '#7a2222'
    : isActive ? shadeColor(def.color || '#333', 75)
    : shadeColor(def.color || '#333', 28);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(px + 1, py + 1, sz - 2, sz - 2);

  const cx = px + sz / 2, cy = py + sz / 2;

  // Per-type custom shapes
  if      (t === C.EQ.MINER)        drawMiner(ctx, px, py, cs);
  else if (t === C.EQ.CONVEYOR)     drawConveyor(ctx, px, py, cs, eq.dir);
  else if (t === C.EQ.WALL)         drawWall(ctx, cell, px, py, cs, gs);
  else if (t === C.EQ.OIL_PUMP)     drawOilPump(ctx, px, py, cs);
  else if (t === C.EQ.WATER_PUMP)   drawWaterPump(ctx, px, py, cs);
  else if (t === C.EQ.FURNACE)      drawFurnace(ctx, px, py, sz);
  else if (t === C.EQ.ASSEMBLER)    drawAssembler(ctx, px, py, sz);
  else if (t === C.EQ.TURRET)       drawTurret(ctx, px, py, sz);
  else if (t === C.EQ.LASER)        drawLaser(ctx, px, py, sz);
  else if (t === C.EQ.GENERATOR)    drawGenerator(ctx, px, py, sz);
  else if (t === C.EQ.COKE_OVEN)    drawCokeOven(ctx, px, py, sz);
  else if (t === C.EQ.DISTILLATION) drawDistillation(ctx, px, py, sz);
  else if (t === C.EQ.CHEM_PLANT)   drawChemPlant(ctx, px, py, sz);
  else if (t === C.EQ.ELECTROLYZER) drawElectrolyzer(ctx, px, py, sz);
  else if (t === C.EQ.ADV_ASSEMBLER)drawAdvAssembler(ctx, px, py, sz);
  else if (t === C.EQ.EXTRACTOR)    drawExtractor(ctx, cell, px, py, cs);
  else if (t === C.EQ.INSERTER)     drawInserter(ctx, cell, px, py, cs);

  // Recipe icon
  if ((t === C.EQ.CHEM_PLANT || t === C.EQ.ADV_ASSEMBLER) && eq.recipeIdx !== undefined) {
    const r = EQ_DEF[t].recipes[eq.recipeIdx];
    if (r) {
      ctx.font = '11px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(r.icon, cx, py + 13);
      ctx.textAlign = 'left';
    }
  }

  // Progress bars
  const maxFurnace = gs.upgrades.furnaceSpeed || 180;
  if (t === C.EQ.FURNACE && eq.inputItem)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / maxFurnace, '#d06828');

  const maxAssembler = gs.upgrades.assemblerSpeed || 240;
  if (t === C.EQ.ASSEMBLER && eq.crafting)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / maxAssembler, '#28b858');

  const maxChem = gs.upgrades.chemSpeed || 240;
  if (t === C.EQ.CHEM_PLANT && eq.timer > 0)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / maxChem, '#38b890');

  if (t === C.EQ.ADV_ASSEMBLER && eq.timer > 0)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / (gs.upgrades.assemblerSpeed || 300), '#30d880');

  if (t === C.EQ.DISTILLATION && eq.timer > 0)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / 200, '#70b890');

  if (t === C.EQ.COKE_OVEN && eq.timer > 0)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / 150, '#b06028');

  if (t === C.EQ.GENERATOR && eq.timer > 0)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / 300, '#2890d8');

  // Status dot (top-right corner)
  const dotColor = hasPowerIssue ? '#c84040' : isActive ? '#48c068' : '#28241e';
  ctx.fillStyle = dotColor;
  ctx.beginPath();
  ctx.arc(px + sz - 5, py + 5, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ── Shape drawing functions ────────────────────────────

function drawMiner(ctx, px, py, cs) {
  ctx.fillStyle = '#5878a0';
  ctx.fillRect(px + cs/2 - 2, py + 5, 4, cs - 10);
  ctx.fillStyle = '#7898b8';
  ctx.fillRect(px + 5, py + 6, cs - 10, 5);
  ctx.fillRect(px + cs - 10, py + 5, 6, 8);
  ctx.fillStyle = '#98b8d8';
  ctx.beginPath();
  ctx.arc(px + cs/2, py + cs - 8, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawConveyor(ctx, px, py, cs, dir) {
  ctx.strokeStyle = 'rgba(90,110,140,0.55)';
  ctx.lineWidth = 1;
  const offsets = [-5, 0, 5];
  for (const o of offsets) {
    ctx.beginPath();
    if (dir === 0 || dir === 2) {
      ctx.moveTo(px + 3, py + cs/2 + o);
      ctx.lineTo(px + cs - 3, py + cs/2 + o);
    } else {
      ctx.moveTo(px + cs/2 + o, py + 3);
      ctx.lineTo(px + cs/2 + o, py + cs - 3);
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#9ab0c8';
  ctx.save();
  ctx.translate(px + cs/2, py + cs/2);
  ctx.rotate(dir * Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(6, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawWall(ctx, cell, px, py, cs, gs) {
  const maxHp = EQ_DEF.wall.hp * (gs.gearFlags?.eraArmor ? 3 : 1);
  const ratio = Math.max(0, Math.min(1, (cell.equipment?.hp || 0) / maxHp));
  const r = Math.floor(90 * ratio + 45), g = Math.floor(70 * ratio + 30), b = Math.floor(55 * ratio + 22);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);
  ctx.strokeStyle = '#14100a';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(px + 2, py + 2, cs/2 - 3, cs/2 - 3);
  ctx.strokeRect(px + cs/2 + 1, py + 2, cs/2 - 3, cs/2 - 3);
  ctx.strokeRect(px + 2, py + cs/2 + 1, cs/2 - 3, cs/2 - 3);
  ctx.strokeRect(px + cs/2 + 1, py + cs/2 + 1, cs/2 - 3, cs/2 - 3);
  // HP bar
  ctx.fillStyle = ratio > 0.6 ? '#58b048' : ratio > 0.3 ? '#c89030' : '#c04040';
  ctx.fillRect(px + 2, py + 2, (cs - 4) * ratio, 3);
}

function drawOilPump(ctx, px, py, cs) {
  ctx.fillStyle = '#485898';
  ctx.fillRect(px + cs/2 - 2, py + cs/2, 4, cs/2 - 5);
  ctx.fillRect(px + 5, py + cs/2 - 3, cs - 10, 5);
  ctx.fillStyle = '#283050';
  ctx.beginPath();
  ctx.arc(px + cs/2, py + cs/2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#384898';
  ctx.beginPath();
  ctx.arc(px + cs/2, py + 8, 4, Math.PI, Math.PI * 2);
  ctx.lineTo(px + cs/2 + 4, py + 8);
  ctx.fill();
}

function drawWaterPump(ctx, px, py, cs) {
  ctx.fillStyle = '#2068a8';
  ctx.beginPath();
  ctx.arc(px + cs/2, py + cs/2, cs/2 - 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4898c8';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(px + cs/2, py + cs/2 + i * 3 - 2, 4 + i * 2, 0, Math.PI);
    ctx.stroke();
  }
}

function drawFurnace(ctx, px, py, sz) {
  ctx.fillStyle = '#4a3520';
  ctx.fillRect(px + 4, py + 4, sz - 8, sz - 8);
  const grad = ctx.createRadialGradient(px+sz/2, py+sz*0.6, 2, px+sz/2, py+sz*0.6, sz*0.38);
  grad.addColorStop(0, 'rgba(255,150,40,0.92)');
  grad.addColorStop(0.5, 'rgba(200,70,10,0.65)');
  grad.addColorStop(1, 'rgba(100,20,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(px + 4, py + 4, sz - 8, sz - 8);
  ctx.fillStyle = '#302010';
  ctx.fillRect(px + sz*0.36, py + 2, sz*0.13, sz*0.25);
  ctx.fillRect(px + sz*0.52, py + 2, sz*0.13, sz*0.25);
  ctx.fillStyle = '#f09040';
  ctx.fillRect(px + sz*0.28, py + sz*0.44, sz*0.44, sz*0.36);
  ctx.fillStyle = '#ffe080';
  ctx.fillRect(px + sz*0.36, py + sz*0.5, sz*0.28, sz*0.24);
}

function drawAssembler(ctx, px, py, sz) {
  const cx = px + sz/2, cy = py + sz/2;
  ctx.strokeStyle = '#3a9060';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#50b878';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.fillRect(cx + Math.cos(a)*sz*0.30 - 2, cy + Math.sin(a)*sz*0.30 - 2, 4, 4);
  }
  ctx.fillStyle = '#203c30';
  ctx.beginPath(); ctx.arc(cx, cy, sz*0.17, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#60d890';
  ctx.beginPath(); ctx.arc(cx, cy, sz*0.07, 0, Math.PI*2); ctx.fill();
}

function drawTurret(ctx, px, py, sz) {
  const cx = px + sz/2, cy = py + sz/2;
  ctx.fillStyle = '#404830';
  ctx.fillRect(px + sz*0.18, py + sz*0.18, sz*0.64, sz*0.64);
  ctx.fillStyle = '#505c38';
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a9050';
  ctx.fillRect(cx, cy - 3, sz*0.32, 6);
  ctx.fillRect(cx + sz*0.26, cy - 4, sz*0.08, 8);
  ctx.strokeStyle = '#a0b870';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.13, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLaser(ctx, px, py, sz) {
  const cx = px + sz/2, cy = py + sz/2;
  ctx.fillStyle = '#2e1028';
  ctx.fillRect(px + sz*0.14, py + sz*0.14, sz*0.72, sz*0.72);
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, sz*0.30);
  grad.addColorStop(0, 'rgba(255,100,100,0.95)');
  grad.addColorStop(0.4, 'rgba(180,30,80,0.7)');
  grad.addColorStop(1, 'rgba(80,0,30,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, sz*0.30, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,80,80,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - sz*0.38, cy); ctx.lineTo(px + 2, cy);
  ctx.moveTo(cx + sz*0.38, cy); ctx.lineTo(px + sz - 2, cy);
  ctx.moveTo(cx, cy - sz*0.38); ctx.lineTo(cx, py + 2);
  ctx.moveTo(cx, cy + sz*0.38); ctx.lineTo(cx, py + sz - 2);
  ctx.stroke();
  ctx.fillStyle = '#f05050';
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI*2); ctx.fill();
}

function drawGenerator(ctx, px, py, sz) {
  const cx = px + sz/2, cy = py + sz/2;
  ctx.fillStyle = '#203c30';
  ctx.fillRect(px + 4, py + 4, sz - 8, sz - 8);
  ctx.fillStyle = '#306650';
  ctx.fillRect(px + sz*0.1, py + 2, sz*0.15, sz*0.3);
  ctx.fillStyle = '#30d8f8';
  ctx.beginPath();
  ctx.moveTo(cx + sz*0.08, py + sz*0.2);
  ctx.lineTo(cx - sz*0.08, cy);
  ctx.lineTo(cx + sz*0.04, cy);
  ctx.lineTo(cx - sz*0.1, py + sz*0.8);
  ctx.lineTo(cx + sz*0.12, cy + sz*0.05);
  ctx.lineTo(cx, cy + sz*0.05);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#30a0f0';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, sz*0.12, 0, Math.PI*2); ctx.stroke();
}

function drawCokeOven(ctx, px, py, sz) {
  ctx.fillStyle = '#221408';
  ctx.fillRect(px + 3, py + 3, sz - 6, sz - 6);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#3c3820';
    ctx.fillRect(px + 5 + i * (sz-10)/4, py + 3, (sz-10)/4 - 1, sz*0.15);
  }
  const grad = ctx.createLinearGradient(px, py + sz*0.5, px, py + sz);
  grad.addColorStop(0, 'rgba(180,70,10,0)');
  grad.addColorStop(1, 'rgba(220,110,20,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(px + 3, py + sz*0.48, sz - 6, sz*0.48);
  ctx.fillStyle = '#584020';
  ctx.strokeStyle = '#806040';
  ctx.lineWidth = 1;
  ctx.fillRect(px + sz*0.2, py + sz*0.3, sz*0.6, sz*0.35);
  ctx.strokeRect(px + sz*0.2, py + sz*0.3, sz*0.6, sz*0.35);
  ctx.fillStyle = '#f09040';
  ctx.fillRect(px + sz*0.28, py + sz*0.36, sz*0.44, sz*0.23);
}

function drawDistillation(ctx, px, py, sz) {
  ctx.fillStyle = '#404c40';
  ctx.fillRect(px + sz*0.36, py + 3, sz*0.28, sz - 6);
  ctx.fillStyle = '#507050';
  for (let i = 0; i < 4; i++)
    ctx.fillRect(px + sz*0.30, py + sz*0.15 + i * sz*0.17, sz*0.40, 3);
  ctx.fillStyle = '#346044';
  ctx.beginPath();
  ctx.arc(px + sz*0.50, py + sz*0.15, sz*0.17, Math.PI, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = '#507858';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px + sz*0.36, py + sz*0.3);
  ctx.lineTo(px + sz*0.1,  py + sz*0.3);
  ctx.lineTo(px + sz*0.1,  py + sz*0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px + sz*0.64, py + sz*0.55);
  ctx.lineTo(px + sz*0.9,  py + sz*0.55);
  ctx.stroke();
}

function drawChemPlant(ctx, px, py, sz) {
  const cx = px + sz/2;
  ctx.fillStyle = '#2a4830';
  ctx.beginPath();
  ctx.moveTo(cx - sz*0.2, py + sz*0.3);
  ctx.lineTo(px + sz*0.1, py + sz*0.85);
  ctx.lineTo(px + sz*0.9, py + sz*0.85);
  ctx.lineTo(cx + sz*0.2, py + sz*0.3);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a4830';
  ctx.fillRect(cx - sz*0.1, py + sz*0.1, sz*0.2, sz*0.22);
  const grad = ctx.createLinearGradient(px, py + sz*0.5, px, py + sz*0.85);
  grad.addColorStop(0, 'rgba(40,190,130,0.65)');
  grad.addColorStop(1, 'rgba(20,130,80,0.85)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - sz*0.12, py + sz*0.56);
  ctx.lineTo(px + sz*0.14, py + sz*0.83);
  ctx.lineTo(px + sz*0.86, py + sz*0.83);
  ctx.lineTo(cx + sz*0.12, py + sz*0.56);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#58b888';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - sz*0.2, py + sz*0.3);
  ctx.lineTo(px + sz*0.1, py + sz*0.85);
  ctx.lineTo(px + sz*0.9, py + sz*0.85);
  ctx.lineTo(cx + sz*0.2, py + sz*0.3);
  ctx.stroke();
  ctx.strokeRect(cx - sz*0.1, py + sz*0.1, sz*0.2, sz*0.22);
}

function drawElectrolyzer(ctx, px, py, sz) {
  const cx = px + sz/2;
  ctx.fillStyle = '#182030';
  ctx.fillRect(px + sz*0.1, py + sz*0.2, sz*0.8, sz*0.65);
  ctx.strokeStyle = '#3050a8';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + sz*0.1, py + sz*0.2, sz*0.8, sz*0.65);
  const grad = ctx.createLinearGradient(px, py + sz*0.5, px, py + sz*0.85);
  grad.addColorStop(0, 'rgba(40,120,210,0.4)');
  grad.addColorStop(1, 'rgba(20,80,170,0.75)');
  ctx.fillStyle = grad;
  ctx.fillRect(px + sz*0.12, py + sz*0.42, sz*0.76, sz*0.41);
  ctx.fillStyle = '#a8a8ff';
  ctx.fillRect(cx - sz*0.22, py + sz*0.12, sz*0.08, sz*0.56);
  ctx.fillRect(cx + sz*0.14, py + sz*0.12, sz*0.08, sz*0.56);
  ctx.fillStyle = 'rgba(200,220,255,0.65)';
  ctx.beginPath(); ctx.arc(cx - sz*0.18, py + sz*0.5, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + sz*0.18, py + sz*0.45, 2, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#6070f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - sz*0.2, py + sz*0.14);
  ctx.lineTo(cx,           py + sz*0.06);
  ctx.lineTo(cx + sz*0.2, py + sz*0.14);
  ctx.stroke();
}

function drawAdvAssembler(ctx, px, py, sz) {
  const cx = px + sz/2, cy = py + sz/2;
  ctx.fillStyle = '#182820';
  ctx.fillRect(px + 3, py + 3, sz - 6, sz - 6);
  ctx.strokeStyle = '#40f0a0';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 3, py + 3, sz - 6, sz - 6);
  ctx.strokeStyle = '#30b070';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, sz*0.28, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = '#40c080';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillRect(cx + Math.cos(a)*sz*0.28 - 2, cy + Math.sin(a)*sz*0.28 - 2, 4, 4);
  }
  ctx.fillStyle = '#205040';
  ctx.beginPath(); ctx.arc(cx, cy, sz*0.14, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#40f0a0';
  ctx.beginPath(); ctx.arc(cx, cy, sz*0.06, 0, Math.PI*2); ctx.fill();
  const corners = [[px+8,py+8],[px+sz-8,py+8],[px+8,py+sz-8],[px+sz-8,py+sz-8]];
  for (const [x,y] of corners) {
    ctx.fillStyle = '#306050';
    ctx.fillRect(x-3, y-3, 6, 6);
  }
}

// ── Helpers ──────────────────────────────────────────────

function drawProgressBar(ctx, px, py, sz, progress, color) {
  ctx.fillStyle = color;
  ctx.fillRect(px + 2, py + sz - 5, (sz - 4) * Math.max(0, Math.min(1, progress)), 3);
}

function isHoverPlacementValid(gs, hx, hy, tool) {
  const def = EQ_DEF[tool];
  if (!def || def.unlocked === false) return false;
  if (def.place === 'mission' && gs.view !== 'mission') return false;
  if (def.place === 'factory' && gs.view !== 'factory') return false;
  const sz = def.size || 1;
  for (let dy = 0; dy < sz; dy++) {
    for (let dx = 0; dx < sz; dx++) {
      const fx = hx + dx, fy = hy + dy;
      if (!inBounds(fx, fy)) return false;
      const fc = gs.map.grid[fy][fx];
      if (fc.terrain === C.CORE) return false;
      if (fc.equipment) return false;
    }
  }
  if (!inBounds(hx, hy)) return false;
  const cell = gs.map.grid[hy][hx];
  if (tool === C.EQ.MINER    && !(def.validTerrain?.includes(cell.terrain))) return false;
  if (tool === C.EQ.OIL_PUMP && cell.terrain !== C.OIL_WELL) return false;
  return true;
}

function drawDirArrow(ctx, px, py, sz, dir) {
  const cx = px + sz / 2, cy = py + sz / 2;
  ctx.fillStyle = 'rgba(255,220,80,0.9)';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(dir * Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(sz * 0.22, 0);
  ctx.lineTo(-sz * 0.12, -sz * 0.12);
  ctx.lineTo(-sz * 0.12,  sz * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawExtractor(ctx, cell, px, py, cs) {
  const cx = px + cs / 2, cy = py + cs / 2;
  ctx.fillStyle = '#5a7030';
  ctx.fillRect(px + 4, py + 4, cs - 8, cs - 8);
  // Arrow showing output direction
  drawDirArrow(ctx, px, py, cs, cell.equipment.dir);
  // Selected item indicator
  const item = cell.equipment.selectedItem;
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = item ? '#ffffff' : '#999999';
  ctx.fillText(item ? (RES_NAMES[item]?.slice(0, 3) || '?') : '---', cx, cy + 3);
  ctx.textAlign = 'left';
}

function drawInserter(ctx, cell, px, py, cs) {
  const cx = px + cs / 2, cy = py + cs / 2;
  ctx.fillStyle = '#305060';
  ctx.fillRect(px + 4, py + 4, cs - 8, cs - 8);
  // Arrow showing input direction (from which conveyor it reads)
  drawDirArrow(ctx, px, py, cs, cell.equipment.dir);
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#88ccee';
  ctx.fillText('IN', cx, cy + 3);
  ctx.textAlign = 'left';
}

function shadeColor(hex, amount) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + amount);
  const g = Math.min(255, ((n >> 8)  & 0xff) + amount);
  const b = Math.min(255, (n         & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

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
    }
  }

  // Pass 2: Equipment (root cells only, full footprint)
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

  // Pass 3: Items + overlays
  for (let gy = startY; gy < endY; gy++) {
    for (let gx = startX; gx < endX; gx++) {
      const cell = gs.map.grid[gy][gx];
      const px   = Math.round((gx - cam.x) * cs);
      const py   = Math.round((gy - cam.y) * cs);
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
    const def = EQ_DEF[gs.selectedTool];
    const sz  = def?.size || 1;
    const px  = Math.round((hx - cam.x) * cs);
    const py  = Math.round((hy - cam.y) * cs);
    ctx.strokeStyle = '#ff6b35';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, cs * sz - 2, cs * sz - 2);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = def?.color || '#555';
    ctx.fillRect(px + 2, py + 2, cs * sz - 4, cs * sz - 4);
    ctx.globalAlpha = 1;
  }

  drawMinimap(ctx, canvas, gs);
}

// ── Minimap ──────────────────────────────────────────────
function drawMinimap(ctx, canvas, gs) {
  const mw = C.COLS, mh = C.ROWS;
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
      if (cell.equipment && cell.equipment.type !== '_occ') {
        r = Math.min(255, r + 90); g = Math.min(255, g + 90); b = Math.min(255, b + 90);
      }
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

  const cam = gs.cam || { x: 0, y: 0 };
  const vw  = Math.ceil(canvas.width  / C.CELL);
  const vh  = Math.ceil(canvas.height / C.CELL);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + cam.x, my + cam.y, vw, vh);
}

// ── Equipment body drawing ──────────────────────────────
function drawEquipmentBody(ctx, cell, px, py, cs, sz, gs) {
  const eq  = cell.equipment;
  const def = EQ_DEF[eq.type];
  const t   = eq.type;

  // background panel
  ctx.fillStyle = def.color || '#333';
  ctx.fillRect(px + 1, py + 1, sz - 2, sz - 2);

  // border
  ctx.strokeStyle = shadeColor(def.color || '#333', 60);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 1, py + 1, sz - 2, sz - 2);

  const cx = px + sz / 2, cy = py + sz / 2;

  // ── per-type custom shapes ────────────────────────────
  if (t === C.EQ.MINER) {
    drawMiner(ctx, px, py, cs);
  } else if (t === C.EQ.CONVEYOR) {
    drawConveyor(ctx, px, py, cs, eq.dir);
  } else if (t === C.EQ.WALL) {
    drawWall(ctx, cell, px, py, cs, gs);
  } else if (t === C.EQ.OIL_PUMP) {
    drawOilPump(ctx, px, py, cs);
  } else if (t === C.EQ.WATER_PUMP) {
    drawWaterPump(ctx, px, py, cs);
  } else if (t === C.EQ.FURNACE) {
    drawFurnace(ctx, px, py, sz);
  } else if (t === C.EQ.ASSEMBLER) {
    drawAssembler(ctx, px, py, sz);
  } else if (t === C.EQ.TURRET) {
    drawTurret(ctx, px, py, sz);
  } else if (t === C.EQ.LASER) {
    drawLaser(ctx, px, py, sz);
  } else if (t === C.EQ.GENERATOR) {
    drawGenerator(ctx, px, py, sz);
  } else if (t === C.EQ.COKE_OVEN) {
    drawCokeOven(ctx, px, py, sz);
  } else if (t === C.EQ.DISTILLATION) {
    drawDistillation(ctx, px, py, sz);
  } else if (t === C.EQ.CHEM_PLANT) {
    drawChemPlant(ctx, px, py, sz);
  } else if (t === C.EQ.ELECTROLYZER) {
    drawElectrolyzer(ctx, px, py, sz);
  } else if (t === C.EQ.ADV_ASSEMBLER) {
    drawAdvAssembler(ctx, px, py, sz);
  }

  // recipe icon for chem_plant / adv_assembler
  if ((t === C.EQ.CHEM_PLANT || t === C.EQ.ADV_ASSEMBLER) && eq.recipeIdx !== undefined) {
    const r = EQ_DEF[t].recipes[eq.recipeIdx];
    if (r) {
      ctx.font = '11px serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(r.icon, cx, py + 13);
      ctx.textAlign = 'left';
    }
  }

  // progress bars (bottom edge)
  const maxFurnace = gs.upgrades.furnaceSpeed || 180;
  if (t === C.EQ.FURNACE && eq.inputItem)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / maxFurnace, '#ff6622');

  const maxAssembler = gs.upgrades.assemblerSpeed || 240;
  if (t === C.EQ.ASSEMBLER && eq.crafting)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / maxAssembler, '#22cc66');

  const maxChem = gs.upgrades.chemSpeed || 240;
  if (t === C.EQ.CHEM_PLANT && eq.timer > 0)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / maxChem, '#44ccaa');

  if (t === C.EQ.ADV_ASSEMBLER && eq.timer > 0)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / (gs.upgrades.assemblerSpeed || 300), '#44ffaa');

  if (t === C.EQ.DISTILLATION && eq.timer > 0)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / 200, '#88ccaa');

  if (t === C.EQ.COKE_OVEN && eq.timer > 0)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / 150, '#cc7733');

  if (t === C.EQ.GENERATOR && eq.timer > 0)
    drawProgressBar(ctx, px, py, sz, 1 - eq.timer / 300, '#33aaff');

  // low-power indicator
  if (def.powerCost > 0 && (gs.power || 0) < def.powerCost) {
    ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4444';
    ctx.fillText('⚡✗', cx, py + sz - 6);
    ctx.textAlign = 'left';
  }
}

// ── Shape drawing functions ────────────────────────────

function drawMiner(ctx, px, py, cs) {
  // pickaxe silhouette
  ctx.fillStyle = '#6688aa';
  ctx.fillRect(px + cs/2 - 2, py + 5, 4, cs - 10);
  ctx.fillStyle = '#88aacc';
  ctx.fillRect(px + 5, py + 6, cs - 10, 5);
  ctx.fillRect(px + cs - 10, py + 5, 6, 8);
  // ore dot
  ctx.fillStyle = '#aaccee';
  ctx.beginPath();
  ctx.arc(px + cs/2, py + cs - 8, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawConveyor(ctx, px, py, cs, dir) {
  // belt lines
  ctx.strokeStyle = '#4466aa';
  ctx.lineWidth = 1;
  const offsets = [-5, 0, 5];
  for (const o of offsets) {
    ctx.beginPath();
    if (dir === 0 || dir === 2) { // horizontal
      ctx.moveTo(px + 3, py + cs/2 + o);
      ctx.lineTo(px + cs - 3, py + cs/2 + o);
    } else { // vertical
      ctx.moveTo(px + cs/2 + o, py + 3);
      ctx.lineTo(px + cs/2 + o, py + cs - 3);
    }
    ctx.stroke();
  }
  // arrow
  ctx.fillStyle = '#aaccff';
  ctx.save();
  ctx.translate(px + cs/2, py + cs/2);
  ctx.rotate(dir * Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawWall(ctx, cell, px, py, cs, gs) {
  const maxHp = EQ_DEF.wall.hp * (gs.gearFlags?.eraArmor ? 3 : 1);
  const ratio = Math.max(0, Math.min(1, (cell.equipment?.hp || 0) / maxHp));
  // brick pattern
  const brickColor = `rgb(${Math.floor(120*ratio+30)},${Math.floor(80*ratio+20)},${Math.floor(60*ratio+15)})`;
  ctx.fillStyle = brickColor;
  ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4);
  ctx.strokeStyle = '#221100';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 2, py + 2, cs/2 - 3, cs/2 - 3);
  ctx.strokeRect(px + cs/2 + 1, py + 2, cs/2 - 3, cs/2 - 3);
  ctx.strokeRect(px + 2, py + cs/2 + 1, cs/2 - 3, cs/2 - 3);
  ctx.strokeRect(px + cs/2 + 1, py + cs/2 + 1, cs/2 - 3, cs/2 - 3);
  // hp bar
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(px + 2, py + 2, (cs - 4) * ratio, 3);
}

function drawOilPump(ctx, px, py, cs) {
  // pump jack silhouette
  ctx.fillStyle = '#5566aa';
  ctx.fillRect(px + cs/2 - 2, py + cs/2, 4, cs/2 - 5);  // leg
  ctx.fillRect(px + 5, py + cs/2 - 3, cs - 10, 5);       // beam
  ctx.fillStyle = '#333355';
  ctx.beginPath();
  ctx.arc(px + cs/2, py + cs/2, 4, 0, Math.PI * 2);
  ctx.fill();
  // drop
  ctx.fillStyle = '#4455aa';
  ctx.beginPath();
  ctx.arc(px + cs/2, py + 8, 4, Math.PI, Math.PI * 2);
  ctx.lineTo(px + cs/2 + 4, py + 8);
  ctx.fill();
}

function drawWaterPump(ctx, px, py, cs) {
  ctx.fillStyle = '#2266aa';
  ctx.beginPath();
  ctx.arc(px + cs/2, py + cs/2, cs/2 - 5, 0, Math.PI * 2);
  ctx.fill();
  // water ripple lines
  ctx.strokeStyle = '#4499cc';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(px + cs/2, py + cs/2 + i * 3 - 2, 4 + i * 2, 0, Math.PI);
    ctx.stroke();
  }
}

function drawFurnace(ctx, px, py, sz) {
  // furnace body
  ctx.fillStyle = '#443322';
  ctx.fillRect(px + 4, py + 4, sz - 8, sz - 8);
  // fire glow
  const grad = ctx.createRadialGradient(px+sz/2, py+sz*0.6, 2, px+sz/2, py+sz*0.6, sz*0.35);
  grad.addColorStop(0, 'rgba(255,140,0,0.9)');
  grad.addColorStop(0.5, 'rgba(200,60,0,0.6)');
  grad.addColorStop(1, 'rgba(100,20,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(px + 4, py + 4, sz - 8, sz - 8);
  // chimney
  ctx.fillStyle = '#332211';
  ctx.fillRect(px + sz*0.35, py + 2, sz*0.13, sz*0.25);
  ctx.fillRect(px + sz*0.52, py + 2, sz*0.13, sz*0.25);
  // opening
  ctx.fillStyle = '#ff8833';
  ctx.fillRect(px + sz*0.3, py + sz*0.45, sz*0.4, sz*0.35);
  ctx.fillStyle = '#ffcc44';
  ctx.fillRect(px + sz*0.38, py + sz*0.5, sz*0.24, sz*0.22);
}

function drawAssembler(ctx, px, py, sz) {
  const cx = px + sz/2, cy = py + sz/2;
  // gear outer ring
  ctx.strokeStyle = '#337755';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.32, 0, Math.PI * 2);
  ctx.stroke();
  // gear teeth
  ctx.fillStyle = '#44aa77';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tx = cx + Math.cos(a) * sz*0.32;
    const ty = cy + Math.sin(a) * sz*0.32;
    ctx.fillRect(tx - 2, ty - 2, 4, 4);
  }
  // inner
  ctx.fillStyle = '#224433';
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#55cc88';
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawTurret(ctx, px, py, sz) {
  const cx = px + sz/2, cy = py + sz/2;
  // base plate
  ctx.fillStyle = '#445533';
  ctx.fillRect(px + sz*0.2, py + sz*0.2, sz*0.6, sz*0.6);
  // turret dome
  ctx.fillStyle = '#556644';
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.22, 0, Math.PI * 2);
  ctx.fill();
  // barrel pointing right (default)
  ctx.fillStyle = '#778855';
  ctx.fillRect(cx, cy - 3, sz*0.3, 6);
  ctx.fillRect(cx + sz*0.25, cy - 4, sz*0.08, 8);
  // ring
  ctx.strokeStyle = '#99aa66';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.14, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLaser(ctx, px, py, sz) {
  const cx = px + sz/2, cy = py + sz/2;
  // housing
  ctx.fillStyle = '#331122';
  ctx.fillRect(px + sz*0.15, py + sz*0.15, sz*0.7, sz*0.7);
  // emitter lens
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, sz*0.28);
  grad.addColorStop(0, 'rgba(255,80,80,0.95)');
  grad.addColorStop(0.4, 'rgba(180,30,80,0.7)');
  grad.addColorStop(1, 'rgba(80,0,30,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.28, 0, Math.PI * 2);
  ctx.fill();
  // targeting lines
  ctx.strokeStyle = 'rgba(255,60,60,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - sz*0.35, cy); ctx.lineTo(px + 2, cy);
  ctx.moveTo(cx + sz*0.35, cy); ctx.lineTo(px + sz - 2, cy);
  ctx.moveTo(cx, cy - sz*0.35); ctx.lineTo(cx, py + 2);
  ctx.moveTo(cx, cy + sz*0.35); ctx.lineTo(cx, py + sz - 2);
  ctx.stroke();
  // bright core
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawGenerator(ctx, px, py, sz) {
  const cx = px + sz/2, cy = py + sz/2;
  // body
  ctx.fillStyle = '#224433';
  ctx.fillRect(px + 4, py + 4, sz - 8, sz - 8);
  // exhaust pipe
  ctx.fillStyle = '#336655';
  ctx.fillRect(px + sz*0.1, py + 2, sz*0.15, sz*0.3);
  // lightning bolt
  ctx.fillStyle = '#33ddff';
  ctx.beginPath();
  ctx.moveTo(cx + sz*0.08, py + sz*0.2);
  ctx.lineTo(cx - sz*0.08, cy);
  ctx.lineTo(cx + sz*0.04, cy);
  ctx.lineTo(cx - sz*0.1, py + sz*0.8);
  ctx.lineTo(cx + sz*0.12, cy + sz*0.05);
  ctx.lineTo(cx, cy + sz*0.05);
  ctx.closePath();
  ctx.fill();
  // output indicator
  ctx.strokeStyle = '#33aaff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.12, 0, Math.PI * 2);
  ctx.stroke();
}

function drawCokeOven(ctx, px, py, sz) {
  // main body
  ctx.fillStyle = '#221100';
  ctx.fillRect(px + 3, py + 3, sz - 6, sz - 6);
  // top vents
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#444422';
    ctx.fillRect(px + 5 + i * (sz-10)/4, py + 3, (sz-10)/4 - 1, sz*0.15);
  }
  // ember glow at bottom
  const grad = ctx.createLinearGradient(px, py + sz*0.5, px, py + sz);
  grad.addColorStop(0, 'rgba(180,60,0,0)');
  grad.addColorStop(1, 'rgba(220,100,0,0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(px + 3, py + sz*0.5, sz - 6, sz*0.45);
  // loading door
  ctx.fillStyle = '#554422';
  ctx.strokeStyle = '#886644';
  ctx.lineWidth = 1;
  ctx.fillRect(px + sz*0.2, py + sz*0.3, sz*0.6, sz*0.35);
  ctx.strokeRect(px + sz*0.2, py + sz*0.3, sz*0.6, sz*0.35);
  ctx.fillStyle = '#ff8833';
  ctx.fillRect(px + sz*0.28, py + sz*0.36, sz*0.44, sz*0.23);
}

function drawDistillation(ctx, px, py, sz) {
  // tower column
  ctx.fillStyle = '#445544';
  ctx.fillRect(px + sz*0.35, py + 3, sz*0.3, sz - 6);
  // trays
  ctx.fillStyle = '#557755';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(px + sz*0.3, py + sz*0.15 + i * sz*0.17, sz*0.4, 3);
  }
  // top dome
  ctx.fillStyle = '#336644';
  ctx.beginPath();
  ctx.arc(px + sz*0.5, py + sz*0.15, sz*0.18, Math.PI, Math.PI * 2);
  ctx.fill();
  // pipes left/right
  ctx.strokeStyle = '#558866';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px + sz*0.35, py + sz*0.3);
  ctx.lineTo(px + sz*0.1, py + sz*0.3);
  ctx.lineTo(px + sz*0.1, py + sz*0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px + sz*0.65, py + sz*0.55);
  ctx.lineTo(px + sz*0.9, py + sz*0.55);
  ctx.stroke();
}

function drawChemPlant(ctx, px, py, sz) {
  const cx = px + sz/2;
  // flask body
  ctx.fillStyle = '#2a4433';
  ctx.beginPath();
  ctx.moveTo(cx - sz*0.2, py + sz*0.3);
  ctx.lineTo(px + sz*0.1, py + sz*0.85);
  ctx.lineTo(px + sz*0.9, py + sz*0.85);
  ctx.lineTo(cx + sz*0.2, py + sz*0.3);
  ctx.closePath();
  ctx.fill();
  // neck
  ctx.fillStyle = '#2a4433';
  ctx.fillRect(cx - sz*0.1, py + sz*0.1, sz*0.2, sz*0.22);
  // liquid
  const grad = ctx.createLinearGradient(px, py + sz*0.5, px, py + sz*0.85);
  grad.addColorStop(0, 'rgba(40,180,120,0.6)');
  grad.addColorStop(1, 'rgba(20,120,80,0.8)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - sz*0.12, py + sz*0.55);
  ctx.lineTo(px + sz*0.15, py + sz*0.83);
  ctx.lineTo(px + sz*0.85, py + sz*0.83);
  ctx.lineTo(cx + sz*0.12, py + sz*0.55);
  ctx.closePath();
  ctx.fill();
  // border
  ctx.strokeStyle = '#55aa88';
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
  // tank
  ctx.fillStyle = '#1a2233';
  ctx.fillRect(px + sz*0.1, py + sz*0.2, sz*0.8, sz*0.65);
  ctx.strokeStyle = '#3344aa';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + sz*0.1, py + sz*0.2, sz*0.8, sz*0.65);
  // water level
  const grad = ctx.createLinearGradient(px, py + sz*0.5, px, py + sz*0.85);
  grad.addColorStop(0, 'rgba(40,120,200,0.4)');
  grad.addColorStop(1, 'rgba(20,80,160,0.7)');
  ctx.fillStyle = grad;
  ctx.fillRect(px + sz*0.12, py + sz*0.42, sz*0.76, sz*0.41);
  // electrode rods
  ctx.fillStyle = '#aaaaff';
  ctx.fillRect(cx - sz*0.22, py + sz*0.12, sz*0.08, sz*0.55);
  ctx.fillRect(cx + sz*0.14, py + sz*0.12, sz*0.08, sz*0.55);
  // bubbles hint
  ctx.fillStyle = 'rgba(200,220,255,0.6)';
  ctx.beginPath(); ctx.arc(cx - sz*0.18, py + sz*0.5, 3, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + sz*0.18, py + sz*0.45, 2, 0, Math.PI*2); ctx.fill();
  // top label
  ctx.strokeStyle = '#6677ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - sz*0.2, py + sz*0.14);
  ctx.lineTo(cx, py + sz*0.06);
  ctx.lineTo(cx + sz*0.2, py + sz*0.14);
  ctx.stroke();
}

function drawAdvAssembler(ctx, px, py, sz) {
  const cx = px + sz/2, cy = py + sz/2;
  // outer frame
  ctx.fillStyle = '#1a2a22';
  ctx.fillRect(px + 3, py + 3, sz - 6, sz - 6);
  ctx.strokeStyle = '#44ffaa';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 3, py + 3, sz - 6, sz - 6);
  // large center gear
  ctx.strokeStyle = '#33bb77';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.28, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillStyle = '#44cc88';
    const tx = cx + Math.cos(a) * sz*0.28;
    const ty = cy + Math.sin(a) * sz*0.28;
    ctx.fillRect(tx - 2, ty - 2, 4, 4);
  }
  // inner hub
  ctx.fillStyle = '#225544';
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#44ffaa';
  ctx.beginPath();
  ctx.arc(cx, cy, sz*0.06, 0, Math.PI * 2);
  ctx.fill();
  // corner decorations
  const corners = [[px+8,py+8],[px+sz-8,py+8],[px+8,py+sz-8],[px+sz-8,py+sz-8]];
  for (const [x,y] of corners) {
    ctx.fillStyle = '#336655';
    ctx.fillRect(x-3, y-3, 6, 6);
  }
}

// ── Helpers ──────────────────────────────────────────────

function drawProgressBar(ctx, px, py, sz, progress, color) {
  ctx.fillStyle = color;
  ctx.fillRect(px + 2, py + sz - 5, (sz - 4) * Math.max(0, Math.min(1, progress)), 3);
}

function shadeColor(hex, amount) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + amount);
  const g = Math.min(255, ((n >> 8)  & 0xff) + amount);
  const b = Math.min(255, (n         & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

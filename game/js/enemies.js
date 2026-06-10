// ── Flow Field (BFS from core outward) ────────────────────
function computeFlowField(gs) {
  const rows = C.ROWS, cols = C.COLS;
  const field = [];
  for (let y = 0; y < rows; y++) field[y] = new Int8Array(cols).fill(-1);

  // Use a flat queue stored as interleaved [x,y] pairs
  const q = new Int32Array(rows * cols * 2);
  let head = 0, tail = 0;

  // Seed all 9 core cells (value 4 = "at core")
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) {
      const cx = C.CORE_X + dx, cy = C.CORE_Y + dy;
      field[cy][cx] = 4;
      q[tail++] = cx; q[tail++] = cy;
    }
  }

  while (head < tail) {
    const x = q[head++], y = q[head++];
    for (let d = 0; d < 4; d++) {
      const nx = x + C.DIR_VEC[d].x, ny = y + C.DIR_VEC[d].y;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (field[ny][nx] !== -1) continue;
      if (gs.map.grid[ny][nx].equipment?.type === C.EQ.WALL) continue;
      field[ny][nx] = (d + 2) & 3; // opposite direction = toward (x,y) = toward core
      q[tail++] = nx; q[tail++] = ny;
    }
  }

  gs.flowField = field;
  gs.flowFieldDirty = false;
}

// ── Spawn Point Generation ────────────────────────────────
function generateSpawnPoints(gs) {
  const count = 1 + Math.floor(Math.random() * 3);
  const points = [];
  const used = new Set();

  for (let i = 0; i < count; i++) {
    let px, py, tries = 0;
    do {
      const edge = Math.floor(Math.random() * 4);
      if      (edge === 0) { px = Math.floor(Math.random() * C.COLS); py = 0; }
      else if (edge === 1) { px = Math.floor(Math.random() * C.COLS); py = C.ROWS - 1; }
      else if (edge === 2) { px = 0;          py = Math.floor(Math.random() * C.ROWS); }
      else                 { px = C.COLS - 1; py = Math.floor(Math.random() * C.ROWS); }
      tries++;
    } while (used.has(`${px},${py}`) && tries < 50);
    used.add(`${px},${py}`);
    points.push({ x: px, y: py });
  }

  gs.spawnPoints = points;
}

// ── Wave Spawning ─────────────────────────────────────────
function spawnWave(gs) {
  const wave  = gs.wave;
  const mult  = gs._enemyMult || 1;
  const extraFactor  = 1 + (gs.gearFlags?.extraEnemies || 0);
  const reduceFactor = 1 - Math.min(0.9, gs.nextWaveEnemyReduction || 0);
  gs.nextWaveEnemyReduction = 0;
  const count = Math.floor((4 + wave * 2) * extraFactor * reduceFactor);
  const hp    = (40 + wave * 20) * mult;
  const speed = 0.6 + wave * 0.05;
  const dmg   = (5 + wave * 3) * mult;

  const isBossWave = wave % 5 === 0 && wave > 0;
  const spawnPts = gs.spawnPoints?.length ? gs.spawnPoints : [{ x: C.COLS - 1, y: Math.floor(C.ROWS / 2) }];

  for (let i = 0; i < count; i++) {
    const sp = spawnPts[i % spawnPts.length];
    // Slight jitter around spawn point so enemies don't stack
    const sx = Math.max(0.5, Math.min(C.COLS - 0.5, sp.x + 0.5 + (Math.random() - 0.5) * 3));
    const sy = Math.max(0.5, Math.min(C.ROWS - 0.5, sp.y + 0.5 + (Math.random() - 0.5) * 3));

    const isBoss  = isBossWave && i === 0;
    const isElite = !isBoss && wave >= 3 && i === 0;
    const gearCarrier = isBoss ? true : (isElite && Math.random() < 0.40);

    gs.enemies.push({
      x: sx * C.CELL, y: sy * C.CELL,
      hp:    isBoss ? hp * 8 : (isElite ? hp * 3 : hp),
      maxHp: isBoss ? hp * 8 : (isElite ? hp * 3 : hp),
      speed: isBoss ? speed * 0.5 : (isElite ? speed * 0.7 : speed),
      dmg:   isBoss ? dmg * 4   : (isElite ? dmg * 2   : dmg),
      size:  isBoss ? 24 : (isElite ? 18 : 10),
      color: isBoss ? '#ffaa00' : (isElite ? '#ff3333' : '#cc2222'),
      elite: isElite || isBoss,
      boss: isBoss,
      gearCarrier,
    });
  }
}

// ── Enemy Update ──────────────────────────────────────────
function updateEnemies(gs, dt) {
  if (gs.flowFieldDirty) computeFlowField(gs);

  for (let i = gs.enemies.length - 1; i >= 0; i--) {
    const e = gs.enemies[i];

    if (e.hp <= 0) {
      if (e.gearCarrier) gs.pendingGearDrops = (gs.pendingGearDrops || 0) + 1;
      gs.enemies.splice(i, 1);
      gs.killCount = (gs.killCount || 0) + 1;
      gs.waveKills = (gs.waveKills || 0) + 1;

      // Combat → Production feedback: enemies drop resources
      const dropRate = gs.upgrades.scrapProtocol ? 0.7 : 0.28;
      if (Math.random() < dropRate) {
        addRes(gs, Math.random() < 0.65 ? C.RES.IRON_ORE : C.RES.COAL, 1);
      }
      if (e.elite && !e.boss) addRes(gs, C.RES.COPPER_ORE, 1);
      if (e.boss) {
        addRes(gs, C.RES.IRON_PLATE, 2 + Math.floor(gs.wave / 3));
        addRes(gs, C.RES.COPPER_PLATE, 1 + Math.floor(gs.wave / 4));
      }
      continue;
    }

    if (e.stunTimer > 0) { e.stunTimer--; continue; }

    // Current grid cell
    const cx = Math.floor(e.x / C.CELL);
    const cy = Math.floor(e.y / C.CELL);
    const dir = gs.flowField?.[cy]?.[cx];

    if (dir === 4) {
      // Reached core
      gs.coreHp -= e.dmg;
      gs.enemies.splice(i, 1);
      continue;
    }

    // Determine target pixel (centre of next cell)
    let tx, ty;
    if (dir >= 0 && dir <= 3) {
      const dv = C.DIR_VEC[dir];
      tx = (cx + dv.x + 0.5) * C.CELL;
      ty = (cy + dv.y + 0.5) * C.CELL;
    } else {
      // Flow field not computed or cell unreachable – go straight
      tx = (gs.map.coreX + 0.5) * C.CELL;
      ty = (gs.map.coreY + 0.5) * C.CELL;
    }

    // Check target cell for wall
    const ntx = Math.floor(tx / C.CELL), nty = Math.floor(ty / C.CELL);
    if (inBounds(ntx, nty)) {
      const nc = gs.map.grid[nty][ntx];
      if (nc.equipment?.type === C.EQ.WALL) {
        nc.equipment.hp -= e.dmg * 0.05;
        if (hasGear(gs, 'fortification')) e.hp -= 5;
        if (nc.equipment.hp <= 0) {
          nc.equipment = null;
          gs.flowFieldDirty = true;
        }
        continue;
      }
    }

    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= e.speed) { e.x = tx; e.y = ty; }
    else { e.x += (dx / d) * e.speed; e.y += (dy / d) * e.speed; }
  }

  for (let i = gs.projectiles.length - 1; i >= 0; i--) {
    gs.projectiles[i].life--;
    if (gs.projectiles[i].life <= 0) gs.projectiles.splice(i, 1);
  }
}

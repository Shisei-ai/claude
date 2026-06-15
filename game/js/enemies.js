// ── Enemy Type Definitions ────────────────────────────────
const ENEMY_TYPES = {
  normal: {
    label: '通常', color: '#c83030',
    hpM: 1.0, spdM: 1.0, dmgM: 1.0, size: 10, armor: 0, wallDmgM: 1,
  },
  runner: {
    label: '突撃', color: '#ffe030',
    hpM: 0.45, spdM: 2.2, dmgM: 0.6, size: 7, armor: 0, wallDmgM: 0,
    ignoreWalls: true,  // phases through walls blocked by dirty flow field
  },
  breaker: {
    label: '破壊', color: '#9933cc',
    hpM: 2.5, spdM: 0.4, dmgM: 2.5, size: 18, armor: 0.35, wallDmgM: 8,
  },
  swarmer: {
    label: '群生', color: '#ff8820',
    hpM: 1.2, spdM: 0.9, dmgM: 0.8, size: 13, armor: 0, wallDmgM: 1,
    onDeath: 'minions',
  },
  minion: {
    label: 'ミニ', color: '#ffbb60',
    hpM: 0.18, spdM: 1.6, dmgM: 0.35, size: 6, armor: 0, wallDmgM: 0.5,
  },
  shielder: {
    label: '重装', color: '#3388dd',
    hpM: 2.0, spdM: 0.65, dmgM: 1.2, size: 16, armor: 0.5, wallDmgM: 1.2,
  },
  stealth: {
    label: '潜伏', color: '#5a5a5a',
    hpM: 0.8, spdM: 1.15, dmgM: 0.9, size: 9, armor: 0, wallDmgM: 0.8,
    stealth: true,
  },
};

// Weighted pool pick
function pickType(pairs) {
  const pool = [];
  for (const [t, w] of pairs) for (let i = 0; i < w; i++) pool.push(t);
  return pool[Math.floor(Math.random() * pool.length)];
}

function enemyTypeForWave(wave, isElite) {
  if (isElite) {
    if (wave >= 7) return pickType([['shielder',3],['breaker',3],['stealth',2]]);
    if (wave >= 5) return pickType([['shielder',2],['breaker',2],['stealth',1]]);
    if (wave >= 3) return pickType([['breaker',2],['shielder',1]]);
    return 'breaker';
  }
  const pool = [['normal',5]];
  if (wave >= 2) pool.push(['runner',3]);
  if (wave >= 3) pool.push(['swarmer',2]);
  if (wave >= 4) pool.push(['breaker',1]);
  if (wave >= 5) pool.push(['stealth',2]);
  if (wave >= 6) pool.push(['shielder',2],['runner',2]);
  return pickType(pool);
}

function makeEnemy(typeName, baseHp, baseSpeed, baseDmg, sx, sy, isElite, isBoss, gearCarrier) {
  const def  = ENEMY_TYPES[typeName] || ENEMY_TYPES.normal;
  const eM   = isElite ? 2.0 : 1;
  const bM   = isBoss  ? 8.0 : 1;

  const hp    = baseHp    * def.hpM  * eM * bM;
  const speed = baseSpeed * def.spdM * (isElite ? 0.8 : 1) * (isBoss ? 0.5 : 1);
  const dmg   = baseDmg   * def.dmgM * eM * bM;
  const size  = isBoss ? 24 : (isElite ? def.size + 5 : def.size);
  const color = isBoss ? '#ffaa00' : def.color;

  return {
    x: sx * C.CELL, y: sy * C.CELL,
    hp, maxHp: hp, speed, dmg, size, color,
    type: typeName,
    armor:       def.armor       ?? 0,
    wallDmgM:    def.wallDmgM    ?? 1,
    ignoreWalls: def.ignoreWalls ?? false,
    stealth:     def.stealth     ?? false,
    onDeath:     def.onDeath     ?? null,
    elite: isElite || isBoss,
    boss:  isBoss,
    gearCarrier: gearCarrier ?? false,
  };
}

// ── Flow Field (BFS from core outward) ────────────────────
function computeFlowField(gs) {
  const rows = C.ROWS, cols = C.COLS;
  const field = [];
  for (let y = 0; y < rows; y++) field[y] = new Int8Array(cols).fill(-1);

  const q = new Int32Array(rows * cols * 2);
  let head = 0, tail = 0;

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
      field[ny][nx] = (d + 2) & 3;
      q[tail++] = nx; q[tail++] = ny;
    }
  }

  gs.flowField = field;
  gs.flowFieldDirty = false;
}

// ── Spawn Points ──────────────────────────────────────────
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
function spawnWave(gs, opts = {}) {
  const wave         = gs.wave;
  const mult         = opts.mult || gs._enemyMult || 1;
  const extraFactor  = 1 + (gs.gearFlags?.extraEnemies || 0);
  const reduceFactor = 1 - Math.min(0.9, gs.nextWaveEnemyReduction || 0);
  gs.nextWaveEnemyReduction = 0;

  const count    = Math.floor((4 + wave * 2) * extraFactor * reduceFactor);
  const baseHp   = (40 + wave * 20) * mult;
  const baseSpeed = 0.6 + wave * 0.05;
  const baseDmg  = (5 + wave * 3) * mult;

  const isBossWave  = !!opts.boss;
  const isEliteWave = !!opts.elite;
  const spawnPts = gs.spawnPoints?.length ? gs.spawnPoints : [{ x: C.COLS - 1, y: Math.floor(C.ROWS / 2) }];

  for (let i = 0; i < count; i++) {
    const sp  = spawnPts[i % spawnPts.length];
    const sx  = Math.max(0.5, Math.min(C.COLS - 0.5, sp.x + 0.5 + (Math.random() - 0.5) * 3));
    const sy  = Math.max(0.5, Math.min(C.ROWS - 0.5, sp.y + 0.5 + (Math.random() - 0.5) * 3));

    const isBoss  = isBossWave && i === 0;
    const isElite = !isBoss && (isEliteWave ? i < 2 : (wave >= 3 && i === 0));
    const gearC   = isBoss ? true : (isElite && (isEliteWave ? i === 0 : Math.random() < 0.40));

    const typeName = isBoss ? 'normal' : enemyTypeForWave(wave, isElite);
    const e = makeEnemy(typeName, baseHp, baseSpeed, baseDmg, sx, sy, isElite, isBoss, gearC);
    gs.enemies.push(e);
  }
}

// ── Enemy Update ──────────────────────────────────────────
function updateEnemies(gs, dt) {
  if (gs.flowFieldDirty) computeFlowField(gs);

  for (let i = gs.enemies.length - 1; i >= 0; i--) {
    const e = gs.enemies[i];

    if (e.hp <= 0) {
      // Swarmer: spawn minions on death
      if (e.onDeath === 'minions') {
        for (let m = 0; m < 2; m++) {
          gs.enemies.push({
            x: e.x + (m === 0 ? -12 : 12), y: e.y + (Math.random()-0.5)*12,
            hp: e.maxHp * 0.15, maxHp: e.maxHp * 0.15,
            speed: e.speed * 1.8, dmg: e.dmg * 0.45,
            size: 6, color: '#ffbb60',
            type: 'minion', armor: 0, wallDmgM: 0.5,
            ignoreWalls: false, stealth: false, onDeath: null,
            elite: false, boss: false, gearCarrier: false,
          });
        }
      }

      if (e.gearCarrier) gs.pendingGearDrops = (gs.pendingGearDrops || 0) + 1;
      gs.enemies.splice(i, 1);
      gs.killCount = (gs.killCount || 0) + 1;
      gs.waveKills = (gs.waveKills || 0) + 1;

      const dropRate = gs.upgrades.scrapProtocol ? 0.7 : 0.28;
      if (Math.random() < dropRate)
        addRes(gs, Math.random() < 0.65 ? C.RES.IRON_ORE : C.RES.COAL, 1);
      if (e.elite && !e.boss)      addRes(gs, C.RES.COPPER_ORE, 1);
      if (e.type === 'breaker')    addRes(gs, C.RES.IRON_PLATE, 1);
      if (e.type === 'shielder')   addRes(gs, C.RES.COPPER_PLATE, 1);
      if (e.boss) {
        addRes(gs, C.RES.IRON_PLATE,   2 + Math.floor(gs.wave / 3));
        addRes(gs, C.RES.COPPER_PLATE, 1 + Math.floor(gs.wave / 4));
      }
      continue;
    }

    if (e.stunTimer > 0) { e.stunTimer--; continue; }

    const cx  = Math.floor(e.x / C.CELL);
    const cy  = Math.floor(e.y / C.CELL);
    const dir = gs.flowField?.[cy]?.[cx];

    if (dir === 4) {
      gs.coreHp -= e.dmg;
      gs.enemies.splice(i, 1);
      continue;
    }

    let tx, ty;
    if (dir >= 0 && dir <= 3) {
      const dv = C.DIR_VEC[dir];
      tx = (cx + dv.x + 0.5) * C.CELL;
      ty = (cy + dv.y + 0.5) * C.CELL;
    } else {
      // No path (completely blocked or outside map) — go straight to core
      tx = (C.CORE_X + 1.5) * C.CELL;
      ty = (C.CORE_Y + 1.5) * C.CELL;
    }

    // Wall collision check (handles enemies that moved into a wall after dirty flow field)
    const ntx = Math.floor(tx / C.CELL), nty = Math.floor(ty / C.CELL);
    if (inBounds(ntx, nty)) {
      const nc = gs.map.grid[nty][ntx];
      if (nc.equipment?.type === C.EQ.WALL) {
        if (e.ignoreWalls) {
          // Runner: bypass wall, charge straight to core
          tx = (C.CORE_X + 1.5) * C.CELL;
          ty = (C.CORE_Y + 1.5) * C.CELL;
        } else {
          // Normal / breaker: attack the wall
          const wdm = e.wallDmgM ?? 1;
          nc.equipment.hp -= e.dmg * 0.05 * wdm;
          if (hasGear(gs, 'fortification')) e.hp -= 5;
          if (nc.equipment.hp <= 0) {
            nc.equipment = null;
            gs.flowFieldDirty = true;
          }
          continue;
        }
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

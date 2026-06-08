function spawnWave(gs) {
  const wave  = gs.wave;
  const mult  = gs._enemyMult || 1;
  const extraFactor  = 1 + (gs.gearFlags?.extraEnemies || 0);
  const reduceFactor = 1 - Math.min(0.9, gs.nextWaveEnemyReduction || 0);
  gs.nextWaveEnemyReduction = 0; // consume one-time reduction
  const count = Math.floor((4 + wave * 2) * extraFactor * reduceFactor);
  const hp    = (40 + wave * 20) * mult;
  const speed = 0.6 + wave * 0.05;
  const dmg   = (5 + wave * 3) * mult;

  const cx = gs.map.coreX * C.CELL + C.CELL / 2;
  const cy = gs.map.coreY * C.CELL + C.CELL / 2;

  const isBossWave = wave % 5 === 0 && wave > 0;

  for (let i = 0; i < count; i++) {
    let sx, sy;
    const edge = Math.random() < 0.7 ? 'right' : (Math.random() < 0.5 ? 'top' : 'bottom');
    if (edge === 'right') {
      sx = (C.COLS - 0.5) * C.CELL;
      sy = (0.5 + Math.random() * (C.ROWS - 1)) * C.CELL;
    } else if (edge === 'top') {
      sx = (4 + Math.random() * (C.COLS - 5)) * C.CELL;
      sy = 0;
    } else {
      sx = (4 + Math.random() * (C.COLS - 5)) * C.CELL;
      sy = C.ROWS * C.CELL;
    }

    const isBoss  = isBossWave && i === 0;
    const isElite = !isBoss && wave >= 3 && i === 0;

    // Gear carrier: boss always, elite 40% chance
    const gearCarrier = isBoss ? true : (isElite && Math.random() < 0.40);

    gs.enemies.push({
      x: sx, y: sy,
      hp:    isBoss ? hp * 8 : (isElite ? hp * 3 : hp),
      maxHp: isBoss ? hp * 8 : (isElite ? hp * 3 : hp),
      speed: isBoss ? speed * 0.5 : (isElite ? speed * 0.7 : speed),
      dmg:   isBoss ? dmg * 4   : (isElite ? dmg * 2   : dmg),
      size:  isBoss ? 24 : (isElite ? 18 : 10),
      color: isBoss ? '#ffaa00' : (isElite ? '#ff3333' : '#cc2222'),
      elite: isElite || isBoss,
      boss: isBoss,
      gearCarrier,
      targetX: cx, targetY: cy,
    });
  }
}

function updateEnemies(gs, dt) {
  const cx = gs.map.coreX * C.CELL + C.CELL / 2;
  const cy = gs.map.coreY * C.CELL + C.CELL / 2;

  for (let i = gs.enemies.length - 1; i >= 0; i--) {
    const e = gs.enemies[i];

    if (e.hp <= 0) {
      if (e.gearCarrier) gs.pendingGearDrops = (gs.pendingGearDrops || 0) + 1;
      gs.enemies.splice(i, 1);
      gs.killCount  = (gs.killCount  || 0) + 1;
      gs.waveKills  = (gs.waveKills  || 0) + 1;
      continue;
    }

    // Stun from EMP gear
    if (e.stunTimer > 0) { e.stunTimer--; continue; }

    let tx = cx, ty = cy;
    const dx = tx - e.x, dy = ty - e.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 1) continue;

    const nx = e.x + (dx / dist) * e.speed;
    const ny = e.y + (dy / dist) * e.speed;

    const gx = Math.floor(nx / C.CELL);
    const gy = Math.floor(ny / C.CELL);
    if (inBounds(gx, gy)) {
      const cell = gs.map.grid[gy][gx];
      if (cell.equipment && cell.equipment.type === C.EQ.WALL) {
        cell.equipment.hp -= e.dmg * 0.05;
        // Fortification gear: reflect damage
        if (hasGear(gs, 'fortification')) e.hp -= 5;
        if (cell.equipment.hp <= 0) cell.equipment = null;
        const perpDx = -dy / dist * e.speed;
        const perpDy =  dx / dist * e.speed;
        e.x += perpDx * 0.5;
        e.y += perpDy * 0.5;
        continue;
      }
    }

    e.x = nx;
    e.y = ny;

    const coreR = C.CELL * 0.6;
    if (Math.abs(e.x - cx) < coreR && Math.abs(e.y - cy) < coreR) {
      gs.coreHp -= e.dmg;
      gs.enemies.splice(i, 1);
    }
  }

  // Update projectiles
  for (let i = gs.projectiles.length - 1; i >= 0; i--) {
    gs.projectiles[i].life--;
    if (gs.projectiles[i].life <= 0) gs.projectiles.splice(i, 1);
  }
}

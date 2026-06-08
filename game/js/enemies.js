function spawnWave(gs) {
  const wave  = gs.wave;
  const mult  = gs._enemyMult || 1;
  const count = 4 + wave * 2;
  const hp    = (40 + wave * 20) * mult;
  const speed = 0.6 + wave * 0.05;
  const dmg   = (5 + wave * 3) * mult;

  const cx = gs.map.coreX * C.CELL + C.CELL / 2;
  const cy = gs.map.coreY * C.CELL + C.CELL / 2;

  for (let i = 0; i < count; i++) {
    // Spawn from right edge or random edge (not left where core is)
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

    // Elite enemy every wave after wave 3
    const isElite = wave >= 3 && i === 0;

    gs.enemies.push({
      x: sx, y: sy,
      hp: isElite ? hp * 3 : hp,
      maxHp: isElite ? hp * 3 : hp,
      speed: isElite ? speed * 0.7 : speed,
      dmg: isElite ? dmg * 2 : dmg,
      size: isElite ? 18 : 10,
      color: isElite ? '#ff3333' : '#cc2222',
      elite: isElite,
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
      gs.enemies.splice(i, 1);
      gs.killCount = (gs.killCount || 0) + 1;
      continue;
    }

    // Simple pathfinding: move toward core, try to avoid walls
    let tx = cx, ty = cy;

    // Check if current path hits a wall cell
    const dx = tx - e.x, dy = ty - e.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 1) continue;

    const nx = e.x + (dx / dist) * e.speed;
    const ny = e.y + (dy / dist) * e.speed;

    // Check collision with walls
    const gx = Math.floor(nx / C.CELL);
    const gy = Math.floor(ny / C.CELL);
    if (inBounds(gx, gy)) {
      const cell = gs.map.grid[gy][gx];
      if (cell.equipment && cell.equipment.type === C.EQ.WALL) {
        // Attack wall
        cell.equipment.hp -= e.dmg * 0.05;
        if (cell.equipment.hp <= 0) cell.equipment = null;
        // Try to go around
        const perpDx = -dy / dist * e.speed;
        const perpDy = dx / dist * e.speed;
        e.x += perpDx * 0.5;
        e.y += perpDy * 0.5;
        continue;
      }
    }

    e.x = nx;
    e.y = ny;

    // Check if reached core
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

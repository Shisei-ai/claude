function generateMap() {
  const grid = [];
  for (let y = 0; y < C.ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < C.COLS; x++)
      grid[y][x] = { terrain: C.EMPTY, equipment: null, item: null };
  }

  // 3×3 core block at center
  for (let dy = 0; dy < 3; dy++)
    for (let dx = 0; dx < 3; dx++)
      grid[C.CORE_Y + dy][C.CORE_X + dx].terrain = C.CORE;

  // 2×2 resource patches – keep a buffer from core and from each other
  const patchDefs = [
    { terrain: C.IRON_ORE,   count: 5 },
    { terrain: C.COPPER_ORE, count: 4 },
    { terrain: C.COAL,       count: 3 },
    { terrain: C.OIL_WELL,   count: 3 },
    { terrain: C.SULFUR_DEP, count: 2 },
  ];

  const occupied = new Set();

  // Core area + 8-cell buffer
  for (let dy = -8; dy < 11; dy++)
    for (let dx = -8; dx < 11; dx++) {
      const bx = C.CORE_X + dx, by = C.CORE_Y + dy;
      if (bx >= 0 && by >= 0 && bx < C.COLS - 1 && by < C.ROWS - 1)
        occupied.add(`${bx},${by}`);
    }

  for (const { terrain, count } of patchDefs) {
    let placed = 0, tries = 0;
    while (placed < count && tries < 2000) {
      tries++;
      const px = 2 + Math.floor(Math.random() * (C.COLS - 4));
      const py = 2 + Math.floor(Math.random() * (C.ROWS - 4));

      let clear = true;
      outer:
      for (let dy2 = -4; dy2 <= 5; dy2++)
        for (let dx2 = -4; dx2 <= 5; dx2++)
          if (occupied.has(`${px + dx2},${py + dy2}`)) { clear = false; break outer; }
      if (!clear) continue;

      for (let dy2 = 0; dy2 < 2; dy2++)
        for (let dx2 = 0; dx2 < 2; dx2++)
          grid[py + dy2][px + dx2].terrain = terrain;

      for (let dy2 = -3; dy2 <= 4; dy2++)
        for (let dx2 = -3; dx2 <= 4; dx2++)
          occupied.add(`${px + dx2},${py + dy2}`);

      placed++;
    }
  }

  return { grid, coreX: C.CORE_X + 1, coreY: C.CORE_Y + 1 };
}

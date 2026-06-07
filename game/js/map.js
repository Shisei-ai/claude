function generateMap() {
  const grid = [];
  for (let y = 0; y < C.ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < C.COLS; x++) {
      grid[y][x] = { terrain: C.EMPTY, equipment: null, item: null };
    }
  }

  const coreX = 3, coreY = Math.floor(C.ROWS / 2);
  grid[coreY][coreX].terrain = C.CORE;

  // Resource patches: [type, count] — avoid proximity to core
  const patches = [
    [C.IRON_ORE,   4],
    [C.IRON_ORE,   4],
    [C.COPPER_ORE, 3],
    [C.COPPER_ORE, 3],
    [C.COAL,       3],
    [C.OIL_WELL,   2],
    [C.OIL_WELL,   2],
    [C.SULFUR_DEP, 3],
  ];

  for (const [type, count] of patches) {
    let placed = 0, tries = 0;
    while (placed < count && tries < 300) {
      tries++;
      const x = 4 + Math.floor(Math.random() * (C.COLS - 5));
      const y = 1 + Math.floor(Math.random() * (C.ROWS - 2));
      if (grid[y][x].terrain === C.EMPTY &&
          Math.abs(x - coreX) + Math.abs(y - coreY) > 4) {
        grid[y][x].terrain = type;
        placed++;
      }
    }
  }

  return { grid, coreX, coreY };
}

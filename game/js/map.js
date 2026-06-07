function generateMap() {
  const grid = [];
  for (let y = 0; y < C.ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < C.COLS; x++) {
      grid[y][x] = { terrain: C.EMPTY, equipment: null, item: null };
    }
  }

  // Place factory core in center-left area
  const coreX = 3, coreY = Math.floor(C.ROWS / 2);
  grid[coreY][coreX].terrain = C.CORE;

  // Scatter resource nodes (avoid core area)
  const oreTypes = [C.IRON_ORE, C.COPPER_ORE, C.COAL];
  const patches = [
    { type: C.IRON_ORE,   count: 4 },
    { type: C.IRON_ORE,   count: 4 },
    { type: C.COPPER_ORE, count: 3 },
    { type: C.COPPER_ORE, count: 3 },
    { type: C.COAL,       count: 3 },
  ];

  for (const patch of patches) {
    let placed = 0;
    let tries = 0;
    while (placed < patch.count && tries < 200) {
      tries++;
      const x = 4 + Math.floor(Math.random() * (C.COLS - 5));
      const y = 1 + Math.floor(Math.random() * (C.ROWS - 2));
      if (grid[y][x].terrain === C.EMPTY && Math.abs(x - coreX) + Math.abs(y - coreY) > 4) {
        grid[y][x].terrain = patch.type;
        placed++;
      }
    }
  }

  return { grid, coreX, coreY };
}

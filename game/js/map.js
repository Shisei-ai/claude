// ── Grid helpers ──────────────────────────────────────────
function makeGrid() {
  const grid = [];
  for (let y = 0; y < C.ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < C.COLS; x++)
      grid[y][x] = { terrain: C.EMPTY, equipment: null, item: null };
  }
  return grid;
}

function placePatches(grid, patchDefs, opts = {}) {
  const patchSize = opts.patchSize || 2;
  const occupied = new Set();

  if (opts.coreBuffer) {
    for (let dy = -5; dy < 8; dy++)
      for (let dx = -5; dx < 8; dx++) {
        const bx = C.CORE_X + dx, by = C.CORE_Y + dy;
        if (bx >= 0 && by >= 0 && bx < C.COLS - 1 && by < C.ROWS - 1)
          occupied.add(`${bx},${by}`);
      }
  }

  // Flatten all patches into one list and shuffle so no terrain type
  // is systematically favoured by placement order.
  const queue = [];
  for (const { terrain, count } of patchDefs)
    for (let i = 0; i < count; i++) queue.push(terrain);
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  for (const terrain of queue) {
    let tries = 0;
    while (tries < 500) {
      tries++;
      const px = 2 + Math.floor(Math.random() * (C.COLS - 4 - patchSize));
      const py = 2 + Math.floor(Math.random() * (C.ROWS - 4 - patchSize));

      let clear = true;
      outer:
      for (let dy = -1; dy <= patchSize; dy++)
        for (let dx = -1; dx <= patchSize; dx++)
          if (occupied.has(`${px + dx},${py + dy}`)) { clear = false; break outer; }
      if (!clear) continue;

      for (let dy = 0; dy < patchSize; dy++)
        for (let dx = 0; dx < patchSize; dx++)
          grid[py + dy][px + dx].terrain = terrain;

      // 1-cell gap between patches
      for (let dy = -1; dy <= patchSize; dy++)
        for (let dx = -1; dx <= patchSize; dx++)
          occupied.add(`${px + dx},${py + dy}`);

      break;
    }
  }
}

// ── Industrial map: no resources, no core ─────────────────
//    Pure processing space: machines pull raw materials from
//    the shared warehouse (filled by rogue-map nodes).
function generateFactoryMap() {
  return { grid: makeGrid(), hasCore: false };
}

// ── Battle mission map: core defense + minable ore ────────
// Act 1: 鉄鉱石・銅鉱石のみ
// Act 2: 硫黄・石炭・原油のみ
// Act 3: 全資源バランス配置
function generateBattleMap(depth, isBoss = false, act = 1) {
  const grid = makeGrid();
  for (let dy = 0; dy < 3; dy++)
    for (let dx = 0; dx < 3; dx++)
      grid[C.CORE_Y + dy][C.CORE_X + dx].terrain = C.CORE;

  let defs;
  if (act === 1) {
    defs = [
      { terrain: C.IRON_ORE,   count: 2 },
      { terrain: C.COPPER_ORE, count: 2 },
    ];
  } else if (act === 2) {
    defs = [
      { terrain: C.SULFUR_DEP, count: 2 },
      { terrain: C.COAL,       count: 2 },
      { terrain: C.OIL_WELL,   count: 2 },
    ];
  } else {
    defs = [
      { terrain: C.IRON_ORE,   count: 1 },
      { terrain: C.COPPER_ORE, count: 1 },
      { terrain: C.COAL,       count: 1 },
      { terrain: C.SULFUR_DEP, count: 1 },
      { terrain: C.OIL_WELL,   count: 1 },
    ];
  }
  if (isBoss) defs.push({ terrain: act <= 1 ? C.IRON_ORE : C.OIL_WELL, count: 1 });

  placePatches(grid, defs, { coreBuffer: true, patchSize: 2 });
  return { grid, hasCore: true, coreX: C.CORE_X + 1, coreY: C.CORE_Y + 1 };
}

// ── Mining mission map: rich deposits, no core, no enemies ─
// Act 1: 鉄鉱石・銅鉱石のみ
// Act 2: 硫黄・石炭・原油のみ
// Act 3: 全資源バランス配置
function generateMiningMap(depth, act = 1) {
  const grid = makeGrid();
  let defs;
  if (act === 1) {
    defs = [
      { terrain: C.IRON_ORE,   count: 5 },
      { terrain: C.COPPER_ORE, count: 5 },
    ];
  } else if (act === 2) {
    defs = [
      { terrain: C.OIL_WELL,   count: 4 },
      { terrain: C.SULFUR_DEP, count: 4 },
      { terrain: C.COAL,       count: 4 },
    ];
  } else {
    defs = [
      { terrain: C.IRON_ORE,   count: 3 },
      { terrain: C.COPPER_ORE, count: 3 },
      { terrain: C.OIL_WELL,   count: 3 },
      { terrain: C.SULFUR_DEP, count: 3 },
      { terrain: C.COAL,       count: 3 },
    ];
  }
  placePatches(grid, defs, { coreBuffer: false, patchSize: 3 });
  return { grid, hasCore: false };
}

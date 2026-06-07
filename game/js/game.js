// Game state
let gs = null;
let animId = null;
let lastTime = 0;
let tickAcc = 0;
const TICK_MS = 1000 / 60;

// ---- Init ----
function initGame() {
  // Reset equipment unlock state
  EQ_DEF.laser.unlocked = false;
  EQ_DEF.generator.unlocked = false;

  gs = {
    state: 'build',  // 'build' | 'wave' | 'upgrade' | 'over' | 'victory'
    wave: 0,
    kills: 0,
    map: generateMap(),
    resources: {},
    enemies: [],
    projectiles: [],
    coreHp: 100,
    coreMaxHp: 100,
    upgrades: {},
    selectedTool: C.EQ.MINER,
    selectedDir: C.DIR.RIGHT,
    hover: null,
    goalTarget: 10,
    goalItem: C.RES.CIRCUIT,
    totalCircuits: 0,
  };

  buildSidebar();
  resizeCanvas();
  showScreen('game-screen');
  updateHUD();

  document.getElementById('next-wave-btn').disabled = false;

  if (animId) cancelAnimationFrame(animId);
  lastTime = 0;
  animId = requestAnimationFrame(loop);
}

// ---- Game Loop ----
function loop(ts) {
  animId = requestAnimationFrame(loop);

  const dt = lastTime ? Math.min(ts - lastTime, 100) : 16;
  lastTime = ts;

  if (gs.state === 'wave') {
    tickAcc += dt;
    while (tickAcc >= TICK_MS) {
      tickAcc -= TICK_MS;
      tick();
    }
    updateEnemies(gs, dt);
    checkWaveEnd();
  } else if (gs.state === 'build') {
    tickAcc += dt;
    while (tickAcc >= TICK_MS) {
      tickAcc -= TICK_MS;
      tick();
    }
    collectToStorage();
  }

  render(document.getElementById('game-canvas'), gs);
  updateHUD();
}

function tick() {
  for (let y = 0; y < C.ROWS; y++) {
    for (let x = 0; x < C.COLS; x++) {
      const cell = gs.map.grid[y][x];
      cell.x = x; cell.y = y;
      if (cell.equipment) {
        const def = EQ_DEF[cell.equipment.type];
        if (def && def.onTick) def.onTick(cell, gs);
      }
    }
  }
}

// Auto-collect items that end up in storage (core cell neighbors)
function collectToStorage() {
  // Already done via conveyor logic; circuits accumulate in gs.resources
  const circuits = gs.resources[C.RES.CIRCUIT] || 0;
  if (circuits > gs.totalCircuits) {
    gs.totalCircuits = circuits;
  }
  // Check victory
  if ((gs.resources[gs.goalItem] || 0) >= gs.goalTarget && gs.state === 'build') {
    victory();
  }
}

function checkWaveEnd() {
  if (gs.coreHp <= 0) {
    gs.state = 'over';
    gameOver('ファクトリーコアが破壊された！');
    return;
  }
  if (gs.enemies.length === 0 && gs.state === 'wave') {
    gs.state = 'upgrade';
    showUpgradeScreen();
  }
}

// ---- Wave ----
function sendWave() {
  if (gs.state !== 'build') return;
  gs.wave++;
  gs.state = 'wave';
  gs.enemies = [];
  gs.projectiles = [];
  spawnWave(gs);
  document.getElementById('next-wave-btn').disabled = true;
  document.getElementById('wave-num').textContent = gs.wave;
}

// ---- Upgrade ----
function showUpgradeScreen() {
  const choices = getUpgradeChoices(gs, 3);
  const container = document.getElementById('upgrade-cards');
  container.innerHTML = '';

  for (const u of choices) {
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `
      <div class="card-icon">${u.icon}</div>
      <div class="card-name">${u.name}</div>
      <div class="card-desc">${u.desc}</div>
      <div class="card-rarity rarity-${u.rarity}">${u.rarity.toUpperCase()}</div>
    `;
    card.onclick = () => {
      u.apply(gs);
      showScreen('game-screen');
      gs.state = 'build';
      document.getElementById('next-wave-btn').disabled = false;
      buildSidebar(); // refresh in case new items unlocked
    };
    container.appendChild(card);
  }

  showScreen('upgrade-screen');
}

// ---- Game Over / Victory ----
function gameOver(msg) {
  document.getElementById('over-title').textContent = 'FACTORY DESTROYED';
  document.getElementById('over-msg').textContent = `Wave ${gs.wave} | ${msg}`;
  showScreen('gameover-screen');
}

function victory() {
  gs.state = 'over';
  document.getElementById('over-title').textContent = '🏭 VICTORY!';
  document.getElementById('over-msg').textContent =
    `Wave ${gs.wave} | 回路基板 ${gs.resources[C.RES.CIRCUIT]} 個生産達成！`;
  showScreen('gameover-screen');
}

// ---- HUD ----
function updateHUD() {
  if (!gs) return;
  const hp = Math.max(0, gs.coreHp);
  document.getElementById('core-hp-text').textContent = Math.ceil(hp);
  document.getElementById('core-hp-fill').style.width = (hp / gs.coreMaxHp * 100) + '%';

  const r = gs.resources;
  document.querySelector('#res-iron-ore span').textContent    = r[C.RES.IRON_ORE] || 0;
  document.querySelector('#res-iron-plate span').textContent  = r[C.RES.IRON_PLATE] || 0;
  document.querySelector('#res-copper-ore span').textContent  = r[C.RES.COPPER_ORE] || 0;
  document.querySelector('#res-copper-plate span').textContent = r[C.RES.COPPER_PLATE] || 0;
  document.querySelector('#res-circuit span').textContent     = r[C.RES.CIRCUIT] || 0;

  const prog = Math.min(1, (r[gs.goalItem] || 0) / gs.goalTarget);
  document.getElementById('goal-fill').style.width = (prog * 100) + '%';
  document.getElementById('goal-text').textContent =
    `Circuit x${gs.goalTarget} (${r[gs.goalItem] || 0})`;
}

// ---- Sidebar ----
function buildSidebar() {
  const list = document.getElementById('tool-list');
  list.innerHTML = '';

  const tools = [
    C.EQ.MINER, C.EQ.CONVEYOR, C.EQ.FURNACE,
    C.EQ.ASSEMBLER, C.EQ.TURRET, C.EQ.WALL,
    C.EQ.GENERATOR, C.EQ.LASER
  ];

  for (const t of tools) {
    const def = EQ_DEF[t];
    if (!def) continue;

    const btn = document.createElement('button');
    btn.className = 'tool-btn' + (def.unlocked === false ? ' locked' : '') + (gs.selectedTool === t ? ' selected' : '');
    btn.innerHTML = `<span class="tool-icon">${def.icon}</span><span class="tool-name">${def.name}</span>`;
    if (!def.unlocked) {
      btn.title = '未解放';
    } else {
      btn.onclick = () => {
        gs.selectedTool = t;
        buildSidebar();
        document.getElementById('tool-info').textContent = def.desc;
      };
    }
    list.appendChild(btn);
  }

  if (gs.selectedTool) {
    document.getElementById('tool-info').textContent = EQ_DEF[gs.selectedTool]?.desc || '';
  }
}

// ---- Canvas Input ----
function setupCanvas() {
  const canvas = document.getElementById('game-canvas');

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    gs.hover = { hx: Math.floor(mx / C.CELL), hy: Math.floor(my / C.CELL) };
  });

  canvas.addEventListener('mouseleave', () => { gs.hover = null; });

  canvas.addEventListener('click', e => {
    if (gs.state !== 'build') return;
    const rect = canvas.getBoundingClientRect();
    const gx = Math.floor((e.clientX - rect.left) / C.CELL);
    const gy = Math.floor((e.clientY - rect.top) / C.CELL);
    if (!inBounds(gx, gy)) return;
    const cell = gs.map.grid[gy][gx];
    if (cell.terrain === C.CORE) return;
    const def = EQ_DEF[gs.selectedTool];
    if (!def || def.unlocked === false) return;

    // Miner only on ore
    if (gs.selectedTool === C.EQ.MINER) {
      if (![C.IRON_ORE, C.COPPER_ORE, C.COAL].includes(cell.terrain)) return;
    }

    if (!cell.equipment) {
      cell.equipment = makeEquipment(gs.selectedTool, gs.selectedDir);
      cell.equipment.type = gs.selectedTool;
    }
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (gs.state !== 'build') return;
    const rect = canvas.getBoundingClientRect();
    const gx = Math.floor((e.clientX - rect.left) / C.CELL);
    const gy = Math.floor((e.clientY - rect.top) / C.CELL);
    if (!inBounds(gx, gy)) return;
    gs.map.grid[gy][gx].equipment = null;
    gs.map.grid[gy][gx].item = null;
  });

  window.addEventListener('keydown', e => {
    if (!gs || gs.state !== 'build') return;
    if (e.key === 'r' || e.key === 'R') {
      gs.selectedDir = (gs.selectedDir + 1) % 4;
    }
    // Number keys for tool selection
    const tools = [C.EQ.MINER, C.EQ.CONVEYOR, C.EQ.FURNACE, C.EQ.ASSEMBLER, C.EQ.TURRET, C.EQ.WALL];
    const idx = parseInt(e.key) - 1;
    if (idx >= 0 && idx < tools.length && EQ_DEF[tools[idx]]?.unlocked !== false) {
      gs.selectedTool = tools[idx];
      buildSidebar();
    }
  });
}

// ---- Canvas resize ----
function resizeCanvas() {
  const canvas = document.getElementById('game-canvas');
  canvas.width  = C.COLS * C.CELL;
  canvas.height = C.ROWS * C.CELL;
}

// ---- Screen management ----
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ---- Bootstrap ----
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('start-btn').onclick = initGame;
  document.getElementById('retry-btn').onclick = initGame;
  document.getElementById('next-wave-btn').onclick = sendWave;
  setupCanvas();
  showScreen('title-screen');
});

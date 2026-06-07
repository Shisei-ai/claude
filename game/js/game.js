let gs = null;
let animId = null;
let lastTime = 0;
let tickAcc  = 0;
const TICK_MS = 1000 / 60;

// ── Tool order shown in sidebar ────────────────────────────
const TOOL_ORDER = [
  C.EQ.MINER, C.EQ.CONVEYOR, C.EQ.FURNACE, C.EQ.ASSEMBLER,
  C.EQ.TURRET, C.EQ.WALL,
  C.EQ.OIL_PUMP, C.EQ.WATER_PUMP, C.EQ.COKE_OVEN,
  C.EQ.DISTILLATION, C.EQ.CHEM_PLANT, C.EQ.ELECTROLYZER,
  C.EQ.ADV_ASSEMBLER,
  C.EQ.GENERATOR, C.EQ.LASER,
];

// ── Init ───────────────────────────────────────────────────
function initGame() {
  // Reset unlock state
  EQ_DEF.laser.unlocked        = false;
  EQ_DEF.generator.unlocked    = false;
  EQ_DEF.distillation.unlocked = false;
  EQ_DEF.chem_plant.unlocked   = false;
  EQ_DEF.electrolyzer.unlocked = false;
  EQ_DEF.adv_assembler.unlocked= false;

  gs = {
    state: 'build',
    wave: 0,
    map: generateMap(),
    resources: {},
    enemies: [],
    projectiles: [],
    coreHp: 100, coreMaxHp: 100,
    upgrades: {},
    selectedTool: C.EQ.MINER,
    selectedDir: C.DIR.RIGHT,
    hover: null,
    goalItem: C.RES.ADV_CIRCUIT,
    goalTarget: 5,
  };

  resizeCanvas();
  buildSidebar();
  showScreen('game-screen');
  updateHUD();

  document.getElementById('next-wave-btn').disabled = false;
  document.getElementById('hud-phase').textContent  = 'BUILD PHASE';
  document.getElementById('hud-phase').className    = 'hud-phase build';

  if (animId) cancelAnimationFrame(animId);
  lastTime = 0; tickAcc = 0;
  animId = requestAnimationFrame(loop);
}

// ── Game Loop ──────────────────────────────────────────────
function loop(ts) {
  animId = requestAnimationFrame(loop);
  const dt = lastTime ? Math.min(ts - lastTime, 100) : 16;
  lastTime = ts;

  if (gs.state === 'wave' || gs.state === 'build') {
    tickAcc += dt;
    while (tickAcc >= TICK_MS) {
      tickAcc -= TICK_MS;
      tick();
    }
    if (gs.state === 'wave') {
      updateEnemies(gs, dt);
      checkWaveEnd();
    } else {
      checkVictory();
    }
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
        if (def?.onTick) def.onTick(cell, gs);
      }
    }
  }
}

function checkVictory() {
  if ((gs.resources[gs.goalItem] || 0) >= gs.goalTarget) {
    gs.state = 'over';
    document.getElementById('over-title').textContent = '🏭 VICTORY!';
    document.getElementById('over-msg').textContent =
      `Wave ${gs.wave} | 高度回路基板 ${gs.resources[C.RES.ADV_CIRCUIT]} 個達成！`;
    showScreen('gameover-screen');
  }
}

function checkWaveEnd() {
  if (gs.coreHp <= 0) {
    gs.state = 'over';
    document.getElementById('over-title').textContent = 'FACTORY DESTROYED';
    document.getElementById('over-msg').textContent   = `Wave ${gs.wave} でコアが破壊された`;
    showScreen('gameover-screen');
    return;
  }
  if (gs.enemies.length === 0) {
    gs.state = 'upgrade';
    showUpgradeScreen();
  }
}

// ── Wave ───────────────────────────────────────────────────
function sendWave() {
  if (gs.state !== 'build') return;
  gs.wave++;
  gs.state = 'wave';
  gs.enemies = [];
  gs.projectiles = [];
  spawnWave(gs);

  document.getElementById('next-wave-btn').disabled = true;
  document.getElementById('wave-num').textContent   = gs.wave;
  document.getElementById('hud-phase').textContent  = `WAVE ${gs.wave}`;
  document.getElementById('hud-phase').className    = 'hud-phase wave';
}

// ── Upgrade ────────────────────────────────────────────────
function showUpgradeScreen() {
  const choices   = getUpgradeChoices(gs, 3);
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
      document.getElementById('hud-phase').textContent  = 'BUILD PHASE';
      document.getElementById('hud-phase').className    = 'hud-phase build';
      buildSidebar();
    };
    container.appendChild(card);
  }
  showScreen('upgrade-screen');
}

// ── HUD ────────────────────────────────────────────────────
function updateHUD() {
  if (!gs) return;
  const hp = Math.max(0, gs.coreHp);
  document.getElementById('core-hp-text').textContent = Math.ceil(hp);
  document.getElementById('core-hp-fill').style.width = (hp / gs.coreMaxHp * 100) + '%';

  const goal = gs.resources[gs.goalItem] || 0;
  const prog = Math.min(1, goal / gs.goalTarget);
  document.getElementById('goal-fill').style.width    = (prog * 100) + '%';
  document.getElementById('goal-text').textContent    = `高度回路 ${goal}/${gs.goalTarget}`;

  // Update storage rows
  document.querySelectorAll('#storage-panel .res-row').forEach(row => {
    const key = row.dataset.res;
    const val = gs.resources[key] || 0;
    const el  = row.querySelector('.res-val');
    el.textContent = val;
    el.className   = 'res-val' + (val > 0 ? ' nonzero' : '');
  });
}

// ── Sidebar ────────────────────────────────────────────────
function buildSidebar() {
  const list = document.getElementById('tool-list');
  list.innerHTML = '';

  TOOL_ORDER.forEach((t, idx) => {
    const def = EQ_DEF[t];
    if (!def) return;
    const locked = def.unlocked === false;
    const selected = gs.selectedTool === t;

    const btn = document.createElement('button');
    btn.className = `tool-btn${locked ? ' locked' : ''}${selected ? ' selected' : ''}`;
    btn.innerHTML = `<span class="tool-icon">${def.icon}</span><span>${def.name}</span>`;

    if (!locked) {
      btn.onclick = () => {
        gs.selectedTool = t;
        buildSidebar();
        document.getElementById('tool-info').textContent = def.desc;
      };
    }
    list.appendChild(btn);
  });

  const selDef = EQ_DEF[gs.selectedTool];
  document.getElementById('tool-info').textContent = selDef?.desc || '';
}

// ── Canvas Input ───────────────────────────────────────────
function setupCanvas() {
  const canvas = document.getElementById('game-canvas');

  canvas.addEventListener('mousemove', e => {
    if (!gs) return;
    const r = canvas.getBoundingClientRect();
    gs.hover = {
      hx: Math.floor((e.clientX - r.left)  / C.CELL),
      hy: Math.floor((e.clientY - r.top)   / C.CELL),
    };
  });

  canvas.addEventListener('mouseleave', () => { if (gs) gs.hover = null; });

  canvas.addEventListener('click', e => {
    if (!gs || gs.state !== 'build') return;
    const r  = canvas.getBoundingClientRect();
    const gx = Math.floor((e.clientX - r.left) / C.CELL);
    const gy = Math.floor((e.clientY - r.top)  / C.CELL);
    if (!inBounds(gx, gy)) return;
    const cell = gs.map.grid[gy][gx];
    if (cell.terrain === C.CORE) return;

    // If clicking on a multi-recipe machine, cycle its recipe
    if (cell.equipment) {
      const t = cell.equipment.type;
      if (t === C.EQ.CHEM_PLANT || t === C.EQ.ADV_ASSEMBLER) {
        const recipes = EQ_DEF[t].recipes;
        cell.equipment.recipeIdx = ((cell.equipment.recipeIdx || 0) + 1) % recipes.length;
        const r = recipes[cell.equipment.recipeIdx];
        document.getElementById('tool-info').textContent =
          `レシピ: ${r.icon} ${r.name}`;
        return;
      }
      return; // don't stack other equipment
    }

    const def = EQ_DEF[gs.selectedTool];
    if (!def || def.unlocked === false) return;

    // Validate terrain
    if (gs.selectedTool === C.EQ.MINER) {
      if (!def.validTerrain.includes(cell.terrain)) return;
    }
    if (gs.selectedTool === C.EQ.OIL_PUMP) {
      if (cell.terrain !== C.OIL_WELL) return;
    }

    const eq = makeEquipment(gs.selectedTool, gs.selectedDir);
    cell.equipment = eq;
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!gs || gs.state !== 'build') return;
    const r  = canvas.getBoundingClientRect();
    const gx = Math.floor((e.clientX - r.left) / C.CELL);
    const gy = Math.floor((e.clientY - r.top)  / C.CELL);
    if (!inBounds(gx, gy)) return;
    gs.map.grid[gy][gx].equipment = null;
    gs.map.grid[gy][gx].item      = null;
  });

  window.addEventListener('keydown', e => {
    if (!gs || gs.state !== 'build') return;
    if (e.key === 'r' || e.key === 'R') {
      gs.selectedDir = (gs.selectedDir + 1) % 4;
    }
    // 1-9 shortcuts for tool selection
    const idx = parseInt(e.key) - 1;
    if (idx >= 0 && idx < TOOL_ORDER.length) {
      const t = TOOL_ORDER[idx];
      if (EQ_DEF[t]?.unlocked !== false) {
        gs.selectedTool = t;
        buildSidebar();
      }
    }
  });
}

// ── Canvas resize ──────────────────────────────────────────
function resizeCanvas() {
  const canvas = document.getElementById('game-canvas');
  canvas.width  = C.COLS * C.CELL;
  canvas.height = C.ROWS * C.CELL;
}

// ── Screen management ──────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Bootstrap ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('start-btn').onclick     = initGame;
  document.getElementById('retry-btn').onclick     = initGame;
  document.getElementById('next-wave-btn').onclick = sendWave;
  setupCanvas();
  showScreen('title-screen');
});

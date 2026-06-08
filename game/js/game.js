let gs       = null;
let animId   = null;
let lastTime = 0;
let tickAcc  = 0;
const TICK_MS = 1000 / 60;

const TOOL_ORDER = [
  C.EQ.MINER, C.EQ.CONVEYOR, C.EQ.FURNACE, C.EQ.ASSEMBLER,
  C.EQ.TURRET, C.EQ.WALL,
  C.EQ.OIL_PUMP, C.EQ.WATER_PUMP, C.EQ.COKE_OVEN,
  C.EQ.DISTILLATION, C.EQ.CHEM_PLANT, C.EQ.ELECTROLYZER,
  C.EQ.ADV_ASSEMBLER, C.EQ.GENERATOR, C.EQ.LASER,
];

// ── Run modes ─────────────────────────────────────────────
const MODES = {
  standard: {
    label: 'STANDARD',
    icon: '⚙',
    desc: '通常ルール。設備建設にはリソースが必要。化学設備はアップグレードで解放。',
    sub: '敵: 通常 / イベント: 50% / 選択肢: 3択',
    enemyMult: 1.0,
    eventChance: 0.5,
    upgradeCount: 3,
    startRes: { iron_plate: 8, copper_plate: 4 },
    unlockAll: false,
  },
  industrial: {
    label: 'INDUSTRIAL',
    icon: '🏭',
    desc: '初期リソースは鉱石のみ。自力で経済を構築せよ。敵が強化されているが報酬も豪華。',
    sub: '敵: +20%強化 / イベント: 75% / 選択肢: 3択',
    enemyMult: 1.2,
    eventChance: 0.75,
    upgradeCount: 3,
    startRes: { iron_ore: 30, copper_ore: 15, coal: 10, sulfur: 5 },
    unlockAll: false,
  },
  chaos: {
    label: 'CHAOS',
    icon: '💀',
    desc: '化学設備が最初から全て解放。敵は大幅に強化されるが選択肢が豊富。毎Wave必ずイベント。',
    sub: '敵: +50%強化 / イベント: 必ず / 選択肢: 4択',
    enemyMult: 1.5,
    eventChance: 1.0,
    upgradeCount: 4,
    startRes: { iron_plate: 5, copper_plate: 3, iron_ore: 20, coal: 10 },
    unlockAll: true,
  },
};

// ── Init ──────────────────────────────────────────────────
function startWithMode(modeKey) {
  const mode = MODES[modeKey];

  EQ_DEF.laser.unlocked        = mode.unlockAll;
  EQ_DEF.generator.unlocked    = mode.unlockAll;
  EQ_DEF.distillation.unlocked = mode.unlockAll;
  EQ_DEF.chem_plant.unlocked   = mode.unlockAll;
  EQ_DEF.electrolyzer.unlocked = mode.unlockAll;
  EQ_DEF.adv_assembler.unlocked= mode.unlockAll;

  gs = {
    state: 'build',
    wave: 0,
    mode: modeKey,
    modeDef: mode,
    map: generateMap(),
    resources: { ...mode.startRes },
    enemies: [], projectiles: [],
    coreHp: 100, coreMaxHp: 100,
    upgrades: {},
    takenUpgrades: new Set(),
    triggeredSynergies: new Set(),
    upgradeBonus: null,
    gears: [],
    gearFlags: {},
    pendingGearDrops: 0,
    nextWaveEnemyReduction: 0,
    selectedTool: C.EQ.MINER,
    selectedDir: C.DIR.RIGHT,
    hover: null,
    goalItem: C.RES.ADV_CIRCUIT,
    goalTarget: 5,
    killCount: 0,
    waveKills: 0,
  };

  resizeCanvas();
  buildSidebar();
  updateGearDisplay();
  showScreen('game-screen');
  updateHUD();
  document.getElementById('next-wave-btn').disabled = false;
  setPhase('build');

  if (animId) cancelAnimationFrame(animId);
  lastTime = 0; tickAcc = 0;
  animId = requestAnimationFrame(loop);
}

function initGame() { showScreen('modifier-screen'); }

function buildModifierScreen() {
  const container = document.getElementById('modifier-cards');
  container.innerHTML = '';
  for (const [key, mode] of Object.entries(MODES)) {
    const card = document.createElement('div');
    card.className = 'modifier-card';
    card.innerHTML = `
      <div class="mod-icon">${mode.icon}</div>
      <div class="mod-label">${mode.label}</div>
      <div class="mod-desc">${mode.desc}</div>
      <div class="mod-sub">${mode.sub}</div>
    `;
    card.onclick = () => startWithMode(key);
    container.appendChild(card);
  }
}

// ── Game Loop ─────────────────────────────────────────────
function loop(ts) {
  animId = requestAnimationFrame(loop);
  const dt = lastTime ? Math.min(ts - lastTime, 100) : 16;
  lastTime = ts;

  if (gs.state === 'wave' || gs.state === 'build') {
    tickAcc += dt;
    while (tickAcc >= TICK_MS) { tickAcc -= TICK_MS; tick(); }
    if (gs.state === 'wave') { updateEnemies(gs, dt); checkWaveEnd(); }
    else checkVictory();
  }

  render(document.getElementById('game-canvas'), gs);
  updateHUD();
}

function tick() {
  for (let y = 0; y < C.ROWS; y++) {
    for (let x = 0; x < C.COLS; x++) {
      const cell = gs.map.grid[y][x];
      cell.x = x; cell.y = y;
      if (cell.equipment) EQ_DEF[cell.equipment.type]?.onTick?.(cell, gs);
    }
  }
}

function checkVictory() {
  if ((gs.resources[gs.goalItem] || 0) >= gs.goalTarget) {
    gs.state = 'over';
    document.getElementById('over-title').textContent = '🏭 VICTORY!';
    document.getElementById('over-msg').textContent =
      `Wave ${gs.wave} | 高度回路基板 ${gs.resources[C.RES.ADV_CIRCUIT]} 個達成！ [${gs.modeDef.label}] | ギア: ${gs.gears.length}個`;
    showScreen('gameover-screen');
  }
}

function checkWaveEnd() {
  if (gs.coreHp <= 0) {
    // phoenix_protocol gear: one-time revival
    if (hasGear(gs, 'phoenix_protocol') && !gs.gearFlags.phoenixUsed) {
      gs.gearFlags.phoenixUsed = true;
      gs.coreHp = 50;
      showSynergyPopup({
        icon: '🦅', name: 'フェニックスプロトコル発動！',
        desc: 'コアが50HPで復活した', color: '#1a1500', border: '#ffcc44',
      });
      return;
    }
    gs.state = 'over';
    document.getElementById('over-title').textContent = 'FACTORY DESTROYED';
    document.getElementById('over-msg').textContent   =
      `Wave ${gs.wave} / ${gs.killCount} kills [${gs.modeDef.label}] | ギア: ${gs.gears.length}個`;
    showScreen('gameover-screen');
    return;
  }
  if (gs.enemies.length === 0) {
    gs.state = 'upgrade';
    waveCompleteFlow();
  }
}

// ── Wave ──────────────────────────────────────────────────
function sendWave() {
  if (gs.state !== 'build') return;
  gs.wave++;
  gs.waveKills = 0;
  gs.state = 'wave';
  gs.enemies = []; gs.projectiles = [];
  spawnWaveWithMode(gs);
  gearWaveStart(gs);
  document.getElementById('next-wave-btn').disabled = true;
  document.getElementById('wave-num').textContent   = gs.wave;
  setPhase('wave');
}

function spawnWaveWithMode(gs) {
  const origMult = gs._enemyMult;
  gs._enemyMult  = gs.modeDef.enemyMult;
  spawnWave(gs);
  gs._enemyMult  = origMult;
}

// ── Wave Complete Flow ────────────────────────────────────
function waveCompleteFlow() {
  gearWaveEnd(gs);
  showNextGearOrContinue();
}

// Drain any pending gear drops, then show event → upgrade
function showNextGearOrContinue() {
  if ((gs.pendingGearDrops || 0) > 0) {
    gs.pendingGearDrops--;
    const choices = getGearChoices(gs, 3);
    if (choices.length > 0) {
      showGearScreen(choices, showNextGearOrContinue);
      return;
    }
  }
  const chance = gs.modeDef.eventChance;
  if (Math.random() < chance) {
    const event = getRandomEvent(gs);
    if (event) { showEventScreen(event, flushGearsAndUpgrade); return; }
  }
  showUpgradeScreen();
}

// After event: drain gear drops added by event choices, then upgrade
function flushGearsAndUpgrade() {
  if ((gs.pendingGearDrops || 0) > 0) {
    gs.pendingGearDrops--;
    const choices = getGearChoices(gs, 3);
    if (choices.length > 0) {
      showGearScreen(choices, flushGearsAndUpgrade);
      return;
    }
  }
  showUpgradeScreen();
}

// ── Upgrade Screen ────────────────────────────────────────
function showUpgradeScreen() {
  let count  = gs.modeDef.upgradeCount + (gs.gearFlags?.extraUpgradeChoices || 0);
  let rarity = null;

  if (gs.upgradeBonus === 'five_choices')      { count = 5; gs.upgradeBonus = null; }
  else if (gs.upgradeBonus === 'guaranteed_rare') { rarity = 'rare';      gs.upgradeBonus = null; }
  else if (gs.upgradeBonus === 'guaranteed_epic') { rarity = 'epic';      gs.upgradeBonus = null; }
  else if (gs.upgradeBonus === 'two_epics')       { rarity = 'two_epics'; gs.upgradeBonus = null; }

  const choices   = getUpgradeChoices(gs, count, rarity);
  const container = document.getElementById('upgrade-cards');
  container.innerHTML = '';

  const synergyHints = getSynergyHints(gs);
  const hintEl = document.getElementById('synergy-hints');
  if (hintEl) {
    hintEl.innerHTML = synergyHints.map(h =>
      `<span class="syn-hint" title="${h.requires.join(' + ')} で発動">🔗 ${h.name} まであと${h.missing}個</span>`
    ).join('');
  }

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
      gs.takenUpgrades.add(u.id);
      checkSynergies(gs);
      showScreen('game-screen');
      gs.state = 'build';
      document.getElementById('next-wave-btn').disabled = false;
      setPhase('build');
      buildSidebar();
    };
    container.appendChild(card);
  }
  showScreen('upgrade-screen');
}

function getSynergyHints(gs) {
  return SYNERGIES
    .filter(s => !gs.triggeredSynergies.has(s.id))
    .map(s => ({
      ...s,
      missing: s.requires.filter(id => !gs.takenUpgrades.has(id)).length,
    }))
    .filter(s => s.missing === 1)
    .slice(0, 2);
}

// ── HUD ──────────────────────────────────────────────────
function updateHUD() {
  if (!gs) return;
  const hp = Math.max(0, gs.coreHp);
  document.getElementById('core-hp-text').textContent = Math.ceil(hp);
  document.getElementById('core-hp-fill').style.width = (hp / gs.coreMaxHp * 100) + '%';

  const goal = gs.resources[gs.goalItem] || 0;
  document.getElementById('goal-fill').style.width  = (Math.min(1, goal / gs.goalTarget) * 100) + '%';
  document.getElementById('goal-text').textContent   = `高度回路 ${goal}/${gs.goalTarget}`;

  document.querySelectorAll('#storage-panel .res-row').forEach(row => {
    const val = Math.floor(gs.resources[row.dataset.res] || 0);
    const el  = row.querySelector('.res-val');
    el.textContent = val;
    el.className   = 'res-val' + (val > 0 ? ' nonzero' : '');
  });
}

function setPhase(phase) {
  const el = document.getElementById('hud-phase');
  el.textContent = phase === 'build' ? 'BUILD PHASE' : `WAVE ${gs.wave}`;
  el.className   = `hud-phase ${phase}`;
}

// ── Sidebar ───────────────────────────────────────────────
function buildSidebar() {
  const list = document.getElementById('tool-list');
  list.innerHTML = '';

  TOOL_ORDER.forEach(t => {
    const def = EQ_DEF[t];
    if (!def) return;
    const locked   = def.unlocked === false;
    const selected = gs.selectedTool === t;
    const canBuild = !locked && canAffordEquipment(t, gs);

    const btn = document.createElement('button');
    btn.className = `tool-btn${locked ? ' locked' : ''}${selected ? ' selected' : ''}${!locked && !canBuild ? ' unaffordable' : ''}`;
    btn.innerHTML = `<span class="tool-icon">${def.icon}</span><span>${def.name}</span>`;

    if (!locked) {
      btn.onclick = () => {
        gs.selectedTool = t;
        buildSidebar();
        showToolInfo(t);
      };
    }
    list.appendChild(btn);
  });

  showToolInfo(gs.selectedTool);
}

function showToolInfo(t) {
  const def      = EQ_DEF[t];
  const costStr  = formatEquipmentCost(t);
  const canBuild = canAffordEquipment(t, gs);
  const costClass = canBuild ? 'cost-ok' : 'cost-ng';
  document.getElementById('tool-info').innerHTML =
    `<div>${def?.desc || ''}</div>` +
    `<div class="build-cost ${costClass}">コスト: ${costStr}</div>`;
}

// ── Canvas Input ──────────────────────────────────────────
function setupCanvas() {
  const canvas = document.getElementById('game-canvas');

  canvas.addEventListener('mousemove', e => {
    if (!gs) return;
    const r = canvas.getBoundingClientRect();
    gs.hover = {
      hx: Math.floor((e.clientX - r.left) / C.CELL),
      hy: Math.floor((e.clientY - r.top)  / C.CELL),
    };
    if (gs.state === 'build') showToolInfo(gs.selectedTool);
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

    if (cell.equipment) {
      const t = cell.equipment.type;
      if (t === C.EQ.CHEM_PLANT || t === C.EQ.ADV_ASSEMBLER) {
        const recipes = EQ_DEF[t].recipes;
        cell.equipment.recipeIdx = ((cell.equipment.recipeIdx || 0) + 1) % recipes.length;
        const recipe = recipes[cell.equipment.recipeIdx];
        document.getElementById('tool-info').innerHTML =
          `<div>レシピ切替: ${recipe.icon} <b>${recipe.name}</b></div>`;
        return;
      }
      return;
    }

    const def = EQ_DEF[gs.selectedTool];
    if (!def || def.unlocked === false) return;

    if (gs.selectedTool === C.EQ.MINER    && !def.validTerrain.includes(cell.terrain)) return;
    if (gs.selectedTool === C.EQ.OIL_PUMP && cell.terrain !== C.OIL_WELL)             return;

    if (!canAffordEquipment(gs.selectedTool, gs)) {
      flashInfo('リソース不足！ ' + formatEquipmentCost(gs.selectedTool));
      return;
    }

    deductEquipmentCost(gs.selectedTool, gs);
    cell.equipment = makeEquipment(gs.selectedTool, gs.selectedDir);
    buildSidebar();
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!gs || gs.state !== 'build') return;
    const r  = canvas.getBoundingClientRect();
    const gx = Math.floor((e.clientX - r.left) / C.CELL);
    const gy = Math.floor((e.clientY - r.top)  / C.CELL);
    if (!inBounds(gx, gy)) return;
    const cell = gs.map.grid[gy][gx];
    if (cell.equipment) {
      const cost       = EQ_DEF[cell.equipment.type]?.cost || {};
      // memory_alloy gear: 100% refund instead of 50%
      const refundRate = hasGear(gs, 'memory_alloy') ? 1.0 : 0.5;
      for (const [k, v] of Object.entries(cost)) addRes(gs, k, Math.floor(v * refundRate));
      cell.equipment = null;
      cell.item = null;
      buildSidebar();
    }
  });

  window.addEventListener('keydown', e => {
    if (!gs || gs.state !== 'build') return;
    if (e.key === 'r' || e.key === 'R') {
      gs.selectedDir = (gs.selectedDir + 1) % 4;
    }
    const idx = parseInt(e.key) - 1;
    if (idx >= 0 && idx < TOOL_ORDER.length) {
      const t = TOOL_ORDER[idx];
      if (EQ_DEF[t]?.unlocked !== false) { gs.selectedTool = t; buildSidebar(); }
    }
  });
}

function flashInfo(msg) {
  const el = document.getElementById('tool-info');
  el.innerHTML = `<div class="flash-msg">${msg}</div>`;
  setTimeout(() => showToolInfo(gs.selectedTool), 1500);
}

// ── Canvas resize ─────────────────────────────────────────
function resizeCanvas() {
  const canvas = document.getElementById('game-canvas');
  canvas.width  = C.COLS * C.CELL;
  canvas.height = C.ROWS * C.CELL;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Bootstrap ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildModifierScreen();
  document.getElementById('start-btn').onclick     = initGame;
  document.getElementById('retry-btn').onclick     = initGame;
  document.getElementById('next-wave-btn').onclick = sendWave;
  setupCanvas();
  showScreen('title-screen');
});

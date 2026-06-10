let gs       = null;
let animId   = null;
let lastTime = 0;
let tickAcc  = 0;
const TICK_MS = 1000 / 60;

const TOOL_ORDER = [
  C.EQ.EXTRACTOR, C.EQ.INSERTER, C.EQ.CONVEYOR,
  C.EQ.FURNACE, C.EQ.ASSEMBLER,
  C.EQ.TURRET, C.EQ.WALL,
  C.EQ.OIL_PUMP, C.EQ.WATER_PUMP, C.EQ.COKE_OVEN,
  C.EQ.DISTILLATION, C.EQ.CHEM_PLANT, C.EQ.ELECTROLYZER,
  C.EQ.ADV_ASSEMBLER, C.EQ.GENERATOR, C.EQ.LASER,
  C.EQ.MINER,
];

// ── Run modes ─────────────────────────────────────────────
const MODES = {
  standard: {
    label: 'STANDARD', icon: '⚙',
    desc: '通常ルール。初期資源あり。工業と探索のバランスを学ぶのに最適。',
    sub: '敵: 通常 / アップグレード選択肢: 3択',
    enemyMult: 1.0, upgradeCount: 3,
    startRes: { iron_plate: 12, copper_plate: 6, iron_ore: 20, copper_ore: 12, coal: 10 },
    unlockAll: false,
  },
  industrial: {
    label: 'INDUSTRIAL', icon: '🏭',
    desc: '初期リソースはほぼ鉱石のみ。自力で経済を構築せよ。敵が強化されている。',
    sub: '敵: +20%強化 / アップグレード選択肢: 3択',
    enemyMult: 1.2, upgradeCount: 3,
    startRes: { iron_ore: 35, copper_ore: 25, coal: 20, iron_plate: 4 },
    unlockAll: false,
  },
  chaos: {
    label: 'CHAOS', icon: '💀',
    desc: '化学設備が最初から全て解放。敵は大幅に強化されるが選択肢が豊富。',
    sub: '敵: +50%強化 / アップグレード選択肢: 4択',
    enemyMult: 1.5, upgradeCount: 4,
    startRes: { iron_plate: 10, copper_plate: 6, iron_ore: 25, coal: 12 },
    unlockAll: true,
  },
};

// ── Init ──────────────────────────────────────────────────
function startWithMode(modeKey) {
  const mode = MODES[modeKey];

  EQ_DEF.laser.unlocked         = mode.unlockAll;
  EQ_DEF.generator.unlocked     = mode.unlockAll;
  EQ_DEF.distillation.unlocked  = mode.unlockAll;
  EQ_DEF.chem_plant.unlocked    = mode.unlockAll;
  EQ_DEF.electrolyzer.unlocked  = mode.unlockAll;
  EQ_DEF.adv_assembler.unlocked = mode.unlockAll;

  gs = {
    state: 'play',           // play | reward | over
    view: 'factory',         // factory | mission
    mode: modeKey, modeDef: mode,
    factoryMap: generateFactoryMap(),
    mission: null,           // { node, type, map, combatActive, timer, depth }
    map: null,               // points at the currently-viewed map
    rogue: generateRogueMap(),
    resources: { ...mode.startRes },
    enemies: [], projectiles: [], spawnPoints: [],
    coreHp: 100, coreMaxHp: 100,   // persistent across the whole run (StS-style)
    upgrades: {},
    takenUpgrades: new Set(),
    triggeredSynergies: new Set(),
    upgradeBonus: null,
    gears: [], gearFlags: {},
    pendingGearDrops: 0,
    nextWaveEnemyReduction: 0,
    power: 0, powerMax: 500,
    waveProductionCount: 0, waveObjective: null,
    bonusUpgradeCount: 0, surgeTimer: 0, productionHealAccum: 0,
    flowField: null, flowFieldDirty: false,
    cam: { x: 0, y: 0 },
    selectedTool: C.EQ.FURNACE, selectedDir: C.DIR.RIGHT,
    hover: null,
    goalItem: C.RES.ADV_CIRCUIT, goalTarget: 25,
    killCount: 0, waveKills: 0, wave: 0,
    afterUpgrade: null,
    _missionTick: false,
    pendingPlacement: null,   // { tool, x, y, dir } — two-step placement
  };
  gs.map = gs.factoryMap;

  showScreen('game-screen');
  resizeCanvas();
  setView('factory');
  buildSidebar();
  updateGearDisplay();
  updateHUD();
  updateActionButton();

  if (animId) cancelAnimationFrame(animId);
  lastTime = 0; tickAcc = 0;
  animId = requestAnimationFrame(loop);

  openRogueMap();   // show the route at run start
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

// ── View switching (factory ⇄ mission) ───────────────────
function setView(v) {
  if (v === 'mission' && !gs.mission) v = 'factory';
  gs.view = v;
  gs.map  = (v === 'mission') ? gs.mission.map : gs.factoryMap;

  document.getElementById('tab-factory')?.classList.toggle('active', v === 'factory');
  const tm = document.getElementById('tab-mission');
  if (tm) {
    tm.style.display = gs.mission ? '' : 'none';
    tm.classList.toggle('active', v === 'mission');
  }

  centerCamera();
  buildSidebar();
  updateActionButton();
}

function withWorld(world, fn) {
  const prev = gs.map;
  gs.map = world;
  fn();
  gs.map = prev;
}

// ── Camera ────────────────────────────────────────────────
function resizeCanvas() {
  const canvas = document.getElementById('game-canvas');
  canvas.width  = Math.max(400, window.innerWidth  - 198);
  canvas.height = Math.max(300, window.innerHeight - 58);
  if (gs) centerCamera();
}

function centerCamera() {
  const canvas = document.getElementById('game-canvas');
  const vw = Math.ceil(canvas.width  / C.CELL);
  const vh = Math.ceil(canvas.height / C.CELL);
  const cx = (gs.view === 'mission' && gs.map.hasCore) ? C.CORE_X : Math.floor(C.COLS / 2);
  const cy = (gs.view === 'mission' && gs.map.hasCore) ? C.CORE_Y : Math.floor(C.ROWS / 2);
  gs.cam.x = Math.max(0, Math.min(C.COLS - vw, cx - Math.floor(vw / 2)));
  gs.cam.y = Math.max(0, Math.min(C.ROWS - vh, cy - Math.floor(vh / 2)));
}

function clampCam() {
  const canvas = document.getElementById('game-canvas');
  const vw = Math.ceil(canvas.width  / C.CELL);
  const vh = Math.ceil(canvas.height / C.CELL);
  gs.cam.x = Math.max(0, Math.min(C.COLS - vw, gs.cam.x));
  gs.cam.y = Math.max(0, Math.min(C.ROWS - vh, gs.cam.y));
}

// ── Game Loop ─────────────────────────────────────────────
function loop(ts) {
  animId = requestAnimationFrame(loop);
  const dt = lastTime ? Math.min(ts - lastTime, 100) : 16;
  lastTime = ts;

  if (gs.state === 'play') {
    tickAcc += dt;
    while (tickAcc >= TICK_MS) { tickAcc -= TICK_MS; tick(); }
    if (gs.mission?.combatActive) {
      withWorld(gs.mission.map, () => updateEnemies(gs, dt));
      checkBattleEnd();
    }
    checkIndustryVictory();
  }

  render(document.getElementById('game-canvas'), gs);
  updateHUD();
}

let _tickCount = 0;
function tick() {
  _tickCount++;
  if (gs.upgrades.solarPanel && _tickCount % 60 === 0) {
    gs.power = Math.min(gs.powerMax || 500, (gs.power || 0) + 1);
  }
  if (gs.surgeTimer > 0) gs.surgeTimer--;

  // Factory always runs — even mid-battle on another map
  tickGrid(gs.factoryMap, false);

  if (gs.mission) {
    tickGrid(gs.mission.map, true);
    if (gs.mission.type === 'mining') {
      gs.mission.timer--;
      if (gs.mission.timer <= 0) finishMining();
    }
  }
}

function tickGrid(world, isMission) {
  gs._missionTick = isMission;
  const prev = gs.map;
  gs.map = world;
  for (let y = 0; y < C.ROWS; y++) {
    for (let x = 0; x < C.COLS; x++) {
      const cell = world.grid[y][x];
      cell.x = x; cell.y = y;
      if (cell.equipment && cell.equipment.type !== '_occ') {
        // Production Surge: extra timer decrement = effectively 2x speed
        if (gs.surgeTimer > 0 && cell.equipment.timer > 0) cell.equipment.timer--;
        EQ_DEF[cell.equipment.type]?.onTick?.(cell, gs);
      }
    }
  }
  gs.map = prev;
  gs._missionTick = false;
}

// ── Victory / Defeat ──────────────────────────────────────
function checkIndustryVictory() {
  if ((gs.resources[gs.goalItem] || 0) >= gs.goalTarget) victory('industry');
}

function victory(kind) {
  gs.state = 'over';
  const title = kind === 'industry' ? '🏭 INDUSTRIAL VICTORY!' : '👑 ROGUE VICTORY!';
  const detail = kind === 'industry'
    ? `高度回路基板 ${gs.goalTarget} 個の生産に成功した！`
    : 'ルートマップ最深部のボスを撃破した！';
  document.getElementById('over-title').textContent = title;
  document.getElementById('over-msg').textContent =
    `${detail} [${gs.modeDef.label}] | 撃破数: ${gs.killCount} | ギア: ${gs.gears.length}個`;
  showScreen('gameover-screen');
}

function checkBattleEnd() {
  if (gs.coreHp <= 0) {
    if (hasGear(gs, 'phoenix_protocol') && !gs.gearFlags.phoenixUsed) {
      gs.gearFlags.phoenixUsed = true;
      gs.coreHp = 50;
      showSynergyPopup({ icon: '🦅', name: 'フェニックスプロトコル発動！', desc: 'コアが50HPで復活した', color: '#1a1500', border: '#ffcc44' });
      return;
    }
    gs.state = 'over';
    document.getElementById('over-title').textContent = 'CORE DESTROYED';
    document.getElementById('over-msg').textContent =
      `深度 ${currentDepth()} で撃破された / ${gs.killCount} kills [${gs.modeDef.label}] | ギア: ${gs.gears.length}個`;
    showScreen('gameover-screen');
    return;
  }
  if (gs.enemies.length === 0 && gs.mission?.combatActive) battleCleared();
}

function currentDepth() {
  const cur = gs.rogue.nodes.find(n => n.id === gs.rogue.current);
  return cur ? cur.col : 0;
}

// ── Node lifecycle ────────────────────────────────────────
function startNode(node) {
  if (gs.mission) return;
  closeRogueMap();

  if (node.type === 'event') {
    const ev = getRandomEvent(gs);
    if (!ev) {
      completeNode(node); grantNodeRewards(node); openRogueMap(); return;
    }
    gs.state = 'reward';
    showEventScreen(ev, () => {
      completeNode(node);
      grantNodeRewards(node);
      flushGearsThen(() => returnToMap());
    });
  } else if (node.type === 'treasure') {
    gs.state = 'reward';
    const choices = getGearChoices(gs, 3);
    if (choices.length === 0) {
      completeNode(node); grantNodeRewards(node); returnToMap(); return;
    }
    showGearScreen(choices, () => {
      completeNode(node);
      returnToMap();
    });
  } else if (node.type === 'forge') {
    gs.state = 'reward';
    completeNode(node);
    gs.upgradeBonus = gs.upgradeBonus || 'guaranteed_rare';
    gs.afterUpgrade = () => openRogueMap();
    showUpgradeScreen();
  } else if (node.type === 'mining') {
    startMission(node, generateMiningMap(node.col), 'mining');
  } else {
    // battle / elite / boss
    startMission(node, generateBattleMap(node.col, node.type === 'boss'), 'battle');
  }
}

function startMission(node, map, kind) {
  gs.mission = {
    node, type: kind, map,
    combatActive: false,
    timer: kind === 'mining' ? 90 * 60 : 0,   // 90 seconds for mining nodes
    depth: node.col,
  };
  gs.flowField = null;
  gs.flowFieldDirty = false;
  gs.enemies = []; gs.projectiles = []; gs.spawnPoints = [];
  setView('mission');
}

function completeNode(node) {
  node.visited = true;
  gs.rogue.current = node.id;
}

function grantNodeRewards(node) {
  for (const [k, v] of Object.entries(node.rewards.res)) addRes(gs, k, v);
}

function returnToMap() {
  gs.state = 'play';
  showScreen('game-screen');
  openRogueMap();
}

// ── Battle missions ───────────────────────────────────────
function startBattle() {
  const m = gs.mission;
  if (!m || m.type !== 'battle' || m.combatActive) return;
  gs.wave = m.depth;
  gs.waveKills = 0;
  gs.waveProductionCount = 0;
  gs.waveObjective = generateWaveObjective(gs);
  gs.enemies = []; gs.projectiles = [];
  withWorld(m.map, () => {
    generateSpawnPoints(gs);
    computeFlowField(gs);
    spawnWave(gs, {
      boss:  m.node.type === 'boss',
      elite: m.node.type === 'elite',
      mult:  gs.modeDef.enemyMult,
    });
  });
  gearWaveStart(gs);
  m.combatActive = true;
  updateActionButton();
}

function generateWaveObjective(gs) {
  const opts = [
    { res: C.RES.IRON_PLATE,   label: '鉄板',     base: 3 },
    { res: C.RES.COPPER_PLATE, label: '銅板',     base: 2 },
    { res: C.RES.CIRCUIT,      label: '回路基板', base: 1 },
    { res: C.RES.COKE,         label: 'コークス', base: 2 },
    { res: C.RES.IRON_ORE,     label: '鉄鉱石',   base: 6 },
  ];
  const o = opts[Math.floor(Math.random() * opts.length)];
  return { res: o.res, label: o.label, target: o.base + Math.floor(gs.wave / 2), progress: 0, met: false };
}

function battleCleared() {
  const mission = gs.mission;
  mission.combatActive = false;

  gearWaveEnd(gs);

  // Production Surge: heavy wartime production grants a speed buff
  if (gs.upgrades.productionSurge && (gs.waveProductionCount || 0) >= 20) {
    gs.surgeTimer = 1800;
  }

  // Overflow Smelter: auto-convert surplus ores at battle end
  if (gs.upgrades.overflowSmelter) {
    const ironConvert = Math.min(10, Math.floor((gs.resources[C.RES.IRON_ORE] || 0) / 2));
    if (ironConvert > 0) {
      gs.resources[C.RES.IRON_ORE] -= ironConvert * 2;
      addRes(gs, C.RES.IRON_PLATE, ironConvert);
    }
    const copperConvert = Math.min(8, Math.floor((gs.resources[C.RES.COPPER_ORE] || 0) / 2));
    if (copperConvert > 0) {
      gs.resources[C.RES.COPPER_ORE] -= copperConvert * 2;
      addRes(gs, C.RES.COPPER_PLATE, copperConvert);
    }
  }

  if (gs.waveObjective?.met) gs.bonusUpgradeCount = (gs.bonusUpgradeCount || 0) + 1;
  gs.waveObjective = null;

  if (mission.node.type === 'elite') gs.pendingGearDrops = (gs.pendingGearDrops || 0) + 1;

  refundMissionEquipment(mission.map);
  grantNodeRewards(mission.node);
  const node = mission.node;
  completeNode(node);

  gs.mission = null;
  gs.enemies = []; gs.projectiles = []; gs.spawnPoints = [];
  setView('factory');

  if (node.type === 'boss') { victory('rogue'); return; }

  gs.state = 'reward';
  gs.afterUpgrade = () => openRogueMap();
  flushGearsThen(() => showUpgradeScreen());
}

// ── Mining missions ───────────────────────────────────────
function finishMining() {
  const m = gs.mission;
  if (!m || m.type !== 'mining') return;
  refundMissionEquipment(m.map);
  grantNodeRewards(m.node);
  completeNode(m.node);
  gs.mission = null;
  setView('factory');
  openRogueMap();
}

// ── Mission equipment refund ──────────────────────────────
function refundMissionEquipment(map) {
  const reduction = gs.gearFlags?.buildCostReduction || 0;
  for (let y = 0; y < C.ROWS; y++) {
    for (let x = 0; x < C.COLS; x++) {
      const eq = map.grid[y][x].equipment;
      if (!eq || eq.type === '_occ') continue;
      const cost = EQ_DEF[eq.type]?.cost || {};
      for (const [k, v] of Object.entries(cost)) {
        addRes(gs, k, Math.max(0, v - reduction));
      }
    }
  }
}

// ── Reward flow helpers ───────────────────────────────────
function flushGearsThen(cb) {
  if ((gs.pendingGearDrops || 0) > 0) {
    gs.pendingGearDrops--;
    const choices = getGearChoices(gs, 3);
    if (choices.length > 0) { showGearScreen(choices, () => flushGearsThen(cb)); return; }
  }
  cb();
}

// ── Upgrade Screen ────────────────────────────────────────
function showUpgradeScreen() {
  let count  = gs.modeDef.upgradeCount + (gs.gearFlags?.extraUpgradeChoices || 0) + (gs.bonusUpgradeCount || 0);
  gs.bonusUpgradeCount = 0;
  let rarity = null;

  if      (gs.upgradeBonus === 'five_choices')    { count = Math.max(count, 5); gs.upgradeBonus = null; }
  else if (gs.upgradeBonus === 'guaranteed_rare') { rarity = 'rare';      gs.upgradeBonus = null; }
  else if (gs.upgradeBonus === 'guaranteed_epic') { rarity = 'epic';      gs.upgradeBonus = null; }
  else if (gs.upgradeBonus === 'two_epics')       { rarity = 'two_epics'; gs.upgradeBonus = null; }

  const choices   = getUpgradeChoices(gs, count, rarity);
  const container = document.getElementById('upgrade-cards');
  container.innerHTML = '';

  const hints = getSynergyHints(gs);
  const hintEl = document.getElementById('synergy-hints');
  if (hintEl) hintEl.innerHTML = hints.map(h =>
    `<span class="syn-hint" title="${h.requires.join(' + ')} で発動">🔗 ${h.name} まであと${h.missing}個</span>`
  ).join('');

  for (const u of choices) {
    const card = document.createElement('div');
    card.className = `upgrade-card rarity-card-${u.rarity}`;
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
      gs.state = 'play';
      buildSidebar();
      const cb = gs.afterUpgrade;
      gs.afterUpgrade = null;
      cb?.();
    };
    container.appendChild(card);
  }
  showScreen('upgrade-screen');
}

function getSynergyHints(gs) {
  return SYNERGIES
    .filter(s => !gs.triggeredSynergies.has(s.id))
    .map(s => ({ ...s, missing: s.requires.filter(id => !gs.takenUpgrades.has(id)).length }))
    .filter(s => s.missing === 1).slice(0, 2);
}

// ── HUD ───────────────────────────────────────────────────
function updateHUD() {
  if (!gs) return;

  // Depth (rogue progress)
  const depthEl = document.getElementById('depth-num');
  if (depthEl) depthEl.textContent = `${currentDepth()}/${gs.rogue.colCount - 1}`;

  // Core HP (persistent across the run)
  const hp      = Math.max(0, gs.coreHp);
  const hpRatio = hp / gs.coreMaxHp;
  document.getElementById('core-hp-text').textContent = Math.ceil(hp);
  const hpFill = document.getElementById('core-hp-fill');
  hpFill.style.width      = (hpRatio * 100) + '%';
  hpFill.style.background = hpRatio > 0.5 ? '#44cc66' : hpRatio > 0.25 ? '#ffaa22' : '#ff3333';

  const pw = Math.floor(gs.power || 0);
  const pwMax = gs.powerMax || 500;
  document.getElementById('power-text').textContent = `${pw}/${pwMax}`;
  const pwRatio = pw / pwMax;
  const pwFill = document.getElementById('power-fill');
  pwFill.style.width = (pwRatio * 100) + '%';
  pwFill.style.background = pwRatio < 0.15 ? '#ff3333' : pwRatio < 0.4 ? '#ffaa22' : '#33aaff';

  const goal = gs.resources[gs.goalItem] || 0;
  document.getElementById('goal-fill').style.width = (Math.min(1, goal / gs.goalTarget) * 100) + '%';
  document.getElementById('goal-text').textContent  = `高度回路 ${goal}/${gs.goalTarget}`;

  document.querySelectorAll('#storage-panel .res-row').forEach(row => {
    const val = Math.floor(gs.resources[row.dataset.res] || 0);
    const el  = row.querySelector('.res-val');
    el.textContent = val;
    const isGoal  = row.dataset.res === gs.goalItem;
    const nonzero = val > 0;
    el.className  = 'res-val';
    row.className = 'res-row' + (nonzero ? ' nonzero' : '') + (isGoal ? ' goal-res' : '');
  });

  // Mission status text
  const missionEl = document.getElementById('hud-mission');
  if (missionEl) {
    if (gs.mission?.combatActive) {
      missionEl.style.display = '';
      missionEl.style.color   = 'var(--c-red)';
      missionEl.textContent   = `敵 ${gs.enemies.length}`;
    } else if (gs.mission?.type === 'mining') {
      missionEl.style.display = '';
      missionEl.style.color   = 'var(--c-blue)';
      missionEl.textContent   = `⛏ 残り ${Math.ceil(gs.mission.timer / 60)}s`;
    } else {
      missionEl.style.display = 'none';
    }
  }
  const killsEl = document.getElementById('hud-kills');
  if (killsEl) killsEl.textContent = `${gs.killCount || 0} kills`;

  // Wave objective display (battle missions only)
  const objGroup = document.getElementById('obj-group');
  const objText  = document.getElementById('obj-text');
  const objBadge = document.getElementById('obj-badge');
  if (objGroup && gs.waveObjective && gs.mission?.combatActive) {
    objGroup.style.display = '';
    const prog = gs.waveObjective.progress || 0;
    const tgt  = gs.waveObjective.target;
    const met  = gs.waveObjective.met;
    objText.textContent = `${gs.waveObjective.label} ${prog}/${tgt}`;
    objText.style.color = met ? '#44e880' : 'var(--c-text)';
    objBadge.textContent = met ? '✓ +1択' : '+1択';
    objBadge.style.color = met ? '#44e880' : 'var(--c-dim)';
  } else if (objGroup) {
    objGroup.style.display = 'none';
  }

  // Phase chip
  const phaseEl = document.getElementById('hud-phase');
  if (phaseEl) {
    if (gs.mission?.combatActive)            { phaseEl.textContent = '⚔ COMBAT';   phaseEl.className = 'hud-phase wave'; }
    else if (gs.mission?.type === 'mining')  { phaseEl.textContent = '⛏ MINING';   phaseEl.className = 'hud-phase mining'; }
    else if (gs.mission)                     { phaseEl.textContent = '⚔ 戦闘準備'; phaseEl.className = 'hud-phase prep'; }
    else                                     { phaseEl.textContent = '🏭 FACTORY'; phaseEl.className = 'hud-phase build'; }
  }

  // Alert pulse on mission tab while combat runs unattended
  const tm = document.getElementById('tab-mission');
  if (tm) tm.classList.toggle('alert', !!gs.mission?.combatActive && gs.view !== 'mission');

  // Mining countdown on the action button
  if (gs.mission?.type === 'mining' && gs.view === 'mission') {
    const btn = document.getElementById('action-btn');
    if (btn) btn.textContent = `⛏ 撤収する（残り ${Math.ceil(gs.mission.timer / 60)}s）`;
  }
}

// ── Action button (context-sensitive) ─────────────────────
function updateActionButton() {
  const btn = document.getElementById('action-btn');
  if (!btn || !gs) return;

  if (gs.view === 'factory' || !gs.mission) {
    if (gs.mission) {
      btn.textContent = '⚔ ミッションへ戻る';
      btn.disabled = false;
      btn.onclick = () => setView('mission');
    } else {
      btn.textContent = '🗺 ルートマップを開く';
      btn.disabled = false;
      btn.onclick = openRogueMap;
    }
    return;
  }

  const m = gs.mission;
  if (m.type === 'battle') {
    if (!m.combatActive) {
      btn.textContent = '⚔ 戦闘開始';
      btn.disabled = false;
      btn.onclick = startBattle;
    } else {
      btn.textContent = '戦闘中…';
      btn.disabled = true;
      btn.onclick = null;
    }
  } else {
    btn.textContent = '⛏ 撤収する';
    btn.disabled = false;
    btn.onclick = finishMining;
  }
}

// ── Sidebar ───────────────────────────────────────────────
function buildSidebar() {
  const list = document.getElementById('tool-list');
  if (!list || !gs) return;
  list.innerHTML = '';
  TOOL_ORDER.forEach(t => {
    const def    = EQ_DEF[t];
    if (!def) return;
    const locked   = def.unlocked === false;
    const ctxLock  = !locked && ((def.place === 'mission' && gs.view !== 'mission') || (def.place === 'factory' && gs.view !== 'factory'));
    const selected = gs.selectedTool === t;
    const canBuild = !locked && canAffordEquipment(t, gs);
    const sz       = def.size || 1;
    const badge    = sz > 1 ? `<span class="tool-size-badge">${sz}×${sz}</span>` : '';
    const ctxBadge = ctxLock ? `<span class="tool-ctx-badge">出撃時</span>` : '';
    const btn = document.createElement('button');
    btn.className = `tool-btn${locked ? ' locked' : ''}${ctxLock ? ' ctx-locked' : ''}${selected ? ' selected' : ''}${!locked && !canBuild ? ' unaffordable' : ''}`;
    btn.innerHTML = `<span class="tool-icon">${def.icon}</span><span class="tool-name">${def.name}</span>${ctxBadge}${badge}`;
    if (!locked) btn.onclick = () => { gs.selectedTool = t; buildSidebar(); showToolInfo(t); };
    list.appendChild(btn);
  });
  updateDirIndicator();
  showToolInfo(gs.selectedTool);
}

function updateDirIndicator() {
  const arrows = ['→', '↓', '←', '↑'];
  const el = document.getElementById('dir-indicator');
  if (el) el.textContent = arrows[gs?.selectedDir ?? 0];
}

function showToolInfo(t) {
  const def  = EQ_DEF[t];
  const cost = EQ_DEF[t]?.cost || {};
  const reduction = gs?.gearFlags?.buildCostReduction || 0;
  const entries   = Object.entries(cost);
  const sz        = def?.size || 1;

  let costHtml;
  if (!entries.length) {
    costHtml = '<span class="cost-free">コスト無し</span>';
  } else {
    costHtml = entries.map(([k, v]) => {
      const actual = Math.max(0, v - reduction);
      const have   = gs?.resources[k] || 0;
      return `<span class="cost-chip ${have >= actual ? 'ok' : 'ng'}">${RES_NAMES[k] || k} ×${actual}</span>`;
    }).join('');
  }
  const sizeTag = sz > 1 ? `<span class="tool-size-info">${sz}×${sz}マス</span>` : '';
  const ctxNote = (def?.place === 'mission' && gs?.view !== 'mission')
    ? '<div class="tool-ctx-note">⚠ この設備は出撃先マップでのみ設置できます</div>'
    : (def?.place === 'factory' && gs?.view !== 'factory')
    ? '<div class="tool-ctx-note">⚠ この設備は工場マップでのみ設置できます</div>' : '';

  document.getElementById('tool-info').innerHTML =
    `<div class="tool-desc">${def?.desc || ''}</div>` +
    `<div class="tool-cost-row">${costHtml}${sizeTag}</div>` + ctxNote;
}

// ── Canvas Input ──────────────────────────────────────────
function setupCanvas() {
  const canvas = document.getElementById('game-canvas');

  canvas.addEventListener('mousemove', e => {
    if (!gs) return;
    const r  = canvas.getBoundingClientRect();
    gs.hover = {
      hx: Math.floor((e.clientX - r.left) / C.CELL + gs.cam.x),
      hy: Math.floor((e.clientY - r.top)  / C.CELL + gs.cam.y),
    };
  });

  canvas.addEventListener('mouseleave', () => { if (gs) gs.hover = null; });

  canvas.addEventListener('click', e => {
    if (!gs || gs.state !== 'play') return;
    const r  = canvas.getBoundingClientRect();
    const gx = Math.floor((e.clientX - r.left) / C.CELL + gs.cam.x);
    const gy = Math.floor((e.clientY - r.top)  / C.CELL + gs.cam.y);
    if (!inBounds(gx, gy)) return;

    // Second click confirms pending placement regardless of where clicked
    if (gs.pendingPlacement) {
      confirmPendingPlacement();
      return;
    }

    const cell = gs.map.grid[gy][gx];
    if (cell.terrain === C.CORE) return;

    // Resolve _occ satellite cells
    const rootCell = (cell.equipment?.type === '_occ')
      ? gs.map.grid[cell.equipment.rootY][cell.equipment.rootX]
      : cell;

    if (rootCell.equipment) {
      const t = rootCell.equipment.type;
      if (t === C.EQ.CHEM_PLANT || t === C.EQ.ADV_ASSEMBLER) {
        const recipes = EQ_DEF[t].recipes;
        rootCell.equipment.recipeIdx = ((rootCell.equipment.recipeIdx || 0) + 1) % recipes.length;
        rootCell.equipment.inventory = {};
        const recipe = recipes[rootCell.equipment.recipeIdx];
        document.getElementById('tool-info').innerHTML = `<div>レシピ切替: ${recipe.icon} <b>${recipe.name}</b></div>`;
        return;
      }
      if (t === C.EQ.EXTRACTOR) {
        const keys = Object.keys(RES_NAMES);
        const cur  = keys.indexOf(rootCell.equipment.selectedItem);
        rootCell.equipment.selectedItem = keys[(cur + 1) % keys.length];
        flashInfo(`取り出し: ${RES_NAMES[rootCell.equipment.selectedItem]}`);
        return;
      }
      return;
    }

    // First click: lock placement position
    const def = EQ_DEF[gs.selectedTool];
    if (!def || def.unlocked === false) return;
    if (def.place === 'mission' && gs.view !== 'mission') {
      flashInfo('この設備は出撃先マップ専用です'); return;
    }
    if (def.place === 'factory' && gs.view !== 'factory') {
      flashInfo('この設備は工場マップ専用です'); return;
    }
    if (!isHoverPlacementValid(gs, gx, gy, gs.selectedTool)) {
      flashInfo('ここには設置できません'); return;
    }
    gs.pendingPlacement = { tool: gs.selectedTool, x: gx, y: gy, dir: gs.selectedDir };
    flashInfo('向き確定: R キーで回転 → クリックで設置');
  });

  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!gs || gs.state !== 'play') return;
    if (gs.pendingPlacement) { gs.pendingPlacement = null; return; }
    const r  = canvas.getBoundingClientRect();
    const gx = Math.floor((e.clientX - r.left) / C.CELL + gs.cam.x);
    const gy = Math.floor((e.clientY - r.top)  / C.CELL + gs.cam.y);
    if (!inBounds(gx, gy)) return;
    const cell = gs.map.grid[gy][gx];
    let rx = gx, ry = gy, rc = cell;
    if (cell.equipment?.type === '_occ') {
      rx = cell.equipment.rootX; ry = cell.equipment.rootY;
      rc = gs.map.grid[ry][rx];
    }
    if (rc.equipment && rc.equipment.type !== '_occ') {
      const t    = rc.equipment.type;
      const cost = EQ_DEF[t]?.cost || {};
      const rate = hasGear(gs, 'memory_alloy') ? 1.0 : 0.5;
      for (const [k, v] of Object.entries(cost)) addRes(gs, k, Math.floor(v * rate));
      if (t === C.EQ.WALL) gs.flowFieldDirty = true;
      const sz = EQ_DEF[t]?.size || 1;
      for (let dy = 0; dy < sz; dy++) {
        for (let dx = 0; dx < sz; dx++) {
          const fc = gs.map.grid[ry + dy][rx + dx];
          fc.equipment = null; fc.item = null;
        }
      }
      buildSidebar();
    }
  });

  window.addEventListener('keydown', e => {
    if (!gs) return;
    // Camera pan (always active)
    const speed = 3;
    if (e.key === 'ArrowLeft'  || e.key === 'a') { gs.cam.x -= speed; clampCam(); return; }
    if (e.key === 'ArrowRight' || e.key === 'd') { gs.cam.x += speed; clampCam(); return; }
    if (e.key === 'ArrowUp'    || e.key === 'w') { gs.cam.y -= speed; clampCam(); return; }
    if (e.key === 'ArrowDown'  || e.key === 's') { gs.cam.y += speed; clampCam(); return; }
    if (e.key === 'h' || e.key === 'H') { centerCamera(); return; }

    if (gs.state !== 'play') return;

    // M: toggle rogue map / F: toggle factory⇄mission view
    if (e.key === 'm' || e.key === 'M') {
      const ov = document.getElementById('rogue-overlay');
      if (ov.classList.contains('visible')) closeRogueMap(); else openRogueMap();
      return;
    }
    if (e.key === 'f' || e.key === 'F') {
      setView(gs.view === 'factory' ? 'mission' : 'factory');
      return;
    }

    if (e.key === 'Escape') {
      gs.pendingPlacement = null;
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      if (gs.pendingPlacement) {
        gs.pendingPlacement.dir = (gs.pendingPlacement.dir + 1) % 4;
      } else {
        gs.selectedDir = (gs.selectedDir + 1) % 4;
      }
      updateDirIndicator();
    }
    const idx = parseInt(e.key) - 1;
    if (idx >= 0 && idx < TOOL_ORDER.length) {
      const t = TOOL_ORDER[idx];
      if (EQ_DEF[t]?.unlocked !== false) { gs.selectedTool = t; buildSidebar(); }
    }
  });
}

function confirmPendingPlacement() {
  const p = gs.pendingPlacement;
  if (!p) return;
  gs.pendingPlacement = null;
  gs.selectedDir = p.dir;

  if (!canAffordEquipment(p.tool, gs)) { flashInfo('リソース不足！ ' + formatEquipmentCost(p.tool)); return; }

  const gx = p.x, gy = p.y;
  if (!inBounds(gx, gy)) return;
  if (!isHoverPlacementValid(gs, gx, gy, p.tool)) { flashInfo('設置できません（場所が塞がれました）'); return; }

  deductEquipmentCost(p.tool, gs);
  const cell = gs.map.grid[gy][gx];
  cell.equipment = makeEquipment(p.tool, p.dir);
  const sz = EQ_DEF[p.tool]?.size || 1;
  if (sz === 2) {
    for (let dy = 0; dy < sz; dy++) {
      for (let dx = 0; dx < sz; dx++) {
        if (dx === 0 && dy === 0) continue;
        gs.map.grid[gy + dy][gx + dx].equipment = { type: '_occ', rootX: gx, rootY: gy };
      }
    }
  }
  if (p.tool === C.EQ.WALL) gs.flowFieldDirty = true;
  buildSidebar();
}

function flashInfo(msg) {
  const el = document.getElementById('tool-info');
  el.innerHTML = `<div class="flash-msg">${msg}</div>`;
  setTimeout(() => { if (gs) showToolInfo(gs.selectedTool); }, 1500);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Bootstrap ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildModifierScreen();
  document.getElementById('start-btn').onclick   = initGame;
  document.getElementById('retry-btn').onclick   = initGame;
  document.getElementById('tab-factory').onclick = () => setView('factory');
  document.getElementById('tab-mission').onclick = () => setView('mission');
  document.getElementById('tab-rogue').onclick   = openRogueMap;
  document.getElementById('rogue-close').onclick = closeRogueMap;
  document.getElementById('np-cancel').onclick   = hideNodePreview;
  setupCanvas();
  window.addEventListener('resize', () => { if (gs) resizeCanvas(); });
  showScreen('title-screen');
});

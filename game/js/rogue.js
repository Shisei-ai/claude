// ──────────────────────────────────────────────────────────
//  Rogue Map — 3-act node graph (Slay the Spire style)
//  第1幕 IRON AGE  (cols 0-4,  幕ボス at col 4)
//  第2幕 OIL ERA   (cols 5-9,  幕ボス at col 9)
//  第3幕 WAR IND   (cols 10-14, ファイナルボス at col 14)
//  ※工業勝利（高度回路25個）は第3幕到達（幕ボス×2撃破）が必須
// ──────────────────────────────────────────────────────────

const ACT_DEF = [
  { num: 1, name: '第1幕', label: 'IRON AGE', startCol: 0,  endCol: 4,  bossCol: 4,  color: '#6880a0' },
  { num: 2, name: '第2幕', label: 'OIL ERA',  startCol: 5,  endCol: 9,  bossCol: 9,  color: '#b0a030' },
  { num: 3, name: '第3幕', label: 'WAR IND',  startCol: 10, endCol: 14, bossCol: 14, color: '#c05050' },
];
const ROGUE_COLS   = 15;
const COL_SPACING  = 90;

const NODE_TYPES = {
  start:    { icon: '🏁', label: '出発点',         desc: 'ここから旅が始まる' },
  battle:   { icon: '⚔',  label: '戦闘',           desc: 'コアを防衛してWaveを撃退する。マップ内の鉱石は戦闘中も採掘可能。' },
  elite:    { icon: '💀', label: 'エリート戦',     desc: '強化された敵との戦闘。ギアを必ずドロップする。' },
  mining:   { icon: '⛏',  label: '採掘地帯',       desc: '制限時間内、豊富な鉱床から採掘し放題。敵は出現しない。' },
  event:    { icon: '❓', label: 'イベント',       desc: '何が起こるかわからない。トレードオフのある選択を迫られる。' },
  forge:    { icon: '🔨', label: '鍛冶場',         desc: 'レア以上のアップグレードを1つ獲得できる。' },
  treasure: { icon: '📦', label: '宝物庫',         desc: '強力なパッシブギアを1つ選んで獲得できる。' },
  act_boss: { icon: '👹', label: '幕ボス',         desc: '幕の守護者。撃破で次の幕へ進め！ギア2個と資源を大量に持つ。' },
  boss:     { icon: '👑', label: 'ファイナルボス', desc: '最深部の守護者。撃破すればローグライク勝利！' },
};

// ── Graph generation ──────────────────────────────────────
function generateRogueMap() {
  const colCount = ROGUE_COLS;
  const nodes = [];
  let idSeq = 0;

  const colNodes = [];
  for (let c = 0; c < colCount; c++) {
    const act      = c < 5 ? 1 : c < 10 ? 2 : 3;
    const isBossCol = c === 4 || c === 9 || c === colCount - 1;
    const n        = (c === 0 || isBossCol) ? 1 : 2 + Math.floor(Math.random() * 3);
    const list = [];
    for (let i = 0; i < n; i++) {
      const type = pickNodeType(c, colCount);
      const node = {
        id: idSeq++, col: c, slot: i, slots: n,
        type, act,
        rewards: nodeRewards(type, c, act),
        visited: false, next: [],
      };
      nodes.push(node);
      list.push(node);
    }
    colNodes.push(list);
  }

  // Edges: each node → nearest 1–2 nodes in next column
  const pos = n => n.slots === 1 ? 0.5 : n.slot / (n.slots - 1);
  for (let c = 0; c < colCount - 1; c++) {
    const cur = colNodes[c], nxt = colNodes[c + 1];
    for (const a of cur) {
      const sorted = [...nxt].sort((x, y) => Math.abs(pos(x) - pos(a)) - Math.abs(pos(y) - pos(a)));
      a.next.push(sorted[0].id);
      if (sorted[1] && Math.random() < 0.40) a.next.push(sorted[1].id);
    }
    for (const b of nxt) {
      if (!cur.some(a => a.next.includes(b.id))) {
        const sorted = [...cur].sort((x, y) => Math.abs(pos(x) - pos(b)) - Math.abs(pos(y) - pos(b)));
        sorted[0].next.push(b.id);
      }
    }
  }

  const start = colNodes[0][0];
  start.visited = true;
  return { nodes, colCount, current: start.id, actBossesDefeated: 0 };
}

function pickNodeType(col, colCount) {
  if (col === 0)              return 'start';
  if (col === 4 || col === 9) return 'act_boss';
  if (col === colCount - 1)   return 'boss';

  const act = col < 5 ? 1 : col < 10 ? 2 : 3;

  // First content col of each act: safe battle or mining
  if (col === 1 || col === 5 || col === 10)
    return Math.random() < 0.60 ? 'battle' : 'mining';

  const r = Math.random();
  if (act === 1) {
    if (r < 0.38) return 'battle';
    if (r < 0.56) return 'mining';
    if (r < 0.70) return 'event';
    if (r < 0.82) return 'forge';
    return 'treasure';
  }
  if (act === 2) {
    if (r < 0.30) return 'battle';
    if (r < 0.46) return 'mining';
    if (r < 0.58) return 'event';
    if (r < 0.68) return 'forge';
    if (r < 0.76) return 'treasure';
    return 'elite';
  }
  // Act 3: heavy elites dominate
  if (r < 0.22) return 'battle';
  if (r < 0.46) return 'elite';
  if (r < 0.58) return 'event';
  if (r < 0.70) return 'forge';
  if (r < 0.80) return 'treasure';
  return 'elite';
}

// ── Reward tables (per-act) ───────────────────────────────
function nodeRewards(type, col, act) {
  act = act || (col < 5 ? 1 : col < 10 ? 2 : 3);
  const d = col;

  switch (type) {
    case 'battle': {
      const pools = {
        1: [
          { res: C.RES.IRON_ORE,    n: 8  + d * 2 },
          { res: C.RES.COPPER_ORE,  n: 6  + d * 2 },
          { res: C.RES.COAL,        n: 5  + d },
          { res: C.RES.IRON_PLATE,  n: 2  + d },
        ],
        2: [
          { res: C.RES.IRON_PLATE,   n: 4  + d },
          { res: C.RES.COPPER_PLATE, n: 3  + d },
          { res: C.RES.CRUDE_OIL,    n: 5  + d },
          { res: C.RES.SULFUR,       n: 2  + Math.floor(d / 2) },
          { res: C.RES.CIRCUIT,      n: 1  + Math.floor(d / 3) },
        ],
        3: [
          { res: C.RES.CIRCUIT,        n: 3 + Math.floor(d / 2) },
          { res: C.RES.PLASTIC,        n: 3 + Math.floor(d / 2) },
          { res: C.RES.REFINED_COPPER, n: 2 + Math.floor(d / 3) },
          { res: C.RES.EXPLOSIVES,     n: 2 + Math.floor(d / 4) },
          { res: C.RES.ADV_CIRCUIT,    n: 1 + Math.floor(d / 5) },
        ],
      };
      const pool = pools[act] || pools[1];
      const sel  = shuffled(pool).slice(0, 2);
      const res  = {};
      sel.forEach(s => { res[s.res] = s.n; });
      return { res, extras: ['アップグレード選択'] };
    }

    case 'elite': {
      const res =
        act === 3
          ? { [C.RES.CIRCUIT]: 4 + Math.floor(d / 2), [C.RES.PLASTIC]: 3, [C.RES.REFINED_COPPER]: 2 }
          : act === 2
          ? { [C.RES.IRON_PLATE]: 4 + d, [C.RES.COPPER_PLATE]: 3 + d, [C.RES.CIRCUIT]: 2 + Math.floor(d / 2) }
          : { [C.RES.IRON_PLATE]: 4 + d, [C.RES.COPPER_PLATE]: 3 + d };
      return { res, extras: ['ギア獲得（確定）', 'アップグレード選択'] };
    }

    case 'mining': {
      const pools = {
        1: { [C.RES.IRON_ORE]: 18 + d * 2,  [C.RES.COPPER_ORE]: 12 + d * 2, [C.RES.COAL]: 10 + d },
        2: { [C.RES.CRUDE_OIL]: 14 + d * 2, [C.RES.SULFUR]:     8  + d,      [C.RES.COAL]: 6  + d },
        3: { [C.RES.CRUDE_OIL]: 20 + d * 2, [C.RES.SULFUR]:     12 + d,      [C.RES.IRON_ORE]: 10 + d },
      };
      return { res: pools[act] || pools[1], extras: ['制限時間内 採掘し放題'] };
    }

    case 'act_boss': {
      const which = col <= 4 ? 1 : 2;
      const res =
        which === 1
          ? { [C.RES.IRON_PLATE]: 12, [C.RES.COPPER_PLATE]: 8, [C.RES.COAL]: 10 }
          : { [C.RES.CIRCUIT]: 6, [C.RES.CRUDE_OIL]: 15, [C.RES.COPPER_PLATE]: 10 };
      return { res, extras: [`✦ 第${which + 1}幕へ進出！`, 'ギア2個獲得', 'アップグレード選択'] };
    }

    case 'event':    return { res: {}, extras: ['？？？（選択次第）'] };
    case 'forge':    return { res: {}, extras: ['レア以上のアップグレード確定'] };
    case 'treasure': return { res: {}, extras: ['ギアを1つ選択'] };
    case 'boss':     return { res: {}, extras: ['🏆 ローグライク勝利（最終）'] };
    default:         return { res: {}, extras: [] };
  }
}

// ── Overlay rendering ─────────────────────────────────────
function openRogueMap() {
  if (!gs) return;
  renderRogueMap();
  document.getElementById('rogue-overlay').classList.add('visible');
}

function closeRogueMap() {
  document.getElementById('rogue-overlay').classList.remove('visible');
  hideNodePreview();
}

function renderRogueMap() {
  const rg = gs.rogue;
  const nodesEl = document.getElementById('rogue-nodes');
  const svg     = document.getElementById('rogue-lines');
  const wrap    = document.getElementById('rogue-canvas-wrap');
  nodesEl.innerHTML = '';
  svg.innerHTML = '';

  const W = 60 + (rg.colCount - 1) * COL_SPACING + 60;
  const H = 440;
  wrap.style.width  = W + 'px';
  wrap.style.height = H + 'px';
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);

  const pos = n => n.slots === 1 ? 0.5 : n.slot / (n.slots - 1);
  const xy  = n => ({ x: 60 + n.col * COL_SPACING, y: 60 + pos(n) * (H - 120) });

  const cur       = rg.nodes.find(n => n.id === rg.current) || rg.nodes[0];
  const reachable = new Set(gs.mission ? [] : cur.next);

  // Act background tint bands
  const bandColors = ['rgba(72,88,112,0.10)', 'rgba(88,80,24,0.10)', 'rgba(88,24,24,0.10)'];
  for (let a = 0; a < 3; a++) {
    const def = ACT_DEF[a];
    const bx1 = 60 + def.startCol * COL_SPACING - COL_SPACING / 2 + 4;
    const bx2 = 60 + def.endCol   * COL_SPACING + COL_SPACING / 2 - 4;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', bx1); rect.setAttribute('y', 0);
    rect.setAttribute('width', bx2 - bx1); rect.setAttribute('height', H);
    rect.setAttribute('fill', bandColors[a]);
    svg.appendChild(rect);
  }

  // Dividers between acts (between cols 4-5 and 9-10)
  for (const divCol of [5, 10]) {
    const dx = 60 + divCol * COL_SPACING - COL_SPACING / 2;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', dx); line.setAttribute('y1', 0);
    line.setAttribute('x2', dx); line.setAttribute('y2', H);
    line.setAttribute('stroke', '#3a4858');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-dasharray', '5 4');
    svg.appendChild(line);
  }

  // Act labels at top
  for (const def of ACT_DEF) {
    const ax = 60 + Math.round((def.startCol + def.endCol) / 2) * COL_SPACING;
    const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t1.setAttribute('x', ax); t1.setAttribute('y', 16);
    t1.setAttribute('fill', def.color); t1.setAttribute('font-size', '11');
    t1.setAttribute('font-weight', 'bold'); t1.setAttribute('text-anchor', 'middle');
    t1.textContent = def.name;
    svg.appendChild(t1);
    const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t2.setAttribute('x', ax); t2.setAttribute('y', 28);
    t2.setAttribute('fill', def.color); t2.setAttribute('font-size', '8');
    t2.setAttribute('text-anchor', 'middle');
    t2.textContent = def.label;
    svg.appendChild(t2);
  }

  // Edges
  for (const n of rg.nodes) {
    const a = xy(n);
    for (const nid of n.next) {
      const m = rg.nodes.find(z => z.id === nid);
      const b = xy(m);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
      const hot = n.id === cur.id && reachable.has(nid);
      line.setAttribute('stroke', hot ? '#f0a060' : (n.visited && m.visited ? '#3a4a3a' : '#2e2e48'));
      line.setAttribute('stroke-width', hot ? 2.5 : 1.5);
      if (hot) line.setAttribute('stroke-dasharray', '6 3');
      svg.appendChild(line);
    }
  }

  // Nodes
  for (const n of rg.nodes) {
    const p  = xy(n);
    const el = document.createElement('div');
    el.className = 'rogue-node'
      + (n.visited    ? ' visited'    : '')
      + (n.id === rg.current ? ' current' : '')
      + (reachable.has(n.id) ? ' reachable' : '')
      + (n.type === 'act_boss'  ? ' act-boss'   : '')
      + (n.type === 'boss'      ? ' final-boss'  : '');
    el.style.left = (p.x - 25) + 'px';
    el.style.top  = (p.y - 25) + 'px';
    el.innerHTML  = `<span class="rn-icon">${NODE_TYPES[n.type].icon}</span>`;
    el.title = NODE_TYPES[n.type].label;
    if (reachable.has(n.id)) el.onclick = () => showNodePreview(n);
    nodesEl.appendChild(el);
  }

  // Progress indicator
  const hint = document.getElementById('rogue-progress');
  if (hint) {
    const act    = cur.act || 1;
    const actDef = ACT_DEF[act - 1];
    const posInAct = cur.col - actDef.startCol + 1;
    const actLen   = actDef.endCol - actDef.startCol + 1;
    const beaten   = rg.actBossesDefeated || 0;
    hint.textContent = `${actDef.name} ${posInAct}/${actLen} | 幕ボス: ${beaten}/2撃破`;
  }
}

// ── Node preview panel ────────────────────────────────────
function showNodePreview(node) {
  const t  = NODE_TYPES[node.type];
  const el = document.getElementById('node-preview');
  document.getElementById('np-icon').textContent  = t.icon;
  document.getElementById('np-title').textContent = t.label;
  document.getElementById('np-desc').textContent  = t.desc;

  const list = document.getElementById('np-rewards');
  list.innerHTML = '';
  for (const [k, v] of Object.entries(node.rewards.res)) {
    const li = document.createElement('div');
    li.className = 'np-reward-item';
    li.textContent = `📦 ${RES_NAMES[k] || k} ×${v}`;
    list.appendChild(li);
  }
  for (const ex of node.rewards.extras) {
    const li = document.createElement('div');
    li.className = 'np-reward-item extra';
    li.textContent = `✦ ${ex}`;
    list.appendChild(li);
  }

  document.getElementById('np-go').onclick = () => {
    hideNodePreview();
    startNode(node);
  };
  el.style.display = 'flex';
}

function hideNodePreview() {
  document.getElementById('node-preview').style.display = 'none';
}

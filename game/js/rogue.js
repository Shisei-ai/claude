// ──────────────────────────────────────────────────────────
//  Rogue Map — horizontal branching node graph
//  (Slay the Spire style, rotated 90°)
//  Nodes grant resources / gears / upgrades that feed the
//  industrial map; industrial output feeds back into combat.
// ──────────────────────────────────────────────────────────

const NODE_TYPES = {
  start:    { icon: '🏁', label: '出発点',     desc: 'ここから旅が始まる' },
  battle:   { icon: '⚔',  label: '戦闘',       desc: 'コアを防衛してWaveを撃退する。マップ内の鉱石は戦闘中も採掘可能。' },
  elite:    { icon: '💀', label: 'エリート戦', desc: '強化された敵との戦闘。ギアを必ずドロップする。' },
  mining:   { icon: '⛏',  label: '採掘地帯',   desc: '制限時間内、豊富な鉱床から資源を採掘し放題。敵は出現しない。' },
  event:    { icon: '❓', label: 'イベント',   desc: '何が起こるかわからない。トレードオフのある選択を迫られる。' },
  forge:    { icon: '🔨', label: '鍛冶場',     desc: 'レア以上のアップグレードを1つ獲得できる。' },
  treasure: { icon: '📦', label: '宝物庫',     desc: '強力なパッシブギアを1つ選んで獲得できる。' },
  boss:     { icon: '👑', label: 'ボス',       desc: '最深部の守護者。撃破すればローグライク勝利！' },
};

// ── Graph generation ──────────────────────────────────────
function generateRogueMap() {
  const colCount = 11;
  const nodes = [];
  let idSeq = 0;

  const colNodes = [];
  for (let c = 0; c < colCount; c++) {
    const n = (c === 0 || c === colCount - 1) ? 1 : 2 + Math.floor(Math.random() * 3);
    const list = [];
    for (let i = 0; i < n; i++) {
      const type = pickNodeType(c, colCount);
      const node = {
        id: idSeq++, col: c, slot: i, slots: n,
        type,
        rewards: nodeRewards(type, c),
        visited: false,
        next: [],
      };
      nodes.push(node);
      list.push(node);
    }
    colNodes.push(list);
  }

  // Edges: connect each node to nearest next-column node (by normalized
  // vertical position), with a chance of a second edge; then ensure every
  // next-column node has at least one incoming edge.
  const pos = n => n.slots === 1 ? 0.5 : n.slot / (n.slots - 1);
  for (let c = 0; c < colCount - 1; c++) {
    const cur = colNodes[c], nxt = colNodes[c + 1];
    for (const a of cur) {
      const sorted = [...nxt].sort((x, y) => Math.abs(pos(x) - pos(a)) - Math.abs(pos(y) - pos(a)));
      a.next.push(sorted[0].id);
      if (sorted[1] && Math.random() < 0.45) a.next.push(sorted[1].id);
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
  return { nodes, colCount, current: start.id };
}

function pickNodeType(col, colCount) {
  if (col === 0) return 'start';
  if (col === colCount - 1) return 'boss';
  if (col === 1) return Math.random() < 0.6 ? 'battle' : 'mining';
  const r = Math.random();
  if (r < 0.36) return 'battle';
  if (r < 0.53) return 'mining';
  if (r < 0.68) return 'event';
  if (r < 0.80) return 'forge';
  if (r < 0.88) return 'treasure';
  return col >= 4 ? 'elite' : 'battle';
}

// ── Reward tables (visible at node-selection time) ────────
function nodeRewards(type, d) {
  switch (type) {
    case 'battle': {
      const pool = [
        { res: C.RES.IRON_ORE,   n: 8 + d * 2 },
        { res: C.RES.COPPER_ORE, n: 6 + d * 2 },
        { res: C.RES.COAL,       n: 5 + d },
        { res: C.RES.IRON_PLATE, n: 2 + d },
      ];
      const sel = shuffled(pool).slice(0, 2);
      const res = {};
      sel.forEach(s => { res[s.res] = s.n; });
      return { res, extras: ['アップグレード選択'] };
    }
    case 'elite': {
      const res = { [C.RES.IRON_PLATE]: 4 + d, [C.RES.COPPER_PLATE]: 3 + d };
      if (d >= 5) res[C.RES.CIRCUIT] = Math.floor(d / 2);
      return { res, extras: ['ギア獲得（確定）', 'アップグレード選択'] };
    }
    case 'mining':
      return {
        res: { [C.RES.COAL]: 4 + d, [C.RES.SULFUR]: 1 + Math.floor(d / 2) },
        extras: ['制限時間内 採掘し放題'],
      };
    case 'event':    return { res: {}, extras: ['？？？（選択次第）'] };
    case 'forge':    return { res: {}, extras: ['レア以上のアップグレード確定'] };
    case 'treasure': return { res: {}, extras: ['ギアを1つ選択'] };
    case 'boss':     return { res: {}, extras: ['🏆 ローグライク勝利'] };
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

  const W = 120 + (rg.colCount - 1) * 110;
  const H = 440;
  wrap.style.width  = W + 'px';
  wrap.style.height = H + 'px';
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);

  const pos = n => n.slots === 1 ? 0.5 : n.slot / (n.slots - 1);
  const xy  = n => ({ x: 60 + n.col * 110, y: 60 + pos(n) * (H - 120) });

  const cur = rg.nodes.find(n => n.id === rg.current) || rg.nodes[0];
  const reachable = new Set(gs.mission ? [] : cur.next);

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
    const p = xy(n);
    const el = document.createElement('div');
    el.className = 'rogue-node'
      + (n.visited ? ' visited' : '')
      + (n.id === rg.current ? ' current' : '')
      + (reachable.has(n.id) ? ' reachable' : '');
    el.style.left = (p.x - 23) + 'px';
    el.style.top  = (p.y - 23) + 'px';
    el.innerHTML  = `<span class="rn-icon">${NODE_TYPES[n.type].icon}</span>`;
    el.title = NODE_TYPES[n.type].label;
    if (reachable.has(n.id)) el.onclick = () => showNodePreview(n);
    nodesEl.appendChild(el);
  }

  // Current-position marker label
  const hint = document.getElementById('rogue-progress');
  if (hint) hint.textContent = `現在地: ${cur.col} / ${rg.colCount - 1} 列目`;
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

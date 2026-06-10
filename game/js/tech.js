// ──────────────────────────────────────────────────────────
//  Tech / Recipe Tree
//  Three research axes (Engineering / Chemistry / Military).
//  Each node costs warehouse resources. Unlocking a node
//  reveals the next node in that axis ("???" until then).
// ──────────────────────────────────────────────────────────

const TECH_GATED_EQ = [
  C.EQ.ASSEMBLER, C.EQ.COKE_OVEN, C.EQ.GENERATOR, C.EQ.DISTILLATION,
  C.EQ.CHEM_PLANT, C.EQ.ELECTROLYZER, C.EQ.ADV_ASSEMBLER, C.EQ.LASER,
];

const TECH_TREE = {
  eng: {
    name: '工学', icon: '⚙', color: '#50b878',
    nodes: [
      {
        id: 'eng_assembly', name: '組立工学', icon: '⚙',
        cost: { iron_plate: 4 },
        desc: '組立機を解放する。鉄板＋銅板→回路基板を生産できる。',
        eq: [C.EQ.ASSEMBLER],
      },
      {
        id: 'eng_logistics', name: '高速物流', icon: '➡',
        cost: { iron_plate: 6, copper_plate: 4 },
        desc: 'コンベアの搬送速度と取り出し口・取り入れ口の動作速度が50%向上する。',
        effect(gs) {
          gs.upgrades.conveyorSpeed = Math.floor((gs.upgrades.conveyorSpeed || 60) * 0.5);
          gs.upgrades.portSpeed     = Math.floor((gs.upgrades.portSpeed     || 60) * 0.5);
        },
      },
      {
        id: 'eng_mass_prod', name: '量産体制', icon: '🏗',
        cost: { circuit: 4 },
        desc: '炉と組立機の処理速度が30%向上する。',
        effect(gs) {
          gs.upgrades.furnaceSpeed   = Math.floor((gs.upgrades.furnaceSpeed   || 180) * 0.7);
          gs.upgrades.assemblerSpeed = Math.floor((gs.upgrades.assemblerSpeed || 240) * 0.7);
        },
      },
      {
        id: 'eng_adv_assembly', name: '高度組立', icon: '🤖',
        cost: { circuit: 6, plastic: 2 },
        desc: '高度組立機を解放する。高度回路基板（勝利条件）を生産できる。',
        eq: [C.EQ.ADV_ASSEMBLER],
      },
      {
        id: 'eng_lubri', name: '潤滑機構', icon: '🛞',
        cost: { circuit: 3, lubricant: 2 },
        desc: '潤滑ギアレシピ（鉄板×3＋潤滑油→回路×3）を解放し、組立速度がさらに25%向上する。',
        effect(gs) {
          gs.upgrades.assemblerSpeed = Math.floor((gs.upgrades.assemblerSpeed || 240) * 0.75);
        },
      },
    ],
  },

  chem: {
    name: '化学', icon: '⚗', color: '#40c8a0',
    nodes: [
      {
        id: 'chem_coke', name: 'コークス精製', icon: '🟤',
        cost: { coal: 6 },
        desc: 'コークス炉を解放する。石炭×2→コークス。発電と高度製錬の基礎。',
        eq: [C.EQ.COKE_OVEN],
      },
      {
        id: 'chem_power', name: '火力発電', icon: '🔌',
        cost: { iron_plate: 5, coke: 3 },
        desc: '発電機を解放する。コークスを燃やして電力を生産する。',
        eq: [C.EQ.GENERATOR],
      },
      {
        id: 'chem_oil', name: '石油化学', icon: '🛢',
        cost: { iron_plate: 8, coke: 4 },
        desc: '蒸留塔を解放する。原油→石油ガス・軽油・重油に分留する。',
        eq: [C.EQ.DISTILLATION],
      },
      {
        id: 'chem_synthesis', name: '化学合成', icon: '⚗',
        cost: { circuit: 3, petro_gas: 3 },
        desc: '化学プラントを解放する（プラスチック棒・潤滑油レシピ）。',
        eq: [C.EQ.CHEM_PLANT],
      },
      {
        id: 'chem_acid', name: '酸化学', icon: '🟢',
        cost: { plastic: 3, sulfur: 4 },
        desc: '化学プラントに硫酸・精錬銅レシピを追加する。精錬銅は高度回路の素材。',
      },
      {
        id: 'chem_electro', name: '電気分解', icon: '⚡',
        cost: { circuit: 5, refined_copper: 2 },
        desc: '電解槽を解放する。水→水素＋酸素。さらに水合成レシピも解放。',
        eq: [C.EQ.ELECTROLYZER],
      },
    ],
  },

  mil: {
    name: '軍事', icon: '⚔', color: '#e08050',
    nodes: [
      {
        id: 'mil_ballistics', name: '弾道学', icon: '🎯',
        cost: { iron_plate: 5 },
        desc: 'タレット・レーザーのダメージが50%向上する。',
        effect(gs) { gs.upgrades.turretDmgMult = (gs.upgrades.turretDmgMult || 1) * 1.5; },
      },
      {
        id: 'mil_fortress', name: '要塞工学', icon: '🏯',
        cost: { iron_plate: 8, coal: 4 },
        desc: 'Wallの最大HPが2倍、タレットの射程が+2マスになる。',
        effect(gs) {
          gs.upgrades.wallHpMult  = (gs.upgrades.wallHpMult || 1) * 2;
          gs.upgrades.turretRange = (gs.upgrades.turretRange || 4) + 2;
        },
      },
      {
        id: 'mil_explosives', name: '爆薬化学', icon: '💣',
        cost: { sulfur: 5, coal: 5 },
        desc: '爆薬レシピ（化学プラント）と爆発弾頭レシピ（高度組立機）を解放する。',
      },
      {
        id: 'mil_laser', name: 'レーザー光学', icon: '🔴',
        cost: { circuit: 5, refined_copper: 2 },
        desc: 'レーザー砲台を解放する。長射程・高威力。潤滑油でクールダウン半減。',
        eq: [C.EQ.LASER],
      },
    ],
  },
};

// ── Core logic ────────────────────────────────────────────

function resetTechLocks(gs) {
  for (const id of TECH_GATED_EQ) EQ_DEF[id].unlocked = false;
  gs.tech = new Set();
}

function techCostFor(node, gs) {
  const mult = (gs.modeDef?.techDiscount || 1)
             * (gs.gearFlags?.techCostMult || 1)
             * (gs.upgrades?.techCostMult || 1);
  const out = {};
  for (const [k, v] of Object.entries(node.cost)) out[k] = Math.max(1, Math.ceil(v * mult));
  return out;
}

function canAffordTech(node, gs) {
  if ((gs.upgrades.freeTech || 0) > 0) return true;
  return Object.entries(techCostFor(node, gs)).every(([k, v]) => (gs.resources[k] || 0) >= v);
}

function unlockTech(axisKey, node) {
  if (gs.tech.has(node.id)) return;
  if (!canAffordTech(node, gs)) return;

  if ((gs.upgrades.freeTech || 0) > 0) {
    gs.upgrades.freeTech--;
  } else {
    for (const [k, v] of Object.entries(techCostFor(node, gs))) gs.resources[k] -= v;
  }

  gs.tech.add(node.id);
  for (const id of (node.eq || [])) EQ_DEF[id].unlocked = true;
  node.effect?.(gs);
  checkSynergies(gs);

  buildSidebar();
  renderTechTree();
}

// ── Overlay UI ────────────────────────────────────────────

function openTechTree() {
  if (!gs) return;
  renderTechTree();
  document.getElementById('tech-overlay').classList.add('visible');
}

function closeTechTree() {
  document.getElementById('tech-overlay').classList.remove('visible');
}

function renderTechTree() {
  const wrap = document.getElementById('tech-axes');
  if (!wrap) return;
  wrap.innerHTML = '';

  const free = gs.upgrades.freeTech || 0;
  const freeEl = document.getElementById('tech-free');
  if (freeEl) freeEl.textContent = free > 0 ? `🎫 無料研究チケット ×${free}` : '';

  for (const [key, axis] of Object.entries(TECH_TREE)) {
    const col = document.createElement('div');
    col.className = 'tech-axis';
    const hdr = document.createElement('div');
    hdr.className = 'tech-axis-hdr';
    hdr.style.color = axis.color;
    hdr.textContent = `${axis.icon} ${axis.name}`;
    col.appendChild(hdr);

    const firstLocked = axis.nodes.findIndex(n => !gs.tech.has(n.id));

    axis.nodes.forEach((n, i) => {
      const el = document.createElement('div');
      if (gs.tech.has(n.id)) {
        el.className = 'tech-node done';
        el.innerHTML = `<div class="tn-head">${n.icon} ${n.name}<span class="tn-check">✓</span></div>`;
        el.title = n.desc;
      } else if (i === firstLocked) {
        const cost   = techCostFor(n, gs);
        const afford = canAffordTech(n, gs);
        el.className = 'tech-node avail' + (afford ? '' : ' poor');
        const costHtml = free > 0
          ? '<span class="tn-cost-chip ok">🎫 無料</span>'
          : Object.entries(cost).map(([k, v]) => {
              const ok = (gs.resources[k] || 0) >= v;
              return `<span class="tn-cost-chip ${ok ? 'ok' : 'ng'}">${RES_NAMES[k] || k} ×${v}</span>`;
            }).join('');
        el.innerHTML =
          `<div class="tn-head">${n.icon} ${n.name}</div>` +
          `<div class="tn-desc">${n.desc}</div>` +
          `<div class="tn-cost">${costHtml}</div>` +
          `<button class="tn-btn" ${afford ? '' : 'disabled'}>研究する</button>`;
        el.querySelector('.tn-btn').onclick = () => unlockTech(key, n);
      } else if (i === firstLocked + 1) {
        el.className = 'tech-node mystery';
        el.innerHTML =
          `<div class="tn-head">❓ ？？？</div>` +
          `<div class="tn-desc">前段階の研究で明らかになる</div>`;
      } else {
        return; // deeper nodes hidden entirely
      }
      col.appendChild(el);
    });
    wrap.appendChild(col);
  }
}

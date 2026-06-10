// ──────────────────────────────────────────────────────────
//  Synergy System
//  Triggered when specific sets of upgrade IDs are all taken.
//  Inspired by Hades "Duo Boons" — powerful bonuses that reward
//  committing to a build path.
// ──────────────────────────────────────────────────────────

const SYNERGIES = [
  {
    id: 'petrochemical_complex',
    name: '石油化学コンプレックス',
    icon: '🏭',
    color: '#1a3322',
    border: '#3a8855',
    desc: '石油系全設備の収率+50%。ポンプ・蒸留・化学を統合した完全なOC体制。',
    requires: ['pump_yield', 'chem_oil', 'chem_synthesis'],
    apply(gs) {
      gs.upgrades.pumpYield    = (gs.upgrades.pumpYield || 1) * 1.5;
      gs.upgrades.distillYield = true;
      gs.upgrades.chemYield    = (gs.upgrades.chemYield || 1) * 1.5;
    }
  },
  {
    id: 'military_industrial',
    name: '軍産複合体',
    icon: '⚔',
    color: '#2a1111',
    border: '#aa3333',
    desc: '全タレット能力2倍。攻撃力・射程・発射速度が同時に2倍になる。',
    requires: ['turret_dmg', 'turret_fire_rate', 'turret_range'],
    apply(gs) {
      gs.upgrades.turretDmgMult  = (gs.upgrades.turretDmgMult  || 1) * 2;
      gs.upgrades.turretFireRate = (gs.upgrades.turretFireRate  || 1) * 2;
      gs.upgrades.turretRange    = (gs.upgrades.turretRange     || 4) * 2;
    }
  },
  {
    id: 'automated_factory',
    name: '完全自動工場',
    icon: '🤖',
    color: '#111a2a',
    border: '#3355aa',
    desc: '全設備の処理速度+40%。採掘→搬送→製造が完全に同期した自動ラインが完成。',
    requires: ['conveyor_speed', 'miner_speed', 'assembler_speed'],
    apply(gs) {
      gs.upgrades.minerSpeed    = Math.floor((gs.upgrades.minerSpeed    || 120) * 0.6);
      gs.upgrades.conveyorSpeed = Math.floor((gs.upgrades.conveyorSpeed ||  60) * 0.6);
      gs.upgrades.furnaceSpeed  = Math.floor((gs.upgrades.furnaceSpeed  || 180) * 0.6);
    }
  },
  {
    id: 'mad_chemist',
    name: '狂気の化学者',
    icon: '⚗',
    color: '#0d1f11',
    border: '#22aa55',
    desc: '化学プラントの速度2倍・出力2倍。反応速度と収率が同時に極限まで高まった。',
    requires: ['chem_speed', 'chem_yield', 'chem_electro'],
    apply(gs) {
      gs.upgrades.chemSpeed = Math.floor((gs.upgrades.chemSpeed || 240) * 0.5);
      gs.upgrades.chemYield = (gs.upgrades.chemYield || 1) * 2;
    }
  },
  {
    id: 'iron_fist',
    name: '鉄の拳',
    icon: '🔩',
    color: '#1a1a2a',
    border: '#7777cc',
    desc: '採掘・製錬・組立の全出力が更に2倍。生産ラインの完全最適化を達成した。',
    requires: ['miner_yield', 'furnace_yield', 'assembler_yield'],
    apply(gs) {
      gs.upgrades.minerYield     = (gs.upgrades.minerYield     || 1) * 2;
      gs.upgrades.furnaceYield   = (gs.upgrades.furnaceYield   || 1) * 2;
      gs.upgrades.assemblerYield = (gs.upgrades.assemblerYield || 1) * 2;
    }
  },
  {
    id: 'death_factory',
    name: '死の工場',
    icon: '💀',
    color: '#1a0a0a',
    border: '#ff4444',
    desc: '爆薬消費量0・チェーン雷撃が全敵にヒット・タレット射程が無限大になる。',
    requires: ['explosive_shells', 'chain_lightning', 'mil_laser'],
    apply(gs) {
      gs.upgrades.freeExplosives  = true;
      gs.upgrades.globalChain     = true;
      gs.upgrades.infiniteRange   = true;
    }
  },
];

// Synergy requirements may mix upgrade ids and tech-tree node ids
function hasSynReq(gs, id) {
  return gs.takenUpgrades.has(id) || !!gs.tech?.has(id);
}

function checkSynergies(gs) {
  for (const syn of SYNERGIES) {
    if (gs.triggeredSynergies.has(syn.id)) continue;
    if (syn.requires.every(id => hasSynReq(gs, id))) {
      gs.triggeredSynergies.add(syn.id);
      syn.apply(gs);
      // industrial_gospel gear: apply synergy bonus twice
      if (hasGear(gs, 'industrial_gospel')) syn.apply(gs);
      showSynergyPopup(syn);
    }
  }
}

function showSynergyPopup(syn) {
  const popup = document.getElementById('synergy-popup');
  document.getElementById('syn-icon').textContent = syn.icon;
  document.getElementById('syn-name').textContent = syn.name;
  document.getElementById('syn-desc').textContent = syn.desc;
  popup.style.background   = syn.color;
  popup.style.borderColor  = syn.border;
  popup.classList.add('visible');
  setTimeout(() => popup.classList.remove('visible'), 5000);
}

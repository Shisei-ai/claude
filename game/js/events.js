// ──────────────────────────────────────────────────────────
//  Event System
//  FTL-style random events that appear between waves.
//  Each event offers 2–3 choices with industrial trade-offs.
// ──────────────────────────────────────────────────────────

function destroyRandomEquipment(gs, count) {
  const cells = [];
  for (let y = 0; y < C.ROWS; y++) {
    for (let x = 0; x < C.COLS; x++) {
      const cell = gs.map.grid[y][x];
      if (cell.equipment && cell.terrain !== C.CORE) cells.push(cell);
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  for (let i = 0; i < Math.min(count, cells.length); i++) {
    cells[i].equipment = null;
    cells[i].item      = null;
  }
}

const EVENT_POOL = [
  {
    id: 'iron_merchant',
    title: '⚒ 鉄商人の来訪',
    desc: '流れの商人が工場に現れた。上質な設備と素材の交換取引を申し出ている。',
    choices: [
      {
        label: '鉄板 20枚を提供する',
        detail: '➜ 次のアップグレードがレア確定',
        avail: gs => (gs.resources[C.RES.IRON_PLATE] || 0) >= 20,
        apply(gs) { gs.resources[C.RES.IRON_PLATE] -= 20; gs.upgradeBonus = 'guaranteed_rare'; }
      },
      {
        label: '断る',
        detail: '➜ 何も変わらない',
        avail: () => true,
        apply() {}
      }
    ]
  },
  {
    id: 'equipment_malfunction',
    title: '⚙ 設備の老朽化',
    desc: '過酷な稼働で複数の設備が限界を迎えた。修理するか、この失敗から学ぶか。',
    choices: [
      {
        label: '設備を刷新する（設備2基が崩壊）',
        detail: '➜ Epicアップグレードを確定入手',
        avail: () => true,
        apply(gs) { destroyRandomEquipment(gs, 2); gs.upgradeBonus = 'guaranteed_epic'; }
      },
      {
        label: '緊急修理（鉄板 15消費）',
        detail: '➜ 設備を全て守る',
        avail: gs => (gs.resources[C.RES.IRON_PLATE] || 0) >= 15,
        apply(gs) { gs.resources[C.RES.IRON_PLATE] -= 15; }
      },
      {
        label: '無視する',
        detail: '➜ 設備1基のみ崩壊',
        avail: () => true,
        apply(gs) { destroyRandomEquipment(gs, 1); }
      }
    ]
  },
  {
    id: 'chemical_spill',
    title: '☣ 化学漏洩事故',
    desc: '貯蔵タンクから危険な物質が漏洩した。被害をどう収束させるか。',
    avail: gs => (gs.resources[C.RES.CRUDE_OIL] || 0) + (gs.resources[C.RES.PETRO_GAS] || 0) >= 5,
    choices: [
      {
        label: '緊急排出（石油系ストレージが全滅）',
        detail: '➜ 化学処理速度が永続+60%',
        avail: () => true,
        apply(gs) {
          for (const r of [C.RES.CRUDE_OIL, C.RES.PETRO_GAS, C.RES.LIGHT_OIL, C.RES.HEAVY_OIL])
            gs.resources[r] = 0;
          gs.upgrades.chemSpeed = Math.floor((gs.upgrades.chemSpeed || 240) * 0.4);
        }
      },
      {
        label: '硫酸で中和（硫酸 10消費）',
        detail: '➜ ロスなし',
        avail: gs => (gs.resources[C.RES.SULFURIC_ACID] || 0) >= 10,
        apply(gs) { gs.resources[C.RES.SULFURIC_ACID] -= 10; }
      },
      {
        label: '何もしない',
        detail: '➜ 石油系が半減',
        avail: () => true,
        apply(gs) {
          for (const r of [C.RES.CRUDE_OIL, C.RES.PETRO_GAS, C.RES.LIGHT_OIL, C.RES.HEAVY_OIL])
            gs.resources[r] = Math.floor((gs.resources[r] || 0) / 2);
        }
      }
    ]
  },
  {
    id: 'military_contract',
    title: '🎖 軍からの発注',
    desc: '軍の調達担当者が訪問した。特定の物資と引き換えに最新の軍事技術を提供するという。',
    choices: [
      {
        label: '爆薬 10を提供',
        detail: '➜ タレット全ダメージ永続×2',
        avail: gs => (gs.resources[C.RES.EXPLOSIVES] || 0) >= 10,
        apply(gs) {
          gs.resources[C.RES.EXPLOSIVES] -= 10;
          gs.upgrades.turretDmgMult = (gs.upgrades.turretDmgMult || 1) * 2;
        }
      },
      {
        label: '回路基板 10を提供',
        detail: '➜ タレット射程永続+60%',
        avail: gs => (gs.resources[C.RES.CIRCUIT] || 0) >= 10,
        apply(gs) {
          gs.resources[C.RES.CIRCUIT] -= 10;
          gs.upgrades.turretRange = (gs.upgrades.turretRange || 4) * 1.6;
        }
      },
      {
        label: '断る',
        detail: '➜ 何も変わらない',
        avail: () => true,
        apply() {}
      }
    ]
  },
  {
    id: 'research_breakthrough',
    title: '🔬 技術的ブレイクスルー',
    desc: '研究チームが革新的な発見を報告した。どの分野への応用に集中する？',
    choices: [
      {
        label: '生産技術（採掘・製錬・組立）',
        detail: '➜ 採掘量・炉収率・組立収率が+50%',
        avail: () => true,
        apply(gs) {
          gs.upgrades.minerYield     = (gs.upgrades.minerYield     || 1) * 1.5;
          gs.upgrades.furnaceYield   = (gs.upgrades.furnaceYield   || 1) * 1.5;
          gs.upgrades.assemblerYield = (gs.upgrades.assemblerYield || 1) * 1.5;
        }
      },
      {
        label: '軍事技術（防衛・攻撃）',
        detail: '➜ タレット射程+80%・ダメージ+50%',
        avail: () => true,
        apply(gs) {
          gs.upgrades.turretRange   = (gs.upgrades.turretRange   || 4) * 1.8;
          gs.upgrades.turretDmgMult = (gs.upgrades.turretDmgMult || 1) * 1.5;
        }
      },
      {
        label: '化学技術（合成・精製）',
        detail: '➜ 化学速度+80%・収率+50%',
        avail: () => true,
        apply(gs) {
          gs.upgrades.chemSpeed = Math.floor((gs.upgrades.chemSpeed || 240) * 0.55);
          gs.upgrades.chemYield = (gs.upgrades.chemYield || 1) * 1.5;
        }
      }
    ]
  },
  {
    id: 'resource_discovery',
    title: '💰 新規埋蔵量の発見',
    desc: '調査チームが周辺地層から大量の資源を発見！採掘方針を決定せよ。',
    choices: [
      {
        label: '固形資源を優先採掘',
        detail: '➜ 鉄板50・銅板30・石炭20を即時入手',
        avail: () => true,
        apply(gs) {
          addRes(gs, C.RES.IRON_PLATE,   50);
          addRes(gs, C.RES.COPPER_PLATE, 30);
          addRes(gs, C.RES.COAL,         20);
        }
      },
      {
        label: '油田を優先開発',
        detail: '➜ 原油100・石油ガス50・硫黄30を即時入手',
        avail: () => true,
        apply(gs) {
          addRes(gs, C.RES.CRUDE_OIL, 100);
          addRes(gs, C.RES.PETRO_GAS,  50);
          addRes(gs, C.RES.SULFUR,     30);
        }
      }
    ]
  },
  {
    id: 'sabotage',
    title: '🕵 スパイ工作',
    desc: '敵エージェントが工場に潜入し、設備を破壊した。しかし重要な情報を奪い返した。',
    choices: [
      {
        label: '情報を活用する（設備3基が崩壊）',
        detail: '➜ 次の選択で5択から選べる',
        avail: () => true,
        apply(gs) { destroyRandomEquipment(gs, 3); gs.upgradeBonus = 'five_choices'; }
      },
      {
        label: '警備を強化（銅板 20消費）',
        detail: '➜ 設備1基のみ崩壊',
        avail: gs => (gs.resources[C.RES.COPPER_PLATE] || 0) >= 20,
        apply(gs) {
          gs.resources[C.RES.COPPER_PLATE] -= 20;
          destroyRandomEquipment(gs, 1);
        }
      }
    ]
  },
  {
    id: 'core_upgrade',
    title: '🏭 コア強化オファー',
    desc: '工学チームがファクトリーコアの強化案を提示した。',
    choices: [
      {
        label: '装甲強化（回路基板 8消費）',
        detail: '➜ コア最大HP+200 / 現在HPも回復',
        avail: gs => (gs.resources[C.RES.CIRCUIT] || 0) >= 8,
        apply(gs) {
          gs.resources[C.RES.CIRCUIT] -= 8;
          gs.coreMaxHp += 200;
          gs.coreHp = Math.min(gs.coreHp + 200, gs.coreMaxHp);
        }
      },
      {
        label: '緊急修復（鉄板 5消費）',
        detail: '➜ コアHPを全回復',
        avail: gs => (gs.resources[C.RES.IRON_PLATE] || 0) >= 5,
        apply(gs) {
          gs.resources[C.RES.IRON_PLATE] -= 5;
          gs.coreHp = gs.coreMaxHp;
        }
      },
      {
        label: '今は必要ない',
        detail: '➜ 何も変わらない',
        avail: () => true,
        apply() {}
      }
    ]
  },
  {
    id: 'black_market',
    title: '🌑 闇市場の接触',
    desc: '身元不明の仲介者が「特別な取引」を持ちかけてきた。リスクはある。',
    choices: [
      {
        label: '全ストレージの20%を提供',
        detail: '➜ Epicアップグレードを2枚から選択',
        avail: () => true,
        apply(gs) {
          for (const k in gs.resources) gs.resources[k] = Math.floor((gs.resources[k] || 0) * 0.8);
          gs.upgradeBonus = 'two_epics';
        }
      },
      {
        label: '断る',
        detail: '➜ 何も変わらない',
        avail: () => true,
        apply() {}
      }
    ]
  },
];

function getRandomEvent(gs) {
  const pool = EVENT_POOL.filter(e => !e.avail || e.avail(gs));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function showEventScreen(event, onComplete) {
  document.getElementById('event-title').textContent = event.title;
  document.getElementById('event-desc').textContent  = event.desc;

  const container = document.getElementById('event-choices');
  container.innerHTML = '';

  for (const choice of event.choices) {
    const ok = choice.avail(gs);
    const el = document.createElement('div');
    el.className = `event-choice${ok ? '' : ' unavailable'}`;
    el.innerHTML = `
      <span class="choice-label">${choice.label}</span>
      <span class="choice-detail">${choice.detail}</span>
    `;
    if (ok) el.onclick = () => { choice.apply(gs); onComplete(); };
    container.appendChild(el);
  }

  showScreen('event-screen');
}

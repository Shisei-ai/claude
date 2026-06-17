/* =========================================================================
 * 鋼鉄戦線 (Steel Front) - コアロジック（工業・供給チェーン版）
 *  部品工場 → 在庫 → 組立ライン → ユニット の流れをシミュレートする。
 * ========================================================================= */
(function (G) {
  'use strict';

  var LANE = G.LANE, WALL_X = G.WALL_X;
  var HQ_X = 8;
  var state = null;

  // ---- 状態 ---------------------------------------------------------------
  function freshState() {
    return {
      ore: 210, research: 0,
      buildings: { reactor: 3, miner: 4, lab: 1, depot: 0, relay: 0, turret: 0 },
      // 工業設備（インスタンス）
      bodyFabs:   [{ assign: 'infantry', prog: 0 }],
      headFabs:   [{ prog: 0 }],
      weaponFabs: [{ assign: 'standard', prog: 0 }],
      assemblies: [{ body: 'infantry', weapon: 'standard', cpus: [], prog: 0 }],
      // 部品在庫
      stock: { body: { infantry: 0, assault: 0, heavy: 0, shooter: 0, flyer: 0 },
               head: 0, weapon: { standard: 0, splash: 0, chain: 0, heavyW: 0 } },
      researched: {}, perm: {},
      unlockedBodies: {}, unlockedWeapons: {}, unlockedCpus: {},
      tiers: { body: 1, weapon: 1, head: 1 },
      units: [], enemies: [], vfx: [],
      hqHp: G.HQ_HP, hqHpMax: G.HQ_HP, capacityMax: 18,
      chapter: 0, wave: 0, phase: 'intro',
      spawns: [], battleTime: 0,
      stats: { kills: 0, lost: 0, built: 0 },
      pendingStory: null, pendingChoice: null,
      mod: null, _atkToken: 0, _turretTick: 0,
    };
  }

  // ---- 修飾子・解放・グレードの再計算 ------------------------------------
  function recomputeMod() {
    var m = { mineMult: 1, researchMult: 1, buildSpeed: 1, powerSave: 0, capacityBonus: 0 };
    var bodies = { infantry: true, assault: true };
    var weapons = { standard: true };
    var cpus = {};
    var tier = { body: 1, weapon: 1, head: 1 };

    function applyEffect(e) {
      if (!e) return;
      if (e.mineMult) m.mineMult += e.mineMult;
      if (e.researchMult) m.researchMult += e.researchMult;
      if (e.buildSpeed) m.buildSpeed += e.buildSpeed;
      if (e.powerSave) m.powerSave += e.powerSave;
      if (e.capacity) m.capacityBonus += e.capacity;
      if (e.unlockBody) bodies[e.unlockBody] = true;
      if (e.unlockWeapon) weapons[e.unlockWeapon] = true;
      if (e.unlockCpu) cpus[e.unlockCpu] = true;
      if (e.bodyTier) tier.body = Math.max(tier.body, e.bodyTier);
      if (e.weaponTier) tier.weapon = Math.max(tier.weapon, e.weaponTier);
      if (e.headTier) tier.head = Math.max(tier.head, e.headTier);
    }
    for (var id in state.researched) if (state.researched[id]) applyEffect(G.TECHS[id].effect);
    applyEffect(state.perm);
    // 恒久ボーナス（章選択）のグレード加算
    tier.body += (state.perm.bodyTierBonus || 0);
    tier.weapon += (state.perm.weaponTierBonus || 0);

    m.powerSave = Math.min(0.6, m.powerSave);
    state.mod = m;
    state.unlockedBodies = bodies;
    state.unlockedWeapons = weapons;
    state.unlockedCpus = cpus;
    state.tiers = tier;
  }

  // ---- 経済の派生値 -------------------------------------------------------
  function baseCost(id) { var b = G.BASE_BUILDINGS[id]; return Math.round(b.cost * Math.pow(b.costScale, state.buildings[id] || 0)); }
  var KIND_DEF = { body: 'bodyFab', head: 'headFab', weapon: 'weaponFab', assembly: 'assembly' };
  function industryDef(kind) { return G.INDUSTRY[KIND_DEF[kind]]; }
  function industryCost(kind) {
    var d = industryDef(kind), n = industryList(kind).length;
    return Math.round(d.cost * Math.pow(d.costScale, n));
  }
  function industryList(kind) {
    return kind === 'body' ? state.bodyFabs : kind === 'head' ? state.headFabs
         : kind === 'weapon' ? state.weaponFabs : state.assemblies;
  }
  function powerSupply() {
    var s = 0; for (var id in state.buildings) { var p = G.BASE_BUILDINGS[id].power; if (p > 0) s += p * state.buildings[id]; }
    return s;
  }
  function powerDemand() {
    var save = 1 - (state.mod ? state.mod.powerSave : 0), d = 0;
    for (var id in state.buildings) { var p = G.BASE_BUILDINGS[id].power; if (p < 0) d += (-p) * state.buildings[id]; }
    d += state.bodyFabs.length * (-G.INDUSTRY.bodyFab.power)
       + state.headFabs.length * (-G.INDUSTRY.headFab.power)
       + state.weaponFabs.length * (-G.INDUSTRY.weaponFab.power)
       + state.assemblies.length * (-G.INDUSTRY.assembly.power);
    return d * save;
  }
  function powerEfficiency() { var d = powerDemand(); return d <= 0 ? 1 : Math.min(1, powerSupply() / d); }
  function oreCap() { return 400 + (state.buildings.depot || 0) * G.BASE_BUILDINGS.depot.oreCap; }
  function oreRate() { return (state.buildings.miner || 0) * G.BASE_BUILDINGS.miner.ore * state.mod.mineMult * powerEfficiency(); }
  function researchRate() { return (state.buildings.lab || 0) * G.BASE_BUILDINGS.lab.research * state.mod.researchMult * powerEfficiency(); }
  function capacityMax() { return state.capacityMax + state.mod.capacityBonus + (state.buildings.relay || 0) * G.BASE_BUILDINGS.relay.capacity; }
  function capacityUsed() { var c = 0; for (var i = 0; i < state.units.length; i++) c += state.units[i].stats.cap; return c; }

  // ---- 建設・設備 ---------------------------------------------------------
  function buyBuilding(id) {
    var c = baseCost(id); if (state.ore < c) return false;
    state.ore -= c; state.buildings[id] = (state.buildings[id] || 0) + 1; recomputeMod(); return true;
  }
  function firstUnlockedBody() { for (var k in G.BODIES) if (state.unlockedBodies[k]) return k; return 'infantry'; }
  function buyIndustry(kind) {
    var c = industryCost(kind); if (state.ore < c) return false;
    state.ore -= c;
    if (kind === 'body') state.bodyFabs.push({ assign: firstUnlockedBody(), prog: 0 });
    else if (kind === 'head') state.headFabs.push({ prog: 0 });
    else if (kind === 'weapon') state.weaponFabs.push({ assign: 'standard', prog: 0 });
    else state.assemblies.push({ body: firstUnlockedBody(), weapon: 'standard', cpus: [], prog: 0 });
    return true;
  }
  function removeIndustry(kind, i) {
    var list = industryList(kind);
    if (list.length <= 0 || i < 0 || i >= list.length) return false;
    list.splice(i, 1); return true;
  }
  // 設定変更
  function setFabAssign(kind, i, assign) {
    var list = industryList(kind);
    if (!list[i]) return;
    if (kind === 'body' && state.unlockedBodies[assign]) list[i].assign = assign;
    if (kind === 'weapon' && state.unlockedWeapons[assign]) list[i].assign = assign;
  }
  function setAssemblyBody(i, body) { if (state.assemblies[i] && state.unlockedBodies[body]) state.assemblies[i].body = body; }
  function setAssemblyWeapon(i, w) { if (state.assemblies[i] && state.unlockedWeapons[w]) state.assemblies[i].weapon = w; }
  function toggleCpu(i, cpuId) {
    var a = state.assemblies[i]; if (!a || !state.unlockedCpus[cpuId]) return;
    var idx = a.cpus.indexOf(cpuId);
    if (idx >= 0) a.cpus.splice(idx, 1);
    else if (a.cpus.length < state.tiers.head) a.cpus.push(cpuId);
  }

  // ---- 研究 ---------------------------------------------------------------
  function canResearch(id) {
    var t = G.TECHS[id]; if (state.researched[id]) return false;
    for (var i = 0; i < t.req.length; i++) if (!state.researched[t.req[i]]) return false;
    return state.research >= t.cost;
  }
  function doResearch(id) { if (!canResearch(id)) return false; state.research -= G.TECHS[id].cost; state.researched[id] = true; recomputeMod(); return true; }

  // ---- ユニット性能の合成（ボディ×グレード ＋ CPU ＋ ウェポン） ---------
  function computeStats(bp) {
    var b = G.BODIES[bp.body], t = state.tiers;
    var gm = G.bodyGradeMult(t.body), gdef = G.bodyGradeDef(t.body);
    var hp = b.hp * gm, dmg = b.dmg * gm, def = b.def + gdef;
    var speed = b.speed, range = b.range, rate = b.rate;
    var hpMult = 1, dmgMult = 1, speedMult = 1, rateMult = 1;
    (bp.cpus || []).forEach(function (id) {
      var e = G.CPUS[id] && G.CPUS[id].effect; if (!e) return;
      if (e.def) def += e.def; if (e.range) range += e.range;
      if (e.hpMult) hpMult += e.hpMult; if (e.dmgMult) dmgMult += e.dmgMult;
      if (e.speedMult) speedMult += e.speedMult; if (e.rateMult) rateMult += e.rateMult;
    });
    var w = G.WEAPONS[bp.weapon], wc = w.compute(t.weapon);
    dmgMult *= wc.dmgMult;
    return {
      body: bp.body, domain: b.domain, antiAir: b.antiAir, cap: b.cap,
      hp: hp * hpMult, dmg: dmg * dmgMult, def: def, speed: speed * speedMult,
      range: range, rate: rate * rateMult, grade: t.body, wgrade: t.weapon,
      weapon: { kind: w.kind, aoe: wc.aoe || 0, chain: wc.chain || 0 },
    };
  }

  function spawnUnit(stats) { state.units.push({ stats: stats, side: 'p', x: 4, hp: stats.hp, maxHp: stats.hp, cd: 0 }); state.stats.built++; vfx({ k: 'spawn', x: 6, body: stats.body, a: stats.domain === 'air' }); }
  function spawnEnemy(id) { var e = G.ENEMIES[id]; state.enemies.push({ type: id, side: 'e', x: LANE, hp: e.hp, maxHp: e.hp, cd: 0 }); if (e.boss) vfx({ k: 'boss' }); }

  // ---- 工業シミュレーション ----------------------------------------------
  function fabSpeed() { return state.mod.buildSpeed * powerEfficiency(); }

  function tickFab(f, partTime, partCost, atCap, onDone, sp, dt) {
    f.prog += dt * sp;
    if (f.prog >= partTime) {
      if (atCap()) { f.prog = partTime; }                              // 在庫満杯→停止（鉱石消費なし）
      else if (state.ore >= partCost) { state.ore -= partCost; onDone(); f.prog -= partTime; }
      else { f.prog = partTime; }                                      // 鉱石待ちで頭打ち
    }
  }
  function processIndustry(dt, inBattle) {
    var sp = fabSpeed(), i, cap = G.STOCK_CAP;
    for (i = 0; i < state.bodyFabs.length; i++) {
      var bf = state.bodyFabs[i], bd = G.BODIES[bf.assign];
      (function (assign) { tickFab(bf, bd.partTime, bd.partCost,
        function () { return state.stock.body[assign] >= cap.body; },
        function () { state.stock.body[assign]++; }, sp, dt); })(bf.assign);
    }
    var hf = G.INDUSTRY.headFab;
    for (i = 0; i < state.headFabs.length; i++) tickFab(state.headFabs[i], hf.partTime, hf.partCost,
      function () { return state.stock.head >= cap.head; },
      function () { state.stock.head++; }, sp, dt);
    for (i = 0; i < state.weaponFabs.length; i++) {
      var wf = state.weaponFabs[i], wd = G.WEAPONS[wf.assign];
      (function (assign) { tickFab(wf, wd.partTime, wd.partCost,
        function () { return state.stock.weapon[assign] >= cap.weapon; },
        function () { state.stock.weapon[assign]++; }, sp, dt); })(wf.assign);
    }
    if (!inBattle) return;
    var at = G.INDUSTRY.assembly.time;
    for (i = 0; i < state.assemblies.length; i++) {
      var a = state.assemblies[i];
      a.prog += dt * sp;
      if (a.prog >= at) {
        var stats = computeStats(a);
        if (capacityUsed() + stats.cap <= capacityMax()
            && state.stock.body[a.body] >= 1 && state.stock.head >= 1 && state.stock.weapon[a.weapon] >= 1) {
          state.stock.body[a.body]--; state.stock.head--; state.stock.weapon[a.weapon]--;
          spawnUnit(stats); a.prog -= at;
        } else { a.prog = at; } // 部品・容量待ち
      }
    }
  }

  // ---- 波・シナリオ -------------------------------------------------------
  function currentChapter() { return G.CHAPTERS[state.chapter]; }
  function currentWave() { return currentChapter().waves[state.wave]; }
  function startBattle() {
    if (state.phase !== 'prep') return;
    var wave = currentWave(); state.spawns = [];
    for (var g = 0; g < wave.enemies.length; g++) { var grp = wave.enemies[g];
      for (var i = 0; i < grp.count; i++) state.spawns.push({ type: grp.type, t: grp.delay + i * grp.gap }); }
    state.spawns.sort(function (a, b) { return a.t - b.t; });
    state.battleTime = 0; state.phase = 'battle';
  }
  function onWaveCleared() {
    var wave = currentWave();
    state.ore = Math.min(oreCap(), state.ore + wave.reward.ore);
    state.research += wave.reward.research;
    state.wave++;
    if (state.wave < currentChapter().waves.length) state.phase = 'prep';
    else { state.pendingStory = currentChapter().outro; state.pendingChoice = currentChapter().choice; state.phase = 'story'; }
  }
  function afterOutro() { if (state.pendingChoice) state.phase = 'choice'; else advanceChapter(); }
  function applyChoice(opt) { var ap = opt.apply; for (var k in ap) state.perm[k] = (state.perm[k] || 0) + ap[k]; state.pendingChoice = null; recomputeMod(); advanceChapter(); }
  function advanceChapter() {
    state.chapter++; state.wave = 0;
    if (state.chapter >= G.CHAPTERS.length) state.phase = 'won';
    else { state.pendingStory = currentChapter().intro; state.phase = 'intro'; }
  }
  function afterIntro() { state.phase = 'prep'; }

  // ---- 戦闘 ---------------------------------------------------------------
  function domainOf(ent) { return ent.side === 'p' ? ent.stats.domain : G.ENEMIES[ent.type].domain; }
  function defOf(ent) { return ent.side === 'p' ? ent.stats.def : G.ENEMIES[ent.type].def; }
  function canHit(aSpec, ent) { return domainOf(ent) !== 'air' || aSpec.antiAir === true; }
  function nearestHittable(list, from, aSpec) {
    var best = null, bd = 1e9;
    for (var i = 0; i < list.length; i++) { if (!canHit(aSpec, list[i])) continue;
      var d = Math.abs(list[i].x - from.x); if (d < bd) { bd = d; best = list[i]; } }
    return best;
  }
  function dealDamage(target, raw) { target.hp -= Math.max(G.MIN_DMG, raw - defOf(target)); }
  // 視覚イベント（純粋に演出用。ui.js が消費する。ロジックには影響しない）
  function vfx(o) { if (state.vfx.length < 500) state.vfx.push(o); }

  // ウェポン挙動を含む自軍の攻撃解決
  function playerAttack(u, target) {
    var s = u.stats, raw = s.dmg, w = s.weapon;
    var token = ++state._atkToken;
    vfx({ k: 'shot', side: 'p', body: s.body, x1: u.x, a1: s.domain === 'air',
          x2: target.x, a2: G.ENEMIES[target.type].domain === 'air', kind: w.kind });
    target._t = token; dealDamage(target, raw);
    if (w.aoe > 0) {
      for (var i = 0; i < state.enemies.length; i++) {
        var e = state.enemies[i];
        if (e._t === token) continue;
        if (Math.abs(e.x - target.x) <= w.aoe) { e._t = token; dealDamage(e, raw * 0.6); }
      }
      vfx({ k: 'blast', x: target.x, r: w.aoe, a: G.ENEMIES[target.type].domain === 'air' });
    }
    if (w.chain > 0) {
      var cur = target, mult = 1;
      for (var c = 0; c < w.chain; c++) {
        mult *= G.CHAIN_FALLOFF;
        var nx = null, nd = 1e9;
        for (var j = 0; j < state.enemies.length; j++) {
          var en = state.enemies[j];
          if (en._t === token) continue;
          var d = Math.abs(en.x - cur.x);
          if (d <= G.CHAIN_RANGE && d < nd) { nd = d; nx = en; }
        }
        if (!nx) break;
        vfx({ k: 'arc', x1: cur.x, a1: G.ENEMIES[cur.type].domain === 'air', x2: nx.x, a2: G.ENEMIES[nx.type].domain === 'air' });
        nx._t = token; dealDamage(nx, raw * mult); cur = nx;
      }
    }
  }

  function combatStep(dt) {
    var i, u, e, target, spec, s;

    // 自軍
    for (i = 0; i < state.units.length; i++) {
      u = state.units[i]; s = u.stats; u.cd -= dt;
      target = nearestHittable(state.enemies, u, s);
      if (s.domain === 'air') {
        u.x = Math.min(LANE - 60, u.x + s.speed * dt);
        if (target && Math.abs(target.x - u.x) <= s.range && u.cd <= 0) { playerAttack(u, target); u.cd = 1 / s.rate; }
        continue;
      }
      if (!target) { if (u.x < WALL_X - 30) u.x += s.speed * dt; continue; }
      var d = Math.abs(target.x - u.x);
      if (d > s.range) u.x += s.speed * dt;
      else if (u.cd <= 0) { playerAttack(u, target); u.cd = 1 / s.rate; }
    }

    // 敵
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i]; spec = G.ENEMIES[e.type]; e.cd -= dt;
      target = nearestHittable(state.units, e, spec);
      var inRange = target && Math.abs(target.x - e.x) <= spec.range;
      if (spec.domain === 'air' || !inRange) e.x = Math.max(HQ_X, e.x - spec.speed * dt);
      if (e.cd <= 0) {
        if (inRange) {
          vfx({ k: 'shot', side: 'e', col: spec.color, x1: e.x, a1: spec.domain === 'air', x2: target.x, a2: target.stats.domain === 'air' });
          dealDamage(target, spec.dmg); e.cd = 1 / spec.rate;
        } else if (e.x <= HQ_X + spec.range) {
          state.hqHp -= spec.dmg; e.cd = 1 / spec.rate;
          vfx({ k: 'hqhit', x: HQ_X, col: spec.color });
        }
      }
    }

    // 防衛砲台（対空可）
    var turrets = state.buildings.turret || 0;
    if (turrets > 0 && state.enemies.length) {
      state._turretTick += dt;
      if (state._turretTick >= 0.5) {
        state._turretTick = 0;
        for (var sgun = 0; sgun < turrets && state.enemies.length; sgun++) {
          var near = null, nd = 1e9;
          for (i = 0; i < state.enemies.length; i++) { var dx = Math.abs(state.enemies[i].x - WALL_X); if (dx <= 190 && dx < nd) { nd = dx; near = state.enemies[i]; } }
          if (near) {
            vfx({ k: 'beam', x1: WALL_X, x2: near.x, a2: G.ENEMIES[near.type].domain === 'air' });
            dealDamage(near, 30);
          }
        }
      }
    }

    // 死亡処理
    for (i = state.units.length - 1; i >= 0; i--) if (state.units[i].hp <= 0) {
      var du = state.units[i];
      vfx({ k: 'boom', x: du.x, col: '#9fd8ff', a: du.stats.domain === 'air', ally: true, spr: du.stats.body, grade: du.stats.grade });
      state.stats.lost++; state.units.splice(i, 1);
    }
    for (i = state.enemies.length - 1; i >= 0; i--) if (state.enemies[i].hp <= 0) {
      var de = state.enemies[i], ds = G.ENEMIES[de.type];
      state.ore = Math.min(oreCap(), state.ore + ds.bounty);
      state.stats.kills++;
      vfx({ k: 'boom', x: de.x, col: ds.color, a: ds.domain === 'air', big: !!ds.boss, spr: 'e_' + de.type });
      state.enemies.splice(i, 1);
    }
  }

  // ---- メイン更新 ---------------------------------------------------------
  function update(dt) {
    if (!state || state.phase === 'won' || state.phase === 'lost') return;
    if (dt > 0.1) dt = 0.1;
    state.ore = Math.min(oreCap(), state.ore + oreRate() * dt);
    state.research += researchRate() * dt;
    processIndustry(dt, state.phase === 'battle');
    if (state.phase === 'battle') {
      state.battleTime += dt;
      while (state.spawns.length && state.spawns[0].t <= state.battleTime) spawnEnemy(state.spawns.shift().type);
      combatStep(dt);
      if (state.hqHp <= 0) { state.hqHp = 0; state.phase = 'lost'; return; }
      if (state.spawns.length === 0 && state.enemies.length === 0) onWaveCleared();
    }
  }

  function newGame() { state = freshState(); recomputeMod(); state.pendingStory = currentChapter().intro; state.phase = 'intro'; G.state = state; return state; }

  // ---- 公開API ------------------------------------------------------------
  G.Game = {
    newGame: newGame, update: update,
    baseCost: baseCost, industryCost: industryCost, industryList: industryList,
    powerSupply: powerSupply, powerDemand: powerDemand, powerEfficiency: powerEfficiency,
    oreCap: oreCap, oreRate: oreRate, researchRate: researchRate,
    capacityUsed: capacityUsed, capacityMax: capacityMax,
    buyBuilding: buyBuilding, buyIndustry: buyIndustry, removeIndustry: removeIndustry,
    setFabAssign: setFabAssign, setAssemblyBody: setAssemblyBody, setAssemblyWeapon: setAssemblyWeapon, toggleCpu: toggleCpu,
    computeStats: computeStats,
    canResearch: canResearch, doResearch: doResearch,
    startBattle: startBattle, afterIntro: afterIntro, afterOutro: afterOutro, applyChoice: applyChoice,
    currentChapter: currentChapter, currentWave: currentWave,
    constants: { LANE: LANE, WALL_X: WALL_X, HQ_X: HQ_X },
    get state() { return state; },
  };

})(window.G = window.G || {});

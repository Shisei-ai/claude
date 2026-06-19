/* =========================================================================
 * 鋼鉄戦線 (Steel Front) - コアロジック（工業・供給チェーン版）
 *  部品工場 → 在庫 → 組立ライン → ユニット の流れをシミュレートする。
 * ========================================================================= */
(function (G) {
  'use strict';

  var DOME = G.ARENA.domeR, SPAWN = G.ARENA.spawnR, TURRET_R = G.ARENA.turretR;
  var state = null;

  // ---- 状態 ---------------------------------------------------------------
  function freshState() {
    var mat = {}, inter = {}, stockBody = {}, k;
    for (k = 0; k < G.MATERIALS.length; k++) mat[G.MATERIALS[k]] = 0;
    for (k in G.INTERMEDIATES) inter[k] = 0;
    for (k in G.BODIES) stockBody[k] = 0;
    mat.iron = 120; mat.copper = 12; inter.alloy = 4;
    return {
      mat: mat, water: 30, fuel: 20, inter: inter, research: 0,
      modules: 0, grantedModules: 0,
      zones: G.ZONES.map(function () { return { unlocked: false, modules: 0 }; }),
      grantsApplied: {},
      // 設備（カウント式）
      buildings: { reactor: 4, pump: 1, refinery: 1, moduleFab: 1, smelter: 2, electro: 0, coreforge: 0, lab: 1, depot: 0, relay: 0, turret: 0 },
      proc: { smelter: 0, electro: 0, coreforge: 0 },
      // 部品工場（インスタンス）
      bodyFabs: [{ assign: 'infantry', prog: 0 }],
      headFabs: [{ prog: 0 }],
      weaponFabs: [{ assign: 'standard', prog: 0 }],
      assemblies: [{ body: 'infantry', weapon: 'standard', cpus: [], prog: 0 }],
      stock: { body: stockBody, head: 0, weapon: { standard: 0, splash: 0, chain: 0, heavyW: 0 } },
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
    var m = { mineMult: 1, researchMult: 1, buildSpeed: 1, interSpeed: 1, powerSave: 0, capacityBonus: 0, moduleCapBonus: 0 };
    var bodies = { infantry: true, assault: true };
    var weapons = { standard: true };
    var cpus = {};
    var tier = { body: 1, weapon: 1, head: 1 };

    function applyEffect(e) {
      if (!e) return;
      if (e.mineMult) m.mineMult += e.mineMult;
      if (e.researchMult) m.researchMult += e.researchMult;
      if (e.buildSpeed) m.buildSpeed += e.buildSpeed;
      if (e.interSpeed) m.interSpeed += e.interSpeed;
      if (e.powerSave) m.powerSave += e.powerSave;
      if (e.capacity) m.capacityBonus += e.capacity;
      if (e.moduleCap) m.moduleCapBonus += e.moduleCap;
      if (e.unlockBody) bodies[e.unlockBody] = true;
      if (e.unlockWeapon) weapons[e.unlockWeapon] = true;
      if (e.unlockCpu) cpus[e.unlockCpu] = true;
      if (e.bodyTier) tier.body = Math.max(tier.body, e.bodyTier);
      if (e.weaponTier) tier.weapon = Math.max(tier.weapon, e.weaponTier);
      if (e.headTier) tier.head = Math.max(tier.head, e.headTier);
    }
    for (var id in state.researched) if (state.researched[id]) applyEffect(G.TECHS[id].effect);
    applyEffect(state.perm);
    tier.body = Math.min(6, tier.body + (state.perm.bodyTierBonus || 0));   // グレードは最大6
    tier.weapon = Math.min(6, tier.weapon + (state.perm.weaponTierBonus || 0));

    m.powerSave = Math.min(0.6, m.powerSave);
    state.mod = m;
    state.unlockedBodies = bodies;
    state.unlockedWeapons = weapons;
    state.unlockedCpus = cpus;
    state.tiers = tier;
  }

  // ---- 経済の派生値 -------------------------------------------------------
  function facilityCost(id) { var b = G.FACILITIES[id]; return Math.round(b.cost * Math.pow(b.costScale, state.buildings[id] || 0)); }
  var KIND_DEF = { body: 'bodyFab', head: 'headFab', weapon: 'weaponFab', assembly: 'assembly' };
  function industryDef(kind) { return G.INDUSTRY[KIND_DEF[kind]]; }
  function industryCost(kind) { var d = industryDef(kind), n = industryList(kind).length; return Math.round(d.cost * Math.pow(d.costScale, n)); }
  function industryList(kind) {
    return kind === 'body' ? state.bodyFabs : kind === 'head' ? state.headFabs
         : kind === 'weapon' ? state.weaponFabs : state.assemblies;
  }
  function powerSupply() {
    var s = 0; for (var id in state.buildings) { var p = G.FACILITIES[id].power; if (p > 0) s += p * state.buildings[id]; }
    return s;
  }
  function powerDemand() {
    var save = 1 - (state.mod ? state.mod.powerSave : 0), d = 0;
    for (var id in state.buildings) { var p = G.FACILITIES[id].power; if (p < 0) d += (-p) * state.buildings[id]; }
    d += state.bodyFabs.length * (-G.INDUSTRY.bodyFab.power)
       + state.headFabs.length * (-G.INDUSTRY.headFab.power)
       + state.weaponFabs.length * (-G.INDUSTRY.weaponFab.power)
       + state.assemblies.length * (-G.INDUSTRY.assembly.power);
    return d * save;
  }
  function powerEfficiency() { var d = powerDemand(); return d <= 0 ? 1 : Math.min(1, powerSupply() / d); }
  function matCap() { return G.MAT_CAP_BASE + (state.buildings.depot || 0) * G.FACILITIES.depot.cap; }
  function researchRate() { return (state.buildings.lab || 0) * G.FACILITIES.lab.research * state.mod.researchMult * powerEfficiency(); }
  function capacityMax() { return state.capacityMax + state.mod.capacityBonus + (state.buildings.relay || 0) * G.FACILITIES.relay.capacity; }
  function capacityUsed() { var c = 0; for (var i = 0; i < state.units.length; i++) c += state.units[i].stats.cap; return c; }
  function moduleCap() { return 4 + (state.mod ? state.mod.moduleCapBonus : 0) + state.grantedModules; }
  function freeModules() { var u = 0; for (var i = 0; i < state.zones.length; i++) u += state.zones[i].modules; return state.modules - u; }
  function addMat(k, amt) { state.mat[k] = Math.min(matCap(), (state.mat[k] || 0) + amt); }

  // ---- 建設・設備 ---------------------------------------------------------
  function buyFacility(id) {
    var c = facilityCost(id); if (state.mat.iron < c) return false;
    state.mat.iron -= c; state.buildings[id] = (state.buildings[id] || 0) + 1; recomputeMod(); return true;
  }
  function firstUnlockedBody() { for (var k in G.BODIES) if (state.unlockedBodies[k]) return k; return 'infantry'; }
  function buyIndustry(kind) {
    var c = industryCost(kind); if (state.mat.iron < c) return false;
    state.mat.iron -= c;
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
  // 採取モジュールの割り当て
  function assignModule(zi) { if (state.zones[zi] && state.zones[zi].unlocked && freeModules() > 0) { state.zones[zi].modules++; return true; } return false; }
  function unassignModule(zi) { if (state.zones[zi] && state.zones[zi].modules > 0) { state.zones[zi].modules--; return true; } return false; }
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
    if (t.reqZone != null && !(state.zones[t.reqZone] && state.zones[t.reqZone].unlocked)) return false; // 鉱区前提
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

  function spawnUnit(stats) {
    var a = Math.random() * 6.2832, r = DOME + 8 + Math.random() * 10;
    state.units.push({ stats: stats, side: 'p', x: Math.cos(a) * r, y: Math.sin(a) * r, hp: stats.hp, maxHp: stats.hp, cd: 0 });
    state.stats.built++; vfx({ k: 'spawn', x: Math.cos(a) * r, y: Math.sin(a) * r, body: stats.body, a: stats.domain === 'air' });
  }
  function spawnEnemy(id) {
    var e = G.ENEMIES[id], a = Math.random() * 6.2832;
    state.enemies.push({ type: id, side: 'e', x: Math.cos(a) * SPAWN, y: Math.sin(a) * SPAWN, hp: e.hp, maxHp: e.hp, cd: 0 });
    if (e.boss) vfx({ k: 'boss' });
  }

  // ---- 工業シミュレーション ----------------------------------------------
  function fabSpeed() { return state.mod.buildSpeed * powerEfficiency(); }

  // 中間素材レシピの入力（基本素材＋中間素材＋水/燃料）が揃っているか／消費
  function haveRecipe(r) {
    var k;
    if (r.mats) for (k in r.mats) if ((state.mat[k] || 0) < r.mats[k]) return false;
    if (r.inter) for (k in r.inter) if ((state.inter[k] || 0) < r.inter[k]) return false;
    if (r.water && state.water < r.water) return false;
    if (r.fuel && state.fuel < r.fuel) return false;
    return true;
  }
  function consumeRecipe(r) {
    var k;
    if (r.mats) for (k in r.mats) state.mat[k] -= r.mats[k];
    if (r.inter) for (k in r.inter) state.inter[k] -= r.inter[k];
    if (r.water) state.water -= r.water;
    if (r.fuel) state.fuel -= r.fuel;
  }
  function haveInter(cost) { for (var k in cost) if ((state.inter[k] || 0) < cost[k]) return false; return true; }
  function consumeInter(cost) { for (var k in cost) state.inter[k] -= cost[k]; }

  // 部品工場：中間素材コストを消費して部品在庫を作る
  function tickPart(f, time, cost, atCap, onDone, sp, dt) {
    f.prog += dt * sp;
    if (f.prog >= time) {
      if (atCap() || !haveInter(cost)) { f.prog = time; }
      else { consumeInter(cost); onDone(); f.prog -= time; }
    }
  }

  function processIndustry(dt, inBattle) {
    var sp = fabSpeed(), eff = powerEfficiency(), cap = matCap(), i, k;

    // ① 鉱区採取（投入モジュール数 × 産出。電力非依存）
    for (i = 0; i < state.zones.length; i++) {
      var zs = state.zones[i]; if (!zs.unlocked || zs.modules <= 0) continue;
      var z = G.ZONES[i];
      addMat(z.mat, zs.modules * z.rate * state.mod.mineMult * dt);
      if (z.byproduct) addMat(z.byproduct, zs.modules * z.byRate * state.mod.mineMult * dt);
    }
    // ② ユーティリティ（電力で稼働）
    state.water = Math.min(cap, state.water + (state.buildings.pump || 0) * G.FACILITIES.pump.water * eff * dt);
    state.fuel = Math.min(cap, state.fuel + (state.buildings.refinery || 0) * G.FACILITIES.refinery.fuel * eff * dt);
    if (state.modules < moduleCap()) state.modules = Math.min(moduleCap(), state.modules + (state.buildings.moduleFab || 0) * G.FACILITIES.moduleFab.module * eff * dt);

    // ③ 中間素材設備（基本素材＋水/燃料 → 中間素材）
    for (k in G.INTERMEDIATES) {
      var im = G.INTERMEDIATES[k], cnt = state.buildings[im.fac] || 0;
      if (cnt <= 0) continue;
      state.proc[im.fac] += dt * cnt * eff * state.mod.interSpeed;
      while (state.proc[im.fac] >= im.time) {
        if (state.inter[k] >= cap || !haveRecipe(im)) { state.proc[im.fac] = im.time; break; }
        consumeRecipe(im); state.inter[k] = Math.min(cap, state.inter[k] + 1); state.proc[im.fac] -= im.time;
      }
    }

    // ④ 部品工場（中間素材 → ボディ/ヘッド/ウェポン）
    var SC = G.STOCK_CAP;
    for (i = 0; i < state.bodyFabs.length; i++) {
      var bf = state.bodyFabs[i], bd = G.BODIES[bf.assign];
      (function (assign) {
        tickPart(bf, bd.partTime, G.PART_COST.body[assign],
          function () { return state.stock.body[assign] >= SC.body; },
          function () { state.stock.body[assign]++; }, sp, dt);
      })(bf.assign);
    }
    var hf = G.INDUSTRY.headFab;
    for (i = 0; i < state.headFabs.length; i++) tickPart(state.headFabs[i], hf.partTime, G.PART_COST.head,
      function () { return state.stock.head >= SC.head; },
      function () { state.stock.head++; }, sp, dt);
    for (i = 0; i < state.weaponFabs.length; i++) {
      var wf = state.weaponFabs[i], wd = G.WEAPONS[wf.assign];
      (function (assign) {
        tickPart(wf, wd.partTime, G.PART_COST.weapon[assign],
          function () { return state.stock.weapon[assign] >= SC.weapon; },
          function () { state.stock.weapon[assign]++; }, sp, dt);
      })(wf.assign);
    }

    // ⑤ 組立（戦闘中のみ。3部品＋容量を消費してユニット生成）
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
        } else { a.prog = at; }
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
    addMat('iron', wave.reward.ore);   // 報酬は鉄として受け取る
    state.research += wave.reward.research;
    state.wave++;
    if (state.wave < currentChapter().waves.length) state.phase = 'prep';
    else { state.pendingStory = currentChapter().outro; state.pendingChoice = currentChapter().choice; state.phase = 'story'; }
  }
  // 章の解放（鉱区・モジュール）。章開始時に一度だけ適用。
  function applyGrant() {
    if (state.grantsApplied[state.chapter]) return;
    var gr = currentChapter().grant;
    if (gr) {
      if (gr.zones) for (var j = 0; j < gr.zones.length; j++) { var zi = gr.zones[j]; if (state.zones[zi]) state.zones[zi].unlocked = true; }
      if (gr.modules) { state.modules += gr.modules; state.grantedModules += gr.modules; }
    }
    state.grantsApplied[state.chapter] = true;
  }
  function afterOutro() { if (state.pendingChoice) state.phase = 'choice'; else advanceChapter(); }
  function applyChoice(opt) { var ap = opt.apply; for (var k in ap) state.perm[k] = (state.perm[k] || 0) + ap[k]; state.pendingChoice = null; recomputeMod(); advanceChapter(); }
  function advanceChapter() {
    state.chapter++; state.wave = 0;
    if (state.chapter >= G.CHAPTERS.length) state.phase = 'won';
    else { applyGrant(); state.pendingStory = currentChapter().intro; state.phase = 'intro'; }
  }
  function afterIntro() { state.phase = 'prep'; }

  // ---- 戦闘 ---------------------------------------------------------------
  function domainOf(ent) { return ent.side === 'p' ? ent.stats.domain : G.ENEMIES[ent.type].domain; }
  function defOf(ent) { return ent.side === 'p' ? ent.stats.def : G.ENEMIES[ent.type].def; }
  function canHit(aSpec, ent) { return domainOf(ent) !== 'air' || aSpec.antiAir === true; }
  function d2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function distC(e) { return Math.sqrt(e.x * e.x + e.y * e.y); }
  function nearestHittable(list, from, aSpec) {
    var best = null, bd = 1e18;
    for (var i = 0; i < list.length; i++) { if (!canHit(aSpec, list[i])) continue;
      var dx = list[i].x - from.x, dy = list[i].y - from.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = list[i]; } }
    return best;
  }
  function dealDamage(target, raw) { target.hp -= Math.max(G.MIN_DMG, raw - defOf(target)); target.hitT = 0.13; }
  // 視覚イベント（純粋に演出用。ui.js が消費する。ロジックには影響しない）
  function vfx(o) { if (state.vfx.length < 600) state.vfx.push(o); }

  // ウェポン挙動を含む自軍の攻撃解決（2Dアリーナ）
  function playerAttack(u, target) {
    var s = u.stats, raw = s.dmg, w = s.weapon;
    u.fireT = 0.17;
    var token = ++state._atkToken;
    vfx({ k: 'shot', side: 'p', body: s.body, x1: u.x, y1: u.y, x2: target.x, y2: target.y, kind: w.kind });
    target._t = token; dealDamage(target, raw);
    if (w.aoe > 0) {
      for (var i = 0; i < state.enemies.length; i++) {
        var e = state.enemies[i];
        if (e._t === token) continue;
        if (d2(e, target) <= w.aoe) { e._t = token; dealDamage(e, raw * 0.6); }
      }
      vfx({ k: 'blast', x: target.x, y: target.y, r: w.aoe });
    }
    if (w.chain > 0) {
      var cur = target, mult = 1;
      for (var c = 0; c < w.chain; c++) {
        mult *= G.CHAIN_FALLOFF;
        var nx = null, nd = 1e18;
        for (var j = 0; j < state.enemies.length; j++) {
          var en = state.enemies[j];
          if (en._t === token) continue;
          var dd = d2(en, cur);
          if (dd <= G.CHAIN_RANGE && dd < nd) { nd = dd; nx = en; }
        }
        if (!nx) break;
        vfx({ k: 'arc', x1: cur.x, y1: cur.y, x2: nx.x, y2: nx.y });
        nx._t = token; dealDamage(nx, raw * mult); cur = nx;
      }
    }
  }
  function moveToward(ent, tx, ty, sp, dt) {
    var dx = tx - ent.x, dy = ty - ent.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    ent.x += (dx / d) * sp * dt; ent.y += (dy / d) * sp * dt;
  }

  function combatStep(dt) {
    var i, u, e, target, spec, s;

    // 自軍：最寄りの敵へ向かい、射程内なら攻撃（360度どこへでも）
    for (i = 0; i < state.units.length; i++) {
      u = state.units[i]; s = u.stats; u.cd -= dt;
      if (u.fireT > 0) u.fireT -= dt; if (u.hitT > 0) u.hitT -= dt;
      target = nearestHittable(state.enemies, u, s);
      if (!target) continue;                                  // 敵がいなければ待機
      var d = d2(u, target);
      if (d > s.range) moveToward(u, target.x, target.y, s.speed, dt);
      else if (u.cd <= 0) { playerAttack(u, target); u.cd = 1 / s.rate; }
    }

    // 敵：中央のドームへ殺到。射程内の味方がいれば足を止めて攻撃、ドーム到達で自陣を攻撃
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i]; spec = G.ENEMIES[e.type]; e.cd -= dt;
      if (e.fireT > 0) e.fireT -= dt; if (e.hitT > 0) e.hitT -= dt;
      target = nearestHittable(state.units, e, spec);
      var inRange = target && d2(e, target) <= spec.range;
      var dc = distC(e);
      if (!inRange && dc > DOME + spec.range) moveToward(e, 0, 0, spec.speed, dt);
      if (e.cd <= 0) {
        if (inRange) {
          e.fireT = 0.17;
          vfx({ k: 'shot', side: 'e', col: spec.color, x1: e.x, y1: e.y, x2: target.x, y2: target.y });
          dealDamage(target, spec.dmg); e.cd = 1 / spec.rate;
        } else if (dc <= DOME + spec.range) {
          state.hqHp -= spec.dmg; e.cd = 1 / spec.rate;
          var n = dc || 1; vfx({ k: 'hqhit', x: e.x / n * DOME, y: e.y / n * DOME, col: spec.color });
        }
      }
    }

    // 防衛砲台（ドーム周囲・全方位・対空可）
    var turrets = state.buildings.turret || 0;
    if (turrets > 0 && state.enemies.length) {
      state._turretTick += dt;
      if (state._turretTick >= 0.5) {
        state._turretTick = 0;
        for (var sgun = 0; sgun < turrets && state.enemies.length; sgun++) {
          var near = null, nd = 1e18;
          for (i = 0; i < state.enemies.length; i++) { var dcc = distC(state.enemies[i]); if (dcc <= TURRET_R && dcc < nd) { nd = dcc; near = state.enemies[i]; } }
          if (near) {
            var nn = nd || 1;
            vfx({ k: 'beam', x1: near.x / nn * DOME, y1: near.y / nn * DOME, x2: near.x, y2: near.y });
            dealDamage(near, 30);
          }
        }
      }
    }

    // 死亡処理
    for (i = state.units.length - 1; i >= 0; i--) if (state.units[i].hp <= 0) {
      var du = state.units[i];
      vfx({ k: 'boom', x: du.x, y: du.y, col: '#9fd8ff', a: du.stats.domain === 'air', ally: true, spr: du.stats.body, grade: du.stats.grade });
      state.stats.lost++; state.units.splice(i, 1);
    }
    for (i = state.enemies.length - 1; i >= 0; i--) if (state.enemies[i].hp <= 0) {
      var de = state.enemies[i], ds = G.ENEMIES[de.type];
      addMat('iron', ds.bounty);   // 撃破報酬は鉄
      state.stats.kills++;
      vfx({ k: 'boom', x: de.x, y: de.y, col: ds.color, a: ds.domain === 'air', big: !!ds.boss, spr: 'e_' + de.type });
      state.enemies.splice(i, 1);
    }
  }

  // ---- メイン更新 ---------------------------------------------------------
  function update(dt) {
    if (!state || state.phase === 'won' || state.phase === 'lost') return;
    if (dt > 0.1) dt = 0.1;
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

  function newGame() {
    state = freshState(); recomputeMod();
    applyGrant();                                   // 第一章の鉱区Ⅰ/Ⅱ＋モジュールを解放
    if (state.zones[0]) state.zones[0].modules = 2; // 初期配備（鉄2/銅2）
    if (state.zones[1]) state.zones[1].modules = 2;
    state.pendingStory = currentChapter().intro; state.phase = 'intro'; G.state = state; return state;
  }

  // ---- 公開API ------------------------------------------------------------
  G.Game = {
    newGame: newGame, update: update,
    facilityCost: facilityCost, industryCost: industryCost, industryList: industryList,
    powerSupply: powerSupply, powerDemand: powerDemand, powerEfficiency: powerEfficiency,
    matCap: matCap, researchRate: researchRate,
    capacityUsed: capacityUsed, capacityMax: capacityMax,
    moduleCap: moduleCap, freeModules: freeModules,
    buyFacility: buyFacility, buyIndustry: buyIndustry, removeIndustry: removeIndustry,
    assignModule: assignModule, unassignModule: unassignModule,
    setFabAssign: setFabAssign, setAssemblyBody: setAssemblyBody, setAssemblyWeapon: setAssemblyWeapon, toggleCpu: toggleCpu,
    computeStats: computeStats,
    canResearch: canResearch, doResearch: doResearch,
    startBattle: startBattle, afterIntro: afterIntro, afterOutro: afterOutro, applyChoice: applyChoice,
    currentChapter: currentChapter, currentWave: currentWave,
    constants: { domeR: DOME, spawnR: SPAWN, viewR: G.ARENA.viewR, turretR: TURRET_R },
    get state() { return state; },
  };

})(window.G = window.G || {});

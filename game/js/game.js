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
    var mat = {}, k;
    for (k = 0; k < G.MATERIALS.length; k++) mat[G.MATERIALS[k]] = 0;
    mat.iron = 220;
    return {
      mat: mat, research: 0,
      modules: 0, grantedModules: 0,
      zones: G.ZONES.map(function () { return { unlocked: false, modules: 0 }; }),
      grantsApplied: {},
      factory: G.Factory.defaultLayout(),     // 生産ライン（グリッド）
      researched: {}, perm: {},
      unlockedBodies: {}, unlockedWeapons: {}, unlockedCpus: {},
      tiers: { body: 1, weapon: 1, head: 1 },
      units: [], enemies: [], vfx: [],
      hqHp: G.HQ_HP, hqHpMax: G.HQ_HP, capacityMax: 18,
      chapter: 0, wave: 0, phase: 'intro',
      spawns: [], battleTime: 0,
      stats: { kills: 0, lost: 0, built: 0 },
      pendingStory: null, pendingChoice: null, storyReturn: null,
      battleMode: 'story', defenseStage: 0, defenseResult: null, _savedHp: 0,
      mod: null, _atkToken: 0, _turretTick: 0,
    };
  }

  // ---- 修飾子・解放・グレードの再計算 ------------------------------------
  function recomputeMod() {
    var m = { mineMult: 1, researchMult: 1, buildSpeed: 1, interSpeed: 1, powerSave: 0, capacityBonus: 0, moduleCapBonus: 0 };
    var bodies = { infantry: true, assault: true };
    var weapons = { standard: true };
    var cpus = {};
    var mach = { belt: true, intake: true, smelter: true, fab: true, assembler: true, gen: true, lab: true };
    var tier = { body: 1, weapon: 1, head: 1 };

    function applyEffect(e) {
      if (!e) return;
      if (e.unlockMach) mach[e.unlockMach] = true;
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
    state.unlockedMach = mach;
    state.tiers = tier;
  }

  // ---- 経済の派生値（電力などは生産ライン＝ファクトリーから算出） ---------
  function facPower() { return G.Factory.power(state.factory); }
  function powerSupply() { return facPower().supply; }
  function powerDemand() { return facPower().demand; }
  function powerEfficiency() { return facPower().eff; }
  function matCap() { return G.MAT_CAP_BASE; }
  function researchRate() { return G.Factory.count(state.factory, 'lab') * G.MACH.lab.research * state.mod.researchMult * powerEfficiency(); }
  function capacityMax() { return state.capacityMax + state.mod.capacityBonus + G.Factory.count(state.factory, 'relay') * G.MACH.relay.capacity; }
  function capacityUsed() { var c = 0; for (var i = 0; i < state.units.length; i++) c += state.units[i].stats.cap; return c; }
  function moduleCap() { return 4 + (state.mod ? state.mod.moduleCapBonus : 0) + state.grantedModules; }
  function freeModules() { var u = 0; for (var i = 0; i < state.zones.length; i++) u += state.zones[i].modules; return state.modules - u; }
  function addMat(k, amt) { state.mat[k] = Math.min(matCap(), (state.mat[k] || 0) + amt); }

  // 採取モジュールの割り当て
  function assignModule(zi) { if (state.zones[zi] && state.zones[zi].unlocked && freeModules() > 0) { state.zones[zi].modules++; return true; } return false; }
  function unassignModule(zi) { if (state.zones[zi] && state.zones[zi].modules > 0) { state.zones[zi].modules--; return true; } return false; }

  // ---- 生産ライン（ファクトリー）編集API（建設は鉄を消費） ---------------
  var facDir = 0;   // 直近に選んだ向き（UIから設定）
  function facSetDir(d) { facDir = ((d % 4) + 4) % 4; }
  // 製錬レシピが使えるか（必要な素材の鉱区がすべて解放済み）
  function recipeAvailable(rk) {
    var r = G.RECIPES[rk]; if (!r) return false;
    for (var m in r.in) { var zi = G.MATERIALS.indexOf(m); if (!(state.zones[zi] && state.zones[zi].unlocked)) return false; }
    return true;
  }
  function facCost(type) { var d = G.MACH[type]; return Math.round(d.build * Math.pow(1.14, G.Factory.count(state.factory, type))); }
  function facUnlocked(type) { return !!(state.unlockedMach && state.unlockedMach[type]); }
  function facBuild(x, y, type, dir) {
    var f = state.factory; if (!G.Factory.inb(f, x, y) || f.cells[y * f.w + x]) return false;
    if (!facUnlocked(type)) return false;
    var c = facCost(type); if (state.mat.iron < c) return false;
    state.mat.iron -= c; G.Factory.place(f, x, y, type, dir == null ? facDir : dir); return true;
  }
  function facRemove(x, y) { return G.Factory.remove(state.factory, x, y); }
  function facRotate(x, y) { var c = G.Factory.cell(state.factory, x, y); if (c) { c.dir = (c.dir + 1) % 4; if (c.t === 'belt') { c.item = null; c.p = 0; } } }
  function facSetCfg(x, y, key, val) {
    var c = G.Factory.cell(state.factory, x, y); if (!c) return;
    if (c.t === 'intake' && key === 'mat') { var zi = G.MATERIALS.indexOf(val); if (state.zones[zi] && state.zones[zi].unlocked) c.mat = val; }
    if (c.t === 'smelter' && key === 'recipe' && G.RECIPES[val] && recipeAvailable(val)) c.recipe = val;
    if (c.t === 'fab' && key === 'part' && (val === 'body' || val === 'head' || val === 'weapon')) c.part = val;
    if (c.t === 'assembler' && key === 'body' && state.unlockedBodies[val]) c.body = val;
    if (c.t === 'assembler' && key === 'weapon' && state.unlockedWeapons[val]) c.weapon = val;
  }
  function facToggleCpu(x, y, cpuId) {
    var c = G.Factory.cell(state.factory, x, y); if (!c || c.t !== 'assembler' || !state.unlockedCpus[cpuId]) return;
    var idx = c.cpus.indexOf(cpuId);
    if (idx >= 0) c.cpus.splice(idx, 1);
    else if (c.cpus.length < state.tiers.head) c.cpus.push(cpuId);
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
    var antiAir = b.antiAir, lifesteal = 0, crit = 0, critMult = 1, pierce = 0, regen = 0;
    var slow = 0, slowDur = 0, shield = 0, thorns = 0, multishot = 0, stunChance = 0, stunDur = 0;
    (bp.cpus || []).forEach(function (id) {
      var e = G.CPUS[id] && G.CPUS[id].effect; if (!e) return;
      if (e.def) def += e.def; if (e.range) range += e.range;
      if (e.hpMult) hpMult += e.hpMult; if (e.dmgMult) dmgMult += e.dmgMult;
      if (e.speedMult) speedMult += e.speedMult; if (e.rateMult) rateMult += e.rateMult;
      if (e.antiAir) antiAir = true;
      if (e.lifesteal) lifesteal += e.lifesteal;
      if (e.crit) crit += e.crit;
      if (e.critMult) critMult = Math.max(critMult, e.critMult);
      if (e.pierce) pierce += e.pierce;
      if (e.regen) regen += e.regen;
      if (e.slow) { slow = slow ? Math.min(slow, e.slow) : e.slow; slowDur = Math.max(slowDur, e.slowDur || 1); }
      if (e.shield) shield += e.shield;
      if (e.thorns) thorns += e.thorns;
      if (e.multishot) multishot += e.multishot;
      if (e.stunChance) { stunChance += e.stunChance; stunDur = Math.max(stunDur, e.stunDur || 0.6); }
    });
    var w = G.WEAPONS[bp.weapon], wc = w.compute(t.weapon);
    dmgMult *= wc.dmgMult;
    return {
      body: bp.body, domain: b.domain, antiAir: antiAir, cap: b.cap,
      hp: hp * hpMult, dmg: dmg * dmgMult, def: def, speed: speed * speedMult,
      range: range, rate: rate * rateMult, grade: t.body, wgrade: t.weapon,
      lifesteal: lifesteal, crit: crit, critMult: critMult, pierce: pierce, regen: regen,
      slow: slow, slowDur: slowDur, shield: shield, thorns: thorns, multishot: multishot, stunChance: stunChance, stunDur: stunDur,
      weapon: { kind: w.kind, aoe: wc.aoe || 0, chain: wc.chain || 0 },
    };
  }

  function spawnUnit(stats) {
    var a = Math.random() * 6.2832, r = DOME + 8 + Math.random() * 10;
    var u = { stats: stats, side: 'p', x: Math.cos(a) * r, y: Math.sin(a) * r, hp: stats.hp, maxHp: stats.hp, cd: 0 };
    if (stats.shield > 0) { u.shieldMax = stats.shield * stats.hp; u.shield = u.shieldMax; }
    state.units.push(u);
    state.stats.built++; vfx({ k: 'spawn', x: Math.cos(a) * r, y: Math.sin(a) * r, body: stats.body, a: stats.domain === 'air' });
  }
  function spawnEnemy(id) {
    var e = G.ENEMIES[id], a = Math.random() * 6.2832;
    state.enemies.push({ type: id, side: 'e', x: Math.cos(a) * SPAWN, y: Math.sin(a) * SPAWN, hp: e.hp, maxHp: e.hp, cd: 0 });
    if (e.boss) vfx({ k: 'boss', jp: e.warnJp, en: e.warnEn });
  }

  // ---- 工業シミュレーション（鉱区採取＋ファクトリー） --------------------
  function processIndustry(dt, inBattle) {
    var eff = powerEfficiency(), i;

    // ① 鉱区採取（投入モジュール数 × 産出。電力非依存）
    for (i = 0; i < state.zones.length; i++) {
      var zs = state.zones[i]; if (!zs.unlocked || zs.modules <= 0) continue;
      var z = G.ZONES[i];
      addMat(z.mat, zs.modules * z.rate * state.mod.mineMult * dt);
    }
    // ② モジュール工房（採取モジュールを保有上限まで製造）
    var mf = G.Factory.count(state.factory, 'modfab');
    if (mf > 0 && state.modules < moduleCap())
      state.modules = Math.min(moduleCap(), state.modules + mf * G.MACH.modfab.module * eff * dt);

    // ③ 生産ライン（資源入力→製錬→部品→組立）。組立は容量内で常時ユニット生成
    G.Factory.tick(state.factory, dt, {
      eff: eff * state.mod.buildSpeed,
      inBattle: inBattle,                           // 組立機は戦闘中のみユニットを射出
      bodyInt: G.gradeInt(state.tiers.body),       // ボディ/ヘッド部品が要求する中間素材
      weaponInt: G.gradeInt(state.tiers.weapon),    // ウェポン部品が要求する中間素材
      takeMat: function (k, n) { if ((state.mat[k] || 0) >= n) { state.mat[k] -= n; return true; } return false; },
      canSpawn: function () { return capacityUsed() < capacityMax(); },
      spawnUnit: function (cfg) { spawnUnit(computeStats(cfg)); },
    });
  }

  // ---- 波・シナリオ -------------------------------------------------------
  function currentChapter() { return G.CHAPTERS[state.chapter]; }
  function currentWave() { return currentChapter().waves[state.wave]; }
  function buildSpawns(groups) {
    state.spawns = [];
    for (var g = 0; g < groups.length; g++) { var grp = groups[g];
      for (var i = 0; i < grp.count; i++) state.spawns.push({ type: grp.type, t: grp.delay + i * grp.gap }); }
    state.spawns.sort(function (a, b) { return a.t - b.t; });
    state.battleTime = 0;
  }
  function startBattle() {
    if (state.phase !== 'prep') return;
    state.battleMode = 'story';
    buildSpawns(currentWave().enemies);
    state.phase = 'battle';
  }
  // 暫時防衛（周回コンテンツ）。解放数 = クリア済みの章数。
  function defenseAvailable() { return Math.min(state.chapter, G.DEFENSE.length); }
  function startDefense(idx) {
    if (state.phase !== 'prep') return false;
    if (idx < 0 || idx >= defenseAvailable()) return false;
    state.battleMode = 'defense'; state.defenseStage = idx; state.defenseResult = null;
    state._savedHp = state.hqHp;          // 周回戦は本陣HPを後で復元（campaignを終わらせない）
    buildSpawns(G.DEFENSE[idx].enemies);
    state.phase = 'battle';
    return true;
  }
  function onDefenseCleared() {
    var st = G.DEFENSE[state.defenseStage];
    var drops = st.mods, n = drops[(Math.random() * drops.length) | 0] || 0;
    if (n > 0) { state.modules += n; state.grantedModules += n; recomputeMod(); }
    state.hqHp = state._savedHp;           // 本陣HPを戦闘前に復元
    state.battleMode = 'story';
    state.defenseResult = { gained: n, stage: state.defenseStage };
    state.phase = 'prep';
  }
  function failDefense() {
    state.enemies = []; state.spawns = [];
    state.hqHp = state._savedHp;
    state.battleMode = 'story';
    state.defenseResult = { fail: true, stage: state.defenseStage };
    state.phase = 'prep';
  }
  // 戦闘勝利での解放（鉱区・モジュール）。波単位で即時適用。
  function applyWaveGrant(gr) {
    if (!gr) return;
    if (gr.zones) for (var j = 0; j < gr.zones.length; j++) { var zi = gr.zones[j]; if (state.zones[zi]) state.zones[zi].unlocked = true; }
    if (gr.modules) { state.modules += gr.modules; state.grantedModules += gr.modules; }
    recomputeMod();
  }
  function onWaveCleared() {
    var wave = currentWave();
    addMat('iron', wave.reward.ore);   // 報酬は鉄として受け取る
    state.research += wave.reward.research;
    if (wave.grant) applyWaveGrant(wave.grant);          // 戦闘勝利での鉱区解放など
    state.wave++;
    if (state.wave < currentChapter().waves.length) {
      if (wave.interlude) { state.pendingStory = wave.interlude; state.storyReturn = 'interlude'; state.phase = 'story'; }
      else state.phase = 'prep';
    } else {
      state.pendingStory = currentChapter().outro; state.pendingChoice = currentChapter().choice; state.storyReturn = 'outro'; state.phase = 'story';
    }
  }
  function afterInterlude() { state.phase = 'prep'; }
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
  function dealDamage(target, raw, pierce) {
    var def = defOf(target) - (pierce || 0); if (def < 0) def = 0;
    var dmg = Math.max(G.MIN_DMG, raw - def);
    if (target.side === 'p' && target.shield > 0) {          // 遮蔽CPU：シールドで吸収
      var ab = Math.min(target.shield, dmg); target.shield -= ab; dmg -= ab; target._shdCd = 1.4;
    }
    target.hp -= dmg; target.hitT = 0.13; return dmg;
  }
  // 視覚イベント（純粋に演出用。ui.js が消費する。ロジックには影響しない）
  function vfx(o) { if (state.vfx.length < 600) state.vfx.push(o); }

  // ウェポン挙動を含む自軍の攻撃解決（2Dアリーナ）
  function playerAttack(u, target) {
    var s = u.stats, raw = s.dmg, w = s.weapon, pen = s.pierce || 0;
    var isCrit = s.crit && Math.random() < s.crit;
    if (isCrit) raw *= s.critMult;                       // 暴撃CPU
    u.fireT = 0.17;
    var token = ++state._atkToken, dealt = 0;
    vfx({ k: 'shot', side: 'p', body: s.body, x1: u.x, y1: u.y, x2: target.x, y2: target.y, kind: w.kind, crit: isCrit });
    target._t = token; dealt += dealDamage(target, raw, pen); applyCC(target, s);
    if (w.aoe > 0) {
      for (var i = 0; i < state.enemies.length; i++) {
        var e = state.enemies[i];
        if (e._t === token) continue;
        if (d2(e, target) <= w.aoe) { e._t = token; dealt += dealDamage(e, raw * 0.6, pen); }
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
        nx._t = token; dealt += dealDamage(nx, raw * mult, pen); cur = nx;
      }
    }
    if (s.multishot > 0) {                                // 多重CPU：近くの敵を追撃
      var hitn = 0;
      for (var m = 0; m < state.enemies.length && hitn < s.multishot; m++) {
        var em = state.enemies[m];
        if (em._t === token || !canHit(s, em)) continue;
        if (d2(em, u) <= s.range + 30) {
          em._t = token; dealt += dealDamage(em, raw * 0.6, pen);
          vfx({ k: 'shot', side: 'p', body: s.body, x1: u.x, y1: u.y, x2: em.x, y2: em.y, kind: 'single' });
          hitn++;
        }
      }
    }
    if (s.lifesteal && u.hp < u.maxHp) {                 // 吸命CPU
      u.hp = Math.min(u.maxHp, u.hp + dealt * s.lifesteal);
      if (Math.random() < 0.4) vfx({ k: 'heal', x: u.x, y: u.y });
    }
  }
  function applyCC(en, s) {
    if (s.slow) { en.slowT = Math.max(en.slowT || 0, s.slowDur); en.slowM = s.slow; }      // 鈍化CPU
    if (s.stunChance && Math.random() < s.stunChance) {                                      // 麻痺CPU
      en.stunT = Math.max(en.stunT || 0, s.stunDur); vfx({ k: 'stun', x: en.x, y: en.y });
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
      if (s.regen && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * s.regen * dt);  // 修復CPU
      if (u.shieldMax > 0) {                                                                    // 遮蔽CPU：被弾が止むと再生
        if (u._shdCd > 0) u._shdCd -= dt;
        else if (u.shield < u.shieldMax) u.shield = Math.min(u.shieldMax, u.shield + u.shieldMax * 0.25 * dt);
      }
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
      if (e.slowT > 0) e.slowT -= dt;
      if (e.stunT > 0) { e.stunT -= dt; continue; }            // 麻痺：行動不能
      var espeed = spec.speed * (e.slowT > 0 ? (e.slowM || 1) : 1);   // 鈍化
      target = nearestHittable(state.units, e, spec);
      var inRange = target && d2(e, target) <= spec.range;
      var dc = distC(e);
      if (!inRange && dc > DOME + spec.range) moveToward(e, 0, 0, espeed, dt);
      if (e.cd <= 0) {
        if (inRange) {
          e.fireT = 0.17;
          vfx({ k: 'shot', side: 'e', col: spec.color, x1: e.x, y1: e.y, x2: target.x, y2: target.y });
          var tdmg = dealDamage(target, spec.dmg); e.cd = 1 / spec.rate;
          if (target.stats && target.stats.thorns) { e.hp -= tdmg * target.stats.thorns; e.hitT = 0.13; }  // 反射CPU
        } else if (dc <= DOME + spec.range) {
          state.hqHp -= spec.dmg; e.cd = 1 / spec.rate;
          var n = dc || 1; vfx({ k: 'hqhit', x: e.x / n * DOME, y: e.y / n * DOME, col: spec.color });
        }
      }
    }

    // 防衛砲台（ドーム周囲・全方位・対空可）
    var turrets = G.Factory.count(state.factory, 'turret');
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
      if (state.hqHp <= 0) {
        if (state.battleMode === 'defense') { failDefense(); return; }
        state.hqHp = 0; state.phase = 'lost'; return;
      }
      if (state.spawns.length === 0 && state.enemies.length === 0) {
        if (state.battleMode === 'defense') onDefenseCleared(); else onWaveCleared();
      }
    }
  }

  function newGame() {
    state = freshState(); recomputeMod();
    applyGrant();                                   // 第一章の鉱区Ⅰ＋モジュールを解放
    if (state.zones[0]) state.zones[0].modules = 3; // 初期配備（鉄3）
    state.pendingStory = currentChapter().intro; state.phase = 'intro'; G.state = state; return state;
  }

  // ---- 公開API ------------------------------------------------------------
  G.Game = {
    newGame: newGame, update: update,
    powerSupply: powerSupply, powerDemand: powerDemand, powerEfficiency: powerEfficiency,
    matCap: matCap, researchRate: researchRate,
    capacityUsed: capacityUsed, capacityMax: capacityMax,
    moduleCap: moduleCap, freeModules: freeModules,
    assignModule: assignModule, unassignModule: unassignModule,
    facCost: facCost, facBuild: facBuild, facRemove: facRemove, facRotate: facRotate,
    facSetDir: facSetDir, facSetCfg: facSetCfg, facToggleCpu: facToggleCpu, facPower: facPower,
    facUnlocked: facUnlocked, recipeAvailable: recipeAvailable,
    computeStats: computeStats,
    canResearch: canResearch, doResearch: doResearch,
    startBattle: startBattle, afterIntro: afterIntro, afterInterlude: afterInterlude, afterOutro: afterOutro, applyChoice: applyChoice,
    defenseAvailable: defenseAvailable, startDefense: startDefense,
    currentChapter: currentChapter, currentWave: currentWave,
    constants: { domeR: DOME, spawnR: SPAWN, viewR: G.ARENA.viewR, turretR: TURRET_R },
    get state() { return state; },
  };

})(window.G = window.G || {});

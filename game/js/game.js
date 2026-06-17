/* =========================================================================
 * 鋼鉄戦線 (Steel Front) - コアロジック
 *  状態管理・経済シミュレーション・自動戦闘・波・研究をまとめる。
 *  描画/入力は ui.js 側。ここはゲームルールのみ。
 * ========================================================================= */
(function (G) {
  'use strict';

  var LANE = G.LANE, WALL_X = G.WALL_X;
  var HQ_X = 8;

  // ---- 状態 ---------------------------------------------------------------
  var state = null;

  function freshState() {
    return {
      ore: 150,
      research: 0,
      buildings: { reactor: 1, miner: 2, factory: 1, lab: 0, depot: 0, relay: 0, turret: 0 },
      researched: {},                 // techId -> true
      unlocked: { infantry: true, assault: true }, // 解放済みユニット
      perm: {},                       // シナリオ選択の恒久ボーナス（加算%）
      queue: [],                      // 建造待ち unitId 配列
      lines: [],                      // 工場ライン [{unitId, remaining}|null]
      units: [],                      // 自軍ユニット
      enemies: [],                    // 敵
      effects: [],                    // 爆発などの一時演出 {x,y,r,life,max,color}
      hqHp: G.HQ_HP, hqHpMax: G.HQ_HP,
      capacityMax: 18,
      chapter: 0, wave: 0,
      phase: 'intro',                 // intro|prep|battle|story|choice|won|lost
      spawns: [], battleTime: 0,
      stats: { kills: 0, lost: 0, built: 0 },
      pendingStory: null, pendingChoice: null,
      mod: null,
    };
  }

  // ---- 修飾子（研究＋恒久ボーナス）の再計算 -------------------------------
  function recomputeMod() {
    var m = { mineMult: 1, researchMult: 1, buildSpeed: 1, powerSave: 0,
              hpMult: 1, dmgMult: 1, capacityBonus: 0, defBonus: 0 };
    function applyEffect(e) {
      if (!e) return;
      if (e.mineMult) m.mineMult += e.mineMult;
      if (e.researchMult) m.researchMult += e.researchMult;
      if (e.buildSpeed) m.buildSpeed += e.buildSpeed;
      if (e.powerSave) m.powerSave += e.powerSave;
      if (e.hpMult) m.hpMult += e.hpMult;
      if (e.dmgMult) m.dmgMult += e.dmgMult;
      if (e.capacity) m.capacityBonus += e.capacity;
      if (e.defBonus) m.defBonus += e.defBonus;
      if (e.unlock) state.unlocked[e.unlock] = true;
    }
    for (var id in state.researched) if (state.researched[id]) applyEffect(G.TECHS[id].effect);
    applyEffect(state.perm); // 恒久ボーナスも同じ形式
    m.powerSave = Math.min(0.6, m.powerSave);
    state.mod = m;
    return m;
  }

  // ---- 経済の派生値 -------------------------------------------------------
  function buildingCost(id) {
    var b = G.BUILDINGS[id], n = state.buildings[id] || 0;
    return Math.round(b.cost * Math.pow(b.costScale, n));
  }
  function powerSupply() {
    var s = 0;
    for (var id in state.buildings) {
      var p = G.BUILDINGS[id].power;
      if (p > 0) s += p * state.buildings[id];
    }
    return s;
  }
  function powerDemand() {
    var d = 0, save = 1 - (state.mod ? state.mod.powerSave : 0);
    for (var id in state.buildings) {
      var p = G.BUILDINGS[id].power;
      if (p < 0) d += (-p) * state.buildings[id] * save;
    }
    return d;
  }
  function powerEfficiency() {
    var d = powerDemand();
    if (d <= 0) return 1;
    return Math.min(1, powerSupply() / d);
  }
  function oreCap() { return 400 + (state.buildings.depot || 0) * G.BUILDINGS.depot.oreCap; }
  function oreRate() {
    return (state.buildings.miner || 0) * G.BUILDINGS.miner.ore * state.mod.mineMult * powerEfficiency();
  }
  function researchRate() {
    return (state.buildings.lab || 0) * G.BUILDINGS.lab.research * state.mod.researchMult * powerEfficiency();
  }
  function capacityUsed() {
    var c = 0, i;
    for (i = 0; i < state.units.length; i++) c += G.UNITS[state.units[i].type].cap;
    for (i = 0; i < state.lines.length; i++) if (state.lines[i]) c += G.UNITS[state.lines[i].unitId].cap;
    for (i = 0; i < state.queue.length; i++) c += G.UNITS[state.queue[i]].cap;
    return c;
  }

  // ---- 建設 ---------------------------------------------------------------
  function buyBuilding(id) {
    var cost = buildingCost(id);
    if (state.ore < cost) return false;
    state.ore -= cost;
    state.buildings[id] = (state.buildings[id] || 0) + 1;
    if (id === 'factory') state.lines.length = state.buildings.factory; // ライン枠拡張
    recomputeMod();
    return true;
  }

  // ---- 研究 ---------------------------------------------------------------
  function canResearch(id) {
    var t = G.TECHS[id];
    if (state.researched[id]) return false;
    for (var i = 0; i < t.req.length; i++) if (!state.researched[t.req[i]]) return false;
    return state.research >= t.cost;
  }
  function doResearch(id) {
    if (!canResearch(id)) return false;
    state.research -= G.TECHS[id].cost;
    state.researched[id] = true;
    recomputeMod();
    return true;
  }

  // ---- 建造キュー ---------------------------------------------------------
  function enqueueUnit(id) {
    var u = G.UNITS[id];
    if (!state.unlocked[id]) return false;
    if (state.ore < u.cost) return false;
    if (capacityUsed() + u.cap > capacityMax()) return false;
    state.ore -= u.cost;
    state.queue.push(id);
    return true;
  }
  function capacityMax() { return state.capacityMax + (state.mod ? state.mod.capacityBonus : 0)
                                  + (state.buildings.relay || 0) * G.BUILDINGS.relay.capacity; }

  function processProduction(dt) {
    var eff = powerEfficiency();
    var speed = state.mod.buildSpeed * eff;
    // ライン数を工場数に同期
    if (state.lines.length !== state.buildings.factory) state.lines.length = state.buildings.factory;
    for (var i = 0; i < state.lines.length; i++) {
      var line = state.lines[i];
      // 空きラインにキューから割り当て
      if (!line && state.queue.length) {
        var id = state.queue.shift();
        line = state.lines[i] = { unitId: id, remaining: G.UNITS[id].build };
      }
      if (!line) continue;
      line.remaining -= dt * speed;
      if (line.remaining <= 0) {
        spawnUnit(line.unitId);
        state.lines[i] = null;
      }
    }
  }

  // ---- ユニット/敵の生成 --------------------------------------------------
  function spawnUnit(id) {
    var u = G.UNITS[id];
    state.units.push({
      type: id, side: 'p', x: 4, y: 0,
      hp: u.hp * state.mod.hpMult, maxHp: u.hp * state.mod.hpMult,
      cd: 0,
    });
    state.stats.built++;
  }
  function spawnEnemy(id) {
    var e = G.ENEMIES[id];
    state.enemies.push({
      type: id, side: 'e', x: LANE, y: 0,
      hp: e.hp, maxHp: e.hp, cd: 0,
    });
  }

  // ---- 波の制御 -----------------------------------------------------------
  function currentChapter() { return G.CHAPTERS[state.chapter]; }
  function currentWave() { return currentChapter().waves[state.wave]; }

  function startBattle() {
    if (state.phase !== 'prep') return;
    var wave = currentWave();
    state.spawns = [];
    for (var g = 0; g < wave.enemies.length; g++) {
      var grp = wave.enemies[g];
      for (var i = 0; i < grp.count; i++) {
        state.spawns.push({ type: grp.type, t: grp.delay + i * grp.gap });
      }
    }
    state.spawns.sort(function (a, b) { return a.t - b.t; });
    state.battleTime = 0;
    state.phase = 'battle';
  }

  function onWaveCleared() {
    var wave = currentWave();
    state.ore = Math.min(oreCap(), state.ore + wave.reward.ore);
    state.research += wave.reward.research;
    state.wave++;
    if (state.wave < currentChapter().waves.length) {
      state.phase = 'prep';
    } else {
      // 章クリア → アウトロ／選択
      state.pendingStory = currentChapter().outro;
      state.pendingChoice = currentChapter().choice;
      state.phase = 'story';
    }
  }

  // シナリオ進行：アウトロ表示後に呼ばれる
  function afterOutro() {
    if (state.pendingChoice) { state.phase = 'choice'; }
    else { advanceChapter(); }
  }
  function applyChoice(opt) {
    var ap = opt.apply;
    for (var k in ap) state.perm[k] = (state.perm[k] || 0) + ap[k];
    state.pendingChoice = null;
    recomputeMod();
    advanceChapter();
  }
  function advanceChapter() {
    state.chapter++;
    state.wave = 0;
    if (state.chapter >= G.CHAPTERS.length) {
      state.phase = 'won';
    } else {
      state.pendingStory = currentChapter().intro;
      state.phase = 'intro';
    }
  }
  // intro 表示後
  function afterIntro() { state.phase = 'prep'; }

  // ---- 戦闘シミュレーション ----------------------------------------------
  function specOf(ent) { return ent.side === 'p' ? G.UNITS[ent.type] : G.ENEMIES[ent.type]; }

  // 攻撃側 aSpec が対象 ent を攻撃できるか（空中は対空持ちのみ）
  function canHit(aSpec, ent) {
    return specOf(ent).domain !== 'air' || aSpec.antiAir === true;
  }
  // 攻撃可能な対象のうち最も近いもの
  function nearestHittable(list, from, aSpec) {
    var best = null, bd = 1e9;
    for (var i = 0; i < list.length; i++) {
      if (!canHit(aSpec, list[i])) continue;
      var d = Math.abs(list[i].x - from.x);
      if (d < bd) { bd = d; best = list[i]; }
    }
    return best;
  }
  // ダメージ = max(MIN_DMG, 攻撃力 - 防御力)。defBonus は自軍の被弾側のみに加算。
  function applyDamage(target, raw, targetSpec, targetIsAlly) {
    var def = (targetSpec.def || 0) + (targetIsAlly ? state.mod.defBonus : 0);
    target.hp -= Math.max(G.MIN_DMG, raw - def);
  }

  function addEffect(x, color) {
    state.effects.push({ x: x, r: 4, max: 60, life: 0.4, color: color });
  }

  function combatStep(dt) {
    var i, u, e, target, spec;

    // --- 自軍ユニット ---
    for (i = 0; i < state.units.length; i++) {
      u = state.units[i];
      spec = G.UNITS[u.type];
      u.cd -= dt;
      target = nearestHittable(state.enemies, u, spec);

      if (spec.domain === 'air') {
        // 飛行兵：地上に阻まれず常に前進し、射程内の敵を撃つ
        u.x = Math.min(LANE - 60, u.x + spec.speed * dt);
        if (target && Math.abs(target.x - u.x) <= spec.range && u.cd <= 0) {
          applyDamage(target, spec.dmg * state.mod.dmgMult, G.ENEMIES[target.type], false);
          u.cd = 1 / spec.rate;
        }
        continue;
      }

      if (!target) { // 撃てる敵がいなければ壁の手前まで前進して待機
        if (u.x < WALL_X - 30) u.x += spec.speed * dt;
        continue;
      }
      var d = Math.abs(target.x - u.x);
      if (d > spec.range) {
        u.x += spec.speed * dt; // 敵へ前進（敵は右側）
      } else if (u.cd <= 0) {
        applyDamage(target, spec.dmg * state.mod.dmgMult, G.ENEMIES[target.type], false);
        u.cd = 1 / spec.rate;
      }
    }

    // --- 敵 ---
    for (i = 0; i < state.enemies.length; i++) {
      e = state.enemies[i];
      spec = G.ENEMIES[e.type];
      e.cd -= dt;
      target = nearestHittable(state.units, e, spec);
      var inRange = target && Math.abs(target.x - e.x) <= spec.range;

      // 移動：空中は常に前進、地上は射程外なら前進
      if (spec.domain === 'air' || !inRange) e.x = Math.max(HQ_X, e.x - spec.speed * dt);

      if (e.cd <= 0) {
        if (inRange) {
          applyDamage(target, spec.dmg, G.UNITS[target.type], true);
          e.cd = 1 / spec.rate;
        } else if (e.x <= HQ_X + spec.range) {
          state.hqHp -= spec.dmg; e.cd = 1 / spec.rate; addEffect(HQ_X, '#ff5050');
        }
      }
    }

    // --- 防衛砲台（壁の固定砲・対空可） ---
    //   0.5秒ごとに砲台数ぶん、射程内の最寄り敵を射撃（簡易DPSモデル）。
    var turrets = state.buildings.turret || 0;
    if (turrets > 0 && state.enemies.length) {
      var turretSpec = { antiAir: true };
      state._turretTick = (state._turretTick || 0) + dt;
      if (state._turretTick >= 0.5) {
        state._turretTick = 0;
        for (var s = 0; s < turrets && state.enemies.length; s++) {
          var near = null, nd = 1e9;
          for (i = 0; i < state.enemies.length; i++) {
            var dx = Math.abs(state.enemies[i].x - WALL_X);
            if (dx <= 190 && dx < nd) { nd = dx; near = state.enemies[i]; }
          }
          if (near) { applyDamage(near, 30, G.ENEMIES[near.type], false); addEffect(near.x, '#7fd1ff'); }
        }
      }
    }

    // --- 死亡処理 ---
    for (i = state.units.length - 1; i >= 0; i--) {
      if (state.units[i].hp <= 0) {
        state.stats.lost++;
        state.units.splice(i, 1);
      }
    }
    for (i = state.enemies.length - 1; i >= 0; i--) {
      if (state.enemies[i].hp <= 0) {
        state.research += 0; // bountyは鉱石で
        state.ore = Math.min(oreCap(), state.ore + G.ENEMIES[state.enemies[i].type].bounty);
        state.stats.kills++;
        addEffect(state.enemies[i].x, '#ff8a8a');
        state.enemies.splice(i, 1);
      }
    }

    // --- エフェクト寿命 ---
    for (i = state.effects.length - 1; i >= 0; i--) {
      state.effects[i].life -= dt;
      state.effects[i].r += dt * 120;
      if (state.effects[i].life <= 0) state.effects.splice(i, 1);
    }
  }

  // ---- メイン更新 ---------------------------------------------------------
  function update(dt) {
    if (!state || state.phase === 'won' || state.phase === 'lost') return;
    if (dt > 0.1) dt = 0.1; // 大きなフレーム飛びを抑制

    // 経済は常時稼働
    state.ore = Math.min(oreCap(), state.ore + oreRate() * dt);
    state.research += researchRate() * dt;
    processProduction(dt);

    if (state.phase === 'battle') {
      state.battleTime += dt;
      // 出現
      while (state.spawns.length && state.spawns[0].t <= state.battleTime) {
        spawnEnemy(state.spawns.shift().type);
      }
      combatStep(dt);

      if (state.hqHp <= 0) { state.hqHp = 0; state.phase = 'lost'; return; }
      if (state.spawns.length === 0 && state.enemies.length === 0) {
        onWaveCleared();
      }
    }
  }

  function newGame() {
    state = freshState();
    state.lines.length = state.buildings.factory;
    recomputeMod();
    state.pendingStory = currentChapter().intro;
    state.phase = 'intro';
    G.state = state;
    return state;
  }

  // ---- 公開API ------------------------------------------------------------
  G.Game = {
    newGame: newGame,
    update: update,
    // 経済
    buildingCost: buildingCost,
    powerSupply: powerSupply,
    powerDemand: powerDemand,
    powerEfficiency: powerEfficiency,
    oreCap: oreCap,
    oreRate: oreRate,
    researchRate: researchRate,
    capacityUsed: capacityUsed,
    capacityMax: capacityMax,
    buyBuilding: buyBuilding,
    // 研究
    canResearch: canResearch,
    doResearch: doResearch,
    // 建造
    enqueueUnit: enqueueUnit,
    clearQueue: function () { /* 払い戻しは無し、設計上の取り消し */ state.queue = []; },
    // 波/シナリオ
    startBattle: startBattle,
    afterIntro: afterIntro,
    afterOutro: afterOutro,
    applyChoice: applyChoice,
    currentChapter: currentChapter,
    currentWave: currentWave,
    constants: { LANE: LANE, WALL_X: WALL_X, HQ_X: HQ_X },
    get state() { return state; },
  };

})(window.G = window.G || {});

// =============================================================
//  field.js — 探索と戦闘(見下ろし型アクション)
//  操作: WASD/矢印=移動, マウス=照準, 1〜6=魔法, 左クリック=選択中の魔法
//        E=採取/帰還ゲート, H=帰還詠唱, Q=回復薬, R=魔力薬, Esc=一時停止
// =============================================================

const TS = 32;          // 1タイルの大きさ(px)
const MAP_W = 64, MAP_H = 64;

const Field = {
  active: false,
  paused: false,
  id: null, f: null,
  map: null,
  keys: {},
  mouse: { x: 0, y: 0, down: false },
  cam: { x: 0, y: 0 },
  selSlot: 0,

  // ---------------- 開始 / 終了 ----------------
  start(id) {
    this.id = id;
    this.f = FIELDS[id];
    this.st = playerStats();
    this.generate();
    const c = (MAP_W / 2) * TS;
    this.p = { x: c, y: c, r: 11, hp: this.st.maxHp, mp: this.st.maxMp, inv: 0, face: 0, walk: 0 };
    this.portal = { x: c, y: c };
    this.enemies = []; this.projs = []; this.eprojs = [];
    this.fx = []; this.texts = []; this.parts = [];
    this.cds = {}; this.potionCd = 0;
    this.bag = {};
    this.gather = null; this.recall = null;
    this.time = 0; this.spawnT = 0; this.msg = null;
    this.active = true; this.paused = false;
    this.selSlot = Math.max(0, S.slots.findIndex(x => x));
    for (let i = 0; i < 7; i++) this.spawnEnemy(true);
    if (this.f.boss && !S.flags.bossDefeated) this.spawnBoss();
    S.stats.visited[id] = true;
    this.say(`${this.f.name}に足を踏み入れた`);
    UI.enterField();
    this.resize();
  },

  end(reason) {
    this.active = false;
    const entries = Object.entries(this.bag);
    if (reason === 'death') {
      const loss = this.st.lossOnDeath;
      let lost = 0;
      for (const [k, v] of entries) {
        const l = Math.floor(v * loss);
        lost += l;
        addItem(k, v - l);
      }
      log(`力尽きて工房へ運び戻された…${lost > 0 ? `（素材を${lost}個失った）` : ''}`, 'bad');
    } else {
      for (const [k, v] of entries) addItem(k, v);
      const total = entries.reduce((a, [, v]) => a + v, 0);
      log(`工房へ帰還した（素材 ${total}個を倉庫へ）`, 'good');
    }
    UI.leaveField();
    saveGame();
  },

  // ---------------- マップ生成 ----------------
  // セルオートマトンで洞窟のような地形を作り、
  // 入口から辿り着けない場所は壁で埋める。
  generate() {
    let m = new Uint8Array(MAP_W * MAP_H);
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const edge = x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1;
      m[y * MAP_W + x] = edge || Math.random() < 0.42 ? 1 : 0;
    }
    for (let it = 0; it < 4; it++) {
      const n = new Uint8Array(m);
      for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
        let c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += m[(y + dy) * MAP_W + x + dx];
        n[y * MAP_W + x] = c >= 5 ? 1 : 0;
      }
      m = n;
    }
    const cx = MAP_W / 2, cy = MAP_H / 2;
    for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 < 20) m[y * MAP_W + x] = 0;
    }
    // 到達可能なマスを調べる(幅優先探索)
    const reach = new Uint8Array(MAP_W * MAP_H);
    const q = [cy * MAP_W + cx];
    reach[q[0]] = 1;
    while (q.length) {
      const i = q.pop();
      const x = i % MAP_W, y = (i / MAP_W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = (y + dy) * MAP_W + x + dx;
        if (!m[j] && !reach[j]) { reach[j] = 1; q.push(j); }
      }
    }
    this.floorTiles = [];
    for (let i = 0; i < m.length; i++) {
      if (!reach[i]) m[i] = 1;
      else this.floorTiles.push(i);
    }
    this.map = m;
    // 採取ポイントの配置
    this.nodes = [];
    const used = new Set();
    const total = this.f.nodes.reduce((a, n) => a + n[1], 0);
    for (let k = 0; k < 55; k++) {
      const i = this.floorTiles[(Math.random() * this.floorTiles.length) | 0];
      const x = i % MAP_W, y = (i / MAP_W) | 0;
      if (used.has(i) || (x - cx) ** 2 + (y - cy) ** 2 < 36) continue;
      used.add(i);
      let roll = Math.random() * total, def = this.f.nodes[0];
      for (const n of this.f.nodes) { roll -= n[1]; if (roll <= 0) { def = n; break; } }
      this.nodes.push({ x: (x + 0.5) * TS, y: (y + 0.5) * TS, item: def[0], min: def[2], max: def[3], gone: false, back: 0 });
    }
  },

  solid(px, py) {
    const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
    return this.map[ty * MAP_W + tx] === 1;
  },
  hitsWall(x, y, r) {
    return this.solid(x - r, y - r) || this.solid(x + r, y - r) || this.solid(x - r, y + r) || this.solid(x + r, y + r);
  },
  // 壁にぶつかったら、その軸方向だけ移動を止める(壁沿いに滑れる)
  move(e, dx, dy) {
    if (!this.hitsWall(e.x + dx, e.y, e.r)) e.x += dx;
    if (!this.hitsWall(e.x, e.y + dy, e.r)) e.y += dy;
  },

  // ---------------- 敵の出現 ----------------
  spawnEnemy(initial) {
    const p = this.p;
    const total = this.f.enemies.reduce((a, e) => a + e[1], 0);
    for (let tries = 0; tries < 30; tries++) {
      const i = this.floorTiles[(Math.random() * this.floorTiles.length) | 0];
      const x = (i % MAP_W + 0.5) * TS, y = (((i / MAP_W) | 0) + 0.5) * TS;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < (initial ? 300 : 480) || d > 1100) continue;
      let roll = Math.random() * total, type = this.f.enemies[0][0];
      for (const [t, w] of this.f.enemies) { roll -= w; if (roll <= 0) { type = t; break; } }
      this.addEnemy(type, x, y);
      return;
    }
  },
  addEnemy(type, x, y) {
    const d = ENEMIES[type];
    const e = { type, d, x, y, r: d.r, hp: d.hp, maxHp: d.hp, slow: 0, hitCd: 0, t: Math.random() * 3,
      wander: Math.random() * Math.PI * 2, state: 'move', stateT: 0, shotT: 1 + Math.random() * 2, flash: 0, kx: 0, ky: 0 };
    this.enemies.push(e);
    return e;
  },
  spawnBoss() {
    // 入口から最も遠い床に配置
    let best = null, bd = 0;
    for (const i of this.floorTiles) {
      const x = (i % MAP_W + 0.5) * TS, y = (((i / MAP_W) | 0) + 0.5) * TS;
      const d = Math.hypot(x - this.p.x, y - this.p.y);
      if (d > bd && !this.hitsWall(x, y, 36)) { bd = d; best = { x, y }; }
    }
    if (best) { this.boss = this.addEnemy('guardian', best.x, best.y); this.boss.awake = false; }
  },

  // ---------------- 入力 ----------------
  keyDown(e) {
    const k = e.key.toLowerCase();
    if (k === 'escape') { this.paused = !this.paused; return; }
    if (this.paused) return;
    this.keys[k] = true;
    if (k >= '1' && k <= '6') { this.selSlot = +k - 1; this.cast(+k - 1); }
    if (k === 'e') this.interact();
    if (k === 'h') this.startRecall();
    if (k === 'q') this.drink('potion');
    if (k === 'r') this.drink('mana_potion');
  },
  keyUp(e) { this.keys[e.key.toLowerCase()] = false; },

  worldMouse() {
    return { x: this.mouse.x + this.cam.x, y: this.mouse.y + this.cam.y };
  },

  // ---------------- 魔法 ----------------
  cast(i) {
    const id = S.slots[i];
    if (!id) return;
    const sp = SPELLS[id], p = this.p;
    if ((this.cds[id] || 0) > 0) return;
    if (p.mp < sp.mp) { this.say('MPが足りない'); return; }
    p.mp -= sp.mp;
    this.cds[id] = sp.cd * this.st.cdMult;
    this.recall = null;
    const m = this.worldMouse();
    const ang = Math.atan2(m.y - p.y, m.x - p.x);
    p.face = ang;
    const dmg = (sp.dmg || 0) * this.st.dmgMult;
    if (sp.type === 'proj') {
      this.projs.push({ x: p.x, y: p.y, vx: Math.cos(ang) * sp.speed, vy: Math.sin(ang) * sp.speed, r: sp.r,
        dmg, sp, life: 1.4, hit: new Set() });
    } else if (sp.type === 'heal') {
      const v = this.st.maxHp * sp.heal;
      p.hp = Math.min(this.st.maxHp, p.hp + v);
      this.text(p.x, p.y - 20, `+${Math.round(v)}`, '#7dff9a');
      this.burst(p.x, p.y, sp.color, 18, 120);
    } else if (sp.type === 'chain') {
      let from = { x: p.x, y: p.y };
      let target = null, bd = sp.range;
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - m.x, e.y - m.y);
        if (d < 120 && Math.hypot(e.x - p.x, e.y - p.y) < sp.range && d < bd) { bd = d; target = e; }
      }
      if (!target) { // 照準付近に敵がいなければ最寄りの敵
        bd = sp.range;
        for (const e of this.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; target = e; } }
      }
      const hit = new Set();
      for (let n = 0; n < sp.chains && target; n++) {
        hit.add(target);
        this.fx.push({ type: 'bolt', x1: from.x, y1: from.y, x2: target.x, y2: target.y, life: 0.18, color: sp.color });
        this.damage(target, dmg * (n === 0 ? 1 : 0.75));
        from = target;
        let next = null, nd = 190;
        for (const e of this.enemies) {
          if (hit.has(e) || e.hp <= 0) continue;
          const d = Math.hypot(e.x - from.x, e.y - from.y);
          if (d < nd) { nd = d; next = e; }
        }
        target = next;
      }
      if (hit.size === 0) this.say('雷の届く範囲に敵がいない');
    } else if (sp.type === 'nova') {
      this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 10, maxR: sp.radius, life: 0.3, color: sp.color });
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < sp.radius + e.r) {
          this.damage(e, dmg);
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          const kb = e.d.boss ? 60 : 320;
          e.kx = Math.cos(a) * kb; e.ky = Math.sin(a) * kb;
        }
      }
    } else if (sp.type === 'beam') {
      const x2 = p.x + Math.cos(ang) * sp.length, y2 = p.y + Math.sin(ang) * sp.length;
      this.fx.push({ type: 'beam', x1: p.x, y1: p.y, x2, y2, life: 0.35, w: sp.width, color: sp.color });
      for (const e of this.enemies) {
        if (distToSeg(e.x, e.y, p.x, p.y, x2, y2) < e.r + sp.width / 2) this.damage(e, dmg);
      }
    }
  },

  drink(id) {
    if (this.potionCd > 0) return;
    if (!has(id)) { this.say(`${ITEMS[id].name}を持っていない（工房で作ろう）`); return; }
    addItem(id, -1);
    this.potionCd = 1;
    const p = this.p;
    if (id === 'potion') {
      const v = this.st.maxHp * 0.5; p.hp = Math.min(this.st.maxHp, p.hp + v);
      this.text(p.x, p.y - 20, `+${Math.round(v)} HP`, '#ff8a8a');
    } else {
      const v = this.st.maxMp * 0.6; p.mp = Math.min(this.st.maxMp, p.mp + v);
      this.text(p.x, p.y - 20, `+${Math.round(v)} MP`, '#8aa8ff');
    }
  },

  // ---------------- 採取 / 帰還 ----------------
  nearestNode() {
    let best = null, bd = 46;
    for (const n of this.nodes) {
      if (n.gone) continue;
      const d = Math.hypot(n.x - this.p.x, n.y - this.p.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  },
  interact() {
    if (Math.hypot(this.portal.x - this.p.x, this.portal.y - this.p.y) < 40) { this.end('return'); return; }
    const n = this.nearestNode();
    if (n) this.gather = { n, t: 0 };
  },
  startRecall() {
    if (!this.recall) { this.recall = { t: 0, need: 3 }; this.say('帰還の詠唱を始めた…（被弾・移動・詠唱で中断）'); }
  },

  // ---------------- ダメージ処理 ----------------
  damage(e, dmg) {
    if (e.hp <= 0) return;
    const v = Math.round(dmg * (0.9 + Math.random() * 0.2));
    e.hp -= v;
    e.flash = 0.1;
    if (e.d.boss) e.awake = true;
    this.text(e.x, e.y - e.r - 6, v, '#fff');
    if (e.hp <= 0) this.kill(e);
  },
  kill(e) {
    this.burst(e.x, e.y, e.d.color, 14, 160);
    gainMXP(e.d.xp);
    S.stats.kills++;
    for (const [item, chance, mn, mx] of e.d.drops) {
      if (Math.random() < Math.min(1, chance * this.st.luck)) {
        const n = mn + Math.floor(Math.random() * (mx - mn + 1));
        this.addBag(item, n, e.x, e.y);
      }
    }
    if (e.d.boss) {
      S.flags.bossDefeated = true;
      log('冥府の番人を討ち果たした！', 'lv');
      this.say('番人は崩れ落ち、紅い心核が残された…');
    }
  },
  hurtPlayer(dmg) {
    const p = this.p;
    if (p.inv > 0) return;
    p.hp -= dmg;
    p.inv = 0.5;
    this.gather = null;
    if (this.recall) { this.recall = null; this.say('詠唱が中断された！'); }
    this.text(p.x, p.y - 18, `-${Math.round(dmg)}`, '#ff5a5a');
    this.shake = 0.15;
    if (p.hp <= 0) this.end('death');
  },
  addBag(item, n, x, y) {
    this.bag[item] = (this.bag[item] || 0) + n;
    this.text(x, y - 10, `${ITEMS[item].name} +${n}`, ITEMS[item].color);
  },

  // ---------------- 更新(毎フレーム) ----------------
  update(dt) {
    if (!this.active || this.paused) return;
    this.time += dt;
    const p = this.p, st = this.st;
    // 移動
    let mx = 0, my = 0;
    if (this.keys.w || this.keys.arrowup) my -= 1;
    if (this.keys.s || this.keys.arrowdown) my += 1;
    if (this.keys.a || this.keys.arrowleft) mx -= 1;
    if (this.keys.d || this.keys.arrowright) mx += 1;
    if (mx || my) {
      const l = Math.hypot(mx, my);
      this.move(p, mx / l * st.speed * dt, my / l * st.speed * dt);
      p.walk += dt;
      if (this.recall) { this.recall = null; this.say('詠唱が中断された'); }
    }
    const wm = this.worldMouse();
    p.face = Math.atan2(wm.y - p.y, wm.x - p.x);
    if (this.mouse.down) this.cast(this.selSlot);
    // 自然回復
    p.mp = Math.min(st.maxMp, p.mp + st.mpRegen * dt);
    p.inv = Math.max(0, p.inv - dt);
    this.potionCd = Math.max(0, this.potionCd - dt);
    for (const k in this.cds) this.cds[k] = Math.max(0, this.cds[k] - dt);
    this.shake = Math.max(0, (this.shake || 0) - dt);

    // 採取
    if (this.gather) {
      const n = this.gather.n;
      if (n.gone || Math.hypot(n.x - p.x, n.y - p.y) > 52) this.gather = null;
      else {
        this.gather.t += dt;
        if (this.gather.t >= st.gatherTime) {
          const base = n.min + Math.random() * (n.max - n.min + 1);
          const amt = Math.max(1, Math.floor(base * st.yieldMult));
          this.addBag(n.item, amt, n.x, n.y);
          n.gone = true; n.back = this.time + 70;
          this.burst(n.x, n.y, ITEMS[n.item].color, 8, 80);
          this.gather = null;
        }
      }
    }
    for (const n of this.nodes) if (n.gone && this.time > n.back) n.gone = false;

    // 帰還詠唱
    if (this.recall) {
      this.recall.t += dt;
      if (this.recall.t >= this.recall.need) { this.end('return'); return; }
    }

    // 敵の出現
    this.spawnT -= dt;
    const normal = this.enemies.filter(e => !e.d.boss).length;
    if (this.spawnT <= 0 && normal < this.f.maxEnemies) { this.spawnEnemy(false); this.spawnT = 2.2; }

    // 敵AI
    for (const e of this.enemies) this.updateEnemy(e, dt);
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (!this.active) return;

    // プレイヤーの弾
    for (const b of this.projs) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (this.solid(b.x, b.y)) { this.explode(b); b.life = 0; continue; }
      for (const e of this.enemies) {
        if (e.hp <= 0 || b.hit.has(e)) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
          b.hit.add(e);
          this.damage(e, b.dmg);
          if (b.sp.slow) e.slow = b.sp.slow;
          if (!b.sp.pierce) { this.explode(b); b.life = 0; break; }
        }
      }
    }
    this.projs = this.projs.filter(b => b.life > 0);
    // 敵の弾
    for (const b of this.eprojs) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (this.solid(b.x, b.y)) b.life = 0;
      else if (Math.hypot(p.x - b.x, p.y - b.y) < p.r + b.r) { this.hurtPlayer(b.dmg); b.life = 0; if (!this.active) return; }
    }
    this.eprojs = this.eprojs.filter(b => b.life > 0);

    // 演出
    for (const f of this.fx) { f.life -= dt; if (f.type === 'ring') f.r += (f.maxR / 0.3) * dt; }
    this.fx = this.fx.filter(f => f.life > 0);
    for (const t of this.texts) { t.y -= 30 * dt; t.life -= dt; }
    this.texts = this.texts.filter(t => t.life > 0);
    for (const q of this.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92; q.life -= dt; }
    this.parts = this.parts.filter(q => q.life > 0);
    if (this.msg) { this.msg.life -= dt; if (this.msg.life <= 0) this.msg = null; }
  },

  explode(b) {
    if (!b.sp.explode) return;
    this.fx.push({ type: 'ring', x: b.x, y: b.y, r: 8, maxR: b.sp.explode, life: 0.3, color: b.sp.color });
    this.burst(b.x, b.y, b.sp.color, 16, 200);
    for (const e of this.enemies) {
      if (!b.hit.has(e) && Math.hypot(e.x - b.x, e.y - b.y) < b.sp.explode + e.r) this.damage(e, b.dmg * 0.7);
    }
  },

  updateEnemy(e, dt) {
    const p = this.p, d = e.d;
    e.t += dt; e.hitCd = Math.max(0, e.hitCd - dt); e.flash = Math.max(0, e.flash - dt);
    e.slow = Math.max(0, e.slow - dt);
    // ノックバック
    if (e.kx || e.ky) {
      this.move(e, e.kx * dt, e.ky * dt);
      e.kx *= 0.85; e.ky *= 0.85;
      if (Math.abs(e.kx) + Math.abs(e.ky) < 5) e.kx = e.ky = 0;
    }
    const spd = d.spd * (e.slow > 0 ? 0.5 : 1);
    const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const aggro = dist < 380;
    const step = (a, s) => this.move(e, Math.cos(a) * s * dt, Math.sin(a) * s * dt);
    const shoot = (a, speed = 230, r = 6) => this.eprojs.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, dmg: d.dmg, life: 3, color: d.color });

    if (d.ai === 'boss') {
      if (!e.awake && dist < 420) { e.awake = true; this.say('──冥府の番人が目を覚ました'); }
      if (!e.awake) return;
      const rage = e.hp < e.maxHp / 2;
      step(ang, spd * (rage ? 1.35 : 1));
      e.shotT -= dt;
      if (e.shotT <= 0) {
        const n = rage ? 16 : 12;
        const off = e.t;
        if (Math.floor(e.t) % 2 === 0) for (let i = 0; i < n; i++) shoot(off + i * Math.PI * 2 / n, 180, 8);
        else for (let i = -2; i <= 2; i++) shoot(ang + i * 0.18, 280, 7);
        e.shotT = rage ? 1.6 : 2.4;
      }
    } else if (!aggro) {
      if (e.t > 2) { e.t = 0; e.wander = Math.random() * Math.PI * 2; }
      step(e.wander, spd * 0.35);
    } else if (d.ai === 'chase') {
      step(ang, spd);
    } else if (d.ai === 'ranged') {
      if (dist > 240) step(ang, spd);
      else if (dist < 160) step(ang + Math.PI, spd);
      else step(ang + Math.PI / 2, spd * 0.5);
      e.shotT -= dt;
      if (e.shotT <= 0) { shoot(ang); e.shotT = 2.2; }
    } else if (d.ai === 'charge') {
      e.stateT -= dt;
      if (e.state === 'move') {
        step(ang, spd);
        if (dist < 200 && e.stateT <= 0) { e.state = 'wind'; e.stateT = 0.5; e.chargeA = ang; }
      } else if (e.state === 'wind') {
        if (e.stateT <= 0) { e.state = 'dash'; e.stateT = 0.45; }
      } else if (e.state === 'dash') {
        step(e.chargeA, spd * 3.4);
        if (e.stateT <= 0) { e.state = 'move'; e.stateT = 1.8; }
      }
    }
    // 接触ダメージ
    if (dist < e.r + p.r && e.hitCd <= 0) {
      e.hitCd = 0.8;
      this.hurtPlayer(d.dmg);
    }
  },

  onLevelUp() {
    // レベルが上がったら最大値を更新して全回復
    this.st = playerStats();
    this.p.hp = this.st.maxHp; this.p.mp = this.st.maxMp;
    this.text(this.p.x, this.p.y - 34, 'M.Lv UP!', '#ffe066', 1.6);
  },

  // ---------------- 演出ヘルパー ----------------
  text(x, y, s, color, life = 0.9) { this.texts.push({ x, y, s: String(s), color, life, max: life }); },
  burst(x, y, color, n, spd) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = Math.random() * spd;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + Math.random() * 0.4, color });
    }
  },
  say(s) { this.msg = { s, life: 3 }; },

  // ---------------- 描画 ----------------
  resize() {
    const cv = document.getElementById('cv');
    const dpr = window.devicePixelRatio || 1;
    this.vw = window.innerWidth; this.vh = window.innerHeight;
    cv.width = this.vw * dpr; cv.height = this.vh * dpr;
    cv.style.width = this.vw + 'px'; cv.style.height = this.vh + 'px';
    this.ctx = cv.getContext('2d');
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  draw() {
    if (!this.active) return;
    const ctx = this.ctx, f = this.f, p = this.p;
    const vw = this.vw, vh = this.vh;
    this.cam.x = Math.max(0, Math.min(MAP_W * TS - vw, p.x - vw / 2));
    this.cam.y = Math.max(0, Math.min(MAP_H * TS - vh, p.y - vh / 2));
    if (MAP_W * TS < vw) this.cam.x = (MAP_W * TS - vw) / 2;
    if (MAP_H * TS < vh) this.cam.y = (MAP_H * TS - vh) / 2;
    let sx = 0, sy = 0;
    if (this.shake > 0) { sx = (Math.random() - 0.5) * 8; sy = (Math.random() - 0.5) * 8; }
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, vw, vh);
    ctx.translate(-Math.round(this.cam.x) + sx, -Math.round(this.cam.y) + sy);

    // 地形
    const x0 = Math.max(0, Math.floor(this.cam.x / TS)), y0 = Math.max(0, Math.floor(this.cam.y / TS));
    const x1 = Math.min(MAP_W, Math.ceil((this.cam.x + vw) / TS) + 1), y1 = Math.min(MAP_H, Math.ceil((this.cam.y + vh) / TS) + 1);
    // 1周目: 床、2周目: 壁(木や岩を丸い塊として重ねて描く)
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const h = (x * 73856093 ^ y * 19349663) & 7;
      ctx.fillStyle = this.map[y * MAP_W + x] ? f.wall : (h < 3 ? f.floor2 : f.floor);
      ctx.fillRect(x * TS, y * TS, TS, TS);
      if (!this.map[y * MAP_W + x] && h === 5) { ctx.fillStyle = f.floor2; ctx.fillRect(x * TS + 10, y * TS + 14, 4, 4); }
    }
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (!this.map[y * MAP_W + x]) continue;
      const h = (x * 73856093 ^ y * 19349663) & 7;
      const cx = x * TS + TS / 2 + (h & 3) - 1.5, cy = y * TS + TS / 2 + ((h >> 1) & 3) - 1.5;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.arc(cx + 2, cy + 4, TS * 0.56, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = f.wallTop;
      ctx.beginPath(); ctx.arc(cx, cy, TS * 0.56, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.arc(cx - 4, cy - 5, TS * 0.28, 0, Math.PI * 2); ctx.fill();
    }
    // 帰還ゲート
    const pt = this.portal;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 3);
    ctx.strokeStyle = `rgba(160,220,255,${0.5 + pulse * 0.5})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(pt.x, pt.y, 22, 12, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(120,200,255,0.18)'; ctx.fill();

    // 採取ポイント
    const near = this.nearestNode();
    for (const n of this.nodes) {
      if (n.gone || !this.onScreen(n.x, n.y, 30)) continue;
      const it = ITEMS[n.item];
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(n.x, n.y + 10, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = it.color;
      ctx.beginPath(); ctx.moveTo(n.x, n.y - 14); ctx.lineTo(n.x + 12, n.y); ctx.lineTo(n.x, n.y + 10); ctx.lineTo(n.x - 12, n.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#111'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(it.ch, n.x, n.y - 1);
      if (n === near) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    // 敵
    for (const e of this.enemies) {
      if (!this.onScreen(e.x, e.y, 60)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.8, e.r, e.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      const bob = Math.sin(e.t * 6) * 1.5;
      ctx.fillStyle = e.flash > 0 ? '#fff' : (e.state === 'wind' ? '#ff5050' : e.d.color);
      ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = e.slow > 0 ? '#9fe3ff' : 'rgba(0,0,0,0.55)'; ctx.lineWidth = 2; ctx.stroke();
      // 目
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      ctx.fillStyle = e.d.boss ? '#fff' : '#1a1a1a';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(e.x + Math.cos(a + s * 0.5) * e.r * 0.5, e.y + bob + Math.sin(a + s * 0.5) * e.r * 0.5, Math.max(2, e.r * 0.15), 0, Math.PI * 2);
        ctx.fill();
      }
      if (e.hp < e.maxHp && !e.d.boss) {
        ctx.fillStyle = '#300'; ctx.fillRect(e.x - 14, e.y - e.r - 9, 28, 4);
        ctx.fillStyle = '#f55'; ctx.fillRect(e.x - 14, e.y - e.r - 9, 28 * e.hp / e.maxHp, 4);
      }
    }

    // プレイヤー
    if (!(p.inv > 0 && Math.floor(this.time * 20) % 2)) {
      // 足元の魔力光(暗いフィールドでも自分の位置が分かるように)
      const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 34);
      glow.addColorStop(0, 'rgba(185,164,255,0.35)'); glow.addColorStop(1, 'rgba(185,164,255,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a3a78'; ctx.strokeStyle = '#d9ccff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p.x - 11, p.y + 10); ctx.lineTo(p.x + 11, p.y + 10); ctx.lineTo(p.x + 7, p.y - 6); ctx.lineTo(p.x - 7, p.y - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f1d7b8';
      ctx.beginPath(); ctx.arc(p.x, p.y - 9, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2d62';
      ctx.beginPath(); ctx.moveTo(p.x - 9, p.y - 9); ctx.lineTo(p.x + 9, p.y - 9); ctx.lineTo(p.x, p.y - 26); ctx.closePath(); ctx.fill(); ctx.stroke();
      // 杖
      ctx.strokeStyle = '#c9a36b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.face) * 18, p.y + Math.sin(p.face) * 18); ctx.stroke();
      ctx.fillStyle = '#b9a4ff';
      ctx.beginPath(); ctx.arc(p.x + Math.cos(p.face) * 19, p.y + Math.sin(p.face) * 19, 3, 0, Math.PI * 2); ctx.fill();
    }

    // 弾
    for (const b of this.projs) {
      ctx.fillStyle = b.sp.color; ctx.shadowColor = b.sp.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    }
    for (const b of this.eprojs) {
      ctx.fillStyle = b.color; ctx.shadowColor = '#f00'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
    // 魔法エフェクト
    for (const fx of this.fx) {
      ctx.globalAlpha = Math.min(1, fx.life * 5);
      if (fx.type === 'ring') {
        ctx.strokeStyle = fx.color; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r, 0, Math.PI * 2); ctx.stroke();
      } else if (fx.type === 'bolt') {
        ctx.strokeStyle = fx.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1);
        for (let i = 1; i < 6; i++) {
          const t = i / 6;
          ctx.lineTo(fx.x1 + (fx.x2 - fx.x1) * t + (Math.random() - 0.5) * 16, fx.y1 + (fx.y2 - fx.y1) * t + (Math.random() - 0.5) * 16);
        }
        ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
      } else if (fx.type === 'beam') {
        ctx.strokeStyle = fx.color; ctx.lineWidth = fx.w * (fx.life / 0.35); ctx.lineCap = 'round';
        ctx.shadowColor = fx.color; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(fx.x1, fx.y1); ctx.lineTo(fx.x2, fx.y2); ctx.stroke();
        ctx.shadowBlur = 0; ctx.lineCap = 'butt';
      }
    }
    ctx.globalAlpha = 1;
    for (const q of this.parts) {
      ctx.globalAlpha = Math.min(1, q.life * 3); ctx.fillStyle = q.color;
      ctx.fillRect(q.x - 2, q.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    // 採取・詠唱ゲージ
    if (this.gather) this.bar(p.x - 20, p.y - 40, 40, 5, this.gather.t / this.st.gatherTime, '#8fff8f');
    if (this.recall) this.bar(p.x - 24, p.y - 40, 48, 5, this.recall.t / this.recall.need, '#8fd3ff');
    // 浮かぶ文字
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life / t.max * 2);
      ctx.font = 'bold 14px sans-serif';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(t.s, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.s, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // 霧・色調(画面全体)
    if (f.fog) {
      const g = ctx.createRadialGradient(p.x - this.cam.x, p.y - this.cam.y, 120, p.x - this.cam.x, p.y - this.cam.y, 380);
      g.addColorStop(0, f.fog + '0)'); g.addColorStop(1, f.fog + '0.9)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
    }
    if (f.tint) { ctx.fillStyle = f.tint; ctx.fillRect(0, 0, vw, vh); }
    this.drawHud();
  },

  onScreen(x, y, m) {
    return x > this.cam.x - m && x < this.cam.x + this.vw + m && y > this.cam.y - m && y < this.cam.y + this.vh + m;
  },
  bar(x, y, w, h, v, color) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, v)), h);
  },

  drawHud() {
    const ctx = this.ctx, p = this.p, st = this.st, vw = this.vw, vh = this.vh;
    ctx.textBaseline = 'middle';
    // HP / MP
    ctx.fillStyle = 'rgba(10,8,20,0.7)'; ctx.fillRect(12, 12, 250, 70);
    this.bar(20, 22, 234, 14, p.hp / st.maxHp, '#e0455a');
    this.bar(20, 44, 234, 10, p.mp / st.maxMp, '#6b7cff');
    ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(`HP ${Math.ceil(p.hp)} / ${st.maxHp}`, 24, 29);
    ctx.fillText(`MP ${Math.floor(p.mp)} / ${st.maxMp}`, 24, 49);
    const need = xpNeed(S.mlv);
    this.bar(20, 64, 234, 4, S.mlv >= MAX_LV ? 1 : S.mxp / need, '#ffe066');
    ctx.fillStyle = '#ffe066'; ctx.font = '10px sans-serif';
    ctx.fillText(`M.Lv ${S.mlv}`, 20, 75);

    // 魔法スロット
    const sw = 52, gap = 6, total = 6 * sw + 5 * gap;
    const bx = (vw - total) / 2, by = vh - sw - 16;
    for (let i = 0; i < 6; i++) {
      const x = bx + i * (sw + gap), id = S.slots[i], sp = id && SPELLS[id];
      ctx.fillStyle = 'rgba(10,8,20,0.75)'; ctx.fillRect(x, by, sw, sw);
      ctx.strokeStyle = i === this.selSlot ? '#ffe066' : '#555'; ctx.lineWidth = 2; ctx.strokeRect(x, by, sw, sw);
      if (sp) {
        ctx.fillStyle = p.mp < sp.mp ? '#555' : sp.color;
        ctx.font = 'bold 22px serif'; ctx.textAlign = 'center';
        ctx.fillText(sp.ch, x + sw / 2, by + sw / 2 + 1);
        const cd = this.cds[id] || 0;
        if (cd > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          const h = sw * cd / (sp.cd * st.cdMult);
          ctx.fillRect(x, by + sw - h, sw, h);
        }
        ctx.font = '9px sans-serif'; ctx.fillStyle = '#9ab';
        ctx.textAlign = 'right'; ctx.fillText(sp.mp, x + sw - 4, by + sw - 7);
      }
      ctx.font = 'bold 10px sans-serif'; ctx.fillStyle = '#ddd'; ctx.textAlign = 'left';
      ctx.fillText(i + 1, x + 4, by + 9);
    }
    // 薬
    ctx.textAlign = 'left'; ctx.font = '12px sans-serif';
    ctx.fillStyle = 'rgba(10,8,20,0.7)'; ctx.fillRect(12, vh - 62, 150, 46);
    ctx.fillStyle = '#ff8a8a'; ctx.fillText(`[Q] 回復薬 ×${count('potion')}`, 20, vh - 48);
    ctx.fillStyle = '#8aa8ff'; ctx.fillText(`[R] 魔力薬 ×${count('mana_potion')}`, 20, vh - 28);

    // 右上: フィールド名とミニマップ
    const ms = 2.4, mw = MAP_W * ms, mx = vw - mw - 14, my = 34;
    ctx.fillStyle = 'rgba(10,8,20,0.75)'; ctx.fillRect(mx - 6, 8, mw + 12, mw + 34);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px serif'; ctx.textAlign = 'center';
    ctx.fillText(this.f.name, mx + mw / 2, 21);
    ctx.fillStyle = this.f.wallTop;
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (this.map[y * MAP_W + x]) ctx.fillRect(mx + x * ms, my + y * ms, ms, ms);
    }
    ctx.fillStyle = '#8fd3ff'; ctx.fillRect(mx + this.portal.x / TS * ms - 2, my + this.portal.y / TS * ms - 2, 4, 4);
    for (const n of this.nodes) if (!n.gone) { ctx.fillStyle = ITEMS[n.item].color; ctx.fillRect(mx + n.x / TS * ms - 1, my + n.y / TS * ms - 1, 2, 2); }
    for (const e of this.enemies) {
      ctx.fillStyle = e.d.boss ? '#ff3355' : '#f66';
      const s = e.d.boss ? 5 : 2;
      ctx.fillRect(mx + e.x / TS * ms - s / 2, my + e.y / TS * ms - s / 2, s, s);
    }
    ctx.fillStyle = '#fff'; ctx.fillRect(mx + p.x / TS * ms - 2, my + p.y / TS * ms - 2, 4, 4);

    // 右: 採取した素材
    const bag = Object.entries(this.bag);
    const by2 = my + mw + 12;
    ctx.fillStyle = 'rgba(10,8,20,0.7)'; ctx.fillRect(mx - 6, by2, mw + 12, 22 + Math.max(1, bag.length) * 18);
    ctx.textAlign = 'left'; ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#ddd';
    ctx.fillText('採取袋', mx, by2 + 11);
    ctx.font = '12px sans-serif';
    if (!bag.length) { ctx.fillStyle = '#777'; ctx.fillText('（空）', mx, by2 + 29); }
    bag.forEach(([k, v], i) => {
      ctx.fillStyle = ITEMS[k].color; ctx.fillText(`${ITEMS[k].name}`, mx, by2 + 29 + i * 18);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(`×${v}`, mx + mw, by2 + 29 + i * 18); ctx.textAlign = 'left';
    });

    // ボスHP
    if (this.boss && this.boss.hp > 0 && this.boss.awake) {
      const w = Math.min(500, vw - 80), x = (vw - w) / 2;
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 14px serif';
      ctx.fillText('冥府の番人', vw / 2, 100);
      this.bar(x, 112, w, 10, this.boss.hp / this.boss.maxHp, '#ff3355');
    }

    // ヒント
    let hint = null;
    if (Math.hypot(this.portal.x - p.x, this.portal.y - p.y) < 40) hint = '[E] 工房へ帰還する';
    else { const n = this.nearestNode(); if (n) hint = `[E] ${ITEMS[n.item].name}を採取`; }
    if (hint) {
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(vw / 2 - 110, vh - sw - 56, 220, 26);
      ctx.fillStyle = '#fff'; ctx.fillText(hint, vw / 2, vh - sw - 43);
    }
    if (this.msg) {
      ctx.font = 'bold 15px serif'; ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, this.msg.life);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.strokeText(this.msg.s, vw / 2, 140);
      ctx.fillStyle = '#ffe9b0'; ctx.fillText(this.msg.s, vw / 2, 140);
      ctx.globalAlpha = 1;
    }
    ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('WASD:移動  マウス:照準  1-6/クリック:魔法  E:採取  H:帰還詠唱  Q/R:薬  Esc:一時停止', 14, 98);

    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, vw, vh);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 28px serif';
      ctx.fillText('一時停止中', vw / 2, vh / 2 - 20);
      ctx.font = '14px sans-serif';
      ctx.fillText('Esc で再開（工房の設備は動き続けています）', vw / 2, vh / 2 + 16);
    }
  },
};

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

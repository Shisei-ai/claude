// =============================================================
//  audio.js … 音（効果音とBGM）。音源ファイルは使わず、すべてその場で合成する
//
//  ・音の通り道：効果音／BGM → 全体の音量 → コンプレッサー（音割れ防止）→ スピーカー
//                 さらに一部をリバーブ（残響）へ送り、空間の広がりを出す
//  ・効果音：sfx('hit') のように名前で鳴らす（SFX の一覧）
//  ・BGM：場面（タイトル・生い立ち・昼・夜・戦闘・決戦・結末など）に合わせて、
//         コード進行・ベース・旋律・打楽器を自動で生成し続ける（MOODS の一覧）。場面が変わると2秒かけて切り替わる
//  ・設定：効果音 ON/OFF・BGM ON/OFF・音量（小・中・大）。どちらも初期設定は OFF（ブラウザは操作の後でないと音を出せない）
// =============================================================

const VOL_LEVELS = [0.4, 0.7, 1.0];   // 音量：小・中・大
let SND = null;                        // 画面で使う音の通り道（初めて音を出すときに作る）

// ---------------- 音の通り道 ----------------
function makeGraph(ctx) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
  const master = ctx.createGain(); master.gain.value = 0.85;
  master.connect(comp); comp.connect(ctx.destination);
  const rev = ctx.createConvolver(); rev.buffer = impulse(ctx, 2.6, 2.4);
  const revOut = ctx.createGain(); revOut.gain.value = 0.32; rev.connect(revOut); revOut.connect(master);
  const sfx = ctx.createGain(); sfx.connect(master);
  const bgm = ctx.createGain(); bgm.connect(master);
  return { ctx, master, rev, sfx, bgm };
}
// 残響の響き（減衰するノイズ）
function impulse(ctx, dur, decay) {
  const len = Math.floor(ctx.sampleRate * dur); const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return buf;
}
function audioReady() {
  if (!SND) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { SND = makeGraph(new C()); } catch (e) { return null; }
    document.addEventListener('visibilitychange', () => { if (!SND) return; if (document.hidden) SND.ctx.suspend(); else if (CFG.sound || CFG.bgm) SND.ctx.resume(); });
  }
  if (SND.ctx.state === 'suspended' && !document.hidden) SND.ctx.resume();
  applyVolume();
  return SND;
}
function applyVolume() {
  if (!SND) return; const v = VOL_LEVELS[CFG.vol] ?? VOL_LEVELS[1]; const t = SND.ctx.currentTime;
  SND.sfx.gain.setTargetAtTime(CFG.sound ? v : 0, t, 0.05);
  SND.bgm.gain.setTargetAtTime(CFG.bgm ? v * 0.75 : 0, t, 0.3);
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// ---------------- 楽器 ----------------
// 音を1つ鳴らす（o：f 周波数, t 開始, dur 長さ, type 波形, vol, a 立ち上がり, r 余韻, det 揺らぎ, cut フィルター, endF 音程の変化, send 残響, pan 左右）
function voice(g, dest, o) {
  const ctx = g.ctx; const t = o.t; const dur = o.dur || 0.3; const r = o.r ?? 0.15; const a = o.a ?? 0.008; const vol = o.vol ?? 0.1;
  const out = ctx.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vol, t + a);
  if (o.decay) out.gain.setTargetAtTime(vol * (o.sus ?? 0.3), t + a, o.decay);
  out.gain.setTargetAtTime(0, t + dur, r / 3);
  let node = out;
  if (o.cut) { const f = ctx.createBiquadFilter(); f.type = o.ftype || 'lowpass'; f.frequency.setValueAtTime(o.cut, t); if (o.cutEnd) f.frequency.exponentialRampToValueAtTime(o.cutEnd, t + dur); f.Q.value = o.q || 0.7; out.connect(f); node = f; }
  if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; node.connect(p); node = p; }
  node.connect(dest); if (o.send) { const s = ctx.createGain(); s.gain.value = o.send; node.connect(s); s.connect(g.rev); }
  const dets = o.det ? [-o.det, o.det] : [0];
  for (const dt of dets) {
    const osc = ctx.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t); osc.detune.value = dt;
    if (o.endF) osc.frequency.exponentialRampToValueAtTime(o.endF, t + (o.glide || dur));
    const og = ctx.createGain(); og.gain.value = 1 / dets.length; osc.connect(og); og.connect(out);
    if (o.vib) {   // ビブラート（少し遅れてかかる）
      const l = ctx.createOscillator(); l.frequency.value = o.vibRate || 5.4; const lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.f * o.vib, t + Math.min(0.5, dur * 0.6)); l.connect(lg); lg.connect(osc.frequency);
      l.start(t); l.stop(t + dur + r + 0.1);
    }
    osc.start(t); osc.stop(t + dur + r + 0.1);
  }
}
let NOISE_BUF = null;
function noiseBuf(ctx) { if (NOISE_BUF && NOISE_BUF.sampleRate === ctx.sampleRate) return NOISE_BUF; const len = ctx.sampleRate; const b = ctx.createBuffer(1, len, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return (NOISE_BUF = b); }
// ノイズ（打撃・風・シンバルなど）
function noiseHit(g, dest, o) {
  const ctx = g.ctx; const t = o.t; const dur = o.dur || 0.2;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx); s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = o.ftype || 'lowpass'; f.frequency.setValueAtTime(o.f || 1000, t); if (o.endF) f.frequency.exponentialRampToValueAtTime(o.endF, t + dur); f.Q.value = o.q || 0.8;
  const out = ctx.createGain(); out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(o.vol ?? 0.1, t + (o.a ?? 0.004)); out.gain.setTargetAtTime(0, t + (o.a ?? 0.004), dur / 4);
  s.connect(f); f.connect(out);
  let node = out; if (o.pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; out.connect(p); node = p; }
  node.connect(dest); if (o.send) { const sg = ctx.createGain(); sg.gain.value = o.send; node.connect(sg); sg.connect(g.rev); }
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.3);
}
// 鐘（倍音がずれた澄んだ音）
function bell(g, dest, f, t, dur = 1.6, vol = 0.06, send = 0.4, pan = 0) {
  [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]].forEach(([m, v]) => voice(g, dest, { f: f * m, t, dur: 0.01, a: 0.003, r: dur * (1.2 - m / 12), vol: vol * v, send, pan }));
}
// 太鼓・バスドラム
function drum(g, dest, t, vol = 0.3, hi = 140, lo = 48, dur = 0.35) {
  voice(g, dest, { f: hi, endF: lo, glide: dur * 0.6, t, dur: 0.02, r: dur, vol, type: 'sine' });
  noiseHit(g, dest, { t, dur: 0.05, vol: vol * 0.25, f: 900 });
}
function snare(g, dest, t, vol = 0.12) { noiseHit(g, dest, { t, dur: 0.16, vol, f: 1800, ftype: 'bandpass', q: 0.6, send: 0.15 }); voice(g, dest, { f: 210, endF: 160, t, dur: 0.02, r: 0.1, vol: vol * 0.6, type: 'triangle' }); }
function hat(g, dest, t, vol = 0.03, pan = 0.2) { noiseHit(g, dest, { t, dur: 0.04, vol: vol * 1.3, f: 8500, ftype: 'bandpass', q: 0.9, pan }); }   // ハイハット（高域だけを通したノイズ）
function suzu(g, dest, t, vol = 0.02) { [98, 101, 103].forEach((m, i) => bell(g, dest, mtof(m), t + i * 0.025, 0.9, vol, 0.6, (i - 1) * 0.4)); }   // 神楽鈴
function taiko(g, dest, t, vol = 0.25) { drum(g, dest, t, vol, 95, 36, 0.6); noiseHit(g, dest, { t, dur: 0.12, vol: vol * 0.3, f: 300, send: 0.2 }); }   // 和太鼓

// ---------------- 効果音 ----------------
const SFX = {
  tick: (g, d, t) => { voice(g, d, { f: 1650, t, dur: 0.012, r: 0.05, vol: 0.035, type: 'sine' }); noiseHit(g, d, { t, dur: 0.02, vol: 0.012, f: 5000, ftype: 'highpass' }); },
  page: (g, d, t) => { noiseHit(g, d, { t, dur: 0.22, vol: 0.035, f: 3200, endF: 900, ftype: 'bandpass', q: 0.8, a: 0.04 }); voice(g, d, { f: 660, endF: 990, t: t + 0.03, dur: 0.12, r: 0.2, vol: 0.02, send: 0.3 }); },
  hit: (g, d, t) => { drum(g, d, t, 0.32, 150, 50, 0.3); noiseHit(g, d, { t, dur: 0.22, vol: 0.2, f: 2400, endF: 400 }); },
  crit: (g, d, t) => { drum(g, d, t, 0.4, 180, 40, 0.5); noiseHit(g, d, { t, dur: 0.35, vol: 0.24, f: 5000, endF: 600, send: 0.3 }); bell(g, d, 1180, t + 0.02, 0.6, 0.05, 0.4); },
  guard: (g, d, t) => { bell(g, d, 523, t, 0.7, 0.07, 0.35, -0.2); bell(g, d, 784, t + 0.01, 0.5, 0.05, 0.35, 0.2); noiseHit(g, d, { t, dur: 0.08, vol: 0.08, f: 3500, ftype: 'bandpass' }); },
  evade: (g, d, t) => { noiseHit(g, d, { t, dur: 0.4, vol: 0.09, f: 500, endF: 4000, ftype: 'bandpass', q: 1.4, a: 0.12, pan: -0.4 }); },
  skill: (g, d, t) => { [76, 79, 83, 88].forEach((m, i) => bell(g, d, mtof(m), t + i * 0.06, 0.9, 0.035, 0.6, (i - 1.5) * 0.3)); },
  heal: (g, d, t) => { [72, 76, 79, 84].forEach((m, i) => voice(g, d, { f: mtof(m), t: t + i * 0.07, dur: 0.25, r: 0.6, vol: 0.03, type: 'triangle', send: 0.5 })); },
  np: (g, d, t) => {
    voice(g, d, { f: 110, endF: 880, glide: 0.85, t, dur: 0.85, r: 0.05, vol: 0.05, type: 'sawtooth', det: 12, cut: 400, cutEnd: 5000 });
    noiseHit(g, d, { t, dur: 0.85, vol: 0.06, f: 300, endF: 6000, ftype: 'bandpass', a: 0.7 });
    const h = t + 0.88; drum(g, d, h, 0.5, 120, 32, 1.0);
    noiseHit(g, d, { t: h, dur: 1.2, vol: 0.22, f: 6000, endF: 300, send: 0.5 });
    [50, 57, 62, 69].forEach(m => voice(g, d, { f: mtof(m), t: h, dur: 0.6, r: 1.4, vol: 0.035, type: 'sawtooth', det: 8, cut: 2400, cutEnd: 600, send: 0.5 }));
    [86, 90, 93].forEach((m, i) => bell(g, d, mtof(m), h + 0.1 + i * 0.08, 1.4, 0.03, 0.7));
  },
  seal: (g, d, t) => { [62, 69, 74, 78].forEach((m, i) => bell(g, d, mtof(m), t + i * 0.09, 2.6, 0.045, 0.7, (i - 1.5) * 0.25)); voice(g, d, { f: mtof(38), t, dur: 1.2, a: 0.3, r: 1.2, vol: 0.06, type: 'sine', send: 0.3 }); },
  summon: (g, d, t) => {
    [50, 57, 62, 64, 69, 74, 76, 81].forEach((m, i) => bell(g, d, mtof(m), t + i * 0.16, 2.2, 0.035, 0.7, (i % 2 ? 0.3 : -0.3)));
    [50, 57, 62, 65].forEach(m => voice(g, d, { f: mtof(m), t: t + 0.3, dur: 1.8, a: 1.0, r: 1.8, vol: 0.03, type: 'sawtooth', det: 10, cut: 1400, send: 0.6 }));
    noiseHit(g, d, { t: t + 1.1, dur: 1.4, vol: 0.06, f: 6000, endF: 2000, ftype: 'highpass', a: 0.6, send: 0.6 });
    drum(g, d, t + 1.35, 0.35, 90, 35, 1.2);
  },
  win: (g, d, t) => {
    [[60, 0], [64, 0.12], [67, 0.24]].forEach(([m, dt]) => voice(g, d, { f: mtof(m), t: t + dt, dur: 0.1, r: 0.15, vol: 0.05, type: 'sawtooth', det: 6, cut: 2600, send: 0.3 }));
    [60, 64, 67, 72].forEach(m => voice(g, d, { f: mtof(m), t: t + 0.38, dur: 0.7, r: 0.9, vol: 0.04, type: 'sawtooth', det: 7, cut: 3000, cutEnd: 1500, send: 0.45 }));
    bell(g, d, mtof(84), t + 0.38, 1.6, 0.04, 0.6); drum(g, d, t + 0.38, 0.3, 120, 45, 0.5);
  },
  lose: (g, d, t) => { [69, 65, 62, 57].forEach((m, i) => voice(g, d, { f: mtof(m), t: t + i * 0.28, dur: 0.3, r: 0.6, vol: 0.04, type: 'triangle', send: 0.5 })); voice(g, d, { f: mtof(38), t, dur: 1.4, a: 0.4, r: 1.2, vol: 0.06, send: 0.3 }); },
  chapter: (g, d, t) => { bell(g, d, mtof(43), t, 3.2, 0.08, 0.6); bell(g, d, mtof(55), t + 0.02, 2.4, 0.04, 0.6); voice(g, d, { f: mtof(31), t, dur: 1.4, a: 0.05, r: 1.6, vol: 0.07 }); },
  day: (g, d, t) => { bell(g, d, mtof(88), t, 1.4, 0.03, 0.5, -0.2); bell(g, d, mtof(95), t + 0.14, 1.6, 0.025, 0.5, 0.2); },
  night: (g, d, t) => { bell(g, d, mtof(57), t, 2.4, 0.05, 0.6); voice(g, d, { f: mtof(45), t, dur: 1.2, a: 0.4, r: 1.2, vol: 0.035, type: 'triangle', send: 0.4 }); },
  align: (g, d, t) => { bell(g, d, mtof(69), t, 1.8, 0.04, 0.7, -0.3); bell(g, d, mtof(75), t + 0.22, 2.2, 0.04, 0.7, 0.3); },
  bond: (g, d, t) => { [64, 68, 71, 76].forEach((m, i) => voice(g, d, { f: mtof(m), t: t + i * 0.05, dur: 0.5, a: 0.06, r: 0.9, vol: 0.025, type: 'triangle', send: 0.6 })); },
  doom: (g, d, t) => { drum(g, d, t, 0.4, 90, 30, 1.2); [45, 46, 52].forEach(m => voice(g, d, { f: mtof(m), t, dur: 1.2, a: 0.2, r: 1.4, vol: 0.035, type: 'sawtooth', det: 9, cut: 900, send: 0.5 })); },
};
function sfx(name) {
  if (!CFG.sound || !SFX[name]) return;
  try { const g = audioReady(); if (!g) return; SFX[name](g, g.sfx, g.ctx.currentTime + 0.01); } catch (e) { }
}

// ---------------- BGM ----------------
// 曲調（場面ごと）。chords は和音（MIDIの音番号）、bpc は1つの和音の長さ（拍）、scale は旋律に使う音
const MOODS = {
  title:    { bpm: 60, score: (mu, t, st, half) => SONGS.title(mu, t, st, half) },      // 「聖杯の呼び声」
  growth:   { bpm: 84, gain: 1.15, score: (mu, t, st, half) => SONGS.growth(mu, t, st, half) },     // 「小さな手のひら」
  day:      { bpm: 92, gain: 1.5, score: (mu, t, st, half) => SONGS.day(mu, t, st, half) },        // 「冬の街、束の間の日常」
  night:    { bpm: 66, gain: 1.5, score: (mu, t, st, half) => SONGS.night(mu, t, st, half) },      // 「月下の戦場」
  battle:   { bpm: 138, gain: 0.95, score: (mu, t, st, half) => battleScore(mu, t, st, half) },   // 「信念の刃」
  final:    { bpm: 160, gain: 0.75, score: (mu, t, st, half) => finalScore(mu, t, st, half) },    // 「生と死の境界」
  dawn:     { bpm: 70, gain: 1.1, score: (mu, t, st, half) => SONGS.dawn(mu, t, st, half) },       // 「夜明け」
  sorrow:   { bpm: 56, gain: 1.2, score: (mu, t, st, half) => SONGS.sorrow(mu, t, st, half) },     // 「喪失」
  epilogue: { bpm: 76, gain: 1.2, score: (mu, t, st, half) => SONGS.epilogue(mu, t, st, half) },   // 「その後の日々」
  unease:     { bpm: 72, gain: 1.7, score: (mu, t, st, half) => SONGS.unease(mu, t, st, half) },        // 「名前のない予感」（胸騒ぎ）
  kagura:     { bpm: 80, gain: 1.35, score: (mu, t, st, half) => SONGS.kagura(mu, t, st, half) },       // 「霧の神楽」（雫ルート）
  kamiBattle: { bpm: 132, gain: 0.9, score: (mu, t, st, half) => SONGS.kamiBattle(mu, t, st, half) },   // 「荒魂」（天降大神との戦い）
  counter:    { bpm: 76, gain: 1.65, score: (mu, t, st, half) => SONGS.counter(mu, t, st, half) },       // 「綻ぶ世界」（抑止の終章）
  guardian:   { bpm: 144, gain: 1.15, score: (mu, t, st, half) => SONGS.guardian(mu, t, st, half) },    // 「白妙」（抑止の守護者との戦い）
  sakura:     { bpm: 66, gain: 1.3, score: (mu, t, st, half) => SONGS.sakura(mu, t, st, half) },        // 「願い桜」（幼馴染ルート）
  sakuraBoss: { bpm: 150, gain: 1.0, score: (mu, t, st, half) => SONGS.sakuraBoss(mu, t, st, half) },   // 「花冠の杯」（花冠の杯との戦い）
  confession: { bpm: 68, gain: 1.2, score: (mu, t, st, half) => SONGS.confession(mu, t, st, half) },    // 「月下の告白」（告白）
  farewell:   { bpm: 64, gain: 1.2, score: (mu, t, st, half) => SONGS.farewell(mu, t, st, half) },      // 「さよならの朝」（最後の会話）
  eve:        { bpm: 70, gain: 1.25, score: (mu, t, st, half) => SONGS.eve(mu, t, st, half) },          // 「屋根の上の誓い」（決戦前夜）
};
class Music {
  constructor(g, mood) {
    this.g = g; this.m = MOODS[mood]; this.mood = mood;
    this.out = g.ctx.createGain(); this.out.gain.value = 0; const lv = g.ctx.createGain(); lv.gain.value = this.m.gain || 1; this.out.connect(lv); lv.connect(g.bgm);
    this.step = 0; this.next = g.ctx.currentTime + 0.1; this.mel = this.m.scale ? this.m.scale[Math.floor(this.m.scale.length / 2)] : 0;
  }
  fadeIn(sec = 2) { const t = this.g.ctx.currentTime; this.out.gain.setValueAtTime(0, t); this.out.gain.linearRampToValueAtTime(1, t + sec); }
  fadeOut(sec = 2) { const t = this.g.ctx.currentTime; this.out.gain.cancelScheduledValues(t); this.out.gain.setValueAtTime(this.out.gain.value, t); this.out.gain.linearRampToValueAtTime(0, t + sec); this.dead = t + sec + 0.2; setTimeout(() => { try { this.out.disconnect(); } catch (e) { } }, (sec + 3) * 1000); }
  // 旋律：音階の上を、近い音へ少しずつ動く
  walk() { const s = this.m.scale; let i = s.indexOf(this.mel); if (i < 0) i = Math.floor(s.length / 2); i = Math.max(0, Math.min(s.length - 1, i + pick([-2, -1, -1, 1, 1, 2, 0]))); return (this.mel = s[i]); }
  // t 秒までの音を予約する
  scheduleUntil(until) {
    const m = this.m; const g = this.g; const d = this.out; const spb = 60 / m.bpm; const half = spb / 2;
    while (this.next < until) {
      if (m.score) { m.score(this, this.next, this.step, half); this.step++; this.next += half; continue; }   // 作曲された曲（戦闘・決戦）
      const t = this.next; const st = this.step; const beat = st / 2; const perChord = m.bpc * 2;
      const ci = Math.floor(st / perChord) % m.chords.length; const ch = m.chords[ci]; const inChord = st % perChord; const onBeat = st % 2 === 0;
      const chordDur = m.bpc * spb;
      // 和音の頭：パッド・ベース
      if (inChord === 0) {
        if (m.pad) ch.slice(1).forEach((n, k) => voice(g, d, { f: mtof(n), t, dur: chordDur, a: Math.min(1.2, chordDur / 3), r: 1.2, vol: m.pad.vol, type: m.pad.type, det: m.pad.det || 7, cut: m.pad.cut, send: 0.45, pan: (k - 1) * 0.35 }));
        if (m.bass) voice(g, d, { f: mtof(ch[0] - 12 + (ch[0] < 40 ? 12 : 0)), t, dur: chordDur * 0.9, a: 0.05, r: 0.6, vol: m.bass.vol, type: 'triangle', cut: 500 });
        if (m.drone) voice(g, d, { f: mtof(40 - 12), t, dur: chordDur, a: 1.5, r: 1.5, vol: 0.035, type: 'sine' });
      }
      // オルゴール（8分音符で和音をなぞる）
      if (m.box) { const notes = ch.slice(1).map(n => n + 24); const n = notes[[0, 1, 2, 1][st % 4]] || notes[0]; voice(g, d, { f: mtof(n), t, dur: 0.02, a: 0.002, r: 0.7, vol: m.box.vol, type: 'triangle', send: 0.5, pan: (st % 2 ? 0.25 : -0.25) }); }
      // 爪弾き
      if (m.pluck && [0, 3, 4, 6].includes(st % 8)) { const n = ch[1 + (st % 3)] + 12; voice(g, d, { f: mtof(n), t, dur: 0.02, a: 0.003, r: 0.35, vol: m.pluck.vol, type: 'triangle', cut: 2600, send: 0.3, pan: 0.3 }); }
      if (m.shaker && !onBeat) hat(g, d, t, m.shaker, -0.3);
      // 鐘の旋律（まばら）
      if (m.bell && onBeat && Math.random() < m.bell.p) { const n = this.walk() - (m.bell.low ? 12 : 0); bell(g, d, mtof(n), t, 2.2, m.bell.vol, 0.6, Math.random() * 0.6 - 0.3); }
      // ピアノの旋律
      if (m.piano && onBeat && Math.random() < m.piano.p) { const n = this.walk(); voice(g, d, { f: mtof(n), t, dur: 0.05, a: 0.004, r: 1.4, vol: m.piano.vol, type: 'triangle', send: 0.5 }); }
      // 夜の鼓動
      if (m.pulse && inChord % 8 === 0) { drum(g, d, t, m.pulse, 70, 40, 0.4); drum(g, d, t + spb * 0.45, m.pulse * 0.6, 70, 40, 0.3); }
      // 戦闘：ベースの刻み・和音の打ち込み・打楽器・旋律
      if (m.ostinato) { const pat = [0, 0, 12, 0, 7, 0, 12, 10]; const n = ch[0] - 12 + pat[st % 8]; voice(g, d, { f: mtof(n), t, dur: half * 0.6, a: 0.004, r: 0.06, vol: m.ostinato.vol, type: 'sawtooth', cut: 700, cutEnd: 300, q: 2 }); }
      if (m.stab && [0, 3, 6].includes(st % 8)) ch.slice(1).forEach(n => voice(g, d, { f: mtof(n), t, dur: half * 0.5, a: 0.004, r: 0.1, vol: m.stab.vol, type: 'sawtooth', det: 8, cut: 2200, send: 0.2 }));
      if (m.drums === 'battle') { if ([0, 3, 4, 7].includes(st % 8)) drum(g, d, t, 0.22, 110, 45, 0.3); if (st % 4 === 2) snare(g, d, t, 0.08); hat(g, d, t, st % 2 ? 0.018 : 0.028); }
      if (m.drums === 'final') { if ([0, 2, 3, 4, 6, 7].includes(st % 8)) drum(g, d, t, st % 4 === 0 ? 0.28 : 0.16, 100, 40, 0.3); if (st % 4 === 2) snare(g, d, t, 0.1); hat(g, d, t, 0.025); if (inChord === 0 && ci === 0) noiseHit(g, d, { t, dur: 1.2, vol: 0.05, f: 7000, ftype: 'highpass', send: 0.4 }); }
      if (m.lead && onBeat && Math.random() < m.lead.p) { const n = this.walk(); voice(g, d, { f: mtof(n), t, dur: spb * 0.9, a: 0.01, r: 0.2, vol: m.lead.vol, type: 'square', cut: 1800, send: 0.3, pan: -0.15 }); }
      this.step++; this.next += half;
    }
  }
}
// =============================================================
//  戦闘曲「信念の刃」（ニ短調・138）
//   A（1〜8小節）緊迫：低弦の16分の刻み・不協な6度・太鼓のシンコペーション。最後の2小節で音がせり上がる
//   B（9〜16小節）覚悟：金管の主題が立ち上がり、和音は上へ上へと押し上げる。最後は属和音（イ長調）で張り詰めたまま頭へ戻る
//  1小節＝8分音符8つ。和音は { r: ベースの音, n: 和音の音 }
// =============================================================
const CH = (r, ...n) => ({ r, n });
const BATTLE_A = [CH(38, 57, 62, 65, 64), CH(38, 57, 62, 65, 69), CH(34, 58, 62, 65), CH(36, 55, 60, 64), CH(38, 57, 62, 65, 64), CH(38, 57, 62, 65, 69), CH(34, 58, 62, 65), CH(33, 57, 61, 64)];
const BATTLE_B = [CH(34, 58, 62, 65), CH(36, 55, 60, 64), CH(38, 57, 62, 65), CH(38, 57, 62, 65), CH(34, 58, 62, 65), CH(36, 55, 60, 64), CH(33, 57, 61, 64), CH(33, 57, 62, 64)];
// 覚悟の主題（[小節内の位置, 音, 長さ]、8分音符単位）
const BATTLE_THEME = [
  [[0, 74, 4], [4, 77, 2], [6, 76, 1], [7, 74, 1]], [[0, 72, 3], [3, 74, 1], [4, 76, 4]],
  [[0, 77, 4], [4, 81, 4]], [[0, 81, 6], [6, 79, 1], [7, 77, 1]],
  [[0, 79, 4], [4, 77, 2], [6, 74, 2]], [[0, 76, 3], [3, 77, 1], [4, 79, 4]],
  [[0, 81, 8]], [[0, 85, 4], [4, 81, 2], [6, 76, 2]],
];
function crash(g, d, t, vol = 0.06) { noiseHit(g, d, { t, dur: 1.8, vol, f: 5500, ftype: 'highpass', send: 0.5 }); }
function brass(g, d, n, t, dur, vol) {   // 金管（オクターブ下を重ねる）
  voice(g, d, { f: mtof(n), t, dur, a: 0.03, r: 0.25, vol, type: 'sawtooth', det: 9, cut: 2600, q: 1.2, send: 0.35, vib: 0.006 });
  voice(g, d, { f: mtof(n - 12), t, dur, a: 0.03, r: 0.25, vol: vol * 0.55, type: 'sawtooth', det: 6, cut: 1500, send: 0.25 });
}
function battleScore(mu, t, st, half) {
  const g = mu.g, d = mu.out; const bar = Math.floor(st / 8) % 16; const pos = st % 8; const B2 = bar >= 8; const bi = bar % 8;
  const ch = (B2 ? BATTLE_B : BATTLE_A)[bi]; const q = half / 2; const barDur = half * 8;
  const minor = ch.n.includes(ch.r + 15) || ch.n.includes(ch.r + 27);   // 短和音か
  // 和音（弦のパッド）：小節の頭
  if (pos === 0) {
    ch.n.forEach((n, k) => voice(g, d, { f: mtof(n), t, dur: barDur, a: B2 ? 0.08 : 0.25, r: 0.5, vol: B2 ? 0.016 : 0.013, type: 'sawtooth', det: 10, cut: B2 ? 1800 : 1000, send: 0.4, pan: (k - 1.5) * 0.3 }));
    voice(g, d, { f: mtof(ch.r), t, dur: barDur, a: 0.02, r: 0.3, vol: 0.05, type: 'sine' });   // 低音の支え
    if (bar === 8 || bar === 0) crash(g, d, t, bar === 8 ? 0.07 : 0.045);
  }
  // 低弦の16分の刻み（短和音では短6度を混ぜて緊迫させる）
  const pat = B2 ? [0, 0, 12, 0, 0, 0, 7, 5, 0, 0, 12, 0, 0, 0, 10, 7] : [0, 0, 12, 0, 0, 0, minor ? 8 : 7, 7, 0, 0, 12, 0, 0, 0, minor ? 8 : 10, 7];
  for (let s2 = 0; s2 < 2; s2++) { const i = pos * 2 + s2; const n = ch.r + 12 + pat[i]; voice(g, d, { f: mtof(n), t: t + s2 * q, dur: q * 0.7, a: 0.003, r: 0.05, vol: (i % 4 === 0 ? 0.05 : 0.036) * (B2 ? 1 : 0.8), type: 'sawtooth', cut: B2 ? 1100 : 850, cutEnd: 380, q: 2.5 }); }
  // 太鼓：A は「ドン・ドドン」の切迫したシンコペーション、B は力強い四つ打ち
  if (B2) { if (pos % 2 === 0) drum(g, d, t, pos === 0 ? 0.3 : 0.2, 120, 42, 0.3); if (pos === 2 || pos === 6) snare(g, d, t, 0.1); }
  else { if ([0, 3, 4, 6].includes(pos)) drum(g, d, t, pos === 0 ? 0.3 : 0.2, 110, 40, 0.35); if (pos === 6) snare(g, d, t, 0.06); }
  hat(g, d, t, pos % 2 ? 0.014 : 0.022); hat(g, d, t + q, 0.01, -0.2);
  // A の終わり（7・8小節）：弦のトレモロがせり上がり、B へ
  if (!B2 && bi >= 6) { const n = ch.n[ch.n.length - 1] + 12 + (bi === 7 ? Math.floor(pos / 2) : 0); for (let s2 = 0; s2 < 2; s2++) voice(g, d, { f: mtof(n), t: t + s2 * q, dur: q * 0.8, a: 0.004, r: 0.04, vol: 0.008 + pos * 0.0015, type: 'sawtooth', cut: 3200 }); }
  if (!B2 && bi === 7 && pos === 0) noiseHit(g, d, { t, dur: barDur, vol: 0.05, f: 400, endF: 5000, ftype: 'bandpass', a: barDur * 0.9, send: 0.3 });
  // B：覚悟の主題（金管）と、裏で鳴る弦の打ち込み
  if (B2) {
    for (const [p, n, len] of BATTLE_THEME[bi]) if (p === pos) brass(g, d, n, t, len * half * 0.95, 0.03);
    if ([0, 3, 6].includes(pos)) ch.n.forEach(n => voice(g, d, { f: mtof(n + 12), t, dur: half * 0.45, a: 0.004, r: 0.08, vol: 0.011, type: 'sawtooth', det: 8, cut: 2800, send: 0.2 }));
  } else if (pos === 0 && bi % 2 === 0) {
    // A：遠くで鳴る、主題の断片（予感）
    voice(g, d, { f: mtof(74), t: t + half * 2, dur: half * 3, a: 0.2, r: 0.6, vol: 0.012, type: 'triangle', send: 0.6, vib: 0.004 });
  }
}

// =============================================================
//  決戦曲「生と死の境界」（ロ短調・160）
//   A（1〜8小節）極限：半音でぶつかる刻み（シ－ド）、フリギアの♭II（ハ長調）、♭9 の不協和音、
//                     心臓の鼓動のような二連の太鼓、4小節ごとの弔いの鐘、低く唸る合唱
//   B（9〜16小節）生への渇望：高音の弦と金管が、悲壮な主題を叫ぶ。最後の小節はティンパニの連打で頭へ
// =============================================================
const FINAL_A = [CH(35, 54, 59, 62, 66), CH(36, 55, 60, 64, 71), CH(35, 54, 59, 62, 66), CH(36, 55, 60, 64, 71), CH(31, 55, 59, 62, 67), CH(30, 54, 58, 61, 67), CH(35, 54, 59, 62, 66), CH(36, 55, 60, 64, 71)];
const FINAL_B = [CH(31, 55, 59, 62, 67), CH(33, 57, 61, 64, 69), CH(35, 54, 59, 62, 66), CH(35, 54, 59, 62, 66), CH(31, 55, 59, 62, 67), CH(33, 57, 61, 64, 69), CH(30, 54, 58, 61, 66), CH(30, 54, 58, 61, 64)];
const FINAL_THEME = [
  [[0, 83, 4], [4, 86, 2], [6, 85, 1], [7, 83, 1]], [[0, 81, 3], [3, 83, 1], [4, 85, 4]],
  [[0, 86, 6], [6, 90, 2]], [[0, 90, 4], [4, 88, 2], [6, 86, 2]],
  [[0, 86, 4], [4, 83, 2], [6, 86, 2]], [[0, 88, 4], [4, 85, 4]],
  [[0, 90, 8]], [[0, 82, 4], [4, 85, 2], [6, 78, 2]],
];
function choir(g, d, n, t, dur, vol) {   // 合唱（「アー」の声に近づけた和音）
  voice(g, d, { f: mtof(n), t, dur, a: 0.4, r: 0.8, vol, type: 'sawtooth', det: 14, cut: 1100, q: 3, ftype: 'bandpass', send: 0.6, vib: 0.004, vibRate: 4.6 });
}
function finalScore(mu, t, st, half) {
  const g = mu.g, d = mu.out; const cyc = Math.floor(st / 128); const bar = Math.floor(st / 8) % 16; const pos = st % 8; const B2 = bar >= 8; const bi = bar % 8;
  const ch = (B2 ? FINAL_B : FINAL_A)[bi]; const q = half / 2; const barDur = half * 8;
  if (pos === 0) {
    ch.n.forEach((n, k) => choir(g, d, n, t, barDur, B2 ? 0.02 : 0.017));
    voice(g, d, { f: mtof(ch.r), t, dur: barDur, a: 0.02, r: 0.3, vol: 0.06, type: 'sine' });
    if (bar % 4 === 0 && !B2) bell(g, d, mtof(47), t, 3.5, 0.06, 0.7);   // 弔いの鐘
    if (bar === 8 || bar === 12) crash(g, d, t, 0.08);
  }
  // 刻み：主音と半音上を行き来し、増4度で裂ける
  const pat = B2 ? [0, 0, 12, 0, 0, 0, 7, 0, 0, 0, 12, 0, 0, 7, 10, 12] : [0, 1, 0, 12, 0, 1, 0, 7, 0, 1, 0, 12, 0, 1, 7, 6];
  for (let s2 = 0; s2 < 2; s2++) { const i = pos * 2 + s2; const n = ch.r + 12 + pat[i]; voice(g, d, { f: mtof(n), t: t + s2 * q, dur: q * 0.7, a: 0.003, r: 0.04, vol: i % 4 === 0 ? 0.055 : 0.04, type: 'sawtooth', cut: 1000, cutEnd: 420, q: 3 }); }
  // 心臓の鼓動（ドクン、ドクン）と、絶え間ない太鼓
  if (pos % 2 === 0) { drum(g, d, t, 0.3, 95, 38, 0.32); drum(g, d, t + q * 0.75, 0.16, 85, 36, 0.25); }
  else drum(g, d, t, 0.1, 140, 60, 0.15);
  if (pos === 2 || pos === 6) snare(g, d, t, B2 ? 0.12 : 0.08);
  hat(g, d, t, 0.02); hat(g, d, t + q, 0.012, -0.25);
  // 高音の弦のトレモロ（張り詰めた糸）
  const top = ch.n[ch.n.length - 1] + 12;
  for (let s2 = 0; s2 < 2; s2++) voice(g, d, { f: mtof(top), t: t + s2 * q, dur: q * 0.8, a: 0.003, r: 0.03, vol: B2 ? 0.011 : 0.007, type: 'sawtooth', cut: 3800 });
  if (B2) {
    for (const [p, n, len] of FINAL_THEME[bi]) if (p === pos) {
      voice(g, d, { f: mtof(n), t, dur: len * half * 0.95, a: 0.04, r: 0.3, vol: 0.022, type: 'sawtooth', det: 12, cut: 3400, send: 0.45, vib: 0.008 });   // 高音の弦
      brass(g, d, n - 12, t, len * half * 0.95, 0.026);                                                                                                // 金管（オクターブ下）
    }
  } else if (bi === 5 && pos === 0) {
    // ♭9 の不協和音を、金管が突き刺す
    [54, 58, 61, 67].forEach(n => voice(g, d, { f: mtof(n + 12), t, dur: barDur * 0.9, a: 0.02, r: 0.4, vol: 0.016, type: 'sawtooth', det: 10, cut: 2400, send: 0.4 }));
  }
  // 最後の小節：ティンパニの連打で次の周へ
  if (bar === 15) for (let s2 = 0; s2 < 2; s2++) drum(g, d, t + s2 * q, 0.12 + pos * 0.025, 75, 45, 0.2);
  // 2周目以降は、A にも遠い主題の残響が混ざる（終わりの見えない戦い）
  if (!B2 && cyc > 0 && pos === 0 && bi % 2 === 1) voice(g, d, { f: mtof(83), t, dur: barDur, a: 0.4, r: 0.8, vol: 0.01, type: 'triangle', send: 0.7, vib: 0.006 });
}

// =============================================================
//  場面の曲（すべて作曲済み。16小節＝前半A 8小節＋後半B 8小節を繰り返す）
//   各小節は [和音, 旋律]。旋律は [小節内の位置, 音, 長さ]（8分音符単位）
// =============================================================
const INST = {
  bell:    (g, d, n, t, dur, v) => bell(g, d, mtof(n), t, Math.max(1.4, dur * 1.6), v, 0.6),
  box:     (g, d, n, t, dur, v) => { voice(g, d, { f: mtof(n), t, dur: 0.02, a: 0.002, r: 0.9, vol: v, type: 'triangle', send: 0.5 }); voice(g, d, { f: mtof(n + 12), t, dur: 0.01, a: 0.002, r: 0.45, vol: v * 0.3, type: 'sine', send: 0.5 }); },
  celesta: (g, d, n, t, dur, v) => { voice(g, d, { f: mtof(n), t, dur: 0.03, a: 0.003, r: Math.max(0.9, dur), vol: v, type: 'sine', send: 0.55 }); voice(g, d, { f: mtof(n + 12), t, dur: 0.02, a: 0.003, r: 0.4, vol: v * 0.35, type: 'sine', send: 0.55 }); },
  piano:   (g, d, n, t, dur, v) => { voice(g, d, { f: mtof(n), t, dur, a: 0.004, decay: 0.35, sus: 0.25, r: 0.7, vol: v, type: 'triangle', send: 0.4 }); voice(g, d, { f: mtof(n + 12), t, dur: dur * 0.5, a: 0.003, decay: 0.15, sus: 0.1, r: 0.3, vol: v * 0.22, type: 'sine', send: 0.4 }); },
  harp:    (g, d, n, t, dur, v) => voice(g, d, { f: mtof(n), t, dur: 0.02, a: 0.002, r: 0.8, vol: v, type: 'triangle', cut: 3200, send: 0.55 }),
  pluck:   (g, d, n, t, dur, v) => voice(g, d, { f: mtof(n), t, dur: 0.02, a: 0.002, r: 0.4, vol: v, type: 'triangle', cut: 2400, send: 0.3 }),
  flute:   (g, d, n, t, dur, v) => { voice(g, d, { f: mtof(n), t, dur, a: 0.07, r: 0.3, vol: v, type: 'sine', send: 0.45, vib: 0.005 }); voice(g, d, { f: mtof(n), t, dur, a: 0.09, r: 0.25, vol: v * 0.25, type: 'triangle', send: 0.4 }); },
  strings: (g, d, n, t, dur, v) => voice(g, d, { f: mtof(n), t, dur, a: 0.18, r: 0.5, vol: v, type: 'sawtooth', det: 10, cut: 2600, send: 0.5, vib: 0.006 }),
  cello:   (g, d, n, t, dur, v) => voice(g, d, { f: mtof(n), t, dur, a: 0.15, r: 0.5, vol: v, type: 'sawtooth', det: 6, cut: 1300, send: 0.4, vib: 0.007 }),
  horn:    (g, d, n, t, dur, v) => voice(g, d, { f: mtof(n), t, dur, a: 0.09, r: 0.4, vol: v, type: 'sawtooth', det: 5, cut: 1300, q: 1.2, send: 0.45, vib: 0.004 }),
  choir:   (g, d, n, t, dur, v) => choir(g, d, n, t, dur, v),
  // 和の楽器（雫ルート・抑止の終章）
  shino:   (g, d, n, t, dur, v) => { const f = mtof(n); voice(g, d, { f, t, dur, a: 0.05, r: 0.28, vol: v, type: 'sine', vib: 0.012, vibRate: 5.8, send: 0.55 }); voice(g, d, { f: f * 2, t, dur, a: 0.06, r: 0.2, vol: v * 0.12, type: 'triangle', send: 0.5 }); noiseHit(g, d, { t, dur: 0.12, vol: v * 0.35, f: Math.min(9000, f * 1.5), ftype: 'bandpass', q: 2, send: 0.4 }); },   // 篠笛（息の音を少し混ぜる）
  koto:    (g, d, n, t, dur, v) => { const f = mtof(n); voice(g, d, { f, endF: f * 0.996, glide: 0.4, t, dur: 0.02, a: 0.002, r: 0.9, vol: v, type: 'triangle', cut: 3200, send: 0.45 }); voice(g, d, { f: f * 2, t, dur: 0.01, a: 0.002, r: 0.3, vol: v * 0.3, type: 'sine' }); },   // 箏
  glass:   (g, d, n, t, dur, v) => { const f = mtof(n); voice(g, d, { f, t, dur: 0.02, a: 0.003, r: Math.max(1.6, dur), vol: v, type: 'sine', send: 0.7 }); voice(g, d, { f: f * 2.01, t, dur: 0.01, a: 0.003, r: 1.1, vol: v * 0.3, type: 'sine', send: 0.7 }); },   // 玻璃（冷たく澄んだ音）
};
// 曲の骨組み：和音と旋律を鳴らし、伴奏（layer）は曲ごとに書く
function song(def) {
  return (mu, t, st, half) => {
    const bar = Math.floor(st / 8) % 16, pos = st % 8, B2 = bar >= 8, bi = bar % 8; const [ch, mel] = (B2 ? def.B : def.A)[bi];
    const c = { g: mu.g, d: mu.out, bar, pos, B2, bi, ch, half, q: half / 2, barDur: half * 8, cyc: Math.floor(st / 128) };
    def.layer(c, t);
    const L = B2 ? def.leadB : def.leadA;
    if (mel && L) for (const [p, n, len] of mel) if (p === pos) {
      INST[L.inst](c.g, c.d, n + (L.oct || 0), t, len * half * 0.95, L.vol);
      if (L.dbl) INST[L.dbl.inst](c.g, c.d, n + (L.dbl.oct || 0), t, len * half * 0.95, L.dbl.vol);
    }
  };
}
// 伴奏の部品
function padAt(c, t, o) { if (c.pos === 0) c.ch.n.forEach((n, k) => voice(c.g, c.d, { f: mtof(n + (o.oct || 0)), t, dur: c.barDur, a: o.a ?? 0.4, r: o.r ?? 0.9, vol: o.vol, type: o.type || 'triangle', det: o.det ?? 7, cut: o.cut, send: 0.5, pan: (k - 1.5) * 0.3 })); }
function bassAt(c, t, o) {
  const play = (len) => { voice(c.g, c.d, { f: mtof(c.ch.r), t, dur: len, a: 0.02, r: 0.4, vol: o.vol, type: 'sine' }); voice(c.g, c.d, { f: mtof(c.ch.r + 12), t, dur: len, a: 0.02, r: 0.3, vol: o.vol * 0.4, type: 'triangle', cut: 700 }); };
  if (o.style === 'hold' && c.pos === 0) play(c.barDur * 0.95);
  if (o.style === 'half' && c.pos % 4 === 0) play(c.half * 3.6);
  if (o.style === 'pulse' && c.pos % 2 === 0) play(c.half * 0.9);
}
function arpAt(c, t, pat, inst, vol, oct = 12) { const i = pat[c.pos % pat.length]; if (i == null) return; const ns = c.ch.n; INST[inst](c.g, c.d, ns[i % ns.length] + oct + (i >= ns.length ? 12 : 0), t, c.half, vol); }

// 和音
const C_ = {
  Dm: CH(38, 57, 62, 65, 69), Bb: CH(34, 58, 62, 65, 70), Gm: CH(43, 58, 62, 67, 70), A: CH(33, 57, 61, 64, 69), F: CH(41, 57, 60, 65, 69), C: CH(36, 55, 60, 64, 67),
  Em: CH(40, 55, 59, 64, 67), B: CH(35, 54, 59, 63, 66), Am: CH(33, 57, 60, 64, 69), G: CH(31, 55, 59, 62, 67), D: CH(38, 54, 57, 62, 66), E: CH(40, 56, 59, 64, 68),
  Cm: CH(36, 55, 60, 63, 67), Fm: CH(41, 56, 60, 65, 68), Ab: CH(44, 56, 60, 63, 68), Eb: CH(39, 55, 58, 63, 67), G7: CH(31, 55, 59, 62, 65), Db: CH(37, 56, 61, 65, 68),
  Bm: CH(35, 54, 59, 62, 66), Fsm: CH(42, 57, 61, 66, 69),
  // 和の響き（空虚五度。都節の音階 レ・ミ♭・ソ・ラ・シ♭ に合う）
  kD: CH(38, 50, 57, 62, 69), kG: CH(43, 55, 62, 67, 74), kEb: CH(39, 51, 58, 63, 70), kA: CH(45, 57, 64, 69, 76), kBb: CH(34, 46, 53, 58, 65),
};
const SONGS = {
  // ---- タイトル・召喚「聖杯の呼び声」（ニ短調・60）：運命の始まり。前半は鐘と合唱が「運命の主題」を告げ、後半で弦とホルンが英霊たちの気配を広げる
  title: song({
    A: [[C_.Dm, [[0, 74, 4], [4, 69, 2], [6, 72, 2]]], [C_.Bb, [[0, 74, 6], [6, 77, 2]]], [C_.Gm, [[0, 79, 4], [4, 77, 2], [6, 74, 2]]], [C_.A, [[0, 76, 8]]],
        [C_.Dm, [[0, 74, 4], [4, 69, 2], [6, 72, 2]]], [C_.Bb, [[0, 74, 4], [4, 77, 2], [6, 81, 2]]], [C_.Gm, [[0, 82, 4], [4, 81, 2], [6, 79, 2]]], [C_.A, [[0, 81, 4], [4, 73, 4]]]],
    B: [[C_.Bb, [[0, 77, 4], [4, 74, 4]]], [C_.F, [[0, 72, 4], [4, 77, 4]]], [C_.C, [[0, 79, 6], [6, 76, 2]]], [C_.Dm, [[0, 74, 8]]],
        [C_.Bb, [[0, 77, 4], [4, 81, 4]]], [C_.F, [[0, 84, 4], [4, 81, 4]]], [C_.Gm, [[0, 82, 4], [4, 79, 4]]], [C_.A, [[0, 81, 6], [6, 76, 2]]]],
    leadA: { inst: 'bell', vol: 0.05 },
    leadB: { inst: 'strings', vol: 0.024, dbl: { inst: 'horn', oct: -12, vol: 0.018 } },
    layer: (c, t) => {
      if (!c.B2) { if (c.pos === 0) c.ch.n.slice(0, 3).forEach(n => choir(c.g, c.d, n - 12, t, c.barDur, 0.014)); }
      else padAt(c, t, { type: 'sawtooth', cut: 1500, vol: 0.012, a: 0.6 });
      bassAt(c, t, { style: 'hold', vol: 0.05 });
      arpAt(c, t, c.B2 ? [0, 1, 2, 3, 4, 3, 2, 1] : [0, null, 1, null, 2, null, 3, null], 'harp', c.B2 ? 0.016 : 0.013);
      if ((c.bar === 0 || c.bar === 8) && c.pos === 0) drum(c.g, c.d, t, 0.18, 80, 40, 1.2);
    },
  }),
  // ---- 生い立ち「小さな手のひら」（ヘ長調・84）：子ども時代の日々。前半はオルゴールの無邪気な旋律、後半はフルートが少し大人びた懐かしさを歌う
  growth: song({
    A: [[C_.F, [[0, 77, 2], [2, 81, 2], [4, 84, 4]]], [C_.C, [[0, 79, 4], [4, 76, 2], [6, 79, 2]]], [C_.Dm, [[0, 81, 2], [2, 77, 2], [4, 74, 4]]], [C_.Bb, [[0, 74, 2], [2, 77, 2], [4, 82, 4]]],
        [C_.F, [[0, 81, 2], [2, 79, 2], [4, 77, 4]]], [C_.C, [[0, 76, 2], [2, 79, 2], [4, 84, 4]]], [C_.Bb, [[0, 82, 2], [2, 81, 2], [4, 77, 4]]], [C_.C, [[0, 79, 8]]]],
    B: [[C_.Dm, [[0, 81, 6], [6, 79, 2]]], [C_.Bb, [[0, 77, 6], [6, 74, 2]]], [C_.F, [[0, 77, 4], [4, 81, 4]]], [C_.C, [[0, 79, 8]]],
        [C_.Dm, [[0, 81, 4], [4, 84, 4]]], [C_.Bb, [[0, 86, 4], [4, 82, 4]]], [C_.Gm, [[0, 82, 4], [4, 79, 4]]], [C_.C, [[0, 76, 4], [4, 79, 4]]]],
    leadA: { inst: 'box', oct: 12, vol: 0.04 },
    leadB: { inst: 'flute', vol: 0.032 },
    layer: (c, t) => {
      padAt(c, t, { vol: c.B2 ? 0.014 : 0.01, cut: 1800, a: 0.5 });
      bassAt(c, t, { style: 'half', vol: 0.04 });
      arpAt(c, t, [0, 1, 2, 1, 3, 2, 1, 2], c.B2 ? 'harp' : 'box', c.B2 ? 0.013 : 0.012, c.B2 ? 12 : 24);
    },
  }),
  // ---- 昼「冬の街、束の間の日常」（イ短調・92）：戦いの合間の穏やかな時間。明るい長調へ向かいながら、最後はいつも少しだけ影が差す
  day: song({
    A: [[C_.Am, [[0, 76, 3], [3, 72, 1], [4, 69, 4]]], [C_.F, [[0, 72, 3], [3, 74, 1], [4, 77, 4]]], [C_.C, [[0, 79, 3], [3, 76, 1], [4, 72, 4]]], [C_.G, [[0, 74, 6], [6, 71, 2]]],
        [C_.Am, [[0, 76, 3], [3, 79, 1], [4, 81, 4]]], [C_.F, [[0, 81, 2], [2, 79, 2], [4, 77, 4]]], [C_.C, [[0, 76, 3], [3, 74, 1], [4, 72, 4]]], [C_.E, [[0, 71, 4], [4, 68, 4]]]],
    B: [[C_.F, [[0, 72, 2], [2, 77, 2], [4, 81, 4]]], [C_.G, [[0, 79, 2], [2, 74, 2], [4, 71, 4]]], [C_.Em, [[0, 76, 2], [2, 79, 2], [4, 83, 4]]], [C_.Am, [[0, 81, 8]]],
        [C_.F, [[0, 84, 3], [3, 81, 1], [4, 77, 4]]], [C_.G, [[0, 79, 3], [3, 83, 1], [4, 86, 4]]], [C_.C, [[0, 84, 4], [4, 79, 4]]], [C_.E, [[0, 80, 4], [4, 76, 4]]]],
    leadA: { inst: 'piano', vol: 0.045 },
    leadB: { inst: 'piano', vol: 0.045, dbl: { inst: 'strings', vol: 0.011 } },
    layer: (c, t) => {
      padAt(c, t, { vol: 0.009, cut: 1400, a: 0.6 });
      bassAt(c, t, { style: 'pulse', vol: 0.038 });
      arpAt(c, t, [0, 1, 2, 3, 1, 2, 3, 2], 'pluck', 0.02, 0);
      if (c.pos % 2) hat(c.g, c.d, t, 0.009, -0.3);
    },
  }),
  // ---- 夜「月下の戦場」（ホ短調・66）：静寂に潜む殺気。低い持続音と鼓動の上で、チェレスタが不穏な旋律（増4度）を落としていく。後半はナポリの和音（ヘ長調）でさらに闇が深まる
  night: song({
    A: [[C_.Em, [[0, 76, 2], [2, 79, 2], [4, 78, 4]]], [C_.Em, [[4, 71, 4]]], [C_.C, [[0, 79, 4], [4, 76, 4]]], [C_.B, [[0, 75, 4], [4, 78, 4]]],
        [C_.Em, [[0, 76, 2], [2, 79, 2], [4, 82, 4]]], [C_.Em, [[0, 83, 4], [4, 79, 4]]], [C_.Am, [[0, 81, 4], [4, 77, 4]]], [C_.B, [[0, 75, 8]]]],
    B: [[C_.C, [[0, 64, 4], [4, 67, 4]]], [C_.Am, [[0, 69, 4], [4, 72, 4]]], [C_.F, [[0, 77, 6], [6, 76, 2]]], [C_.B, [[0, 75, 4], [4, 71, 4]]],
        [C_.C, [[0, 72, 4], [4, 76, 4]]], [C_.Am, [[0, 81, 4], [4, 77, 4]]], [C_.F, [[0, 77, 4], [4, 81, 4]]], [C_.B, [[0, 78, 4], [4, 75, 4]]]],
    leadA: { inst: 'celesta', vol: 0.04 },
    leadB: { inst: 'cello', oct: -12, vol: 0.034 },
    layer: (c, t) => {
      if (c.pos === 0) { voice(c.g, c.d, { f: mtof(28), t, dur: c.barDur, a: 1.2, r: 1.2, vol: 0.03 }); voice(c.g, c.d, { f: mtof(47), t, dur: c.barDur, a: 1.2, r: 1.2, vol: 0.012, type: 'triangle' }); }
      padAt(c, t, { type: 'sawtooth', cut: 600, vol: 0.01, a: 1.0, oct: -12 });
      if (c.pos === 0) { drum(c.g, c.d, t, 0.06, 70, 40, 0.4); drum(c.g, c.d, t + c.half * 0.9, 0.035, 70, 40, 0.3); }
      if (c.bar % 4 === 2 && c.pos === 0) noiseHit(c.g, c.d, { t, dur: c.barDur, vol: 0.02, f: 300, endF: 1200, ftype: 'bandpass', a: c.barDur * 0.6, send: 0.5 });
      if (c.B2) { const top = c.ch.n[c.ch.n.length - 1] + 12; for (let s2 = 0; s2 < 2; s2++) voice(c.g, c.d, { f: mtof(top), t: t + s2 * c.q, dur: c.q * 0.8, a: 0.004, r: 0.03, vol: 0.004, type: 'sawtooth', cut: 3600 }); }
    },
  }),
  // ---- 良い結末「夜明け」（ト長調・70）：長い夜の終わり。ピアノが静かに朝日を告げ、後半は弦とホルンが希望と、少しの喪失を歌い上げる
  dawn: song({
    A: [[C_.G, [[0, 79, 4], [4, 83, 2], [6, 81, 2]]], [C_.D, [[0, 81, 6], [6, 78, 2]]], [C_.Em, [[0, 79, 4], [4, 76, 4]]], [C_.C, [[0, 76, 6], [6, 74, 2]]],
        [C_.G, [[0, 79, 2], [2, 81, 2], [4, 83, 4]]], [C_.D, [[0, 86, 4], [4, 81, 4]]], [C_.C, [[0, 84, 4], [4, 79, 4]]], [C_.D, [[0, 81, 8]]]],
    B: [[C_.Em, [[0, 83, 6], [6, 81, 2]]], [C_.C, [[0, 79, 6], [6, 76, 2]]], [C_.G, [[0, 79, 4], [4, 83, 4]]], [C_.D, [[0, 86, 8]]],
        [C_.Em, [[0, 88, 4], [4, 86, 4]]], [C_.C, [[0, 84, 4], [4, 79, 4]]], [C_.Am, [[0, 81, 4], [4, 84, 4]]], [C_.D, [[0, 78, 4], [4, 81, 4]]]],
    leadA: { inst: 'piano', vol: 0.045 },
    leadB: { inst: 'strings', vol: 0.026, dbl: { inst: 'horn', oct: -12, vol: 0.016 } },
    layer: (c, t) => {
      padAt(c, t, { vol: c.B2 ? 0.014 : 0.01, cut: 2000, a: 0.7 });
      bassAt(c, t, { style: 'hold', vol: 0.045 });
      arpAt(c, t, [0, 2, 1, 3, 2, 1, 3, 2], 'piano', 0.012, 0);
      if ((c.bar === 0 || c.bar === 8) && c.pos === 0) bell(c.g, c.d, mtof(91), t, 2.5, 0.025, 0.7);
    },
  }),
  // ---- 悪い結末「喪失」（イ短調・56）：届かなかった願い。ピアノがひとりで哀しみを語り、後半は低いチェロが喪ったものを悼む
  sorrow: song({
    A: [[C_.Am, [[0, 76, 4], [4, 72, 2], [6, 71, 2]]], [C_.F, [[0, 72, 6], [6, 69, 2]]], [C_.Dm, [[0, 74, 4], [4, 77, 2], [6, 76, 2]]], [C_.E, [[0, 71, 6], [6, 68, 2]]],
        [C_.Am, [[0, 72, 4], [4, 76, 2], [6, 81, 2]]], [C_.F, [[0, 81, 4], [4, 77, 4]]], [C_.Dm, [[0, 77, 4], [4, 74, 2], [6, 72, 2]]], [C_.E, [[0, 71, 8]]]],
    B: [[C_.F, [[0, 65, 6], [6, 64, 2]]], [C_.G, [[0, 62, 6], [6, 67, 2]]], [C_.C, [[0, 64, 4], [4, 60, 4]]], [C_.Am, [[0, 57, 8]]],
        [C_.Dm, [[0, 62, 4], [4, 65, 4]]], [C_.E, [[0, 68, 4], [4, 71, 4]]], [C_.Am, [[0, 72, 6], [6, 71, 2]]], [C_.E, [[0, 68, 8]]]],
    leadA: { inst: 'piano', vol: 0.05 },
    leadB: { inst: 'cello', vol: 0.036 },
    layer: (c, t) => {
      if (c.pos === 0 || c.pos === 4) c.ch.n.slice(0, 3).forEach((n, k) => INST.piano(c.g, c.d, n - 12, t + k * 0.03, c.half * 3.5, 0.011));
      padAt(c, t, { type: 'sawtooth', cut: 600, vol: 0.006, a: 1.2, oct: -12 });
      bassAt(c, t, { style: 'hold', vol: 0.04 });
    },
  }),
  // ---- エピローグ「その後の日々」（ヘ長調・76）：時が流れ、思い出を抱いて生きていく。ギターの爪弾きとチェレスタ、後半はフルートが穏やかな幸福を歌う
  epilogue: song({
    A: [[C_.F, [[0, 72, 2], [2, 77, 2], [4, 81, 4]]], [C_.Am, [[0, 79, 2], [2, 76, 2], [4, 72, 4]]], [C_.Bb, [[0, 74, 2], [2, 77, 2], [4, 82, 4]]], [C_.C, [[0, 79, 6], [6, 76, 2]]],
        [C_.F, [[0, 77, 2], [2, 81, 2], [4, 84, 4]]], [C_.Am, [[0, 84, 2], [2, 81, 2], [4, 76, 4]]], [C_.Bb, [[0, 77, 4], [4, 74, 4]]], [C_.C, [[0, 76, 8]]]],
    B: [[C_.Dm, [[0, 81, 6], [6, 77, 2]]], [C_.Am, [[0, 76, 6], [6, 72, 2]]], [C_.Bb, [[0, 74, 4], [4, 77, 4]]], [C_.F, [[0, 81, 8]]],
        [C_.Gm, [[0, 82, 4], [4, 79, 4]]], [C_.Am, [[0, 81, 4], [4, 84, 4]]], [C_.Bb, [[0, 86, 4], [4, 82, 4]]], [C_.C, [[0, 79, 8]]]],
    leadA: { inst: 'celesta', vol: 0.042 },
    leadB: { inst: 'flute', vol: 0.03 },
    layer: (c, t) => {
      padAt(c, t, { vol: 0.01, cut: 1600, a: 0.6 });
      bassAt(c, t, { style: 'half', vol: 0.038 });
      arpAt(c, t, [0, 1, 2, 3, 2, 1, 2, 3], 'pluck', 0.018, 0);
    },
  }),
  // ---- 胸騒ぎ「名前のない予感」（ホ短調・72）：2日目、三つの道の分かれ目。時計の刻みと鼓動の上で、チェレスタが答えの出ない問いを繰り返す
  unease: song({
    A: [[C_.Em, [[0, 71, 4], [4, 74, 4]]], [C_.C, [[0, 76, 6], [6, 75, 2]]], [C_.Am, [[0, 72, 4], [4, 69, 4]]], [C_.B, [[0, 75, 8]]],
        [C_.Em, [[0, 79, 4], [4, 78, 4]]], [C_.C, [[0, 76, 4], [4, 72, 4]]], [C_.Am, [[0, 69, 2], [2, 72, 2], [4, 76, 4]]], [C_.B, [[0, 75, 4], [4, 71, 4]]]],
    B: [[C_.C, [[0, 72, 4], [4, 76, 4]]], [C_.B, [[0, 78, 8]]], [C_.Am, [[0, 81, 4], [4, 77, 4]]], [C_.B, [[0, 75, 8]]],
        [C_.Em, [[0, 71, 6], [6, 74, 2]]], [C_.C, [[0, 72, 4], [4, 67, 4]]], [C_.Am, [[0, 69, 4], [4, 72, 4]]], [C_.B, [[0, 71, 8]]]],
    leadA: { inst: 'celesta', vol: 0.038 },
    leadB: { inst: 'strings', oct: -12, vol: 0.022 },
    layer: (c, t) => {
      if (c.pos === 0) voice(c.g, c.d, { f: mtof(28), t, dur: c.barDur, a: 1.0, r: 1.2, vol: 0.028 });
      padAt(c, t, { type: 'sawtooth', cut: 700, vol: 0.008, a: 1.0, oct: -12 });
      if (c.pos % 2 === 0) hat(c.g, c.d, t, 0.007, c.pos % 4 ? 0.3 : -0.3);   // 時計の刻み
      if (c.pos === 0) { drum(c.g, c.d, t, 0.05, 70, 40, 0.35); drum(c.g, c.d, t + c.half * 0.8, 0.03, 70, 40, 0.3); }   // 鼓動
    },
  }),
  // ---- 雫ルート「霧の神楽」（都節・80）：天降山の霧と、花嫁に選ばれた巫女。篠笛が神楽の節を歌い、箏と神楽鈴、遠い太鼓が山の気配を運ぶ
  kagura: song({
    A: [[C_.kD, [[0, 81, 3], [3, 79, 1], [4, 81, 4]]], [C_.kD, [[0, 82, 2], [2, 81, 2], [4, 79, 2], [6, 75, 2]]], [C_.kG, [[0, 74, 6], [6, 75, 2]]], [C_.kD, [[0, 74, 8]]],
        [C_.kEb, [[0, 75, 3], [3, 79, 1], [4, 81, 4]]], [C_.kA, [[0, 82, 4], [4, 81, 2], [6, 79, 2]]], [C_.kG, [[0, 79, 4], [4, 75, 4]]], [C_.kD, [[0, 74, 8]]]],
    B: [[C_.kBb, [[0, 86, 4], [4, 87, 4]]], [C_.kD, [[0, 86, 6], [6, 82, 2]]], [C_.kG, [[0, 79, 4], [4, 81, 4]]], [C_.kA, [[0, 81, 8]]],
        [C_.kBb, [[0, 82, 2], [2, 86, 2], [4, 87, 4]]], [C_.kEb, [[0, 87, 4], [4, 86, 2], [6, 82, 2]]], [C_.kG, [[0, 81, 4], [4, 79, 4]]], [C_.kD, [[0, 74, 8]]]],
    leadA: { inst: 'shino', vol: 0.03 },
    leadB: { inst: 'shino', vol: 0.032, dbl: { inst: 'koto', oct: -12, vol: 0.02 } },
    layer: (c, t) => {
      if (c.pos === 0) voice(c.g, c.d, { f: mtof(26), t, dur: c.barDur, a: 1.2, r: 1.4, vol: 0.03 });
      arpAt(c, t, [0, null, 2, null, 1, null, 3, 2], 'koto', 0.016, 0);
      if (c.bar % 2 === 0 && c.pos === 0) suzu(c.g, c.d, t, 0.016);
      if (c.pos === 0) taiko(c.g, c.d, t, c.B2 ? 0.16 : 0.1);
      if (c.B2 && c.pos === 6) taiko(c.g, c.d, t, 0.08);
      if (c.bar % 4 === 3 && c.pos === 0) noiseHit(c.g, c.d, { t, dur: c.barDur, vol: 0.015, f: 400, endF: 900, ftype: 'bandpass', a: c.barDur * 0.5, send: 0.6 });   // 霧の風
    },
  }),
  // ---- 天降大神との戦い「荒魂」（都節・132）：山そのものとの戦い。和太鼓が地を揺らし、篠笛と金管が荒ぶる神と人の意地をぶつけ合う
  kamiBattle: song({
    A: [[C_.kD, [[0, 74, 2], [2, 75, 2], [4, 79, 2], [6, 81, 2]]], [C_.kD, [[0, 82, 3], [3, 81, 1], [4, 79, 4]]], [C_.kEb, [[0, 75, 2], [2, 79, 2], [4, 81, 2], [6, 82, 2]]], [C_.kD, [[0, 81, 8]]],
        [C_.kG, [[0, 86, 2], [2, 87, 2], [4, 86, 2], [6, 82, 2]]], [C_.kBb, [[0, 81, 3], [3, 82, 1], [4, 81, 2], [6, 79, 2]]], [C_.kEb, [[0, 75, 4], [4, 79, 4]]], [C_.kD, [[0, 74, 8]]]],
    B: [[C_.kBb, [[0, 82, 4], [4, 86, 4]]], [C_.kA, [[0, 81, 4], [4, 79, 4]]], [C_.kG, [[0, 79, 2], [2, 81, 2], [4, 82, 4]]], [C_.kD, [[0, 86, 8]]],
        [C_.kBb, [[0, 87, 4], [4, 86, 4]]], [C_.kEb, [[0, 82, 4], [4, 79, 4]]], [C_.kA, [[0, 81, 4], [4, 82, 2], [6, 81, 2]]], [C_.kD, [[0, 74, 8]]]],
    leadA: { inst: 'shino', vol: 0.03 },
    leadB: { inst: 'horn', oct: -12, vol: 0.032, dbl: { inst: 'shino', vol: 0.022 } },
    layer: (c, t) => {
      if ([0, 3, 4, 6].includes(c.pos)) taiko(c.g, c.d, t, c.pos === 0 ? 0.3 : 0.18);
      if (c.pos === 2 || c.pos === 6) noiseHit(c.g, c.d, { t, dur: 0.06, vol: 0.05, f: 2200, ftype: 'bandpass', q: 1.2 });   // 縁打ち
      if (c.pos % 2 === 0) voice(c.g, c.d, { f: mtof(c.ch.r - 12 + (c.pos === 4 ? 7 : 0)), t, dur: c.half * 0.8, a: 0.004, r: 0.08, vol: 0.05, type: 'sawtooth', cut: 600, cutEnd: 280, q: 2 });
      if (c.pos === 0) suzu(c.g, c.d, t, 0.014);
      if ((c.bar === 0 || c.bar === 8) && c.pos === 0) crash(c.g, c.d, t, 0.05);
      padAt(c, t, { type: 'sawtooth', cut: 1100, vol: 0.008, a: 0.3 });
    },
  }),
  // ---- 抑止の終章「綻ぶ世界」（イ短調・76）：空に入ったひび。止まらない時計の刻み、玻璃のように冷たい旋律、時折走る亀裂の音――世界そのものが、こちらを見ている
  counter: song({
    A: [[C_.Am, [[0, 81, 2], [2, 76, 2], [4, 83, 4]]], [C_.F, [[0, 84, 6], [6, 83, 2]]], [C_.Am, [[0, 81, 2], [2, 76, 2], [4, 72, 4]]], [C_.E, [[0, 80, 8]]],
        [C_.Dm, [[0, 81, 4], [4, 77, 4]]], [C_.Am, [[0, 76, 2], [2, 81, 2], [4, 88, 4]]], [C_.F, [[0, 84, 4], [4, 81, 4]]], [C_.E, [[0, 83, 4], [4, 80, 4]]]],
    B: [[C_.F, [[0, 77, 4], [4, 81, 4]]], [C_.G, [[0, 79, 4], [4, 83, 4]]], [C_.Em, [[0, 79, 6], [6, 76, 2]]], [C_.Am, [[0, 81, 8]]],
        [C_.F, [[0, 84, 4], [4, 88, 4]]], [C_.Dm, [[0, 86, 4], [4, 81, 4]]], [C_.E, [[0, 83, 4], [4, 80, 4]]], [C_.E, [[0, 76, 8]]]],
    leadA: { inst: 'glass', vol: 0.04 },
    leadB: { inst: 'strings', vol: 0.02, dbl: { inst: 'glass', vol: 0.025 } },
    layer: (c, t) => {
      hat(c.g, c.d, t, 0.006, c.pos % 2 ? 0.35 : -0.35);   // 止まらない時計
      if (c.pos === 0 || c.pos === 4) voice(c.g, c.d, { f: mtof(c.pos ? 79 : 84), t, dur: 0.01, a: 0.002, r: 0.12, vol: 0.012, type: 'square', cut: 3000 });
      if (c.pos === 0) voice(c.g, c.d, { f: mtof(c.ch.r - 12), t, dur: c.barDur, a: 1.5, r: 1.5, vol: 0.03 });
      padAt(c, t, { type: 'sine', vol: 0.012, a: 1.2, oct: 12 });
      if (c.bar % 4 === 1 && c.pos === 4) noiseHit(c.g, c.d, { t, dur: 0.9, vol: 0.03, f: 900, endF: 9000, ftype: 'bandpass', q: 3, send: 0.6 });   // 亀裂
    },
  }),
  // ---- 抑止の守護者との戦い「白妙」（ハ短調・144）：世界の掃除屋となった、最初の花嫁。容赦のない刻みの上で、弦が哀しみを、神楽鈴が遠い祈りを鳴らす
  guardian: song({
    A: [[C_.Cm, [[0, 72, 2], [2, 75, 2], [4, 79, 4]]], [C_.Ab, [[0, 80, 2], [2, 79, 2], [4, 75, 4]]], [C_.Eb, [[0, 79, 2], [2, 82, 2], [4, 84, 4]]], [C_.Bb, [[0, 82, 8]]],
        [C_.Fm, [[0, 80, 2], [2, 84, 2], [4, 87, 4]]], [C_.Cm, [[0, 84, 3], [3, 82, 1], [4, 79, 4]]], [C_.Db, [[0, 80, 4], [4, 77, 4]]], [C_.G7, [[0, 79, 4], [4, 83, 4]]]],
    B: [[C_.Ab, [[0, 84, 4], [4, 87, 4]]], [C_.Bb, [[0, 86, 4], [4, 82, 4]]], [C_.Eb, [[0, 87, 6], [6, 86, 2]]], [C_.Cm, [[0, 84, 8]]],
        [C_.Ab, [[0, 84, 2], [2, 87, 2], [4, 91, 4]]], [C_.Fm, [[0, 89, 4], [4, 87, 4]]], [C_.Db, [[0, 85, 4], [4, 84, 4]]], [C_.G7, [[0, 83, 8]]]],
    leadA: { inst: 'strings', vol: 0.028, dbl: { inst: 'bell', vol: 0.016 } },
    leadB: { inst: 'horn', oct: -12, vol: 0.03, dbl: { inst: 'strings', vol: 0.022 } },
    layer: (c, t) => {
      if ([0, 3, 4, 7].includes(c.pos)) drum(c.g, c.d, t, c.pos === 0 ? 0.26 : 0.18, 110, 45, 0.3);
      if (c.pos === 2 || c.pos === 6) snare(c.g, c.d, t, 0.08);
      hat(c.g, c.d, t, c.pos % 2 ? 0.014 : 0.022);
      voice(c.g, c.d, { f: mtof(c.ch.r - 12 + [0, 0, 12, 0, 7, 0, 12, 10][c.pos]), t, dur: c.half * 0.6, a: 0.004, r: 0.06, vol: 0.045, type: 'sawtooth', cut: 700, cutEnd: 300, q: 2 });
      if (c.pos === 0 && c.bar % 2 === 0) suzu(c.g, c.d, t, 0.014);
      if ((c.bar === 0 || c.bar === 8) && c.pos === 0) crash(c.g, c.d, t, 0.05);
    },
  }),
  // ---- 幼馴染ルート「願い桜」（ハ短調・66）：真冬に一輪だけ咲く桜。オルゴールが幼い日の約束をなぞり、後半は弦とピアノが、届かない手を伸ばす
  sakura: song({
    A: [[C_.Cm, [[0, 75, 3], [3, 74, 1], [4, 72, 4]]], [C_.Ab, [[0, 72, 3], [3, 75, 1], [4, 80, 4]]], [C_.Eb, [[0, 79, 3], [3, 77, 1], [4, 75, 4]]], [C_.Bb, [[0, 74, 8]]],
        [C_.Cm, [[0, 75, 3], [3, 79, 1], [4, 84, 4]]], [C_.Fm, [[0, 84, 3], [3, 80, 1], [4, 77, 4]]], [C_.Ab, [[0, 75, 2], [2, 77, 2], [4, 79, 4]]], [C_.G7, [[0, 79, 8]]]],
    B: [[C_.Ab, [[0, 84, 4], [4, 80, 4]]], [C_.Eb, [[0, 82, 4], [4, 79, 4]]], [C_.Fm, [[0, 80, 4], [4, 84, 4]]], [C_.Cm, [[0, 79, 8]]],
        [C_.Ab, [[0, 84, 2], [2, 87, 2], [4, 86, 4]]], [C_.Bb, [[0, 84, 2], [2, 82, 2], [4, 77, 4]]], [C_.Eb, [[0, 79, 4], [4, 75, 4]]], [C_.G7, [[0, 74, 8]]]],
    leadA: { inst: 'box', oct: 12, vol: 0.038 },
    leadB: { inst: 'strings', vol: 0.022, dbl: { inst: 'piano', vol: 0.03 } },
    layer: (c, t) => {
      padAt(c, t, { vol: 0.01, cut: 1500, a: 0.8 });
      bassAt(c, t, { style: 'hold', vol: 0.04 });
      arpAt(c, t, [0, 2, 4, 1, 3, 4, 2, 3], 'harp', 0.012, 0);   // 3＋3＋2 の揺れ
      if (c.pos === 4 && Math.random() < 0.3) bell(c.g, c.d, mtof(pick([91, 94, 96])), t, 2.2, 0.012, 0.7, Math.random() - 0.5);   // 舞い落ちる花びら
    },
  }),
  // ---- 花冠の杯との戦い「花冠の杯」（ハ・フリギア・150）：聖杯そのものになった幼馴染。歪んだオルゴールと合唱、狂い咲く桜のように止まらない打楽器
  sakuraBoss: song({
    A: [[C_.Cm, [[0, 72, 1], [1, 73, 1], [2, 72, 2], [4, 79, 2], [6, 80, 2]]], [C_.Db, [[0, 80, 2], [2, 77, 2], [4, 73, 4]]], [C_.Cm, [[0, 75, 2], [2, 79, 2], [4, 84, 4]]], [C_.Bb, [[0, 82, 4], [4, 77, 4]]],
        [C_.Ab, [[0, 80, 2], [2, 84, 2], [4, 87, 4]]], [C_.Db, [[0, 85, 4], [4, 80, 4]]], [C_.Fm, [[0, 84, 2], [2, 80, 2], [4, 77, 4]]], [C_.G7, [[0, 79, 8]]]],
    B: [[C_.Ab, [[0, 87, 4], [4, 84, 4]]], [C_.Db, [[0, 85, 6], [6, 84, 2]]], [C_.Cm, [[0, 84, 4], [4, 79, 4]]], [C_.Cm, [[0, 75, 8]]],
        [C_.Fm, [[0, 77, 2], [2, 80, 2], [4, 84, 4]]], [C_.Db, [[0, 85, 4], [4, 89, 4]]], [C_.Ab, [[0, 87, 4], [4, 84, 4]]], [C_.G7, [[0, 83, 8]]]],
    leadA: { inst: 'box', oct: 12, vol: 0.034, dbl: { inst: 'choir', oct: -12, vol: 0.02 } },
    leadB: { inst: 'choir', vol: 0.028, dbl: { inst: 'strings', vol: 0.02 } },
    layer: (c, t) => {
      if ([0, 2, 3, 4, 6, 7].includes(c.pos)) drum(c.g, c.d, t, c.pos % 4 === 0 ? 0.26 : 0.15, 100, 40, 0.3);
      if (c.pos === 2 || c.pos === 6) snare(c.g, c.d, t, 0.09);
      hat(c.g, c.d, t, 0.022);
      if (c.pos % 2 === 0) voice(c.g, c.d, { f: mtof(c.ch.r - 12), t, dur: c.half * 0.8, a: 0.004, r: 0.08, vol: 0.05, type: 'sawtooth', cut: 650, cutEnd: 280, q: 2 });
      arpAt(c, t, [4, 3, 2, 1, 2, 3, 4, 3], 'box', 0.012, 24);
      if ((c.bar === 0 || c.bar === 8) && c.pos === 0) crash(c.g, c.d, t, 0.05);
    },
  }),
  // ---- 告白「月下の告白」（変ホ長調・68）：英霊・幼馴染・雫と、想いを確かめ合う夜。ピアノが言葉を探し、後半で弦とホルンが、言葉にならない想いを満たす
  confession: song({
    A: [[C_.Eb, [[0, 79, 4], [4, 82, 2], [6, 80, 2]]], [C_.Bb, [[0, 77, 6], [6, 74, 2]]], [C_.Cm, [[0, 75, 4], [4, 79, 4]]], [C_.Ab, [[0, 80, 6], [6, 79, 2]]],
        [C_.Eb, [[0, 79, 2], [2, 80, 2], [4, 82, 4]]], [C_.Bb, [[0, 86, 4], [4, 82, 4]]], [C_.Ab, [[0, 84, 4], [4, 80, 4]]], [C_.Bb, [[0, 82, 8]]]],
    B: [[C_.Ab, [[0, 84, 6], [6, 82, 2]]], [C_.Bb, [[0, 82, 6], [6, 79, 2]]], [C_.Gm, [[0, 79, 4], [4, 82, 4]]], [C_.Cm, [[0, 84, 8]]],
        [C_.Ab, [[0, 87, 4], [4, 84, 4]]], [C_.Bb, [[0, 86, 4], [4, 82, 4]]], [C_.Fm, [[0, 80, 4], [4, 84, 4]]], [C_.Bb, [[0, 82, 8]]]],
    leadA: { inst: 'piano', vol: 0.045 },
    leadB: { inst: 'strings', vol: 0.024, dbl: { inst: 'horn', oct: -12, vol: 0.014 } },
    layer: (c, t) => {
      padAt(c, t, { vol: c.B2 ? 0.013 : 0.009, cut: 1800, a: 0.8 });
      bassAt(c, t, { style: 'hold', vol: 0.042 });
      arpAt(c, t, [0, 2, 1, 3, 2, 1, 3, 2], 'piano', 0.011, 0);
    },
  }),
  // ---- 別れ「さよならの朝」（ニ長調・64）：消えていく英霊と、最後に交わす言葉。温かいのに、少しだけ胸が痛い。後半はチェロが、もう会えない人の背中を見送る
  farewell: song({
    A: [[C_.D, [[0, 78, 4], [4, 76, 2], [6, 74, 2]]], [C_.A, [[0, 73, 6], [6, 76, 2]]], [C_.Bm, [[0, 74, 4], [4, 78, 4]]], [C_.G, [[0, 79, 6], [6, 78, 2]]],
        [C_.D, [[0, 78, 2], [2, 79, 2], [4, 81, 4]]], [C_.Fsm, [[0, 81, 4], [4, 78, 4]]], [C_.G, [[0, 79, 4], [4, 76, 4]]], [C_.A, [[0, 76, 8]]]],
    B: [[C_.G, [[0, 83, 6], [6, 81, 2]]], [C_.A, [[0, 81, 6], [6, 78, 2]]], [C_.Fsm, [[0, 78, 4], [4, 81, 4]]], [C_.Bm, [[0, 83, 8]]],
        [C_.G, [[0, 86, 4], [4, 83, 4]]], [C_.A, [[0, 85, 4], [4, 81, 4]]], [C_.Em, [[0, 79, 4], [4, 83, 4]]], [C_.A, [[0, 81, 8]]]],
    leadA: { inst: 'piano', vol: 0.045 },
    leadB: { inst: 'cello', vol: 0.034, dbl: { inst: 'strings', oct: 12, vol: 0.014 } },
    layer: (c, t) => {
      padAt(c, t, { vol: 0.01, cut: 1700, a: 0.9 });
      bassAt(c, t, { style: 'hold', vol: 0.04 });
      arpAt(c, t, [0, null, 2, null, 1, null, 3, null], 'harp', 0.012, 12);
      if (c.bar === 15 && c.pos === 4) bell(c.g, c.d, mtof(86), t, 3, 0.02, 0.7);
    },
  }),
  // ---- 決戦前夜「屋根の上の誓い」（イ短調・70）：最後の戦いの前の、静かな夜。ホルンが覚悟を歌い、鼓動のような太鼓が、明日へ向けて少しずつ高まっていく
  eve: song({
    A: [[C_.Am, [[0, 69, 4], [4, 72, 2], [6, 76, 2]]], [C_.F, [[0, 77, 6], [6, 76, 2]]], [C_.C, [[0, 72, 4], [4, 79, 4]]], [C_.G, [[0, 79, 6], [6, 74, 2]]],
        [C_.Am, [[0, 76, 4], [4, 81, 4]]], [C_.F, [[0, 81, 4], [4, 77, 4]]], [C_.Dm, [[0, 74, 4], [4, 77, 4]]], [C_.E, [[0, 76, 8]]]],
    B: [[C_.F, [[0, 81, 6], [6, 79, 2]]], [C_.G, [[0, 79, 6], [6, 74, 2]]], [C_.C, [[0, 76, 4], [4, 79, 4]]], [C_.Am, [[0, 81, 8]]],
        [C_.F, [[0, 84, 4], [4, 81, 4]]], [C_.G, [[0, 83, 4], [4, 79, 4]]], [C_.Dm, [[0, 77, 4], [4, 81, 4]]], [C_.E, [[0, 80, 8]]]],
    leadA: { inst: 'horn', vol: 0.03 },
    leadB: { inst: 'strings', vol: 0.026, dbl: { inst: 'horn', oct: -12, vol: 0.016 } },
    layer: (c, t) => {
      padAt(c, t, { type: 'sawtooth', cut: 1000, vol: 0.009, a: 1.0, oct: -12 });
      bassAt(c, t, { style: 'half', vol: 0.04 });
      if (c.pos === 0) { drum(c.g, c.d, t, 0.06, 70, 40, 0.35); drum(c.g, c.d, t + c.half * 0.8, 0.035, 70, 40, 0.3); }
      if ((c.bar === 7 || c.bar === 15) && c.pos >= 4) snare(c.g, c.d, t, 0.02 + (c.pos - 4) * 0.012);   // 明日へ高まるロール
    },
  }),
};

let MUSIC = null, MUSIC_TIMER = null;
function bgmTick() {
  if (!MUSIC || !SND) return;
  if (SND.ctx.state !== 'running') return;
  MUSIC.scheduleUntil(SND.ctx.currentTime + 0.35);
}
// 今の場面にふさわしい曲調
//  場面が自分の曲調を持っていれば（SCENE.mood）それを使い、その続きの場面（結果の画面など）でも、行動の選択に戻るまで保つ
let MOOD_HOLD = null;
const MOOD_BY_SUB = { '天降の祟り': 'kagura', '願い桜': 'sakura', '終章　抑止': 'counter' };
const MOOD_BY_TITLE = { '胸騒ぎ': 'unease', '綻び': 'counter', '抑止の守護者': 'counter', '花冠の杯': 'sakuraBoss', '花還し': 'confession' };
function bgmMood() {
  const k = SCENE && SCENE.kind;
  if (!G || ['title', 'create', 'settings', 'gallery'].includes(k)) { MOOD_HOLD = null; return 'title'; }
  if (k === 'ending') { MOOD_HOLD = null; return SCENE.good ? 'dawn' : 'sorrow'; }
  if (SCENE && SCENE.battle && B) {
    MOOD_HOLD = null;
    if (B.opt && B.opt.kami) return 'kamiBattle';
    if (B.opt && B.opt.guardian) return 'guardian';
    if (B.opt && B.opt.sakura) return 'sakuraBoss';
    return B.final || B.boss || B.beast || B.enforcer ? 'final' : 'battle';
  }
  if (G.phase === 'epilogue') { MOOD_HOLD = null; return 'epilogue'; }
  if (G.phase === 'growth') { MOOD_HOLD = null; return SCENE && SCENE.mood === 'confession' ? 'confession' : 'growth'; }
  const own = SCENE && (SCENE.mood || MOOD_BY_SUB[SCENE.sub] || MOOD_BY_TITLE[SCENE.title]);
  if (own) { MOOD_HOLD = own; return own; }
  const hubScene = SCENE && (SCENE.title === '昼の行動' || SCENE.title === '夜の行動');
  if (hubScene) MOOD_HOLD = null;
  if (MOOD_HOLD) return MOOD_HOLD;
  if (G.phase === 'summon' || k === 'summon' || G.phase === 'end') return 'title';
  if (G.phase === 'war' && typeof counterOn === 'function' && counterOn()) return 'counter';   // 抑止の終章のあいだは、世界が綻び続けている
  if (G.phase === 'war' && typeof skOn === 'function' && skOn() && G.flags.skGone) return 'sakura';   // 幼馴染が桜の中へ消えた後
  return isNight() ? 'night' : 'day';
}
function bgmUpdate() {
  if (!CFG.bgm) { if (MUSIC) { MUSIC.fadeOut(1.2); MUSIC = null; } return; }
  const g = audioReady(); if (!g) return;
  const mood = bgmMood();
  if (MUSIC && MUSIC.mood === mood) return;
  if (MUSIC) MUSIC.fadeOut(2);
  MUSIC = new Music(g, mood); MUSIC.fadeIn(['battle', 'final', 'kamiBattle', 'guardian', 'sakuraBoss'].includes(MUSIC.mood) ? 0.8 : 2.5);
  if (!MUSIC_TIMER) MUSIC_TIMER = setInterval(bgmTick, 90);
  bgmTick();
}
// 音のON/OFFをまとめて切り替える（タイトル・上の帯のボタン）
function toggleAllSound() {
  const on = !(CFG.sound || CFG.bgm);
  CFG.sound = on; CFG.bgm = on; saveCfg(); applyVolume();
  if (on) { audioReady(); sfx('page'); }
  bgmUpdate();
}
const SPEAKER_SVG = on => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>${on ? '<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>'}</svg>`;

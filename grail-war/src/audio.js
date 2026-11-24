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
function hat(g, dest, t, vol = 0.03, pan = 0.2) { noiseHit(g, dest, { t, dur: 0.04, vol, f: 7500, ftype: 'highpass', pan }); }

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
  title:   { bpm: 56, bpc: 8, chords: [[50, 57, 62, 65], [46, 58, 62, 65], [53, 57, 60, 65], [48, 55, 60, 64]], scale: [62, 64, 65, 67, 69, 70, 72, 74, 76, 77],
             pad: { type: 'sawtooth', cut: 900, vol: 0.032 }, bass: { vol: 0.072 }, bell: { p: 0.22, vol: 0.043 } },
  growth:  { bpm: 80, bpc: 4, chords: [[53, 57, 60, 65], [48, 55, 60, 64], [50, 57, 62, 65], [46, 53, 58, 62]], scale: [72, 74, 76, 77, 79, 81, 84],
             pad: { type: 'triangle', cut: 1600, vol: 0.029 }, bass: { vol: 0.058 }, box: { vol: 0.032 } },
  day:     { bpm: 88, bpc: 4, chords: [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62]], scale: [69, 71, 72, 74, 76, 79, 81],
             pad: { type: 'triangle', cut: 1400, vol: 0.029 }, bass: { vol: 0.065 }, pluck: { vol: 0.038 }, shaker: 0.012 },
  night:   { bpm: 62, bpc: 8, chords: [[40, 55, 59, 64], [36, 55, 60, 64], [45, 57, 60, 64], [47, 54, 59, 63]], scale: [64, 66, 67, 71, 72, 75, 76],
             pad: { type: 'sawtooth', cut: 600, vol: 0.032 }, bass: { vol: 0.072 }, drone: true, bell: { p: 0.14, vol: 0.038, low: true }, pulse: 0.05 },
  battle:  { bpm: 138, gain: 0.95, score: (mu, t, st, half) => battleScore(mu, t, st, half) },   // 「命のやり取り、信念のぶつかり合い」
  final:   { bpm: 160, gain: 0.75, score: (mu, t, st, half) => finalScore(mu, t, st, half) },    // 「死ぬか、生きるか」
  dawn:    { bpm: 66, bpc: 8, chords: [[43, 55, 59, 62], [38, 54, 57, 62], [40, 55, 59, 64], [36, 55, 60, 64]], scale: [67, 69, 71, 74, 76, 78, 79, 83],
             pad: { type: 'triangle', cut: 2000, vol: 0.035 }, bass: { vol: 0.065 }, bell: { p: 0.3, vol: 0.043 } },
  sorrow:  { bpm: 54, bpc: 8, chords: [[45, 57, 60, 64], [41, 57, 60, 65], [38, 53, 57, 62], [40, 56, 59, 64]], scale: [69, 71, 72, 74, 76, 77, 80],
             pad: { type: 'sawtooth', cut: 700, vol: 0.029 }, bass: { vol: 0.065 }, piano: { p: 0.4, vol: 0.043 } },
  epilogue:{ bpm: 72, bpc: 8, chords: [[41, 53, 57, 60], [36, 52, 55, 60], [38, 53, 57, 62], [34, 53, 58, 62]], scale: [65, 67, 69, 72, 74, 77, 79],
             pad: { type: 'triangle', cut: 1800, vol: 0.032 }, bass: { vol: 0.058 }, box: { vol: 0.026 }, bell: { p: 0.15, vol: 0.029 } },
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

let MUSIC = null, MUSIC_TIMER = null;
function bgmTick() {
  if (!MUSIC || !SND) return;
  if (SND.ctx.state !== 'running') return;
  MUSIC.scheduleUntil(SND.ctx.currentTime + 0.35);
}
// 今の場面にふさわしい曲調
function bgmMood() {
  const k = SCENE && SCENE.kind;
  if (!G || ['title', 'create', 'settings', 'gallery'].includes(k)) return 'title';
  if (k === 'ending') return SCENE.good ? 'dawn' : 'sorrow';
  if (SCENE && SCENE.battle) return B && (B.final || B.boss || B.beast || B.enforcer) ? 'final' : 'battle';
  if (G.phase === 'epilogue') return 'epilogue';
  if (G.phase === 'growth') return 'growth';
  if (G.phase === 'summon' || k === 'summon' || G.phase === 'end') return 'title';
  return isNight() ? 'night' : 'day';
}
function bgmUpdate() {
  if (!CFG.bgm) { if (MUSIC) { MUSIC.fadeOut(1.2); MUSIC = null; } return; }
  const g = audioReady(); if (!g) return;
  const mood = bgmMood();
  if (MUSIC && MUSIC.mood === mood) return;
  if (MUSIC) MUSIC.fadeOut(2);
  MUSIC = new Music(g, mood); MUSIC.fadeIn(MUSIC.mood === 'battle' || MUSIC.mood === 'final' ? 0.8 : 2.5);
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

// 効果音 — 音声ファイルを使わず Web Audio API で合成する (Unity版には効果音の素材が無い)。
// ダークファンタジーの雰囲気に合わせ、電子音のような単純な波形は避けて
//   ・石造りの広間のような暗い残響 (生成したインパルス応答のリバーブ)
//   ・刃の風切り・鈍い打撃・金属の響き (倍音のずれた鐘の音)
//   ・属性ごとの質感 (炎のはぜ・氷の澄んだ響き・雷の裂ける音・闇の唸り…)
// を重ねて作る。毎回わずかに音程をずらし、同じ音の繰り返しに聞こえないようにする。
import { getSettings } from '../core/settings';
import type { ElementType } from '../core/types';

export type Sfx =
  | 'hit' | 'crit' | 'weak' | 'break' | 'heal' | 'miss' | 'select'
  | 'buff' | 'debuff' | 'defeat' | 'victory' | 'skill'
  | 'dot' | 'shield' | 'toll' | 'chime';

export interface SfxOptions {
  /** 攻撃の属性 (炎・氷などは質感の層を重ねる) */
  element?: ElementType;
  /** 魔法攻撃 (刃の風切りを鳴らさない) */
  magical?: boolean;
  /** 敵の爪・牙による物理攻撃 */
  claw?: boolean;
}

interface Bus { ctx: AudioContext; dry: GainNode; wet: GainNode; noise: AudioBuffer }

let bus: Bus | null = null;

function audio(): Bus | null {
  try {
    if (!bus) {
      const Ctor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      // 音割れを防ぐ軽いコンプレッサー → 出力
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      comp.connect(ctx.destination);
      const dry = ctx.createGain();
      dry.connect(comp);
      // 暗い広間の残響
      const verb = ctx.createConvolver();
      verb.buffer = hallImpulse(ctx);
      const wet = ctx.createGain();
      wet.gain.value = 0.9;
      wet.connect(verb).connect(comp);
      bus = { ctx, dry, wet, noise: whiteNoise(ctx) };
    }
    if (bus.ctx.state === 'suspended') void bus.ctx.resume();
    return bus;
  } catch {
    return null;
  }
}

/** 石造りの広間を思わせる、高域の落ちた長めの残響 */
function hallImpulse(ctx: AudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 2.6);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 3.4);
      // 1次のローパスで高域を削り、湿った暗い響きにする (時間とともにさらに暗く)
      const k = 0.42 - 0.3 * (i / len);
      lp += k * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * env * (i < ctx.sampleRate * 0.012 ? i / (ctx.sampleRate * 0.012) : 1);
    }
  }
  return buf;
}

function whiteNoise(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** 1回分の出力先 (dry と残響へ分ける) */
interface Out { b: Bus; node: GainNode }

function makeOut(b: Bus, vol: number, wet: number): Out {
  const node = b.ctx.createGain();
  node.gain.value = vol;
  node.connect(b.dry);
  const send = b.ctx.createGain();
  send.gain.value = wet;
  node.connect(send).connect(b.wet);
  return { b, node };
}

/** 立ち上がり → 指数減衰の音量カーブ */
function envelope(g: GainNode, at: number, attack: number, dur: number, peak: number): void {
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(attack + 0.01, dur));
}

/** 周波数を変化させながら鳴らす単音 (cutoff を渡すとローパスを通す) */
function tone(
  o: Out, at: number, dur: number, type: OscillatorType, from: number, to: number,
  gain = 1, attack = 0.004, cutoff?: number, detune = 0,
): void {
  const a = o.b.ctx;
  const osc = a.createOscillator();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + dur);
  const g = a.createGain();
  envelope(g, at, attack, dur, gain);
  let src: AudioNode = osc;
  if (cutoff) {
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    f.Q.value = 0.7;
    src = osc.connect(f);
  }
  src.connect(g).connect(o.node);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/** フィルタを通したノイズ (打撃・風切り・破砕・炎) */
function noise(
  o: Out, at: number, dur: number, filter: BiquadFilterType, freqFrom: number, freqTo: number,
  gain = 1, q = 1, attack = 0.002,
): void {
  const a = o.b.ctx;
  const src = a.createBufferSource();
  src.buffer = o.b.noise;
  const f = a.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(freqFrom, at);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), at + dur);
  const g = a.createGain();
  envelope(g, at, attack, dur, gain);
  src.connect(f).connect(g).connect(o.node);
  // 毎回ノイズの違う場所から鳴らす
  src.start(at, Math.random() * 1.5);
  src.stop(at + dur + 0.05);
}

/** 倍音のずれた鐘・金属の響き */
function bell(o: Out, at: number, freq: number, dur: number, gain = 0.3): void {
  const partials: [number, number, number][] = [   // [倍率, 音量, 減衰の速さ]
    [1, 1, 1], [2.0, 0.5, 0.8], [2.76, 0.45, 0.6], [5.4, 0.25, 0.4], [8.93, 0.12, 0.25],
  ];
  for (const [ratio, amp, decay] of partials) {
    tone(o, at, dur * decay, 'sine', freq * ratio, freq * ratio * 0.998, gain * amp, 0.002);
  }
}

/** ゆっくり立ち上がる和音 (金管・合唱のような厚み) */
function pad(o: Out, at: number, freqs: number[], dur: number, gain: number, type: OscillatorType, cutoff: number, attack = 0.12): void {
  for (const f of freqs) {
    tone(o, at, dur, type, f, f, gain, attack, cutoff, -6);
    tone(o, at, dur, type, f, f, gain * 0.8, attack, cutoff, 7);
  }
}

/** 短いはぜ音を散らす (炎・破片) */
function crackles(o: Out, at: number, span: number, count: number, lo: number, hi: number, gain: number): void {
  for (let i = 0; i < count; i++) {
    const t = at + Math.random() * span;
    const f = lo + Math.random() * (hi - lo);
    noise(o, t, 0.012 + Math.random() * 0.02, 'bandpass', f, f * 0.8, gain * (0.5 + Math.random() * 0.5), 2.5);
  }
}

/** ±4% の揺らぎ */
const vary = (): number => 0.96 + Math.random() * 0.08;

/** 属性ごとの質感の層 (heavy は会心・弱点で厚くする) */
function elementLayer(o: Out, t: number, el: ElementType | undefined, heavy: boolean): boolean {
  const v = vary();
  switch (el) {
    case 'Fire':
      noise(o, t, 0.45, 'lowpass', 2400, 300, 0.7, 0.8, 0.01);   // ごうっと燃え上がる
      crackles(o, t + 0.02, 0.4, heavy ? 14 : 9, 1800, 5200, 0.5);
      tone(o, t, 0.3, 'sine', 95 * v, 45, 0.6);
      return true;
    case 'Ice':
      bell(o, t, 1760 * v, 0.55, heavy ? 0.26 : 0.2);
      bell(o, t + 0.03, 2490 * v, 0.4, 0.12);
      noise(o, t, 0.3, 'highpass', 7000, 4000, 0.5, 1, 0.005);      // きらめく霜
      noise(o, t, 0.08, 'bandpass', 3200, 1500, 1.0, 3);            // 砕ける音
      tone(o, t, 0.16, 'sine', 160 * v, 60, 0.5);
      return true;
    case 'Lightning':
      noise(o, t, 0.03, 'highpass', 3000, 2000, 1.1);               // 裂ける
      tone(o, t, 0.12, 'sawtooth', 2400 * v, 90, 0.25, 0.001, 5000);
      noise(o, t + 0.02, 0.9, 'lowpass', 260, 60, 0.8, 0.7, 0.04);  // 遠雷
      crackles(o, t, 0.12, 6, 3000, 7000, 0.6);
      return true;
    case 'Wind':
      noise(o, t, 0.38, 'bandpass', 500, 3200, 1.5, 4, 0.06);       // 鋭い風
      noise(o, t + 0.08, 0.3, 'bandpass', 2600, 700, 1.0, 5, 0.03);
      tone(o, t + 0.05, 0.16, 'sine', 150 * v, 60, 0.45);
      return true;
    case 'Dark':
      tone(o, t, 0.6, 'sawtooth', 72 * v, 38, 0.5, 0.02, 380);      // 唸り
      tone(o, t, 0.6, 'sine', 55 * v, 52, 0.5, 0.02);
      tone(o, t, 0.6, 'sine', 58 * v, 54, 0.4, 0.02);               // うねり (わずかにずらす)
      noise(o, t, 0.5, 'lowpass', 900, 120, 0.5, 1, 0.03);
      return true;
    case 'Light':
      bell(o, t, 1318 * v, 0.7, 0.12);
      bell(o, t + 0.04, 1975 * v, 0.6, 0.08);
      noise(o, t, 0.35, 'highpass', 6000, 9000, 0.25, 1, 0.02);
      tone(o, t, 0.15, 'sine', 220, 110, 0.4);
      return true;
    case 'Poison':
    case 'Bleed':
      noise(o, t, 0.2, 'bandpass', 900, 260, 0.7, 4);               // 湿った音
      tone(o, t, 0.18, 'sine', 210 * v, 80, 0.4);
      return true;
    default:
      return false;
  }
}

/** 物理の打撃 (刃の風切り + 鈍い衝撃) */
function physicalHit(o: Out, t: number, heavy: boolean, claw: boolean): void {
  const v = vary();
  if (claw) {
    // 爪・牙: ざらついた引っかきを3本
    for (let i = 0; i < 3; i++) noise(o, t + i * 0.035, 0.07, 'bandpass', 3400 * v, 1200, 0.55, 3);
  } else {
    noise(o, t, 0.07, 'bandpass', 3800 * v, 900, 0.45, 1.5, 0.02);   // 風切り
  }
  const hitAt = t + 0.02;
  noise(o, hitAt, heavy ? 0.16 : 0.1, 'lowpass', 1100, 180, heavy ? 1.0 : 0.8);  // 打撃
  tone(o, hitAt, heavy ? 0.28 : 0.16, 'sine', (heavy ? 120 : 150) * v, heavy ? 34 : 48, heavy ? 1.0 : 0.85);
}

export function playSfx(kind: Sfx, opts: SfxOptions = {}): void {
  const vol = getSettings().sfxVolume;
  if (vol <= 0) return;
  const b = audio();
  if (!b) return;
  const t = b.ctx.currentTime + 0.01;
  const v = vary();
  const out = (wet: number, level = 1) => makeOut(b, vol * 0.75 * level, wet);
  const elemental = opts.element && !['None', 'Physical'].includes(opts.element);

  switch (kind) {
    case 'hit': {
      const o = out(0.18);
      if (!opts.magical) physicalHit(o, t, false, !!opts.claw);
      if (!(elemental && elementLayer(o, t, opts.element, false)) && opts.magical) {
        // 無属性の魔法: 低い衝撃と短いうねり
        tone(o, t, 0.25, 'sine', 140 * v, 50, 0.8);
        noise(o, t, 0.2, 'bandpass', 700, 200, 0.5, 2);
      }
      break;
    }
    case 'crit': {
      const o = out(0.32);
      if (!opts.magical) physicalHit(o, t, true, !!opts.claw);
      else tone(o, t, 0.3, 'sine', 110 * v, 36, 1.0);
      if (elemental) elementLayer(o, t, opts.element, true);
      bell(o, t + 0.01, 520 * v, 0.7, 0.2);          // 刃が骨まで届いた金属の響き
      noise(o, t, 0.05, 'highpass', 5000, 3000, 0.5);
      break;
    }
    case 'weak': {
      const o = out(0.38);
      if (!opts.magical) physicalHit(o, t, false, !!opts.claw);
      if (!(elemental && elementLayer(o, t, opts.element, true)) && opts.magical) tone(o, t, 0.25, 'sine', 140 * v, 50, 0.8);
      // 弱点を突いた手応え: 低く澄んだ鐘
      bell(o, t + 0.04, 294 * v, 1.1, 0.22);
      bell(o, t + 0.04, 441 * v, 0.8, 0.1);
      break;
    }
    case 'break': {
      const o = out(0.5);
      crackles(o, t, 0.28, 16, 2800, 8500, 0.8);            // 盾が砕け散る
      noise(o, t, 0.4, 'highpass', 6000, 2500, 0.6, 1, 0.004);
      bell(o, t, 880 * v, 0.6, 0.14);
      bell(o, t + 0.02, 1244 * v, 0.5, 0.1);
      tone(o, t, 0.8, 'sine', 70, 28, 1.0, 0.004);           // 重い衝撃
      noise(o, t, 0.5, 'lowpass', 500, 60, 0.8);
      break;
    }
    case 'heal': {
      const o = out(0.6);
      // 澄んだ五度の和音がふわりと立ち上がる
      [587, 880, 1318].forEach((f, i) => tone(o, t + i * 0.06, 0.9, 'sine', f * v, f * v, 0.13, 0.08));
      noise(o, t, 0.6, 'highpass', 7000, 9000, 0.12, 1, 0.15);
      break;
    }
    case 'miss': {
      const o = out(0.2, 1.6);
      noise(o, t, 0.26, 'bandpass', 450, 2600, 0.5, 2.5, 0.08);   // 空を切る
      break;
    }
    case 'select': {
      const o = out(0.08, 2.4);
      // 石を軽く打つような控えめな音 (電子音のピッではなく)
      noise(o, t, 0.035, 'bandpass', 2200 * v, 1400, 0.45, 1.8);
      tone(o, t, 0.12, 'triangle', 330 * v, 290, 0.16, 0.002, 1600);
      break;
    }
    case 'buff': {
      const o = out(0.55);
      noise(o, t, 0.5, 'bandpass', 380, 2600, 0.4, 6, 0.18);      // 力が満ちる
      tone(o, t + 0.05, 0.55, 'sine', 440 * v, 440 * v, 0.12, 0.12);
      tone(o, t + 0.12, 0.5, 'sine', 659 * v, 659 * v, 0.1, 0.12);
      break;
    }
    case 'debuff': {
      const o = out(0.45);
      // 三全音で沈み込む不穏な音
      tone(o, t, 0.5, 'sawtooth', 320 * v, 120, 0.22, 0.02, 900);
      tone(o, t, 0.5, 'sawtooth', 226 * v, 85, 0.18, 0.02, 700);
      noise(o, t, 0.4, 'lowpass', 1200, 200, 0.3, 1, 0.05);
      break;
    }
    case 'dot': {
      const o = out(0.2, 2.0);
      noise(o, t, 0.16, 'bandpass', 700 * v, 240, 0.5, 4);
      tone(o, t, 0.14, 'sine', 180 * v, 90, 0.25);
      break;
    }
    case 'shield': {
      const o = out(0.3, 0.8);
      bell(o, t, 1480 * v, 0.2, 0.1);
      noise(o, t, 0.04, 'highpass', 4500, 3000, 0.4);
      break;
    }
    case 'defeat': {
      const o = out(0.55);
      // 崩れ落ち、塵になって消える
      tone(o, t, 0.8, 'sine', 95 * v, 30, 0.9, 0.004);
      noise(o, t, 1.0, 'lowpass', 1400, 90, 0.6, 1, 0.03);
      tone(o, t + 0.1, 0.7, 'sine', 880 * v, 260, 0.06, 0.08);   // 抜けていく魂
      break;
    }
    case 'victory': {
      const o = out(0.55, 0.85);
      // 低い一打のあと、短調から長調へ解決する金管のような和音
      tone(o, t, 0.45, 'sine', 80, 38, 0.9);
      noise(o, t, 0.25, 'lowpass', 700, 120, 0.6);
      pad(o, t + 0.08, [147, 220, 349], 0.7, 0.05, 'sawtooth', 1100, 0.08);           // Dm
      pad(o, t + 0.62, [147, 220, 294, 370], 1.9, 0.05, 'sawtooth', 1500, 0.14);      // D
      bell(o, t + 0.62, 1175, 1.6, 0.06);
      break;
    }
    case 'skill': {
      const o = out(0.4);
      // 力を溜める: 渦巻くように高まる
      noise(o, t, 0.4, 'bandpass', 280, 1700, 0.45, 5, 0.28);
      tone(o, t, 0.4, 'sine', 196 * v, 392 * v, 0.1, 0.25);
      break;
    }
    case 'toll': {
      const o = out(0.7);
      // 弔いの鐘
      bell(o, t, 98, 3.2, 0.5);
      bell(o, t + 1.6, 92.5, 3.2, 0.4);
      break;
    }
    case 'chime': {
      const o = out(0.55, 0.8);
      bell(o, t, 1046 * v, 1.0, 0.1);
      bell(o, t + 0.12, 1568 * v, 1.0, 0.08);
      break;
    }
  }
}

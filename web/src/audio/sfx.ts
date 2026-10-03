// 効果音 — 音声ファイルを使わず Web Audio API で合成する。
// 素材が無くても戦闘の手触りを出せるようにするための最小限の音。
import { getSettings } from '../core/settings';

export type Sfx =
  | 'hit' | 'crit' | 'weak' | 'break' | 'heal' | 'miss' | 'select'
  | 'buff' | 'debuff' | 'defeat' | 'victory' | 'skill';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** 周波数を変化させながら鳴らす単音 */
function tone(
  a: AudioContext, out: AudioNode, at: number, dur: number,
  type: OscillatorType, from: number, to: number, gain = 1,
): void {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + dur);
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** フィルタを通したノイズ (打撃・破砕・風切り音) */
function noise(
  a: AudioContext, out: AudioNode, at: number, dur: number,
  filter: BiquadFilterType, freqFrom: number, freqTo: number, gain = 1,
): void {
  const len = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freqFrom, at);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), at + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(at);
  src.stop(at + dur + 0.02);
}

export function playSfx(kind: Sfx): void {
  const vol = getSettings().sfxVolume;
  if (vol <= 0) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime + 0.005;
  const out = a.createGain();
  out.gain.value = vol * 0.45;
  out.connect(a.destination);

  switch (kind) {
    case 'hit':
      noise(a, out, t, 0.07, 'bandpass', 1400, 700, 0.9);
      tone(a, out, t, 0.09, 'sine', 140, 60, 0.8);
      break;
    case 'crit':
      noise(a, out, t, 0.09, 'bandpass', 1800, 800, 1);
      tone(a, out, t, 0.1, 'sine', 160, 55, 0.9);
      tone(a, out, t + 0.02, 0.12, 'square', 1200, 600, 0.25);
      break;
    case 'weak':
      noise(a, out, t, 0.07, 'bandpass', 1400, 700, 0.9);
      tone(a, out, t, 0.09, 'sine', 140, 60, 0.8);
      tone(a, out, t + 0.03, 0.14, 'triangle', 600, 1300, 0.35);
      break;
    case 'break':
      noise(a, out, t, 0.35, 'highpass', 5000, 2500, 0.8);
      tone(a, out, t, 0.3, 'sawtooth', 900, 180, 0.3);
      tone(a, out, t + 0.05, 0.25, 'triangle', 1500, 700, 0.25);
      break;
    case 'heal':
      tone(a, out, t, 0.18, 'sine', 660, 670, 0.4);
      tone(a, out, t + 0.09, 0.22, 'sine', 990, 1000, 0.35);
      break;
    case 'miss':
      noise(a, out, t, 0.16, 'bandpass', 400, 2200, 0.5);
      break;
    case 'select':
      tone(a, out, t, 0.05, 'sine', 520, 540, 0.35);
      break;
    case 'buff':
      tone(a, out, t, 0.2, 'triangle', 440, 900, 0.35);
      break;
    case 'debuff':
      tone(a, out, t, 0.22, 'triangle', 480, 200, 0.35);
      break;
    case 'defeat':
      noise(a, out, t, 0.3, 'lowpass', 800, 150, 0.6);
      tone(a, out, t, 0.4, 'sine', 220, 45, 0.6);
      break;
    case 'victory':
      [523, 659, 784, 1046].forEach((f, i) => tone(a, out, t + i * 0.1, 0.22, 'triangle', f, f, 0.35));
      break;
    case 'skill':
      noise(a, out, t, 0.12, 'bandpass', 600, 1800, 0.35);
      tone(a, out, t, 0.12, 'sine', 300, 620, 0.25);
      break;
  }
}

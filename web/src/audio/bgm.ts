// BGM — public/assets/audio/<key>.mp3 を置くと再生される (無ければ無音のまま)。
// Phaser のサウンドマネージャはゲーム全体で共有なので、シーンをまたいで同じ曲を
// 流し続け、曲が変わるときだけ切り替える。
// 曲は起動時にまとめて読まず、初めて流すときに読み込む (全曲だと数十MBになり起動が遅くなるため)。
import Phaser from 'phaser';
import { getSettings } from '../core/settings';
import { bgmKey, BGM_ART, MISSING_ART } from '../data/assets';

let current: Phaser.Sound.BaseSound | null = null;
let currentKey = '';
/** いま流したい曲 (読み込み中に別の曲へ切り替わったら、読み終えても流さない) */
let wantedKey = '';
const loading = new Set<string>();

/** 曲の切り替え (Unity版 AudioManager のクロスフェード相当)。消える側・入る側の時間 */
const FADE_OUT_MS = 700;
const FADE_IN_MS = 900;
/** ループのつなぎ目で、曲の最後を冒頭に重ねる長さ (秒) */
const LOOP_CROSSFADE_SEC = 2;
/** これより小さい音は無音とみなす (約 -50dBFS) */
const SILENCE = 0.003;

const urlOf = (k: string): string | undefined => BGM_ART[k.replace(/^bgm_/, '')];

/** 曲を切り替える。候補を並べると、置かれている最初の曲を流す (どれも無ければ無音) */
export function playBgm(scene: Phaser.Scene, key: string | string[] | null): void {
  const keys = key === null ? [] : Array.isArray(key) ? key : [key];
  const k = keys.map(bgmKey).find((c) => !MISSING_ART.has(c) && !!urlOf(c)) ?? '';
  wantedKey = k;
  if (k && k === currentKey && current?.isPlaying) return;
  fadeOutCurrent();
  if (!k) return;
  const sound = scene.sound;
  if (scene.cache.audio.exists(k)) { start(sound, k); return; }
  if (loading.has(k)) return;   // 読み終えたときに wantedKey を見て流す
  loading.add(k);
  void loadTrack(scene.game, k).then((ok) => {
    loading.delete(k);
    if (!ok) { MISSING_ART.add(k); return; }
    if (wantedKey === k && currentKey !== k) {
      fadeOutCurrent();
      start(sound, k);
    }
  });
}

/** 今の曲を小さくしながら止める */
function fadeOutCurrent(): void {
  const old = current;
  current = null;
  currentKey = '';
  if (!old) return;
  fadeVolume(old, volumeOf(old), 0, FADE_OUT_MS, () => { old.stop(); old.destroy(); });
}

function start(sound: Phaser.Sound.BaseSoundManager, k: string): void {
  const snd = sound.add(k, { loop: true, volume: 0 });
  snd.play();
  current = snd;
  currentKey = k;
  fadeVolume(snd, 0, getSettings().bgmVolume, FADE_IN_MS);
}

const volumeOf = (snd: Phaser.Sound.BaseSound): number => (snd as Phaser.Sound.WebAudioSound).volume ?? 0;

/** 音量をなめらかに変える (シーンの切り替えに左右されないよう、タイマーで動かす) */
function fadeVolume(snd: Phaser.Sound.BaseSound, from: number, to: number, ms: number, done?: () => void): void {
  const t0 = performance.now();
  const step = () => {
    const t = Math.min(1, (performance.now() - t0) / ms);
    // 途中で別の曲に切り替わった・音量設定が変わった場合でも、最後の値で止まる
    if ((snd as { pendingRemove?: boolean }).pendingRemove) return;
    (snd as Phaser.Sound.WebAudioSound).setVolume(from + (to - from) * t);
    if (t < 1) setTimeout(step, 40);
    else done?.();
  };
  step();
}

/** 1曲読み込んで音声キャッシュに入れる (シーンの切り替えに左右されないよう、ローダーを使わず直接読む) */
async function loadTrack(game: Phaser.Game, k: string): Promise<boolean> {
  const url = urlOf(k);
  const ctx = (game.sound as Phaser.Sound.WebAudioSoundManager).context;
  if (!url || !ctx) return false;
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
    game.cache.audio.add(k, makeLoopable(ctx, buffer));
    return true;
  } catch {
    return false;
  }
}

/** 繰り返しのつなぎ目を目立たなくする。
 *  AI で作った曲はフェードアウトや無音で終わったり、盛り上がったまま切れたりするため、
 *  冒頭と末尾の無音を削り、曲の最後の数秒を冒頭に重ねて (等パワーのクロスフェード) 輪にする */
export function makeLoopable(ctx: BaseAudioContext, src: AudioBuffer): AudioBuffer {
  const sr = src.sampleRate, n = src.length, chs = src.numberOfChannels;
  const data = Array.from({ length: chs }, (_, c) => src.getChannelData(c));
  const silent = (i: number) => data.every((a) => Math.abs(a[i]) < SILENCE);
  let lead = 0;
  while (lead < n && silent(lead)) lead++;
  let tail = n - 1;
  while (tail > lead && silent(tail)) tail--;
  const len = tail - lead + 1;
  const x = Math.min(Math.floor(LOOP_CROSSFADE_SEC * sr), Math.floor(len / 4));
  if (len < sr * 4 || x <= 0) return src;   // 短すぎる音はそのまま
  const outLen = len - x;
  const out = ctx.createBuffer(chs, outLen, sr);
  for (let c = 0; c < chs; c++) {
    const a = data[c], o = out.getChannelData(c);
    o.set(a.subarray(lead, lead + outLen));
    // 冒頭 x サンプルに、削った末尾 x サンプルを重ねる。o の最後 → o[0] が元の曲どおり続く
    for (let i = 0; i < x; i++) {
      const t = (i / x) * Math.PI / 2;
      o[i] = a[lead + i] * Math.sin(t) + a[lead + outLen + i] * Math.cos(t);
    }
  }
  return out;
}

/** 設定変更時に再生中の曲の音量を反映する */
export function applyBgmVolume(): void {
  if (current && 'setVolume' in current) {
    (current as Phaser.Sound.WebAudioSound).setVolume(getSettings().bgmVolume);
  }
}

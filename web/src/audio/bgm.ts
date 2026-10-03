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

const urlOf = (k: string): string | undefined => BGM_ART[k.replace(/^bgm_/, '')];

/** 曲を切り替える。候補を並べると、置かれている最初の曲を流す (どれも無ければ無音) */
export function playBgm(scene: Phaser.Scene, key: string | string[] | null): void {
  const keys = key === null ? [] : Array.isArray(key) ? key : [key];
  const k = keys.map(bgmKey).find((c) => !MISSING_ART.has(c) && !!urlOf(c)) ?? '';
  wantedKey = k;
  if (k && k === currentKey && current?.isPlaying) return;
  current?.stop();
  current?.destroy();
  current = null;
  currentKey = '';
  if (!k) return;
  const sound = scene.sound;
  if (scene.cache.audio.exists(k)) { start(sound, k); return; }
  if (loading.has(k)) return;   // 読み終えたときに wantedKey を見て流す
  loading.add(k);
  void loadTrack(scene.game, k).then((ok) => {
    loading.delete(k);
    if (!ok) { MISSING_ART.add(k); return; }
    if (wantedKey === k && currentKey !== k) {
      current?.stop();
      current?.destroy();
      start(sound, k);
    }
  });
}

function start(sound: Phaser.Sound.BaseSoundManager, k: string): void {
  current = sound.add(k, { loop: true, volume: getSettings().bgmVolume });
  current.play();
  currentKey = k;
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
    game.cache.audio.add(k, buffer);
    return true;
  } catch {
    return false;
  }
}

/** 設定変更時に再生中の曲の音量を反映する */
export function applyBgmVolume(): void {
  if (current && 'setVolume' in current) {
    (current as Phaser.Sound.WebAudioSound).setVolume(getSettings().bgmVolume);
  }
}

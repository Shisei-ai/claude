// BGM — public/assets/audio/<key>.mp3 を置くと再生される (無ければ無音のまま)。
// Phaser のサウンドマネージャはゲーム全体で共有なので、シーンをまたいで同じ曲を
// 流し続け、曲が変わるときだけ切り替える。
import Phaser from 'phaser';
import { getSettings } from '../core/settings';
import { bgmKey, MISSING_ART } from '../data/assets';

let current: Phaser.Sound.BaseSound | null = null;
let currentKey = '';

/** 曲を切り替える。ファイルが無い曲なら今の曲を止めて無音にする */
export function playBgm(scene: Phaser.Scene, key: string | null): void {
  const k = key ? bgmKey(key) : '';
  if (k && k === currentKey && current?.isPlaying) return;
  current?.stop();
  current?.destroy();
  current = null;
  currentKey = '';
  if (!k || MISSING_ART.has(k) || !scene.cache.audio.exists(k)) return;
  current = scene.sound.add(k, { loop: true, volume: getSettings().bgmVolume });
  current.play();
  currentKey = k;
}

/** 設定変更時に再生中の曲の音量を反映する */
export function applyBgmVolume(): void {
  if (current && 'setVolume' in current) {
    (current as Phaser.Sound.WebAudioSound).setVolume(getSettings().bgmVolume);
  }
}

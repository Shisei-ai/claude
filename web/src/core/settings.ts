// ゲーム設定 (音量・戦闘速度)。ブラウザごとに localStorage へ保存する。
// 保存に失敗しても (プライベートブラウズ等) 既定値で動くようにする。

export interface Settings {
  bgmVolume: number;    // 0〜1
  sfxVolume: number;    // 0〜1
  battleSpeed: number;  // 戦闘演出の速さ (BATTLE_SPEEDS のいずれか)
}

export const BATTLE_SPEEDS = [1, 1.5, 2, 3];

const KEY = 'dc_settings_v1';
const DEFAULTS: Settings = { bgmVolume: 0.6, sfxVolume: 0.7, battleSpeed: 1 };

let cache: Settings | null = null;

export function getSettings(): Settings {
  if (cache) return cache;
  let loaded: Partial<Settings> = {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) loaded = JSON.parse(raw) as Partial<Settings>;
  } catch { /* 既定値を使う */ }
  cache = { ...DEFAULTS, ...loaded };
  if (!BATTLE_SPEEDS.includes(cache.battleSpeed)) cache.battleSpeed = 1;
  return cache;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  cache = { ...getSettings(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* 保存できなくても続行 */ }
  return cache;
}

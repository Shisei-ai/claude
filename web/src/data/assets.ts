// 画像アセット定義 — public/assets/ 配下のPNGを参照する。
//
// ● 画像は段階的に追加できる。ここに宣言しても実ファイルが未配置なら
//   PreloadScene の loaderror で握りつぶし、その枠は従来の矩形描画に
//   自動フォールバックする (ゲームは落ちない)。
// ● 透過PNGを推奨 (キャラ・敵は背景を切り抜いた立ち絵)。
// ● 配置パスは vite の public/ 起点。dev では '/assets/…'、build では
//   dist/assets/… にそのままコピーされる (base:'./' 相対解決)。

export interface CharArt {
  full?: string;      // 立ち絵 / バトルスプライト (縦長・全身)
  portrait?: string;  // 顔グラ (正方・バストアップ)
}

/** キャラクターID → 画像パス */
export const CHARACTER_ART: Record<string, CharArt> = {
  // ベルンハルト
  bernhard: {},
  // ラヴィニア
  lavinia: {},
  // アッシュ・レイヴン
  ash: {
    full: 'assets/characters/ash_full.png',
    portrait: 'assets/characters/ash_portrait.png',
  },
  // リリア
  lilia: {},
  // ゼノ
  zeno: {},
};

/** 敵ID (EnemyDef.id) → 立ち絵パス。未宣言の敵は tint 矩形のまま。 */
export const ENEMY_ART: Record<string, string> = {
  // 例: f0n_goblin: 'assets/enemies/f0n_goblin.png',
};

/** 背景キー → パス。未宣言の背景は従来の単色板のまま。 */
export const BG_ART: Record<string, string> = {
  // 例: floor0: 'assets/bg/floor0.png',
};

// ── テクスチャキー命名 (シーン側から参照) ──────────────────────────────
export const charFullKey = (id: string): string => `char_${id}_full`;
export const charPortraitKey = (id: string): string => `char_${id}_portrait`;
export const enemyArtKey = (id: string): string => `enemy_${id}`;
export const bgArtKey = (key: string): string => `bg_${key}`;

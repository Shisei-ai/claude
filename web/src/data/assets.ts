// 画像アセット定義 — public/assets/ 配下のPNGを参照する。
//
// ● 画像は段階的に追加できる。ここに宣言しても実ファイルが未配置なら
//   PreloadScene の loaderror で握りつぶし、その枠は従来の矩形描画に
//   自動フォールバックする (ゲームは落ちない)。
// ● 透過PNGを推奨 (キャラ・敵は背景を切り抜いた立ち絵)。
// ● 配置パスは vite の public/ 起点。dev では '/assets/…'、build では
//   dist/assets/… にそのままコピーされる (base:'./' 相対解決)。

import type Phaser from 'phaser';

// ── ロード失敗 (=未配置) の記録と存在チェック ─────────────────────────
/** 読み込みに失敗した (ファイル未配置の) テクスチャキー。PreloadScene が登録。 */
export const MISSING_ART = new Set<string>();

/** そのキーの画像が使用可能か (ロード済み かつ 失敗記録なし) */
export function hasArt(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key) && !MISSING_ART.has(key);
}

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

/** 全41体の敵ID (EnemyDef.id)。各層 通常4+エリート4+ボス1 = 各9体 ×4層
 *  + 最終層エンディングボス5体。ファイル名は <id>.png で揃える。 */
const ENEMY_IDS: string[] = [
  // 第1層 廃墟の回廊
  'f0n_goblin', 'f0n_zombie', 'f0n_skel_archer', 'f0n_undead_mage',
  'f0e_garm', 'f0e_sorcerer', 'f0e_chain_soldier', 'f0e_rambard', 'f0b_morva',
  // 第2層 暗黒の森
  'f1n_dark_wolf', 'f1n_spore_fungus', 'f1n_forest_sprite', 'f1n_entangling_vine',
  'f1e_raxen', 'f1e_medium', 'f1e_shadow_spirit', 'f1e_nagul', 'f1b_griselda',
  // 第3層 呪われた城
  'f2n_cursed_guard', 'f2n_blood_bat', 'f2n_castle_wraith', 'f2n_executioner',
  'f2e_galen', 'f2e_ferna', 'f2e_familiar', 'f2e_velmon', 'f2b_sanguina',
  // 第4層 古代遺跡の回廊
  'f3n_stone_soldier', 'f3n_sand_serpent', 'f3n_sealed_wraith', 'f3n_giant_soldier',
  'f3e_grom', 'f3e_farun', 'f3e_seal_guardian', 'f3e_vorga', 'f3b_valgott',
  // 最終層 エンディングボス (証印による分岐)
  'f4b_demon_king', 'f4b_abyss_god', 'f4b_time_wraith', 'f4b_cursed_king', 'f4b_true_core',
];

/** 敵ID → 立ち絵パス。ファイルが無い敵は tint 矩形へ自動フォールバック。 */
export const ENEMY_ART: Record<string, string> = Object.fromEntries(
  ENEMY_IDS.map((id) => [id, `assets/enemies/${id}.png`]),
);

/** 背景キー (=ファイル名の語幹)。ファイルが無い背景は従来の単色板へ自動フォールバック。 */
const BG_KEYS: string[] = [
  // 戦闘背景 (フロアテーマ別・マップ探索にも流用)
  'floor0', 'floor1', 'floor2', 'floor3',
  // 最終層アリーナ (エンディング5分岐の戦闘背景)
  'arena_demon_king', 'arena_abyss_god', 'arena_time_wraith', 'arena_cursed_king', 'arena_true_core',
  // ノードイベント
  'event_rest', 'event_shop', 'event_treasure', 'event_cursed', 'event_unknown',
  // メニュー / システム
  'title', 'charselect', 'meta', 'panel',
  // エンディング一枚絵
  'ending_demon_king', 'ending_abyss_god', 'ending_time_wraith', 'ending_cursed_king', 'ending_true_core',
];

/** 背景キー → パス。 */
export const BG_ART: Record<string, string> = Object.fromEntries(
  BG_KEYS.map((k) => [k, `assets/bg/${k}.png`]),
);

/** EndingType → アリーナ/一枚絵のファイル語幹 */
export const ENDING_BG_STEM: Record<string, string> = {
  DemonKing: 'demon_king', AbyssGod: 'abyss_god', TimeWraith: 'time_wraith',
  CursedKing: 'cursed_king', TrueCore: 'true_core',
};

// ── テクスチャキー命名 (シーン側から参照) ──────────────────────────────
export const charFullKey = (id: string): string => `char_${id}_full`;
export const charPortraitKey = (id: string): string => `char_${id}_portrait`;
export const enemyArtKey = (id: string): string => `enemy_${id}`;
export const bgArtKey = (key: string): string => `bg_${key}`;

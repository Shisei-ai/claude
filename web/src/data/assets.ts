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

/** プレイアブルキャラID。ファイル名は <id>_full.png / <id>_portrait.png で揃える。 */
const CHARACTER_IDS: string[] = ['bernhard', 'lavinia', 'ash', 'lilia', 'zeno'];

/** キャラクターID → 画像パス。ファイルが無い枠は矩形描画へ自動フォールバック。 */
export const CHARACTER_ART: Record<string, CharArt> = Object.fromEntries(
  CHARACTER_IDS.map((id) => [id, {
    full: `assets/characters/${id}_full.png`,
    portrait: `assets/characters/${id}_portrait.png`,
  }]),
);

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

/** 背景の拡張子 (写真調の背景は JPG でも置けるように、先に見つかったものを使う) */
const BG_EXTS = ['png', 'jpg', 'jpeg', 'webp'];

/** 背景キー → 候補パス (先頭から順に、実在するものを読み込む)。 */
export const BG_ART: Record<string, string[]> = Object.fromEntries(
  BG_KEYS.map((k) => [k, BG_EXTS.map((ext) => `assets/bg/${k}.${ext}`)]),
);

/** BGM キー → パス (public/assets/audio/<key>.mp3)。無い曲は無音 */
const BGM_KEYS: string[] = [
  'title',                                  // タイトル・メニュー
  'floor0', 'floor1', 'floor2', 'floor3',   // 各層の探索 (マップ・イベント)
  'battle', 'boss',                         // 通常戦 / ボス戦 (boss は第1層ボス兼、層別ボス曲が無いときの代わり)
  'finale',                                 // 最終層 (導入画面。最終ボス曲が無いときは戦闘にも)
  // Unity版準拠の追加枠 (FloorData.BossBGM / RestSiteController._campfireBGM)。無ければ上の曲で代用
  'campfire',                               // 焚き火
  'boss_floor1', 'boss_floor2', 'boss_floor3',
  // 最終ボス (エンディング分岐ごと)。無ければ finale で代用
  'final_demon_king', 'final_abyss_god', 'final_time_wraith', 'final_cursed_king', 'final_true_core',
];
export const BGM_ART: Record<string, string> = Object.fromEntries(
  BGM_KEYS.map((k) => [k, `assets/audio/${k}.mp3`]),
);
export const bgmKey = (key: string): string => `bgm_${key}`;

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

// ── 透明余白の自動トリミング ──────────────────────────────────────────
// 生成画像はキャンバス内の余白量がまちまちなため、そのままだと表示サイズを
// 揃えても見た目の大きさ・足元の位置がばらつく。不透明部分の外接矩形を求め、
// その範囲だけを指す 'trim' フレームをテクスチャに追加する。
// 1枚あたり約20msかかるため起動時に一括では行わず、初めて表示するときに
// その画像だけ処理する (artFrame 経由)。結果はテクスチャに残るので2回目以降は即時。

/** トリミング済みフレーム名 */
export const TRIM_FRAME = 'trim';

/** 不透明部分の外接矩形を 'trim' フレームとして登録する (元画像は変更しない)。
 *  原寸で走査すると1枚あたり数十msかかるため、長辺256pxに縮小して検出し、
 *  結果を原寸座標に戻す (誤差は数px程度、余白を1マス分足して吸収)。 */
export function trimTexture(scene: Phaser.Scene, key: string): void {
  const tex = scene.textures.get(key);
  if (tex.has(TRIM_FRAME)) return;
  const src = tex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const w = src.width;
  const h = src.height;
  const k = Math.min(1, 256 / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * k));
  const sh = Math.max(1, Math.round(h * k));
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(src, 0, 0, sw, sh);
  const data = ctx.getImageData(0, 0, sw, sh).data;

  const ALPHA_MIN = 24;
  let minX = sw, minY = sh, maxX = -1, maxY = -1;
  for (let y = 0; y < sh; y++) {
    const row = y * sw * 4;
    for (let x = 0; x < sw; x++) {
      if (data[row + x * 4 + 3] > ALPHA_MIN) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return;   // 完全に透明な画像はそのまま
  // 縮小画像の1マス分を余白として足し、原寸座標へ戻す
  const x0 = Math.max(0, Math.floor((minX - 1) / k));
  const y0 = Math.max(0, Math.floor((minY - 1) / k));
  const x1 = Math.min(w, Math.ceil((maxX + 2) / k));
  const y1 = Math.min(h, Math.ceil((maxY + 2) / k));
  tex.add(TRIM_FRAME, 0, x0, y0, x1 - x0, y1 - y0);
}

/** 画像表示に使うフレーム。未処理なら余白を切り詰めてから 'trim' を返す */
export function artFrame(scene: Phaser.Scene, key: string): string | undefined {
  trimTexture(scene, key);
  return scene.textures.get(key).has(TRIM_FRAME) ? TRIM_FRAME : undefined;
}

// =============================================================
//  assets/manifest.js — 使用する画像ファイルの一覧
//  画像を assets/ フォルダに置いたら、ここに1項目追加してください。
//  ここに書かれていない素材は、従来の図形・文字アイコンで表示されます。
//  (命名規則・アニメーション名・推奨サイズは assets/README.md を参照)
// =============================================================

// ドット絵モード: 拡大してもぼやけず、ドットがくっきり表示される
const ASSET_PIXEL_ART = true;

// ドット絵の表示倍率: 1ドットを画面上で何pxにするか
// (例: 2 なら 16×16 のタイルが 32×32 で表示される。ゲーム内の1マスは 32px)
const ASSET_PIXEL_SCALE = 2;

const ASSET_FILES = [
  // ---- 1枚絵(動かない素材)は、ファイル名を書くだけ ----
  // 'items/herb.png',
  // 'tiles/forest_floor.png',

  // ---- アニメーションする素材(スプライトシート) ----
  // frame: 1コマの [幅, 高さ](ドット単位)
  // anims: 動きの名前: { row: 何行目か(0始まり), frames: コマ数, fps: 1秒あたりのコマ数, once: 1回だけ再生なら true }
  //
  // { file: 'player/clavis.png', frame: [16, 24], anims: {
  //     idle_down: { row: 0, frames: 4, fps: 4 },
  //     walk_down: { row: 1, frames: 4, fps: 8 },
  //     idle_up:   { row: 2, frames: 4, fps: 4 },
  //     walk_up:   { row: 3, frames: 4, fps: 8 },
  //     idle_side: { row: 4, frames: 4, fps: 4 },
  //     walk_side: { row: 5, frames: 4, fps: 8 },
  //     cast:      { row: 6, frames: 3, fps: 12, once: true },
  //     hurt:      { row: 7, frames: 2, fps: 10, once: true },
  // } },
  //
  // { file: 'enemies/slime.png', frame: [16, 16], anims: {
  //     move:   { row: 0, frames: 4, fps: 6 },
  //     attack: { row: 1, frames: 3, fps: 10, once: true },
  //     hurt:   { row: 2, frames: 1, fps: 1 },
  //     die:    { row: 3, frames: 5, fps: 10, once: true },
  // } },
];

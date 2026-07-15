# 画像アセット配置ガイド

ここに置いたファイルは Vite の public/ として `/assets/…` で配信され、
ビルド時に `dist/assets/…` へそのままコピーされます。

## キャラクター (public/assets/characters/)
- `<id>_full.png`     … 立ち絵 / バトルスプライト (縦長・全身・透過PNG)
- `<id>_portrait.png` … 顔グラ (正方 1:1・バストアップ・透過PNG)

id: bernhard / lavinia / ash / lilia / zeno

例) アッシュ:
- public/assets/characters/ash_full.png
- public/assets/characters/ash_portrait.png

## 敵 (public/assets/enemies/)
- `<EnemyDef.id>.png` … 立ち絵 (透過PNG)。例: f0n_goblin.png / f0b_morva.png
  ※ 対応後に src/data/assets.ts の ENEMY_ART に登録する。

## 背景 (public/assets/bg/)
- 16:9 (1280x720 以上)。対応後に src/data/assets.ts の BG_ART に登録する。

## 反映の仕組み
- src/data/assets.ts に宣言済みのパスを PreloadScene が起動時に読み込む。
- ファイルが無い枠は自動で従来の矩形描画にフォールバック (ゲームは落ちない)。
- 透過が無い画像でも表示は可能だが、切り抜き済み透過PNGを推奨。

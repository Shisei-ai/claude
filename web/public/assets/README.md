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
- `<key>.png` / `.jpg` / `.jpeg` / `.webp` のどれでもよい (同じキーに複数あれば png → jpg → jpeg → webp の順で1つ使う)。
- 16:9 (1280x720 以上)。key は src/data/assets.ts の BG_KEYS を参照
  (floor0〜floor3 / arena_* / event_* / title / charselect / meta / panel / ending_*)。

## BGM (public/assets/audio/)
- `<key>.mp3` … ループ再生される曲。置かなければ無音 (効果音は合成音で常に鳴る)。
- key: title (タイトル・メニュー) / floor0〜floor3 (各層の探索) /
  battle (通常戦) / boss (ボス戦) / finale (最終層)

## 反映の仕組み
- src/data/assets.ts に宣言済みのパスのうち、実在するファイルだけを PreloadScene が起動時に読み込む
  (ビルド時に public/assets の一覧を作るため、未配置のファイルを読みに行ってエラーを出さない)。
- ファイルが無い枠は自動で従来の矩形描画にフォールバック (ゲームは落ちない)。
- 透過が無い画像でも表示は可能だが、切り抜き済み透過PNGを推奨。

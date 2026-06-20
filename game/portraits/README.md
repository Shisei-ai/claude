# portraits/ — 立ち絵PNG置き場

ここに登場人物の立ち絵PNGを置きます。`js/data.js` の `G.CHARACTERS` から
`img` でファイルを参照します（このフォルダは `game/` 直下なので、パスは `portraits/xxx.png`）。

## 推奨仕様
- **形式**: PNG（背景は透過＝アルファ付き推奨）
- **サイズ**: 縦長 目安 **720×960px** 前後（縦：横 ≒ 4:3）。多少違っても自動で収まります。
- **構図**: 立ち姿（胸〜全身）。中央寄せ。下端で床に接するように見える配置が綺麗です。
- **命名**: `キャラID_表情.png`（例：`chaos_neutral.png` / `master_shock.png`）。自由でも可。

## 表情差分（任意）
同じキャラで複数の表情を用意する場合、表情名（`neutral` / `alert` など）ごとに
ファイルを分け、`G.CHARACTERS` の `img` にマッピングします。

```js
master: {
  name: '管理者', color: '#ffd24a', side: 'right', icon: '🧑',
  img: {
    neutral: 'portraits/master.png',
    shock:   'portraits/master_shock.png',
    fired:   'portraits/master_fired.png',
  },
},
```

PNGが未配置・読み込み失敗の間は、自動でプレースホルダ（アイコン＋名前の枠）が表示されます。
画像を入れれば自動で差し替わります。

詳しい台本の書き方は `../STORY.md` を参照してください。

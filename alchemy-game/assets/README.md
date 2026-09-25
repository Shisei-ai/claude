# 画像素材ガイド

このフォルダに画像を置き、**`manifest.js` にファイル名を1行追加する**と、ゲーム内の図形・文字アイコンがその画像に置き換わります。
一覧に書いていない素材は、今まで通りの図形で表示されるので、**少しずつ差し替えていけます**。

```js
// manifest.js の例
const ASSET_FILES = [
  'items/herb.png',
  'enemies/slime.png',
];
```

- 形式: PNG（透過あり）を推奨。JPG / WebP も使えます
- **ドット絵を使う場合**は、`manifest.js` の `ASSET_PIXEL_ART` を `true` にしてください。拡大・縮小してもぼやけず、くっきり表示されます（通常の絵では `false` のままが綺麗です）
- ファイルを置いたのに表示されない場合は、ブラウザの開発者ツール（F12）のコンソールに「画像を読み込めませんでした」と出ていないか確認してください

## 命名規則と推奨サイズ

| フォルダ / ファイル名 | 用途 | 推奨サイズ | 備考 |
| --- | --- | --- | --- |
| `items/<アイテムID>.png` | 倉庫・レシピなどのアイコン。採取ポイントにも流用 | 64×64 | |
| `nodes/<アイテムID>.png` | フィールド上の採取ポイント（草むら・鉱脈など） | 64×64 | 無ければ items/ を使用 |
| `machines/<設備ID>.png` | 工房の設備アイコン | 96×96 | |
| `enemies/<敵ID>.png` | 敵キャラクター | 64×64（ボスは 192×192） | 右向きで描く（左向きは自動反転） |
| `player/clavis.png` | 主人公クラヴィス | 96×96 | 右向きで描く |
| `tiles/<フィールドID>_floor.png` | 床タイル | 32×32 | 繰り返し敷き詰めても継ぎ目が目立たない絵に |
| `tiles/<フィールドID>_wall.png` | 壁タイル（木・岩など） | 32×32 | |
| `spells/<魔法ID>.png` | 飛んでいく魔法弾 | 64×64 | 右向きで描く（進行方向へ自動回転） |
| `spells/<魔法ID>_<グレード>.png` | グレード別の魔法弾（例 `fire_3.png`） | 64×64 | 無ければ上の共通画像 |
| `icons/spell_<魔法ID>.png` | 魔法アイコン（スロット・魔法タブ） | 96×96 | |
| `icons/spell_<魔法ID>_<グレード>.png` | グレード別アイコン | 96×96 | 無ければ上の共通画像 |
| `effects/portal.png` | 帰還ゲート | 128×128 | |
| `effects/enemy_shot.png` | 敵の弾 | 32×32 | |

## ID一覧

- **アイテムID**: `herb`（霊草）、`wood`（古木の枝）、`stone`（石材）、`mushroom`（月光茸）、`sand`（赤砂）、`sunstone`（陽光石）、`iron_ore`（鉄鉱石）、`silver_ore`（銀鉱石）、`crystal`（魔晶の欠片）、`ice`（永久氷）、`frost_flower`（霜の花）、`soul_ash`（魂の残滓）、`nether_stone`（冥石）、`slime_gel`（粘液）、`wolf_fang`（獣の牙）、`bone`（古骨）、`miasma_core`（瘴気の核）、`nether_heart`（番人の心核）、`water`（清水）、`essence`（草の精髄）、`charcoal`（木炭）、`glass`（硝子瓶）、`mana`（魔素）、`iron_powder`（鉄粉）、`silver_powder`（銀粉）、`sun_dust`（陽光の粉）、`bone_powder`（骨粉）、`iron_ingot`（鉄塊）、`silver_ingot`（銀塊）、`pure_water`（聖水）、`pure_core`（浄化核）、`enchanted_iron`（魔鉄）、`gold`（錬金の金）、`alkahest`（万能溶媒）、`salt`（賢者の塩）、`mercury`（賢者の水銀）、`sulfur`（賢者の硫黄）、`quintessence`（第五元素）、`red_tincture`（赤きティンクトゥラ）、`potion`（回復薬）、`mana_potion`（魔力薬）、`lantern`（霧払いの灯）、`frost_amulet`（耐寒の護符）、`nether_key`（冥府の鍵）、`philosopher_stone`（賢者の石）
- **設備ID**: `pot`（抽出の壺）、`furnace`（精錬の竈）、`mortar`（破砕の臼）、`cauldron`（融合の釜）、`purifier`（浄化の匣）、`enchanter`（魔化の匣）
- **敵ID**: `slime`（スライム）、`wolf`（森狼）、`scorpion`（骨蠍）、`sandwraith`（砂の亡霊）、`ghost`（霧の亡霊）、`golem`（岩のゴーレム）、`icewolf`（氷狼）、`frostspirit`（雪の精）、`dead`（亡者）、`specter`（怨霊）、`guardian`（冥府の番人）
- **フィールドID**: `forest`（芽吹き森）、`desert`（割れた砂漠）、`mine`（霧深い鉱山）、`snow`（永久雪原）、`underworld`（冥界）
- **魔法ID**: `bolt`（魔弾→重魔弾→穿魔弾→星魔弾）、`fire`（火球→業火球→煉獄球→劫火）、`heal`（治癒→快癒→聖癒→再生の祈り）、`ice`（氷槍→氷牙槍→凍獄槍→絶対零度）、`thunder`（雷鎖→迅雷鎖→轟雷鎖→天雷）、`nova`（風陣→旋風陣→嵐刃陣→天嵐）、`light`（反証の光→否定の光→棄却の光→審判返し）（グレードは 1〜4）

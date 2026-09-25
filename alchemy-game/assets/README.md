# 画像素材ガイド（ドット絵・アニメーション）

このフォルダに画像を置き、**`manifest.js` に1項目追加する**と、ゲーム内の図形・文字アイコンがその画像に置き換わります。
一覧に書いていない素材は、今まで通りの図形で表示されるので、**少しずつ差し替えていけます**。

- 形式: PNG（透過あり）
- `manifest.js` の `ASSET_PIXEL_ART = true`（初期設定）で、ドットがぼやけずくっきり表示されます
- `ASSET_PIXEL_SCALE`（初期値 2）は「1ドットを画面上で何pxにするか」。ゲーム内の1マスは 32px なので、**16×16 ドットで描くと1マスぴったり**になります
- 表示されない場合は、ブラウザの開発者ツール（F12）のコンソールに「画像を読み込めませんでした」と出ていないか確認してください

## 1枚絵とスプライトシート

**1枚絵**（動かない素材）はファイル名を書くだけです。

```js
'items/herb.png',
```

**スプライトシート**（アニメーションする素材）は、1枚の画像に全コマを並べて描きます。

- **1行 = 1つの動き**（待機、歩き、攻撃…）
- **横に並んだコマ = 時間の流れ**（左から右へ再生）
- 全てのコマは同じ大きさ（例: 16×24 ドット）

```
         コマ0   コマ1   コマ2   コマ3
行0 idle  [   ]  [   ]  [   ]  [   ]
行1 walk  [   ]  [   ]  [   ]  [   ]
行2 cast  [   ]  [   ]  [   ]
```

```js
{ file: 'enemies/slime.png', frame: [16, 16], anims: {
    move:   { row: 0, frames: 4, fps: 6 },               // 行0、4コマを毎秒6コマでループ
    attack: { row: 1, frames: 3, fps: 10, once: true },  // once: 1回だけ再生して最後のコマで止まる
    die:    { row: 2, frames: 5, fps: 10, once: true },
} },
```

行によってコマ数が違っても構いません（画像の横幅は一番長い行に合わせる）。

### キャラクターの基準点

キャラクター・敵・採取ポイントは**コマの下端中央が足元**になるよう配置されます。
コマの下端に足が来るように描いてください。見た目の大きさと当たり判定は別なので、多少大きく描いても遊びやすさは変わりません。

## アニメーション名

ゲームは状況に応じて下の名前のアニメーションを探し、**見つからなければ右隣の名前で代用**します。
全部揃えなくても、最低限 `idle`（敵は `move`）が1つあれば動きます。

| 対象 | ファイル | アニメーション名（→ 無い場合の代用） |
| --- | --- | --- |
| 主人公 | `player/clavis.png` | `idle_down` `idle_up` `idle_side`（→`idle`）<br>`walk_down` `walk_up` `walk_side`（→`walk`→待機）<br>`cast_down` `cast_up` `cast_side`（→`cast`→待機）… 魔法を撃った瞬間、0.3秒<br>`hurt_down` など（→`hurt`→待機）… 被弾時、0.3秒 |
| 敵 | `enemies/<敵ID>.png` | `move`（常時）／`attack`（攻撃・射撃・突進の溜め）／`hurt`（被弾）／`die`（倒れた時。`once: true` 推奨） |
| 採取ポイント | `nodes/<アイテムID>.png` | `idle`（草が揺れる、鉱石がきらめく等） |
| 魔法弾 | `spells/<魔法ID>.png` / `spells/<魔法ID>_<グレード>.png` | `fly`（飛行中ループ） |
| 敵の弾 | `effects/enemy_shot.png` | `fly` |
| 帰還ゲート | `effects/portal.png` | `idle` |
| 下り階段 | `effects/stairs.png` | `idle`（冥界の深層） |
| 爆発 | `effects/explosion.png` | `play`（火球の着弾時。`once: true`） |
| ヒット | `effects/hit.png` | `play`（魔法弾が当たった時。`once: true`） |

- 向き: `_side` と敵は**右向き**で描きます。左向きは自動で左右反転されます
- 主人公の向きは、移動方向ではなく**マウスの照準方向**で決まります（撃つ方向を向く）
- 1枚絵で置いた場合は、アニメーションせずにその絵が表示されます

## その他の画像（1枚絵）

| ファイル | 用途 | 推奨サイズ（ドット） |
| --- | --- | --- |
| `items/<アイテムID>.png` | 倉庫・レシピなどのアイコン。`nodes/` が無い時は採取ポイントにも使用 | 16×16 |
| `machines/<設備ID>.png` | 工房の設備アイコン | 24×24 または 32×32 |
| `tiles/<フィールドID>_floor.png` | 床タイル（継ぎ目なく敷き詰められる絵に） | 16×16 |
| `tiles/<フィールドID>_wall.png` | 壁タイル（木・岩など） | 16×16 |
| `icons/spell_<魔法ID>.png` / `icons/spell_<魔法ID>_<グレード>.png` | 魔法アイコン（スロット・魔法タブ） | 16×16 または 24×24 |

アイコン・タイルは枠に合わせて拡大されるので、上の大きさ以外でも表示できます（整数倍で拡大されるサイズが綺麗です）。

## ID一覧

- **アイテムID**（装備を含む）: `herb`（霊草）、`wood`（古木の枝）、`stone`（石材）、`mushroom`（月光茸）、`sand`（赤砂）、`sunstone`（陽光石）、`iron_ore`（鉄鉱石）、`silver_ore`（銀鉱石）、`crystal`（魔晶の欠片）、`ice`（永久氷）、`frost_flower`（霜の花）、`soul_ash`（魂の残滓）、`nether_stone`（冥石）、`slime_gel`（粘液）、`wolf_fang`（獣の牙）、`bone`（古骨）、`miasma_core`（瘴気の核）、`nether_heart`（番人の心核）、`water`（清水）、`essence`（草の精髄）、`charcoal`（木炭）、`glass`（硝子瓶）、`mana`（魔素）、`iron_powder`（鉄粉）、`silver_powder`（銀粉）、`sun_dust`（陽光の粉）、`bone_powder`（骨粉）、`iron_ingot`（鉄塊）、`silver_ingot`（銀塊）、`pure_water`（聖水）、`pure_core`（浄化核）、`enchanted_iron`（魔鉄）、`gold`（錬金の金）、`alkahest`（万能溶媒）、`salt`（賢者の塩）、`mercury`（賢者の水銀）、`sulfur`（賢者の硫黄）、`quintessence`（第五元素）、`red_tincture`（赤きティンクトゥラ）、`potion`（回復薬）、`mana_potion`（魔力薬）、`lantern`（霧払いの灯）、`frost_amulet`（耐寒の護符）、`nether_key`（冥府の鍵）、`philosopher_stone`（賢者の石）、`stone_shard`（賢者の石の欠片）、`abyss_shard`（深淵の欠片）、`void_essence`（虚無の雫）、`primal_ember`（原初の火種）、`forest_core`（古王の樹核）、`desert_core`（大蠍の毒晶）、`mine_core`（巨像の魔核）、`snow_core`（狼王の氷牙）、`staff1`（樫の魔杖）、`staff2`（銀晶の杖）、`staff3`（魔鉄の杖）、`staff4`（金冥の杖）、`staff5`（賢者の杖）、`robe1`（旅の外套）、`robe2`（聖布の法衣）、`robe3`（冥布の法衣）、`robe4`（虚無の衣）、`robe5`（第五元素の衣）、`cat_fire`（紅蓮の触媒）、`cat_ice`（凍晶の触媒）、`cat_thunder`（雷霆の触媒）、`cat_wind`（疾風の触媒）、`cat_light`（煌光の触媒）、`cat_cycle`（循環の触媒）、`cat_swift`（迅速の触媒）、`cat_life`（生命の触媒）
- **設備ID**: `pot`（抽出の壺）、`furnace`（精錬の竈）、`mortar`（破砕の臼）、`cauldron`（融合の釜）、`purifier`（浄化の匣）、`enchanter`（魔化の匣）、`forge`（錬装の炉）、`transmuter`（変成の祭壇）
- **敵ID**（`b_` で始まるものは強化ボス）: `slime`（スライム）、`wolf`（森狼）、`scorpion`（骨蠍）、`sandwraith`（砂の亡霊）、`ghost`（霧の亡霊）、`golem`（岩のゴーレム）、`icewolf`（氷狼）、`frostspirit`（雪の精）、`dead`（亡者）、`specter`（怨霊）、`guardian`（冥府の番人）、`b_forest`（森の古王）、`b_desert`（砂塵の大蠍）、`b_mine`（霧喰らいの巨像）、`b_snow`（氷獄の狼王）
- **フィールドID**: `forest`（芽吹き森）、`desert`（割れた砂漠）、`mine`（霧深い鉱山）、`snow`（永久雪原）、`underworld`（冥界）、`abyss`（冥界の深層）
- **魔法ID**: `bolt`（魔弾→重魔弾→穿魔弾→星魔弾）、`fire`（火球→業火球→煉獄球→劫火）、`heal`（治癒→快癒→聖癒→再生の祈り）、`ice`（氷槍→氷牙槍→凍獄槍→絶対零度）、`thunder`（雷鎖→迅雷鎖→轟雷鎖→天雷）、`nova`（風陣→旋風陣→嵐刃陣→天嵐）、`light`（反証の光→否定の光→棄却の光→煌輝）（グレードは 1〜4）

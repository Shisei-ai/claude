# 集成工業プランナー — AIC Layout Planner

『アークナイツ：エンドフィールド』の集成工業を、ブラウザ上で厳密に設計・検証するツール。
目的は「なんとなく置けるツール」ではなく、**台数・面積・電力・搬送本数を数値で詰める**こと。

単一HTMLの試作（JS 2,878行）を、保守できる構成へ作り直している最中です。

- 仕様書: [`HANDOFF.md`](./HANDOFF.md)
- 参照実装（**動く仕様書**。挙動が食い違ったらこちらが正しい）: [`reference/aic-planner.html`](./reference/aic-planner.html)

## 開発

```bash
npm install
npm test        # Vitest
npm run typecheck
npm run dev     # Vite
```

## 移植の進み具合（HANDOFF §6）

| | 段階 | 状態 |
|---|---|---|
| 1 | domain の型と定数、seed データの切り出し | ✅ 完了 |
| 2 | geometry と routing | ✅ 完了 |
| 3 | solver（§7 の回帰ケースが通るまで UI に触らない） | ✅ 完了 |
| 4 | planner（逆算・端数最適化） | ✅ 完了 |
| 5 | layout（1本のライン／ブロック方式） | ✅ 完了 |
| 6 | UI | ⬜ |
| 7 | 保存形式の後方互換の確認 | ⬜ |

## 構成

```
src/
  domain/        純粋関数のみ。DOM を一切参照しない（Node で単体テストできること）
    types.ts     データ型 = 保存 JSON の形（§3）
    constants.ts ゲーム定数と出典（§4）
    dataset.ts   品目・設備・レシピの索引（参照実装の IX）
    geometry.ts  footprint / ポート幾何 / 回転 / 占有図
    routing.ts   経路探索（ダイクストラ＋ブリッジ）
    solver.ts    稼働率・流量・電力・倉庫収支の収束計算
    planner.ts   目標からの逆算・端数最適化
    layout/
      tiers.ts       段の割り当てと重心法による並び替え
      autoLayout.ts  1本のラインとして配置
      blocks.ts      最小整数ユニットを敷き詰める配置
  data/
    seed.ts      初期データ（品目68・設備40・レシピ50・エリア15）
  main.ts        エントリポイント（UI は §6-6 で組む）
test/
  fixtures/          参照実装から書き出した比較用データ
  helpers/reference.ts 参照実装を Node 上で直接呼ぶ足場（差分テスト用）
  seed.test.ts       seed が参照実装と一致することの回帰
  geometry.test.ts   ポート幾何・回転・占有図
  routing.test.ts    直線・迂回・交差・口の正面回避
  solver.test.ts     §5-1 の守るべき性質
  planner.test.ts    §7 の逆算の検算・端数最適化
  layout.test.ts     §5-3 の処理順序
  regression.test.ts §7 の回帰ケース（移植の合否判定）
```

## 移植の正しさをどう担保しているか

参照実装は「動く仕様書」なので、目視ではなく**機械で突き合わせている**。
`test/helpers/reference.ts` が `reference/aic-planner.html` から計算部分だけを
切り出して Node 上で評価するので、同じ入力を両方に与えて結果を比べられる。

- seed データ … JSON がキー順まで完全一致
- ポート幾何 … 初期データ全40設備 × 4向き
- 経路探索 … ランダム盤面60通り・500回以上の接続で、選ばれた口と経路が一致
- ソルバー … ランダム盤面40通りで稼働率・流量・電力・倉庫収支・診断の文言まで一致
- 逆算 … 20通りの目標で台数・原料・面積・電力・提案値が一致
- 自動配置 … 13通り×2方式で、設備・ラインの経路・盤面サイズ・ソルバー結果まで一致

### 守っている境界

- `domain/` は `window` / `document` / `canvas` を参照しない。
- 参照実装の `D.nodes` のようなグローバル可変状態は持ち込まない。
  可変だった `PIPE_CAP` は `GameConfig` として明示的に持ち回る。
- 保存 JSON は現行ファイルがそのまま読めること（後方互換）。
  `test/fixtures/reference-save.json` が現行アプリの書き出し形。

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
| 3 | solver（§7 の回帰ケースが通るまで UI に触らない） | ✅ 移植・差分テスト済（§7 は layout 後） |
| 4 | planner（逆算・端数最適化） | ⬜ |
| 5 | layout（1本のライン／ブロック方式） | ⬜ |
| 6 | UI | ⬜ |
| 7 | 保存形式の後方互換の確認 | ⬜ |

## 構成

```
src/
  domain/        純粋関数のみ。DOM を一切参照しない（Node で単体テストできること）
    types.ts     データ型 = 保存 JSON の形（§3）
    constants.ts ゲーム定数と出典（§4）
  data/
    seed.ts      初期データ（品目68・設備40・レシピ50・エリア15）
  main.ts        エントリポイント（UI は §6-6 で組む）
test/
  fixtures/      参照実装から書き出した比較用データ
  seed.test.ts   seed が参照実装と一致することの回帰
```

### 守っている境界

- `domain/` は `window` / `document` / `canvas` を参照しない。
- 参照実装の `D.nodes` のようなグローバル可変状態は持ち込まない。
  可変だった `PIPE_CAP` は `GameConfig` として明示的に持ち回る。
- 保存 JSON は現行ファイルがそのまま読めること（後方互換）。
  `test/fixtures/reference-save.json` が現行アプリの書き出し形。

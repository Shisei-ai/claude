# 深見市聖杯戦争 — 作業メモ

- このブランチ（`claude/grail-war-all-ages`）は「性的描写無し版」。性的な描写は加えない。元の版はブランチ `claude/pensive-dijkstra-2t4ha8` にそのまま保持している。

- ソースは `src/`、`python3 build.py` で `dist/index.html`（単体で遊べる）と `dist/artifact.html`（アーティファクト用）を生成する。
- 変更のたびに必ず：
  1. `python3 build.py` → 生成された JS を `node --check` で構文確認
  2. Playwright で自動プレイ（ランダム操作）を数十回回し、エラーが出ないことを確認
  3. `dist/artifact.html` をこれまでと同じアーティファクト（URLはリポジトリに書かない）へ再公開し、すぐ遊べるようにする
  4. ブランチへコミット・プッシュ
- ユーザーは初心者。説明は日本語で、詳しく分かりやすく。
- 1プレイの目安は約35分（成長期0〜17歳の7節目 → 18歳の冬3日 → 戦争11〜14日、決戦は FINAL_DAY の夜以降）。
- 18歳時点の能力は平均45前後が目安（growth.js の GROW_RATE で調整）。

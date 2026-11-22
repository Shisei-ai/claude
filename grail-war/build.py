#!/usr/bin/env python3
"""src/ 以下のファイルを1つのHTMLにまとめるスクリプト。

使い方:  python3 build.py
出力:
  dist/index.html     … スマホやPCのブラウザで直接開けるファイル
  dist/artifact.html  … claude.ai のアーティファクト公開用（<html>等の外枠なし）
"""
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"

# 読み込み順が大事：データ → 本体
SCRIPTS = ["data_servants.js", "data_servants2.js", "data_say_keys.js", "data_say_1.js", "data_say_2.js", "data_say_3.js", "data_say_4.js", "data_world.js", "data_voices.js", "data_sig.js", "data_story.js", "data_growth.js", "data_fujimaru.js", "data_kishinami.js", "data_events.js", "data_mystery.js", "data_bond_events.js", "data_epilogue.js", "data_shirou.js", "data_skills.js", "data_magecraft.js",
           "fx.js", "core.js", "actions.js", "growth.js", "routes.js", "battle.js", "ending.js", "view.js"]

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600'
         '&family=Shippori+Mincho+B1:wght@500;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap">')


def main() -> None:
    css = (SRC / "style.css").read_text(encoding="utf-8")
    js = "\n".join((SRC / f).read_text(encoding="utf-8") for f in SCRIPTS)
    head = (
        '<title>深見市聖杯戦争</title>\n'
        '<meta name="claude:viewport-fit-sides" content="cover">\n'
        f'{FONTS}\n<style>\n{css}\n</style>\n'
    )
    body = f'<div id="app"></div>\n<script>\n{js}\n</script>\n'

    DIST.mkdir(exist_ok=True)
    (DIST / "artifact.html").write_text(head + body, encoding="utf-8")
    full = (
        '<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="theme-color" content="#0c0e19">\n'
        f'{head}</head>\n<body>\n{body}</body>\n</html>\n'
    )
    (DIST / "index.html").write_text(full, encoding="utf-8")
    print("built:", DIST / "index.html", DIST / "artifact.html")


if __name__ == "__main__":
    main()

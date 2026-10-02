// フォント — ゲームの雰囲気に合わせた書体を同梱する (どの端末でも同じ見た目にするため)
//   本文: Zen Old Mincho … 古典的な明朝体。羊皮紙の書物のような落ち着いた雰囲気
//   見出し: Zen Antique … 古い活字風の明朝体。画面タイトル・場面名に
//   欧文・数字: Cinzel … ローマ碑文の大文字。タイトルロゴ・ダメージ数字・HP表示に
// いずれも SIL Open Font License (@fontsource 経由で同梱)
// 日本語と基本ラテン文字の分だけを読み込む (キリル文字などは使わないため)。
// 和文は1書体あたり約1.9MBあるため、本文の太字は和文を持たない (欧文のみ太字を同梱)
import '@fontsource/zen-old-mincho/japanese-400.css';
import '@fontsource/zen-old-mincho/latin-400.css';
import '@fontsource/zen-old-mincho/latin-700.css';
import '@fontsource/zen-antique/japanese-400.css';
import '@fontsource/zen-antique/latin-400.css';
import '@fontsource/cinzel/latin-500.css';
import '@fontsource/cinzel/latin-700.css';
import usedGlyphs from 'virtual:used-glyphs';

export const FONT_BODY = '"Zen Old Mincho", "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
export const FONT_DISPLAY = '"Zen Antique", "Zen Old Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif';
export const FONT_LATIN = '"Cinzel", "Zen Old Mincho", serif';

/** ゲームで使う字形を先に読み込む。読み込めなくても (オフライン等) 一定時間で先へ進む */
export async function loadFonts(onProgress?: (done: number, total: number) => void): Promise<void> {
  if (!('fonts' in document)) return;
  const jobs = [
    '400 24px "Zen Old Mincho"',
    '400 24px "Zen Antique"',
    '500 24px "Cinzel"',
    '700 24px "Cinzel"',
  ];
  let done = 0;
  const all = Promise.all(jobs.map((font) =>
    document.fonts.load(font, usedGlyphs)
      .catch(() => [])
      .finally(() => onProgress?.(++done, jobs.length))));
  await Promise.race([all, new Promise((r) => setTimeout(r, 15000))]);
}

// ダークファンタジーUIテーマ — Unity版 MainMenuSceneSetup の配色を踏襲
import Phaser from 'phaser';
import { hasArt, bgArtKey } from '../data/assets';

export const COLORS = {
  bg: 0x07050d,             // 深い夜闇
  bgPanel: 0x120e1c,
  bgPanelLight: 0x1c1628,
  border: 0x4a3a66,
  borderBright: 0x8a6ab8,
  text: '#d8d0e8',
  textDim: '#8a7fa0',
  textGold: '#d9c66b',
  textRed: '#e05a5a',
  textGreen: '#6ade8a',
  textBlue: '#6aaade',
  accent: 0xd9c66b,
  hpBar: 0x40c060,
  hpBarLow: 0xd04040,
  mpBar: 0x4080d0,
  bpBar: 0xd9a030,
  shield: 0x70a0d0,
};

export const FONT = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
export const FONT_SANS = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';

export function textStyle(
  size: number,
  color: string = COLORS.text,
  extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  // 日本語はスペース区切りがないため、wordWrap指定時は常に文字単位折り返しにする
  if (extra.wordWrap?.width && extra.wordWrap.useAdvancedWrap === undefined) {
    extra = { ...extra, wordWrap: { ...extra.wordWrap, useAdvancedWrap: true } };
  }
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    ...extra,
  };
}

export interface ButtonOpts {
  width?: number;
  height?: number;
  fontSize?: number;
  disabled?: boolean;
  color?: string;
}

/** 汎用ボタン */
export function makeButton(
  scene: Phaser.Scene, x: number, y: number, label: string,
  onClick: () => void, opts: ButtonOpts = {},
): Phaser.GameObjects.Container {
  const w = opts.width ?? 320;
  const h = opts.height ?? 52;
  const disabled = opts.disabled ?? false;

  const bg = scene.add.rectangle(0, 0, w, h, COLORS.bgPanelLight, disabled ? 0.4 : 0.92)
    .setStrokeStyle(1, disabled ? 0x2a2436 : COLORS.border);
  const txt = scene.add.text(0, 0, label, textStyle(
    opts.fontSize ?? 20,
    disabled ? '#554d66' : (opts.color ?? COLORS.text),
  )).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, txt]);
  container.setSize(w, h);

  if (!disabled) {
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        bg.setFillStyle(0x2a2140, 1).setStrokeStyle(1, COLORS.borderBright);
        txt.setColor(COLORS.textGold);
      })
      .on('pointerout', () => {
        bg.setFillStyle(COLORS.bgPanelLight, 0.92).setStrokeStyle(1, COLORS.border);
        txt.setColor(opts.color ?? COLORS.text);
      })
      .on('pointerdown', onClick);
  }

  return container;
}

/** ステータスバー (HP/MP/BP) */
export function drawBar(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  ratio: number, color: number, bgColor = 0x201a2c,
): void {
  g.fillStyle(bgColor, 1).fillRect(x, y, w, h);
  g.fillStyle(color, 1).fillRect(x, y, Math.max(0, Math.min(1, ratio)) * w, h);
  g.lineStyle(1, 0x000000, 0.6).strokeRect(x, y, w, h);
}

/** シーン背景 (グラデーション風の板 + ビネット)。
 *  bgKey を渡すと該当画像があれば全面表示、無ければ従来の単色板にフォールバック。 */
export function drawSceneBackground(
  scene: Phaser.Scene, tint = 0x0a0716, bgKey?: string,
): void {
  const { width, height } = scene.scale;
  if (bgKey && hasArt(scene, bgArtKey(bgKey))) {
    const img = scene.add.image(width / 2, height / 2, bgArtKey(bgKey));
    // 画面を覆うようにカバー配置 (縦横比維持で大きい方に合わせる)
    img.setScale(Math.max(width / img.width, height / img.height));
    // ダーク寄せの薄いオーバーレイ (文字可読性の確保)
    scene.add.rectangle(width / 2, height / 2, width, height, 0x07050d, 0.30);
    return;
  }
  scene.add.rectangle(width / 2, height / 2, width, height, tint);
  const g = scene.add.graphics();
  // 簡易ビネット
  g.fillStyle(0x000000, 0.45);
  g.fillRect(0, 0, width, 60);
  g.fillRect(0, height - 60, width, 60);
}

// 会話ウィンドウ — 顔グラ・名前・本文を画面下部に出し、クリック/タップで次へ進む。
// プロローグと、階層に入ったときの台詞で使う。
import Phaser from 'phaser';
import { COLORS, textStyle } from './theme';
import { hasArt, charPortraitKey } from '../data/assets';
import { getCharacter } from '../data/characters';
import { playSfx } from '../audio/sfx';

export interface DialogueOptions {
  characterId: string;
  lines: string[];
  onDone?: () => void;
}

export function showDialogue(scene: Phaser.Scene, opts: DialogueOptions): void {
  const { width, height } = scene.scale;
  const char = getCharacter(opts.characterId);
  const depth = 300;
  const objs: Phaser.GameObjects.GameObject[] = [];

  // 背後を暗くし、クリックをここで受け止める (下の画面を誤操作しない)
  const shade = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45)
    .setDepth(depth).setInteractive();
  objs.push(shade);

  const panelW = width - 120;
  const panelH = 170;
  const py = height - panelH / 2 - 24;
  objs.push(scene.add.rectangle(width / 2, py, panelW, panelH, 0x0e0a18, 0.96)
    .setStrokeStyle(2, COLORS.borderBright).setDepth(depth + 1));

  // 顔グラ (無ければテーマ色の四角)
  const faceX = 60 + 20 + 70;
  const pkey = charPortraitKey(char.id);
  if (hasArt(scene, pkey)) {
    const img = scene.add.image(faceX, py, pkey).setDepth(depth + 2);
    img.setScale(140 / img.height);
    objs.push(img);
  } else {
    objs.push(scene.add.rectangle(faceX, py, 110, 110, char.themeColor, 0.9).setDepth(depth + 2));
  }

  const textX = faceX + 90;
  objs.push(scene.add.text(textX, py - panelH / 2 + 18, char.name, textStyle(17, COLORS.textGold)).setDepth(depth + 2));
  const body = scene.add.text(textX, py - panelH / 2 + 52, '', textStyle(18, COLORS.text, {
    wordWrap: { width: panelW - (textX - 60) - 40 }, lineSpacing: 8,
  })).setDepth(depth + 2);
  objs.push(body);
  const next = scene.add.text(width / 2 + panelW / 2 - 30, py + panelH / 2 - 26, '▼', textStyle(16, COLORS.textGold))
    .setOrigin(0.5).setDepth(depth + 2);
  objs.push(next);
  scene.tweens.add({ targets: next, y: next.y + 5, duration: 450, yoyo: true, repeat: -1 });

  let i = 0;
  const show = () => body.setText(opts.lines[i]);
  show();
  shade.on('pointerdown', () => {
    playSfx('select');
    i++;
    if (i < opts.lines.length) { show(); return; }
    objs.forEach((o) => o.destroy());
    opts.onDone?.();
  });
}

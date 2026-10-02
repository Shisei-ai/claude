// 会話ウィンドウ — 顔グラ・名前・本文を画面下部に出し、クリック/タップで次へ進む。
// プロローグと、階層に入ったときの台詞で使う。
import Phaser from 'phaser';
import { COLORS, textStyle, titleStyle, drawPanel } from './theme';
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
  objs.push(drawPanel(scene, width / 2, py, panelW, panelH, { alpha: 0.96, depth: depth + 1 }));

  // 顔グラ (無ければテーマ色の四角)
  const faceX = 60 + 20 + 70;
  const pkey = charPortraitKey(char.id);
  // 顔グラは古金の細枠に収める
  objs.push(scene.add.rectangle(faceX, py, 136, 136, 0x000000, 0.5)
    .setStrokeStyle(1, COLORS.trim, 0.9).setDepth(depth + 2));
  if (hasArt(scene, pkey)) {
    const img = scene.add.image(faceX, py, pkey).setDepth(depth + 2);
    img.setScale(132 / img.height);
    objs.push(img);
  } else {
    objs.push(scene.add.rectangle(faceX, py, 110, 110, char.themeColor, 0.9).setDepth(depth + 2));
  }

  const textX = faceX + 90;
  objs.push(scene.add.text(textX, py - panelH / 2 + 16, char.name, titleStyle(19, COLORS.textGold)).setDepth(depth + 2));
  objs.push(scene.add.rectangle(textX, py - panelH / 2 + 44, 220, 1, COLORS.trim, 0.6).setOrigin(0, 0.5).setDepth(depth + 2));
  const body = scene.add.text(textX, py - panelH / 2 + 52, '', textStyle(18, COLORS.text, {
    wordWrap: { width: panelW - (textX - 60) - 40 }, lineSpacing: 8,
  })).setDepth(depth + 2);
  objs.push(body);
  const next = scene.add.text(width / 2 + panelW / 2 - 30, py + panelH / 2 - 26, '▼', textStyle(16, COLORS.textGold))
    .setOrigin(0.5).setDepth(depth + 2);
  objs.push(next);
  scene.tweens.add({ targets: next, y: next.y + 5, duration: 450, yoyo: true, repeat: -1 });

  // 1文字ずつ表示する (途中でクリックすると最後まで一気に出す)
  let i = 0;
  let typing: Phaser.Time.TimerEvent | null = null;
  const show = () => {
    const line = opts.lines[i];
    let n = 0;
    body.setText('');
    next.setVisible(false);
    typing?.remove();
    typing = scene.time.addEvent({
      delay: 28, repeat: line.length - 1,
      callback: () => {
        body.setText(line.slice(0, ++n));
        if (n >= line.length) { typing = null; next.setVisible(true); }
      },
    });
  };
  show();
  shade.on('pointerdown', () => {
    if (typing) {
      typing.remove(); typing = null;
      body.setText(opts.lines[i]); next.setVisible(true);
      return;
    }
    playSfx('select');
    i++;
    if (i < opts.lines.length) { show(); return; }
    objs.forEach((o) => o.destroy());
    opts.onDone?.();
  });
}

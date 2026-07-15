// 最終層 (Floor 4) 導入 — Unity版 EndingSystem.CreateFloor4 相当
// ヴァルゴット撃破後、証印を持つ場合のみ到達する
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle } from '../ui/theme';
import { loadRun, saveRun } from '../core/save';
import { getEnding } from '../data/endings';
import { Rng } from '../core/rng';

export class FinaleScene extends Phaser.Scene {
  constructor() { super('Finale'); }

  create(): void {
    const run = loadRun();
    const ending = getEnding(run?.activeEnding ?? null);
    if (!run || !ending) { this.scene.start('MainMenu'); return; }

    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000);
    this.add.rectangle(width / 2, height / 2, width, height, ending.tint, 0.5);

    this.add.text(width / 2, height * 0.22, `最終層　${ending.floorName}`,
      textStyle(40, COLORS.textGold)).setOrigin(0.5);
    this.add.text(width / 2, height * 0.22 + 52, ending.floorSubtitle,
      textStyle(17, COLORS.textDim)).setOrigin(0.5);

    this.add.text(width / 2, height * 0.48, ending.floorLore,
      textStyle(16, COLORS.text, {
        align: 'center', lineSpacing: 12, wordWrap: { width: width - 340 },
      })).setOrigin(0.5);

    this.add.text(width / 2, height * 0.66, ending.premonitionText,
      textStyle(14, COLORS.textRed, {
        align: 'center', lineSpacing: 8, wordWrap: { width: width - 380 },
      })).setOrigin(0.5);

    makeButton(this, width / 2, height - 90, '― 最深部へ ―', () => {
      saveRun(run);
      this.scene.start('Battle', {
        nodeType: 'Boss',
        contentSeed: new Rng(run.seed + 44444).int(0x7fffffff),
      });
    }, { width: 320, color: COLORS.textGold });
  }
}

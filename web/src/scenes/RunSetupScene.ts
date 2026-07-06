// ラン設定 — Unity版 RunSetupSceneSetup.cs / RunSetupUI.cs の移植
// キャラクター / 加護 / 難易度 を選び「旅立つ」
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { CHARACTERS } from '../data/characters';
import { BLESSINGS } from '../data/blessings';
import { DIFFICULTY_TIERS } from '../data/difficulty';
import { createRun } from '../core/run';
import { saveRun } from '../core/save';
import { generateMap } from '../core/mapgen';
import type { BlessingType } from '../core/types';

export class RunSetupScene extends Phaser.Scene {
  private selectedChar = 0;
  private selectedBlessing = 0;
  private selectedDifficulty = 1;   // 標準
  private infoText!: Phaser.GameObjects.Text;
  private charMarks: Phaser.GameObjects.Rectangle[] = [];
  private blessMarks: Phaser.GameObjects.Rectangle[] = [];
  private diffMarks: Phaser.GameObjects.Rectangle[] = [];

  constructor() { super('RunSetup'); }

  create(): void {
    const { width, height } = this.scale;
    drawSceneBackground(this);
    this.charMarks = [];
    this.blessMarks = [];
    this.diffMarks = [];

    this.add.text(width / 2, 44, '旅の支度', textStyle(36, COLORS.textGold)).setOrigin(0.5);

    // ── キャラクター選択 ──
    this.add.text(80, 100, '◆ 旅人', textStyle(20, COLORS.text));
    CHARACTERS.forEach((c, i) => {
      const x = 140 + i * 216;
      const y = 190;
      const card = this.add.rectangle(x, y, 196, 120, 0x171226, 0.95)
        .setStrokeStyle(2, i === this.selectedChar ? COLORS.borderBright : COLORS.border)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.selectedChar = i; this.refresh(); });
      this.charMarks.push(card);
      this.add.rectangle(x, y - 26, 44, 44, c.themeColor, 0.9).setStrokeStyle(1, 0x000000);
      this.add.text(x, y + 14, c.name, textStyle(14)).setOrigin(0.5);
      this.add.text(x, y + 38, c.jobName, textStyle(12, COLORS.textDim)).setOrigin(0.5);
    });

    // ── 加護選択 ──
    this.add.text(80, 280, '◆ 始まりの加護', textStyle(20, COLORS.text));
    BLESSINGS.forEach((b, i) => {
      const x = 140 + i * 180;
      const y = 348;
      const card = this.add.rectangle(x, y, 164, 76, 0x171226, 0.95)
        .setStrokeStyle(2, i === this.selectedBlessing ? COLORS.borderBright : COLORS.border)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.selectedBlessing = i; this.refresh(); });
      this.blessMarks.push(card);
      this.add.text(x, y - 16, `${b.icon} ${b.name}`, textStyle(14, COLORS.textGold)).setOrigin(0.5);
    });

    // ── 難易度選択 ──
    this.add.text(80, 420, '◆ 試練の深さ', textStyle(20, COLORS.text));
    DIFFICULTY_TIERS.forEach((d, i) => {
      const x = 140 + i * 180;
      const y = 482;
      const card = this.add.rectangle(x, y, 164, 64, 0x171226, 0.95)
        .setStrokeStyle(2, i === this.selectedDifficulty ? COLORS.borderBright : COLORS.border)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.selectedDifficulty = i; this.refresh(); });
      this.diffMarks.push(card);
      const color = i >= 4 ? COLORS.textRed : i >= 2 ? COLORS.textGold : COLORS.text;
      this.add.text(x, y, d.displayName, textStyle(18, color)).setOrigin(0.5);
    });

    // ── 説明パネル ──
    this.add.rectangle(width / 2, 578, width - 160, 76, 0x0e0a18, 0.9)
      .setStrokeStyle(1, COLORS.border);
    this.infoText = this.add.text(width / 2, 578, '', textStyle(14, COLORS.textDim, {
      wordWrap: { width: width - 220 }, align: 'center',
    })).setOrigin(0.5);

    // ── ボタン ──
    makeButton(this, width / 2 - 190, height - 52, '戻る', () => {
      this.scene.start('MainMenu');
    }, { width: 200 });
    makeButton(this, width / 2 + 130, height - 52, '旅立つ', () => {
      this.startRun();
    }, { width: 320, color: COLORS.textGold });

    this.refresh();
  }

  private refresh(): void {
    this.charMarks.forEach((m, i) =>
      m.setStrokeStyle(2, i === this.selectedChar ? COLORS.borderBright : COLORS.border));
    this.blessMarks.forEach((m, i) =>
      m.setStrokeStyle(2, i === this.selectedBlessing ? COLORS.borderBright : COLORS.border));
    this.diffMarks.forEach((m, i) =>
      m.setStrokeStyle(2, i === this.selectedDifficulty ? COLORS.borderBright : COLORS.border));

    const c = CHARACTERS[this.selectedChar];
    const b = BLESSINGS[this.selectedBlessing];
    const d = DIFFICULTY_TIERS[this.selectedDifficulty];
    this.infoText.setText(
      `${c.name}（${c.jobName}） HP${c.baseStats.maxHP} / MP${c.baseStats.maxMP}\n` +
      `${b.name}: ${b.desc}\n` +
      `${d.displayName}: ${d.description}（開始ゴールド ${d.startingGold}G）`,
    );
  }

  private startRun(): void {
    const char = CHARACTERS[this.selectedChar];
    const blessing: BlessingType = BLESSINGS[this.selectedBlessing].type;
    const run = createRun(char.id, this.selectedDifficulty, blessing);
    run.map = generateMap(run.seed, run.currentFloor);
    saveRun(run);
    this.scene.start('Map');
  }
}

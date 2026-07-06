// リザルト — Unity版 RunSummaryUI.cs + MetaProgression.RecordRunEnd の移植
// 敗北は「状態の記録」のみ (GameOverシーン廃止のUnity版リファクタ準拠)
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { loadRun, clearRun } from '../core/save';
import { recordRunEnd } from '../core/meta';
import { getCharacter } from '../data/characters';

interface ResultInit { won: boolean }

export class ResultScene extends Phaser.Scene {
  private won = false;

  constructor() { super('Result'); }

  init(data: ResultInit): void {
    this.won = data.won;
  }

  create(): void {
    const { width, height } = this.scale;
    drawSceneBackground(this, this.won ? 0x0d1108 : 0x110708);

    const run = loadRun();
    if (!run) { this.scene.start('MainMenu'); return; }

    // 碑文獲得 & メタ記録
    const earned = recordRunEnd(run, this.won);
    clearRun();

    const char = getCharacter(run.characterId);

    this.add.text(width / 2, height * 0.16,
      this.won ? '― 踏 破 ―' : '― 死 は 終 わ り に あ ら ず ―',
      textStyle(44, this.won ? COLORS.textGold : COLORS.textRed)).setOrigin(0.5);

    this.add.text(width / 2, height * 0.16 + 56,
      this.won
        ? `${char.name}は、廃墟の王国の深淵を踏破した。`
        : `${char.name}の旅はここで潰えた。だが、その足跡は碑文となり残る。`,
      textStyle(16, COLORS.textDim)).setOrigin(0.5);

    // 統計
    const stats = [
      ['到達', `第${run.currentFloor + 1}層`],
      ['踏破した部屋', `${run.totalRoomsCleared}`],
      ['倒した敵', `${run.enemiesKilled}`],
      ['獲得ゴールド', `${run.goldEarned} G`],
      ['最終レベル', `Lv.${run.characterLevel} / 職Lv.${run.jobLevel}`],
      ['訪れた出来事', `${run.eventsVisited}`],
    ];

    this.add.rectangle(width / 2, height * 0.5, 520, 250, 0x0e0a18, 0.95)
      .setStrokeStyle(1, COLORS.border);
    stats.forEach(([label, value], i) => {
      const y = height * 0.5 - 95 + i * 40;
      this.add.text(width / 2 - 220, y, label, textStyle(15, COLORS.textDim));
      this.add.text(width / 2 + 220, y, value, textStyle(15)).setOrigin(1, 0);
    });

    // 碑文獲得
    this.add.text(width / 2, height * 0.72,
      `碑文 +${earned} を刻んだ`,
      textStyle(24, COLORS.textGold)).setOrigin(0.5);
    this.add.text(width / 2, height * 0.72 + 32,
      '「彼方の墓標」で碑文を力に変えられる',
      textStyle(13, COLORS.textDim)).setOrigin(0.5);

    makeButton(this, width / 2 - 170, height - 70, '彼方の墓標へ', () => {
      this.scene.start('Meta');
    }, { width: 280 });
    makeButton(this, width / 2 + 170, height - 70, 'メニューへ', () => {
      this.scene.start('MainMenu');
    }, { width: 280 });
  }
}

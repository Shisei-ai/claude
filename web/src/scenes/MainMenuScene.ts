// メインメニュー — Unity版 MainMenuSceneSetup.cs / MainMenuUI.cs の移植
// 「新しい旅を始める」がゲーム開始の唯一の入口 (Unity版リファクタ準拠)
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { hasSavedRun, loadMeta, clearRun } from '../core/save';

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create(): void {
    const { width, height } = this.scale;
    drawSceneBackground(this);

    // タイトル
    this.add.text(width / 2, height * 0.20, 'Dark Chronicle', textStyle(64, COLORS.textGold, {
      fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 12, fill: true },
    })).setOrigin(0.5);
    this.add.text(width / 2, height * 0.20 + 52, '― 廃墟の王国に朽ちぬ魂を ―',
      textStyle(18, COLORS.textDim)).setOrigin(0.5);

    const meta = loadMeta();
    const cx = width / 2;
    let y = height * 0.44;
    const gap = 68;

    makeButton(this, cx, y, '新しい旅を始める', () => {
      clearRun();
      this.scene.start('RunSetup');
    });
    y += gap;

    makeButton(this, cx, y, '旅を再開する', () => {
      this.scene.start('Map');
    }, { disabled: !hasSavedRun() });
    y += gap;

    makeButton(this, cx, y, `彼方の墓標　(碑文 ${meta.totalEpitaphs})`, () => {
      this.scene.start('Meta');
    });
    y += gap;

    // 記録
    this.add.text(cx, height * 0.88,
      `旅の記録:  出立 ${meta.totalRuns} 回 / 踏破 ${meta.totalWins} 回 / 最深到達 第${meta.maxFloor + 1}層`,
      textStyle(14, COLORS.textDim)).setOrigin(0.5);
  }
}

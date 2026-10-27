// メインメニュー — Unity版 MainMenuSceneSetup.cs / MainMenuUI.cs の移植
// 「新しい旅を始める」がゲーム開始の唯一の入口 (Unity版リファクタ準拠)
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, titleStyle, latinStyle, drawSceneBackground, drawOrnamentLine, addAmbientMotes } from '../ui/theme';
import { hasSavedRun, loadMeta, clearRun, saveRun } from '../core/save';
import { dailySetup, createDailyRun } from '../core/daily';
import { generateMap } from '../core/mapgen';
import { playBgm } from '../audio/bgm';

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create(): void {
    const { width, height } = this.scale;
    drawSceneBackground(this, undefined, 'title');

    addAmbientMotes(this, 34);

    // タイトルロゴ: 碑文風の欧文大文字に、古金のグラデーションと淡い後光
    const logoY = height * 0.19;
    const halo = this.add.text(width / 2, logoY, 'DARK CHRONICLE', latinStyle(62, '#c9a35a', true, {
      shadow: { offsetX: 0, offsetY: 0, color: '#b8862e', blur: 26, fill: true, stroke: false },
    })).setOrigin(0.5).setLetterSpacing(10).setAlpha(0.55);
    this.tweens.add({ targets: halo, alpha: 0.2, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const logo = this.add.text(width / 2, logoY, 'DARK CHRONICLE', latinStyle(62, COLORS.textGold, true, {
      shadow: { offsetX: 0, offsetY: 3, color: '#000000', blur: 8, fill: true, stroke: false },
    })).setOrigin(0.5).setLetterSpacing(10);
    const grad = logo.context.createLinearGradient(0, 0, 0, logo.height);
    grad.addColorStop(0, '#f6e3a8');
    grad.addColorStop(0.55, '#d4a955');
    grad.addColorStop(1, '#8a6428');
    logo.setFill(grad);
    drawOrnamentLine(this, width / 2, logoY + 44, 520);
    this.add.text(width / 2, logoY + 70, '廃墟の王国に、朽ちぬ魂を',
      titleStyle(19, COLORS.textDim)).setOrigin(0.5).setLetterSpacing(4);

    const meta = loadMeta();
    const cx = width / 2;

    makeButton(this, cx, 300, '新しい旅を始める', () => {
      clearRun();
      this.scene.start('RunSetup');
    });
    makeButton(this, cx, 364, '旅を再開する', () => {
      this.scene.start('Map');
    }, { disabled: !hasSavedRun() });

    // デイリー挑戦: 今日の旅人と加護は日付で決まる
    const daily = dailySetup();
    const best = meta.dailyRecords[daily.date];
    makeButton(this, cx, 428, `デイリー挑戦　${daily.character.name.split('・')[0]} × ${daily.blessing.name}`, () => {
      clearRun();
      const run = createDailyRun(daily);
      run.map = generateMap(run.seed, run.currentFloor);
      saveRun(run);
      this.scene.start('Prologue');
    }, { width: 420, fontSize: 18 });
    this.add.text(cx, 466,
      best
        ? `今日の最高記録: ${best.won ? '踏破' : `第${best.floor + 1}層`}・${best.rooms}部屋（挑戦 ${best.attempts} 回）`
        : `${daily.date} の挑戦 — 標準難易度・全員同じマップ`,
      textStyle(12, COLORS.textDim)).setOrigin(0.5);

    // 下段: 小さめのボタンを横に並べる
    makeButton(this, cx - 280, 530, `彼方の墓標　(碑文 ${meta.totalEpitaphs})`, () => {
      this.scene.start('Meta');
    }, { width: 280, fontSize: 17 });
    makeButton(this, cx + 20, 530, '図鑑・実績', () => {
      this.scene.start('Codex');
    }, { width: 200, fontSize: 17 });
    makeButton(this, cx + 240, 530, '設定', () => {
      this.scene.start('Settings', { from: 'MainMenu' });
    }, { width: 200, fontSize: 17 });

    playBgm(this, 'title');

    // 記録
    this.add.text(cx, height * 0.88,
      `旅の記録:  出立 ${meta.totalRuns} 回 / 踏破 ${meta.totalWins} 回 / 最深到達 第${meta.maxFloor + 1}層`,
      textStyle(14, COLORS.textDim)).setOrigin(0.5);
  }
}

// メインメニュー — Unity版 MainMenuSceneSetup.cs / MainMenuUI.cs の移植
// 「新しい旅を始める」がゲーム開始の唯一の入口 (Unity版リファクタ準拠)
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { hasSavedRun, loadMeta, clearRun, saveRun } from '../core/save';
import { dailySetup, createDailyRun } from '../core/daily';
import { generateMap } from '../core/mapgen';
import { playBgm } from '../audio/bgm';

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create(): void {
    const { width, height } = this.scale;
    drawSceneBackground(this, undefined, 'title');

    // タイトル
    this.add.text(width / 2, height * 0.20, 'Dark Chronicle', textStyle(64, COLORS.textGold, {
      fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: 4, color: '#000000', blur: 12, fill: true },
    })).setOrigin(0.5);
    this.add.text(width / 2, height * 0.20 + 52, '― 廃墟の王国に朽ちぬ魂を ―',
      textStyle(18, COLORS.textDim)).setOrigin(0.5);

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

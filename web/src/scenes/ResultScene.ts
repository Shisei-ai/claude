// リザルト — Unity版 RunSummaryUI.cs + MetaProgression.RecordRunEnd の移植
// 敗北は「状態の記録」のみ (GameOverシーン廃止のUnity版リファクタ準拠)
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { loadRun, clearRun } from '../core/save';
import { recordRunEnd } from '../core/meta';
import { getCharacter } from '../data/characters';
import { getEnding, getCharacterEpilogue, DEFAULT_ENDING_TEXT } from '../data/endings';
import { hasArt } from './PreloadScene';
import { bgArtKey, ENDING_BG_STEM } from '../data/assets';

interface ResultInit { won: boolean; finale?: boolean }

export class ResultScene extends Phaser.Scene {
  private won = false;
  private finale = false;

  constructor() { super('Result'); }

  init(data: ResultInit): void {
    this.won = data.won;
    this.finale = data.finale ?? false;
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
    const ending = getEnding(run.activeEnding);

    // ── エンディング演出 (最終ボス戦の後のみ / EndingSystem原文) ──
    if (this.finale && (ending || this.won)) {
      const title = ending ? ending.endingTitle : 'エンディング';
      const text = ending
        ? (this.won ? ending.endingTextWon : ending.endingTextLost)
        : DEFAULT_ENDING_TEXT;
      const epilogue = getCharacterEpilogue(run.characterId, this.won);

      // エンディング一枚絵があれば全面表示、無ければ従来の色板
      const endStem = run.activeEnding ? ENDING_BG_STEM[run.activeEnding] : undefined;
      const endKey = endStem ? `ending_${endStem}` : undefined;
      if (endKey && hasArt(this, bgArtKey(endKey))) {
        const img = this.add.image(width / 2, height / 2, bgArtKey(endKey));
        img.setScale(Math.max(width / img.width, height / img.height));
        this.add.rectangle(width / 2, height / 2, width, height, 0x07050d, 0.45);
      } else if (ending) {
        this.add.rectangle(width / 2, height / 2, width, height, ending.tint, 0.25);
      }
      this.add.text(width / 2, 74, title,
        textStyle(32, this.won ? COLORS.textGold : COLORS.textRed)).setOrigin(0.5);
      this.add.text(width / 2, 190, text,
        textStyle(16, COLORS.text, {
          align: 'center', lineSpacing: 12, wordWrap: { width: width - 320 },
        })).setOrigin(0.5, 0);
      if (epilogue) {
        this.add.text(width / 2, 360, `― ${char.name} ―\n\n${epilogue}`,
          textStyle(14, COLORS.textDim, {
            align: 'center', lineSpacing: 8, wordWrap: { width: width - 360 },
          })).setOrigin(0.5, 0);
      }
      this.add.text(width / 2, height - 140,
        `碑文 +${earned} を刻んだ`, textStyle(20, COLORS.textGold)).setOrigin(0.5);
      makeButton(this, width / 2 - 170, height - 70, '彼方の墓標へ', () => {
        this.scene.start('Meta');
      }, { width: 280 });
      makeButton(this, width / 2 + 170, height - 70, 'メニューへ', () => {
        this.scene.start('MainMenu');
      }, { width: 280 });
      return;
    }

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

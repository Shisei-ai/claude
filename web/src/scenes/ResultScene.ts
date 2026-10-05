// リザルト — Unity版 RunSummaryUI.cs + MetaProgression.RecordRunEnd の移植
// 敗北は「状態の記録」のみ (GameOverシーン廃止のUnity版リファクタ準拠)
import Phaser from 'phaser';
import { playBgm } from '../audio/bgm';
import {
  COLORS, makeButton, textStyle, titleStyle, drawSceneBackground, drawPanel, drawOrnamentLine, addVignette,
} from '../ui/theme';
import { loadRun, clearRun } from '../core/save';
import { recordRunEnd } from '../core/meta';
import { getCharacter } from '../data/characters';
import { getEnding, getCharacterEpilogue, DEFAULT_ENDING_TEXT } from '../data/endings';
import { hasArt } from './PreloadScene';
import { LINES, pickLine, shortName } from '../data/dialogue';
import { notifyAchievements } from './ToastScene';
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
    playBgm(this, null);   // 結末は無音で文章を読ませる
    drawSceneBackground(this, this.won ? 0x0d1108 : 0x110708);

    const run = loadRun();
    if (!run) { this.scene.start('MainMenu'); return; }

    // 碑文獲得 & メタ記録
    const earned = recordRunEnd(run, this.won);
    clearRun();
    notifyAchievements(this, run);

    const char = getCharacter(run.characterId);
    const ending = getEnding(run.activeEnding);

    // ── エンディング演出 (最終ボス戦の後のみ / EndingSystem原文) ──
    if (this.finale && (ending || this.won)) {
      const title = ending ? ending.endingTitle : 'エンディング';
      const text = ending
        ? (this.won ? ending.endingTextWon : ending.endingTextLost)
        : DEFAULT_ENDING_TEXT;
      const epilogue = getCharacterEpilogue(run.characterId, this.won);

      // 一枚絵はボスの最期を描くため勝利時のみ。敗北時は最終層アリーナ、どちらも無ければ従来の色板
      const endStem = run.activeEnding ? ENDING_BG_STEM[run.activeEnding] : undefined;
      const endKey = endStem ? `${this.won ? 'ending' : 'arena'}_${endStem}` : undefined;
      const hasPicture = !!endKey && hasArt(this, bgArtKey(endKey));
      const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x07050d, 0);
      if (hasPicture) {
        // 絵をまず見せる: 暗幕なしでゆっくり寄る
        const img = this.add.image(width / 2, height / 2, bgArtKey(endKey!));
        const base = Math.max(width / img.width, height / img.height);
        img.setScale(base);
        this.tweens.add({ targets: img, scale: base * 1.06, duration: 16000, ease: 'Sine.easeOut' });
        shade.setDepth(1);
        addVignette(this, 0.5).setDepth(1);
      } else if (ending) {
        this.add.rectangle(width / 2, height / 2, width, height, ending.tint, 0.25);
      }
      // 題字の下地 (上端から透明へ)
      this.add.graphics().setDepth(2)
        .fillGradientStyle(0x07050d, 0x07050d, 0x07050d, 0x07050d, 0.8, 0.8, 0, 0)
        .fillRect(0, 0, width, 130);
      const titleText = this.add.text(width / 2, 56, title,
        titleStyle(32, this.won ? COLORS.textGold : COLORS.textRed)).setOrigin(0.5).setDepth(3).setAlpha(0);
      const titleLine = drawOrnamentLine(this, width / 2, 88, 460).setDepth(3).setAlpha(0);
      this.tweens.add({ targets: [titleText, titleLine], alpha: 1, duration: 900, delay: 400 });

      const showText = () => {
        this.tweens.add({ targets: shade, fillAlpha: 0.45, duration: 700 });
        const body = this.add.text(width / 2, 0, text, textStyle(16, COLORS.text, {
          align: 'center', lineSpacing: 12, wordWrap: { width: width - 340 },
        })).setOrigin(0.5, 0);
        const epi = epilogue ? this.add.text(width / 2, 0, `― ${char.name} ―\n\n${epilogue}`,
          textStyle(14, COLORS.textDim, {
            align: 'center', lineSpacing: 8, wordWrap: { width: width - 380 },
          })).setOrigin(0.5, 0) : null;
        // 文章量に合わせて装飾パネルを敷く (題字の下〜碑文の上に収める)
        const pad = 26, gap = epi ? 34 : 0;
        const h = pad * 2 + body.height + gap + (epi?.height ?? 0);
        const top = Math.max(112, (112 + height - 160) / 2 - h / 2);
        body.setY(top + pad);
        epi?.setY(top + pad + body.height + gap);
        const panel = drawPanel(this, width / 2, top + h / 2, width - 260, h, { alpha: 0.82 });
        const sep = epi ? drawOrnamentLine(this, width / 2, top + pad + body.height + gap / 2, 260) : null;
        const group = [panel, body, epi, sep].filter((o): o is NonNullable<typeof o> => !!o);
        group.forEach((o) => o.setDepth(o === panel ? 4 : 5).setAlpha(0));
        this.tweens.add({ targets: group, alpha: 1, duration: 800, delay: 200 });

        const epitaph = this.add.text(width / 2, height - 128,
          `碑文 +${earned} を刻んだ`, textStyle(20, COLORS.textGold)).setOrigin(0.5).setDepth(4).setAlpha(0);
        const btnMeta = makeButton(this, width / 2 - 170, height - 66, '彼方の墓標へ', () => {
          this.scene.start('Meta');
        }, { width: 280 });
        const btnMenu = makeButton(this, width / 2 + 170, height - 66, 'メニューへ', () => {
          this.scene.start('MainMenu');
        }, { width: 280 });
        [btnMeta, btnMenu].forEach((b) => b.setDepth(4).setAlpha(0));
        this.tweens.add({ targets: [epitaph, btnMeta, btnMenu], alpha: 1, duration: 600, delay: 900 });
      };

      if (!hasPicture) { showText(); return; }
      // 押すか一定時間で文章へ進む
      const hint = this.add.text(width / 2, height - 40, '― 画面を押して続ける ―',
        textStyle(14, COLORS.textDim)).setOrigin(0.5).setDepth(3).setAlpha(0);
      this.tweens.add({ targets: hint, alpha: 0.85, duration: 900, delay: 1600, yoyo: true, repeat: -1, hold: 600 });
      let advanced = false;
      const advance = () => {
        if (advanced) return;
        advanced = true;
        this.tweens.killTweensOf(hint);
        hint.destroy();
        showText();
      };
      // 直前の戦闘の連打で読み飛ばさないよう、表示直後の短い間だけ入力を無視する (実時間で判定)
      const shownAt = Date.now();
      this.input.on('pointerdown', () => { if (Date.now() - shownAt > 600) advance(); });
      this.time.delayedCall(7000, advance);
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

    // 倒れたときの最後のひとこと
    const lastWords = this.won ? null : pickLine(LINES[run.characterId]?.defeat);
    if (lastWords) {
      this.add.text(width / 2, height * 0.16 + 92, `${shortName(char.name)}「${lastWords}」`,
        textStyle(15, COLORS.text)).setOrigin(0.5);
    }

    // 統計
    const stats = [
      ['到達', `第${run.currentFloor + 1}層`],
      ['踏破した部屋', `${run.totalRoomsCleared}`],
      ['倒した敵', `${run.enemiesKilled}`],
      ['獲得ゴールド', `${run.goldEarned} G`],
      ['最終レベル', `Lv.${run.characterLevel} / 職Lv.${run.jobLevel}`],
      ['訪れた出来事', `${run.eventsVisited}`],
    ];

    drawPanel(this, width / 2, height * 0.5 + 4, 540, 262, { alpha: 0.94 });
    stats.forEach(([label, value], i) => {
      const y = height * 0.5 - 104 + i * 38;
      this.add.text(width / 2 - 230, y, label, textStyle(16, COLORS.textDim));
      this.add.text(width / 2 + 230, y, value, textStyle(16)).setOrigin(1, 0);
    });

    // 碑文獲得
    this.add.text(width / 2, height * 0.72,
      `碑文 +${earned} を刻んだ`,
      textStyle(24, COLORS.textGold)).setOrigin(0.5);
    this.add.text(width / 2, height * 0.72 + 32,
      '「彼方の墓標」で碑文を力に変えられる',
      textStyle(14, COLORS.textDim)).setOrigin(0.5);
    if (run.dailyDate) {
      this.add.text(width / 2, height * 0.72 + 56,
        `デイリー挑戦 ${run.dailyDate} の記録を残した`, textStyle(13, COLORS.textGold)).setOrigin(0.5);
    }

    makeButton(this, width / 2 - 170, height - 70, '彼方の墓標へ', () => {
      this.scene.start('Meta');
    }, { width: 280 });
    makeButton(this, width / 2 + 170, height - 70, 'メニューへ', () => {
      this.scene.start('MainMenu');
    }, { width: 280 });
  }
}

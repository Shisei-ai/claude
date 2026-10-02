// 彼方の墓標 — Unity版 MetaUpgradeSceneSetup.cs / MetaUpgradeUIController.cs の移植
// 5パス × 5ノード = 25ノードのメタ強化ツリー
import Phaser from 'phaser';
import { playBgm } from '../audio/bgm';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { META_NODES, isNodeUnlocked, canUnlockNode, tryUnlockNode } from '../core/meta';
import { loadMeta } from '../core/save';
import { notifyAchievements } from './ToastScene';

export class MetaScene extends Phaser.Scene {
  constructor() { super('Meta'); }

  create(): void {
    const { width, height } = this.scale;
    playBgm(this, 'title');
    drawSceneBackground(this, 0x0a0812, 'meta');

    const meta = loadMeta();

    this.add.text(width / 2, 36, '彼方の墓標', textStyle(34, COLORS.textGold)).setOrigin(0.5);
    this.add.text(width / 2, 72,
      `刻まれた碑文: ${meta.totalEpitaphs}　　倒れた旅人の記憶が、次の旅人の力になる`,
      textStyle(15, COLORS.textDim)).setOrigin(0.5);

    // 5パスを列で表示。カードは説明3行まで収まる高さにし、名前・説明・コストを重ねない
    const paths = [...new Set(META_NODES.map((n) => n.pathName))];
    const colW = (width - 120) / paths.length;
    const cardH = 88;
    const rowGap = 98;
    const firstY = 162;

    paths.forEach((pathName, pi) => {
      const x = 60 + colW * pi + colW / 2;
      this.add.text(x, firstY - cardH / 2 - 16, pathName, textStyle(18, COLORS.textGold)).setOrigin(0.5);

      const nodes = META_NODES.filter((n) => n.pathName === pathName);
      nodes.forEach((node, ni) => {
        const y = firstY + ni * rowGap;
        const unlocked = isNodeUnlocked(node.id);
        const canUnlock = canUnlockNode(node.id);
        const prereqMet = node.requiredNodeIDs.every(isNodeUnlocked);

        // 接続線
        if (ni > 0) {
          this.add.rectangle(x, y - rowGap / 2, 2, rowGap - cardH,
            unlocked ? 0xd9c66b : 0x4a3a66);
        }

        const bg = this.add.rectangle(x, y, colW - 20, cardH,
          unlocked ? 0x2a2410 : canUnlock ? 0x221a33 : 0x151020,
          0.95)
          .setStrokeStyle(unlocked || canUnlock ? 2 : 1,
            unlocked ? 0xd9c66b : canUnlock ? COLORS.borderBright : 0x3a3050);

        // 未解放でも読める明るさにする (以前は背景とほぼ同色で判読できなかった)
        const nameColor = unlocked ? COLORS.textGold : canUnlock ? COLORS.text : '#a79cc0';
        const descColor = unlocked || canUnlock ? COLORS.textDim : '#8a7fa0';
        this.add.text(x, y - cardH / 2 + 14, node.displayName, textStyle(14, nameColor)).setOrigin(0.5);
        this.add.text(x, y - cardH / 2 + 28, node.description, textStyle(10.5, descColor, {
          wordWrap: { width: colW - 32 }, align: 'center', lineSpacing: 1,
        })).setOrigin(0.5, 0);

        // コスト行: 解放できない理由も示す
        let costLabel: string;
        let costColor: string;
        if (unlocked) {
          costLabel = '― 解放済 ―';
          costColor = COLORS.textGold;
        } else if (!prereqMet) {
          costLabel = `前の段階が必要　碑文 ${node.epitaphCost}`;
          costColor = '#8a7fa0';
        } else if (meta.totalEpitaphs < node.epitaphCost) {
          costLabel = `碑文 ${node.epitaphCost}（あと ${node.epitaphCost - meta.totalEpitaphs}）`;
          costColor = '#d98a8a';
        } else {
          costLabel = `碑文 ${node.epitaphCost}　解放できる`;
          costColor = COLORS.textGold;
        }
        this.add.text(x, y + cardH / 2 - 11, costLabel, textStyle(10.5, costColor)).setOrigin(0.5);

        if (canUnlock) {
          bg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => bg.setFillStyle(0x2a2140, 1))
            .on('pointerout', () => bg.setFillStyle(0x221a33, 0.95))
            .on('pointerdown', () => {
              if (tryUnlockNode(node.id)) {
                notifyAchievements(this);
                this.scene.restart();
              }
            });
        }
      });
    });

    makeButton(this, width / 2, height - 42, 'メニューへ戻る', () => {
      this.scene.start('MainMenu');
    }, { width: 280, height: 46 });
  }
}

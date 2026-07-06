// 彼方の墓標 — Unity版 MetaUpgradeSceneSetup.cs / MetaUpgradeUIController.cs の移植
// 5パス × 5ノード = 25ノードのメタ強化ツリー
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground } from '../ui/theme';
import { META_NODES, isNodeUnlocked, canUnlockNode, tryUnlockNode } from '../core/meta';
import { loadMeta } from '../core/save';

export class MetaScene extends Phaser.Scene {
  constructor() { super('Meta'); }

  create(): void {
    const { width, height } = this.scale;
    drawSceneBackground(this, 0x0a0812);

    const meta = loadMeta();

    this.add.text(width / 2, 40, '彼方の墓標', textStyle(34, COLORS.textGold)).setOrigin(0.5);
    this.add.text(width / 2, 76,
      `刻まれた碑文: ${meta.totalEpitaphs}　　倒れた旅人の記憶が、次の旅人の力になる`,
      textStyle(15, COLORS.textDim)).setOrigin(0.5);

    // 5パスを列で表示
    const paths = [...new Set(META_NODES.map((n) => n.pathName))];
    const colW = (width - 120) / paths.length;

    paths.forEach((pathName, pi) => {
      const x = 60 + colW * pi + colW / 2;
      this.add.text(x, 120, pathName, textStyle(18, COLORS.textGold)).setOrigin(0.5);

      const nodes = META_NODES.filter((n) => n.pathName === pathName);
      nodes.forEach((node, ni) => {
        const y = 170 + ni * 92;
        const unlocked = isNodeUnlocked(node.id);
        const canUnlock = canUnlockNode(node.id);

        // 接続線
        if (ni > 0) {
          this.add.rectangle(x, y - 52, 2, 32,
            unlocked ? 0xd9c66b : 0x3a3050);
        }

        const bg = this.add.rectangle(x, y, colW - 28, 76,
          unlocked ? 0x2a2410 : canUnlock ? 0x1c1628 : 0x120e1a,
          0.95)
          .setStrokeStyle(unlocked ? 2 : 1,
            unlocked ? 0xd9c66b : canUnlock ? COLORS.borderBright : 0x2a2440);

        this.add.text(x, y - 22, node.displayName, textStyle(14,
          unlocked ? COLORS.textGold : canUnlock ? COLORS.text : '#554d66')).setOrigin(0.5);
        this.add.text(x, y + 2, node.description, textStyle(10,
          unlocked ? COLORS.textDim : canUnlock ? COLORS.textDim : '#3d374d', {
            wordWrap: { width: colW - 44 }, align: 'center',
          })).setOrigin(0.5, 0);

        if (!unlocked) {
          this.add.text(x, y + 28, `碑文 ${node.epitaphCost}`, textStyle(11,
            canUnlock ? COLORS.textGold : '#554d66')).setOrigin(0.5);
        } else {
          this.add.text(x, y + 28, '― 解放済 ―', textStyle(10, COLORS.textGold)).setOrigin(0.5);
        }

        if (canUnlock) {
          bg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => bg.setFillStyle(0x2a2140, 1))
            .on('pointerout', () => bg.setFillStyle(0x1c1628, 0.95))
            .on('pointerdown', () => {
              if (tryUnlockNode(node.id)) this.scene.restart();
            });
        }
      });
    });

    makeButton(this, width / 2, height - 42, 'メニューへ戻る', () => {
      this.scene.start('MainMenu');
    }, { width: 280, height: 46 });
  }
}

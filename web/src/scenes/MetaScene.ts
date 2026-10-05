// 彼方の墓標 — Unity版 MetaUpgradeSceneSetup.cs / MetaUpgradeUIController.cs の移植
// 6つの道 × 最大10段のメタ強化ツリー (Web版で5段 → 10段に拡張)。
// 縦に長いので、ドラッグ・ホイール・右端の矢印でスクロールする
import Phaser from 'phaser';
import { playBgm } from '../audio/bgm';
import { COLORS, makeButton, textStyle, drawSceneBackground, drawOrnamentLine } from '../ui/theme';
import { META_NODES, isNodeUnlocked, canUnlockNode, tryUnlockNode, type MetaNode } from '../core/meta';
import { loadMeta } from '../core/save';
import { notifyAchievements } from './ToastScene';

const CARD_H = 104;
const ROW_GAP = 114;
/** 5段目と6段目の間に「深層」の見出しを挟む */
const DEEP_FROM = 5;
const DEEP_GAP = 40;
const VIEW_TOP = 96;          // スクロールする範囲の上端 (見出しの下)
const DRAG_THRESHOLD = 10;

export class MetaScene extends Phaser.Scene {
  private tree!: Phaser.GameObjects.Container;
  private minY = 0;
  private maxY = 0;
  private drag: { startY: number; treeY: number; moved: boolean } | null = null;
  private arrows: Phaser.GameObjects.Container[] = [];
  /** 解放したあと描き直しても、同じスクロール位置に戻す */
  private keepScroll: number | null = null;
  private viewBottom = 0;

  constructor() { super('Meta'); }

  init(data: { scroll?: number }): void {
    this.keepScroll = data?.scroll ?? null;
  }

  create(): void {
    const { width, height } = this.scale;
    playBgm(this, 'title');
    drawSceneBackground(this, 0x0a0812, 'meta');

    const meta = loadMeta();
    const total = META_NODES.length;
    const owned = META_NODES.filter((n) => isNodeUnlocked(n.id)).length;

    this.add.text(width / 2, 36, '彼方の墓標', textStyle(34, COLORS.textGold)).setOrigin(0.5).setDepth(10);
    drawOrnamentLine(this, width / 2, 56, 320).setDepth(10);
    const info = this.add.text(width / 2, 76,
      `刻まれた碑文: ${meta.totalEpitaphs}　　解放 ${owned} / ${total}　　倒れた旅人の記憶が、次の旅人の力になる`,
      textStyle(15, COLORS.text)).setOrigin(0.5).setDepth(10);
    // 背景画像の明るい所でも読めるよう、薄い下地を敷く
    this.add.rectangle(width / 2, 76, info.width + 40, info.height + 6, 0x07050d, 0.6).setDepth(9);

    const viewBottom = this.viewBottom = height - 76;
    this.tree = this.add.container(0, 0);
    // 見出しと下のボタンの間だけに見せる
    const maskShape = this.make.graphics({}, false).fillRect(0, VIEW_TOP, width, viewBottom - VIEW_TOP);
    this.tree.setMask(maskShape.createGeometryMask());

    const paths = [...new Set(META_NODES.map((n) => n.pathName))];
    const colW = (width - 120) / paths.length;
    const firstY = VIEW_TOP + 86;   // 道の名前がスクロール範囲の上端で切れないように
    const rowY = (ni: number) => firstY + ni * ROW_GAP + (ni >= DEEP_FROM ? DEEP_GAP : 0);
    let deepestRow = 0;

    paths.forEach((pathName, pi) => {
      const x = 60 + colW * pi + colW / 2;
      this.tree.add(this.add.text(x, firstY - CARD_H / 2 - 16, pathName, textStyle(18, COLORS.textGold)).setOrigin(0.5));
      const nodes = META_NODES.filter((n) => n.pathName === pathName);
      // 深層の段 (碑文80以上) は、短い道でも「深層」の見出しの下から並べる
      const firstDeep = nodes.findIndex((n) => n.epitaphCost >= 80);
      const rowOf = (ni: number) => firstDeep >= 0 && ni >= firstDeep ? DEEP_FROM + (ni - firstDeep) : ni;
      nodes.forEach((node, ni) => {
        const row = rowOf(ni);
        if (isNodeUnlocked(node.id) || canUnlockNode(node.id)) deepestRow = Math.max(deepestRow, row);
        this.drawCard(node, x, rowY(row), colW, ni > 0 ? rowY(rowOf(ni - 1)) : null, meta.totalEpitaphs);
      });
    });

    // 深層の見出し
    const deepY = rowY(DEEP_FROM) - CARD_H / 2 - DEEP_GAP / 2 - 6;
    this.tree.add(this.add.text(width / 2, deepY, '― 深　層 ―', textStyle(16, '#c9a0e0')).setOrigin(0.5));
    const line = this.add.graphics();
    line.lineStyle(1, 0x7a5a9a, 0.7).lineBetween(80, deepY, width / 2 - 70, deepY).lineBetween(width / 2 + 70, deepY, width - 80, deepY);
    this.tree.add(line);

    // スクロールの範囲
    const lastRow = DEEP_FROM + Math.max(...paths.map((p) => META_NODES.filter((n) => n.pathName === p && n.epitaphCost >= 80).length)) - 1;
    const contentBottom = rowY(lastRow) + CARD_H / 2 + 16;
    this.maxY = 0;
    this.minY = Math.min(0, viewBottom - contentBottom);
    this.setupScrolling(viewBottom);
    // 初めて開いたときは、解放できる段が見える位置へ
    this.scrollTo(this.keepScroll ?? -(rowY(deepestRow) - (VIEW_TOP + viewBottom) / 2), false);

    makeButton(this, width / 2, height - 42, 'メニューへ戻る', () => {
      this.scene.start('MainMenu');
    }, { width: 280, height: 46 });
  }

  private drawCard(node: MetaNode, x: number, y: number, colW: number, prevY: number | null, epitaphs: number): void {
    const unlocked = isNodeUnlocked(node.id);
    const canUnlock = canUnlockNode(node.id);
    const prereqMet = node.requiredNodeIDs.every(isNodeUnlocked);
    const deep = node.epitaphCost >= 80;

    // 接続線
    if (prevY !== null) {
      this.tree.add(this.add.rectangle(x, (prevY + y) / 2, 2, y - prevY - CARD_H, unlocked ? 0xd9c66b : 0x4a3a66));
    }

    const bg = this.add.rectangle(x, y, colW - 20, CARD_H,
      unlocked ? 0x2a2410 : canUnlock ? 0x221a33 : deep ? 0x120c1c : 0x151020, 0.95)
      .setStrokeStyle(unlocked || canUnlock ? 2 : 1,
        unlocked ? 0xd9c66b : canUnlock ? COLORS.borderBright : deep ? 0x4a3060 : 0x3a3050);
    this.tree.add(bg);

    // 未解放でも読める明るさにする
    const nameColor = unlocked ? COLORS.textGold : canUnlock ? COLORS.text : '#c4b9d8';
    const descColor = unlocked || canUnlock ? COLORS.textDim : '#a99ebd';
    this.tree.add(this.add.text(x, y - CARD_H / 2 + 15, node.displayName, textStyle(15, nameColor)).setOrigin(0.5));
    this.tree.add(this.add.text(x, y - CARD_H / 2 + 30, node.description, textStyle(11, descColor, {
      wordWrap: { width: colW - 32 }, align: 'center', lineSpacing: 1,
    })).setOrigin(0.5, 0));

    // コスト行: 解放できない理由も示す
    let costLabel: string;
    let costColor: string;
    if (unlocked) {
      costLabel = '― 解放済 ―';
      costColor = COLORS.textGold;
    } else if (!prereqMet) {
      costLabel = `前の段階が必要　碑文 ${node.epitaphCost}`;
      costColor = '#a99ebd';
    } else if (epitaphs < node.epitaphCost) {
      costLabel = `碑文 ${node.epitaphCost}（あと ${node.epitaphCost - epitaphs}）`;
      costColor = '#f09a9a';
    } else {
      costLabel = `碑文 ${node.epitaphCost}　解放できる`;
      costColor = COLORS.textGold;
    }
    this.tree.add(this.add.text(x, y + CARD_H / 2 - 12, costLabel, textStyle(11, costColor)).setOrigin(0.5));

    if (canUnlock) {
      bg.setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x2a2140, 1))
        .on('pointerout', () => bg.setFillStyle(0x221a33, 0.95))
        // 指を離したときに決める (スクロールのために動かした場合は解放しない)
        .on('pointerup', (p: Phaser.Input.Pointer) => {
          // 見えている範囲の外 (隠れているカード) は押せない
          if (this.drag?.moved || p.y < VIEW_TOP || p.y > this.viewBottom) return;
          if (tryUnlockNode(node.id)) {
            notifyAchievements(this);
            this.scene.restart({ scroll: this.tree.y });
          }
        });
    }
  }

  private setupScrolling(viewBottom: number): void {
    const { width } = this.scale;
    const inView = (p: Phaser.Input.Pointer) => p.y > VIEW_TOP && p.y < viewBottom;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.drag = inView(p) ? { startY: p.y, treeY: this.tree.y, moved: false } : null;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag || !p.isDown) return;
      const dy = p.y - this.drag.startY;
      if (!this.drag.moved && Math.abs(dy) < DRAG_THRESHOLD) return;
      this.drag.moved = true;
      this.scrollTo(this.drag.treeY + dy, false);
    });
    this.input.on('pointerup', () => this.time.delayedCall(0, () => { this.drag = null; }));
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      this.scrollTo(this.tree.y - dy, false);
    });

    // 右端の上下の矢印 (まだ先がある側だけ)
    this.arrows = [-1, 1].map((dir) => {
      const y = dir < 0 ? VIEW_TOP + 24 : viewBottom - 24;
      const bg = this.add.circle(0, 0, 20, 0x0c0912, 0.85).setStrokeStyle(1.5, COLORS.trim, 0.9);
      const label = this.add.text(0, 0, dir < 0 ? '▲' : '▼', textStyle(16, COLORS.textGold)).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.scrollTo(this.tree.y - dir * 300, true));
      return this.add.container(width - 26, y, [bg, label]).setDepth(20);
    });
    this.updateArrows();
  }

  private scrollTo(y: number, animate: boolean): void {
    const target = Phaser.Math.Clamp(y, this.minY, this.maxY);
    this.tweens.killTweensOf(this.tree);
    if (animate) {
      this.tweens.add({ targets: this.tree, y: target, duration: 300, ease: 'Cubic.easeOut',
        onUpdate: () => this.updateArrows(), onComplete: () => this.updateArrows() });
    } else {
      this.tree.y = target;
      this.updateArrows();
    }
  }

  private updateArrows(): void {
    if (this.arrows.length < 2) return;
    this.arrows[0].setVisible(this.tree.y < this.maxY - 1);
    this.arrows[1].setVisible(this.tree.y > this.minY + 1);
  }
}

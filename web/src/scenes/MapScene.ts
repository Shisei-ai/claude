// ノードマップ — Unity版 Roguelike/Map/NodeMapUI.cs 相当
// 15行×最大7列のSlay the Spire型マップを描画し、進行先を選ぶ。
// 左 (開始) から右 (ボス) へ進む横長の図で、ドラッグ・ホイール・左右の矢印でスクロールする
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground, drawBar, titleStyle, latinStyle, drawPanel } from '../ui/theme';
import { loadRun, saveRun, clearRun } from '../core/save';
import type { RunState } from '../core/run';
import { getEffectiveMaxHP } from '../core/run';
import { getAvailableNodes, getNode, generateMap, MAP_ROWS, MAP_COLUMNS } from '../core/mapgen';
import type { MapNode, NodeType } from '../core/types';
import { FLOORS } from '../data/enemies';
import { getCharacter } from '../data/characters';
import { heldRelics, hasEffect } from '../core/relics';
import { RARITY_COLOR } from '../data/relics';
import { playBgm } from '../audio/bgm';
import { FIELD_LINES, shortName } from '../data/dialogue';
import { showDialogue } from '../ui/dialogue';
import { notifyAchievements } from './ToastScene';

const NODE_ICONS: Record<NodeType, string> = {
  Battle: '戦', EliteBattle: '強', Boss: '王', Shop: '商',
  RestSite: '火', RandomEvent: '？', Treasure: '宝', CursedRoom: '呪', Start: '·',
};

/** 横長マップの寸法 */
const ROW_GAP = 150;          // 段 (開始→ボス) の間隔 = 横方向
const MAP_MARGIN_X = 110;     // 左右の余白
const MAP_TOP = 178;          // 列 0 の高さ (HUD・レリック行の下)
const MAP_BOTTOM = 628;       // 列 6 の高さ (下のボタンの上)
/** この幅以上指が動いたらドラッグとみなし、ノードには入らない */
const DRAG_THRESHOLD = 10;

const NODE_LABELS: Record<NodeType, string> = {
  Battle: '戦闘', EliteBattle: '強敵', Boss: 'ボス', Shop: '商人',
  RestSite: '焚き火', RandomEvent: '未知', Treasure: '宝箱', CursedRoom: '呪われた間', Start: '開始',
};

export class MapScene extends Phaser.Scene {
  private run!: RunState;
  /** タッチ操作で1回目のタップを受けたノード (2回目で進む) */
  private armedNodeId = -1;
  private tipTimer: Phaser.Time.TimerEvent | null = null;
  /** スクロールするマップ本体 (HUD・ボタンは動かさない) */
  private mapLayer!: Phaser.GameObjects.Container;
  private minScrollX = 0;
  private arrows: Phaser.GameObjects.Container[] = [];
  /** ドラッグ中の状態 (押した位置とその時のマップ位置、ドラッグと判定したか) */
  private drag: { startX: number; layerX: number; moved: boolean } | null = null;

  constructor() { super('Map'); }

  create(): void {
    const run = loadRun();
    if (!run) { this.scene.start('MainMenu'); return; }
    // 中断したノードがあれば、そこから再開する (戦闘を飛ばす・ボス戦で詰むのを防ぐ)
    const pending = run.pendingEncounter;
    if (pending) {
      this.scene.start(pending.scene, { nodeType: pending.nodeType, contentSeed: pending.contentSeed });
      return;
    }
    // 第1層クリア後の幻影加入を選ぶ前に中断していたら、やり直す
    if (run.currentFloor >= 1 && run.currentFloor < 4 && !run.phantomEventDone) {
      this.scene.start('PhantomJoin');
      return;
    }
    // 最終層 (Floor 4) にはマップがない — 直接最終戦へ
    if (run.currentFloor >= 4) { this.scene.start('Finale'); return; }
    this.run = run;
    this.armedNodeId = -1;
    if (!this.run.map) {
      this.run.map = generateMap(this.run.seed, this.run.currentFloor);
      saveRun(this.run);
    }

    const { width, height } = this.scale;
    // 探索マップは戦闘と同じフロア背景を流用
    drawSceneBackground(this, undefined, `floor${Math.min(this.run.currentFloor, 3)}`);

    const floor = FLOORS[Math.min(this.run.currentFloor, FLOORS.length - 1)];
    this.add.text(width / 2, 30,
      `第${this.run.currentFloor + 1}層　${floor.floorName}`,
      titleStyle(28, COLORS.textGold)).setOrigin(0.5).setLetterSpacing(3);
    this.add.text(width / 2, 60, floor.floorSubtitle, textStyle(14, COLORS.textDim)).setOrigin(0.5);

    this.drawHUD();
    this.drawMap();

    makeButton(this, 100, height - 36, 'メニューへ', () => {
      this.scene.start('MainMenu');
    }, { width: 160, height: 40, fontSize: 15 });

    makeButton(this, width - 100, height - 36, '装備', () => {
      this.scene.start('Equip');
    }, { width: 160, height: 40, fontSize: 15 });

    makeButton(this, width - 280, height - 36, '設定', () => {
      this.scene.start('Settings', { from: 'Map' });
    }, { width: 160, height: 40, fontSize: 15 });

    // 記号の凡例 (下端中央)
    const legend = ([['戦', '戦闘'], ['強', '強敵'], ['？', '未知'], ['宝', '宝箱'], ['商', '商人'], ['火', '焚き火'], ['呪', '呪われた間'], ['王', '主']] as const)
      .map(([k, v]) => `${k} ${v}`).join('　');
    this.add.text(width / 2 - 90, height - 36, legend, textStyle(12, COLORS.textDim)).setOrigin(0.5);

    playBgm(this, `floor${Math.min(this.run.currentFloor, 3)}`);
    // 所持金・レリック数などの実績 (イベントや商人での変化もここで拾う)
    notifyAchievements(this, this.run);
    this.maybeShowFloorLine();
  }

  private drawHUD(): void {
    const { width } = this.scale;
    const run = this.run;
    const char = getCharacter(run.characterId);
    const maxHP = getEffectiveMaxHP(run);

    drawPanel(this, width / 2, 98, width - 80, 44, { alpha: 0.88 });

    const nameText = this.add.text(70, 90,
      `${char.name}　Lv.${run.characterLevel}　職Lv.${run.jobLevel}`,
      textStyle(15));
    if (run.soloVow) {
      this.add.text(nameText.x + nameText.width + 14, 92, '◆孤高の誓い', textStyle(12, COLORS.textGold));
    }

    const g = this.add.graphics();
    drawBar(g, width / 2 - 100, 90, 200, 14, run.currentHP / maxHP,
      run.currentHP / maxHP > 0.3 ? COLORS.hpBar : COLORS.hpBarLow);
    this.add.text(width / 2, 97, `${run.currentHP} / ${maxHP}`,
      latinStyle(11, '#ffffff')).setOrigin(0.5);

    this.add.text(width - 320, 90, `◈ ${run.gold} G`, textStyle(15, COLORS.textGold));
    const sanityStr = run.sanity > 0 ? `+${run.sanity}` : `${run.sanity}`;
    this.add.text(width - 180, 90, `正気度 ${sanityStr}`, textStyle(15,
      run.sanity < 0 ? COLORS.textRed : COLORS.textBlue));

    // 所持レリック一覧 (ホバーで詳細)
    const relics = heldRelics(run);
    if (relics.length > 0) {
      const shown = relics.slice(0, 8);
      let x = 70;
      const y = 122;
      for (const r of shown) {
        const label = this.add.text(x, y, `◆${r.name}`, textStyle(11, RARITY_COLOR[r.rarity]))
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => this.showRelicTip(label.x + 40, y - 8, `${r.name}\n${r.description}`))
          // タッチは指を離すと pointerout が来るため、タッチ由来では消さない (タイマーで消す)
          .on('pointerout', (pointer: Phaser.Input.Pointer) => { if (!pointer.wasTouch) this.hideTooltip(); })
          .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // タッチではホバーが無いので、タップで説明を出して数秒後に消す
            if (!pointer.wasTouch) return;
            this.showRelicTip(label.x + 40, y + 150, `${r.name}\n${r.description}`);
            this.tipTimer?.remove();
            this.tipTimer = this.time.delayedCall(3000, () => this.hideTooltip());
          });
        x += label.width + 14;
        if (x > this.scale.width - 200) break;
      }
      if (relics.length > shown.length) {
        this.add.text(x, y, `…他${relics.length - shown.length}`, textStyle(11, COLORS.textDim));
      }
    }
    if (run.curses.length > 0) {
      this.add.text(width - 180, 122, `呪い ×${run.curses.length}`, textStyle(11, COLORS.textRed));
    }

    // 仲間表示
    if (run.partyMembers.length > 0) {
      const partyStr = run.partyMembers.map((m) => {
        const name = getCharacter(m.characterId).name.split('・')[0];
        return m.currentHP > 0
          ? `${name} Lv.${m.characterLevel} ${m.currentHP}/${getEffectiveMaxHP(run, m)}`
          : `${name} Lv.${m.characterLevel} (戦闘不能)`;
      }).join('　');
      this.add.text(width - 560, 122, `仲間: ${partyStr}`, textStyle(11, COLORS.textBlue));
    }
  }

  /** その層に初めて入ったとき、主人公の台詞を出す (Unity版 FieldLines.OnEnterFloorN) */
  private maybeShowFloorLine(): void {
    const run = this.run;
    const floor = run.currentFloor;
    if (run.floorIntroSeen.includes(floor)) return;
    run.floorIntroSeen.push(floor);
    saveRun(run);
    let line = FIELD_LINES[run.characterId]?.[floor];
    if (!line) return;
    if (line.includes('{ALLY}')) {
      const ally = run.partyMembers.find((m) => m.currentHP > 0) ?? run.partyMembers[0];
      if (!ally) return;   // 同行者がいなければ、仲間に呼びかける台詞は出さない
      line = line.replace('{ALLY}', shortName(getCharacter(ally.characterId).name));
    }
    showDialogue(this, { characterId: run.characterId, lines: [line] });
  }

  private showRelicTip(x: number, y: number, text: string): void {
    this.hideTooltip();
    const label = this.add.text(0, 0, text, textStyle(12, COLORS.text, {
      wordWrap: { width: 300 }, align: 'left',
    })).setOrigin(0, 1);
    const bg = this.add.rectangle(-8, 8, label.width + 16, label.height + 16, 0x000000, 0.92)
      .setStrokeStyle(1, COLORS.border).setOrigin(0, 1);
    this.tooltip = this.add.container(x, y, [bg, label]).setDepth(100);
  }

  private drawMap(): void {
    const { width } = this.scale;
    const map = this.run.map!;
    const available = new Set(getAvailableNodes(map, this.run.currentNodeId).map((n) => n.id));
    const layer = this.mapLayer = this.add.container(0, 0).setDepth(5);

    // 段は左→右、列は上→下に並べる
    const colGap = (MAP_BOTTOM - MAP_TOP) / (MAP_COLUMNS - 1);
    const nodeX = (row: number) => MAP_MARGIN_X + row * ROW_GAP;
    const nodeY = (col: number) => MAP_TOP + col * colGap;
    const contentW = MAP_MARGIN_X * 2 + (MAP_ROWS - 1) * ROW_GAP;
    this.minScrollX = Math.min(0, width - contentW);

    // エッジ描画。背景画像の上でも道筋が追えるよう、暗い縁取りの上に明るめの線を重ねる
    const shadow = this.add.graphics();
    const g = this.add.graphics();
    layer.add([shadow, g]);
    for (const node of map.nodes) {
      for (const nextId of node.nextIDs) {
        const next = getNode(map, nextId)!;
        const visited = node.visited && next.visited;
        const reachable = node.id === this.run.currentNodeId && available.has(nextId);
        const x1 = nodeX(node.row), y1 = nodeY(node.column);
        const x2 = nodeX(next.row), y2 = nodeY(next.column);
        const w = reachable ? 3.5 : visited ? 3 : 2;
        shadow.lineStyle(w + 4, 0x000000, 0.55).lineBetween(x1, y1, x2, y2);
        g.lineStyle(w,
          visited ? 0x9a8abd : reachable ? 0xd9c66b : 0x8a7fa8,
          visited || reachable ? 0.95 : 0.7);
        g.lineBetween(x1, y1, x2, y2);
      }
    }

    // ノード描画
    for (const node of map.nodes) {
      const x = nodeX(node.row);
      const y = nodeY(node.column);
      const isAvailable = available.has(node.id);
      const isCurrent = node.id === this.run.currentNodeId;

      const radius = node.type === 'Boss' ? 38 : node.type === 'EliteBattle' ? 28 : 24;
      const fill = isCurrent ? 0xd9c66b
        : node.visited ? 0x3a3050
        : isAvailable ? 0x2a2140
        : 0x171226;
      const stroke = isAvailable ? 0xd9c66b : node.visited ? 0x6a5a8a : 0x4a3f62;

      // ボスは紅い外輪、進める場所は古金の輪が脈打つ
      if (node.type === 'Boss') {
        layer.add(this.add.circle(x, y, radius + 7).setStrokeStyle(3, 0x9a2a36, 0.9));
      }
      if (isAvailable) {
        const ring = this.add.circle(x, y, radius + 4).setStrokeStyle(2.5, COLORS.trimBright, 0.9);
        layer.add(ring);
        this.tweens.add({ targets: ring, scale: 1.4, alpha: 0, duration: 1300, repeat: -1, ease: 'Sine.easeOut' });
      }
      const circle = this.add.circle(x, y, radius, fill)
        .setStrokeStyle(isAvailable ? 3 : 1.5, stroke);
      layer.add(circle);

      const iconColor = node.type === 'Boss' ? '#ffd24a'
        : node.type === 'EliteBattle' ? '#e08a5a'
        : node.type === 'CursedRoom' ? '#c05a7a'
        : node.type === 'RestSite' ? '#e0a05a'
        : '#d8d0e8';
      layer.add(this.add.text(x, y, NODE_ICONS[node.type], textStyle(Math.round(radius * 0.95), isCurrent ? '#2a1a08' : iconColor))
        .setOrigin(0.5).setAlpha(node.visited && !isCurrent ? 0.5 : 1));

      if (isAvailable) {
        circle.setInteractive({ useHandCursor: true })
          .on('pointerover', (pointer: Phaser.Input.Pointer) => {
            if (this.drag?.moved) return;
            circle.setScale(1.15);
            this.showTooltip(x, y - radius, node, pointer.wasTouch);   // タッチなら案内文つき
          })
          .on('pointerout', () => {
            // タッチで1回目のタップを受けたノードは、指を離しても名前を出したままにする
            if (this.armedNodeId === node.id) return;
            circle.setScale(1);
            this.hideTooltip();
          })
          // 指を離したときに決める (押したままマップを動かした場合は進まない)
          .on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.drag?.moved) return;
            if (pointer.wasTouch && this.armedNodeId !== node.id) {
              this.armedNodeId = node.id;
              this.showTooltip(x, y - radius, node, true);
              return;
            }
            this.enterNode(node);
          });

        this.tweens.add({
          targets: circle, alpha: { from: 1, to: 0.65 },
          duration: 800, yoyo: true, repeat: -1,
        });
      }
    }

    this.setupScrolling();
    // 今いる段 (未選択なら開始の段) が左寄りに見える位置から始める
    const cur = this.run.currentNodeId >= 0 ? getNode(map, this.run.currentNodeId) : undefined;
    this.scrollTo(width * 0.3 - nodeX(cur?.row ?? 0), false);
  }

  /** ドラッグ・ホイール・左右の矢印でマップを横に動かす */
  private setupScrolling(): void {
    const { width } = this.scale;
    const inMapBand = (p: Phaser.Input.Pointer) => p.y > MAP_TOP - 50 && p.y < MAP_BOTTOM + 40;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.drag = inMapBand(p) ? { startX: p.x, layerX: this.mapLayer.x, moved: false } : null;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag || !p.isDown) return;
      const dx = p.x - this.drag.startX;
      if (!this.drag.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (!this.drag.moved) { this.drag.moved = true; this.hideTooltip(); this.armedNodeId = -1; }
      this.scrollTo(this.drag.layerX + dx, false);
    });
    // ノードの pointerup より後に片付ける (ドラッグ直後のクリックを無視するため)
    this.input.on('pointerup', () => this.time.delayedCall(0, () => { this.drag = null; }));
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, dx: number, dy: number) => {
      this.hideTooltip();
      this.scrollTo(this.mapLayer.x - (Math.abs(dx) > Math.abs(dy) ? dx : dy), false);
    });

    // 左右の矢印 (まだ先がある側だけ出す)
    const midY = (MAP_TOP + MAP_BOTTOM) / 2;
    this.arrows = [-1, 1].map((dir) => {
      const x = dir < 0 ? 28 : width - 28;
      const bg = this.add.circle(0, 0, 22, 0x0c0912, 0.85).setStrokeStyle(1.5, COLORS.trim, 0.9);
      const label = this.add.text(0, 0, dir < 0 ? '◀' : '▶', textStyle(18, COLORS.textGold)).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        this.hideTooltip();
        this.scrollTo(this.mapLayer.x - dir * width * 0.55, true);
      });
      return this.add.container(x, midY, [bg, label]).setDepth(20);
    });
    this.updateArrows();
  }

  private scrollTo(x: number, animate: boolean): void {
    const target = Phaser.Math.Clamp(x, this.minScrollX, 0);
    this.tweens.killTweensOf(this.mapLayer);
    if (animate) {
      this.tweens.add({ targets: this.mapLayer, x: target, duration: 350, ease: 'Cubic.easeOut',
        onUpdate: () => this.updateArrows(), onComplete: () => this.updateArrows() });
    } else {
      this.mapLayer.x = target;
      this.updateArrows();
    }
  }

  private updateArrows(): void {
    if (this.arrows.length < 2) return;
    this.arrows[0].setVisible(this.mapLayer.x < -1);
    this.arrows[1].setVisible(this.mapLayer.x > this.minScrollX + 1);
  }

  private tooltip: Phaser.GameObjects.Container | null = null;

  /** ノードの名前 (x, y はマップ上の位置。ノードの上端を渡す) */
  private showTooltip(x: number, y: number, node: MapNode, touchHint = false): void {
    this.hideTooltip();
    const text = touchHint ? `${NODE_LABELS[node.type]}（もう一度タップで進む）` : NODE_LABELS[node.type];
    const label = this.add.text(0, 0, text, textStyle(14)).setOrigin(0.5);
    const bg = this.add.rectangle(0, 0, label.width + 22, 28, 0x000000, 0.85)
      .setStrokeStyle(1, COLORS.border);
    // 画面からはみ出さない位置に出す (マップはスクロールしているので画面上の位置に直す)
    const { width } = this.scale;
    const sx = Phaser.Math.Clamp(this.mapLayer.x + x, bg.width / 2 + 8, width - bg.width / 2 - 8);
    this.tooltip = this.add.container(sx, y - 22, [bg, label]).setDepth(100);
  }

  private hideTooltip(): void {
    this.tooltip?.destroy();
    this.tooltip = null;
  }

  private enterNode(node: MapNode): void {
    const map = this.run.map!;
    const target = getNode(map, node.id)!;
    target.visited = true;
    this.run.currentNodeId = node.id;

    // 古の呪像: 部屋に入るたびHP5%を失う (死にはしない)
    if (hasEffect(this.run, 'AncientCurse')) {
      const drain = Math.round(getEffectiveMaxHP(this.run) * 0.05);
      this.run.currentHP = Math.max(1, this.run.currentHP - drain);
    }

    // 完了するまで「進行中」として保存 (中断→再開でここに戻る)
    const isBattle = node.type === 'Battle' || node.type === 'EliteBattle' || node.type === 'Boss';
    this.run.pendingEncounter = {
      scene: isBattle ? 'Battle' : 'NodeEvent',
      nodeType: node.type,
      contentSeed: node.contentSeed,
    };
    saveRun(this.run);
    this.scene.start(this.run.pendingEncounter.scene,
      { nodeType: node.type, contentSeed: node.contentSeed });
  }
}

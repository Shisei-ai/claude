// ノードマップ — Unity版 Roguelike/Map/NodeMapUI.cs 相当
// 15行×最大7列のSlay the Spire型マップを描画し、進行先を選ぶ。
// 左 (開始) から右 (ボス) へ進む横長の図で、ドラッグ・ホイール・左右の矢印でスクロールする
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground, drawBar, titleStyle, latinStyle, drawPanel } from '../ui/theme';
import { loadRun, saveRun, clearRun } from '../core/save';
import type { RunState } from '../core/run';
import { getEffectiveMaxHP, getMaxMP } from '../core/run';
import { getAvailableNodes, getNode, generateMap, MAP_ROWS, MAP_COLUMNS } from '../core/mapgen';
import type { MapNode, NodeType } from '../core/types';
import { FLOORS } from '../data/enemies';
import { getCharacter } from '../data/characters';
import { heldRelics, hasEffect } from '../core/relics';
import { RARITY_COLOR, RARITY_LABEL } from '../data/relics';
import { CURSE_INFO } from '../core/relics';
import { playBgm } from '../audio/bgm';
import { FIELD_LINES, shortName } from '../data/dialogue';
import { showDialogue } from '../ui/dialogue';
import { notifyAchievements } from './ToastScene';
import { ensureNodeIcons, nodeIconKey } from '../ui/nodeIcons';
import { openCharacterSheet, isSheetOpen } from '../ui/characterSheet';

/** ノード記号の色 (白で描いたアイコンに掛ける) */
const ICON_TINT: Record<NodeType, number> = {
  Battle: 0xd8d0e8, EliteBattle: 0xe08a5a, Boss: 0xffd24a, Shop: 0xe2c27a,
  RestSite: 0xf0a85a, RandomEvent: 0x9ab8ff, Treasure: 0xe2c27a, CursedRoom: 0xc05a7a, Start: 0xd8d0e8,
};

/** 横長マップの寸法 */
const ROW_GAP = 150;          // 段 (開始→ボス) の間隔 = 横方向
const MAP_MARGIN_X = 110;     // 左右の余白
const MAP_TOP = 178;          // 列 0 の高さ (HUD・仲間行の下)
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
  /** スクロールするマップ本体 (HUD・ボタンは動かさない) */
  private mapLayer!: Phaser.GameObjects.Container;
  private minScrollX = 0;
  private arrows: Phaser.GameObjects.Container[] = [];
  /** ドラッグ中の状態 (押した位置とその時のマップ位置、ドラッグと判定したか) */
  private drag: { startX: number; layerX: number; moved: boolean } | null = null;
  /** レリック一覧を開いている間は、マップのスクロールを止める */
  private relicList: { layer: Phaser.GameObjects.Container; list: Phaser.GameObjects.Container; minY: number } | null = null;

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
    this.add.text(width / 2, 61, floor.floorSubtitle, textStyle(15, '#d8cfe6')).setOrigin(0.5);

    ensureNodeIcons(this);
    this.drawHUD();
    this.drawMap();

    makeButton(this, 90, height - 36, 'メニューへ', () => {
      this.scene.start('MainMenu');
    }, { width: 140, height: 40, fontSize: 15 });

    makeButton(this, width - 85, height - 36, '装備', () => {
      this.scene.start('Equip');
    }, { width: 130, height: 40, fontSize: 15 });

    makeButton(this, width - 225, height - 36, '設定', () => {
      this.scene.start('Settings', { from: 'Map' });
    }, { width: 130, height: 40, fontSize: 15 });

    makeButton(this, width - 365, height - 36, `レリック ${this.run.relics.length}`, () => {
      this.openRelicList();
    }, { width: 130, height: 40, fontSize: 15 });

    this.drawLegend((170 + width - 430) / 2, height - 36);

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

    // 名前を押すと能力表 (ステータス・スキル) を開く
    const nameText = this.add.text(70, 90,
      `${char.name}　Lv.${run.characterLevel}　職Lv.${run.jobLevel}`,
      textStyle(15)).setInteractive({ useHandCursor: true })
      .on('pointerup', () => { if (!this.relicList) openCharacterSheet(this, { characterId: run.characterId, run, unit: run }); });
    if (run.soloVow) {
      this.add.text(nameText.x + nameText.width + 14, 92, '◆孤高の誓い', textStyle(12, COLORS.textGold));
    }

    // HPとMP (MPは戦闘をまたいで持ち越す)
    const maxMP = getMaxMP(run);
    const g = this.add.graphics();
    drawBar(g, width / 2 - 100, 81, 200, 14, run.currentHP / maxHP,
      run.currentHP / maxHP > 0.3 ? COLORS.hpBar : COLORS.hpBarLow);
    this.add.text(width / 2, 88, `${run.currentHP} / ${maxHP}`,
      latinStyle(11, '#ffffff')).setOrigin(0.5);
    drawBar(g, width / 2 - 100, 99, 200, 12, maxMP > 0 ? run.currentMP / maxMP : 0, COLORS.mpBar);
    this.add.text(width / 2, 105, `MP ${run.currentMP} / ${maxMP}`,
      latinStyle(11, '#ffffff')).setOrigin(0.5);

    this.add.text(width - 320, 90, `◈ ${run.gold} G`, textStyle(15, COLORS.textGold));
    const sanityStr = run.sanity > 0 ? `+${run.sanity}` : `${run.sanity}`;
    this.add.text(width - 180, 90, `正気度 ${sanityStr}`, textStyle(15,
      run.sanity < 0 ? COLORS.textRed : COLORS.textBlue));

    if (run.curses.length > 0) {
      this.add.text(width - 180, 122, `呪い ×${run.curses.length}`, textStyle(11, COLORS.textRed));
    }

    // 仲間表示
    if (run.partyMembers.length > 0) {
      const partyStr = run.partyMembers.map((m) => {
        const name = getCharacter(m.characterId).name.split('・')[0];
        return m.currentHP > 0
          ? `${name} Lv.${m.characterLevel} HP ${m.currentHP}/${getEffectiveMaxHP(run, m)} MP ${m.currentMP}/${getMaxMP(run, m)}`
          : `${name} Lv.${m.characterLevel} (戦闘不能)`;
      }).join('　');
      const m = run.partyMembers[0];
      this.add.text(width - 560, 122, `仲間: ${partyStr}`, textStyle(11, COLORS.textBlue))
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => { if (!this.relicList) openCharacterSheet(this, { characterId: m.characterId, run, unit: m }); });
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

  /** 記号の凡例 (アイコン + 名前を横に並べ、cx を中心に置く) */
  private drawLegend(cx: number, y: number): void {
    const entries: [NodeType, string][] = [
      ['Battle', '戦闘'], ['EliteBattle', '強敵'], ['RandomEvent', '未知'], ['Treasure', '宝箱'],
      ['Shop', '商人'], ['RestSite', '焚き火'], ['CursedRoom', '呪われた間'], ['Boss', '主'],
    ];
    const parts = entries.map(([type, label]) => ({
      icon: this.add.image(0, y, nodeIconKey(type)).setDisplaySize(22, 22).setTint(ICON_TINT[type]),
      text: this.add.text(0, y, label, textStyle(12, COLORS.textDim)).setOrigin(0, 0.5),
    }));
    const gap = 14;
    const total = parts.reduce((w, pt) => w + 22 + 4 + pt.text.width, 0) + gap * (parts.length - 1);
    let x = cx - total / 2;
    for (const pt of parts) {
      pt.icon.setX(x + 11);
      pt.text.setX(x + 26);
      x += 26 + pt.text.width + gap;
    }
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

      // 記号は円の中に収まる大きさで (今いる場所は金の円の上に暗い色で)
      const iconSize = radius * 1.5;
      layer.add(this.add.image(x, y, nodeIconKey(node.type)).setDisplaySize(iconSize, iconSize)
        .setTint(isCurrent ? 0x2a1a08 : ICON_TINT[node.type])
        .setAlpha(node.visited && !isCurrent ? 0.5 : 1));

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
      this.drag = inMapBand(p) && !this.relicList && !isSheetOpen(this) ? { startX: p.x, layerX: this.mapLayer.x, moved: false } : null;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.relicList) { this.dragRelicList(p); return; }
      if (!this.drag || !p.isDown) return;
      const dx = p.x - this.drag.startX;
      if (!this.drag.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (!this.drag.moved) { this.drag.moved = true; this.hideTooltip(); this.armedNodeId = -1; }
      this.scrollTo(this.drag.layerX + dx, false);
    });
    // ノードの pointerup より後に片付ける (ドラッグ直後のクリックを無視するため)
    this.input.on('pointerup', () => this.time.delayedCall(0, () => { this.drag = null; }));
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, dx: number, dy: number) => {
      if (this.relicList) { this.scrollRelicList(this.relicList.list.y - dy); return; }
      if (isSheetOpen(this)) return;
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

  // ── 所持レリックの一覧 ─────────────────────────────────────────────
  private relicDrag: { startY: number; listY: number } | null = null;

  private openRelicList(): void {
    if (this.relicList) return;
    this.hideTooltip();
    const { width, height } = this.scale;
    const run = this.run;
    const layer = this.add.container(0, 0).setDepth(300);
    // 下の画面を押せないよう全面を覆う。外側を押しても閉じる
    const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setInteractive();
    layer.add(shade);
    const pw = 1000, ph = 580, top = height / 2 - ph / 2;
    layer.add(drawPanel(this, width / 2, height / 2, pw, ph, { alpha: 0.97 }));

    // 同じレリックはまとめて個数を出す (強欲の合わせ鏡で重複することがある)
    const counts = new Map<string, number>();
    for (const id of run.relics) counts.set(id, (counts.get(id) ?? 0) + 1);
    const relics = heldRelics(run).filter((r, i, a) => a.findIndex((x) => x.id === r.id) === i);
    layer.add(this.add.text(width / 2, top + 30, `所持レリック　${run.relics.length}`, titleStyle(24)).setOrigin(0.5));

    // 一覧 (枠の中だけ見せ、ドラッグ・ホイールで縦にスクロール)
    const viewTop = top + 62, viewBottom = top + ph - 64;
    const list = this.add.container(0, 0);
    layer.add(list);
    const mask = this.make.graphics({}, false).fillRect(width / 2 - pw / 2 + 10, viewTop, pw - 20, viewBottom - viewTop);
    list.setMask(mask.createGeometryMask());
    const left = width / 2 - pw / 2 + 40;
    let y = viewTop + 8;
    const row = (name: string, color: string, desc: string) => {
      const n = this.add.text(left, y, name, textStyle(14, color, { wordWrap: { width: 300 } }));
      const d = this.add.text(left + 320, y + 1, desc, textStyle(13, COLORS.textDim, { wordWrap: { width: pw - 400 } }));
      const h = Math.max(n.height, d.height);
      list.add([n, d, this.add.rectangle(width / 2, y + h + 7, pw - 80, 1, COLORS.trim, 0.25)]);
      y += h + 15;
    };
    if (relics.length === 0) {
      list.add(this.add.text(width / 2, y + 40, 'まだレリックを持っていない。\n強敵やボスを倒すと手に入る。',
        textStyle(15, COLORS.textDim, { align: 'center' })).setOrigin(0.5, 0));
      y += 110;
    }
    for (const r of relics) {
      const n = counts.get(r.id) ?? 1;
      row(`【${RARITY_LABEL[r.rarity]}】${r.name}${n > 1 ? `　×${n}` : ''}`, RARITY_COLOR[r.rarity], r.description);
    }
    if (run.curses.length > 0) {
      y += 10;
      list.add(this.add.text(left, y, `◆ 受けている呪い　${run.curses.length}`, textStyle(15, COLORS.textRed)));
      y += 30;
      for (const c of run.curses) {
        const info = CURSE_INFO[c as keyof typeof CURSE_INFO];
        if (info) row(`【呪い】${info.name}`, COLORS.textRed, info.desc);
      }
    }
    const minY = Math.min(0, viewBottom - (y + 8));
    if (minY < 0) {
      layer.add(this.add.text(width / 2 + pw / 2 - 30, top + 30, 'ドラッグ・ホイールでスクロール', textStyle(11, COLORS.textDim)).setOrigin(1, 0.5));
    }

    const close = () => { layer.destroy(); mask.destroy(); this.relicList = null; this.relicDrag = null; };
    layer.add(makeButton(this, width / 2, top + ph - 32, '閉じる', close, { width: 200, height: 40, fontSize: 15 }));
    shade.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // 枠の外を押したら閉じる。枠の中ならスクロールの起点にする
      if (Math.abs(p.x - width / 2) > pw / 2 || Math.abs(p.y - height / 2) > ph / 2) { close(); return; }
      this.relicDrag = { startY: p.y, listY: list.y };
    });
    shade.on('pointerup', () => { this.relicDrag = null; });
    this.relicList = { layer, list, minY };
  }

  private dragRelicList(p: Phaser.Input.Pointer): void {
    if (!this.relicDrag || !p.isDown) return;
    this.scrollRelicList(this.relicDrag.listY + (p.y - this.relicDrag.startY));
  }

  private scrollRelicList(y: number): void {
    if (!this.relicList) return;
    this.relicList.list.y = Phaser.Math.Clamp(y, this.relicList.minY, 0);
  }

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

// ノードマップ — Unity版 Roguelike/Map/NodeMapUI.cs 相当
// 15行×最大7列のSlay the Spire型マップを描画し、進行先を選ぶ
import Phaser from 'phaser';
import { COLORS, makeButton, textStyle, drawSceneBackground, drawBar, titleStyle, latinStyle, drawPanel } from '../ui/theme';
import { loadRun, saveRun, clearRun } from '../core/save';
import type { RunState } from '../core/run';
import { getEffectiveMaxHP } from '../core/run';
import { getAvailableNodes, getNode, generateMap } from '../core/mapgen';
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

const NODE_LABELS: Record<NodeType, string> = {
  Battle: '戦闘', EliteBattle: '強敵', Boss: 'ボス', Shop: '商人',
  RestSite: '焚き火', RandomEvent: '未知', Treasure: '宝箱', CursedRoom: '呪われた間', Start: '開始',
};

export class MapScene extends Phaser.Scene {
  private run!: RunState;
  /** タッチ操作で1回目のタップを受けたノード (2回目で進む) */
  private armedNodeId = -1;
  private tipTimer: Phaser.Time.TimerEvent | null = null;

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
    const { width, height } = this.scale;
    const map = this.run.map!;
    const available = new Set(getAvailableNodes(map, this.run.currentNodeId).map((n) => n.id));

    // 最下段 (開始) と最上段 (ボス) の位置。ボスはHUDの下端 (レリック行 y≈135) より下に置く
    // (以前はボス行が y=140 でHUDと重なっていた)
    const topY = height - 72;
    const bossY = 166;
    const rowGap = (topY - bossY) / 14;
    const colGap = (width - 300) / 6;
    const nodeX = (col: number) => 150 + col * colGap;
    const nodeY = (row: number) => topY - row * rowGap;

    // エッジ描画。背景画像の上でも道筋が追えるよう、暗い縁取りの上に明るめの線を重ねる
    const shadow = this.add.graphics();
    const g = this.add.graphics();
    for (const node of map.nodes) {
      for (const nextId of node.nextIDs) {
        const next = getNode(map, nextId)!;
        const visited = node.visited && next.visited;
        const reachable = node.id === this.run.currentNodeId && available.has(nextId);
        const x1 = nodeX(node.column), y1 = nodeY(node.row);
        const x2 = nodeX(next.column), y2 = nodeY(next.row);
        const w = reachable ? 2.5 : visited ? 2 : 1.5;
        shadow.lineStyle(w + 3, 0x000000, 0.55).lineBetween(x1, y1, x2, y2);
        g.lineStyle(w,
          visited ? 0x9a8abd : reachable ? 0xd9c66b : 0x8a7fa8,
          visited || reachable ? 0.95 : 0.7);
        g.lineBetween(x1, y1, x2, y2);
      }
    }

    // ノード描画
    for (const node of map.nodes) {
      const x = nodeX(node.column);
      const y = nodeY(node.row);
      const isAvailable = available.has(node.id);
      const isCurrent = node.id === this.run.currentNodeId;

      const radius = node.type === 'Boss' ? 22 : node.type === 'EliteBattle' ? 16 : 13;
      const fill = isCurrent ? 0xd9c66b
        : node.visited ? 0x3a3050
        : isAvailable ? 0x2a2140
        : 0x171226;
      const stroke = isAvailable ? 0xd9c66b : node.visited ? 0x6a5a8a : 0x2a2440;

      // ボスは紅い外輪、進める場所は古金の輪が脈打つ
      if (node.type === 'Boss') {
        this.add.circle(x, y, radius + 5).setStrokeStyle(2, 0x9a2a36, 0.9);
      }
      if (isAvailable) {
        const ring = this.add.circle(x, y, radius + 3).setStrokeStyle(2, COLORS.trimBright, 0.9);
        this.tweens.add({ targets: ring, scale: 1.45, alpha: 0, duration: 1300, repeat: -1, ease: 'Sine.easeOut' });
      }
      const circle = this.add.circle(x, y, radius, fill)
        .setStrokeStyle(isAvailable ? 2 : 1, stroke);

      const iconColor = node.type === 'Boss' ? '#ffd24a'
        : node.type === 'EliteBattle' ? '#e08a5a'
        : node.type === 'CursedRoom' ? '#c05a7a'
        : node.type === 'RestSite' ? '#e0a05a'
        : '#d8d0e8';
      this.add.text(x, y, NODE_ICONS[node.type], textStyle(radius, iconColor))
        .setOrigin(0.5).setAlpha(node.visited && !isCurrent ? 0.5 : 1);

      if (isAvailable) {
        circle.setInteractive({ useHandCursor: true })
          .on('pointerover', (pointer: Phaser.Input.Pointer) => {
            circle.setScale(1.25);
            this.showTooltip(x, y, node, pointer.wasTouch);   // タッチなら案内文つき
          })
          .on('pointerout', () => {
            // タッチで1回目のタップを受けたノードは、指を離しても名前を出したままにする
            if (this.armedNodeId === node.id) return;
            circle.setScale(1);
            this.hideTooltip();
          })
          .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.wasTouch && this.armedNodeId !== node.id) {
              this.armedNodeId = node.id;
              this.showTooltip(x, y, node, true);
              return;
            }
            this.enterNode(node);
          });

        this.tweens.add({
          targets: circle, alpha: { from: 1, to: 0.6 },
          duration: 800, yoyo: true, repeat: -1,
        });
      }
    }
  }

  private tooltip: Phaser.GameObjects.Container | null = null;

  private showTooltip(x: number, y: number, node: MapNode, touchHint = false): void {
    this.hideTooltip();
    const text = touchHint ? `${NODE_LABELS[node.type]}（もう一度タップで進む）` : NODE_LABELS[node.type];
    const label = this.add.text(0, 0, text, textStyle(13)).setOrigin(0.5);
    const bg = this.add.rectangle(0, 0, label.width + 20, 26, 0x000000, 0.85)
      .setStrokeStyle(1, COLORS.border);
    this.tooltip = this.add.container(x, y - 34, [bg, label]).setDepth(100);
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

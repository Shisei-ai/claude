// 実績解除の通知 — 他のシーンの上に常駐し、画面が切り替わっても通知を出し切る
import Phaser from 'phaser';
import { COLORS, textStyle } from '../ui/theme';
import { playSfx } from '../audio/sfx';
import { checkAchievements, type AchievementDef } from '../core/achievements';
import type { RunState } from '../core/run';

export class ToastScene extends Phaser.Scene {
  private queue: AchievementDef[] = [];
  private busy = false;

  constructor() { super({ key: 'Toast', active: true }); }

  enqueue(list: AchievementDef[]): void {
    this.queue.push(...list);
    if (!this.busy) this.next();
  }

  private next(): void {
    const a = this.queue.shift();
    if (!a) { this.busy = false; return; }
    this.busy = true;
    playSfx('buff');

    const { width } = this.scale;
    const w = 330, h = 64;
    const bg = this.add.rectangle(0, 0, w, h, 0x0e0a18, 0.96).setStrokeStyle(2, 0xd9c66b);
    const head = this.add.text(-w / 2 + 14, -h / 2 + 8, '実績解除', textStyle(11, COLORS.textGold));
    const name = this.add.text(-w / 2 + 14, -h / 2 + 22, a.name, textStyle(17, COLORS.text));
    const desc = this.add.text(w / 2 - 12, -h / 2 + 10, a.desc, textStyle(11, COLORS.textDim)).setOrigin(1, 0);
    const box = this.add.container(width + w / 2, 20 + h / 2, [bg, head, name, desc]);

    this.tweens.add({ targets: box, x: width - w / 2 - 16, duration: 280, ease: 'Cubic.easeOut' });
    this.tweens.add({
      targets: box, alpha: 0, delay: 3000, duration: 400,
      onComplete: () => { box.destroy(); this.next(); },
    });
  }
}

/** 実績の条件を確かめ、新しく解除したものを通知する */
export function notifyAchievements(scene: Phaser.Scene, run: RunState | null = null): void {
  const fresh = checkAchievements(run);
  if (fresh.length === 0) return;
  const toast = scene.scene.get('Toast') as ToastScene | null;
  if (!toast) return;
  scene.scene.bringToTop('Toast');
  toast.enqueue(fresh);
}

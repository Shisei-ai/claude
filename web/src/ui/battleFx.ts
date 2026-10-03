// 戦闘エフェクト — 技を出す側 (魔法陣・武器のきらめき・ブーストのオーラ) と、
// 当たった側 (属性ごとの着弾・回復・強化/弱体・状態異常・吸収・撃破) の演出。
// テクスチャは初回だけ Canvas で作り、Phaser のパーティクルとトゥイーンで動かす。
import Phaser from 'phaser';
import type { ElementType, StatusEffectType } from '../core/types';

/** 属性の色 */
export const ELEMENT_FX_COLOR: Record<ElementType, number> = {
  None: 0xf0e6d0, Physical: 0xf0e6d0, Fire: 0xff7a2a, Ice: 0x8fd8ff, Lightning: 0xffe46a,
  Wind: 0x8fe8a8, Dark: 0xa060ff, Light: 0xfff2b0, Poison: 0x8fe060, Bleed: 0xe0303f,
};

/** 状態異常・強化の色と、良い効果かどうか */
const STATUS_FX: Partial<Record<StatusEffectType, { color: number; up?: boolean; down?: boolean }>> = {
  Poison: { color: 0x8fe060 }, Bleed: { color: 0xe0303f }, Burn: { color: 0xff7a2a },
  Freeze: { color: 0x8fd8ff }, Paralysis: { color: 0xffe46a }, Sleep: { color: 0xb0a8ff },
  Blind: { color: 0x7a7a8a }, Silence: { color: 0xc0c0d8 }, ActionSeal: { color: 0xc0a0ff },
  Fear: { color: 0x9a4ac0 }, AccDown: { color: 0x9a9aaa, down: true },
  AtkUp: { color: 0xff9a6a, up: true }, DefUp: { color: 0x8fc2ee, up: true }, SpdUp: { color: 0x8fe8a8, up: true },
  MatkUp: { color: 0xc89aff, up: true }, CritUp: { color: 0xffe46a, up: true }, Regen: { color: 0x6ade8a, up: true },
  AtkDown: { color: 0xff9a6a, down: true }, DefDown: { color: 0x8fc2ee, down: true }, SpdDown: { color: 0x8fe8a8, down: true },
  MatkDown: { color: 0xc89aff, down: true },
};

const TEX = { soft: 'fx_soft', spark: 'fx_spark', shard: 'fx_shard', beam: 'fx_beam', chevron: 'fx_chevron' };

function makeTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h)!;
  draw(t.getContext());
  t.refresh();
}

function ensureTextures(scene: Phaser.Scene): void {
  makeTex(scene, TEX.soft, 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  });
  makeTex(scene, TEX.spark, 32, 32, (c) => {
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(16, 0); c.lineTo(19, 13); c.lineTo(32, 16); c.lineTo(19, 19); c.lineTo(16, 32); c.lineTo(13, 19); c.lineTo(0, 16); c.lineTo(13, 13); c.closePath(); c.fill();
  });
  makeTex(scene, TEX.shard, 12, 40, (c) => {
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(6, 0); c.lineTo(12, 14); c.lineTo(6, 40); c.lineTo(0, 14); c.closePath(); c.fill();
  });
  makeTex(scene, TEX.beam, 64, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 256);
    const v = c.createLinearGradient(0, 0, 0, 256);   // 上下の端をぼかす
    v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.15, 'rgba(0,0,0,0)'); v.addColorStop(0.85, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = v; c.fillRect(0, 0, 64, 256);
  });
  makeTex(scene, TEX.chevron, 32, 24, (c) => {
    c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(4, 20); c.lineTo(16, 6); c.lineTo(28, 20); c.stroke();
  });
}

export class BattleFx {
  constructor(private scene: Phaser.Scene, private t: (ms: number) => number, private depth = 45) {
    ensureTextures(scene);
  }

  // ── 部品 ────────────────────────────────────────────────────────────
  /** 粒をはじけさせる */
  burst(x: number, y: number, o: {
    tint: number | number[]; count: number; speed: [number, number]; life: number;
    scale?: [number, number]; angle?: [number, number]; gravity?: number; tex?: string; add?: boolean;
  }): void {
    const life = this.t(o.life);
    const em = this.scene.add.particles(x, y, o.tex ?? TEX.soft, {
      speed: { min: o.speed[0], max: o.speed[1] }, lifespan: life,
      angle: o.angle ? { min: o.angle[0], max: o.angle[1] } : { min: 0, max: 360 },
      scale: { start: o.scale?.[0] ?? 0.5, end: o.scale?.[1] ?? 0 },
      alpha: { start: 1, end: 0 }, tint: o.tint, gravityY: o.gravity ?? 0,
      blendMode: o.add === false ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD, emitting: false,
    }).setDepth(this.depth);
    em.explode(o.count);
    this.scene.time.delayedCall(life + 100, () => em.destroy());
  }

  /** 広がって消える輪 */
  ring(x: number, y: number, color: number, r0: number, r1: number, ms: number, width = 3): void {
    const c = this.scene.add.circle(x, y, r0).setStrokeStyle(width, color, 1).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: c, scale: r1 / r0, alpha: 0, duration: this.t(ms), ease: 'Cubic.easeOut', onComplete: () => c.destroy() });
  }

  /** ぼんやり光って消える */
  glow(x: number, y: number, color: number, size: number, ms: number, alpha = 0.9): void {
    const g = this.scene.add.image(x, y, TEX.soft).setTint(color).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(size * 0.4, size * 0.4).setAlpha(alpha);
    this.scene.tweens.add({ targets: g, displayWidth: size, displayHeight: size, alpha: 0, duration: this.t(ms), ease: 'Quad.easeOut', onComplete: () => g.destroy() });
  }

  // ── 技を出す側 ────────────────────────────────────────────────────────
  /** 足元に魔法陣 (二重の輪と六芒の線が回りながら現れて消える) */
  castCircle(x: number, feetY: number, color: number): void {
    const g = this.scene.add.graphics().setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(2, color, 0.9).strokeEllipse(0, 0, 120, 36);
    g.lineStyle(1.5, color, 0.7).strokeEllipse(0, 0, 92, 27);
    g.lineStyle(1.5, color, 0.8);
    for (let k = 0; k < 6; k++) {
      const a1 = (k / 6) * Math.PI * 2, a2 = ((k + 2) / 6) * Math.PI * 2;
      g.lineBetween(Math.cos(a1) * 46, Math.sin(a1) * 13.5, Math.cos(a2) * 46, Math.sin(a2) * 13.5);
    }
    g.setPosition(x, feetY).setScale(0.3).setAlpha(0);
    this.scene.tweens.add({ targets: g, scale: 1, alpha: 1, duration: this.t(260), ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: g, alpha: 0, delay: this.t(520), duration: this.t(320), onComplete: () => g.destroy() });
    // 立ちのぼる光
    this.burst(x, feetY, { tint: color, count: 14, speed: [30, 90], angle: [250, 290], life: 700, scale: [0.45, 0], gravity: -60 });
    this.glow(x, feetY - 60, color, 200, 600, 0.5);
  }

  /** 武器のきらめき (物理の技・通常攻撃の構え) */
  glint(x: number, y: number, color = 0xffffff): void {
    const s = this.scene.add.image(x, y, TEX.spark).setTint(color).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2);
    this.scene.tweens.add({ targets: s, scale: 1.6, angle: 90, duration: this.t(220), ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: s, alpha: 0, delay: this.t(200), duration: this.t(200), onComplete: () => s.destroy() });
  }

  /** ブーストのオーラ (段階が高いほど大きく) */
  boostAura(x: number, y: number, level: number): void {
    this.glow(x, y, 0xffd24a, 180 + level * 50, 700, 0.7);
    this.ring(x, y, 0xffd24a, 30, 90 + level * 30, 600, 2 + level);
    this.burst(x, y + 60, { tint: [0xffd24a, 0xfff2b0], count: 10 + level * 8, speed: [40, 120], angle: [240, 300], life: 800, scale: [0.4, 0], gravity: -80 });
  }

  // ── 当たった側 ────────────────────────────────────────────────────────
  /** 攻撃の着弾 (属性ごとに出し分け) */
  impact(x: number, y: number, element: ElementType | undefined, magical: boolean, crit: boolean, fromLeft: boolean): void {
    const el = element ?? 'Physical';
    const color = ELEMENT_FX_COLOR[el];
    switch (el) {
      case 'Fire':
        this.glow(x, y, 0xff5a1a, 220, 450);
        this.burst(x, y, { tint: [0xff7a2a, 0xffc04a, 0xff3a1a], count: 26, speed: [60, 220], life: 650, scale: [0.6, 0], gravity: -220 });
        this.ring(x, y, 0xff9a4a, 20, 110, 420, 4);
        break;
      case 'Ice': {
        // 氷片が集まって砕ける
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const s = this.scene.add.image(x + Math.cos(a) * 90, y + Math.sin(a) * 90, TEX.shard).setTint(0xcff0ff)
            .setRotation(a + Math.PI / 2).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9);
          this.scene.tweens.add({ targets: s, x, y, duration: this.t(180), ease: 'Quad.easeIn', onComplete: () => s.destroy() });
        }
        this.scene.time.delayedCall(this.t(180), () => {
          this.glow(x, y, 0xbfeaff, 200, 380);
          this.burst(x, y, { tex: TEX.shard, tint: [0xcff0ff, 0x8fd8ff], count: 14, speed: [120, 260], life: 520, scale: [0.6, 0.1] });
          this.ring(x, y, 0x8fd8ff, 20, 100, 380, 3);
        });
        break;
      }
      case 'Lightning': {
        // 頭上から稲妻
        const g = this.scene.add.graphics().setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD);
        const pts: Phaser.Math.Vector2[] = [];
        let px = x + Phaser.Math.Between(-30, 30);
        for (let yy = y - 320; yy < y; yy += 32) { pts.push(new Phaser.Math.Vector2(px, yy)); px += Phaser.Math.Between(-26, 26); }
        pts.push(new Phaser.Math.Vector2(x, y));
        g.lineStyle(12, 0xffe46a, 0.25).strokePoints(pts);
        g.lineStyle(4, 0xfffbe0, 1).strokePoints(pts);
        this.scene.tweens.add({ targets: g, alpha: 0, delay: this.t(120), duration: this.t(260), onComplete: () => g.destroy() });
        this.glow(x, y, 0xffe46a, 240, 380);
        this.burst(x, y, { tex: TEX.spark, tint: [0xffe46a, 0xffffff], count: 16, speed: [120, 300], life: 420, scale: [0.6, 0] });
        this.scene.cameras.main.flash(this.t(90), 255, 245, 190);
        break;
      }
      case 'Wind': {
        // 旋回する三日月
        for (let k = 0; k < 3; k++) {
          const g = this.scene.add.graphics().setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD);
          g.lineStyle(4, 0xb0ffc8, 0.9).beginPath();
          g.arc(0, 0, 50 + k * 14, -0.6, 0.9).strokePath();
          g.setPosition(x, y).setRotation((k / 3) * Math.PI * 2);
          this.scene.tweens.add({ targets: g, rotation: g.rotation + Math.PI * 1.6, scale: 1.3, alpha: 0, duration: this.t(560), ease: 'Quad.easeOut', onComplete: () => g.destroy() });
        }
        this.burst(x, y, { tint: [0x8fe8a8, 0xe0fff0], count: 14, speed: [80, 200], life: 560, scale: [0.4, 0] });
        break;
      }
      case 'Light': {
        // 光の柱
        const beam = this.scene.add.image(x, y - 110, TEX.beam).setTint(0xfff2b0).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD)
          .setDisplaySize(10, 380);
        this.scene.tweens.add({ targets: beam, displayWidth: 90, duration: this.t(160), ease: 'Quad.easeOut' });
        this.scene.tweens.add({ targets: beam, alpha: 0, displayWidth: 20, delay: this.t(260), duration: this.t(320), onComplete: () => beam.destroy() });
        this.glow(x, y, 0xfff6d0, 230, 450);
        this.burst(x, y, { tex: TEX.spark, tint: [0xfff2b0, 0xffffff], count: 14, speed: [40, 160], life: 700, scale: [0.5, 0], gravity: -80 });
        break;
      }
      case 'Dark': {
        // 渦を巻いて吸い込まれる闇
        for (let k = 0; k < 14; k++) {
          const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 40;
          const p = this.scene.add.image(x + Math.cos(a) * r, y + Math.sin(a) * r, TEX.soft).setTint(k % 2 ? 0xa060ff : 0x5a2a9a)
            .setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD).setScale(0.45);
          this.scene.tweens.add({ targets: p, x, y, scale: 0.1, duration: this.t(380 + Math.random() * 120), ease: 'Cubic.easeIn', onComplete: () => p.destroy() });
        }
        this.scene.time.delayedCall(this.t(380), () => {
          this.glow(x, y, 0x7a3ad0, 230, 420);
          this.ring(x, y, 0xa060ff, 16, 100, 420, 4);
        });
        break;
      }
      case 'Poison':
        this.burst(x, y, { tint: [0x8fe060, 0x5aa040], count: 18, speed: [20, 80], angle: [220, 320], life: 800, scale: [0.2, 0.6], gravity: -90 });
        this.glow(x, y, 0x6ac040, 180, 450, 0.6);
        break;
      case 'Bleed':
        this.burst(x, y, { tint: [0xe0303f, 0x9a1020], count: 18, speed: [100, 240], angle: fromLeft ? [-60, 40] : [140, 240], life: 520, scale: [0.35, 0.05], gravity: 500, add: false });
        this.slash(x, y, 0xff6a7a, fromLeft, crit);
        break;
      default:
        // 物理: 斬撃の弧と火花 / 無属性の魔法: 光の破裂
        if (magical) {
          this.glow(x, y, color, 200, 420);
          this.ring(x, y, color, 18, 100, 420, 3);
          this.burst(x, y, { tex: TEX.spark, tint: color, count: 12, speed: [80, 200], life: 450, scale: [0.5, 0] });
        } else {
          this.slash(x, y, 0xffffff, fromLeft, crit);
        }
    }
    if (crit) {
      this.glow(x, y, 0xffd24a, 300, 380, 0.8);
      this.burst(x, y, { tex: TEX.spark, tint: [0xffd24a, 0xffffff], count: 12, speed: [160, 340], life: 420, scale: [0.6, 0] });
    }
  }

  /** 斬撃の弧 (fromLeft: 左側の者が振ったか) */
  slash(x: number, y: number, color: number, fromLeft: boolean, crit: boolean): void {
    const g = this.scene.add.graphics().setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD);
    const r = crit ? 78 : 62;
    const dir = fromLeft ? 1 : -1;
    const counter = this.scene.tweens.addCounter({
      from: 0, to: 1, duration: this.t(150), ease: 'Quad.easeOut',
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        g.clear();
        const a0 = -2.2, a1 = a0 + 2.4 * v;
        g.lineStyle(crit ? 10 : 7, color, 0.35).beginPath().arc(0, 0, r, a0, a1).strokePath();
        g.lineStyle(crit ? 4 : 3, 0xffffff, 1).beginPath().arc(0, 0, r, a0, a1).strokePath();
      },
    });
    void counter;
    g.setPosition(x - dir * 10, y + 10).setScale(dir, 1);
    this.scene.tweens.add({ targets: g, alpha: 0, delay: this.t(160), duration: this.t(220), onComplete: () => g.destroy() });
    this.burst(x, y, { tex: TEX.spark, tint: [0xfff2d0, 0xffd28a], count: crit ? 14 : 8, speed: [120, 280], angle: fromLeft ? [-70, 70] : [110, 250], life: 320, scale: [0.4, 0] });
  }

  /** 回復: 足元から昇る緑の光と輪 */
  heal(x: number, y: number, h: number): void {
    this.glow(x, y, 0x6ade8a, 180, 600, 0.6);
    this.ring(x, y + h * 0.35, 0x9affb8, 20, 80, 600, 2);
    this.burst(x, y + h * 0.4, { tint: [0x6ade8a, 0xd0ffd8], count: 18, speed: [40, 110], angle: [250, 290], life: 900, scale: [0.4, 0], gravity: -60 });
  }

  /** 強化 (上向きの矢羽が昇る) / 弱体 (下向きに沈む) / 状態異常 (色の煙) */
  status(x: number, y: number, h: number, type: StatusEffectType): void {
    const fx = STATUS_FX[type] ?? { color: 0xd0c8e0 };
    if (fx.up || fx.down) {
      const up = !!fx.up;
      for (let k = 0; k < 3; k++) {
        const c = this.scene.add.image(x + (k - 1) * 26, y + (up ? h * 0.25 : -h * 0.25), TEX.chevron).setTint(fx.color)
          .setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD).setFlipY(!up).setAlpha(0);
        this.scene.tweens.add({ targets: c, alpha: 1, duration: this.t(120), delay: this.t(k * 80) });
        this.scene.tweens.add({ targets: c, y: c.y + (up ? -70 : 70), alpha: 0, delay: this.t(k * 80 + 120), duration: this.t(520), ease: 'Quad.easeIn', onComplete: () => c.destroy() });
      }
      this.glow(x, y, fx.color, 170, 520, up ? 0.55 : 0.4);
    } else {
      this.burst(x, y - h * 0.1, { tint: fx.color, count: 16, speed: [20, 70], life: 800, scale: [0.3, 0.7], gravity: -40 });
      this.ring(x, y, fx.color, 16, 70, 520, 2);
    }
  }

  /** シールドに当たった (青い火花) */
  shieldSpark(x: number, y: number): void {
    this.burst(x, y, { tex: TEX.spark, tint: [0x8fc2ee, 0xe0f0ff], count: 6, speed: [80, 180], life: 300, scale: [0.35, 0] });
  }

  /** 魂を吸い取る (相手から使い手へ紫の光が流れる) */
  absorb(fx: number, fy: number, tx: number, ty: number): void {
    for (let k = 0; k < 12; k++) {
      const p = this.scene.add.image(fx, fy, TEX.soft).setTint(k % 2 ? 0xc89aff : 0x7a3ad0).setDepth(this.depth)
        .setBlendMode(Phaser.BlendModes.ADD).setScale(0.5);
      const cx = (fx + tx) / 2 + Phaser.Math.Between(-60, 60), cy = Math.min(fy, ty) - Phaser.Math.Between(60, 140);
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(fx, fy), new Phaser.Math.Vector2(cx, cy), new Phaser.Math.Vector2(tx, ty));
      this.scene.tweens.addCounter({
        from: 0, to: 1, delay: this.t(k * 45), duration: this.t(600), ease: 'Sine.easeIn',
        onUpdate: (tw) => { const pt = curve.getPoint(tw.getValue() ?? 0); p.setPosition(pt.x, pt.y); },
        onComplete: () => p.destroy(),
      });
    }
    this.scene.time.delayedCall(this.t(650), () => this.glow(tx, ty, 0xa060ff, 200, 500, 0.7));
  }

  /** 撃破: 体が塵になって昇っていく */
  dissolve(x: number, y: number, w: number, h: number, tint = 0x9a8abd): void {
    const em = this.scene.add.particles(x, y, TEX.soft, {
      x: { min: -w / 2, max: w / 2 }, y: { min: -h / 2, max: h / 2 },
      speed: { min: 10, max: 50 }, angle: { min: 240, max: 300 }, gravityY: -60,
      lifespan: this.t(900), scale: { start: 0.35, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: [tint, 0x5a4a7a, 0xd0c8e0], blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).setDepth(this.depth);
    em.explode(36);
    this.scene.time.delayedCall(this.t(1000), () => em.destroy());
  }
}

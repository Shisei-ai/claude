// 戦闘エフェクト — 技を出す側 (詠唱の魔法陣・集まる光・武器のきらめき・ブーストのオーラ)、
// 飛んでいく魔法、当たった側 (属性ごとの着弾・斬撃/爪・回復・強化/弱体・状態異常・吸収・撃破) の演出。
// 素材は初回だけ Canvas で描き (ルーンの魔法陣・先細りの斬撃・炎の舌・氷晶・煙など)、
// パーティクルとトゥイーンで重ねて動かす。色はダークファンタジーに合わせて少し落ち着かせている。
import Phaser from 'phaser';
import type { ElementType, StatusEffectType } from '../core/types';

/** 属性の色 (主色・明るい芯) */
export const ELEMENT_FX_COLOR: Record<ElementType, number> = {
  None: 0xe8dcc0, Physical: 0xe8dcc0, Fire: 0xff6a24, Ice: 0x86cfee, Lightning: 0xf2d260,
  Wind: 0x86dca0, Dark: 0x9a5ae8, Light: 0xf6e2a0, Poison: 0x8acc58, Bleed: 0xc8283a,
};
const ELEMENT_CORE: Record<ElementType, number> = {
  None: 0xffffff, Physical: 0xffffff, Fire: 0xffd27a, Ice: 0xeafaff, Lightning: 0xfffbe0,
  Wind: 0xe6fff0, Dark: 0xe0c8ff, Light: 0xfffbea, Poison: 0xe0ffc0, Bleed: 0xff9aa8,
};

/** 状態異常・強化の色と、良い効果かどうか */
const STATUS_FX: Partial<Record<StatusEffectType, { color: number; up?: boolean; down?: boolean }>> = {
  Poison: { color: 0x8acc58 }, Bleed: { color: 0xc8283a }, Burn: { color: 0xff6a24 },
  Freeze: { color: 0x86cfee }, Paralysis: { color: 0xf2d260 }, Sleep: { color: 0xa8a0ee },
  Blind: { color: 0x6a6a7a }, Silence: { color: 0xb8b8d0 }, ActionSeal: { color: 0xb898f0 },
  Fear: { color: 0x8a40b0 }, AccDown: { color: 0x9a9aaa, down: true },
  AtkUp: { color: 0xf09060, up: true }, DefUp: { color: 0x86b8e6, up: true }, SpdUp: { color: 0x86dca0, up: true },
  MatkUp: { color: 0xc090f8, up: true }, CritUp: { color: 0xf2d260, up: true }, Regen: { color: 0x64d080, up: true },
  AtkDown: { color: 0xf09060, down: true }, DefDown: { color: 0x86b8e6, down: true }, SpdDown: { color: 0x86dca0, down: true },
  MatkDown: { color: 0xc090f8, down: true },
};

const TEX = {
  soft: 'fx_soft', spark: 'fx_spark', ember: 'fx_ember', smoke: 'fx_smoke', flame: 'fx_flame',
  shard: 'fx_shard', beam: 'fx_beam', chevron: 'fx_chevron', rune: 'fx_rune', slash: 'fx_slash',
  claw: 'fx_claw', shock: 'fx_shock', orb: 'fx_orb', lance: 'fx_lance',
};

function makeTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h)!;
  draw(t.getContext());
  t.refresh();
}

/** 決まった並びの乱数 (素材が毎回同じ見た目になるように) */
function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function ensureTextures(scene: Phaser.Scene): void {
  // やわらかな光の粒
  makeTex(scene, TEX.soft, 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  });
  // 四方に光の筋が伸びる星 (芯に光のにじみ)
  makeTex(scene, TEX.spark, 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 14);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#ffffff';
    for (const [w, l] of [[3, 30], [1.6, 20]] as const) {
      c.save(); c.translate(32, 32); if (l === 20) c.rotate(Math.PI / 4);
      for (let k = 0; k < 4; k++) {
        c.rotate(Math.PI / 2);
        c.beginPath(); c.moveTo(0, -l); c.lineTo(w, 0); c.lineTo(0, l * 0.1); c.lineTo(-w, 0); c.closePath(); c.fill();
      }
      c.restore();
    }
  });
  // 火の粉・光の尾 (細長いにじみ)
  makeTex(scene, TEX.ember, 16, 48, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 48);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(8, 24, 4, 23, 0, 0, Math.PI * 2); c.fill();
  });
  // 煙 (大小のにじみを重ねたまだらな塊)
  makeTex(scene, TEX.smoke, 96, 96, (c) => {
    const r = seeded(7);
    for (let k = 0; k < 14; k++) {
      const x = 28 + r() * 40, y = 28 + r() * 40, rad = 14 + r() * 22;
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(255,255,255,${0.18 + r() * 0.2})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill();
    }
  });
  // 炎の舌 (下が太く上がとがる、芯ほど明るい)
  makeTex(scene, TEX.flame, 48, 80, (c) => {
    const shape = (s: number) => {
      c.beginPath();
      c.moveTo(24, 80 - 76 * s);
      c.bezierCurveTo(24 + 22 * s, 80 - 40 * s, 24 + 20 * s, 80 - 8 * s, 24, 78);
      c.bezierCurveTo(24 - 20 * s, 80 - 8 * s, 24 - 22 * s, 80 - 40 * s, 24, 80 - 76 * s);
      c.closePath();
    };
    c.fillStyle = 'rgba(255,255,255,0.45)'; shape(1); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.75)'; shape(0.7); c.fill();
    c.fillStyle = 'rgba(255,255,255,1)'; shape(0.4); c.fill();
  });
  // 氷晶 (面の明暗がある細長い結晶)
  makeTex(scene, TEX.shard, 20, 56, (c) => {
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.beginPath(); c.moveTo(10, 0); c.lineTo(20, 18); c.lineTo(10, 56); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath(); c.moveTo(10, 0); c.lineTo(0, 18); c.lineTo(10, 56); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,1)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(10, 2); c.lineTo(10, 54); c.stroke();
  });
  // 光の柱
  makeTex(scene, TEX.beam, 64, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,255,255,0.7)'); g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(0.58, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 256);
    const v = c.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.2, 'rgba(0,0,0,0)'); v.addColorStop(0.9, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = v; c.fillRect(0, 0, 64, 256);
  });
  // 矢羽 (強化・弱体)
  makeTex(scene, TEX.chevron, 40, 30, (c) => {
    c.shadowColor = 'rgba(255,255,255,0.8)'; c.shadowBlur = 6;
    c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(6, 24); c.lineTo(20, 8); c.lineTo(34, 24); c.stroke();
  });
  // ルーンの魔法陣 (二重の輪・ルーン文字の帯・六芒星・内輪)
  makeTex(scene, TEX.rune, 256, 256, (c) => {
    const r = seeded(31);
    c.translate(128, 128);
    c.strokeStyle = '#ffffff'; c.fillStyle = '#ffffff';
    c.shadowColor = 'rgba(255,255,255,0.9)'; c.shadowBlur = 4;
    c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 122, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 112, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(0, 0, 86, 0, Math.PI * 2); c.stroke();
    // ルーン文字の帯: 24字ぶんの短い線の組み合わせ
    for (let k = 0; k < 24; k++) {
      c.save(); c.rotate((k / 24) * Math.PI * 2); c.translate(0, -99);
      c.lineWidth = 1.6; c.beginPath();
      const strokes = 2 + Math.floor(r() * 3);
      for (let s = 0; s < strokes; s++) {
        const x1 = (r() - 0.5) * 9, y1 = (r() - 0.5) * 12, x2 = (r() - 0.5) * 9, y2 = (r() - 0.5) * 12;
        c.moveTo(x1, y1); c.lineTo(x2, y2);
      }
      c.stroke(); c.restore();
    }
    // 六芒星
    c.lineWidth = 2;
    for (const off of [0, Math.PI / 3]) {
      c.beginPath();
      for (let k = 0; k <= 3; k++) { const a = off + (k / 3) * Math.PI * 2 - Math.PI / 2; const x = Math.cos(a) * 84, y = Math.sin(a) * 84; if (k) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
    }
    c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, 40, 0, Math.PI * 2); c.stroke();
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * 112, Math.sin(a) * 112, 4, 0, Math.PI * 2); c.fill(); }
  });
  // 斬撃 (先細りの三日月。外側の刃先ほど明るい)
  makeTex(scene, TEX.slash, 256, 160, (c) => {
    const cx = 128, cy = 150;
    const band = (r0: number, r1: number, alpha: number) => {
      c.beginPath();
      c.arc(cx, cy, r1, Math.PI * 1.08, Math.PI * 1.92);
      c.arc(cx, cy, r0, Math.PI * 1.92, Math.PI * 1.08, true);
      c.closePath();
      c.fillStyle = `rgba(255,255,255,${alpha})`; c.fill();
    };
    // 両端を細くするため、三日月の内側の円を少しずらして重ねる
    c.save();
    band(104, 140, 0.25); band(118, 140, 0.55); band(130, 140, 1);
    c.globalCompositeOperation = 'destination-out';
    const fade = c.createLinearGradient(0, 0, 256, 0);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.22, 'rgba(0,0,0,0)'); fade.addColorStop(0.78, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = fade; c.fillRect(0, 0, 256, 160);
    c.restore();
  });
  // 爪の跡 (三本の先細りの筋)
  makeTex(scene, TEX.claw, 120, 120, (c) => {
    for (let k = 0; k < 3; k++) {
      const off = (k - 1) * 24;
      c.save(); c.translate(60 + off, 60); c.rotate(-0.5);
      const g = c.createLinearGradient(0, -54, 0, 54);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(0, -54); c.quadraticCurveTo(7, 0, 0, 54); c.quadraticCurveTo(-3, 0, 0, -54); c.fill();
      c.restore();
    }
  });
  // 衝撃波の輪 (内外がぼけた輪)
  makeTex(scene, TEX.shock, 128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 30, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.9)'); g.addColorStop(0.85, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  });
  // 魔法の玉 (明るい芯と外のにじみ)
  makeTex(scene, TEX.orb, 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  });
  // 氷の槍 (細長い結晶。右向き)
  makeTex(scene, TEX.lance, 96, 24, (c) => {
    c.fillStyle = 'rgba(255,255,255,0.65)';
    c.beginPath(); c.moveTo(0, 12); c.lineTo(70, 2); c.lineTo(96, 12); c.lineTo(70, 22); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,1)';
    c.beginPath(); c.moveTo(20, 12); c.lineTo(72, 7); c.lineTo(96, 12); c.lineTo(72, 17); c.closePath(); c.fill();
  });
}

type Pt = { x: number; y: number };

export class BattleFx {
  constructor(private scene: Phaser.Scene, private t: (ms: number) => number, private depth = 45) {
    ensureTextures(scene);
  }

  private get tw(): Phaser.Tweens.TweenManager { return this.scene.tweens; }

  // ── 部品 ────────────────────────────────────────────────────────────
  /** 粒をはじけさせる */
  burst(x: number, y: number, o: {
    tint: number | number[]; count: number; speed: [number, number]; life: number;
    scale?: [number, number]; angle?: [number, number]; gravity?: number; tex?: string; add?: boolean;
    rotate?: boolean; alpha?: number; spread?: number;
  }): void {
    const life = this.t(o.life);
    const em = this.scene.add.particles(x, y, o.tex ?? TEX.soft, {
      speed: { min: o.speed[0], max: o.speed[1] }, lifespan: { min: life * 0.6, max: life },
      angle: o.angle ? { min: o.angle[0], max: o.angle[1] } : { min: 0, max: 360 },
      scale: { start: o.scale?.[0] ?? 0.5, end: o.scale?.[1] ?? 0 },
      alpha: { start: o.alpha ?? 1, end: 0 }, tint: o.tint, gravityY: o.gravity ?? 0,
      rotate: o.rotate ? { min: 0, max: 360 } : 0,
      ...(o.spread ? { x: { min: -o.spread, max: o.spread }, y: { min: -o.spread, max: o.spread } } : {}),
      blendMode: o.add === false ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD, emitting: false,
    }).setDepth(this.depth);
    em.explode(o.count);
    this.scene.time.delayedCall(life + 100, () => em.destroy());
  }

  /** 進む向きに尾を伸ばした火の粉 (ember を進行方向へ回す) */
  private streaks(x: number, y: number, tint: number | number[], count: number, speed: [number, number], life: number, angle?: [number, number], scale = 0.7): void {
    const life2 = this.t(life);
    const em = this.scene.add.particles(x, y, TEX.ember, {
      speed: { min: speed[0], max: speed[1] }, lifespan: { min: life2 * 0.5, max: life2 },
      angle: angle ? { min: angle[0], max: angle[1] } : { min: 0, max: 360 },
      scaleX: { start: scale * 0.6, end: 0 }, scaleY: { start: scale, end: 0.1 },
      alpha: { start: 1, end: 0 }, tint, blendMode: Phaser.BlendModes.ADD, emitting: false,
      rotate: { onEmit: (p?: Phaser.GameObjects.Particles.Particle) => p ? Phaser.Math.RadToDeg(Math.atan2(p.velocityY, p.velocityX)) + 90 : 0 },
    }).setDepth(this.depth);
    em.explode(count);
    this.scene.time.delayedCall(life2 + 100, () => em.destroy());
  }

  /** 広がって消える衝撃波の輪 */
  shock(x: number, y: number, color: number, size: number, ms: number, squash = 1): void {
    const s = this.scene.add.image(x, y, TEX.shock).setTint(color).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(size * 0.2, size * 0.2 * squash);
    this.tw.add({ targets: s, displayWidth: size, displayHeight: size * squash, alpha: 0, duration: this.t(ms), ease: 'Cubic.easeOut', onComplete: () => s.destroy() });
  }

  /** ぼんやり光って消える */
  glow(x: number, y: number, color: number, size: number, ms: number, alpha = 0.85): void {
    const g = this.scene.add.image(x, y, TEX.soft).setTint(color).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(size * 0.5, size * 0.5).setAlpha(alpha);
    this.tw.add({ targets: g, displayWidth: size, displayHeight: size, alpha: 0, duration: this.t(ms), ease: 'Quad.easeOut', onComplete: () => g.destroy() });
  }

  /** 漂って消える煙 */
  smoke(x: number, y: number, tint: number, count: number, rise = 40, alpha = 0.5): void {
    const life = this.t(1100);
    const em = this.scene.add.particles(x, y, TEX.smoke, {
      x: { min: -20, max: 20 }, y: { min: -12, max: 12 },
      speed: { min: 8, max: 30 }, angle: { min: 230, max: 310 }, gravityY: -rise,
      lifespan: { min: life * 0.6, max: life }, scale: { start: 0.45, end: 1.1 }, alpha: { start: alpha, end: 0 },
      rotate: { min: 0, max: 360 }, tint, blendMode: Phaser.BlendModes.NORMAL, emitting: false,
    }).setDepth(this.depth - 1);
    em.explode(count);
    this.scene.time.delayedCall(life + 100, () => em.destroy());
  }

  /** 当たった瞬間に体を白く光らせる (画像は白塗り、四角は色を一瞬明るく) */
  hitFlash(obj: Phaser.GameObjects.GameObject | undefined, color = 0xffffff): void {
    if (!obj) return;
    if (obj instanceof Phaser.GameObjects.Image) {
      obj.setTintFill(color);
      this.scene.time.delayedCall(this.t(70), () => {
        obj.setTint(0xffd0c0);
        this.scene.time.delayedCall(this.t(90), () => obj.clearTint());
      });
    } else if (obj instanceof Phaser.GameObjects.Rectangle) {
      const prev = obj.fillColor;
      obj.setFillStyle(color);
      this.scene.time.delayedCall(this.t(90), () => obj.setFillStyle(prev));
    }
  }

  // ── 技を出す側 ────────────────────────────────────────────────────────
  /** 詠唱: 足元にルーンの魔法陣が回りながら開き、光が手元へ集まって立ちのぼる */
  castCircle(x: number, feetY: number, color: number, bodyH = 200): void {
    // 床に寝かせた陣: 入れ物を縦に潰し、中の陣を回す (回しても傾かずに奥行きのある楕円のまま)
    const floor = this.scene.add.container(x, feetY).setDepth(3).setScale(1, 0.3);
    const circle = this.scene.add.image(0, 0, TEX.rune).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.15).setAlpha(0);
    const inner = this.scene.add.image(0, 0, TEX.rune).setTint(ELEMENT_CORE.Light).setBlendMode(Phaser.BlendModes.ADD).setScale(0.08).setAlpha(0);
    floor.add([circle, inner]);
    this.tw.add({ targets: circle, scale: 0.68, alpha: 0.95, duration: this.t(300), ease: 'Back.easeOut' });
    this.tw.add({ targets: circle, angle: 120, duration: this.t(1000), ease: 'Sine.easeInOut' });
    this.tw.add({ targets: inner, scale: 0.36, alpha: 0.5, duration: this.t(360), ease: 'Quad.easeOut' });
    this.tw.add({ targets: inner, angle: -160, duration: this.t(1000) });
    this.tw.add({ targets: floor, alpha: 0, delay: this.t(640), duration: this.t(380), onComplete: () => floor.destroy() });
    // 周りから光が集まる
    const hand: Pt = { x, y: feetY - bodyH * 0.55 };
    for (let k = 0; k < 12; k++) {
      const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 50;
      const p = this.scene.add.image(hand.x + Math.cos(a) * r, hand.y + Math.sin(a) * r * 0.7, TEX.soft)
        .setTint(k % 3 ? color : 0xffffff).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD).setScale(0.18).setAlpha(0);
      this.tw.add({ targets: p, alpha: 1, duration: this.t(120), delay: this.t(k * 25) });
      this.tw.add({ targets: p, x: hand.x, y: hand.y, scale: 0.05, delay: this.t(k * 25), duration: this.t(420), ease: 'Cubic.easeIn', onComplete: () => p.destroy() });
    }
    this.scene.time.delayedCall(this.t(440), () => this.glow(hand.x, hand.y, color, 150, 420, 0.9));
    // 足元から立ちのぼる光
    this.streaks(x, feetY, [color, 0xffffff], 10, [60, 140], 800, [255, 285], 0.55);
  }

  /** 武器のきらめき (物理の技・通常攻撃の構え) */
  glint(x: number, y: number, color = 0xfff2d0): void {
    const s = this.scene.add.image(x, y, TEX.spark).setTint(color).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD).setScale(0.15);
    this.tw.add({ targets: s, scale: 1.1, angle: 45, duration: this.t(200), ease: 'Quad.easeOut' });
    this.tw.add({ targets: s, alpha: 0, scale: 0.6, delay: this.t(200), duration: this.t(220), onComplete: () => s.destroy() });
    this.glow(x, y, color, 80, 300, 0.6);
  }

  /** ブーストのオーラ (段階が高いほど大きく、金の火の粉が昇る) */
  boostAura(x: number, y: number, level: number): void {
    this.glow(x, y, 0xe8b84a, 200 + level * 60, 800, 0.55);
    this.shock(x, y + 40, 0xf2d260, 160 + level * 50, 600, 0.35);
    this.streaks(x, y + 70, [0xf2d260, 0xfff2c0], 10 + level * 8, [80, 200], 900, [250, 290], 0.6);
    for (let k = 0; k < level; k++) {
      this.scene.time.delayedCall(this.t(k * 120), () => this.shock(x, y, 0xffe0a0, 140 + k * 30, 450));
    }
  }

  // ── 飛んでいく魔法 ──────────────────────────────────────────────────
  /** 使い手から相手へ魔法を飛ばす。届いたら onArrive。雷と光は飛ばずに即座に届く */
  projectile(from: Pt, to: Pt, element: ElementType | undefined, onArrive: () => void): number {
    const el = element ?? 'None';
    const color = ELEMENT_FX_COLOR[el], core = ELEMENT_CORE[el];
    if (el === 'Lightning' || el === 'Light') { onArrive(); return 0; }
    const dur = 240;
    const ang = Math.atan2(to.y - from.y, to.x - from.x);
    const head = el === 'Ice'
      ? this.scene.add.image(from.x, from.y, TEX.lance).setRotation(ang).setScale(0.9)
      : this.scene.add.image(from.x, from.y, TEX.orb).setScale(el === 'Fire' ? 0.9 : 0.7);
    head.setTint(el === 'Fire' ? 0xffc060 : core).setDepth(this.depth + 1).setBlendMode(Phaser.BlendModes.ADD);
    const halo = this.scene.add.image(from.x, from.y, TEX.soft).setTint(color).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD).setScale(1.3).setAlpha(0.8);
    // 尾: 通り道にやわらかな光を細かく残して、なめらかな光の筋にする
    const trail = this.scene.add.particles(0, 0, TEX.soft, {
      follow: head, lifespan: this.t(300), speed: { min: 0, max: 20 },
      scale: { start: el === 'Fire' ? 0.7 : 0.5, end: 0 }, alpha: { start: 0.75, end: 0 },
      tint: [color, color, core], blendMode: Phaser.BlendModes.ADD, frequency: 6, quantity: 2,
    }).setDepth(this.depth);
    if (el === 'Fire') {
      // 火球は火の粉もこぼす
      const sparks = this.scene.add.particles(0, 0, TEX.ember, {
        follow: head, lifespan: this.t(380), speed: { min: 20, max: 60 }, angle: { min: 160, max: 200 }, gravityY: -120,
        scaleX: { start: 0.25, end: 0 }, scaleY: { start: 0.35, end: 0 }, alpha: { start: 1, end: 0 },
        tint: [0xffa040, 0xff6a24], blendMode: Phaser.BlendModes.ADD, frequency: 30,
      }).setDepth(this.depth);
      this.scene.time.delayedCall(this.t(dur), () => { sparks.stop(); this.scene.time.delayedCall(this.t(400), () => sparks.destroy()); });
    }
    const arc = el === 'Dark' ? -60 : el === 'Wind' ? 40 : -20;
    const mid: Pt = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) + arc };
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(from.x, from.y), new Phaser.Math.Vector2(mid.x, mid.y), new Phaser.Math.Vector2(to.x, to.y));
    this.tw.addCounter({
      from: 0, to: 1, duration: this.t(dur), ease: 'Quad.easeIn',
      onUpdate: (tw) => {
        const v = tw.getValue() ?? 0;
        const p = curve.getPoint(v); head.setPosition(p.x, p.y); halo.setPosition(p.x, p.y);
        if (el === 'Ice') { const d = curve.getTangent(v); head.setRotation(Math.atan2(d.y, d.x)); }
        if (el !== 'Ice') head.setAngle(head.angle + 12);
      },
      onComplete: () => {
        head.destroy(); halo.destroy(); trail.stop();
        this.scene.time.delayedCall(this.t(360), () => trail.destroy());
        onArrive();
      },
    });
    return dur;
  }

  // ── 当たった側 ────────────────────────────────────────────────────────
  /** 攻撃の着弾 (属性ごとに出し分け)。enemyClaw: 敵の物理は爪の跡にする */
  impact(x: number, y: number, element: ElementType | undefined, magical: boolean, crit: boolean, fromLeft: boolean, enemyClaw = false): void {
    const el = element ?? 'Physical';
    const color = ELEMENT_FX_COLOR[el], core = ELEMENT_CORE[el];
    switch (el) {
      case 'Fire': {
        this.glow(x, y, 0xd8400c, 240, 520, 0.6);
        this.shock(x, y, 0xff8a30, 170, 420);
        // 炎の舌が何本も立ち上がり、火の粉と煙が残る
        const flames = this.scene.add.particles(x, y + 30, TEX.flame, {
          x: { min: -40, max: 40 }, y: { min: -10, max: 10 }, speed: { min: 10, max: 50 }, angle: { min: 262, max: 278 }, gravityY: -240,
          lifespan: { min: this.t(380), max: this.t(620) }, scaleX: { start: 0.5, end: 0.15 }, scaleY: { start: 0.65, end: 0.25 },
          alpha: { start: 0.6, end: 0 }, tint: [0xc8400e, 0xe8601c, 0xff8a30], blendMode: Phaser.BlendModes.ADD, emitting: false,
        }).setDepth(this.depth);
        flames.explode(15);
        this.scene.time.delayedCall(this.t(700), () => flames.destroy());
        this.streaks(x, y, [0xffb050, 0xff6a24], 22, [120, 300], 700, [200, 340]);
        this.smoke(x, y - 10, 0x2a1a14, 6, 60, 0.55);
        break;
      }
      case 'Ice': {
        // 氷晶が集まって砕け、冷気が漂う
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * Math.PI * 2;
          const s = this.scene.add.image(x + Math.cos(a) * 100, y + Math.sin(a) * 80, TEX.shard).setTint(core)
            .setRotation(a + Math.PI / 2).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD).setScale(1.1);
          this.tw.add({ targets: s, x, y, scale: 0.6, duration: this.t(170), ease: 'Quad.easeIn', onComplete: () => s.destroy() });
        }
        this.scene.time.delayedCall(this.t(170), () => {
          this.glow(x, y, 0xbfe8ff, 240, 420, 0.9);
          this.shock(x, y, 0x86cfee, 180, 420);
          this.burst(x, y, { tex: TEX.shard, tint: [0xeafaff, 0x86cfee], count: 16, speed: [140, 300], life: 560, scale: [0.7, 0.15], rotate: true });
          this.burst(x, y, { tex: TEX.spark, tint: 0xeafaff, count: 8, speed: [20, 90], life: 700, scale: [0.35, 0], spread: 30 });
          this.smoke(x, y + 10, 0xbfe0f0, 5, 10, 0.25);
        });
        break;
      }
      case 'Lightning': {
        // 頭上から枝分かれする稲妻 (外のにじみ + 白い芯) が二度落ちる
        const bolt = (dx: number, delay: number) => this.scene.time.delayedCall(this.t(delay), () => {
          const g = this.scene.add.graphics().setDepth(this.depth + 1).setBlendMode(Phaser.BlendModes.ADD);
          const pts: Phaser.Math.Vector2[] = [];
          let px = x + dx;
          for (let yy = y - 340; yy < y; yy += 28) { pts.push(new Phaser.Math.Vector2(px, yy)); px += Phaser.Math.Between(-24, 24); }
          pts.push(new Phaser.Math.Vector2(x, y));
          g.lineStyle(16, color, 0.18).strokePoints(pts);
          g.lineStyle(7, color, 0.5).strokePoints(pts);
          g.lineStyle(2.5, 0xffffff, 1).strokePoints(pts);
          // 枝
          for (let b = 0; b < 3; b++) {
            const i = 2 + Math.floor(Math.random() * (pts.length - 4));
            const s = pts[i]; let bx = s.x, by = s.y;
            const br = [new Phaser.Math.Vector2(bx, by)];
            for (let k = 0; k < 3; k++) { bx += Phaser.Math.Between(-30, 30); by += 22; br.push(new Phaser.Math.Vector2(bx, by)); }
            g.lineStyle(4, color, 0.35).strokePoints(br); g.lineStyle(1.5, 0xffffff, 0.9).strokePoints(br);
          }
          this.tw.add({ targets: g, alpha: 0, delay: this.t(90), duration: this.t(220), onComplete: () => g.destroy() });
        });
        bolt(Phaser.Math.Between(-20, 20), 0);
        bolt(Phaser.Math.Between(-30, 30), 110);
        this.glow(x, y, color, 280, 420, 0.9);
        this.shock(x, y + 30, color, 200, 380, 0.4);
        this.streaks(x, y, [0xffffff, color], 18, [180, 380], 360);
        this.scene.cameras.main.flash(this.t(80), 255, 240, 190, false);
        break;
      }
      case 'Wind': {
        // 刃のような風の三日月が旋回しながら切り裂く
        for (let k = 0; k < 4; k++) {
          const s = this.scene.add.image(x, y, TEX.slash).setTint(k % 2 ? core : color).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD)
            .setScale(0.35 + k * 0.08).setRotation((k / 4) * Math.PI * 2).setAlpha(0.9);
          this.tw.add({ targets: s, rotation: s.rotation + Math.PI * 1.8, scale: s.scale * 1.5, alpha: 0, duration: this.t(560), ease: 'Quad.easeOut', onComplete: () => s.destroy() });
        }
        this.streaks(x, y, [color, core], 14, [140, 260], 500);
        this.smoke(x, y, 0xa8d8b8, 4, 20, 0.2);
        break;
      }
      case 'Light': {
        // 天から光の柱が降り、光の粒が舞う
        const beam = this.scene.add.image(x, y - 120, TEX.beam).setTint(0xfff4cc).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD)
          .setDisplaySize(8, 400).setAlpha(0.95);
        this.tw.add({ targets: beam, displayWidth: 110, duration: this.t(170), ease: 'Quad.easeOut' });
        this.tw.add({ targets: beam, alpha: 0, displayWidth: 30, delay: this.t(300), duration: this.t(360), onComplete: () => beam.destroy() });
        const beam2 = this.scene.add.image(x, y - 120, TEX.beam).setTint(0xffffff).setDepth(this.depth + 1).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(4, 400);
        this.tw.add({ targets: beam2, displayWidth: 34, alpha: 0, duration: this.t(520), ease: 'Quad.easeOut', onComplete: () => beam2.destroy() });
        this.glow(x, y, 0xfff6d8, 260, 520, 0.9);
        this.shock(x, y + 40, 0xf6e2a0, 220, 480, 0.35);
        this.burst(x, y, { tex: TEX.spark, tint: [0xfff2c0, 0xffffff], count: 14, speed: [30, 140], life: 900, scale: [0.4, 0], gravity: -70 });
        break;
      }
      case 'Dark': {
        // 闇が渦を巻いて吸い込まれ、黒い煙を残して弾ける
        for (let k = 0; k < 18; k++) {
          const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 50;
          const p = this.scene.add.image(x + Math.cos(a) * r, y + Math.sin(a) * r, TEX.soft).setTint(k % 3 ? 0x9a5ae8 : 0x3a1a6a)
            .setDepth(this.depth).setBlendMode(k % 3 ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL).setScale(0.5);
          this.tw.addCounter({
            from: 0, to: 1, duration: this.t(380 + Math.random() * 140), ease: 'Cubic.easeIn',
            onUpdate: (tw) => { const v = tw.getValue() ?? 0; const aa = a + v * 2.4, rr = r * (1 - v); p.setPosition(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); p.setScale(0.5 * (1 - v) + 0.08); },
            onComplete: () => p.destroy(),
          });
        }
        this.scene.time.delayedCall(this.t(400), () => {
          this.glow(x, y, 0x6a2ac0, 260, 460, 0.85);
          this.shock(x, y, 0x9a5ae8, 190, 440);
          this.streaks(x, y, [0xc8a0ff, 0x9a5ae8], 14, [120, 260], 500);
          this.smoke(x, y, 0x140a20, 8, 30, 0.6);
        });
        break;
      }
      case 'Poison':
        this.burst(x, y + 20, { tint: [0x8acc58, 0x5a9a38, 0xc8f090], count: 20, speed: [20, 80], angle: [220, 320], life: 900, scale: [0.15, 0.55], gravity: -100, spread: 20 });
        this.smoke(x, y, 0x4a7a2a, 7, 30, 0.45);
        this.glow(x, y, 0x6aaa40, 200, 500, 0.5);
        break;
      case 'Bleed':
        if (enemyClaw) this.claw(x, y, 0xff8090, fromLeft, crit); else this.slash(x, y, 0xffb0b8, fromLeft, crit);
        this.burst(x, y, { tint: [0xc8283a, 0x7a1020], count: 20, speed: [120, 280], angle: fromLeft ? [-60, 40] : [140, 240], life: 600, scale: [0.32, 0.06], gravity: 600, add: false });
        break;
      default:
        if (magical) {
          // 無属性の魔法: 光の破裂
          this.glow(x, y, color, 230, 460, 0.85);
          this.shock(x, y, core, 170, 420);
          this.burst(x, y, { tex: TEX.spark, tint: [color, 0xffffff], count: 12, speed: [90, 220], life: 520, scale: [0.45, 0] });
        } else if (enemyClaw) {
          this.claw(x, y, 0xffa0a0, fromLeft, crit);
        } else {
          this.slash(x, y, 0xfff0d8, fromLeft, crit);
        }
    }
    if (crit) {
      this.glow(x, y, 0xf2c060, 340, 420, 0.75);
      this.shock(x, y, 0xffe0a0, 260, 380);
      this.streaks(x, y, [0xffe0a0, 0xffffff], 14, [220, 420], 420);
    }
  }

  /** 斬撃: 先細りの三日月が振り抜かれ、火花が散る (fromLeft: 左側の者が振ったか) */
  slash(x: number, y: number, color: number, fromLeft: boolean, crit: boolean): void {
    const dir = fromLeft ? 1 : -1;
    const base = crit ? 0.95 : 0.75;
    const make = (tint: number, alpha: number, sc: number, rot: number) => {
      const s = this.scene.add.image(x, y, TEX.slash).setTint(tint).setDepth(this.depth + 1).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(sc * 0.4 * dir, sc * 0.4).setRotation(rot).setAlpha(alpha);
      this.tw.add({ targets: s, scaleX: sc * dir, scaleY: sc, duration: this.t(130), ease: 'Quad.easeOut' });
      this.tw.add({ targets: s, alpha: 0, delay: this.t(130), duration: this.t(260), onComplete: () => s.destroy() });
    };
    const rot = dir * 0.55;
    make(color, 0.55, base * 1.08, rot);
    make(0xffffff, 1, base, rot);
    if (crit) make(0xffe0a0, 0.9, base * 0.9, rot - dir * 0.9);   // 返しの二の太刀
    this.streaks(x, y, [0xfff2d0, 0xffc880], crit ? 16 : 10, [160, 340], 380, fromLeft ? [-80, 60] : [120, 260], 0.55);
  }

  /** 爪の跡 (敵の物理攻撃) */
  claw(x: number, y: number, color: number, fromLeft: boolean, crit: boolean): void {
    const dir = fromLeft ? 1 : -1;
    const sc = crit ? 1.2 : 0.95;
    const c = this.scene.add.image(x, y, TEX.claw).setTint(color).setDepth(this.depth + 1).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(sc * dir, 0.2 * sc).setAlpha(1);
    this.tw.add({ targets: c, scaleY: sc, duration: this.t(110), ease: 'Quad.easeOut' });
    this.tw.add({ targets: c, alpha: 0, delay: this.t(170), duration: this.t(300), onComplete: () => c.destroy() });
    const core = this.scene.add.image(x, y, TEX.claw).setTint(0xffffff).setDepth(this.depth + 2).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(sc * 0.8 * dir, 0.2 * sc);
    this.tw.add({ targets: core, scaleY: sc * 0.8, alpha: 0, duration: this.t(260), ease: 'Quad.easeOut', onComplete: () => core.destroy() });
    this.streaks(x, y, [0xffc0c0, 0xff6a6a], 8, [120, 260], 340, undefined, 0.45);
  }

  /** 回復: 足元から光が満ち、緑の光と輝きが昇る */
  heal(x: number, y: number, h: number): void {
    const feet = y + h * 0.42;
    const beam = this.scene.add.image(x, feet - h * 0.45, TEX.beam).setTint(0x8af0a8).setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD)
      .setDisplaySize(60, h * 1.3).setAlpha(0);
    this.tw.add({ targets: beam, alpha: 0.55, duration: this.t(200) });
    this.tw.add({ targets: beam, alpha: 0, displayWidth: 20, delay: this.t(380), duration: this.t(420), onComplete: () => beam.destroy() });
    this.shock(x, feet, 0x9affb8, 150, 600, 0.3);
    this.glow(x, y, 0x64d080, 200, 700, 0.5);
    this.burst(x, feet, { tint: [0x64d080, 0xd8ffe0], count: 16, speed: [40, 110], angle: [255, 285], life: 1000, scale: [0.35, 0], gravity: -50, spread: 26 });
    this.burst(x, y, { tex: TEX.spark, tint: 0xe8ffe8, count: 6, speed: [10, 50], life: 900, scale: [0.3, 0], spread: 40 });
  }

  /** 強化 (光る矢羽が昇る) / 弱体 (沈む) / 状態異常 (色の煙と輪) */
  status(x: number, y: number, h: number, type: StatusEffectType): void {
    const fx = STATUS_FX[type] ?? { color: 0xd0c8e0 };
    if (fx.up || fx.down) {
      const up = !!fx.up;
      for (let k = 0; k < 3; k++) {
        const c = this.scene.add.image(x + (k - 1) * 30, y + (up ? h * 0.25 : -h * 0.25), TEX.chevron).setTint(fx.color)
          .setDepth(this.depth).setBlendMode(Phaser.BlendModes.ADD).setFlipY(!up).setAlpha(0).setScale(0.9);
        this.tw.add({ targets: c, alpha: 1, duration: this.t(140), delay: this.t(k * 90) });
        this.tw.add({ targets: c, y: c.y + (up ? -80 : 80), alpha: 0, delay: this.t(k * 90 + 140), duration: this.t(620), ease: 'Quad.easeIn', onComplete: () => c.destroy() });
      }
      this.shock(x, y + (up ? h * 0.4 : 0), fx.color, 150, 560, up ? 0.3 : 1);
      this.glow(x, y, fx.color, 180, 600, up ? 0.5 : 0.35);
      if (up) this.burst(x, y + h * 0.4, { tint: fx.color, count: 8, speed: [30, 90], angle: [255, 285], life: 800, scale: [0.3, 0], gravity: -40 });
    } else {
      this.smoke(x, y - h * 0.05, fx.color, 7, 30, 0.45);
      this.shock(x, y, fx.color, 140, 520);
      this.burst(x, y, { tint: fx.color, count: 10, speed: [20, 70], life: 800, scale: [0.25, 0], spread: 30 });
    }
  }

  /** シールドに当たった (青い火花と六角の輪) */
  shieldSpark(x: number, y: number): void {
    this.shock(x, y, 0x86b8e6, 90, 260);
    this.streaks(x, y, [0xbfe0ff, 0xffffff], 8, [120, 240], 300, undefined, 0.4);
  }

  /** 魂を吸い取る (相手から使い手へ紫の光が尾を引いて流れる) */
  absorb(fx: number, fy: number, tx: number, ty: number): void {
    for (let k = 0; k < 14; k++) {
      const p = this.scene.add.image(fx, fy, TEX.soft).setTint(k % 2 ? 0xc8a0ff : 0x7a3ad0).setDepth(this.depth)
        .setBlendMode(Phaser.BlendModes.ADD).setScale(0.45);
      const cx = (fx + tx) / 2 + Phaser.Math.Between(-80, 80), cy = Math.min(fy, ty) - Phaser.Math.Between(60, 160);
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(fx, fy), new Phaser.Math.Vector2(cx, cy), new Phaser.Math.Vector2(tx, ty));
      const trail = this.scene.add.particles(0, 0, TEX.soft, {
        follow: p, lifespan: this.t(260), scale: { start: 0.25, end: 0 }, alpha: { start: 0.7, end: 0 },
        tint: 0x9a5ae8, blendMode: Phaser.BlendModes.ADD, frequency: 30,
      }).setDepth(this.depth - 1);
      this.tw.addCounter({
        from: 0, to: 1, delay: this.t(k * 45), duration: this.t(650), ease: 'Sine.easeIn',
        onUpdate: (tw) => { const pt = curve.getPoint(tw.getValue() ?? 0); p.setPosition(pt.x, pt.y); },
        onComplete: () => { p.destroy(); trail.stop(); this.scene.time.delayedCall(this.t(300), () => trail.destroy()); },
      });
    }
    this.scene.time.delayedCall(this.t(700), () => { this.glow(tx, ty, 0x9a5ae8, 230, 560, 0.7); this.shock(tx, ty, 0xc8a0ff, 160, 500); });
  }

  /** 撃破: 体が灰色にくすみ、灰と燃えさしになって崩れ昇る */
  dissolve(x: number, y: number, w: number, h: number, tint = 0x9a8abd, body?: Phaser.GameObjects.GameObject): void {
    if (body instanceof Phaser.GameObjects.Image) {
      body.setTint(0x6a6070);
      this.scene.time.delayedCall(this.t(160), () => body.setTint(0x3a3440));
    }
    const life = this.t(1100);
    const ash = this.scene.add.particles(x, y, TEX.soft, {
      x: { min: -w / 2, max: w / 2 }, y: { min: -h / 2, max: h / 2 },
      speed: { min: 10, max: 45 }, angle: { min: 245, max: 295 }, gravityY: -55,
      lifespan: { min: life * 0.6, max: life }, scale: { start: 0.28, end: 0 }, alpha: { start: 0.85, end: 0 },
      tint: [0x8a8090, 0x5a5262, tint], blendMode: Phaser.BlendModes.NORMAL, emitting: false,
    }).setDepth(this.depth);
    ash.explode(40);
    const embers = this.scene.add.particles(x, y, TEX.ember, {
      x: { min: -w / 2, max: w / 2 }, y: { min: -h / 2, max: h / 2 },
      speed: { min: 20, max: 70 }, angle: { min: 250, max: 290 }, gravityY: -80,
      lifespan: { min: life * 0.5, max: life }, scaleX: { start: 0.3, end: 0 }, scaleY: { start: 0.45, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xffa050, 0xff6a24, 0xc89aff], blendMode: Phaser.BlendModes.ADD, emitting: false,
    }).setDepth(this.depth);
    embers.explode(18);
    this.smoke(x, y + h * 0.3, 0x1a1420, 6, 30, 0.5);
    this.scene.time.delayedCall(life + 150, () => { ash.destroy(); embers.destroy(); });
  }
}

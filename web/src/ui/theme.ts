// ダークファンタジーUIテーマ — Unity版 MainMenuSceneSetup の配色 (夜闇の紫×古金) を踏襲し、
// 書体・枠飾り・質感を加えて統一する。各シーンはここの部品を使う。
import Phaser from 'phaser';
import { hasArt, bgArtKey } from '../data/assets';
import { FONT_BODY, FONT_DISPLAY, FONT_LATIN } from './fonts';
import { playSfx } from '../audio/sfx';

export const COLORS = {
  bg: 0x07050d,             // 深い夜闇
  bgPanel: 0x110c19,
  bgPanelLight: 0x1b1427,
  border: 0x4e3d63,         // くすんだ紫の縁
  borderBright: 0x9a7cc8,
  trim: 0x7d6235,           // 古金の飾り線
  trimBright: 0xd8b56a,
  // 文字色は暗い背景・背景画像の上でも読めるよう明るめにする (旧: #e4dac6 / #958aa8 / #e2c27a …)
  text: '#f0e7d4',          // 羊皮紙色
  textDim: '#b8aecb',       // 補足 (くすんだ藤色。暗くしすぎない)
  textGold: '#f0d38c',
  textRed: '#f27c84',
  textGreen: '#8fe6aa',
  textBlue: '#9ccaf2',
  accent: 0xd8b56a,
  hpBar: 0x4fae5c,
  hpBarLow: 0xc8423f,
  mpBar: 0x4a7fc8,
  bpBar: 0xd9a030,
  shield: 0x70a0d0,
};

/** 本文の書体 (互換のため残す。新しいコードは fonts.ts の定数を使う) */
export const FONT = FONT_BODY;
export const FONT_SANS = FONT_BODY;
export { FONT_BODY, FONT_DISPLAY, FONT_LATIN };

/** 文字の影 (背景画像の上でも読めるように) */
const SOFT_SHADOW = { offsetX: 0, offsetY: 1, color: '#000000', blur: 4, fill: true, stroke: false };

/** 小さな文字ほど少し大きくする (細い明朝体は小さいと潰れて読みにくいため)。16px 以上はそのまま */
export function readableSize(size: number): number {
  return size >= 16 ? size : Math.round((size + (16 - size) * 0.3) * 2) / 2;
}

/** 本文の太さ。明朝体の細い線が背景に溶けないよう、見出し未満の大きさは少し太くする */
const bodyWeight = (size: number): string => (size < 22 ? '600' : '400');

// 行頭に置かない文字 (句読点・閉じ括弧・小書き仮名・長音・ダッシュ) と、行末に残さない開き括弧
const NO_LINE_START = '、。，．・：；？！ー―—…‥）」』】〕〉》’”ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ々〜～!?),.:;%';
const NO_LINE_END = '（「『【〔〈《‘“(';

/** 禁則処理つきの折り返し。句読点などは前の行へぶら下げ、開き括弧は次の行へ送る。英数字の並びは分けない */
function wrapJapanese(text: string, ctx: CanvasRenderingContext2D, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const tok of para.match(/[A-Za-z0-9+\-.%/]+|./gu) ?? []) {
      if (line && ctx.measureText(line + tok).width > maxWidth) {
        if (NO_LINE_START.includes(tok[0])) { line += tok; continue; }
        let carry = '';
        while (line.length > 1 && NO_LINE_END.includes(line[line.length - 1])) {
          carry = line[line.length - 1] + carry;
          line = line.slice(0, -1);
        }
        out.push(line);
        line = carry + tok;
        continue;
      }
      line += tok;
    }
    out.push(line);
  }
  return out;
}

export function textStyle(
  size: number,
  color: string = COLORS.text,
  extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  // 日本語はスペース区切りがないため、wordWrap指定時は禁則処理つきの文字単位折り返しにする
  if (extra.wordWrap?.width && !extra.wordWrap.callback) {
    const maxWidth = extra.wordWrap.width;
    extra = {
      ...extra,
      wordWrap: {
        ...extra.wordWrap,
        callback: (t: string, obj: Phaser.GameObjects.Text) => wrapJapanese(t, obj.context, maxWidth),
      },
    };
  }
  const px = readableSize(size);
  return {
    // 大きな文字 (画面タイトル・見出し) は古活字風の見出し書体にする
    fontFamily: size >= 24 ? FONT_DISPLAY : FONT_BODY,
    fontSize: `${px}px`,
    fontStyle: size >= 24 ? '400' : bodyWeight(px),
    color,
    ...(extra.stroke ? {} : { shadow: SOFT_SHADOW }),
    ...extra,
  };
}

/** 画面タイトル・場面名 (見出し書体 + 淡い光) */
export function titleStyle(
  size: number, color: string = COLORS.textGold,
  extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_DISPLAY,
    fontSize: `${size}px`,
    color,
    shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 10, fill: true, stroke: false },
    ...extra,
  };
}

/** 欧文・数字 (ロゴ・ダメージ数字・HP表示) */
export function latinStyle(
  size: number, color: string = COLORS.text, bold = false,
  extra: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_LATIN,
    fontSize: `${readableSize(size)}px`,
    fontStyle: bold ? '700' : '500',
    color,
    ...(extra.stroke ? {} : { shadow: SOFT_SHADOW }),
    ...extra,
  };
}

// ── 枠飾り ──────────────────────────────────────────────────────────

/** 角の菱形飾り */
function cornerGems(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, size = 3): void {
  g.fillStyle(color, 1);
  for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
    g.fillTriangle(cx - size, cy, cx, cy - size, cx + size, cy);
    g.fillTriangle(cx - size, cy, cx, cy + size, cx + size, cy);
  }
}

export interface PanelOpts {
  /** 塗りの不透明度 (既定 0.94) */
  alpha?: number;
  /** 古金の枠・角飾り (既定 true)。false なら控えめな紫の縁だけ */
  ornate?: boolean;
  depth?: number;
}

/** 装飾パネル (上が少し明るい塗り + 二重の縁 + 角飾り)。中心座標指定 */
export function drawPanel(
  scene: Phaser.Scene, cx: number, cy: number, w: number, h: number, opts: PanelOpts = {},
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  paintPanel(g, cx - w / 2, cy - h / 2, w, h, opts);
  if (opts.depth !== undefined) g.setDepth(opts.depth);
  return g;
}

/** 既存の Graphics に装飾パネルを描く (左上座標指定。毎ターン描き直すHUD用) */
export function paintPanel(
  g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, opts: PanelOpts = {},
): void {
  const a = opts.alpha ?? 0.94;
  g.fillGradientStyle(0x1d1529, 0x1d1529, 0x0c0912, 0x0c0912, a, a, a, a);
  g.fillRect(x, y, w, h);
  if (opts.ornate === false) {
    g.lineStyle(1, COLORS.border, 0.9).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  } else {
    g.lineStyle(1, COLORS.trim, 0.95).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    g.lineStyle(1, COLORS.trim, 0.35).strokeRect(x + 4.5, y + 4.5, w - 9, h - 9);
    cornerGems(g, x + 0.5, y + 0.5, w - 1, h - 1, COLORS.trimBright, 4);
  }
}

/** 見出しの下などに引く飾り線 (中央の菱形から左右へ細る線) */
export function drawOrnamentLine(scene: Phaser.Scene, cx: number, y: number, w: number, color = COLORS.trimBright): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps, t1 = (i + 1) / steps;
    const alpha = 0.85 * (1 - t0);
    g.lineStyle(1, color, alpha);
    g.lineBetween(cx + 9 + (w / 2 - 9) * t0, y, cx + 9 + (w / 2 - 9) * t1, y);
    g.lineBetween(cx - 9 - (w / 2 - 9) * t0, y, cx - 9 - (w / 2 - 9) * t1, y);
  }
  g.fillStyle(color, 1);
  g.fillTriangle(cx - 6, y, cx, y - 4, cx + 6, y);
  g.fillTriangle(cx - 6, y, cx, y + 4, cx + 6, y);
  return g;
}

export interface ButtonOpts {
  width?: number;
  height?: number;
  fontSize?: number;
  disabled?: boolean;
  color?: string;
}

/** 汎用ボタン: 暗い塗り + 古金の縁と左右の菱形。乗せると縁が光り、押すと沈んで音が鳴る */
export function makeButton(
  scene: Phaser.Scene, x: number, y: number, label: string,
  onClick: (pointer: Phaser.Input.Pointer) => void, opts: ButtonOpts = {},
): Phaser.GameObjects.Container {
  const w = opts.width ?? 320;
  const h = opts.height ?? 52;
  const disabled = opts.disabled ?? false;
  const baseColor = disabled ? '#5d5470' : (opts.color ?? COLORS.text);

  // 当たり判定と塗りを兼ねる矩形 (枠飾りは Graphics で重ねる)
  const bg = scene.add.rectangle(0, 0, w, h, COLORS.bgPanelLight, disabled ? 0.45 : 0.9);
  const frame = scene.add.graphics();
  const glow = scene.add.rectangle(0, 0, w + 6, h + 6, COLORS.trimBright, 0).setStrokeStyle(2, COLORS.trimBright, 0);
  const draw = (hover: boolean) => {
    frame.clear();
    const x0 = -w / 2, y0 = -h / 2;
    // 上半分にうっすら光沢
    frame.fillStyle(0xffffff, hover ? 0.06 : 0.03).fillRect(x0 + 1, y0 + 1, w - 2, h / 2 - 1);
    const line = disabled ? 0x3a3048 : hover ? COLORS.trimBright : COLORS.trim;
    frame.lineStyle(1, line, disabled ? 0.6 : 1).strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    frame.lineStyle(1, line, 0.28).strokeRect(x0 + 3.5, y0 + 3.5, w - 7, h - 7);
    if (!disabled) {
      // 左右中央の菱形
      frame.fillStyle(line, 1);
      for (const sx of [x0 + 0.5, x0 + w - 0.5]) {
        frame.fillTriangle(sx - 4, 0, sx, -4, sx + 4, 0);
        frame.fillTriangle(sx - 4, 0, sx, 4, sx + 4, 0);
      }
    }
  };
  draw(false);
  const txt = scene.add.text(0, 0, label, textStyle(
    opts.fontSize ?? 20, baseColor,
    { align: 'center' },   // 2行のラベルも各行を中央に
  )).setOrigin(0.5);

  const container = scene.add.container(x, y, [glow, bg, frame, txt]);
  container.setSize(w, h);

  if (!disabled) {
    bg.setInteractive({ useHandCursor: true })
      .on('pointerover', (pointer: Phaser.Input.Pointer) => {
        if (pointer.wasTouch) return;
        bg.setFillStyle(0x2a1f3c, 0.96);
        glow.setStrokeStyle(2, COLORS.trimBright, 0.25);
        txt.setColor(COLORS.textGold);
        draw(true);
      })
      .on('pointerout', () => {
        bg.setFillStyle(COLORS.bgPanelLight, 0.9);
        glow.setStrokeStyle(2, COLORS.trimBright, 0);
        txt.setColor(baseColor);
        draw(false);
      })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        playSfx('select');
        // 押した手応え (見た目だけ。処理はすぐ走らせる)
        scene.tweens.add({ targets: container, scale: { from: 0.96, to: 1 }, duration: 140, ease: 'Back.easeOut' });
        onClick(pointer);
      });
  }

  return container;
}

/** ステータスバー (HP/MP): 暗い溝 + 上が明るい中身 + 細い縁 */
export function drawBar(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number,
  ratio: number, color: number, bgColor = 0x18121f,
): void {
  const r = Math.max(0, Math.min(1, ratio));
  g.fillStyle(bgColor, 1).fillRect(x, y, w, h);
  if (r > 0) {
    const fw = Math.max(1, r * w);
    const c = Phaser.Display.Color.IntegerToColor(color);
    const light = Phaser.Display.Color.GetColor(Math.min(255, c.red + 45), Math.min(255, c.green + 45), Math.min(255, c.blue + 45));
    const dark = Phaser.Display.Color.GetColor(c.red * 0.6, c.green * 0.6, c.blue * 0.6);
    g.fillGradientStyle(light, light, dark, dark, 1, 1, 1, 1).fillRect(x, y, fw, h);
    g.fillStyle(0xffffff, 0.18).fillRect(x, y, fw, Math.max(1, Math.floor(h / 3)));
  }
  g.lineStyle(1, 0x000000, 0.8).strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  g.lineStyle(1, COLORS.trim, 0.45).strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
}

// ── 背景 ────────────────────────────────────────────────────────────

const VIGNETTE_KEY = 'ui_vignette';

/** 画面の四隅を暗く落とすビネット (初回だけテクスチャを作る) */
export function addVignette(scene: Phaser.Scene, strength = 0.75): Phaser.GameObjects.Image {
  const { width, height } = scene.scale;
  if (!scene.textures.exists(VIGNETTE_KEY)) {
    const tex = scene.textures.createCanvas(VIGNETTE_KEY, width, height)!;
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, width * 0.72);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    tex.refresh();
  }
  return scene.add.image(width / 2, height / 2, VIGNETTE_KEY).setAlpha(strength);
}

/** シーン背景。bgKey を渡すと該当画像があれば全面表示、無ければ夜闇の色板。どちらもビネットを掛ける */
export function drawSceneBackground(
  scene: Phaser.Scene, tint = 0x0a0716, bgKey?: string,
): void {
  const { width, height } = scene.scale;
  if (bgKey && hasArt(scene, bgArtKey(bgKey))) {
    const img = scene.add.image(width / 2, height / 2, bgArtKey(bgKey));
    // 画面を覆うようにカバー配置 (縦横比維持で大きい方に合わせる)
    img.setScale(Math.max(width / img.width, height / img.height));
    // ダーク寄せの薄いオーバーレイ (文字可読性の確保)
    scene.add.rectangle(width / 2, height / 2, width, height, 0x07050d, 0.30);
    addVignette(scene, 0.7);
    return;
  }
  // 画像が無いときは中央がほのかに明るい夜闇
  const g = scene.add.graphics();
  const c = Phaser.Display.Color.IntegerToColor(tint);
  const lift = Phaser.Display.Color.GetColor(Math.min(255, c.red + 14), Math.min(255, c.green + 10), Math.min(255, c.blue + 20));
  g.fillGradientStyle(lift, lift, tint, tint, 1, 1, 1, 1).fillRect(0, 0, width, height);
  addVignette(scene, 0.85);
}

// ── 漂う塵 (タイトル・墓標などの空気感) ───────────────────────────────

const MOTE_KEY = 'ui_mote';

/** ゆっくり昇る光の粒。count は画面全体の数 */
export function addAmbientMotes(scene: Phaser.Scene, count = 28, color = 0xe2c27a, depth = 1): void {
  const { width, height } = scene.scale;
  if (!scene.textures.exists(MOTE_KEY)) {
    const tex = scene.textures.createCanvas(MOTE_KEY, 16, 16)!;
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    tex.refresh();
  }
  for (let i = 0; i < count; i++) {
    const mote = scene.add.image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), MOTE_KEY)
      .setTint(color).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(Phaser.Math.FloatBetween(0.15, 0.45)).setAlpha(0);
    const drift = () => {
      mote.setPosition(Phaser.Math.Between(0, width), height + 10);
      scene.tweens.add({
        targets: mote,
        y: Phaser.Math.Between(-20, height * 0.4),
        x: mote.x + Phaser.Math.Between(-80, 80),
        alpha: { from: 0, to: Phaser.Math.FloatBetween(0.25, 0.7), yoyo: true, hold: 1200 },
        duration: Phaser.Math.Between(9000, 16000),
        ease: 'Sine.easeInOut',
        onComplete: drift,
      });
    };
    // 最初は画面内のどこかから途中で始める
    scene.tweens.add({
      targets: mote,
      y: mote.y - Phaser.Math.Between(80, 240),
      alpha: { from: 0, to: Phaser.Math.FloatBetween(0.25, 0.6), yoyo: true },
      duration: Phaser.Math.Between(5000, 9000),
      ease: 'Sine.easeInOut',
      onComplete: drift,
    });
  }
}

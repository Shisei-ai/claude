// マップのノード記号 — 剣・王冠・炎などを Canvas に描いた紋章風のアイコン。
// 白 (主) と灰色 (陰影) で描いておき、表示側で setTint して種類ごとの色にする
// (白は色そのまま、灰色は暗い色になる)。周りに黒い縁を付け、背景画像の上でも読めるようにする。
import Phaser from 'phaser';
import type { NodeType } from '../core/types';

const SIZE = 128;          // 描画解像度 (表示は縮小するので拡大してもにじまない)
const MAIN = '#ffffff';
const SHADE = '#a8a8a8';   // 陰影 (色付け後に暗くなる部分)

type Draw = (c: CanvasRenderingContext2D) => void;

/** 角を丸めた四角 */
function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** 穴を開ける (目・鍵穴など) */
function cut(c: CanvasRenderingContext2D, path: () => void): void {
  c.save();
  c.globalCompositeOperation = 'destination-out';
  path();
  c.fill();
  c.restore();
}

/** まっすぐ立てた剣 (中心 64,64・長さ約108) */
function sword(c: CanvasRenderingContext2D): void {
  c.fillStyle = MAIN;
  c.beginPath();                       // 刃
  c.moveTo(64, 8); c.lineTo(73, 24); c.lineTo(73, 82); c.lineTo(55, 82); c.lineTo(55, 24); c.closePath();
  c.fill();
  c.strokeStyle = SHADE; c.lineWidth = 3;   // 樋 (刃の中央の溝)
  c.beginPath(); c.moveTo(64, 24); c.lineTo(64, 78); c.stroke();
  c.fillStyle = MAIN;
  roundRect(c, 36, 80, 56, 10, 5); c.fill();          // 鍔
  c.fillStyle = SHADE;
  roundRect(c, 58, 90, 12, 20, 3); c.fill();          // 握り
  c.fillStyle = MAIN;
  c.beginPath(); c.arc(64, 115, 7, 0, Math.PI * 2); c.fill();   // 柄頭
}

const ICONS: Record<NodeType, Draw> = {
  // 戦闘: 斜めの剣
  Battle: (c) => {
    c.translate(64, 64); c.rotate(Math.PI / 4); c.translate(-64, -64);
    sword(c);
  },
  // 強敵: 交差した二本の剣
  EliteBattle: (c) => {
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      c.save();
      c.translate(64, 64); c.rotate(a); c.scale(0.92, 0.92); c.translate(-64, -64);
      sword(c);
      c.restore();
    }
  },
  // ボス: 宝石をはめた王冠
  Boss: (c) => {
    c.fillStyle = MAIN;
    c.beginPath();
    c.moveTo(24, 88); c.lineTo(18, 38); c.lineTo(44, 64); c.lineTo(64, 24);
    c.lineTo(84, 64); c.lineTo(110, 38); c.lineTo(104, 88); c.closePath();
    c.fill();
    roundRect(c, 22, 86, 84, 18, 4); c.fill();          // 台座の帯
    for (const [x, y] of [[18, 38], [64, 24], [110, 38]]) {
      c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = SHADE;                                  // 帯の宝石
    for (const x of [40, 64, 88]) {
      c.beginPath(); c.moveTo(x, 89); c.lineTo(x + 6, 95); c.lineTo(x, 101); c.lineTo(x - 6, 95); c.closePath(); c.fill();
    }
  },
  // 商人: 口を縛った硬貨の袋
  Shop: (c) => {
    c.fillStyle = MAIN;
    c.beginPath();                                        // 袋の胴
    c.moveTo(50, 42);
    c.bezierCurveTo(20, 58, 16, 112, 64, 112);
    c.bezierCurveTo(112, 112, 108, 58, 78, 42);
    c.closePath(); c.fill();
    c.beginPath();                                        // 縛った口の上の布
    c.moveTo(48, 40); c.lineTo(38, 18); c.lineTo(54, 26); c.lineTo(64, 14); c.lineTo(74, 26); c.lineTo(90, 18); c.lineTo(80, 40);
    c.closePath(); c.fill();
    c.fillStyle = SHADE;
    roundRect(c, 44, 37, 40, 9, 4); c.fill();             // 紐
    cut(c, () => {                                        // 硬貨の印 (◈)
      c.beginPath(); c.moveTo(64, 62); c.lineTo(80, 80); c.lineTo(64, 98); c.lineTo(48, 80); c.closePath();
    });
    c.fillStyle = MAIN;
    c.beginPath(); c.moveTo(64, 71); c.lineTo(72, 80); c.lineTo(64, 89); c.lineTo(56, 80); c.closePath(); c.fill();
  },
  // 焚き火: 組んだ薪と炎
  RestSite: (c) => {
    c.fillStyle = SHADE;
    for (const a of [0.32, -0.32]) {
      c.save();
      c.translate(64, 104); c.rotate(a);
      roundRect(c, -42, -8, 84, 16, 8); c.fill();
      c.restore();
    }
    c.fillStyle = '#d4d4d4';                              // 外側の炎 (芯より少し暗く)
    c.beginPath();
    c.moveTo(64, 8);
    c.bezierCurveTo(78, 34, 100, 50, 92, 76);
    c.bezierCurveTo(86, 96, 42, 96, 36, 76);
    c.bezierCurveTo(30, 56, 46, 46, 50, 30);
    c.bezierCurveTo(56, 40, 58, 46, 60, 50);
    c.bezierCurveTo(62, 34, 60, 20, 64, 8);
    c.fill();
    c.fillStyle = MAIN;                                   // 内側の炎 (明るい芯)
    c.beginPath();
    c.moveTo(64, 40);
    c.bezierCurveTo(74, 56, 82, 64, 76, 80);
    c.bezierCurveTo(72, 90, 56, 90, 52, 80);
    c.bezierCurveTo(48, 68, 58, 58, 64, 40);
    c.fill();
  },
  // 未知: 飾りの付いた疑問符
  RandomEvent: (c) => {
    c.strokeStyle = MAIN; c.lineWidth = 15; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.arc(64, 44, 22, Math.PI * 1.05, Math.PI * 0.42);
    c.quadraticCurveTo(64, 70, 64, 82);
    c.stroke();
    c.fillStyle = MAIN;
    c.beginPath(); c.arc(64, 106, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = SHADE;                                  // 周りの小さな星
    for (const [x, y, r] of [[22, 30, 7], [106, 34, 6], [100, 92, 5], [26, 88, 5]]) {
      c.beginPath(); c.moveTo(x, y - r * 1.6); c.lineTo(x + r * 0.5, y); c.lineTo(x, y + r * 1.6); c.lineTo(x - r * 0.5, y); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x - r * 1.6, y); c.lineTo(x, y + r * 0.5); c.lineTo(x + r * 1.6, y); c.lineTo(x, y - r * 0.5); c.closePath(); c.fill();
    }
  },
  // 宝箱: 丸い蓋の箱と錠前
  Treasure: (c) => {
    c.fillStyle = MAIN;
    roundRect(c, 18, 60, 92, 46, 6); c.fill();           // 箱
    c.beginPath();                                        // 丸い蓋
    c.moveTo(18, 58); c.lineTo(18, 46);
    c.bezierCurveTo(18, 22, 110, 22, 110, 46);
    c.lineTo(110, 58); c.closePath(); c.fill();
    c.fillStyle = SHADE;
    c.fillRect(18, 56, 92, 6);                            // 蓋の合わせ目
    c.fillRect(34, 30, 9, 76); c.fillRect(85, 30, 9, 76); // 金具の帯
    c.fillStyle = SHADE;
    roundRect(c, 53, 50, 22, 26, 4); c.fill();            // 錠前
    cut(c, () => {                                        // 鍵穴
      c.beginPath(); c.arc(64, 60, 4, 0, Math.PI * 2); c.moveTo(62, 62); c.lineTo(66, 62); c.lineTo(67, 71); c.lineTo(61, 71); c.closePath();
    });
  },
  // 呪われた間: 髑髏
  CursedRoom: (c) => {
    c.fillStyle = MAIN;
    c.beginPath(); c.arc(64, 54, 38, Math.PI * 0.85, Math.PI * 2.15); c.fill();   // 頭蓋
    roundRect(c, 40, 70, 48, 34, 10); c.fill();          // 顎
    cut(c, () => { c.beginPath(); c.ellipse(48, 60, 11, 13, -0.2, 0, Math.PI * 2); });
    cut(c, () => { c.beginPath(); c.ellipse(80, 60, 11, 13, 0.2, 0, Math.PI * 2); });
    cut(c, () => { c.beginPath(); c.moveTo(64, 72); c.lineTo(70, 84); c.lineTo(58, 84); c.closePath(); });   // 鼻
    c.strokeStyle = SHADE; c.lineWidth = 3;               // 歯
    c.beginPath();
    for (const x of [52, 60, 68, 76]) { c.moveTo(x, 92); c.lineTo(x, 104); }
    c.moveTo(44, 92); c.lineTo(84, 92);
    c.stroke();
    c.beginPath(); c.moveTo(76, 22); c.lineTo(70, 34); c.lineTo(78, 40); c.stroke();   // ひび
  },
  Start: (c) => {
    c.fillStyle = MAIN;
    c.beginPath(); c.arc(64, 64, 14, 0, Math.PI * 2); c.fill();
  },
};

export const nodeIconKey = (type: NodeType): string => `nodeicon_${type}`;

/** 全種類のアイコンのテクスチャを (まだ無ければ) 作る */
export function ensureNodeIcons(scene: Phaser.Scene): void {
  for (const type of Object.keys(ICONS) as NodeType[]) {
    const key = nodeIconKey(type);
    if (scene.textures.exists(key)) continue;
    // 1) 白と灰色で記号を描く
    const art = document.createElement('canvas');
    art.width = art.height = SIZE;
    const a = art.getContext('2d')!;
    ICONS[type](a);
    // 2) 黒い縁 (影を重ねがけ) の上に記号を載せる
    const tex = scene.textures.createCanvas(key, SIZE, SIZE)!;
    const c = tex.getContext();
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.95)';
    c.shadowBlur = 7;
    c.drawImage(art, 0, 0);
    c.drawImage(art, 0, 0);
    c.restore();
    c.drawImage(art, 0, 0);
    tex.refresh();
  }
}

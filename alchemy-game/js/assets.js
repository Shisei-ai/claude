// =============================================================
//  assets.js — 画像素材(ドット絵・アニメーション)の読み込みと描画
//
//  assets/manifest.js の ASSET_FILES に書かれた画像だけを読み込む。
//  キーは「拡張子を除いたパス」: 'enemies/slime.png' → 'enemies/slime'
//
//  ・1枚絵 …… 'items/herb.png' のように文字列で書く
//  ・アニメーション(スプライトシート) …… { file, frame: [幅, 高さ], anims: {...} }
//      シートは「1行 = 1つの動き」「横に並べたコマ = 時間の流れ」で描く。
//      anims: { idle: { row: 0, frames: 4, fps: 6 }, die: { row: 3, frames: 5, fps: 10, once: true } }
//
//  画像の無いキーでは描画関数が false を返すので、呼び出し側で図形描画に切り替える。
// =============================================================
const Assets = {
  img: {},     // key → 1枚絵
  sheets: {},  // key → { img, fw, fh, anims, scale }

  pixelArt() { return typeof ASSET_PIXEL_ART !== 'undefined' && ASSET_PIXEL_ART; },
  scale() { return typeof ASSET_PIXEL_SCALE !== 'undefined' ? ASSET_PIXEL_SCALE : 2; },

  load(done) {
    const files = typeof ASSET_FILES !== 'undefined' ? ASSET_FILES : [];
    let left = files.length;
    if (!left) { done(); return; }
    const finish = () => { if (--left === 0) done(); };
    for (const entry of files) {
      const def = typeof entry === 'string' ? { file: entry } : entry;
      const key = def.file.replace(/\.[^.]+$/, '');
      const im = new Image();
      im.onload = () => {
        if (def.frame) {
          this.sheets[key] = { img: im, fw: def.frame[0], fh: def.frame[1], anims: def.anims || {}, scale: def.scale };
        } else {
          this.img[key] = im;
        }
        finish();
      };
      im.onerror = () => { console.warn('画像を読み込めませんでした: assets/' + def.file); finish(); };
      im.src = 'assets/' + def.file;
    }
  },

  get(key) { return this.img[key] || null; },
  has(key) { return !!(this.img[key] || this.sheets[key]); },

  // 1枚絵を指定サイズに合わせて描く(タイル・HUDアイコンなど「枠に収めたい」もの用)
  draw(ctx, key, x, y, w, h, opt = {}) {
    const im = this.get(key);
    if (!im) return false;
    ctx.save();
    ctx.translate(x, y);
    if (opt.rot) ctx.rotate(opt.rot);
    if (opt.flip) ctx.scale(-1, 1);
    if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  },

  // キャラクター・弾などの描画。ドットの大きさが揃うよう「元画像の大きさ × 拡大率」で描く。
  //   names: 試すアニメーション名の優先順(最初に見つかったものを使う) 例: ['walk_down', 'walk', 'idle']
  //   t:     そのアニメーションが始まってからの秒数
  //   opt:   { flip, rot, alpha, anchor: 'center' | 'feet' }
  // 戻り値: 描けたら true。シートも1枚絵も無ければ false
  sprite(ctx, key, names, t, x, y, opt = {}) {
    const sh = this.sheets[key];
    let im, sx = 0, sy = 0, sw, sh2;
    if (sh) {
      const name = names.find(n => sh.anims[n]) || Object.keys(sh.anims)[0];
      const a = sh.anims[name] || { row: 0, frames: 1, fps: 1 };
      const n = Math.floor(t * a.fps);
      const f = a.once ? Math.min(n, a.frames - 1) : n % a.frames;
      im = sh.img; sx = f * sh.fw; sy = a.row * sh.fh; sw = sh.fw; sh2 = sh.fh;
    } else {
      im = this.get(key);
      if (!im) return false;
      sw = im.width; sh2 = im.height;
    }
    const k = (sh && sh.scale) || opt.scale || this.scale();
    const w = sw * k, h = sh2 * k;
    ctx.save();
    ctx.translate(x, y);
    if (opt.rot) ctx.rotate(opt.rot);
    if (opt.flip) ctx.scale(-1, 1);
    if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
    const oy = opt.anchor === 'feet' ? -h : -h / 2; // feet: 画像の下端を足元に合わせる
    ctx.drawImage(im, sx, sy, sw, sh2, -w / 2, oy, w, h);
    ctx.restore();
    return true;
  },

  // そのアニメーションが何秒で終わるか(once のアニメ用)。無ければ 0
  animLength(key, name) {
    const sh = this.sheets[key];
    const a = sh && sh.anims[name];
    return a ? a.frames / a.fps : 0;
  },

  // HTML 用: 1枚絵があれば <img>、無ければ null
  html(key, cls, title = '') {
    const im = this.get(key);
    return im ? `<img class="${cls}" src="${im.src}" alt="" title="${title}">` : null;
  },
};

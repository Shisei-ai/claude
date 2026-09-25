// =============================================================
//  assets.js — 画像素材の読み込みと描画ヘルパー
//  assets/manifest.js に列挙された画像だけを読み込む。
//  キーは「拡張子を除いたパス」: 'items/herb.png' → 'items/herb'
//  画像が無いキーは null を返すので、呼び出し側で図形描画に切り替える。
// =============================================================
const Assets = {
  img: {},

  load(done) {
    const files = typeof ASSET_FILES !== 'undefined' ? ASSET_FILES : [];
    let left = files.length;
    if (!left) { done(); return; }
    for (const path of files) {
      const im = new Image();
      im.onload = () => { this.img[path.replace(/\.[^.]+$/, '')] = im; if (--left === 0) done(); };
      im.onerror = () => { console.warn('画像を読み込めませんでした: assets/' + path); if (--left === 0) done(); };
      im.src = 'assets/' + path;
    }
  },

  get(key) { return this.img[key] || null; },

  pixelArt() { return typeof ASSET_PIXEL_ART !== 'undefined' && ASSET_PIXEL_ART; },

  // canvas に画像を中心基準で描く。画像が無ければ false を返す
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

  // HTML 用: 画像があれば <img>、無ければ null
  html(key, cls, title = '') {
    const im = this.get(key);
    return im ? `<img class="${cls}" src="${im.src}" alt="" title="${title}">` : null;
  },
};

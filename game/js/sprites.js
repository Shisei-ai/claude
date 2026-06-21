/* =========================================================================
 * 鋼鉄戦線 (Steel Front) - ドット絵スプライト定義（高頭身・ディテール版）
 *   味方：頭身高めのスマートな人型メカ兵。grade ごとに専用フレーム（別シルエット）。
 *   敵　：禍々しいクリーチャー。
 *   k輪郭 d影 m基色 l明 h光 v=バイザー/目 a=アクセント b=アクセント影
 *   g=金属/銃 e=エネルギー光 c=布/ケープ w=翼/膜  '.'=透明（短い行は自動パディング）
 * ========================================================================= */
(function (G) {
  'use strict';
  function S(pal, rows) {
    var w = 0, i;
    for (i = 0; i < rows.length; i++) w = Math.max(w, rows[i].length);
    for (i = 0; i < rows.length; i++) while (rows[i].length < w) rows[i] += '.';
    return { w: w, h: rows.length, pal: pal, rows: rows };
  }

  /* ============ 味方ユニット（高頭身・人型／グレード別シルエット） ============ */

  // ── 歩兵 infantry（青のトルーパー：ライフル） ──
  var INF = { k:'#0c1f33', d:'#235f8c', m:'#3a97d8', l:'#79ccff', h:'#cdeeff', v:'#aef0ff', a:'#ffd24a', b:'#c8860a', g:'#9aa7b3', e:'#eaffff' };
  var inf1 = S(INF, [
    '....kkk....',
    '...khhhk...',
    '...klllk...',
    '...kvvkk...',
    '....kk.....',
    '..kkmmkk...',
    '.khmmmmhk..',
    '.kmaaammk..',
    '.kmmmmmgk..',
    '.kdmmmgggG.',
    '.kmmmmmgk..',
    '.kdmmmmdk..',
    '..kmmmmk...',
    '..kmmmmk...',
    '..kmk kmk..',
    '..kmk kmk..',
    '..kdk kdk..',
    '..kmk kmk..',
    '.kkk. .kkk.',
  ]);
  var inf2 = S(INF, [
    '....kak....',
    '....kkk....',
    '...khhhk...',
    '...klllk...',
    '...kvvkk...',
    '...kkkk....',
    '.klkmmklk..',
    'klhmmmmhlk.',
    'klmaaammgk.',
    'klmmmmmgggG',
    'klmmmmmgk..',
    '.kdmmmmdk..',
    '..kmmmmk...',
    '..kmmmmk...',
    '..kmkkkmk..',
    '..kmk kmk..',
    '..kdk kdk..',
    '..kmk kmk..',
    '.kkkk kkkk.',
  ]);
  var inf3 = S(INF, [
    '...keaek...',
    '...kkkk....',
    '..khhhhk...',
    '..klvvlk...',
    '..klkklk...',
    '.kkkkkkk...',
    'klkmmmmklk.',
    'klhmmmmhlGk',
    'klmaaammgGk',
    'klmmaammgGG',
    'klmmmmmggGk',
    'klhmmmmhlk.',
    '.kdmmmmdk..',
    '..kmmmmk...',
    '..kmmkmmk..',
    '.kkmk kmkk.',
    '.kdmk kmdk.',
    '.kmk.. kmk.',
    '.kkk.  .kkk',
  ]);

  // ── 突撃兵 assault（橙の高速戦士：エネルギーブレード＋スカーフ） ──
  var ASL = { k:'#3a1404', d:'#ad4d1b', m:'#ff7a2f', l:'#ffb866', h:'#ffe6c8', v:'#fff0c8', a:'#ffe066', b:'#c98a12', g:'#9aa7b3', e:'#aef0ff', c:'#e8473a' };
  var asl1 = S(ASL, [
    '....kkk....',
    '...khhhk...',
    '...klvlk...',
    '...kvlkk...',
    '....kk.....',
    'c.kkmmkk...',
    'cckhmmmmhk.',
    '.ckmaaammk.',
    '..kmmmmmek.',
    '..kdmmmeek.',
    '..kmmmmemk.',
    '..kdmmmmdk.',
    '...kmmmmk..',
    '..kmk kmk..',
    '..kmk kmk..',
    '.kmk. kmk..',
    '.kdk. kdk..',
    'kkk.. .kkk.',
  ]);
  var asl2 = S(ASL, [
    '....kkk...e',
    '...khhhk.ee',
    '...klvlkee.',
    '...kvlkke..',
    'c...kk.e...',
    'cc.kkmmkk..',
    'ccckhmmmmhk',
    '.cckmaaammk',
    '..kmmmmmeek',
    '..kdmmmeeek',
    '..kmmmmeemk',
    '..kdmmmmdk.',
    '...kmmmmk..',
    '..kmkkkmk..',
    '..kmk kmk..',
    '.kmk. kmk..',
    '.kdk. kdk..',
    'kkkk. .kkk.',
  ]);
  var asl3 = S(ASL, [
    '...kkk...ee',
    '..khhhk.eee',
    '..klvlkeee.',
    '..kvlkkee..',
    'cc.kk.ee...',
    'ccckkmmkk..',
    'cccklmmmmhk',
    '.cckmaaammhk',
    '.ckmmmmmeeek',
    '..kdmmmeeeek',
    '..kmmaameemk',
    '..klmmmmhlk',
    '..kdmmmmdk.',
    '..kmmkkmmk.',
    '.kmk.  kmk.',
    '.kmk.  kmk.',
    '.kdk.  kdk.',
    'kkkk.  .kkk',
  ]);

  // ── 重装兵 heavy（紫の重装：大カノン。広めだが人型） ──
  var HVY = { k:'#160f36', d:'#463aa0', m:'#7d6cf0', l:'#b9adff', h:'#e6e0ff', v:'#d6ccff', a:'#ff7eb6', b:'#a8326e', g:'#aab0d0', e:'#ffd24a' };
  var hvy1 = S(HVY, [
    '...kkkk....',
    '..khvvhk...',
    '..klkklk...',
    '...kkk.....',
    '.kkkmmkkk..',
    'khmmmmmmhk.',
    'kmmmaammgk.',
    'kmmmmmmggG.',
    'kdmmmmmmgk.',
    'kmmmmmmmmk.',
    'khmmmmmmhk.',
    '.kmmmmmmk..',
    '.kmmkkmmk..',
    '.kmk. kmk..',
    '.kdk. kdk..',
    'kkkk. .kkkk',
  ]);
  var hvy2 = S(HVY, [
    '...kkkk..ee',
    '..khvvhk.e.',
    '..klkklk ee',
    '..kkkkk....',
    'kkkkmmkkkk.',
    'khmmmmmmhgk',
    'kmmmaammggG',
    'kmmmmmmmggG',
    'kdmmmmmmggk',
    'kmmmmmmmmgk',
    'khmmmmmmhlk',
    'klmmmmmmlk.',
    '.kmmkkmmk..',
    '.kmk. kmk..',
    '.kdk. kdk..',
    'kkkk. .kkkk',
  ]);
  var hvy3 = S(HVY, [
    '..kkkk..eGG',
    '.kahvvhak.G',
    '.kalkklak eG',
    'kkakkkkak..',
    'kkkkmmkkkkk',
    'khmmmmmmhgGk',
    'kmmmaammggGk',
    'kmmmaammggGG',
    'kdmmmmmmggGk',
    'kmmmmmmmmgGk',
    'khmmmmmmhlk',
    'klmmmmmmlk.',
    'klmmkkmmlk.',
    '.kmmk kmmk.',
    '.kdmk kmdk.',
    'kkkkk kkkkk',
  ]);

  // ── 射撃兵 shooter（緑の狙撃手：長身・長銃・フード） ──
  var SHT = { k:'#0a2c1c', d:'#1d7a4e', m:'#33c47b', l:'#8af0b4', h:'#d6ffe8', v:'#eafff2', a:'#ffe06b', b:'#c9a01a', g:'#8b97a3', e:'#aef0ff', c:'#176b46' };
  var sht1 = S(SHT, [
    '...kkk.....',
    '..kcchk....',
    '..kcvlk....',
    '..kcvlk....',
    '...kkk.....',
    '..kkmmk....',
    '.kcmmmmk...',
    '.kmmmmmk gg',
    '.kmaammggggG',
    '.kmmmmmk gg',
    '.kdmmmdk...',
    '..kmmmk....',
    '..kmmmk....',
    '..kmk kk...',
    '..kmk km...',
    '..kdk kd...',
    '.kkk. kk...',
  ]);
  var sht2 = S(SHT, [
    '...kkk.....',
    '..kcchk....',
    '..kcvlk....',
    '.ckcvlk....',
    '.ckkkk.....',
    '.cckmmk....',
    'kccmmmmk...',
    'kcmmmmmk ggg',
    'kcmaammgggggG',
    'kcmmmmmk ggg',
    '.kdmmmdk...',
    '.ckmmmk....',
    '.ckmmmk....',
    '..kmkkk....',
    '..kmk km...',
    '..kdk kd...',
    '.kkk. kk...',
  ]);
  var sht3 = S(SHT, [
    '..kkk...eee',
    '.kcchk.....',
    '.kcvvlk....',
    'ckcvllk....',
    'ckkkkk.....',
    'cckmmmk....',
    'kccmmmmlk..',
    'kcmmmmmlkgggg',
    'kcmaaammgggggGe',
    'kcmmmmmlkgggg',
    'kcdmmmdlk..',
    'cckmmmmk...',
    '.ckmmmmk...',
    '..kmmkkk...',
    '..kmk km...',
    '..kdk kd...',
    '.kkk. kk...',
  ]);

  // ── 飛行兵 flyer（金の翼持ち：脚なし・浮遊・大翼） ──
  var FLY = { k:'#3a2a06', d:'#b8902a', m:'#f5c23a', l:'#ffe88a', h:'#fff7d0', v:'#fff7d0', a:'#5ec6ff', b:'#2f86c9', g:'#cfd9e3', e:'#aef0ff', w:'#bfe6ff' };
  var fly1 = S(FLY, [
    '.....kkk....',
    '....khhhk...',
    '....klvlk...',
    '....kvlk....',
    'w...kkk.....',
    'ww.kkmmkk...',
    '.wwkhmmmhk gg',
    '..wkmaammggG',
    '..wkmmmmmgk.',
    '..wkdmmmdk..',
    '...wkmmmk...',
    '...wkeek....',
    '....wee.....',
  ]);
  var fly2 = S(FLY, [
    '.....kkk....',
    '....khhhk...',
    '....klvlk...',
    '....kvlk....',
    'ww..kkk.....',
    'www.kkmmkk gg',
    'wwwwkhmmmhgggG',
    '.wwwkmaammgG..',
    '..wwkmmmmmgk..',
    '..wwkdmmmdk...',
    '.wwwwkmmmk....',
    'www..keeek....',
    '.w...weeew....',
    '......ee......',
  ]);
  var fly3 = S(FLY, [
    'w....kkk...e',
    'ww..khhhk.ee',
    'www.klvlkee.',
    'wwwwkvlkek..',
    'wwwwkkk.k gg',
    'wwwwkkmmkgggG',
    '.wwwkhmmmhggGe',
    '..wwkmaammgGe.',
    '..wwkmmmmmgk..',
    '.wwwwkdmmmdk..',
    'wwww.kmmmk....',
    'www..keeek....',
    'ww...eeeee.w..',
    '.w...eeeee.ww.',
    '......eee...w.',
  ]);

  G.UNIT_FRAMES = {
    infantry: [inf1, inf2, inf3], assault: [asl1, asl2, asl3], heavy: [hvy1, hvy2, hvy3],
    shooter: [sht1, sht2, sht3], flyer: [fly1, fly2, fly3],
  };
  // グレード1〜6 → 3フレーム（Ⅰ:G1-2 / Ⅱ:G3-4 / Ⅲ:G5-6）
  G.unitFrame = function (body, grade) {
    var f = G.UNIT_FRAMES[body]; if (!f) return G.SPRITES[body];
    var i = grade >= 5 ? 2 : grade >= 3 ? 1 : 0;
    return f[Math.min(i, f.length - 1)];
  };

  /* ==================== 敵：禍々しいクリーチャー ==================== */
  // 小型・イーヴィル：かぎ爪の小鬼／蟲（左向き）。
  var e_sw = S({ k:'#2a0810', d:'#8a1e34', m:'#e0405f', l:'#ff8aa2', h:'#ffd0da', v:'#fff2f5', a:'#ff2a4a', t:'#5a1020' },
    ['....k...k...',
     '.k..kk.kk...',
     '.kk.kdkdk...',
     'kakdmmmmk...',
     'kakmlvvlmk..',
     '.kmlmmmmlmk.',
     '.kkmmmmmmk..',
     '..kdmmmmdk..',
     '.tkmmkkmmkt.',
     'tk.t...t.kt.']);
  // 装甲・イーヴィル：甲殻の獣（左向き）。背の棘・角・重い前肢。
  var e_ar = S({ k:'#1e0a16', d:'#7a2a52', m:'#b03070', l:'#e68ab8', h:'#ffd0e8', v:'#fff0f6', a:'#ff2a6a', p:'#ff9ed0' },
    ['....p....p..',
     '..kpkp..pkp.',
     '.kakpkkpkk..',
     'kaakdmllmdk.',
     'kakmlvmmvlmk',
     'kkmllmmmmllk',
     '.kdmmmmmmdk.',
     '.kmmmaammmk.',
     '.kdmmmmmmdk.',
     '.kmmkkpkkmk.',
     'kk.k...k.kk.']);
  // 砲塔・イーヴィル：肥大した砲口の蟲（左に砲口）。単眼・触手。
  var e_sp = S({ k:'#220a22', d:'#7d2e78', m:'#b94fb0', l:'#e8a6e0', h:'#ffd6f6', v:'#ffe0fb', a:'#ff45d0', e:'#ff9ef0', g:'#9c5a98' },
    ['......kkkk..',
     '....kkmmmmk.',
     '...klvvvvlk.',
     'gggkdvmmmvk.',
     'geekmlmmmlmk',
     'gggkdlmmmlk.',
     '...kmmaammk.',
     '...kdmmmmdk.',
     '....kmmmmk..',
     '..t.kkkk.t..',
     '.t........t.']);
  // 飛翔・イーヴィル：膜翼の飛蟲／竜（左向き・空）。
  var e_wy = S({ k:'#2a0820', d:'#9a2e76', m:'#e54fb0', l:'#ff9ed8', h:'#ffd6ef', v:'#fff0fa', w:'#ffb0e2', a:'#ff2a9a' },
    ['.w.........w',
     'wwwk....kwww',
     '.wwdmk.kmdww',
     '..kmllmllmk.',
     '..kmlvmvlmk.',
     '..kkmmmmmkk.',
     '...kdmmmdk..',
     '...kmaamk.a.',
     '...kdmmdk.a.',
     '....kmmk.aa.',
     '....kkk.a...']);
  // 巨核（ボス）：多眼の巨大コア。装甲殻・棘冠・発光核。
  var e_ti = S({ k:'#220404', d:'#8a1414', m:'#c0202a', l:'#ff8a7a', h:'#ffd6c0', v:'#fff3c0', c:'#ff5a3a', w:'#fff7d0', p:'#5a0e0e', a:'#ff2a2a' },
    ['..k..p....p..k..',
     '.kak.kpkkpk.kak.',
     'kaakdkllllkdkaak',
     'kakmllmmmmllmkak',
     '.kmlvmmmmmmvlmk.',
     'kkmlmmmccmmmlmkk',
     'kpmmmmcwwcmmmmpk',
     'kpmmmmcwwcmmmmpk',
     'kkmlmmmccmmmlmkk',
     '.kmlmmmmmmmmlmk.',
     '.kdmllmmmmllmdk.',
     '.kpmmkkppkkmmpk.',
     'kk.kk..pp..kk.kk',
     '.k..k......k..k.']);

  G.SPRITES = {
    infantry: inf1, assault: asl1, heavy: hvy1, shooter: sht1, flyer: fly1,
    e_swarmling: e_sw, e_armored: e_ar, e_spitter: e_sp, e_wyrm: e_wy, e_titan: e_ti,
  };

  G.renderSprite = function (ctx, spr, x0, y0, px, flip) {
    var w = spr.w, h = spr.h, sz = Math.ceil(px) + 1;
    for (var r = 0; r < h; r++) {
      var row = spr.rows[r];
      for (var c = 0; c < w; c++) {
        var ch = row.charAt(c); if (ch === '.' || ch === ' ') continue;
        var col = spr.pal[ch]; if (!col) continue;
        var gc = flip ? (w - 1 - c) : c;
        ctx.fillStyle = col;
        ctx.fillRect(Math.floor(x0 + gc * px), Math.floor(y0 + r * px), sz, sz);
      }
    }
  };

})(window.G = window.G || {});

/* =========================================================================
 * 鋼鉄戦線 (Steel Front) - ドット絵スプライト定義
 *   外部画像を使わず、文字グリッドのピクセルアートとして各キャラを定義する。
 *   '.' = 透明。1文字 = 1ドット。各スプライトは独自パレット(pal)を持つ。
 *   プレイヤー機は右向き、敵(群体)は左向き（＝進行方向）にデザイン。
 *   行の長さは不揃いでよい（読み込み時に右側を透明で自動パディング）。
 * ========================================================================= */
(function (G) {
  'use strict';
  function S(pal, rows) {
    var w = 0, i;
    for (i = 0; i < rows.length; i++) w = Math.max(w, rows[i].length);
    for (i = 0; i < rows.length; i++) while (rows[i].length < w) rows[i] += '.';
    return { w: w, h: rows.length, pal: pal, rows: rows };
  }

  // ---- プレイヤー機（兵科＝キャラクター） --------------------------------
  // 歩兵：青の量産トルーパー。丸いバイザー、肩、ブラスター。
  var inf = S({ O: '#163f63', M: '#2f8fd6', L: '#74ccff', V: '#dff7ff', A: '#ffd24a', G: '#aeb9c4', S: '#0e2942' },
    ['...OOOO...',
     '..OLLLLO..',
     '..OLVVLO..',
     '..OVVVVO..',
     '..OOMMOO..',
     '.OLMMMMLO.',
     '.OMAMMAMO.',
     '.OMMMMMMOGG',
     'SOMMMMMMOS',
     '.OMMMMMMO.',
     '..OMOOMO..',
     '..OO..OO..']);

  // 突撃兵：橙の高速強襲機。前傾シルエット、双刃、バイザー。
  var asl = S({ O: '#7a3010', M: '#ff7a2f', L: '#ffb866', V: '#fff0c8', A: '#ffe28a', G: '#aeb9c4', S: '#511c08' },
    ['....OOOO..',
     '...OLLLLO.',
     '...OLVVLO.',
     '...OVVVVO.',
     '..OOMMMOO.',
     '.OLMMMMMOGG',
     '.OMAAMAMO.',
     'SOMMMMMMO.',
     '.OLMMMMMO.',
     '..OMMMMO..',
     '..OM..MO..',
     '..O....O..']);

  // 重装兵：紫の重機。大きな肩、装甲、重カノン。
  var hvy = S({ O: '#2c2168', M: '#7d6cf0', L: '#b9adff', V: '#e9e4ff', A: '#ff7eb6', G: '#b6afe6', S: '#1a1248' },
    ['.OO....OO.',
     '.OLO..OLO.',
     'OOLLOOLLOO',
     'OLLMMMMLLO',
     'OLMVVVVMLO',
     'OMMMMMMMMO',
     'OMAAMMAAMO',
     'OMMMMMMMMOGGG',
     'OMMMMMMMMO',
     'OLMMMMMMLO',
     '.OMMOOMMO.',
     '.OOO..OOO.']);

  // 射撃兵：緑の狙撃機。片目スコープ、長いライフル。
  var sht = S({ O: '#13502f', M: '#33c47b', L: '#8af0b4', V: '#e9fff2', A: '#ffe06b', G: '#aeb9c4', S: '#0c3520' },
    ['...OOOO...',
     '..OLLLLO..',
     '..OVVVLO..',
     '..OAVMLO..',
     '..OOMMOO..',
     '.OLMMMMLOGGGGGG',
     '.OMMMMMMO.',
     'SOMAAMMMO.',
     '.OMMMMMMO.',
     '..OMMMMO..',
     '..OMOOMO..',
     '..OO..OO..']);

  // 飛行兵：金の航空機。コックピットのバイザー、翼。脚なし（空中）。
  var fly = S({ O: '#6e5212', M: '#f5c23a', L: '#ffe88a', V: '#fff7d0', A: '#5ec6ff', S: '#4a3608' },
    ['.....OO.....',
     '....OLLO....',
     '...OLVVLO...',
     '..OLLVVLLO..',
     '.OOLLLLLLOO.',
     'OLLMMMMMMLLO',
     'OAOMMMMMMOAO',
     '.OOMMMMMMOO.',
     '...OMAAMO...',
     '....OMMO....',
     '.....OO.....']);

  // ---- 敵（群体） --------------------------------------------------------
  // 小型：ピンクの小蟲。牙(左)、複眼。
  var e_sw = S({ O: '#54101e', M: '#e0405f', L: '#ff8aa2', V: '#fff2f5', R: '#ff2a4a', S: '#3a0a14' },
    ['......OOO..',
     '....OOMMMO.',
     '..OOMLLLMO.',
     '.OMLRVVRLMO',
     'OMLLLLLLLMO',
     'OMLLMMMLLMO',
     '.OMMMMMMMO.',
     '..OOMMMOO..',
     '..O.OO.O...']);

  // 装甲：磁紫の重蟲。前面プレート(左)、角。
  var e_ar = S({ O: '#3a0f28', M: '#b03070', L: '#e68ab8', V: '#fff0f6', P: '#ff9ed0', R: '#ff2a6a', S: '#260a1a' },
    ['.O......OO.',
     'OPO...OOMLO',
     'OPPOOOMLLLO',
     'OPPMRRVMMLO',
     'OPPMMMMMMLO',
     'OPPMMMMMMMO',
     '.OPMMMMMMO.',
     '..OOMMMOO..',
     '..O.OO.O...']);

  // 砲塔：紫の砲蟲。砲口(左)、単眼。
  var e_sp = S({ O: '#3a0f3a', M: '#b94fb0', L: '#e8a6e0', V: '#ffe0fb', G: '#d36fd0', A: '#ff9ed0', R: '#ff45d0' },
    ['......OOOO.',
     '.....OLLLLO',
     'GGG.OLVVVLO',
     'GGGOMLRRLMO',
     'GGG.OMMMMMO',
     '....OMAAMMO',
     '.....OMMMMO',
     '.....OOOOO.',
     '....O.OO.O.']);

  // 飛翔：ホットピンクの飛蟲。翼、空中。
  var e_wy = S({ O: '#5a1040', M: '#e54fb0', L: '#ff9ed8', V: '#fff0fa', W: '#ffc6ec', R: '#ff2a9a' },
    ['..W.....W..',
     '.WWO...OWW.',
     'WWOLO.OLOWW',
     '.WOLVOVLOW.',
     '..OMLLLLMO.',
     '..OMRMMRMO.',
     '...OMMMMO..',
     '....OMMO...',
     '.....OO....']);

  // 巨核（ボス）：赤い大型核。発光コア、多眼、装甲。
  var e_ti = S({ O: '#3a0808', M: '#c0202a', L: '#ff8a7a', V: '#fff3c0', C: '#ff5a3a', W: '#fff7d0', P: '#7a1410', R: '#ff2a2a' },
    ['..O........O..',
     '.OLO......OLO.',
     'OOLLO....OLLOO',
     'OLLMMOOOOMMLLO',
     'OLMMMLLLLMMMLO',
     'OMMRVMMMMVRMMO',
     'OMMMMCCCCMMMMO',
     'OMMMCCWWCCMMMO',
     'OMMMMCCCCMMMMO',
     'OMMLLLLLLLLMMO',
     'OMPPPPPPPPPPMO',
     '.OMMOOOOOOMMO.',
     '..OOO....OOO..',
     '..O.O....O.O..']);

  G.SPRITES = {
    infantry: inf, assault: asl, heavy: hvy, shooter: sht, flyer: fly,
    e_swarmling: e_sw, e_armored: e_ar, e_spitter: e_sp, e_wyrm: e_wy, e_titan: e_ti,
  };

})(window.G = window.G || {});

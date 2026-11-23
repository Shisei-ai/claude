// =============================================================
//  data_svx.js … 全英霊の固有イベント（メルトリリスと同じ形の拡充）の仕組み
//
//  英霊ごとに、次の4種類を data_svx_*.js で書く：
//   ev   … 会話イベント（小ネタ入り）3つ          … [キー, 題, 時間帯, 導入, [選択肢, 選択肢]]
//   rel  … 特別な関係ごとに変わるイベント 1つ     … [題, 時間帯, 導入{関係}, ラベル{関係}, 結果{関係}, 上がる能力]
//            関係：lover 恋人 / partner 相棒 / oath 主従 / family 家族 / none なし
//   love … 恋人の時だけ起きるイベント 2つ         … ev と同じ形
//   epi  … エピローグの章 1つ                     … [年, 題, 共に生きる人生の文, 別れた後の人生の文, [章の選択肢, 章の選択肢]]
//
//  選択肢     … [ラベル, 結果, 上がる能力 {bond:8, spi:3}, 資金（省略可。使う万円）]
//  章の選択肢 … [共に生きる人生のラベル, 別れた後のラベル（'' なら同じ）, 共にの結果, 別れの結果, 記録に残す言葉, 'bond'|'joy'|'legacy']
//
//  文の中の記号：{s}＝英霊の名、{m}＝マスターの名、{I}{you}{call}＝英霊の一人称・二人称・呼びかけ
//  文は、ただの文字列のほか、{ n: 通常シナリオ, f: 藤丸シナリオ } や関数でもよい
//  ・イベントは聖杯戦争の間に、契約した英霊だけに起きる（岸波・士郎シナリオ以外。data_three.js の svEv）
//  ・エピローグの章は EPI_SV_CH に入れる（data_epilogue.js が年代順に差し込む）
// =============================================================
const SVX_LBL = { bond: '絆', mag: '魔力', phy: '体力', int: '知力', spi: '精神', cha: '交渉', luk: '幸運' };
const SVX_PACKS = {};

// 上がる能力から、選択肢の下の小さな説明（「精神↑↑・絆↑」など）を作る
function svxHint(g, cost) {
  const groups = [];
  for (const [k, n] of Object.entries(g)) {
    const arrow = n >= 10 ? '↑↑↑' : n >= 7 ? '↑↑' : '↑';
    const last = groups[groups.length - 1];
    if (last && last.arrow === arrow) last.names.push(SVX_LBL[k]); else groups.push({ arrow, names: [SVX_LBL[k]] });
  }
  return (cost ? `資金-${cost}・` : '') + groups.map(x => x.names.join('・') + x.arrow).join('・');
}
// 文を取り出す（藤丸シナリオ用の文があればそちら）
function svxT(v) {
  if (typeof v === 'function') v = v();
  if (v && typeof v === 'object') v = isFuji() && v.f ? v.f : v.n;
  return fmt(v || '');
}
function svxChoice([label, res, g, cost]) {
  return {
    label: () => svxT(label), hint: svxHint(g, cost),
    cond: cost ? () => G.master.money >= cost : undefined,
    run: () => { if (cost) money(-cost); return [svxT(res), rboost(g)]; },
  };
}
function svxEvent(id, [key, title, time, intro, choices], o = {}) {
  svEv(id, key, title, () => svxT(intro), choices.map(svxChoice), Object.assign({ time }, o));
}
const relPick = map => map[relK()] || map.none;

function SVX(id, pack) {
  SVX_PACKS[id] = pack;
  for (const e of pack.ev || []) svxEvent(id, e);
  if (pack.rel) {
    const [title, time, intro, labels, results, g] = pack.rel;
    svEv(id, 'rel', title, () => svxT(relPick(intro)),
      [{ label: () => svxT(relPick(labels)), hint: svxHint(g), run: () => [svxT(relPick(results)), rboost(g)] }], { time });
  }
  for (const e of pack.love || []) svxEvent(id, ['l_' + e[0]].concat(e.slice(1)), { cond: () => G.servant.special === 'lover', weight: 7 });
  if (pack.epi && !EPI_SV_CH[id]) {
    const [y, title, tog, apart, choices] = pack.epi;
    const HINT = { bond: '絆↑↑', joy: '幸福↑↑', legacy: '遺したもの↑↑' };
    EPI_SV_CH[id] = { y, title,
      text: () => svxT(together() ? tog : apart),
      choices: choices.map(([lt, la, rt, ra, mark, kind]) => ({
        label: () => svxT(together() || !la ? lt : la), hint: HINT[kind],
        run: () => epiGain({ [kind]: 3 }, svxT(mark)) || svxT(together() ? rt : ra),
      })) };
  }
}

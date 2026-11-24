// =============================================================
//  data_help.js … 効果の確かめ方（効果の一覧・用語の説明）
//
//  ・戦闘画面：敵味方のHPバーの下に「いま働いている効果」を小さな札で表示
//              「効果の一覧」ボタンで、宝具・スキル・働いている効果・用語の説明をまとめて見られる
//  ・英霊・陣営の画面：「用語の説明」ボタン
//  ・スキルを選ぶと、その効果の内容がすぐ下に出る
// =============================================================

// ---- 用語の説明（[見出し, [[用語, 説明], ...]]） ----
const GLOSSARY = [
  ['戦闘の基本', [
    ['白兵戦・機動戦・魔術戦', '三すくみ。白兵戦は魔術戦に、魔術戦は機動戦に、機動戦は白兵戦に強く、有利な側の判定に+15。使うパラメータは順に筋力・敏捷・魔力。'],
    ['判定', 'パラメータ＋補正＋運（1〜40）の合計を比べ、高い方の攻撃が当たる。差が大きいほどダメージも大きい。'],
    ['防御', '耐久で受ける。判定に負けてもダメージは半分。防ぎ切れば、次の手番の判定+12（反撃）。'],
    ['見切り', '攻撃せずに相手を観察する。次の手番は敵の行動を確実に読めて判定+8。真名の手がかりも得られる。'],
    ['宝具', '三すくみを無視する大技。使うと自分の真名が敵に知られ、以後は敵の判定+6。種類・消費魔力・効果は英霊ごとに違う。'],
    ['真名', '敵の真名が分かると判定+8になり、敵の宝具とスキルを確かめられる。'],
    ['会心', '幸運の半分（％）の確率で、ダメージが1.5倍になる。会心率を上げる効果で、さらに出やすくなる。'],
    ['手番', '戦闘の1回のやり取り。「3手番」は、使った手番を含めて3回分。'],
  ]],
  ['宝具の種類', [
    ['対人宝具', '一人を狙う攻撃宝具。命中しやすいが、威力はほどほど。'],
    ['対軍宝具', '多数を薙ぎ払う攻撃宝具。威力と命中の釣り合いが良い。'],
    ['対城宝具', '城をも砕く攻撃宝具。威力が大きい。'],
    ['対界宝具', '世界を裂く攻撃宝具。最大の威力を持つ。'],
    ['支援宝具', '自分を強化・回復する。効果を出したうえで、宝具の力を纏って得意な戦い方で攻める（判定+15・ダメージ+8）。'],
    ['弱体宝具', '敵を弱らせる・動きを封じる・魔力を奪う。使った手番は、支援宝具と同じく得意な戦い方で攻める。'],
    ['結界宝具', '自分に有利な場を作る（自分の強化と敵の弱体の両方）。使った手番は得意な戦い方で攻める。'],
    ['守護宝具', '守りを固める・攻撃を無効にする。使った手番は守りの構えになり、判定には宝具の値を使う。効果は次の手番から数える。'],
    ['消費魔力', '宝具ごとに違う（25〜90）。軽い宝具は何度も撃てるが効果はそれなり。重い宝具は一度で魔力の大半を使うが強力。攻撃宝具は重いほど威力が大きい。'],
    ['重ねがけ', '同じ宝具の効果はかけ直すと上書きになり、重ならない（スキルの効果とは重なる）。'],
  ]],
  ['宝具の効果', [
    ['攻撃+', 'その間、すべての攻撃の判定が上がる。'],
    ['被ダメージ-', 'その間、受けるダメージが減る。'],
    ['会心率+', 'その間、会心が出やすくなる。'],
    ['敵の判定-（弱体）', 'その間、敵のすべての判定が下がる。'],
    ['敵の被ダメージ+', 'その間、敵が受けるダメージが増える。'],
    ['継続ダメージ', '毒・炎・呪いなど。毎手番のはじめに、敵のHPが減る。'],
    ['継続回復', '毎手番のはじめに、自分のHPが回復する。'],
    ['行動封じ', '敵の次の手番を封じる。封じられた敵は守るしかなく、その守りも崩れやすい。'],
    ['宝具封じ（魔力-）', '敵の魔力を奪う。魔力が足りなくなった敵は、宝具を撃てない。'],
    ['攻撃を無効', '次に受ける攻撃を、その回数だけ無効にする。'],
    ['戦闘続行', 'HPが0になっても、HP20で踏みとどまる。'],
    ['強化を消す', '敵にかかっている強化（攻撃+・被ダメージ-・回避・戦闘続行など）をすべて消す。'],
    ['弱体を消す', '自分にかかっている弱体（判定-・被ダメージ+・継続ダメージ・行動封じ）をすべて消す。'],
    ['防御貫通', '敵が防御していても、守りの上から全力のダメージが通る。'],
    ['必中', '回避の効果を無視して当たる。判定も+6。'],
    ['急所', '命中したとき、一定の確率で敵の最大HPの3割を追加で削る。敵の幸運が高いほど決まりにくい。'],
    ['激昂', '自分のHPが減っているほど、宝具の威力が上がる。'],
    ['自傷', '使うと自分のHPも減る（0にはならない）。'],
    ['真名を見抜く', '使うと、敵の真名が分かる。'],
    ['1戦闘に1度だけ', '一度使うと、その戦闘ではもう使えない。'],
    ['対魔力で軽減', '敵が対魔力（や領域外の生命）を持つと、弱体・行動封じ・宝具封じが弱まったり、防がれたりする。'],
  ]],
  ['スキルの効果', [
    ['白兵／機動／魔術強化', '3手番、その戦い方の判定が上がる。'],
    ['攻撃強化', '3手番、すべての攻撃の判定が上がる（宝具には半分）。'],
    ['宝具強化', '3手番、宝具の判定が上がり、使ったときに魔力+10。'],
    ['魔力充填', '魔力を回復する。'],
    ['防御強化', '3手番、受けるダメージが減る。'],
    ['回避', '次に受ける攻撃を1回無効にする（必中の宝具は避けられない）。'],
    ['戦闘続行', 'HPが0になっても、一度だけHP20で踏みとどまる。'],
    ['回復', 'HPを回復する。'],
    ['会心', '3手番、会心率が上がる。'],
    ['弱体', '3手番、敵の判定が下がる（対魔力で防がれることがある）。'],
    ['行動封じ', '6割の確率で、敵の次の手番を封じる（対魔力で防がれることがある）。'],
    ['防御貫通', '3手番、敵が防御していても攻撃が通りやすくなる。'],
    ['看破', '敵の次の手を確実に読み、次の攻撃の判定が上がる。'],
    ['対マスター', '3手番、「敵マスターを狙う」が成功しやすくなる。'],
    ['使い方', '保有スキルは1回の戦闘で各1回まで。行動（白兵戦・宝具など）と一緒に使い、その手番から効果が出る。ランクが高いほど強い。'],
  ]],
  ['クラススキル（常に働く）', [
    ['対魔力', '敵の魔術戦の判定を下げ、弱体・行動封じ・宝具封じを確率で防ぐ。'],
    ['騎乗', '機動戦の判定が上がる。'],
    ['単独行動', '毎日、魔力が少し回復する。'],
    ['陣地作成', '拠点で迎え撃つときの判定が上がる。'],
    ['道具作成', '毎日、一定の確率で治癒の霊薬を作る。'],
    ['気配遮断', '奇襲の最初の手番と、敵マスター狙いの判定が上がる。'],
    ['狂化', 'すべての攻撃の判定が上がるが、受けるダメージも少し増える。'],
    ['神性・女神の神核', 'すべての攻撃の判定が上がる（女神の神核は受けるダメージも少し減る）。'],
    ['真名看破', '対面した敵の真名を見抜く。'],
    ['復讐者', 'HPが半分を切ると、すべての攻撃の判定が上がる。'],
    ['忘却補正', '会心率が上がる。'],
    ['自己回復（魔力）', '毎手番、魔力が少し回復する。'],
    ['領域外の生命', '受けるダメージが減り、弱体を確率で防ぐ。'],
  ]],
];
function glossaryHTML(open) {
  return `<div class="gloss">${GLOSSARY.map(([h, items], i) => `<details class="gloss-sec" ${open === i ? 'open' : ''}><summary>${h}</summary><dl>${items.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl></details>`).join('')}</div>`;
}

// ---- いま働いている効果（戦闘中） ----
// side 側に「かかっている」効果を集める：自分の強化（自分の欄）＋ 相手がかけた弱体（相手の欄に入っている）
const FX_LABEL = {
  str: v => [`白兵+${v}`, 'up'], agi: v => [`機動+${v}`, 'up'], mag: v => [`魔術+${v}`, 'up'], atk: v => [`攻撃+${v}`, 'up'],
  np: v => [`宝具+${v}`, 'up'], def: v => [`被ダメ-${v}`, 'up'], crit: v => [`会心+${v}%`, 'up'], pierce: v => [`貫通+${v}`, 'up'],
  master: v => [`対マスター+${v}`, 'up'], regen: v => [`再生+${v}`, 'up'],
};
const FX_LABEL_FOE = { debuff: v => [`判定-${v}`, 'down'], expose: v => [`被ダメ+${v}`, 'down'], dot: v => [`継続ダメ${v}`, 'down'] };
const FX_WORDS = {
  str: '白兵戦の判定+', agi: '機動戦の判定+', mag: '魔術戦の判定+', atk: 'すべての攻撃の判定+', np: '宝具の判定+', def: '受けるダメージ-',
  crit: '会心率+', pierce: '防御を貫く攻撃+', master: '敵マスター狙い+', regen: '毎手番HP+', debuff: 'すべての判定-', expose: '受けるダメージ+', dot: '毎手番ダメージ',
};
function activeFx(side) {
  if (!B || !B.buf) return [];
  const foe = side === 'me' ? 'en' : 'me'; const out = [];
  for (const b of B.buf[side]) if (FX_LABEL[b.code]) { const [t, k] = FX_LABEL[b.code](b.v); out.push({ t, k, turns: b.turns, words: `${FX_WORDS[b.code]}${b.code === 'crit' ? b.v + '%' : b.v}`, np: b.np }); }
  for (const b of B.buf[foe]) if (FX_LABEL_FOE[b.code]) { const [t, k] = FX_LABEL_FOE[b.code](b.v); out.push({ t, k, turns: b.turns, words: `${FX_WORDS[b.code]}${b.code === 'dot' ? ` ${b.v}` : b.v}`, np: b.np }); }
  if (B.evade[side] > 0) out.push({ t: `回避×${B.evade[side]}`, k: 'up', words: `次の攻撃を${B.evade[side]}回無効にする` });
  if (B.guts[side] > 0) out.push({ t: `戦闘続行${B.guts[side] > 1 ? '×' + B.guts[side] : ''}`, k: 'up', words: `HP0から${B.guts[side] > 1 ? B.guts[side] + '回まで' : '一度だけ'}踏みとどまる` });
  if (B.stun[side]) out.push({ t: '行動不能', k: 'down', words: '次の手番、身動きが取れない' });
  if (side === 'me' && soulOn()) out.push({ t: '魂喰い', k: 'up', words: `毎手番、HP+${SOUL_BATTLE.hp}・魔力+${SOUL_BATTLE.mp}` });
  if (side === 'en' && G.soul && G.soul.exposed && !B.boss && !B.beast && !B.enforcer) out.push({ t: '討伐令', k: 'up', words: '報酬を狙う戦意。すべての判定+4' });
  return out;
}
// HPバーの下の小さな札
function fxBadgesHTML(side) {
  const fx = activeFx(side); if (!fx.length) return '';
  return `<div class="fx-badges">${fx.map(f => `<span class="fxb ${f.k}">${f.t}${f.turns ? `<em>${f.turns}</em>` : ''}</span>`).join('')}</div>`;
}
function activeFxListHTML(side) {
  const fx = activeFx(side);
  if (!fx.length) return '<p class="info-empty">なし</p>';
  return `<ul class="info-fx">${fx.map(f => `<li class="${f.k}"><b>${f.t}</b><span>${f.words}${f.turns ? `（あと${f.turns}手番）` : ''}${f.np ? '・宝具' : ''}</span></li>`).join('')}</ul>`;
}

// ---- スキル一覧（戦闘中：使ったかどうか付き） ----
function skillInfoHTML(sv, used) {
  const s = skillsOf(sv);
  const act = s.act.map((x, i) => `<div class="${used && used[i] ? 'used' : ''}"><b>${x.name}</b><em>${x.rank}</em><span>${SKILL_FX[x.code].tag}：${skillDesc(x)}${used ? (used[i] ? '<i>使用済み</i>' : '<i class="ok">使える</i>') : ''}</span></div>`).join('');
  const cls = s.cls.map(x => `<div><b>${x.name}</b><em>${x.rank}</em><span>${classDesc(x)}</span></div>`).join('');
  return `${act ? `<h4>保有スキル${used ? '（1戦闘に各1回）' : ''}</h4><div class="skill-list">${act}</div>` : ''}${cls ? `<h4>クラススキル（常に働く）</h4><div class="skill-list cls">${cls}</div>` : ''}`;
}
function npInfoBlockHTML(sv, side) {
  const info = npInfo(sv); const once = side && info.has('once') && B && B.npUsed && B.npUsed[side];
  const mpNow = side === 'me' ? G.servant.mp : side === 'en' ? B.r.mp : null;
  return `<h4>宝具</h4><div class="info-np"><div class="np-ruby">${sv.npRuby}</div><div class="np-name">${sv.np}</div>${npDetailHTML(sv)}
    ${side === 'me' ? `<p class="info-mp">いまの魔力 ${mpNow} ／ 必要 ${info.cost}　${once ? '<span class="tag">この戦闘では使用済み</span>' : mpNow >= info.cost ? '<span class="tag green">撃てる</span>' : '<span class="tag red">魔力不足</span>'}</p>` : ''}</div>`;
}

// ---- 効果の一覧（戦闘中） ----
function battleInfoHTML() {
  const me = servantOf(G); const r = B.r; const en = servantOf(r); const known = knowsName(r);
  return `
    <section class="info-sec"><h3>いま働いている効果</h3>
      <div class="info-two"><div><h4>${me.short}</h4>${activeFxListHTML('me')}</div><div><h4>${enemyName()}</h4>${activeFxListHTML('en')}</div></div>
      <p class="info-note">数字は残りの手番。宝具の効果は、かけ直すと上書きになる。</p></section>
    <section class="info-sec"><h3>${me.short}（${me.cls}）</h3>${npInfoBlockHTML(me, 'me')}${skillInfoHTML(me, B.sk.me)}</section>
    <section class="info-sec"><h3>${enemyName()}（${r.cls}）</h3>${known && !B.boss && !B.beast ? `${npInfoBlockHTML(en, 'en')}${skillInfoHTML(en, B.sk.en)}` : known ? npInfoBlockHTML(en, 'en') : '<p class="info-empty">真名が分かると、宝具とスキルを確かめられる。（見切り・情報収集・敵の宝具で判明）</p>'}</section>
    <section class="info-sec"><h3>用語の説明</h3>${glossaryHTML()}</section>`;
}

// ---- 下から出る説明の画面 ----
function openSheet(title, html) {
  let s = document.getElementById('sheet');
  if (!s) { s = document.createElement('div'); s.id = 'sheet'; document.body.appendChild(s); }
  s.innerHTML = `<div class="sheet-back" data-sheet-close></div><div class="sheet-panel" role="dialog" aria-modal="true" aria-label="${title}">
    <div class="sheet-head"><span>${title}</span><button class="sheet-x" data-sheet-close aria-label="閉じる">閉じる</button></div><div class="sheet-body">${html}</div></div>`;
  s.className = 'show';
  const panel = s.querySelector('.sheet-body'); if (panel) panel.scrollTop = 0;
}
function closeSheet() { const s = document.getElementById('sheet'); if (s) { s.className = ''; s.innerHTML = ''; } }
document.addEventListener('click', e => {
  if (e.target.closest('[data-sheet-close]')) { closeSheet(); return; }
  const t = e.target.closest('[data-info]'); if (!t) return;
  e.stopPropagation();
  const k = t.dataset.info;
  if (k === 'battle' && B) openSheet('効果の一覧', battleInfoHTML());
  else if (k === 'glossary') openSheet('用語の説明', glossaryHTML(0));
}, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

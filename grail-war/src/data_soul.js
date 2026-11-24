// =============================================================
//  data_soul.js … 魂喰い
//
//  ・マスターの属性が「悪」か「混沌」のとき、聖杯戦争の夜に「魂喰いを命じる」を選べる
//      善の英霊は拒む（令呪で命じることはできる）。中庸の英霊は渋る。悪の英霊は乗り気
//  ・魂喰いをしている間：
//      戦闘外 … 1コマ（昼・夜）ごとに、英霊の魔力+8・HP+6
//      戦闘中 … 毎手番、英霊の魔力+4・HP+4
//  ・街に「痕跡」が溜まっていく（数値は見せない）。昼の「拠点を整える」の「痕跡を隠蔽する」で減らし、
//    重ねるほど痕跡が溜まりにくくなる
//  ・痕跡が溜まりすぎると発覚し、教会から討伐令が出る（自分が討伐対象になる）
//      同盟は破棄・教会の支援は受けられない・夜襲が起きやすい・昼にも襲われる・敵の戦意が上がる
//  ・その他：善の英霊とは絆が下がり続ける／性格が悪へ傾く／エンディングに一文が加わる
//  ・魂喰いは「やめる」こともできる。やめると、痕跡は少しずつ薄れていく
// =============================================================

function soul() { if (!G.soul) G.soul = { on: false, conceal: 0, heat: 0, exposed: false, days: 0, ever: false }; return G.soul; }
function soulOn() { return !!(G && G.soul && G.soul.on); }
// 始められるか：聖杯戦争中・属性が悪か混沌（衛宮士郎のシナリオは除く）
function soulAllowed() {
  if (!G || G.phase !== 'war' || !G.servant || isShirou()) return false;
  const [o, m] = alignLabel().split('・'); return o === '混沌' || m === '悪';
}
const SOUL_REGEN = { mp: 8, hp: 6 };       // 1コマごと
const SOUL_BATTLE = { mp: 4, hp: 4 };      // 戦闘の毎手番
// 1日に溜まる痕跡（隠蔽を重ねるほど少なくなる）
function soulHeatGain() { return Math.max(3, 16 - soul().conceal * 3); }
// 痕跡の具合（数値の代わりに見せる言葉）
function soulTrace() {
  const h = soul().heat;
  if (soul().exposed) return '発覚済み（討伐対象）';
  return h < 20 ? 'ほとんど残っていない' : h < 45 ? '眠り病の噂が立ち始めている' : h < 70 ? '教会が夜の街を調べている' : '教会の目が、すぐ近くまで迫っている';
}
function soulStatusHTML() {
  const s = soul(); if (!s.on && !s.exposed) return '';
  return `<div class="wide soul-line"><span>魂喰い</span>${s.on ? `実行中（毎刻 魔力+${SOUL_REGEN.mp}・HP+${SOUL_REGEN.hp}）` : '止めている'}　<span>痕跡</span>${soulTrace()}</div>`;
}

// ---- 夜の行動：魂喰いを命じる ----
function soulStartScene() {
  const sv = servantOf(G); const moral = sv.align.split('・')[1]; const mute = voiceOf(sv).reg === 'mute';
  const intro = `<p>夜の街。窓の明かりの一つ一つに、眠る人々の命が灯っている。<br>――その生命力を少しずつ吸い上げれば、${SV()}は戦わずして力を蓄えられる。魂喰い。聖杯戦争の掟に背く、禁じられた手だ。</p>`;
  const go = (extra) => {
    NOTES = []; const s = soul(); s.on = true; s.ever = true; tone('evil');
    if (moral === '善') { bond(-8); note(`<span class="note">${SV()}の心が、あなたから離れていくのが分かる。（絆-8）</span>`); }
    addLog('魂喰いを始める。');
    next('魂喰い', paras([...[].concat(extra), `${SV()}の影が夜の街へ溶けていく。翌朝、いくつかの家で、目を覚まさない人が見つかるだろう。――命までは奪わない。眠り続けるだけだ。`,
      `<span class="note">魂喰いを始めた。1コマごとに魔力+${SOUL_REGEN.mp}・HP+${SOUL_REGEN.hp}、戦闘中は毎手番 魔力+${SOUL_BATTLE.mp}・HP+${SOUL_BATTLE.hp}。<br>街には痕跡が残る。昼の「拠点を整える」で隠蔽しないと、いずれ教会に気づかれる。</span>`, ...takeNotes()]), advance);
  };
  if (moral === '善') {
    const refuse = mute ? `${SV()}は、低く唸って首を横に振った。どれほど言葉を重ねても、その場から一歩も動こうとしない。` : `${SV()}の表情が凍りついた。<br>「……今、何と言った。罪のない人々から命を啜れと？ それだけは、断る」`;
    return scene({ title: '魂喰い', sub: 'NIGHT', body: [intro, `<p>${refuse}</p>`], choices: [
      { label: '「令呪をもって命ずる――魂を喰らえ」', hint: `令呪-1・絆が大きく下がる・悪`, cls: 'danger', disabled: G.master.seals < 1, fn: () => {
        G.master.seals--; addLog('令呪で魂喰いを命じる。');
        go([`<b>「令呪をもって命ずる――魂を喰らえ」</b> 右手の令呪が一画、紅く輝いて消えた。`, mute ? `${SV()}は抗うように身を震わせ、それから、夜の闇へ消えていった。` : `「……ッ、この屈辱は、忘れんぞ」${SV()}は歯を食いしばったまま、夜の闇へ消えていった。`]);
      } },
      { label: '……やめておく', fn: () => { NOTES = []; bond(2); next('魂喰い', paras([mute ? `${SV()}は、ほっとしたように肩の力を抜いた。` : `「……それでいい」${SV()}は小さく息をついた。`, ...takeNotes()]), hub); } },
    ] });
  }
  const react = moral === '悪'
    ? (mute ? `${SV()}は、喉の奥で愉しげに唸った。` : `${SV()}は口の端を吊り上げた。「ほう。存外、話の分かるマスターだ」`)
    : (mute ? `${SV()}は一瞬こちらを見つめ、それから黙って夜の方を向いた。` : `${SV()}はしばらく黙っていた。「……勝つためなら、か。良いだろう。だが、気分の良い話ではないな」`);
  scene({ title: '魂喰い', sub: 'NIGHT', body: [intro, `<p>${react}</p>`], choices: [
    { label: '魂喰いを命じる', hint: '悪・毎コマ魔力とHPが回復・発覚の危険', cls: 'danger', fn: () => go([]) },
    { label: 'やはり、やめておく', fn: hub },
  ] });
}

// ---- 昼の「拠点を整える」に加わる選択肢 ----
function soulBaseChoices() {
  const s = soul(); const out = [];
  if (s.on && !s.exposed) out.push({ label: '痕跡を隠蔽する', hint: `資金-1・知力判定・痕跡：${soulTrace()}`, disabled: G.master.money < 1, fn: () => actResult('隠蔽', () => {
    money(-1); const c = chk('int', 50);
    const cut = c.ok ? 30 : 15; s.heat = Math.max(0, s.heat - cut); s.conceal = Math.min(5, s.conceal + 1);
    return [c.text, c.ok ? '被害者の記憶をぼかし、魔力の残り香を散らし、使い魔で噂の出どころを辿って潰した。痕跡は、ほとんど消えた。' : '急ごしらえの隠蔽工作だった。いくらかの痕跡は残ってしまったかもしれない。',
      `<span class="note">痕跡：${soulTrace()}。隠蔽を重ねるほど、これからの痕跡も残りにくくなる。</span>`];
  }) });
  if (s.on) out.push({ label: '魂喰いをやめる', hint: '回復が止まる・痕跡は少しずつ薄れる', fn: () => actResult('魂喰いをやめる', () => {
    s.on = false; addLog('魂喰いをやめる。');
    const sv = servantOf(G); if (sv.align.includes('善')) bond(4);
    return `${SV()}を呼び戻した。街の眠り病は、やがて収まっていくだろう。`;
  }) });
  if (!s.on && s.ever && soulAllowed()) out.push({ label: '魂喰いを再開する', hint: '悪・夜を待たずに命じる', cls: 'danger', fn: soulStartScene });
  return out;
}

// ---- 時間の経過 ----
// 1コマごと（core.js の advance から）
function soulSlot() {
  if (!soulOn() || G.phase !== 'war') return;
  mp(SOUL_REGEN.mp); shp(SOUL_REGEN.hp);
}
// 1日ごと（core.js の dailyUpdate から）：痕跡が溜まり、溜まりすぎると発覚する
function soulDaily() {
  const s = G.soul; if (!s || G.phase !== 'war') return;
  if (!s.on) { s.heat = Math.max(0, s.heat - 8); return; }
  s.days++;
  // 善の英霊は、続けるほど心が離れていく
  if (servantOf(G).align.includes('善')) G.servant.bond = Math.max(0, G.servant.bond - 2);
  if (s.exposed) return;
  s.heat += soulHeatGain();
  if (s.heat >= 100 || Math.random() * 100 < (s.heat - 55) / 2) { s.pend = true; return; }
  if (Math.random() < 0.6) G.news.push(s.heat < 45 ? '「深見市で眠り病？」――原因不明のまま眠り続ける人が、また見つかったという。'
    : s.heat < 70 ? '教会の人間が、夜の住宅街を聞き込みして回っているらしい。眠り病の被害者の家を、一軒一軒。'
    : 'あなたの拠点の近くで、黒い服の神父を見かけた。こちらを一瞥して、何も言わずに去っていった。');
}
// コマの始まり（core.js の startSlot から）：発覚の知らせ
function soulCheck() {
  const s = G.soul; if (!s || !s.pend || G.phase !== 'war') return null;
  s.pend = false; s.exposed = true;
  return () => {
    for (const r of aliveRivals()) { r.ally = false; r.aggr = Math.min(2, (r.aggr || 1) + 0.5); r.intel = Math.max(r.intel, 1); }
    const wasReg = !!G.flags.registered; G.flags.registered = false; G.flags.soulHunted = true;
    addLog('魂喰いが発覚。教会から自分への討伐令が出る。');
    showCard({ kicker: '発覚', title: '討伐令', cls: 'blood', ms: 1600 }, () => next('討伐令', paras([
      `${wasReg ? `${CAST.sister}から` : '教会から全マスターへ'}、通達が届いた。`,
      `<p class="quote">「深見市で相次ぐ眠り病は、魂喰いによるものと断定しました。行っているのは――${M()}の陣営です。<br>神秘の秘匿と聖杯戦争の掟に対する重大な違反として、討伐令を発します。討伐した者に、報酬として令呪一画を」</p>`,
      `あなたは、聖杯戦争の全陣営から狙われる立場になった。`,
      `<span class="note">討伐対象になった：同盟はすべて破棄され、教会の支援は受けられない。夜襲が起きやすくなり、昼にも襲われることがある。敵は報酬を狙って戦意を上げてくる。<br>魂喰いは続けることもやめることもできるが、一度出た討伐令は取り消されない。</span>`,
    ]), startSlot, '次へ', 'WARNING'));
  };
}
// 討伐対象のとき、昼にも襲われる（core.js の startSlot から）
function soulDayRaid() {
  if (!G.soul || !G.soul.exposed || isNight() || G.phase !== 'war') return null;
  const foes = engageable(); if (!foes.length || Math.random() > 0.2) return null;
  const r = wpick(foes, x => x.aggr);
  return () => next('白昼の襲撃', [`<p>人通りの絶えた路地で、殺気が膨れ上がった。――<b>${rivalLabel(r)}陣営</b>だ。討伐令の報酬を狙って、昼間から仕掛けてきた！</p>`],
    () => startBattle(r, { enemyFirst: true }), '迎え撃つ');
}
// 討伐対象のとき、敵の判定に加わる戦意
function soulHuntedBonus() { return G.soul && G.soul.exposed ? 4 : 0; }
// 夜襲の起きやすさに加わる分
function soulRaidBonus() { return G.soul && G.soul.exposed ? 0.22 : 0; }

// ---- エンディングの一文 ----
function soulEpilogue(kind) {
  const s = G.soul; if (!s || !s.ever || ['dead', 'sealed'].includes(kind)) return '';
  if (s.exposed) return '<p class="note">魂喰いの罪は、教会の記録に残された。聖杯戦争が終わっても、あなたの名前は「討伐令の対象」として、魔術の世界で囁かれ続けた。</p>';
  return `<p class="note">春になると、眠り病の人々は皆、目を覚ました。誰も、あの冬の夜のことを覚えていない。――あなただけが、覚えている。</p>`;
}

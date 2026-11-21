// =============================================================
//  ending.js … 終盤（決戦・聖杯降臨・隠しボス）とエンディング
// =============================================================

function breakAlliance() {
  for (const r of aliveRivals()) r.ally = false;
  next('同盟の終わり', ['<p>残るは、同盟を結んだ陣営とあなたたちだけになった。電話の向こうで、相手が静かに告げる。「――ここまでだ。次に会う時は、敵同士だ」</p>'], startSlot);
}
function siegeScene(r) {
  r.siege = true; r.ally = false; r.intel = Math.max(r.intel, 2);
  next('籠城', paras([`残る敵は、${rivalLabel(r)}陣営ただ一つ。`,
    `その夜、${esc(r.master)}から使い魔が届いた。「聖杯の降臨は${FINAL_DAY}日目の夜。天降山の頂で待つ。……それまで、せいぜい足掻くといい」`,
    `${rivalLabel(r)}陣営は天降山の古社に陣を敷き、結界の内に籠もった。手出しはできない。`,
    `<span class="note">決戦は${FINAL_DAY}日目の夜。それまでの日々で、絆を深め、真名を暴き、道具を揃えよう。</span>`]), startSlot, '次へ', 'SIEGE');
}
function finalBattleIntro() {
  const r = aliveRivals()[0];
  r.ally = false;
  const choices = [{ label: '最後の戦いへ', cls: 'primary', fn: () => startBattle(r, { final: true }) }];
  if (G.items.crystal || G.items.potion) choices.unshift({ label: '道具で万全を期す', hint: '魔力結晶・霊薬を使ってから戦う', fn: () => {
    if (G.items.crystal) { item('crystal', -1); mp(40); }
    if (G.items.potion) { item('potion', -1); shp(35); }
    startBattle(r, { final: true });
  } });
  scene({ title: '天降山', sub: '第三幕　降臨', body: [
    '<p>残る陣営は、あと一つ。天降山の頂、霊脈の集う古社の境内に、聖杯の器が姿を現しつつある。</p>',
    `<p>雪の舞う石段を登りきると、最後の敵が待っていた。${rivalLabel(r)}陣営――マスター、${esc(r.master)}。</p>`,
    `<p class="quote">「${r.quote}」</p>`,
    `<p class="quote">${fmt(pick(PERSONAS[servantOf(G).persona].high))}</p>`,
    `<p class="note">${SV()} HP ${G.servant.hp}/${servantHpMax()}・魔力 ${G.servant.mp}　敵HP ${r.hp}/${r.hpMax}　撤退はできない。</p>`,
  ], choices });
}
function deadlineScene() {
  // 期限切れ：残った陣営のうち最強の一つが最後の敵になる
  G.day = WAR_DAYS; G.slot = 1;
  const alive = aliveRivals();
  const strongest = alive.reduce((a, b) => (a.power + a.hp) >= (b.power + b.hp) ? a : b);
  for (const r of alive) if (r !== strongest) { r.alive = false; addLog(`${rivalLabel(r)}陣営、混戦の中で脱落。`); }
  next('最終局面', ['<p>聖杯の器が満ちようとしている。監督役から全陣営へ通達が届いた。「聖杯の降臨は今宵。残る者は天降山へ」</p>',
    '<p>天降山へ向かう途中の混戦で、いくつもの陣営が黒い泥に呑まれていった。生き残ったのは――</p>'], finalBattleIntro);
}

function victoryScene() {
  G.phase = 'end';
  const sv = servantOf(G); const b = birthOf();
  const choices = [];
  if (G.flags.grailTruth) choices.push({ label: '聖杯を破壊する', hint: '呪いそのものとの戦いになる', cls: 'danger', fn: bossIntro });
  if (G.servant.special) choices.push({ label: `${sv.short}の受肉を願う`, hint: `「${RELATIONS[G.servant.special].name}」として共に生きる`, cls: 'primary', fn: () => ending('together') });
  if (G.flags.knowWish && !G.flags.grailTruth) choices.push({ label: `${sv.short}に聖杯を託す`, hint: `「${SERVANT_WISH[sv.persona].slice(0, 18)}…」`, fn: () => ending('servantWish') });
  choices.push({ label: `「${b.wish}」を願う`, hint: 'マスターの願い', fn: () => ending(G.flags.grailTruth ? 'wishKnown' : 'wish') });
  choices.push({ label: '何も願わない', fn: () => ending('none') });
  scene({ title: '聖杯降臨', sub: '第三幕　降臨', body: [
    '<p>最後の敵が消え、天降山の頂に黄金の杯が降りてきた。万能の願望機――聖杯。</p>',
    G.flags.grailTruth ? '<p>だが、あなたは知っている。その黄金の内側には、六十年分の呪いが渦巻いていることを。</p>'
      : G.flags.grailHint ? '<p>その輝きは眩い。……けれど、なぜだろう。杯の底に、黒い影が揺れた気がした。</p>'
        : '<p>その輝きは眩く、どんな願いでも叶えてくれそうに見えた。</p>',
    `<p class="quote">${fmt(pick(PERSONAS[sv.persona].high))}</p>`,
    '<p>あなたが願うのは――</p>',
  ], choices });
}
function bossIntro() {
  const boss = { id: 'boss', cls: '聖杯', servantId: 'ori', master: '―', type: '', quote: '', power: 7, aggr: 1, alive: true,
    hp: 190, hpMax: 190, mp: 100, intel: 3, clues: 0, seals: 1, ally: false };
  next('黒き聖杯', [
    `<p>「${SV()}、聖杯を――壊して」</p>`,
    '<p>その言葉に応えるように、黄金の杯がひび割れた。溢れ出したのは、六十年分の呪い。黒い泥が渦を巻き、巨大な影となって立ち上がる。</p>',
    '<p class="quote">「ネガイヲ……ネガイヲ、ヨコセ……」</p>',
    G.flags.resolve === 'destroy' ? `<p>${SV()}が剣を構える。「決めていたことだ。最後まで付き合おう」</p>` : `<p>${SV()}が前に出る。「――下がっていろ。これは、私の戦いでもある」</p>`,
    `<p class="note">${SV()} HP ${G.servant.hp}/${servantHpMax()}・魔力 ${G.servant.mp}　令呪 ${G.master.seals}画。撤退はできない。</p>`,
  ], () => startBattle(boss, { boss: true }), '聖杯に挑む', 'FINAL');
}

function ending(kind) {
  G.phase = 'end'; clearSave();
  const sv = G.servant ? servantOf(G) : null; const rel = G.servant && G.servant.special ? RELATIONS[G.servant.special] : null;
  const per = sv ? PERSONAS[sv.persona] : null;
  const E = {
    dead: () => ({ title: '終幕：血に染まる冬', text: [`<p>深見市の冬の夜に、${M()}の命は散った。</p>`, sv ? `<p>契約者を失った${sv.short}もまた、光の粒となって消えていく。最後に、何かを言いかけたように見えた。</p>` : '', '<p>聖杯戦争は、あなたのいないまま続いていく。</p>'] }),
    lost: () => ({ title: '終幕：脱落', text: [`<p>${sv.short}の霊基は砕け、聖杯戦争からの脱落が決まった。</p>`, `<p class="quote">${fmt(per.farewell)}</p>`,
      G.flags.registered ? `<p>あなたは教会に保護され、戦いの結末を遠くから聞くことになった。${CAST.sister}が淹れてくれた紅茶は、少しだけ苦かった。</p>` : '<p>あなたは傷ついた体を引きずり、冬の街へと消えた。</p>',
      '<p>右手の痣だけが、あの日々が夢ではなかったと告げている。</p>'] }),
    devoured: () => ({ title: '終幕：黒い夜明け', text: ['<p>泥は全てを呑み込んだ。', `${sv.short}の霊基も、あなたの叫びも。</p>`,
      '<p>天降山から溢れた呪いは、夜明けとともに街へと流れ下っていく。……けれど、その勢いは六十年前ほどではなかった。あなたたちの戦いは、確かに何かを削り取ったのだ。</p>',
      '<p class="note">ヒント：決戦前夜の覚悟や、黒い泥の正体を知っていれば、聖杯との戦いで有利になる。</p>'] }),
    wish: () => ({ title: '終幕：歪んだ願い', text: ['<p>聖杯は願いを聞き届けた。――最悪の形で。</p>', '<p>溢れ出した黒い泥が天降山を覆い、深見市の夜空が赤く染まる。願いは確かに「叶った」。だが、その代償はあまりにも大きかった。</p>',
      `<p>消えゆく${sv.short}の姿を見送りながら、あなたは悟る。この聖杯は、最初から呪われていたのだと。</p>`, '<p class="note">ヒント：聖杯の真実を知っていれば、別の選択肢があったかもしれない。</p>'] }),
    wishKnown: () => ({ title: '終幕：承知の上の願い', text: ['<p>呪われた聖杯と知りながら、あなたは願った。泥が溢れ、街に災いが降りかかる。</p>', `<p>${sv.short}は何も言わず、ただ悲しげにあなたを見つめていた。</p>`] }),
    servantWish: () => ({ title: '終幕：託された願い', text: [`<p>「${sv.short}。この聖杯は、君のものだ」</p>`, `<p>${sv.short}は驚き、それから静かに杯を受け取った。</p>`,
      `<p class="quote">「${SERVANT_WISH[sv.persona]}」</p>`, '<p>黄金の光が夜空に広がる。その願いがどんな形で叶ったのか、あなたには分からない。けれど、光の中で振り返った顔は、確かに笑っていた。</p>',
      G.flags.grailHint ? '<p class="note">杯の底に揺れた黒い影のことを、あなたは最後まで考えないようにした。</p>' : ''] }),
    destroy: () => ({ title: '終幕：冬の終わり', text: [`<p>${sv.short}の最後の一撃が、黒き聖杯を光の中に消し去った。呪いは霧散し、天降山に朝日が昇る。</p>`,
      `<p class="quote">${fmt(per.farewell)}</p>`, `<p>聖杯を手にすることはなかった。けれど、あなたは確かにこの街を救ったのだ。河川敷では、${CAST.old}が一人、深く頭を下げていた。</p>`] }),
    destroySpecial: () => ({ title: '終幕：夜明けの約束', text: [`<p>二人で選んだ答えは、聖杯の破壊だった。${sv.short}の一撃が呪いを焼き払い、夜が明けていく。</p>`,
      `<p>消えゆく体で、${sv.short}はあなたの手を握った。「${rel ? rel.name : ''}」として過ごした日々が、指先から伝わってくる。</p>`, `<p class="quote">${fmt(per.farewell)}</p>`,
      '<p>朝日の中に消えた姿を、あなたは決して忘れない。――いつかまた、どこかの空の下で。</p>'] }),
    together: () => ({ title: `終幕：${rel ? rel.name : ''}として`, text: [`<p>「${sv.short}に、この世界で生きる体を」</p>`, '<p>聖杯は願いを聞き届けた。黄金の光が霊基を包み、英霊は肉体を得て現世に降り立つ。</p>',
      `<p>冬が終わり、深見市に春が来た。桜並木の下を、${sv.short}と並んで歩く。「${rel ? rel.name : ''}」と呼び合う二人の、新しい日々が始まる。</p>`,
      G.flags.grailTruth ? '<p class="note">聖杯の呪いは今も山の下に眠っている。いつか、二人で向き合う日が来るだろう。</p>' : ''] }),
    abstain: () => ({ title: '終幕：日常への帰還', text: ['<p>「……ごめん。戦えない」</p>',
      `<p>${sv.short}は少しだけ目を伏せ、それから穏やかに笑った。</p>`, `<p class="quote">${fmt(per.farewell)}</p>`,
      `<p>令呪は教会に預けられ、${sv.short}の姿は光の粒となって消えた。</p>`,
      '<p>春が来た。あの冬、この街で何が起きたのか、あなたは知らない。ニュースは時々、原因不明の事故や昏睡事件を報じていた。</p>',
      '<p>右手の甲には、今もうっすらと三画の痣が残っている。</p>',
      '<p class="note">ヒント：戦う道を選べば、別の結末が待っている。</p>'] }),
    none: () => ({ title: '終幕：願いなき勝者', text: ['<p>あなたは何も願わなかった。聖杯は誰の手にも渡らぬまま、静かに消えていった。</p>', `<p class="quote">${fmt(per.farewell)}</p>`,
      '<p>勝者の手に残ったのは、戦いの記憶と、確かに結ばれた絆だけだった。</p>'] }),
  }[kind]();
  const ep = friendEpilogue(kind);
  if (ep) E.text.push(ep);
  addLog(E.title); markEnding(kind);
  const good = !['dead', 'lost', 'wish', 'wishKnown', 'devoured', 'abstain'].includes(kind);
  sfx(good ? 'win' : 'lose');
  showCard({ kicker: good ? 'ENDING' : 'BAD END', title: E.title.replace('終幕：', ''), cls: good ? 'dawn' : 'blood', ms: 2200 }, () => {
    SCENE = { kind: 'ending', endKind: kind, title: E.title, text: E.text.filter(Boolean), good };
    TAB = 'story'; render();
  });
}

// 幼馴染のその後
function friendEpilogue(kind) {
  if (!G.friend || !G.rivals.length || kind === 'dead') return '';
  const r = G.rivals.find(x => x.friend); const n = friendName();
  if (!r) return '';
  if (G.flags.friendSaved) return `<p class="note">春。${n}と並んで、城跡公園の桜を見上げた。「約束、守ってくれたね」</p>`;
  if (r.killed) return `<p class="note">${n}の家の前を通るたび、あなたは足を止める。もう、あの笑顔が迎えてくれることはない。</p>`;
  if (G.flags.friendDefeated) return `<p class="note">戦いの後、${n}から一通のメッセージが届いた。「おかえり。……また、ココア飲みに来なよ」</p>`;
  if (r.alive) return `<p class="note">${n}は最後まで、あなたの味方でいてくれた。</p>`;
  return `<p class="note">${n}は無事だった。教会で再会した時、二人はしばらく言葉もなく、ただ抱き合った。</p>`;
}

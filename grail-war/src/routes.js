// =============================================================
//  routes.js … 聖杯戦争への「関わり方」（参戦ルート）
//  18歳になった時点で、産まれ・成長中の選択・知った秘密の量で決まる。
//
//   heir      継承者     魔術の家に生まれ、家の務めとして参戦する
//   mission   請負人     依頼（傭兵）や命令（代行者）として参戦する
//   seeker    探求者     一般の生まれだが、自ら街の秘密に辿り着き、参戦を選ぶ
//   caught    巻き込まれた者  何も知らないまま、ある夜突然巻き込まれる
//   reluctant 背を向けた者  魔術の道を捨てようとしたが、令呪に選ばれてしまう
// =============================================================

const ROUTES = {
  heir:      { name: '継承者', desc: '魔術の家の務めとして、聖杯戦争に臨む' },
  mission:   { name: '請負人', desc: '依頼や命令を受け、聖杯戦争に臨む' },
  seeker:    { name: '探求者', desc: '自ら街の秘密に辿り着き、参戦を選んだ' },
  caught:    { name: '巻き込まれた者', desc: '何も知らないまま、聖杯戦争に巻き込まれた' },
  reluctant: { name: '背を向けた者', desc: '魔術の道に背を向けながら、令呪に選ばれた' },
  fujimaru:  { name: '元・人類最後のマスター', desc: '旅を終えて日常に帰還し、陰謀の聖杯戦争に招かれた' },
  shirou:    { name: '正義の味方', desc: '遠坂凛の頼みで、深見の聖杯戦争に身を投じた' },
  kishinami: { name: '月の王', desc: 'ムーンセルから不穏な世界線を観測し、自ら地上へ降り立った' },
};
function lore(n) { G.lore = (G.lore || 0) + n; }
function routeName() {
  if (!G.route) return '';
  return ROUTES[G.route].name + (G.flags.refused ? '（拒んだ末に）' : G.flags.wasReluctant ? '（覚悟の末に）' : '');
}

function decideRoute() {
  const b = birthOf().id; const f = G.flags;
  if (b === 'fujimaru') return 'fujimaru';
  if (b === 'kishinami') return 'kishinami';
  if (b === 'shirou') return 'shirou';
  if (f.rebel) return 'reluctant';
  if (b === 'mercenary') return 'mission';
  if (b === 'executor' && f.churchPath) return 'mission';
  if (birthOf().magic) return 'heir';
  if (f.pursue) return 'seeker';
  return 'caught';
}

// ---------------- 18歳の冬 ----------------
function comingOfAge() {
  const b = birthOf(); const m = G.master;
  if (!isFuji() && !isShirou()) m.age = ADULT_AGE;
  m.hp = m.hpMax; m.od = odMax();
  G.route = decideRoute();
  G.phase = 'prep'; G.day = 1; G.slot = 0;   // ヘッダー表示用（行動選択は beginPrep から）
  const top = Object.entries(m.stats).sort((a, c) => c[1] - a[1]).slice(0, 2).map(([k]) => STAT_LABEL[k]);
  G.summary = `<span class="note">得意なこと：${top.join('・')}　／　在り方：${alignLabel()}</span>`;
  chapterCard('序章　令呪の冬', () => {
    G.lastChapter = '序章　令呪の冬';
    ({ heir: heirPrologue, mission: missionPrologue, seeker: seekerPrologue, caught: () => caughtPrologue(false), reluctant: reluctantPrologue, fujimaru: fujimaruPrologue, kishinami: kishinamiPrologue, shirou: shirouPrologue })[G.route]();
  });
}
function beginPrep() {
  G.phase = 'prep'; G.day = 1; G.slot = 0; SLOT = {};
  addLog(`${G.master.age}歳の冬、右手に令呪が現れる。（${routeName()}）`);
  startSlot();
}
function catalystLine() {
  return G.catalysts.length ? `手元には、これまでの人生で手にした触媒がある。<b>${G.catalysts.map(id => SV_BY_ID[id].catalyst).join('、')}</b>。` : '';
}

// ---- 継承者：家の務めとして ----
function heirPrologue() {
  const b = birthOf();
  if (b.id === 'noble') giveCatalyst();
  if (b.id === 'clocktower') item('crystal', 1);
  G.ritual = 1;
  const duty = {
    noble: '父は宝物庫の鍵をあなたに渡した。「我が家の悲願を果たせ。そのための十八年だった」',
    fallen: '母は古い工房の鍵を差し出した。「無理はしないで。……でも、あなたならきっと」<br>蔵の奥で埃をかぶっていた召喚陣の図面を、あなたはずっと前から覚えていた。',
    clocktower: '時計塔から正式な辞令が届いた。「深見の聖杯戦争に参加し、その実態を報告せよ」<br>母の故郷に戻るのは、何年ぶりだろう。',
    shrine: `父は静かに言った。「天降の霊脈は、六十年ぶりに目を覚まそうとしている。神社の者として、見届けなさい」<br>${CAST.miko}が、不安そうにあなたの袖を掴んでいた。`,
  }[b.id] || '';
  next(`${ADULT_AGE}歳の冬`, paras([
    `十八年が過ぎた。${b.text}`, G.summary,
    'その冬、右手の甲に三画の紋様が浮かび上がった。聖杯に選ばれたマスターの証――<b>令呪</b>。<br>驚きはなかった。この日が来ることを、あなたはずっと前から知っていた。',
    duty, catalystLine(),
    `<span class="note">【継承者】召喚の夜まで${PREP_DAYS}日。家に伝わる知識のおかげで、召喚陣の準備が一段階進んでいる。</span>`,
  ]), beginPrep, '準備を始める', 'PROLOGUE');
}

// ---- 請負人：依頼・命令として ----
function missionPrologue() {
  const b = birthOf();
  let lines;
  if (b.id === 'mercenary') {
    money(6); item('gem', 1); item('smoke', 1); G.flags.earlyIntel = true;
    const c = Math.random() < 0.5 ? giveCatalyst() : null;
    lines = ['十八歳になったあなたは、養父の跡を継いで「仕事」を請け負うようになっていた。',
      'その冬、一本の依頼が舞い込む。依頼人は深見の旧家の使いを名乗る男だった。「聖杯戦争に参加し、聖杯を我が主のもとへ。報酬は言い値で払う」',
      '前金と、敵情の資料と、いくつかの道具が手渡された。' + (c ? `資料の束の中には、英霊召喚の触媒<b>${c}</b>まで入っていた。` : ''),
      '依頼を受けた夜、右手の甲に令呪が浮かんだ。……どうやら、最初から仕組まれていたらしい。'];
  } else {
    G.flags.registered = true; G.flags.grailHint = true; item('potion', 1); lore(1);
    lines = [`十八歳の冬。代行者の訓練を終えたあなたに、聖堂教会から命令が下った。`,
      '「深見市の聖杯戦争に、教会側のマスターとして参加せよ。聖杯が危険なものであれば――破壊せよ」',
      `命令書を手渡す${CAST.sister}の手は、かすかに震えていた。「監督役の私には、あなたを贔屓することはできません。……生きて、帰ってきなさい」`,
      'その夜、右手の甲に令呪が浮かんだ。'];
  }
  next(`${ADULT_AGE}歳の冬`, paras([...lines, G.summary, catalystLine(),
    `<span class="note">【請負人】召喚の夜まで${PREP_DAYS}日。${b.id === 'mercenary' ? '前金と道具、敵の情報を得た。' : '教会に登録済み。聖杯に関する機密の一端も知らされている。'}</span>`,
  ]), beginPrep, '準備を始める', 'PROLOGUE');
}

// ---- 探求者：自ら辿り着く ----
function seekerPrologue() {
  G.flags.grailHint = true;
  const found = [];
  if (G.flags.vision) found.push('幼い頃の熱の夢で見た英霊の姿');
  if (G.flags.awakened) found.push('自分の中に眠っていた魔術回路');
  if (G.flags.oldTrust) found.push(`${CAST.old}が語った「誰も知らない戦争」`);
  found.push('天降山から滲み出す黒い霧と、六十年ごとに繰り返される不可解な失踪事件');
  next(`${ADULT_AGE}歳の冬`, paras([
    `十八年が過ぎた。${birthOf().text}`, G.summary,
    `けれど、あなたは「普通」では終わらなかった。<br>${found.join('、<br>')}――。`,
    '点と点を繋ぎ続けた先に、ついに一つの言葉に辿り着いた。<b>聖杯戦争</b>。万能の願望機を巡り、七人の魔術師と七騎の英霊が殺し合う儀式。それが、この冬、この街で始まる。',
    '図書館の閉館を告げるチャイムが鳴った時、右手の甲に焼けるような痛みが走った。<br>三画の紋様。まるで、あなたの決意に聖杯が応えたかのように。',
    catalystLine(),
    `<span class="note">【探求者】召喚の夜まで${PREP_DAYS}日。召喚の方法を、誰かに学ばなければならない。</span>`,
  ]), beginPrep, '覚悟を決める', 'PROLOGUE');
}

// ---- 背を向けた者：拒むか、受け入れるか ----
function reluctantPrologue() {
  const b = birthOf();
  const who = { noble: '父', fallen: '母', clocktower: '時計塔の使者', shrine: '父', mercenary: '養父の昔の仲間' }[b.id] || '家の者';
  scene({ title: `${ADULT_AGE}歳の冬`, sub: 'PROLOGUE', reveal: true, body: paras([
    '魔術から離れて、普通の大学生として暮らし始めた最初の冬。', G.summary,
    '右手の甲に、三画の紋様が浮かび上がった。<b>令呪</b>。<br>――よりによって、今になって。',
    `その夜、${who}が訪ねてきた。「逃げられると思ったのか。お前の血は、聖杯に選ばれたんだ」`,
  ]), choices: [
    { label: '運命を受け入れる', hint: '準備期間あり（継承者として参戦）', icon: 'ritual', fn: () => {
      NOTES = []; tone('law'); G.route = birthOf().id === 'mercenary' ? 'mission' : 'heir'; G.flags.wasReluctant = true;
      next('受け入れる', paras(['あなたは長く息を吐き、頷いた。「……分かった。やるよ。ただし、自分のやり方で」', catalystLine(),
        `<span class="note">召喚の夜まで${PREP_DAYS}日。</span>`, ...takeNotes()]), beginPrep, '準備を始める');
    } },
    { label: '拒んで、日常に戻る', hint: '準備なし（いずれ巻き込まれる）', icon: 'flee', fn: () => {
      NOTES = []; tone('chaos'); G.flags.refused = true;
      next('拒絶', paras([`「帰ってくれ。もう関わらないと決めたんだ」<br>${who}は冷たく笑って去っていった。「すぐに分かるさ。令呪を持つ者に、日常など残っていないことが」`, ...takeNotes()]),
        () => caughtPrologue(true));
    } },
  ] });
}

// ---- 巻き込まれた者：ある夜、突然 ----
function caughtPrologue(reluctant) {
  G.route = 'caught';
  const f = G.friend ? friendName() : null;
  scene({ title: 'ありふれた冬の日', sub: 'PROLOGUE', reveal: true, body: paras([
    reluctant ? '数日が過ぎた。令呪の痣は手袋の下で疼き続けていたが、あなたはそれを見ないふりをして暮らした。'
      : `十八年が過ぎた。${birthOf().text}`,
    reluctant ? '' : G.summary,
    reluctant ? '' : '右手の甲に、いつの間にか赤い痣ができていた。どこかにぶつけたのだろう、と思った。',
    '雪のちらつく、何でもない冬の日。今日の帰り道は――',
  ]), choices: [
    { label: f ? `${f}と寄り道して帰る` : '友達と寄り道して帰る', hint: '交渉↑', icon: 'bond', fn: () => { friend(5); gain('cha', 2); caughtNight('friend'); } },
    { label: 'バイトの遅番に入る', hint: '資金↑', icon: 'train', fn: () => { money(2); caughtNight('work'); } },
    { label: '近道の港を通って早く帰る', hint: '幸運↑', icon: 'walk', fn: () => { gain('luk', 2); caughtNight('port'); } },
  ] });
}
function caughtNight(how) {
  G.slot = 1;
  setupRivals();   // この時点で他の陣営はすでに動いている
  const r = G.storyRival = G.rivals.filter(x => !x.friend).reduce((a, b) => a.aggr >= b.aggr ? a : b);
  r.intel = 1;
  const intro = {
    friend: `${G.friend ? friendName() : '友達'}と別れた後、近道しようと城跡公園を横切った。`,
    work: '閉店作業を終えて、深夜の駅前を一人で歩いていた。',
    port: '港の倉庫街を抜ける近道。いつもなら、誰もいないはずの場所だ。',
  }[how];
  next('目撃', paras([
    intro,
    '金属同士がぶつかる甲高い音。闇の中で、人ではあり得ない速さの影が二つ、火花を散らしてぶつかり合っていた。',
    '――逃げなければ。そう思った瞬間、片方の影がこちらを見た。',
    `<p class="quote">「見られたか。……悪いが、目撃者は消す決まりでね」</p>`,
    `${r.type}らしき人物の声。次の瞬間、<b>${r.cls}</b>の刃が、あなたの胸元に迫っていた。`,
    '右手が焼けるように熱い。痣だと思っていた紋様が、紅く輝いて――',
  ]), caughtSummon, '手を伸ばす', 'PROLOGUE');
}
// 召喚陣も詠唱もない、緊急の召喚
function caughtSummon() {
  let id = null;
  if (G.catalysts.length) id = G.catalysts[0];
  addLog(`${ADULT_AGE}歳の冬、聖杯戦争に巻き込まれる。`);
  doSummon(id, { emergency: true });
}

// ---- 元・人類最後のマスター：招待状 ----
function fujimaruPrologue() {
  item('potion', 1);
  next('11月', paras([
    '七ヶ月が過ぎた。大学の講義、アルバイト、新しい友人たち。ありふれた日々は、驚くほど穏やかに流れていった。', G.summary,
    'その朝、右手の甲に焼けるような痛みが走った。<br>浮かび上がったのは、三画の紋様。かつて見慣れた、けれど少しだけ形の違う――<b>聖杯戦争の令呪</b>。',
    '郵便受けには、封蝋で閉じられた一通の手紙が届いていた。差出人の名は『蒐集者』。<br>「人類最後のマスター殿。深見の聖杯戦争にご招待いたします」',
    '「……また、か」<br>苦笑して、手紙を握りしめる。日常に帰ってきても、どうやら自分は、こういう運命らしい。',
    catalystLine(),
    `<span class="note">【特殊シナリオ】召喚の夜まで${PREP_DAYS}日。英霊召喚の制限はすべて解除されている。召喚の際には英霊を指名することもできる。</span>`,
  ]), beginPrep, '準備を始める', 'PROLOGUE');
}

// =============================================================
//  data_enforcer.js … 封印指定執行者の襲来
//
//  魔術の系統を奥義（研鑽Lv5）まで極めると、その魔術は魔術協会に「封印指定」の対象として目を付けられる。
//  稀少な魔術を持つ魔術師を、その魔術ごと「標本」として保存するための制度だ。
//   1. 警告（翌日の昼）：協会の動きを知らせる者が現れる。どう備えるかを選ぶ
//   2. 襲来（その二日後の夜）：封印指定執行者との戦い。執行者はサーヴァントではなく、マスターを直接狙ってくる
//        マスターのHPが尽きると「封印」――標本として連れ去られる（エンディング）
//   3. 決着：執行者をどうするか（見逃す・協会への伝言・とどめを刺す）。結末にも影響する
//  衛宮士郎は「無限の剣製」を修めた時点で対象になる（原作でも封印指定に値する魔術）。
//  執行者は3人の中から、プレイごとに1人が現れる。
// =============================================================

const ENFORCERS = [
  { id: 'enf_chain', name: 'ヘルガ・ノイマン', short: '鎖の執行者', cls: '封印指定執行者', p: ['B', 'B', 'B', 'C', 'C', 'A'], align: '秩序・中庸', persona: 'cool',
    np: '封縛の鎖・千重', npRuby: 'フェッセルン・タウゼント', catalyst: null, epithet: '鎖の執行者',
    desc: '時計塔の執行者。ルーンを刻んだ千の鎖で、対象を魔術ごと縛り上げる。私情を挟まず、任務を淡々とこなす。',
    look: '黒い外套の女。両腕に、ルーンを刻んだ鈍色の鎖が幾重にも巻き付いている。',
    quote: '貴方の魔術は、人類の財産として保存されるべきです。……抵抗は推奨しません。痛みが増えるだけですから。',
    defeat: '「……任務、失敗。次は、もっと上手くやります」' },
  { id: 'enf_specimen', name: 'ラザロ・ヴェイン', short: '標本師', cls: '封印指定執行者', p: ['C', 'B', 'C', 'A', 'B', 'A'], align: '混沌・中庸', persona: 'scholar',
    np: '永久保存の檻', npRuby: 'エターナル・ホルマリン', catalyst: null, epithet: '標本師',
    desc: '封印指定の対象を「生きたまま、永遠に美しく」保存することに執着する魔術師。防腐と結晶化の魔術を操る。',
    look: '白衣の痩せた男。ガラスの小瓶をいくつも腰に提げ、うっとりとこちらを眺めている。',
    quote: 'ああ、なんと見事な術式だ……。安心したまえ、君は永遠に、その美しさのまま保存される。私の標本棚でね。',
    defeat: '「惜しい……実に惜しい。だが、標本は逃げない。またいずれ」' },
  { id: 'enf_hound', name: 'ユーリ・コーベル', short: '灰色の猟犬', cls: '封印指定執行者', p: ['B', 'C', 'A', 'C', 'B', 'A'], align: '中立・悪', persona: 'dark',
    np: '猟犬の魔弾', npRuby: 'グレイハウンド・バレット', catalyst: null, epithet: '灰色の猟犬',
    desc: '魔術を「道具」と割り切る魔術使いの執行者。銃と礼装を使い分け、獲物を確実に仕留める。',
    look: '灰色のコートの男。煙草をくわえ、両手には礼装を仕込んだ拳銃。',
    quote: '悪いな。恨みはねえが、仕事なんでね。……サーヴァントの相手はしねえ。狙うのは、あんた一人だ。',
    defeat: '「……ちっ、割に合わねえ仕事だ。報酬上乗せしてもらうぜ、協会さんよ」' },
];
// 執行者のスキル（data_skills.js の書式）
Object.assign(SKILL_DATA, {
  enf_chain: '対魔力B,気配遮断C|封印術:A:charm,ルーンの鎖:A:def,執行者の矜持:A:guts',
  enf_specimen: '対魔力A,陣地作成B|防腐の魔術:A:debuff,結晶化:A:charm,標本への執着:B:heal',
  enf_hound: '対魔力C,気配遮断A|早撃ち:A:agi,魔弾の装填:A:np,修羅場慣れ:A:guts',
});

function enforcer() { return ENFORCERS.find(e => e.id === (G.enf && G.enf.who)) || ENFORCERS[0]; }
// 奥義まで極めたか（士郎は「無限の剣製」）
function hasOugi() {
  if (isShirou()) return !!G.flags.ubwMastered;
  return !!G.magic && schoolIds().some(id => masteryLv(id) >= 5);
}
function ougiName() {
  if (isShirou()) return '無限の剣製';
  const id = schoolIds().find(x => masteryLv(x) >= 5); return id ? `${SCHOOLS[id].name}の奥義「${SCHOOLS[id].tech[2]}」` : '魔術';
}

// コマの始まりに呼ばれる（core.js の startSlot）
function enforcerCheck() {
  if (G.phase !== 'war' || G.day >= FINAL_DAY || !G.servant) return null;
  const e = G.enf;
  if (!e && hasOugi() && G.day >= 2 && G.slot === 0) return enforcerWarning;
  if (e && e.stage === 'warned' && G.day >= e.day + 2 && G.slot === 1) return enforcerArrival;
  return null;
}

// ---- 1. 警告 ----
function enforcerWarning() {
  G.enf = { stage: 'warned', day: G.day, who: pick(ENFORCERS).id, weak: 0, prep: 0 };
  const who = enforcer(); const ougi = ougiName();
  const intro = isShirou() ? `携帯が鳴った。遠坂だ。声が、いつになく険しい。<br>「士郎。……あんたの投影、協会にバレたわよ。<b>封印指定</b>の審議が始まってる。執行者が、もう日本に入ったって」`
    : isFuji() ? `時計塔の監視官が、血相を変えて訪ねてきた。<br>「藤丸立香。あなたの礼装の運用記録が、協会の上層部の目に留まりました。……<b>封印指定</b>の執行者が、こちらに向かっています」`
      : isKishi() ? `頭の奥に、月からの警告が響いた。<br>「――警告。魔術協会が、あなたのコードを『月の遺物』と認定。<b>封印指定</b>の執行者が、深見市に接近中」`
        : `郵便受けに、封蝋で閉じられた一通の封書が入っていた。差出人は、ロンドン――魔術協会・時計塔。<br>「貴殿の修めた<b>${ougi}</b>は、稀少かつ再現不能な神秘と認定された。よって、<b>封印指定</b>の対象とする」`;
  const choices = [
    { label: '拠点の守りを固める', hint: '陣地Lv+1・罠+1', run: () => { G.workshop = Math.min(5, G.workshop + 1); G.traps = Math.min(3, G.traps + 1); G.enf.prep++;
        return `結界を張り直し、罠を仕掛けた。いつ来ても、迎え撃てるように。（陣地Lv${G.workshop} 罠${G.traps}）`; } },
    { label: () => `${SVname()}と、執行者への対策を練る`, hint: '絆↑・執行者の手の内を読む', run: () => { bond(4); G.enf.weak += 1; G.enf.known = true;
        return [`${SV()}と、封印指定執行者という存在について話し合った。サーヴァントではなく、人間の魔術師。――狙われるのは、${SV()}ではなく、あなた自身だ。`,
          `<span class="note">執行者は、戦闘中にマスターを直接狙ってくる。マスターのHPが尽きれば、封印される。（絆+4・執行者が少し弱まる）</span>`]; } },
  ];
  if (isShirou()) choices.push({ label: '遠坂に、力を貸してくれと頼む', hint: '宝石+2・執行者が弱まる', run: () => { item('gem', 2); G.enf.weak += 2; hero('rin', 6);
    return '「……っ、仕方ないわね！ 協会への抗議文は、遠坂家の名前で出しておくわ。それと、これ。使いなさい」宝石が二つ、速達で届いた。（魔力を込めた宝石+2）'; } });
  else if (isFuji() && G.flags.watcherAlly) choices.push({ label: '監視官に、協会へ掛け合ってもらう', hint: '執行者が大きく弱まる', run: () => { G.enf.weak += 3;
    return '「……借りを返す時ですね」監視官は、執行者の装備と情報を流してくれた。執行者は、万全の態勢では来られないだろう。'; } });
  else if (isKishi()) choices.push({ label: 'ムーンセルで、執行者を解析する', hint: '知力判定・執行者が大きく弱まる', run: () => { const c = chk('int', 50);
    if (c.ok) { G.enf.weak += 3; return [c.text, `ムーンセルの演算が、執行者――${who.name}の戦闘データを洗い出した。手の内は、すべて読めている。`]; }
    G.enf.weak += 1; return [c.text, '解析は途中で途切れた。それでも、いくつかの癖は掴めた。']; } });
  if (G.flags.registered) choices.push({ label: `${CAST.sister}に、教会の仲裁を頼む`, hint: '交渉判定・執行者が弱まる', run: () => { const c = chk('cha', 55);
    if (c.ok) { G.enf.weak += 2; return [c.text, `「聖杯戦争の最中に、参加者への干渉は認められません」${CAST.sister}は協会に正式な抗議を送ってくれた。執行者は、制約を背負って動くことになる。`]; }
    return [c.text, '「……教会の立場では、協会の決定に口を出せません。申し訳ありません」']; } });
  if (['noble', 'fallen', 'clocktower'].includes(G.master.birth)) choices.push({ label: '家の伝手で、協会の内情を探る', hint: '宝石+1・執行者が弱まる', run: () => { item('gem', 1); G.enf.weak += 1;
    return `家の伝手を辿ると、送り込まれる執行者の名が分かった。<b>${who.name}</b>――「${who.epithet}」。（魔力を込めた宝石+1）`; } });
  choices.push({ label: '逃げも隠れもしない', hint: '精神↑・大胆', run: () => { tone('bold'); gain('spi', 4); return 'この魔術は、自分が積み上げてきたものだ。誰にも、標本になどさせない。（精神+4）'; } });
  showEvent({ id: 'enf_warning', title: '封印指定', chapter: '第二幕　侵蝕', text: () => intro +
    '<br><span class="note">封印指定――稀少な魔術を持つ魔術師を、その魔術ごと「保存」するための、魔術協会の制度。実際には、捕らえて幽閉するに等しい。執行者は、二日後の夜に来るだろう。</span>',
    choices }, startSlot);
}

// ---- 2. 襲来 ----
function enforcerArrival() {
  const who = enforcer(); G.enf.stage = 'arrived';
  const r = { id: 'enforcer', cls: '封印指定執行者', servantId: who.id, master: who.name, type: '封印指定執行者', quote: who.quote,
    power: 12 - G.enf.weak, aggr: 1, alive: true, hp: 240 - G.enf.weak * 18, hpMax: 240 - G.enf.weak * 18, mp: 70, intel: 3, clues: 0, seals: 0, ally: false, named: true };
  G.enf.rival = r;
  next('封印指定執行者', paras([
    '夜。拠点の結界が、音もなく<b>切り裂かれた</b>。サーヴァントの気配ではない。――人間の、魔術師だ。',
    `${who.look}`,
    `<p class="quote">「${who.quote}」</p>`,
    `「封印指定執行者、${who.name}。――『${who.epithet}』と呼ばれている」`,
    `${SV()}が、あなたの前に立った。${say('stayBack')}`,
    `<span class="note">執行者は、戦闘中に<b>マスターを直接狙ってくる</b>。マスターのHPが尽きれば、封印される（エンディング）。撤退はできない。${G.enf.weak ? `<br>警告の日の備えが効いている。（執行者が弱まっている：強さ-${G.enf.weak}）` : ''}</span>`,
  ]), () => startBattle(r, { enforcer: true, defend: true }), '迎え撃つ', 'ENFORCER');
}
// 執行者の一撃：マスターを狙う（手番の終わりに）
function enforcerStrike(log) {
  if (!B || !B.enforcer || B.r.hp <= 0) return;
  const np = B.enfNp; B.enfNp = false;
  if (!np && Math.random() > 0.5) return;
  const who = enforcer();
  if (B.evade.me > 0 && !np) { B.evade.me--; log.push('<span class="note">執行者の狙いを、間一髪でかわした！</span>'); return; }
  const def = buffSum('me', 'def');
  const d = Math.max(4, (np ? 28 : rand(10, 18)) - Math.round(def / 2) - Math.round(G.master.stats.phy / 20));
  hp(-d);
  log.push(np ? `<b>${who.short}の切り札が、${SV()}をすり抜けてあなたに届いた！</b>（あなたのHP-${d}）`
    : pick([`${who.short}の攻撃が、${SV()}の脇をすり抜けてあなたを狙った！（あなたのHP-${d}）`, `「本命はあんただ」――${who.short}の一撃が、あなたを捉えた！（あなたのHP-${d}）`]));
}
// ---- 3. 決着 ----
function enforcerWin() {
  const who = enforcer(); G.enf.stage = 'defeated'; B = null;
  addLog(`封印指定執行者「${who.name}」を退ける。`);
  scene({ title: '執行者の敗北', sub: 'ENFORCER', reveal: true, body: paras([
    `${who.name}が、膝をついた。${who.defeat}`,
    '執行者は、もう戦える状態ではない。――どうする？',
  ]), choices: [
    { label: '命までは取らない', hint: '善・協会との関係が和らぐ', fn: () => { NOTES = []; tone('good'); G.enf.fate = 'spared'; gain('cha', 3);
      next('決着', paras([`「……甘い人ですね」${who.short}は、それでも、ほんの少しだけ表情を緩めた。「報告書には、『対象の魔術は封印に値せず』と書いておきます。……貸しにしておいてください」`,
        '（交渉+3・封印指定は保留になる見込み）', ...takeNotes()]), advance); } },
    { label: '「協会に伝えろ。二度と来るな」', hint: '大胆・戦利品', fn: () => { NOTES = []; tone('bold'); G.enf.fate = 'warned'; item('gem', 2); item('crystal', 1);
      next('決着', paras([`${who.short}は、黙って装備の一部を置いていった。「……伝えましょう。ただし、協会が聞き入れるかは保証しない」`,
        '（魔力を込めた宝石+2 魔力結晶+1）', ...takeNotes()]), advance); } },
    { label: 'とどめを刺す', hint: '悪・後々に禍根を残す', cls: 'danger', fn: () => { NOTES = []; tone('evil'); G.enf.fate = 'killed'; gain('mag', 3);
      next('決着', paras([`${SV()}が、何も言わずに視線を逸らした。……執行者は、二度と立ち上がらなかった。`,
        '残された礼装から、わずかな魔力を取り込んだ。（魔力+3）<br><span class="note">協会は、このことを忘れないだろう。</span>', ...takeNotes()]), advance); } },
  ] });
}
// エンディングに添える一文
function enforcerEpilogue(kind) {
  if (!G.enf || kind === 'dead' || kind === 'sealed') return '';
  const who = enforcer();
  if (G.enf.stage === 'warned') return '<p class="note">封印指定の執行者は、ついに現れなかった。聖杯戦争の終結と共に、協会は審議を「保留」としたらしい。</p>';
  return { spared: `<p class="note">後日、時計塔から一通の通知が届いた。「封印指定、取り消し」――末尾には、${who.name}の署名があった。</p>`,
    warned: '<p class="note">協会は、あなたの魔術を「監視対象」に留めた。執行者は、二度と来なかった。……少なくとも、今のところは。</p>',
    killed: '<p class="note">協会は、執行者の死を忘れなかった。それからの人生、あなたは時折、背後に冷たい視線を感じることになる。</p>' }[G.enf.fate] || '';
}

// =============================================================
//  data_magecraft.js … マスターの「魔術」（魔術師としてのロールプレイ）
//
//  ・マスターの魔力（能力値）が 30 / 50 / 70 / 90 を超えるたびに、魔術を習得する出来事が起きる
//    （生い立ちの途中でも、聖杯戦争の最中でも）。3つの候補から1つを選んで身につける
//  ・候補は、産まれた家の魔術系統に寄る（名門なら宝石魔術、教会なら黒鍵や洗礼詠唱、神社なら祝詞 など）
//  ・習得した魔術は、戦闘の「マスターの行動」として使える（オドを消費）
//  ・藤丸シナリオでは「魔術礼装」、岸波シナリオでは「コードキャスト」として習得する
//  ・衛宮士郎は、投影と強化（士郎の行動）が自分の魔術なので、この出来事は起きない
// =============================================================

const SPELL_TH = [30, 50, 70, 90];   // 習得の目安になる魔力の値
const SPELL_TIER_NAME = ['', '魔術の目覚め', '魔術の深化', '秘奥への階梯', '魔術の極み'];

// 効果の書き方：cast(log, E) は戦闘中に呼ばれ、その手番のサーヴァントへの補正を返す
const dmgEn = (d, log, text) => { B.r.hp -= d; log.push(`${text}（${d}ダメージ）`); B.fxq.push({ type: 'hit', side: 'en', dmg: d }); };
const buff = (side, code, v, turns = 3) => B.buf[side].push({ code, v, turns });
const tryStun = (p, log, E) => {
  const res = classSkillV(servantOf(B.r), '対魔力') * 5;
  if (Math.random() * 100 < res) { log.push(`<span class="note">${E}の対魔力が、術を弾いた。</span>`); return; }
  if (Math.random() < p) { B.stun.en = true; log.push(`<span class="note">${E}の動きが止まった！</span>`); } else log.push(`<span class="note">${E}は術を振り払った。</span>`);
};
const magV = () => G.master.stats.mag;

const SPELLS = {
  // ================= 通常（魔術師） =================
  gandr:   { pool: 'normal', tier: 1, school: '北欧の呪い', name: 'ガンド', od: 10, hint: '敵の判定-8（2手番）・小ダメージ', bias: ['noble', 'fallen', 'clocktower'],
    learn: '指先に呪いを凝らし、撃ち出す。北欧に伝わる、体調を崩させる「指差しの呪い」。熟達すれば、物理的な威力すら帯びる。',
    cast: (log, E) => { buff('me', 'debuff', 8, 2); dmgEn(5 + Math.round(magV() / 20), log, `指先から放たれた呪いの弾丸が、${E}を撃った！`); return 0; } },
  familiar: { pool: 'normal', tier: 1, school: '使い魔', name: '使い魔の目', od: 8, hint: '敵の次の手を読む・次の攻撃+6', bias: ['civilian', 'clocktower'],
    learn: '小鳥や鼠に魔力の糸を通し、その目と耳を借りる。魔術師の最も基本的な技術の一つ。',
    cast: (log, E) => { B.sure = true; log.push(`戦場の上を飛ぶ使い魔の目が、${E}の重心の移動を捉えた。`); return 6; } },
  barrier: { pool: 'normal', tier: 1, school: '結界魔術', name: '簡易結界', od: 12, hint: '3手番、受けるダメージ-8', bias: ['shrine', 'noble'],
    learn: '空間に境界を引き、内と外を分ける。結界は、魔術師が身を守るための最初の砦だ。',
    cast: (log) => { buff('me', 'def', 8); log.push('足元に描いた境界線が淡く光り、見えない壁が立ち上がった。'); return 0; } },
  blackkey: { pool: 'normal', tier: 1, school: '代行者の技', name: '黒鍵', od: 10, hint: '投擲で中ダメージ（死徒・魔性に強い）', bias: ['executor'],
    learn: '聖書の頁を刀身に変える、教会の代行者の投擲剣。本来は霊体を縫い留めるための概念武装だ。',
    cast: (log, E) => { dmgEn(10 + Math.round(magV() / 10) + (B.boss ? 6 : 0), log, `指の間に挟んだ黒鍵を、三本同時に投げ放つ。刃が${E}を縫い留めた！`); return 0; } },
  norito:  { pool: 'normal', tier: 1, school: '神道', name: '祝詞', od: 12, hint: '英霊のHP+20・敵の弱体を祓う', bias: ['shrine'],
    learn: '天降神社に伝わる祝詞。言葉に宿る力で、穢れを祓い、傷を癒やす。',
    cast: (log) => { shp(20); B.buf.en = B.buf.en.filter(b => b.code !== 'debuff'); log.push('祝詞を奏上する。清らかな気が満ち、穢れが祓われていく。（英霊HP+20）'); return 0; } },
  rune:    { pool: 'normal', tier: 1, school: 'ルーン魔術', name: 'ルーン刻印', od: 12, hint: '3手番、英霊の攻撃+7', bias: ['mercenary', 'clocktower'],
    learn: '北欧の原初の文字を刻み、その意味を力に変える。武具に刻めば、刃は鋭く、守りは固くなる。',
    cast: (log) => { buff('me', 'atk', 7); log.push('英霊の武具に、勝利のルーン「テイワズ」を刻んだ。'); return 0; } },
  jewel:   { pool: 'normal', tier: 2, school: '宝石魔術', name: '宝石魔術・転換', od: 20, hint: '大ダメージ＋英霊+10', bias: ['noble', 'fallen'],
    learn: '長い時間をかけて宝石に溜め込んだ魔力を、一瞬で解き放つ。家に伝わる、贅沢で強力な魔術。',
    cast: (log, E) => { dmgEn(14 + Math.round(magV() / 8), log, `宝石を砕く。溜め込まれた魔力が奔流となり、${E}を呑み込んだ！`); return 10; } },
  healing: { pool: 'normal', tier: 2, school: '治癒魔術', name: '高等治癒', od: 18, hint: '英霊のHP+40', bias: ['executor', 'civilian', 'shrine'],
    learn: '肉体の設計図を読み取り、あるべき姿へと戻す高等な治癒。英霊の霊基にすら届く。',
    cast: (log) => { shp(40); log.push('両手から溢れた光が、英霊の傷を深くまで塞いでいく。（英霊HP+40）'); return 0; } },
  alchemy: { pool: 'normal', tier: 2, school: '錬金術', name: '針金の使い魔', od: 18, hint: '中ダメージ・5割で敵の動きを封じる', bias: ['clocktower', 'noble'],
    learn: '髪や針金に魔力を通し、自在に動く鳥や剣に変える。アインツベルンの流れを汲む錬金術。',
    cast: (log, E) => { dmgEn(10 + Math.round(magV() / 12), log, `銀の針金が鳥の形に編まれ、${E}に襲いかかる！`); tryStun(0.5, log, E); return 0; } },
  eyes:    { pool: 'normal', tier: 2, school: '魔眼', name: '束縛の魔眼', od: 18, hint: '7割で敵の動きを封じる', bias: ['fallen', 'mercenary'],
    learn: '眼球そのものが魔術回路となる、生まれついての異能。見るだけで、相手の動きを縛る。',
    cast: (log, E) => { log.push(`まっすぐに${E}を見据える。瞳の奥に、魔力の光が灯った。`); tryStun(0.7, log, E); return 0; } },
  baptism: { pool: 'normal', tier: 2, school: '洗礼詠唱', name: '洗礼詠唱', od: 20, hint: '中ダメージ（呪い・人類悪には倍）', bias: ['executor'],
    learn: '聖書の言葉をそのまま武器とする、教会の秘蹟。不浄のものに対しては、絶大な力を持つ。',
    cast: (log, E) => { dmgEn((12 + Math.round(magV() / 10)) * (B.boss ? 2 : 1), log, `「――主の御名において」祝福された言葉が、白い光となって${E}を灼いた！`); return 0; } },
  swap:    { pool: 'normal', tier: 2, school: '置換魔術', name: '置換', od: 15, hint: '次の攻撃を1回無効＋英霊+6', bias: ['noble', 'clocktower'],
    learn: '物と物の位置や性質を入れ替える、地味だが応用の利く系統。英霊への一撃を、別の何かに肩代わりさせる。',
    cast: (log) => { B.evade.me++; log.push('足元の石と英霊の「受ける傷」を、そっと置き換えておいた。'); return 6; } },
  mercury: { pool: 'normal', tier: 3, school: '流体操作', name: '月霊髄液', ruby: 'ヴォールメン・ハイドラグラム', od: 25, hint: '3手番、受けるダメージ-14・次の攻撃を1回無効', bias: ['noble', 'clocktower'],
    learn: '魔力を通した水銀を、自在に操る礼装。盾にも、刃にも、索敵の目にもなる。名門の天才が生み出した傑作。',
    cast: (log) => { buff('me', 'def', 14); B.evade.me++; log.push('「――月霊髄液（ヴォールメン・ハイドラグラム）」銀の水銀が渦を巻き、英霊を包む盾となった。'); return 0; } },
  timealter: { pool: 'normal', tier: 3, school: '時間操作', name: '固有時制御', ruby: 'タイムアルター', od: 25, hint: '英霊+20・次の攻撃を1回無効', bias: ['mercenary'],
    learn: '自分の体内の時間だけを加速、あるいは減速させる。時間操作の一族の秘術を、戦うための技に削ぎ落としたもの。',
    cast: (log) => { B.evade.me++; hp(-5); log.push('「固有時制御（タイムアルター）――二倍速（ダブルアクセル）」体内の時間が加速する。英霊への援護が、一瞬早く届いた。（HP-5）'); return 20; } },
  astral:  { pool: 'normal', tier: 3, school: '天体魔術', name: '星読み', od: 25, hint: '3手番、英霊の攻撃+10・会心率+15%', bias: ['clocktower', 'noble'],
    learn: '星の運行から未来の揺らぎを読む、時計塔でも古い系統。戦場では、勝機の流れを示してくれる。',
    cast: (log) => { buff('me', 'atk', 10); buff('me', 'crit', 15); log.push('夜空の星の配置を読む。――勝機は、今ここにある。'); return 0; } },
  greatrune: { pool: 'normal', tier: 3, school: 'ルーン魔術', name: '原初のルーン', od: 25, hint: '3手番、敵の判定-12・受けるダメージ-8', bias: ['mercenary', 'shrine'],
    learn: '神代に近いルーン。文字一つで、世界の理そのものに干渉する。',
    cast: (log, E) => { buff('me', 'debuff', 12); buff('me', 'def', 8); log.push(`空中に刻んだルーンが、${E}の足元に呪縛の円を描いた。`); return 0; } },
  kagura:  { pool: 'normal', tier: 3, school: '神道', name: '神楽舞', od: 25, hint: '英霊のHP+30・3手番、攻撃+8', bias: ['shrine'],
    learn: '天降山の神に捧げる舞。舞い手の体を通して、山の神の力の一端が降りてくる。',
    cast: (log) => { shp(30); buff('me', 'atk', 8); log.push('鈴を鳴らし、舞う。天降山の霊脈が応え、英霊に神気が宿った。（英霊HP+30）'); return 0; } },
  jewelstorm: { pool: 'normal', tier: 4, school: '宝石魔術', name: '五大元素の奔流', od: 35, hint: '特大ダメージ＋英霊+12', bias: ['noble', 'fallen'],
    learn: '五つの属性すべてを宝石に宿し、同時に解き放つ。「五大元素使い（アベレージ・ワン）」にのみ許される大魔術。',
    cast: (log, E) => { dmgEn(26 + Math.round(magV() / 6), log, `五つの宝石が、地水火風空の光となって${E}に降り注いだ！`); return 12; } },
  crest:   { pool: 'normal', tier: 4, school: '魔術刻印', name: '魔術刻印・全開放', od: 35, hint: '英霊+30', bias: ['noble', 'fallen', 'clocktower'],
    learn: '先祖代々受け継いできた魔術刻印。そのすべてを一度に起動し、英霊に注ぎ込む。',
    cast: (log) => { hp(-10); log.push('腕の魔術刻印が焼けるように輝く。何代にもわたる研鑽のすべてが、英霊の一撃を後押しした。（HP-10）'); return 30; } },
  supply:  { pool: 'normal', tier: 4, school: '魔力供給', name: '大規模魔力供給', od: 30, hint: '英霊の魔力+60・HP+30', bias: [],
    learn: '自分の魔術回路すべてを、英霊とのパスに直結する。マスターとしての、究極の後方支援。',
    cast: (log) => { mp(60); shp(30); log.push('全身の魔術回路が唸りを上げる。膨大な魔力が、パスを通じて英霊へ流れ込んだ。（英霊の魔力+60 HP+30）'); return 0; } },
  origin:  { pool: 'normal', tier: 4, school: '起源', name: '起源覚醒', od: 35, hint: '英霊+18・3手番、防御を貫く', bias: [],
    learn: '自分という存在の始まり――「起源」に触れ、その在り方を魔術として発露させる。',
    cast: (log) => { buff('me', 'pierce', 10); log.push('魂の奥底にある「起源」が、魔力となって溢れ出した。'); return 18; } },

  // ================= 藤丸：魔術礼装 =================
  f_aid:    { pool: 'fuji', tier: 1, school: '魔術礼装', name: '応急手当', od: 10, hint: '英霊のHP+25', learn: '旧友から届いた礼装の最初の機能。カルデアで何度も使った、懐かしい術式。',
    cast: (log) => { shp(25); log.push('礼装が淡く光る。「応急手当」――旅の間、何度もこうしてきた。（英霊HP+25）'); return 0; } },
  f_boost:  { pool: 'fuji', tier: 1, school: '魔術礼装', name: '瞬間強化', od: 12, hint: '英霊+14', learn: '英霊の力を、ほんの一瞬だけ引き上げる。タイミングを読むのは、マスターの腕の見せ所だ。',
    cast: (log) => { log.push('「瞬間強化」――ここだ、というタイミングで、英霊の背中を押した。'); return 14; } },
  f_gandr:  { pool: 'fuji', tier: 2, school: '魔術礼装', name: 'ガンド', od: 18, hint: '7割で敵の動きを封じる', learn: '礼装に仕込まれた、北欧の呪い。旅の間、何度も英霊を救った「足止め」の一撃。',
    cast: (log, E) => { log.push(`指先から放ったガンドが、${E}に命中した。`); tryStun(0.7, log, E); return 0; } },
  f_evade:  { pool: 'fuji', tier: 2, school: '魔術礼装', name: '緊急回避', od: 15, hint: '次の攻撃を1回無効', learn: '英霊を、致命の一撃から一瞬だけ逃がす。何度この機能に命を救われたか分からない。',
    cast: (log) => { B.evade.me++; log.push('「緊急回避」――英霊の体が、攻撃の軌道からふっと外れた。'); return 0; } },
  f_order:  { pool: 'fuji', tier: 3, school: '魔術礼装', name: '全体強化', od: 25, hint: '3手番、攻撃+10・受けるダメージ-6', learn: '英霊の攻撃と守りを同時に底上げする、戦闘服の本領。',
    cast: (log) => { buff('me', 'atk', 10); buff('me', 'def', 6); log.push('礼装の回路が一斉に起動し、英霊の霊基全体を支えた。'); return 0; } },
  f_supply: { pool: 'fuji', tier: 3, school: '魔術礼装', name: '魔力供給', od: 22, hint: '英霊の魔力+50', learn: '霊子を英霊に直接流し込む。宝具の一撃を、ここぞという時に届かせるために。',
    cast: (log) => { mp(50); log.push('礼装を通じて、霊子が英霊へ流れ込む。（英霊の魔力+50）'); return 0; } },
  f_final:  { pool: 'fuji', tier: 4, school: '魔術礼装', name: '決戦の礼装', od: 35, hint: '英霊+25・HP+25', learn: '数々の特異点を越えた経験が、礼装の最後の機能を目覚めさせた。',
    cast: (log) => { shp(25); log.push('「――行こう。いつも通りに」礼装の全機能が、英霊の背中を押した。（英霊HP+25）'); return 25; } },

  // ================= 岸波：コードキャスト =================
  k_heal:   { pool: 'kishi', tier: 1, school: 'コードキャスト', name: 'heal(16)', od: 10, hint: '英霊のHP+25', learn: '月の聖杯戦争で使い慣れた、最も基本的な回復の術式。',
    cast: (log) => { shp(25); log.push('code: heal(16)――英霊の霊基データを修復した。（英霊HP+25）'); return 0; } },
  k_str:    { pool: 'kishi', tier: 1, school: 'コードキャスト', name: 'gain_str(16)', od: 12, hint: '3手番、白兵戦+12', learn: '英霊の筋力値に、一時的な補正をかける術式。',
    cast: (log) => { buff('me', 'str', 12); log.push('code: gain_str(16)――英霊の筋力値を引き上げた。'); return 0; } },
  k_view:   { pool: 'kishi', tier: 2, school: 'コードキャスト', name: 'view_status()', od: 12, hint: '敵の次の手を読む・次の攻撃+10', learn: '相手のステータスを解析する術式。戦略眼と組み合わせれば、もはや死角はない。',
    cast: (log, E) => { B.sure = true; log.push(`code: view_status()――${E}の行動パターンを解析した。`); return 10; } },
  k_shock:  { pool: 'kishi', tier: 2, school: 'コードキャスト', name: 'shock(64)', od: 18, hint: '7割で敵の動きを封じる', learn: '相手の霊基に電撃を流し、一手番だけ行動を止める術式。',
    cast: (log, E) => { log.push(`code: shock(64)――電撃が${E}を貫いた。`); tryStun(0.7, log, E); return 0; } },
  k_con:    { pool: 'kishi', tier: 3, school: 'コードキャスト', name: 'gain_con(32)', od: 22, hint: '3手番、受けるダメージ-14', learn: '英霊の耐久値を引き上げる上位の術式。',
    cast: (log) => { buff('me', 'def', 14); log.push('code: gain_con(32)――英霊の耐久値を補強した。'); return 0; } },
  k_move:   { pool: 'kishi', tier: 3, school: 'コードキャスト', name: 'move_speed()', od: 18, hint: '次の攻撃を1回無効・3手番、機動戦+10', learn: '英霊の敏捷を一時的に跳ね上げ、回避を可能にする術式。',
    cast: (log) => { B.evade.me++; buff('me', 'agi', 10); log.push('code: move_speed()――英霊の動きが、一段速くなった。'); return 0; } },
  k_king:   { pool: 'kishi', tier: 4, school: 'コードキャスト', name: 'code: 月の王権', od: 35, hint: '英霊+30', learn: 'ムーンセルの主にのみ許された、最上位の権限コード。',
    cast: (log) => { log.push('月の王の権限で、ムーンセルの演算資源を英霊に注ぎ込んだ。'); return 30; } },
};

// ---- 習得 ----
function spellPool() { return isFuji() ? 'fuji' : isKishi() ? 'kishi' : 'normal'; }
function spells() { if (!G.spells) G.spells = []; return G.spells; }
function canLearnMagic() {
  if (!G || isShirou()) return false;
  if (G.phase === 'growth') return hasMagic() || isFuji() || isKishi();
  return ['prep', 'war'].includes(G.phase);
}
// 次に習得できる段階（無ければ 0）
function pendingSpellTier() {
  if (!canLearnMagic()) return 0;
  const n = G.spellTier || 0;
  return n < SPELL_TH.length && G.master.stats.mag >= SPELL_TH[n] ? n + 1 : 0;
}
function spellChoices(tier) {
  const pool = Object.entries(SPELLS).filter(([id, s]) => s.pool === spellPool() && s.tier <= tier && !spells().includes(id));
  const b = G.master.birth;
  // 家の系統に合うもの、今の段階のものを優先して3つ
  const score = ([, s]) => (s.bias && s.bias.includes(b) ? 3 : 0) + (s.tier === tier ? 2 : 0) + Math.random() * 2;
  return pool.sort((x, y) => score(y) - score(x)).slice(0, 3);
}
// 誰から（どうやって）学ぶか
function spellMentor() {
  if (isFuji()) return '旧友から、新しい礼装の部品が届いた。説明書には、懐かしい筆跡でこう書いてあった。「使いこなせるようになったら、次の機能を解放してね」';
  if (isKishi()) return '月の玉座から持ち込んだコードの断片を、地上の理に合わせて組み直していく。';
  return { noble: '書斎に呼ばれた。当主の顔をした親が、古い魔術書を開いて言う。「そろそろ、次を教えてもいい頃だな」',
    fallen: '屋根裏の古い箱に、先祖の魔術書が眠っていた。色褪せた頁の術式が、今なら読める。',
    clocktower: '時計塔の講義室。講師が黒板に複雑な術式を描きながら、こちらを見た。「君なら、ついてこられるはずだ」',
    mercenary: '師匠が、焚き火の向こうで顎をしゃくった。「生き残りたけりゃ、もう一つ覚えておけ」',
    civilian: '独学で読み進めてきた魔術書の、次の頁が、ふいに「分かった」。体の中の回路が、新しい形を覚えたがっている。',
    executor: '教会の地下で、シスターが一冊の古い祈祷書を差し出した。「あなたにも、そろそろ必要になるでしょう」',
    shrine: '祖母が、神社の蔵の奥から古い巻物を取り出した。「これは、跡取りにしか伝えられん技じゃ」' }[G.master.birth] || '体の奥の魔術回路が、次の段階へ進もうとしている。';
}
function spellLearnScene(then) {
  const tier = pendingSpellTier(); if (!tier) return then();
  const opts = spellChoices(tier);
  G.spellTier = tier;
  if (!opts.length) return then();
  const kind = isFuji() ? '魔術礼装の機能' : isKishi() ? 'コードキャスト' : '魔術';
  scene({ title: SPELL_TIER_NAME[tier], sub: `魔力 ${G.master.stats.mag}・${kind}の習得`, reveal: true, body: paras([
    spellMentor(),
    `<span class="note">魔力が${SPELL_TH[tier - 1]}を超え、新しい${kind}を身につけられるようになった。どれを学ぶ？（戦闘の「マスターの行動」で使える）</span>`,
  ]), choices: opts.map(([id, s]) => ({
    label: `${s.name}${s.ruby ? `（${s.ruby}）` : ''}`, hint: `${s.school}・オド${s.od}・${s.hint}`,
    fn: () => { spells().push(id); addLog(`${kind}「${s.name}」を習得。`);
      next(SPELL_TIER_NAME[tier], paras([`<b>${s.name}</b>――${s.school}。`, s.learn, `<span class="note">戦闘中の「マスターの行動」で、オド${s.od}を使って「${s.name}」を使えるようになった。（${s.hint}）</span>`]), then, '次へ', SPELL_TIER_NAME[tier]); },
  })) });
}

// ---- 戦闘：マスターの行動に加える ----
function allMasterActs() {
  const acts = { ...MASTER_ACTS };
  if (G) for (const id of spells()) { const s = SPELLS[id]; if (s) acts['sp_' + id] = { name: s.name, hint: `オド${s.od}・${s.hint}`, od: s.od, spell: true }; }
  return acts;
}
function castSpell(id, log, E) {
  const s = SPELLS[id]; if (!s) return 0;
  od(-s.od);
  log.push(`<span class="skill-use me">【魔術】${s.name}</span>`);
  return s.cast(log, E) || 0;
}
// ステータス画面
function spellListHTML() {
  const list = spells(); if (!list.length) return '';
  const kind = isFuji() ? '魔術礼装' : isKishi() ? 'コードキャスト' : '習得した魔術';
  return `<h3>${kind}</h3><div class="skill-list">${list.map(id => { const s = SPELLS[id]; return `<div><b>${s.name}</b><em>${s.school}</em><span>オド${s.od}・${s.hint}</span></div>`; }).join('')}</div>`;
}

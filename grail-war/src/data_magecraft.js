// =============================================================
//  data_magecraft.js … マスターの魔術（系統を修め、研鑽する）
//
//  原作シリーズの「宝石魔術」「投影魔術」「ルーン魔術」「蝶魔術」のように、
//  魔術は「系統（ジャンル）」ごとに修め、研鑽を重ねて深めていく。
//
//  ・魔力（能力値）が 30 / 50 / 70 / 90 を超えるたびに「魔術の道」の出来事が起きる
//      新しい系統を修める（3つの候補から）か、今の系統の研鑽に専念するかを選ぶ
//  ・研鑽：魔力が伸びるたびに研鑽が積み重なる。ただし、修めた系統すべてに等しく分かれる
//      → 一つの系統に絞れば深く極められ、複数を修めれば手札は増えるが一つあたりは浅くなる（一長一短）
//      昼の「マスターの鍛錬」→「魔術の研鑽」では、一つの系統を選んで集中的に研鑽できる
//  ・研鑽の段階（Lv1〜5）で、戦闘で使う技の名前と威力が変わる（Lv3・Lv5で新しい効果が加わる）
//  ・系統によっては、日々の暮らしにも効果がある（宝石を溜める、霊薬を作る、使い魔が情報を拾う など）
//  ・藤丸は「魔術礼装」、岸波は「コードキャスト」を修められる。衛宮士郎は投影と強化（士郎の行動）が自分の魔術
// =============================================================

const SPELL_TH = [30, 50, 70, 90];                 // 「魔術の道」の出来事が起きる魔力の値
const MASTERY_TH = [0, 30, 70, 120, 180];           // 研鑽の段階（Lv1〜5）に必要な研鑽値
const SPELL_TIER_NAME = ['', '魔術の目覚め', '魔術の深化', '秘奥への階梯', '魔術の極み'];

// ---- 系統 ----
//  tech：[Lv1〜2の技, Lv3〜4の技, Lv5の奥義]
//  base / lv3 / lv5：戦闘での効果（研鑽が深いほど強くなる）
//   dmg 敵へのダメージ　sv その手番の英霊への補正　buff [効果, 強さ]（3手番）　stun 敵の動きを封じる確率
//   heal 英霊のHP　mp 英霊の魔力　evade 攻撃の無効化（回数）　insight 敵の次の手を読む　drain 吸収（与えたダメージ分、英霊を回復）
//   cleanse 弱体を祓う　hpCost 自分のHP　bossMul 呪い・人類悪への倍率
//  daily：日々の暮らしでの効果（研鑽の段階 lv を受け取る）
const SCHOOLS = {
  jewel: { name: '宝石魔術', dept: '鉱石科', bias: ['noble', 'fallen'], od: 16,
    desc: '長い時間をかけて宝石に魔力を溜め込み、一瞬で解き放つ。燃費は悪いが、瞬間的な火力は随一。',
    tech: ['宝石の魔弾', '宝石魔術・転換', '五大元素の奔流'], base: { dmg: 12 }, lv3: { sv: 8 }, lv5: { dmg: 14 },
    daily: lv => { if (lv >= 2 && Math.random() < 0.1 + lv * 0.05) { item('gem', 1); return '溜め込んでいた魔力が、宝石に満ちた。（魔力を込めた宝石+1）'; } } },
  rune: { name: 'ルーン魔術', dept: '北欧の秘術', bias: ['mercenary', 'clocktower'], od: 12,
    desc: '北欧の原初の文字を刻み、その意味を力に変える。武具に刻めば刃は鋭く、身に刻めば守りは固い。',
    tech: ['ルーン刻印', 'ルーンの守り', '原初のルーン'], base: { buff: ['atk', 6] }, lv3: { buff: ['def', 6] }, lv5: { buff: ['debuff', 10] } },
  projection: { name: '投影魔術', dept: '異端の系統', bias: ['civilian'], od: 14,
    desc: '物の設計図を読み取り、魔力で一時的に複製する（グラデーション・エア）。本来は儀式の代用品を作る程度の、効率の悪い魔術だ。',
    tech: ['投影・開始', '剣群の投影', '全工程投影完了'], base: { dmg: 9 }, lv3: { evade: 1 }, lv5: { dmg: 16, sv: 6 } },
  reinforce: { name: '強化魔術', dept: '基礎', bias: ['civilian', 'mercenary'], od: 10,
    desc: '物の「存在」に魔力を通し、その性質を高める。地味だが、魔術の基礎にして奥深い。',
    tech: ['強化', '英霊への強化', '完全強化'], base: { sv: 10 }, lv3: { buff: ['def', 4] }, lv5: { sv: 10 } },
  alchemy: { name: '錬金術', dept: '錬金術の大家', bias: ['clocktower', 'noble'], od: 16,
    desc: '物質の創造と操作を極める学問。髪や針金を、自在に動く使い魔や武器へと変える。',
    tech: ['針金の使い魔', '銀の鳥', '鋼の騎士'], base: { dmg: 8, stun: 0.35 }, lv3: { dmg: 4 }, lv5: { evade: 1 },
    daily: lv => { if (lv >= 2 && Math.random() < 0.08 + lv * 0.04) { item('crystal', 1); return '錬金術で、魔力結晶を一つ精製した。（魔力結晶+1）'; } } },
  atlas: { name: 'アトラスの錬金術', dept: 'アトラス院', bias: ['clocktower'], od: 14,
    desc: '未来を演算し、破滅を回避するための錬金術。思考を分割し、エーテライト（擬似神経）で相手の情報を読み取る。',
    tech: ['分割思考', 'エーテライト', '高速思考・七重'], base: { insight: true, sv: 4 }, lv3: { buff: ['debuff', 6] }, lv5: { sv: 12 } },
  butterfly: { name: '蝶魔術', dept: '現代魔術の一系統', bias: ['fallen', 'noble'], od: 14,
    desc: '蝶を媒介に、幻惑と呪いを編む。ひらひらと舞う光の蝶は、触れた者の感覚を狂わせる。',
    tech: ['幻惑の蝶', '鱗粉の呪い', '胡蝶の夢'], base: { stun: 0.4 }, lv3: { buff: ['debuff', 6] }, lv5: { stun: 0.25, dmg: 10 } },
  evocation: { name: '降霊術', dept: '降霊科', bias: ['noble', 'clocktower'], od: 14,
    desc: '霊を呼び、その力を借りる時計塔の主流の一つ。英霊とのパスを太くし、魔力の巡りを良くする。',
    tech: ['霊の囁き', '霊脈接続', '大霊の降臨'], base: { mp: 25 }, lv3: { heal: 15 }, lv5: { sv: 14 },
    daily: lv => { if (G.servant && lv >= 2) { mp(lv * 4); } } },
  mercury: { name: '流体操作', dept: '鉱石科', bias: ['noble'], od: 18,
    desc: '魔力を通した水銀を自在に操る。名門の天才が編み出した礼装「月霊髄液（ヴォールメン・ハイドラグラム）」はその極致。',
    tech: ['水銀の盾', '月霊髄液', '月霊髄液・自律防御'], base: { buff: ['def', 8] }, lv3: { evade: 1 }, lv5: { buff: ['def', 6], dmg: 8 } },
  time: { name: '時間操作', dept: '封印指定の家系', bias: ['mercenary'], od: 18,
    desc: '自分の体内の時間だけを加速・減速させる。時間の流れに干渉する一族の秘術を、戦うための技に削ぎ落としたもの。',
    tech: ['固有時制御・二倍速', '固有時制御・三倍速', '固有時制御・四倍速'], base: { sv: 14, hpCost: 4 }, lv3: { evade: 1 }, lv5: { sv: 10, hpCost: 4 } },
  worms: { name: '蟲術', dept: '間桐の秘術', bias: ['fallen'], od: 14,
    desc: '使い魔の蟲を操り、「吸収」の性質で他者の魔力を奪う。陰惨だが、継戦能力は高い。',
    tech: ['刻印蟲', '吸収の蟲群', '翅刃虫の嵐'], base: { dmg: 8, drain: true, tone: 'evil' }, lv3: { mp: 15 }, lv5: { dmg: 10 } },
  puppet: { name: '人形工学', dept: '人形師の系譜', bias: ['clocktower', 'fallen'], od: 14,
    desc: '人と見紛う人形を作り、操る。精巧な人形は、主の身代わりにも、戦う手足にもなる。',
    tech: ['操り人形', '戦闘人形', '代替の人形'], base: { evade: 1, dmg: 5 }, lv3: { dmg: 6 }, lv5: { evade: 1 } },
  astro: { name: '天体魔術', dept: '天体科', bias: ['clocktower', 'noble'], od: 16,
    desc: '星の運行から未来の揺らぎを読む、時計塔でも最古の系統の一つ。戦場では、勝機の流れを示してくれる。',
    tech: ['星読み', '天球の加護', '星の運行'], base: { buff: ['crit', 12] }, lv3: { buff: ['atk', 6] }, lv5: { insight: true, sv: 8 } },
  curse: { name: '呪詛', dept: '呪詛科', bias: ['fallen', 'noble', 'clocktower'], od: 10,
    desc: '指差しの呪い「ガンド」に代表される、病や不運を呼ぶ魔術。熟達すれば、呪いは物理的な破壊力すら帯びる。',
    tech: ['ガンド', 'ガンド撃ち', 'フィンの一撃'], base: { buff: ['debuff', 6], dmg: 4 }, lv3: { dmg: 6 }, lv5: { dmg: 10, stun: 0.3 } },
  bounded: { name: '結界魔術', dept: '基礎', bias: ['shrine', 'noble'], od: 12,
    desc: '空間に境界を引き、内と外を分ける。結界は、魔術師の工房を守る最初の砦だ。',
    tech: ['簡易結界', '多重結界', '神殿級結界'], base: { buff: ['def', 7] }, lv3: { buff: ['def', 4] }, lv5: { evade: 1, buff: ['debuff', 6] },
    onLearn: () => { G.workshop = Math.min(5, G.workshop + 1); return '（陣地Lv+1）'; } },
  healing: { name: '治癒魔術', dept: '医療の系統', bias: ['executor', 'civilian', 'shrine'], od: 14,
    desc: '肉体の設計図を読み取り、あるべき姿へと戻す。極めれば、英霊の霊基にすら届く。',
    tech: ['治癒', '高等治癒', '再生の秘術'], base: { heal: 22 }, lv3: { heal: 10, cleanse: true }, lv5: { heal: 15 },
    daily: lv => { hp(lv * 3); if (G.servant) shp(lv * 2); } },
  sacrament: { name: '秘蹟・洗礼詠唱', dept: '聖堂教会', bias: ['executor'], od: 16,
    desc: '聖書の言葉そのものを武器とする教会の秘蹟。黒鍵の投擲と、不浄を灼く洗礼詠唱。',
    tech: ['黒鍵', '洗礼詠唱', '主の御名において'], base: { dmg: 10, bossMul: 2 }, lv3: { dmg: 4 }, lv5: { dmg: 8, cleanse: true } },
  shinto: { name: '神道・巫術', dept: '日本の土着の魔術', bias: ['shrine'], od: 14,
    desc: '祝詞と舞で神気を招く、この国古来の術。天降山の神に連なる者にしか扱えない秘儀もある。',
    tech: ['祝詞', '神楽舞', '神降ろし'], base: { heal: 14, cleanse: true }, lv3: { buff: ['atk', 6] }, lv5: { sv: 14 } },
  beast: { name: '獣性魔術', dept: '現代魔術の一系統', bias: ['mercenary'], od: 16,
    desc: '自らの肉体に獣性を降ろし、人を超えた力と感覚を得る。理性を手放す危うさと隣り合わせだ。',
    tech: ['獣化', '獣の爪牙', '神獣の顕現'], base: { dmg: 10, hpCost: 3 }, lv3: { sv: 6 }, lv5: { dmg: 12 } },
  golem: { name: 'ゴーレム作成', dept: '創造科', bias: ['clocktower'], od: 16,
    desc: '土や石に仮初めの命を吹き込み、従順な兵を作る。英霊を守る盾にも、敵を阻む壁にもなる。',
    tech: ['土くれの兵', '石の守護者', '原初の巨人'], base: { buff: ['def', 6], dmg: 4 }, lv3: { evade: 1 }, lv5: { dmg: 12 } },
  imaginary: { name: '虚数魔術', dept: '架空元素', bias: ['fallen'], od: 18,
    desc: '「あり得るが、物質界にはないもの」を扱う稀少な属性。影は形を持ち、相手を縛り、呑み込む。',
    tech: ['影縛り', '虚数の影', '影の巨人'], base: { stun: 0.45 }, lv3: { dmg: 8 }, lv5: { buff: ['debuff', 10] } },
  suggestion: { name: '暗示・精神干渉', dept: '基礎', bias: ['civilian', 'noble'], od: 10,
    desc: '人の心に言葉を滑り込ませ、思考を誘導する。神秘の秘匿にも、敵マスターの判断を鈍らせることにも使える。',
    tech: ['暗示', '精神干渉', '支配の言霊'], base: { buff: ['debuff', 5] }, lv3: { buff: ['master', 12] }, lv5: { stun: 0.4 } },
  necro: { name: '死霊術', dept: '黒魔術', bias: ['fallen'], od: 14,
    desc: '死者の骸や霊を使役する、忌まわしき系統。血と肉の代償を求めるが、その呪いは深い。',
    tech: ['死霊の手', '骸骨の兵', '死の舞踏'], base: { dmg: 7, buff: ['debuff', 4], tone: 'evil' }, lv3: { dmg: 5 }, lv5: { stun: 0.35 } },
  familiar: { name: '使い魔術', dept: '基礎', bias: ['civilian', 'clocktower', 'executor'], od: 8,
    desc: '動物に魔力の糸を通し、その目と耳を借りる。極めれば、街中が自分の目になる。',
    tech: ['使い魔の目', '使い魔の群れ', '千里を見通す眼'], base: { insight: true, sv: 4 }, lv3: { sv: 4 }, lv5: { buff: ['atk', 6] },
    daily: lv => { if (G.phase === 'war' && Math.random() < lv * 0.06) { const t = intelRandom(1); if (t) return '使い魔が、夜の街で拾ってきた。' + t; } } },
  // ---- 特殊シナリオ ----
  chaldea: { name: '魔術礼装', dept: 'カルデアの技術', pool: 'fuji', od: 12,
    desc: 'かつての旅で袖を通した礼装。魔術回路の乏しいマスターでも、英霊を支えられるように作られている。',
    tech: ['応急手当', '瞬間強化・ガンド', '決戦の礼装'], base: { heal: 18 }, lv3: { sv: 10, stun: 0.5 }, lv5: { sv: 12, evade: 1 } },
  codecast: { name: 'コードキャスト', dept: 'ムーンセル', pool: 'kishi', od: 12,
    desc: '月の聖杯戦争で使い慣れた、霊子の術式。heal()、gain_str()、view_status()……地上の理に合わせて組み直したもの。',
    tech: ['heal(16)・gain_str(16)', 'view_status()・shock(64)', 'code: 月の王権'], base: { heal: 12, buff: ['str', 8] }, lv3: { insight: true, stun: 0.4 }, lv5: { sv: 18 } },
};
// 特殊シナリオで修められる系統
const SCHOOL_POOL = { fuji: ['chaldea', 'reinforce', 'healing', 'familiar'], kishi: ['codecast', 'atlas', 'bounded'] };

// ---- 状態 ----
function magic() { if (!G.magic) G.magic = { schools: {} }; return G.magic; }
function schoolIds() { return Object.keys(magic().schools); }
function masteryLv(id) { const p = magic().schools[id] || 0; return MASTERY_TH.filter(t => p >= t).length; }
function canLearnMagic() {
  if (!G || isShirou()) return false;
  if (G.phase === 'growth') return hasMagic() || isFuji() || isKishi();
  return ['prep', 'war'].includes(G.phase);
}
// 研鑽：修めた系統に等しく分ける（だから、多く修めるほど一つあたりは浅くなる）
function magicResearch(n) {
  const ids = schoolIds(); if (!ids.length || n <= 0) return;
  const each = n / ids.length;
  for (const id of ids) studySchool(id, each, true);
}
function studySchool(id, pts, quiet) {
  const m = magic(); const before = masteryLv(id);
  m.schools[id] = Math.round(((m.schools[id] || 0) + pts) * 10) / 10;
  const after = masteryLv(id);
  if (after > before) { const s = SCHOOLS[id]; const t = `${s.name}の研鑽が深まった。（Lv${after}）${after === 3 || after === 5 ? `――「${techName(id)}」を会得した。` : ''}`; addLog(t); if (typeof NOTES !== 'undefined') NOTES.push(`<span class="note">${t}</span>`); }
}
function techName(id) { const lv = masteryLv(id); const t = SCHOOLS[id].tech; return lv >= 5 ? t[2] : lv >= 3 ? t[1] : t[0]; }
function techOd(id) { const lv = masteryLv(id); return SCHOOLS[id].od + (lv >= 3 ? 4 : 0) + (lv >= 5 ? 6 : 0); }

// ---- 「魔術の道」の出来事 ----
function pendingSpellTier() {
  if (!canLearnMagic()) return 0;
  const n = G.spellTier || 0;
  return n < SPELL_TH.length && G.master.stats.mag >= SPELL_TH[n] ? n + 1 : 0;
}
function schoolCandidates() {
  const pool = isFuji() ? SCHOOL_POOL.fuji : isKishi() ? SCHOOL_POOL.kishi : Object.keys(SCHOOLS).filter(id => !SCHOOLS[id].pool);
  const b = G.master.birth; const have = magic().schools;
  return pool.filter(id => !(id in have))
    .map(id => ({ id, w: (SCHOOLS[id].bias || []).includes(b) ? 3 + Math.random() : Math.random() * 2.5 }))
    .sort((x, y) => y.w - x.w).slice(0, 3).map(x => x.id);
}
function spellMentor() {
  if (isFuji()) return '旧友から、新しい礼装の部品と、懐かしい筆跡の手紙が届いた。「使いこなせるようになったら、次の機能も解放してね」';
  if (isKishi()) return '月の玉座から持ち込んだコードの断片を、地上の理に合わせて組み直していく。';
  return { noble: '書斎に呼ばれた。当主の顔をした親が、古い魔術書を開いて言う。「次に進むべき道を、自分で選びなさい」',
    fallen: '屋根裏の古い箱に、先祖の魔術書が眠っていた。色褪せた頁に、いくつもの系統の術式が書き残されている。',
    clocktower: '時計塔の講義室。講師が黒板に複雑な術式を描きながら、こちらを見た。「君は、どの学科に進むつもりかね」',
    mercenary: '師匠が、焚き火の向こうで顎をしゃくった。「生き残りたけりゃ、得物を選べ。一つを極めるか、手札を増やすか」',
    civilian: '独学で読み進めてきた魔術書の、次の頁が、ふいに「分かった」。体の中の回路が、新しい形を覚えたがっている。',
    executor: '教会の地下で、シスターが古い祈祷書と、何冊かの禁書を並べた。「あなたにも、選ぶ時が来ました」',
    shrine: '祖母が、神社の蔵の奥から古い巻物を取り出した。「この家に伝わる技と、外の世界の技。どちらを学ぶかは、お前が決めるんじゃ」' }[G.master.birth] || '体の奥の魔術回路が、次の段階へ進もうとしている。';
}
function spellLearnScene(then) {
  const tier = pendingSpellTier(); if (!tier) return then();
  G.spellTier = tier;
  const cand = schoolCandidates(); const have = schoolIds();
  const kind = isFuji() ? '魔術礼装' : isKishi() ? 'コードキャスト' : '魔術';
  const b = G.master.birth;
  const choices = cand.map(id => { const s = SCHOOLS[id]; return {
    label: `${have.length ? '新たに' : ''}「${s.name}」を修める${(s.bias || []).includes(b) ? '（家に伝わる）' : ''}`,
    hint: `${s.dept}・${have.length ? `修めた系統が${have.length + 1}つになり、研鑽が分かれる` : '最初の系統'}`,
    fn: () => learnSchool(id, tier, then) }; });
  if (have.length) choices.push({ label: '新しい系統は学ばず、研鑽に専念する', hint: `修めた系統（${have.map(id => SCHOOLS[id].name).join('・')}）の研鑽+${30}を分け合う`, cls: 'primary',
    fn: () => { NOTES = []; magicResearch(30); next(SPELL_TIER_NAME[tier], paras(['新しい扉は開かず、今の道を深く掘り下げることにした。', ...takeNotes(), schoolSummary()]), then, '次へ', SPELL_TIER_NAME[tier]); } });
  scene({ title: SPELL_TIER_NAME[tier], sub: `魔力 ${G.master.stats.mag}・${kind}の道`, reveal: true, body: paras([
    spellMentor(),
    ...cand.map(id => `<b>${SCHOOLS[id].name}</b>（${SCHOOLS[id].dept}）――${SCHOOLS[id].desc}`),
    `<span class="note">魔力が${SPELL_TH[tier - 1]}を超えた。新しい系統を修めるか、今の系統の研鑽に専念するか。<br>系統を多く修めるほど戦い方の幅は広がるが、魔力が伸びた時の研鑽は修めた系統に等しく分かれ、一つあたりは深まりにくくなる。</span>`,
  ]), choices });
}
function learnSchool(id, tier, then) {
  NOTES = []; const s = SCHOOLS[id];
  magic().schools[id] = 0;
  const extra = s.onLearn ? s.onLearn() : '';
  addLog(`「${s.name}」を修める。`);
  next(SPELL_TIER_NAME[tier], paras([`<b>${s.name}</b>――${s.dept}。`, s.desc,
    `<span class="note">戦闘の「マスターの行動」で、「${techName(id)}」（オド${techOd(id)}）を使えるようになった。研鑽を重ねると、Lv3で「${s.tech[1]}」、Lv5で奥義「${s.tech[2]}」に至る。${extra}</span>`, schoolSummary()]), then, '次へ', SPELL_TIER_NAME[tier]);
}
function schoolSummary() {
  const ids = schoolIds(); if (!ids.length) return '';
  return `<span class="note">修めた系統：${ids.map(id => `${SCHOOLS[id].name} Lv${masteryLv(id)}`).join('／')}</span>`;
}

// ---- 昼の行動：魔術の研鑽（一つの系統に集中する） ----
function studyMenu() {
  const ids = schoolIds();
  submenu('魔術の研鑽', 'STUDY', '<p>どの系統を研鑽する？ 一つに集中すれば、確実に深められる。</p>', ids.map(id => {
    const lv = masteryLv(id); const p = magic().schools[id]; const nextTh = MASTERY_TH[lv];
    return { label: `${SCHOOLS[id].name}（Lv${lv}）`, hint: lv >= 5 ? '極めている' : `研鑽 ${Math.floor(p)}/${nextTh}・+14`, disabled: lv >= 5,
      fn: () => actResult('魔術の研鑽', () => { studySchool(id, 14); gain('int', 1);
        return `工房に籠もり、${SCHOOLS[id].name}の術式を一つひとつ確かめ直した。（${SCHOOLS[id].name}の研鑽+14 知力+1）`; }) };
  }));
}

// ---- 毎日：系統ごとの暮らしの効果 ----
function magicDaily() {
  for (const id of schoolIds()) { const s = SCHOOLS[id]; if (!s.daily) continue; const t = s.daily(masteryLv(id)); if (t && G.phase === 'war') G.news.push(t); }
}

// ---- 戦闘：マスターの行動に加える ----
function allMasterActs() {
  const acts = { ...MASTER_ACTS };
  if (G) for (const id of schoolIds()) acts['sp_' + id] = { name: techName(id), hint: `${SCHOOLS[id].name}Lv${masteryLv(id)}・オド${techOd(id)}・${techHint(id)}`, od: techOd(id), spell: true };
  return acts;
}
function techSpec(id) {
  const s = SCHOOLS[id]; const lv = masteryLv(id);
  return [s.base, lv >= 3 ? s.lv3 : null, lv >= 5 ? s.lv5 : null].filter(Boolean);
}
function techHint(id) {
  const f = 0.6 + 0.2 * masteryLv(id); const sum = {};
  const buffs = {};
  for (const e of techSpec(id)) for (const [k, v] of Object.entries(e)) { if (k === 'buff') buffs[v[0]] = (buffs[v[0]] || 0) + v[1]; else sum[k] = typeof v === 'number' ? (sum[k] || 0) + v : v; }
  const out = [];
  if (sum.dmg) out.push(`${Math.round(sum.dmg * f)}ダメージ${sum.drain ? '（吸収）' : ''}`);
  if (sum.sv) out.push(`英霊+${Math.round(sum.sv * f)}`);
  if (sum.heal) out.push(`HP+${Math.round(sum.heal * f)}`);
  if (sum.mp) out.push(`魔力+${Math.round(sum.mp * f)}`);
  for (const [c, v] of Object.entries(buffs)) out.push(`${SKILL_FX[c].tag}${Math.round(v * f)}`);
  if (sum.stun) out.push(`封じ${Math.round(Math.min(0.9, sum.stun + 0.04 * masteryLv(id)) * 100)}%`);
  if (sum.evade) out.push(`回避${sum.evade}`);
  if (sum.insight) out.push('看破');
  if (sum.cleanse) out.push('祓い');
  return out.join('・');
}
function castSpell(id, log, E) {
  const s = SCHOOLS[id]; if (!s) return 0;
  const lv = masteryLv(id); const f = 0.6 + 0.2 * lv;
  od(-techOd(id));
  log.push(`<span class="skill-use me">【${s.name}・Lv${lv}】${techName(id)}</span>`);
  let bonus = 0, dmg = 0, stunP = 0;
  for (const e of techSpec(id)) {
    if (e.dmg) dmg += e.dmg;
    if (e.sv) bonus += Math.round(e.sv * f);
    if (e.buff) B.buf.me.push({ code: e.buff[0], v: Math.round(e.buff[1] * f), turns: 3 });
    if (e.heal) shp(Math.round(e.heal * f));
    if (e.mp) mp(Math.round(e.mp * f));
    if (e.evade) B.evade.me += e.evade;
    if (e.insight) B.sure = true;
    if (e.cleanse) B.buf.en = B.buf.en.filter(b => b.code !== 'debuff');
    if (e.hpCost) hp(-e.hpCost);
    if (e.stun) stunP += e.stun;
    if (e.tone) tone(e.tone);
  }
  if (dmg) {
    const spec = techSpec(id); const drain = spec.some(e => e.drain); const mul = spec.some(e => e.bossMul) && B.boss ? 2 : 1;
    const d = Math.round((dmg * f + G.master.stats.mag / 15) * mul);
    B.r.hp -= d; B.fxq.push({ type: 'hit', side: 'en', dmg: d });
    log.push(`${E}に${d}ダメージ！${drain ? `奪った魔力が、英霊の傷を塞いだ。（英霊HP+${Math.round(d / 2)}）` : ''}`);
    if (drain) shp(Math.round(d / 2));
  }
  if (stunP) {
    const res = classSkillV(servantOf(B.r), '対魔力') * 5;
    if (Math.random() * 100 < res) log.push(`<span class="note">${E}の対魔力が、術を弾いた。</span>`);
    else if (Math.random() < Math.min(0.9, stunP + 0.04 * lv)) { B.stun.en = true; log.push(`<span class="note">${E}の動きが止まった！</span>`); }
    else log.push(`<span class="note">${E}は術を振り払った。</span>`);
  }
  return bonus;
}
// ---- ステータス画面 ----
function spellListHTML() {
  const ids = schoolIds(); if (!ids.length) return '';
  const kind = isFuji() ? '魔術礼装' : isKishi() ? 'コードキャスト' : '修めた魔術系統';
  return `<h3>${kind}</h3><div class="skill-list">${ids.map(id => { const s = SCHOOLS[id]; const lv = masteryLv(id); const p = Math.floor(magic().schools[id]);
    return `<div><b>${s.name}</b><em>Lv${lv}${lv < 5 ? `（研鑽 ${p}/${MASTERY_TH[lv]}）` : '（極み）'}</em><span>${s.dept}・今の技「${techName(id)}」：${techHint(id)}</span></div>`; }).join('')}</div>` +
    (ids.length > 1 ? `<p class="note" style="font-size:12px;color:var(--muted)">${ids.length}つの系統を修めている。魔力が伸びた時の研鑽は、${ids.length}つに分かれる。</p>` : '');
}

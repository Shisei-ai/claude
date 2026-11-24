// =============================================================
//  battle.js … 戦闘
//  毎手番「マスターの行動」と「サーヴァントの行動」を1つずつ選ぶ。
//
//  サーヴァントの行動
//   攻撃：白兵（筋力）/ 機動（敏捷）/ 魔術（魔力） … 三すくみ
//         白兵 ＞ 魔術 ＞ 機動 ＞ 白兵（有利な側に+15）
//   宝具：三すくみを無視する大技。ただし真名が敵に知られる。
//         種類・消費魔力・効果は宝具ごとに違う（data_np.js）。攻撃しない宝具は、使った手番は守りながら効果を出す
//   防御：耐久で受け、ダメージ半減。防ぎ切れば次の手番に反撃補正
//   見切り：攻撃しない代わりに、次の敵の行動を確実に読み、真名の手がかりを得る
//   敵マスターを狙う：成功すれば一気に決着（アサシンが得意・悪）
//   令呪：4種類の命令から選ぶ
//   撤退
//
//  マスターの行動
//   指揮（+5）/ 強化魔術（オド15：+14）/ 治癒魔術（オド20：HP+25）/ 道具
// =============================================================

const TACTICS = {
  str: { name: '白兵戦', stat: 0, beats: 'mag', tell: '大きく踏み込む構えを見せている（白兵戦の気配）' },
  agi: { name: '機動戦', stat: 2, beats: 'str', tell: '間合いを測り、素早く動き回っている（機動戦の気配）' },
  mag: { name: '魔術戦', stat: 3, beats: 'agi', tell: '周囲に魔力が渦巻いている（魔術戦の気配）' },
  np:  { name: '宝具', stat: 5, tell: '魔力が異常に高まっている――宝具が来る！' },
  guard: { name: '防御', stat: 1, tell: '腰を落とし、守りを固めている（防御の気配）' },
};
const MASTER_ACTS = {
  command: { name: '指揮に専念', hint: '+5' },
  boost:   { name: '強化魔術', hint: 'オド15・+14', od: 15 },
  heal:    { name: '治癒魔術', hint: 'オド20・HP+25', od: 20 },
  potion:  { name: '治癒の霊薬', hint: 'HP+35', item: 'potion' },
  gem:     { name: '宝石魔術', hint: '+12・敵に10', item: 'gem' },
  crystal: { name: '魔力結晶', hint: '魔力+40', item: 'crystal' },
};
let B = null; // 戦闘中の状態（セーブしない）

function startBattle(rival, opt = {}) {
  if (isShirou() && !rival.fifthTalked && FIFTH_TALK[rival.servantId] && rival.servantId !== 'ori')
    return fifthTalkScene(rival, () => startBattle(rival, opt));
  if (!opt.final && typeof encTalkFor === 'function' && encTalkFor(rival))   // 藤丸・岸波：かつての縁のある英霊との対面の会話（data_talks.js）
    return encounterTalkScene(rival, () => startBattle(rival, opt));
  if (!opt.boss && !opt.beast && !opt.enforcer && typeof pairTalkFor === 'function' && pairTalkFor(rival))   // 縁ある英霊どうしの会話（data_pairtalk.js）
    return pairTalkScene(rival, () => startBattle(rival, opt));
  G.battles++;
  B = { r: rival, round: 0, opt, final: !!(opt.final || opt.boss), boss: !!opt.boss, beast: !!opt.beast, enforcer: !!opt.enforcer, miracle: false,
    enemyNext: null, tell: null, sure: false, charge: 0, echarge: 0, mact: 'command', extra: null, enemySeal: false };
  skillInit();
  const pre = [];
  const seen = meet(rival);
  if (seen) pre.push(`<p>${seen}</p>`);
  if (isFuji() && servantOf(rival).persona !== 'berserker' && rival.servantId !== 'ori' && !rival.recognized && Math.random() < 0.5) {
    rival.recognized = true;
    pre.push(`<p class="quote">${recognizeLine(servantOf(rival))}</p>`);
  }
  const mx = kishiMatrix(rival); if (mx) pre.push(`<p>${mx}</p>`);
  if (opt.defend && G.traps > 0) {
    G.traps--; rival.hp = Math.max(1, rival.hp - 20);
    pre.push(`<p>仕掛けておいた罠が炸裂した！ ${enemyName()}に20ダメージ。（残りの罠 ${G.traps}）</p>`);
  }
  planEnemy();
  battleScene(pre);
}
function enemyName() { return knowsName(B.r) ? servantOf(B.r).short : `敵${B.r.cls}`; }

// 敵の次の行動を決め、「構え」として見せるかどうかを決める
function planEnemy() {
  const r = B.r;
  let t;
  if (enemyWantsNp()) t = 'np';
  else if (B.echarge === 0 && Math.random() < (r.hp < r.hpMax * 0.35 ? 0.25 : 0.1)) t = 'guard';
  else t = wpick(['str', 'agi', 'mag'], k => Math.pow(rivalParam(r, TACTICS[k].stat), 1.5));
  B.enemyNext = t;
  if (B.sure) { B.tell = `【見切り】${enemyName()}は${TACTICS[t].tell}`; B.tellKey = t; B.sure = false; return; }
  if (isKishi()) { B.tell = `【戦略眼】${enemyName()}は${TACTICS[t].tell}`; B.tellKey = t; return; }   // 岸波白野：敵の手を必ず読む
  const seeChance = t === 'np' ? 0.9 : 0.3 + G.master.stats.int / 200 + (knowsName(r) ? 0.2 : 0);
  if (Math.random() < seeChance) {
    const shown = t === 'np' || Math.random() < 0.75 ? t : pick(['str', 'agi', 'mag', 'guard']);
    B.tell = `${enemyName()}は${TACTICS[shown].tell}`; B.tellKey = shown;
  } else { B.tell = null; B.tellKey = null; }
}

function mactAvailable(k) {
  const a = allMasterActs()[k]; if (!a) return false;
  if (a.od && G.master.od < a.od) return false;
  if (a.item && !(G.items[a.item] > 0)) return false;
  return true;
}
function battleScene(extra) {
  if (extra) B.extra = extra;
  const r = B.r; const sv = G.servant; const me = servantOf(G);
  const an = B.anim || {};
  const meW = Math.max(0, sv.hp / servantHpMax()) * 100, enW = Math.max(0, r.hp / r.hpMax) * 100;
  const meFrom = an.me !== undefined ? Math.max(0, an.me / servantHpMax()) * 100 : meW;
  const enFrom = an.en !== undefined ? Math.max(0, an.en / r.hpMax) * 100 : enW;
  const body = [
    `<div class="battle-field">
      <div class="fighter" id="f-me" style="--cc:${classColor(me.cls)}"><div class="fighter-top"><span class="fighter-name">${emblem(me.cls, 18)}${me.short}</span><span>${me.cls}　HP ${sv.hp}/${servantHpMax()}　魔力 ${sv.mp}${B.charge ? `　<b>反撃+${B.charge}</b>` : ''}</span></div>
        <div class="bar hp"><i class="lag" style="width:${meFrom}%"></i><i data-w="${meW}" style="width:${meFrom}%"></i></div>
        <div class="bar mp thin"><i style="width:${sv.mp}%"></i></div></div>
      <div class="vs">VS</div>
      <div class="fighter enemy" id="f-en" style="--cc:${classColor(r.cls)}"><div class="fighter-top"><span class="fighter-name">${emblem(r.cls, 18)}${enemyName()}</span><span>${r.cls}${knowsName(r) ? '' : '（真名不明）'}　HP ${Math.max(0, r.hp)}/${r.hpMax}</span></div>
        <div class="bar enemy"><i class="lag" style="width:${enFrom}%"></i><i data-w="${enW}" style="width:${enFrom}%"></i></div>
        ${knowsName(r) ? `<div class="enemy-params">${PARAM_NAMES.map((n, i) => `${n}<b>${servantOf(r).p[i]}</b>`).join('')}</div>` : ''}</div>
    </div>`,
  ];
  if (B.round === 0) {
    const mods = [];
    if (B.opt.ambush) mods.push('奇襲');
    if (B.opt.enemyFirst) mods.push('先手を取られた');
    if (B.opt.duel) mods.push('一騎打ち');
    if (B.opt.defend && G.workshop) mods.push(`陣地Lv${G.workshop}`);
    if (knowsName(r)) mods.push('真名看破');
    if (G.servant.exposed) mods.push('こちらの真名が露見');
    const aff = classAffinity(me.cls, r.cls);
    if (aff > 0 && me.cls !== 'バーサーカー' && r.cls !== 'バーサーカー') mods.push('クラス相性◎');
    if (aff < 0) mods.push('クラス相性×');
    if (B.final && G.flags.resolve === 'win') mods.push('決意');
    body.push(`<p>${B.enforcer ? '封印指定執行者との戦い。狙われているのは、英霊ではなく――あなただ。' : B.beast ? '白い大蛇が、楽園の香りと共に鎌首をもたげる。――人類悪との戦いが始まる。' : B.boss ? '聖杯の内から、黒い泥が形を成して立ち上がる。' : B.final ? '聖杯を賭けた、最後の戦いが始まる。' : '戦闘開始。'}${mods.length ? `<br><span class="note">補正：${mods.join('・')}</span>` : ''}</p>`);
  }
  if (B.extra) body.push(...B.extra);
  if (B.tell) body.push(`<p class="tell">${B.tell}</p>`);
  if (isShirou()) return shirouBattleScene(body);
  // マスターの行動（トグル）
  const ACTS = allMasterActs();
  const mk = Object.keys(ACTS).filter(k => !ACTS[k].item || G.items[ACTS[k].item] > 0);
  if (!mactAvailable(B.mact)) B.mact = 'command';
  body.push(`<div class="mact"><div class="mact-head">マスターの行動 <span>オド ${G.master.od}/${odMax()}</span></div><div class="mact-row">${mk.map(k => {
    const a = ACTS[k]; const cnt = a.item ? `×${G.items[a.item]}` : '';
    return `<button class="chip ${B.mact === k ? 'on' : ''}" data-mact="${k}" ${mactAvailable(k) ? '' : 'disabled'} aria-pressed="${B.mact === k}">${a.name}${cnt}<small>${a.hint}</small></button>`;
  }).join('')}</div></div>`);
  body.push(skillRowHTML());
  body.push(triangleSVG(B.tell ? B.tellKey : null));

  const p = i => `${PARAM_NAMES[i]}${valueRank(servantParam(i))}`;
  const mpAfter = sv.mp + (B.mact === 'crystal' ? 40 : 0);
  const npi = npInfo(me); const npOnce = npi.has('once') && B.npUsed.me;
  body.push(`<p class="np-line">宝具「${me.np}」：<b>${npSummary(npi)}</b>${npFxText(npi) ? `　${npFxText(npi)}` : ''}${npOnce ? '<br>（この戦闘ではもう使えない）' : ''}</p>`);
  const choices = [
    { label: `宝具「${me.np}」`, hint: `${npi.kind}・${p(5)}・魔力-${npi.cost}${sv.exposed ? '' : '・真名が知られる'}`, disabled: mpAfter < npi.cost || npOnce, fn: () => battleRound('np'), cls: 'primary wide', icon: 'np' },
    { label: '白兵戦', hint: `${p(0)}・魔術に強い`, fn: () => battleRound('str'), icon: 'str', cls: B.tellKey === 'agi' && B.tell ? 'warn' : '' },
    { label: '機動戦', hint: `${p(2)}・白兵に強い`, fn: () => battleRound('agi'), icon: 'agi', cls: B.tellKey === 'mag' && B.tell ? 'warn' : '' },
    { label: '魔術戦', hint: `${p(3)}・機動に強い`, fn: () => battleRound('mag'), icon: 'mag', cls: B.tellKey === 'str' && B.tell ? 'warn' : '' },
    { label: '防御', hint: `${p(1)}・半減、防げば反撃`, fn: () => battleRound('guard'), icon: 'guard' },
    { label: '見切り', hint: '次の手を読む・真名の手がかり', fn: () => battleRound('observe'), icon: 'observe' },
  ];
  if (!B.boss && !B.enforcer) choices.push({ label: '敵マスターを狙う', hint: `${isAssassin() ? '気配遮断で有利' : '成功率低'}・悪`, cls: 'danger', fn: () => battleRound('master'), icon: 'target' });
  choices.push({ label: `令呪（残${G.master.seals}）`, hint: '4種の命令', disabled: G.master.seals < 1, cls: 'danger', fn: sealMenu, icon: 'seal' });
  if (!B.final && !B.enforcer) choices.push({ label: '撤退', hint: G.items.smoke ? '煙幕の護符で確実' : '敏捷・幸運で判定', fn: () => battleRound('flee'), icon: 'flee' });
  scene({ title: B.enforcer ? '封印指定執行者' : B.beast ? 'ビーストⅧ' : B.boss ? '黒き聖杯' : B.final ? '最終決戦' : '戦闘', sub: `ROUND ${B.round + 1}`, body, choices, grid: true, battle: true });
  animateBattle();
}
// 衛宮士郎の戦闘画面：士郎の行動を選ぶ。セイバーは自分の判断で戦う
function shirouBattleScene(body) {
  const auto = B.forceTac || saberAuto();
  body.push(`<div class="mact"><div class="mact-head">士郎 <span>HP ${G.master.hp}/${G.master.hpMax}　オド ${G.master.od}/${odMax()}${B.shirouDown ? '　<b>満身創痍</b>' : ''}</span></div>
    <p class="note" style="margin:4px 0 0">セイバーの構え：<b>${TACTICS[auto].name}</b>${B.forceTac ? '（指示）' : '（自分の判断）'}</p></div>`);
  // 道具（他のシナリオと同じく、行動と一緒に使う）
  const ik = ['command', 'potion', 'gem', 'crystal'].filter(k => k === 'command' || G.items[MASTER_ACTS[k].item] > 0);
  if (!ik.includes(B.mact)) B.mact = 'command';
  if (ik.length > 1) body.push(`<div class="mact"><div class="mact-head">道具 <span>行動と一緒に使う</span></div><div class="mact-row">${ik.map(k => {
    const a = MASTER_ACTS[k]; const name = k === 'command' ? '使わない' : `${a.name}×${G.items[a.item]}`; const hint = k === 'command' ? '' : a.hint;
    return `<button class="chip ${B.mact === k ? 'on' : ''}" data-mact="${k}" aria-pressed="${B.mact === k}">${name}<small>${hint}</small></button>`;
  }).join('')}</div></div>`);
  body.push(skillRowHTML());
  body.push(triangleSVG(B.tell ? B.tellKey : null));
  const choices = Object.entries(SHIROU_ACTS).map(([k, a]) => ({
    label: a.ruby ? `${a.name}` : a.name, hint: a.ruby ? `${a.ruby}・${a.hint}` : a.hint, disabled: !shirouActAvailable(k),
    cls: k === 'ubw' ? 'primary wide' : ['calad', 'nine'].includes(k) ? 'danger' : '', icon: { blades: 'str', bow: 'target', aias: 'guard', calad: 'np', nine: 'np', ubw: 'np', support: 'bond' }[k],
    fn: () => shirouRound(k),
  }));
  choices.push({ label: 'セイバーに指示を出す', hint: '次の手番の戦い方を決める', icon: 'observe', fn: saberOrderMenu });
  choices.push({ label: `令呪（残${G.master.seals}）`, hint: '4種の命令', disabled: G.master.seals < 1, cls: 'danger', fn: sealMenu, icon: 'seal' });
  if (!B.final && !B.enforcer) choices.push({ label: '撤退', hint: G.items.smoke ? '煙幕の護符で確実' : '敏捷・幸運で判定', fn: () => battleRound('flee'), icon: 'flee' });
  scene({ title: B.enforcer ? '封印指定執行者' : B.beast ? 'ビーストⅧ' : B.boss ? '黒き聖杯' : B.final ? '最終決戦' : '戦闘', sub: `ROUND ${B.round + 1}`, body, choices, grid: true, battle: true });
  animateBattle();
}
function sealMenu() {
  const choices = [
    { label: '「全力で打ち倒せ」', hint: '最も得意な攻撃に+35', cls: 'danger', fn: () => battleRound('seal_power') },
    { label: '「宝具を解き放て」', hint: '魔力を使わず宝具+20', cls: 'danger', disabled: npInfo(servantOf(G)).has('once') && B.npUsed.me, fn: () => battleRound('seal_np') },
    { label: '「耐え抜け」', hint: 'HPを7割まで回復し、防御+30', fn: () => battleRound('seal_endure') },
  ];
  if (!B.final) choices.push({ label: '「退け」', hint: '確実に撤退', fn: () => battleRound('seal_retreat') });
  choices.push({ label: '戻る', fn: () => { B.anim = null; battleScene(); } });
  scene({ title: '令呪', sub: `残り${G.master.seals}画`, body: [sealGlyphs(), `<p>右手の令呪が熱を帯びる。残り${G.master.seals}画の絶対命令権――どう使う？</p>`], choices });
}

// ---------------- 1手番の処理 ----------------
function battleRound(cmd) {
  const r = B.r; const me = servantOf(G); const sv = G.servant;
  B.round++;
  const log = [];
  B.fxq = []; B.anim = { me: sv.hp, en: r.hp };
  const P = me.short, E = enemyName();
  let et = B.enemyNext;

  // 令呪
  let tac = cmd, sealBoost = 0, npFree = false;
  if (cmd.startsWith('seal_')) {
    G.master.seals--; addLog('令呪を一画使用（戦闘）。');
    const order = { seal_power: '全力で打ち倒せ', seal_np: '宝具を解き放て', seal_endure: '耐え抜け', seal_retreat: '退け' }[cmd];
    log.push(`<b>「令呪をもって命ずる――${order}！」</b> 右手の令呪が一画、紅く輝いて消えた。`);
    B.fxq.push({ type: 'seal', order });
    if (cmd === 'seal_retreat') return escape(log.concat([`${P}の姿が掻き消え、次の瞬間にはあなたの隣にいた。令呪による空間転移だ。`]));
    if (cmd === 'seal_power') { sealBoost = 35; tac = ['str', 'agi', 'mag'].reduce((b, k) => servantParam(TACTICS[k].stat) > servantParam(TACTICS[b].stat) ? k : b, 'str'); }
    if (cmd === 'seal_np') { tac = 'np'; npFree = true; sealBoost = 20; }
    if (cmd === 'seal_endure') { tac = 'guard'; sealBoost = 30; sv.hp = Math.max(sv.hp, Math.round(servantHpMax() * 0.7)); }
  }

  // 撤退
  if (cmd === 'flee') {
    if (G.items.smoke > 0) { item('smoke', -1); return escape(log.concat(['煙幕の護符を地面に叩きつけた。濃い霧に紛れて離脱する。'])); }
    const mine = (servantParam(2) + servantParam(4)) / 2 + rand(1, 40) + 5;
    const theirs = rivalParam(r, 2) + rand(1, 40);
    if (mine >= theirs) return escape(log.concat([`${P}があなたを抱えて跳んだ。どうにか逃げ切れた。`]));
    log.push(`撤退に失敗！ ${E}に回り込まれた。`);
    const dmg = rand(10, 18); shp(-dmg); log.push(`${P}は${dmg}のダメージを受けた。`);
    return afterRound(log);
  }

  // マスターの行動
  let mBonus = 0; const ma = isShirou() ? (['potion', 'gem', 'crystal'].includes(B.mact) ? B.mact : null) : B.mact; B.mact = 'command';
  if (isShirou()) mBonus = applyShirouAct(log, E);
  if (ma === 'command') mBonus = 5;
  if (ma === 'boost') { od(-15); mBonus = 14; log.push(`強化魔術で${P}の霊基を後押しした。`); }
  if (ma === 'heal') { od(-20); shp(25); log.push(`治癒魔術で${P}の傷を塞いだ。（HP+25）`); }
  if (ma === 'potion') { item('potion', -1); shp(35); log.push(`治癒の霊薬を使った。（HP+35）`); }
  if (ma === 'gem') { item('gem', -1); mBonus += 12; r.hp -= 10; log.push(`宝石を投げ放つ。炸裂した魔力が${E}を撃った！（10ダメージ）`); B.fxq.push({ type: 'hit', side: 'en', dmg: 10 }); }
  if (ma && ma.startsWith('sp_')) mBonus += castSpell(ma.slice(3), log, E);
  if (ma === 'crystal') { item('crystal', -1); mp(40); log.push(`魔力結晶を砕き、${P}に魔力を流し込んだ。（魔力+40）`); }

  // スキル（自分が選んだもの・敵のAI）と、行動封じ
  if (B.skill != null) { skillActivate('me', B.skill, log); B.skill = null; }
  enemySkillAI(log);
  let stunMe = 0, stunEn = 0, enStunned = false;
  if (B.stun.en) { B.stun.en = false; log.push(`<span class="note">${E}は身動きが取れない！ 守りもおぼつかない。</span>`); et = 'guard'; stunEn = -20; enStunned = true; }
  if (B.stun.me) { B.stun.me = false; stunMe = -12; log.push(`<span class="note">${P}の動きが鈍っている……！</span>`); }
  npTick(log);

  // 宝具の宣言
  if (tac === 'np') {
    if (!npFree) sv.mp -= npCost('me');
    if (!sv.exposed) { sv.exposed = true; log.push(`<span class="note">宝具の解放により、${P}の真名が敵に知られた。</span>`); }
    log.push(`<b>「${me.np}（${me.npRuby}）――！」</b>`);
    B.fxq.push({ type: 'np', side: 'me', name: me.np, ruby: me.npRuby, who: me.short, cls: me.cls });
    npOnUse('me', log);
  }
  if (et === 'np') {
    if (B.enforcer) B.enfNp = true;
    r.mp -= npCost('en');
    const en = servantOf(r);
    log.push(`${E}が宝具を解き放つ。<b>「${en.np}（${en.npRuby}）！」</b>`);
    B.fxq.push({ type: 'np', side: 'en', name: en.np, ruby: en.npRuby, who: en.short, cls: r.cls });
    if (!knowsName(r)) { r.intel = 3; log.push(`<span class="note">その宝具は――${en.name}！ 敵の真名が判明した。</span>`); addLog(`${r.cls}の真名「${en.name}」が判明。`); }
    npOnUse('en', log);
  }
  // 攻撃しない宝具：守護は守りの構えとして判定し、支援・弱体・結界は宝具の力を纏ったまま得意な戦い方で攻める
  const follow = { me: false, en: false };   // 宝具の力を纏った攻め（判定+15・ダメージ+8）
  if (tac === 'np' && !npOf('me').atk) { tac = npFollow('me'); follow.me = tac !== 'npg'; if (tac !== 'npg') log.push(`<span class="note">${P}は宝具の力を纏ったまま、${TACTICS[tac].name}で攻めかかる。</span>`); }
  if (et === 'np' && !npOf('en').atk) { et = npFollow('en'); follow.en = et !== 'npg'; if (et !== 'npg') log.push(`<span class="note">${E}は宝具の力を纏ったまま、${TACTICS[et].name}で攻めかかる。</span>`); }

  // 敵マスターの令呪（追い詰められると使う）
  let eSeal = 0;
  if (!B.enemySeal && r.seals > 0 && r.hp < r.hpMax * 0.35 && Math.random() < 0.6) {
    B.enemySeal = true; r.seals--; eSeal = 25; r.hp = Math.min(r.hpMax, r.hp + 25);
    log.push(`<span class="note">${B.beast ? '白い鱗が脈打ち、傷が満たされていく。' : B.boss ? '泥が脈打ち、傷が塞がっていく。' : `敵マスターの令呪が輝いた！ ${E}の傷が癒え、力が増す。`}（敵HP+25）</span>`);
  }

  // 人類悪：正体を知らなければ、聖杯の残り香から魔力を吸い上げる
  if (B.beast && !G.flags.grailBeast && B.round <= 4) { r.hp = Math.min(r.hpMax, r.hp + 10); log.push('<span class="note">獣が、空の杯から最後の魔力を吸い上げた。（敵HP+10）</span>'); }

  // ---- 補正値 ----
  const first = B.round === 1;
  const myMod = classAffinity(me.cls, r.cls) + Math.floor(sv.bond / 8) + (sv.special ? 5 : 0) + Math.floor(G.master.stats.mag / 20)
    + (['mercenary', 'executor'].includes(G.master.birth) ? 4 : 0) + (G.master.birth === 'fujimaru' ? 6 : 0) + (G.master.birth === 'kishinami' ? 8 : 0) + (knowsName(r) ? 8 : 0)
    + (first && B.opt.ambush ? 15 : 0) + (first && B.opt.duel ? 6 : 0) + (B.opt.defend ? G.workshop * 3 : 0)
    + (B.final && G.flags.resolve === 'win' ? 6 : 0) + (B.boss && G.flags.resolve === 'destroy' ? 8 : 0) + (B.boss && G.flags.mudKnown ? 5 : 0) + (B.final && G.flags.resolve === 'pure' ? 5 : 0) + (B.beast ? (G.flags.resolve === 'beast' ? 8 : 0) + (G.flags.grailBeast ? 5 : 0) + (G.flags.serpentKnown ? 4 : 0) : 0) + (G.flags.partnerCombo && sv.special === 'partner' ? 3 : 0)
    + (!B.boss && r.id === mys().culprit && mys().culpritKnown ? 3 + (G.flags.shadowKnown ? 3 : 0) : 0)
    + sealBoost + mBonus + B.charge + skillMod('me', tac, et) + stunMe;
  const enMod = classAffinity(r.cls, me.cls) + r.power + (sv.exposed ? 6 : 0) + (first && B.opt.enemyFirst ? 12 : 0) + eSeal + B.echarge + skillMod('en', et, tac) + stunEn;
  B.charge = 0; B.echarge = 0;

  const score = (side, t, mod) => {
    if (t === 'observe') return Math.round(servantParam(2) * 0.6) + rand(1, 30) + mod;
    const st = t === 'npg' ? 5 : TACTICS[t].stat;
    const base = side === 'me' ? servantParam(st) : rivalParam(r, st);
    return base + (t === 'np' ? npScoreBonus(side) : t === 'npg' ? npOf(side).score : follow[side] ? 15 : 0) + (t === 'guard' ? 5 : 0) + rand(1, 40) + mod;
  };
  const atk = t => ['str', 'agi', 'mag', 'np'].includes(t);
  let crit = false;
  const guardT = t => t === 'guard' || t === 'npg';
  const dmgCalc = (diff, t, defEnd, luck, mul = 1, side = 'me') => {
    let d = Math.round((10 + diff * 0.5 + (t === 'np' ? npDmgBonus(side) : follow[side] && t !== 'guard' ? 8 : 0) - defEnd / 10) * mul);
    crit = false;
    if (Math.random() * 100 < luck / 2) { d = Math.round(d * 1.5); log.push('会心の一撃！'); crit = true; }
    return Math.max(4, d);
  };
  const hitEnemy = (d, t) => { B.sureHit = t === 'np' && npOf('me').has('sure'); d = skillDamage('en', d, log); B.sureHit = false;
    if (d <= 0) return; r.hp -= d; log.push(winText(t, P, E) + `（${d}ダメージ）`); B.fxq.push({ type: 'hit', side: 'en', dmg: d, crit }); if (t === 'np') npOnHit('me', log); };
  const hitMe = (d, t) => { B.sureHit = t === 'np' && npOf('en').has('sure'); d = skillDamage('me', d, log); B.sureHit = false;
    if (d <= 0) return; if (B.aias) { d = Math.max(1, Math.round(d * 0.3)); log.push('<span class="note">七枚の花弁が、攻撃の大半を受け止めた！</span>'); }
    shp(-d); log.push(winText(t, E, P) + `（${d}ダメージ）`); B.fxq.push({ type: 'hit', side: 'me', dmg: d, crit }); if (t === 'np') npOnHit('en', log); };
  const tname = t => t === 'npg' ? '宝具' : TACTICS[t].name;
  const pierceNp = (side, t) => t === 'np' && npOf(side).has('pierce');

  // ---- 敵マスターを狙う ----
  if (tac === 'master') {
    NOTES = []; tone('evil');
    const mine = servantParam(2) + rand(1, 40) + (isAssassin() ? 20 : -8) + mBonus + buffSum('me', 'master') + Math.ceil(classSkillV(me, '気配遮断') / 2);
    const guardS = Math.round(rivalParam(r, 2) * 0.5) + r.power * 3 + rand(1, 40) + (guardT(et) ? 15 : 0);
    log.push(`<span class="note">${P}：敵マスターへ（${mine}）　対　${E}：護衛（${guardS}）</span>`);
    if (mine >= guardS && (isAssassin() || r.hp <= r.hpMax * 0.4)) {
      r.hp = 0; r.masterDead = true; r.killed = true;
      log.push(`${P}の刃が${E}の脇をすり抜け、マスターの${esc(r.master)}を捉えた。供給を断たれた${E}が崩れ落ちる。`);
      log.push(...takeNotes()); return afterRound(log);
    }
    if (mine >= guardS) {
      r.power -= 3; r.hp -= 12;
      log.push(`${esc(r.master)}に手傷を負わせた！ 支援が途切れ、${E}の動きが鈍る。（敵の強さ低下・12ダメージ）`);
    } else {
      log.push(`読まれていた！ ${E}がマスターを庇い、カウンターを放つ。`);
      if (atk(et)) hitMe(dmgCalc(rand(5, 20), et, servantParam(1), rivalParam(r, 4), 1.2, 'en'), et);
    }
    log.push(...takeNotes()); return afterRound(log);
  }

  // ---- 通常の解決 ----
  const mine = score('me', tac, myMod);
  const theirs = score('en', et, enMod);
  if (atk(tac) && atk(et)) {
    let m2 = mine, t2 = theirs;
    if (tac !== 'np' && et !== 'np') {
      if (TACTICS[tac].beats === et) { m2 += 15; log.push(`<span class="note">${TACTICS[tac].name}が${TACTICS[et].name}を制した！（+15）</span>`); }
      if (TACTICS[et].beats === tac) { t2 += 15; log.push(`<span class="note">${TACTICS[et].name}に${TACTICS[tac].name}を制された！（敵+15）</span>`); }
    }
    log.push(`<span class="note">${P}：${TACTICS[tac].name}（${m2}）　対　${E}：${TACTICS[et].name}（${t2}）</span>`);
    if (m2 >= t2) hitEnemy(dmgCalc(m2 - t2, tac, rankValue(servantOf(r).p[1]), servantParam(4) + 2 * skillCrit('me')), tac);
    else hitMe(dmgCalc(t2 - m2, et, servantParam(1), rivalParam(r, 4) + 2 * skillCrit('en'), 1, 'en'), et);
  } else if (atk(tac) && guardT(et)) {
    const pn = pierceNp('me', tac);
    log.push(`<span class="note">${P}：${tname(tac)}（${mine}）　対　${E}：${et === 'npg' ? '宝具の守り' : '防御'}（${theirs}）</span>`);
    if (pn) log.push(`<span class="note">宝具が、${E}の守りを貫いた！</span>`);
    if (mine >= theirs) hitEnemy(dmgCalc(mine - theirs, tac, rankValue(servantOf(r).p[1]), servantParam(4) + 2 * skillCrit('me'), pn ? 1 : skillPierce('me') || enStunned ? 0.9 : tac === 'np' ? 0.7 : 0.5), tac);
    else if (enStunned) log.push(`${E}は身動きが取れないまま、どうにか攻撃をしのいだ。`);
    else { B.echarge = 12; log.push(`${E}は攻撃を受け止めきった。反撃の気配がある。`); }
  } else if (guardT(tac) && atk(et)) {
    const pn = pierceNp('en', et);
    log.push(`<span class="note">${P}：${tac === 'npg' ? '宝具の守り' : '防御'}（${mine}）　対　${E}：${tname(et)}（${theirs}）</span>`);
    if (pn) log.push(`<span class="note">敵の宝具が、${P}の守りを貫いた！</span>`);
    if (theirs > mine) hitMe(dmgCalc(theirs - mine, et, servantParam(1), rivalParam(r, 4) + 2 * skillCrit('en'), pn ? 1 : skillPierce('en') ? 0.9 : et === 'np' ? 0.7 : 0.5, 'en'), et);
    else { B.charge = 12; log.push(`${P}は攻撃を完全に受け止めた！ 次の手番、反撃の好機だ。（+12）`); }
  } else if (tac === 'observe') {
    B.sure = true; B.charge = Math.max(B.charge, 8); r.clues = (r.clues || 0) + 1;
    if (atk(et)) {
      log.push(`<span class="note">${P}：見切り（回避${mine}）　対　${E}：${TACTICS[et].name}（${theirs}）</span>`);
      if (theirs > mine) hitMe(dmgCalc(theirs - mine, et, servantParam(1), rivalParam(r, 4) + 2 * skillCrit('en'), 0.8, 'en'), et);
      else log.push(`${P}は紙一重で攻撃をかわし、${E}の動きを見極めた。`);
    } else log.push(`互いに出方を窺う。${P}は${E}の癖を観察した。`);
    if (!knowsName(r) && !B.boss) {
      const c = chk('int', 82 - r.clues * 6);
      if (c.ok) { r.intel = 3; log.push(c.text, `あの構え、あの武具――間違いない。真名は<b>${servantOf(r).name}</b>だ！`); addLog(`${r.cls}の真名「${servantOf(r).name}」を看破。`); }
      else log.push('<span class="note">真名の手がかりを得た。（手がかり+1）</span>');
    }
    log.push('<span class="note">次の手番、敵の行動を確実に読める。（+8）</span>');
  } else if (tac === 'npg' || et === 'npg') {
    log.push(`互いに攻めの手を止め、宝具の力が戦場を満たしていく。`);
    B.charge = 5; B.echarge = 5;
  } else {
    log.push(`互いに守りを固め、睨み合いが続く。`);
    B.charge = 5; B.echarge = 5;
  }
  afterRound(log);
}
function escape(log) {
  addLog(`${rivalLabel(B.r)}陣営との戦闘から撤退。`);
  B.r.clues = (B.r.clues || 0) + 1; B = null;
  next('撤退', paras(log), advance);
}
function winText(t, a, d) {
  const lines = {
    str: [`${a}の重い一撃が${d}を捉えた！`, `${a}が真正面から${d}を押し切った！`, `火花が散る。打ち合いを制したのは${a}だ！`],
    agi: [`${a}は残像を残して${d}の死角に回り込んだ！`, `目にも留まらぬ速さで、${a}の連撃が${d}を襲う！`],
    mag: [`${a}の放った魔力の奔流が${d}を呑み込んだ！`, `${a}の術式が炸裂し、${d}を吹き飛ばした！`],
    np: [`宝具の光が夜を白く染め、${d}を薙ぎ払った！`, `伝説そのものが、${d}に牙を剥いた！`],
  };
  return pick(lines[t]);
}
function afterRound(log) {
  if (isShirou() && B) { shirouCounter(log, B.enemyNext, enemyName()); shirouDownCheck(log); B.aias = false; }
  if (B && B.enforcer) enforcerStrike(log);
  const cut = (B.fxq || []).filter(x => x.type === 'np' || x.type === 'seal');
  playQueue(cut.map(c => done => cutIn(c, done)), () => afterRoundCore(log));
}
function afterRoundCore(log) {
  const r = B.r; const sv = G.servant;
  const extra = [`<div class="blog">${log.map(t => `<p>${t}</p>`).join('')}</div>`];
  if (B.enforcer && G.master.hp <= 0) { B = null; return ending('sealed'); }   // 封印された
  if (r.hp <= 0 && B.guts.en > 0) { B.guts.en--; r.hp = 20; extra.push(`<p class="note">${enemyName()}は、倒れる寸前で踏みとどまった！（戦闘続行）</p>`); }
  if (sv.hp <= 0 && B.guts.me > 0) { B.guts.me--; sv.hp = 20; extra.push(`<p class="note">${SV()}は、倒れる寸前で踏みとどまった！（戦闘続行）</p>`); }
  if (r.hp <= 0) return battleWin(extra);
  if (sv.hp <= 0) {
    if (sv.special && !B.miracle) {
      B.miracle = true; sv.hp = 25;
      extra.push(`<p class="quote">${say('notYet')}</p><p>絆の力が、消えかけた霊基を繋ぎ止めた。（HP 25で踏みとどまった）</p>`);
    } else return battleLoseChoice(extra);
  }
  skillTick();
  planEnemy();
  battleScene(extra);
}
function battleLoseChoice(extra) {
  const choices = [];
  if (G.master.seals > 0) choices.push({ label: '令呪：「立ち上がれ」', hint: `令呪-1（残${G.master.seals}）`, cls: 'danger', fn: () => {
    G.master.seals--; G.servant.hp = Math.round(servantHpMax() * 0.4); addLog('令呪で消滅寸前のサーヴァントを繋ぎ止める。');
    planEnemy(); battleScene([`<p>令呪の魔力が${SV()}の霊基を強引に繋ぎ止めた。${SV()}は再び立ち上がる！</p>`]);
  } });
  if (G.items.potion > 0 && !B.final) choices.push({ label: '霊薬を飲ませて退く', hint: '霊薬-1・撤退', fn: () => {
    item('potion', -1); G.servant.hp = 15; escape([`霊薬で辛うじて霊基を保ち、${SV()}は最後の力であなたを抱えて退いた。`]);
  } });
  choices.push({ label: '……ここまでか', fn: () => { const boss = B.boss, beast = B.beast, enf = B.enforcer; B = null; ending(enf ? 'sealed' : beast ? 'saturated' : boss ? 'devoured' : 'lost'); } });
  sfx('lose');
  scene({ title: '霊核の危機', sub: 'CRISIS', body: [...extra, `<p>${SV()}が膝をつく。霊基が崩れ始めている――このままでは消滅する！</p>`], choices });
}
function battleWin(extra) {
  if (B.enforcer) return enforcerWin();
  const r = B.r; const wasFinal = B.final; const boss = B.boss; const beast = B.beast; B = null;
  sfx('win');
  if (!boss) showCard({ kicker: 'VICTORY', title: '勝利', sub: `${rivalLabel(r)}陣営を撃破`, cls: 'victory', ms: 1300 });
  if (beast) return ending('beastSlain');
  if (boss) return ending(G.servant.special ? 'destroySpecial' : 'destroy');
  r.alive = false; r.hp = 0; G.kills++;
  NOTES = []; bond(5);
  const body = [...extra, `<p>${rivalLabel(r)}の霊基が砕け、光の粒となって夜空に溶けていく。<b>勝利だ。</b></p>`];
  if (r.friend) { G.flags.friendDefeated = true; body.push(`<p class="quote">「……負けちゃった。強くなったね」</p><p>${friendName()}は泣きながら笑っていた。</p>`); }
  addLog(`${rivalLabel(r)}陣営（${servantOf(r).name}）を撃破。`);
  if (r.bounty) { G.master.seals++; body.push('<p>教会からの討伐令を果たした。報酬として令呪が一画、右手に刻まれた。（令呪+1）</p>'); }
  const spoils = rand(1, 3); money(spoils); body.push(`<p class="note">敵の拠点から資金を回収した。（+${spoils}万円）</p>`);
  body.push(...paras(takeNotes()));
  const finish = () => (wasFinal || aliveRivals().length === 0) ? victoryScene() : advance();
  if (r.masterDead) return next('勝利', body, finish);
  const choices = [
    { label: 'マスターを教会へ送る', hint: '秩序・善', fn: () => { NOTES = []; tone('law'); tone('good');
      next('戦いの後', paras([`${esc(r.master)}は力なく頷き、教会へと去っていった。`, ...takeNotes()]), finish); } },
    { label: '残った令呪を奪う', hint: '悪 / 令呪+1', disabled: r.seals < 1, fn: () => { NOTES = []; tone('evil'); G.master.seals++; r.masterDead = true;
      next('戦いの後', paras([`${esc(r.master)}の腕から令呪を奪い取った。（令呪+1）`, ...takeNotes()]), finish); } },
    { label: '何も言わず立ち去る', hint: '混沌', fn: () => { NOTES = []; tone('chaos');
      next('戦いの後', paras(['敗者に掛ける言葉はない。あなたは振り返らずに、その場を後にした。', ...takeNotes()]), finish); } },
  ];
  scene({ title: '勝利', sub: 'VICTORY', body, choices });
}

// ---------------- 戦闘の演出 ----------------
// 宝具・令呪のカットイン
function cutIn(c, done) {
  if (c.type === 'np') {
    sfx('np');
    return showCard({ kicker: `${c.who}　宝具解放`, ruby: c.ruby, title: c.name, cls: `np ${c.side === 'en' ? 'enemy' : ''}`, color: classColor(c.cls), ms: 1700 }, done);
  }
  sfx('seal');
  showCard({ kicker: '令呪をもって命ずる', title: `「${c.order}」`, cls: 'seal', ms: 1500 }, done);
}
// HPバーの減少・ダメージ数字・揺れ
function animateBattle() {
  const q = (B && B.fxq) || []; if (B) { B.fxq = []; B.anim = null; }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; });
    document.querySelectorAll('.bar .lag').forEach(el => { const to = el.nextElementSibling && el.nextElementSibling.dataset.w; if (to) setTimeout(() => { el.style.width = to + '%'; }, 450); });
    let i = 0;
    for (const e of q) {
      if (e.type !== 'hit') continue;
      const box = document.getElementById(e.side === 'me' ? 'f-me' : 'f-en'); if (!box) continue;
      const n = document.createElement('span'); n.className = `dmg ${e.crit ? 'crit' : ''}`; n.textContent = `-${e.dmg}`;
      n.style.animationDelay = `${i * 160}ms`; box.appendChild(n); i++;
      if (CFG.fx) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
      sfx(e.crit ? 'crit' : 'hit');
    }
  }));
}
// 三すくみの図（読めた敵の構えを赤く示す）
function triangleSVG(tellKey) {
  const node = (k, x, y, label) => `<g class="tri-node ${tellKey === k ? 'tell' : ''}"><circle cx="${x}" cy="${y}" r="15"/><text x="${x}" y="${y + 4}">${label}</text></g>`;
  const arrow = (x1, y1, x2, y2) => `<path class="tri-arrow" d="M${x1} ${y1}L${x2} ${y2}" marker-end="url(#ah)"/>`;
  return `<div class="tri"><svg viewBox="0 0 150 92" aria-label="三すくみ：白兵は魔術に、魔術は機動に、機動は白兵に強い">
    <defs><marker id="ah" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L6 3L0 6z" class="tri-head"/></marker></defs>
    ${arrow(64, 22, 95, 64)}${arrow(92, 76, 58, 76)}${arrow(42, 64, 64, 28)}
    ${node('str', 75, 18, '白兵')}${node('mag', 108, 74, '魔術')}${node('agi', 42, 74, '機動')}
  </svg><div class="tri-text">矢印の先に強い。<br>${tellKey && TACTICS[tellKey] && ['str', 'agi', 'mag'].includes(tellKey) ? `<b>読めた構え：${TACTICS[tellKey].name}</b>` : tellKey === 'np' ? '<b>宝具が来る</b>' : tellKey === 'guard' ? '<b>敵は防御の構え</b>' : '敵の構えは読めていない'}</div></div>`;
}
function sealGlyphs() {
  return `<div class="seal-glyphs">${[0, 1, 2].map(i => `<svg viewBox="0 0 18 22" class="${i < G.master.seals ? 'on' : ''}"><path d="${SEAL_PATH}"/></svg>`).join('')}</div>`;
}

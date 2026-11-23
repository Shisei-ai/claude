// =============================================================
//  actions.js … 行動選択（ハブ）と、各行動の中身
//  聖杯戦争中は「何を優先するか」が戦略になります。
//   情報（真名を暴く） / 陣地（守りを固める） / 道具（戦闘の切り札）
//   絆（サーヴァントの力を引き出す） / 攻勢（敵を減らす）
// =============================================================

function hub() {
  G.tmpRival = null;
  saveGame();
  const flavor = pick(FLAVOR[isNight() ? 'night' : 'day']);
  const body = [`<p>${flavor}</p>`];
  let acts;
  if (G.phase === 'prep') {
    body.push(`<p class="note">召喚の夜まで、あと${PREP_DAYS - G.day + 1}日。能力を鍛え、触媒を探し、召喚陣を整えよう。</p>`);
    acts = isNight() ? prepNightActions() : prepDayActions();
  } else {
    body.push(statusLine());
    const last = aliveRivals().find(r => r.siege);
    if (last) body.push(`<p class="note">最後の敵・${rivalLabel(last)}陣営は天降山に籠城している。決戦は<b>${FINAL_DAY}日目の夜</b>。それまでに力を蓄えよう。</p>`);
    else if (G.day >= FINAL_DAY - 2) body.push(`<p class="note">聖杯の降臨が近い。残り一陣営になれば、${FINAL_DAY}日目以降の夜に天降山で決戦となる。</p>`);
    acts = isNight() ? warNightActions() : warDayActions();
  }
  scene({ title: isNight() ? '夜の行動' : '昼の行動', sub: `${phaseLabel()}・${G.day}日目`, body, choices: acts });
}
function statusLine() {
  const sv = G.servant; const allies = aliveRivals().length - hostileRivals().length;
  const items = Object.keys(ITEMS).filter(k => G.items[k]).map(k => `${ITEMS[k].name}×${G.items[k]}`).join('　') || 'なし';
  return `<div class="status-box">
    <div><span>敵陣営</span><b>${hostileRivals().length}</b>${allies ? `<em>同盟${allies}</em>` : ''}</div>
    <div><span>${SV()}</span><b>${sv.hp}</b><em>/${servantHpMax()}</em></div>
    <div><span>英霊の魔力</span><b>${sv.mp}</b></div>
    <div><span>オド</span><b>${G.master.od}</b><em>/${odMax()}</em></div>
    <div class="wide"><span>陣地</span>Lv${G.workshop}・罠${G.traps}　<span>道具</span>${items}</div>
  </div>`;
}
// 行動の結果を表示して、コマを進める
function actResult(title, fn) {
  NOTES = [];
  const res = [].concat(fn()).filter(Boolean).concat(takeNotes());
  next(title, paras(res), advance);
}
// サブメニュー（「やめる」で行動選択に戻る）
function submenu(title, sub, text, choices) {
  choices.push({ label: 'やめる', fn: hub });
  scene({ title, sub, body: paras([].concat(text)), choices });
}

// =============================================================
//  準備期間
// =============================================================
function prepDayActions() {
  return [
    { label: '体を鍛える', hint: '体力↑ 精神↑', fn: () => actResult('鍛錬', () => { const n = rand(3, 5); gain('phy', n); gain('spi', 1);
      return `早朝の御影川の河川敷を走り込んだ。（体力+${n} 精神+1）`; }) },
    { label: '魔術の修練', hint: '魔力↑（精神判定）', fn: () => actResult('魔術の修練', studyMagic) },
    { label: '書庫で調べもの', hint: '知力↑ 触媒の手がかり', fn: () => actResult('調べもの', () => {
      const n = rand(3, 5); gain('int', n);
      if (Math.random() < 0.2) { const c = giveCatalyst(); return [`市立図書館の郷土資料室で調べものをした。（知力+${n}）`, `古い寄贈品目録を辿り、<b>${c}</b>の在処を突き止めて入手した！`]; }
      return `市立図書館で英霊の伝承を調べた。（知力+${n}）`; }) },
    { label: '街を歩く', hint: '出来事が起きやすい', fn: () => walkTown('day') },
    { label: 'アルバイト', hint: '資金↑ 交渉↑', fn: () => actResult('アルバイト', () => { const n = rand(2, 3); money(n); gain('cha', 1);
      return `駅前の喫茶店で働いた。（資金+${n}万円 交渉+1）`; }) },
    { label: '買い出し', hint: '霊薬・宝石などの道具', fn: shopMenu },
  ];
}
function prepNightActions() {
  return [
    { label: '召喚陣の準備', hint: `召喚の質↑（${G.ritual}/3）`, disabled: G.ritual >= 3, fn: () => actResult('召喚陣の準備', () => {
      G.ritual++; gain('mag', 1);
      return [`工房の床に、銀と水銀で召喚陣を描き込んでいく。（召喚の準備 ${G.ritual}/3 魔力+1）`,
        '<span class="note">準備が整うほど、召喚したサーヴァントとの最初の絆と魔力が高まる。</span>']; }) },
    { label: '魔術の修練', hint: '魔力↑（精神判定）', fn: () => actResult('魔術の修練', studyMagic) },
    { label: '夜の街を歩く', hint: '危険と出会い', fn: () => walkTown('night') },
    { label: '眠る', hint: 'HP回復', fn: () => actResult('休息', () => { hp(30); gain('spi', 1); return '早めに床についた。（HP+30 精神+1）'; }) },
  ];
}
function studyMagic() {
  const r = chk('spi', 45);
  if (r.ok) { const n = rand(3, 5); gain('mag', n); gain('int', 1); return [r.text, `魔術回路を酷使し、術式の精度を高めた。（魔力+${n} 知力+1）`]; }
  hp(-10); gain('mag', 1); return [r.text, '魔力の制御を誤り、回路が焼けるように痛んだ。（HP-10 魔力+1）'];
}
function walkTown(t) {
  const ev = drawEvent(t);
  if (ev && Math.random() < 0.85) return showEvent(ev, advance);
  actResult('散策', () => { gain('luk', 1); return `${pick(CITY.places)}を歩いた。特に何も起きなかったが、街の地理に詳しくなった。（幸運+1）`; });
}

// ---- 買い出し（何個か買ってからコマを終える） ----
function shopMenu(bought = 0) {
  const choices = Object.entries(ITEMS).map(([k, it]) => ({
    label: `${it.name}を買う`, hint: `${it.cost}万円・所持${G.items[k] || 0}/${ITEM_MAX}`,
    disabled: G.master.money < it.cost || (G.items[k] || 0) >= ITEM_MAX,
    fn: () => { money(-it.cost); item(k, 1); shopMenu(bought + 1); },
  }));
  if (bought) choices.push({ label: '買い物を終える', cls: 'primary', fn: advance });
  else choices.push({ label: 'やめる', fn: hub });
  scene({ title: '買い出し', sub: 'SHOP', body: [
    `<p>旧城下町の裏通りに、魔術師向けの品を扱う店がある。所持金は<b>${G.master.money}万円</b>。</p>`,
    `<div class="item-list">${Object.values(ITEMS).map(it => `<div><b>${it.name}</b><span>${it.desc}</span></div>`).join('')}</div>`,
    bought ? `<p class="note">${bought}点購入した。</p>` : '',
  ], choices });
}

// =============================================================
//  聖杯戦争：昼の行動
// =============================================================
function warDayActions() {
  const acts = [
    { label: `${SV()}と過ごす`, hint: '絆↑（好みに合わせると大きく上がる）', fn: hangoutMenu },
    { label: '情報を集める', hint: '敵の正体・拠点・真名を探る', fn: intelMenu },
    { label: '真相を調べる', hint: solved() ? `真相は判明済み・手がかり${mys().ev}` : `街の謎と聖杯の秘密・手がかり${mys().ev}`, icon: 'study', fn: mysteryMenu },
    { label: '拠点を整える', hint: '結界・罠・霊脈', fn: baseMenu },
    { label: '買い出し', hint: '戦闘用の道具', fn: shopMenu },
    ...(isShirou() ? [{ label: 'セイバーに食事を作る', hint: '絆↑・英霊の魔力↑（魔力供給の代わり）', icon: 'bond', fn: cookForSaber },
      { label: '冬木に電話する', hint: `遠坂${heroines().rin}・桜${heroines().sakura}（絆）`, icon: 'bond', fn: callHomeMenu }] : []),
    { label: 'マスターの鍛錬', hint: '体力・魔力・知力', fn: trainMenu },
  ];
  const allyTargets = hostileRivals().filter(r => r.intel >= 1);
  if (allyTargets.length && hostileRivals().length >= 3 && !aliveRivals().some(r => r.ally))
    acts.push({ label: '同盟を持ちかける', hint: '交渉判定・一時休戦', fn: allianceMenu });
  acts.push({ label: '休息', hint: 'HP・魔力・オド回復', fn: () => actResult('休息', () => { hp(25); shp(20); mp(15); od(15);
    return `拠点で体を休めた。（HP+25 ${SV()}のHP+20 魔力+15 オド+15）`; }) });
  return acts;
}

// ---- 情報収集：方法によって得意・不得意がある ----
function intelMenu() {
  const can = G.flags.registered && (G.flags.churchDay || 0) + 3 <= G.day;
  const research = hostileRivals().filter(r => r.intel >= 1 && !knowsName(r));
  submenu('情報を集める', 'INTEL', [
    '<p>どうやって探る？　情報は①マスター判明 → ②拠点判明（襲撃できる） → ③真名判明（戦闘で大きく有利）の順に進む。</p>',
  ], [
    { label: '街で聞き込み', hint: `交渉判定（交渉${G.master.stats.cha}）`, fn: () => actResult('聞き込み', () => {
      const r = chk('cha', 55);
      if (!r.ok) return [r.text, '噂話ばかりで、有力な手がかりは得られなかった。'];
      return [r.text, intelRandom(1) || 'これ以上、新しい情報は見つからなかった。'];
    }) },
    { label: '使い魔を放つ', hint: `魔力判定・オド-10（残${G.master.od}）`, disabled: G.master.od < 10, fn: () => actResult('使い魔', () => {
      od(-10); const r = chk('mag', 58);
      if (!r.ok) return [r.text, '使い魔は他陣営の結界に焼かれてしまった。'];
      const t = [intelRandom(1)]; if (r.margin >= 20) t.push(intelRandom(1));
      return [r.text, '鴉の使い魔が、夜通し街を見張ってくれた。', ...t.filter(Boolean)];
    }) },
    { label: '文献で真名を探る', hint: research.length ? '知力判定・戦った相手ほど易しい' : '対象なし（マスター判明が必要）', disabled: !research.length, fn: researchMenu },
    { label: '教会を頼る', hint: G.flags.registered ? (can ? '確実に情報が得られる（3日に1度）' : '数日待つ必要がある') : '教会への登録が必要', disabled: !can, fn: () => actResult('教会', () => {
      G.flags.churchDay = G.day;
      const r = hostileRivals().filter(x => x.intel < 3).sort((a, b) => a.intel - b.intel)[0];
      if (!r) return `${CAST.sister}は首を振った。「お伝えできることは、もうありません」`;
      r.intel = Math.min(3, r.intel + 1);
      return [`${CAST.sister}は少し迷ってから、資料を一枚差し出した。「……公平を期すため、です」`, intelText(r)];
    }) },
  ]);
}
function researchMenu() {
  const list = hostileRivals().filter(r => r.intel >= 1 && !knowsName(r));
  submenu('文献調査', 'RESEARCH', '<p>どの陣営のサーヴァントを調べる？　戦ったり、見切ったりした回数（手がかり）が多いほど成功しやすい。</p>',
    list.map(r => {
      const diff = researchDiff(r);
      return { label: `${r.cls}を調べる`, hint: `目標${diff}・手がかり${r.clues || 0}`, fn: () => actResult('文献調査', () => {
        const c = chk('int', diff);
        if (!c.ok) { r.clues = (r.clues || 0) + 1; return [c.text, '決め手に欠けた。だが、候補はいくつかに絞り込めた。（手がかり+1）']; }
        r.intel = 3; addLog(`${r.cls}の真名「${servantOf(r).name}」を看破。`);
        return [c.text, `伝承と照らし合わせて確信した。${r.cls}の真名は<b>${servantOf(r).name}</b>だ！`, `<span class="note">${servantOf(r).desc}</span>`];
      }) };
    }));
}
function researchDiff(r) { return Math.max(40, 78 - (r.clues || 0) * 8 - (r.intel >= 2 ? 5 : 0)); }

// 情報を1段階進める：1=マスター判明 2=拠点判明 3=真名判明
function intelRandom(n) {
  const cand = aliveRivals().filter(r => r.intel < 3);
  if (!cand.length) return '';
  const r = pick(cand); r.intel = Math.min(3, r.intel + n);
  return intelText(r);
}
function intelText(r) {
  if (r.intel === 1) return `${r.cls}陣営のマスターは<b>${esc(r.master)}</b>――${r.type}だと分かった。`;
  if (r.intel === 2) return `${r.cls}陣営の拠点を突き止めた。夜に襲撃を仕掛けられる。`;
  addLog(`${r.cls}の真名「${servantOf(r).name}」を看破。`);
  return `${r.cls}の真名は<b>${servantOf(r).name}</b>だ！ 伝承から弱点が見えてきた。（戦闘で有利になる）`;
}

// ---- 拠点 ----
function baseMenu() {
  const leyline = G.flags.leyline || G.master.birth === 'shrine';
  submenu('拠点を整える', 'BASE', [`<p>拠点で戦うと、陣地Lvに応じて毎手番有利になる。罠は迎撃戦の最初に敵へダメージを与える。陣地は毎日の回復量も増やす。</p>`], [
    { label: '結界を強化する', hint: G.workshop >= 5 ? '最大' : `資金-2・陣地Lv${G.workshop}→${Math.min(5, G.workshop + (leyline ? 2 : 1))}`, disabled: G.workshop >= 5 || G.master.money < 2,
      fn: () => actResult('陣地作成', () => { money(-2); G.workshop = Math.min(5, G.workshop + (leyline && G.workshop < 4 ? 2 : 1));
        return `拠点の結界を張り直し、魔力の溜まり場を整えた。（陣地Lv ${G.workshop}）`; }) },
    { label: '罠を仕掛ける', hint: G.traps >= 3 ? '最大' : `資金-1・罠${G.traps}→${G.traps + 1}`, disabled: G.traps >= 3 || G.master.money < 1,
      fn: () => actResult('罠', () => { money(-1); G.traps++; return `拠点の周囲に、魔力に反応して炸裂する術式を仕込んだ。（罠 ${G.traps}）`; }) },
    { label: '霊脈から魔力を汲む', hint: leyline ? '魔力判定（易）・英霊の魔力↑' : '魔力判定・英霊の魔力↑', fn: () => actResult('霊脈', () => {
      const c = chk('mag', leyline ? 40 : 58);
      if (c.ok) { mp(40); od(10); return [c.text, `天降山から流れる霊脈を拠点へ引き込んだ。（${SV()}の魔力+40 オド+10）`]; }
      mp(10); return [c.text, '霊脈の流れは気まぐれで、わずかしか汲めなかった。（魔力+10）'];
    }) },
  ]);
}

// ---- マスターの鍛錬 ----
function trainMenu() {
  submenu('マスターの鍛錬', 'TRAINING', [`<p>マスターの魔力はサーヴァントの性能に、知力は敵の構えを読む力に、体力は自分の身を守る力に関わる。</p>`], [
    { label: '体を鍛える', hint: '体力+3 HP+10', fn: () => actResult('鍛錬', () => { gain('phy', 3); hp(10); return `${SV()}に稽古をつけてもらった。（体力+3 HP+10）`; }) },
    { label: '魔術を磨く', hint: '魔力+3（オド上限も増える）', fn: () => actResult('鍛錬', () => { gain('mag', 3); return '工房に籠もり、術式を研ぎ澄ました。（魔力+3）'; }) },
    ...(G.magic && schoolIds().length ? [{ label: '魔術の研鑽', hint: `一つの系統を深める（${schoolIds().map(id => `${SCHOOLS[id].name}Lv${masteryLv(id)}`).join('・')}）`, fn: studyMenu }] : []),
    { label: '戦術を学ぶ', hint: '知力+3', fn: () => actResult('鍛錬', () => { gain('int', 3); bond(1); return `${SV()}から、生前の戦の話を聞いた。（知力+3 絆+1）`; }) },
    { label: '資金を稼ぐ', hint: '資金+2〜4', fn: () => actResult('資金調達', () => { const c = chk('cha', 50); const n = c.ok ? 4 : 2; money(n);
      return [c.text, `日雇いの仕事をこなした。（資金+${n}万円）`]; }) },
  ]);
}

// ---- 同盟 ----
function allianceMenu() {
  submenu('同盟交渉', 'ALLIANCE', '<p>同盟を結んだ陣営とは戦わずに済む。残りが同盟相手だけになると、同盟は解消される。</p>',
    hostileRivals().filter(r => r.intel >= 1).map(r => {
      const diff = Math.round(50 + r.aggr * 30);
      return { label: `${r.cls}陣営（${esc(r.master)}）`, hint: `交渉判定 目標${diff}`, fn: () => actResult('同盟交渉', () => {
        const c = chk('cha', diff);
        if (!c.ok) { tone('law'); return [c.text, `「悪いが、手を組む気はない」${esc(r.master)}はにべもなく断った。`]; }
        r.ally = true; r.intel = Math.max(2, r.intel); tone('law'); addLog(`${r.cls}陣営と同盟を結ぶ。`);
        return [c.text, `${esc(r.master)}は少し考え、頷いた。「いいだろう。残りが減るまでは、な」<br>${r.cls}陣営と同盟を結んだ。拠点の場所も教えてもらった。`];
      }) };
    }));
}

// =============================================================
//  聖杯戦争：夜の行動
// =============================================================
function warNightActions() {
  const targets = engageable().filter(r => r.intel >= 2);
  const none = !engageable().length;
  const acts = [
    { label: '夜の巡回', hint: none ? '敵は天降山に籠城中' : '慎重 or 挑発。敵を探す', disabled: none, fn: patrolMenu, cls: 'danger' },
    { label: `${SV()}に偵察させる`, hint: none ? '敵は天降山に籠城中' : '敏捷判定で情報↑・失敗すると戦闘', disabled: none, fn: scoutMenu },
  ];
  const so = mys();   // 張り込み：呪いなら一度目撃するまで、正規なら犯人が判明するまで
  if (G.used.s_coma && ((!isPure() && !solved() && !so.clues.some(c => c.id === 'stakeout')) || (isPure() && culpritAlive() && !so.culpritKnown)))
    acts.push({ label: '事件現場に張り込む', hint: '昏睡事件の瞬間を押さえる・調査', icon: 'observe', fn: stakeoutMenu });
  if (targets.length) acts.push({ label: '敵の拠点を襲撃する', hint: '作戦を選んで仕掛ける', fn: assaultMenu, cls: 'danger' });
  acts.push(
    { label: '拠点で迎え撃つ', hint: `陣地Lv${G.workshop}・罠${G.traps}で待ち構える`, fn: defendBase },
    { label: `${SV()}と語らう`, hint: G.servant.bond >= 70 && !G.servant.special ? '何かが起きそうだ' : relationEvent() ? `絆↑・「${RELATIONS[G.servant.special].name}」の出来事が起きるかも` : '絆↑', fn: nightTalk },
    bondLinked()
      ? { label: '魔力を回復して休む', hint: '絆の繋がり：魔力・HP大回復（夜襲の危険）', icon: 'bond', fn: nightRest }
      : { label: '魔力を回復して休む', hint: '魔力・HP回復（夜襲の危険）', fn: nightRest },
  );
  return acts;
}
// 夜に拠点にいると襲われることがある
function baseAttackChance() { return 0.08 + G.day * 0.01 + (G.servant.exposed ? 0.1 : 0); }
function maybeRaided(after) {
  if (engageable().length && Math.random() < baseAttackChance()) {
    const r = wpick(engageable(), x => x.aggr);
    return next('夜襲', [`<p>結界が軋む音がした。――<b>${rivalLabel(r)}陣営</b>の襲撃だ！ 陣地の力で迎え撃つ。</p>`],
      () => startBattle(r, { defend: true }), '迎え撃つ');
  }
  after();
}

function patrolMenu() {
  submenu('夜の巡回', 'PATROL', '<p>どう動く？</p>', [
    { label: '慎重に探る', hint: '遭遇しにくいが、先に敵を見つけられる', fn: () => patrol('careful') },
    { label: '魔力を隠さず挑発する', hint: '高確率で戦闘・大胆', cls: 'danger', fn: () => patrol('bold') },
  ]);
}
function patrol(mode) {
  const foes = engageable();
  const p = mode === 'bold' ? 0.75 : 0.4;
  if (Math.random() < p && foes.length) {
    const r = wpick(foes, x => 0.5 + x.aggr);
    const seen = meet(r);
    if (mode === 'bold') {
      NOTES = []; tone('bold');
      return next('遭遇', paras([`${pick(CITY.places)}で魔力を解き放つと、すぐに応える気配があった。`,
        `――<b>${rivalLabel(r)}</b>のサーヴァントだ。マスターの${esc(r.master)}の姿もある。`, seen, `<p class="quote">「${r.quote}」</p>`, ...takeNotes()]),
        () => startBattle(r, {}), '戦う');
    }
    return scene({ title: '発見', sub: 'PATROL', body: paras([`${pick(CITY.places)}の暗がりで、先に敵の姿を捉えた。<b>${rivalLabel(r)}</b>陣営だ。まだこちらには気付いていない。`, seen]),
      choices: [
        { label: '奇襲を仕掛ける', hint: '最初の手番に大きな補正', cls: 'danger', fn: () => startBattle(r, { ambush: true }) },
        { label: '尾行して情報を得る', hint: '情報+1', fn: () => actResult('尾行', () => { r.intel = Math.min(3, r.intel + 1); r.clues = (r.clues || 0) + 1;
          return ['気付かれないよう後をつけた。', intelText(r)]; }) },
        { label: 'やり過ごす', fn: () => actResult('巡回', () => { tone('cautious'); return '息を殺して、敵が通り過ぎるのを待った。'; }) },
      ] });
  }
  if (Math.random() < 0.35) { const ev = drawEvent('night'); if (ev) return showEvent(ev, advance); }
  actResult('夜の巡回', () => {
    const t = Math.random() < (G.flags.investigate ? 0.6 : 0.35) ? intelRandom(1) : '';
    return ['静かな夜だった。敵の姿は見当たらない。', t ? '戦いの痕跡を見つけた。' + t : ''];
  });
}

function scoutMenu() {
  const bonus = isAssassin() ? 15 : 0;
  submenu('偵察', 'SCOUT', `<p>${SV()}を単独で偵察に出す。${isAssassin() ? '気配遮断を持つアサシンは偵察が得意だ。' : ''}失敗すると敵に見つかり、不利な状態で戦闘になる。</p>`,
    engageable().map(r => ({
      label: `${rivalLabel(r)}陣営を探る`, hint: `敏捷判定 目標${60 - bonus}・情報${r.intel}/3`, disabled: r.intel >= 3,
      fn: () => {
        NOTES = []; const c = schk(2, 60 - bonus);
        if (c.ok) {
          r.intel = Math.min(3, r.intel + 1); r.clues = (r.clues || 0) + 1;
          const t = [intelText(r)];
          if (c.margin >= 20 && r.intel < 3) { r.intel++; t.push(intelText(r)); }
          return next('偵察', paras([c.text, `夜明け前、${SV()}が戻ってきた。「見てきたぞ」`, ...t]), advance);
        }
        return next('偵察失敗', paras([c.text, `${SV()}の気配が敵に察知された！ ${rivalLabel(r)}陣営が迫ってくる。`]),
          () => startBattle(r, { enemyFirst: true }), '戦う');
      },
    })));
}

function assaultMenu() {
  submenu('襲撃目標', 'ASSAULT', '<p>拠点を突き止めた陣営に仕掛ける。どの陣営を狙う？</p>',
    engageable().filter(r => r.intel >= 2).map(r => ({
      label: `${rivalLabel(r)}陣営`, hint: `マスター：${esc(r.master)}　HP${r.hp}/${r.hpMax}`, cls: 'danger', fn: () => assaultPlan(r),
    })));
}
function assaultPlan(r) {
  const asn = isAssassin();
  const choices = [
    { label: '正面から攻め込む', hint: '通常の戦闘・大胆', fn: () => { NOTES = []; tone('bold');
      next('襲撃', paras([`${rivalLabel(r)}陣営の拠点へ、正面から踏み込んだ。`, ...takeNotes()]), () => startBattle(r, {}), '戦う'); } },
    { label: '気配を殺して奇襲する', hint: `${SV()}の敏捷判定 目標${asn ? 50 : 62}`, fn: () => {
      const c = schk(2, asn ? 50 : 62);
      if (c.ok) return next('奇襲', paras([c.text, '敵はまだ気付いていない。最初の一撃は、こちらのものだ。']), () => startBattle(r, { ambush: true }), '仕掛ける');
      next('奇襲失敗', paras([c.text, '気付かれた！ 迎撃の構えを取られてしまった。']), () => startBattle(r, { enemyFirst: true }), '戦う');
    } },
    { label: '先に敵の工房を崩す', hint: `マスターの魔力判定 目標60・オド-15`, disabled: G.master.od < 15, fn: () => {
      od(-15); const c = chk('mag', 60);
      if (c.ok) { r.hp = Math.max(10, r.hp - 20); r.power -= 1;
        return next('工房破壊', paras([c.text, `結界の要を撃ち抜いた。敵の陣地が崩れ、${rivalLabel(r)}は魔力の供給を乱されている。（敵HP-20・敵の強さ低下）`]), () => startBattle(r, {}), '攻め込む'); }
      next('工房破壊失敗', paras([c.text, '結界は堅かった。侵入に気付かれた！']), () => startBattle(r, { enemyFirst: true }), '戦う');
    } },
    { label: '敵マスターを暗殺する', hint: `${asn ? '気配遮断・' : ''}敏捷判定 目標${asn ? 58 : 78}・悪`, cls: 'danger', fn: () => {
      NOTES = []; tone('evil'); const c = schk(2, asn ? 58 : 78);
      if (c.ok) {
        r.alive = false; r.hp = 0; r.masterDead = true; r.killed = true; G.kills++; addLog(`${rivalLabel(r)}陣営のマスターを暗殺。`);
        return next('暗殺', paras([c.text, `${SV()}の刃が、眠る${esc(r.master)}に届いた。マスターを失った${rivalLabel(r)}は、魔力の供給を断たれ消えていった。`,
          '<span class="note">戦わずに一陣営を落とした。だが、手は血に濡れた。</span>', ...takeNotes()]), advanceOrVictory);
      }
      next('暗殺失敗', paras([c.text, `寸前で敵サーヴァントが割って入った！`, ...takeNotes()]), () => startBattle(r, { enemyFirst: true }), '戦う');
    } },
  ];
  submenu(`${rivalLabel(r)}陣営への襲撃`, 'PLAN', [`<p>作戦を決めよう。${knowsName(r) ? `敵の真名は${servantOf(r).name}。` : ''}</p>`], choices);
}
function advanceOrVictory() { if (aliveRivals().length === 0) return victoryScene(); advance(); }

function defendBase() {
  if (Math.random() < 0.5 && engageable().length) {
    const r = wpick(engageable(), x => x.aggr);
    return next('迎撃', [`<p>結界に反応。${rivalLabel(r)}陣営が攻めてきた！ 陣地の力で迎え撃つ。</p>`],
      () => startBattle(r, { defend: true }), '迎え撃つ');
  }
  actResult('待機', () => { mp(15); shp(10); od(10); return `敵は現れなかった。${G.workshop > 0 ? '結界の内で' : '灯りを落とした拠点で、息を潜めて'}魔力を蓄えた。（魔力+15 HP+10 オド+10）`; });
}
function nightRest() {
  // 絆Lv7以上：絆の繋がりが強く、パスを流れる魔力が増す
  if (bondLinked()) return maybeRaided(() => actResult('休息', () => { mp(55); shp(25); hp(15); od(10); bond(1);
    return `強く結ばれたパスを通じて、${SV()}へ魔力が淀みなく流れていく。深く、穏やかな眠りだった。（絆の繋がり：魔力+55 ${SV()}のHP+25 HP+15 オド+10）`; }));
  maybeRaided(() => actResult('休息', () => { mp(30); shp(15); hp(15); bond(1);
    return `パスを通じて${SV()}に魔力を送りながら眠った。（魔力+30 ${SV()}のHP+15 HP+15）`; }));
}

// ---- サーヴァントと過ごす ----
function bondTier() { const b = G.servant.bond; if ((isFuji() || isKishi() || isShirou()) && b < 60) return 'mid'; return b < 30 ? 'low' : b < 60 ? 'mid' : 'high'; }   // 藤丸の英霊は初対面ではない
function hangoutMenu() {
  const choices = Object.entries(ACTIVITIES).map(([k, a]) => ({
    label: a.name, hint: `${a.place}${a.cost ? `・資金-${a.cost}` : ''}`, disabled: G.master.money < a.cost,
    fn: () => hangout(k),
  }));
  submenu(`${SV()}と過ごす`, 'BOND', [`<p>今日はどう過ごそうか。${SV()}にも好みがあるようだ。</p>`,
    G.servant.bond >= 20 || isFuji() || isKishi() || isShirou() ? `<p class="note">${SV()}が好きそうなこと：${PERSONAS[servantOf(G).persona].likes.map(k => ACTIVITIES[k].name).join('、')}</p>` :
      '<p class="note">絆が深まれば、好みも分かってくるだろう。</p>'], choices);
}
function hangout(k) {
  NOTES = [];
  const a = ACTIVITIES[k]; const per = PERSONAS[servantOf(G).persona];
  money(-a.cost);
  let n = 4, react = '';
  if (per.likes.includes(k)) { n = 8; react = `${SV()}はとても楽しそうだ。`; }
  else if (per.dislikes.includes(k)) { n = 1; react = `${SV()}はあまり気乗りしない様子だった。`; }
  n += Math.floor(G.master.stats.cha / 30);
  const statGain = { eat: ['cha', 1], train: ['phy', 2], walk: ['luk', 1], talk: ['int', 1], shop: ['cha', 1], quiet: ['spi', 2] }[k];
  gain(statGain[0], statGain[1]);
  bond(n);
  const line = talkLine(per);
  next(a.name, [`<p>${a.place}で${SV()}と過ごした。${react}</p>`, `<p class="quote">${line}</p>`,
    `<p class="note">絆+${n}　${STAT_LABEL[statGain[0]]}+${statGain[1]}</p>`, ...paras(takeNotes())], advance);
}
function nightTalk() {
  const sv = G.servant;
  if (sv.bond >= 70 && !sv.special && sv.bond >= (G.flags.specialNext || 0)) return specialEvent();
  // 特別な関係になった後は、関係ごとのイベントが起きやすい（data_bond_events.js）
  const rev = relationEvent();
  if (rev && Math.random() < 0.6) return maybeRaided(() => showEvent(rev, advance));
  maybeRaided(() => {
    NOTES = [];
    const n = rand(3, 5); bond(n); mp(5);
    const per = PERSONAS[servantOf(G).persona];
    next('夜の語らい', [`<p>静かな夜。拠点の縁側で、${SV()}と言葉を交わした。</p>`, `<p class="quote">${talkLine(per)}</p>`,
      `<p class="note">絆+${n}</p>`, ...paras(takeNotes())], advance);
  });
}
function specialEvent() {
  const per = PERSONAS[servantOf(G).persona];
  const choices = Object.entries(RELATIONS).filter(([k]) => k !== 'lover' || canBeLover(servantOf(G))).map(([k, r]) => ({
    label: r.verb, hint: `関係：${r.name}`, fn: () => {
      G.servant.special = k; NOTES = []; bond(10);
      addLog(`${servantOf(G).name}と「${r.name}」の関係になる。`);
      next('特別な関係', [`<p>${fmt(r.text)}</p>`, `<p class="note">${SV()}と<b>「${r.name}」</b>になった。戦闘で絆の力が働き、エンディングにも影響する。</p>`,
        ...paras(takeNotes())], advance);
    },
  }));
  choices.push({ label: '今は、この関係のままで', fn: () => {
    G.flags.specialNext = G.servant.bond + 10;
    next('夜の語らい', [`<p>あなたは微笑んで、首を横に振った。${SV()}は少しだけ目を伏せ、「……そうか」と呟いた。</p>`,
      '<p class="note">さらに絆が深まれば、また機会が訪れるだろう。</p>'], advance);
  } });
  scene({ title: '月下の告白', sub: 'SPECIAL', body: [`<p>月の綺麗な夜だった。${SV()}がふと、真剣な顔であなたを見つめた。</p>`,
    `<p class="quote">${specialLine()}</p>`, '<p>あなたは――</p>'], choices });
}

// =============================================================
//  召喚
// =============================================================
// 英霊召喚の詠唱（原作『Fate/stay night』準拠）
const SUMMON_CHANT = [
  '素に銀と鉄。礎に石と契約の大公。<br>降り立つ風には壁を。四方の門は閉じ、王冠より出で、王国に至る三叉路は循環せよ。',
  '<ruby>閉じよ<rt>みたせ</rt></ruby>。<ruby>閉じよ<rt>みたせ</rt></ruby>。<ruby>閉じよ<rt>みたせ</rt></ruby>。<br><ruby>閉じよ<rt>みたせ</rt></ruby>。<ruby>閉じよ<rt>みたせ</rt></ruby>。<br>繰り返すつどに五度。<br>ただ、満たされる刻を破却する。',
  '――――告げる。<br>汝の身は我が下に、我が命運は汝の剣に。<br>聖杯の寄るべに従い、この意、この理に従うならば応えよ。',
  '誓いを此処に。<br>我は常世総ての善と成る者、<br>我は常世総ての悪を敷く者。',
  '汝三大の言霊を纏う七天、<br>抑止の輪より来たれ、天秤の守り手よ――！',
];
// 召喚できる英霊か（カルデアゆかりの英霊は藤丸シナリオのみ / 特殊クラスは条件付き）
function summonable(s) { if (isShirou()) return s.id === 'artoria'; if (isKishi()) return kishiLineup().includes(s.id); return (!s.chaldea || isFuji()) && extraOpen(s.cls); }
function summonScene() {
  if (isKishi()) return kishiSummonScene();
  if (isShirou()) return shirouSummonScene();
  const choices = G.catalysts.map(id => {
    const c = SV_BY_ID[id].cls; const ex = !!EXTRA_CLASSES[c];
    return { label: `「${SV_BY_ID[id].catalyst}」を使う`, hint: ex ? `特殊な気配……${extraOpen(c) ? '縁が強く応えている' : '何かが足りない気がする'}` : '縁ある英霊を喚ぶ', fn: () => chantScene(id) };
  });
  choices.push({ label: '触媒を使わない', hint: `${alignLabel()}の自分に似た英霊が応える`, fn: () => chantScene(null) });
  if (isFuji()) choices.unshift({ label: '英霊を指名して召喚する', hint: `全${SERVANTS.filter(summonable).length}騎（カルデアゆかりの英霊を含む）から選ぶ`, cls: 'primary', fn: () => pickServantScene() });
  const place = { fujimaru: 'アパートの床', heir: '家の工房', mission: G.master.birth === 'mercenary' ? '借り受けた倉庫' : '教会の地下聖堂', seeker: '自室の床' }[G.route] || '工房';
  scene({ title: '召喚の夜', sub: 'SUMMONING', body: [
    `<p>${G.route === 'seeker' ? '独学と教えを頼りに、ここまで来た。' : '準備の日々は終わった。'}今宵、聖杯戦争が始まる。</p>`,
    `<p>${place}に描いた召喚陣の前に立つ。右手の令呪が、熱を帯びて脈打っている。${G.ritual >= 3 ? '陣は完璧に仕上がっている。' : G.ritual > 0 ? '陣の準備はまずまずだ。' : '急ごしらえの陣だが、やるしかない。'}</p>`,
    G.catalysts.length ? '<p>手元には触媒がある。どれを使おうか。</p>' : '<p>触媒は手に入らなかった。縁に任せるしかない。</p>',
  ], choices });
}
// 詠唱：一節ずつ現れる
function chantScene(catalystId) {
  const lead = catalystId ? `召喚陣の中心に<b>「${SV_BY_ID[catalystId].catalyst}」</b>を置き、` : '触媒は置かない。陣の中心に立ち、';
  scene({ title: '英霊召喚', sub: 'SUMMONING', reveal: true, body: [
    `<p>${lead}右手を掲げる。全身の魔術回路に、魔力を巡らせていく。</p>`,
    ...SUMMON_CHANT.map(t => `<p class="chant">${t}</p>`),
  ], choices: [{ label: '詠唱を終える', cls: 'primary', icon: 'ritual', fn: () => doSummon(catalystId) }] });
}
function doSummon(catalystId, opt = {}) {
  let sv = null, failed = null;
  if (catalystId) {
    sv = SV_BY_ID[catalystId];
    if (!extraOpen(sv.cls)) { failed = sv; sv = null; }   // エクストラクラスは条件を満たさないと応えない
  }
  if (!sv) {
    const a = alignLabel().split('・');
    const taken = new Set(G.rivals.map(r => r.servantId));
    sv = wpick(SERVANTS.filter(s => !taken.has(s.id) && summonable(s) && s !== failed), s => {
      const [o, m] = s.align.split('・');
      let w = 1;
      if (o === a[0]) w += 1.5;
      if (m === a[1]) w += 1.5;
      // 条件を満たした特殊クラスは、クラス全体でおよそ3回に1回応えるくらいの重み
      if (!BASE_CLASSES.includes(s.cls)) w *= 60 / SERVANTS.filter(x => x.cls === s.cls && summonable(x)).length;
      if (G.flags.vision === s.id) w *= G.flags.visionStrong ? 6 : 2.5;
      return w;
    });
  }
  const reunion = (isFuji() && G.flags.fujiDream === sv.id) || (isKishi() && G.flags.kishiBond === sv.id) || (isShirou() && !!G.flags.saberDream);
  G.servant = { id: sv.id, hp: 0, mp: 60 + G.ritual * 13, bond: (opt.emergency ? 15 : 5) + G.ritual * 4 + (reunion ? 15 : 0) + (isFuji() ? FUJI_MEMORY_BOND : 0) + (isKishi() ? KISHI_MEMORY_BOND : 0) + (isShirou() ? SHIROU_MEMORY_BOND : 0), special: null, exposed: false };
  G.servant.hp = servantHpMax();
  if (!G.rivals.length) setupRivals();
  else fitRivalsToServant(sv);
  G.phase = 'war'; SLOT = {};
  if (opt.emergency) { G.day = 0; G.slot = 1; } else { G.day = 1; G.slot = 0; }
  addLog(`${sv.cls}「${servantOf(G).name}」を召喚。`);
  if (G.flags.earlyIntel) intelRandom(1);
  if (failed) addLog(`「${failed.catalyst}」の縁は、${failed.cls}の条件を満たさず届かなかった。`);
  if (!BASE_CLASSES.includes(sv.cls)) addLog(`特殊クラス「${sv.cls}」の英霊が応えた。`);
  if (reunion) addLog(`夢に見た英霊「${sv.name}」と再会する。`);
  SCENE = { kind: 'summon', sv: servantOf(G), emergency: !!opt.emergency, failed, reunion }; TAB = 'story'; render(); sfx('summon');
}
function setupRivals() {
  // 召喚前（巻き込まれルート）は7陣営すべてを用意し、召喚後に1つ減らす
  const mine = G.servant ? servantOf(G).cls : null;
  let classes = BASE_CLASSES.filter(c => c !== mine);
  if (mine && classes.length > 6) classes = shuffle(classes).slice(0, 6);
  const types = shuffle(RIVAL_TYPES);
  G.rivals = classes.map((cls, i) => {
    const pool = SERVANTS.filter(s => s.cls === cls && !s.chaldea && (!G.servant || s.id !== G.servant.id) && !(isKishi() && kishiLineup().includes(s.id)));
    let s = pick(pool); const t = types[i];
    // 衛宮士郎：第五次聖杯戦争で見た英霊が現れやすい（赤い外套のアーチャーは必ず）
    if (isShirou() && FIFTH_WAR[cls] && (cls === 'アーチャー' || Math.random() < 0.6)) s = SV_BY_ID[FIFTH_WAR[cls]];
    const r = { id: 'r' + i, cls, servantId: s.id, master: randomName(t.foreign), type: t.type, power: t.power + rand(-1, 1),
      aggr: t.aggr, quote: t.quote, alive: true, hp: 0, hpMax: 0, mp: 100, intel: 0, clues: 0, seals: 2 + rand(0, 1),
      ally: false, bounty: false, masterDead: false };
    r.hpMax = r.hp = 70 + rankValue(s.p[1]);
    return r;
  });
  applyLifeRival();   // 人生の転機の因縁の相手
  // 幼馴染もマスターに選ばれていた
  if (G.friend) {
    const r = pick(G.rivals);
    Object.assign(r, { friend: true, master: G.friend.name, type: '幼馴染', power: 6, aggr: 0.25,
      quote: G.flags.friendRival ? 'やっと決着をつけられるね。……手加減しないから！'
        : G.friend.bond >= 60 ? 'ごめん。でも、どうしても叶えたい願いがあるんだ。'
          : '……あなたとは、戦いたくなかったな。' });
  }
}
function afterSummon() {
  if (G.route === 'caught' && G.day === 0) return caughtFirstFight();
  if (isKishi()) return kishiAfterSummon();
  if (isShirou()) return shirouAfterSummon();
  if (isFuji()) return next('聖杯戦争、開幕', [
    `<p>かつての旅の記憶を取り戻した${SV()}と、改めて契約を交わした。言葉はいらない。互いの戦い方は、もう知っている。</p>`,
    '<p>七騎のサーヴァントと七人のマスター。そしてこの戦いの裏には、あなたを招いた『蒐集者』がいる。</p>',
    `<p class="note">歴戦のマスターであるあなたの下では、英霊は十二分に力を振るえる。対面した敵サーヴァントの真名も、一目で見抜けるだろう。期限は${WAR_DAYS}日。</p>`,
  ], startSlot, '戦いへ', '第一幕　開幕');
  next('聖杯戦争、開幕', [
    '<p>こうして、深見市における聖杯戦争が幕を開けた。七騎のサーヴァントと七人のマスター。生き残るのは、ただ一組。</p>',
    `<p class="note">昼は情報・陣地・道具・絆を整える時間。夜は戦いの時間。敵の真名を暴き、作戦を選んで仕掛け、最後の一組となれ。期限は${WAR_DAYS}日。</p>`,
    '<p class="note">そして――この街の聖杯には、何か秘密があるのかもしれない。それを確かめられるのは、自分の足で調べた者だけだ。（昼の「真相を調べる」）</p>',
  ], startSlot, '戦いへ', '第一幕　開幕');
}

// 巻き込まれた夜：召喚直後の最初の戦い
function caughtFirstFight() {
  const r = G.storyRival;
  scene({ title: '契約', sub: 'PROLOGUE', reveal: true, body: paras([
    `光が収まると、あなたの前に${SV()}が立っていた。振り下ろされた${r.cls}の刃を、片手で受け止めて。`,
    say('firstContract'),
    `${esc(r.master)}が舌打ちした。「最後の一騎が、こんな素人に喚ばれるとはな」`,
    '何が起きているのか、何一つ分からない。けれど、今は――',
  ]), choices: [
    { label: '「頼む、助けてくれ！」', hint: '戦闘（敵は不意を突かれている）', cls: 'danger', icon: 'battle', fn: () => { G.flags.firstFight = true; startBattle(r, { ambush: true }); } },
    { label: '一緒に逃げる', hint: 'サーヴァント敏捷判定', icon: 'flee', fn: () => {
      const c = schk(2, 50);
      if (c.ok) return next('逃走', paras([c.text, `${SV()}があなたを抱えて夜空へ跳んだ。眼下で、街の灯りがみるみる遠ざかっていく。`,
        '気付けば、自分の部屋の前に立っていた。……夢では、なかった。']), advance);
      next('逃走失敗', paras([c.text, '回り込まれた！ 戦うしかない。']), () => startBattle(r, {}), '戦う');
    } },
  ] });
}

// 先に用意した7陣営を、召喚された英霊に合わせて6陣営に整える（巻き込まれルート用）
function fitRivalsToServant(sv) {
  const dup = G.rivals.find(r => r.servantId === sv.id);
  if (dup) { const alt = SERVANTS.filter(s => s.cls === dup.cls && s.id !== sv.id && !G.rivals.some(r => r.servantId === s.id)); if (alt.length) dup.servantId = pick(alt).id; }
  if (G.rivals.length <= 6) return;
  const keep = r => r === G.storyRival || r.friend;
  const victim = G.rivals.find(r => r.cls === sv.cls && !keep(r)) || G.rivals.find(r => !keep(r));
  G.rivals.splice(G.rivals.indexOf(victim), 1);
}

// 英霊を指名して召喚する（藤丸シナリオ）
function pickServantScene(cls) {
  const classes = [...new Set(SERVANTS.filter(summonable).map(s => s.cls))];
  cls = cls || classes[0];
  const list = SERVANTS.filter(s => s.cls === cls && summonable(s));
  scene({ title: '英霊の指名', sub: 'SUMMONING', body: [
    '<p>これまでの旅で結んだ、数え切れない縁。その中から、たった一騎を選ぶ。</p>',
    `<div class="pick-cls">${classes.map(c => `<button class="chip ${c === cls ? 'on' : ''}" data-pickcls="${c}" aria-pressed="${c === cls}">${emblem(c, 14)}${c}<small>${SERVANTS.filter(s => s.cls === c && summonable(s)).length}騎</small></button>`).join('')}</div>`,
  ], choices: list.map(s => ({
    label: `${s.name}${s.chaldea ? '　★' : ''}${G.flags.fujiDream === s.id ? '　（夢）' : ''}`,
    hint: `${s.p.map((r, i) => PARAM_NAMES[i][0] + r).join(' ')}`,
    fn: () => chantScene(s.id),
  })).concat([{ label: '戻る', icon: 'flee', fn: summonScene }]) });
}

// =============================================================
//  メインシナリオ（決まった日に必ず起きる物語イベント）
//  三幕構成：
//   序章「令呪の冬」   … 準備期間。街の異変と監督役、六十年前の生き残り
//   第一幕「開幕」     … 1〜4日目。サーヴァントとの出会い、最初の敵
//   第二幕「侵蝕」     … 5〜9日目。昏睡事件、黒い影、聖杯の真実
//   第三幕「降臨」     … 10日目〜。決戦前夜、11日目以降の夜に天降山の決戦、聖杯
//
//  書式は data_events.js と同じ。違いは以下の2点。
//   phase / day / slot（0=昼 1=夜）で発生タイミングを指定
//   after: 'hub'（そのコマの行動選択へ進む） / 'advance'（そのコマを使い切る）
// =============================================================

// ---- 登場人物（オリジナル） ----
const CAST = {
  sister: 'シスター・アグネス',   // 聖ヨハネ教会の監督役
  old: '榊 宗玄',                 // 六十年前の聖杯戦争の生き残り
  miko: '天降 雫',                // 天降神社の巫女
};

// ---- 黒き聖杯の澱（隠しボス） ----
const BOSS = {
  id: 'ori', name: '黒き聖杯の澱', short: '澱', cls: '聖杯',
  p: ['A', 'EX', 'C', 'EX', 'E', 'EX'], align: '―', persona: 'berserker',
  np: 'この世全ての澱', npRuby: 'カース・オブ・フカミ', catalyst: null,
  line: '', desc: '六十年前に聖杯へ溶けた呪いの成れの果て。願いを喰らい、街を呑もうとしている。',
};

// サーヴァントの「願い」：性格ごとに、決戦前夜などで語られる
const SERVANT_WISH = {
  knight: '果たせなかった誓いを、もう一度果たしたい',
  king: '我が治世の続きを見届けること',
  warrior: '心ゆくまで戦える、最高の好敵手との一戦',
  cool: '……さあな。強いて言えば、君の願いが叶うところを見てみたい',
  gentle: '大切な人たちが、笑って暮らせる世界',
  free: 'もう一度、思いっきり生きてみたい！',
  dark: '奪われたものへの、最後の決着',
  scholar: 'まだ誰も書いていない、最高の物語の結末',
  berserker: '（言葉はない。だが、その眼差しは確かに何かを求めている）',
};

const STORY = [
  // ===================== 序章 =====================
  {
    id: 's_tremor', phase: 'prep', day: 2, slot: 1, after: 'advance',
    title: '霊脈の揺らぎ', chapter: '序章　令呪の冬',
    text: () => '深夜。地鳴りのような低い響きで目が覚めた。<br>右手の痣が熱い。窓の外、天降山の方角の空が、一瞬だけ<b>黒く</b>揺らいだように見えた。<br>――まるで、夜そのものが滲み出してきたかのように。',
    choices: [
      { label: '使い魔を天降山へ飛ばす', hint: '魔力判定', run: () => {
          const r = chk('mag', 58);
          if (r.ok) { G.flags.grailHint = true; gain('mag', 2);
            return [r.text, '使い魔の視界に、山頂の古社から黒い霧が細く立ちのぼるのが見えた。霧は霊脈に沿って、街の方へと流れていく。<br>……あれは何だ？（魔力+2）']; }
          return [r.text, '使い魔は山の中腹で何かに怯え、引き返してきた。'];
        } },
      { label: '天降神社へ向かう', hint: '体力判定', run: () => {
          const r = chk('phy', 50);
          if (r.ok) { G.flags.leyline = true; G.flags.metMiko = true; tone('bold');
            return [r.text, `夜の石段を駆け上がると、境内に白装束の少女が立っていた。巫女の${CAST.miko}だ。<br>「あなたも感じたんですね。……この山の霊脈、六十年ぶりに目を覚まそうとしています」<br>彼女から霊脈の流れを教わった。（陣地作成が得意になった）`]; }
          hp(-10); return [r.text, '暗い石段で足を滑らせた。今夜は諦めよう。（HP-10）'];
        } },
      { label: '気のせいだと眠る', run: () => { gain('spi', 2); tone('cautious'); return '布団を被り直した。……だが、夢の中でも黒い空が揺れていた。（精神+2）'; } },
    ],
  },
  {
    id: 's_sister', phase: 'prep', day: 3, slot: 0, after: 'hub',
    title: '監督役', chapter: '序章　令呪の冬',
    text: () => `丘の上の聖ヨハネ教会から呼び出しがあった。<br>ステンドグラスの光の中、銀髪の修道女が静かに振り返る。<br>「ようこそ。私は${CAST.sister}。この地の聖杯戦争の監督役を務めます」<br>彼女は淡々と規則を説明した。七人のマスターと七騎のサーヴァント。神秘の秘匿のため、戦闘は夜に限ること。脱落者は教会が保護すること。`,
    choices: [
      { label: 'マスターとして正式に登録する', hint: '秩序 / 脱落時に保護される', run: () => {
          tone('law'); G.flags.registered = true;
          return `「賢明な判断です」${CAST.sister}は名簿にあなたの名を書き記した。「教会はいつでも、あなたの相談に応じましょう」<br><span class="note">戦争中、昼の「情報収集」で教会を頼れるようになった。</span>`;
        } },
      { label: '「六十年前の戦争について聞きたい」', hint: '交渉判定', run: () => {
          G.flags.registered = true; const r = chk('cha', 60);
          if (r.ok) { G.flags.grailHint = true;
            return [r.text, `${CAST.sister}の表情が、ほんのわずかに曇った。<br>「……前回の記録は、教会にもほとんど残っていません。不自然なほどに。ただ一つ――生き残ったマスターが、まだこの街にいるとだけ」<br>登録も済ませた。`]; }
          return [r.text, '「過去の詮索は、今は不要でしょう」穏やかに、しかしきっぱりと遮られた。登録だけは済ませた。'];
        } },
      { label: '誰の指図も受けない', hint: '混沌', run: () => { tone('chaos'); return `「そうですか。……ご武運を」${CAST.sister}は、それ以上何も言わなかった。`; } },
    ],
  },
  {
    id: 's_oldman', phase: 'prep', day: 4, slot: 0, after: 'hub',
    title: '六十年前の生き残り', chapter: '序章　令呪の冬',
    text: () => `御影川の河川敷。釣り糸を垂れる老人が、あなたの右手を見て目を細めた。<br>「……その痣。わしにも昔、同じものがあった」<br>老人は${CAST.old}と名乗った。六十年前、この街で起きた最初の聖杯戦争の、ただ一人の生き残りだという。`,
    choices: [
      { label: '当時のことを詳しく尋ねる', hint: '知力判定', run: () => {
          const r = chk('int', 55);
          if (r.ok) { G.flags.grailHint = true; G.flags.oldTrust = true; gain('int', 3);
            return [r.text, '「最後に残ったのは、わしと――名前のない、呪いのような英霊じゃった。あれが聖杯に呑まれた瞬間、山が黒く染まった」<br>「あの聖杯は、願いを<b>歪めて</b>叶える。……気をつけなされ」（知力+3）']; }
          return [r.text, '老人の話は昔語りと愚痴が入り混じり、肝心なところが分からなかった。'];
        } },
      { label: '戦いの心得を教わる', hint: '体力・精神↑', run: () => { gain('phy', 2); gain('spi', 3); G.flags.oldTrust = true;
          return '「生き残る者は、退き時を知る者じゃ」老人の言葉は短く、重かった。（体力+2 精神+3）'; } },
      { label: '会釈して立ち去る', run: () => '老人は再び、黙って川面を見つめ始めた。' },
    ],
  },
  {
    id: 's_eve', phase: 'prep', day: 5, slot: 1, after: 'advance',
    title: '召喚前夜', chapter: '序章　令呪の冬',
    text: () => '明日の夜、召喚の儀を行う。準備に使える夜は、これが最後だ。<br>工房の窓から、雪のちらつく街を見下ろす。この街のどこかで、他のマスターたちも同じ夜を過ごしているのだろう。',
    choices: [
      { label: '召喚陣を仕上げる', hint: '召喚の質↑', run: () => {
          G.ritual = Math.min(3, G.ritual + 1); gain('mag', 1);
          return `夜を徹して、陣に最後の線を引いた。（召喚の準備 ${G.ritual}/3 魔力+1）`;
        } },
      { label: '最後の触媒を探しに出る', hint: '幸運判定', run: () => {
          const r = chk('luk', 62);
          if (r.ok) { const c = giveCatalyst(); return [r.text, `旧城下町の古道具屋が、閉店間際に一つの品を譲ってくれた。<b>${c}</b>だ。`]; }
          return [r.text, '雪の中を歩き回ったが、収穫はなかった。'];
        } },
      { label: '静かに覚悟を決める', hint: 'HP全快 精神↑', run: () => { hp(100); gain('spi', 3);
          return 'ゆっくりと湯に浸かり、早めに眠った。心は不思議と凪いでいる。（HP全快 精神+3）'; } },
    ],
  },

  // ===================== 第一幕「開幕」 =====================
  {
    id: 's_morning', phase: 'war', day: 1, slot: 0, after: 'hub',
    title: '最初の朝', chapter: '第一幕　開幕',
    text: () => `召喚から一夜。台所に立つと、${SV()}が窓辺から冬の街を眺めていた。<br>「おはよう、マスター。……一つ聞いておきたい。<b>君は聖杯に、何を願う？</b>」`,
    choices: [
      { label: () => `「${birthOf().wish}」と答える`, hint: '自分の願いを語る', run: () => {
          bond(4); G.flags.toldWish = true;
          return [`あなたは自分の願いを、正直に語った。`, `<p class="quote">${fmt(pick(PERSONAS[servantOf(G).persona].mid))}</p>`, `${SV()}は静かに頷いた。（絆+4）`];
        } },
      { label: '「君こそ、何を願うんだ？」', hint: 'サーヴァントの願いを聞く', run: () => {
          bond(3); G.flags.knowWish = true;
          return [`${SV()}は少し意外そうな顔をして、それから遠くを見た。`, `<p class="quote">「${SERVANT_WISH[servantOf(G).persona]}」</p>`, '（絆+3　サーヴァントの願いを知った）'];
        } },
      { label: '「今は勝つことだけ考えよう」', hint: '大胆', run: () => { tone('bold'); return `「……ああ、それも一つの答えだ」${SV()}は口の端を上げた。`; } },
    ],
  },
  {
    id: 's_first', phase: 'war', day: 2, slot: 1, after: 'advance', cond: () => hostileRivals().length > 0,
    title: '最初の邂逅', chapter: '第一幕　開幕',
    text: () => {
      const r = G.storyRival = hostileRivals().reduce((a, b) => a.aggr >= b.aggr ? a : b);
      r.intel = Math.max(r.intel, 1);
      return `買い出しの帰り道、街灯が一斉に明滅した。<br>人払いの結界。気付けば、通りには誰もいない。<br>電柱の上に、<b>${r.cls}</b>のサーヴァントが立っていた。傍らには、マスターの${esc(r.master)}――${r.type}。<br><p class="quote">「${r.quote}」</p>`;
    },
    choices: [
      { label: '迎え撃つ', hint: '戦闘', cls: 'danger', run: () => ({ text: `${SV()}が実体化し、あなたの前に立った。「下がっていろ、マスター」`, then: () => startBattle(G.storyRival, {}) }) },
      { label: '名乗りを上げ、一騎打ちを挑む', hint: '秩序・大胆 / 初撃に補正', cls: 'danger', run: () => {
          tone('law'); tone('bold');
          return { text: `${SV()}が一歩前に出て、堂々とクラスを名乗った。敵もそれに応じ、空気が張り詰める。`, then: () => startBattle(G.storyRival, { duel: true }) };
        } },
      { label: '戦わずに退く', hint: 'サーヴァント敏捷判定', run: () => {
          tone('cautious'); const c = schk(2, 55);
          if (c.ok) return [c.text, `${SV()}があなたを抱えて屋根伝いに跳んだ。追撃はない。……だが、相手の顔は覚えた。`];
          return { text: [c.text, '回り込まれた！ 戦うしかない。'], then: () => startBattle(G.storyRival, {}) };
        } },
    ],
  },
  {
    id: 's_coma', phase: 'war', day: 4, slot: 0, after: 'hub',
    title: '昏睡事件', chapter: '第二幕　侵蝕',
    text: () => `朝のニュースが、市内で原因不明の昏睡事件が相次いでいると報じていた。被害者はこの三日で十二人。全員、夜の街で倒れているのを発見されたという。<br>昼過ぎ、${CAST.sister}から連絡が入った。<br>「魂喰い――魔力の略奪の可能性があります。ですが、どのサーヴァントの痕跡とも一致しないのです」`,
    choices: [
      { label: '調査を引き受ける', hint: '善', run: () => { tone('good'); G.flags.investigate = true;
          return `「感謝します。何か分かれば、教会にも知らせてください」<br><span class="note">夜の巡回や偵察で、事件の手がかりが見つかりやすくなった。</span>`; } },
      { label: '他陣営の仕業として利用する', hint: '悪 / 敵の情報を得る', run: () => {
          tone('evil'); const r = randomHostile();
          if (r) { r.intel = Math.max(r.intel, 1); r.bounty = true;
            return `あなたは「${r.cls}陣営が怪しい」と監督役に吹き込んだ。教会は${r.cls}陣営に討伐令を出した。<br><span class="note">討伐すれば令呪が一画もらえる。</span>`; }
          return '利用できそうな陣営は見当たらなかった。';
        } },
      { label: '静観する', hint: '慎重', run: () => { tone('cautious'); return '他陣営の動きを見極めるまで、下手に動くべきではない。'; } },
    ],
  },
  {
    id: 's_shadow', phase: 'war', day: 6, slot: 1, after: 'advance',
    title: '黒い影', chapter: '第二幕　侵蝕',
    text: () => `${G.flags.investigate ? '昏睡事件を追って' : '偶然通りかかった'}港の倉庫街で、あなたは見た。<br>路地に倒れた男の上に、<b>黒い泥のような影</b>が覆いかぶさっている。影は男から何かを吸い上げ、脈打つように膨らんでいく。<br>「マスター、下がれ。あれは――サーヴァントではない」${SV()}の声が、かすかに震えていた。`,
    choices: [
      { label: '影を討つ', hint: 'サーヴァント魔力判定', cls: 'danger', run: () => {
          const c = schk(3, 60);
          G.flags.grailHint = true;
          if (c.ok) { bond(3); gain('spi', 1);
            return [c.text, `${SV()}の一撃が影を引き裂いた。影は悲鳴のような音を立てて霧散し、残滓は――天降山の方角へと流れていった。<br>男は衰弱しているが、息はある。（絆+3）`]; }
          shp(-25); return [c.text, `影は${SV()}の攻撃を呑み込み、触れた部分の霊基を侵した。どうにか追い払ったが、${SV()}の顔色は悪い。（サーヴァントHP-25）<br>逃げていく影は、天降山の方角へ消えた。`];
        } },
      { label: '倒れた男を連れて逃げる', hint: '善', run: () => {
          tone('good'); G.flags.grailHint = true; shp(-10); gain('luk', 2);
          return `${SV()}が影を牽制する間に、男を担いで大通りまで走った。振り返ると、影は霊脈の流れに沿って山の方へ退いていった。（サーヴァントHP-10 幸運+2）`;
        } },
      { label: '影を追跡する', hint: '知力判定', run: () => {
          const c = chk('int', 60); G.flags.grailHint = true;
          if (c.ok) { G.flags.shadowTrail = true;
            return [c.text, '距離を取って影の後を追った。影は霊脈を遡り、天降山の古社――聖杯が降臨するはずの場所へと吸い込まれていった。<br><b>影の正体は、聖杯そのものから漏れ出したものだ。</b>']; }
          hp(-15); return [c.text, '影を見失い、気付けば足元から泥が這い上がっていた。慌てて振り払う。（HP-15）'];
        } },
    ],
  },
  {
    id: 's_past', phase: 'war', day: 8, slot: 0, after: 'hub', cond: () => !G.flags.grailTruth,
    title: '六十年前の真実', chapter: '第二幕　侵蝕',
    text: () => `${G.flags.grailHint ? '黒い影、霊脈の異変、六十年前の戦争。' : '街の異変が、何かと繋がっている気がする。'}点と点を繋ぐために、どこを調べるべきだろうか。`,
    choices: [
      { label: () => `${CAST.old}を訪ねる`, hint: '交渉判定', run: () => {
          const c = chk('cha', G.flags.oldTrust ? 40 : 62);
          if (c.ok) { G.flags.grailTruth = true;
            return [c.text, `老人は長い沈黙の後、口を開いた。<br>「最後の英霊は、人の悪意を形にした<b>呪いそのもの</b>じゃった。聖杯はそれを呑み込み……中身ごと腐った。あの影は、聖杯から溢れた呪いじゃよ」<br>「頼む。あれを、二度と世に出してはならん」`]; }
          return [c.text, '「……話すことは何もない」老人は背を向けた。'];
        } },
      { label: '天降神社の古文書を調べる', hint: '知力判定', run: () => {
          const c = chk('int', G.flags.metMiko ? 45 : 60);
          if (c.ok) { G.flags.grailTruth = true;
            return [c.text, `${G.flags.metMiko ? `${CAST.miko}が蔵を開けてくれた。` : ''}古文書には、聖杯の器が「呪いを孕み、黒く染まった」と記されていた。<br><b>この聖杯は汚染されている。願いは、破滅の形でしか叶わない。</b>`]; }
          return [c.text, '崩し字が読めず、決定的な記述を見つけられなかった。'];
        } },
      { label: '教会の記録庫に忍び込む', hint: '幸運判定（混沌）', run: () => {
          tone('chaos'); const c = chk('luk', 55);
          if (c.ok) { G.flags.grailTruth = true; G.flags.sisterSecret = true;
            return [c.text, `封印された書庫の奥に、前回の報告書があった。「聖杯の汚染を確認。ただし、儀式の継続を優先する」――署名は教会上層部のものだ。<br><b>教会は、聖杯が汚染されていると知っていた。</b>`]; }
          gain('spi', -3); return [c.text, `足音。${CAST.sister}だ。「……ここは立入禁止です」咎めはしなかったが、その目は冷たかった。（精神-3）`];
        } },
      { label: () => `${SVname()}に聖杯の気配を探らせる`, hint: 'サーヴァント魔力判定', run: () => {
          const c = schk(3, 58);
          if (c.ok) { G.flags.grailTruth = true; bond(2);
            return [c.text, `天降山を見上げた${SV()}が、険しい顔で言った。「……あの山の下に、底なしの悪意が溜まっている。聖杯は、呪われている」`]; }
          return [c.text, '聖杯の気配は、霊脈の奥深くに隠れていて掴めなかった。'];
        } },
    ],
  },
  {
    id: 's_devoured', phase: 'war', day: 9, slot: 1, after: 'advance', cond: () => hostileRivals().length >= 3,
    title: '呑まれた陣営', chapter: '第二幕　侵蝕',
    text: () => {
      const r = G.storyRival = hostileRivals().reduce((a, b) => (a.hp / a.hpMax) <= (b.hp / b.hpMax) ? a : b);
      return `城跡公園に駆けつけた時には、もう遅かった。<br>傷ついた<b>${rivalLabel(r)}</b>のサーヴァントに、地面から湧き出した黒い泥が絡みついている。泥は霊基を喰らいながら、ずぶずぶと地中へ引きずり込んでいく。<br>マスターの${esc(r.master)}が、悲鳴を上げて手を伸ばしていた。`;
    },
    choices: [
      { label: '泥を断ち切り、助ける', hint: 'サーヴァント筋力判定（善）', cls: 'danger', run: () => {
          tone('good'); const r = G.storyRival; const c = schk(0, 62);
          r.alive = false; r.hp = 0; addLog(`${rivalLabel(r)}陣営、黒い泥に呑まれて脱落。`);
          if (c.ok) { for (const x of aliveRivals()) x.intel = Math.min(3, x.intel + 1);
            return [c.text, `${SV()}が泥を断ち切った。サーヴァントは救えなかったが、${esc(r.master)}は助け出せた。<br>「……借りができた。知っていることは全部話す」<br>彼の情報で、<b>残る全陣営の情報が一段階進んだ。</b>`]; }
          shp(-20); return [c.text, `泥は重く、${SV()}の刃は届かなかった。${rivalLabel(r)}陣営は、跡形もなく呑み込まれた。（サーヴァントHP-20）`];
        } },
      { label: '泥の動きを観察する', hint: '知力判定', run: () => {
          const r = G.storyRival; const c = chk('int', 55);
          r.alive = false; r.hp = 0; addLog(`${rivalLabel(r)}陣営、黒い泥に呑まれて脱落。`);
          if (c.ok) { G.flags.mudKnown = true;
            return [c.text, `泥は<b>傷ついたサーヴァント</b>を狙う。聖杯は、脱落者の魂を貪って満ちていく――。<br><span class="note">この戦いの仕組みが分かった。決戦で有利になるだろう。</span>`]; }
          return [c.text, `為す術もなく、${rivalLabel(r)}陣営が呑み込まれていくのを見ていることしかできなかった。`];
        } },
      { label: '今のうちに立ち去る', hint: '慎重', run: () => {
          tone('cautious'); const r = G.storyRival; r.alive = false; r.hp = 0; addLog(`${rivalLabel(r)}陣営、黒い泥に呑まれて脱落。`);
          return '背後で、何かが地面に沈む音がした。あなたは振り返らなかった。';
        } },
    ],
  },

  // ===================== 第三幕「降臨」 =====================
  {
    id: 's_eveFinal', phase: 'war', day: 10, slot: 1, after: 'hub',
    title: '決戦前夜', chapter: '第三幕　降臨',
    text: () => `天降山の頂が、夜空にうっすらと光っている。聖杯の降臨が近い。<br>拠点の屋根の上で、${SV()}が月を見上げていた。隣に座ると、${SV()}はぽつりと言った。<br><p class="quote">${fmt(pick(PERSONAS[servantOf(G).persona][bondTier()]))}</p>「……マスター。最後の戦いの前に、君の覚悟を聞かせてくれ」`,
    choices: [
      { label: '「必ず勝とう。二人で」', hint: '決戦で能力補正', run: () => { G.flags.resolve = 'win'; bond(4); tone('bold');
          return `「ああ。必ずだ」${SV()}は拳を差し出した。あなたはそれに、自分の拳を合わせた。（絆+4 決戦で能力補正）`; } },
      { label: '「君の願いを叶えたい」', hint: '新たなエンディングが開く', run: () => { G.flags.resolve = 'servant'; G.flags.knowWish = true; bond(8);
          return [`${SV()}は驚いたように目を見開き、それから、ゆっくりと笑った。`, `<p class="quote">「${SERVANT_WISH[servantOf(G).persona]}……それが、願いだ。覚えていてくれたら嬉しい」</p>`, '（絆+8 聖杯をサーヴァントに託せるようになった）']; } },
      { label: '「聖杯を壊そう」', hint: '聖杯の真実を知っている時のみ', cond: () => G.flags.grailTruth, run: () => { G.flags.resolve = 'destroy'; bond(5); tone('good');
          return `「……それが君の答えか」${SV()}は長い沈黙の後、頷いた。「付き合おう。最後まで」（絆+5 聖杯との戦いで能力補正）`; } },
    ],
  },
];

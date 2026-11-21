// =============================================================
//  メインシナリオ（決まった日に必ず起きる物語イベント）
//  三幕構成：
//   生い立ち          … 0〜17歳（growth.js / data_growth.js）
//   序章「令呪の冬」   … 18歳の冬、召喚までの3日間。街の異変と監督役、六十年前の生き残り
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
  cool: '……さあな。強いて言えば、{you}の願いが叶うところを見てみたい',
  gentle: '大切な人たちが、笑って暮らせる世界',
  free: 'もう一度、思いっきり生きてみたい！',
  dark: '奪われたものへの、最後の決着',
  scholar: 'まだ誰も書いていない、最高の物語の結末',
  berserker: '（言葉はない。だが、その眼差しは確かに何かを求めている）',
};

const STORY = [
  // ===================== 序章 =====================
  {
    id: 's_tremor', phase: 'prep', day: 1, slot: 1, after: 'advance',
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
            return [r.text, `夜の石段を駆け上がると、境内に白装束の少女が立っていた。${G.flags.metMiko || birthOf().id === 'shrine' ? '従妹の' : '巫女の'}${CAST.miko}だ。<br>「あなたも感じたんですね。……この山の霊脈、六十年ぶりに目を覚まそうとしています」<br>彼女から霊脈の流れを教わった。（陣地作成が得意になった）`]; }
          hp(-10); return [r.text, '暗い石段で足を滑らせた。今夜は諦めよう。（HP-10）'];
        } },
      { label: '気のせいだと眠る', run: () => { gain('spi', 2); tone('cautious'); return '布団を被り直した。……だが、夢の中でも黒い空が揺れていた。（精神+2）'; } },
    ],
  },
  {
    id: 's_mentor', phase: 'prep', day: 1, slot: 0, after: 'hub', cond: () => G.route === 'seeker',
    title: '師を求めて', chapter: '序章　令呪の冬',
    text: () => '令呪は手に入った。だが、サーヴァントを喚ぶ方法を、あなたは本でしか知らない。<br>召喚陣の描き方、魔力の通し方、詠唱――誰かに教わらなければ、三日後の夜には間に合わない。',
    choices: [
      { label: () => `${CAST.old}に教えを乞う`, hint: '交渉判定（顔見知りなら易しい）', run: () => {
          const c = chk('cha', G.flags.oldTrust ? 35 : 58);
          if (c.ok) { G.ritual += 2; G.flags.oldTrust = true; G.flags.grailHint = true;
            return [c.text, `老人は長い沈黙の後、釣竿を置いた。「……六十年前、わしが描いた陣じゃ。同じ過ちは繰り返すな」<br>古びた手帳に、召喚陣の図面がびっしりと描かれていた。（召喚の準備+2）`]; }
          G.ritual += 1; return [c.text, '「若いのが首を突っ込むことではない」突き放されたが、去り際に一枚の紙片を握らされた。（召喚の準備+1）'];
        } },
      { label: '天降神社を訪ねる', hint: '魔力↑・霊脈の知識', run: () => {
          G.ritual += 1; G.flags.leyline = true; G.flags.metMiko = true; gain('mag', 2);
          return `${CAST.miko}が、蔵の古文書を見せてくれた。「この山の霊脈の流れに沿って陣を描けば、きっと……」（召喚の準備+1 魔力+2）`;
        } },
      { label: '独学で召喚陣を組み上げる', hint: '知力判定', run: () => {
          const c = chk('int', 60);
          if (c.ok) { G.ritual += 2; gain('int', 2); return [c.text, '集めた文献を突き合わせ、一晩で陣の理屈を組み上げた。（召喚の準備+2 知力+2）']; }
          hp(-10); return [c.text, '試しに魔力を通した陣が暴発した。……一からやり直しだ。（HP-10）'];
        } },
      { label: '教会で監督役に相談する', hint: '秩序・教会に登録', run: () => {
          tone('law'); G.flags.registered = true; G.ritual += 1;
          return `${CAST.sister}は目を丸くした。「独力でここまで辿り着いた一般の方は、記録にありません」<br>彼女は規則を説明し、最低限の召喚の手順を教えてくれた。（召喚の準備+1 教会に登録）`;
        } },
    ],
  },
  {
    id: 's_sister', phase: 'prep', day: 2, slot: 0, after: 'hub',
    title: '監督役', chapter: '序章　令呪の冬',
    text: () => (isFuji()
      ? `丘の上の聖ヨハネ教会から呼び出しがあった。<br>銀髪の修道女は、あなたの顔を見るなり小さく息を呑んだ。「……あなたが、あの『人類最後のマスター』。私は${CAST.sister}。この地の聖杯戦争の監督役です」<br>`
      : birthOf().id === 'executor'
      ? `育った場所――丘の上の聖ヨハネ教会から呼び出しがあった。<br>ステンドグラスの光の中、銀髪の修道女が振り返る。${CAST.sister}。あなたを育ててくれた人だ。<br>「……まさか、あなたの手に令呪が宿るなんて。私は今、この地の聖杯戦争の監督役を務めています」<br>`
      : `丘の上の聖ヨハネ教会から呼び出しがあった。<br>ステンドグラスの光の中、銀髪の修道女が静かに振り返る。<br>「ようこそ。私は${CAST.sister}。この地の聖杯戦争の監督役を務めます」<br>`) + `彼女は淡々と規則を説明した。七人のマスターと七騎のサーヴァント。神秘の秘匿のため、戦闘は夜に限ること。脱落者は教会が保護すること。`,
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
    id: 's_oldman', phase: 'prep', day: 3, slot: 0, after: 'hub',
    title: '六十年前の生き残り', chapter: '序章　令呪の冬',
    text: () => G.flags.oldTrust
      ? `御影川の河川敷。子どもの頃から見知った釣り人――${CAST.old}が、あなたの右手を見て深く息をついた。<br>「……やはり、そうなったか。初めて会うた時から、そんな気がしておった」<br>老人は静かに語り始めた。六十年前、この街で起きた最初の聖杯戦争。その、ただ一人の生き残りが自分なのだと。`
      : `御影川の河川敷。釣り糸を垂れる老人が、あなたの右手を見て目を細めた。<br>「……その痣。わしにも昔、同じものがあった」<br>老人は${CAST.old}と名乗った。六十年前、この街で起きた最初の聖杯戦争の、ただ一人の生き残りだという。`,
    choices: [
      { label: '当時のことを詳しく尋ねる', hint: '知力判定', run: () => {
          const r = chk('int', 55);
          if (r.ok) { G.flags.grailHint = true; G.flags.oldTrust = true; gain('int', 3);
            const t = '「最後に残ったのは、わしと――名前のない、呪いのような英霊じゃった。最後の夜、山が黒く染まった。……あの聖杯は、願いを歪めるかもしれん」<br>老人はそれ以上を語らず、目を逸らした。何かを隠しているようにも見える。';
            return [r.text, t + '（知力+3）', addClue('rumor_old', '老人の昔語り', '六十年前、最後に残ったのは「呪いのような英霊」。最後の夜、山が黒く染まった。老人は何かを隠している様子だった。', 0)]; }
          return [r.text, '老人の話は昔語りと愚痴が入り混じり、肝心なところが分からなかった。'];
        } },
      { label: '戦いの心得を教わる', hint: '体力・精神↑', run: () => { gain('phy', 2); gain('spi', 3); G.flags.oldTrust = true;
          return '「生き残る者は、退き時を知る者じゃ」老人の言葉は短く、重かった。（体力+2 精神+3）'; } },
      { label: '会釈して立ち去る', run: () => '老人は再び、黙って川面を見つめ始めた。' },
    ],
  },
  {
    id: 's_eve', phase: 'prep', day: 3, slot: 1, after: 'advance',
    title: '召喚前夜', chapter: '序章　令呪の冬',
    text: () => '明日になれば、聖杯戦争が始まる。今夜のうちに、召喚の儀を行わなければならない。<br>工房の窓から、雪のちらつく街を見下ろす。この街のどこかで、他のマスターたちも同じ夜を過ごしているのだろう。',
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
    id: 's_church_caught', phase: 'war', day: 1, slot: 0, after: 'hub', cond: () => G.route === 'caught',
    title: '聖杯戦争', chapter: '第一幕　開幕',
    text: () => `一睡もできないまま朝が来た。${SV()}は、昨夜のことを一つずつ説明してくれた。<br>聖杯戦争。万能の願望機を巡り、七人のマスターと七騎のサーヴァントが殺し合う儀式。右手の痣は<b>令呪</b>と呼ばれるもので、あなたはその七人の一人に選ばれてしまったのだという。<br>${SV()}に促され、丘の上の聖ヨハネ教会を訪ねた。` +
      (birthOf().id === 'executor' ? `<br>迎えたのは、あなたを育てた${CAST.sister}だった。「……どうして、あなたが」彼女は顔を覆った。`
        : `<br>銀髪の修道女――監督役の${CAST.sister}は、静かに告げた。「令呪を手放し、教会の保護を受けることもできます。ただし、サーヴァントとはここでお別れです」`),
    choices: [
      { label: '「戦う。巻き込まれたままで終わりたくない」', hint: '大胆・教会に登録', run: () => {
          tone('bold'); G.flags.registered = true; bond(5);
          return `${SV()}が、わずかに口元を緩めた。${say('goodAnswer')}<br>あなたはマスターとして、正式に聖杯戦争への参加を登録した。（絆+5）`;
        } },
      { label: '令呪を手放し、保護を求める', hint: '戦いから降りる', run: () => ({ text: `${SV()}は何も言わず、あなたの答えを待っている。`, then: abstainConfirm }) },
      { label: '「少し、考えさせてほしい」', hint: '慎重', run: () => {
          tone('cautious'); return `「答えを急ぐ必要はありません。ですが、敵は待ってくれませんよ」${CAST.sister}はそう言って、扉を閉じた。`;
        } },
    ],
  },
  {
    id: 's_morning', phase: 'war', day: 1, slot: 0, after: 'hub',
    title: '最初の朝', chapter: '第一幕　開幕',
    text: () => isFuji()
      ? `召喚から一夜。台所に立つと、${SV()}が窓辺から冬の街を眺めていた。まるで、あの頃の朝のように。<br>${say('askWishFuji')}`
      : `召喚から一夜。台所に立つと、${SV()}が窓辺から冬の街を眺めていた。<br>${say('askWish')}`,
    choices: [
      { label: () => `「${birthOf().wish}」と答える`, hint: '自分の願いを語る', run: () => {
          bond(4); G.flags.toldWish = true;
          return [`あなたは自分の願いを、正直に語った。`, `<p class="quote">${tierLine()}</p>`, `${SV()}は静かに頷いた。（絆+4）`];
        } },
      { label: () => isFuji() ? '「あの頃みたいに、君の願いを聞かせて」' : '「君こそ、何を願うんだ？」', hint: 'サーヴァントの願いを聞く', run: () => {
          bond(3); G.flags.knowWish = true;
          return [`${SV()}は少し意外そうな顔をして、それから遠くを見た。`, `<p class="quote">「${fmt(SERVANT_WISH[servantOf(G).persona])}」</p>`, '（絆+3　サーヴァントの願いを知った）'];
        } },
      { label: '「今は勝つことだけ考えよう」', hint: '大胆', run: () => { tone('bold'); return `${say('agree')}<br>${SV()}は口の端を上げた。`; } },
    ],
  },
  {
    id: 's_first', phase: 'war', day: 2, slot: 1, after: 'advance', cond: () => hostileRivals().length > 0 && G.route !== 'caught',
    title: '最初の邂逅', chapter: '第一幕　開幕',
    text: () => {
      const r = G.storyRival = hostileRivals().reduce((a, b) => a.aggr >= b.aggr ? a : b);
      const seen = meet(r);
      return `買い出しの帰り道、街灯が一斉に明滅した。<br>人払いの結界。気付けば、通りには誰もいない。<br>電柱の上に、<b>${r.cls}</b>のサーヴァントが立っていた。傍らには、マスターの${esc(r.master)}――${r.type}。${seen ? '<br>' + seen : ''}<br><p class="quote">「${r.quote}」</p>`;
    },
    choices: [
      { label: '迎え撃つ', hint: '戦闘', cls: 'danger', run: () => ({ text: `${SV()}が実体化し、あなたの前に立った。${say('stayBack')}`, then: () => startBattle(G.storyRival, {}) }) },
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
    id: 's_friend', phase: 'war', day: 3, slot: 0, after: 'hub', cond: () => G.rivals.some(r => r.friend && r.alive && !r.ally),
    title: '幼馴染の令呪', chapter: '第一幕　開幕',
    text: () => {
      const r = G.rivals.find(x => x.friend); r.intel = Math.max(r.intel, 1);
      return `「……やっぱり、あなたもだったんだ」<br>城跡公園のベンチで待っていたのは、${friendName()}だった。手袋を外したその手の甲に、<b>令呪</b>が刻まれている。<br>背後に、${r.cls}のサーヴァントが静かに控えていた。` +
        `<p class="quote">「${r.quote}」</p>`;
    },
    choices: [
      { label: '「手を組もう。二人で生き残るんだ」', hint: '交渉判定（友情で易しくなる）', run: () => {
          const r = G.rivals.find(x => x.friend);
          const need = Math.max(30, 75 - G.friend.bond / 2); const c = chk('cha', need);
          if (c.ok || G.friend.bond >= 80) { r.ally = true; r.intel = 3; friend(10); addLog(`幼馴染・${G.friend.name}と同盟を結ぶ。`);
            return [c.ok ? c.text : '', `${friendName()}は少しだけ泣きそうな顔で笑った。「……うん。あなたとなら」<br>${r.cls}陣営と同盟を結んだ。サーヴァントの真名<b>${servantOf(r).name}</b>も教えてもらった。`]; }
          return [c.text, `「ごめん。……それは、できない」${friendName()}は目を伏せて、去っていった。`];
        } },
      { label: '「戦いから降りてくれ」と説得する', hint: '交渉判定', run: () => {
          const r = G.rivals.find(x => x.friend);
          const c = chk('cha', Math.max(35, 80 - G.friend.bond / 2));
          if (c.ok) { r.alive = false; r.hp = 0; G.flags.friendSaved = true; addLog(`幼馴染・${G.friend.name}、聖杯戦争から降りる。`);
            return [c.text, `長い沈黙の後、${friendName()}は頷いた。「……分かった。教会に行く。でも、約束して。絶対に、死なないで」<br>${r.cls}陣営は脱落した。誰も傷つかずに。`]; }
          friend(-5); return [c.text, `「あなたにだけは、それを言われたくなかった」${friendName()}の声は震えていた。`];
        } },
      { label: '「正々堂々、戦おう」と約束する', hint: '秩序・大胆', run: () => {
          tone('law'); tone('bold'); friend(5); G.flags.friendDuel = true;
          return `「……昔から、そういうとこ変わらないね」${friendName()}は拳を突き出した。あなたはそれに、自分の拳を合わせた。`;
        } },
    ],
  },
  {
    id: 's_coma', phase: 'war', day: 4, slot: 0, after: 'hub',
    title: '昏睡事件', chapter: '第二幕　侵蝕',
    text: () => `朝のニュースが、市内で原因不明の昏睡事件が相次いでいると報じていた。被害者はこの三日で十二人。全員、夜の街で倒れているのを発見されたという。<br>昼過ぎ、${CAST.sister}から連絡が入った。<br>「魂喰い――魔力の略奪の可能性があります。ですが、痕跡は奇妙に乱れていて、何の仕業なのかすら分からないのです」`,
    choices: [
      { label: '調査を引き受ける', hint: '善', run: () => { tone('good'); G.flags.investigate = true;
          return `「感謝します。何か分かれば、教会にも知らせてください」<br><span class="note">夜の巡回で敵の情報が見つかりやすくなった。昼の「真相を調べる」に事件現場と病院が加わり、夜には現場に張り込めるようになった。</span>`; } },
      { label: '他陣営の仕業として利用する', hint: '悪 / 敵の情報を得る', run: () => {
          tone('evil'); const r = randomHostile();
          if (r) { r.intel = Math.max(r.intel, 1); r.bounty = true;
            return `あなたは「${r.cls}陣営が怪しい」と監督役に吹き込んだ。教会は${r.cls}陣営に討伐令を出した。<br><span class="note">討伐すれば令呪が一画もらえる。</span>`; }
          return '利用できそうな陣営は見当たらなかった。';
        } },
      { label: '静観する', hint: '慎重', run: () => { tone('cautious'); return '他陣営の動きを見極めるまで、下手に動くべきではない。<br><span class="note">事件の現場は、昼の「真相を調べる」から自分で調べることもできる。</span>'; } },
    ],
  },
  {
    id: 's_shadow', phase: 'war', day: 6, slot: 1, after: 'advance',
    title: '黒い影', chapter: '第二幕　侵蝕',
    // 見た目はどちらの真相でも同じ。何を見抜けるかは、選んだ行動と判定次第
    text: () => `${G.flags.investigate ? '昏睡事件を追って' : '偶然通りかかった'}港の倉庫街で、あなたは見た。<br>路地に倒れた男の上に、<b>黒い泥のような影</b>が覆いかぶさっている。影は男から何かを吸い上げ、脈打つように膨らんでいく。<br>${say('warnShadow')}${SV()}の声が、かすかに張り詰めていた。`,
    choices: [
      { label: '影を討つ', hint: 'サーヴァント魔力判定', cls: 'danger', run: () => {
          const c = schk(3, 60); G.flags.grailHint = true;
          if (c.ok) { bond(3); gain('spi', 1);
            const t = isCursed()
              ? `${SV()}の一撃が影を引き裂いた。影は悲鳴のような音を立てて霧散し、残滓は霊脈に溶けて――天降山の方角へと流れていった。`
              : `${SV()}の一撃が影を引き裂いた。霧散する寸前、影の背から<b>細い魔力の糸</b>が伸びているのが見えた。糸は${mys().area}の方へ、するすると引き戻されていった。`;
            return [c.text, t + '<br>男は衰弱しているが、息はある。（絆+3）',
              addClue('shadow_cut', '斬られた影', isCursed() ? '黒い影を斬ると、残滓は霊脈に溶けて天降山の方へ流れた。操る者の気配はなかった。' : `黒い影は魔力の糸で操られていた。糸は${mys().area}の方へ引き戻された。`, 1)]; }
          shp(-25); return [c.text, `影は${SV()}の攻撃を呑み込み、触れた部分の霊基を侵した。どうにか追い払ったが、${SV()}の顔色は悪い。（サーヴァントHP-25）`];
        } },
      { label: '倒れた男を連れて逃げる', hint: '善', run: () => {
          tone('good'); G.flags.grailHint = true; shp(-10); gain('luk', 2);
          return `${SV()}が影を牽制する間に、男を担いで大通りまで走った。振り返ると、影はもう路地の闇に溶けていた。（サーヴァントHP-10 幸運+2）`;
        } },
      { label: '影を追跡する', hint: '知力判定', run: () => {
          const c = chk('int', 60); G.flags.grailHint = true;
          if (!c.ok) { hp(-15); return [c.text, '影を見失い、気付けば足元から泥が這い上がっていた。慌てて振り払う。（HP-15）']; }
          if (isCursed()) { G.flags.shadowTrail = true;
            return [c.text, '距離を取って影の後を追った。影は霊脈を遡り、天降山の古社――聖杯が降臨するはずの場所へと吸い込まれていった。',
              addClue('shadow_trail', '影の帰る場所', '黒い影は霊脈を遡り、聖杯が降臨するはずの天降山の古社へ吸い込まれていった。', 2)]; }
          const r = culprit(); if (r) r.intel = Math.max(r.intel, 2);
          return [c.text, `距離を取って影の後を追った。影は人目を避けて路地を渡り、${mys().area}にある<b>魔術師の拠点</b>へと消えた。`,
            revealCulprit('影の追跡'), r ? '拠点の場所も分かった。' : '',
            addClue('shadow_trail', '影の帰る場所', `黒い影は、${mys().area}にある魔術師の拠点へ帰っていった。聖杯のある天降山とは逆の方角だ。`, 2)];
        } },
    ],
  },
  {
    id: 's_past', phase: 'war', day: 8, slot: 0, after: 'hub', cond: () => !solved(),
    title: '六十年前の真実', chapter: '第二幕　侵蝕',
    text: () => `${G.flags.grailHint ? '黒い影、霊脈の異変、六十年前の戦争。' : '街の異変が、何かと繋がっている気がする。'}点と点を繋ぐために、どこを調べるべきだろうか。<br><span class="note">ここで得られる手がかりは、普段の調査よりも重い（手がかり+2）。</span>`,
    choices: [
      { label: () => `${CAST.old}を訪ねる`, hint: '交渉判定', cond: () => siteOpen('oldman'), run: () => {
          const c = chk('cha', G.flags.oldTrust ? 40 : 62);
          if (c.ok) return [c.text, ...siteResult('oldman', 2)];
          return [c.text, '「……話すことは何もない」老人は背を向けた。'];
        } },
      { label: '天降神社の古文書を調べる', hint: '知力判定', cond: () => siteOpen('shrine'), run: () => {
          const c = chk('int', G.flags.metMiko ? 45 : 60);
          if (c.ok) return [c.text, G.flags.metMiko ? `${CAST.miko}が蔵を開けてくれた。` : '', ...siteResult('shrine', 2)];
          return [c.text, '崩し字が読めず、決定的な記述を見つけられなかった。'];
        } },
      { label: '教会の記録庫に忍び込む', hint: '幸運判定（混沌）', cond: () => siteOpen('church'), run: () => {
          tone('chaos'); const c = chk('luk', 55);
          if (c.ok) return [c.text, '封印された書庫の奥に、前回の報告書があった。', ...siteResult('church', 2)];
          gain('spi', -3); return [c.text, `足音。${CAST.sister}だ。「……ここは立入禁止です」咎めはしなかったが、その目は冷たかった。（精神-3）`];
        } },
      { label: () => `${SVname()}に聖杯の気配を探らせる`, hint: 'サーヴァント魔力判定', run: () => {
          const c = schk(3, 58);
          if (!c.ok) return [c.text, '聖杯の気配は、霊脈の奥深くに隠れていて掴めなかった。'];
          bond(2);
          return isCursed()
            ? [c.text, `天降山を見上げた${SV()}が、険しい顔で言った。${say('grailEvil')}`, addClue('sense', '英霊の直感', `${SV()}は、天降山の聖杯から底知れない悪意を感じ取った。`, 2)]
            : [c.text, `天降山を見上げた${SV()}が、怪訝そうに言った。${say('grailPure')}`, addClue('sense', '英霊の直感', `${SV()}は、天降山の聖杯に濁りを感じなかった。悪意は、街の中にあるという。`, 2)];
        } },
    ],
  },
  {
    id: 's_devoured', phase: 'war', day: 9, slot: 1, after: 'advance', cond: () => hostileRivals().length >= 3 && (isCursed() || culpritAlive()),
    title: '呑まれた陣営', chapter: '第二幕　侵蝕',
    text: () => {
      const cu = culprit();
      const r = G.storyRival = hostileRivals().filter(x => x !== cu).reduce((a, b) => (a.hp / a.hpMax) <= (b.hp / b.hpMax) ? a : b);
      return `城跡公園に駆けつけた時には、もう遅かった。<br>傷ついた<b>${rivalLabel(r)}</b>のサーヴァントに、地面から湧き出した<b>黒い泥のような影</b>が絡みついている。影は霊基を喰らいながら、ずぶずぶと闇へ引きずり込んでいく。<br>マスターの${esc(r.master)}が、悲鳴を上げて手を伸ばしていた。`;
    },
    choices: [
      { label: '断ち切って、助ける', hint: 'サーヴァント筋力判定（善）', cls: 'danger', run: () => {
          tone('good'); const r = G.storyRival; const c = schk(0, 62);
          r.alive = false; r.hp = 0; addLog(`${rivalLabel(r)}陣営、黒い影に呑まれて脱落。`);
          if (c.ok) { for (const x of aliveRivals()) x.intel = Math.min(3, x.intel + 1);
            return [c.text, `${SV()}が影を断ち切った。サーヴァントは救えなかったが、${esc(r.master)}は助け出せた。<br>「……借りができた。知っていることは全部話す」<br>彼の情報で、<b>残る全陣営の情報が一段階進んだ。</b>`,
              isCursed() ? '' : revealCulprit('助けたマスターの証言')]; }
          shp(-20); return [c.text, `${SV()}の刃は届かなかった。${rivalLabel(r)}陣営は、跡形もなく呑み込まれた。（サーヴァントHP-20）`];
        } },
      { label: '動きを観察する', hint: '知力判定', run: () => {
          const r = G.storyRival; const c = chk('int', 55);
          r.alive = false; r.hp = 0; addLog(`${rivalLabel(r)}陣営、黒い影に呑まれて脱落。`);
          if (!c.ok) return [c.text, `為す術もなく、${rivalLabel(r)}陣営が呑み込まれていくのを見ていることしかできなかった。`];
          if (isCursed()) { G.flags.mudKnown = true;
            return [c.text, `泥は<b>傷ついたサーヴァント</b>を狙う。そして喰らった霊基を、霊脈を通じて天降山へ運んでいく――聖杯は、脱落者の魂を貪って満ちていくのだ。<br><span class="note">この戦いの仕組みが分かった。聖杯との戦いで有利になるだろう。</span>`,
              addClue('devoured', '喰われた霊基', '黒い泥は傷ついたサーヴァントを狙い、喰らった霊基を天降山へ運んでいった。', 1)]; }
          G.flags.shadowKnown = true;
          return [c.text, `影は一匹残らず、喰らった魔力を抱えて同じ方角へ戻っていく。術者がいる。そして、その術者は脱落した英霊の魔力まで貯め込んでいる。<br><span class="note">影の手口を見切った。犯人の陣営との戦いで有利になるだろう。</span>`,
            revealCulprit('影の観察'), addClue('devoured', '喰われた霊基', '黒い影は、喰らった英霊の魔力を抱えて術者のもとへ戻っていった。', 1)];
        } },
      { label: '今のうちに立ち去る', hint: '慎重', run: () => {
          tone('cautious'); const r = G.storyRival; r.alive = false; r.hp = 0; addLog(`${rivalLabel(r)}陣営、黒い影に呑まれて脱落。`);
          return '背後で、何かが闇に沈む音がした。あなたは振り返らなかった。';
        } },
    ],
  },

  // ===================== 第三幕「降臨」 =====================
  {
    id: 's_eveFinal', phase: 'war', day: 10, slot: 1, after: 'hub',
    title: '決戦前夜', chapter: '第三幕　降臨',
    text: () => `天降山の頂が、夜空にうっすらと光っている。聖杯の降臨が近い。<br>拠点の屋根の上で、${SV()}が月を見上げていた。隣に座ると、${SV()}はぽつりと言った。<br><p class="quote">${tierLine()}</p>${say('askResolve')}`,
    choices: [
      { label: '「必ず勝とう。二人で」', hint: '決戦で能力補正', run: () => { G.flags.resolve = 'win'; bond(4); tone('bold');
          return `${say('promise')}${SV()}は拳を差し出した。あなたはそれに、自分の拳を合わせた。（絆+4 決戦で能力補正）`; } },
      { label: '「君の願いを叶えたい」', hint: '新たなエンディングが開く', run: () => { G.flags.resolve = 'servant'; G.flags.knowWish = true; bond(8);
          return [`${SV()}は驚いたように目を見開き、それから、ゆっくりと笑った。`, voiceOf(servantOf(G)).reg === 'mute' ? `<p>（${SV()}の瞳が、遠いどこかを見つめていた。その奥に、一つの願いが映っている――「${fmt(SERVANT_WISH[servantOf(G).persona])}」）</p>` : `<p class="quote">「${fmt(SERVANT_WISH[servantOf(G).persona])}${say('wishShare')}」</p>`, '（絆+8 聖杯をサーヴァントに託せるようになった）']; } },
      { label: '「この聖杯になら、願いを託せる」', hint: '聖杯が正規のものだと知っている時のみ', cond: () => G.flags.grailPure, run: () => { G.flags.resolve = 'pure'; bond(5); tone('law');
          return `${SV()}は天降山の澄んだ光を見上げ、静かに頷いた。${say('promise')}（絆+5 決戦で能力補正）`; } },
      { label: '「聖杯を壊そう」', hint: '聖杯の真実を知っている時のみ', cond: () => G.flags.grailTruth, run: () => { G.flags.resolve = 'destroy'; bond(5); tone('good');
          return `${SV()}は長い沈黙の後、頷いた。${say('withYou')}（絆+5 聖杯との戦いで能力補正）`; } },
    ],
  },
];

// 巻き込まれた者が、戦いから降りるかどうか
function abstainConfirm() {
  scene({ title: '選択', sub: '第一幕　開幕', reveal: true, body: paras([
    `本当に、これでいいのだろうか。右手の令呪を見つめる。昨夜、${SV()}はあなたの命を救ってくれた。`,
    `<p class="quote">${lowLine()}</p>`,
    '令呪を手放せば、日常に戻れる。けれど、この街で始まった戦いが止まるわけではない。',
  ]), choices: [
    { label: '令呪を手放す', hint: '聖杯戦争から降りる（エンディング）', icon: 'flee', fn: () => ending('abstain') },
    { label: '……やっぱり、戦う', hint: '絆↑', cls: 'primary', icon: 'battle', fn: () => {
      NOTES = []; G.flags.registered = true; bond(8);
      next('決意', paras([`令呪を握りしめ、顔を上げた。${SV()}が、静かに頷く。${say('again')}`, ...takeNotes()]), startSlot);
    } },
  ] });
}

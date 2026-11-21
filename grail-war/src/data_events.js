// =============================================================
//  ランダムイベント
//  phase : 'prep'（召喚前） / 'war'（聖杯戦争中） / 'any'
//  time  : 'day'（昼） / 'night'（夜） / 'any'
//  once  : true なら1回のプレイで1度だけ発生
//  cond  : 発生条件（省略可）
//  choices[].run() の戻り値：
//     文字列 or 文字列の配列 → 結果の文章
//     { text, then } → 文章のあと then() を実行（戦闘開始など）
//
//  使える便利関数（engine.js で定義）
//   chk('int', 60)   … マスター判定（mag/phy/int/spi/cha/luk）
//   schk(2, 60)      … サーヴァント判定（0筋力 1耐久 2敏捷 3魔力 4幸運 5宝具）
//   gain('int', 3)   … 能力値を増減
//   money(n) hp(n) shp(n) mp(n) bond(n) tone('good') …
//   giveCatalyst()   … 触媒を1つ入手（入手した名前を返す）
//   M() … マスター名 / SV() … サーヴァント名
// =============================================================

const EVENTS = [
  // ===================== 召喚前（準備期間） =====================
  {
    id: 'antique', phase: 'prep', time: 'day', once: true, weight: 3,
    title: '骨董店「古月堂」',
    text: () => '旧城下町の路地裏に、古びた骨董店がある。店主の老婆が、あなたの右手の痣を見て目を細めた。<br>「……あんた、ああいう「縁」の品を探してるんだろう？ 一つだけ、妙なものが入っていてね」',
    choices: [
      { label: '言い値で買い取る', hint: '資金 -4', cond: () => G.master.money >= 4,
        run: () => { money(-4); const c = giveCatalyst(); return `老婆は桐箱を差し出した。中には――<b>${c}</b>。<br>手に取った瞬間、遥か昔の誰かの気配が、指先に触れた気がした。`; } },
      { label: '値切ってみる', hint: '交渉判定', run: () => {
          const r = chk('cha', 65);
          if (r.ok) { money(-1); const c = giveCatalyst(); return [r.text, `「ふん、口の上手い子だね」老婆は笑って桐箱を渡した。<b>${c}</b>を手に入れた。`]; }
          return [r.text, '「冷やかしなら帰っとくれ」……追い出されてしまった。'];
        } },
      { label: '今は手を出さない', run: () => { tone('cautious'); return '怪しげな品に頼るのはやめておこう。あなたは店を後にした。'; } },
    ],
  },
  {
    id: 'grimoire', phase: 'prep', time: 'any', once: true, weight: 2,
    title: '古書店の魔導書',
    text: () => '駅前の古書店の奥、埃をかぶった棚に、明らかに「本物」の魔導書が紛れ込んでいた。',
    choices: [
      { label: 'その場で読み解く', hint: '知力判定', run: () => {
          const r = chk('int', 60);
          if (r.ok) { gain('mag', 4); gain('int', 3); return [r.text, '難解な術式を読み解くことができた。魔術の理解が深まった。（魔力+4 知力+3）']; }
          gain('spi', -3); return [r.text, '文字が頭の中でのたうち回り、激しい頭痛に襲われた。（精神-3）'];
        } },
      { label: '購入して持ち帰る', hint: '資金 -2', cond: () => G.master.money >= 2,
        run: () => { money(-2); gain('int', 4); return 'じっくりと時間をかけて読み込んだ。（知力+4）'; } },
    ],
  },
  {
    id: 'shadow', phase: 'prep', time: 'night', once: true, weight: 2,
    title: '不審な人影',
    text: () => '夜の港で、外套を纏った人物が倉庫に入っていくのを見かけた。かすかに魔力の残り香がする。……他のマスター候補かもしれない。',
    choices: [
      { label: '後をつける', hint: '体力判定', run: () => {
          const r = chk('phy', 55);
          if (r.ok) { G.flags.earlyIntel = true; return [r.text, '気付かれずに後をつけ、相手の拠点の目星をつけた。聖杯戦争が始まれば役に立つだろう。（敵陣営の情報を1つ得た）']; }
          hp(-15); return [r.text, '気付かれた！ 放たれた魔弾が肩をかすめる。命からがら逃げ出した。（HP-15）'];
        } },
      { label: '使い魔で探る', hint: '魔力判定', run: () => {
          const r = chk('mag', 55);
          if (r.ok) { G.flags.earlyIntel = true; return [r.text, '鳥の使い魔が倉庫の窓から内部を覗いた。相手の顔を確認できた。（敵陣営の情報を1つ得た）']; }
          return [r.text, '使い魔は結界に弾かれてしまった。深追いは危険だ。'];
        } },
      { label: '関わらない', run: () => { tone('cautious'); return 'まだ戦争は始まっていない。今は無用な争いを避けるべきだ。'; } },
    ],
  },
  {
    id: 'letter', phase: 'prep', time: 'day', once: true, weight: 2,
    title: '一通の手紙',
    text: () => {
      const b = G.master.birth;
      if (b === 'clocktower') return '時計塔から封蝋付きの手紙と小包が届いた。「本件の重要性に鑑み、補助物資を送付する」とある。';
      if (b === 'noble' || b === 'fallen') return '実家の書斎から、古い日記が見つかった。曾祖父が書き残した、前回の聖杯戦争の記録らしい。';
      return 'ポストに差出人不明の手紙が入っていた。「聖杯戦争に関わるな。この街の聖杯は――」と書かれ、その先は焼け焦げて読めない。';
    },
    choices: [
      { label: '内容を確かめる', run: () => {
          const b = G.master.birth;
          if (b === 'clocktower') { const c = giveCatalyst(); money(3); return `小包の中には<b>${c}</b>と、当座の資金が入っていた。（資金+3）`; }
          if (b === 'noble' || b === 'fallen') { gain('int', 5); G.flags.grailHint = true; return ['日記には「聖杯は無色にあらず」と記されていた。……どういう意味だろう。（知力+5）', addClue('rumor_diary', '曾祖父の日記', '前回の聖杯戦争の記録。「聖杯は無色にあらず」とだけ書かれていた。', 0)]; }
          G.flags.grailHint = true; gain('spi', 2); return ['不気味な警告だ。だが、この街の聖杯に何か秘密があるのは確かなようだ。（精神+2）', addClue('rumor_letter', '焼け焦げた手紙', '差出人不明。「聖杯戦争に関わるな。この街の聖杯は――」その先は焼けて読めない。', 0)];
        } },
    ],
  },
  {
    id: 'auction', phase: 'prep', time: 'night', once: true, weight: 2,
    title: '港の闇オークション',
    text: () => '倉庫街の地下で、魔術師相手の闇オークションが開かれているという。出品目録には「英雄の遺物」の文字があった。',
    choices: [
      { label: '正式に競り落とす', hint: '資金 -6', cond: () => G.master.money >= 6,
        run: () => { money(-6); const c = giveCatalyst(); return `熾烈な競り合いの末、<b>${c}</b>を競り落とした。`; } },
      { label: '会場から盗み出す', hint: '幸運判定（悪・混沌）', run: () => {
          tone('evil'); tone('chaos');
          const r = chk('luk', 65);
          if (r.ok) { const c = giveCatalyst(); return [r.text, `混乱に乗じて展示ケースから<b>${c}</b>を抜き取った。誰にも気付かれていない……はずだ。`]; }
          hp(-20); money(-2); return [r.text, '警備の魔術師に見つかった！ 散々な目に遭って逃げ帰った。（HP-20 資金-2）'];
        } },
      { label: '見物だけして帰る', run: () => { gain('int', 2); return '出品物の来歴を聞いているだけでも勉強になった。（知力+2）'; } },
    ],
  },
  {
    id: 'shrine_maiden', phase: 'prep', time: 'day', once: true, weight: 2,
    title: '天降神社の霊脈',
    text: () => '天降山の中腹にある天降神社。境内の掃除をしていた巫女が、あなたに声をかけてきた。<br>「この山には街で一番太い霊脈が通っているんです。……最近、少し様子がおかしいのですけれど」',
    choices: [
      { label: '掃除を手伝い、話を聞く', run: () => { tone('good'); gain('spi', 3); G.flags.leyline = true; return '巫女から霊脈の流れについて詳しく教わった。拠点作りに役立ちそうだ。（精神+3 陣地構築が得意になった）'; } },
      { label: '霊脈を独自に調べる', hint: '魔力判定', run: () => {
          const r = chk('mag', 55);
          if (r.ok) { gain('mag', 3); G.flags.leyline = true; return [r.text, '霊脈の結節点を見つけ出した。（魔力+3 陣地構築が得意になった）']; }
          return [r.text, '流れが複雑すぎて読み切れなかった。'];
        } },
    ],
  },
  {
    id: 'lost_child', phase: 'any', time: 'day', once: true, weight: 2,
    title: '迷子',
    text: () => '城跡公園で、小さな子供が泣きじゃくっている。どうやら親とはぐれてしまったらしい。',
    choices: [
      { label: '一緒に親を探す', run: () => { tone('good'); gain('luk', 3); gain('cha', 2); return '一時間ほどかけて、無事に母親を見つけ出した。子供の笑顔に、少しだけ心が軽くなった。（幸運+3 交渉+2）'; } },
      { label: '交番に任せる', run: () => { tone('law'); return '近くの交番に子供を預けた。これで大丈夫だろう。'; } },
      { label: '見なかったことにする', run: () => { tone('evil'); return '今は他人に構っている余裕はない。……胸の奥が少し痛んだ。'; } },
    ],
  },
  {
    id: 'ambush_prep', phase: 'prep', time: 'night', once: true, weight: 2,
    title: '路地裏の魔術師',
    text: () => '帰り道、背後から鋭い殺気。振り返ると、仮面の魔術師が魔弾を構えていた。「令呪の兆しを持つ者は、今のうちに消しておく」',
    choices: [
      { label: '魔術で応戦する', hint: '魔力判定', run: () => {
          const r = chk('mag', 62);
          if (r.ok) { gain('mag', 3); gain('spi', 2); return [r.text, '相手の魔弾を相殺し、反撃の一撃を叩き込んだ。仮面の魔術師は舌打ちして闇に消えた。（魔力+3 精神+2）']; }
          hp(-25); return [r.text, '押し負けた。腹部に焼けるような痛み。どうにか逃げ延びた。（HP-25）'];
        } },
      { label: '全力で逃げる', hint: '体力判定', run: () => {
          const r = chk('phy', 55);
          if (r.ok) { gain('phy', 2); return [r.text, '入り組んだ路地を駆け抜け、追手を撒いた。（体力+2）']; }
          hp(-15); return [r.text, '逃げ切れずに一撃を受けたが、人通りのある大通りに出たところで相手は退いた。（HP-15）'];
        } },
      { label: '言葉で揺さぶる', hint: '交渉判定', run: () => {
          const r = chk('cha', 65);
          if (r.ok) { G.flags.earlyIntel = true; return [r.text, '「監督役に通報済みだ」というはったりが効いた。去り際、相手の所属を示す紋章が見えた。（敵陣営の情報を1つ得た）']; }
          hp(-20); return [r.text, '問答無用だった。（HP-20）'];
        } },
    ],
  },
  {
    id: 'museum', phase: 'prep', time: 'any', once: true, weight: 2,
    title: '市立博物館の特別展',
    text: () => '深見市立博物館で「ヨーロッパ古代遺物展」が開催されている。展示品の一つから、明らかに強い神秘の気配がする。',
    choices: [
      { label: '学芸員に頼み込む', hint: '交渉判定（難）', run: () => {
          const r = chk('cha', 75);
          if (r.ok) { const c = giveCatalyst(); tone('law'); return [r.text, `研究目的と偽って、展示期間後に<b>${c}</b>を借り受ける約束を取り付けた。……実際には、明日にでも届けてくれるらしい。`]; }
          return [r.text, '丁重に断られてしまった。'];
        } },
      { label: '閉館後に忍び込む', hint: '体力判定（悪・混沌）', run: () => {
          tone('evil'); tone('chaos');
          const r = chk('phy', 65);
          if (r.ok) { const c = giveCatalyst(); return [r.text, `警報装置をすり抜け、<b>${c}</b>を手に入れた。展示ケースには精巧な偽物を残しておいた。`]; }
          hp(-10); gain('spi', -3); return [r.text, '警備員に見つかりかけ、慌てて逃げ出した。（HP-10 精神-3）'];
        } },
      { label: '展示を眺めるだけにする', run: () => { gain('int', 3); return '古代の英雄たちの逸話を学んだ。（知力+3）'; } },
    ],
  },
  {
    id: 'circuit', phase: 'prep', time: 'night', once: true, weight: 2,
    title: '魔術回路の疼き',
    text: () => '深夜、全身の魔術回路が焼けるように疼き出した。令呪の兆しに、体が反応しているのかもしれない。',
    choices: [
      { label: '痛みを受け入れ、回路を開く', hint: '精神判定', run: () => {
          const r = chk('spi', 60);
          if (r.ok) { gain('mag', 6); return [r.text, '激痛の果てに、眠っていた回路が開いた。魔力の流れが格段に良くなった。（魔力+6）']; }
          hp(-20); gain('mag', 2); return [r.text, '意識が飛んだ。目覚めると朝だった。体は重いが、わずかに回路が広がっている。（HP-20 魔力+2）'];
        } },
      { label: '瞑想して鎮める', run: () => { gain('spi', 3); return 'ゆっくりと呼吸を整え、疼きを鎮めた。（精神+3）'; } },
    ],
  },
  {
    id: 'dream', phase: 'prep', time: 'night', once: true, weight: 3,
    title: '英霊の夢',
    text: () => {
      const s = pickVisionServant();
      return `その夜、不思議な夢を見た。遠い時代、遠い国。<br>――${s.desc}<br>夢の中のその人物は、振り返ってあなたを見たような気がした。`;
    },
    choices: [
      { label: 'その姿を心に刻む', run: () => { G.flags.visionStrong = true; return '目覚めても、夢の余韻は消えなかった。召喚の時、この「縁」が導いてくれるかもしれない。'; } },
      { label: 'ただの夢だと忘れる', run: () => { G.flags.vision = null; return '頭を振って、夢の記憶を追い払った。'; } },
    ],
  },
  {
    id: 'parttime', phase: 'any', time: 'day', once: true, weight: 1,
    title: 'バイト先からの電話',
    text: () => '以前働いていた喫茶店の店長から電話だ。「急に人手が足りなくなって！ 今日だけ入ってくれない？ 時給は弾むから！」',
    choices: [
      { label: '引き受ける', run: () => { money(3); gain('cha', 2); tone('good'); return '目の回るような忙しさだったが、店長にはとても感謝された。（資金+3 交渉+2）'; } },
      { label: '断る', run: () => '「そっかあ、また今度ね」店長は残念そうに電話を切った。' },
    ],
  },

  // ===================== 聖杯戦争中 =====================
  {
    id: 'traces', phase: 'war', time: 'night', once: false, weight: 2,
    title: '戦闘の痕跡',
    text: () => '倉庫街の一角が、まるで巨大な獣に抉られたように破壊されている。サーヴァント同士の戦闘の痕跡だ。',
    choices: [
      { label: '痕跡を調べる', hint: '知力判定', run: () => {
          const r = chk('int', 55);
          if (r.ok) { const t = intelRandom(1); return [r.text, t || '手がかりは得られたが、既に判明している情報ばかりだった。']; }
          return [r.text, '何も分からなかった。'];
        } },
      { label: () => `${SVname()}に調べてもらう`, hint: 'サーヴァント魔力判定', run: () => {
          const r = schk(3, 55);
          if (r.ok) { const t = intelRandom(1); bond(1); return [r.text, t || '既知の情報ばかりだった。']; }
          return [r.text, `${say('traceFail')}<br>${SV()}は首を振った。`];
        } },
    ],
  },
  {
    id: 'civilian_danger', phase: 'war', time: 'night', once: false, weight: 2,
    title: '巻き込まれた一般人',
    text: () => '悲鳴が聞こえた。路地裏で、会社帰りの女性が使い魔らしき異形に襲われている！',
    choices: [
      { label: '助けに入る', hint: 'サーヴァント敏捷判定（善）', run: () => {
          tone('good');
          const r = schk(2, 50);
          if (r.ok) { gain('luk', 2); return [r.text, `${SV()}が一瞬で異形を斬り伏せた。女性は気を失っているが、怪我はない。（幸運+2）`]; }
          shp(-15); return [r.text, `異形は倒したが、${SV()}は女性を庇って傷を負った。（サーヴァントHP-15）`];
        } },
      { label: '使い魔の主を追う', hint: '魔力判定', run: () => {
          const r = chk('mag', 60);
          if (r.ok) { const t = intelRandom(1); return [r.text, '魔力の糸を辿った。', t || '既に知っている陣営の仕業だった。']; }
          return [r.text, '追跡は途中で途切れた。女性は――無事だったようだ。'];
        } },
      { label: '見捨てる', run: () => { tone('evil'); return '戦力を消耗するわけにはいかない。悲鳴に背を向けた。'; } },
    ],
  },
  {
    id: 'alliance', phase: 'war', time: 'day', once: true, weight: 2, cond: () => aliveRivals().length >= 3,
    title: '同盟の申し出',
    text: () => {
      const r = G.tmpRival = randomAliveRival();
      return `喫茶店で一人の人物があなたの向かいに座った。${r.master}――${r.type}だ。<br>「休戦しないか？ 残りが減るまで、互いに手を出さない。悪い話じゃないだろう」`;
    },
    choices: [
      { label: '同盟を結ぶ', hint: '秩序', run: () => {
          tone('law'); const r = G.tmpRival; r.ally = true; r.intel = Math.max(r.intel, 2);
          return `握手を交わした。${r.cls}陣営とは当面戦わない。拠点の場所も教えてもらった。……いつまで続くかは分からないが。`;
        } },
      { label: '同盟のふりをして情報を探る', hint: '交渉判定（悪）', run: () => {
          tone('evil'); const r = G.tmpRival; const c = chk('cha', 60);
          if (c.ok) { r.intel = 3; return [c.text, `巧みな話術で、相手のサーヴァントの真名が<b>${servantOf(r).name}</b>だと聞き出した！`]; }
          return [c.text, '「……君、信用できないな」相手は席を立った。'];
        } },
      { label: '断る', run: () => { tone('chaos'); return '「そうか。なら次に会う時は敵同士だ」相手は肩をすくめて去っていった。'; } },
    ],
  },
  {
    id: 'bounty', phase: 'war', time: 'any', once: true, weight: 2, cond: () => hostileRivals().length >= 2 && !G.flags.bounty,
    title: '討伐令',
    text: () => {
      const r = G.tmpRival = randomHostile();
      return `教会から全マスターへ通達が届いた。「${r.cls}陣営が神秘の秘匿に関する規約に違反した。討伐した者に、報酬として令呪一画を与える」`;
    },
    choices: [
      { label: '討伐に名乗りを上げる', hint: '秩序 / 敵の情報を得る', run: () => {
          tone('law'); const r = G.tmpRival; r.bounty = true; G.flags.bounty = r.id; r.intel = Math.max(r.intel, 2);
          return `教会から${r.cls}陣営の拠点の情報が提供された。<span class="note">討伐すれば令呪+1。</span>`;
        } },
      { label: '他陣営の潰し合いを待つ', hint: '慎重', run: () => {
          tone('cautious'); const r = G.tmpRival; r.bounty = true; G.flags.bounty = r.id;
          return `他の陣営が${r.cls}陣営に群がるだろう。その隙を窺えばいい。`;
        } },
    ],
  },
  {
    id: 'servant_dream', phase: 'war', time: 'night', once: true, weight: 3,
    title: 'サーヴァントの夢',
    text: () => `眠りの中で、あなたは${SV()}の記憶を見た。<br>――${servantOf(G).desc}<br>その生涯の、誰にも語られなかった一場面。喜びと、痛みと、決して届かなかった願い。`,
    choices: [
      { label: '夢のことを話す', run: () => { bond(6); return `${SV()}は少し驚いた顔をした。${say('dreamSeen')}（絆+6）`; } },
      { label: '胸の内にしまっておく', run: () => { bond(3); return 'あの記憶は、本人が話したくなった時に聞けばいい。あなたは何も言わなかった。（絆+3）'; } },
    ],
  },
  {
    id: 'assassin_attack', phase: 'war', time: 'day', once: true, weight: 2,
    title: '白昼の暗殺者',
    text: () => '人混みの中、首筋に冷たい気配。――毒の刃が、あなたの喉元に迫っていた！',
    choices: [
      { label: '身を翻してかわす', hint: '体力判定', run: () => {
          const c = chk('phy', 62);
          if (c.ok) { gain('phy', 2); return [c.text, '紙一重で刃をかわした。襲撃者は群衆に紛れて消えた。（体力+2）']; }
          hp(-30); return [c.text, `刃が脇腹を裂いた。${SV()}が駆けつけ、襲撃者は撤退した。（HP-30）`];
        } },
      { label: () => `${SVname()}を信じる`, hint: '絆40以上で確実', run: () => {
          if (G.servant.bond >= 40) { bond(3); return `あなたが動くより早く、${SV()}が刃を弾き飛ばしていた。${say('protect')}（絆+3）`; }
          const c = schk(2, 60);
          if (c.ok) return [c.text, `${SV()}が間一髪で割って入った。`];
          hp(-30); return [c.text, '間に合わなかった。（HP-30）'];
        } },
    ],
  },
  {
    id: 'mana_shortage', phase: 'war', time: 'any', once: false, weight: 3, cond: () => G.servant.mp < 40,
    title: '魔力不足',
    text: () => `${SV()}の顔色が悪い。連戦で魔力が底を突きかけている。このままでは実体化を保つのも難しい。`,
    choices: [
      { label: '自分の生命力を魔力に変えて渡す', hint: 'HP -20 / 魔力大回復', run: () => { hp(-20); mp(50); bond(4); return `あなたの魔力が、パスを通じて${SV()}に流れ込んでいく。${say('thanksMana')}（魔力+50 絆+4）`; } },
      { label: '霊脈から魔力を汲み上げる', hint: '魔力判定', run: () => {
          const c = chk('mag', 55);
          if (c.ok) { mp(40); return [c.text, '天降山の霊脈から魔力を引き込むことに成功した。（魔力+40）']; }
          mp(10); return [c.text, 'わずかしか汲み上げられなかった。（魔力+10）'];
        } },
    ],
  },
  {
    id: 'grail_truth', phase: 'war', time: 'any', once: true, weight: 2, cond: () => G.flags.grailHint && !solved() && mys().ev < MYSTERY_CORE_EV,
    title: '断片',
    text: () => '集めた断片を、頭の中で並べ直してみる。黒い霧、昏睡事件、六十年前の戦争。……この街の聖杯には、何か秘密がある。それが何なのかは、まだ分からない。',
    choices: [
      { label: '天降山の霊脈を調べに行く', hint: 'サーヴァント魔力判定', cond: () => siteOpen('mountain'), run: () => {
          const c = schk(3, 58);
          if (c.ok) return [c.text, ...siteResult('mountain', 1)];
          return [c.text, '霊脈の気配は掴みきれなかった。'];
        } },
      { label: () => `${SVname()}の意見を聞く`, hint: '絆↑', run: () => { bond(3);
          return `${SV()}は少し考えてから言った。「憶測で決めつけるのは危うい。確かめるなら、自分の目で、だ」<br><span class="note">昼の「真相を調べる」で、街の謎を調べられる。（絆+3）</span>`; } },
    ],
  },
  {
    id: 'festival', phase: 'war', time: 'night', once: true, weight: 2,
    title: '冬灯り祭り',
    text: () => '今夜は旧城下町で「冬灯り祭り」が開かれている。無数の灯籠が、石畳の通りを幻想的に照らしていた。',
    choices: [
      { label: () => `${SVname()}と祭りを回る`, hint: '資金 -1', cond: () => G.master.money >= 1,
        run: () => { money(-1); bond(8); return `${SV()}は灯籠の光を見上げ、小さく息をついた。${say('beautiful')}（絆+8）`; } },
      { label: '人混みに紛れて偵察する', hint: '知力判定', run: () => {
          const c = chk('int', 55);
          if (c.ok) { const t = intelRandom(1); return [c.text, t || '収穫はなかった。']; }
          return [c.text, '人が多すぎて、何も分からなかった。'];
        } },
    ],
  },
  {
    id: 'trueName_clue', phase: 'war', time: 'day', once: false, weight: 2, cond: () => aliveRivals().some(r => r.intel >= 1 && r.intel < 3),
    title: '真名の手がかり',
    text: () => '図書館の郷土資料室。これまでの戦闘で見た敵サーヴァントの武器や戦い方を、伝承と照らし合わせてみる。',
    choices: [
      { label: '文献を徹底的に調べる', hint: '知力判定', run: () => {
          const c = chk('int', 60);
          if (c.ok) {
            const r = aliveRivals().filter(r => r.intel >= 1 && r.intel < 3)[0];
            r.intel = 3; return [c.text, `間違いない。${r.cls}の真名は<b>${servantOf(r).name}</b>だ！ 弱点も見えてきた。`];
          }
          return [c.text, '決め手に欠ける。'];
        } },
    ],
  },
  {
    id: 'witness', phase: 'war', time: 'day', once: true, weight: 2,
    title: '目撃者',
    text: () => `顔見知りの近所の人に声をかけられた。「ねえ、昨日の夜、あなたと一緒にいた人……空を飛んでなかった？」<br>どうやら${SV()}の姿を見られていたらしい。`,
    choices: [
      { label: '暗示の魔術で記憶を消す', hint: '魔力判定', run: () => {
          const c = chk('mag', 50);
          if (c.ok) { tone('law'); return [c.text, '相手の目がとろんと曇った。「……あれ、何の話だっけ」']; }
          gain('spi', -2); return [c.text, '術が上手くかからない。適当にごまかして、その場を離れた。（精神-2）'];
        } },
      { label: '冗談でごまかす', hint: '交渉判定', run: () => {
          const c = chk('cha', 50);
          if (c.ok) return [c.text, '「あはは、コスプレの撮影だよ」……どうにか納得してもらえた。'];
          return [c.text, '相手は首を傾げたままだ。噂にならなければいいが。'];
        } },
    ],
  },
  {
    id: 'master_meeting', phase: 'war', time: 'day', once: true, weight: 2,
    title: 'マスター同士の邂逅',
    text: () => {
      const r = G.tmpRival = randomAliveRival();
      return `昼間の公園。ベンチに座る人物の手の甲に、令呪の輝きが見えた。${r.type}――${r.master}だ。向こうもこちらに気付いた。<br>「${r.quote}」`;
    },
    choices: [
      { label: '言葉を交わし、探りを入れる', hint: '交渉判定', run: () => {
          const r = G.tmpRival; const c = chk('cha', 55);
          if (c.ok) { r.intel = Math.max(r.intel, 2); return [c.text, `腹の探り合いの末、${r.cls}陣営の拠点の位置を掴んだ。`]; }
          r.intel = Math.max(r.intel, 1); return [c.text, '相手は一枚上手だった。分かったのは相手の名前と顔だけだ。'];
        } },
      { label: '昼間の不戦協定を守り、立ち去る', hint: '秩序', run: () => { tone('law'); G.tmpRival.intel = Math.max(G.tmpRival.intel, 1); return '昼間の争いは避けるのが暗黙のルールだ。あなたは静かにその場を離れた。'; } },
    ],
  },
  {
    id: 'servant_argue', phase: 'war', time: 'night', once: true, weight: 2,
    title: '単独行動の申し出',
    text: () => `${say('soloRequest')}<br>${SV()}は譲らない様子だ。`,
    choices: [
      { label: '信じて任せる', hint: '混沌', run: () => {
          tone('chaos'); const c = schk(2, 55);
          if (c.ok) { bond(4); const t = intelRandom(1); return [c.text, `夜明け前、${SV()}は無事に戻ってきた。${say('soloBack')}（絆+4）`, t || '']; }
          shp(-20); bond(2); return [c.text, `${SV()}は傷を負って戻ってきた。${say('soloHurt')}（サーヴァントHP-20）`];
        } },
      { label: '危険だと止める', hint: '秩序', run: () => { tone('law'); return `${say('obey')}<br>${SV()}は渋々頷いた。`; } },
      { label: '一緒に行く', hint: '体力判定', run: () => {
          const c = chk('phy', 55);
          if (c.ok) { bond(5); const t = intelRandom(1); return [c.text, `二人で夜の街を駆けた。${say('reckless')}${SV()}は呆れつつも笑っていた。（絆+5）`, t || '']; }
          hp(-15); bond(3); return [c.text, '足手まといになってしまった。それでも、隣を走ったことに意味はあった。（HP-15 絆+3）'];
        } },
    ],
  },
  {
    id: 'injured_master', phase: 'war', time: 'night', once: true, weight: 2, cond: () => G.rivals.some(r => !r.alive && !r.masterDead),
    title: '敗れたマスター',
    text: () => '雨の降る夜道で、うずくまる人影を見つけた。サーヴァントを失ったマスターだ。令呪の輝きはまだ一画、残っている。',
    choices: [
      { label: '教会まで送り届ける', hint: '善', run: () => { tone('good'); gain('luk', 3); return '相手は弱々しく礼を言った。「……あんたは、勝てよ」（幸運+3）'; } },
      { label: '残った令呪を奪う', hint: '悪 / 令呪+1', cond: () => G.master.seals < 3, run: () => { tone('evil'); G.master.seals++; return '相手の腕から令呪を剥ぎ取った。右手に、新たな一画が刻まれる。（令呪+1）'; } },
      { label: '放っておく', run: () => '関わる理由はない。あなたは通り過ぎた。' },
    ],
  },
];

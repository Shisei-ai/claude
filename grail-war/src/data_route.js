// =============================================================
//  data_route.js … 三つのルート（通常のシナリオのみ）
//
//  聖杯戦争2日目の昼「胸騒ぎ」で、三人のヒロインそれぞれの物語へ分かれる。
//   ・商店街   → 英霊ルート（通常の聖杯戦争）……最初から選べる
//   ・静かな祠 → 雫ルート（分岐「天降の祟り」）……雫との関係値が50以上
//   ・桜の木   → 幼馴染ルート（願い桜。data_sakura.js）……幼馴染との関係値が75以上
//  雫ルート以外では、山の神の事件（霧の夜・巫女の失踪）は起きず、雫は神社で無事に過ごす。
//  特殊シナリオ（藤丸・士郎・岸波）には分岐はなく、天降の祟りはこれまで通り霧の夜から入れる。
// =============================================================

const ROUTE3 = {
  servant: { name: '英霊ルート', desc: '英霊と共に、聖杯戦争を戦い抜く物語' },
  miko: { name: '雫ルート', desc: '天降山の神と、花嫁に選ばれる少女の物語' },
  friend: { name: '幼馴染ルート', desc: '幼馴染の願いと、桜の木に眠る秘密の物語' },
};
const ROUTE_MIKO_BOND = 50, ROUTE_FRIEND_BOND = 75;
const ROUTE_FRIEND_READY = true;   // 幼馴染ルート（data_sakura.js）
function route3Normal() { return !!G && G.phase === 'war' && !!G.servant && !isFuji() && !isKishi() && !isShirou(); }
function routeMikoOpen() { return typeof mkMet === 'function' && mkMet() && !mkFar() && miko().bond >= ROUTE_MIKO_BOND; }
function routeFriendOpen() { return typeof frNormal === 'function' && frNormal() && !frCut() && G.friend.bond >= ROUTE_FRIEND_BOND; }
// 雫ルート・幼馴染ルート：聖杯の真相（昏睡事件・黒い影）の物語は起きず、それぞれの物語に置き換わる
function altRoute() { return !!G && (G.route3 === 'friend' || G.route3 === 'miko'); }
function setRoute3(k) { G.route3 = k; addLog(`物語の分岐：${ROUTE3[k].name}（${ROUTE3[k].desc}）`); }

STORY.push(
  { id: 'r_route', phase: 'war', day: 2, slot: 0, after: 'hub', cond: () => route3Normal() && !G.route3,
    title: '胸騒ぎ',
    text: () => `目を覚ました時から、胸の奥がざわついていた。<br>何か、とても大きな胸騒ぎを感じる。聖杯戦争のせいだけではない、もっと別の――名前のつけられない何か。<br>${SV()}が、窓辺からこちらを見ている。「顔色が悪い」とでも言いたげだった。<br>気晴らしに、散策に出たい。……どこに行こうか。`,
    choices: [
      { label: '城跡公園の、桜の木', hint: () => !routeFriendOpen() ? `足が向かない……（${friendName() || '幼馴染'}との関係が、とても深ければ）` : !ROUTE_FRIEND_READY ? '幼馴染ルート（準備中）' : `幼馴染ルートへ（${ROUTE3.friend.desc}）`,
        disabled: () => !routeFriendOpen() || !ROUTE_FRIEND_READY, cond: () => typeof frNormal === 'function' && frNormal(),
        run: () => { setRoute3('friend'); friend(5); skStart();
          const n = friendName();
          return [`城跡公園の、いちばん大きな桜の木。二人の「秘密の場所」。<br>冬枯れの枝の先に、<b>一輪だけ</b>、薄紅色の花が咲いていた。真冬なのに。`,
            `その下に、${n}が立っていた。まるで、あなたが来るのを知っていたみたいに。`,
            `<p class="quote">「${fg('……お前も、来たのか。なんか、呼ばれた気がしてさ', '……あなたも、来たんだ。なんか、呼ばれた気がして')}」</p>${n}は、手袋を外した右手を、そっと幹に当てた。その指先が、かすかに薄紅色に光った気がした。`,
            `<p class="quote">「${fg('……変だよな。この木に触ってると、体の熱が、少しだけ楽になるんだ', '……変だよね。この木に触ってると、体の熱が、少しだけ楽になるの')}」</p>`,
            `<span class="note">「${ROUTE3.friend.name}」に入った。${ROUTE3.friend.desc}。</span>`]; } },
      { label: '天降神社の奥の、静かな祠', hint: () => routeMikoOpen() ? `雫ルートへ（${ROUTE3.miko.desc}）` : `胸の奥で、何かが引っかかる……（${CAST.miko}との関係が深ければ）`,
        disabled: () => !routeMikoOpen(), cond: () => typeof mkMet === 'function' && mkMet(),
        run: () => { setRoute3('miko'); mk(5); const s = SHIZUKU(); const c = mkCall();
          return [`天降神社の石段を登り、本殿の裏の細い道を抜けた先。苔むした小さな祠の前に、巫女装束の${s}が立っていた。`,
            `<p class="quote">「……${c}も、聞こえたんですか」</p>${s}は、山の頂を見上げたまま言った。<p class="quote">「山が、ずっと鳴いてるんです。子どもの頃に聞いた、あの寂しい声が。――今年は、何かが違う」</p>`,
            mkR({ lover: `${s}は、あなたの袖をそっと掴んだ。その指が、冷たかった。`, sister: `${s}は、心細そうに、あなたの袖を掴んだ。`, ally: `${s}は、あなたの顔を見て、少しだけ安心したように笑った。「……${c}が来てくれて、よかった」`, known: `${s}は、あなたに小さく頭を下げた。` }),
            `祠の奥の鏡が、一瞬だけ、白く光った気がした。`,
            `<span class="note">「${ROUTE3.miko.name}」に入った。${ROUTE3.miko.desc}。</span>`]; } },
      { label: '駅前の商店街', hint: `英霊ルートへ（${ROUTE3.servant.desc}）`, cls: 'primary',
        run: () => { setRoute3('servant'); bond(3);
          return [`冬の商店街は、聖杯戦争などどこ吹く風で賑わっていた。焼き芋の匂い、福引の鐘の音、呼び込みの声。`,
            `${SV()}が、物珍しそうにあたりを見回している。その横顔を見ているうちに、胸のざわつきは、少しずつ静まっていった。`,
            `――この戦いを、${SV()}と共に、最後まで戦い抜く。それだけを考えればいい。`,
            `<span class="note">「${ROUTE3.servant.name}」に入った。${ROUTE3.servant.desc}。（絆+3）</span>`]; } },
    ] },
);

// =============================================================
//  data_family.js … エピローグ：恋人と歩む人生の「二人の未来」
//
//  恋人と共に生きるエピローグ（英霊と恋人として生きる／遠坂凛・間桐桜と歩む人生／別れの後に新しい人の手を取った人生）に、
//  「二人の未来」の章が入る。
//   ・愛を確かめる … 子が産まれる。以後の章の細部（老いる日々・最期の日・花見 など）に、子が登場する
//   ・2人で生きていく … 二人きりの人生。以後の章は、二人きりの穏やかな日々として描かれる
//  （この版では、性的な描写は含めない）
// =============================================================

function partnerName() {
  const t = G.epi && G.epi.track;
  return t === 'shirou_rin' ? '遠坂' : t === 'shirou_sakura' ? '桜' : t === 'together_lover' ? SV() : 'その人';
}
function kid() { return G.epi && G.epi.child ? G.epi.child.name : ''; }
// 子が呼ぶ、主人公の呼び名
function kidCalls() { return gw('お父さん', 'お母さん', 'あなた'); }
function kidLooks() {
  const t = G.epi.track;
  return t === 'shirou_rin' ? '遠坂によく似た、意志の強い瞳' : t === 'shirou_sakura' ? '桜によく似た、柔らかな笑顔'
    : t === 'together_lover' ? `${SV()}によく似た瞳。英霊の血を引くその子は、時々、驚くほど大人びた顔をする` : 'あなたとその人の、両方によく似た顔';
}

const EPI_LOVE = { y: 8, title: '二人の未来',
  text: () => {
    const p = partnerName(); const t = G.epi.track;
    const lead = t === 'shirou_rin' ? '結婚して二年。遠坂家の書斎で、遠坂が珍しく言葉を選んでいた。「……ねえ、士郎。私たちの、これからのことなんだけど」'
      : t === 'shirou_sakura' ? '結婚して二年。夕食の後片付けをしながら、桜が小さな声で言った。「先輩。……私、いつか、家族が増えたらいいなって」'
        : t === 'together_lover' ? `結婚して二年。縁側で並んで月を見ていると、${p}がぽつりと言った。` + sq({ p: '「……{you}との家族が、ほしいと思うのです。これは、我儘でしょうか」', r: '「なあ。……オレたちの家族、増やしてみねえか」', c: '「……{you}との家族を、考えていた」', g: '「我らの血を継ぐ者を、この世に残したいとは思わぬか」', b: '「ねえ、{call}。……家族、増やしたいな」', m: '（{s}が、近所の家族連れを、いつまでも目で追っていた）' })
          : '新しい人と歩み始めて、数年。穏やかな日々の中で、二人はこれからのことを話し合った。';
    return `${lead}<br>二人で歩んできた日々。これから先も、ずっと一緒にいる。――その未来に、どんな形を選ぶだろう。`;
  },
  choices: [
    { label: '愛を確かめる', hint: '子が産まれる', run: () => {
        const g = pick(['m', 'f']); const name = pick(g === 'm' ? NAMES.givenM : NAMES.givenF); G.epi.child = { name, g };
        epiGain({ joy: 2, legacy: 3 }, `子の${name}が生まれた`);
        return `互いの想いを、言葉よりも確かな温もりで、もう一度確かめ合った。<br>――翌年の春。小さな命が、この世界にやって来た。<br>元気な${g === 'm' ? '男の子' : '女の子'}だった。<b>${name}</b>と名付けた。${kidLooks()}をしていた。<br>${partnerName()}は、生まれたばかりの${name}を抱いて、泣きながら笑っていた。`;
      } },
    { label: '2人で生きていく', hint: '二人きりの人生', run: () => {
        G.epi.child = null; G.epi.twoOnly = true; epiGain({ bond: 3, joy: 1 }, '二人きりで生きていくと決めた');
        return `「二人でいい。……二人がいい」<br>そう言うと、${partnerName()}は少し驚いて、それから、これまでで一番穏やかな顔で頷いた。<br>小さな家に、二人分の茶碗。それだけで、十分に満ちていた。`;
      } },
  ] };

// ---- 子の有無で変わる、各章の細部 ----
const KID_NOTES = {
  together_lover: {
    '共に老いる': () => kid() ? `<br>${kid()}はとうに独り立ちし、今では自分の家族を連れて、盆と正月に帰ってくる。「${SV()}の口癖まで似てきた」と、二人で笑った。` : '<br>二人きりの家には、季節ごとに同じ花が咲く。子どもはいないけれど、寂しいと思ったことは一度もない。',
    '最期の日': () => kid() ? `<br>部屋の隅で、${kid()}が、孫たちの肩を抱いて泣いている。「${kidCalls()}……ありがとう」` : '<br>ほかには、誰もいない。二人きりの部屋に、静かな時間だけが流れていく。',
  },
  shirou_rin: {
    '第二魔法への挑戦': () => kid() ? `<br>${kid()}は遠坂そっくりの負けず嫌いで、もう宝石魔術の基礎を覚え始めている。「${kidCalls()}より先に、根源に届いてやるんだから！」` : '<br>二人きりの研究室に、宝石の光だけが静かに瞬いている。',
    '最期の日': () => kid() ? `<br>遠坂の反対側の手を、すっかり大人になった${kid()}が握っていた。` : '',
  },
  shirou_sakura: {
    '帰る場所': () => kid() ? `<br>${kid()}は、桜に似た優しい子に育った。台所に三人で立つ朝が、何よりの幸せだった。` : '<br>子どものいない家だけれど、近所の子どもたちが、いつの間にか夕飯時に集まってくるようになった。',
    '最期の日': () => kid() ? `<br>桜の後ろで、${kid()}が泣きじゃくっている。「${kidCalls()}……行かないで」` : '',
  },
  parted: {
    '召喚陣の夢': () => G.epi.newLove ? (kid() ? `<br>目を覚ますと、隣の部屋で${kid()}の寝息が聞こえた。……今の家族も、かけがえのないものだ。` : '<br>目を覚ますと、隣でその人が穏やかな寝息を立てていた。') : '',
    '最期の日': () => G.epi.newLove ? (kid() ? `<br>旅立ちの前、その人と${kid()}が、両側から手を握ってくれていた。` : '<br>旅立ちの前、その人が、ずっと手を握ってくれていた。') : '',
  },
};
// 衛宮邸の花見（士郎シナリオの共通の章）
EPI_SHIROU_B.kidNote = () => kid() ? `<br>庭では、${kid()}が藤ねえに振り回されて走り回っている。` : '';
for (const [track, notes] of Object.entries(KID_NOTES)) for (const st of EPI[track] || []) if (notes[st.title]) st.kidNote = notes[st.title];

// ---- 各トラックへの差し込み ----
// 英霊と恋人として生きる：結婚式の後の「家族のかたち」を、「二人の未来」に置き換える
{ const t = EPI.together_lover; const i = t.findIndex(s => s.title === '家族のかたち'); if (i >= 0) t[i] = { ...EPI_LOVE, y: 8 }; }
// 遠坂凛・間桐桜と歩む人生：結婚式の後に
for (const [track, after] of [['shirou_rin', '遠坂家の結婚式'], ['shirou_sakura', '桜の下で']]) {
  const t = EPI[track]; const i = t.findIndex(s => s.title === after); if (i >= 0) t.splice(i + 1, 0, { ...EPI_LOVE, y: 8 });
}
// 別れの後に、新しい人の手を取った場合：その後に
{ const st = (EPI.parted || []).find(s => s.title === '面影');
  if (st) { const c = st.choices[0]; const run = c.run;
    c.run = () => { const r = run(); if (G.servant && G.servant.special === 'lover') { G.epi.newLove = true; G.epi.steps.splice(G.epi.i + 1, 0, { ...EPI_LOVE, y: 12 }); } return r; }; } }

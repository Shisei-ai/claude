// =============================================================
//  data_friend_epi.js … エピローグ「その後の人生」の、幼馴染の章
//
//  幼馴染が生きていれば（戦いに敗れていても）、その後の人生に登場する。
//  関係（恋人・親友・幼馴染・絶縁）と、願いの行方（叶ったか、別の道を見つけたか、叶わなかったか）で章と文章が変わる。
//
//   1年後  約束の桜        … 桜の木の下で、あの冬のその後を見届ける（絶縁なら3年後「すれ違う街角」：仲直りの機会）
//   2・4年後 残された時間／最後の桜 … 幼馴染自身の命が懸かった願いが叶わなかった場合。別れの章
//   5年後  求婚            … 恋人なら。結婚すれば、幼馴染が「二人の未来」の相手になる
//   7年後  それぞれの道    … 願いが形を変えて、幼馴染の生き方になる
//   18年後 友の門出        … 恋人として結ばれなかった幼馴染の結婚式。親友ならスピーチを頼まれる
//   40年後 一輪の花        … 最後まで仲直りしなかった場合
//   50年後 桜の木の下で、もう一度 … 年老いた二人
//  戦いで命を落とした幼馴染は、1年後「墓前の桜」で偲ぶ。
// =============================================================

const frDone = () => G.epi && ['friendWish', 'yield', 'friendRuin', 'skCut', 'skBear', 'skReturn'].includes(G.epi.kind);                 // 聖杯が幼馴染の願いを叶えた
const frDying = () => fr().wish === 'self' && !frDone() && !G.flags.frOtherWay;             // 自分の命の願いが、叶わなかった
const frEpiCut = () => frCut() && !G.epi.frMended;                                           // 絶縁したまま
const frTogether = () => G.epi && /^together_/.test(G.epi.track);                            // 英霊がそばにいる人生
// 願いの行方を、一文で
function frFate() {
  const n = friendName(); const w = fr().wish; const s = fr().sis;
  if (frDone()) return { sister: `${s}ちゃんは、走れるようになった。今では、${n}より足が速い。`, mother: `${n}のお母さんは、すっかり元気になった。三年分の小言を、まとめて${n}にぶつけている。`, self: `${n}の体は、嘘のように軽くなった。熱を出すことも、もうない。` }[w];
  if (G.flags.frOtherWay) return { sister: `${s}ちゃんは、新しい治療を受けて、少しずつ良くなっている。あの夜に二人で見つけた、細い糸の先だった。`, mother: `${n}のお母さんの指が、先月、かすかに動いた。医師は「奇跡に近い」と言った。`, self: `${n}の発作は、新しい薬で抑えられるようになった。治ったわけではない。けれど、未来の話ができるようになった。` }[w];
  return { sister: `${s}ちゃんは、今も入退院を繰り返している。それでも、春を迎えられた。`, mother: `${n}のお母さんは、今も眠り続けている。${n}は毎週、枕元で本を読み聞かせている。`, self: `${n}の熱は、少しずつ高くなる日が増えている。` }[w];
}
const frTalk = (m, f) => fg(m, f);

const FRIEND_EPI = {
  // ---- 1年後：約束の桜 ----
  spring: { y: 1, title: '約束の桜', skip: () => frEpiCut(),
    text: () => { const n = friendName(); const rel = frRel();
      return `あの冬から、初めての春。城跡公園のいちばん大きな桜が、満開になった。<br>` +
        (rel === 'lover' ? `${n}が、あなたの手を握ったまま、花を見上げている。` : rel === 'best' ? `${n}が、缶ジュースを二本ぶら下げてやって来た。` : `「やっぱり来てた」――${n}が、少し照れくさそうに隣に立った。`) +
        `<br>${frFate()}` + (G.flags.frSakura ? `<br>「${frTalk('……約束、守れたな。毎年ここで、って', '……約束、守れたね。毎年ここで、って')}」` : '') +
        (frTogether() ? `<br>少し離れた場所で、${SV()}が、二人を静かに見守っていた。` : ''); },
    choices: [
      { label: '「来年も、再来年も、ここで」', hint: '幸福↑・絆↑', run: () => epiGain({ joy: 2, bond: 1 }, '幼馴染と、桜の下で毎年の約束をした') || `${friendName()}は笑って、小指を差し出した。九歳のあの日と、同じように。` },
      { label: 'あの冬の話をする', hint: '遺したもの↑', run: () => epiGain({ legacy: 2, joy: 1 }, '幼馴染と、あの冬のことを語り合った') || `令呪のこと、英霊のこと、${G.flags.frBlind || G.flags.frBetrayed || G.flags.frAbandoned ? '言えなかったこと' : '助け合った夜のこと'}。花びらが散り終わるまで、二人は話し続けた。` },
    ] },
  // ---- 3年後：すれ違う街角（絶縁したまま） ----
  street: { y: 3, title: 'すれ違う街角',
    text: () => `駅前の雑踏で、${friendName()}とすれ違った。三年ぶりだった。<br>${friendName()}は一瞬だけ足を止め、それから、何事もなかったように歩き出した。<br>${frFate()}――噂で、そう聞いていた。`,
    choices: [
      { label: '追いかけて、名前を呼ぶ', hint: '関係を取り戻せるかもしれない', run: () => {
          const ok = G.flags.frWaiting || G.friend.bond > -60;
          if (ok) { G.epi.frMended = true; epiGain({ joy: 2, bond: 2 }, '絶縁した幼馴染と、仲直りした');
            return `「……${friendName()}！」<br>振り返った顔は、泣きそうに歪んでいた。「${frTalk('……遅えよ。何年待たせるんだ', '……遅いよ。何年待たせるの')}」<br>二人は、近くの喫茶店で、閉店まで話し込んだ。`; }
          epiGain({ legacy: 1 }, '幼馴染を追いかけたが、届かなかった');
          return `名前を呼んだ。${friendName()}は、振り返らなかった。――それが、答えだった。`;
        } },
      { label: '人混みに消える背中を、見送る', hint: '精神', run: () => epiGain({ legacy: 1 }, '幼馴染の背中を見送った') || `あなたは立ち止まったまま、その背中が見えなくなるまで見送った。` },
    ] },
  // ---- 2年後：残された時間（恋人で、命の願いが叶わなかった場合） ----
  lastTime: { y: 2, title: '残された時間', skip: () => frEpiCut(),
    text: () => `${friendName()}の熱は、日に日に高くなっていった。医師は、残された時間を「二年」と言った。<br>病室の窓から桜を見ながら、${friendName()}が言った。「${frTalk('……なあ。俺、お前と、ちゃんと家族になりたかった', '……ねえ。わたし、あなたと、ちゃんと家族になりたかった')}」`,
    choices: [
      { label: '病室で、二人だけの式を挙げる', hint: '絆↑↑', run: () => { G.epi.frMarriedLate = true; epiGain({ bond: 3, joy: 1 }, '病室で、幼馴染と二人だけの式を挙げた');
          return `看護師さんがこっそり用意してくれた花と、指輪が二つ。${fg('白いシャツ', '白いワンピース')}の${friendName()}は、「${frTalk('世界一の結婚式だな', '世界一の結婚式だね')}」と笑った。`; } },
      { label: '二人で、最後の旅に出る', hint: '幸福↑↑', run: () => epiGain({ joy: 3 }, '幼馴染と、最後の旅に出た') || `医師の許可を取って、海の見える町へ行った。${friendName()}は、波打ち際で子どもみたいにはしゃいだ。` },
    ] },
  // ---- 4年後：最後の桜（命の願いが叶わなかった場合） ----
  farewell: { y: 4, title: '最後の桜', skip: () => frEpiCut(),
    text: () => { const n = friendName(); const rel = frRel();
      return `${n}が、もう長くないと連絡を受けた。<br>車椅子を押して、城跡公園の桜の木の下へ行った。満開の花の下で、${n}は${rel === 'lover' ? 'あなたの手を握って' : 'あなたを見上げて'}言った。<br>` +
        `「${frTalk(`……悪くない人生だった。お前がいたからな`, `……悪くない人生だった。あなたがいたから`)}」` +
        (G.flags.frBlind ? `<br>「${frTalk('あの夜、黙っててくれて、ありがとな。……ずっと、重かっただろ', 'あの夜、黙っていてくれて、ありがとう。……ずっと、重かったでしょ')}」` : '') +
        (G.flags.frStopped ? `<br>「${frTalk('止めてくれて、ありがとう。あのまま進んでたら、俺は、俺じゃなくなってた', '止めてくれて、ありがとう。あのまま進んでたら、わたしは、わたしじゃなくなってた')}」` : ''); },
    choices: [
      { label: '「来年も、ここで待ってる」', hint: '絆↑↑', run: () => { G.epi.frDead = true; epiGain({ bond: 3 }, '幼馴染を見送った');
          return `${friendName()}は、小さく笑って、目を閉じた。<br>――その年の桜が散る頃、${friendName()}は旅立った。<br>翌年から、あなたは毎年、一人で桜の木の下に立つ。約束どおりに。`; } },
      { label: '黙って、最後まで手を握っている', hint: '遺したもの↑↑', run: () => { G.epi.frDead = true; epiGain({ legacy: 2, bond: 1 }, '幼馴染の最期を看取った');
          return `言葉は、もういらなかった。花びらが、二人の上に降り積もっていった。<br>――その年の桜が散る頃、${friendName()}は旅立った。最後まで、あなたの手を離さなかった。`; } },
    ] },
  // ---- 5年後：求婚（恋人） ----
  propose: { y: 5, title: '求婚', skip: () => frEpiCut() || frRel() !== 'lover' || G.epi.frDead,
    text: () => `${friendName()}と付き合い始めて、もう何年になるだろう。<br>城跡公園の桜の木の下。九歳のあの日から、二人の時間はずっとここにあった。<br>${frFate()}` +
      (frTogether() ? `<br>${SV()}が、あなたの背中を、ぽんと押した。「――行ってこい」と言うように。` : ''),
    choices: [
      { label: '「結婚しよう」', hint: '幼馴染と、人生を共に歩む', run: () => {
          const e = G.epi; e.frSpouse = true; e.newLove = true;
          e.steps = e.steps.filter((s, i) => i <= e.i || s.title !== '面影');   // 新しい人と出会う章は、もういらない
          if (!e.steps.some(s => s.title === '二人の未来')) { const i = e.steps.findIndex((s, k) => k > e.i && s.y > 6); e.steps.splice(i < 0 ? e.steps.length - 1 : i, 0, { ...EPI_LOVE, y: 7 }); }
          epiGain({ joy: 3, bond: 1 }, `幼馴染の${G.friend.name}と結婚した`);
          return `${friendName()}は、泣きながら頷いた。「${frTalk('……遅えよ。でも、ありがとな', '……遅いよ。でも、ありがとう')}」<br>式は、天降神社で挙げた。${fg(`紋付袴の${friendName()}と、白無垢のあなた`, `白無垢の${friendName()}と、紋付袴のあなた`)}。${mikoHere() ? `${CAST.miko}が祝詞を上げ` : '年老いた宮司が祝詞を上げ'}、参列した人たちは、二人が九歳の頃から知っている顔ばかりだった。`;
        } },
      { label: '「今のままで、いいんだ」', hint: '恋人のまま、それぞれの道を', run: () => { G.epi.frNoMarry = true; epiGain({ legacy: 2 }, '幼馴染と、結婚という形を選ばなかった');
          return `${friendName()}は少し驚いて、それから笑った。「${frTalk('……お前らしいな', '……あなたらしいね')}」<br>二人は、恋人のまま、それぞれの道を歩くことにした。`; } },
    ] },
  // ---- 7年後：それぞれの道 ----
  path: { y: 7, title: 'それぞれの道', skip: () => frEpiCut() || G.epi.frDead || G.epi.frSpouse,
    text: () => { const n = friendName(); const w = fr().wish;
      const job = { sister: `${n}は、小児科の看護師になった。「${fr().sis}みたいな子を、一人でも多く支えたいんだ」`, mother: `${n}は、病院のリハビリの専門職に就いた。目を覚ました人が、もう一度歩けるように。`, self: frDone() || G.flags.frOtherWay ? `${n}は、世界中を旅する写真家になった。「生きてるうちに、全部見ておきたいんだ」――冗談めかして言うけれど、その目は本気だった。` : `${n}は、自分と同じ病の子どもたちのために、小さな基金を立ち上げた。` }[w];
      return `七年が過ぎた。${job}<br>${frFate()}<br>${frRel() === 'best' ? `月に一度の電話は、もう十年近く途切れていない。` : `年に何度か、${n}から絵葉書が届く。`}`; },
    choices: [
      { label: () => `${friendName()}の仕事を、手伝う`, hint: '遺したもの↑↑', run: () => epiGain({ legacy: 3 }, '幼馴染の仕事を手伝った') || `週末だけ、${friendName()}の仕事を手伝った。${frTalk('「お前、意外と向いてるな」', '「あなた、意外と向いてるね」')}と言われて、少しだけ誇らしかった。` },
      { label: '二人で、昔みたいに遊びに行く', hint: '幸福↑↑', run: () => epiGain({ joy: 3 }, '幼馴染と、昔みたいに遊んだ') || `ゲームセンターで勝負して、商店街で買い食いをした。大人になった二人は、子どもの頃より、少しだけ上手に笑えた。` },
    ] },
  // ---- 18年後：友の門出 ----
  wedding: { y: 18, title: '友の門出', skip: () => frEpiCut() || G.epi.frDead || G.epi.frSpouse || G.epi.frMarriedLate,
    text: () => { const n = friendName();
      return `${n}から、結婚式の招待状が届いた。相手は、${fr().wish === 'sister' ? `${fr().sis}ちゃんの主治医だった人` : fr().wish === 'mother' ? 'リハビリの仕事で出会った人' : '旅先で出会った人'}らしい。<br>` +
        (frRel() === 'lover' ? `――あの冬、恋人同士だった二人。結婚という形を選ばなかった二人。招待状の隅に、小さく「来てくれる？」と書いてあった。`
          : frRel() === 'best' ? `招待状と一緒に、メモが入っていた。「${frTalk('友人代表のスピーチ、お前以外に頼む気はないからな', '友人代表のスピーチ、あなた以外に頼む気はないからね')}」`
          : `「${frTalk('お前には、絶対来てほしい', 'あなたには、絶対来てほしいの')}」と、手書きの一言が添えられていた。`); },
    choices: [
      { label: () => frRel() === 'best' ? '友人代表のスピーチをする' : '式に出て、心から祝う', hint: '幸福↑・絆↑', run: () => epiGain({ joy: 2, bond: 1 }, '幼馴染の結婚式で、祝福を贈った') ||
          `「${friendName()}とは、六歳の夏に出会いました。――」<br>あの冬の話は、誰にも言えない。けれど、言えないことまで全部込めて、あなたは祝福を贈った。${friendName()}は、式の間じゅう泣いていた。` },
      { label: '桜の木の下で、そっと祝う', hint: '遺したもの↑', run: () => epiGain({ legacy: 2 }, '幼馴染の門出を、桜の木の下で祝った') || `式には行かず、城跡公園の桜の木の下で、一人で缶ジュースを開けた。「おめでとう」――声に出すと、少しだけ寂しかった。` },
    ] },
  // ---- 40年後：一輪の花（絶縁したまま） ----
  flower: { y: 40, title: '一輪の花', skip: () => !frEpiCut(),
    text: () => `${friendName()}とは、とうとう一度も話さないまま、四十年が過ぎた。<br>それでも、毎年春になると、城跡公園の桜の木の下に、誰かが一輪の花を置いていく。<br>今年、その花の横に、色褪せたビー玉が一つ、並べて置いてあった。――六歳の夏、半分こにした、あのビー玉だった。`,
    choices: [
      { label: '自分のビー玉を、隣に並べる', hint: '絆↑・遺したもの↑', run: () => epiGain({ bond: 2, legacy: 1 }, '桜の木の下に、二つのビー玉を並べた') || `二つのビー玉が、春の光を受けて並んでいた。翌日、片方の花が、二輪に増えていた。` },
      { label: '花だけを、そっと見つめる', hint: '幸福↑', run: () => epiGain({ joy: 1, legacy: 1 }, '幼馴染の置いた花を見つめた') || `言葉にしなくても、伝わっているのかもしれない。そう思えた春だった。` },
    ] },
  // ---- 50年後：桜の木の下で、もう一度 ----
  old: { y: 50, title: '桜の木の下で、もう一度', skip: () => frEpiCut() || G.epi.frDead,
    text: () => { const n = friendName();
      return `五十年が過ぎた。${G.epi.frSpouse ? `隣には、半世紀を共に歩いた${n}がいる。` : `杖をついて桜の木の下へ行くと、同じように杖をついた${n}が、先に来ていた。`}<br>` +
        `「${frTalk(`……お互い、ずいぶん年を取ったな`, `……お互い、ずいぶんおばあちゃんになったね`).replace('おばあちゃん', gw('おじいちゃんとおばあちゃん', 'おばあちゃん', 'おばあちゃん'))}」<br>` +
        `${n}が、ポケットから色褪せたビー玉を取り出した。六歳の夏に、半分こにしたあのビー玉。「${frTalk('ずっと、持ってたんだ', 'ずっと、持ってたの')}」` +
        (frTogether() ? `<br>あの冬から変わらない姿の${SV()}が、少し離れた場所で、二人を見守っていた。` : ''); },
    choices: [
      { label: '自分のビー玉も取り出して、並べる', hint: '絆↑↑', run: () => epiGain({ bond: 3 }, '幼馴染と、桜の下でビー玉を並べた') || `二つのビー玉が、春の光に透けて、きらきらと光った。「${frTalk('……ほんと、長い付き合いだな', '……ほんと、長い付き合いだね')}」` },
      { label: '「あの冬が、あってよかった」', hint: '幸福↑・遺したもの↑', run: () => epiGain({ joy: 2, legacy: 1 }, '幼馴染と、あの冬を懐かしんだ') || `${friendName()}は、少し考えて、それから頷いた。「${frTalk('……ああ。辛いこともあったけど、な', '……うん。辛いこともあったけど、ね')}」` },
    ] },
  // ---- 1年後：墓前の桜（戦いで命を落とした場合） ----
  grave: { y: 1, title: '墓前の桜',
    text: () => `${friendName()}の墓は、城跡公園の桜が見える丘にあった。<br>あの冬、${friendName()}は帰ってこなかった。${frFate().replace(/。$/, '')}――叶えたかった願いは、宙に浮いたままだ。`,
    choices: [
      { label: () => fr().wish === 'self' ? '代わりに、生きると誓う' : `${frWish().who}を、代わりに見守ると誓う`, hint: '遺したもの↑↑', run: () => epiGain({ legacy: 3 }, '幼馴染の代わりに、その願いを背負った') || `${fr().wish === 'self' ? `${friendName()}が生きられなかった分まで、生きる。` : `${frWish().who}の病室に、あなたは毎月、花を持って通い続けた。`}それが、あの冬に残された者の務めだと思った。` },
      { label: '墓前で、毎年の約束を果たす', hint: '絆↑↑', run: () => epiGain({ bond: 3 }, '幼馴染の墓前で、桜の約束を果たした') || '毎年の春、桜の枝を一本、墓前に供えた。「約束だからな」――返事は、風の音だけだった。' },
    ] },
};
// このプレイの幼馴染の章（startEpilogue から、年代順に差し込む）
function friendEpiSteps(track, kind) {
  { const sf = typeof skFriendEpi === 'function' ? skFriendEpi(kind) : null; if (sf) return sf; }   // 幼馴染ルートの結末（data_sakura.js）
  if (!frNormal() || !G.rivals || !G.rivals.length || /^kishi_/.test(track)) return [];
  const r = frRival(); if (!r) return [];
  if (r.killed) return [FRIEND_EPI.grave];
  const out = [];
  if (frCut()) out.push(FRIEND_EPI.street, FRIEND_EPI.flower);
  out.push(FRIEND_EPI.spring);
  if (frDying()) { if (frRel() === 'lover') out.push(FRIEND_EPI.lastTime); out.push(FRIEND_EPI.farewell); return out; }
  out.push(FRIEND_EPI.propose, FRIEND_EPI.path, FRIEND_EPI.wedding, FRIEND_EPI.old);
  return out;
}

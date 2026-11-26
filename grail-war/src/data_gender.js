// =============================================================
//  data_gender.js … 性別による差分
//
//  ・英霊の性別（SV_FEMALE にない英霊は男性。シュヴァリエ・デオンは「どちらでもない」）
//  ・英霊の呼びかけ：一部の英霊は、マスターの性別で呼び方が変わる（「坊主」「嬢ちゃん」など）
//  ・絆Lv7の「月下の告白」：場面の描写と、各関係（恋人・相棒・主従・家族）の言葉と結びの文が、
//    マスターと英霊の性別の組み合わせで変わる
//  ・幼馴染は必ずプレイヤーと異性（data_friend.js の fg / fI / fYou で台詞が変わる）
// =============================================================

const SV_FEMALE = new Set([
  'artoria', 'artoria_alter', 'nero', 'mordred', 'okita', 'musashi', 'suzuka', 'altera',
  'atalante', 'euryale', 'ishtar', 'tomoe', 'nobunaga',
  'scathach', 'elizabeth', 'brynhild', 'parvati', 'kagetora',
  'medusa', 'ushiwakamaru', 'drake', 'marie', 'medb', 'boudica',
  'medea', 'tamamo', 'nursery', 'murasaki', 'skadi', 'medea_lily', 'blavatsky', 'sanzang', 'artoria_caster', 'davinci',
  'jack', 'serenity', 'carmilla', 'shuten', 'mata_hari', 'wu_zetian', 'shiki', 'hundred', 'jingke', 'danzo',
  'kiyohime', 'tamamo_cat', 'ibaraki', 'raikou', 'nightingale', 'penthesilea', 'frankenstein',
  'jeanne', 'martha_ruler', 'jalter', 'gorgon', 'meltryllis', 'passionlip', 'okita_alter', 'bb', 'abigail', 'hokusai', 'mash',
]);
const SV_NEUTRAL = new Set(['deon']);
function svGender(sv) { const id = (sv || servantOf(G)).id; return SV_FEMALE.has(id) ? 'f' : SV_NEUTRAL.has(id) ? 'n' : 'm'; }

// 英霊の呼びかけ（{call}。必要なら二人称 {you} も）：マスターの性別で変わる英霊
const GENDER_CALL = {
  cuchulainn: { m: ['坊主'], f: ['嬢ちゃん'] },
  cu_caster: { m: ['坊主'], f: ['嬢ちゃん'] },
  iskandar: { m: ['坊主'], f: ['娘'] },
  fergus: { m: ['坊主'], f: ['嬢ちゃん'] },
  beowulf: { m: ['坊主'], f: ['嬢ちゃん'] },
  muramasa: { m: ['坊主'], f: ['嬢ちゃん'] },
  hector: { m: ['坊主'], f: ['お嬢ちゃん'] },
  drake: { m: ['坊や'], f: ['お嬢ちゃん'] },
  mata_hari: { m: ['坊や'], f: ['お嬢さん'] },
  robin: { m: ['旦那'], f: ['お嬢さん'] },
  shuten: { m: ['旦那はん'], f: ['お嬢はん', 'お嬢はん'] },
  kiyohime: { m: ['旦那様', 'あなた様'], f: ['ますたぁ'] },
  napoleon: { m: ['マスター'], f: ['マドモアゼル'] },
  lancelot_saber: { m: ['マスター'], f: ['レディ'] },
  gawain: { m: ['マスター'], f: ['レディ'] },
  deon: { m: ['ムッシュ'], f: ['マドモアゼル'] },
};
// voiceOf から呼ぶ：性別で呼び方を差し替える
function genderVoice(sv, call, you) {
  const g = gender(); const e = GENDER_CALL[sv.id];
  if (!e || (g !== 'm' && g !== 'f')) return { call, you };
  const [c, y] = e[g]; return { call: c || call, you: y || you };
}

// ---- 絆Lv7「月下の告白」 ----
// pair：'mf'（男性マスター×女性英霊）'fm'（女性マスター×男性英霊）'mm' 'ff'（同性）'n'（どちらかが指定なし）
function bondPair(sv) { const a = gender(), b = svGender(sv); if (a === 'n' || b === 'n') return 'n'; return a + b; }
function specialIntro(sv) {
  const s = SV();
  return {
    mf: `月の綺麗な夜だった。縁側で並んで月を見上げていた${s}が、ふと、あなたの方へ向き直った。月明かりに照らされた横顔が、いつもより少しだけ幼く見えた。`,
    fm: `月の綺麗な夜だった。冷えるからと、${s}が自分の外套をあなたの肩に掛けた。そのまま離れずに、${s}は真剣な顔であなたを見下ろした。`,
    mm: `月の綺麗な夜だった。酒の代わりに湯呑みを交わしていた${s}が、ふと手を止め、真剣な顔であなたを見た。`,
    ff: `月の綺麗な夜だった。同じ毛布にくるまって月を見上げていた${s}が、ふと、あなたの手をそっと握った。`,
    n: `月の綺麗な夜だった。${s}がふと、真剣な顔であなたを見つめた。`,
  }[bondPair(sv)];
}
// 関係ごとの言葉（選択肢）と、結びの文
function relationText(k, sv) {
  const p = bondPair(sv); const sg = svGender(sv); const child = typeof CHILDREN !== 'undefined' && CHILDREN.has(sv.id);
  const base = RELATIONS[k];
  if (k === 'lover') return {
    verb: { mf: '「君が好きだ」と告げる', fm: '「あなたが好き」と告げる', mm: '想いを伝える', ff: '想いを伝える', n: base.verb }[p],
    text: {
      mf: '{s}は一瞬目を見開き、それから、これまでで一番柔らかな表情を見せた。あなたがそっと抱き寄せると、{s}は何も言わずに、その胸に額を預けた。',
      fm: '{s}は一瞬目を見開き、それから、これまでで一番柔らかな表情を見せた。大きな手が、壊れ物に触れるように、あなたの頬に添えられた。',
      mm: '{s}は一瞬目を見開き、それから、照れくさそうに笑って、あなたの肩を引き寄せた。重ねた手のぬくもりは、英霊も人も変わらなかった。',
      ff: '{s}は一瞬目を見開き、それから、花がほころぶように笑った。指を絡めて握り返された手のぬくもりは、英霊も人も変わらなかった。',
      n: base.text,
    }[p] };
  if (k === 'partner') return { verb: base.verb, text: {
    mm: '{s}は満足そうに笑い、拳を軽くあなたの胸に当てた。男同士、それ以上の言葉はいらなかった。',
    ff: '{s}は満足そうに笑い、あなたの手を取って高く掲げた。「最強の二人だ」と言わんばかりに。',
    mf: '{s}は満足そうに笑い、あなたの背中を思い切り叩いた。「……当然でしょう。あなたの隣は、私の場所よ」――そう言いたげな目をしていた。',
    fm: '{s}は満足そうに笑い、あなたの頭をくしゃりと撫でた。背中を預け合う相手として、確かに認められたのだと分かった。',
    n: base.text }[p] };
  if (k === 'oath') return { verb: base.verb, text: {
    fm: '{s}は片膝をつき、騎士が姫君にするように、あなたの手を取って額に押し当てた。令呪よりも確かな繋がりが、魂に刻まれる。',
    mf: '{s}は胸に手を当て、静かに頭を垂れた。「この身は、あなたの剣」――月明かりの下、令呪よりも確かな繋がりが、魂に刻まれる。',
    mm: '月明かりの下、{s}はあなたの前に膝をつき、主と仰いだ。令呪よりも確かな繋がりが、魂に刻まれる。',
    ff: '月明かりの下、{s}はあなたの両手を包み、額を寄せた。令呪よりも確かな繋がりが、魂に刻まれる。',
    n: base.text }[p] };
  // 家族：英霊が兄・姉、子どもの英霊なら弟・妹のように
  const role = child ? (sg === 'f' ? '妹' : sg === 'm' ? '弟' : '家族') : (sg === 'f' ? '姉' : sg === 'm' ? '兄' : '家族');
  return { verb: role === '家族' ? base.verb : `${role}のような存在だと伝える`, text: role === '家族' ? base.text
    : child ? `{s}は目をまん丸にして、それから、あなたの腰にぎゅっと抱きついた。「……じゃあ、ずっと${gw('おにいちゃん', 'おねえちゃん', 'いっしょ')}だね」――帰る場所がある温かさを、二人は分かち合った。`
    : `{s}は少し照れくさそうに、けれど嬉しそうに頷いた。「なら、${role}として、ずっと見守ってやる」――帰る場所がある温かさを、二人は分かち合った。` };
}

// 結婚式の装い（エピローグ「恋人として生きる」）
function weddingWear(place) {
  const p = bondPair(servantOf(G)); const s = SV();
  if (place === 'shrine') return { mf: `白無垢の${s}と、紋付袴のあなた`, fm: `白無垢のあなたと、紋付袴の${s}`, mm: '紋付袴を揃えた二人', ff: '白無垢を揃えた二人', n: '白無垢と紋付' }[p];
  return { mf: `純白のドレスの${s}が、あなたの腕に手を添えて歩いてきた`, fm: `純白のドレスのあなたを、${s}が祭壇の前で待っていた`, mm: '揃いの白いタキシードの二人が、並んで祭壇へ歩いた', ff: '揃いの純白のドレスの二人が、手をつないで祭壇へ歩いた', n: '二人は並んで、祭壇へ歩いた' }[p];
}

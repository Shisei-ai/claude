// レリック定義
//
// 【重要】効果の種類(RelicEffectType 130種)と効果処理は Unity版
// Roguelike/Relics/RelicData.cs + RelicManager.cs の忠実移植。
// 一方、レリックの実体(名前・説明・数値・レアリティ)は Unity 版では
// ScriptableObject アセットとしてリポジトリ外にあり未定義だったため、
// ここでの名前・数値・レアリティは Web 版での新規デザイン。
// 数値バランスは RelicManager 内のハードコード値・コメントに準拠している。
import type { StatusEffectType } from '../core/types';

export type RelicEffectType =
  // Combat: Offense
  | 'FlatDamageUp' | 'PercentDamageUp' | 'FirstHitDoubleDamage' | 'CritRateUp'
  | 'CritDamageUp' | 'ExtraHitOnCrit' | 'OnKillHeal' | 'OnKillBP' | 'ExecuteLowHP'
  | 'BonusDamageOnBreak' | 'FireDamageUp' | 'IceDamageUp' | 'LightningDamageUp'
  | 'DarkDamageUp' | 'LightDamageUp' | 'PoisonDamageUp' | 'BleedDamageUp'
  | 'MultiHitBonus' | 'LastStandDamage'
  // Web版で追加
  | 'WindDamageUp' | 'PhysicalDamageUp' | 'WeaknessAmp' | 'UndeadSlayer' | 'EliteSlayer'
  | 'MPOnKill' | 'BreakHeal' | 'StatusChanceUp' | 'DebuffExtend' | 'BloodChalice'
  // Combat: Defense
  | 'FlatDefenseUp' | 'PercentDamageReduction' | 'ThornsReflect' | 'FirstHitImmune'
  | 'ReviveOnce' | 'HealAtBattleStart' | 'RegenEachTurn' | 'ShieldPerFloor'
  | 'StatusImmunity'
  // Boost / BP
  | 'StartWithBP' | 'BPGainUp' | 'BoostFree' | 'BoostDamageMultiplier' | 'MaxBPUp'
  // Break
  | 'BreakDamageBonus' | 'ShieldHitBonus' | 'BreakExtend' | 'WeaknessReveal'
  // Economy / Run
  | 'GoldDropUp' | 'ShopDiscount' | 'FreeRemove' | 'GoldToHP' | 'LuckUp'
  | 'ExtraLootChoice' | 'DuplicateRelic'
  // Skill / Deck
  | 'SkillMPDiscount' | 'MPRegenEachTurn' | 'StartWithFullMP' | 'RandomSkillBuff'
  | 'EchoSkill' | 'NegateSkillCost'
  // Luck / RNG
  | 'LuckyDodge' | 'LuckyGold' | 'CursedButPowerful' | 'MiracleChance' | 'RiskRewardMaster'
  // Floor / Stage
  | 'EliteReward' | 'BossShield' | 'FloorClearHeal' | 'RestEfficiencyUp'
  // Cursed
  | 'VampiricBlade' | 'BerserkerRage' | 'ForbiddenGrimoire' | 'DeathMark'
  | 'SoulSiphon' | 'AncientCurse' | 'PhilosophersStone'
  // Conditional Offense
  | 'FirstTurnBoost' | 'StackingRage' | 'PoisonMaster' | 'BleedMaster'
  | 'ShadowStrike' | 'Opportunist' | 'ExecuteOnBreak' | 'NecroticPower'
  | 'CritChain' | 'SpiritualBalance'
  // Status Infliction
  | 'PoisonAura' | 'BleedOnCrit' | 'BurnAura' | 'ChillAura' | 'ThunderMark'
  // Defense and Survival
  | 'EvasionUp' | 'DamageCap' | 'HealingFactor' | 'Transcendence' | 'AdaptiveArmor'
  | 'FortifiedWall' | 'LastStandGuard' | 'Counterstrike'
  // BP and Boost Extended
  | 'EfficientBoost' | 'BoostExtend' | 'BoostSurge' | 'BPOnBreak'
  // Break Extended
  | 'QuickBreak' | 'BreakRegen' | 'BreakSeal'
  // Skill and Deck Extended
  | 'ManaOverflow' | 'SkillCopy' | 'JumpStart' | 'ChainBonus'
  | 'CurseWeaver' | 'SpecializedDeck'
  // Exploration
  | 'EliteHunter' | 'TreasureNose' | 'EventMaster' | 'BlackMarket' | 'GoldShield'
  // Economy and Tactics
  | 'CompoundInterest' | 'MirrorImage' | 'BattleRhythm'
  // Special
  | 'SurgeProtection' | 'AoEShieldDamage'
  // Cursed Extended
  | 'GlassCannon' | 'BloodPact' | 'ChaosCore' | 'HungryBlade' | 'SacrificialPact'
  | 'MirrorCurse' | 'DoubleOrNothing' | 'LifeDrain' | 'CorruptedCore'
  // Ending Path (special — one per run)
  | 'EndingPath_DemonKing' | 'EndingPath_AbyssGod' | 'EndingPath_TimeWraith'
  | 'EndingPath_CursedKing' | 'EndingPath_TrueCore';

export type RelicRarity = 'Common' | 'Uncommon' | 'Rare' | 'Boss' | 'Cursed' | 'Event';

export interface RelicDef {
  id: string;
  name: string;
  description: string;
  flavor: string;
  rarity: RelicRarity;
  effect: RelicEffectType;
  value: number;                    // 効果量 (RelicManagerのSumEffect互換)
  immuneStatus?: StatusEffectType;  // StatusImmunity用
  inPool: boolean;                  // ドロップ抽選に含めるか
}

const R = (
  id: string, name: string, rarity: RelicRarity,
  effect: RelicEffectType, value: number,
  description: string, flavor: string,
  extra: Partial<RelicDef> = {},
): RelicDef => ({
  id, name, rarity, effect, value, description, flavor, inPool: true, ...extra,
});

export const RELICS: RelicDef[] = [
  // ══════════ Combat: Offense ══════════
  R('whetstone', '古兵の砥石', 'Common', 'FlatDamageUp', 5,
    '与ダメ+5。', '毎朝欠かさず刃を研いだ老兵の癖が、石に染み付いている。'),
  R('war_banner', '緋の軍旗', 'Uncommon', 'PercentDamageUp', 10,
    '与ダメ+10%。', '滅びた王国の旗。掲げる者に古の武勇が宿る。'),
  R('assassin_memento', '暗殺者の形見', 'Rare', 'FirstHitDoubleDamage', 1,
    '戦闘の初撃が2倍。', '「最初の一撃で決めろ。二撃目は言い訳だ」'),
  R('hawk_feather', '鷹の尾羽', 'Common', 'CritRateUp', 10,
    '会心率+10%。', '獲物の急所を見抜く目が、羽に宿るという。'),
  R('executioner_glove', '処刑人の手袋', 'Uncommon', 'CritDamageUp', 30,
    '会心ダメ+30%。', '振り下ろす者の迷いを消す、冷たい革の感触。'),
  R('twin_fang', '双牙の首飾り', 'Rare', 'ExtraHitOnCrit', 1,
    '会心時、40%で追撃。', '一噛みで終わらせない。それが獣の流儀。'),
  R('ghoul_tooth', '喰屍鬼の歯', 'Common', 'OnKillHeal', 0.03,
    '撃破でHP3%回復。', '喰らった命の残り香を、持ち主に分け与える。'),
  R('soul_horn', '魂鳴りの角笛', 'Uncommon', 'OnKillBP', 1,
    '撃破でBP+1。', '命が潰える音は、次の戦いへの号砲となる。'),
  R('reaper_scythe_shard', '死神の鎌の欠片', 'Rare', 'ExecuteLowHP', 1,
    'HP10%以下の敵を即死。', '刈り取るべき魂を、鎌は決して見逃さない。'),
  R('hammer_of_ruin', '破城槌の破片', 'Uncommon', 'BonusDamageOnBreak', 30,
    'Break中の敵に+30%。', '崩れた城門に、慈悲は要らない。'),
  R('ember_ring', '燠火の指輪', 'Common', 'FireDamageUp', 20,
    '炎+20%。炎上も強まる。', '消えない燠火が、指先で静かに脈打つ。'),
  R('frost_ring', '霜刃の指輪', 'Common', 'IceDamageUp', 20,
    '氷+20%。', '触れれば指先から凍る。慣れれば心地よい。'),
  R('storm_ring', '雷鳴の指輪', 'Common', 'LightningDamageUp', 20,
    '雷+20%。', '嵐の夜に生まれた石は、今も空へ帰りたがっている。'),
  R('abyss_ring', '深淵の指輪', 'Common', 'DarkDamageUp', 20,
    '闇+20%。', '覗き込むな。指輪もまた、こちらを覗いている。'),
  R('dawn_ring', '暁光の指輪', 'Common', 'LightDamageUp', 20,
    '光+20%。', '最も暗い夜に、最も強く輝く。'),
  // Web版の修正: 毒・出血は属性ではないので、敵が受ける継続ダメージを増やす効果にした
  R('venom_vial', '毒蛇の牙瓶', 'Common', 'PoisonDamageUp', 50,
    '毒のダメージ+50%。', '一滴で井戸が死ぬ。瓶には、まだ半分残っている。'),
  R('rusted_hook', '錆びた鉤爪', 'Common', 'BleedDamageUp', 50,
    '出血のダメージ+50%。', '傷口は塞がらない。それがこの鉤の呪いだ。'),
  R('flurry_charm', '連撃の護符', 'Uncommon', 'MultiHitBonus', 15,
    '連撃の2撃目以降+15%。', '「二の太刀こそ本命」と刻まれている。'),
  R('last_oath', '今際の誓い', 'Rare', 'LastStandDamage', 50,
    'HP50%以下で与ダメ+50%。', '死を覚悟した者の剣は、誰よりも重い。'),

  // ══════════ Combat: Defense ══════════
  R('knight_plate_shard', '騎士甲冑の欠片', 'Common', 'FlatDefenseUp', 4,
    '被ダメ-4。', '主を守り抜いた甲冑は、砕けてなお守り続ける。'),
  R('guardian_icon', '守護聖像', 'Uncommon', 'PercentDamageReduction', 10,
    '被ダメ-10%。', '小さな石像の視線が、あらゆる刃を鈍らせる。'),
  R('thorn_mail_piece', '茨帷子の切れ端', 'Uncommon', 'ThornsReflect', 20,
    '被ダメの20%を反射。', '抱きしめた者ごと傷つける、悲しい鎧。'),
  R('morning_dew', '朝露の雫', 'Uncommon', 'FirstHitImmune', 1,
    '戦闘で最初の被ダメを無効。', '夜明けの一瞬だけ、世界は誰も傷つけない。'),
  R('phoenix_down', '不死鳥の綿羽', 'Rare', 'ReviveOnce', 1,
    '1度だけ、倒れてもHP1で耐える。', '灰の中から、何度でも。'),
  R('warm_hearth_ash', '竈の温灰', 'Common', 'HealAtBattleStart', 0.10,
    '開戦時HP10%回復。', '故郷の竈の灰。握ると、少しだけ帰りたくなる。'),
  R('troll_blood_vial', 'トロールの血瓶', 'Uncommon', 'RegenEachTurn', 0.02,
    '手番ごとにHP2%回復。', 'どろりとした赤。傷口が疼いて、塞がる。'),
  R('pilgrim_stone', '巡礼者の礎石', 'Rare', 'ShieldPerFloor', 0.10,
    '層を越えるたびバリアが溜まる。', '一歩ごとに、道は旅人を守るようになる。'),
  R('antidote_locket', '解毒のロケット', 'Common', 'StatusImmunity', 0,
    '毒にならない。', '中には枯れた薬草がひとつまみ。それで十分だった。',
    { immuneStatus: 'Poison' }),
  R('iron_will_chain', '不動の鎖', 'Uncommon', 'StatusImmunity', 0,
    '麻痺しない。', '雷神すら、この鎖の主を縛れなかった。',
    { immuneStatus: 'Paralysis' }),

  // ══════════ Boss Relics (ボス撃破報酬) ══════════
  R('kings_scepter', '廃王の王笏', 'Boss', 'PercentDamageUp', 25,
    '与ダメ+25%。', '玉座なき王の権威は、今や振るう者の腕にのみ宿る。'),
  R('gatekeeper_core', '扉番の心核', 'Boss', 'PercentDamageReduction', 20,
    '被ダメ-20%。', '千年守り続けた者の心臓は、盾よりも堅い。'),
  R('crown_of_dominion', '支配の宝冠', 'Boss', 'StartWithBP', 2,
    '開戦時BP+2。', '被る者に、戦場の主導権を約束する。'),
  R('heart_of_ruin', '滅びの心臓', 'Boss', 'OnKillHeal', 0.06,
    '撃破でHP6%回復。', '滅びを喰らって鼓動する、王国最後の心臓。'),

  // ══════════ Boost / BP ══════════
  R('battle_drum', '開戦の太鼓', 'Uncommon', 'StartWithBP', 1,
    '開戦時BP+1。', '一打ちで血が沸き、二打ちで足が前に出る。'),
  R('spirit_conductor', '闘気の導線', 'Rare', 'BPGainUp', 1,
    'BP獲得+1。', '雷を集める避雷針のように、闘志を集める。'),
  R('gamblers_die', '賭博師の骰子', 'Uncommon', 'BoostFree', 1,
    '1戦闘に1回、ブーストが無料。', '「最初の一勝負はタダだ」——それが罠だと知りつつ。'),
  R('berserk_horn', '狂戦士の角杯', 'Rare', 'BoostDamageMultiplier', 15,
    'ブーストの段階ごとに与ダメ+15%。', '飲み干した者は、痛みを忘れて笑いだす。'),
  R('overflow_vessel', '闘魂の大器', 'Rare', 'MaxBPUp', 1,
    '最大BP+1。', '器が大きければ、注げる魂も多くなる。'),

  // ══════════ Break ══════════
  R('shatter_gauntlet', '砕きの篭手', 'Uncommon', 'BreakDamageBonus', 25,
    'Break中の敵に+25%。', '砕けた鎧の隙間を、確実に抉る。'),
  R('siege_pick', '攻城鶴嘴', 'Uncommon', 'ShieldHitBonus', 1,
    'シールド削り+1。', '城壁がこれで崩れるなら、盾など紙も同然。'),
  R('hourglass_of_agony', '苦悶の砂時計', 'Rare', 'BreakExtend', 1,
    'Breakが1ターン長引く。', '砂は落ちない。苦しみの間だけ、時が止まる。'),
  R('appraiser_monocle', '鑑定士の片眼鏡', 'Common', 'WeaknessReveal', 1,
    '敵の弱点が最初から見える。', '「値打ちも弱みも、レンズの前では丸裸さ」'),

  // ══════════ Economy / Run ══════════
  R('merchant_scale', '行商人の天秤', 'Common', 'GoldDropUp', 25,
    '敵のゴールド+25%。', '傾いた天秤は、いつも持ち主の側に傾く。'),
  R('guild_seal', '商業組合の印章', 'Uncommon', 'ShopDiscount', 20,
    '店の価格-20%。', 'この印章を見せれば、どの店主も渋い顔で頷く。'),
  R('eraser_quill', '忘却の羽根ペン', 'Uncommon', 'FreeRemove', 1,
    '呪い解除が無料。', '書いた文字も、刻まれた呪いも、静かに消してくれる。'),
  R('golden_heart', '黄金の心臓', 'Rare', 'GoldToHP', 1,
    '所持金50Gごとに最大HP+1。', '富める者は、その分だけ死ににくい。皮肉な話だ。'),
  R('clover_press', '四葉の押し花', 'Common', 'LuckUp', 3,
    '運+3。', '押し花にしても、幸運は枯れないらしい。'),
  R('collector_bag', '蒐集家の鞄', 'Uncommon', 'ExtraLootChoice', 1,
    '報酬の選択肢+1。', '「入らないものは無い」が口癖の男の遺品。'),
  R('mirror_of_avarice', '強欲の合わせ鏡', 'Rare', 'DuplicateRelic', 1,
    'レリック入手時、手持ちの一般・珍しいを複製（3回まで）。', '鏡の中の宝物は、手を伸ばせば取れる。この鏡に限り。'),

  // ══════════ Skill / Deck ══════════
  R('feather_of_focus', '集中の羽飾り', 'Common', 'SkillMPDiscount', 1,
    'MP消費-1。', '耳元で揺れるたび、雑念がひとつ消える。'),
  R('mana_moss', '魔力苔', 'Common', 'MPRegenEachTurn', 3,
    '手番ごとにMP+3。', '洞窟の壁で青く光る苔。齧ると舌が痺れて、魔力が満ちる。'),
  R('full_moon_chalice', '満月の聖杯', 'Uncommon', 'StartWithFullMP', 1,
    '開戦時MP全快。', '満月の夜に汲んだ水は、決して減らないという。'),
  R('trickster_dice', '道化の五面体', 'Uncommon', 'RandomSkillBuff', 50,
    '毎ターン最初の技が+50%。', '「五面の骰子に公平を求めるな」と道化は笑う。'),
  R('echo_crystal', '残響水晶', 'Rare', 'EchoSkill', 1,
    '1戦闘に1回、技がもう一度発動。', '水晶の中では、どんな叫びも二度響く。'),
  R('void_pouch', '虚無の小袋', 'Uncommon', 'NegateSkillCost', 0.15,
    '15%でMP消費0。', '袋の中に手を入れると、たまに何も減っていない。'),

  // ══════════ Luck / RNG ══════════
  R('cat_bone_charm', '黒猫の骨鈴', 'Uncommon', 'LuckyDodge', 1,
    '運が高いほど回避しやすい。', '猫は九回死ぬ。この鈴は、そのうち一回分。'),
  R('midas_thumb', 'ミダスの親指', 'Uncommon', 'LuckyGold', 1,
    'イベントのゴールド1.5倍。', '触れたものを黄金に変えた王の、最後に残った指。'),
  R('pact_of_thorns', '茨の契約書', 'Cursed', 'CursedButPowerful', 30,
    '呪われる。与ダメ+30%。', '署名欄には、もう誰かの血が滲んでいる。'),
  R('falling_star_shard', '流星の欠片', 'Rare', 'MiracleChance', 0.02,
    'まれにレアのレリックが追加で出る。', '願い事はもう叶った。次は誰かの番だ。'),
  R('devils_ledger', '悪魔の帳簿', 'Rare', 'RiskRewardMaster', 2,
    '呪われた間の報酬2倍。', '危険への対価は、きっちり倍額で記帳される。'),

  // ══════════ Floor / Stage ══════════
  R('hunter_trophy', '狩人の戦利品', 'Uncommon', 'EliteReward', 1,
    '強敵の報酬の選択肢+1。', '大物を仕留めた者だけが、上物を選ぶ権利を得る。'),
  R('kings_aegis_shard', '王盾の破片', 'Rare', 'BossShield', 0.15,
    'ボス戦でバリアを張る。', '王を守れなかった盾は、次の持ち主に尽くす。'),
  R('spring_of_respite', '安息の泉石', 'Uncommon', 'FloorClearHeal', 0.30,
    '層を越えるとHP30%回復。', '石の窪みに溜まる水は、汲んでも汲んでも尽きない。'),
  R('down_blanket', '羽毛の毛布', 'Common', 'RestEfficiencyUp', 30,
    '焚き火の回復+30%。', '戦場で最も貴重な装備は、良い眠りだ。'),

  // ══════════ Cursed ══════════
  R('vampiric_blade', '吸血鬼の短剣', 'Cursed', 'VampiricBlade', 0.20,
    '与ダメの20%を回復。最大HP-20%。', '刃が血を啜るたび、柄を握る手も細くなる。'),
  R('berserker_mask', '狂戦士の面', 'Cursed', 'BerserkerRage', 1,
    'HPが低いほど与ダメUP。防御半減。', '面の下で笑っているのは、もう自分ではない。'),
  R('forbidden_grimoire', '禁断の魔導書', 'Cursed', 'ForbiddenGrimoire', 2,
    '与ダメ2倍。MP消費2倍。', '頁をめくる音が、誰かの悲鳴に聞こえる。'),
  R('death_mark_brand', '死印の烙印', 'Cursed', 'DeathMark', 1,
    '開戦時、敵1体に死の刻印。被ダメ+25%。', '死神に貸しを作った代償は、利子付きで返ってくる。'),
  R('soul_lantern', '魂の吊灯籠', 'Rare', 'SoulSiphon', 10,
    '10体倒すごとにレリックを得る。', '灯りに引き寄せられた魂が、宝の在り処を囁く。'),
  R('ancient_curse_idol', '古の呪像', 'Cursed', 'AncientCurse', 0.30,
    '能力+30%。部屋ごとにHP-5%。', '力を与える神は、供物を欠かさず要求する。'),
  R('philosophers_stone', '賢者の石', 'Cursed', 'PhilosophersStone', 2,
    'ゴールド2倍。呪われる。', '黄金より重いものを、錬金術師は最後に知った。'),

  // ══════════ Conditional Offense ══════════
  R('duelist_glove', '決闘者の白手袋', 'Uncommon', 'FirstTurnBoost', 50,
    '最初の手番は与ダメ+50%。', '先手必勝。それ以外の流儀を、彼は知らなかった。'),
  R('rage_engine', '憤怒の歯車', 'Rare', 'StackingRage', 0.03,
    '攻撃するたび与ダメ+3%（10回まで）。', '回れば回るほど、止め方がわからなくなる。'),
  R('plague_doctor_beak', '疫病医の嘴面', 'Uncommon', 'PoisonMaster', 30,
    '毒の敵に+30%。', '病んだ体の弱点を、この嘴は嗅ぎ分ける。'),
  R('butcher_apron', '屠殺者の前掛け', 'Uncommon', 'BleedMaster', 30,
    '出血の敵に+30%。', '血の匂いが染み付いて、もう落ちない。'),
  R('shadow_second', '影の従者', 'Rare', 'ShadowStrike', 0.25,
    '攻撃時、25%で追撃。', '影がもう一人、同じ剣を振っている。'),
  R('opportunist_dagger', '火事場の匕首', 'Uncommon', 'Opportunist', 20,
    '弱った敵に+20%。', '弱った獲物から狙う。恥じることは何もない。'),
  R('guillotine_bolt', '断頭の楔', 'Rare', 'ExecuteOnBreak', 1,
    'Break中でHP20%以下の敵を即死。', '崩れた者に、二度目の立ち上がりは許されない。'),
  R('necrotic_censer', '屍香炉', 'Rare', 'NecroticPower', 0.02,
    '倒した敵の数だけ与ダメUP。', '死者の数だけ、香は濃くなる。'),
  R('serial_lens', '連鎖の照準器', 'Uncommon', 'CritChain', 30,
    '会心の次は会心しやすい。', '一度見えた急所は、二度と見失わない。'),
  R('mind_pendulum', '正気の振り子', 'Uncommon', 'SpiritualBalance', 0.10,
    '正気度が高いほど与ダメUP、低いほどDOWN。', '澄んだ心は刃になり、濁った心は錆になる。'),

  // ══════════ Status Infliction ══════════
  R('miasma_censer', '瘴気の香炉', 'Rare', 'PoisonAura', 1,
    '開戦時、全敵に毒。', '香炉の煙は、吸う者を選ばない。持ち主以外は。'),
  R('jagged_locket', '棘のロケット', 'Uncommon', 'BleedOnCrit', 0.15,
    '攻撃時、15%で出血。', '開けるたびに指を切る。中の似顔絵は誰なのか。'),
  R('cinder_urn', '燃殻の骨壷', 'Rare', 'BurnAura', 1,
    '開戦時、全敵に炎上。', '中の灰は、まだ燃え足りないらしい。'),
  R('frost_chime', '霜の風鈴', 'Rare', 'ChillAura', 1,
    '開戦時、全敵を凍結。', '鳴るたびに、空気の芯から冷えていく。'),
  R('thunder_brand', '雷紋の焼印', 'Uncommon', 'ThunderMark', 0.20,
    '攻撃時、20%で麻痺。', '触れた者の体に、稲妻の形の痺れが走る。'),

  // ══════════ Defense and Survival ══════════
  R('dancer_anklet', '舞姫の足鈴', 'Uncommon', 'EvasionUp', 10,
    '回避率+10%。', '鈴の音を聞いた時には、もうそこにいない。'),
  R('bulwark_totem', '防壁のトーテム', 'Rare', 'DamageCap', 0.20,
    '一撃の被ダメは最大HPの20%まで。', 'どんな豪雨も、堤を越えなければただの雨。'),
  R('saint_relic', '聖者の遺骨', 'Uncommon', 'HealingFactor', 25,
    '回復量+25%。', '生前は千人を癒やした。死してなお、その手は温かい。'),
  R('halo_fragment', '光輪の欠片', 'Rare', 'Transcendence', 0.10,
    '開戦時にバリア。', '天使が落とした輪の一部。まだ淡く光っている。'),
  R('living_mail', '生きた鎖帷子', 'Rare', 'AdaptiveArmor', 0.03,
    '被弾するほど硬くなる。', '殴られるほど硬くなる。まるで持ち主の心のように。'),
  R('rampart_idol', '塁壁の小像', 'Uncommon', 'FortifiedWall', 0.10,
    '開戦時にバリア。', '握りしめると、背中に壁があるような安心感がある。'),
  R('cornered_fang', '窮鼠の牙', 'Uncommon', 'LastStandGuard', 0.40,
    'HP20%以下で被ダメ-40%。', '追い詰められた鼠は、猫の急所を知っている。'),
  R('vengeful_spirit_jar', '怨霊の壺', 'Rare', 'Counterstrike', 0.15,
    '被弾時、まれに全敵へ反撃。', '蓋を開けてはいけない。勝手に開くから。'),

  // ══════════ BP and Boost Extended ══════════
  R('economist_ring', '倹約家の指輪', 'Uncommon', 'EfficientBoost', 1,
    'ブーストのBP消費-1。', '「無駄遣いした闘志は返ってこないよ」'),
  R('lingering_incense', '残り香の薫香', 'Uncommon', 'BoostExtend', 1,
    'ブーストのバフが1ターン長引く。', '香りは消えても、記憶には残り続ける。'),
  R('surge_capacitor', '闘気蓄積器', 'Rare', 'BoostSurge', 0.30,
    'ブーストの次の技+30%。', '溜めた力は、次の一撃で倍になって返る。'),
  R('breaker_medal', '破砕者の勲章', 'Uncommon', 'BPOnBreak', 2,
    'BreakでBP+2。', '砕いた盾の数だけ、胸の勲章は重くなる。'),

  // ══════════ Break Extended ══════════
  R('adamant_chisel', '金剛の鑿', 'Uncommon', 'QuickBreak', 1,
    'シールド削り+1。', 'どんな岩盤も、この鑿の前では脆い。'),
  R('predator_patience', '捕食者の忍耐', 'Rare', 'BreakRegen', 0.05,
    '敵がBreak中、手番ごとにHP5%回復。', '獲物が動けない間、狩人は傷を舐めて待つ。'),
  R('silence_shackle', '沈黙の枷', 'Rare', 'BreakSeal', 1,
    'Breakした敵の次の攻撃を無効。', '砕けた者の悲鳴すら、この枷は許さない。'),

  // ══════════ Skill and Deck Extended ══════════
  R('brimming_chalice', '満溢の杯', 'Uncommon', 'ManaOverflow', 0.20,
    'MP満タンなら技+20%。', '溢れる寸前の一杯が、いちばん美味い。'),
  R('twin_cast_amulet', '双詠の護符', 'Rare', 'SkillCopy', 1,
    '1戦闘に1回、技を無料でもう一度。', '呪文は一度。声はふたつ。'),
  R('spark_plug_stone', '起動石', 'Common', 'JumpStart', 1,
    '戦闘の最初の技はMP0。', '最初の火花は、いつだってタダだ。'),
  R('metronome_of_war', '戦のメトロノーム', 'Rare', 'ChainBonus', 2,
    '技を3回続けると、次の技が2倍。', '拍子が揃ったとき、戦場は演奏会になる。'),
  R('curse_loom', '呪いの織機', 'Rare', 'CurseWeaver', 0.10,
    '呪い1つごとに与ダメ+10%。', '呪いの糸で織った布は、驚くほど頑丈だ。'),
  R('ascetic_scroll', '修験者の巻物', 'Uncommon', 'SpecializedDeck', 0.20,
    '技が10個以下なら与ダメ+20%。', '技は少なく、極めれば良い。'),

  // ══════════ Exploration ══════════
  R('bounty_contract', '賞金首の手配書', 'Uncommon', 'EliteHunter', 2,
    '強敵のゴールド2倍。', '大物の首は高く売れる。生きて持ち帰れれば。'),
  R('treasure_compass', '財宝羅針盤', 'Rare', 'TreasureNose', 1,
    '宝箱のレリックが上質に。', '針が指すのは北ではなく、いちばん高価なもの。'),
  R('wanderer_diary', '放浪者の日記', 'Common', 'EventMaster', 20,
    'イベントのあと+20G。', '空白の頁に書き込むたび、小銭が挟まっている。'),
  R('smuggler_coin', '密売人の割符', 'Uncommon', 'BlackMarket', 1,
    '店に呪われたレリックが並ぶ。', '裏返すと、裏市場の地図が刻まれている。'),
  R('golden_bulwark', '黄金の盾', 'Rare', 'GoldShield', 50,
    '被ダメをゴールドで肩代わり（50Gまで）。', '金で買えない命はない。少なくともこの盾はそう主張する。'),

  // ══════════ Economy and Tactics ══════════
  R('interest_ledger', '複利の台帳', 'Uncommon', 'CompoundInterest', 0.01,
    '所持金が多いほど敵のゴールドUP。', '金が金を呼ぶ。帳簿は嘘をつかない。'),
  R('mirror_shard_pauldron', '鏡片の肩当て', 'Rare', 'MirrorImage', 0.25,
    '受けた痛みを次の攻撃に上乗せ。', '割れた鏡は、受けた痛みを覚えている。'),
  R('war_lyre', '戦場の竪琴', 'Rare', 'BattleRhythm', 0.50,
    '同じ技を続けると+50%。', '同じ旋律を繰り返すほど、演奏は熱を帯びる。'),

  // ══════════ Special ══════════
  R('storm_conductor', '嵐の避雷針', 'Uncommon', 'SurgeProtection', 0.30,
    '3回被弾すると与ダメ+30%。', '打たれるたびに、雷は近くなる。'),
  R('wide_chisel', '薙ぎの鑿', 'Uncommon', 'AoEShieldDamage', 1,
    '全体攻撃でもシールドを削る。', '広く浅く。それでも城壁は確実に痩せていく。'),

  // ══════════ Cursed Extended ══════════
  R('glass_cannon', '硝子の大砲', 'Cursed', 'GlassCannon', 0.80,
    '与ダメ+80%。被ダメ+60%。', '撃つたびに、砲身に罅が増えていく。'),
  R('blood_pact_scroll', '血盟の巻物', 'Cursed', 'BloodPact', 1,
    'HP50%以下で与ダメ2倍。毎ターンHP-3%。', '署名は血で。更新も血で。解約は命で。'),
  R('chaos_core', '混沌の核', 'Cursed', 'ChaosCore', 0.30,
    '与ダメが毎回ぶれる。', '中で何かが回っている。速さは、そのときの気分。'),
  R('hungry_blade', '飢えたる刃', 'Cursed', 'HungryBlade', 0.40,
    '与ダメ+40%。毎ターンHP-5。', '餌をやり忘れると、柄越しに主を齧る。'),
  R('sacrificial_altar', '生贄の祭壇石', 'Cursed', 'SacrificialPact', 0.60,
    '開戦時HP-30%。その戦闘は与ダメ+60%。', '祭壇はまず、捧げ物の質を確かめる。'),
  R('mirror_curse_idol', '呪映の偶像', 'Cursed', 'MirrorCurse', 0.15,
    '呪い1つごとに与ダメ+15%、最大HP-10%。', '偶像は呪いを溜め込み、力に変えて吐き出す。'),
  R('two_faced_coin', '両面のコイン', 'Cursed', 'DoubleOrNothing', 2,
    '開戦時にコイン。表なら与ダメ2倍、裏なら半減。', '表も裏も、笑っているのが不気味だ。'),
  R('leech_crown', '蛭の王冠', 'Cursed', 'LifeDrain', 0.01,
    '手番ごとに全敵から命を啜る。', '被った者は飢えを知らない。外し方も知らない。'),
  R('corrupted_core', '穢れた核', 'Cursed', 'CorruptedCore', 0.50,
    '与ダメ+50%。技を使うたびHP-5。', '力の源は、ゆっくりと持ち主を溶かしている。'),

  // ══════════ Web版で追加 ══════════
  R('gale_ring', '疾風の指輪', 'Common', 'WindDamageUp', 20,
    '風+20%。', '指を離れた風は、二度と同じ道を通らない。'),
  R('smith_mark', '鍛冶師の刻印', 'Common', 'PhysicalDamageUp', 15,
    '物理+15%。', '名もなき鍛冶師が、最高の一振りにだけ刻んだ印。'),
  R('insight_stone', '看破の石', 'Uncommon', 'WeaknessAmp', 25,
    '弱点を突くと+25%。', '石を通して見れば、どんな鎧にも綻びがある。'),
  R('consecrated_nail', '聖別の釘', 'Uncommon', 'UndeadSlayer', 25,
    'アンデッドに+25%。', '聖者の棺を閉じた釘。死者はこれを何より恐れる。'),
  R('hero_crest', '英雄殺しの紋章', 'Rare', 'EliteSlayer', 20,
    '強敵・ボスに+20%。', '大物ばかりを狙った狩人の紋章。最後の獲物は竜だったという。'),
  R('soul_vessel', '魂の器', 'Common', 'MPOnKill', 5,
    '撃破で全員MP+5。', '空の器は、散った魂の欠片で少しずつ満ちていく。'),
  R('shieldbreak_seal', '砕盾の聖印', 'Uncommon', 'BreakHeal', 0.05,
    'Breakで全員HP5%回復。', '砕いた盾の破片が、光の粒になって降り注ぐ。'),
  R('hex_skull', '呪術師の髑髏', 'Uncommon', 'StatusChanceUp', 15,
    '状態異常の付与率+15%。', '眼窩の奥で、まだ誰かが呪文を唱えている。'),
  R('leaden_sand', '鈍色の砂', 'Rare', 'DebuffExtend', 1,
    '敵の状態異常・弱体が1ターン長引く。', '指の間から零れる砂は、時を重く引きずる。'),
  R('blood_moon_chalice', '血月の杯', 'Cursed', 'BloodChalice', 0.10,
    '撃破で全員HP10%回復。回復の効きが半減。', '血でしか満たされない杯。注いだ分だけ、渇きも増す。'),

  // ══════════ Ending Path (イベント/ボス限定・抽選外) ══════════
  R('ending_demon_king', '魔王の証印', 'Event', 'EndingPath_DemonKing', 1,
    '結末を変える証。', '玉座は空いている。座る者を、ずっと待っている。',
    { inPool: false }),
  R('ending_abyss_god', '深淵の瞳孔', 'Event', 'EndingPath_AbyssGod', 1,
    '結末を変える証。', '深淵はもう、あなたの名前を覚えた。',
    { inPool: false }),
  R('ending_time_wraith', '砕けた懐中時計', 'Event', 'EndingPath_TimeWraith', 1,
    '結末を変える証。', '針は12時4分前で止まっている。ずっと。',
    { inPool: false }),
  R('ending_cursed_king', '古王の呪冠', 'Event', 'EndingPath_CursedKing', 1,
    '結末を変える証。', '冠の重さは、罪の重さと同じだという。',
    { inPool: false }),
  R('ending_true_core', '世界の核片', 'Event', 'EndingPath_TrueCore', 1,
    '結末を変える証。', '世界の心臓は、こんなにも小さく、温かい。',
    { inPool: false }),
];

// ── 検索・プール ────────────────────────────────────────────────────────

const BY_ID = new Map(RELICS.map((r) => [r.id, r]));

export function getRelic(id: string): RelicDef | undefined {
  return BY_ID.get(id);
}

export function relicPool(rarity: RelicRarity): RelicDef[] {
  return RELICS.filter((r) => r.inPool && r.rarity === rarity);
}

export const RARITY_LABEL: Record<RelicRarity, string> = {
  Common: '一般', Uncommon: '珍しい', Rare: 'レア',
  Boss: 'ボス報酬', Cursed: '呪われた', Event: 'イベント',
};

export const RARITY_COLOR: Record<RelicRarity, string> = {
  Common: '#d8d0e8', Uncommon: '#6aaade', Rare: '#d9c66b',
  Boss: '#e08a5a', Cursed: '#c05a7a', Event: '#8a6ab8',
};

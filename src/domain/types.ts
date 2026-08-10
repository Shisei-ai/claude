/**
 * データモデル（HANDOFF §3）
 *
 * ここに書いてある形は、そのまま保存 JSON の形でもある。
 * 現行の単一HTML版が書き出した JSON をそのまま読めること（後方互換）が要件なので、
 * 参照実装が実際に serialize しているフィールドは、HANDOFF の表に載っていないものも
 * すべて optional として残してある（例: Facility.inSide / outSide、Meta.ver）。
 */

/** 品目の相。固体はベルト、液体・ガスはパイプで運ぶ */
export type Phase = 'solid' | 'liquid' | 'gas';

/** 情報の確度。ok=出典で確認済み / part=材料は判明・数量と秒数は未確認 / guess=丸ごと推定 */
export type Conf = 'ok' | 'part' | 'guess';

/** 設備の種別 */
export type Kind =
  | 'field' // フィールドの採取設備。工業エリアの盤面には置かない
  | 'source' // 倉庫搬出口
  | 'process' // 生産設備
  | 'generator' // 発電機
  | 'power' // 送電
  | 'logistics' // 分流器・合流器
  | 'sink'; // 倉庫搬入口・貯蔵設備

/** 辺の番号。0=北 1=東 2=南 3=西。DIRS と添字が対応する */
export type Side = 0 | 1 | 2 | 3;

/** 設備の向き。90°単位。ポートも一緒に回る */
export type Rot = 0 | 1 | 2 | 3;

export interface Item {
  id: string;
  name: string;
  /** 分類（鉱物／植物／粉末／部品／液体…）。自由入力でよく、絞り込みにそのまま使う */
  cat?: string;
  /** 盤面での色 */
  color: string;
  phase: Phase;
  conf?: Conf;
}

/** s: 辺 / o: その辺に沿った位置 */
export interface Port {
  t: 'in' | 'out';
  s: Side;
  o: number;
}

export interface Facility {
  id: string;
  name: string;
  kind: Kind;
  w: number;
  h: number;
  /** 消費電力 */
  power: number;
  /** 発電量（generator のみ） */
  gen: number;

  /**
   * 口の数。未指定なら kind から既定値が入る（geometry の facilityDefaults）。
   * 1つの口に繋げるラインは1本まで —— 実際の詰め込み密度を決めているのはここ。
   */
  nIn?: number;
  nOut?: number;
  /** 口を並べ始める辺。既定は「左から入れて右へ出す」（inSide=3, outSide=1） */
  inSide?: Side;
  outSide?: Side;
  /** 明示的なポート配置。未指定なら nIn/nOut と inSide/outSide から自動生成する */
  ports?: Port[];

  /** 倉庫搬出口。レシピではなく「引き出す品目」を持つ */
  tap?: boolean;
  /** フィールドの採取設備。工業エリアの盤面には置かない */
  field?: boolean;
  /** 分流器（合流器と区別する） */
  split?: boolean;
  /** パイプ系の物流・貯蔵設備。logistics では 'fluid' を使う */
  phase?: 'liquid' | 'gas' | 'fluid';
  /** ガス散布機など環境設備 */
  env?: boolean;
  /** 設置上限（天有洪炉は12） */
  max?: number;
  /** 協約容量の消費。未指定なら capCostOf の推定ルール */
  cap?: number;
  /** 採取設備が採れる品目 */
  takes?: string[];
}

export interface RecipeIO {
  item: string;
  qty: number;
}

export interface Recipe {
  id: string;
  name: string;
  conf: Conf;
  /** 設備 id */
  fac: string;
  /** 1周期の秒数 */
  sec: number;
  in: RecipeIO[];
  /**
   * out[0] が主産物。2番目以降は副産物。
   * 逆算プランナーは「副産物を狙って作る」ことをしない（HANDOFF §5-2）。
   */
  out: RecipeIO[];
}

/** 盤面に置いた設備 */
export interface Node {
  uid: string;
  fac: string;
  x: number;
  y: number;
  rot: Rot;
  /** 選んだレシピ */
  rec?: string | null;
  /** tap の場合、倉庫から引き出す品目 */
  item?: string | null;
}

export interface Cell {
  x: number;
  y: number;
}

/** ベルト／パイプ 1本 */
export interface Belt {
  uid: string;
  from: string;
  fromPort: number;
  to: string;
  toPort: number;
  /** 経路。端の設備の口の正面マスから始まる */
  cells: Cell[];
  item: string | null;
}

/** 採取ゾーン（フィールド）の登録 1行 */
export interface FieldEntry {
  fac: string;
  item: string;
  count: number;
  /** 1台あたり 個/分 */
  rate: number;
}

export interface Goal {
  item: string;
  rate: number;
}

/** 地域。倉庫はこの単位で共通 */
export type Region = '四号谷地' | '武陵';

/** 工業エリア1つ。盤面・採取ゾーン・協約容量はこの単位で独立 */
export interface Area {
  id: string;
  region: Region;
  name: string;
  /** 盤面のマス数 */
  w: number;
  h: number;
  /** 協約容量 */
  cap: number;
  /** ジップラインの上限 */
  zip: number;
  /** 戦闘設備の上限 */
  combat: number;
  basePower?: number;
  /** 検証目標 */
  goal?: Goal | null;
  field: FieldEntry[];
  nodes: Node[];
  belts: Belt[];
  /**
   * このエリアの倉庫への純増（搬入 − 引き出し）。
   * 同じ地域の他エリアを計算するとき、倉庫への入りとして持ち込まれる。
   */
  net: Record<string, number>;
}

export interface Meta {
  name: string;
  basePower: number;
  /** 自動配置で盤面を広げてよいか */
  autoGrow?: boolean;
  /** パイプ1本の上限。要確認なのでユーザーが変えられる */
  pipeCap?: number;
  /** 発電に使うレシピ id */
  genRec?: string;
  goal?: Goal | null;
  /** 参照実装が書き出していた保存形式のバージョン。読むだけで、判定には使わない */
  ver?: number;
  /** 採取ゾーンのプリセットを読み込んだ地域名。参照実装が書き出していた */
  region?: string;
}

/** 保存 JSON の全体 */
export interface Save {
  meta: Meta;
  items: Item[];
  facs: Facility[];
  recs: Recipe[];
  areas: Area[];
  cur: number;
}

/**
 * 参照実装が読める旧形式：areas が無く、盤面がトップレベルにあったころのファイル。
 * loader はこれも受け付ける（HANDOFF §6-7 の後方互換）。
 */
export interface LegacySave extends Omit<Partial<Save>, 'areas'> {
  areas?: Area[];
  nodes?: Node[];
  belts?: Belt[];
  field?: FieldEntry[];
}

/**
 * 生産目標プランナー — 目標産出量から最小構成を逆算する画面。
 *
 * このツールの主役。いちばん速い使い方は
 * 「作りたいものと毎分の個数を入れて、ブロックを並べて配置」。
 */

import { BELT_CAP, fmt } from '../../domain/constants';
import { applyPlan } from '../../domain/layout/blocks';
import {
  buildPlan,
  idealTargets,
  warehouseSupply,
  type Choice,
  type Plan,
  type PlanContext,
} from '../../domain/planner';
import type { Store } from '../../store/state';
import { confBadge, esc, itemChip, itemOptions, qsa } from '../dom';

export interface PlanHooks {
  flash(msg: string): void;
  close(): void;
  refresh(): void;
  fitView(): void;
}

export interface PlanUi {
  item: string | null;
  rate: number;
  choice: Choice;
  plan: Plan | null;
}

export const createPlanUi = (): PlanUi => ({ item: null, rate: 6, choice: {}, plan: null });

const ctxOf = (store: Store): PlanContext => ({
  ds: store.ds,
  areas: store.save.areas,
  cur: store.save.cur,
  basePower: store.save.meta.basePower,
  genRec: store.save.meta.genRec ?? null,
  field: store.area.field,
});

export function runPlan(store: Store, ui: PlanUi): void {
  if (!ui.item) {
    // 作れるものを初期値にしておく
    const cand = [...store.ds.items.values()].find((i) => store.ds.producedBy(i.id).length > 0);
    ui.item = cand?.id ?? [...store.ds.items.keys()][0] ?? null;
  }
  ui.plan = ui.item && ui.rate > 0 ? buildPlan(ctxOf(store), ui.item, ui.rate, ui.choice) : null;
}

export function paintPlan(box: HTMLElement, store: Store, ui: PlanUi, hooks: PlanHooks): void {
  const { ds } = store;
  const head = `<div class="prow">
      <div style="flex:2;min-width:190px"><label class="fl" for="pItem">目標産物</label>
        <select id="pItem">${itemOptions(ds, ui.item)}</select></div>
      <div style="width:128px"><label class="fl" for="pRate">個 / 分</label>
        <input type="number" id="pRate" min="0.1" step="0.5" value="${ui.rate}"></div>
      <div style="width:116px"><label class="fl">&nbsp;</label><button class="hbtn" id="pRun" style="width:100%">計算する</button></div>
    </div>`;

  const P = ui.plan;
  if (!P || !P.rows.length) {
    box.innerHTML =
      head +
      `<div class="empty" style="padding:16px 0">${
        P?.diverged
          ? 'この品目は材料が循環していて台数が収束しません。レシピの登録を見直してください。'
          : ui.item && !ds.producedBy(ui.item).length
            ? 'この品目を作るレシピが登録されていません。「データ編集」でレシピを追加してください。'
            : '目標を入力して「計算する」を押してください。'
      }</div>`;
    bindHead(box, store, ui, hooks);
    return;
  }

  const ideal = idealTargets(P);
  const perCell = P.area ? P.targetRate / P.area : 0;
  const waste = P.intSum ? 1 - P.fracSum / P.intSum : 0;
  const guessed = P.rows.filter((r) => (r.rec.conf ?? 'guess') === 'guess').length;
  const parted = P.rows.filter((r) => r.rec.conf === 'part').length;

  const cards = `<div class="cards">
    <div class="card"><span class="cl">総設備数</span><span class="cv">${P.intSum + P.gens}<i>台</i></span></div>
    <div class="card"><span class="cl">占有面積</span><span class="cv">${P.area}<i>マス</i></span></div>
    <div class="card"><span class="cl">面積効率</span><span class="cv">${perCell.toFixed(2)}<i>個/分/マス</i></span></div>
    <div class="card"><span class="cl">消費電力</span><span class="cv">${fmt(P.power)}<i>／基礎 ${fmt(P.base)}</i></span></div>
    <div class="card ${P.gens > 0 ? 'hot' : ''}"><span class="cl">必要な発電機</span><span class="cv">${P.gens}<i>台</i></span></div>
    <div class="card ${waste > 0.001 ? 'warnc' : ''}"><span class="cl">切り上げの無駄</span><span class="cv">${(waste * 100).toFixed(1)}<i>%</i></span></div>
  </div>`;

  let advice = '';
  if (guessed || parted) {
    advice += `<div class="advice ${guessed ? 'warnc' : ''}"><b>この計画は${guessed ? '推定値' : '未確認の数量'}に依存しています。</b>
      使用レシピ ${P.rows.length} 件のうち ${guessed ? `推定 ${guessed} 件` : ''}${guessed && parted ? '、' : ''}${
        parted ? `一部確認 ${parted} 件` : ''
      }。ゲーム内の「製造プロセス」で実数を確認して「データ編集」で上書きすると、台数の精度が上がります。</div>`;
  }
  if (ideal?.cands.length) {
    advice += `<div class="advice"><b>無駄なく組める目標値</b>：この生産系統は <span class="kv">${fmt(ideal.unit)} 個/分</span> の倍数なら全設備が整数台・100%稼働になります。
      ${ideal.cands.map((v) => `<button class="chip" data-goal="${v}">${fmt(v)} 個/分で組み直す</button>`).join('')}
      ${P.gens > 0 ? '<br><span style="color:var(--faint)">※発電機のバッテリー消費が加わるぶん、実際の台数は多少ずれます。</span>' : ''}</div>`;
  }
  if (ideal && ideal.unit > 0) {
    const nb = Math.max(1, Math.ceil(P.targetRate / ideal.unit - 1e-9));
    const over = ideal.unit * nb - P.targetRate;
    advice += `<div class="advice"><b>ブロック方式</b>：<span class="kv">${fmt(ideal.unit)} 個/分</span>の小ユニットを <span class="kv">${nb} 枚</span>並べる形で組めます。
      1枚が原料の取り出しから倉庫への搬入まで自己完結するので、何枚並べても配線が破綻せず、増設も1枚単位でできます。
      ${
        over > P.targetRate * 0.25
          ? `<br><span style="color:var(--amber)">ただし目標を ${fmt(over)} 個/分 上回る作りになります。ぴったり組みたいなら「1本のラインで配置」の方が省スペースです。</span>`
          : ''
      }</div>`;
  }
  if (waste > 0.001) {
    advice += `<div class="advice"><b>この構成の実力</b>：切り上げた台数なら最大 <span class="kv">${fmt(P.capMax)} 個/分</span> まで出せます。目標を上げても設備は増えません。</div>`;
  }

  const rows = `<h4 class="sub">必要な設備</h4><table class="ed">
    <thead><tr><th>設備</th><th>作るもの</th><th>確度</th><th class="n">理論台数</th><th class="n">実台数</th><th class="n">稼働率</th><th class="n">面積</th><th class="n">電力</th></tr></thead>
    <tbody>${P.rows
      .map(
        (r) => `<tr>
        <td>${esc(r.fac.name)}</td>
        <td>${esc(r.rec.name)}</td>
        <td>${confBadge(r.rec.conf)}</td>
        <td class="n">${r.machines.toFixed(2)}</td>
        <td class="n"><b>${r.int}</b></td>
        <td class="n" style="color:${r.util > 0.995 ? 'var(--mint)' : r.util > 0.85 ? 'var(--ink)' : 'var(--amber)'}">${(r.util * 100).toFixed(0)}%</td>
        <td class="n">${r.area}</td><td class="n">${fmt(r.power)}</td></tr>`,
      )
      .join('')}
    ${
      P.gens > 0 && P.gf
        ? `<tr><td>${esc(P.gf.name)}</td><td>${esc(P.gr?.name ?? '発電')}</td><td>${confBadge(P.gr?.conf)}</td>
           <td class="n">—</td><td class="n"><b>${P.gens}</b></td><td class="n">100%</td>
           <td class="n">${P.gens * P.gf.w * P.gf.h}</td><td class="n">+${fmt(P.gens * P.gf.gen)}</td></tr>`
        : ''
    }</tbody></table>`;

  const rawKeys = Object.keys(P.raw);
  const have = warehouseSupply(ctxOf(store));
  const rawTbl = rawKeys.length
    ? `<h4 class="sub">倉庫から引き出す原料</h4><table class="ed">
      <thead><tr><th>品目</th><th class="n">必要量</th><th class="n">倉庫から出せる量</th><th class="n">過不足</th><th class="n">最低ライン数</th></tr></thead>
      <tbody>${rawKeys
        .map((i) => {
          const need = P.raw[i]!;
          const got = have[i] ?? 0;
          const d = got - need;
          const byprod = [...ds.recs.values()].filter((r) => r.out.slice(1).some((o) => o.item === i));
          return `<tr><td>${itemChip(ds, i)}
            ${
              byprod.length
                ? `<br><span style="font-size:11px;color:var(--amber)">${esc(ds.fac(byprod[0]!.fac)?.name ?? '')}の副産物として出ます</span>`
                : ''
            }</td>
          <td class="n">${fmt(need)} 個/分</td><td class="n">${fmt(got)}</td>
          <td class="n" style="color:${d < -0.01 ? 'var(--coral)' : 'var(--mint)'}">${d > 0 ? '+' : ''}${fmt(d)}</td>
          <td class="n">${Math.ceil(need / ds.capOf(i) - 1e-9)}</td></tr>`;
        })
        .join('')}</tbody></table>
      <p class="note" style="margin-top:9px">原料は採鉱機を工業エリアに置いて作るのではなく、<b>フィールドの採取ゾーン</b>から倉庫へ転送されたものを
        <b>倉庫搬出口</b>で引き出します。不足しているときは「採取ゾーン」から採取設備を追加してください。</p>`
    : '';

  const flowTbl = `<h4 class="sub">搬送量とライン本数</h4><table class="ed">
    <thead><tr><th>品目</th><th class="n">総流量</th><th class="n">最低ライン数</th></tr></thead>
    <tbody>${P.flow
      .map(
        (f) =>
          `<tr><td>${itemChip(ds, f.item)}</td><td class="n">${fmt(f.rate)} 個/分</td><td class="n">${Math.ceil(f.rate / ds.capOf(f.item) - 1e-9)}</td></tr>`,
      )
      .join('')}</tbody></table>
    <p class="note" style="margin-top:9px">ベルト1本は ${BELT_CAP}個/分（確認済）、パイプ1本は ${store.cfg.pipeCap}個/分（要確認）が上限です。
      ここでの本数は「合流しきった場合の下限」なので、実際の配置では設備ごとの取り回しでこれより増えることがあります。</p>`;

  // レシピが複数ある品目は経路を選べるようにする
  const multi = [...ds.items.values()].filter((i) => {
    const c = ds.producedBy(i.id).length;
    return c > 1 && ((P.made[i.id] ?? 0) > 1e-9 || (P.raw[i.id] ?? 0) > 1e-9);
  });
  const choiceUi = multi.length
    ? `<h4 class="sub">経路の選択</h4>${multi
        .map((i) => {
          const cs = ds.producedBy(i.id);
          return `<div class="prow"><div style="flex:1"><label class="fl">${esc(i.name)}</label>
        <select data-choice="${esc(i.id)}">${cs
          .map((r) => `<option value="${esc(r.id)}" ${ui.choice[i.id] === r.id ? 'selected' : ''}>${esc(r.name)}</option>`)
          .join('')}
        <option value="__raw__" ${ui.choice[i.id] === '__raw__' ? 'selected' : ''}>取出口から供給（作らない）</option></select></div></div>`;
        })
        .join('')}`
    : '';

  box.innerHTML =
    head +
    cards +
    advice +
    rows +
    rawTbl +
    flowTbl +
    choiceUi +
    `<div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap;align-items:center">
      <button class="hbtn primary" id="pApply">ブロックを並べて配置</button>
      <button class="hbtn" id="pApply1">1本のラインで配置</button>
      <button class="hbtn" id="pGoal">この目標を検証対象にする</button>
      <span class="spacer"></span>
      <span style="font-size:12px;color:var(--faint)">配置すると現在の盤面は置き換わります（取り消し可）</span>
    </div>`;

  bindHead(box, store, ui, hooks);
  for (const b of qsa<HTMLButtonElement>(box, '[data-goal]'))
    b.onclick = () => {
      ui.rate = +b.dataset.goal!;
      runPlan(store, ui);
      paintPlan(box, store, ui, hooks);
    };
  for (const s of qsa<HTMLSelectElement>(box, '[data-choice]'))
    s.onchange = () => {
      ui.choice[s.dataset.choice!] = s.value;
      runPlan(store, ui);
      paintPlan(box, store, ui, hooks);
    };

  const apply = (useBlocks: boolean): void => {
    if (!ui.plan) return;
    const plan = ui.plan;
    // store.edit のクロージャ内の代入は型の絞り込みに現れないので、入れ物越しに受け取る
    const out: { r: ReturnType<typeof applyPlan> | null } = { r: null };
    store.edit(() => {
      out.r = applyPlan(ctxOf(store), store.board, plan, ui.choice, { useBlocks });
    });
    store.ui.sel = null;
    hooks.close();
    hooks.refresh();
    hooks.fitView();
    const res = out.r;
    if (!res) return;
    if (res.overflow) hooks.flash('盤面に収まりきらない設備がありました。目標値を下げてください。');
    else if (res.failed)
      hooks.flash(`${res.failed}本のラインが配線できませんでした。設備を動かして経路を空けてください。`);
    else if (res.mode === 'blocks')
      hooks.flash(`${fmt(res.unit)}個/分のブロックを${res.blocks}枚並べ、${res.made}本のラインで配線しました。`);
    else hooks.flash(`${res.made}本のラインで配線しました。`);
  };
  box.querySelector<HTMLButtonElement>('#pApply')!.onclick = () => apply(true);
  box.querySelector<HTMLButtonElement>('#pApply1')!.onclick = () => apply(false);
  box.querySelector<HTMLButtonElement>('#pGoal')!.onclick = () => {
    store.edit(() => {
      store.save.meta.goal = { item: ui.item!, rate: ui.rate };
      store.area.goal = store.save.meta.goal;
    });
    hooks.close();
    hooks.refresh();
    hooks.flash(`検証目標を ${ds.itemName(ui.item)} ${fmt(ui.rate)}個/分 に設定しました。`);
  };
}

function bindHead(box: HTMLElement, store: Store, ui: PlanUi, hooks: PlanHooks): void {
  const i = box.querySelector<HTMLSelectElement>('#pItem');
  const r = box.querySelector<HTMLInputElement>('#pRate');
  const b = box.querySelector<HTMLButtonElement>('#pRun');
  const go = (): void => {
    if (r) ui.rate = Math.max(0, +r.value || 0);
    runPlan(store, ui);
    paintPlan(box, store, ui, hooks);
  };
  if (i)
    i.onchange = () => {
      ui.item = i.value;
      ui.choice = {}; // 目標が変われば経路の選択もやり直す
      go();
    };
  if (r) {
    r.onchange = go;
    r.onkeydown = (e) => {
      if (e.key === 'Enter') go();
    };
  }
  if (b) b.onclick = go;
}

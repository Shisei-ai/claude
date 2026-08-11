/**
 * 画面の各パネル。すべて「Store を読んで HTML を作り直す」だけにしてある。
 *
 * 視認性のために:
 *   - 数値は必ず等幅・桁揃え。単位を添える
 *   - 品目には色の点をつけ、盤面の色と対応させる
 *   - 診断は 停止／注意／上限 の3段で、件数を先に出す
 *   - 推定値に依存している計画かどうかを、検査パネルで常に見せる
 */

import { KIND, capCostOf, fmt } from '../domain/constants';
import { boardMetrics, footprint, freePorts, portList } from '../domain/geometry';
import { goalStatus } from '../domain/solver';
import type { Facility, Kind } from '../domain/types';
import type { Store } from '../store/state';
import { confBadge, esc, h, itemChip, itemOptions, qsa } from './dom';

export interface PanelHooks {
  refresh(): void;
  flash(msg: string): void;
  focusNode(uid: string): void;
  focusBelt(uid: string): void;
  fitView(): void;
  onPickFac(facId: string): void;
  rotate(uid: string): void;
  removeNode(uid: string): void;
  removeBelt(uid: string): void;
  reroute(uid: string): void;
  setRecipe(uid: string, rec: string | null): void;
  setTapItem(uid: string, item: string | null): void;
  setBeltItem(uid: string, item: string | null): void;
}

/* ── 設備パレット ───────────────────────────────── */

export function paintPalette(root: HTMLElement, store: Store, hooks: PanelHooks): void {
  const q = store.ui.facFilter.trim();
  const groups: Partial<Record<Kind, Facility[]>> = {};
  for (const f of store.ds.facs.values()) {
    if (f.field) continue; // 採取設備は盤面に置かない（採取ゾーンに登録する）
    if (q && !f.name.includes(q) && !f.id.includes(q)) continue;
    (groups[f.kind] ??= []).push(f);
  }

  root.innerHTML = `<div class="searchwrap">
      <input type="text" id="facQ" value="${esc(store.ui.facFilter)}" placeholder="設備を絞り込む" aria-label="設備を絞り込む">
    </div>`;

  const kinds = Object.keys(KIND) as (keyof typeof KIND)[];
  let shown = 0;
  for (const k of kinds) {
    const list = groups[k];
    if (!list?.length) continue;
    shown += list.length;
    const sec = h(`<div class="sec"><h3>${KIND[k].label}</h3></div>`);
    for (const f of list) {
      const meta = f.kind === 'generator' ? `+${f.gen}` : f.power ? `−${f.power}` : '';
      const b = h<HTMLButtonElement>(`<button class="fac" aria-pressed="${store.ui.pickFac === f.id && store.ui.tool === 'place'}"
          title="${esc(f.name)}　${f.w}×${f.h}マス${meta ? '　電力 ' + meta : ''}">
          <span class="swatch" style="background:${KIND[k].color}"></span>
          <span class="nm">${esc(f.name)}</span>
          <span class="mt">${f.w}×${f.h}${meta ? ' ' + meta : ''}</span>
        </button>`);
      b.onclick = () => hooks.onPickFac(f.id);
      sec.appendChild(b);
    }
    root.appendChild(sec);
  }
  if (!shown) root.appendChild(h('<div class="sec"><div class="empty">該当する設備がありません。</div></div>'));

  const input = root.querySelector<HTMLInputElement>('#facQ')!;
  input.oninput = () => {
    store.ui.facFilter = input.value;
    paintPalette(root, store, hooks);
    const again = root.querySelector<HTMLInputElement>('#facQ');
    if (again) {
      again.focus();
      again.setSelectionRange(again.value.length, again.value.length);
    }
  };
}

/* ── 電力バー ───────────────────────────────────── */

export function paintPower(store: Store): void {
  const { gen, cons } = store.res;
  const bar = document.getElementById('powerBar')!;
  const ratio = cons > 0 ? gen / cons : gen > 0 ? 1 : 0;
  bar.style.width = Math.min(100, ratio * 100) + '%';
  bar.style.background =
    ratio >= 1.15 ? 'var(--mint)' : ratio >= 1 ? '#8ee0a4' : ratio > 0 ? 'var(--amber)' : 'var(--coral)';
  const num = document.getElementById('powerNum')!;
  num.textContent = `${fmt(gen)} / ${fmt(cons)}`;
  num.style.color = cons > 0 && gen < cons ? 'var(--coral)' : 'var(--ink)';
  const bad = cons > 0 && gen < cons;
  document.getElementById('blackout')!.classList.toggle('on', bad);
  document.getElementById('boLabel')!.classList.toggle('on', bad);
}

/* ── 地域・エリアのタブ ─────────────────────────── */

export function paintTabs(store: Store, hooks: PanelHooks): void {
  const rt = document.getElementById('regionTabs')!;
  const at = document.getElementById('areaTabs')!;
  const regions = [...new Set(store.save.areas.map((a) => a.region))];
  const reg = store.region;

  rt.innerHTML = regions
    .map((r) => `<button data-reg="${esc(r)}" aria-pressed="${r === reg}">${esc(r)}</button>`)
    .join('');
  at.innerHTML = store
    .areasOfRegion(reg)
    .map(({ area, index }) => {
      const n = area.nodes.length;
      return `<button data-area="${index}" aria-pressed="${index === store.save.cur}"
        title="協約容量 ${area.cap || '未設定'} ／ ジップライン ${area.zip || '—'} ／ 戦闘設備 ${area.combat || '—'}">
        ${esc(area.name)}${n ? `<span class="cnt">${n}</span>` : ''}</button>`;
    })
    .join('');

  for (const b of qsa<HTMLButtonElement>(rt, '[data-reg]'))
    b.onclick = () => {
      store.openRegion(b.dataset.reg!);
      hooks.fitView();
    };
  for (const b of qsa<HTMLButtonElement>(at, '[data-area]'))
    b.onclick = () => {
      store.openArea(+b.dataset.area!);
      hooks.fitView();
    };

  // 協約容量の使用量。超えていれば色で警告する
  const area = store.area;
  let used = 0;
  for (const f of area.field) used += (f.count || 0) * capCostOf(store.ds.fac(f.fac));
  for (const n of store.board.nodes) used += capCostOf(store.ds.fac(n.fac));
  const over = area.cap > 0 && used > area.cap;
  const near = area.cap > 0 && used > area.cap * 0.9;
  document.getElementById('areaInfo')!.innerHTML =
    `<span><b>盤面</b> ${store.board.w}×${store.board.h}</span>` +
    `<span><b>設備</b> ${store.board.nodes.length}</span>` +
    `<span><b>ライン</b> ${store.board.belts.length}</span>` +
    `<span style="color:${over ? 'var(--coral)' : near ? 'var(--amber)' : ''}"><b>協約容量</b> ${
      area.cap ? `${used} / ${area.cap}` : '未設定'
    }</span>`;
}

/* ── 品目バランス ───────────────────────────────── */

export function paintBalance(box: HTMLElement, store: Store): void {
  const { res, ds } = store;
  const rows = res.balance.filter((b) => b.make > 0.001 || b.use > 0.001);
  for (const id of Object.keys(res.field)) {
    if (!rows.some((r) => r.id === id) && res.field[id]! > 0) rows.push({ id, make: 0, use: 0, ship: 0 });
  }
  if (!rows.length) {
    box.innerHTML =
      '<div class="empty">設備を置いてレシピを選ぶと、品目ごとの生産量・消費量・搬入量がここに出ます。</div>';
    return;
  }
  rows.sort((a, b) => b.make - a.make);
  box.innerHTML = `<table class="rt">
    <thead><tr><th>品目</th><th>採取</th><th>生産</th><th>消費</th><th>倉庫へ</th><th>倉庫収支</th></tr></thead>
    <tbody>${rows
      .map((r) => {
        const c = res.core[r.id] ?? { field: 0, ship: 0, draw: 0, net: 0 };
        const cls = c.net > 0.05 ? 'pos' : c.net < -0.05 ? 'neg' : 'zero';
        return `<tr><td>${itemChip(ds, r.id)}</td>
        <td>${c.field > 0.001 ? fmt(c.field) : '—'}</td>
        <td>${r.make > 0.001 ? fmt(r.make) : '—'}</td>
        <td>${r.use > 0.001 ? fmt(r.use) : '—'}</td>
        <td>${r.ship > 0.001 ? fmt(r.ship) : '—'}</td>
        <td class="${cls}">${c.net > 0.05 ? '+' : ''}${fmt(c.net)}</td></tr>`;
      })
      .join('')}</tbody></table>`;
}

/* ── 効率メトリクス ─────────────────────────────── */

export function paintMetrics(box: HTMLElement, store: Store): void {
  const { res, ds, board } = store;
  if (!board.nodes.length) {
    box.innerHTML = '<div class="empty">盤面に設備を置くと、占有マス・密度・平均稼働率をここで測ります。</div>';
    return;
  }
  const m = boardMetrics(ds, board, res.ratio);
  const ship = res.balance.filter((b) => b.ship > 0.001).sort((a, b) => b.ship - a.ship)[0];
  const net = res.balance.map((b) => ({ id: b.id, v: b.make - b.use })).sort((a, b) => b.v - a.v)[0];
  const main = ship
    ? { id: ship.id, v: ship.ship, lbl: '倉庫への搬入' }
    : net && net.v > 0.001
      ? { id: net.id, v: net.v, lbl: '純産出' }
      : null;
  const perCell = main && m.cells ? main.v / m.cells : 0;
  const perPow = main && res.cons > 0 ? (main.v / res.cons) * 100 : 0;
  const g = goalStatus(res, store.save.meta.goal);

  const goalHtml = g
    ? `<div style="margin-bottom:10px">
        <div class="row"><span class="k">検証目標</span><span class="v">${itemChip(ds, g.item)} ${fmt(g.rate)}/分</span></div>
        <div class="bar"><i style="width:${Math.min(100, g.ratio * 100)}%;background:${
          g.ratio >= 0.999 ? 'var(--mint)' : g.ratio >= 0.8 ? 'var(--amber)' : 'var(--coral)'
        }"></i></div>
        <div class="row"><span class="k">達成度</span><span class="v" style="color:${
          g.ratio >= 0.999 ? 'var(--mint)' : 'var(--amber)'
        }">${fmt(g.got)} / ${fmt(g.rate)}（${Math.round(g.ratio * 100)}%）${
          g.ratio < 0.999 ? '　不足 ' + fmt(g.rate - g.got) : ''
        }</span></div>
      </div>`
    : '';

  box.innerHTML =
    goalHtml +
    `${
      main
        ? `<div class="row"><span class="k">主産物（${main.lbl}）</span><span class="v" style="color:var(--mint)">${itemChip(ds, main.id)} ${fmt(main.v)}/分</span></div>`
        : '<div class="row"><span class="k">主産物</span><span class="v zero">まだ搬出がありません</span></div>'
    }
    <div class="row"><span class="k">占有マス（設備＋ライン）</span><span class="v">${m.cells}　<span style="color:var(--faint)">設備 ${m.facCells} / ライン ${m.beltCells}</span></span></div>
    <div class="row"><span class="k">外接範囲</span><span class="v">${m.bw}×${m.bh} = ${m.bbox}　充填 ${Math.round(m.fill * 100)}%</span></div>
    <div class="row"><span class="k">面積効率</span><span class="v" style="color:${perCell > 0 ? 'var(--mint)' : 'var(--faint)'}">${perCell.toFixed(3)} 個/分/マス</span></div>
    <div class="row"><span class="k">電力効率</span><span class="v">${perPow > 0 ? perPow.toFixed(2) + ' 個/分/電力100' : '—'}</span></div>
    <div class="row"><span class="k">平均稼働率</span><span class="v" style="color:${
      m.avgUtil > 0.99 ? 'var(--mint)' : m.avgUtil > 0.8 ? 'var(--ink)' : 'var(--amber)'
    }">${Math.round(m.avgUtil * 100)}%　<span style="color:var(--faint)">${m.machines}台</span></span></div>
    ${
      m.avgUtil < 0.999 && m.machines
        ? '<div class="empty" style="margin-top:7px">稼働率100%未満の設備は削れる余地です。「生産目標」から必要台数を逆算すると最小構成が出ます。</div>'
        : ''
    }`;
}

/* ── 診断 ───────────────────────────────────────── */

export function paintDiag(box: HTMLElement, store: Store, hooks: PanelHooks): void {
  const list = store.res.diag.slice().sort((a, b) => ({ err: 0, wrn: 1, inf: 2 })[a.lv] - ({ err: 0, wrn: 1, inf: 2 })[b.lv]);
  if (!list.length) {
    box.innerHTML = store.board.nodes.length
      ? '<div class="warn"><span class="tag t-inf">良好</span><span>全設備がフル稼働、詰まりも電力不足もありません。</span></div>'
      : '<div class="empty">問題が見つかるとここに並びます。</div>';
    return;
  }
  const nErr = list.filter((d) => d.lv === 'err').length;
  const nWrn = list.filter((d) => d.lv === 'wrn').length;
  box.innerHTML =
    `<div class="diagsum">
      <span style="color:${nErr ? 'var(--coral)' : 'inherit'}">停止 <b>${nErr}</b></span>
      <span style="color:${nWrn ? 'var(--amber)' : 'inherit'}">注意 <b>${nWrn}</b></span>
      <span>上限 <b>${list.length - nErr - nWrn}</b></span>
      <span style="color:var(--dim)">行をクリックで該当箇所へ</span>
    </div>` +
    list
      .map(
        (d, k) =>
          `<div class="warn${d.uid || d.belt ? ' jump' : ''}" data-i="${k}"${d.uid || d.belt ? ' role="button" tabindex="0"' : ''}>
        <span class="tag t-${d.lv === 'err' ? 'err' : d.lv === 'wrn' ? 'wrn' : 'inf'}">${
          d.lv === 'err' ? '停止' : d.lv === 'wrn' ? '注意' : '上限'
        }</span><span>${esc(d.t)}</span></div>`,
      )
      .join('');

  for (const el of qsa(box, '.jump')) {
    const go = (): void => {
      const d = list[+el.dataset.i!]!;
      if (d.uid) hooks.focusNode(d.uid);
      else if (d.belt) hooks.focusBelt(d.belt);
    };
    el.onclick = go;
    el.onkeydown = (e) => {
      if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
        e.preventDefault();
        go();
      }
    };
  }
}

/* ── 検査パネル ─────────────────────────────────── */

export function paintInspector(box: HTMLElement, store: Store, hooks: PanelHooks): void {
  const { ds, res, board } = store;
  const sel = store.ui.sel;

  if (!sel) {
    paintOverview(box, store, hooks);
    return;
  }

  if (sel.k === 'n') {
    const n = board.nodes.find((x) => x.uid === sel.uid);
    if (!n) {
      store.ui.sel = null;
      return paintInspector(box, store, hooks);
    }
    const f = ds.fac(n.fac);
    if (!f) return;
    const recs = ds.recipesFor(n.fac);
    const rt = res.ratio[n.uid] ?? 0;
    const rec = ds.rec(n.rec);
    const cyc = f.tap
      ? n.item
        ? { sec: 60 / ds.capOf(n.item), in: [], out: [{ item: n.item, qty: 1 }] }
        : null
      : rec
        ? { sec: rec.sec, in: rec.in, out: rec.out }
        : null;
    const cpm = cyc && cyc.sec > 0 ? 60 / cyc.sec : 0;
    const fp = footprint(ds, n);
    const passive = f.kind === 'sink' || f.kind === 'logistics';

    box.innerHTML = `<div class="sec">
        <h3>${KIND[f.kind].label}設備</h3>
        <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
          <div style="font-size:15.5px;font-weight:600">${esc(f.name)}</div>
          ${rec ? confBadge(rec.conf) : ''}
        </div>
        <div class="num" style="font-size:10.5px;color:var(--faint);margin-top:2px">
          #${esc(n.uid.slice(1))} · ${fp.w}×${fp.h}マス · 座標 ${n.x},${n.y} · ${['↑上', '→右', '↓下', '←左'][(n.rot || 0) & 3]}向き
        </div>
        ${
          f.tap
            ? `<label class="fl" for="tapSel">引き出す品目</label>
               <select id="tapSel">${itemOptions(ds, n.item, '— 未設定 —')}</select>
               <div class="row" style="margin-top:7px"><span class="k">供給上限</span><span class="v">${n.item ? ds.capOf(n.item) : 30} 個/分</span></div>
               <div class="row"><span class="k">倉庫の在庫収支</span><span class="v" style="color:${
                 n.item && (res.core[n.item]?.net ?? 0) < -0.01 ? 'var(--coral)' : 'var(--mint)'
               }">${
                 n.item && res.core[n.item]
                   ? `${res.core[n.item]!.net > 0 ? '+' : ''}${fmt(res.core[n.item]!.net)} /分`
                   : '—'
               }</span></div>`
            : recs.length
              ? `<label class="fl" for="recSel">作るもの</label>
                 <select id="recSel"><option value="">— 未設定 —</option>${recs
                   .map((r) => `<option value="${esc(r.id)}" ${n.rec === r.id ? 'selected' : ''}>${esc(r.name)}</option>`)
                   .join('')}</select>`
              : '<div class="empty">この設備で作れるレシピが登録されていません。</div>'
        }
        ${
          !passive
            ? `<label class="fl">稼働率</label>
               <div class="bar"><i style="width:${Math.round(rt * 100)}%;background:${
                 rt > 0.995 ? 'var(--mint)' : rt > 0.005 ? 'var(--amber)' : 'var(--coral)'
               }"></i></div>
               <div class="row"><span class="k">実効</span><span class="v">${(Math.round(rt * 1000) / 10).toFixed(1)} %</span></div>
               ${
                 (res.des[n.uid] ?? 1) < 0.995
                   ? `<div class="row"><span class="k">下流の需要</span><span class="v" style="color:var(--amber)">${Math.round((res.des[n.uid] ?? 0) * 100)} %</span></div>`
                   : ''
               }`
            : ''
        }
        ${f.power ? `<div class="row"><span class="k">消費電力</span><span class="v">−${fmt(f.power)}</span></div>` : ''}
        ${f.gen ? `<div class="row"><span class="k">発電量</span><span class="v">+${fmt(f.gen * rt)} <span style="color:var(--faint)">/ ${fmt(f.gen)}</span></span></div>` : ''}
      </div>
      ${
        cyc
          ? `<div class="sec"><h3>入出力（毎分）</h3>
              ${cyc.in
                .map(
                  (x) =>
                    `<div class="row"><span class="k">${itemChip(ds, x.item)}</span><span class="v">−${fmt(x.qty * cpm * rt)} <span style="color:var(--faint)">/ ${fmt(x.qty * cpm)}</span></span></div>`,
                )
                .join('')}
              ${cyc.out
                .map(
                  (x) =>
                    `<div class="row"><span class="k">${itemChip(ds, x.item)}</span><span class="v pos">+${fmt(x.qty * cpm * rt)} <span style="color:var(--faint)">/ ${fmt(x.qty * cpm)}</span></span></div>`,
                )
                .join('')}
              ${!cyc.in.length && !cyc.out.length ? '<div class="empty">入出力なし（発電のみ）</div>' : ''}
              <div class="row" style="margin-top:7px"><span class="k">1周期</span><span class="v">${cyc.sec} 秒</span></div>
            </div>`
          : ''
      }
      <div class="sec"><h3>搬入口 / 搬出口</h3>
        <div class="row"><span class="k">搬入口</span><span class="v">${portList(ds, n, 'in').length - freePorts(ds, board, n, 'in').length} / ${portList(ds, n, 'in').length} 使用</span></div>
        <div class="row"><span class="k">搬出口</span><span class="v">${portList(ds, n, 'out').length - freePorts(ds, board, n, 'out').length} / ${portList(ds, n, 'out').length} 使用</span></div>
      </div>
      <div class="sec"><h3>接続</h3>${connList(store, n.uid, hooks)}
        <button class="mini" id="btnRot">向きを回す（<kbd>R</kbd>）</button>
        <button class="mini danger" id="btnDel">この設備を撤去（<kbd>Del</kbd>）</button>
      </div>`;

    const rs = box.querySelector<HTMLSelectElement>('#recSel');
    if (rs) rs.onchange = () => hooks.setRecipe(n.uid, rs.value || null);
    const ts = box.querySelector<HTMLSelectElement>('#tapSel');
    if (ts) ts.onchange = () => hooks.setTapItem(n.uid, ts.value || null);
    box.querySelector<HTMLButtonElement>('#btnRot')!.onclick = () => hooks.rotate(n.uid);
    box.querySelector<HTMLButtonElement>('#btnDel')!.onclick = () => hooks.removeNode(n.uid);
    bindConnJumps(box, store, hooks);
    return;
  }

  /* ライン */
  const b = board.belts.find((x) => x.uid === sel.uid);
  if (!b) {
    store.ui.sel = null;
    return paintInspector(box, store, hooks);
  }
  const A = board.nodes.find((n) => n.uid === b.from);
  const Z = board.nodes.find((n) => n.uid === b.to);
  const cap = ds.capOf(b.item);
  const flow = res.belt[b.uid] ?? 0;
  const pct = Math.min(100, (flow / cap) * 100);
  const name = ds.lineName(b.item);

  box.innerHTML = `<div class="sec">
      <h3>${esc(name)}</h3>
      <div style="font-size:14px;font-weight:600">${esc(ds.fac(A?.fac ?? '')?.name ?? '?')} → ${esc(ds.fac(Z?.fac ?? '')?.name ?? '?')}</div>
      <div class="num" style="font-size:10.5px;color:var(--faint)">#${esc(b.uid.slice(1))} · 長さ ${(b.cells ?? []).length} マス</div>
      <label class="fl" for="beltItem">運ぶ品目</label>
      <select id="beltItem">${itemOptions(ds, b.item, '— 未設定 —')}</select>
      <label class="fl">流量</label>
      <div class="bar"><i style="width:${pct}%;background:${flow >= cap - 0.05 ? 'var(--amber)' : 'var(--mint)'}"></i></div>
      <div class="row"><span class="k">実測 / 上限</span><span class="v">${fmt(flow)} / ${cap} 個/分</span></div>
      <div class="row"><span class="k">占有率</span><span class="v">${Math.round(pct)} %</span></div>
      ${
        flow >= cap - 0.05
          ? '<div class="empty" style="color:var(--amber)">上限に張り付いています。これ以上は2本目を引くか、分流器で分けてください。</div>'
          : ''
      }
      <button class="mini" id="btnRe">経路を引き直す</button>
      <button class="mini danger" id="btnDelB">このラインを撤去（<kbd>Del</kbd>）</button>
    </div>`;
  box.querySelector<HTMLSelectElement>('#beltItem')!.onchange = (e) =>
    hooks.setBeltItem(b.uid, (e.target as HTMLSelectElement).value || null);
  box.querySelector<HTMLButtonElement>('#btnRe')!.onclick = () => hooks.reroute(b.uid);
  box.querySelector<HTMLButtonElement>('#btnDelB')!.onclick = () => hooks.removeBelt(b.uid);
}

function connList(store: Store, uid: string, _hooks: PanelHooks): string {
  const { ds, board, res } = store;
  const outs = board.belts.filter((b) => b.from === uid);
  const ins = board.belts.filter((b) => b.to === uid);
  if (!outs.length && !ins.length) return '<div class="empty">まだラインが繋がっていません。</div>';
  const line = (b: (typeof outs)[number], dir: 'in' | 'out'): string => {
    const other = board.nodes.find((n) => n.uid === (dir === 'out' ? b.to : b.from));
    const fname = other ? (ds.fac(other.fac)?.name ?? '?') : '?';
    return `<div class="row jumpb" data-belt="${esc(b.uid)}" role="button" tabindex="0" style="cursor:pointer">
      <span class="k">${dir === 'out' ? '→' : '←'} ${esc(fname)}${b.item ? '　' + esc(ds.itemName(b.item)) : ''}</span>
      <span class="v">${fmt(res.belt[b.uid] ?? 0)}</span></div>`;
  };
  return ins.map((b) => line(b, 'in')).join('') + outs.map((b) => line(b, 'out')).join('');
}

function bindConnJumps(box: HTMLElement, _store: Store, hooks: PanelHooks): void {
  for (const el of qsa(box, '.jumpb')) {
    el.onclick = () => hooks.focusBelt(el.dataset.belt!);
  }
}

/* ── 何も選んでいないときの概況とエリア設定 ─────── */

function paintOverview(box: HTMLElement, store: Store, hooks: PanelHooks): void {
  const { ds, res, board, save } = store;
  const area = store.area;

  // この計画がどれだけ推定値に依存しているか。HANDOFF §8-6 を前面に出す
  const used = new Set<string>();
  for (const n of board.nodes) if (n.rec) used.add(n.rec);
  const usedRecs = [...used].map((id) => ds.rec(id)).filter((r): r is NonNullable<typeof r> => !!r);
  const nGuess = usedRecs.filter((r) => (r.conf ?? 'guess') === 'guess').length;
  const nPart = usedRecs.filter((r) => r.conf === 'part').length;
  const confHtml = usedRecs.length
    ? `<div class="sec"><h3>この計画の確度</h3>
        <div class="row"><span class="k">使っているレシピ</span><span class="v">${usedRecs.length} 件</span></div>
        <div class="row"><span class="k">確認済</span><span class="v conf-ok">${usedRecs.length - nPart - nGuess}</span></div>
        <div class="row"><span class="k">一部確認</span><span class="v conf-part">${nPart}</span></div>
        <div class="row"><span class="k">推定のまま</span><span class="v conf-guess">${nGuess}</span></div>
        ${
          nGuess + nPart > 0
            ? `<div class="empty" style="margin-top:6px">${
                nGuess ? '<b style="color:var(--coral)">推定値を含む計画です。</b>' : '未確認の数量を含みます。'
              }ゲーム内の製造プロセス画面で実数を確認し、「データ編集」で上書きしてください。</div>`
            : ''
        }
      </div>`
    : '';

  box.innerHTML =
    `<div class="sec"><h3>概況</h3>
      <div class="row"><span class="k">設置数</span><span class="v">${board.nodes.length}</span></div>
      <div class="row"><span class="k">ライン</span><span class="v">${board.belts.length} 本</span></div>
      <div class="row"><span class="k">消費電力</span><span class="v">${res.cons ? '−' + fmt(res.cons) : '0'}</span></div>
      <div class="row"><span class="k">発電機</span><span class="v">+${fmt(res.genOnly)}</span></div>
      <div class="row"><span class="k">基礎電力</span><span class="v">+${fmt(res.base)}</span></div>
      <div class="row"><span class="k">充足率</span><span class="v" style="color:${
        res.cons > 0 && res.pf < 1 ? 'var(--coral)' : 'var(--mint)'
      }">${res.cons > 0 ? Math.round((res.gen / res.cons) * 100) + '%' : '—'}</span></div>
    </div>` +
    confHtml +
    `<div class="sec"><h3>${esc(store.region)} ／ ${esc(area.name)}</h3>
      <label class="fl" for="areaName">エリア名</label><input type="text" id="areaName" value="${esc(area.name)}">
      <div style="display:flex;gap:6px">
        <div style="flex:1"><label class="fl" for="areaCap">協約容量</label><input type="number" id="areaCap" min="0" value="${area.cap || 0}"></div>
        <div style="flex:1"><label class="fl" for="areaZip">ジップライン</label><input type="number" id="areaZip" min="0" value="${area.zip || 0}"></div>
        <div style="flex:1"><label class="fl" for="areaCb">戦闘設備</label><input type="number" id="areaCb" min="0" value="${area.combat || 0}"></div>
      </div>
      <label class="fl" for="planName">プラン名</label><input type="text" id="planName" value="${esc(save.meta.name)}">
      <label class="fl" for="basePow">基礎電力（協約核心の供給）</label>
      <input type="number" min="0" step="10" id="basePow" value="${+save.meta.basePower || 0}">
      <label class="fl" for="genRec">発電に使うバッテリー</label>
      <select id="genRec">${(() => {
        const g = ds.generatorFac();
        const ls = g ? ds.recipesFor(g.id) : [];
        const cur = ds.generatorRec(save.meta.genRec)?.id;
        return ls
          .map(
            (r) =>
              `<option value="${esc(r.id)}" ${cur === r.id ? 'selected' : ''}>${esc(
                r.in[0] ? ds.itemName(r.in[0].item) : r.name,
              )}</option>`,
          )
          .join('');
      })()}</select>
      <label class="fl" for="goalItem">検証目標</label>
      <div style="display:flex;gap:6px">
        <select id="goalItem" style="flex:1">${itemOptions(ds, save.meta.goal?.item, '— 未設定 —')}</select>
        <input type="number" id="goalRate" min="0" step="1" value="${save.meta.goal?.rate ?? 0}" style="width:84px">
      </div>
      <label class="fl" for="pcap">パイプの上限（個/分・要確認）</label>
      <input type="number" id="pcap" min="1" step="1" value="${store.cfg.pipeCap}">
      <label class="fl">盤面の広さ（横 × 縦）</label>
      <div style="display:flex;gap:6px">
        <input type="number" id="bw" min="12" max="240" value="${board.w}" aria-label="盤面の横幅">
        <input type="number" id="bh" min="12" max="160" value="${board.h}" aria-label="盤面の縦幅">
      </div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:12.5px;color:var(--dim)">
        <input type="checkbox" id="agrow" ${save.meta.autoGrow !== false ? 'checked' : ''} style="width:auto"> 自動配置で盤面を広げる</label>
    </div>`;

  const on = <T extends HTMLElement>(id: string, ev: 'change' | 'input', fn: (el: T) => void): void => {
    const el = box.querySelector<T>('#' + id);
    if (el) el.addEventListener(ev, () => fn(el));
  };
  on<HTMLInputElement>('planName', 'change', (el) => store.edit(() => (save.meta.name = el.value)));
  on<HTMLInputElement>('areaName', 'change', (el) =>
    store.edit(() => {
      area.name = el.value;
    }),
  );
  for (const [id, key] of [
    ['areaCap', 'cap'],
    ['areaZip', 'zip'],
    ['areaCb', 'combat'],
  ] as const) {
    on<HTMLInputElement>(id, 'change', (el) => store.edit(() => (area[key] = Math.max(0, +el.value || 0))));
  }
  on<HTMLInputElement>('basePow', 'change', (el) =>
    store.edit(() => {
      save.meta.basePower = Math.max(0, +el.value || 0);
      area.basePower = save.meta.basePower;
    }),
  );
  on<HTMLSelectElement>('genRec', 'change', (el) => store.edit(() => (save.meta.genRec = el.value)));
  const setGoal = (): void => {
    const it = box.querySelector<HTMLSelectElement>('#goalItem')!.value;
    const rt = Math.max(0, +box.querySelector<HTMLInputElement>('#goalRate')!.value || 0);
    store.edit(() => {
      save.meta.goal = it && rt > 0 ? { item: it, rate: rt } : null;
      area.goal = save.meta.goal;
    });
  };
  on('goalItem', 'change', setGoal);
  on('goalRate', 'change', setGoal);
  on<HTMLInputElement>('pcap', 'change', (el) =>
    store.edit(
      () => {
        store.cfg.pipeCap = Math.max(1, +el.value || 30);
        save.meta.pipeCap = store.cfg.pipeCap;
      },
      { reindex: true },
    ),
  );
  const resize = (): void => {
    const w = +box.querySelector<HTMLInputElement>('#bw')!.value || board.w;
    const hh = +box.querySelector<HTMLInputElement>('#bh')!.value || board.h;
    store.edit(() => {
      board.w = Math.max(12, Math.min(240, Math.round(w)));
      board.h = Math.max(12, Math.min(160, Math.round(hh)));
    });
    hooks.fitView();
  };
  on('bw', 'change', resize);
  on('bh', 'change', resize);
  on<HTMLInputElement>('agrow', 'change', (el) => store.edit(() => (save.meta.autoGrow = el.checked)));
}

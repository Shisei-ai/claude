/**
 * データ編集。
 *
 * 初期データの数値は多くが仮の値なので、ここで上書きできることが前提の設計。
 * 品目 / 設備 / レシピ / まとめて入力 / 網羅状況 の5タブ。
 */

import { parseRecipes, recipesToText } from '../../domain/bulk';
import { BELT_CAP, KIND, SIDE_JP, fmt } from '../../domain/constants';
import { coverage } from '../../domain/coverage';
import type { Facility, Item, Kind, Side } from '../../domain/types';
import type { Store } from '../../store/state';
import { confBadge, esc, h, itemChip, itemOptions, qsa } from '../dom';

export type DataTab = 'items' | 'facs' | 'recs' | 'bulk' | 'cov';

export interface DataUi {
  tab: DataTab;
  qItem: string;
  cItem: string;
  qRec: string;
}

export const createDataUi = (): DataUi => ({ tab: 'items', qItem: '', cItem: '', qRec: '' });

export interface DataHooks {
  refresh(): void;
  flash(msg: string): void;
}

export function paintData(pane: HTMLElement, store: Store, ui: DataUi, hooks: DataHooks): void {
  const repaint = (): void => paintData(pane, store, ui, hooks);
  const commit = (fn: () => void): void => {
    store.edit(fn, { reindex: true });
    repaint();
    hooks.refresh();
  };

  if (ui.tab === 'items') return paintItems(pane, store, ui, commit, repaint);
  if (ui.tab === 'facs') return paintFacs(pane, store, commit);
  if (ui.tab === 'bulk') return paintBulk(pane, store, commit, hooks);
  if (ui.tab === 'cov') return paintCoverage(pane, store, ui, commit);
  return paintRecs(pane, store, ui, commit, repaint);
}

/* ── 品目 ─────────────────────────────────────── */

function paintItems(
  p: HTMLElement,
  store: Store,
  ui: DataUi,
  commit: (fn: () => void) => void,
  repaint: () => void,
): void {
  const items = store.save.items;
  const q = ui.qItem.trim();
  const cf = ui.cItem;
  const cats: string[] = [];
  for (const i of items) {
    const c = i.cat || 'その他';
    if (!cats.includes(c)) cats.push(c);
  }
  const list = items
    .map((i, k) => ({ i, k }))
    .filter(
      (o) =>
        (!cf || (o.i.cat || 'その他') === cf) &&
        (!q || o.i.name.includes(q) || o.i.id.includes(q) || (o.i.cat ?? '').includes(q)),
    );

  p.innerHTML = `<div class="prow">
      <div style="flex:1;min-width:170px"><label class="fl" for="qItem">名前で絞り込む</label>
        <input type="text" id="qItem" value="${esc(q)}" placeholder="例：バッテリー"></div>
      <div style="width:180px"><label class="fl" for="cItem">分類</label>
        <select id="cItem"><option value="">すべて（${items.length}件）</option>${cats
          .map(
            (c) =>
              `<option value="${esc(c)}" ${cf === c ? 'selected' : ''}>${esc(c)}（${items.filter((x) => (x.cat || 'その他') === c).length}）</option>`,
          )
          .join('')}</select></div>
      <div style="width:150px"><label class="fl">&nbsp;</label><button class="hbtn" id="addItem" style="width:100%">＋ 品目を追加</button></div>
    </div>
    <div style="font-family:var(--mono);font-size:11px;color:var(--faint);margin-bottom:8px">${list.length} / ${items.length} 件</div>
    <table class="ed"><thead><tr>
      <th style="width:24%">品目名</th><th style="width:13%">ID</th><th style="width:13%">分類</th>
      <th style="width:15%">状態</th><th style="width:8%">色</th><th style="width:16%">レシピ</th><th></th>
    </tr></thead><tbody>${list
      .map(
        ({ i, k }) => `<tr>
      <td><input type="text" value="${esc(i.name)}" data-k="${k}" data-f="name"></td>
      <td><input type="text" value="${esc(i.id)}" data-k="${k}" data-f="id"></td>
      <td><input type="text" value="${esc(i.cat ?? '')}" data-k="${k}" data-f="cat" list="catList"></td>
      <td><select data-k="${k}" data-f="phase">
        <option value="solid" ${i.phase !== 'liquid' && i.phase !== 'gas' ? 'selected' : ''}>固体（ベルト）</option>
        <option value="liquid" ${i.phase === 'liquid' ? 'selected' : ''}>液体（パイプ）</option>
        <option value="gas" ${i.phase === 'gas' ? 'selected' : ''}>ガス（パイプ）</option></select></td>
      <td><input type="color" value="${esc(i.color || '#8FA6B2')}" data-k="${k}" data-f="color" style="height:30px;padding:1px"></td>
      <td>${
        store.ds.producedBy(i.id).length
          ? `<span style="font-family:var(--mono);font-size:11.5px;color:var(--mint)">${store.ds.producedBy(i.id).length}件</span>`
          : `<button class="hbtn" data-newrec="${esc(i.id)}" style="padding:4px 8px;font-size:11.5px">＋作り方</button>`
      }</td>
      <td><button class="x" data-del="${k}" title="削除">×</button></td></tr>`,
      )
      .join('')}</tbody></table>
    <datalist id="catList">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
    <p class="note" style="margin-top:13px">工業で作れる品目はここに全て並べておけます。<b>作り方が未登録の品目には「＋作り方」</b>が出るので、
      そこからレシピを作ってゲーム内の数値を入れてください。<b>状態</b>を液体・ガスにすると、その品目はパイプ扱いになり
      上限や物流設備の判定が切り替わります。</p>`;

  const qi = p.querySelector<HTMLInputElement>('#qItem')!;
  qi.oninput = () => {
    ui.qItem = qi.value;
    repaint();
    const again = p.querySelector<HTMLInputElement>('#qItem');
    if (again) {
      again.focus();
      again.setSelectionRange(again.value.length, again.value.length);
    }
  };
  p.querySelector<HTMLSelectElement>('#cItem')!.onchange = (e) => {
    ui.cItem = (e.target as HTMLSelectElement).value;
    repaint();
  };
  for (const inp of qsa<HTMLInputElement | HTMLSelectElement>(p, '[data-f]')) {
    inp.onchange = () =>
      commit(() => {
        const it = store.save.items[+inp.dataset.k!]!;
        const f = inp.dataset.f! as keyof Item;
        if (f === 'id') {
          const old = it.id;
          it.id = inp.value;
          retargetItem(store, old, inp.value);
        } else (it as unknown as Record<string, string>)[f] = inp.value;
      });
  }
  for (const b of qsa<HTMLButtonElement>(p, '[data-del]'))
    b.onclick = () => commit(() => store.save.items.splice(+b.dataset.del!, 1));
  for (const b of qsa<HTMLButtonElement>(p, '[data-newrec]'))
    b.onclick = () => {
      const id = b.dataset.newrec!;
      commit(() => {
        store.save.recs.push({
          id: 'rec' + Date.now().toString(36).slice(-4),
          name: store.ds.itemName(id) + ' の作り方',
          conf: 'guess',
          fac: [...store.ds.facs.values()].find((f) => f.kind === 'process')?.id ?? '',
          sec: 6,
          in: [],
          out: [{ item: id, qty: 1 }],
        });
      });
      ui.tab = 'recs';
      ui.qRec = store.ds.itemName(id);
      syncTabButtons(ui);
      repaint();
    };
  p.querySelector<HTMLButtonElement>('#addItem')!.onclick = () =>
    commit(() =>
      store.save.items.push({
        id: 'item' + Date.now().toString(36).slice(-4),
        name: '新しい品目',
        cat: ui.cItem || 'その他',
        color: '#8FA6B2',
        phase: 'solid',
      }),
    );
}

function retargetItem(store: Store, oldId: string, newId: string): void {
  for (const r of store.save.recs) {
    for (const x of r.in) if (x.item === oldId) x.item = newId;
    for (const x of r.out) if (x.item === oldId) x.item = newId;
  }
  for (const a of store.save.areas) {
    for (const b of a.belts) if (b.item === oldId) b.item = newId;
    for (const n of a.nodes) if (n.item === oldId) n.item = newId;
    for (const f of a.field) if (f.item === oldId) f.item = newId;
  }
  for (const b of store.board.belts) if (b.item === oldId) b.item = newId;
  for (const n of store.board.nodes) if (n.item === oldId) n.item = newId;
}

/* ── 設備 ─────────────────────────────────────── */

function paintFacs(p: HTMLElement, store: Store, commit: (fn: () => void) => void): void {
  const facs = store.save.facs;
  p.innerHTML = `<table class="ed"><thead><tr>
      <th>設備名</th><th>ID</th><th>種別</th><th class="n">幅</th><th class="n">奥行</th>
      <th class="n">消費電力</th><th class="n">発電量</th><th class="n">搬入口</th><th class="n">搬出口</th>
      <th>入る辺</th><th>出る辺</th><th>取出口</th><th></th></tr></thead>
    <tbody>${facs
      .map((f, k) => {
        const pc = store.ds.portCounts(f.id);
        return `<tr>
      <td><input type="text" value="${esc(f.name)}" data-k="${k}" data-f="name"></td>
      <td><input type="text" value="${esc(f.id)}" data-k="${k}" data-f="id" style="width:82px"></td>
      <td><select data-k="${k}" data-f="kind">${(Object.keys(KIND) as Kind[])
        .map((kk) => `<option value="${kk}" ${f.kind === kk ? 'selected' : ''}>${KIND[kk].label}</option>`)
        .join('')}</select></td>
      <td><input type="number" min="1" max="12" value="${f.w}" data-k="${k}" data-f="w" style="width:56px"></td>
      <td><input type="number" min="1" max="12" value="${f.h}" data-k="${k}" data-f="h" style="width:56px"></td>
      <td><input type="number" min="0" step="1" value="${f.power}" data-k="${k}" data-f="power" style="width:68px"></td>
      <td><input type="number" min="0" step="1" value="${f.gen}" data-k="${k}" data-f="gen" style="width:68px"></td>
      <td><input type="number" min="0" max="16" value="${pc.nIn}" data-k="${k}" data-f="nIn" style="width:56px"></td>
      <td><input type="number" min="0" max="16" value="${pc.nOut}" data-k="${k}" data-f="nOut" style="width:56px"></td>
      <td><select data-k="${k}" data-f="inSide">${[0, 1, 2, 3]
        .map((v) => `<option value="${v}" ${pc.inSide === v ? 'selected' : ''}>${SIDE_JP[v]}</option>`)
        .join('')}</select></td>
      <td><select data-k="${k}" data-f="outSide">${[0, 1, 2, 3]
        .map((v) => `<option value="${v}" ${pc.outSide === v ? 'selected' : ''}>${SIDE_JP[v]}</option>`)
        .join('')}</select></td>
      <td style="text-align:center"><input type="checkbox" ${f.tap ? 'checked' : ''} data-k="${k}" data-f="tap" style="width:auto"></td>
      <td><button class="x" data-del="${k}" title="削除">×</button></td></tr>`;
      })
      .join('')}</tbody></table>
    <button class="hbtn" id="addFac" style="margin-top:11px">＋ 設備を追加</button>
    <p class="note" style="margin-top:13px"><b>搬入口／搬出口の数</b>が、その設備に何本のラインを繋げるかを決めます（1つの口にライン1本）。
      口が足りなければ分流器・合流器を挟む必要があり、これが実際の占有面積を左右します。
      <b>入る辺／出る辺</b>は口を並べ始める辺で、設備を回すと一緒に回ります。<br>
      <b>取出口</b>にチェックを入れると、レシピの代わりに「引き出す品目」を選ぶ設備になります
      （倉庫搬出口のように、倉庫から ${BELT_CAP}個/分 まで供給する口）。<br>
      <b>種別の意味</b>　倉庫搬出＝倉庫から引き出す口／生産＝入力を出力に変換／発電＝品目を消費して電力を作る／
      物流＝分流器・合流器／倉庫搬入＝いくらでも受け取る終点。</p>`;

  for (const inp of qsa<HTMLInputElement | HTMLSelectElement>(p, '[data-f]')) {
    inp.onchange = () =>
      commit(() => {
        const f = store.save.facs[+inp.dataset.k!]!;
        const fl = inp.dataset.f! as keyof Facility;
        if (fl === 'tap') {
          f.tap = (inp as HTMLInputElement).checked;
          return;
        }
        if (fl === 'id') {
          const old = f.id;
          f.id = inp.value;
          for (const r of store.save.recs) if (r.fac === old) r.fac = f.id;
          for (const a of store.save.areas) {
            for (const n of a.nodes) if (n.fac === old) n.fac = f.id;
            for (const x of a.field) if (x.fac === old) x.fac = f.id;
          }
          for (const n of store.board.nodes) if (n.fac === old) n.fac = f.id;
          return;
        }
        if (['w', 'h', 'power', 'gen', 'nIn', 'nOut'].includes(fl)) {
          const v = Math.max(fl === 'w' || fl === 'h' ? 1 : 0, +inp.value || 0);
          (f as unknown as Record<string, number>)[fl] = v;
          return;
        }
        if (fl === 'inSide' || fl === 'outSide') {
          (f as unknown as Record<string, Side>)[fl] = ((+inp.value || 0) & 3) as Side;
          return;
        }
        (f as unknown as Record<string, string>)[fl] = inp.value;
      });
  }
  for (const b of qsa<HTMLButtonElement>(p, '[data-del]'))
    b.onclick = () =>
      commit(() => {
        const id = store.save.facs[+b.dataset.del!]!.id;
        store.save.facs.splice(+b.dataset.del!, 1);
        // その設備を置いてある盤面も片づける
        for (const a of store.save.areas) {
          const gone = a.nodes.filter((n) => n.fac === id).map((n) => n.uid);
          a.nodes = a.nodes.filter((n) => n.fac !== id);
          a.belts = a.belts.filter((x) => !gone.includes(x.from) && !gone.includes(x.to));
        }
        const gone = store.board.nodes.filter((n) => n.fac === id).map((n) => n.uid);
        store.board.nodes = store.board.nodes.filter((n) => n.fac !== id);
        store.board.belts = store.board.belts.filter((x) => !gone.includes(x.from) && !gone.includes(x.to));
      });
  p.querySelector<HTMLButtonElement>('#addFac')!.onclick = () =>
    commit(() =>
      store.save.facs.push({
        id: 'fac' + Date.now().toString(36).slice(-4),
        name: '新しい設備',
        kind: 'process',
        w: 2,
        h: 2,
        power: 20,
        gen: 0,
      }),
    );
}

/* ── レシピ ───────────────────────────────────── */

function paintRecs(
  p: HTMLElement,
  store: Store,
  ui: DataUi,
  commit: (fn: () => void) => void,
  repaint: () => void,
): void {
  const ds = store.ds;
  const rq = ui.qRec.trim();
  const shown = store.save.recs
    .map((r, k) => ({ r, k }))
    .filter(
      (o) =>
        !rq ||
        o.r.name.includes(rq) ||
        o.r.out.some((x) => ds.itemName(x.item).includes(rq)) ||
        o.r.in.some((x) => ds.itemName(x.item).includes(rq)) ||
        (ds.fac(o.r.fac)?.name ?? '').includes(rq),
    );

  p.innerHTML = `<div class="prow">
      <div style="flex:1;min-width:190px"><label class="fl" for="qRec">品目名・設備名で絞り込む</label>
        <input type="text" id="qRec" value="${esc(rq)}" placeholder="例：バッテリー / 包装機"></div>
      <div style="width:150px"><label class="fl">&nbsp;</label><button class="hbtn" id="addRec" style="width:100%">＋ レシピを追加</button></div>
    </div>
    <div style="font-family:var(--mono);font-size:11px;color:var(--faint);margin-bottom:9px">${shown.length} / ${store.save.recs.length} 件</div>
    <div id="recList"></div>`;

  const qr = p.querySelector<HTMLInputElement>('#qRec')!;
  qr.oninput = () => {
    ui.qRec = qr.value;
    repaint();
    const again = p.querySelector<HTMLInputElement>('#qRec');
    if (again) {
      again.focus();
      again.setSelectionRange(again.value.length, again.value.length);
    }
  };

  const list = p.querySelector<HTMLElement>('#recList')!;
  for (const { r, k } of shown) {
    const card = h(`<div style="border:1px solid var(--line);border-radius:4px;padding:11px 13px;margin-bottom:10px">
      <div style="display:flex;gap:9px;align-items:flex-end;flex-wrap:wrap">
        <div style="flex:1;min-width:170px"><label class="fl">レシピ名</label><input type="text" value="${esc(r.name)}" data-f="name"></div>
        <div style="width:118px"><label class="fl">確度</label><select data-f="conf">
          <option value="ok" ${r.conf === 'ok' ? 'selected' : ''}>確認済</option>
          <option value="part" ${r.conf === 'part' ? 'selected' : ''}>一部確認</option>
          <option value="guess" ${(r.conf ?? 'guess') === 'guess' ? 'selected' : ''}>推定</option></select></div>
        <div style="width:180px"><label class="fl">設備</label><select data-f="fac">${[...ds.facs.values()]
          .filter((f) => !f.field && f.kind !== 'power')
          .map((f) => `<option value="${esc(f.id)}" ${r.fac === f.id ? 'selected' : ''}>${esc(f.name)}</option>`)
          .join('')}</select></div>
        <div style="width:112px"><label class="fl">1周期（秒）</label><input type="number" min="0.5" step="0.5" value="${r.sec}" data-f="sec"></div>
        <button class="x" data-del="1" title="削除">×</button>
      </div>
      <div style="display:flex;gap:20px;margin-top:11px;flex-wrap:wrap">
        <div style="flex:1;min-width:210px"><label class="fl">入力</label><div data-io="in"></div>
          <button class="hbtn" data-add="in" style="padding:4px 9px;font-size:11.5px">＋ 入力</button></div>
        <div style="flex:1;min-width:210px"><label class="fl">出力（1行目が主産物）</label><div data-io="out"></div>
          <button class="hbtn" data-add="out" style="padding:4px 9px;font-size:11.5px">＋ 出力</button></div>
      </div>
      <div style="margin-top:9px;display:flex;gap:10px;align-items:center;font-family:var(--mono);font-size:11px;color:var(--faint)">
        ${confBadge(r.conf)}
        <span>= ${r.sec > 0 ? (60 / r.sec).toFixed(1) : '0'} 周期/分</span>
        <span>${r.out.length ? '→ ' + r.out.map((o) => esc(ds.itemName(o.item)) + ' ' + fmt((o.qty * 60) / r.sec) + '個/分').join('・') : ''}</span>
      </div>
    </div>`);

    const drawIO = (side: 'in' | 'out'): void => {
      const wrap = card.querySelector<HTMLElement>(`[data-io="${side}"]`)!;
      wrap.innerHTML = '';
      r[side].forEach((x, j) => {
        const row = h(`<div class="io-row">
          <select>${itemOptions(ds, x.item)}</select>
          <input type="number" min="0" step="0.001" value="${x.qty}">
          <button class="x" title="削除">×</button></div>`);
        row.querySelector('select')!.onchange = (e) =>
          commit(() => (x.item = (e.target as HTMLSelectElement).value));
        row.querySelector('input')!.onchange = (e) =>
          commit(() => (x.qty = Math.max(0, +(e.target as HTMLInputElement).value || 0)));
        row.querySelector('button')!.onclick = () => commit(() => r[side].splice(j, 1));
        wrap.appendChild(row);
      });
      if (!r[side].length) wrap.appendChild(h('<div class="empty">なし</div>'));
    };
    drawIO('in');
    drawIO('out');

    for (const b of qsa<HTMLButtonElement>(card, '[data-add]'))
      b.onclick = () =>
        commit(() => r[b.dataset.add as 'in' | 'out'].push({ item: [...ds.items.keys()][0] ?? '', qty: 1 }));
    for (const inp of qsa<HTMLInputElement | HTMLSelectElement>(card, '[data-f]'))
      inp.onchange = () =>
        commit(() => {
          const f = inp.dataset.f!;
          if (f === 'sec') r.sec = Math.max(0.5, +inp.value || 1);
          else if (f === 'conf') r.conf = inp.value as 'ok' | 'part' | 'guess';
          else if (f === 'fac') {
            r.fac = inp.value;
            // 設備が変わったら、その設備で作れなくなった配置のレシピを外す
            for (const a of store.save.areas) for (const n of a.nodes) if (n.rec === r.id && n.fac !== r.fac) n.rec = null;
            for (const n of store.board.nodes) if (n.rec === r.id && n.fac !== r.fac) n.rec = null;
          } else r.name = inp.value;
        });
    card.querySelector<HTMLButtonElement>('[data-del]')!.onclick = () =>
      commit(() => {
        for (const a of store.save.areas) for (const n of a.nodes) if (n.rec === r.id) n.rec = null;
        for (const n of store.board.nodes) if (n.rec === r.id) n.rec = null;
        store.save.recs.splice(k, 1);
      });
    list.appendChild(card);
  }

  p.querySelector<HTMLButtonElement>('#addRec')!.onclick = () => {
    ui.qRec = '';
    commit(() =>
      store.save.recs.push({
        id: 'rec' + Date.now().toString(36).slice(-4),
        name: '新しいレシピ',
        conf: 'guess',
        fac: [...store.ds.facs.values()].find((f) => f.kind === 'process')?.id ?? '',
        sec: 4,
        in: [],
        out: [],
      }),
    );
  };
}

/* ── まとめて入力 ─────────────────────────────── */

function paintBulk(p: HTMLElement, store: Store, commit: (fn: () => void) => void, hooks: DataHooks): void {
  p.innerHTML = `<p class="note">1行に1レシピ。<b>設備名 秒数s: 材料*数 + 材料*数 -&gt; 産物*数</b> の形で書きます。
      行末に <b>#確</b>／<b>#一部</b>／<b>#推定</b> を付けると確度を指定できます（省略時は推定）。
      知らない品目名が出てきたら自動で品目を作ります。同じ設備で同じ産物のレシピがあれば上書きします。<br>
      例：<span class="kv">包装機 10s: 鉱物粉末*2 -&gt; 小容量谷地バッテリー*1 #確</span></p>
    <label class="fl" for="bulkText">レシピ（現在の内容を書き出してあります。編集して反映を押してください）</label>
    <textarea id="bulkText" rows="18" spellcheck="false"></textarea>
    <div style="display:flex;gap:8px;margin-top:11px;flex-wrap:wrap">
      <button class="hbtn primary" id="bulkApply">この内容を反映</button>
      <button class="hbtn" id="bulkReload">現在の内容を読み直す</button>
      <button class="hbtn" id="bulkCopy">クリップボードにコピー</button>
    </div>
    <div id="bulkLog" style="margin-top:13px"></div>`;

  const ta = p.querySelector<HTMLTextAreaElement>('#bulkText')!;
  ta.value = recipesToText(store.save);
  p.querySelector<HTMLButtonElement>('#bulkReload')!.onclick = () => {
    ta.value = recipesToText(store.save);
  };
  p.querySelector<HTMLButtonElement>('#bulkCopy')!.onclick = async () => {
    try {
      await navigator.clipboard.writeText(ta.value);
      hooks.flash('クリップボードにコピーしました。');
    } catch {
      ta.select();
    }
  };
  p.querySelector<HTMLButtonElement>('#bulkApply')!.onclick = () => {
    const out: { log: ReturnType<typeof parseRecipes> | null } = { log: null };
    commit(() => {
      out.log = parseRecipes(store.save, ta.value);
    });
    const l = out.log;
    const box = document.getElementById('bulkLog');
    if (box && l)
      box.innerHTML =
        `<div class="advice"><b>反映しました</b>：追加 ${l.added} 件／更新 ${l.updated} 件${
          l.newItems.length ? `／新しい品目 ${l.newItems.length} 件（${l.newItems.map(esc).join('、')}）` : ''
        }</div>` +
        (l.errors.length
          ? `<div class="advice warnc"><b>読めなかった行</b><br>${l.errors.map(esc).join('<br>')}</div>`
          : '');
  };
}

/* ── 網羅状況 ─────────────────────────────────── */

function paintCoverage(p: HTMLElement, store: Store, ui: DataUi, commit: (fn: () => void) => void): void {
  const cov = coverage(store.ds, store.area.field);
  const tot = store.save.items.length;
  const chip = (arr: Item[], label: string, color: string): string =>
    arr.length
      ? `<h4 class="sub">${label}（${arr.length}）</h4><div>${arr
          .map(
            (i) =>
              `<button class="chip" data-jump="${esc(i.id)}" style="border-color:${color};color:${color}">${esc(i.name)}</button>`,
          )
          .join('')}</div>`
      : '';

  p.innerHTML = `<div class="cards">
      <div class="card"><span class="cl">品目</span><span class="cv">${tot}<i>件</i></span></div>
      <div class="card"><span class="cl">作り方あり</span><span class="cv">${tot - cov.noRecipe.length}<i>/ ${tot}</i></span></div>
      <div class="card"><span class="cl">レシピ</span><span class="cv">${store.save.recs.length}<i>件</i></span></div>
      <div class="card"><span class="cl">確認済</span><span class="cv conf-ok">${cov.byConf.ok}<i>件</i></span></div>
      <div class="card hot"><span class="cl">一部確認</span><span class="cv conf-part">${cov.byConf.part}<i>件</i></span></div>
      <div class="card warnc"><span class="cl">推定のまま</span><span class="cv conf-guess">${cov.byConf.guess}<i>件</i></span></div>
    </div>
    <p class="note">品目名のボタンを押すと、その品目の作り方を作る画面へ移ります。
      <b>推定のままのレシピが残っている間は、逆算した台数も推定値です。</b>
      ゲーム内の製造プロセス画面を見て「まとめて入力」で一気に直すのが早道です。</p>
    ${chip(cov.noRecipe, '作り方が未登録の品目', 'var(--amber)')}
    ${chip(cov.deadEnd, '行き止まり（作れず、採取ゾーンにも無い）', 'var(--coral)')}
    ${chip(cov.unreachable, '材料が揃わず到達できない品目', 'var(--coral)')}
    ${chip(cov.unused, 'どのレシピでも使われない品目（最終製品ならOK）', 'var(--faint)')}`;

  for (const b of qsa<HTMLButtonElement>(p, '[data-jump]')) {
    b.onclick = () => {
      const id = b.dataset.jump!;
      if (!store.ds.producedBy(id).length) {
        commit(() =>
          store.save.recs.push({
            id: 'rec' + Date.now().toString(36).slice(-4),
            name: store.ds.itemName(id) + ' の作り方',
            conf: 'guess',
            fac: [...store.ds.facs.values()].find((f) => f.kind === 'process')?.id ?? '',
            sec: 6,
            in: [],
            out: [{ item: id, qty: 1 }],
          }),
        );
      }
      ui.tab = 'recs';
      ui.qRec = store.ds.itemName(id);
      syncTabButtons(ui);
      paintData(p, store, ui, { refresh: () => void 0, flash: () => void 0 });
    };
  }
  void itemChip;
}

/** タブの見た目を状態に合わせる */
export function syncTabButtons(ui: DataUi): void {
  for (const b of qsa<HTMLButtonElement>(document, '#dTabs button'))
    b.setAttribute('aria-pressed', String(b.dataset.tab === ui.tab));
}

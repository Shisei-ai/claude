/**
 * 採取ゾーン（フィールド）の登録。
 *
 * 採鉱機やポンプは工業エリアの盤面ではなくフィールドの採取スポットに置く設備なので、
 * ここに「台数と1台あたりの産出量」で登録する。産出は地域共通の倉庫に入る。
 */

import { REGION_PRESETS, fmt } from '../../domain/constants';
import type { Region } from '../../domain/types';
import type { Store } from '../../store/state';
import { esc, itemChip, itemOptions, qsa } from '../dom';

export function paintField(box: HTMLElement, store: Store, refresh: () => void): void {
  const { ds, res } = store;
  const area = store.area;
  const F = area.field;
  const fieldFacs = [...ds.facs.values()].filter((f) => f.field);
  const region = store.region as Region;

  const rows = F.map((r, k) => {
    const total = (r.count || 0) * (+r.rate || 0);
    return `<tr>
      <td><select data-k="${k}" data-f="fac">${fieldFacs
        .map((f) => `<option value="${esc(f.id)}" ${r.fac === f.id ? 'selected' : ''}>${esc(f.name)}</option>`)
        .join('')}</select></td>
      <td><select data-k="${k}" data-f="item">${itemOptions(ds, r.item, '— 未設定 —')}</select></td>
      <td><input type="number" min="0" step="1" value="${r.count || 0}" data-k="${k}" data-f="count" style="width:76px"></td>
      <td><input type="number" min="0" step="0.5" value="${+r.rate || 0}" data-k="${k}" data-f="rate" style="width:86px"></td>
      <td class="n" style="color:var(--mint)">${fmt(total)}</td>
      <td><button class="x" data-del="${k}" title="この行を削除">×</button></td></tr>`;
  }).join('');

  const core = Object.values(res.core);
  box.innerHTML = `
    <div class="advice"><b>${esc(region)} ／ ${esc(area.name)}</b> の採取ゾーンです。
      採取スポットはマップごとにあるので、この登録は<b>エリア単位</b>。
      産出はすべて<b>地域で共通の倉庫</b>に入り、同じ地域のどのエリアからでも引き出せます。</div>
    <p class="note"><b>採鉱機やポンプは工業エリアではなく、フィールドの採取スポットに置く設備です。</b>
      産出は倉庫（協約核心）へ自動で転送され、工業エリアからは<b>倉庫搬出口</b>で引き出して使います。
      1台あたりの産出量は地域建設レベル（鉱物純度）で変わるので、ゲーム内の実測値を入れてください。</p>
    <table class="ed">
      <thead><tr><th style="width:24%">採取設備</th><th style="width:26%">品目</th><th>台数</th><th>1台あたり/分</th><th class="n">合計/分</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="empty">まだ登録がありません</td></tr>'}</tbody>
    </table>
    <div style="display:flex;gap:8px;margin-top:11px;flex-wrap:wrap">
      <button class="hbtn" id="addField">＋ 採取設備を追加</button>
      <button class="hbtn" id="preset">${esc(region)}の上限をこのエリアに読み込む</button>
    </div>
    <p class="note" style="margin-top:11px">プリセットは地域全体で取り出せる量の目安です（武陵 Ver1.4 時点で
      源石鉱物540／青鉄鉱物120／赤銅鉱物420／不活性ガス460／息壌ガス100 個/分）。
      実際は地域建設レベルや解放状況で変わるので、読み込んだあと自分の値に直してください。</p>
    <h4 class="sub">${esc(region)}の倉庫（地域共通）</h4>
    ${
      core.length
        ? `<table class="ed">
            <thead><tr><th>品目</th><th class="n">採取（地域計）</th><th class="n">他エリアから</th><th class="n">このエリアの搬入</th><th class="n">引き出し</th><th class="n">収支</th></tr></thead>
            <tbody>${core
              .map(
                (c) => `<tr><td>${itemChip(ds, c.id)}</td>
              <td class="n">${fmt((c.field || 0) - (c.other || 0))}</td>
              <td class="n">${c.other > 0.01 ? fmt(c.other) : '—'}</td>
              <td class="n">${fmt(c.ship || 0)}</td>
              <td class="n">${fmt(c.draw || 0)}</td>
              <td class="n" style="color:${(c.net || 0) < -0.01 ? 'var(--coral)' : 'var(--mint)'}">${
                (c.net || 0) > 0 ? '+' : ''
              }${fmt(c.net || 0)}</td></tr>`,
              )
              .join('')}</tbody></table>
          <p class="note" style="margin-top:9px">「他エリアから」は、同じ地域の別エリアで最後に計算したときの純増を持ち込んだ量です。
            別エリアを開いて計算し直すと更新されます。</p>`
        : '<div class="empty">登録すると倉庫の収支が出ます。</div>'
    }`;

  for (const el of qsa<HTMLInputElement | HTMLSelectElement>(box, '[data-f]')) {
    el.onchange = () => {
      const k = +el.dataset.k!;
      const f = el.dataset.f!;
      store.edit(() => {
        const row = F[k]!;
        if (f === 'count' || f === 'rate') (row as unknown as Record<string, number>)[f] = Math.max(0, +el.value || 0);
        else (row as unknown as Record<string, string>)[f] = el.value;
        if (f === 'fac') {
          // 設備を変えたら、その設備で採れない品目は選び直す
          const nf = ds.fac(row.fac);
          if (nf?.takes?.length && !nf.takes.includes(row.item)) row.item = nf.takes[0]!;
        }
      });
      paintField(box, store, refresh);
      refresh();
    };
  }
  for (const b of qsa<HTMLButtonElement>(box, '[data-del]')) {
    b.onclick = () => {
      store.edit(() => F.splice(+b.dataset.del!, 1));
      paintField(box, store, refresh);
      refresh();
    };
  }
  box.querySelector<HTMLButtonElement>('#addField')!.onclick = () => {
    const f = fieldFacs[0];
    store.edit(() => F.push({ fac: f?.id ?? '', item: f?.takes?.[0] ?? '', count: 1, rate: 15 }));
    paintField(box, store, refresh);
    refresh();
  };
  box.querySelector<HTMLButtonElement>('#preset')!.onclick = () => {
    const rows2 = REGION_PRESETS[region];
    if (!rows2) return;
    store.edit(() => {
      area.field = rows2.map((x) => ({ ...x }));
    });
    paintField(box, store, refresh);
    refresh();
  };
}

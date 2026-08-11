/**
 * 保存 / 読込。
 * 設計図（品目・設備・レシピ・配置）はすべて1つの JSON に入る。
 */

import type { Store } from '../../store/state';

export interface IoHooks {
  flash(msg: string): void;
  close(): void;
  refresh(): void;
  fitView(): void;
}

export function bindIoModal(box: HTMLElement, store: Store, hooks: IoHooks): void {
  const text = box.querySelector<HTMLTextAreaElement>('#ioText')!;
  const file = box.querySelector<HTMLInputElement>('#ioUp')!;

  box.querySelector<HTMLButtonElement>('#ioDown')!.onclick = () => {
    const a = document.createElement('a');
    const blob = new Blob([store.toJSON()], { type: 'application/json' });
    a.href = URL.createObjectURL(blob);
    a.download = (store.save.meta.name || 'aic-plan').replace(/[\\/:*?"<>|]/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    hooks.flash('JSONファイルに書き出しました。');
  };

  box.querySelector<HTMLButtonElement>('#ioUpBtn')!.onclick = () => file.click();
  file.onchange = () => {
    const f = file.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        apply(String(rd.result));
      } catch (err) {
        alert('読み込めませんでした：' + (err as Error).message);
      }
    };
    rd.readAsText(f);
    file.value = '';
  };

  box.querySelector<HTMLButtonElement>('#ioCopy')!.onclick = async () => {
    try {
      await navigator.clipboard.writeText(store.toJSON());
      hooks.flash('JSONをクリップボードにコピーしました。');
      hooks.close();
    } catch {
      text.value = store.toJSON();
      text.select();
    }
  };

  box.querySelector<HTMLButtonElement>('#ioPaste')!.onclick = () => {
    try {
      apply(text.value);
    } catch (err) {
      alert('読み込めませんでした：' + (err as Error).message);
    }
  };

  box.querySelector<HTMLButtonElement>('#ioReset')!.onclick = () => {
    if (!confirm('配置と数値をすべて初期状態に戻します。よろしいですか？（この操作は取り消せます）')) return;
    store.reset();
    hooks.close();
    hooks.refresh();
    hooks.fitView();
    hooks.flash('初期状態に戻しました。取り消しは Ctrl+Z。');
  };

  function apply(json: string): void {
    const r = store.fromJSON(json);
    hooks.close();
    hooks.refresh();
    hooks.fitView();
    hooks.flash(
      r.repaired
        ? `読み込みました。古い形式のライン ${r.repaired} 本を引き直しました${r.lost ? `（${r.lost}本は復元できず）` : ''}。`
        : '読み込みました。',
    );
  }
}

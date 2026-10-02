import { defineConfig, type Plugin } from 'vite';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * public/assets 配下に実在するファイルの一覧を `virtual:asset-list` として公開する。
 * 画像・BGMは段階的に追加されるため、未配置のファイルを毎回読みに行って
 * 404 やデコードエラーを出さないよう、存在するものだけを読み込むのに使う。
 */
function assetListPlugin(): Plugin {
  const id = 'virtual:asset-list';
  const resolved = '\0' + id;
  const publicDir = join(root, 'public');
  const list = (): string[] => {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else out.push(relative(publicDir, p).split(sep).join('/'));
      }
    };
    try { walk(join(publicDir, 'assets')); } catch { /* assets が無ければ空 */ }
    return out;
  };
  return {
    name: 'asset-list',
    resolveId(source) {
      return source === id ? resolved : undefined;
    },
    load(loadId) {
      return loadId === resolved ? `export default ${JSON.stringify(list())};` : undefined;
    },
    // 開発中にファイルを追加・削除したら一覧を作り直してページを再読み込み
    configureServer(server) {
      const refresh = (file: string) => {
        if (!file.startsWith(join(publicDir, 'assets'))) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
    },
  };
}

/**
 * src 配下で使われている文字 (日本語を含む全文字) を `virtual:used-glyphs` として公開する。
 * 和文フォントは文字範囲ごとに分割配信されるが、Phaser はキャンバスに文字を描くため、
 * 未読み込みの字形は代替フォントで描かれたまま戻らない。起動時にこの文字列で
 * document.fonts.load を呼び、ゲームで使う字形のファイルを先に読み込む。
 */
function usedGlyphsPlugin(): Plugin {
  const id = 'virtual:used-glyphs';
  const resolved = '\0' + id;
  const collect = (): string => {
    const set = new Set<string>();
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.ts$/.test(name)) for (const ch of readFileSync(p, 'utf8')) set.add(ch);
      }
    };
    walk(join(root, 'src'));
    // 数字・英字は動的な値 (HP・ゴールドなど) にも使うので全て含める
    for (let c = 0x20; c < 0x7f; c++) set.add(String.fromCharCode(c));
    return [...set].filter((ch) => ch.trim() !== '').sort().join('');
  };
  return {
    name: 'used-glyphs',
    resolveId(source) { return source === id ? resolved : undefined; },
    load(loadId) { return loadId === resolved ? `export default ${JSON.stringify(collect())};` : undefined; },
  };
}

export default defineConfig({
  base: './',
  plugins: [assetListPlugin(), usedGlyphsPlugin()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
});

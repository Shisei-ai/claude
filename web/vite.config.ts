import { defineConfig, type Plugin } from 'vite';
import { readdirSync, statSync } from 'node:fs';
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

export default defineConfig({
  base: './',
  plugins: [assetListPlugin()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
});

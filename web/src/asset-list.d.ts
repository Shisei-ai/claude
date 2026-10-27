// vite.config.ts の assetListPlugin が生成する、public/assets に実在するファイルの一覧
declare module 'virtual:asset-list' {
  const files: string[];
  export default files;
}

// vite.config.ts の usedGlyphsPlugin が生成する、src で使われている全文字
declare module 'virtual:used-glyphs' {
  const glyphs: string;
  export default glyphs;
}

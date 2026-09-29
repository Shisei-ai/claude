// vite.config.ts の assetListPlugin が生成する、public/assets に実在するファイルの一覧
declare module 'virtual:asset-list' {
  const files: string[];
  export default files;
}

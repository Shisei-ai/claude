// =============================================================
//  決まった場面の台詞（英霊ごと）の索引
//  SAY_SV[英霊ID] = [ 25個の台詞 ]（並び順は下の SAY_KEYS と同じ）
//  中身は data_say_1.js 〜 data_say_4.js。
//  ここに台詞がない英霊（言葉を話さないバーサーカー）は、data_voices.js の共通の言い回しを使います。
// =============================================================
const SAY_KEYS = ['askWish', 'agree', 'warnShadow', 'traceFail', 'thanksMana', 'soloRequest', 'soloBack', 'soloHurt', 'obey', 'reckless',
  'protect', 'beautiful', 'firstContract', 'goodAnswer', 'again', 'askResolve', 'promise', 'wishShare', 'withYou', 'notYet',
  'stayBack', 'orders', 'grailEvil', 'protect2', 'dreamSeen'];
const SAY_SV = {};

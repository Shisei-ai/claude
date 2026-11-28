#!/usr/bin/env python3
"""性別表現の自動点検。 使い方: python3 tools/gendercheck.py

性別で言い方を変える関数の、男性用・女性用の文を取り出して、
反対の性別らしい言葉が紛れていないかを探す。
  gw(男性, 女性, 指定なし)   … 主人公の性別
  fg(男性, 女性) / frTalk(…)  … 幼馴染の性別
  rg(人物, 男性, 女性)        … 敵マスターの性別
  mkR / 雫（女性）の台詞に、男性の一人称がないか
見つかったものは「要確認」として一覧にする（文脈によっては正しいこともある）。
"""
import re, pathlib, sys
SRC = pathlib.Path(__file__).resolve().parent.parent / 'src'

def read_str(s, i):
    """s[i] から始まる JS の文字列リテラルを読み、(中身, 終わりの位置) を返す"""
    q = s[i]; j = i + 1; out = []; depth = 0
    while j < len(s):
        c = s[j]
        if c == '\\': out.append(s[j:j+2]); j += 2; continue
        if q == '`' and s.startswith('${', j): depth += 1; out.append('${'); j += 2; continue
        if q == '`' and depth and c == '}': depth -= 1; out.append('}'); j += 1; continue
        if c == q and not depth: return ''.join(out), j + 1
        out.append(c); j += 1
    return ''.join(out), j

def args(s, i, n):
    """s[i] は '(' の直後。文字列の引数を n 個まで読む（文字列でない引数は None）"""
    res = []; j = i
    while len(res) < n and j < len(s):
        while j < len(s) and s[j] in ' \n\t': j += 1
        if j < len(s) and s[j] in '\'"`':
            t, j = read_str(s, j); res.append(t)
        else:
            k = j; depth = 0
            while k < len(s) and not (depth == 0 and s[k] in ',)'):
                if s[k] in '([{': depth += 1
                if s[k] in ')]}': depth -= 1
                k += 1
            res.append(None); j = k
        while j < len(s) and s[j] in ' \n\t': j += 1
        if j < len(s) and s[j] == ',': j += 1
        else: break
    return res

MALE = ['俺', '僕', 'だぜ', 'じゃねえ', '息子', '彼氏', '紋付袴の' , '兄ちゃん', 'おじちゃん', 'おじいちゃん', '青年', '少年', '男の子']
FEMALE = ['あたし', 'わよ', 'かしら', '彼女', '娘さん', '白無垢の', 'ドレス', '姉ちゃん', 'おばちゃん', 'おばあちゃん', '少女', '女の子']
# 誰の性別か、によって見る言葉を変える（相手の家族の呼び名などは、本人の性別と関係ないので除く）
def bad_words(text, words):
    t = re.sub(r'\$\{[^}]*\}', '', text)
    return [w for w in words if w in t]

problems = []
for p in sorted(SRC.glob('*.js')):
    s = p.read_text(encoding='utf-8')
    for name, idx_m, idx_f, n in [('gw', 0, 1, 3), ('fg', 0, 1, 2), ('frTalk', 0, 1, 2), ('rg', 1, 2, 3)]:
        for m in re.finditer(r'(?<![A-Za-z_.])' + name + r'\(', s):
            a = args(s, m.end(), n)
            if len(a) <= max(idx_m, idx_f): continue
            mt, ft = a[idx_m], a[idx_f]
            line = s.count('\n', 0, m.start()) + 1
            if mt is not None:
                for w in bad_words(mt, FEMALE): problems.append((p.name, line, name, '男性用の文に「%s」' % w, mt[:70]))
            if ft is not None:
                for w in bad_words(ft, MALE): problems.append((p.name, line, name, '女性用の文に「%s」' % w, ft[:70]))
    # 雫（女性）の台詞に、男性の一人称
    for m in re.finditer(r'\$\{s\}[^`]{0,12}「([^」]*)」', s):
        q = m.group(1)
        for w in ['俺', '僕', 'だぜ']:
            if w in q: problems.append((p.name, s.count('\n', 0, m.start()) + 1, '雫', '雫の台詞に「%s」' % w, q[:70]))

# 敵マスター（性別が毎回変わる）の来歴の台詞に、性別の決まった一人称が、rg を通さずに書かれていないか
rv = (SRC / 'data_rivals.js').read_text(encoding='utf-8')
for m in re.finditer(r"(quote|lose|glimpse): (?:\(\) =>|r =>) `?'?([^\n]*)", rv):
    body = m.group(2)
    t = re.sub(r'rg\([^)]*\)', '', body)
    for w in ['俺', '僕', 'あたし', 'わよ', 'かしら']:
        if w in t: problems.append(('data_rivals.js', rv.count('\n', 0, m.start()) + 1, '来歴', '性別が変わる敵マスターの台詞に「%s」' % w, body[:70]))

for f, l, k, why, t in problems: print(f'{f}:{l}\t[{k}] {why}\t{t}')
print(f'要確認 {len(problems)} 件', file=sys.stderr)

# 使い方: python3 cls_insert.py mod1 mod2 ...   （各モジュールの L = {英霊ID: [51の文]} を、51か所の地図に挿入する）
import re, sys, importlib
sys.path.insert(0, '/tmp/claude-0/-home-user-claude/9a494e3c-615b-598e-b63e-ffabfb99d4fa/scratchpad')
L = {}
for m in sys.argv[1:]: L.update(importlib.import_module(m).L)
for k, v in L.items(): assert len(v) == 51, (k, len(v))
SRC = '/home/user/claude/grail-war/src/'
files = ['data_bond_events.js', 'data_epilogue.js', 'data_family.js', 'data_epilogue2.js']
esc = lambda t: t.replace('\\', '\\\\').replace("'", "\\'")
PAT = r" ob: '(?:[^'\\]|\\.)*',(?=(?: [a-z_]+: '(?:[^'\\]|\\.)*',)* mash: ')"
cnt = sum(len(re.findall(PAT, open(SRC + f).read())) for f in files); assert cnt == 51, cnt   # 書き込む前に、51か所が揃っているか確かめる
k = 0
for f in files:
    s = open(SRC + f).read()
    def rep(m):
        global k
        add = ''.join(f" {sid}: '{esc(v[k])}'," for sid, v in L.items() if v[k] and f" {sid}: '" not in m.group(0))
        k += 1
        return m.group(0) + add
    s = re.sub(r" ob: '(?:[^'\\]|\\.)*',(?=(?: [a-z_]+: '(?:[^'\\]|\\.)*',)* mash: ')", rep, s)
    open(SRC + f, 'w').write(s)
assert k == 51, k
print('sites', k, 'servants', len(L))

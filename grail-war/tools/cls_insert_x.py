# 追加の17か所（sq({ meltryllis_c: で始まる、書き分け済みの決まった台詞）に、英霊ごとの台詞を挿入
import re, sys, importlib
sys.path.insert(0, '/tmp/claude-0/-home-user-claude/9a494e3c-615b-598e-b63e-ffabfb99d4fa/scratchpad')
X = {}
for m in sys.argv[1:]: X.update(importlib.import_module(m).X)
SRC = '/home/user/claude/grail-war/src/'
esc = lambda t: t.replace('\\', '\\\\').replace("'", "\\'")
cnt = sum(open(SRC + f).read().count("sq({ meltryllis_c: '") for f in ['data_bond_events.js', 'data_epilogue2.js'])
assert cnt == 17, cnt
k = 0
for f in ['data_bond_events.js', 'data_epilogue2.js']:
    s = open(SRC + f).read()
    def rep(m):
        global k
        add = ''.join(f"{sid}: '{esc(v[k])}', " for sid, v in X.items() if v[k])
        k += 1
        return 'sq({ ' + add + "meltryllis_c: '"
    s = re.sub(r"sq\(\{ meltryllis_c: '", rep, s)
    open(SRC + f, 'w').write(s)
print('sites', k, 'servants', len(X))

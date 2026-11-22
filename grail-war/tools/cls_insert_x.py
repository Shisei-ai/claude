# 追加の17か所（書き分け済みの決まった台詞。ob より前に meltryllis_c が来る sq の地図）に、英霊ごとの台詞を挿入
import re, sys, importlib
sys.path.insert(0, '/tmp/claude-0/-home-user-claude/9a494e3c-615b-598e-b63e-ffabfb99d4fa/scratchpad')
X = {}
for m in sys.argv[1:]: X.update(importlib.import_module(m).X)
for k, v in X.items(): assert len(v) == 17, (k, len(v))
SRC = '/home/user/claude/grail-war/src/'
esc = lambda t: t.replace('\\', '\\\\').replace("'", "\\'")
PAT = re.compile(r"sq\(\{ ((?:[a-z_]+: '(?:[^'\\]|\\.)*', )*?)meltryllis_c: '")
def sites(s): return [m for m in PAT.finditer(s) if "ob: '" not in m.group(1)]
files = ['data_bond_events.js', 'data_epilogue2.js']
cnt = sum(len(sites(open(SRC + f).read())) for f in files); assert cnt == 17, cnt
k = 0
for f in files:
    s = open(SRC + f).read(); out = []; pos = 0
    for m in sites(s):
        add = ''.join(f"{sid}: '{esc(v[k])}', " for sid, v in X.items() if v[k] and f"{sid}: '" not in m.group(1))
        out.append(s[pos:m.start()]); out.append('sq({ ' + add + m.group(1) + "meltryllis_c: '"); pos = m.end(); k += 1
    out.append(s[pos:]); open(SRC + f, 'w').write(''.join(out))
print('sites', k, 'servants', len(X))

"""Fonts whose licences forbid public repositories and public servers (Timeless,
for one) must never reach this public repo or docs/. They live in private/fonts/
(git-ignored) and are embedded only in site/ (git-ignored). Run before pushing.

    python3 tests/licence_check.py

Checks: private/ and site/ are ignored by git; no font file is tracked; no tracked
file – docs/ included – holds the embedded-fonts block or any stretch of a private
font's data (as bytes or base64).
"""
import base64, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
results = []
def check(name, ok, detail=''):
    results.append(ok); print(('PASS ' if ok else 'FAIL ') + name + (f' – {detail}' if detail else ''))

git = lambda *a: subprocess.run(['git', '-C', ROOT, *a], capture_output=True, text=True).stdout
check('private/ and site/ are ignored by git', all(git('check-ignore', '-q', p) == '' and subprocess.run(['git', '-C', ROOT, 'check-ignore', '-q', p]).returncode == 0 for p in ['private/fonts/x.otf', 'site/tempo/index.html']))
tracked = [f for f in git('ls-files').splitlines() if f]
fonts = [f for f in tracked if f.lower().endswith(('.otf', '.ttf', '.woff', '.woff2'))]
check('No font files are tracked', not fonts, ', '.join(fonts[:5]))
tag = b'<script id="tempo-builtin-fonts" type="application/json">{'
withtag = [f for f in tracked if os.path.isfile(os.path.join(ROOT, f)) and tag in open(os.path.join(ROOT, f), 'rb').read()]
check('No tracked file carries embedded fonts', not withtag, ', '.join(withtag[:5]))
# stretches of each private font, as bytes and as base64, searched for in every tracked file
priv = os.path.join(ROOT, 'private/fonts')
probes = []
if os.path.isdir(priv):
    for name in sorted(os.listdir(priv)):
        p = os.path.join(priv, name)
        if not os.path.isfile(p) or not name.lower().endswith(('.otf', '.ttf', '.woff', '.woff2')): continue
        data = open(p, 'rb').read()
        b64 = base64.b64encode(data)
        for at in (len(data) // 3, len(data) // 2, 2 * len(data) // 3):
            probes.append((name, data[at:at + 48]))
        for at in (len(b64) // 3, len(b64) // 2):
            at -= at % 4; probes.append((name, b64[at:at + 64]))
hits = []
for f in tracked:
    p = os.path.join(ROOT, f)
    if not os.path.isfile(p): continue
    blob = open(p, 'rb').read()
    for name, pr in probes:
        if pr in blob: hits.append(f'{f} ({name})'); break
check(f'No tracked file holds data from a private font ({len(probes)} probes)' if probes else 'No private fonts here to probe for (nothing to leak)', not hits, ', '.join(hits[:5]))
print(f'\n{sum(results)} of {len(results)} checks pass.')
sys.exit(0 if all(results) else 1)

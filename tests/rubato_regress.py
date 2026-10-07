"""Rubato 1.0 against Rubato 0.9: with only 0.9's settings, 1.0 must draw exactly
what 0.9 drew – every preview frame, the SVG export and the PNG export.

    python3 tests/rubato_regress.py            # every look
    python3 tests/rubato_regress.py snappy     # some looks

0.9 is the archived build at docs/rubato/0.9/ (archive/rubato-0.9.html), which
the parity tests proved identical to v0.8.1. Same requirements as parity.py.
A control case (kerning, which 0.9 doesn't know) must come out different, to
show the comparison can tell.
"""
import hashlib, os, sys
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start, ROOT
from parity import POP, LORA, OPENTYPE, SEED

IMG = os.path.join(ROOT, 'tests/out/regress-image.png')
P, L = POP, [LORA]
CASES = {
    'default': ({}, P),
    'fluid-big': ({'mode': 'fluid', 'fY': 20, 'fX': 10, 'fRot': 12, 'fScale': 20, 'fStretch': 30, 'fStagger': 1.3, 'fSharp': .4, 'anchor': 'baseline', 'order': 'centre'}, P),
    'snappy': ({'mode': 'snappy', 'sSteps': 6, 'sRest': False, 'sY': 20, 'sX': 8, 'sRot': 15, 'sScale': 12, 'sStretch': 40, 'sUnison': .3, 'sOver': 2, 'order': 'random', 'seed': 77}, P),
    'transit': ({'mode': 'transit', 'tDir': 'left', 'tDist': 140, 'tIn': .25, 'tHold': .35, 'tOut': .2, 'tStagger': .6, 'tExit': 'reverse', 'tMask': 'glyph', 'tFade': True, 'tRot': 20, 'tScale': 40, 'tAxis': 'vertical', 'tEase': 'back'}, P),
    'alts-cycle': ({'mode': 'none', 'vMode': 'alts', 'vPattern': 'cycle', 'vSteps': 8, 'vStyle': 'stretch', 'texts': ['Lazaar aaaa']}, P),
    'weights-rand': ({'mode': 'fluid', 'vMode': 'both', 'vPattern': 'random', 'vSteps': 10, 'vChance': .7, 'vStyle': 'flip', 'vRest': True, 'seed': 5}, P),
    'seq-roll': ({'seq': True, 'texts': ['Lazaar', 'Type in motion', 'Rubato'], 'qStyle': 'roll', 'qDir': 'down', 'qStagger': .4, 'mode': 'fluid'}, P),
    'seq-stretch': ({'seq': True, 'texts': ['One', 'Two words'], 'qStyle': 'stretch', 'qEase': 'elastic', 'qClear': False}, P),
    'seq-glide': ({'seq': True, 'texts': ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'], 'qStyle': 'glide', 'qStack': 3, 'qTrail': .6, 'align': 'right'}, P),
    'repeat': ({'rOn': True, 'rRows': 5, 'rScroll': -1, 'rMarq': 2, 'rAlt': True, 'rDelay': .1, 'stretch': True, 'mode': 'snappy'}, P),
    'fit-lines': ({'texts': ['Big\nand small\nlines'], 'fit': 'lines', 'tracking': 40, 'leading': 1.3, 'align': 'left', 'valign': 'top'}, P),
    'manual-stretch': ({'fit': 'manual', 'size': 40, 'stretch': True, 'style': 'outline', 'stroke': 30, 'transparent': True, 'aspect': '16:9'}, P),
    'axis': ({'axOn': True, 'axTag': 'wght', 'axFrom': .1, 'axTo': .9, 'axCycles': 2, 'axStagger': .7, 'axFeel': 'snappy', 'mode': 'fluid', 'texts': ['Variable']}, L),
    'image-inside': ({'iPlace': 'inside', 'iBlend': 'multiply', 'iScale': 1.4, 'iOpacity': .8, 'iSway': 10, 'iRise': 8, 'mode': 'fluid'}, P),
}
CONTROL = ({'blocks': [{'text': '', 'font': '', 'size': 1, 'dest': 'auto', 'kern': {'La': -120}}]}, P)
PHASES = [0, .13, .37, .5, .71, .93]

def make_image():
    os.makedirs(os.path.dirname(IMG), exist_ok=True)
    try:
        from PIL import Image, ImageDraw
        im = Image.new('RGB', (400, 300)); d = ImageDraw.Draw(im)
        for i in range(0, 400, 20): d.rectangle([i, 0, i + 10, 300], fill=(255, 80, 40))
        d.ellipse([100, 50, 300, 250], fill=(40, 90, 255)); im.save(IMG)
    except ImportError:
        import base64  # a 2×2 PNG if Pillow isn't installed
        open(IMG, 'wb').write(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DwnwEIGP4zMDAwAAA2ZgL+e9WvlwAAAABJRU5ErkJggg=='))

def run(p, base, path, st, fonts, ot, img):
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1440, 'height': 1600}, accept_downloads=True); ctx.add_init_script(SEED)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/opentype.min.js', lambda r: r.fulfill(body=ot, content_type='application/javascript'))
    for u in ['https://fonts.googleapis.com/**', 'https://use.typekit.net/**']:
        pg.route(u, lambda r: r.abort())
    pg.goto(base + path)
    pg.evaluate("s=>{localStorage.clear();indexedDB.deleteDatabase('rubato');localStorage.setItem('rubato:settings',JSON.stringify(s));localStorage.setItem('rubato:collapsed','{}')}", dict(st, seed=st.get('seed', 1)))
    pg.goto(base + path); pg.wait_for_timeout(400)
    pg.set_input_files('#fontfile', fonts); pg.wait_for_timeout(900)
    if img: pg.set_input_files('#imgfile', IMG); pg.wait_for_timeout(500)
    pg.click('#play'); out = {}
    scrub = "v=>{const s=document.querySelector('#scrub');s.value=Math.round(v*1000);s.dispatchEvent(new Event('input'))}"
    for ph in PHASES:
        pg.evaluate(scrub, ph); pg.wait_for_timeout(120)
        out[f'frame {ph}'] = hashlib.sha1(pg.evaluate("document.querySelector('#cv').toDataURL()").encode()).hexdigest()
    pg.evaluate(scrub, .37)
    for name in ('SVG frame', 'PNG frame'):
        with pg.expect_download() as dl: pg.get_by_role('button', name=name, exact=True).click()
        out[name] = hashlib.sha1(open(dl.value.path(), 'rb').read()).hexdigest()
    b.close(); return out, errs

def main():
    want = sys.argv[1:] or list(CASES)
    ot = open(OPENTYPE).read(); make_image(); bad = 0
    with sync_playwright() as p:
        base = start()
        for name in want:
            st, fonts = CASES[name]; img = name.startswith('image')
            a, ea = run(p, base, 'docs/rubato/0.9/', st, fonts, ot, img)
            b, eb = run(p, base, 'docs/rubato/', st, fonts, ot, img)
            diff = [k for k in a if a[k] != b.get(k)]
            bad += bool(diff or ea or eb)
            print(f'{"SAME" if not diff else "DIFFERENT":9s} {name}' + (f" – {', '.join(diff)}" if diff else '') + (f' – errors {ea + eb}' if ea or eb else ''))
        if not sys.argv[1:]:
            a, _ = run(p, base, 'docs/rubato/0.9/', *CONTROL, ot, False); b, _ = run(p, base, 'docs/rubato/', *CONTROL, ot, False)
            told = all(a[k] != b[k] for k in a); bad += not told
            print(f'{"PASS" if told else "FAIL":9s} control: kerning that 0.9 ignores makes every frame differ')
    print(f'\n{len(want)} looks: ' + ('all identical to 0.9.' if not bad else f'{bad} problems.'))
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()

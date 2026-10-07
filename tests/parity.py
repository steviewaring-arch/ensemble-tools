"""Parity tests: prove the split apps behave exactly like Rubato v0.8.1.

    python3 tests/parity.py            # run everything
    python3 tests/parity.py t2 t4      # run some scenarios

Each scenario is one of the v0.8.1 handover tests (src/tests/t1–t6), rewritten
so it can drive either build:

  ref  – reference/rubato-0.8.1.html, the single-file app as published
         (Studio and Screensaver tabs)
  new  – docs/rubato/ for Studio steps and docs/tempo/ for Screensaver steps

Randomness and time are pinned (seeded Math.random and crypto.getRandomValues,
Playwright's fake clock),
so the same steps should produce byte-identical output. Every canvas frame,
download and UI read-out is saved and compared. The reference is also run
twice, to show the comparison isn't picking up noise.

Needs: pip install playwright (Chromium), node, and the Poppins and Lora
fonts named below. Point OPENTYPE at opentype.js 2.0.0 (npm i opentype.js@2.0.0).
"""
import base64, hashlib, io, json, os, sys, time, zipfile
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start, ROOT

FONTS = os.environ.get('FONTS', '/usr/share/fonts/truetype/google-fonts')
POP = [f'{FONTS}/Poppins-Regular.ttf', f'{FONTS}/Poppins-Bold.ttf']
LORA = f'{FONTS}/Lora-Variable.ttf'
OPENTYPE = os.environ.get('OPENTYPE', os.path.join(ROOT, 'tests/node_modules/opentype.js/dist/opentype.min.js'))
OUT = os.path.join(ROOT, 'tests/out')
T0 = 1791288484000  # Tue 6 Oct 2026 10:08:04 UTC – a fixed "now" for both builds

# UI wording that deliberately changed in Tempo (the Studio tab is now Rubato).
# Applied to reference read-outs before comparing. Nothing in exported files changed.
COPY = [('Current studio settings', 'Current Rubato settings'),
        ('Studio text', 'Rubato text'), ('Add Studio motion', 'Add Rubato motion'),
        ('Studio › Variants › Glyphs', 'Rubato › Variants › Glyphs'),
        ('in the Studio tab to rotate', 'in Rubato to rotate'),
        ("saved in Studio.", "saved in Rubato."), ("your Studio text.", "your Rubato text."),
        ("the Studio tab’s Motion", "Rubato’s Motion"), ("the Studio image", "the Rubato image")]

SEED = """(()=>{let a=20261006;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
let c=7;crypto.getRandomValues=function(arr){const u=new Uint8Array(arr.buffer,arr.byteOffset,arr.byteLength);
for(let i=0;i<u.length;i++){c=(c*1103515245+12345)>>>0;u[i]=c>>>16&255;}return arr;};})();"""

class Run:
    """One build being driven. Collects every result under a name."""
    def __init__(self, browser, base, kind):
        self.kind, self.base, self.browser = kind, base, browser
        self.results, self.errors = {}, []

    def page(self):
        # Tempo 0.3 previews at the screen's shape; 0.8.1's default preview was 1680 × 1050
        self.ctx = self.browser.new_context(viewport={'width': 1440, 'height': 960}, screen={'width': 1680, 'height': 1050}, accept_downloads=True)
        self.ctx.add_init_script(SEED)
        pg = self.ctx.new_page()
        pg.on('pageerror', lambda e: self.errors.append('PAGE ' + str(e)))
        pg.on('console', lambda m: self.errors.append('CON ' + m.text) if m.type == 'error' and 'ERR_' not in m.text else None)
        ot = open(OPENTYPE).read()
        pg.route('**/opentype.min.js', lambda r: r.fulfill(body=ot, content_type='application/javascript'))
        for u in ['https://fonts.googleapis.com/**', 'https://use.typekit.net/**']:
            pg.route(u, lambda r: r.abort())
        pg.clock.install(time=T0 / 1000)  # Playwright takes seconds
        pg.clock.pause_at((T0 + 1000) / 1000)  # time stands still until wait() moves it
        self.pg = pg
        return pg

    # time only moves when we move it
    def wait(self, ms):
        left = ms
        while left > 0:
            step = min(50, left)
            self.pg.clock.run_for(step)
            time.sleep(0.01)
            left -= step

    def studio(self, fresh=False):
        """Open Studio: the reference's default tab, or Rubato."""
        if self.kind == 'ref':
            if not getattr(self, 'loaded', False) or fresh:
                self.pg.goto(self.base + 'reference/rubato-0.8.1.html')
                self.loaded = True
            else:
                self.pg.get_by_role('button', name='Studio', exact=True).click()
        else:
            self.pg.goto(self.base + 'docs/rubato/')
        self.wait(800)

    def saver(self):
        """Open the screen saver: the reference's second tab, or Tempo."""
        if self.kind == 'ref':
            if not getattr(self, 'loaded', False):
                self.pg.goto(self.base + 'reference/rubato-0.8.1.html'); self.loaded = True; self.wait(800)
            self.pg.get_by_role('button', name='Screensaver', exact=True).click()
        else:
            self.wait(400)  # let Rubato's pending saves land first
            self.pg.goto(self.base + 'docs/tempo/')
        self.wait(1000)

    def clear(self):
        self.pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('rubato');indexedDB.deleteDatabase('tempo')")
        self.pg.reload(); self.wait(1000)

    def expand(self):
        self.pg.evaluate("document.querySelectorAll('section.card.collapsed .card-toggle').forEach(b=>b.click())")

    def fonts(self, files, ms=1500):
        self.pg.set_input_files('#fontfile', files)
        for _ in range(ms // 50):
            self.wait(50); time.sleep(0.02)

    def put(self, name, value):
        if isinstance(value, str):
            for a, b in COPY:
                value = value.replace(a, b) if self.kind == 'ref' else value
        self.results[name] = value

    def canvas(self, name):
        u = self.pg.evaluate("document.querySelector('#cv').toDataURL('image/png')")
        self.put(name, base64.b64decode(u.split(',')[1]))

    def scrub(self, v):
        self.pg.evaluate(f"document.querySelector('#scrub').value={v};document.querySelector('#scrub').dispatchEvent(new Event('input'))")
        self.wait(120)

    def slider(self, cid, v):
        self.pg.evaluate(f"const i=document.querySelector('#{cid}');i.value={v};i.dispatchEvent(new Event('input'))")

    def at(self, ms):
        """Jump both builds to the same moment (ms after T0) – the screen saver
        draws the current time, and its thumbnails catch it mid-drift."""
        now = self.pg.evaluate('Date.now()') - T0
        assert now < ms, f'{self.kind} is already {now} ms in; pick a later moment than {ms}'
        self.pg.clock.pause_at((T0 + ms) / 1000)
        self.wait(50)

    def download(self, name, click, timeout=120):
        with self.pg.expect_download(timeout=timeout * 1000) as d:
            click()
            t = time.time()
            while not d.is_done() and time.time() - t < timeout:
                self.wait(50)
        path = d.value.path()
        self.put(name, open(path, 'rb').read())
        self.put(name + ' (file name)', d.value.suggested_filename)

    def cards(self, name):
        """The visible panel, card by card, as the user reads it."""
        self.expand(); self.wait(100)
        txt = self.pg.evaluate("""[...document.querySelectorAll('section.card')].filter(c=>c.offsetParent).map(c=>c.innerText)""")
        self.put(name, '\n\n'.join(txt))

# ---------------------------------------------------------------- scenarios

def t1(r):
    """Fonts: styles, variable axes, instances, axis animation, SVG, picker, reload."""
    pg = r.page(); r.studio(); r.clear(); r.expand()
    r.fonts(POP + [LORA])
    r.put('styles', json.dumps(pg.locator('.font-list .slot-name').all_inner_texts()))
    r.put('axis controls', f"{pg.locator('.axes input[type=range]').count()} sliders, {pg.locator('.axes select').count()} menus")
    pg.get_by_role('button', name='+ Another instance').click(); r.wait(500)
    r.put('after + Another instance', json.dumps(pg.locator('.font-list .slot-name').all_inner_texts()))
    pg.get_by_role('button', name='Set text in Lora Regular').click(); r.wait(400)
    r.put('axis switch visible', str(pg.get_by_role('switch', name='Animate an axis').is_visible()))
    pg.get_by_role('switch', name='Animate an axis').click(); r.wait(300)
    pg.get_by_role('button', name='Still', exact=True).click()
    for v in (0, 250, 500):
        r.scrub(v); r.canvas(f'axis frame {v}')
    r.download('axis SVG', lambda: pg.get_by_role('button', name='SVG frame').click())
    pg.locator('.axes input[type=range]').first.evaluate("e=>{e.value=650;e.dispatchEvent(new Event('input'))}"); r.wait(300)
    r.put('after axis slider', json.dumps(pg.locator('.font-list .slot-name').all_inner_texts()))
    pg.get_by_role('switch', name='Animate an axis').click()
    pg.get_by_role('group', name='Swap').get_by_role('button', name='Styles').click(); r.wait(400)
    r.put('picker', f"{pg.locator('.pick-row').count()} rows, {pg.locator('.tile').count()} tiles")
    r.cards('Studio panel')
    r.wait(500); pg.reload(); r.wait(2000)
    r.put('after reload', json.dumps(pg.locator('.font-list .slot-name').all_inner_texts()))
    r.canvas('after reload frame')

def t2(r):
    """Sequence transitions, stretch and repeat, tooltips, randomise and undo."""
    pg = r.page(); r.studio(); r.clear(); r.expand()
    r.fonts(POP, 1200)
    pg.get_by_role('button', name='Still', exact=True).click()
    pg.get_by_role('switch', name='Sequence of texts').click(); r.wait(200)
    t = pg.locator('#panel textarea'); t.nth(0).fill('Lazaar'); t.nth(1).fill('Display')
    r.slider('c_qStagger', .5); r.slider('c_qDur', .6)
    tr = pg.get_by_role('group', name='Transition')
    for style in ['Roll', 'Stretch', 'Fade', 'Cut']:
        tr.get_by_role('button', name=style).click(); r.wait(100)
        for v in (300, 350, 400, 450):
            r.scrub(v); r.canvas(f'{style} {v}')
    pg.get_by_role('group', name='Handover').get_by_role('button', name='Together').click()
    tr.get_by_role('button', name='Roll').click()
    for v in (300, 350, 400, 450):
        r.scrub(v); r.canvas(f'Together {v}')
    pg.get_by_role('switch', name='Sequence of texts').click()
    pg.locator('#panel textarea').nth(0).fill('LOVE\nHATE')
    for step, name in [('Stretch to fill', 'stretch on'), ('Stretch to fill', 'stretch off'),
                       ('Repeat rows', 'repeat, stretch off'), ('Stretch to fill', 'repeat, stretch on')]:
        pg.get_by_role('switch', name=step).click(); r.wait(200); r.canvas(name)
    q = pg.locator('.q').first; q.scroll_into_view_if_needed(); r.wait(300)
    pg.mouse.move(5, 5); r.wait(100); q.hover(); r.wait(300)
    r.put('tooltip', f"{pg.locator('.tip.on').count()} shown: {pg.locator('.tip').inner_text()}")
    # Studio's ? buttons (the reference also holds the hidden Screensaver cards)
    r.put('? count', str(pg.evaluate("document.querySelectorAll('section.card:not([data-tab=saver]) .q').length")))
    pg.click('#randOpt'); r.wait(300)
    r.put('randomise menu open', str(pg.locator('.rand-pop').is_visible()))
    pg.get_by_role('button', name='Everything', exact=True).click()
    pg.locator('.rand-pop').get_by_role('switch', name='Colour').click()
    pg.locator('.rand-pop').get_by_role('switch', name='Layout').click()
    for i in range(6):
        pg.locator('.rand-pop').get_by_role('button', name='Randomise').click(); r.wait(250)
    r.wait(400)
    r.canvas('randomised (everything)')
    r.put('settings after randomise', pg.evaluate("localStorage.getItem('rubato:settings')"))
    pg.keyboard.press('Escape'); r.wait(100)
    r.put('menu after Escape', str(pg.locator('.rand-pop').is_visible()))
    pg.get_by_role('button', name='Undo', exact=True).click(); r.wait(400)
    r.put('settings after undo', pg.evaluate("localStorage.getItem('rubato:settings')"))
    pg.click('#randOpt'); pg.get_by_role('button', name='Within limits', exact=True).click(); pg.keyboard.press('Escape')
    for i in range(5):
        pg.keyboard.press('r'); r.wait(200)
    r.wait(400)
    r.canvas('randomised (within limits, R key)')
    r.put('settings after R', pg.evaluate("localStorage.getItem('rubato:settings')"))
    r.put('randomise options', pg.evaluate("localStorage.getItem('rubato:rand')"))

def t3(r):
    """v0.6 font migration, then screen saver HTML + Mac exports, then GIF + PNG."""
    R = base64.b64encode(open(POP[0], 'rb').read()).decode()
    B = base64.b64encode(open(POP[1], 'rb').read()).decode()
    pg = r.page(); r.studio()
    pg.evaluate("""async ([r,b])=>{localStorage.clear();await new Promise(res=>{const d=indexedDB.deleteDatabase('rubato');d.onsuccess=d.onerror=d.onblocked=res;});
      const toBuf=s=>{const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer;};
      const db=await new Promise((res,rej)=>{const q=indexedDB.open('rubato',1);q.onupgradeneeded=()=>q.result.createObjectStore('fonts');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});
      await new Promise(res=>{const tx=db.transaction('fonts','readwrite');const st=tx.objectStore('fonts');st.put({name:'Poppins-Regular.ttf',buf:toBuf(r)},'slot1');st.put({name:'Poppins-Bold.ttf',buf:toBuf(b)},'slot2');tx.oncomplete=res;});db.close();
      localStorage.setItem('rubato:settings',JSON.stringify({texts:['Lazaar'],baseSlot:2,fit:'stretch',vMode:'both',picks:{a:['1:200','2:200']}}));}""", [R, B])
    pg.reload(); r.wait(2000)
    r.put('migrated styles', json.dumps(pg.locator('.font-list .slot-name').all_inner_texts()))
    st = pg.evaluate("JSON.parse(localStorage.getItem('rubato:settings')||'{}')")
    ids = pg.evaluate("new Promise(res=>{const q=indexedDB.open('rubato',1);q.onsuccess=()=>{const t=q.result.transaction('fonts').objectStore('fonts').get('styles');t.onsuccess=()=>res(t.result.map(s=>s.id))}})")
    r.put('migrated settings', json.dumps({'fit': st.get('fit'), 'stretch': st.get('stretch'),
          'baseSlot is 2nd style': st.get('baseSlot') == ids[1], 'picks': {k: [x.split(':')[1] for x in v] for k, v in st.get('picks', {}).items()},
          'picks use new ids': all(x.split(':')[0] in ids for v in st.get('picks', {}).values() for x in v)}))
    r.put('default style', json.dumps([pg.locator('.font-list .slot-top button[aria-pressed=true]').all_inner_texts(),
          pg.locator('.font-list .slot').nth(1).locator('.slot-name').inner_text()]))
    r.saver(); r.expand(); r.at(30000); r.wait(1500)
    r.canvas('screen saver preview')
    r.download('screen saver HTML', lambda: pg.get_by_role('button', name='Download HTML file').click())
    r.download('Mac zip', lambda: pg.get_by_role('button', name='Download for Mac').click())
    r.studio(); r.expand()
    r.download('GIF', lambda: pg.get_by_role('button', name='Make GIF').click(), 180)
    r.scrub(300)
    r.download('PNG', lambda: pg.get_by_role('button', name='PNG frame').click())
    # the exported page runs on its own, offline
    html = r.results['screen saver HTML']
    p2 = r.ctx.new_page(); errs = []
    p2.on('pageerror', lambda e: errs.append(str(e)))
    p2.route('**/*', lambda rt: rt.abort() if rt.request.url.startswith('http') else rt.continue_())
    p2.set_content(html.decode()); time.sleep(1.2)
    r.put('exported page errors', json.dumps(errs))

def t4(r):
    """Screen saver panels, digit roll timing, looks mode, Windows + Mac exports."""
    pg = r.page(); r.studio(); r.clear()
    r.fonts(POP, 1200)
    r.saver(); r.expand(); r.at(30000)
    r.put('saver cards', json.dumps([t.split('\n')[0] for t in pg.locator('section.card:visible h2').all_inner_texts()]))
    r.cards('Screensaver panel')
    pg.get_by_role('switch', name='Seconds').click()
    r.slider('c_ssLen', .95); r.slider('c_ssDrift', 0)
    r.wait(1200)
    for k, ms in enumerate((150, 450, 750, 880, 930)):
        now = pg.evaluate('Date.now()')
        r.wait((ms - now % 1000) % 1000 or 1000)
        r.canvas(f'roll at {ms} ms')
    if r.kind == 'ref':  # Saved looks left Tempo in 0.3
        pg.get_by_role('group', name='Show').get_by_role('button', name='Saved looks').click(); r.wait(300)
        r.put('looks cards', json.dumps([t.split('\n')[0] for t in pg.locator('section.card:visible h2').all_inner_texts()]))
        r.put('drift visible in looks', str(pg.locator('#c_ssDrift').is_visible()))
        r.cards('Screensaver panel, saved looks')
        pg.get_by_role('group', name='Show').get_by_role('button', name='The time').click(); r.wait(300)
    r.download('Windows zip', lambda: pg.get_by_role('button', name='Download for Windows').click())
    r.download('Mac zip', lambda: pg.get_by_role('button', name='Download for Mac').click())

def t5(r):
    """The exported screen saver page renders the same frames."""
    pg = r.page(); r.studio(); r.clear()
    r.fonts(POP, 1200)
    r.saver(); r.expand(); r.at(30000)
    r.download('screen saver HTML', lambda: pg.get_by_role('button', name='Download HTML file').click())
    p2 = r.ctx.new_page()
    p2.route('**/*', lambda rt: rt.abort() if rt.request.url.startswith('http') else rt.continue_())
    p2.set_content(r.results['screen saver HTML'].decode()); time.sleep(.6)
    res = p2.evaluate("""()=>{const C=window.__TEMPO__||window.__RUBATO__,e=createEngine();
      e.setFaces(C.fonts.map(d=>({id:d.id,face:e.makeBaked(d),swap:true})));
      const S=Object.assign({},C.base,{seq:false,rOn:false,tightMask:true,stretch:false,qClear:false,fit:'cap',size:62,align:'left',valign:'top',margin:8,tabular:true,
        qStyle:'roll',qEase:'snappy',qStagger:.3,qDir:'up',texts:['12,08,05'],mode:'none',vMode:'off',axOn:false,dur:60,bg:'#5B23F0',ink:'#FFF35C',transparent:false,leading:1,tracking:0});
      e.use(S);const cv=document.createElement('canvas');cv.width=1680;cv.height=1050;const ctx=cv.getContext('2d');const out=[];
      for(const t of [0.004,0.05,0.5,0.95,0.996,1]){e.setLive(t<1?{from:'12,08,04',to:'12,08,05',t}:null);S.texts[0]='12,08,05';e.renderFrame(ctx,1680,1050,0,1,true);out.push(cv.toDataURL('image/png'));}
      return out;}""")
    for i, u in enumerate(res):
        r.put(f'engine frame {i}', base64.b64decode(u.split(',')[1]))

def t6(r):
    """Mac and Windows exports with a single font."""
    pg = r.page(); r.studio(); r.clear()
    r.fonts(POP[:1], 1000)
    r.saver(); r.expand(); r.at(30000)
    r.download('Mac zip', lambda: pg.get_by_role('button', name='Download for Mac').click())
    r.download('Windows zip', lambda: pg.get_by_role('button', name='Download for Windows').click())

SCENARIOS = {'t1': t1, 't2': t2, 't3': t3, 't4': t4, 't5': t5, 't6': t6}

# ---------------------------------------------------------------- on purpose
# Rubato 1.0 and Tempo 0.3 changed some things on purpose. Those results are
# named here with the reason, reported, and not counted as differences. Rubato
# 1.0 is proven against 0.9 by rubato_regress.py; Tempo 0.3 by tempo_check.py
# and split_check.py. Everything else must still match 0.8.1 exactly.
import re as _re
TEMPO03 = 'Tempo 0.3 stands apart from Rubato (its own fonts and settings, no Saved looks or Rubato text, faces per numeral) – covered by tempo_check.py'
RUBATO10 = "Rubato 1.0's Randomise reaches its new settings, so the draws differ – rubato_regress.py proves 1.0 against 0.9"
ON_PURPOSE = {
    ('t1', 'Studio panel'): 'Rubato 1.0 regrouped the panel (Presets first, new controls)', ('t2', '? count'): 'Rubato 1.0 has more controls with tips',
    ('t2', 'randomised (everything)'): RUBATO10, ('t2', 'settings after randomise'): RUBATO10, ('t2', 'settings after undo'): RUBATO10,
    ('t2', 'randomised (within limits, R key)'): RUBATO10, ('t2', 'settings after R'): RUBATO10, ('t2', 'randomise options'): RUBATO10,
    ('t3', 'screen saver HTML'): TEMPO03, ('t3', 'screen saver HTML (file name)'): 'Tempo 0.3 names the file after the screen saver, not Rubato\'s text',
    ('t3', 'Mac zip'): TEMPO03,
    ('t4', 'Screensaver panel'): TEMPO03, ('t4', 'looks cards'): 'Saved looks left Tempo in 0.3',
    ('t4', 'drift visible in looks'): 'Saved looks left Tempo in 0.3', ('t4', 'Screensaver panel, saved looks'): 'Saved looks left Tempo in 0.3',
    ('t4', 'Windows zip'): TEMPO03, ('t4', 'Mac zip'): TEMPO03,
    ('t5', 'screen saver HTML'): TEMPO03, ('t5', 'screen saver HTML (file name)'): 'Tempo 0.3 names the file after the screen saver, not Rubato\'s text',
    ('t6', 'Mac zip'): TEMPO03, ('t6', 'Windows zip'): TEMPO03,
}
# live-preview frames that land on one of two states depending on timing:
# allowed the difference 0.8.1 itself showed between its own runs (6 Oct 2026)
KNOWN_NOISE = {'screen saver preview': (1136, 10), 'roll at 150 ms': (1845, 208)}

def describe(v):
    if isinstance(v, bytes):
        return f'{len(v)} bytes, sha256 {hashlib.sha256(v).hexdigest()[:12]}'
    s = str(v).replace('\n', ' / ')
    return s if len(s) < 90 else s[:87] + '...'

def img_diff(a, b):
    """(pixels that differ, largest channel difference) for two PNGs, else None."""
    if not (isinstance(a, bytes) and isinstance(b, bytes) and a[:4] == b[:4] == b'\x89PNG'):
        return None
    from PIL import Image, ImageChops
    ia, ib = Image.open(io.BytesIO(a)).convert('RGBA'), Image.open(io.BytesIO(b)).convert('RGBA')
    if ia.size != ib.size:
        return (ia.size[0] * ia.size[1], 255)
    d = ImageChops.difference(ia, ib)
    m = d.split()[0]
    for band in d.split()[1:]:
        m = ImageChops.lighter(m, band)
    px = m.point(lambda v: 255 if v else 0).histogram()[255]
    return (px, m.getextrema()[1])

def zip_entries_differing(a, b, skip=()):
    try:
        za, zb = zipfile.ZipFile(io.BytesIO(a)), zipfile.ZipFile(io.BytesIO(b))
    except zipfile.BadZipFile:
        return None
    if set(za.namelist()) != set(zb.namelist()):
        return {'(file list)'}
    return {n for n in za.namelist() if n not in skip and za.read(n) != zb.read(n)}

def zip_diff(a, b):
    try:
        za, zb = zipfile.ZipFile(io.BytesIO(a)), zipfile.ZipFile(io.BytesIO(b))
    except zipfile.BadZipFile:
        return ''
    na, nb = set(za.namelist()), set(zb.namelist())
    bits = [f'only in ref: {sorted(na - nb)}'] if na - nb else []
    bits += [f'only in new: {sorted(nb - na)}'] if nb - na else []
    bits += [f'differs: {n}' for n in sorted(na & nb) if za.read(n) != zb.read(n)]
    return '; '.join(bits)

def main():
    want = sys.argv[1:] or list(SCENARIOS)
    base = start()
    os.makedirs(OUT, exist_ok=True)
    report, failed = [], 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name in want:
            fn = SCENARIOS[name]
            runs = {}
            for kind in ('ref', 'ref', 'new'):
                r = Run(browser, base, kind)
                fn(r)
                r.ctx.close()
                runs.setdefault(kind, []).append(r)
            ref, ref2, new = runs['ref'][0], runs['ref'][1], runs['new'][0]
            report.append(f'\n## {name} – {fn.__doc__}\n')
            for k in ref.results:
                a, a2, b = ref.results[k], ref2.results.get(k), new.results.get(k)
                if b is None and (name, k) in ON_PURPOSE:
                    report.append(f'- gone on purpose: {k} – {ON_PURPOSE[(name, k)]}')
                    continue
                if a != a2:
                    # the reference itself differs between runs: for zips, compare
                    # everything except the entries that change from run to run
                    noisy = zip_entries_differing(a, a2)
                    if noisy is not None and zip_entries_differing(a, b, skip=noisy) == set():
                        report.append(f'- same apart from run-to-run changes: {k} – varies each export: {sorted(noisy)}')
                        continue
                    # images: allow what the reference itself varies by, run to run
                    na, nb = img_diff(a, a2), img_diff(a, b)
                    if na and nb is not None and nb[0] <= 2 * na[0] + 100 and nb[1] <= max(na[1], 10):
                        report.append(f'- same within run-to-run variation: {k} – ref vs ref: {na[0]} px differ by up to {na[1]}/255; '
                                      f'ref vs new: {nb[0]} px by up to {nb[1]}/255')
                        continue
                    status = 'NOISE'
                    same = None
                else:
                    same = a == b
                    status = 'same' if same else 'DIFFERENT'
                    # live-preview frames that land on one of two states depending on timing:
                    # allowed the difference 0.8.1 itself showed between its own runs (6 Oct 2026)
                    d = None if same or k not in KNOWN_NOISE else img_diff(a, b)
                    if d and d[0] <= KNOWN_NOISE[k][0] and d[1] <= KNOWN_NOISE[k][1]:
                        report.append(f'- same within known run-to-run variation: {k} – {d[0]} px differ by up to {d[1]}/255 (0.8.1 against itself: {KNOWN_NOISE[k][0]} px, {KNOWN_NOISE[k][1]}/255)')
                        continue
                    why = None if same else ON_PURPOSE.get((name, k))
                    if why:
                        report.append(f'- differs on purpose: {k} – {why}')
                        continue
                if same is False:
                    failed += 1
                    extra = zip_diff(a, b) if isinstance(a, bytes) and isinstance(b, bytes) else ''
                    report.append(f'- **{status}** {k}: ref {describe(a)} | new {describe(b)} {extra}')
                    for tag, v in (('ref', a), ('new', b)):
                        ext = '.png' if isinstance(v, bytes) and v[:4] == b'\x89PNG' else '.bin' if isinstance(v, bytes) else '.txt'
                        with open(os.path.join(OUT, f'{name}-{k}-{tag}{ext}'.replace(' ', '_').replace('/', '_')), 'wb') as f:
                            f.write(v if isinstance(v, bytes) else str(v).encode())
                else:
                    report.append(f'- {status}: {k} – {describe(a)}')
            for k in new.results:
                if k not in ref.results:
                    report.append(f'- extra in new: {k}')
            for tag, r in (('ref', ref), ('new', new)):
                if r.errors:
                    failed += 1
                    report.append(f'- **errors in {tag}**: {r.errors[:5]}')
            print(f'{name}: done')
        browser.close()
    text = '# Parity report – split apps vs Rubato v0.8.1\n' + '\n'.join(report) + \
           f'\n\n**{"All results match." if not failed else f"{failed} differences or errors."}**\n'
    with open(os.path.join(OUT, 'report.md'), 'w') as f:
        f.write(text)
    print(text)
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()

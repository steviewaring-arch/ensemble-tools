"""Checks for Tempo 0.9: colour themes rebuilt (tiles, your own themes, every hour
with a list and how long each lasts, old downloads bringing their hourly themes
back), Columns and Rings (what they say, stress-tested), the dial's fill and hands,
Download everything, and the promo tools.

    python3 tests/tempo09_check.py

Same requirements as parity.py.
"""
import io, json, os, sys, time, zipfile, calendar
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start
from parity import POP, OPENTYPE, FONTS
from ui_helpers import btn, sheet

results = []
def check(name, ok, detail=''):
    results.append((ok, name, detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f' – {detail}' if detail else ''))

loc = lambda y, mo, d, hh, mm, ss: calendar.timegm((y, mo, d, hh, mm, ss, 0, 0, 0)) * 1000 - (3600000 if (4 <= mo <= 9 or (mo == 10 and d < 25)) else 0)
# London: BST until 25 Oct 2026, GMT after (the dates below avoid the changeover)

# What Columns or Rings say at a moment, from a saver made on the page
SAY = """([C,ms])=>{const R=Date;class D extends R{constructor(...a){if(!a.length)super(ms);else super(...a);}static now(){return ms;}}window.Date=D;
  try{const e=createEngine();const sv=createSaver(e,C);const cv=document.createElement('canvas');cv.width=800;cv.height=500;sv.frame(cv.getContext('2d'),800,500,0,0);return sv.typeNow().join(' ');}finally{window.Date=R;}}"""
TYPE = dict(font='', h24=False, secs=True, zero='zero', case='auto', parts=dict(time=True, secs=True, day=True, date=True, month=True, year=True),
            size=60, leading=1.6, hole=7.8, split=False, feel='smooth', len=.6, far='all', bg='#FFFFFF', ink='#000000', soft='#D2CDC9', rotate=False, themes=[], every=1)

LEGACY = """<!doctype html><html><head><title>Legacy hours – screensaver</title></head><body><script>window.__TEMPO__=%s;</script></body></html>"""

def main():
    base = start()
    ot = open(OPENTYPE).read()
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1440, 'height': 960}, screen={'width': 1680, 'height': 1050}, accept_downloads=True, timezone_id='Europe/London')
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('CON ' + m.text) if m.type == 'error' and 'ERR_' not in m.text else None)
        pg.route('**/opentype.min.js', lambda r: r.fulfill(body=ot, content_type='application/javascript'))
        for u in ['https://fonts.googleapis.com/**', 'https://use.typekit.net/**']:
            pg.route(u, lambda r: r.abort())
        pg.goto(base + 'docs/tempo/'); time.sleep(1)
        pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('tempo')"); pg.reload(); time.sleep(1.5)
        def download(click, n=1):
            got = []
            def on(d): got.append(d)
            pg.on('download', on)
            click(); t = time.time()
            while len(got) < n and time.time() - t < 180: pg.wait_for_timeout(200)
            pg.remove_listener('download', on)
            return [(d.suggested_filename, open(d.path(), 'rb').read()) for d in got]
        colour = lambda: pg.locator('section.card:visible', has=pg.locator('h2', has_text='Colour'))
        tiles = lambda: colour().locator('.theme-tile').evaluate_all('ts=>ts.map(t=>t.getAttribute("aria-label")+(t.getAttribute("aria-pressed")==="true"?"*":""))')

        # 1. Columns: what it says, at the moments most likely to go wrong
        say = lambda t, ms: pg.evaluate(SAY, [dict(show='columns', base={}, colours={}, type=dict(TYPE, **t)), ms])
        cases = [
            (loc(2026, 9, 17, 12, 17, 7), 'Twelve Seventeen & Zero Seven Seconds On Thursday Seventeenth September Twenty Twenty Six'),  # a teen leaves the units column empty
            (loc(2026, 12, 31, 21, 5, 0), 'Nine Zero Five & Zero Zero Seconds On Thursday Thirty First December Twenty Twenty Six'),
            (loc(2026, 10, 20, 0, 40, 59), 'Twelve Forty & Fifty Nine Seconds On Tuesday Twentieth October Twenty Twenty Six'),  # midnight is twelve; a round ten, and the twentieth
            (loc(2026, 10, 30, 13, 10, 11), 'One Ten & Eleven Seconds On Friday Thirtieth October Twenty Twenty Six'),
            (loc(2026, 10, 22, 23, 59, 20), 'Eleven Fifty Nine & Twenty Seconds On Thursday Twenty Second October Twenty Twenty Six'),
            (loc(2026, 11, 1, 10, 1, 1), 'Ten Zero One & Zero One Seconds On Sunday First November Twenty Twenty Six'),
            (loc(2030, 1, 1, 9, 30, 0), 'Nine Thirty & Zero Zero Seconds On Tuesday First January Twenty Thirty'),
        ]
        got = [say({}, ms) for ms, _ in cases]
        check('Columns say the time and date right at the awkward moments (teens, round tens, midnight, the 20th, 30th and 31st, a new decade)',
              got == [w for _, w in cases], json.dumps([g for g, (_, w) in zip(got, cases) if g != w]))
        check('Columns: 24-hour, Oh for zero, and only the parts switched on',
              say(dict(h24=True, zero='oh', parts=dict(time=True, secs=False, day=False, date=True, month=True, year=False)), loc(2026, 10, 22, 23, 5, 0)) == 'Twenty Three Oh Five On Twenty Second October',
              say(dict(h24=True, zero='oh', parts=dict(time=True, secs=False, day=False, date=True, month=True, year=False)), loc(2026, 10, 22, 23, 5, 0)))
        check('Columns in capitals and lower case', say(dict(case='upper', parts=dict(time=True, secs=False, day=False, date=False, month=False, year=False)), loc(2026, 10, 22, 11, 47, 0)) == 'ELEVEN FORTY SEVEN'
              and say(dict(case='lower', parts=dict(time=True, secs=False, day=False, date=False, month=False, year=False)), loc(2026, 10, 22, 11, 47, 0)) == 'eleven forty seven')
        ring = lambda t, ms: pg.evaluate(SAY, [dict(show='rings', base={}, colours={}, type=dict(TYPE, **t)), ms])
        r1 = [ring({}, loc(2026, 10, 22, 13, 0, 0)), ring({}, loc(2026, 10, 22, 10, 9, 45)), ring({'split': True}, loc(2026, 10, 22, 10, 17, 30)), ring({'split': True}, loc(2026, 10, 22, 10, 23, 5)), ring({'secs': False}, loc(2026, 10, 22, 10, 59, 5))]
        r2 = ring({'rparts': dict(day=True, date=True, month=True, year=True)}, loc(2026, 10, 22, 10, 9, 45))
        check('Rings can carry the date too, a ring each: day, date, month and year', r2 == 'Ten zero nine & forty five Thursday twenty second October twenty twenty six', r2)
        DRAWT = SAY.replace('return sv.typeNow().join(\' \');', 'return cv.toDataURL();')
        dt = lambda t: pg.evaluate(DRAWT, [dict(show='columns', base={}, colours={}, type=dict(TYPE, **t)), loc(2026, 10, 22, 10, 9, 45)])
        check('Tracking and the space between columns change Columns', dt({'tracking': -60}) != dt({'tracking': 0}) and dt({'space': 200}) != dt({'space': 100}))
        check('Rings: hours in Title Case, minutes and seconds in words; tens and units on rings of their own when split', r1 == ['One o’clock & zero zero', 'Ten zero nine & forty five', 'Ten seventeen & thirty', 'Ten twenty three & zero five', 'Ten fifty nine'], json.dumps(r1))

        # 1b. Stack (0.9.3): what each line says, and nothing moving as the days change
        XST = SAY.replace("return sv.typeNow().join(' ');", "const r=sv.stackNow();return r&&{lines:r.lines.map(l=>l.text),x:r.lines.map(l=>Math.round(l.x)),k:r.k,bx:r.bx,by:r.by,bw:r.B.W*r.k,bh:r.B.H*r.k};")
        XS = dict(font='', h24=True, zero=True, sep='stop', secs=True, day='full', month='full', year='short', dzero=False, dspace=False, lines='four', dayAt='figure', gap=.18, even=True, size=70,
                  anchor='br', margin=4, tracking=-65, change='roll', feel='smooth', len=.6, colours=dict(bg='#979C92', time='#E9EAEB', day='#343031', date='#F69063', year='#6B712F'), rotate=False, themes=[], every=1)
        xs = lambda t, ms: pg.evaluate(XST, [dict(show='stack', base={}, colours={}, stack=dict(XS, **t)), ms])
        a1 = xs({}, loc(2026, 9, 30, 8, 3, 49))
        check('Stack says it as drawn: 08.03.49 / Wednesday / 30September / 26', a1['lines'] == ['08.03.49', 'Wednesday', '30September', '26'], json.dumps(a1['lines']))
        a2 = xs(dict(h24=False, sep='colon', secs=False, day='short', month='short', year='full', dspace=True, lines='three'), loc(2026, 11, 4, 21, 5, 0))
        check('Stack: 12-hour, a colon, no seconds, Weds and Nov, the year in full on three lines', a2['lines'] == ['09:05', 'Weds', '4 Nov 2026'], json.dumps(a2['lines']))
        a3 = xs(dict(day='three', month='three', lines='five', dzero=True), loc(2026, 10, 1, 13, 0, 0))
        check('Stack: Thu and Oct, five lines, a leading zero on the date', a3['lines'] == ['13.00.00', 'Thu', '01', 'Oct', '26'], json.dumps(a3['lines']))
        moments = [loc(2026, 9, 30, 8, 3, 49), loc(2026, 10, 1, 13, 0, 0), loc(2026, 10, 18, 23, 59, 59), loc(2026, 12, 31, 0, 0, 0), loc(2027, 5, 9, 11, 11, 11)]
        geo = [xs({}, m) for m in moments]
        check('Stack: sized and placed for the worst case, so the block and the time never move from one day to the next',
              len({(round(g['k'], 6), round(g['bx'], 3), round(g['by'], 3), g['x'][0]) for g in geo}) == 1 and max(g['x'][1] for g in geo) - min(g['x'][1] for g in geo) < 100,
              json.dumps([[g['lines'][1], g['x'][1]] for g in geo]))  # the day's own first letter lines its ink up, a few units either way
        BW = lambda t: round(xs(t, loc(2026, 9, 30, 8, 3, 49))['bw'] / xs(t, loc(2026, 9, 30, 8, 3, 49))['k'], 1)
        w0, wd_, wy_ = BW({}), BW({'tl': {'day': 60}}), BW({'tl': {'year': 60}})
        check('Stack: each line has its own tracking – looser on the day widens the block, the year (never the widest) leaves it as it is', wd_ > w0 and wy_ == w0, json.dumps([w0, wd_, wy_]))
        st = lambda t: pg.evaluate(XST.replace("return r&&{", "return r&&{steps:r.B.steps,"), [dict(show='stack', base={}, colours={}, stack=dict(XS, **t)), loc(2026, 9, 30, 8, 3, 49)])['steps']
        s4, s5 = st({}), st({'lines': 'five'})
        check('Stack: Even spacing is one regular step, larger only where a descender hangs over the line below (September over the year)',
              abs(s5[0] - s4[0]) < 1 and s5[3] > s5[0] + 50 and s5[0] == s5[1] == s5[2], json.dumps([s4, s5]))
        xd = lambda t, ms: pg.evaluate(XST.replace('const sv=createSaver(e,C);', 'C.drift=1;const sv=createSaver(e,C);'), [dict(show='stack', base={}, colours={}, stack=dict(XS, **t)), ms])
        dg = [xd(dict(anchor=a), loc(2026, 9, 30, 8, 3, s)) for a in ('br', 'tl') for s in range(0, 60, 7)]
        check('Stack: drift wanders away from its corner but never past the margin on either side',
              all(19.99 <= g['bx'] and g['bx'] + g['bw'] <= 780.01 and 19.99 <= g['by'] and g['by'] + g['bh'] <= 480.01 for g in dg) and len({round(g['bx'], 2) for g in dg}) > 2,
              json.dumps([[round(g['bx'], 1), round(g['by'], 1), round(g['bx'] + g['bw'], 1), round(g['by'] + g['bh'], 1)] for g in dg[:4]]))
        # 2. the new modes draw, in the panel's own preview, and their cards are there
        pg.get_by_role('group', name='Show').get_by_role('button', name='Columns').click(); time.sleep(.6)
        cards = [t.split('\n')[0] for t in pg.locator('section.card:visible h2').all_inner_texts()]
        c1 = pg.evaluate("document.querySelector('#cv').toDataURL()")
        pg.get_by_role('group', name='Show').get_by_role('button', name='Rings').click(); time.sleep(.6)
        c2 = pg.evaluate("document.querySelector('#cv').toDataURL()")
        check('Columns and Rings have their own cards and draw', cards == ['Fonts', 'Words', 'Change', 'Position', 'Colour', 'Promo'] and c1 != c2 and len(c1) > 5000 and len(c2) > 5000, json.dumps(cards))
        t = tiles()
        check('Columns and Rings: their own themes, As drawn first and chosen', t[:1] == ['Drawn*'] and len(t) == 5, json.dumps(t))

        # 3. the time: themes as tiles; changing a built-in theme keeps a copy
        pg.get_by_role('group', name='Show').get_by_role('button', name='The time').click(); time.sleep(.4)
        check('The time: every theme is a tile, Noon chosen', tiles() == ['Noon*', 'Night', 'Paper', 'Signal'], json.dumps(tiles()))
        colour().get_by_role('button', name='Paper', exact=True).click(); time.sleep(.3)
        pg.evaluate("i=>{i.value='#123456';i.dispatchEvent(new Event('input',{bubbles:true}));}", pg.locator('#c_ssP1').element_handle()); time.sleep(.4)
        t = tiles(); stored = pg.evaluate("JSON.parse(localStorage.getItem('tempo:themes')||'[]')")
        check('Changing a colour of a built-in theme keeps it as My Paper, chosen; Paper stays as it was',
              t == ['Noon', 'Night', 'Paper', 'Signal', 'My Paper*'] and stored[0]['p'][0].upper() == '#123456' and stored[0]['bg'].upper() == '#F2F2F2', json.dumps(t))
        pg.evaluate("i=>{i.value='#654321';i.dispatchEvent(new Event('input',{bubbles:true}));}", pg.locator('#c_ssBg').element_handle()); time.sleep(.4)
        stored = pg.evaluate("JSON.parse(localStorage.getItem('tempo:themes')||'[]')")
        check('…and a change to one of yours is saved as you go', len(stored) == 1 and stored[0]['bg'].upper() == '#654321', json.dumps(stored))
        nm = colour().get_by_role('textbox', name='Theme name'); nm.fill('Ink'); nm.press('Enter'); time.sleep(.3)
        check('Your themes can be renamed', 'Ink*' in tiles(), json.dumps(tiles()))

        colour().get_by_role('button', name='Copy to the other designs').click(); time.sleep(.3)
        wt = pg.evaluate("[JSON.parse(localStorage.getItem('tempo:wthemes')||'[]'),JSON.parse(localStorage.getItem('tempo:dthemes')||'[]'),JSON.parse(localStorage.getItem('tempo:tthemes')||'[]')]")
        check('A theme can be copied to the other designs, its colours matched by role', all(len(x) == 1 and x[0]['name'] == 'Ink' and x[0]['bg'].upper() == '#654321' for x in wt) and wt[0][0]['ink'].upper() == '#123456', json.dumps(wt[0]))
        pg.locator('#c_ssP2').click(); time.sleep(.3)
        check('Clicking a colour opens Tempo’s own picker, with saved colours', pg.locator('.cpick').is_visible() and pg.get_by_role('button', name='Save this colour').count() == 1)
        pg.get_by_role('button', name='Save this colour').click(); pg.keyboard.press('Escape'); time.sleep(.2)
        check('…and a saved colour is kept for every design', len(pg.evaluate("JSON.parse(localStorage.getItem('tempo:swatches')||'[]')")) == 1)
        # 4. every hour: tick themes, in order; each lasts n hours; the strip shows the day
        colour().get_by_role('group', name='Colours').get_by_role('button', name='Every hour').click(); time.sleep(.3)
        strip0 = colour().locator('.hs-cell').count()
        for n in ['Night', 'Ink', 'Signal']:
            colour().get_by_role('checkbox', name='Every hour – ' + n).click(); time.sleep(.15)
        order = colour().locator('.tt-tick.on').evaluate_all('ts=>ts.map(t=>t.getAttribute("aria-label").replace("Every hour – ","")+t.textContent)')
        colour().get_by_role('group', name='Each theme lasts').get_by_role('button', name='4 hours').click(); time.sleep(.3)
        day = colour().locator('.hs-cell').evaluate_all('cs=>cs.map(c=>c.getAttribute("aria-label").split(" – ")[1])')
        check('Every hour: tick the themes, in order, and each lasts as long as set – the strip shows the day',
              strip0 == 24 and sorted(order, key=lambda x: x[-1]) == ['Night1', 'Ink2', 'Signal3'] and day[:12] == ['Night'] * 4 + ['Ink'] * 4 + ['Signal'] * 4 and day[12:16] == ['Night'] * 4, json.dumps([order, day[:13]]))
        colour().locator('.hs-cell').nth(5).click(); time.sleep(.3)
        look = colour().locator('.look-line').inner_text()
        check('Click an hour to see its theme in the preview, and its colours to change', 'Showing Ink' in look and 'Ink*' in tiles(), look)
        (fn, html), = download(lambda: (sheet(pg, 'export'), btn(pg, 'Download HTML file').click()))
        cfg = json.loads(html.decode().split('window.__TEMPO__=')[1].split(';</script>')[0])
        check('The export carries the day: the themes in order, each for 4 hours, and no preview stand-in',
              cfg['colours']['cycle'] and [x['name'] for x in cfg['palettes']] == ['Night', 'Ink', 'Signal'] and cfg['colours']['every'] == 4 and 'force' not in cfg, json.dumps([x['name'] for x in cfg['palettes']]))

        # 5. an older download whose colours change every hour opens with its themes, ready to change
        legacy = dict(show='clock', clock=dict(h24=True, sep=',', secs=False, zero=True, ampm=True, line2='none', caps=False, change='roll', feel='smooth', len=1, align='left', valign='top', size=32, margin=4, tabular=False, tracking=-60, leading=1, move=False, pulse=False, alt='off', altRate=6),
                      colours=dict(by='type', bg='#232323', p=['#ffffff', '#00fbff', '#FFFFFF', '#FF8FD0'], cycle=True),
                      palettes=[dict(name='Theme 1', bg='#2e3519', p=['#000000', '#00fdff', '#FFFFFF', '#FF8FD0']), dict(name='Theme 2', bg='#ff4013', p=['#d6d6d6', '#ff8dff', '#FFFFFF', '#FF8FD0']), dict(name='Paper', bg='#ffffff', p=['#04c724', '#ffc4e9', '#FFFFFF', '#FF8FD0'])],
                      base=dict(ssRotate='mine', ssShow='clock', ssBg='#232323'), drift=0, tracks={}, fonts=[])
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'legacy-hours.html'); os.makedirs(os.path.dirname(path), exist_ok=True)
        open(path, 'w').write(LEGACY % json.dumps(legacy))
        pg.set_input_files('#presetfile', path); time.sleep(1.2)
        t = tiles(); hourly = colour().get_by_role('group', name='Colours').locator('button[aria-pressed=true]').inner_text()
        ticks = colour().locator('.tt-tick.on').evaluate_all('ts=>ts.map(t=>t.getAttribute("aria-label").replace("Every hour – ",""))')
        check('An old download that changes colour every hour opens with its themes (one renamed, as Paper is taken), every hour, in order',
              hourly == 'Every hour' and 'Theme 1' in [x.rstrip('*') for x in t] and 'Paper 2' in [x.rstrip('*') for x in t] and ticks == ['Theme 1', 'Theme 2', 'Paper 2'], json.dumps([hourly, ticks]))
        colour().get_by_role('button', name='Theme 2', exact=True).click(); time.sleep(.3)
        check('…and each of its themes can be looked at and changed', pg.locator('#c_ssBg').input_value().upper() == '#FF4013' and colour().get_by_role('textbox', name='Theme name').input_value() == 'Theme 2')

        # 6. the dial: fill and hands change the frame
        pg.get_by_role('group', name='Show').get_by_role('button', name='As a dial').click(); time.sleep(.5)
        (fn, html), = download(lambda: (sheet(pg, 'export'), btn(pg, 'Download HTML file').click()))
        dcfg = json.loads(html.decode().split('window.__TEMPO__=')[1].split(';</script>')[0])
        DRAW = """([C,ms])=>{const R=Date;class D extends R{constructor(...a){if(!a.length)super(ms);else super(...a);}static now(){return ms;}}window.Date=D;
          try{const e=createEngine();const sv=createSaver(e,C);const cv=document.createElement('canvas');cv.width=800;cv.height=500;sv.frame(cv.getContext('2d'),800,500,0,0);return cv.toDataURL();}finally{window.Date=R;}}"""
        t0 = loc(2026, 10, 22, 10, 23, 5)
        draw = lambda o: pg.evaluate(DRAW, [dict(dcfg, dial=dict(dcfg['dial'], **o)), t0])
        b0 = draw({})
        fs = [draw(dict(fill='minute', fillStyle=x)) for x in ('sweep', 'steps', 'fade')] + [draw(dict(fill='minute', fillLayer=x)) for x in ('front', 'hands', 'marks')]
        check('The fill sweeps, moves in sections or fading sections, and sits in front, behind the hands or behind the marks', len(set(fs)) == 5, str(len(set(fs))))  # sweep in front is drawn twice
        diff = [draw(o) != b0 for o in ({'fill': 'minute'}, {'fill': 'hour', 'fillTurn': 'reset'}, {'cap': 'round', 'hw': [20, 20, 20]}, {'tip': 'dot'}, {'tip': 'ring', 'tipOn': 'all'}, {'weight': True}, {'handA': .4}, {'blend': 'multiply'})]
        check('The dial: fill, round ends, tips, counterweight, opacity and blend each change the frame', all(diff), json.dumps(diff))
        check('The dial export carries the new settings', all(k in dcfg['dial'] for k in ['fill', 'fillStyle', 'fillLayer', 'fillTurn', 'fillR', 'fillA', 'fillBlend', 'cap', 'hw', 'tip', 'tipOn', 'weight', 'handA', 'blend']) and 'fill' in dcfg['dial']['colours'])

        # 7. Download everything: one zip, named as the screen saver
        pg.get_by_role('group', name='Show').get_by_role('button', name='The time').click(); time.sleep(.3)
        sheet(pg, 'export'); pg.locator('#c_ssName').fill('Night Shift'); time.sleep(.2)
        (fn, data), = download(lambda: btn(pg, 'Download everything').click())
        z = zipfile.ZipFile(io.BytesIO(data)); names = z.namelist(); readme = z.read('Night Shift/Read me.txt').decode()
        check('Download everything: Night Shift.zip with the Mac .saver, the Windows .scr, the HTML file and a read-me',
              fn == 'Night Shift.zip' and 'Night Shift/Mac/Night Shift.saver/Contents/Info.plist' in names and 'Night Shift/Windows/Night Shift.scr' in names and 'Night Shift/HTML/Night Shift.html' in names, json.dumps(names[:6]))
        check('…the read-me is generic: Made with Tempo by ENSEMBLE, how to install on each, the web address, hello@ and the year',
              readme.startswith('Made with Tempo by ENSEMBLE') and 'Night Shift' not in readme and 'weareensemble.co.uk' in readme and 'hello@weareensemble.co.uk' in readme and str(time.localtime().tm_year) in readme and 'WINDOWS' in readme and 'MAC' in readme)
        mode = z.getinfo('Night Shift/Mac/Night Shift.saver/Contents/MacOS/WebViewScreenSaver').external_attr >> 16
        check('…and the Mac screen saver inside can still run', mode & 0o111 != 0, oct(mode))

        # 8. promo (internal): specs and three stills
        (fn, data), = download(lambda: pg.get_by_role('button', name='Specs', exact=True).click())
        spec = data.decode()
        P = 'Tempo_ScreenSaver_Ensemble_Design_Studio_Night_Shift'
        check('Promo: the specs name the screen saver and list its colours hour by hour', fn == P + '_Specs.txt' and spec.startswith('Night Shift') and 'Hour by hour:' in spec and 'Theme 2' in spec, fn)
        shots = download(lambda: pg.get_by_role('button', name='Stills', exact=True).click(), 3)
        check('Promo: a still for each theme in the day (at least three), each different, named Tempo_ScreenSaver_Ensemble_Design_Studio_ with the name and a number',
              [s[0] for s in shots] == [P + '_01.png', P + '_02.png', P + '_03.png'] and len({s[1] for s in shots}) == 3, json.dumps([s[0] for s in shots]))
        # the device: a transparent PNG with its screen cut out; the screen saver goes behind it on #F5F5F3
        from PIL import Image
        dev = Image.new('RGBA', (1600, 900), (0, 0, 0, 0)); px = dev.load()
        for x in range(400, 1200):
            for y in range(200, 650):
                if not (420 <= x < 1180 and 220 <= y < 630): px[x, y] = (20, 20, 20, 255)
        dpath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'device.png'); dev.save(dpath)
        pg.set_input_files('input[accept="image/png"]', dpath); time.sleep(.8)
        dshots = download(lambda: pg.get_by_role('button', name='Device stills').click(), 3)
        im = Image.open(io.BytesIO(dshots[0][1])).convert('RGB')
        check('Device stills: the PNG’s size kept, the background #F5F5F3, the screen saver in the screen, numbered after the others',
              [s[0] for s in dshots] == [P + '_04.png', P + '_05.png', P + '_06.png'] and im.size == (1600, 900) and im.getpixel((10, 10)) == (245, 245, 243) and im.getpixel((410, 210)) == (20, 20, 20) and im.getpixel((800, 600)) != (245, 245, 243),
              json.dumps([s[0] for s in dshots]))

        check('No page errors', not errs, '; '.join(errs[:3]))
        b.close()
    failed = [r for r in results if not r[0]]
    print(f'\n{len(results) - len(failed)} of {len(results)} checks pass.')
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()

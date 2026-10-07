"""Checks for Tempo 0.2 and 0.3: the time in words, its looks and typesetting,
other fonts mixed into the words and the numerals, each font's own tracking,
the preview taking the screen's shape, settings from 0.2 carried over, and
"Tempo" (not "Rubato") in everything it exports.

    python3 tests/tempo_check.py

Same requirements as parity.py. The clock is pinned, so the words are known.
"""
import base64, calendar, io, json, os, random, re, sys, time, zipfile
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start
from parity import POP, OPENTYPE, FONTS

T0 = 1793231279000  # Wed 28 Oct 2026 23:47:59 in London (GMT)
results = []
def check(name, ok, detail=''):
    results.append((ok, name, detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f' – {detail}' if detail else ''))

# Run a fresh saver at a pinned moment with some In words options; return its sentence and layout.
SAY = """([ms,o,W,H])=>{const C=Object.assign({},window.__cfg,{show:'words',words:Object.assign({},window.__cfg.words,o)});
  const RealDate=Date;let out=null;const D=function(...a){return a.length?new RealDate(...a):new RealDate(ms)};D.now=()=>ms;D.prototype=RealDate.prototype;
  window.Date=D;try{const e=createEngine();if(window.__faces)e.setFaces(window.__faces);const sv=createSaver(e,C);const cv=document.createElement('canvas');cv.width=W||1680;cv.height=H||1050;
  sv.frame(cv.getContext('2d'),W||1680,H||1050,0,0);out=Object.assign({words:sv.words()},sv.lines(W||1680,H||1050));}finally{window.Date=RealDate;}return out;}"""
# Mixed type: run a saver from an exported config across several moments; return each moment's words, faces and layout.
MIX = """([C,times,W,H])=>{const RealDate=Date;let ms=times[0];const D=function(...a){return a.length?new RealDate(...a):new RealDate(ms)};D.now=()=>ms;D.prototype=RealDate.prototype;
  window.Date=D;const out=[];try{const e=createEngine();e.setFaces(C.fonts.map(d=>({id:d.id,face:e.makeBaked(d),swap:d.swap!==false})));const sv=createSaver(e,C);const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  for(const t of times){ms=t;sv.frame(cv.getContext('2d'),W,H,0,0);out.push(Object.assign({faces:sv.faces()},sv.lines(W,H)));}}finally{window.Date=RealDate;}return out;}"""
# The time: the faces given to each numeral, across several moments.
CLK = """([C,times,W,H])=>{const RealDate=Date;let ms=times[0];const D=function(...a){return a.length?new RealDate(...a):new RealDate(ms)};D.now=()=>ms;D.prototype=RealDate.prototype;
  window.Date=D;const out=[];try{const e=createEngine();e.setFaces(C.fonts.map(d=>({id:d.id,face:e.makeBaked(d),swap:d.swap!==false})));const sv=createSaver(e,C);const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  for(const t of times){ms=t;sv.frame(cv.getContext('2d'),W,H,0,0);out.push(sv.clockFaces());}}finally{window.Date=RealDate;}return out;}"""
THIRD = f'{FONTS}/Poppins-LightItalic.ttf'  # a third style, to shuffle between two display faces
utc = lambda y, mo, d, hh, mm, ss: calendar.timegm((y, mo, d, hh, mm, ss, 0, 0, 0)) * 1000  # London is on GMT for every date used here

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
        pg.clock.install(time=T0 / 1000)
        pg.clock.pause_at((T0 + 100) / 1000)
        def wait(ms):
            left = ms
            while left > 0:
                s = min(50, left); pg.clock.run_for(s); time.sleep(0.01); left -= s
        def canvas():
            return base64.b64decode(pg.evaluate("document.querySelector('#cv').toDataURL('image/png')").split(',')[1])
        def download(click, page=None):
            with (page or pg).expect_download(timeout=120000) as d:
                click()
                t = time.time()
                while not d.is_done() and time.time() - t < 120:
                    wait(50)
            return open(d.value.path(), 'rb').read(), d.value.suggested_filename
        def config(html):
            return json.loads(html.decode().split('window.__TEMPO__=')[1].split(';</script>')[0].replace('\\u003c', '<'))
        expand = "document.querySelectorAll('section.card.collapsed .card-toggle').forEach(b=>b.click())"

        pg.goto(base + 'docs/tempo/'); wait(800)
        pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('rubato');indexedDB.deleteDatabase('tempo')"); pg.reload(); wait(1000)
        pg.evaluate(expand)

        # 1. The preview takes the shape of the screen Tempo is open on
        dims = pg.evaluate("[document.querySelector('#cv').width,document.querySelector('#cv').height]")
        check('Preview is the shape of this screen, with no shape buttons', dims == [1680, 1050] and pg.locator('#shapes').count() == 0 and 'shape of this screen' in pg.locator('#dims').inner_text(), json.dumps(dims))
        tall = b.new_context(viewport={'width': 1000, 'height': 900}, screen={'width': 1080, 'height': 1920}); pt = tall.new_page()
        pt.route('**/opentype.min.js', lambda r: r.fulfill(body=ot, content_type='application/javascript'))
        pt.goto(base + 'docs/tempo/'); time.sleep(1)
        check('On a portrait screen the preview is portrait', pt.evaluate("[document.querySelector('#cv').width,document.querySelector('#cv').height]") == [1080, 1920])
        tall.close()
        show = pg.get_by_role('group', name='Show').get_by_role('button').all_inner_texts()
        panel = pg.locator('#panel').inner_text()
        check('Show is The time or In words; nothing in the panel refers to Rubato', show == ['The time', 'In words'] and 'Rubato' not in panel
              and pg.get_by_role('switch', name='Add Rubato motion').count() == 0, json.dumps(show))

        # 2. Clock exports say Tempo, without a font loaded, and are named as before
        html, _ = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        h = html.decode()
        check('HTML export uses window.__TEMPO__', 'window.__TEMPO__=' in h and '__RUBATO__' not in h)
        check('No-font export is titled Tempo', '<title>Tempo – screensaver</title>' in h, re.search('<title>.*?</title>', h).group(0))
        ccfg = config(html)
        check('Clock exports carry no words settings, export name or anything from Rubato', 'words' not in ccfg and ccfg['show'] == 'clock' and 'ssName' not in json.dumps(ccfg) and 'ssW' not in json.dumps(ccfg)
              and not re.search(r'"ss[MN][A-Z]', json.dumps(ccfg['base'])) and 'looks' not in ccfg and 'text' not in ccfg['clock'] and 'ambient' not in ccfg['clock'] and 'image' not in ccfg)
        mac, mname = download(lambda: pg.get_by_role('button', name='Download for Mac').click())
        zm = zipfile.ZipFile(io.BytesIO(mac)); readme = zm.read('Read me first.txt').decode()
        check('Mac export is named Tempo with no font', mname == 'Tempo screen saver for Mac.zip' and any(n.startswith('Tempo.saver/') for n in zm.namelist()), mname)
        check('Mac read-me says Made with Tempo', 'Made with Tempo by Ensemble' in readme and 'Rubato' not in readme)
        win, wname = download(lambda: pg.get_by_role('button', name='Download for Windows').click())
        zw = zipfile.ZipFile(io.BytesIO(win)); scr = zw.read('Tempo.scr') if 'Tempo.scr' in zw.namelist() else b''
        check('Windows export is named Tempo with no font', wname == 'Tempo screen saver for Windows.zip' and bool(scr), json.dumps(zw.namelist()))
        check('Windows read-me says Made with Tempo', 'Made with Tempo by Ensemble' in zw.read('Read me first.txt').decode())
        u16 = lambda s: s.encode('utf-16-le')
        check('Windows host says Tempo, not Rubato', u16('Tempo Screen Savers') in scr and u16('Made with Tempo') in scr and u16('Rubato') not in scr)

        # 3. In words
        pg.get_by_role('group', name='Show').get_by_role('button', name='In words').click(); wait(400)
        cards = [t.split('\n')[0] for t in pg.locator('section.card:visible h2').all_inner_texts()]
        check('In words shows its own cards, Screensaver first', cards == ['Screensaver', 'Fonts', 'Looks', 'Sentence', 'Type', 'Change', 'Position', 'Colour', 'Export'], json.dumps(cards))
        parts = pg.get_by_role('group', name='Sentence parts').get_by_role('button').all_inner_texts()
        check('Sentence parts are the time and date only', parts == ['It is', 'Time', 'Seconds', 'Day', 'Date', 'Month', 'Year', 'Full stop'], json.dumps(parts))
        own = json.loads(pg.evaluate("localStorage.getItem('tempo:settings')") or '{}')
        check("Words settings live in Tempo's own storage", own.get('ssShow') == 'words' and 'ssWCase' in own and not any(k.startswith('ssW') for k in json.loads(pg.evaluate("localStorage.getItem('rubato:settings')") or '{}')))
        check('Reference look is the default', pg.get_by_role('group', name='Looks').locator('button[aria-pressed=true]').all_inner_texts() == ['Reference'])
        whtml, wfn = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        cfg = config(whtml)
        check('Words export carries the words settings, and nothing about places or weather',
              cfg.get('show') == 'words' and cfg['words']['case'] == 'sentence' and cfg['words']['layout'] == 'para' and not re.search(r'open-meteo|"place"|weather|latitude', whtml.decode()))
        check('Words export is named after the look', wfn == 'tempo-reference-screensaver.html' and '<title>Tempo Reference – screensaver</title>' in whtml.decode(), wfn)
        pg.evaluate("c=>{window.__cfg=c}", cfg)

        OFF = {'weekday': False, 'daynum': False, 'month': False, 'year': False}
        FIG = {'nums': {'time': 'figures', 'sec': 'figures', 'date': 'figures', 'year': 'figures'}}
        cases = [
            ((2026, 10, 28, 23, 47, 59), {}, 'It is eleven forty seven and fifty nine seconds on Wednesday the twenty eighth of October twenty twenty six'),
            ((2026, 10, 29, 0, 0, 0), {}, 'It is midnight exactly on Thursday the twenty ninth of October twenty twenty six'),
            ((2026, 11, 1, 12, 0, 1), {}, 'It is midday and one second on Sunday the first of November twenty twenty six'),
            ((2026, 11, 3, 9, 5, 0), {'secs': False}, 'It is nine oh five on Tuesday the third of November twenty twenty six'),
            ((2026, 11, 3, 9, 0, 0), dict(OFF, secs=False, stop=True), 'It is nine o’clock.'),
            ((2026, 11, 3, 9, 5, 7), dict(OFF, h24=True, weekday=True), 'It is oh nine oh five and seven seconds on Tuesday'),
            ((2026, 11, 3, 0, 0, 0), dict(OFF, h24=True, secs=False), 'It is zero hundred'),
            ((2026, 11, 3, 21, 40, 2), dict(FIG), 'It is 9.40pm and 2 seconds on Tuesday 3 November 2026'),
            ((2026, 11, 3, 21, 40, 2), dict(FIG, h24=True, sep='colon', lead=False, secs=False), '21:40 on Tuesday 3 November 2026'),
            ((2026, 10, 28, 23, 47, 59), {'nums': {'time': 'figures', 'sec': 'words', 'date': 'words', 'year': 'figures'}}, 'It is 11.47pm and fifty nine seconds on Wednesday the twenty eighth of October 2026'),
            ((2026, 10, 28, 23, 47, 59), {'nums': {'time': 'words', 'sec': 'figures', 'date': 'figures', 'year': 'words'}}, 'It is eleven forty seven and 59 seconds on Wednesday 28 October twenty twenty six'),
            ((2026, 11, 3, 9, 5, 0), {'secs': False, 'zero': 'zero'}, 'It is nine zero five on Tuesday the third of November twenty twenty six'),
            ((2026, 11, 3, 9, 5, 0), dict(OFF, h24=True, secs=False, zero='zero'), 'It is zero nine zero five'),
            ((2026, 11, 3, 21, 40, 2), {'case': 'lower', 'secs': False}, 'it is nine forty on tuesday the third of november twenty twenty six'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, case='upper', secs=False, weekday=True), 'IT IS NINE FORTY ON TUESDAY'),
            ((2026, 12, 31, 23, 59, 59), {}, 'It is eleven fifty nine and fifty nine seconds on Thursday the thirty first of December twenty twenty six'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, month=True), 'It is nine forty in November'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, weekday=True, month=True), 'It is nine forty on Tuesday in November'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, year=True), 'It is nine forty in twenty twenty six'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, daynum=True, **FIG), 'It is 9.40pm on the 3rd'),
            ((2026, 11, 3, 21, 40, 2), {'time': False}, 'It is Tuesday the third of November twenty twenty six'),
            ((2026, 11, 3, 21, 40, 2), {'time': False, 'lead': False, 'weekday': False}, 'The third of November twenty twenty six'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, lead=False, secs=False), 'Nine forty'),
        ]
        bad = []
        for when, o, want in cases:
            got = pg.evaluate(SAY, [utc(*when), o, 1680, 1050])['words']
            if got != want:
                bad.append(f'{when} {o}: got “{got}”')
        check(f'Sentences read correctly ({len(cases)} cases, parts on and off)', not bad, '; '.join(bad))

        # line breaks: only between phrases, never stranding a little word, across a year of times and many measures
        rng = random.Random(7); stranded = []; forced = 0
        LITTLE = re.compile(r'(?:^|\s)(on|the|of|in|and)$', re.I)
        for i in range(200):
            ms = utc(2026, 1, 1, 0, 0, 0) + rng.randrange(0, 365 * 86400) * 1000
            o = {'measure': rng.choice([30, 45, 60, 80, 100]), 'size': rng.choice([3, 5, 7, 9]), 'case': rng.choice(['sentence', 'upper']),
                 'nums': {k: rng.choice(['words', 'figures']) for k in ('time', 'sec', 'date', 'year')}, 'layout': rng.choice(['para', 'stack'])}
            r = pg.evaluate(SAY, [ms, o, 1680, 1050])
            if r['forced']: forced += 1; continue  # a phrase wider than the line has to break somewhere
            for ln in r['lines'][:-1]:
                if LITTLE.search(ln): stranded.append(ln)
        check(f'No line ends on “on”, “the”, “of”, “in” or “and” ({200 - forced} layouts where every phrase fits a line)', not stranded and forced < 120, '; '.join(stranded[:3]) or f'{forced} too cramped to judge')
        r = pg.evaluate(SAY, [utc(2026, 10, 28, 23, 47, 59), {'measure': 45, 'size': 5}, 1680, 1050])
        check('Cramped, a phrase gives way after “is” first, so the time stays whole', not r['forced'] and r['lines'][:2] == ['It is', 'eleven forty seven'] and all(not re.search(r'(forty|fifty|twenty|the|of|on|and)$', ln) for ln in r['lines'][:-1]), ' | '.join(r['lines']))
        r = pg.evaluate(SAY, [utc(2026, 10, 28, 23, 47, 59), {'layout': 'stack', 'fit': True}, 1680, 1050])
        check('Stacked: one phrase to a line', r['lines'] == ['It is eleven forty seven', 'and fifty nine seconds', 'on Wednesday', 'the twenty eighth', 'of October', 'twenty twenty six'], ' | '.join(r['lines']))

        # fit: one size for every moment, and the longest sentence fits
        sizes = set(); over = []
        for i in range(40):
            ms = utc(2026, 1, 1, 0, 0, 0) + rng.randrange(0, 365 * 86400) * 1000
            r = pg.evaluate(SAY, [ms, {'fit': True}, 1680, 1050]); sizes.add(round(r['size'], 3))
        worst = pg.evaluate(SAY, [utc(2027, 9, 29, 12, 57, 57), {'fit': True}, 1680, 1050])  # Wednesday 29 September
        check('Fit keeps one type size all year', len(sizes) == 1, str(sorted(sizes)))
        check('Fit fills the screen without overflowing', worst['size'] > 1680 * .05 and len(worst['lines']) >= 2, f"{worst['size']:.1f}px, {len(worst['lines'])} lines")

        # optical margin moves the first letter's ink onto the margin
        on = pg.evaluate(SAY, [utc(2026, 10, 28, 23, 47, 59), {'optical': True, 'fit': True}, 1680, 1050])
        offm = pg.evaluate(SAY, [utc(2026, 10, 28, 23, 47, 59), {'optical': False, 'fit': True}, 1680, 1050])
        check('Optical margin pulls lines left by their side bearing', all(a <= b + .01 for a, b in zip(on['x'], offm['x'])) and any(a < b for a, b in zip(on['x'], offm['x'])) and offm['x'][0] - on['x'][0] < on['size'] * .15,
              f"{offm['x'][0]:.1f} → {on['x'][0]:.1f}")

        # looks: In words and Mixed type's together, without Night and Spotlight
        looks = pg.get_by_role('group', name='Looks').get_by_role('button').all_inner_texts()
        check('Looks: the nine starting points', looks == ['Reference', 'Stack', 'Poster', 'Typewriter', 'Hours', 'Social', 'Latest', 'Medley', 'Lazaar'], json.dumps(looks))
        okl = True; seen = set()
        for name in ['Stack', 'Poster', 'Typewriter', 'Hours', 'Social', 'Latest', 'Medley', 'Lazaar', 'Reference']:
            pg.get_by_role('group', name='Looks').get_by_role('button', name=name).click(); wait(250)
            okl = okl and pg.get_by_role('group', name='Looks').locator('button[aria-pressed=true]').all_inner_texts() == [name]
            seen.add(canvas())
        check('Each look applies and shows as chosen', okl)
        check('Each look draws differently', len(seen) == 9, f'{len(seen)} different frames')
        pg.get_by_role('group', name='Looks').get_by_role('button', name='Stack').click(); wait(250)
        check('Export name defaults to the look', pg.locator('#c_ssName').get_attribute('placeholder') == 'Tempo Stack')
        mac, mname = download(lambda: pg.get_by_role('button', name='Download for Mac').click())
        check('Mac export takes the look’s name', mname == 'Tempo Stack screen saver for Mac.zip' and any(n.startswith('Tempo Stack.saver/') for n in zipfile.ZipFile(io.BytesIO(mac)).namelist()), mname)
        pg.locator('#c_ssName').fill('Ensemble Night Shift'); wait(400)
        win, wname = download(lambda: pg.get_by_role('button', name='Download for Windows').click())
        check('A typed name wins', wname == 'Ensemble Night Shift screen saver for Windows.zip' and 'Ensemble Night Shift.scr' in zipfile.ZipFile(io.BytesIO(win)).namelist(), wname)
        pg.locator('#c_ssName').fill(''); wait(400)
        pg.get_by_role('group', name='Looks').get_by_role('button', name='Reference').click(); wait(250)

        # with real fonts: the exported page draws exactly what Tempo draws from the same file
        pg.set_input_files('#fontfile', POP)
        for _ in range(30): wait(50); time.sleep(.02)
        pg.evaluate(expand); wait(200)
        cores = [pg.get_by_role('button', name='Use as core – ' + n).get_attribute('aria-pressed') for n in ['Poppins Regular', 'Poppins Bold']]
        hidden = pg.get_by_role('switch', name='Shuffle in – Poppins Bold').count()
        for n in ['Poppins Regular', 'Poppins Bold']:
            pg.get_by_role('button', name='Details – ' + n).click(); wait(150)
        check('Fonts: the first font is the core; the other can shuffle in, folded under its name', cores == ['true', 'false'] and hidden == 0 and pg.get_by_role('switch', name='Shuffle in – Poppins Bold').count() == 1
              and pg.get_by_role('switch', name='Shuffle in – Poppins Regular').count() == 0, json.dumps(cores))
        pg.select_option('#c_ssMTime', label='Poppins Bold'); wait(300)
        whtml, _ = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        cfg = config(whtml)
        frame_js = """(C)=>{const RealDate=Date;const ms=%d;const D=function(...a){return a.length?new RealDate(...a):new RealDate(ms)};D.now=()=>ms;D.prototype=RealDate.prototype;window.Date=D;
          try{const e=createEngine();e.setFaces(C.fonts.map(d=>({id:d.id,face:e.makeBaked(d),swap:d.swap!==false})));const cv=document.createElement('canvas');cv.width=1680;cv.height=1050;
          createSaver(e,C).frame(cv.getContext('2d'),1680,1050,0,0);return cv.toDataURL('image/png');}finally{window.Date=RealDate;}}""" % T0
        p3 = ctx.new_page(); e3 = []
        p3.on('pageerror', lambda e: e3.append(str(e)))
        p3.route('**/*', lambda rt: rt.abort() if rt.request.url.startswith('http') else rt.continue_())
        p3.set_content(whtml.decode()); time.sleep(.6)
        a = p3.evaluate(frame_js, cfg); b2 = pg.evaluate(frame_js, cfg)
        check('Exported words page draws the same frame as Tempo does from that file', a == b2 and len(a) > 5000)
        check('Exported words page runs offline without errors', not e3, '; '.join(e3[:3]))
        check('Words export bakes every letter it can need', all(ch in cfg['fonts'][0]['cmap'] for ch in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:'))
        bold = [f['id'] for f in cfg['fonts'] if f['name'] == 'Poppins Bold']
        check('A part set in another font is carried into the export', bold and cfg['words']['mixed']['parts']['time'] == bold[0] and len(cfg['fonts']) == 2)
        p3.close()

        # whoever installs it: the same file in New York shows New York's time and date
        ny = b.new_context(timezone_id='America/New_York'); p4 = ny.new_page(); e4 = []
        p4.on('pageerror', lambda e: e4.append(str(e)))
        p4.route('**/*', lambda rt: rt.abort() if rt.request.url.startswith('http') else rt.continue_())
        p4.set_content(whtml.decode()); time.sleep(.4)
        said = p4.evaluate("""(C)=>{const RealDate=Date;const ms=%d;const D=function(...a){return a.length?new RealDate(...a):new RealDate(ms)};D.now=()=>ms;D.prototype=RealDate.prototype;window.Date=D;
          try{const e=createEngine();e.setFaces(C.fonts.map(d=>({id:d.id,face:e.makeBaked(d),swap:true})));const sv=createSaver(e,C),cv=document.createElement('canvas');cv.width=800;cv.height=500;
          sv.frame(cv.getContext('2d'),800,500,0,0);return sv.words();}finally{window.Date=RealDate;}}""" % T0, cfg)
        check('The same export in New York shows New York time and date', said == 'It is seven forty seven and fifty nine seconds on Wednesday the twenty eighth of October twenty twenty six', said)
        ny.close()

        # changes: every style draws mid-change
        okc = True
        for style in ['Roll', 'Fade', 'Type', 'Cut']:
            pg.get_by_role('group', name='When a word changes').get_by_role('button', name=style).click(); wait(100)
            if style != 'Cut':
                pg.get_by_role('button', name='Play a change').click(); wait(150)
            okc = okc and len(canvas()) > 5000
        check('Every change style draws (Roll, Fade, Type, Cut)', okc and not errs, '; '.join(errs[:3]))

        # 4. Other fonts mixed into the words (Mixed type is part of In words from 0.3)
        pg.set_input_files('#fontfile', [THIRD])
        for _ in range(30): wait(50); time.sleep(.02)
        pg.evaluate(expand); wait(200)
        pg.get_by_role('group', name='Looks').get_by_role('button', name='Social').click(); wait(300)
        cards = [t.split('\n')[0] for t in pg.locator('section.card:visible h2').all_inner_texts()]
        check('Mixing lives in Fonts: no separate Typefaces card', cards == ['Screensaver', 'Fonts', 'Looks', 'Sentence', 'Type', 'Change', 'Position', 'Colour', 'Export'], json.dumps(cards))
        opts = lambda sel: pg.evaluate("s=>[...document.querySelector(s).options].map(o=>o.text)", sel)
        check('Each part offers the core font, every other font, or Shuffle', opts('#c_ssMTime') == ['Core', 'Poppins Bold', 'Poppins Light Italic', 'Shuffle'], json.dumps(opts('#c_ssMTime')))
        fonts_card = pg.locator('section.card:visible').filter(has=pg.locator('h2', has_text='Fonts'))
        vis = fonts_card.locator('.colour-row:visible label').all_inner_texts()
        check('Only the parts in the sentence get a font (Social has no seconds)', vis == ['It is', 'Time', 'Day', 'Date', 'Month', 'Year'], json.dumps(vis))
        mhtml, mfn = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        mcfg = config(mhtml); M = mcfg['words'].get('mixed') or {}
        ids = {f['id']: f['name'] for f in mcfg['fonts']}
        check('The export carries the mixing and every font', mcfg['show'] == 'words' and ids.get(mcfg['base'].get('baseSlot')) == 'Poppins Regular' and M['parts']['time'] == 'shuffle' and M['parts']['weekday'] == 'shuffle'
              and len(mcfg['fonts']) == 3 and mfn == 'tempo-social-screensaver.html' and not re.search(r'"ss[MN][A-Z]', json.dumps(mcfg['base'])) and mcfg['base'].get('ssMargin') is not None, mfn)
        p3 = ctx.new_page(); e3 = []
        p3.on('pageerror', lambda e: e3.append(str(e)))
        p3.route('**/*', lambda rt: rt.abort() if rt.request.url.startswith('http') else rt.continue_())
        p3.set_content(mhtml.decode()); time.sleep(.6)
        a = p3.evaluate(frame_js, mcfg); b2 = pg.evaluate(frame_js, mcfg)
        check('Exported page with fonts mixed in draws the same frame as Tempo does from that file', a == b2 and len(a) > 5000 and not e3, '; '.join(e3[:3]))
        p3.close()

        def mixed(over, times, W=1680, H=1050, words=None, cfg=None):
            c = json.loads(json.dumps(cfg or mcfg)); c['words']['mixed'].update(over); c['words'].update(words or {})
            return pg.evaluate(MIX, [c, times, W, H])
        name = lambda fid: ids.get(fid, 'core') if fid else 'core'
        t0, t1 = utc(2026, 10, 28, 23, 47, 59), utc(2026, 10, 28, 23, 48, 0)
        r = mixed({}, [t0])[0]
        got = ' '.join(w if f == '' else f'[{w}]' for w, f in r['faces'])
        check('Each part: the shuffled parts take another font, little words stay in the core', got == 'It is [eleven] [forty] [seven] on [Wednesday] the twenty eighth of October twenty twenty six', got)
        r = mixed({}, [t0], words={'secs': True})[0]
        check('Shuffle picks from the other fonts, never the core', all(name(f) in ('core', 'Poppins Bold', 'Poppins Light Italic') for w, f in r['faces']) and any(f for w, f in r['faces']))
        r = mixed({'parts': dict(M['parts'], time='shuffle', weekday='base')}, [t0 + i * 60000 for i in range(8)])
        seq = [next(f for w, f in x['faces'] if f) for x in r]
        check('A shuffled part takes a new font each time its words change, never the same twice running', all(a != b for a, b in zip(seq, seq[1:])), ' → '.join(map(name, seq)))
        r = mixed({'parts': dict(M['parts'], time='shuffle'), 'when': 'hour'}, [t0 + i * 60000 for i in range(5)])
        seq = [next(f for w, f in x['faces'] if f) for x in r]
        check('Every hour: the font holds as the minutes change', len(set(seq[1:])) == 1, ' → '.join(map(name, seq)))
        r = mixed({'mode': 'latest'}, [t0, t1], words={'secs': True})
        got = ' '.join(w if f == '' else f'[{w}]' for w, f in r[1]['faces'])
        check('Latest change: whatever just changed arrives in another font', got.startswith('It is eleven forty [eight] [exactly] on Wednesday'), got)
        r = mixed({'mode': 'one', 'when': 'minute'}, [t0 + i * 60000 for i in range(6)])
        ones = [sorted({w for w, f in x['faces'] if f}) for x in r]
        check('One part at a time: a single part stands out, and it moves on', all(ones) and all(len({f for w, f in x['faces'] if f}) == 1 for x in r) and len({' '.join(o) for o in ones}) > 1
              and all(not (set(o) & {'on', 'the', 'of', 'It', 'is'}) for o in ones), ' / '.join(' '.join(o) for o in ones))
        r = mixed({'each': True, 'parts': {k: 'shuffle' for k in M['parts']}}, [t0])[0]
        check('A font for each word: words within a part can differ', len({f for w, f in r['faces'] if f}) == 2, json.dumps(r['faces']))
        plain_fit = mixed({'parts': {k: 'base' for k in M['parts']}}, [t0])[0]['size']
        wide_fit = mixed({'parts': {k: 'shuffle' for k in M['parts']}}, [t0])[0]['size']
        check('Fit leaves room for the widest font a word could take', wide_fit <= plain_fit + .01, f'{plain_fit:.1f} → {wide_fit:.1f}px')
        nomatch = mixed({'match': False}, [t0])[0]
        check('No overflowing lines with other fonts in', not mixed({}, [t0])[0]['forced'] and not nomatch['forced'])

        # 5. Use as core, and each font's own tracking
        pg.get_by_role('button', name='Use as core – Poppins Bold').click(); wait(300)
        chtml, _ = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        ccfg = config(chtml); bold = next(i for i, n in ids.items() if n == 'Poppins Bold')
        check('Use as core makes that font the core, and it leaves the shuffle',
              ccfg['base']['baseSlot'] == bold and pg.get_by_role('button', name='Use as core – Poppins Regular').get_attribute('aria-pressed') == 'false'
              and pg.get_by_role('switch', name='Shuffle in – Poppins Bold').count() == 0 and pg.get_by_role('switch', name='Shuffle in – Poppins Regular').count() == 1)
        pg.get_by_role('button', name='Use as core – Poppins Regular').click(); wait(300)
        reg = next(i for i, n in ids.items() if n == 'Poppins Regular')
        pg.locator('#trk_' + reg).evaluate("e=>{e.value=120;e.dispatchEvent(new Event('input'))}"); wait(300)
        thtml, _ = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        tcfg = config(thtml)
        loose = mixed({'parts': {k: 'base' for k in M['parts']}}, [t0], cfg=tcfg)[0]['size']
        check('A font\'s own tracking goes into the export and spaces it out (Fit sets it smaller)', tcfg['tracks'].get(reg) == 120 and loose < plain_fit - .5, f'{plain_fit:.1f} → {loose:.1f}px')
        pg.reload(); wait(1500); pg.evaluate(expand); wait(200)
        check('Each font remembers its tracking', pg.locator('#trk_' + reg).input_value() == '120')
        pg.locator('#trk_' + reg).evaluate("e=>{e.value=0;e.dispatchEvent(new Event('input'))}"); wait(300)

        # 6. The time: a font for each numeral
        pg.get_by_role('group', name='Show').get_by_role('button', name='The time').click(); wait(300)
        nlab = fonts_card.locator('.colour-row:visible label').all_inner_texts()
        check('The time: each numeral gets a font', nlab == ['Hours, tens', 'Hours, units', 'Minutes, tens', 'Minutes, units'], json.dumps(nlab))
        pg.get_by_role('switch', name='Seconds').click(); pg.get_by_role('group', name='Second line').get_by_role('button', name='Weekday').click(); wait(200)
        nlab = fonts_card.locator('.colour-row:visible label').all_inner_texts()
        check('Seconds and the second line join in when they\'re on', nlab[-3:] == ['Seconds, tens', 'Seconds, units', 'Second line'], json.dumps(nlab))
        pg.get_by_role('switch', name='Seconds').click(); pg.get_by_role('group', name='Second line').get_by_role('button', name='None').click()
        pg.select_option('#c_ssNH2', label='Poppins Bold'); pg.select_option('#c_ssNM2', label='Shuffle'); wait(300)
        khtml, kfn = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        kcfg = config(khtml); N = kcfg['clock']['mixed']
        check('The clock export carries each numeral\'s font', N['parts']['h2'] == bold and N['parts']['m2'] == 'shuffle' and N['parts']['h1'] == 'base' and 'words' not in kcfg)
        def clock(over, times, cfg=None):
            c = json.loads(json.dumps(cfg or kcfg)); c['clock']['mixed'].update(over)
            return pg.evaluate(CLK, [c, times, 1680, 1050])
        r = clock({}, [t0 + i * 60000 for i in range(8)])
        h2 = [x['l0'][1] for x in r]; m2 = [x['l0'][4] for x in r]
        check('Hours (units) holds its font; Minutes (units) shuffles to a new one each minute', all(f == bold for f in h2) and all(f for f in m2) and all(a != b for a, b in zip(m2, m2[1:]))
              and all(x['l0'][0] is None and x['l0'][3] is None for x in r), ' → '.join(map(name, m2)))
        r = clock({'mode': 'latest'}, [t0, t1])
        check('Latest change: the numerals that just changed come in another font', [i for i, f in enumerate(r[1]['l0']) if f] == [4] and r[1]['text'] == '23,48', json.dumps(r[1]))
        r = clock({'mode': 'one', 'when': 'minute'}, [t0 + i * 60000 for i in range(6)])
        lit = [[i for i, f in enumerate(x['l0']) if f] for x in r]
        check('One at a time: a single numeral stands out, and it moves on', all(len(x) == 1 for x in lit) and all(a != b for a, b in zip(lit, lit[1:])), json.dumps(lit))
        p3 = ctx.new_page(); e3 = []
        p3.on('pageerror', lambda e: e3.append(str(e)))
        p3.route('**/*', lambda rt: rt.abort() if rt.request.url.startswith('http') else rt.continue_())
        p3.set_content(khtml.decode()); time.sleep(.6)
        a = p3.evaluate(frame_js, kcfg); b2 = pg.evaluate(frame_js, kcfg)
        plain = dict(kcfg); plain['clock'] = dict(kcfg['clock'], mixed=dict(N, parts={k: 'base' for k in N['parts']}))
        check('Exported clock page draws the same frame as Tempo does, and the numerals\' fonts show', a == b2 and len(a) > 5000 and not e3 and a != pg.evaluate(frame_js, plain), '; '.join(e3[:3]))
        p3.close()
        check('Exports bake digits in every font', all(all(d in f['cmap'] for d in '0123456789') for f in kcfg['fonts']))

        # 7. Settings saved by Tempo 0.2 carry over
        def reopen(settings):
            pg.evaluate("s=>{localStorage.setItem('tempo:settings',JSON.stringify(s))}", settings); pg.reload(); wait(1500); pg.evaluate(expand); wait(200)
            pressed = pg.get_by_role('group', name='Show').locator('button[aria-pressed=true]').all_inner_texts()
            return pressed, json.loads(pg.evaluate("localStorage.getItem('tempo:settings')") or '{}')
        wait(400)
        pressed, st = reopen({'ssShow': 'mixed', 'ssMBase': bold, 'ssMTime': 'shuffle', 'ssMMode': 'parts', 'ssWHi': 'time'})
        wait(400); st = json.loads(pg.evaluate("localStorage.getItem('tempo:settings')") or '{}')
        check('0.2 Mixed type opens as In words, its base face as the core, its parts as they were', pressed == ['In words'] and pg.get_by_role('button', name='Use as core – Poppins Bold').get_attribute('aria-pressed') == 'true'
              and pg.locator('#c_ssMTime').input_value() == 'shuffle', json.dumps(pressed))
        pressed, _ = reopen({'ssShow': 'words', 'ssWHiFace': bold, 'ssWHi': 'time', 'ssMTime': 'shuffle', 'baseSlot': reg})
        check("0.2 In words with a highlight style: the time takes that font, nothing shuffles", pressed == ['In words'] and pg.locator('#c_ssMTime').input_value() == bold
              and pg.locator('#c_ssMWeekday').input_value() == 'base')
        pressed, _ = reopen({'ssShow': 'words', 'ssMTime': 'shuffle', 'baseSlot': reg})
        check('0.2 plain In words stays plain', pressed == ['In words'] and pg.locator('#c_ssMTime').input_value() == 'base')
        pressed, _ = reopen({'ssShow': 'looks', 'ssLine2': 'text', 'baseSlot': reg})
        check('0.2 Saved looks opens on The time; a Rubato-text second line becomes none', pressed == ['The time'] and pg.get_by_role('group', name='Second line').locator('button[aria-pressed=true]').all_inner_texts() == ['None'])
        pressed, _ = reopen({'ssVer': 3, 'ssShow': 'words', 'ssWNum': 'figures', 'baseSlot': reg})
        check('0.3 numbers in figures carry over to every part', [pg.get_by_role('group', name=g).locator('button[aria-pressed=true]').all_inner_texts() for g in ['Time', 'Date', 'Year']] == [['Figures']] * 3)

        # 8. Tempo 0.4: the font library – packs, duplicates, on and off, built-in fonts
        import tempfile
        zp = os.path.join(tempfile.mkdtemp(), 'pack.zip')
        with zipfile.ZipFile(zp, 'w') as z:
            z.write(f'{FONTS}/Poppins-Medium.ttf', 'Pack/Poppins-Medium.ttf')
            z.write(f'{FONTS}/Poppins-Medium.ttf', 'Pack/Poppins-Medium copy.ttf')
            z.write(f'{FONTS}/Poppins-Light.ttf', 'Pack/Poppins-Light.ttf')
            z.writestr('__MACOSX/Pack/._Poppins-Light.ttf', b'\x00\x05\x16\x07junk')
            z.writestr('Pack/Old Mac bitmap', b'')
            z.writestr('Pack/tempo-fonts.json', json.dumps({'fonts': [{'file': 'Poppins-Medium.ttf', 'tracking': 25}, {'file': 'Poppins-Light.ttf', 'on': False}]}))
        pg.set_input_files('#fontfile', [zp])
        for _ in range(40): wait(50); time.sleep(.02)
        toast = pg.locator('#toast').inner_text()
        rows = dict(pg.evaluate("[...document.querySelectorAll('.font-list .slot')].map(r=>[r.querySelector('.slot-name').innerText,r.querySelector('.slot-meta').innerText])"))
        check('A .zip of fonts loads; duplicates and Mac leftovers are skipped and counted', toast == '2 fonts added – skipped 1 already loaded, 1 with no outlines to use'
              and 'Poppins Medium' in rows and 'Poppins Light' in rows and len(rows) == 5, toast + ' | ' + json.dumps(list(rows)))
        check("The pack's settings apply: a font starts off, another with its tracking", rows.get('Poppins Light') == 'Off' and 'tracking +25' in rows.get('Poppins Medium', ''), json.dumps(rows))
        check('The list runs core first, then on, then off', list(rows)[0] == 'Poppins Regular' and list(rows)[-1] == 'Poppins Light', json.dumps(list(rows)))
        pg.get_by_role('group', name='Show').get_by_role('button', name='The time').click(); wait(200)
        k2, _ = download(lambda: pg.get_by_role('button', name='Download HTML file').click()); k2 = config(k2)
        check('A font switched off stays out of the export', sorted(f['name'] for f in k2['fonts']) == ['Poppins Bold', 'Poppins Light Italic', 'Poppins Medium', 'Poppins Regular'])
        pg.get_by_role('switch', name='On – Poppins Light', exact=True).click(); wait(400)
        on_now = pg.get_by_role('switch', name='On – Poppins Light', exact=True).get_attribute('aria-checked')
        pg.get_by_role('switch', name='On – Poppins Light', exact=True).click(); wait(400)
        check('On and off with one click, kept in the list', on_now == 'true' and pg.get_by_role('switch', name='On – Poppins Light', exact=True).get_attribute('aria-checked') == 'false')
        # in turn, and a few at random
        ids2 = {f['id']: f['name'] for f in k2['fonts']}
        pool = [f['id'] for f in k2['fonts'] if f.get('swap', True) and f['id'] != k2['base']['baseSlot']]
        m2only = {k: 'base' for k in k2['clock']['mixed']['parts']}; m2only['m2'] = 'shuffle'
        r = clock({'order': 'turn', 'mode': 'parts', 'parts': m2only}, [t0 + i * 60000 for i in range(7)], cfg=k2)
        seq = [x['l0'][4] for x in r]
        check('In turn: the fonts come round in order', len(pool) == 3 and all(pool.index(b) == (pool.index(a) + 1) % 3 for a, b in zip(seq, seq[1:])), ' → '.join(ids2.get(f, '?') for f in seq))
        r = clock({'mode': 'some', 'amount': 1}, [t0, t1], cfg=k2)
        check('A few at random, at All: every numeral comes in another font', all(f for f in r[0]['l0'][:2] + r[0]['l0'][3:]) and r[1]['l0'][4], json.dumps(r[0]['l0']))
        r = clock({'mode': 'some', 'amount': .05}, [t0 + i * 60000 for i in range(12)], cfg=k2)
        lit = sum(1 for x in r for f in x['l0'] if f)
        check('A few at random, at the odd one: most numerals stay in the core font', lit <= 8, f'{lit} of {12 * 4} numerals in another font')
        r = mixed({'mode': 'some', 'amount': 1}, [t0])[0]
        got = ' '.join(w if f == '' else f'[{w}]' for w, f in r['faces'])
        check('Words, a few at random at All: every part but the little words comes in another font', got == 'It is [eleven] [forty] [seven] on [Wednesday] the [twenty] [eighth] of [October] [twenty] [twenty] [six]', got)
        # folds inside the cards remember being shut
        pg.get_by_role('group', name='Show').get_by_role('button', name='In words').click(); wait(200)
        pg.locator('button.fold-head', has_text='Spacing').click(); wait(200)
        shut = pg.locator('#c_ssWLeading').is_hidden()
        pg.reload(); wait(1500); pg.evaluate(expand); wait(200)
        check('A fold inside a card shuts, and stays shut after a reload', shut and pg.locator('#c_ssWLeading').is_hidden())
        pg.locator('button.fold-head', has_text='Spacing').click(); wait(200)
        # built-in fonts (tempo/fonts/fonts.json): on the first time, switchable, never loaded twice
        bi = b.new_context(viewport={'width': 1440, 'height': 960}, screen={'width': 1680, 'height': 1050}); pb = bi.new_page(); eb = []
        pb.on('pageerror', lambda e: eb.append(str(e)))
        pb.route('**/opentype.min.js', lambda r: r.fulfill(body=ot, content_type='application/javascript'))
        pb.route('**/tempo/fonts/fonts.json', lambda r: r.fulfill(body=json.dumps({'fonts': [{'file': 'Poppins-Regular.ttf', 'name': 'Poppins Regular', 'core': True},
            {'file': 'Poppins-Bold.ttf', 'name': 'Poppins Bold', 'on': False}]}), content_type='application/json'))
        pb.route('**/tempo/fonts/Poppins-*.ttf', lambda r: r.fulfill(body=open(f"{FONTS}/{r.request.url.split('/')[-1]}", 'rb').read(), content_type='font/ttf'))
        rowsJS = "[...document.querySelectorAll('.font-list .slot')].map(r=>[r.querySelector('.slot-name').innerText,r.querySelector('.slot-meta').innerText])"
        def settle(want):
            for _ in range(40):
                got = dict(pb.evaluate(rowsJS))
                if got == want: break
                time.sleep(.25)
            time.sleep(.6); return dict(pb.evaluate(rowsJS))
        pb.goto(base + 'docs/tempo/'); time.sleep(1); pb.evaluate("localStorage.clear();indexedDB.deleteDatabase('tempo');indexedDB.deleteDatabase('rubato')"); pb.reload()
        brows = settle({'Poppins Regular': 'Core', 'Poppins Bold': 'Built in · off'})
        check('Built-in fonts: those marked on load the first time, the rest wait, switched off', brows == {'Poppins Regular': 'Core', 'Poppins Bold': 'Built in · off'}, json.dumps(brows))
        pb.get_by_role('switch', name='On – Poppins Bold').click(); settle({'Poppins Regular': 'Core', 'Poppins Bold': 'In the mix'})
        pb.reload(); brows = settle({'Poppins Regular': 'Core', 'Poppins Bold': 'In the mix'})
        check('…switched on with one click, and not loaded again on the next visit', brows == {'Poppins Regular': 'Core', 'Poppins Bold': 'In the mix'} and not eb, json.dumps(brows) + '; '.join(eb[:2]))
        bi.close()
        check('No page errors', not errs, '; '.join(errs[:3]))
        b.close()
    failed = [r for r in results if not r[0]]
    print(f'\n{len(results) - len(failed)} of {len(results)} checks pass.')
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()

"""Checks for what's new in Tempo 0.2: the time in words, its looks and
typesetting, the preview shape buttons, and "Tempo" (not "Rubato") in
everything it exports.

    python3 tests/tempo_check.py

Same requirements as parity.py. The clock is pinned, so the words are known.
"""
import base64, calendar, io, json, os, random, re, sys, time, zipfile
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start
from parity import POP, OPENTYPE

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
utc = lambda y, mo, d, hh, mm, ss: calendar.timegm((y, mo, d, hh, mm, ss, 0, 0, 0)) * 1000  # London is on GMT for every date used here

def main():
    base = start()
    ot = open(OPENTYPE).read()
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1440, 'height': 960}, accept_downloads=True, timezone_id='Europe/London')
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
        pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('rubato')"); pg.reload(); wait(1000)
        pg.evaluate(expand)

        # 1. Preview shape buttons follow the click
        shapes = pg.locator('#shapes'); ok = True
        for name in ['Display', 'Portrait', 'Laptop']:
            shapes.get_by_role('button', name=name).click(); wait(200)
            ok = ok and shapes.locator('button[aria-pressed=true]').all_inner_texts() == [name]
        check('Preview shape highlight follows the click', ok)

        # 2. Clock exports say Tempo, without a font loaded, and are named as before
        html, _ = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        h = html.decode()
        check('HTML export uses window.__TEMPO__', 'window.__TEMPO__=' in h and '__RUBATO__' not in h)
        check('No-font export is titled Tempo', '<title>Tempo – screensaver</title>' in h, re.search('<title>.*?</title>', h).group(0))
        ccfg = config(html)
        check('Clock exports carry no words settings or export name', 'words' not in ccfg and ccfg['show'] == 'clock' and 'ssName' not in json.dumps(ccfg) and 'ssW' not in json.dumps(ccfg))
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
        check('In words shows its own cards', cards == ['Fonts', 'Screensaver', 'Looks', 'Sentence', 'Type', 'Change', 'Position', 'Colour', 'Export'], json.dumps(cards))
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
        cases = [
            ((2026, 10, 28, 23, 47, 59), {}, 'It is eleven forty seven and fifty nine seconds on Wednesday the twenty eighth of October twenty twenty six'),
            ((2026, 10, 29, 0, 0, 0), {}, 'It is midnight exactly on Thursday the twenty ninth of October twenty twenty six'),
            ((2026, 11, 1, 12, 0, 1), {}, 'It is midday and one second on Sunday the first of November twenty twenty six'),
            ((2026, 11, 3, 9, 5, 0), {'secs': False}, 'It is nine oh five on Tuesday the third of November twenty twenty six'),
            ((2026, 11, 3, 9, 0, 0), dict(OFF, secs=False, stop=True), 'It is nine o’clock.'),
            ((2026, 11, 3, 9, 5, 7), dict(OFF, h24=True, weekday=True), 'It is oh nine oh five and seven seconds on Tuesday'),
            ((2026, 11, 3, 0, 0, 0), dict(OFF, h24=True, secs=False), 'It is zero hundred'),
            ((2026, 11, 3, 21, 40, 2), {'num': 'figures'}, 'It is 9.40pm and 2 seconds on Tuesday 3 November 2026'),
            ((2026, 11, 3, 21, 40, 2), {'num': 'figures', 'h24': True, 'sep': 'colon', 'lead': False, 'secs': False}, '21:40 on Tuesday 3 November 2026'),
            ((2026, 11, 3, 21, 40, 2), {'case': 'lower', 'secs': False}, 'it is nine forty on tuesday the third of november twenty twenty six'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, case='upper', secs=False, weekday=True), 'IT IS NINE FORTY ON TUESDAY'),
            ((2026, 12, 31, 23, 59, 59), {}, 'It is eleven fifty nine and fifty nine seconds on Thursday the thirty first of December twenty twenty six'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, month=True), 'It is nine forty in November'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, weekday=True, month=True), 'It is nine forty on Tuesday in November'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, year=True), 'It is nine forty in twenty twenty six'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, daynum=True, num='figures'), 'It is 9.40pm on the 3rd'),
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
                 'num': rng.choice(['words', 'figures']), 'layout': rng.choice(['para', 'stack'])}
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

        # looks
        okl = True; seen = set()
        for name in ['Stack', 'Poster', 'Night', 'Typewriter', 'Hours', 'Reference']:
            pg.get_by_role('group', name='Looks').get_by_role('button', name=name).click(); wait(250)
            okl = okl and pg.get_by_role('group', name='Looks').locator('button[aria-pressed=true]').all_inner_texts() == [name]
            seen.add(canvas())
        check('Each look applies and shows as chosen', okl)
        check('Each look draws differently', len(seen) == 6, f'{len(seen)} different frames')
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
        styles = pg.get_by_role('group', name='Highlight style').get_by_role('button').all_inner_texts()
        check('Highlight style lists the loaded styles', styles == ['Same style', 'Poppins Regular', 'Poppins Bold'], json.dumps(styles))
        pg.get_by_role('group', name='Highlight style').get_by_role('button', name='Poppins Bold').click(); wait(300)
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
        check('Highlight style is carried into the export', cfg['words']['hiFace'] in [f['id'] for f in cfg['fonts']] and len(cfg['fonts']) == 2)
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
        check('No page errors', not errs, '; '.join(errs[:3]))
        b.close()
    failed = [r for r in results if not r[0]]
    print(f'\n{len(results) - len(failed)} of {len(results)} checks pass.')
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()

"""Checks for what's new in Tempo 0.2: the time in words, the preview shape
buttons, and "Tempo" (not "Rubato") in everything it exports.

    python3 tests/tempo_check.py

Same requirements as parity.py. The clock is pinned, so the words are known.
"""
import base64, calendar, io, json, os, re, sys, time, zipfile
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start
from parity import POP, OPENTYPE

T0 = 1793231279000  # Wed 28 Oct 2026 23:47:59 in London (GMT)
results = []
def check(name, ok, detail=''):
    results.append((ok, name, detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f' – {detail}' if detail else ''))

# the sentence the saver builds for a given moment and options, read from the page itself
SAY = """([ms,o])=>{const C=Object.assign({},window.__cfg,{show:'words',words:Object.assign({},window.__cfg.words,o)});
  const W=C.words,wx=window.__tempoWx||(window.__tempoWx={});for(const k in wx)delete wx[k];
  if(o.wx)wx[W.place.lat.toFixed(2)+','+W.place.lon.toFixed(2)+','+W.unit]={tried:ms,data:Object.assign({at:ms},o.wx)};
  const RealDate=Date;let out='';const D=function(...a){return a.length?new RealDate(...a):new RealDate(ms)};D.now=()=>ms;D.prototype=RealDate.prototype;
  window.Date=D;try{const e=createEngine();const sv=createSaver(e,C);const cv=document.createElement('canvas');cv.width=1680;cv.height=1050;
  sv.frame(cv.getContext('2d'),1680,1050,0,0);out=sv.words();}finally{window.Date=RealDate;}return out;}"""

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
        def download(click):
            with pg.expect_download(timeout=120000) as d:
                click()
                t = time.time()
                while not d.is_done() and time.time() - t < 120:
                    wait(50)
            return open(d.value.path(), 'rb').read(), d.value.suggested_filename
        expand = "document.querySelectorAll('section.card.collapsed .card-toggle').forEach(b=>b.click())"

        pg.goto(base + 'docs/tempo/'); wait(800)
        pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('rubato')"); pg.reload(); wait(1000)
        pg.evaluate(expand)

        # 1. Preview shape buttons follow the click (fixed in 0.2)
        shapes = pg.locator('#shapes')
        ok = True
        for name in ['Display', 'Portrait', 'Laptop']:
            shapes.get_by_role('button', name=name).click(); wait(200)
            ok = ok and shapes.locator('button[aria-pressed=true]').all_inner_texts() == [name]
        check('Preview shape highlight follows the click', ok)
        dims = pg.locator('#dims').inner_text()
        check('Preview size matches the highlighted shape', '1680 × 1050' in dims, dims)

        # 2. Clock mode exports say Tempo, without a font loaded
        html, fname = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        h = html.decode()
        check('HTML export uses window.__TEMPO__', 'window.__TEMPO__=' in h and '__RUBATO__' not in h)
        check('No-font export is titled Tempo', '<title>Tempo – screensaver</title>' in h, re.search('<title>.*?</title>', h).group(0))
        mac, mname = download(lambda: pg.get_by_role('button', name='Download for Mac').click())
        zm = zipfile.ZipFile(io.BytesIO(mac))
        readme = zm.read('Read me first.txt').decode()
        check('Mac export is named Tempo with no font', mname == 'Tempo screen saver for Mac.zip' and any(n.startswith('Tempo.saver/') for n in zm.namelist()), mname)
        check('Mac read-me says Made with Tempo', 'Made with Tempo by Ensemble' in readme and 'Rubato' not in readme)
        win, wname = download(lambda: pg.get_by_role('button', name='Download for Windows').click())
        zw = zipfile.ZipFile(io.BytesIO(win))
        scr = zw.read('Tempo.scr') if 'Tempo.scr' in zw.namelist() else b''
        wread = zw.read('Read me first.txt').decode()
        check('Windows export is named Tempo with no font', wname == 'Tempo screen saver for Windows.zip' and bool(scr), json.dumps(zw.namelist()))
        check('Windows read-me says Made with Tempo', 'Made with Tempo by Ensemble' in wread and 'Rubato' not in wread)
        u16 = lambda s: s.encode('utf-16-le')
        check('Windows host says Tempo, not Rubato', u16('Tempo Screen Savers') in scr and u16('Made with Tempo') in scr and u16('Rubato') not in scr)

        # 3. The time in words
        pg.get_by_role('group', name='Show').get_by_role('button', name='In words').click(); wait(400)
        cards = [t.split('\n')[0] for t in pg.locator('section.card:visible h2').all_inner_texts()]
        check('In words shows its own cards', cards == ['Fonts', 'Screensaver', 'Sentence', 'Type', 'Change', 'Position', 'Colour', 'Export'], json.dumps(cards))
        own = json.loads(pg.evaluate("localStorage.getItem('tempo:settings')") or '{}')
        check("Words settings live in Tempo's own storage", own.get('ssShow') == 'words' and 'ssWCase' in own and not any(k.startswith('ssW') for k in json.loads(pg.evaluate("localStorage.getItem('rubato:settings')") or '{}')))

        # the sentence itself, at fixed moments
        whtml, _ = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        cfg = json.loads(whtml.decode().split('window.__TEMPO__=')[1].split(';</script>')[0].replace('\\u003c', '<'))
        check('Words export carries the words settings and themes', cfg.get('show') == 'words' and cfg['words']['case'] == 'sentence' and len(cfg['words']['themes']) >= 4)
        pg.evaluate("c=>{window.__cfg=c}", cfg)
        ms = lambda y, mo, d, hh, mm, ss: calendar.timegm((y, mo, d, hh, mm, ss, 0, 0, 0)) * 1000  # London is on GMT for all these dates
        OFF = {'weekday': False, 'daynum': False, 'month': False, 'year': False}
        MAN = {'name': 'Manchester', 'lat': 53.4808, 'lon': -2.2426, 'tz': 'Europe/London'}
        TOK = {'name': 'Tokyo', 'lat': 35.6895, 'lon': 139.6917, 'tz': 'Asia/Tokyo'}
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
            # parts switched on and off: the grammar closes up
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, month=True), 'It is nine forty in November'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, weekday=True, month=True), 'It is nine forty on Tuesday in November'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, year=True), 'It is nine forty in twenty twenty six'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, daynum=True, num='figures'), 'It is 9.40pm on the 3rd'),
            ((2026, 11, 3, 21, 40, 2), {'time': False}, 'It is Tuesday the third of November twenty twenty six'),
            ((2026, 11, 3, 21, 40, 2), {'time': False, 'lead': False, 'weekday': False}, 'The third of November twenty twenty six'),
            # place, and the place's own time zone
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, inPlace=True, place=MAN), 'It is nine forty in Manchester'),
            ((2026, 10, 28, 23, 47, 59), {'inPlace': True, 'place': TOK}, 'It is eight forty seven and fifty nine seconds on Thursday the twenty ninth of October twenty twenty six in Tokyo'),
            ((2026, 11, 3, 21, 40, 2), dict(OFF, secs=False, inPlace=True, place=dict(MAN, name='Northern Quarter')), 'It is nine forty in Northern Quarter'),
            # sunrise and sunset, tense following the sun
            ((2026, 10, 28, 12, 0, 0), dict(OFF, secs=False, sun=True, place=MAN), 'It is midday. The sun rose at seven o’clock and sets at four forty four'),
            ((2026, 10, 28, 5, 30, 0), dict(OFF, secs=False, sun=True, place=MAN), 'It is five thirty. The sun rises at seven o’clock and sets at four forty four'),
            ((2026, 10, 28, 23, 47, 59), dict(OFF, time=False, sun=True, place=MAN, stop=True), 'The sun set at four forty four and rises at seven oh two.'),
            ((2026, 10, 28, 12, 0, 0), dict(OFF, secs=False, sun=True, place=MAN, num='figures', h24=True), 'It is 12.00. The sun rose at 07.00 and sets at 16.44'),
            ((2026, 10, 28, 23, 47, 59), dict(OFF, secs=False, sun=True, inPlace=True, place=TOK), 'It is eight forty seven in Tokyo. The sun rose at six o’clock and sets at four fifty'),
            # weather
            ((2026, 10, 28, 12, 0, 0), dict(OFF, secs=False, weather=True, place=MAN, wx={'t': 11.4, 'code': 3, 'day': 1}), 'It is midday. Eleven degrees and grey skies'),
            ((2026, 10, 28, 12, 0, 0), dict(OFF, time=False, weather=True, place=MAN, wx={'t': -2.6, 'code': 71, 'day': 1}, stop=True), 'Minus three degrees and light snow.'),
            ((2026, 10, 28, 12, 0, 0), dict(OFF, time=False, weather=True, place=MAN, num='figures', wx={'t': 0.6, 'code': 0, 'day': 1}), '1°C and sunshine'),
            ((2026, 10, 28, 12, 0, 0), dict(OFF, time=False, weather=True, place=MAN, num='figures', case='lower', wx={'t': 0.6, 'code': 0, 'day': 1}), '1°C and sunshine'),
            ((2026, 10, 28, 23, 0, 0), dict(OFF, time=False, weather=True, place=MAN, unit='F', wx={'t': 52.2, 'code': 61, 'day': 0}), 'Fifty two degrees and light rain'),
            ((2026, 10, 28, 12, 0, 0), dict(OFF, time=False, weather=True, place=MAN, wx={'t': 11.4, 'code': 3, 'day': 1, 'at': calendar.timegm((2026, 10, 28, 8, 0, 0, 0, 0, 0)) * 1000}), ''),
        ]
        bad = []
        for when, o, want in cases:
            got = pg.evaluate(SAY, [ms(*when), o])
            if got != want:
                bad.append(f'{when}: got “{got}”')
        check(f'Sentences read correctly ({len(cases)} cases, incl. parts on and off, place, sun, weather, stale weather dropped)', not bad, '; '.join(bad))

        # preview draws, and the exported page draws the same frame
        pg.locator('#c_ssDrift').evaluate("e=>{e.value=0;e.dispatchEvent(new Event('input'))}"); wait(300)
        pg.get_by_role('group', name='Sentence parts').get_by_role('button', name='Seconds').click(); wait(1500)
        prev = pg.evaluate("document.querySelector('#cv').toDataURL('image/png')")
        whtml, _ = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        p2 = ctx.new_page(); e2 = []
        p2.on('pageerror', lambda e: e2.append(str(e)))
        p2.route('**/*', lambda rt: rt.abort() if rt.request.url.startswith('http') else rt.continue_())
        p2.set_content(whtml.decode()); time.sleep(1.2)
        pv = pg.evaluate("""()=>{const cv=document.createElement('canvas');cv.width=1680;cv.height=1050;return cv.toDataURL('image/png')}""")
        check('Words preview draws something', prev != pv)
        check('Exported words page runs offline without errors', not e2, '; '.join(e2[:3]))

        # with real fonts: baked outlines must draw exactly what the live fonts draw
        pg.set_input_files('#fontfile', POP)
        for _ in range(30): wait(50); time.sleep(.02)
        pg.evaluate(expand); wait(200)
        styles = pg.get_by_role('group', name='Highlight style').get_by_role('button').all_inner_texts()
        check('Highlight style lists the loaded styles', styles == ['Same style', 'Poppins Regular', 'Poppins Bold'], json.dumps(styles))
        pg.get_by_role('group', name='Highlight style').get_by_role('button', name='Poppins Bold').click(); wait(300)
        whtml, wfn = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        cfg = json.loads(whtml.decode().split('window.__TEMPO__=')[1].split(';</script>')[0].replace('\\u003c', '<'))
        p3 = ctx.new_page(); e3 = []
        p3.on('pageerror', lambda e: e3.append(str(e)))
        p3.route('**/*', lambda rt: rt.abort() if rt.request.url.startswith('http') else rt.continue_())
        p3.set_content(whtml.decode()); time.sleep(.6)
        frame_js = """(C)=>{const RealDate=Date;const ms=%d;const D=function(...a){return a.length?new RealDate(...a):new RealDate(ms)};D.now=()=>ms;D.prototype=RealDate.prototype;window.Date=D;
          try{const e=createEngine();e.setFaces(C.fonts.map(d=>({id:d.id,face:e.makeBaked(d),swap:d.swap!==false})));const cv=document.createElement('canvas');cv.width=1680;cv.height=1050;
          createSaver(e,C).frame(cv.getContext('2d'),1680,1050,0,0);return cv.toDataURL('image/png');}finally{window.Date=RealDate;}}""" % T0
        a = p3.evaluate(frame_js, cfg)
        # same config, same baked fonts, drawn in Tempo itself
        b2 = pg.evaluate(frame_js, cfg)
        check('Exported words page draws the same frame as Tempo does from that file', a == b2 and len(a) > 5000)
        check('Exported words page with fonts runs without errors', not e3, '; '.join(e3[:3]))
        check('Words export bakes every letter it can need', all(ch in cfg['fonts'][0]['cmap'] for ch in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:'))
        check('Highlight style is carried into the export', cfg['words']['hiFace'] in [f['id'] for f in cfg['fonts']] and len(cfg['fonts']) == 2)

        # place search, the Place card, and live weather in an export (both services mocked)
        GEO = {'results': [{'name': 'Leeds', 'latitude': 53.79648, 'longitude': -1.54785, 'country': 'United Kingdom', 'admin1': 'England', 'timezone': 'Europe/London'}]}
        FC = {'current': {'time': '2026-10-28T23:45', 'temperature_2m': 9.6, 'weather_code': 63, 'is_day': 0}}
        hits = []
        def geo(rt): hits.append(rt.request.url); rt.fulfill(json=GEO)
        def fc(rt): hits.append(rt.request.url); rt.fulfill(json=FC, headers={'Access-Control-Allow-Origin': '*'})
        ctx.route('https://geocoding-api.open-meteo.com/**', geo)
        ctx.route('https://api.open-meteo.com/**', fc)
        check('Place card hidden until a part needs it', pg.locator('section.card:visible h2').filter(has_text='Place').count() == 0)
        parts = pg.get_by_role('group', name='Sentence parts')
        parts.get_by_role('button', name='Place').click(); wait(200)
        check('Place card appears when Place is on', pg.locator('section.card:visible h2').filter(has_text='Place').count() == 1)
        pg.get_by_label('Search for a town or city').fill('Leeds'); pg.get_by_label('Search for a town or city').press('Enter')
        for _ in range(20):
            wait(50); time.sleep(.03)
            if pg.get_by_role('button', name='Leeds, England, United Kingdom').count(): break
        pg.get_by_role('button', name='Leeds, England, United Kingdom').click(); wait(500)
        own = json.loads(pg.evaluate("localStorage.getItem('tempo:settings')") or '{}')
        check('Choosing a search result sets the place', pg.locator('#c_ssWPlaceName').input_value() == 'Leeds' and abs(own.get('ssWLat', 0) - 53.79648) < 1e-4 and own.get('ssWTz') == 'Europe/London',
              f"{own.get('ssWPlaceName')} {own.get('ssWLat')} {own.get('ssWTz')}")
        pg.locator('#c_ssWPlaceName').fill('the Northern Quarter'); wait(500)
        parts.get_by_role('button', name='Weather').click(); parts.get_by_role('button', name='Sunrise and sunset').click(); wait(300)
        whtml, _ = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        wcfg = json.loads(whtml.decode().split('window.__TEMPO__=')[1].split(';</script>')[0].replace('\\u003c', '<'))
        check('Export carries the place, sun and weather settings', wcfg['words']['inPlace'] and wcfg['words']['sun'] and wcfg['words']['weather'] and wcfg['words']['place']['name'] == 'the Northern Quarter')
        p4 = ctx.new_page(); e4 = []
        p4.on('pageerror', lambda e: e4.append(str(e)))
        p4.set_content(whtml.decode()); time.sleep(.4)
        # the page's clock is paused by the test, so drive frames from here while the (mocked) fetch lands
        p4.evaluate("""(C)=>{const e=createEngine();e.setFaces(C.fonts.map(d=>({id:d.id,face:e.makeBaked(d),swap:true})));
          window.__sv=createSaver(e,C);const cv=document.createElement('canvas');cv.width=1680;cv.height=1050;window.__x=cv.getContext('2d');}""", wcfg)
        said = ''
        for _ in range(40):
            said = p4.evaluate("()=>{window.__sv.frame(window.__x,1680,1050,performance.now(),16);return window.__sv.words();}")
            if 'rain' in said: break
            time.sleep(.05)
        check('Exported page fetches the weather itself and says it', 'Ten degrees and rain' in said and 'in the Northern Quarter' in said and 'The sun' in said, said)
        check('Weather request is for the chosen place, in Celsius', any('latitude=53.796&longitude=-1.548' in h and 'temperature_unit' not in h for h in hits), '; '.join(h for h in hits if 'forecast' in h)[:160])
        check('Exported page with weather runs without errors', not e4, '; '.join(e4[:3]))
        p4.close()

        # changes: every style draws mid-change without errors
        okc = True
        for style in ['Roll', 'Fade', 'Type', 'Cut']:
            pg.get_by_role('group', name='When a word changes').get_by_role('button', name=style).click(); wait(100)
            if style != 'Cut':
                pg.get_by_role('button', name='Play a change').click(); wait(150)
            okc = okc and len(canvas()) > 5000
        check('Every change style draws (Roll, Fade, Type, Cut)', okc and not errs, '; '.join(errs[:3]))

        # back to the clock: words settings don't leak into clock exports
        pg.get_by_role('group', name='Show').get_by_role('button', name='The time').click(); wait(300)
        chtml, _ = download(lambda: pg.get_by_role('button', name='Download HTML file').click())
        ccfg = json.loads(chtml.decode().split('window.__TEMPO__=')[1].split(';</script>')[0].replace('\\u003c', '<'))
        check('Clock exports carry no words settings', 'words' not in ccfg and ccfg['show'] == 'clock')
        check('No page errors', not errs, '; '.join(errs[:3]))
        b.close()
    failed = [r for r in results if not r[0]]
    print(f'\n{len(results) - len(failed)} of {len(results)} checks pass.')
    sys.exit(1 if failed else 0)

if __name__ == '__main__':
    main()

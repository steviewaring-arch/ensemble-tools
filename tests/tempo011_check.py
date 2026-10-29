"""Checks for Tempo 0.11: Orbit and Tuner, the two type faces from the concept canvas.

Orbit – Rings' words run round each ring like a line of type, the ones true now
standing in a column at twelve o'clock. Tuner – the hours, minutes and seconds as
scales sliding under a needle that stays still.

    python3 tests/tempo011_check.py

Same requirements as parity.py.
"""
import json, os, sys, time, calendar
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start
from parity import OPENTYPE
from ui_helpers import btn, sheet

results = []
def check(name, ok, detail=''):
    results.append((ok, name, detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f' – {detail}' if detail else ''))

loc = lambda y, mo, d, hh, mm, ss: calendar.timegm((y, mo, d, hh, mm, ss, 0, 0, 0)) * 1000 - (3600000 if (4 <= mo <= 9 or (mo == 10 and d < 25)) else 0)

# what a face says at a moment, and the frame it draws (as a data URL, plus a few pixels)
RUN = """([C,ms,probe])=>{const R=Date;class D extends R{constructor(...a){if(!a.length)super(ms);else super(...a);}static now(){return ms;}}window.Date=D;
  try{const e=createEngine();const sv=createSaver(e,C);const cv=document.createElement('canvas');cv.width=800;cv.height=500;const x=cv.getContext('2d');sv.frame(x,800,500,0,0);
    const px=(probe||[]).map(([a,b])=>{const d=x.getImageData(a,b,1,1).data;return '#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();});
    return {say:sv.typeNow().join(' '),url:cv.toDataURL(),px};}finally{window.Date=R;}}"""
# every pixel of one colour within a box, counted
COUNT = """([C,ms,box,col])=>{const R=Date;class D extends R{constructor(...a){if(!a.length)super(ms);else super(...a);}static now(){return ms;}}window.Date=D;
  try{const e=createEngine();const sv=createSaver(e,C);const cv=document.createElement('canvas');cv.width=800;cv.height=500;const x=cv.getContext('2d');sv.frame(x,800,500,0,0);
    const [x0,y0,x1,y1]=box,d=x.getImageData(x0,y0,x1-x0,y1-y0).data,h=col.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16));let n=0;
    for(let i=0;i<d.length;i+=4)if(Math.abs(d[i]-h[0])<60&&Math.abs(d[i+1]-h[1])<60&&Math.abs(d[i+2]-h[2])<60&&d[i+3]>200)n++;return n;}finally{window.Date=R;}}"""
TYPE = dict(font='', h24=False, secs=True, zero='zero', case='auto', parts=dict(time=True, secs=True, day=True, date=True, month=True, year=True),
            size=71, leading=1.6, hole=7.8, split=False, feel='smooth', len=.6, far='all', tracking=-15, space=100, rparts={},
            bg='#FFFFFF', ink='#000000', soft='#D2CDC9', accent='#EA2631', rotate=False, themes=[], every=1,
            orbit=dict(size=82, hole=5, leading=1.9, align='centre', mark=True, dot=True),
            tuner=dict(size=62, gap=4, spread=1, move='glide', keys=True, dot=True))

def cfg(show, **t):
    T = json.loads(json.dumps(TYPE))
    for k, v in t.items():
        if isinstance(v, dict) and isinstance(T.get(k), dict): T[k].update(v)
        else: T[k] = v
    return dict(show=show, base={}, colours={}, type=T)

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
        pg.goto(base + 'docs/tempo/'); time.sleep(1)
        pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('tempo')"); pg.reload(); time.sleep(1.5)
        run = lambda C, ms, probe=None: pg.evaluate(RUN, [C, ms, probe or []])
        count = lambda C, ms, box, col: pg.evaluate(COUNT, [C, ms, box, col])
        def download(click):
            got = []
            pg.on('download', lambda d: got.append(d)); click(); t = time.time()
            while not got and time.time() - t < 60: pg.wait_for_timeout(200)
            return got[0].suggested_filename, open(got[0].path(), 'rb').read()

        # 1. Orbit says what Rings says, at the awkward moments and with every option
        moments = [loc(2026, 10, 22, 13, 0, 0), loc(2026, 10, 22, 10, 9, 45), loc(2026, 10, 22, 10, 17, 30), loc(2026, 10, 22, 23, 59, 59), loc(2026, 12, 31, 0, 40, 5)]
        opts = [{}, {'split': True}, {'secs': False}, {'h24': True, 'zero': 'oh'}, {'rparts': dict(day=True, date=True, month=True, year=True)}, {'case': 'upper'}]
        same = [(run(cfg('orbit', **o), ms)['say'], run(cfg('rings', **o), ms)['say']) for o in opts for ms in moments]
        check('Orbit says what Rings says – every moment, split, no seconds, 24-hour and Oh, the date, capitals', all(a == b and a for a, b in same), json.dumps([x for x in same if x[0] != x[1]][:2]))
        check('…for instance', run(cfg('orbit'), moments[1])['say'] == 'Ten zero nine & forty five', run(cfg('orbit'), moments[1])['say'])

        # 2. Tuner says the hour in words, the minutes and seconds in figures
        tsay = [run(cfg('tuner', **o), ms)['say'] for o, ms in [({}, moments[1]), ({}, moments[4]), ({'h24': True}, moments[3]), ({'secs': False}, moments[0]), ({'case': 'upper'}, moments[1])]]
        check('Tuner says the hour in words and the minutes and seconds in figures (12- and 24-hour, midnight is Twelve, no seconds, capitals)',
              tsay == ['Ten 09 45', 'Twelve 40 05', 'Twenty Three 59 59', 'One 00', 'TEN 09 45'], json.dumps(tsay))

        # 3. Orbit draws: the mark and the dot in the accent, both can go; the column centred or on its first letters
        ms = moments[1]
        mark = count(cfg('orbit'), ms, [395, 0, 405, 130], '#EA2631')
        nomark = count(cfg('orbit', orbit={'mark': False}), ms, [395, 0, 405, 130], '#EA2631')
        dot = count(cfg('orbit'), ms, [390, 240, 410, 275], '#EA2631')
        nodot = count(cfg('orbit', orbit={'dot': False}), ms, [390, 240, 410, 275], '#EA2631')
        check('Orbit: a mark at the top and a dot in the middle, in the accent – each can be switched off', mark > 4 and nomark == 0 and dot > 4 and nodot == 0, json.dumps([mark, nomark, dot, nodot]))
        cen, lft = run(cfg('orbit'), ms)['url'], run(cfg('orbit', orbit={'align': 'left'}), ms)['url']
        # the column: ink (black) only near the top of the circle in the middle of the screen, the other words in grey
        left_half = count(cfg('orbit', far='fade'), ms, [0, 0, 330, 500], '#000000')
        top_mid = count(cfg('orbit'), ms, [300, 0, 500, 250], '#000000')
        check('Orbit: the words true now stand in a column at the top – centred, or with their first letters in line',
              cen != lft and top_mid > 200 and left_half == 0, json.dumps([top_mid, left_half]))
        sizes = [run(cfg('orbit', orbit=o), ms)['url'] for o in [{}, {'hole': 9}, {'leading': 3}, {'size': 50}]]
        check('Orbit: size, space between rings and in the middle each change the frame', len(set(sizes)) == 4)

        # 4. Tuner: the needle in the accent, still in the middle; gliding moves within a second, stepping doesn't
        nd = [run(cfg('tuner'), ms + d, [[400, 250], [400, 330]])['px'] for d in (100, 700)]
        check('Tuner: the needle in the accent, in the middle, wherever the scales are', all(c == '#EA2631' for x in nd for c in x), json.dumps(nd))
        g = [run(cfg('tuner'), ms + d)['url'] for d in (100, 700)]
        st = [run(cfg('tuner', tuner={'move': 'step'}), ms + d)['url'] for d in (100, 700)]
        check('Tuner: gliding, the scales move all the time; stepping, they hold between marks', g[0] != g[1] and st[0] == st[1])
        ts = [run(cfg('tuner', **o), ms)['url'] for o in [{}, {'secs': False}, {'tuner': {'keys': False}}, {'tuner': {'spread': 2}}, {'tuner': {'gap': 7}}, {'tuner': {'dot': False}}]]
        check('Tuner: seconds, names, spread, space between scales and the needle’s dot each change the frame', len(set(ts)) == len(ts))
        # the label under the needle is the one whose stretch it's in: Ten until eleven o'clock, even at 10:59
        late = loc(2026, 10, 22, 10, 59, 30)
        ten = count(cfg('tuner'), late, [0, 0, 800, 200], '#000000')
        check('Tuner: the hour reads Ten until eleven o’clock, though the needle is nearly at Eleven', run(cfg('tuner'), late)['say'].startswith('Ten') and ten > 50, str(ten))

        # 5. the panel: both in Show, their cards, the accent only where it's used
        show = pg.get_by_role('group', name='Show', exact=True)
        names = show.get_by_role('button').all_inner_texts()
        check('Orbit and Tuner are in Show, after Rings', names[:6] == ['The time', 'In words', 'Columns', 'Rings', 'Orbit', 'Tuner'], json.dumps(names))
        vis = lambda: [t.split('\n')[0] for t in pg.locator('section.card:visible h2').all_inner_texts()]
        acc = lambda: pg.locator('#c_ssTAccent').is_visible()
        show.get_by_role('button', name='Rings').click(); time.sleep(.4); r_acc = acc()
        show.get_by_role('button', name='Orbit').click(); time.sleep(.5); o_cards, o_acc = vis(), acc()
        pos = pg.locator('section.card[data-id=ss-pos]')
        if 'collapsed' in (pos.get_attribute('class') or ''): pos.locator('.card-toggle').click(); time.sleep(.3)
        o_ctl = [pg.get_by_role('slider', name=n).filter(visible=True).count() for n in ('Between rings', 'Space in the middle')]
        c1 = pg.evaluate("document.querySelector('#cv').toDataURL()")
        show.get_by_role('button', name='Tuner').click(); time.sleep(.5); t_cards, t_acc = vis(), acc()
        t_ctl = [pg.get_by_role('slider', name=n).filter(visible=True).count() for n in ('Between scales', 'Spread')]
        c2 = pg.evaluate("document.querySelector('#cv').toDataURL()")
        check('Orbit and Tuner have their cards and draw; the accent shows for them and not for Rings',
              o_cards == t_cards == ['Fonts', 'Words', 'Change', 'Position', 'Colour', 'Promo'] and o_acc and t_acc and not r_acc and o_ctl == [1, 1] and t_ctl == [1, 1] and c1 != c2 and len(c1) > 5000,
              json.dumps([o_cards, t_cards, o_acc, t_acc, r_acc, o_ctl, t_ctl]))
        tiles = pg.locator('section.card:visible', has=pg.locator('h2', has_text='Colour')).locator('.theme-tile').evaluate_all('ts=>ts.map(t=>t.getAttribute("aria-label")+(t.getAttribute("aria-pressed")==="true"?"*":""))')
        check('They share Columns and Rings’ themes, each now with an accent', tiles[:1] == ['Drawn*'] and len(tiles) == 5, json.dumps(tiles))

        # 6. export and open again: the settings come back
        show.get_by_role('button', name='Orbit').click(); time.sleep(.4)
        pg.get_by_role('slider', name='Space in the middle').filter(visible=True).fill('8'); time.sleep(.2)
        pg.locator('section.card:visible').get_by_role('button', name='First letters in line').click(); time.sleep(.3)
        fn, html = download(lambda: (sheet(pg, 'export'), btn(pg, 'Download HTML file').click()))
        oc = json.loads(html.decode().split('window.__TEMPO__=')[1].split(';</script>')[0])
        check('The export carries Orbit and its settings, and names itself after it', oc['show'] == 'orbit' and oc['type']['orbit']['hole'] == 8 and oc['type']['orbit']['align'] == 'left' and 'orbit' in fn.lower(),
              json.dumps([fn, oc['show'], oc['type'].get('orbit')]))
        out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(out, exist_ok=True)
        open(os.path.join(out, 'orbit-export.html'), 'wb').write(html)
        show.get_by_role('button', name='Tuner').click(); time.sleep(.3)
        pg.set_input_files('#presetfile', os.path.join(out, 'orbit-export.html')); time.sleep(1.2)
        back = pg.get_by_role('slider', name='Space in the middle').filter(visible=True).input_value()
        check('Opening it brings Orbit back as it was', pressed(show) == 'Orbit' and float(back) == 8, json.dumps([pressed(show), back]))
        ep = ctx.new_page(); eerr = []
        ep.on('pageerror', lambda e: eerr.append(str(e)))
        ep.goto(base + 'tests/out/orbit-export.html'); time.sleep(1.5)
        shot = ep.screenshot()
        check('The exported page draws Orbit without errors', not eerr and len(shot) > 20000, '; '.join(eerr[:2]))
        ep.close()

        # 7. 0.11.1: the Mac export carries the rebuilt engine, finds its page inside itself, and its ad hoc signature holds
        import hashlib, io, plistlib, struct, zipfile
        fn, mz = download(lambda: (sheet(pg, 'export'), btn(pg, 'Download for Mac').click()))
        zf = zipfile.ZipFile(io.BytesIO(mz)); names = zf.namelist()
        pre = [n for n in names if n.endswith('.saver/Contents/Info.plist')][0][:-len('Info.plist')]
        info = plistlib.loads(zf.read(pre + 'Info.plist')); binb = zf.read(pre + 'MacOS/WebViewScreenSaver')
        ok_sig, tag = True, info['NSPrincipalClass'][:4]
        for i in range(struct.unpack_from('>I', binb, 4)[0]):
            off = struct.unpack_from('>I', binb, 8 + i * 20 + 8)[0]; ncmds = struct.unpack_from('<I', binb, off + 16)[0]; p_ = off + 32
            for _ in range(ncmds):
                cmd, sz = struct.unpack_from('<II', binb, p_)
                if cmd == 0x1d: so = struct.unpack_from('<I', binb, p_ + 8)[0]
                p_ += sz
            sb = off + so
            for k in range(struct.unpack_from('>I', binb, sb + 8)[0]):
                t, o = struct.unpack_from('>II', binb, sb + 12 + k * 8)
                if t != 0: continue
                cd = sb + o; hoff, ioff, nsp, ncode, limit = struct.unpack_from('>IIIII', binb, cd + 16); ps = 1 << binb[cd + 39]
                for j in range(ncode):
                    page = binb[off + j * ps: off + min((j + 1) * ps, limit)]
                    ok_sig &= hashlib.sha256(page).digest() == binb[cd + hoff + j * 32: cd + hoff + (j + 1) * 32]
                ok_sig &= hashlib.sha256(zf.read(pre + 'Info.plist')).digest() == binb[cd + hoff - 32: cd + hoff]
                ok_sig &= hashlib.sha256(zf.read(pre + '_CodeSignature/CodeResources')).digest() == binb[cd + hoff - 96: cd + hoff - 64]
        check('The Mac export: the rebuilt engine (page found inside the saver), renamed for this saver, its signature intact',
              info['WVSSDefaultAddressURL'] == 'index.html' and b'resourcePath' in binb and (tag + 'iewScreenSaverView').encode() in binb
              and f'RubatoSaver{tag}_01'.encode() in binb and ok_sig, json.dumps([info['WVSSDefaultAddressURL'], tag, ok_sig]))

        check('No page errors', not errs, '; '.join(errs[:3]))
        b.close()
    failed = [r for r in results if not r[0]]
    print(f'\n{len(results) - len(failed)} of {len(results)} checks pass.')
    sys.exit(1 if failed else 0)

def pressed(group):
    return group.locator('button[aria-pressed=true]').first.inner_text()

if __name__ == '__main__':
    main()

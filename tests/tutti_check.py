"""Tutti, every part: sources, cards, bands, marks, presets, the view, and every export –
on its own and embedded in another page (framed with ?embed, edge to edge with ?app).

    python3 tests/tutti_check.py                  # Chromium
    python3 tests/tutti_check.py firefox webkit   # other engines (WebKit is Safari's)

Writes tests/out/tutti_hashes.json (what each still export hashed to), so a change can be
checked against the build before it: exports should only change when they mean to.
GIF is made by the shared encoder (shared/gif.js), so it needs nothing from the internet."""
import sys, os, json, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, 'fixtures')
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
PHOTO, CLIP, MARK = (os.path.join(FIX, f) for f in ('tutti-photo.jpg', 'tutti-clip.webm', 'tutti-mark.svg'))
base = start()
engines = sys.argv[1:] or ['chromium']
results, hashes = [], {}

def host(q):
    return (f'<html><body style="margin:0;background:#f3f3f6"><div style="height:50px"></div>'
            f'<iframe id=f src="{base}docs/tutti/{q}" allow="camera" style="display:block;width:100%;height:810px;border:0"></iframe></body></html>')

def check(tag, name, fn):
    try:
        r = fn(); results.append((tag, name, True, r)); print(f'  ok    {name}' + (f' – {r}' if r not in (None, True) else ''))
        return r
    except Exception as e:
        msg = str(e).splitlines()[0][:240]; results.append((tag, name, False, msg)); print(f'  FAIL  {name}: {msg}')

def run(p, eng, mode):
    tag = f'{eng}/{mode}'; print(f'\n== {tag}')
    b = getattr(p, eng).launch()
    pg = b.new_page(viewport={'width': 1440, 'height': 860}, accept_downloads=True)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    if mode == 'direct':
        pg.goto(base + 'docs/tutti/'); fr = pg; frame = pg
    else:
        pg.set_content(host('?embed' if mode == 'embed' else '?app')); fr = pg.frame_locator('#f')
    pg.wait_for_timeout(1500)
    if mode != 'direct': frame = pg.frames[1]
    L, ev = fr.locator, frame.evaluate

    def save(sel, timeout=8000):
        with pg.expect_download(timeout=timeout) as d: L(sel).click(timeout=4000)
        path = os.path.join(OUT, f'tutti_{eng}_{mode}_' + d.value.suggested_filename); d.value.save_as(path)
        return d.value.suggested_filename, open(path, 'rb').read()
    def sheet(open_=True):
        hidden = L('#exportSheet').evaluate('e=>e.hidden')
        if hidden == open_: L('#exportOpen').click(timeout=4000); pg.wait_for_timeout(500)
    def canvas_sig():
        return ev('(()=>{const c=document.getElementById("out"),d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;let h=0;for(let i=0;i<d.length;i+=97)h=(h*31+d[i])|0;return c.width+"x"+c.height+":"+h})()')
    def wait_render(): pg.wait_for_timeout(450)

    check(tag, 'starts empty, Export out of the way', lambda: ev('getComputedStyle(document.getElementById("exportbar")).display') == 'none' or (_ for _ in ()).throw(Exception('island showing with no source')))
    check(tag, 'framing: ' + mode, lambda: ev('document.documentElement.classList.contains("embed")') == (mode == 'embed') or (_ for _ in ()).throw(Exception('embed class wrong')))

    # --- Type
    L('#typeBtn').click(timeout=4000); wait_render()
    check(tag, 'Type draws', lambda: canvas_sig())
    t0 = canvas_sig()
    def tracking():
        L('#track').evaluate('e=>{e.value=40;e.dispatchEvent(new Event("input",{bubbles:true}))}'); wait_render()
        t1 = canvas_sig(); L('#track').evaluate('e=>{e.value=0;e.dispatchEvent(new Event("input",{bubbles:true}))}'); wait_render()
        if t1 == t0: raise Exception('tracking changed nothing')
        if canvas_sig() != t0: raise Exception('tracking back to 0 did not restore the type')
    check(tag, 'Tracking spaces the letters', tracking)
    def tracking_without_native():
        ev('(()=>{window.__ls=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,"letterSpacing");if(window.__ls)delete CanvasRenderingContext2D.prototype.letterSpacing;})()')
        try:
            L('#track').evaluate('e=>{e.value=40;e.dispatchEvent(new Event("input",{bubbles:true}))}'); wait_render()
            t1 = canvas_sig(); L('#track').evaluate('e=>{e.value=0;e.dispatchEvent(new Event("input",{bubbles:true}))}'); wait_render()
            if t1 == t0: raise Exception('no tracking where the browser lacks canvas letterSpacing (older Safari)')
        finally:
            ev('(()=>{if(window.__ls)Object.defineProperty(CanvasRenderingContext2D.prototype,"letterSpacing",window.__ls)})()'); wait_render()
    check(tag, 'Tracking works without canvas letterSpacing (older Safari)', tracking_without_native)
    for sel, name in [('#tGrad', 'Gradient fill'), ]:
        def flip(sel=sel):
            L(sel).click(timeout=4000); wait_render(); a = canvas_sig(); L(sel).click(timeout=4000); wait_render()
            if a == t0: raise Exception('no change')
        check(tag, name + ' changes the type', flip)

    # --- Export, stills
    check(tag, 'Export opens the sheet', lambda: (sheet(True), L('#exportSheet').evaluate('e=>{const r=e.getBoundingClientRect();if(e.hidden||r.width<200||r.height<80)throw new Error("not showing "+JSON.stringify(r));return Math.round(r.width)+"×"+Math.round(r.height)}'))[1])
    def png(key):
        n, data = save('#exportBtn')
        if not data.startswith(b'\x89PNG'): raise Exception('not a PNG')
        hashes[f'{tag}:{key}.png'] = hashlib.sha1(data).hexdigest(); return n
    def svg(key):
        n, data = save('#svgBtn')
        if b'<svg' not in data[:200]: raise Exception('not an SVG')
        hashes[f'{tag}:{key}.svg'] = hashlib.sha1(data).hexdigest(); return n
    check(tag, 'Save PNG (type)', lambda: png('type'))
    check(tag, 'Save SVG (type)', lambda: svg('type'))
    check(tag, 'a save says so', lambda: ev('document.getElementById("status").textContent') or (_ for _ in ()).throw(Exception('no message after saving')))
    def esc_closes():
        sheet(True); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        if not L('#exportSheet').evaluate('e=>e.hidden'): raise Exception('Esc left the sheet open')
    check(tag, 'Esc closes Export', esc_closes)

    # --- Image
    L('#fileIn').set_input_files(PHOTO); pg.wait_for_timeout(900)
    check(tag, 'Image draws', lambda: canvas_sig())
    sheet(True)
    check(tag, 'Export opens on Still for an image', lambda: L('#laneStill').evaluate('e=>e.classList.contains("on")') or (_ for _ in ()).throw(Exception('not Still')))
    check(tag, 'Save PNG (image)', lambda: png('image'))
    check(tag, 'Save SVG (image)', lambda: svg('image'))

    # --- Cards, bands, marks
    sheet(False)
    def bands():
        before = ev('S.nBands'); L('#bandPlus').click(); wait_render(); after = ev('S.nBands'); L('#bandMinus').click(); wait_render()
        if after != before + 1 or ev('S.nBands') != before: raise Exception(f'{before}->{after}')
        return f'{before}→{after}→{before}'
    check(tag, 'Bands add and remove', bands)
    def svg_mark():
        L('.stSvg').first.set_input_files(MARK); pg.wait_for_timeout(700)
        if not ev('!!S.states[0].inner'): raise Exception('mark not loaded')
        a = canvas_sig(); L('#tKeepSvg').click(); wait_render(); b2 = canvas_sig(); L('#tKeepSvg').click(); wait_render()
        if a == b2: raise Exception('Keep SVG colours changed nothing')
        L('#resetShapes').click(); wait_render()
        if ev('!!S.states[0].inner'): raise Exception('Reset shapes left the mark')
    check(tag, 'SVG mark, Keep SVG colours, Reset shapes', svg_mark)
    def randoms():
        a = canvas_sig(); L('#randomColors').click(); wait_render(); b2 = canvas_sig(); L('#randomAll').click(); wait_render()
        if a == b2: raise Exception('Random changed nothing')
    check(tag, 'Random and Randomise', randoms)
    def cards():
        t = L('.card[data-id="canvas"] .card-toggle'); t.click(); pg.wait_for_timeout(200)
        shut = L('.card[data-id="canvas"]').evaluate('e=>e.classList.contains("collapsed")'); s = L('.card[data-id="canvas"] .sum').text_content()
        t.click()
        if not shut or not s: raise Exception('card did not fold or say what is set')
        return s
    check(tag, 'Cards fold and say what is set', cards)
    def presets():
        L('.card[data-id="advanced"] .card-toggle').click(); pg.wait_for_timeout(200)
        n, data = save('#savePreset'); p = json.loads(data)
        if p.get('app') != 'Tutti': raise Exception('not a Tutti preset')
        ev('S.grid=20'); L('#loadPreset').set_input_files(os.path.join(OUT, f'tutti_{eng}_{mode}_' + n)); pg.wait_for_timeout(500)
        if ev('S.grid') != p['grid']: raise Exception('preset did not load')
        return n
    check(tag, 'Presets save and load', presets)

    # --- the view
    def view():
        pg.keyboard.press('f'); pg.wait_for_timeout(300)
        on = ev('document.querySelector(".app").classList.contains("preview")'); pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        off = ev('document.querySelector(".app").classList.contains("preview")')
        th0 = ev('document.body.getAttribute("data-theme")'); L('#themeBtn').click(); th1 = ev('document.body.getAttribute("data-theme")'); L('#themeBtn').click()
        if not on or off or th0 == th1: raise Exception(f'preview {on}/{off} theme {th0}/{th1}')
    check(tag, 'Preview (F, Esc) and light/dark', view)

    # --- Video
    L('#fileIn').set_input_files(CLIP); pg.wait_for_timeout(1500)
    def video():
        t1 = ev('document.getElementById("src").currentTime'); pg.wait_for_timeout(700); t2 = ev('document.getElementById("src").currentTime')
        if not t2 > t1: raise Exception(f'video not playing ({t1}→{t2})')
        L('#playPause').click(); pg.wait_for_timeout(200)
        if not ev('document.getElementById("src").paused'): raise Exception('Pause did not pause')
        L('#playPause').click(); return 'plays, pauses'
    check(tag, 'Video plays and pauses', video)
    sheet(True)
    check(tag, 'Export opens on Motion for a video', lambda: L('#laneMotion').evaluate('e=>e.classList.contains("on")') or (_ for _ in ()).throw(Exception('not Motion')))

    def record(fmt, pre='0', pp=False, secs=2.2):
        sheet(True); L('#laneMotion').click(); L('#fmtGif' if fmt == 'gif' else '#fmtMp4').click()
        if fmt == 'gif' and pp != L('#gifPP').is_checked(): L('#ppLabel').click()
        L(f'#preSeg [data-pre="{pre}"]').click(); L('#recBtn').click(timeout=4000)
        pg.wait_for_timeout(secs * 1000)
        msg = L('#actMain').text_content()
        if not ev('getComputedStyle(document.getElementById("exportOpen")).display') == 'none': raise Exception('Export still offered while recording')
        n, data = save('#stopBtn', timeout=60000)
        pg.wait_for_timeout(500)
        if fmt == 'gif' and not data.startswith(b'GIF8'): raise Exception('not a GIF')
        if fmt == 'gif' and not data.endswith(b';'): raise Exception('GIF not finished')
        return f'{msg} → {n} ({len(data)//1024} KB)'
    def countdown():
        sheet(True); L('#laneMotion').click(); L('#fmtMp4').click(); L('#preSeg [data-pre="3"]').click(); L('#recBtn').click()
        pg.wait_for_timeout(300); m = L('#actMain').text_content()
        L('#stopBtn').click(); pg.wait_for_timeout(300)
        if not (m or '').startswith('Get ready'): raise Exception(f'no countdown ({m!r})')
        if ev('recording||prerollActive'): raise Exception('Cancel did not cancel')
        return m
    check(tag, 'Countdown, and Cancel', countdown)
    if ev('!!window.MediaRecorder'):
        def video_pass():
            # a video source records one pass of the clip (3 s here), then saves itself – no Stop needed
            sheet(True); L('#laneMotion').click(); L('#fmtMp4').click(); L('#preSeg [data-pre="0"]').click()
            with pg.expect_download(timeout=20000) as d: L('#recBtn').click(timeout=4000)
            n = d.value.suggested_filename
            if not n.endswith(('.mp4', '.webm')): raise Exception('not a video: ' + n)
            return n + ', saved itself at the end of the clip'
        check(tag, 'Record MP4 (video source)', video_pass)
    else:
        results.append((tag, 'Record MP4', True, 'no MediaRecorder in this engine')); print('  skip  Record MP4 – no MediaRecorder in this engine')
    pg.wait_for_timeout(2700)
    pg.wait_for_timeout(3200)
    L('#typeBtn').click(); wait_render()
    check(tag, 'Record GIF, ping-pong (type)', lambda: record('gif', pp=True))
    pg.wait_for_timeout(3200)
    check(tag, 'Export opens after recording', lambda: (sheet(True), L('#exportSheet').evaluate('e=>e.hidden?"closed":"open"'))[1] == 'open' or (_ for _ in ()).throw(Exception('closed')))
    check(tag, 'no script errors', lambda: (not errs) or (_ for _ in ()).throw(Exception('; '.join(errs[:3]))))
    pg.screenshot(path=os.path.join(OUT, f'tutti_{eng}_{mode}.png'))
    b.close()

with sync_playwright() as p:
    for eng in engines:
        for mode in ('direct', 'embed', 'app'):
            run(p, eng, mode)
json.dump(hashes, open(os.path.join(OUT, 'tutti_hashes.json'), 'w'), indent=1)
bad = [r for r in results if not r[2]]
print(f'\n{len(results) - len(bad)} of {len(results)} passed')
sys.exit(1 if bad else 0)

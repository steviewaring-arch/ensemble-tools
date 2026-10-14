"""Tutti's Export across Chromium, Firefox and WebKit (Safari's engine), on its own and
embedded – checked by what a person sees (the sheet's real height, Export showing),
not just by attributes, before and after a countdown, a recording and a GIF."""
import sys, os, json
sys.path.insert(0, 'tests')
from serve import start
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
base = start()
img = os.path.abspath('tests/out/xb.jpg'); os.makedirs('tests/out', exist_ok=True)
im = Image.new('RGB', (800, 600), 'white'); d = ImageDraw.Draw(im)
for i in range(0, 800, 40): d.ellipse([i, 100, i + 300, 500], fill=(i // 4,) * 3)
im.save(img)
HOST = lambda q, h: f'<html><body style="margin:0;background:#f3f3f6"><div style="height:50px"></div><iframe id=f src="{base}docs/tutti/{q}" allow="camera" style="display:block;width:100%;height:{h}px;border:0"></iframe></body></html>'
engines = sys.argv[1:] or ['chromium', 'firefox', 'webkit']
fails = 0
SEEN = '''()=>{const s=document.getElementById("exportSheet"),o=document.getElementById("exportOpen"),w=document.querySelector(".sheets>div");
  const r=w.getBoundingClientRect(),q=o.getBoundingClientRect();
  return {hidden:s.hidden,sheetH:Math.round(r.height),exportShown:getComputedStyle(o).display!=="none"&&q.width>0,
    activity:getComputedStyle(document.getElementById("capActivity")).display,choose:getComputedStyle(document.getElementById("capChoose")).display}}'''
def step(name, fn):
    global fails
    try:
        r = fn(); print(f'   ok   {name}' + (f' -> {r}' if r else '')); return True
    except Exception as e:
        fails += 1; print(f'   FAIL {name}: {str(e).splitlines()[0][:300]}'); return False
with sync_playwright() as p:
    for eng in engines:
        b = getattr(p, eng).launch()
        for mode in ['direct', 'embed', 'app']:
            pg = b.new_page(viewport={'width': 1440, 'height': 860}, accept_downloads=True)
            errs = []
            pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
            pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type == 'error' else None)
            if mode == 'direct':
                pg.goto(base + 'docs/tutti/'); fr = pg; frame = pg
            else:
                pg.set_content(HOST('?embed' if mode == 'embed' else '?app', 810)); fr = pg.frame_locator('#f')
            pg.wait_for_timeout(1500)
            if mode != 'direct': frame = pg.frames[1]
            print(f'\n== {eng} / {mode}')
            if mode == 'direct':
                print('   info', frame.evaluate('''({mr:!!window.MediaRecorder,cap:!!HTMLCanvasElement.prototype.captureStream,
                  mp4:window.MediaRecorder?MediaRecorder.isTypeSupported("video/mp4"):null,
                  avc:window.MediaRecorder?MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.640028"):null,
                  webm:window.MediaRecorder?MediaRecorder.isTypeSupported("video/webm"):null,
                  ls:"letterSpacing" in CanvasRenderingContext2D.prototype, ua:navigator.userAgent})'''))
            L = fr.locator
            seen = lambda: frame.evaluate(SEEN)
            def is_open():
                s = seen()
                if s['hidden'] or s['sheetH'] < 60: raise Exception('sheet not showing: ' + json.dumps(s))
                return f"{s['sheetH']}px"
            def open_sheet():
                if L('#exportSheet').evaluate('e=>e.hidden'): L('#exportOpen').click(timeout=4000)
                pg.wait_for_timeout(700); return is_open()
            def close_sheet():
                if not L('#exportSheet').evaluate('e=>e.hidden'): L('#exportOpen').click(timeout=4000)
                pg.wait_for_timeout(700)
            def dl(sel, t=8000):
                with pg.expect_download(timeout=t) as d: L(sel).click(timeout=4000)
                return d.value.suggested_filename
            step('Type source', lambda: L('#typeBtn').click(timeout=4000))
            pg.wait_for_timeout(700)
            step('Export opens the sheet', open_sheet)
            step('Save PNG downloads', lambda: dl('#exportBtn'))
            step('Save SVG downloads', lambda: dl('#svgBtn'))
            step('closes and opens again', lambda: (close_sheet(), open_sheet())[1])
            step('Image source', lambda: L('#fileIn').set_input_files(img))
            pg.wait_for_timeout(900)
            step('Save PNG (image)', lambda: (open_sheet(), dl('#exportBtn'))[1])
            def countdown():
                open_sheet(); L('#laneMotion').click(timeout=4000); L('#fmtMp4').click(timeout=4000)
                L('#preSeg [data-pre="3"]').click(timeout=4000); L('#recBtn').click(timeout=4000); pg.wait_for_timeout(400)
                during = seen()
                if not during['hidden']: raise Exception(f'the sheet stayed open behind the countdown: {during}')
                L('#stopBtn').click(timeout=4000); pg.wait_for_timeout(800); after = seen()
                if not after['exportShown']: raise Exception(f'after Cancel Export is missing: {after}')
                return 'Export back, sheet ' + open_sheet()
            step('Countdown puts the sheet away; Cancel brings Export back', countdown)
            def motion(fmt):
                open_sheet(); L('#laneMotion').click(timeout=4000); L('#fmtMp4' if fmt == 'mp4' else '#fmtGif').click(timeout=4000)
                L('#preSeg [data-pre="0"]').click(timeout=4000); L('#recBtn').click(timeout=4000)
                pg.wait_for_timeout(2500)
                act = L('#actMain').text_content()
                if not L('#stopBtn').is_visible(): raise Exception(f'no Stop – island says {act!r}')
                with pg.expect_download(timeout=30000) as d: L('#stopBtn').click(timeout=4000)
                return f'{act!r} -> {d.value.suggested_filename}'
            step('Record MP4', lambda: motion('mp4'))
            pg.wait_for_timeout(3200)
            def after_rec():
                s = seen()
                if not s['exportShown']: raise Exception('Export button gone after recording: ' + json.dumps(s))
                close_sheet(); return open_sheet()
            step('Export works after the MP4', after_rec)
            step('Record GIF', lambda: motion('gif'))
            pg.wait_for_timeout(3500)
            step('Export works after the GIF', after_rec)
            step('Save PNG after recording', lambda: (open_sheet(), L('#laneStill').click(timeout=4000), dl('#exportBtn'))[2])
            if errs: print('   console:', json.dumps(errs[:8]))
            pg.screenshot(path=f'tests/out/xb_{eng}_{mode}.png')
            pg.close()
        b.close()
print('\nFAILURES:', fails)

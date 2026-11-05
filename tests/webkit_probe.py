"""Safari's engine (WebKit) against every tool: errors on load, and Segue's Presets and Export
sheets checked by what a person sees. Run on GitHub Actions (WebKit isn't in this workspace).
    python3 tests/webkit_probe.py [webkit chromium]"""
import sys, os, json, time
sys.path.insert(0, 'tests')
from serve import start
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
base = start(); os.makedirs('tests/out', exist_ok=True)
IM = []
for i in range(3):
    p = os.path.abspath(f'tests/out/wk{i}.png'); im = Image.new('RGB', (800, 600), ['#e33', '#36c', '#3a6'][i]); ImageDraw.Draw(im).ellipse([200, 100, 600, 500], fill='white'); im.save(p); IM.append(p)
engines = sys.argv[1:] or ['webkit', 'chromium']
SEEN = """n=>{const s=document.querySelector(`[data-sheet=${n}]`);if(!s)return 'no sheet';const r=s.getBoundingClientRect();
  const a=s.querySelector('.card-anim'),b=s.querySelector('.card-body');
  return {hidden:s.hidden,h:Math.round(r.height),anim:a?{hidden:a.hidden,h:a.offsetHeight,cls:a.parentElement.className,disp:getComputedStyle(a).display,rows:getComputedStyle(a).gridTemplateRows}:null,
    body:b?{h:b.offsetHeight,op:getComputedStyle(b).opacity,disp:getComputedStyle(b).display}:null,
    rows:[...s.querySelectorAll('.preset-row')].filter(e=>e.getBoundingClientRect().height>0).length,
    dl:(()=>{const d=s.querySelector('.btn-row .pill.primary');if(!d)return null;const q=d.getBoundingClientRect();return {w:Math.round(q.width),h:Math.round(q.height),t:d.textContent}})()}}"""
for eng in engines:
    b = getattr(p := sync_playwright().start(), eng).launch()
    print(f'== {eng} {b.version}')
    for app in os.environ.get('APPS', 'segue tempo rubato tutti').split():
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('ERROR ' + str(e) + ' | ' + (getattr(e, 'stack', '') or '')[:300]))
        pg.on('console', lambda m: m.type in ('error', 'warning') and errs.append(f'console.{m.type} ' + m.text[:300]))
        try:
            pg.goto(base + f'docs/{app}/'); time.sleep(2.5)
            print(f'-- {app}: loaded, errors: {errs or "none"}')
            if app.startswith('segue'):
                pg.set_input_files('#mediafile', IM); time.sleep(2)
                pg.locator('#pcapOpen').click(); time.sleep(.8); print('   presets', json.dumps(pg.evaluate(SEEN, 'presets')))
                pg.screenshot(path=f'tests/out/{eng}-{app}-presets.png'); pg.keyboard.press('Escape'); time.sleep(.4)
                pg.locator('#exportOpen').click(); time.sleep(.8); print('   export', json.dumps(pg.evaluate(SEEN, 'export')))
                pg.screenshot(path=f'tests/out/{eng}-{app}-export.png')
                for fmt in ['PNG', 'GIF']:
                    try:
                        pg.locator('#islandSheets .seg[aria-label=Format] > button', has_text=fmt).click(timeout=4000); time.sleep(.4)
                        pg.evaluate("segue.set('cSize','custom');segue.set('cW',200);segue.set('cH',250)"); time.sleep(.3)
                        with pg.expect_download(timeout=90000) as d: pg.locator('#islandSheets .btn-row .pill.primary').click(timeout=4000)
                        print(f'   download {fmt}: {d.value.suggested_filename}')
                    except Exception as e: print(f'   download {fmt} FAILED: {str(e).splitlines()[0][:200]}')
                print('   toast:', pg.evaluate("document.querySelector('#toast')&&document.querySelector('#toast').textContent"))
                # an older browser's saved state
                pg.evaluate("localStorage.setItem('segue:collapsed',JSON.stringify({presets:true,export:true}))"); pg.reload(); time.sleep(2.5)
                pg.locator('#pcapOpen').click(); time.sleep(.8); print('   presets after reload with old state', json.dumps(pg.evaluate(SEEN, 'presets')))
            print(f'   errors after use: {errs or "none"}')
        except Exception as e:
            print(f'   PROBE FAILED {app}: {str(e).splitlines()[0][:300]} | errors {errs}')
        ctx.close()
    b.close()

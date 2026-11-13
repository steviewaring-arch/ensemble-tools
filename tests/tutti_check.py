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
GREY = os.path.join(FIX, 'tutti-grey.png')   # 6.5: a flat tone, so every row is one stretch
DEJAVU = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'   # an upload to test with – the system's, never committed
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
        if a == b2: raise Exception('Own colours changed nothing')
        L('#resetShapes').click(); wait_render()
        if ev('!!S.states[0].inner'): raise Exception('Reset shapes left the mark')
    check(tag, 'SVG mark, Own colours, Reset shapes', svg_mark)
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

    # --- 6.3: the change column, card Reset, Undo and Redo (house rules)
    def changes():
        chg = lambda sel: ev(f'(()=>{{const e=document.querySelector({json.dumps(sel)});return !!e&&e.classList.contains("chg")}})()')
        ctl = '#grid'; wrap = 'document.getElementById("grid").closest(".ctl")'
        L('.card[data-id="canvas"] .card-toggle').evaluate('b=>{if(b.closest(".card").classList.contains("collapsed"))b.click()}')
        g0 = ev('S.grid'); L(ctl).focus(); pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(350)
        g1 = ev('S.grid')
        if g1 != g0 + 1: raise Exception(f'grid {g0}->{g1}')
        if not ev(wrap + '.classList.contains("chg")'): raise Exception('no dot on a moved row')
        if ev('document.getElementById("undoBtn").disabled'): raise Exception('Undo off with something to undo')
        L('#undoBtn').click(); pg.wait_for_timeout(250)
        if ev('S.grid') != g0: raise Exception('Undo did not take the step back')
        L('#redoBtn').click(); pg.wait_for_timeout(250)
        if ev('S.grid') != g1: raise Exception('Redo did not put it again')
        L(ctl).focus(); pg.keyboard.press('Control+z'); pg.wait_for_timeout(250)
        if ev('S.grid') != g0: raise Exception('Ctrl+Z did not undo')
        pg.keyboard.press('Control+Shift+z'); pg.wait_for_timeout(250)
        if ev('S.grid') != g1: raise Exception('Ctrl+Shift+Z did not redo')
        L('#grid').evaluate('e=>e.closest(".ctl").querySelector(".cx").click()'); pg.wait_for_timeout(300)
        if ev('S.grid') != 72 or ev(wrap + '.classList.contains("chg")'): raise Exception('the dot did not put Grid back')
        L('#tInvert').click(); pg.wait_for_timeout(300)
        inv = ev('S.invert'); dot = chg('#tInvert')
        if dot != inv: raise Exception('toggle dot does not follow the toggle')
        if not chg('.card[data-id="mapping"]'):   # Randomise has been before this: the bands have moved
            L('#randomColors').click(); pg.wait_for_timeout(300)
        L('.card[data-id="mapping"] .card-toggle').evaluate('b=>{if(b.closest(".card").classList.contains("collapsed"))b.click()}')
        L('.card[data-id="mapping"] h2 .reset').click(); pg.wait_for_timeout(350)
        if chg('.card[data-id="mapping"]') or ev('S.nBands') != 6: raise Exception('Mapping Reset left something moved')
        if ev('document.querySelectorAll("#states .state").length') != ev('document.querySelectorAll("#states .state .cx").length'): raise Exception('a band row without its dot')
        L('#undoBtn').click(); pg.wait_for_timeout(300)
        if not chg('.card[data-id="mapping"]'): raise Exception('Undo did not bring the Mapping back')
        return ev('document.getElementById("undoBtn").title')
    check(tag, 'Change dots, put back, card Reset, Undo and Redo', changes)

    # --- 6.4: the placement list, Mixed sizes, the house marks and big marks
    def mixed():
        a = canvas_sig(); ev('window.__s64=snapState()')
        L('.card[data-id="shape"] .card-toggle').evaluate('b=>{if(b.closest(".card").classList.contains("collapsed"))b.click()}')
        L('#tMix').click(); wait_render()
        if ev('document.getElementById("mixGrp").hidden'): raise Exception('the group did not open with its switch')
        L('#mixBar button[data-s="1x2"]').click()
        ev('(()=>{const r=document.getElementById("mixAmt");r.value=85;r.dispatchEvent(new Event("input",{bubbles:true}))})()'); wait_render()
        r = ev("""(()=>{const P=placements(),B=P.filter(p=>p.w),seen=new Set();let bad='';
          for(const b of B){const x=Math.round((b.cx-b.w/2*cellX)/cellX),y=Math.round((b.cy-b.h/2*cellY)/cellY);
            if(S.posJit===0&&(x%b.w||y%b.h))bad='off its grid '+x+','+y+' '+b.w+'x'+b.h;}
          const again=JSON.stringify(placements().map(p=>[p.cx,p.cy,p.w||1]));if(again!==JSON.stringify(P.map(p=>[p.cx,p.cy,p.w||1])))bad='not the same twice';
          return {n:B.length,kinds:[...new Set(B.map(b=>b.w+'x'+b.h))].sort().join(' '),bad}})()""")
        if r['bad']: raise Exception(r['bad'])
        if r['n'] < 3 or '1x2' not in r['kinds'] or '2x1' not in r['kinds']: raise Exception(f'blocks {r}')
        if canvas_sig() == a: raise Exception('Mixed sizes changed nothing on the canvas')
        mixed_bands = ev("""(()=>{let bad=0;for(const b of placements().filter(p=>p.w)){const s=new Set();for(let dy=0;dy<b.h;dy++)for(let dx=0;dx<b.w;dx++)s.add(bandIndex(covAt((b.y+dy)*cols+b.x+dx)));if(s.size>1)bad++;}return bad})()""")
        if mixed_bands: raise Exception(f'{mixed_bands} blocks cross bands with Where at Even')
        p1 = ev('JSON.stringify(placements().filter(p=>p.w).map(p=>[p.cx,p.cy]))'); L('#mixShuffle').click(); wait_render()
        if ev('JSON.stringify(placements().filter(p=>p.w).map(p=>[p.cx,p.cy]))') == p1: raise Exception('Shuffle kept the same pattern')
        L(".markbtn").first.click(); pg.wait_for_timeout(150)
        L('.markbox .mk[data-k="ring"]').click(); pg.wait_for_timeout(400)
        if ev('S.states[0].key') != 'ring' or not ev('!!S.states[0].img'): raise Exception('house mark not set')
        L('.markbox .markseg button[data-b="1"]').click(); pg.wait_for_timeout(150); L('.markbox .mk[data-k="checker"]').click(); pg.wait_for_timeout(400)
        if ev('S.states[0].bigKey') != 'checker': raise Exception('big mark not set')
        L('.card[data-id="advanced"] .card-toggle').evaluate('b=>{if(b.closest(".card").classList.contains("collapsed"))b.click()}')
        n, data = save('#savePreset'); pr = json.loads(data)
        if not pr.get('mix') or pr['states'][0].get('bigKey') != 'checker': raise Exception('preset lacks Mixed sizes or the big mark')
        sheet(True); _, svgd = save('#svgBtn'); sheet(False)
        if b'<rect' not in svgd or b'rx=' not in svgd: raise Exception('no bar or block in the SVG')
        L('#undoBtn').click(); pg.wait_for_timeout(300)
        if ev('S.states[0].bigKey'): raise Exception('Undo did not take the big mark back')
        L('.card[data-id="shape"] h2 .reset').click(); L('.card[data-id="mapping"] h2 .reset').click(); wait_render()
        if ev('S.mix') or ev('S.states[0].inner'): raise Exception('Reset left Mixed sizes or a mark')
        ev('putState(window.__s64)'); wait_render()
        if canvas_sig() != a: raise Exception('not back to the picture it started from')
        return r['kinds']
    check(tag, 'Mixed sizes, house marks, big marks', mixed)

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
        sheet(True); L('#laneMotion').click(); L('#fmtMp4' if ev('canVideo') else '#fmtGif').click(); L('#preSeg [data-pre="3"]').click(); L('#recBtn').click()
        pg.wait_for_timeout(300); m = L('#actMain').text_content()
        L('#stopBtn').click(); pg.wait_for_timeout(300)
        if not (m or '').startswith('Get ready'): raise Exception(f'no countdown ({m!r})')
        if ev('recording||prerollActive'): raise Exception('Cancel did not cancel')
        return m
    check(tag, 'Countdown, and Cancel', countdown)
    if ev('canVideo'):
        def video_pass():
            # a video source records one pass of the clip (3 s here), then saves itself – no Stop needed
            sheet(True); L('#laneMotion').click(); L('#fmtMp4').click(); L('#preSeg [data-pre="0"]').click()
            with pg.expect_download(timeout=20000) as d: L('#recBtn').click(timeout=4000)
            n = d.value.suggested_filename
            if not n.endswith(('.mp4', '.webm')): raise Exception('not a video: ' + n)
            return n + ', saved itself at the end of the clip'
        check(tag, 'Record MP4 (video source)', video_pass)
    else:
        check(tag, 'MP4 greyed where video can\'t be recorded', lambda: L('#fmtMp4').is_disabled() or (_ for _ in ()).throw(Exception('MP4 offered without MediaRecorder')))
    pg.wait_for_timeout(2700)
    pg.wait_for_timeout(3200)
    L('#typeBtn').click(); wait_render()
    check(tag, 'Record GIF, ping-pong (type)', lambda: record('gif', pp=True))
    pg.wait_for_timeout(3200)
    check(tag, 'Export opens after recording', lambda: (sheet(True), L('#exportSheet').evaluate('e=>e.hidden?"closed":"open"'))[1] == 'open' or (_ for _ in ()).throw(Exception('closed')))
    def house_picker():
        # the house colour picker (Segue 1.0, 12 Nov): a swatch opens it, not the browser's; hex sets the colour
        was = L('#bgColor').input_value(); L('#bgColor').scroll_into_view_if_needed(); L('#bgColor').click(force=True); pg.wait_for_timeout(300)
        if not L('.cpk').is_visible(): raise Exception('the house picker did not open')
        L('.cpk-f input').first.fill('#EEDDCC'); pg.wait_for_timeout(200); got = L('#bgColor').input_value().lower()
        L('.cpk-f input').first.fill(was); pg.wait_for_timeout(200); L('.cpk-f input').first.press('Enter'); pg.wait_for_timeout(200)
        if got != '#eeddcc' or L('.cpk').is_visible() or L('#bgColor').input_value().lower() != was.lower(): raise Exception(f'{got}, back to {L("#bgColor").input_value()}')
        return 'opens from the swatch, hex sets the colour, Enter closes'

    # --- 6.5: Type (the style), checked on the pixels: every stretch's ink meets its box
    ALIGN = r"""(o)=>{
      S.style='type'; S.tMax=61; S.tMin=1; S.tDir=o.dir; S.tFit=o.fit; S.tMode='run'; S.tRun=o.word; S.tCase='as'; S.tSpace=0; S.grid=o.grid; S.bg='#ffffff'; S.trueColour=false; S.opacity=1;
      S.states.forEach(t=>t.color='#000000');   /* black on white, whatever earlier checks set */
      syncUI(); S.sampleDirty=true; S.spritesDirty=true; computeDims(); buildSprites(); sample(); render();
      const W=out.width,H=out.height,d=octx.getImageData(0,0,W,H).data, ink=(x,y)=>d[(y*W+x)*4]<200, P=placements(); let worst=0, at='';
      for(const p of P.slice(1,P.length-1)){ const x0=Math.round(p.bx),y0=Math.round(p.by),x1=Math.round(p.bx+p.bw),y1=Math.round(p.by+p.bh); let l=1e9,r=-1,t=1e9,b=-1;
        for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) if(ink(x,y)){ if(x<l)l=x; if(x>r)r=x; if(y<t)t=y; if(y>b)b=y; }
        const e=Math.max(Math.abs(l-x0),Math.abs(x1-1-r),Math.abs(t-y0),Math.abs(y1-1-b)); if(e>worst){worst=e;at=[l-x0,x1-1-r,t-y0,y1-1-b].join(',');} }
      return {n:P.length,worst,at};
    }"""
    def type_align():
        L('#fileIn').set_input_files(GREY); pg.wait_for_timeout(700)
        fonts = ['Aktiv or its stand-in'] + ([DEJAVU] if os.path.exists(DEJAVU) else [])
        worst, cases = 0, 0
        for font in fonts:
            if font != fonts[0]: L('#tFontIn').set_input_files(font); pg.wait_for_timeout(1500)
            for word in ('HILL', 'nun', 'Tutti', 'HELLO'):
                for d in ('rows', 'cols'):
                    for fit in ('stretch', 'keep'):
                        for grid in (24, 60):
                            r = ev(ALIGN, dict(word=word, dir=d, fit=fit, grid=grid)); cases += 1
                            if r['n'] < 3: raise Exception(f'{word} {d} {fit}: only {r["n"]} stretches')
                            if r['worst'] > 1: raise Exception(f'{os.path.basename(font)} {word} {d} {fit} grid {grid}: ink {r["at"]} px from its box (left, right, top, bottom)')
                            worst = max(worst, r['worst'])
        return f'{cases} cases, {len(fonts)} fonts, worst {worst}px'
    check(tag, 'Type: every word meets its stretch, to a pixel', type_align)
    def type_svg():
        if not os.path.exists(DEJAVU): return 'skipped – no font to upload here'
        for _ in range(16):
            if ev('!!TT.ot'): break
            pg.wait_for_timeout(500)
        if not ev('!!TT.ot'): return 'skipped – opentype.js not reachable'
        r = ev(r"""async ()=>{ S.tFit='stretch'; S.tDir='rows'; S.tRun='Tutti'; syncUI(); render();
          let blob=null; const o=window.saveBlob; window.saveBlob=(n,b)=>{blob=b;}; document.getElementById('svgBtn').onclick(); window.saveBlob=o;
          const t=await blob.text(), im=new Image(); im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(t); await im.decode();
          const W=out.width,H=out.height,c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d'); x.drawImage(im,0,0,W,H);
          const d=x.getImageData(0,0,W,H).data, ink=(a,b)=>d[(b*W+a)*4]<200, P=placements(); let worst=0;
          for(const p of P.slice(1,P.length-1)){ const x0=Math.round(p.bx),y0=Math.round(p.by),x1=Math.round(p.bx+p.bw),y1=Math.round(p.by+p.bh); let l=1e9,r=-1,tt=1e9,b=-1;
            for(let yy=y0;yy<y1;yy++) for(let xx=x0;xx<x1;xx++) if(ink(xx,yy)){ if(xx<l)l=xx; if(xx>r)r=xx; if(yy<tt)tt=yy; if(yy>b)b=yy; }
            worst=Math.max(worst,Math.abs(l-x0),Math.abs(x1-1-r),Math.abs(tt-y0),Math.abs(y1-1-b)); }
          return {worst,outlines:t.includes('<path d="M'),text:t.includes('<text')}; }""")
        if not r['outlines'] or r['text']: raise Exception('an uploaded font should come out as outlines')
        if r['worst'] > 1: raise Exception(f'SVG outlines {r["worst"]}px from their stretches')
        L('#tFontReset').click(); pg.wait_for_timeout(300)
        t = ev(r"""async ()=>{ let blob=null; const o=window.saveBlob; window.saveBlob=(n,b)=>{blob=b;}; document.getElementById('svgBtn').onclick(); window.saveBlob=o; return await blob.text(); }""")
        if '<text' not in t or 'Aktiv Grotesk' not in t: raise Exception('Aktiv should be live text in the SVG')
        return f'outlines within {r["worst"]}px; Aktiv live text'
    check(tag, 'Type in the SVG: outlines for an upload, live Aktiv', type_svg)
    def type_ui():
        L('.card[data-id="shape"] .card-toggle').evaluate('b=>{if(b.closest(".card").classList.contains("collapsed"))b.click()}')
        L('#styleSeg button[data-v="marks"]').click(); pg.wait_for_timeout(200)
        L('#fileIn').set_input_files(PHOTO); pg.wait_for_timeout(700); a = canvas_sig()
        L('#styleSeg button[data-v="type"]').click(); wait_render()
        if L('#tScale').is_visible() or not L('#tDirSeg').is_visible(): raise Exception('Type did not swap the Shape controls')
        L('#tModeSeg button[data-v="tone"]').click(); pg.wait_for_timeout(150)
        if L('.sttext').count() != ev('S.nBands'): raise Exception('no words box per band')
        b = canvas_sig()
        if b == a: raise Exception('Type drew nothing different')
        L('.sttext').first.fill('T U'); wait_render()
        if 'T' not in ev('placements().filter(p=>p.idx===0).map(p=>p.word).join()') and ev('placements().some(p=>p.idx===0)'): raise Exception('band words not used')
        L('#tModeSeg button[data-v="run"]').click(); pg.wait_for_timeout(150)
        if L('.sttext').count() or not L('#tRun').is_visible(): raise Exception('Running should swap the band boxes for one passage')
        L('#tRun').fill('Ensemble tools'); wait_render()
        if set(ev('placements().map(p=>p.word)')) - {'Ensemble', 'tools'}: raise Exception('running words wrong')
        L('#looks').select_option(index=3); wait_render()
        if ev('S.tDir') != 'cols' or ev('S.tFit') != 'keep': raise Exception('the Columns look did not apply')
        L('#undoBtn').click(); pg.wait_for_timeout(300)
        if ev('S.tDir') != 'rows': raise Exception('Undo did not take the look back')
        s0 = canvas_sig(); L('#tTrue').click(); wait_render()
        if canvas_sig() == s0: raise Exception('True colour changed nothing')
        L('#tTrue').click(); L('#styleSeg button[data-v="marks"]').click(); wait_render()
        if canvas_sig() != a: raise Exception('back to Marks is not the picture it was')
        return 'swaps controls, band words, Running, a Look and Undo, True colour'
    check(tag, 'Type: the controls, words, a Look, True colour', type_ui)
    check(tag, 'House colour picker', house_picker)
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

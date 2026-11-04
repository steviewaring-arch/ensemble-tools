"""Checks for Segue 0.1: framed loops of images and video for case studies, reels and decks.

    python3 tests/segue_check.py

Needs Playwright's Chromium, ffmpeg (with libx264 and libvpx) and Pillow. The fixtures –
a few PNGs, two short VP9 clips and an H.264 MP4 labelled one way in the file and the other
in its stream – are made fresh in tests/out/segue/. Playwright's Chromium has no H.264, so
here the MP4 export comes out as VP9 (as Tempo's does); the H.264 parts – the range flag
Segue puts right – are checked against streams made by x264.
"""
import json, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start
from ui_helpers import sheet

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out', 'segue')
os.makedirs(OUT, exist_ok=True)
results = []
def check(name, ok, detail=''):
    results.append((ok, name, detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f' – {detail}' if detail else ''))

def ff(*a):
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', *a], check=True)
def probe(path, entries='stream=width,height,nb_frames,duration,codec_name,color_range,pix_fmt'):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', entries, '-of', 'json', path], capture_output=True, text=True).stdout
    return (json.loads(r).get('streams') or [{}])[0]
def pixel(path, x, y):
    d = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-frames:v', '1', '-vf', f'crop=2:2:{x}:{y},format=rgb24', '-f', 'rawvideo', '-'], capture_output=True).stdout
    return tuple(d[:3])

# ---------------- fixtures ----------------
from PIL import Image, ImageDraw
COLS = ['#EA2631', '#2F5DA8', '#3C6E5A', '#E2552D', '#111111']
IMGS = []
for i, c in enumerate(COLS):
    p = os.path.join(OUT, f'img{i+1}.png'); im = Image.new('RGB', (1600, 1000), c); ImageDraw.Draw(im).rectangle([100, 100, 700, 500], fill='#F5F5F3'); im.save(p); IMGS.append(p)
CLIPS = []
for i, src in enumerate(['testsrc2=size=960x600:rate=30:duration=4', 'testsrc=size=960x600:rate=30:duration=3']):
    p = os.path.join(OUT, f'clip{i+1}.webm'); ff('-f', 'lavfi', '-i', src, '-c:v', 'libvpx-vp9', '-b:v', '2M', '-g', '10', '-pix_fmt', 'yuv420p', p); CLIPS.append(p)
MIS = os.path.join(OUT, 'mislabelled.mp4')  # the file says video range, the H.264 stream says full range (Tempo's promo MP4s)
ff('-f', 'lavfi', '-i', 'color=c=0xF5F5F3:s=320x240:d=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-x264-params', 'fullrange=on', '-color_range', 'tv',
   '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+write_colr', MIS)
FULL264 = os.path.join(OUT, 'full.264')
ff('-f', 'lavfi', '-i', 'color=c=0xF5F5F3:s=320x240:d=1', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-x264-params', 'fullrange=on', '-f', 'h264', FULL264)

url = start() + 'docs/segue/'
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(url); time.sleep(1.2)

    # ---- the frame ----
    titles = pg.evaluate("[...document.querySelectorAll('#panel section.card>h2 .card-toggle>span:first-child')].map(e=>e.textContent)")
    check('the panel: Media, Canvas, Shapes, Motion, Captions, Fonts', titles == ['Media', 'Canvas', 'Shapes', 'Motion', 'Captions', 'Fonts'], str(titles))
    check('Export and Presets are sheets', pg.evaluate("!!document.querySelector('#islandSheets [data-sheet=export]')&&!!document.querySelector('#pcapSheets [data-sheet=presets]')"))
    blank = pg.evaluate("(()=>{const c=document.querySelector('#cv'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;const s=new Set();for(let i=0;i<d.length;i+=4*97)s.add(d[i]+','+d[i+1]+','+d[i+2]);return s.size;})()")
    check('with no media, the stage shows the layout with numbered placeholders', blank > 2, f'{blank} colours')

    # ---- engine maths ----
    plan = pg.evaluate("""()=>{const E=segue.E,it=n=>Array.from({length:n},()=>({kind:'image',w:16,h:10}));
      const base={layout:'column',trackMove:'step',dir:'up',feel:'inertia',hold:1.2,dur:.7,after:'pull',zOut:1.1,gHold:1.6,zIn:1.1};
      return {pull:E.plan(base,it(5)).L,carry:E.plan(Object.assign({},base,{after:'carry'}),it(5)).L,drift:E.plan({layout:'row',trackMove:'drift',spsh:2.5},it(6)).L,
        grid:E.plan({layout:'grid',cols:3,trackMove:'step',hold:1,dur:.5},it(10)).L,cut:E.plan({layout:'one',oneMove:'cut',hold:1,dur:.6},it(4)).L,
        mixed:E.plan({layout:'one',oneMove:'slide',hold:1,dur:.6},[{},{arrive:'cut'},{},{}]).L}}""")
    check('loop length – rest and move per shape, then the pull back', abs(plan['pull'] - (5*1.2 + 4*.7 + 1.1 + 1.6 + 1.1)) < 1e-9, str(plan['pull']))
    check('loop length – carrying on round', abs(plan['carry'] - 5*(1.2+.7)) < 1e-9)
    check('loop length – drift is a shape every “Each shape” seconds', abs(plan['drift'] - 15) < 1e-9)
    check('loop length – a grid steps until its rows repeat (10 shapes, 3 across: 10 rows)', abs(plan['grid'] - 10*1.5) < 1e-9, str(plan['grid']))
    check('a cut takes no time; a shape can arrive by its own move', abs(plan['cut'] - 4) < 1e-9 and abs(plan['mixed'] - (4 + 3*.6)) < 1e-9, f"{plan['cut']} {plan['mixed']}")
    feels = pg.evaluate("(()=>{const F=segue.E.FEEL;const r={};for(const k in F){const v=[...Array(101)].map((_,i)=>F[k](i/100));r[k]=[v[0],v[100],Math.max(...v)];}return r;})()")
    check('every feel starts at 0 and lands exactly on 1', all(v[0] == 0 and v[1] == 1 for v in feels.values()), str(feels))
    check('spring goes a little past the mark – under 6%', 1.02 < feels['spring'][2] < 1.06, str(feels['spring'][2]))
    sizes = pg.evaluate("""(()=>{const E=segue.E;return [E.canvasSize({cSize:'4:5'}),E.canvasSize({cSize:'9:16'}),E.canvasSize({cSize:'16:9'}),E.canvasSize({cSize:'custom',cW:1001,cH:777})];})()""")
    check('canvas sizes, and a custom size made even for video', sizes == [[1080, 1350], [1080, 1920], [1920, 1080], [1000, 776]], str(sizes))

    # ---- media ----
    pg.set_input_files('#mediafile', IMGS[:3] + CLIPS[:1]); time.sleep(2.5)
    n = pg.evaluate("segue.items.length")
    check('images and video added', n == 4, str(n))
    rows = pg.locator('.media-list .slot').count()
    check('one row each in Media', rows == 4, str(rows))
    pg.locator('.media-list .slot-main').first.click(); time.sleep(.2)
    check('a row opens to its caption, its start point and Move up/down', pg.get_by_label('Title').count() >= 1 and pg.get_by_role('button', name='Move down').count() >= 1)
    pg.get_by_role('button', name='Move down').first.click(); time.sleep(.3)
    order = pg.evaluate("segue.items.map(i=>i.name)")
    check('Move down changes the order', order[:2] == ['img2.png', 'img1.png'], str(order))
    pg.evaluate("segue.items.forEach((it,i)=>{it.title='Title '+(i+1);it.line='A line';it.tags='Film, Digital';});segue.refresh()")

    # the mislabelled MP4: Segue makes its stream agree with the file (checked on bytes; this browser can't play H.264)
    fixed = pg.evaluate("""async u=>{const r=await fetch(u);const b=await r.blob();const f=new File([b],'mislabelled.mp4',{type:'video/mp4'});const g=await segue.fixSourceRange(f);
      if(!g)return null;const a=new Uint8Array(await g.arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));return btoa(s);}""",
      '/tests/out/segue/mislabelled.mp4')
    if fixed:
        import base64; fp = os.path.join(OUT, 'mislabelled.fixed.mp4'); open(fp, 'wb').write(base64.b64decode(fixed))
        a, bb = probe(MIS), probe(fp)
        check('a video labelled one way in the file and the other in its stream is put right', a.get('color_range') == 'pc' and bb.get('color_range') == 'tv', f"{a.get('color_range')} → {bb.get('color_range')}")
        check('…and then plays back with its true colours (#F5F5F3)', pixel(MIS, 10, 10) != (245, 245, 243) and max(abs(x - y) for x, y in zip(pixel(fp, 10, 10), (245, 245, 243))) <= 2, f'{pixel(MIS,10,10)} → {pixel(fp,10,10)}')
    else:
        check('a video labelled one way in the file and the other in its stream is put right', False, 'not changed')
    # the range flag in an x264 stream's own header (SPS), High profile
    raw = open(FULL264, 'rb').read()
    out = pg.evaluate("""b=>{const a=Uint8Array.from(atob(b),c=>c.charCodeAt(0)),st=[];for(let k=0;k+3<a.length;k++)if(a[k]===0&&a[k+1]===0&&a[k+2]===1)st.push(k+3);
      const parts=[];let n=0;for(let s=0;s<st.length;s++){let e=s+1<st.length?st[s+1]-3:a.length;while(e>st[s]&&a[e-1]===0)e--;let nal=a.subarray(st[s],e);
        if((nal[0]&31)===7){const f=segue.spsVideoRange(nal);if(f){nal=f;n++;}}parts.push(0,0,0,1,...nal);}
      let s='';for(const x of parts)s+=String.fromCharCode(x);return [n,btoa(s)];}""", __import__('base64').b64encode(raw).decode())
    fp = os.path.join(OUT, 'full.fixed.264'); open(fp, 'wb').write(__import__('base64').b64decode(out[1]))
    check('the range flag in an H.264 header is set to video range', out[0] == 1 and probe(FULL264).get('color_range') == 'pc' and probe(fp).get('color_range') == 'tv',
          f"{probe(FULL264).get('color_range')} → {probe(fp).get('color_range')}")

    # ---- captions ----
    cap = pg.evaluate("""(()=>{const E=segue.E,c=document.createElement('canvas').getContext('2d'),F=segue.fonts;
      const S=Object.assign({},segue.S,{kern:false,pairs:''});
      const st=tr=>({size:100,font:'normal 400 100px "Helvetica Neue",Helvetica,Arial,sans-serif',track:tr,casing:'as'});
      const a=E.layLine(c,'AVAV',st(0),S,E.parsePairs('')).width,b=E.layLine(c,'AVAV',st(100),S,E.parsePairs('')).width,k=E.layLine(c,'AVAV',st(0),S,E.parsePairs('AV -50')).width;
      const r=E.parseRich('Pour *Patrol* {#2F5DA8:blue} end','#EA2631');
      const up=E.layLine(c,'abc',Object.assign(st(0),{casing:'upper'}),S,E.parsePairs('')).glyphs.map(g=>g.ch).join('');
      return {a,b,k,r,up};})()""")
    check('tracking: 100 thousandths add a tenth of the size between each letter', abs((cap['b'] - cap['a']) - 3 * 10) < .01, f"{cap['a']:.2f} → {cap['b']:.2f}")
    check('kerning pairs: “AV -50” takes 5 px off each AV at 100 px', abs((cap['a'] - cap['k']) - 2 * 5) < .01, f"{cap['a']:.2f} → {cap['k']:.2f}")
    check('*stars* take the accent; {#hex:words} take their own colour', [x['c'] for x in cap['r']] == [None, '#EA2631', None, '#2F5DA8', None] and cap['r'][1]['t'] == 'Patrol', json.dumps(cap['r']))
    check('case', cap['up'] == 'ABC')

    # ---- presets adapt to the canvas ----
    pg.evaluate("segue.set('cSize','4:5');segue.applyPreset('Carousel')")
    g1 = pg.evaluate("[segue.S.gap,segue.S.layout,segue.S.trackMove,segue.S.bg,segue.S.cSize]")
    pg.evaluate("segue.set('cSize','custom');segue.set('cW',2160);segue.set('cH',2700);segue.applyPreset('Carousel')")
    g2 = pg.evaluate("[segue.S.gap,segue.S.cW,segue.S.cH]")
    check('a preset sets the look and motion, not the canvas size', g1[1:] == ['row', 'drift', '#1D1C23', '4:5'], str(g1))
    check('…and scales its px to the canvas (gap 49 at 1080 is 98 at 2160)', g1[0] == 49 and g2[0] == 98 and g2[1:] == [2160, 2700], f'{g1[0]} / {g2}')
    pg.evaluate("segue.set('cSize','4:5');segue.applyPreset('Card stack')")
    pg.evaluate("segue.set('xFormat','mp4')"); sheet(pg, 'presets')
    pg.get_by_label('Preset name').fill('Mine'); pg.locator('.save-row .pill').click(); time.sleep(.2)
    check('Save adds your own preset, named', pg.evaluate("JSON.parse(localStorage.getItem('segue:presets')).map(p=>p.name)") == ['Mine'])

    # ---- every layout and move draws, across the loop ----
    bad = pg.evaluate("""(()=>{const E=segue.E,c=document.createElement('canvas');c.width=540;c.height=675;const x=c.getContext('2d');const bad=[];
      const L=[['one',['slide','stack','fade','zoom','cut','still']],['row',['step','drift','still']],['column',['step','drift','still']],['grid',['step','drift','still']]];
      for(const [lay,ms] of L)for(const m of ms)for(const after of ['carry','pull'])for(const dir of ['left','right','up','down'])for(const cw of ['under','over','above','fixed']){
        const S=Object.assign({},segue.S,{layout:lay,oneMove:m,trackMove:m,after,dir,capWhere:cw,cSize:'custom',cW:540,cH:676});
        try{const P=E.plan(S,segue.items);for(let t=0;t<P.L;t+=P.L/7){const sc=E.scene(S,segue.items,x,segue.fonts,540,676,t);E.paint(x,sc,S,segue.fonts,{});
          if(!sc.ops.length&&m!=='cut')bad.push([lay,m,after,dir,cw,t,'empty']);}}catch(e){bad.push([lay,m,after,dir,cw,String(e)]);}}
      return bad.slice(0,5);})()""")
    check('every layout × move × direction × caption place draws something, all the way round', not bad, str(bad))
    # the loop is seamless: the first frame and the frame one loop on are the same picture (images only, so no video timing)
    seam = pg.evaluate("""async()=>{const its=segue.items.filter(i=>i.kind==='image');const E=segue.E,S=Object.assign({},segue.S,{cSize:'custom',cW:540,cH:676});
      const draw=t=>{const c=document.createElement('canvas');c.width=540;c.height=676;const x=c.getContext('2d');E.paint(x,E.scene(S,its,x,segue.fonts,540,676,t),S,segue.fonts,{media:(cx,o,r)=>cx.drawImage(o.item.src,r.x,r.y,r.w,r.h)});return x.getImageData(0,0,540,676).data;};
      const P=E.plan(S,its),a=draw(0.0001),b=draw(P.L+0.0001);let d=0;for(let i=0;i<a.length;i++)d=Math.max(d,Math.abs(a[i]-b[i]));return d;}""")
    check('the loop joins up – a loop on, the same picture', seam <= 1, f'largest difference {seam}')
    pullok = pg.evaluate("""(()=>{const E=segue.E,S=Object.assign({},segue.S,{after:'pull',layout:'column',trackMove:'step'});const P=E.plan(S,segue.items);const g=P.segs.find(s=>s.k==='grid');
      const [W,H]=E.canvasSize(S),x=document.createElement('canvas').getContext('2d'),sc=E.scene(S,segue.items,x,segue.fonts,W,H,(g.t0+g.t1)/2);
      const ids=new Set(sc.ops.map(o=>o.i));const xs=sc.ops.map(o=>o.rect.x),ws=sc.ops.map(o=>o.rect.x+o.rect.w);
      return ids.size===segue.items.length&&sc.ops.every(o=>o.rect.x>=0&&o.rect.y>=0&&o.rect.x+o.rect.w<=W&&o.rect.y+o.rect.h<=H)&&Math.abs(Math.min(...xs)-(W-Math.max(...ws)))<1;})()""")
    check('pulled back, every shape is in view, the grid centred', pullok)

    # ---- exports ----
    pg.evaluate("for(const [k,v] of [['hold',.3],['dur',.3],['zOut',.3],['gHold',.3],['zIn',.3],['cSize','custom'],['cW',540],['cH',676],['bg','#F5F5F3'],['name','Test reel']])segue.set(k,v)")
    L = pg.evaluate("segue.plan().L")
    got = {}
    for fmt in ['mp4', 'gif', 'png']:
        pg.evaluate("f=>segue.set('xFormat',f)", fmt); sheet(pg, 'export')
        with pg.expect_download(timeout=240000) as d:
            pg.get_by_role('button', name='Download ' + fmt.upper()).click()
        path = os.path.join(OUT, d.value.suggested_filename); d.value.save_as(path); got[fmt] = path
    m = probe(got['mp4'])
    check('MP4: the size, every frame of the loop, labelled video range BT.709', m.get('width') == 540 and m.get('height') == 676 and int(m.get('nb_frames', 0)) == round(L * 30) and m.get('color_range') == 'tv',
          f"{m.get('width')}×{m.get('height')} {m.get('nb_frames')} frames (loop {L:.2f} s) {m.get('codec_name')} {m.get('color_range')}")
    check('MP4: the background comes back as #F5F5F3', max(abs(x - y) for x, y in zip(pixel(got['mp4'], 3, 3), (245, 245, 243))) <= 2, str(pixel(got['mp4'], 3, 3)))
    check('MP4: named from File name and size', os.path.basename(got['mp4']) == 'Test_reel_540x676.mp4', os.path.basename(got['mp4']))
    gf = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-show_entries', 'stream=width,height,nb_read_frames', '-of', 'json', got['gif']], capture_output=True, text=True).stdout
    gf = json.loads(gf)['streams'][0]
    check('GIF: half size, 20 frames a second', gf['width'] == 270 and gf['height'] == 338 and int(gf['nb_read_frames']) == round(L * 20), str(gf))
    im = Image.open(got['png'])
    check('PNG: full size, the background exact', im.size == (540, 676) and im.convert('RGB').getpixel((2, 2)) == (245, 245, 243), f'{im.size} {im.convert("RGB").getpixel((2,2))}')

    # ---- it all comes back ----
    pg.reload(); time.sleep(2.5)
    back = pg.evaluate("[segue.items.length,segue.items[0].title,segue.S.cW,segue.S.name]")
    check('after a reload: the media, captions and settings are back', back == [4, 'Title 1', 540, 'Test reel'], str(back))
    check('no errors on the page', not errs, '; '.join(errs[:3]))
    b.close()

fails = [r for r in results if not r[0]]
print(f'\n{len(results) - len(fails)} of {len(results)} passed')
sys.exit(1 if fails else 0)

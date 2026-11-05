"""Checks for Segue 0.3: framed loops of images and video for case studies, reels and decks.

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
def gif_rects(path):
    """The rectangle each frame of a GIF writes (left, top, width, height), read from its image descriptors."""
    b = open(path, 'rb').read(); i = 13; out = []
    if b[10] & 0x80: i += 3 * (2 << (b[10] & 7))
    while i < len(b):
        t = b[i]
        if t == 0x3B: break
        if t == 0x21:
            i += 2
            while b[i]: i += b[i] + 1
            i += 1
        elif t == 0x2C:
            x, y, w, h, f = int.from_bytes(b[i+1:i+3], 'little'), int.from_bytes(b[i+3:i+5], 'little'), int.from_bytes(b[i+5:i+7], 'little'), int.from_bytes(b[i+7:i+9], 'little'), b[i+9]
            out.append((x, y, w, h)); i += 10
            if f & 0x80: i += 3 * (2 << (f & 7))
            i += 1
            while b[i]: i += b[i] + 1
            i += 1
        else: break
    return out
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
    check('the panel: Media, Canvas, Motion, Shapes, Captions, Overlay', titles == ['Media', 'Canvas', 'Motion', 'Shapes', 'Captions', 'Overlay'], str(titles))
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
    pg.evaluate("segue.set('cSize','4:5');segue.applyPreset('Ostinato')")
    g1 = pg.evaluate("[segue.S.gap,segue.S.layout,segue.S.trackMove,segue.S.bg,segue.S.cSize]")
    pg.evaluate("segue.set('cSize','custom');segue.set('cW',2160);segue.set('cH',2700);segue.applyPreset('Ostinato')")
    g2 = pg.evaluate("[segue.S.gap,segue.S.cW,segue.S.cH]")
    check('a preset sets the look and motion, not the canvas size', g1[1:] == ['row', 'drift', '#1D1C23', '4:5'], str(g1))
    check('…and scales its px to the canvas (gap 49 at 1080 is 98 at 2160)', g1[0] == 49 and g2[0] == 98 and g2[1:] == [2160, 2700], f'{g1[0]} / {g2}')
    pg.evaluate("segue.set('cSize','4:5');segue.applyPreset('Coda')")
    pg.evaluate("segue.set('xFormat','mp4')"); sheet(pg, 'presets')
    pg.get_by_label('Preset name').fill('Mine'); pg.locator('.save-row .pill').click(); time.sleep(.2)
    check('Save adds your own preset, named', pg.evaluate("JSON.parse(localStorage.getItem('segue:presets')).map(p=>p.name)") == ['Mine'])

    # ---- every layout and move draws, across the loop ----
    bad = pg.evaluate("""(()=>{const E=segue.E,c=document.createElement('canvas');c.width=540;c.height=675;const x=c.getContext('2d');const bad=[];
      const L=[['one',['slide','stack','fade','dip','wipe','open','zoom','through','cut','still']],['row',['step','drift','still']],['column',['step','drift','still']],['grid',['step','drift','still']],
        ['columns',['step','drift','still']],['frames',['push','cover','fade','cut','still']],['float',['step','drift','still']]];
      for(const [lay,ms] of L)for(const m of ms)for(const after of ['carry','pull'])for(const dir of ['left','right','up','down'])for(const cw of ['under','over','above','fixed']){
        const S=Object.assign({},segue.S,{layout:lay,oneMove:m,trackMove:m,fMove:m,after,dir,capWhere:cw,cSize:'custom',cW:540,cH:676,lag:after==='pull'?.08:0,creep:after==='pull'?20:0,colSpeed:dir==='up'?'varied':'same',
          oneFit:['bleed','own','shape'][(dir.length+cw.length)%3],ownScale:cw==='over'?'true':'fit',kb:['none','in','out','drift','parallax','vary'][(m.length+dir.length)%6],kbAmt:8});
        try{const P=E.plan(S,segue.items);for(let t=0;t<P.L;t+=P.L/7){const sc=E.scene(S,segue.items,x,segue.fonts,540,676,t);E.paint(x,sc,S,segue.fonts,{});
          if(!sc.ops.length&&m!=='cut')bad.push([lay,m,after,dir,cw,t,'empty']);}}catch(e){bad.push([lay,m,after,dir,cw,String(e)]);}}
      return bad.slice(0,5);})()""")
    check('every kind × move × direction × caption place draws something, all the way round', not bad, str(bad))
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

    # ---- 0.2: each kind shows its own controls, and only those ----
    def motion_labels():
        return pg.evaluate("""[...document.querySelectorAll('#panel section.card[data-id=motion] .card-body > *')].filter(e=>!e.hidden&&e.offsetParent)
          .map(e=>{const h=e.querySelector(':scope>.ctl-head>span,:scope>.ctl-head>label,:scope .rng-box>.ctl-head>label');return h?h.textContent:(e.querySelector('button.pill')?e.querySelector('button.pill').textContent:null);}).filter(Boolean)""")
    pg.evaluate("document.querySelectorAll('#panel section.card').forEach(c=>{if(c.dataset.id==='motion'&&c.classList.contains('collapsed'))c.querySelector('.card-toggle').click();})")
    kinds = pg.evaluate("[...document.querySelectorAll('.kinds .kind')].map(b=>b.textContent)")
    check('Motion opens on six kinds', kinds == ['Slides', 'Line', 'Grid', 'Columns', 'Frames', 'Float'], str(kinds))
    want = {
        'Line': (['Kind', 'Move', 'Direction', 'Rest', 'Move time', 'Feel', 'Lag', 'Keep drifting', 'After the last'], {'trackMove': 'step'}),
        'Slides': (['Kind', 'Each slide', 'Transition', 'Direction', 'On screen', 'Transition time', 'Feel', 'Movement', 'After the last'], {'oneMove': 'slide', 'oneFit': 'shape', 'kb': 'none'}),
        'Grid': (['Kind', 'Columns', 'Move', 'Direction', 'Rest', 'Move time', 'Feel', 'Lag', 'Keep drifting'], {'trackMove': 'step'}),
        'Columns': (['Kind', 'Columns', 'Move', 'Directions', 'Rest', 'Move time', 'Feel', 'Out of step', 'Keep drifting', 'Offset'], {'trackMove': 'step'}),
        'Frames': (['Kind', 'Across', 'Down', 'Change', 'Direction', 'Rest', 'Move time', 'Feel', 'Lag'], {'fMove': 'push', 'fCols': 2, 'fRows': 1}),
        'Float': (['Kind', 'Move', 'Direction', 'Depth', 'Spread', 'Shuffle', 'Rest', 'Move time', 'Feel', 'Keep drifting'], {'trackMove': 'step'})}
    seen = {}
    for name, (labels, setup) in want.items():
        pg.locator('.kinds .kind', has_text=name).click(); time.sleep(.15)
        pg.evaluate("o=>{for(const k in o)segue.set(k,o[k]);segue.set('after','carry')}", setup); time.sleep(.15)
        seen[name] = motion_labels()
    check('each kind shows only its own controls, in the same order (how many, what moves, timing, feel, character)',
          all(seen[k] == v[0] for k, v in want.items()), '; '.join(f'{k}: {seen[k]}' for k in want if seen[k] != want[k][0]))
    pg.locator('.kinds .kind', has_text='Line').click(); time.sleep(.1)
    pg.locator('#panel section.card[data-id=motion] .seg[aria-label=Direction] .pill', has_text='Up').click(); time.sleep(.1)
    a = pg.evaluate("segue.S.layout")
    pg.locator('#panel section.card[data-id=motion] .seg[aria-label=Direction] .pill', has_text='Left').click(); time.sleep(.1)
    b2 = pg.evaluate("segue.S.layout")
    check('Line: Up makes a column, Left makes a row', a == 'column' and b2 == 'row', f'{a} {b2}')
    check('the fonts are in Captions', pg.evaluate("!!document.querySelector('#panel section.card[data-id=captions] .font-list')&&!document.querySelector('#panel section.card[data-id=fonts]')"))

    # ---- 0.2: motion, measured on the engine ----
    lagm = pg.evaluate("""(()=>{const E=segue.E,its=Array.from({length:7},()=>({kind:'image',w:16,h:10}));
      const S={layout:'row',size:40,ratio:'9:19.5',gap:40,trackMove:'step',dir:'left',feel:'coast',hold:.4,dur:1.5,after:'carry',capOn:false,cSize:'custom',cW:1200,cH:800};
      const at=(o,t)=>E.scene(Object.assign({},S,o),its,null,{},1200,800,t).ops.filter(q=>q.rect.x+q.rect.w>0&&q.rect.x<1200).map(q=>q.rect).sort((a,b)=>a.x-b.x);
      const gaps=(o,t)=>{const r=at(o,t);return r.slice(1).map((q,i)=>q.x-(r[i].x+r[i].w));};
      /* how far each visible shape has gone from where it rested (all landed by .36 s: the last of the
         previous move lands 0.04 × 9 after the loop starts), early in the next move */
      const keyed=(o,t)=>{const m={};for(const q of E.scene(Object.assign({},S,o),its,null,{},1200,800,t).ops)m[q.key]=q.rect.x;return m;};
      const moved=(o,t)=>{const a=keyed(o,.39),b=keyed(o,t);return Object.keys(a).filter(k=>a[k]+148>0&&a[k]<1200).sort((x,y)=>a[x]-a[y]).map(k=>a[k]-b[k]);};
      return {rest:gaps({lag:.06},.39),mid:gaps({lag:.06},.62),land:gaps({lag:.06},2.29),none:gaps({},.62),early:moved({lag:.06},.5)};})()""")
    check('Lag: the shape ahead sets off first, each one after it a beat later',
          all(lagm['early'][i] >= lagm['early'][i + 1] - .01 for i in range(len(lagm['early']) - 1)) and lagm['early'][0] > lagm['early'][-1] + 1, str([round(x, 1) for x in lagm['early']]))
    check('Lag: the gaps open mid-move and close again as they land',
          all(abs(g - 40) < .5 for g in lagm['rest'] + lagm['land']) and max(lagm['mid']) > 52 and all(abs(g - 40) < .5 for g in lagm['none']),
          f"rest {lagm['rest']} mid {[round(g) for g in lagm['mid']]} landed {lagm['land']} without lag {[round(g) for g in lagm['none']]}")
    creep = pg.evaluate("""(()=>{const E=segue.E,its=Array.from({length:5},()=>({kind:'image',w:16,h:10}));
      const S={layout:'column',trackMove:'step',hold:1,dur:1,feel:'glide',after:'carry',creep:20};const P=E.plan(S,its);
      return [E.cameraAt(P,S,.1).p,E.cameraAt(P,S,.9).p,E.cameraAt(P,S,2).p,E.cameraAt(P,Object.assign({},S,{creep:0}),.9).p];})()""")
    check('Keep drifting: it keeps moving while it rests, and still meets each stop', creep[1] > creep[0] + .05 and abs(creep[2] - 1) < 1e-9 and creep[3] == 0, str([round(x, 3) for x in creep]))
    cols = pg.evaluate("""(()=>{const E=segue.E,its=Array.from({length:6},()=>({kind:'image',w:16,h:10}));
      const S={layout:'columns',cols:3,size:90,gap:20,ratio:'4:5',trackMove:'drift',colDir:'alt',colSpeed:'varied',spsh:2,capOn:false,cSize:'4:5',colOff:0};
      const P=E.plan(S,its),y=(t,c)=>{const o=E.scene(S,its,null,{},1080,1350,t).ops.find(q=>q.key==='c'+c+'.0');return o?o.rect.y:null;};
      const v=c=>{let a=y(0,c),b=y(.05,c);return (b-a)/.05;};
      return {L:P.L,v:[v(0),v(1),v(2)]};})()""")
    check('Columns: alternate columns run down, up, down', cols['v'][0] > 0 and cols['v'][1] < 0 and cols['v'][2] > 0, str([round(x) for x in cols['v']]))
    check('Columns: Varied – speeds two, three and four laps a loop', abs(abs(cols['v'][1]) / cols['v'][0] - 1.5) < .02 and abs(cols['v'][2] / cols['v'][0] - 2) < .02, str([round(x) for x in cols['v']]))
    cstep = pg.evaluate("""(()=>{const E=segue.E,its=Array.from({length:6},()=>({kind:'image',w:16,h:10}));
      const S={layout:'columns',cols:3,size:90,gap:20,ratio:'4:5',trackMove:'step',colDir:'up',colLag:.5,hold:2,dur:.5,feel:'glide',capOn:false,cSize:'4:5',colOff:0};
      const y=(t,c)=>E.scene(S,its,null,{},1080,1350,t).ops.find(q=>q.key==='c'+c+'.0').rect.y;
      return [2.2,2.7,3.2].map(t=>[0,1,2].map(c=>+(y(t,c)-y(1,c)).toFixed(1)));})()""")
    check('Columns: out of step – each column moves half a second after the one before', cstep[0][0] < -1 and cstep[0][1] == 0 and cstep[1][1] < -1 and cstep[1][2] == 0 and cstep[2][2] < -1, str(cstep))
    fr = pg.evaluate("""(()=>{const E=segue.E,its=Array.from({length:6},(_,i)=>({kind:'image',w:16,h:10,n:i}));
      const S={layout:'frames',fCols:3,fRows:1,fMove:'push',dir:'up',hold:1,dur:.5,fLag:.3,feel:'glide',capOn:false,cSize:'16:9',size:90,gap:30,ratio:'3:4'};
      const P=E.plan(S,its),sc=t=>E.scene(S,its,null,{},1920,1080,t).ops,frames=t=>sc(t).filter(o=>o.frame!==false).map(o=>[Math.round(o.rect.x),Math.round(o.rect.y),Math.round(o.rect.w)]).join('|');
      const shown=t=>sc(t).filter(o=>o.frame!==false).map(o=>o.i);
      let same=true;for(let t=0;t<P.L;t+=P.L/37)if(frames(t)!==frames(0))same=false;
      return {L:P.L,same,before:shown(.9),mid:sc(1.4).map(o=>[o.i,o.slide?+o.slide[1].toFixed(2):0]),after:shown(2.4)};})()""")
    check('Frames: the frames never move', fr['same'], str(fr['L']))
    check('Frames: the media changes inside them, each frame a beat after the one before', fr['before'] == [0, 1, 2] and fr['after'] == [3, 4, 5] and len(fr['mid']) == 5,
          f"{fr['before']} → {fr['mid']} → {fr['after']}")
    fl = pg.evaluate("""(()=>{const E=segue.E,its=Array.from({length:6},()=>({kind:'image',w:16,h:10}));
      const S={layout:'float',dir:'up',flSize:30,depth:60,spread:60,trackMove:'drift',spsh:2,capOn:false,cSize:'4:5'};
      const at=t=>E.scene(S,its,null,{},1080,1350,t).ops,a=at(0),b=at(.02);const by={};
      for(const o of a){const q=b.find(x=>x.key===o.key);if(!q)continue;(by[o.depth]=by[o.depth]||[]).push([o.rect.w,(o.rect.y-q.rect.y)/.02]);}
      return Object.keys(by).sort().map(d=>[by[d][0][0],by[d].reduce((s,x)=>s+x[1],0)/by[d].length]);})()""")
    check('Float: three depths – nearer is bigger and faster, size and speed in step', len(fl) == 3 and fl[0][0] < fl[1][0] < fl[2][0] and fl[0][1] < fl[1][1] < fl[2][1]
          and abs(fl[2][1] / fl[0][1] - fl[2][0] / fl[0][0]) < .02, str([[round(w), round(v)] for w, v in fl]))
    seams = pg.evaluate("""async()=>{const its=segue.items.filter(i=>i.kind==='image');const E=segue.E;const out={};
      const cases={line:{layout:'row',trackMove:'step',lag:.08,creep:20,feel:'coast',after:'carry'},columns:{layout:'columns',trackMove:'step',colLag:.4,creep:15},wall:{layout:'columns',trackMove:'drift',colSpeed:'varied',ratio:'media'},
        frames:{layout:'frames',fCols:2,fRows:1,fMove:'push',fLag:.3},float:{layout:'float',trackMove:'step',creep:20,depth:60},floatdrift:{layout:'float',trackMove:'drift',dir:'left'}};
      for(const k in cases){const S=Object.assign({},segue.S,{cSize:'custom',cW:540,cH:676,capOn:true,capWhere:'under'},cases[k]);
        const draw=t=>{const c=document.createElement('canvas');c.width=540;c.height=676;const x=c.getContext('2d');E.paint(x,E.scene(S,its,x,segue.fonts,540,676,t),S,segue.fonts,{media:(cx,o,r)=>cx.drawImage(o.item.src,r.x,r.y,r.w,r.h)});return x.getImageData(0,0,540,676).data;};
        const P=E.plan(S,its),a=draw(0.0001),b=draw(P.L+0.0001);let d=0;for(let i=0;i<a.length;i++)d=Math.max(d,Math.abs(a[i]-b[i]));out[k]=d;}return out;}""")
    check('the new kinds loop exactly – a loop on, the same picture', all(v <= 1 for v in seams.values()), str(seams))

    # ---- 0.2: background, mat and overlay ----
    RED = os.path.join(OUT, 'red.png'); Image.new('RGB', (400, 300), '#EA2631').save(RED)
    WHITE = os.path.join(OUT, 'white.png'); Image.new('RGBA', (200, 200), (255, 255, 255, 255)).save(WHITE)
    pg.set_input_files('#bgfile', RED); pg.set_input_files('#ovfile', WHITE); time.sleep(1)
    px = pg.evaluate("""async()=>{for(const [k,v] of [['layout','frames'],['fCols',1],['fRows',1],['fMove','still'],['size',50],['mat',20],['matC','#0000FF'],['radius',0],['capOn',false],
        ['ovOn',true],['ovKind','image'],['ovW',20],['ovPos','tl'],['ovM',0],['ovBlend','difference'],['bgFit','fill'],['bgImgA',100],['cSize','custom'],['cW',540],['cH',676]])segue.set(k,v);
      const c=document.createElement('canvas');c.width=540;c.height=676;const x=c.getContext('2d');await segue.frameAt(c,x,540,676,0);
      const p=(a,b)=>[...x.getImageData(a,b,1,1).data.slice(0,3)],sc=segue.E.scene(segue.S,segue.items,x,segue.fonts,540,676,0).ops[0].rect;
      return {bg:p(530,660),ov:p(20,20),mat:p(Math.round(sc.x+6),Math.round(sc.y+sc.h/2)),inside:p(Math.round(sc.x+sc.w/2),Math.round(sc.y+sc.h/2))};}""")
    check('a background image fills the canvas', max(abs(a - b) for a, b in zip(px['bg'], (0xEA, 0x26, 0x31))) <= 2, str(px['bg']))
    check('an image over the top, in Difference: white over red turns cyan', max(abs(a - b) for a, b in zip(px['ov'], (255 - 0xEA, 255 - 0x26, 255 - 0x31))) <= 2, str(px['ov']))
    check('a border inside the shape, in its own colour', px['mat'] == [0, 0, 255] and px['inside'] != [0, 0, 255], f"{px['mat']} {px['inside']}")
    txt = pg.evaluate("""async()=>{for(const [k,v] of [['ovKind','text'],['ovText','HELLO'],['OS',120],['OC','#FFFFFF'],['ovBlend','normal'],['ovPos','bc'],['ovM',40]])segue.set(k,v);
      const c=document.createElement('canvas');c.width=540;c.height=676;const x=c.getContext('2d');await segue.frameAt(c,x,540,676,0);
      const rows=[];const d=x.getImageData(0,0,540,676).data;let top=676,bot=0,l=540,r=0;
      for(let y=0;y<676;y++)for(let i=0;i<540;i++){const j=(y*540+i)*4;if(d[j]>250&&d[j+1]>250&&d[j+2]>250){top=Math.min(top,y);bot=Math.max(bot,y);l=Math.min(l,i);r=Math.max(r,i);}}
      return [top,bot,l,r];}""")
    check('text over the top: placed bottom centre, its baseline on the margin', abs(txt[1] - (676 - 40)) <= 2 and abs((txt[2] + txt[3]) / 2 - 270) <= 4, str(txt))
    mw = pg.evaluate("segue.applyPreset('Nocturne');[segue.S.ovOn,segue.S.ovKind,segue.S.ovText,segue.S.ovBlend,segue.S.layout]")
    check('a preset sets the overlay’s look but keeps what you put over the top', mw == [True, 'text', 'HELLO', 'difference', 'float'], str(mw))
    pg.evaluate("segue.applyPreset('Coda');segue.set('ovOn',false)")

    # ---- 0.3: Slides – the showcase kind ----
    names = pg.evaluate("[...document.querySelectorAll('#pcapSheets .preset-row .slot-name')].map(e=>e.textContent)")
    heads = pg.evaluate("[...document.querySelectorAll('#pcapSheets .preset-list .sub-head')].map(e=>e.textContent)")
    check('presets in our own names, grouped by kind – the showcase five climbing in tempo',
          names[:5] == ['Semplice', 'Adagio', 'Andante', 'Allegro', 'Presto'] and 'Milky Way' not in names and 'Card stack' not in names and heads[:2] == ['Slides', 'Line'], f'{names} {heads}')
    pg.evaluate("segue.set('xFormat','mp4');segue.applyPreset('Presto')")
    check('a showcase preset sets the export to GIF', pg.evaluate("segue.S.xFormat") == 'gif')
    def slide_labels(setup):
        pg.evaluate("o=>{for(const k in o)segue.set(k,o[k])}", setup); time.sleep(.15)
        return motion_labels()
    lb = {
        'bleed, cut, still': slide_labels({'oneFit': 'bleed', 'oneMove': 'cut', 'kb': 'none'}),
        'own, push, drift': slide_labels({'oneFit': 'own', 'oneMove': 'slide', 'kb': 'drift'}),
        'bleed, fade, zoom in': slide_labels({'oneFit': 'bleed', 'oneMove': 'fade', 'kb': 'in'})}
    want3 = {'bleed, cut, still': ['Kind', 'Each slide', 'Transition', 'On screen', 'Movement', 'After the last'],
             'own, push, drift': ['Kind', 'Each slide', 'Sizes', 'Transition', 'Direction', 'On screen', 'Transition time', 'Feel', 'Movement', 'Amount', 'After the last'],
             'bleed, fade, zoom in': ['Kind', 'Each slide', 'Transition', 'On screen', 'Transition time', 'Movement', 'Amount', 'After the last']}
    check('Slides shows only what each choice needs – no Feel for a cut or fade, no Direction unless something travels, Sizes only for As it is',
          all(lb[k] == want3[k] for k in want3), '; '.join(f'{k}: {lb[k]}' for k in want3 if lb[k] != want3[k]))
    vis = pg.evaluate("""(()=>{const shapes=()=>!document.querySelector('#panel section[data-id=shapes]').hidden,where=()=>[...document.querySelectorAll('#panel section[data-id=captions] .seg[aria-label=Where] .pill')].map(b=>b.textContent);
      segue.set('capOn',true);segue.set('oneFit','bleed');const a=[shapes(),where()];segue.set('oneFit','own');const b=[shapes(),[...document.querySelectorAll('#c_ratio')].map(e=>!!e.closest('.ctl').offsetParent)[0]];segue.set('oneFit','shape');const c=shapes();segue.set('capOn',false);return [a,b,c];})()""")
    check('Full bleed has no Shapes card and no room under or above; As it is has no shape to pick', vis[0][0] is False and vis[0][1] == ['On it', 'Fixed'] and vis[1][0] is True and vis[1][1] is False and vis[2] is True, str(vis))
    fit = pg.evaluate("""(()=>{const E=segue.E,its=[{kind:'image',w:1080,h:1350},{kind:'image',w:1080,h:1000},{kind:'image',w:2000,h:1000}];
      const S={layout:'one',oneMove:'cut',hold:1,dur:.5,kb:'none',size:80,capOn:false,cSize:'4:5',after:'carry'};
      const r=(o,t)=>E.scene(Object.assign({},S,o),its,null,{},1080,1350,t).ops[0].rect;
      return {bleed:r({oneFit:'bleed'},.1),fit0:r({oneFit:'own',ownScale:'fit'},.1),fit2:r({oneFit:'own',ownScale:'fit'},2.1),true0:r({oneFit:'own',ownScale:'true'},.1),true1:r({oneFit:'own',ownScale:'true'},1.1),true2:r({oneFit:'own',ownScale:'true'},2.1)};})()""")
    ar = lambda r: r['w'] / r['h']
    check('Full bleed: each slide fills the canvas', fit['bleed'] == {'x': 0, 'y': 0, 'w': 1080, 'h': 1350}, str(fit['bleed']))
    check('As it is: each slide keeps its own shape; Fit each fills the space, True to scale keeps one scale',
          abs(ar(fit['fit0']) - .8) < 1e-6 and abs(ar(fit['fit2']) - 2) < 1e-6 and abs(fit['fit2']['w'] - 864) < .5
          and abs(fit['true0']['w'] - fit['true1']['w']) < .01 and abs(fit['true2']['w'] / fit['true0']['w'] - 2000 / 1080) < 1e-6,
          ' '.join(f"{k} {round(v['w'])}×{round(v['h'])}" for k, v in fit.items()))
    kb = pg.evaluate("""(()=>{const E=segue.E,its=Array.from({length:4},(_,i)=>({kind:'image',w:1080,h:1350,moves:i===2?'none':'default'}));
      const S={layout:'one',oneFit:'bleed',oneMove:'fade',hold:1,dur:.5,kb:'in',kbAmt:10,capOn:false,cSize:'4:5',after:'carry'};
      const P=E.plan(S,its),ins=t=>E.scene(S,its,null,{},1080,1350,t).ops.map(o=>[o.i,o.inner?+o.inner.s.toFixed(4):1]);
      const own=Object.assign({},S,{oneFit:'own',size:70,kb:'drift',dir:'left'}),xs=t=>E.scene(own,its,null,{},1080,1350,t).ops.map(o=>[o.i,+o.rect.x.toFixed(1),!!o.inner]);
      return {a:ins(.1),b:ins(.9),fade:ins(1.25),still:ins(3.2),drift:[xs(.1),xs(.9)]};})()""")
    check('Movement: a slide zooms in steadily while it’s on screen and keeps going through the transition',
          kb['a'][0][1] < kb['b'][0][1] and len(kb['fade']) == 2 and kb['fade'][0][1] > kb['b'][0][1] and 1 < kb['fade'][1][1] < kb['fade'][0][1], str(kb))
    check('Movement: a slide set to None in Media stays still', kb['still'] == [[2, 1]], str(kb['still']))
    check('Movement: As it is drifts the whole slide (nothing cropped), the way Direction says',
          kb['drift'][0][0][1] > kb['drift'][1][0][1] and not kb['drift'][0][0][2], str(kb['drift']))
    hold = pg.evaluate("""(()=>{const E=segue.E,its=[{kind:'image',w:10,h:10},{kind:'image',w:10,h:10,hold:3},{kind:'image',w:10,h:10}];
      return [E.plan({layout:'one',oneMove:'fade',hold:1,dur:.5,after:'carry'},its).L,E.plan({layout:'one',oneMove:'cut',hold:1,dur:.5,after:'carry'},[{kind:'image',w:10,h:10,hold:4}]).kind];})()""")
    check('A slide can have its own time on screen; a single slide just stays, moving in and back out', abs(hold[0] - (1 + 3 + 1 + 3 * .5)) < 1e-9 and hold[1] == 'still', str(hold))
    thr = pg.evaluate("""(()=>{const E=segue.E,its=Array.from({length:3},()=>({kind:'image',w:1080,h:1350}));
      const S={layout:'one',oneFit:'bleed',oneMove:'through',feel:'linear',hold:1,dur:1,kb:'none',capOn:false,cSize:'4:5',after:'carry'};
      const at=t=>E.scene(S,its,null,{},1080,1350,t).ops.map(o=>[o.i,+(o.rect.w/1080).toFixed(3)]);
      const O=Object.assign({},S,{oneMove:'open'}),op=t=>E.scene(O,its,null,{},1080,1350,t).ops.map(o=>[o.i,o.clip?+(o.clip.w/1080).toFixed(3):null,o.clip&&o.clip.out?'out':'in']);
      return {start:at(1.001),mid:at(1.5),end:at(1.999),open:op(1.5)};})()""")
    check('Through: the next comes up from a small card in the middle (12%), off at once and slowing as it fills the frame, as this one carries on past',
          thr['start'][1][1] < .13 and thr['mid'][1][1] > .12 ** .5 + .1 and thr['end'][1][1] > .99 and thr['mid'][0][1] > 1, str(thr))
    check('Open: a window opens from the middle onto the next; this one shows only outside it', thr['open'] == [[0, .5, 'out'], [1, .5, 'in']], str(thr['open']))
    seam3 = pg.evaluate("""async()=>{const its=segue.items.filter(i=>i.kind==='image');const E=segue.E;const out={};
      for(const [k,o] of Object.entries({presto:{oneFit:'bleed',oneMove:'through',kb:'in',kbAmt:22},andante:{oneFit:'own',oneMove:'slide',kb:'drift'},shape:{oneFit:'shape',oneMove:'wipe',kb:'parallax'},adagio:{oneFit:'bleed',oneMove:'fade',kb:'vary'}})){
        const S=Object.assign({},segue.S,{layout:'one',cSize:'custom',cW:540,cH:676,capOn:false,hold:.6,dur:.5,after:'carry'},o);
        const draw=t=>{const c=document.createElement('canvas');c.width=540;c.height=676;const x=c.getContext('2d');E.paint(x,E.scene(S,its,x,segue.fonts,540,676,t),S,segue.fonts,{media:(cx,q,r)=>cx.drawImage(q.item.src,r.x,r.y,r.w,r.h)});return x.getImageData(0,0,540,676).data;};
        const P=E.plan(S,its),a=draw(0.0001),b=draw(P.L+0.0001);let d=0;for(let i=0;i<a.length;i++)d=Math.max(d,Math.abs(a[i]-b[i]));out[k]=d;}return out;}""")
    check('Slides loop exactly with movement, in every framing', all(v <= 1 for v in seam3.values()), str(seam3))

    # ---- 0.3: GIFs made for showcasing ----
    pg.evaluate("for(const [k,v] of [['cSize','custom'],['cW',540],['cH',676],['xGifScale',.5],['xGifFps',20],['xFormat','gif'],['bg','#F5F5F3'],['bgImgA',0],['ovOn',false]])segue.set(k,v)")
    def gif_of(js):
        pg.evaluate(js); sheet(pg, 'export')
        with pg.expect_download(timeout=240000) as d:
            pg.get_by_role('button', name='Download GIF').click()
        path = os.path.join(OUT, 'show_' + str(len(results)) + '.gif'); d.value.save_as(path)
        im = Image.open(path); n = 0; total = 0; first = None
        try:
            while True:
                total += im.info.get('duration', 0); n += 1
                if first is None: first = im.convert('RGB').copy()
                im.seek(im.tell() + 1)
        except EOFError: pass
        return path, n, total, first
    L1 = pg.evaluate("segue.applyPreset('Semplice');for(const [k,v] of [['xGifScale',.5],['xGifFps',20],['bg','#F5F5F3'],['bgImgA',0]])segue.set(k,v);segue.plan().L")
    imgs = pg.evaluate("segue.items.filter(i=>i.kind==='image').length")
    pg.evaluate("window._keep=segue.items.slice();segue.items.splice(0,segue.items.length,...segue.items.filter(i=>i.kind==='image'));segue.refresh()")
    L1 = pg.evaluate("segue.plan().L")
    p1, n1, t1, f1 = gif_of("segue.set('xFormat','gif')")
    check('GIF: straight cuts of still slides – one frame per slide, each held, the loop’s length exactly',
          n1 == imgs and abs(t1 - L1 * 1000) <= 10 and os.path.getsize(p1) < 200000, f'{n1} frames for {imgs} slides, {t1} ms (loop {L1:.2f} s), {os.path.getsize(p1)//1000} KB')
    pg.evaluate("segue.set('oneFit','own');segue.set('bg','#F5F5F3');segue.set('size',70)")
    p2, n2, t2, f2 = gif_of("segue.set('xFormat','gif')")
    bgpx = f2.getpixel((2, 2)) if f2 else None
    check('GIF: flat colours come out exact (#F5F5F3, not rounded)', bgpx == (245, 245, 243), str(bgpx))
    pg.evaluate("segue.set('oneMove','fade');segue.set('dur',.5);segue.set('kb','in')")
    L3 = pg.evaluate("segue.plan().L")
    p3, n3, t3, f3 = gif_of("segue.set('xFormat','gif')")
    rects = gif_rects(p3); part = sum(1 for r in rects[1:] if r[2] * r[3] < 270 * 338)
    check('GIF: with movement, the frames are written – but only the part of each that changed',
          n3 > 3 * imgs and abs(t3 - L3 * 1000) <= 10 and rects[0] == (0, 0, 270, 338) and part >= len(rects) // 2, f'{n3} frames (loop {L3:.2f} s), {os.path.getsize(p3)//1000} KB, {part} of {len(rects)} partial')
    pg.evaluate("segue.items.splice(0,segue.items.length,...window._keep);segue.refresh();segue.applyPreset('Coda');segue.set('ovOn',false)")

    # ---- exports ----
    pg.evaluate("for(const [k,v] of [['hold',.3],['dur',.3],['zOut',.3],['gHold',.3],['zIn',.3],['cSize','custom'],['cW',540],['cH',676],['bg','#F5F5F3'],['bgImgA',0],['name','Test reel']])segue.set(k,v)")
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
    gim = Image.open(got['gif']); gn = 0; gt = 0
    try:
        while True: gt += gim.info.get('duration', 0); gn += 1; gim.seek(gim.tell() + 1)
    except EOFError: pass
    check('GIF: half size, 20 frames a second at most, the loop’s length exactly', gim.size == (270, 338) and gn <= round(L * 20) and abs(gt - L * 1000) <= 10, f'{gim.size} {gn} frames {gt} ms')
    im = Image.open(got['png'])
    check('PNG: full size, the background exact', im.size == (540, 676) and im.convert('RGB').getpixel((2, 2)) == (245, 245, 243), f'{im.size} {im.convert("RGB").getpixel((2,2))}')

    # ---- it all comes back ----
    pg.reload(); time.sleep(2.5)
    back = pg.evaluate("[segue.items.length,segue.items[0].title,segue.S.cW,segue.S.name,!!segue.pics.bg,!!segue.pics.ov]")
    check('after a reload: the media, captions, settings and both images are back', back == [4, 'Title 1', 540, 'Test reel', True, True], str(back))
    check('no errors on the page', not errs, '; '.join(errs[:3]))
    b.close()

fails = [r for r in results if not r[0]]
print(f'\n{len(results) - len(fails)} of {len(results)} passed')
sys.exit(1 if fails else 0)

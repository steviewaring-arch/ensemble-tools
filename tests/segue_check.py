"""Checks for Segue 0.4: framed loops of images and video for case studies, reels and decks.

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
from PIL import Image, ImageDraw, ImageFont
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
    # 0.14: a piece's Timing, Look and Plays are shut at first – the checks below work with them open
    ctx.add_init_script("try{if(!localStorage.getItem('segue:folds'))localStorage.setItem('segue:folds',JSON.stringify({'piece:timing':true,'piece:look':true,'piece:plays':true}))}catch(e){}")
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(url); time.sleep(1.2)
    OPEN_TIER = "(()=>{const t=document.querySelector('.tier');if(t&&!t.classList.contains('open'))t.querySelector('.tier-head').click();})()"
    tier_shut = pg.evaluate("!document.querySelector('.tier')&&[['captions','capOn'],['overlay','ovOn']].every(([id,k])=>document.querySelector(`#panel section.card[data-id=${id}]`).classList.contains('collapsed')===!segue.S[k])")
    pg.evaluate(OPEN_TIER); time.sleep(.3)

    # ---- the frame ----
    titles = pg.evaluate("[...document.querySelectorAll('#panel section.card>h2 .card-toggle>span:first-child')].map(e=>e.textContent)")
    check('the panel in the order of work (0.16): Canvas, Media, Layout, Motion, then Captions and Overlay – sections like the rest, each shut while it’s off; no Additionals tier',
          titles == ['Canvas', 'Media', 'Layout', 'Motion', 'Captions', 'Overlay'] and tier_shut
          and pg.evaluate("[...document.querySelectorAll('#panel>section.card')].map(c=>c.dataset.id).join()") == 'canvas,media,layout,motion,captions,overlay', f'{titles} shut at first: {tier_shut}')
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
    # Snap (0.7), measured frame by frame from two motion-pack recordings: a slow start, a throw across the middle, a long settle
    snap = pg.evaluate("""(()=>{const E=segue.E,F=E.FEEL.snap,its=Array.from({length:5},()=>({kind:'image',w:1080,h:1350}));
      const S={layout:'row',ratio:'4:5',size:60,gap:40,radius:0,trackMove:'step',dir:'left',feel:'snap',hold:2,dur:.9,lag:0,creep:0,after:'carry',capOn:false,cSize:'4:5'};
      const sc=(o,t)=>E.scene(Object.assign({},S,o),its,null,{},1080,1350,t).ops;
      const pos=(o,t,i)=>{const a=sc(o,t).filter(q=>q.i===i);return a.length?a[0].rect.x:null;};
      const x0=pos({},0.05,1),pitch=x0-pos({},0.05,0),out={};   /* shape 1 sits one pitch to the right of shape 0 */
      out.curve=[.1,.3,.5,.7,.9].map(k=>+F(k).toFixed(4));out.max=Math.max(...[...Array(201)].map((_,i)=>F(i/200)));
      out.travel=[2.0,2.2,2.45,2.9,3.2].map(t=>+((x0-pos({},t,1))/pitch).toFixed(4));
      out.gaps=[0.05,2.2,2.45,2.7,5.0].map(t=>{const a=sc({},t).map(q=>q.rect.x).sort((a,b)=>a-b);return new Set(a.slice(1).map((v,i)=>+(v-a[i]).toFixed(3))).size;});
      out.creep=[0,15].map(c=>+((x0-pos({creep:c},2.0,1))/pitch).toFixed(4));
      const L=E.plan(Object.assign({},S,{creep:15}),its).L,a=sc({creep:15},0.0001).map(q=>[q.i,q.rect.x]),b=sc({creep:15},L+0.0001).map(q=>[q.i,q.rect.x]);
      out.seam=Math.max(...a.map((v,i)=>Math.abs(v[1]-b[i][1])));out.same=a.length===b.length;
      return out;})()""")
    ref = [.0184, .1134, .7842, .9532, .9946]
    check('Snap is the measured curve – cubic-bezier(.84, .11, .01, .98): a slow start, 78% of the way by the half-way mark, a long settle, never past the mark',
          all(abs(a - b) < .003 for a, b in zip(snap['curve'], ref)) and snap['max'] <= 1.0000001, str(snap['curve']))
    check('a Snap move carries the row exactly one shape along (to the pixel) – and follows that curve in time',
          abs(snap['travel'][0]) < 1e-6 and abs(snap['travel'][2] - .7842) < .004 and abs(snap['travel'][3] - 1) < 1e-6 and abs(snap['travel'][4] - 1) < 1e-6, str(snap['travel']))
    check('a Snap row moves as one rigid piece – the gaps between shapes never change, at rest or mid-throw', snap['gaps'] == [1, 1, 1, 1, 1], str(snap['gaps']))
    check('Keep drifting keeps a rest alive – none at 0%, about a tenth of a shape over a 2 s rest at 15%', snap['creep'][0] == 0 and abs(snap['creep'][1] - .1034) < .004, str(snap['creep']))
    check('a Snap loop with Keep drifting closes exactly – the last frame runs into the first', snap['same'] and snap['seam'] < .01, f"{snap['seam']}")
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
      const L=[['one',['slide','stack','fade','dip','wipe','open','zoom','through','cut','still']],['row',['step','drift','still']],['column',['step','drift','still']],['grid',['step','drift','still']],
        ['columns',['step','drift','still']],['frames',['push','cover','fade','cut','still']],['float',['step','drift','still']],['wall',['step','drift','still']]];
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
    pullok = pg.evaluate("""(()=>{const E=segue.E,S=Object.assign({},segue.S,{after:'pull',layout:'column',trackMove:'step',gFloat:0});const P=E.plan(S,segue.items);const g=P.segs.find(s=>s.k==='grid');
      const [W,H]=E.canvasSize(S),x=document.createElement('canvas').getContext('2d'),sc=E.scene(S,segue.items,x,segue.fonts,W,H,(g.t0+g.t1)/2);
      const ids=new Set(sc.ops.map(o=>o.i));const xs=sc.ops.map(o=>o.rect.x),ws=sc.ops.map(o=>o.rect.x+o.rect.w);
      return ids.size===segue.items.length&&sc.ops.every(o=>o.rect.x>=0&&o.rect.y>=0&&o.rect.x+o.rect.w<=W&&o.rect.y+o.rect.h<=H)&&Math.abs(Math.min(...xs)-(W-Math.max(...ws)))<1;})()""")
    check('pulled back, every shape is in view, the grid centred', pullok)

    # ---- 0.2: each kind shows its own controls, and only those ----
    def motion_labels():
        # what the Motion card shows, top to bottom: rows by label, and each group (▸) with the rows inside it
        return pg.evaluate("""(()=>{const lab=e=>{const h=e.querySelector(':scope>.ctl-head>span,:scope>.ctl-head>label,:scope .rng-box>.ctl-head>label');return h?h.textContent:(e.querySelector('button.pill')?e.querySelector('button.pill').textContent:null);};
          const out=[],walk=box=>[...box.children].filter(e=>!e.hidden&&e.offsetParent).forEach(e=>{
            if(e.classList.contains('fold')){out.push('▸ '+e.querySelector(':scope>.fold-head>span').textContent);walk(e.querySelector(':scope>.fold-body'));}
            else{const l=lab(e);if(l)out.push(l);}});
          /* 0.14: Layout's own rows (not its Shapes groups), then Motion */
          [...document.querySelector('#panel section.card[data-id=layout] .card-body').children].filter(e=>!e.hidden&&e.offsetParent&&!e.classList.contains('fold')).forEach(e=>{const l=lab(e);if(l)out.push(l);});
          walk(document.querySelector('#panel section.card[data-id=motion] .card-body'));return out;})()""")
    pg.evaluate("document.querySelectorAll('#panel section.card').forEach(c=>{if((c.dataset.id==='motion'||c.dataset.id==='layout')&&c.classList.contains('collapsed'))c.querySelector('.card-toggle').click();})")
    kinds = pg.evaluate("[...document.querySelectorAll('.kinds .kind')].map(b=>b.textContent)")
    check('Motion opens on eight kinds – the ones a camera moves across first, then the ones with a clock each (Rows beside Columns, 0.9)', kinds == ['Slides', 'Line', 'Grid', 'Wall', 'Columns', 'Rows', 'Frames', 'Float'], str(kinds))
    want = {
        'Line': (['Kind', 'Move', 'Direction', '▸ Timing', 'Rest', 'Move time', '▸ Character', 'Feel', 'Movement', 'Lag', 'Keep drifting', '▸ After the last', 'Then'], {'trackMove': 'step'}),
        'Slides': (['Kind', 'Each slide', 'Transition', 'Direction', '▸ Timing', 'On screen', 'Transition time', '▸ Character', 'Feel', 'Movement', '▸ After the last', 'Then'], {'oneMove': 'slide', 'oneFit': 'shape', 'kb': 'none'}),
        'Grid': (['Kind', 'Columns', 'Move', 'Direction', '▸ Timing', 'Rest', 'Move time', '▸ Character', 'Feel', 'Movement', 'Lag', 'Keep drifting'], {'trackMove': 'step'}),
        'Columns': (['Kind', 'Columns', 'Offset', 'Move', 'Directions', 'Speeds', '▸ Timing', 'Rest', 'Move time', '▸ Character', 'Feel', 'Movement', 'Lag', 'Keep drifting'], {'trackMove': 'step', 'colDir': 'alt', 'colSpeed': 'same'}),
        'Rows': (['Kind', 'Rows', 'Offset', 'Move', 'Directions', 'Speeds', '▸ Each row', 'Row 1', 'Row 2', 'Row 3', '▸ Timing', 'Each shape', '▸ Character', 'Movement'], {'trackMove': 'drift', 'cols': 3, 'colDir': 'own', 'colSpeed': 'same'}),
        'Frames': (['Kind', 'Across', 'Down', 'Each frame', 'Change', 'Direction', '▸ Timing', 'Rest', 'Move time', '▸ Character', 'Feel', 'Movement', 'Lag'], {'fMove': 'push', 'fCols': 2, 'fRows': 1}),
        'Float': (['Kind', 'Depth', 'Spread', 'Shuffle', 'Move', 'Direction', '▸ Timing', 'Rest', 'Move time', '▸ Character', 'Feel', 'Movement', 'Keep drifting'], {'trackMove': 'step'}),
        'Wall': (['Kind', 'Columns', 'Rows', 'Offset', 'Move', 'Path', 'Direction', 'Distance', '▸ Timing', 'Rest', 'Move time', '▸ Character', 'Feel', 'Movement', 'Keep drifting'], {'trackMove': 'step', 'wPath': 'across', 'wOff': 0})}
    seen = {}
    for name, (labels, setup) in want.items():
        pg.locator('.kinds .kind', has_text=name).click(); time.sleep(.15)
        pg.evaluate("o=>{for(const k in o)segue.set(k,o[k]);segue.set('after','carry')}", setup); time.sleep(.15)
        seen[name] = motion_labels()
    check('each kind shows only its own controls, in the same order: what moves and which way, then Timing, Character and After the last',
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
    wl = pg.evaluate("""(()=>{const E=segue.E,out={};
      const its=n=>Array.from({length:n},()=>({kind:'image',w:1080,h:1350}));
      const S={layout:'wall',wCols:3,wRows:2,wPath:'across',wStep:1,wOff:0,ratio:'4:5',size:96,gap:24,radius:0,trackMove:'step',dir:'left',feel:'snap',hold:1.5,dur:.9,creep:0,capOn:false,cSize:'4:5'};
      const sc=(o,n,t)=>E.scene(Object.assign({},S,o),its(n),null,{},1080,1350,t);
      const key=(o,n,t)=>sc(o,n,t).ops.map(q=>q.i+':'+q.rect.x.toFixed(2)+','+q.rect.y.toFixed(2)).sort().join('|');
      /* every route, any number of media: a loop on is the same picture, and the plan says how many moves it took */
      out.closes=[];out.moves={};
      for(const path of ['across','diagonal','stairs','square'])for(const dir of ['left','up','right','down'])for(const n of [1,2,3,5,6,7])for(const off of [0,50]){const o={wPath:path,dir,wOff:off},P=E.plan(Object.assign({},S,o),its(n));
        if(key(o,n,.001)!==key(o,n,P.L+.001))out.closes.push([path,dir,n,off]);}
      for(const [path,n] of [['across',6],['across',7],['diagonal',6],['stairs',6],['square',6]])out.moves[path+n]=E.plan(Object.assign({},S,{wPath:path}),its(n)).n;
      out.brick=[E.plan(Object.assign({},S,{wOff:50}),its(5)).n,E.plan(Object.assign({},S,{wOff:50}),its(6)).n,E.plan(S,its(5)).n];
      /* the camera follows the Snap, and everything moves as one: the gaps never change */
      const P=E.plan(S,its(6));
      out.curve=[1.6,1.8,2.0,2.2,2.3].map(t=>Math.abs(E.wallCamera(P,S,t)[0]-E.FEEL.snap((t-1.5)/.9)));
      const row=t=>{const o=sc({},6,t).ops,y0=o[0].rect.y;return o.filter(q=>Math.abs(q.rect.y-y0)<1).map(q=>q.rect.x).sort((a,b)=>a-b);};
      out.gaps=[.1,1.7,1.9,2.1,3.2].map(t=>{const r=row(t);return Math.max(...r.slice(1).map((x,i)=>Math.abs(x-r[i]-(1080*.96-48)/3-24)));});
      /* rows and columns are yours: more columns, narrower tiles; offset drops every other column */
      const w=(o)=>sc(o,6,.1).ops[0].rect.w;out.cols=[w({wCols:2}),w({wCols:3}),w({wCols:4})];
      const o=sc({wOff:50},6,.1).ops,byX={};for(const q of o){(byX[Math.round(q.rect.x)]=byX[Math.round(q.rect.x)]||[]).push(q.rect.y);}
      const xs=Object.keys(byX).map(Number).sort((a,b)=>a-b),top=xs.map(x=>Math.min(...byX[x].filter(y=>y>=-1)));
      out.brick2=[top[1]-top[0],top[2]-top[1]].map(v=>Math.abs(Math.round(v)));out.tile=sc({},6,.1).ops[0].rect;
      /* drift moves along the route without stopping; a corner is eased, not turned on a point */
      const D=Object.assign({},S,{trackMove:'drift',wPath:'stairs',spsh:2}),PD=E.plan(D,its(6));
      const v=t=>{const a=E.wallCamera(PD,D,t),b=E.wallCamera(PD,D,t+.01);return[(b[0]-a[0])/.01,(b[1]-a[1])/.01];};
      let jump=0,prev=v(0);for(let t=.02;t<PD.L;t+=.02){const c=v(t);jump=Math.max(jump,Math.hypot(c[0]-prev[0],c[1]-prev[1]));prev=c;}out.jump=jump;
      return out;})()""")
    check('Wall: every route, direction and number of media joins up – a loop on, the same picture, with or without offset', not wl['closes'], str(wl['closes'][:6]))
    check('Wall: moves to come round – along takes one a medium, a diagonal or stairs only as many as the pattern needs, a square four',
          wl['moves'] == {'across6': 6, 'across7': 7, 'diagonal6': 3, 'stairs6': 6, 'square6': 4}, str(wl['moves']))
    check('Wall: brickwork with an odd number of media takes two laps to join up', wl['brick'] == [10, 6, 5], str(wl['brick']))
    check('Wall: the camera follows the Snap curve', max(wl['curve']) < .005, str([round(x, 4) for x in wl['curve']]))
    check('Wall: everything moves as one – the gaps never change, in the rest or the throw', max(wl['gaps']) < .01, str([round(x, 3) for x in wl['gaps']]))
    check('Wall: more columns, narrower tiles; Offset sets every other column down', wl['cols'][0] > wl['cols'][1] > wl['cols'][2] and abs(wl['brick2'][0] - wl['tile']['h'] * .5 - 12) < 2 and abs(wl['brick2'][1] - wl['tile']['h'] * .5 - 12) < 2,
          f"{[round(x) for x in wl['cols']]} {wl['brick2']} tile {round(wl['tile']['h'])}")
    check('Wall: Drift runs along the route without stopping, and a corner is eased through', wl['jump'] < .1, f"largest change in speed between samples {wl['jump']:.3f} tiles a second (an unsmoothed corner would be .7)")
    seams = pg.evaluate("""async()=>{const its=segue.items.filter(i=>i.kind==='image');const E=segue.E;const out={};
      const cases={line:{layout:'row',trackMove:'step',lag:.08,creep:20,feel:'coast',after:'carry'},columns:{layout:'columns',trackMove:'step',colLag:.4,creep:15},masonry:{layout:'columns',trackMove:'drift',colSpeed:'varied',ratio:'media'},
        wallstairs:{layout:'wall',trackMove:'step',wPath:'stairs',dir:'left',creep:10},wallbrick:{layout:'wall',trackMove:'step',wPath:'across',dir:'left',wOff:50},walldrift:{layout:'wall',trackMove:'drift',wPath:'square',dir:'right'},wallup:{layout:'wall',trackMove:'step',wPath:'diagonal',dir:'up',wStep:2},
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
    mw = pg.evaluate("segue.applyPreset('Float with title');[segue.S.ovOn,segue.S.ovKind,segue.S.ovText,segue.S.ovBlend,segue.S.layout]")
    check('a preset sets the overlay’s look but keeps what you put over the top', mw == [True, 'text', 'HELLO', 'difference', 'float'], str(mw))
    pg.evaluate("segue.applyPreset('Card stack');segue.set('ovOn',false)")

    # ---- 0.3: Slides – the showcase kind ----
    names = pg.evaluate("[...document.querySelectorAll('#pcapSheets .preset-row .slot-name')].map(e=>e.textContent)")
    heads = pg.evaluate("[...document.querySelectorAll('#pcapSheets .preset-list .sub-head')].map(e=>e.textContent)")
    check('presets named for what they do, grouped by kind – the showcase five first, plainest to most extreme',
          names[:5] == ['Straight cuts', 'Slow fades', 'Push and drift', 'Open and zoom', 'Zoom through'] and not {'Milky Way', 'Semplice', 'Presto', 'Nocturne'} & set(names) and heads[:2] == ['Slides', 'Line'], f'{names} {heads}')
    # ---- 0.8: the Wall's presets, and the little drawings ----
    check('the Wall has presets of its own, listed between Grid and Columns', {'Wall snap', 'Wall stairs', 'Brick wall'} <= set(names) and heads.index('Wall') == heads.index('Grid') + 1 and heads.index('Columns') == heads.index('Wall') + 1, f'{names} {heads}')
    pics = pg.evaluate("""(()=>{const rows=[...document.querySelectorAll('#pcapSheets .preset-row')];
      const fills=new Set(rows.map(r=>getComputedStyle(r.querySelector('.pk svg .pd-bg')).fill));
      return {rows:rows.length,pics:rows.filter(r=>r.querySelector('.pk svg rect')).length,arrows:document.querySelectorAll('#pcapSheets .pk svg path').length,grounds:fills.size,focus:rows.filter(r=>r.querySelector('.pk svg .pd-a')).length,hidden:rows.filter(r=>r.querySelector('.pk svg').getAttribute('aria-hidden')!=='true').length};})()""")
    check('every preset, yours too, has a drawing of itself (0.9): all on one ground, the piece in focus dark, no arrows', pics['pics'] == pics['rows'] and pics['hidden'] == 0 and pics['arrows'] == 0 and pics['grounds'] == 1 and pics['focus'] >= pics['rows'] - 2, str(pics))
    tp = pg.evaluate("""(()=>{const out={};segue.set('layout','one');segue.set('oneFit','shape');
      for(const m of ['cut','slide','fade','through']){segue.set('oneMove',m);const e=document.querySelector('.trans-pic');out[m]=[e.offsetParent!==null,e.querySelectorAll('svg.tp-frame').length,e.querySelector('.fp-cap').textContent.length>5];}
      segue.set('oneMove','slide');const a=document.querySelector('.trans-pic svg').innerHTML;segue.set('oneMove','wipe');const b=document.querySelector('.trans-pic svg').innerHTML;
      segue.set('layout','row');const hidden=document.querySelector('.trans-pic').offsetParent===null;return {out,changes:a!==b,hidden};})()""")
    check('Slides: a picture of the transition – before, halfway, after (a cut has no halfway) – that follows the choice and is gone for the other kinds',
          tp['out']['cut'] == [True, 2, True] and tp['out']['slide'] == [True, 3, True] and tp['out']['fade'] == [True, 3, True] and tp['out']['through'] == [True, 3, True] and tp['changes'] and tp['hidden'], str(tp))
    pp = pg.evaluate("""(()=>{segue.set('layout','wall');segue.set('trackMove','step');segue.set('dir','left');segue.set('wStep',1);
      const e=document.querySelector('.path-pic'),vis=()=>e.offsetParent!==null,svg=()=>e.querySelector('svg').innerHTML,out={shown:vis(),stops:{}};
      for(const p of ['across','diagonal','stairs','square']){segue.set('wPath',p);out.stops[p]=e.querySelectorAll('.pp-stop').length;}
      segue.set('wPath','stairs');const a=svg();segue.set('dir','up');out.dir=a!==svg();segue.set('trackMove','still');out.still=vis();segue.set('trackMove','step');return out;})()""")
    check('Wall: a picture of the route – a dot for each stop, following Path and Direction, gone when it’s Still',
          pp['shown'] and pp['stops'] == {'across': 3, 'diagonal': 3, 'stairs': 5, 'square': 5} and pp['dir'] and not pp['still'], str(pp))
    hint = pg.evaluate("""(()=>{segue.set('layout','wall');segue.set('trackMove','step');const find=()=>{const h=[...document.querySelectorAll('#panel .hint')].find(e=>/two laps/.test(e.textContent));return !!h&&h.offsetParent!==null;};
      const probe=()=>{segue.set('wOff',50);const on=find(),odd=segue.items.length%2===1;segue.set('wOff',0);return [on,odd,find()];};
      const res=[probe()];const x=segue.items.pop();res.push(probe());segue.items.push(x);segue.set('wOff',0);return res;})()""")
    check('Wall: brickwork says so when an odd number of media makes the loop take two laps – and not otherwise', all(r[0] == r[1] and r[2] is False for r in hint) and hint[0][1] != hint[1][1], str(hint))
    sx = pg.evaluate("""(()=>{segue.set('layout','wall');const a=document.querySelector('.ctl.stp[data-k=wCols] .stp-g').getBoundingClientRect(),b=document.querySelector('.ctl[data-k=wOff] .rng-box').getBoundingClientRect(),
      l=document.querySelector('.ctl.stp[data-k=wCols] label').getBoundingClientRect();return [Math.round(a.left-b.left),Math.round((a.top+a.height/2)-(l.top+l.height/2))];})()""")
    check('a stepper starts where the sliders do, with its label level with it', abs(sx[0]) <= 2 and abs(sx[1]) <= 1, str(sx))
    pg.evaluate("segue.applyPreset('Card stack')")
    pg.evaluate("segue.set('xFormat','mp4');segue.applyPreset('Zoom through')")
    check('a showcase preset sets the export to GIF', pg.evaluate("segue.S.xFormat") == 'gif')
    def slide_labels(setup):
        pg.evaluate("o=>{for(const k in o)segue.set(k,o[k])}", setup); time.sleep(.15)
        return motion_labels()
    lb = {
        'bleed, cut, still': slide_labels({'oneFit': 'bleed', 'oneMove': 'cut', 'kb': 'none'}),
        'own, push, drift': slide_labels({'oneFit': 'own', 'oneMove': 'slide', 'kb': 'drift'}),
        'bleed, fade, zoom in': slide_labels({'oneFit': 'bleed', 'oneMove': 'fade', 'kb': 'in'})}
    want3 = {'bleed, cut, still': ['Kind', 'Each slide', 'Transition', '▸ Timing', 'On screen', '▸ Character', 'Movement', '▸ After the last', 'Then'],
             'own, push, drift': ['Kind', 'Each slide', 'Sizes', 'Transition', 'Direction', '▸ Timing', 'On screen', 'Transition time', '▸ Character', 'Feel', 'Movement', 'Amount', '▸ After the last', 'Then'],
             'bleed, fade, zoom in': ['Kind', 'Each slide', 'Transition', '▸ Timing', 'On screen', 'Transition time', '▸ Character', 'Movement', 'Amount', '▸ After the last', 'Then']}
    check('Slides shows only what each choice needs – no Feel for a cut or fade, no Direction unless something travels, Sizes only for As it is',
          all(lb[k] == want3[k] for k in want3), '; '.join(f'{k}: {lb[k]}' for k in want3 if lb[k] != want3[k]))
    vis = pg.evaluate("""(()=>{const shapes=()=>![...document.querySelectorAll('#panel section[data-id=layout] .fold')].find(f=>f.querySelector('.fold-head span').textContent==='Shapes').hidden,where=()=>[...document.querySelectorAll('#panel section[data-id=captions] .seg[aria-label=Where] .pill')].map(b=>b.textContent);
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

    # ---- 0.7: the panel in groups that mean the same everywhere – and a Feel you can see ----
    OUTLINE = """([id,deep])=>{const c=document.querySelector(`#panel section.card[data-id=${id}]`);if(c.classList.contains('collapsed'))c.querySelector('.card-toggle').click();
      if(deep)c.querySelectorAll('.fold-head[aria-expanded=false]').forEach(b=>b.click());
      const lab=e=>{const q=x=>e.querySelector(x);const h=q(':scope>.ctl-head>span,:scope>.ctl-head>label,:scope .rng-box>.ctl-head>label');if(h)return h.textContent;
        const il=q(':scope>.img-lab');if(il)return il.textContent;const cl=q(':scope>label');if(cl)return cl.textContent;const tg=q(':scope>button.toggle');if(tg)return tg.getAttribute('aria-label');
        const pl=q('button.pill');return pl?pl.textContent:null;};
      const out=[],walk=box=>[...box.children].filter(e=>!e.hidden&&e.offsetParent).forEach(e=>{
        if(e.classList.contains('fold')){out.push('▸ '+e.querySelector(':scope>.fold-head>span').textContent);const b=e.querySelector(':scope>.fold-body');if(!b.hidden)walk(b);}
        else{const l=lab(e);if(l)out.push(l);}});
      walk(c.querySelector('.card-body'));return out;}"""
    def outline(cid, deep=False):
        o = pg.evaluate(OUTLINE, [cid, deep]); time.sleep(.35)
        return pg.evaluate(OUTLINE, [cid, deep])
    def group(o, title):
        i = o.index('▸ ' + title); j = i + 1
        while j < len(o) and not o[j].startswith('▸'): j += 1
        return o[i + 1:j]
    pg.evaluate("for(const [k,v] of [['cSize','4:5'],['layout','column'],['trackMove','step'],['after','carry'],['capOn',true],['ovOn',true],['ovKind','text']])segue.set(k,v)"); time.sleep(.3)
    cv = outline('canvas', True)
    check('Canvas: its Size, then Background (colour and image together) – Guides moved to the top bar (0.10), no frame rate here',
          cv[0] == 'Format' and group(cv, 'Background')[:2] == ['Colour', 'Image'] and '▸ Guides' not in cv and 'Frame rate' not in cv and not pg.evaluate("!!document.querySelector('#panel .seg[aria-label=\"Frame rate\"]')"), str(cv))
    cp = outline('captions', True)
    check('Captions: what they do (where, align, arrives), then Position and spacing, each role’s type, Kerning and accent, Fonts',
          cp[:4] == ['Where', 'Align', 'Arrives', 'Over'] and [x for x in cp if x.startswith('▸')] == ['▸ Position and spacing', '▸ Title', '▸ Line', '▸ Tags', '▸ Kerning and accent', '▸ Fonts'], str(cp))
    check('Captions: the space, the line gap and the nudge sit together in Position and spacing; the accent and kerning together in Kerning and accent',
          group(cp, 'Position and spacing') == ['Space', 'Between lines', 'Across', 'Up and down'] and group(cp, 'Kerning and accent') == ['Accent', 'Font kerning', 'Kerning pairs'], f"{group(cp, 'Position and spacing')} {group(cp, 'Kerning and accent')}")
    ov = outline('overlay', True)
    check('Overlay: what goes over, its Type, Position (the pad, margin and nudge together), then Blend and opacity – on and off by the box in its head (0.10)',
          ov[:2] == ['What', 'Text'] and [x for x in ov if x.startswith('▸')] == ['▸ Type', '▸ Position', '▸ Blend and opacity']
          and group(ov, 'Position') in (['Place', 'Margin', 'Across', 'Up and down'], ['Place', 'Across', 'Up and down']) and group(ov, 'Blend and opacity') == ['Blend', 'Opacity'], str(ov))
    pg.evaluate("segue.set('ovOn',false);segue.set('capOn',false)")
    mo = outline('motion')
    check('Motion: After the last holds the choice; Pull back, its settings, appears as a group of its own only when you pull back',
          group(mo, 'After the last') == ['Then'] and '▸ Pull back' not in mo and '▸ Pull back' in (pg.evaluate("segue.set('after','pull')") or time.sleep(.3) or outline('motion')), str(mo))
    pg.evaluate("segue.set('after','carry')")
    export_seg = lambda f: (pg.evaluate("f=>segue.set('xFormat',f)", f), sheet(pg, 'export'), pg.evaluate("[...document.querySelectorAll('#islandSheets .seg')].filter(g=>g.offsetParent).map(g=>g.getAttribute('aria-label'))"))[2]
    ex = {f: export_seg(f) for f in ('mp4', 'gif', 'png')}
    check('Export: the frame rate is a setting of the file – MP4 has Frame rate beside Quality, Scale and Loops; a GIF has its own',
          ex['mp4'] == ['Format', 'Quality', 'Scale', 'Frame rate', 'Loops in the file'] and 'Frame rate' not in ex['gif'] and 'GIF frame rate' in ex['gif'] and ex['png'] == ['Format', 'Scale'], str(ex))
    pg.evaluate("segue.set('xFormat','mp4')"); pg.keyboard.press('Escape'); time.sleep(.2)
    fe = pg.evaluate("""(()=>{const seg=[...document.querySelectorAll('#panel section.card[data-id=motion] .seg[aria-label=Feel] .pill')].map(b=>b.textContent);
      segue.set('layout','row');segue.set('trackMove','step');segue.set('feel','linear');
      const g=()=>[document.querySelector('#panel .feel-pic .fp-curve').getAttribute('d'),document.querySelector('#panel .feel-pic .fp-cap').textContent];
      const a=g();segue.set('feel','snap');const b=g();const mid=d=>+d.split('L')[24].split(' ')[1];
      return {seg,a:[mid(a[0]),a[1]],b:[mid(b[0]),b[1]],shown:document.querySelector('#panel .feel-pic').offsetParent!==null};})()""")
    check('Feel: Snap is first, and the curve under it is drawn – Linear a straight line, Snap thrown across the middle, with what it is in words',
          fe['seg'][0] == 'Snap' and fe['seg'][-1] == 'Linear' and fe['shown'] and abs(fe['a'][0] - 22) < .01 and fe['b'][0] < 14 and fe['b'][1] == 'A slow start, a fast throw, a long settle', str(fe))
    pr = pg.evaluate("""(()=>{const E=segue,out={};for(const n of ['Snap along','Snap up']){segue.applyPreset(n);out[n]=[segue.S.feel,segue.S.lag,segue.S.creep,segue.S.trackMove];}return out;})()""")
    check('the Snap presets: Snap along (a row) and Snap up (a column) – rigid, Snap, a little Keep drifting', all(v[0] == 'snap' and v[1] == 0 and 10 <= v[2] <= 20 and v[3] == 'step' for v in pr.values()), str(pr))
    pg.evaluate("segue.applyPreset('Card stack')")
    # a piece's detail, in the order people reach for it
    pg.evaluate("for(const [k,v] of [['layout','one'],['oneFit','bleed'],['capOn',true]])segue.set(k,v);segue.items.forEach(i=>i.join='own')"); time.sleep(.3)
    def subheads(idx):
        row = pg.locator('.media-list .slot').nth(idx)
        if 'open' not in (row.get_attribute('class') or ''): row.locator('.slot-main').click(); time.sleep(.3)
        h = row.evaluate("e=>[...e.querySelectorAll('.slot-det>.fold>.fold-head>span:first-child')].map(x=>x.textContent+(x.parentElement.getAttribute('aria-expanded')==='false'?' (shut)':''))")
        h = ['Layer switch'] * bool(row.evaluate("e=>!!e.querySelector('.slot-det>.layer-sw button.toggle[role=switch]')")) + h
        row.locator('.slot-main').click(); time.sleep(.2)
        return h
    first_sh, second_sh, clip_sh = subheads(0), subheads(1), subheads(3)
    pg.evaluate("segue.items[2].join='on'"); layer_sh = subheads(2); pg.evaluate("segue.items[2].join='own'")
    check('a piece’s detail (0.11): the “Layer on the piece above” switch first (from the second slide on), then groups – Timing, Crop, Look, (Plays), and the Caption shut; a layer’s: the switch, Layer, Position, Look',
          first_sh == ['Timing', 'Crop', 'Look', 'Caption (shut)'] and second_sh == ['Layer switch', 'Timing', 'Crop', 'Look', 'Caption (shut)'] and clip_sh == ['Layer switch', 'Timing', 'Crop', 'Look', 'Plays', 'Caption (shut)']
          and layer_sh == ['Layer switch', 'Layer', 'Position', 'Look'], f'{first_sh} {second_sh} {clip_sh} {layer_sh}')
    pg.evaluate("segue.set('capOn',false)")

    # ---- 0.4: type a value; drag a piece; a looser pull back ----
    pg.evaluate("segue.applyPreset('Card stack');document.querySelectorAll('#panel section.card').forEach(c=>{if(c.dataset.id==='motion'&&c.classList.contains('collapsed'))c.querySelector('.card-toggle').click();})"); time.sleep(.2)
    def type_into(label, text):
        v = pg.locator('#panel section[data-id=motion] .rng-box', has=pg.locator('label', has_text=label)).first.locator('.val')
        v.click(); time.sleep(.05); pg.keyboard.press('Control+A'); pg.keyboard.type(text); pg.keyboard.press('Enter'); time.sleep(.1)
    type_into('Rest', '2.37'); typed = pg.evaluate("segue.S.hold")
    type_into('Move time', '1.5 s'); typed2 = pg.evaluate("segue.S.dur")
    type_into('Move time', '99'); clamped = pg.evaluate("segue.S.dur")
    shown = pg.locator('#panel section[data-id=motion] .rng-box', has=pg.locator('label', has_text='Rest')).first.locator('.val').text_content()
    check('type a value: click a slider’s number, type, Enter – exact, units optional, kept to the range', typed == 2.37 and typed2 == 1.5 and clamped == 4 and shown == '2.37 s', f'{typed} {typed2} {clamped} “{shown}”')
    pg.evaluate("segue.applyPreset('Card stack')")
    pb = pg.evaluate("""(()=>{const E=segue.E,its=Array.from({length:9},()=>({kind:'image',w:1600,h:1000}));
      const S={layout:'column',ratio:'16:10',size:86,gap:64,trackMove:'step',dir:'up',feel:'inertia',hold:1,dur:.7,after:'pull',gCols:3,gGap:40,gSize:88,zOut:1.1,gHold:1.6,zIn:1.1,zFeel:'soft',capOn:false,cSize:'4:5'};
      const P=E.plan(S,its),g=P.segs.find(x=>x.k==='out'),h=P.segs.find(x=>x.k==='grid');
      const ys=(o,t)=>E.scene(Object.assign({},S,o),its,null,{},1080,1350,t).ops.map(q=>[q.i,+q.rect.x.toFixed(2),+q.rect.y.toFixed(2),+q.alpha.toFixed(3)]).sort().join('|');
      return {start:ys({gStag:60,gFloat:60},g.t0+1e-4)===ys({gStag:0,gFloat:0},g.t0+1e-4),mid:ys({gStag:60,gFloat:0},(g.t0+g.t1)/2)!==ys({gStag:0,gFloat:0},(g.t0+g.t1)/2),
        floats:ys({gStag:0,gFloat:60},h.t0+.3)!==ys({gStag:0,gFloat:60},h.t0+.9),still:ys({gStag:0,gFloat:0},h.t0+.3)===ys({gStag:0,gFloat:0},h.t0+.9)};})()""")
    check('Pull back: Stagger settles each shape a beat apart, Float drifts them while pulled back – and both start from nothing', all(pb.values()), str(pb))
    pg.evaluate("window._keep=segue.items.slice();segue.items.splice(0,segue.items.length,...segue.items.filter(i=>i.kind==='image').slice(0,2));segue.items.forEach(i=>{i.px=0;i.py=0;i.zm=100;i.ox=0;i.oy=0;});segue.refresh()")
    pg.evaluate("for(const [k,v] of [['cSize','custom'],['cW',540],['cH',676],['bgImgA',0]])segue.set(k,v);segue.applyPreset('Straight cuts');segue.set('bgImgA',0);segue.setPlaying(false);segue.setClock(.3)"); time.sleep(.4)
    pg.evaluate("ensembleUI.close();document.querySelectorAll('.media-list .slot-det').length"); time.sleep(.2)
    pg.evaluate("segue.items.forEach(i=>{})"); openrows = pg.evaluate("document.querySelectorAll('.media-list .slot-det').length")
    box = pg.locator('#cv').bounding_box(); cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + box['width'] * .3, cy + 40, steps=6); pg.mouse.up(); time.sleep(.3)
    drag = pg.evaluate("[segue.items[0].px,segue.items[0].py,segue.S.oneFit,document.querySelectorAll('.media-list .slot-det').length]")
    crop = pg.evaluate("""async()=>{const c=document.createElement('canvas');c.width=540;c.height=676;const x=c.getContext('2d'),it=segue.items[0],px=v=>{it.px=v;};
      const at=async v=>{px(v);await segue.frameAt(c,x,540,676,.3);return [...x.getImageData(400,100,1,1).data.slice(0,3)];};const r=[await at(100),await at(0)];px(0);return r;}""")
    check('drag a full-bleed slide on the canvas: it pans the picture across (the only way it has to spare), and its row opens',
          drag[0] > 20 and drag[1] == 0 and drag[2] == 'bleed' and drag[3] >= 1, f'{drag} (rows open before: {openrows})')
    check('Crop across: 100% shows the picture’s left edge, 0 its middle', crop[0] == [245, 245, 243] and crop[1] != [245, 245, 243], str(crop))
    pg.evaluate("segue.set('oneFit','own');segue.set('size',60);segue.setClock(.3)"); time.sleep(.3)
    r0 = pg.evaluate("segue.E.scene(segue.S,segue.items,null,segue.fonts,540,676,.3).ops[0].rect")
    pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx - 30, cy - 20, steps=4); pg.mouse.up(); time.sleep(.3)
    own = pg.evaluate("[segue.items[0].ox,segue.items[0].oy,segue.E.scene(segue.S,segue.items,null,segue.fonts,540,676,.3).ops[0].rect]")
    check('drag a slide shown as it is: it moves the slide itself, nothing cropped', own[0] < 0 and own[1] < 0 and own[2]['x'] < r0['x'] and abs(own[2]['w'] - r0['w']) < .01, f"{own[0]} {own[1]} {round(r0['x'])}→{round(own[2]['x'])}")
    pg.evaluate("segue.items.forEach(i=>{i.px=0;i.py=0;i.zm=100;i.ox=0;i.oy=0;});segue.items.splice(0,segue.items.length,...window._keep);segue.refresh();segue.applyPreset('Card stack')")

    # ---- 0.4.1: crisp exports ----
    SCREEN = os.path.join(OUT, 'screen.png')
    if not os.path.exists(SCREEN):
        sim = Image.new('RGB', (1920, 1200), '#F5F5F3'); sd = ImageDraw.Draw(sim)
        for yy in range(30, 1200, 23): sd.line([(40, yy), (1880, yy)], fill='#1E1D23', width=2)
        for xx in range(40, 1880, 9): sd.line([(xx, 0), (xx, 24)], fill='#1E1D23')
        sim.save(SCREEN)
    pg.evaluate("window._keep=segue.items.slice()")
    pg.set_input_files('#mediafile', [SCREEN]); time.sleep(1.5)
    crisp = pg.evaluate("""async()=>{const it=segue.items[segue.items.length-1];segue.items.splice(0,segue.items.length,it);segue.refresh();
      for(const [k,v] of [['layout','one'],['oneFit','shape'],['ratio','16:10'],['size',40],['oneMove','cut'],['kb','none'],['radius',0],['mat',0],['capOn',false],['cSize','custom'],['cW',1080],['cH',1350],['bgImgA',0],['ovOn',false]])segue.set(k,v);
      const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d',{willReadFrequently:true});
      const sc=segue.E.scene(segue.S,segue.items,x,segue.fonts,1080,1350,.1).ops[0].rect,R=[Math.ceil(sc.x)+2,Math.ceil(sc.y)+2,Math.floor(sc.w)-4,Math.floor(sc.h)-4];
      const grab=async on=>{segue.set('xCrisp',on);await segue.frameAt(c,x,1080,1350,.1);const o=document.createElement('canvas');o.width=Math.round(sc.w);o.height=Math.round(sc.h);
        o.getContext('2d').drawImage(c,Math.round(sc.x),Math.round(sc.y),o.width,o.height,0,0,o.width,o.height);return o.toDataURL('image/png');};
      const t0=performance.now(),a=await grab(true),t1=performance.now(),b=await grab(false);segue.set('xCrisp',true);
      return {crisp:a,plain:b,ms:Math.round(t1-t0),rate:[(segue.set('xQ','std'),segue.mp4Bitrate()),(segue.set('xQ','best'),segue.mp4Bitrate()),(segue.set('xQ','high'),segue.mp4Bitrate())]};}""")
    import base64, io
    import numpy as np
    def img_of(u): return Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB')
    ci, pi = img_of(crisp['crisp']), img_of(crisp['plain'])
    lz = Image.open(SCREEN).convert('RGB').resize(ci.size, Image.LANCZOS)
    rms = lambda a: float(np.sqrt(((np.asarray(a, float)[3:-3, 3:-3] - np.asarray(lz, float)[3:-3, 3:-3]) ** 2).mean()))
    check('Crisp scaling: media scaled down comes out nearer a Lanczos resample (stepped down, then sharpened)', rms(ci) < rms(pi) * .9, f"difference from Lanczos {rms(pi):.2f} → {rms(ci):.2f} ({crisp['ms']} ms for the frame)")
    check('MP4 Quality: Standard 16, High 32, Best 50 Mbps at 1080 × 1350, 30 fps', crisp['rate'] == [16e6, 50e6, 32e6], str(crisp['rate']))
    # 0.4.3: on the pixel grid – fine type in a card at a fractional position, measured as drawn
    TYPE = os.path.join(OUT, 'type.png')
    if not os.path.exists(TYPE):
        tim = Image.new('RGB', (1920, 1200), '#F5F5F3'); td = ImageDraw.Draw(tim)
        def tf(n):
            try: return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', n)
            except Exception: return ImageFont.load_default(size=n)
        yy, k = 8, 0
        while yy < 1200:
            td.text((10, yy), 'Numeral 01 Mono – 12:47:09 – Tempo Series 1 – the quick brown fox jumps over the lazy dog 0123456789 – ' * 3, font=tf(24 if k % 3 == 0 else 15), fill='#1E1D23')
            yy += 34 if k % 3 == 0 else 22; k += 1
        tim.save(TYPE)
    pg.set_input_files('#mediafile', [TYPE]); time.sleep(1.5)
    grid = pg.evaluate("""async()=>{const it=segue.items[segue.items.length-1];segue.items.splice(0,segue.items.length,it);segue.refresh();
      const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d',{willReadFrequently:true});
      let sc=null;for(const sz of [41,43,45,47,49,42,44,46,48]){segue.set('size',sz);sc=segue.E.scene(segue.S,segue.items,x,segue.fonts,1080,1350,.1).ops[0].rect;const f=sc.x%1;if(f>.25&&f<.75)break;}
      const R=[Math.ceil(sc.x)+4,Math.ceil(sc.y)+4,Math.floor(sc.w)-8,Math.floor(sc.h)-8];
      const grab=async on=>{segue.set('xCrisp',on);await segue.frameAt(c,x,1080,1350,.1);const o=document.createElement('canvas');o.width=R[2];o.height=R[3];
        o.getContext('2d').drawImage(c,R[0],R[1],R[2],R[3],0,0,R[2],R[3]);return o.toDataURL('image/png');};
      const a=await grab(true),b=await grab(false);segue.set('xCrisp',true);segue.set('size',40);return {crisp:a,plain:b,x:sc.x,y:sc.y,w:sc.w,R,frac:+(sc.x%1).toFixed(3)};}""")
    def edge(a):
        a = np.asarray(a, float); return float((np.abs(np.diff(a, axis=1))[:-1] + np.abs(np.diff(a, axis=0))[:, :-1]).mean())
    gi, gp = img_of(grid['crisp']).convert('L'), img_of(grid['plain']).convert('L')
    tsrc, gs, R = Image.open(TYPE).convert('L'), grid['w'] / 1920, grid['R']
    on_grid = tsrc.resize((round(1920 * gs), round(1200 * gs)), Image.LANCZOS).crop((4, 4, 4 + gi.width, 4 + gi.height))   # what crisp looks like
    same_place = tsrc.resize((R[2], R[3]), Image.LANCZOS, box=((R[0] - grid['x']) / gs, (R[1] - grid['y']) / gs, (R[0] + R[2] - grid['x']) / gs, (R[1] + R[3] - grid['y']) / gs))
    keep = edge(gi) / edge(on_grid)
    rmsd = lambda a: float(np.sqrt(((np.asarray(a, float) - np.asarray(same_place, float)) ** 2).mean()))
    check('Crisp scaling: fine type in a card at a fractional position lands on the pixel grid – 90% or more of a Lanczos resample’s edge detail, and no aliasing',
          keep >= .9 and rmsd(gi) < rmsd(gp) * .5, f"x + {grid['frac']} px: edge detail {keep:.0%} (0.4.2: 65%); difference from Lanczos at the same place {rmsd(gp):.1f} plain → {rmsd(gi):.1f}")
    pick = pg.evaluate("(async()=>{const r=await segue.pickEncoder(540,676,30,50e6*(540*676)/(1080*1350));return r&&{hw:r.cfg.hardwareAcceleration,mode:r.cfg.bitrateMode,honours:r.honours,full:r.full,third:r.third};})()")
    check('MP4: picks an encoder setup whose file grows with the bitrate (one that ignores it is passed over)', pick and pick['honours'] is True, str(pick))
    pg.evaluate("segue.items.splice(0,segue.items.length,...window._keep);segue.refresh();segue.applyPreset('Card stack')")

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
    L1 = pg.evaluate("segue.applyPreset('Straight cuts');for(const [k,v] of [['xGifScale',.5],['xGifFps',20],['bg','#F5F5F3'],['bgImgA',0]])segue.set(k,v);segue.plan().L")
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
    pg.evaluate("segue.items.splice(0,segue.items.length,...window._keep);segue.refresh();segue.applyPreset('Card stack');segue.set('ovOn',false)")

    # ---- 0.4.4: colour edges in MP4 – magenta on orange, as Steve's 22,41 ----
    HUE = os.path.join(OUT, 'hue.png')
    if not os.path.exists(HUE):
        him = Image.new('RGB', (1920, 1200), '#D54500'); hd = ImageDraw.Draw(him)
        try: hf = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 300)
        except Exception: hf = ImageFont.load_default(size=300)
        hd.text((40, 20), '22,41', font=hf, fill='#FF44FF'); hd.text((40, 520), '09.27', font=hf, fill='#22EE22'); him.save(HUE)
    pg.set_input_files('#mediafile', [HUE]); time.sleep(1.5)
    hue = pg.evaluate("""async()=>{const it=segue.items[segue.items.length-1];segue.items.splice(0,segue.items.length,it);segue.refresh();
      for(const [k,v] of [['cSize','custom'],['cW',540],['cH',676],['layout','one'],['oneFit','own'],['ownScale','fit'],['size',80],['kb','none'],['oneMove','cut'],['hold',.4],['capOn',false],['bg','#FFFFFF'],['radius',0],['bgImgA',0],['ovOn',false],['xFormat','mp4'],['xScale',1]])segue.set(k,v);
      const c=document.createElement('canvas');c.width=540;c.height=676;const x=c.getContext('2d',{willReadFrequently:true});await segue.frameAt(c,x,540,676,.1);
      const b64=async()=>{const blob=await segue.makeMP4(()=>{});const u=new Uint8Array(await blob.arrayBuffer());let z='';for(let i=0;i<u.length;i+=32768)z+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(z);};
      segue.S.xChroma=false;const plain=await b64();segue.S.xChroma=true;const sharp=await b64();
      return {drawn:c.toDataURL('image/png'),plain,sharp,rect:segue.E.scene(segue.S,segue.items,x,segue.fonts,540,676,.1).ops[0].rect};}""")
    import base64
    def hue_frame(b64, name):
        fp = os.path.join(OUT, name); open(fp, 'wb').write(base64.b64decode(b64))
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', fp, '-vf', 'select=eq(n\\,3),scale=flags=accurate_rnd+full_chroma_int:out_range=pc,format=rgb24', '-frames:v', '1', fp[:-4] + '.png'], check=True)
        return fp, np.asarray(Image.open(fp[:-4] + '.png').convert('RGB'), float)
    hr = hue['rect']; hbox = (slice(int(hr['y']) + 2, int(hr['y'] + hr['h']) - 2), slice(int(hr['x']) + 2, int(hr['x'] + hr['w']) - 2))
    hd0 = np.asarray(img_of(hue['drawn']), float)
    hp, hpa = hue_frame(hue['plain'], 'hue_plain.mp4'); hs, hsa = hue_frame(hue['sharp'], 'hue_sharp.mp4')
    hg = hd0[hbox]; hv = np.zeros(hg.shape[:2], bool)   # where the colour changes: within 3 px of an edge in the drawn frame
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            hv |= np.abs(np.roll(np.roll(hg, dy, 0), dx, 1) - hg).max(-1) > 24
    hrms = lambda a: float(np.sqrt(((a[hbox][hv] - hg[hv]) ** 2).mean()))
    check('MP4 colour edges: magenta on orange and green on grey come back nearer the drawn frame (colour refined where it changes)', hrms(hsa) < hrms(hpa) * .8, f'difference from the drawn frame at the edges {hrms(hpa):.1f} (0.4.3) → {hrms(hsa):.1f}')
    cl = probe(hs, 'stream=chroma_location').get('chroma_location')
    check('MP4: the stream says where its colour sits (centre), so players put it back there', cl == 'center', str(cl))
    pg.evaluate("segue.items.splice(0,segue.items.length,...window._keep);segue.refresh();segue.applyPreset('Card stack');segue.set('ovOn',false)")

    # ---- 0.6: layers, blends, a clip's In and Out, the canvas, guides ----
    LP, LT, LF = (os.path.join(OUT, n) for n in ('l_poster.png', 'l_tex.png', 'l_frame.png'))
    im0 = Image.new('RGB', (1080, 1350), '#FFFFFF'); ImageDraw.Draw(im0).rectangle([0, 0, 1080, 675], fill='#EA2631'); im0.save(LP)
    im1 = Image.new('RGB', (1080, 1350), '#FFFFFF'); d1 = ImageDraw.Draw(im1)
    for yy in range(0, 1350, 30): d1.rectangle([0, yy, 1080, yy + 9], fill='#808080')
    im1.save(LT)
    im2 = Image.new('RGBA', (1080, 1350), (17, 17, 17, 255)); ImageDraw.Draw(im2).rectangle([140, 140, 940, 1210], fill=(0, 0, 0, 0)); im2.save(LF)
    pg.evaluate("window._keep=segue.items.slice()")
    pg.set_input_files('#mediafile', [LP, LT, LF, CLIPS[0], IMGS[1]]); time.sleep(2.5)
    lay = pg.evaluate("""async()=>{const n=segue.items.length,[po,tx,fr,cl,b2]=segue.items.slice(n-5);segue.items.splice(0,n,po,tx,fr,cl,b2);
      for(const it of segue.items)Object.assign(it,{join:'own',place:'front',lfit:'own',blend:'normal',opa:100,px:0,py:0,ox:0,oy:0,zm:100,hold:0,start:0,end:0,moves:'default',arrive:'default'});
      for(const [k,v] of [['cSize','custom'],['cW',1080],['cH',1350],['layout','one'],['oneFit','bleed'],['oneMove','cut'],['kb','none'],['hold',1],['capOn',false],['bg','#F5F5F3'],['bgImgA',0],['ovOn',false],['after','carry'],['guides',false]])segue.set(k,v);
      tx.join='on';tx.blend='multiply';tx.lfit='fill';segue.refresh();
      const x=document.createElement('canvas').getContext('2d'),sc=t=>segue.E.scene(segue.S,segue.items,x,segue.fonts,1080,1350,t);
      const keys=sc(.2).ops.map(o=>o.key),stops=segue.plan().stops;
      const c=document.createElement('canvas');c.width=1080;c.height=1350;const cx=c.getContext('2d',{willReadFrequently:true});await segue.frameAt(c,cx,1080,1350,.2);
      const px=(a,b)=>Array.from(cx.getImageData(a,b,1,1).data).slice(0,3);
      const mul={redLine:px(540,4),redGap:px(540,20),whiteLine:px(540,694),whiteGap:px(540,710)};
      b2.join='on';b2.place='behind';b2.lfit='fill';segue.items.splice(0,segue.items.length,po,tx,fr,b2,cl);segue.refresh();
      const h2=segue.plan().segs.find(g=>g.k==='hold'&&g.s===1).t0+.1;await segue.frameAt(c,cx,1080,1350,h2);
      const behind={keys:sc(h2).ops.map(o=>o.key),middle:px(540,900),edge:px(60,675)};
      b2.place='front';b2.lfit='own';b2.zm=50;b2.ox=100;segue.refresh();const o=sc(h2).ops.find(q=>q.item===b2);const place={w:o.rect.w,cx:o.rect.x+o.rect.w/2};
      b2.zm=100;b2.ox=0;tx.join='own';tx.blend='normal';po.opa=50;segue.refresh();await segue.frameAt(c,cx,1080,1350,.2);const half=px(540,300);po.opa=100;
      tx.join='on';segue.set('kb','in');segue.set('kbAmt',20);segue.refresh();const a1=sc(.05).ops,a2=sc(.9).ops;
      const grow={base:[a1[0].inner.s,a2[0].inner.s],layer:[a1[1].rect.w,a2[1].rect.w]};segue.set('kb','none');
      cl.start=1;cl.end=2;const trim=[0,.5,1.5,2.25].map(d=>+segue.E.clipTime(cl,d).toFixed(3));cl.start=0;cl.end=0;segue.refresh();
      return {stops,keys,mul,behind,place,half,grow,trim};}""")
    near = lambda a, b, t=4: all(abs(x - y) <= t for x, y in zip(a, b))
    check('Layers: a piece set on the one before joins that slide, drawn after it (five pieces, four slides)', lay['stops'] == 4 and lay['keys'] == ['s0', 's0.f0'], f"{lay['stops']} slides, {lay['keys']}")
    m = lay['mul']
    check('Layers: Multiply – grey lines darken the red to half and show grey on white; white goes clear', near(m['redLine'], (117, 19, 25), 5) and near(m['redGap'], (234, 38, 49)) and near(m['whiteLine'], (128, 128, 128), 5) and near(m['whiteGap'], (255, 255, 255)), str(m))
    bh = lay['behind']
    check('Layers: Behind – drawn first, showing through where the slide is see-through', bh['keys'] == ['s1.b0', 's1'] and near(bh['middle'], (47, 93, 168)) and near(bh['edge'], (17, 17, 17)), str(bh))
    check('Layers: placed and sized on the slide (As it is at 50%, 100 px right)', abs(lay['place']['w'] - 540) < .5 and abs(lay['place']['cx'] - 640) < .5, str(lay['place']))
    check('Opacity: a slide at 50% over the background', near(lay['half'], (240, 142, 146), 3), str(lay['half']))
    g6 = lay['grow']
    check('Layers move with their slide (Zoom in: the layer grows as the slide does)', g6['base'][1] > g6['base'][0] and abs(g6['layer'][1] / g6['layer'][0] - g6['base'][1] / g6['base'][0]) < 1e-3, str(g6))
    check('A clip plays from Start at to End at and loops between them', lay['trim'] == [1, 1.5, 1.5, 1.25], str(lay['trim']))
    # the canvas, worked with the pointer
    pg.keyboard.press('Escape'); time.sleep(.2); pg.keyboard.press('Escape'); time.sleep(.3)   # no sheet over the work
    pg.evaluate("()=>{const c=document.querySelector('section.card[data-id=media]');if(c.classList.contains('collapsed'))c.querySelector('.card-toggle').click();segue.setPlaying(false);segue.setClock(.2);}"); time.sleep(.4)
    pg.locator('#panel .media-list .slot').nth(4).locator('.slot-main').click(); time.sleep(.6)
    sk = pg.evaluate("()=>{const P=segue.plan(),h=P.segs.find(g=>g.k==='hold'&&g.s===2);return {t:segue.clock,want:h.t0,sel:segue.sel===segue.items[4].id,trim:!!document.querySelector('.slot.open .trim-bar'),playing:segue.playing};}")
    check('Opening a piece’s row takes the playhead to it and selects it; a clip shows its In and Out bar', abs(sk['t'] - sk['want']) < .06 and sk['sel'] and sk['trim'] and not sk['playing'], str(sk))
    cvb = pg.locator('#cv').bounding_box(); k6 = cvb['width'] / 1080
    pg.evaluate("()=>{segue.setClock(segue.momentOf(segue.items[3]));}"); time.sleep(.4)
    pg.evaluate("()=>{const b2=segue.items[3];b2.place='front';b2.lfit='own';b2.zm=50;b2.ox=0;b2.oy=0;segue.refresh();}"); time.sleep(.4)
    pg.mouse.move(cvb['x'] + 540 * k6, cvb['y'] + 675 * k6); time.sleep(.3)
    hov = pg.evaluate("[...document.querySelectorAll('.slot.hover')].map(r=>r.dataset.id===segue.items[3].id)")
    pg.mouse.click(cvb['x'] + 540 * k6, cvb['y'] + 675 * k6); time.sleep(.5)
    opened = pg.evaluate("()=>({sel:segue.sel===segue.items[3].id,open:!!document.querySelector(`.slot.open[data-id='${segue.items[3].id}']`)})")
    check('Hovering a piece lights its row; clicking it selects it and opens its row', hov == [True] and opened['sel'] and opened['open'], f'{hov} {opened}')
    # its corner scales it
    r0 = pg.evaluate("()=>{const c=document.createElement('canvas').getContext('2d'),o=segue.E.scene(segue.S,segue.items,c,segue.fonts,1080,1350,segue.clock).ops.find(q=>q.item===segue.items[3]);return o.rect;}")
    cx0, cy0 = cvb['x'] + (r0['x'] + r0['w']) * k6, cvb['y'] + (r0['y'] + r0['h']) * k6
    pg.mouse.move(cx0, cy0); pg.mouse.down(); pg.mouse.move(cx0 + 30, cy0 + 20, steps=6); pg.mouse.move(cx0 + 60, cy0 + 38, steps=6); pg.mouse.up(); time.sleep(.3)
    zm6 = pg.evaluate("segue.items[3].zm")
    check('Dragging a selected piece’s corner scales it', zm6 > 55, f'{zm6}%')
    # with guides on, it catches on the centre; hold Alt to place it freely
    pg.evaluate("()=>{const b2=segue.items[3];b2.zm=50;b2.ox=37;b2.oy=0;segue.refresh();segue.set('guides',true);segue.set('guSnap',true);}"); time.sleep(.4)
    def drag_by(dx, alt=False):
        o = pg.evaluate("()=>{const c=document.createElement('canvas').getContext('2d'),o=segue.E.scene(segue.S,segue.items,c,segue.fonts,1080,1350,segue.clock).ops.find(q=>q.item===segue.items[3]);return o.rect;}")
        sx, sy = cvb['x'] + (o['x'] + o['w'] / 2) * k6, cvb['y'] + (o['y'] + o['h'] / 2) * k6
        pg.mouse.move(sx, sy); pg.mouse.down()
        if alt: pg.keyboard.down('Alt')
        pg.mouse.move(sx + dx / 2, sy, steps=5); pg.mouse.move(sx + dx, sy, steps=5); pg.mouse.up()
        if alt: pg.keyboard.up('Alt')
        time.sleep(.3); return pg.evaluate("segue.items[3].ox")
    snapped = drag_by(-35 * k6)        # 37 px right of centre, dragged 35 back: within the catch, lands on the centre
    free = drag_by(8 * k6, alt=True)   # within the catch – without Alt it would go back to the centre
    check('With guides on, a piece catches on the centre; with Alt it goes where it’s put', abs(snapped) < .3 and abs(free - 8) < 1.5, f'snapped to {snapped} px, then free at {free} px')
    # guides are drawn on the preview only
    gd = pg.evaluate("""async()=>{segue.render();const v=document.querySelector('#cv'),a=v.getContext('2d').getImageData(0,0,v.width,v.height).data;segue.set('guides',false);segue.render();
      const b=v.getContext('2d').getImageData(0,0,v.width,v.height).data;let diff=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])>3)diff++;
      const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d',{willReadFrequently:true});segue.set('guides',true);await segue.frameAt(c,x,1080,1350,segue.clock);const e1=x.getImageData(0,0,1080,1350).data;
      segue.set('guides',false);await segue.frameAt(c,x,1080,1350,segue.clock);const e2=x.getImageData(0,0,1080,1350).data;let ed=0;for(let i=0;i<e1.length;i+=4)if(e1[i]!==e2[i])ed++;return {preview:diff,export:ed};}""")
    check('Guides show on the preview and never in an export', gd['preview'] > 500 and gd['export'] == 0, str(gd))
    pg.evaluate("segue.set('guides',false);segue.items.splice(0,segue.items.length,...window._keep);segue.refresh();segue.applyPreset('Card stack');segue.set('ovOn',false)")

    # ---- 0.9: Rows, each column (or row) its own way and speed, builds, a piece's undo, nudging, the loop's length ----
    st = pg.evaluate("""()=>{const x=document.createElement('canvas').getContext('2d'),E=segue.E;segue.applyPreset('Card stack');
      for(const [k,v] of [['cSize','custom'],['cW',1080],['cH',1350],['capOn',false],['layout','rows'],['cols',3],['ratio','16:10'],['size',100],['gap',20],['trackMove','drift'],['spsh',2],['colDir','alt'],['colSpeed','same'],['colOff',0]])segue.set(k,v);
      const sc=t=>E.scene(segue.S,segue.items,x,segue.fonts,1080,1350,t).ops,vel=(t,c)=>{const a=sc(t),b=sc(t+.05),o=a.find(q=>q.key.startsWith('c'+c+'.')&&b.some(p=>p.key===q.key)),q=b.find(p=>p.key===o.key);return [(q.rect.x-o.rect.x)/.05,(q.rect.y-o.rect.y)/.05];};
      const rows=[0,1,2].map(c=>vel(1,c));const P=segue.plan(),n=segue.items.length;
      segue.set('colSpeed','varied');const varied=[0,1,2].map(c=>vel(1,c)[0]),Lv=segue.plan().L;
      segue.set('layout','columns');segue.set('colSpeed','own');for(const [k,v] of [['ss0',3],['ss1',4],['ss2',7]])segue.set(k,v);
      const cols=[0,1,2].map(c=>vel(1,c)[1]),Lc=segue.plan().L;
      const key=t=>sc(t).map(o=>o.key+':'+o.rect.x.toFixed(2)+','+o.rect.y.toFixed(2)).join('|'),loops=key(0)===key(Lc);
      segue.set('ss1',0);const held=vel(1,1)[1];segue.set('ss1',4);
      segue.set('trackMove','step');segue.set('hold',.5);segue.set('dur',.5);segue.set('colLag',0);segue.set('creep',0);segue.set('ss0',2);
      const pitch=(1080-40)/3/1.6+20,T=n*pitch,y0=sc(.25).find(o=>o.key==='c0.0').rect.y,y1=sc(1.25).find(o=>o.key==='c0.0').rect.y,Ls=segue.plan().L,stepLoops=key(.25)===key(.25+Ls);
      const moved=((y1-y0)%T+T)%T;
      segue.set('trackMove','drift');segue.set('size',140);const wide=sc(1).some(o=>o.rect.x<-1)&&sc(1).some(o=>o.rect.x+o.rect.w>1081);
      return {rows,n,L:P.L,varied,Lv,cols,Lc,loops,held,step:[moved,2*pitch],Ls,stepLoops,wide};}""")
    check('Rows run left and right – alternate ones each way, nothing moving up or down', st['rows'][0][0] > 0 and st['rows'][1][0] < 0 and st['rows'][2][0] > 0 and all(abs(r[1]) < 1e-6 for r in st['rows']), str(st['rows']))
    check('Rows: Varied speeds are two, three and four times round a loop twice as long', abs(st['varied'][1] / st['varied'][0] + 1.5) < .02 and abs(st['varied'][2] / st['varied'][0] - 2) < .02 and abs(st['Lv'] - 2 * st['L']) < 1e-6, f"{st['varied']} {st['L']}→{st['Lv']}")
    check('Each its own: columns at 3, 4 and 7 run at 3 : 4 : 7 (Steve’s reference is about 1 : 1.37 : 2.3), the slowest setting the pace, and the loop still joins up',
          abs(-st['cols'][1] / st['cols'][0] - 4 / 3) < .01 and abs(st['cols'][2] / st['cols'][0] - 7 / 3) < .01 and abs(st['Lc'] - st['n'] * 2 * 3) < 1e-6 and st['loops'], f"{st['cols']} loop {st['Lc']} s")
    check('A speed of 0 holds a column still', abs(st['held']) < 1e-6, str(st['held']))
    check('Stepping, a speed of 2 moves two shapes a move, and the loop still joins up', abs(st['step'][0] - st['step'][1]) < .5 and st['stepLoops'], f"moved {st['step'][0]:.1f} px (two shapes: {st['step'][1]:.1f}), joins up: {st['stepLoops']}")
    check('Width past 100% runs the outer columns off the sides', st['wide'], str(st['wide']))
    # the list of columns: it shows what each is doing; changing one makes it your own, in one undo step
    pg.evaluate("()=>{for(const [k,v] of [['layout','columns'],['cols',3],['trackMove','drift'],['colDir','alt'],['colSpeed','same']])segue.set(k,v);const c=document.querySelector('section.card[data-id=motion]');if(c.classList.contains('collapsed'))c.querySelector('.card-toggle').click();}"); time.sleep(.3)
    hidden_list = pg.evaluate("!document.querySelector('.ctl.strip')||document.querySelector('.ctl.strip').closest('.fold').hidden")
    pg.evaluate("()=>{const b=[...document.querySelectorAll('section.card[data-id=motion] .seg[aria-label=Directions] .pill')].find(x=>x.textContent==='Each its own');b.click();}"); time.sleep(.3)
    lst = pg.evaluate("()=>({own:segue.S.colDir,ways:[0,1,2].map(c=>segue.E.stripWay(segue.S,c)),rows:[...document.querySelectorAll('.ctl.strip')].filter(e=>!e.hidden).map(e=>e.querySelector('label').textContent),head:document.querySelector('.ctl.strip').closest('.fold').querySelector('.fold-head span').textContent})")
    pg.evaluate("segue.set('colSpeed','own');segue.set('colDir','alt')"); time.sleep(.3)   # the list stays (speeds are your own); ways follow Alternate
    pg.locator('.ctl.strip button[aria-label="Column 2 – down"]').click(); time.sleep(.3)
    one = pg.evaluate("[segue.S.colDir,segue.E.stripWay(segue.S,1),segue.ui.undoSteps]")
    pg.keyboard.press('Control+z'); time.sleep(.3)
    back = pg.evaluate("[segue.S.colDir,segue.E.stripWay(segue.S,1)]")
    check('Each column: the list shows only once a pattern is your own – Each its own keeps what they were doing, and lists them by name',
          hidden_list and lst['own'] == 'own' and lst['ways'] == [1, -1, 1] and lst['rows'] == ['Column 1', 'Column 2', 'Column 3'] and lst['head'] == 'Each column', f'{hidden_list} {lst}')
    check('Changing one column’s way makes the pattern your own; one Undo puts both back', one[0] == 'own' and one[1] == 1 and back == ['alt', -1], f'{one} → {back}')
    rp = pg.evaluate("()=>{const o={};for(const n of ['Rows side to side','Rows drift','Masonry drift']){segue.applyPreset(n);o[n]=[segue.S.layout,segue.S.trackMove,segue.S.colSpeed,[0,1,2].map(c=>segue.E.stripSpeed(segue.S,c))];}return o;}")
    check('Presets for Rows (stepping and drifting); Masonry drift now 3, 4 and 7 as the reference', rp['Rows side to side'][:2] == ['rows', 'step'] and rp['Rows drift'][:3] == ['rows', 'drift', 'own'] and rp['Masonry drift'][3] == [3, 4, 7], str(rp))
    # a layer as a build: it arrives on its own once its slide has landed
    bd = pg.evaluate("""()=>{const x=document.createElement('canvas').getContext('2d'),E=segue.E;segue.applyPreset('Card stack');
      for(const [k,v] of [['layout','one'],['oneFit','bleed'],['oneMove','fade'],['dur',.5],['hold',3],['kb','none'],['capOn',false],['after','carry']])segue.set(k,v);
      const [a,b]=segue.items;for(const it of segue.items)Object.assign(it,{join:'own',lin:undefined,lafter:undefined,lover:undefined,arrive:'default',hold:0});b.join='on';b.lfit='own';b.zm=50;b.lin='rise';b.lafter=.4;b.lover=.6;segue.refresh();
      const P=segue.plan(),t0=P.segs.find(g=>g.k==='move'&&g.to%P.stops===0)?P.segs.find(g=>g.k==='move'&&mod(g.to,P.stops)===0).t0:0;function mod(a,n){return((a%n)+n)%n;}
      const L=t=>E.scene(segue.S,segue.items,x,segue.fonts,1080,1350,((t%P.L)+P.L)%P.L).ops.find(o=>o.item===b);
      const at=d=>{const o=L(t0+d);return o?[+o.alpha.toFixed(3),+o.rect.y.toFixed(1)]:null;};
      const r={before:at(.5+.3),mid:at(.5+.4+.3),after:at(.5+.4+.6+.2)};b.lin='with';segue.refresh();r.with=at(.5+.3);b.join='own';segue.refresh();return r;}""")
    check('A layer can arrive on its own after its slide lands (a build) – Rises in: not there, rising and fading up, then in place; With the slide: there all along',
          bd['before'][0] == 0 and 0 < bd['mid'][0] < 1 and bd['mid'][1] > bd['after'][1] and bd['after'][0] == 1 and bd['with'][0] == 1, str(bd))
    # a piece's own settings undo; the arrow keys nudge the selected piece; Blend says what it mixes with
    pg.evaluate("()=>{segue.applyPreset('Straight cuts');segue.set('xFormat','mp4');for(const it of segue.items)Object.assign(it,{join:'own',blend:'normal',ox:0,oy:0,px:0,py:0,zm:100});segue.refresh();const c=document.querySelector('section.card[data-id=media]');if(c.classList.contains('collapsed'))c.querySelector('.card-toggle').click();}"); time.sleep(.3)
    pg.locator('#panel .media-list .slot').nth(1).locator('.slot-main').click(); time.sleep(.5)
    iid = pg.evaluate("segue.items[1].id")
    pg.select_option(f'#i_blend_{iid}', 'multiply'); time.sleep(.4)
    note = pg.evaluate("[...document.querySelectorAll('.slot.open .hint')].map(h=>h.textContent).join(' | ')")
    pg.mouse.click(5, 5); pg.keyboard.press('Control+z'); time.sleep(.4)
    u1 = pg.evaluate("segue.items[1].blend||'normal'")
    pg.keyboard.press('Control+Shift+z'); time.sleep(.4)
    u2 = pg.evaluate("segue.items[1].blend")
    check('A piece’s own settings undo and redo (0.9) – and once it blends, its row says what with (0.11: it’s a layer now, so its slide; one Undo takes back both)', u1 == 'normal' and u2 == 'multiply' and 'Mixes with' in note and pg.evaluate("segue.items[1].join") == 'on', f'{u1} {u2} {note!r}')
    pg.evaluate("()=>{segue.items[1].blend='normal';segue.set('oneFit','own');segue.refresh();segue.setPlaying(false);segue.setClock(segue.momentOf(segue.items[1]));}"); time.sleep(.4)
    cvb = pg.locator('#cv').bounding_box(); pg.mouse.click(cvb['x'] + cvb['width'] / 2, cvb['y'] + cvb['height'] / 2); time.sleep(.4)
    pg.keyboard.press('ArrowRight'); pg.keyboard.press('Shift+ArrowDown'); time.sleep(.3)
    nd = pg.evaluate("(()=>{const it=segue.items.find(i=>i.id===segue.sel);return it?[+it.ox,+it.oy]:null})()")
    check('The arrow keys nudge the selected piece – a px at a time, ten with Shift', nd == [1, 10], str(nd))
    # the loop's length, typed
    pg.evaluate("()=>{segue.applyPreset('Push and drift');}"); time.sleep(.3)
    L0 = pg.evaluate("segue.plan().L")
    pg.locator('#loopChip').click(); time.sleep(.2); pg.keyboard.type('15'); pg.keyboard.press('Enter'); time.sleep(.4)
    L1 = pg.evaluate("segue.plan().L"); pg.mouse.click(5, 5); pg.keyboard.press('Control+z'); time.sleep(.4); L2 = pg.evaluate("segue.plan().L")
    check('Click the loop’s length and type one: every time in it is scaled to fit, in one undo step', abs(L1 - 15) < .01 and abs(L2 - L0) < 1e-6, f'{L0:.2f} → {L1:.3f} → {L2:.2f}')
    # media drawn bigger than its own pixels says so
    enl = pg.evaluate("""async()=>{const c=document.createElement('canvas');c.width=270;c.height=338;c.getContext('2d').fillRect(0,0,270,338);const b=await new Promise(r=>c.toBlob(r));
      await segue.addFiles([new File([b],'small.png',{type:'image/png'})]);await new Promise(r=>setTimeout(r,800));segue.applyPreset('Straight cuts');segue.set('xFormat','mp4');segue.refresh();
      const rows=[...document.querySelectorAll('.media-list .slot')];const small=rows.find(r=>r.querySelector('.slot-name').textContent==='small.png');
      const out={small:small&&small.querySelector('.enl')?small.querySelector('.enl').textContent:null,big:rows.filter(r=>r.querySelector('.slot-name').textContent.startsWith('l_poster')).map(r=>!!r.querySelector('.enl'))};
      const it=segue.items.find(i=>i.name==='small.png');if(it){segue.items.splice(segue.items.indexOf(it),1);segue.refresh();}return out;}""")
    check('A piece drawn bigger than its own pixels says so in its row, with the size it would need', enl['small'] == ' · shown at 400%', str(enl))
    # Presets: if the list doesn't show when the sheet opens, the panel says so
    pg.evaluate("document.querySelectorAll('.err-note').forEach(n=>n.remove())")
    sheet(pg, 'presets'); time.sleep(.7); ok_note = pg.evaluate("!!document.querySelector('#errNote')"); pg.evaluate("ensembleUI.close()"); time.sleep(.3)
    pg.evaluate("document.head.insertAdjacentHTML('beforeend','<style id=hidepr>.preset-row{display:none!important}</style>')")
    sheet(pg, 'presets'); time.sleep(.7); bad_note = pg.evaluate("(document.querySelector('#errNote')||{}).textContent||''"); pg.evaluate("ensembleUI.close()"); time.sleep(.3)
    pg.evaluate("document.querySelector('#hidepr').remove();document.querySelectorAll('#errNote').forEach(n=>n.remove())")
    errs[:] = [e for e in errs if 'Presets didn’t show' not in e]   # the note made on purpose just now isn't an error on the page
    check('Presets that can’t be seen when the sheet opens put a note on the panel (for Safari) – and none when they show', not ok_note and 'Presets didn’t show' in bad_note, f'{ok_note} {bad_note[:160]!r}')
    pg.evaluate("segue.applyPreset('Card stack');segue.set('ovOn',false)")

    # ---- 0.10: projects, duplicating a piece, the top bar (undo, zoom, guides), on and off in a section's head ----
    pg.evaluate("()=>{segue.applyPreset('Push and drift');segue.items.forEach(it=>Object.assign(it,{join:'own',blend:'normal'}));segue.refresh();}"); time.sleep(1.2)
    pj0 = pg.evaluate("""async()=>{await segue.projects.save(true);const c=segue.projects.current,l=await segue.projects.list(),r=l.find(x=>x.id===c.id);
      return {id:c.id,name:c.name,n:l.length,saved:!!r,items:r?r.items.map(i=>i.name):[],preset:r&&r.preset.current,thumb:!!(r&&r.thumb&&r.thumb.startsWith('data:image/jpeg')),label:document.querySelector('#projName').textContent};}""")
    names0 = pg.evaluate("segue.items.map(i=>i.name)")
    check('Projects: what’s open is a project, saved in the browser as you work – its media in order, its preset, a small picture, its name at the top of the panel',
          pj0['saved'] and pj0['items'] == names0 and pj0['preset'] == 'Push and drift' and pj0['thumb'] and pj0['label'] == pj0['name'], str(pj0))
    pg.locator('#projBtn').click(); time.sleep(.6)
    pg.locator('#projPop .proj-field').fill('Check reel'); pg.keyboard.press('Enter'); time.sleep(.6)
    renamed = pg.evaluate("async()=>{const l=await segue.projects.list();return [segue.projects.current.name,document.querySelector('#projName').textContent,l.find(r=>r.id===segue.projects.current.id).name,document.title]}")
    pg.get_by_role('button', name='New').click(); time.sleep(1.5)
    fresh = pg.evaluate("[segue.projects.current.name,segue.items.length,segue.ui.preset,segue.ui.undoSteps]")
    pg.locator('#projBtn').click(); time.sleep(.6)
    rows = pg.evaluate("[...document.querySelectorAll('#projPop .proj-row .slot-name')].map(e=>e.textContent)")
    pg.locator('#projPop .proj-row .slot-main', has_text='Check reel').click(); time.sleep(2.5)
    back = pg.evaluate("[segue.projects.current.name,segue.items.map(i=>i.name),segue.ui.preset,segue.S.layout]")
    check('Rename it in Projects; New starts an empty one and keeps the last in the list; opening it again brings back its media, order and preset',
          renamed[:3] == ['Check reel'] * 3 and renamed[3].startswith('Check reel') and fresh[1] == 0 and fresh[2] == '' and fresh[3] == 0 and 'Check reel' in rows and back[0] == 'Check reel' and back[1] == names0 and back[2] == 'Push and drift',
          f'{renamed} {fresh} {rows} {back}')
    # the file: a zip with project.json and the files, opened as a new project with the same media and settings
    fl = pg.evaluate("""async()=>{const z=await segue.projects.file(),m=await segue.projects.readZip(z),j=JSON.parse(await m.get('project.json').text());
      const before=await segue.projects.list();await segue.projects.openFile(new File([z],'Check reel.segue'));await new Promise(r=>setTimeout(r,1500));
      const after=await segue.projects.list();return {size:z.size,entries:[...m.keys()].length,media:Object.keys(j.media).length,name:segue.projects.current.name,
        items:segue.items.map(i=>i.name),hold:segue.S.hold,count:[before.length,after.length],ver:j.segue};}""")
    check('Save as file packs the project, files and all, into a .segue file (a zip); Open file brings it back as a new project, the same',
          fl['entries'] >= fl['media'] + 1 and fl['media'] == len(set(names0)) and fl['name'] == 'Check reel 2' and fl['items'] == names0 and fl['count'][1] == fl['count'][0] + 1, str(fl))
    rm = pg.evaluate("""async()=>{const id=segue.projects.current.id;await segue.projects.remove(id);const l1=(await segue.projects.list()).map(r=>r.name);await segue.ui.undo();const l2=(await segue.projects.list()).map(r=>r.name);
      const r=l2.length;await segue.projects.remove((await segue.projects.list()).find(x=>x.name==='Check reel 2').id);return [l1.includes('Check reel 2'),l2.includes('Check reel 2'),segue.projects.current.name,r];}""")
    check('Remove a project – Undo puts it back; removing the open one opens the next', rm[0] is False and rm[1] is True and rm[2] != 'Check reel 2', str(rm))
    pg.evaluate("ensembleUI&&ensembleUI.close&&ensembleUI.close()"); pg.keyboard.press('Escape'); time.sleep(.2)
    if pg.evaluate("segue.projects.current.name") != 'Check reel':
        pg.evaluate("async()=>{const l=await segue.projects.list();await segue.projects.open(l.find(r=>r.name==='Check reel').id);}"); time.sleep(2.5)
    gc = pg.evaluate("""async()=>{const r=indexedDB.open('segue',2);const d=await new Promise(res=>{r.onsuccess=()=>res(r.result);});
      await new Promise(res=>{const t=d.transaction('media','readwrite');t.objectStore('media').put(new Blob(['x']),'orphan');t.oncomplete=res;});
      await segue.projects.gc();const keys=await new Promise(res=>{const q=d.transaction('media').objectStore('media').getAllKeys();q.onsuccess=()=>res(q.result);});
      return [keys.includes('orphan'),segue.items.every(i=>keys.includes(i.ref||i.id))];}""")
    check('A stored file nothing uses is cleared at start-up; every file a project uses stays', gc == [False, True], str(gc))
    # duplicate a piece: straight after it (after a slide's layers), the same file, its own settings; one Undo takes it away
    dp = pg.evaluate("""async()=>{segue.applyPreset('Straight cuts');const it=segue.items;for(const x of it)Object.assign(x,{join:'own'});it[1].join='on';it[1].blend='multiply';segue.refresh();
      await segue.duplicate(it[0].id);const a=segue.items.map(i=>i.name),c=segue.items[2],same=c.ref===segue.items[0].ref||c.ref===segue.items[0].id;
      await segue.duplicate(segue.items[1].id);const b=segue.items.map(i=>i.name),lc=segue.items[2];
      await segue.ui.undo();await segue.ui.undo();const u=segue.items.map(i=>i.name);segue.items[1].join='own';segue.items[1].blend='normal';segue.refresh();
      return {a,same,b,layerCopy:[lc.join,lc.blend],u};}""")
    check('Duplicate a piece: the copy comes after it (after a slide’s layers), with the same file and its own settings – a layer’s copy is another layer; Undo takes it away',
          dp['a'][2].endswith('copy.png') and dp['same'] and dp['layerCopy'] == ['on', 'multiply'] and dp['u'] == names0, str(dp))
    # on and off in a section's head
    pg.evaluate("segue.set('capOn',false)"); time.sleep(.2)
    pg.locator('section.card[data-id=captions] .head-sw').click(); time.sleep(.5)
    hs = pg.evaluate("[segue.S.capOn,!document.querySelector('section.card[data-id=captions]').classList.contains('collapsed'),document.querySelector('section.card[data-id=captions] .head-sw').getAttribute('aria-checked')]")
    pg.locator('section.card[data-id=captions] .head-sw').click(); time.sleep(.5)
    hs2 = pg.evaluate("[segue.S.capOn,document.querySelector('section.card[data-id=captions]').classList.contains('collapsed')]")
    check('Captions and Overlay switch on and off by the box beside their name – on opens the section, off shuts it; no repeated “Captions” or “Over the top” row',
          hs == [True, True, 'true'] and hs2 == [False, True] and not pg.evaluate("[...document.querySelectorAll('#panel .toggle-row .toggle')].some(t=>/^(Captions|Over the top)$/.test(t.getAttribute('aria-label')))"), f'{hs} {hs2}')
    # the top bar: undo and redo, zoom, guides
    pg.evaluate("segue.set('hold',2.2)"); time.sleep(.3)
    pg.locator('#undoBtn').click(); time.sleep(.3); u1 = pg.evaluate("[segue.S.hold,document.querySelector('#redoBtn').disabled]")
    pg.locator('#redoBtn').click(); time.sleep(.3); u2 = pg.evaluate("segue.S.hold")
    check('Undo and redo are buttons in the top bar too', u1[1] is False and abs(u2 - 2.2) < 1e-9 and abs(u1[0] - 2.2) > 1e-9, f'{u1} {u2}')
    pg.locator('#zoomVal').click(); time.sleep(.4)
    z1 = pg.evaluate("[document.querySelector('#zoomVal').textContent,parseFloat(document.querySelector('#cv').style.width),segue.E.canvasSize(segue.S)[0],document.querySelector('#view').classList.contains('zoomed')]")
    pg.locator('#zoomIn').click(); time.sleep(.3); z2 = pg.evaluate("document.querySelector('#zoomVal').textContent")
    pg.keyboard.press('Control+0'); time.sleep(.3); z3 = pg.evaluate("[segue.zoom,document.querySelector('#view').classList.contains('zoomed')]")
    check('Zoom in the top bar: the value goes to 100% (one canvas px a screen px) and back to fit, + and − step, ⌘0 fits',
          z1[0] == '100%' and z1[1] == z1[2] and z1[3] and z2 == '125%' and z3 == [None, False], f'{z1} {z2} {z3}')
    pg.evaluate("segue.set('guides',false)"); pg.locator('#guidesBtn').click(); time.sleep(.2); g1 = pg.evaluate("segue.S.guides")
    pg.locator('#guidesBtn').click(); time.sleep(.2)
    pg.locator('#guidesMore').click(); time.sleep(.4)
    gl = pg.evaluate("[...document.querySelectorAll('#guidePop .ctl-head label,#guidePop .toggle')].filter(e=>e.offsetParent).map(e=>e.textContent||e.getAttribute('aria-label'))")
    pg.evaluate("segue.set('guM',80)"); time.sleep(.2); g2 = pg.evaluate("segue.S.guides")
    pg.keyboard.press('Escape'); time.sleep(.2); g3 = pg.evaluate("document.querySelector('#guidePop').hidden")
    pg.keyboard.press('Control+;'); time.sleep(.2); g4 = pg.evaluate("segue.S.guides")
    check('Guides in the top bar: the button shows and hides them; its arrow opens Margin, Grid, Snap (0.11 – no columns) – changing one shows them; Esc shuts it; ⌘; too',
          g1 is True and 'Margin' in gl and 'Grid' in gl and 'Columns' not in gl and 'Gutter' not in gl and g2 is True and g3 and g4 is False and not pg.evaluate("!!document.querySelector('#panel section[data-id=canvas] .fold-head span')&&[...document.querySelectorAll('#panel section[data-id=canvas] .fold-head span')].some(e=>e.textContent==='Guides')"), f'{g1} {gl} {g2} {g3} {g4}')
    pg.evaluate("segue.set('guM',64);segue.set('guides',false);segue.applyPreset('Card stack');segue.set('ovOn',false)")

    # ---- 0.11: a blend makes a layer, the play bar's ticks, movement in other kinds, guides as margin and grid, ----
    # ---- handles only where they work, the project chip top left, the panel's edges and stray drags ----
    pg.keyboard.press('Escape'); time.sleep(.2)
    pg.evaluate("()=>{segue.applyPreset('Straight cuts');segue.items.forEach(i=>{i.join='own';i.blend='normal';});segue.refresh();const c=document.querySelector('section.card[data-id=media]');if(c.classList.contains('collapsed'))c.querySelector('.card-toggle').click();document.querySelectorAll('.media-list .slot.open .slot-main').forEach(e=>e.click());}"); time.sleep(.5)
    pg.locator('#panel .media-list .slot').nth(1).locator('.slot-main').click(); time.sleep(.5)
    bid = pg.evaluate("segue.items[1].id")
    pg.select_option(f'#i_blend_{bid}', 'multiply'); time.sleep(.6)
    bl = pg.evaluate("()=>({join:segue.items[1].join,lfit:segue.items[1].lfit,toast:document.querySelector('#toast').textContent,sw:document.querySelector('.slot.open .layer-sw button.toggle').getAttribute('aria-checked'),clock:segue.clock,want:segue.momentOf(segue.items[1])})")
    check('A blend on a slide of its own makes it a layer on the piece above, so it has something to mix with – and says so; the switch shows it',
          bl['join'] == 'on' and bl['lfit'] in ('fill', 'own') and 'is now a layer on' in bl['toast'] and bl['sw'] == 'true' and abs(bl['clock'] - bl['want']) < .06, str(bl))
    pg.locator('.slot.open .layer-sw button.toggle').click(); time.sleep(.4)
    check('…and the switch turns it back into a slide of its own', pg.evaluate("segue.items[1].join") == 'own')
    pg.evaluate("()=>{segue.items[1].blend='normal';segue.refresh();}"); time.sleep(.3)
    tk = pg.evaluate("""()=>{const P=segue.plan(),hs=P.segs.filter(g=>g.k==='hold'),ts=[...document.querySelectorAll('#ticks i')].map(e=>parseFloat(e.style.left));
      const w=document.querySelector('#scrub').getBoundingClientRect().width;return {n:ts.length,slides:hs.length,ts,want:hs.map(h=>h.t0/P.L*100),w};}""")
    check('The play bar is longer and marks each slide with a fine tick where it starts', tk['n'] == tk['slides'] and tk['n'] >= 3 and tk['w'] >= 200
          and all(abs(a - b) < 1 for a, b in zip(tk['ts'], tk['want'])), str(tk))
    mv = pg.evaluate("""()=>{const c=document.createElement('canvas').getContext('2d'),out={};segue.applyPreset('Masonry drift');
      const shown=()=>segue.ui.controls.filter(x=>x.w&&x.w.isConnected&&!x.w.hidden&&!x.w.closest('[hidden]')).map(x=>x.d.k);out.before=shown().includes('inMove');out.off=segue.S.inMove;
      segue.set('inMove','zoom');segue.set('inAmt',8);const P=segue.plan(),sc=t=>segue.E.scene(segue.S,segue.items,c,segue.fonts,1080,1350,t).ops.filter(o=>o.item&&!o.layer);
      const a=sc(0),b=sc(P.L*.5),z=sc(P.L-1e-6);out.inner=a.filter(o=>o.inner).length;out.n=a.length;
      out.moves=a.some((o,i)=>b[i]&&o.inner&&b[i].inner&&Math.abs(o.inner.s-b[i].inner.s)>1e-3);
      out.loop=a.every((o,i)=>!o.inner||(z[i]&&z[i].inner&&Math.abs(o.inner.s-z[i].inner.s)<1e-3));
      out.most=Math.max(...a.map(o=>o.inner?o.inner.s:1));
      segue.set('layout','one');out.slides=shown().includes('inMove');segue.applyPreset('Masonry drift');return out;}""")
    check('Movement in the other kinds (0.11): a gentle zoom or drift inside each picture, off by default, loop-exact – Slides keeps its own',
          mv['before'] is True and mv['off'] == 'none' and mv['inner'] == mv['n'] and mv['moves'] and mv['loop'] and mv['most'] <= 1.081 and not mv['slides'], str(mv))
    gd = pg.evaluate("""()=>{segue.set('guM',64);segue.set('guN',6);const L=segue.guideLines(),inner=L.W-2*L.m,ih=L.H-2*L.m,d=L.gy.map((y,i)=>(i?y-L.gy[i-1]:y-L.m));
      segue.set('guN',0);const L0=segue.guideLines();segue.set('guN',6);
      return {gx:L.gx.length,cell:inner/6,rowsEven:d.every(v=>Math.abs(v-d[0])<1e-6),rowH:d[0],gy:L.gy.length,none:L0.gx.length+L0.gy.length};}""")
    check('Guides are a margin and a grid: 6 across means 5 lines, rows divide the space evenly into near-square cells; 0 is none',
          gd['gx'] == 5 and gd['rowsEven'] and abs(gd['rowH'] / gd['cell'] - 1) < .2 and gd['none'] == 0, str(gd))
    pg.keyboard.press('Escape'); time.sleep(.2)
    pg.evaluate("()=>{segue.applyPreset('Straight cuts');segue.set('oneFit','bleed');segue.items.forEach(i=>{i.join='own';i.zm=100;});segue.refresh();segue.setPlaying(false);segue.setClock(segue.momentOf(segue.items[0]));}"); time.sleep(.4)
    cvb = pg.locator('#cv').bounding_box(); k6 = cvb['width'] / pg.evaluate("segue.E.canvasSize(segue.S)[0]")
    pg.mouse.click(cvb['x'] + cvb['width'] / 2, cvb['y'] + cvb['height'] / 2); time.sleep(.3)
    pg.mouse.move(cvb['x'] + cvb['width'] - 2, cvb['y'] + cvb['height'] - 2); pg.mouse.down(); pg.mouse.move(cvb['x'] + cvb['width'] - 40, cvb['y'] + cvb['height'] - 30, steps=6); pg.mouse.up(); time.sleep(.3)
    hd = pg.evaluate("()=>({zm:segue.items[0].zm,sel:segue.sel===segue.items[0].id,pos:!segue.ui.controls.find(c=>c.d&&c.d.k==='nudgeX').w.closest('.fold').hidden})")
    check('A full-bleed slide has no corner handles to scale it (it fills its frame – crop zoom does that), and no Position section', hd['zm'] == 100 and hd['sel'] and not hd['pos'], str(hd))
    pj = pg.evaluate("""()=>{const r=e=>document.querySelector(e).getBoundingClientRect();const p=r('#projBox'),v=r('#view'),i=r('#island'),pc=r('#pcap'),h=r('#selHint');
      return {left:Math.round(p.left-v.left),bottom:Math.round(p.bottom-i.bottom),inPanel:!!document.querySelector('#panelBox #projBox'),clearIsl:Math.round(i.left-p.right),clearPc:Math.round(pc.left-i.right),
        hi:Math.round(h.left-v.left),hTop:Math.round(h.top-r('.topbar').top),same:Math.round(p.height-i.height)};}""")
    pg.click('#projBtn'); time.sleep(.5)
    pop = pg.evaluate("""()=>{const p=document.querySelector('#projPop'),b=document.querySelector('#projBtn'),r=p.getBoundingClientRect(),br=b.getBoundingClientRect();
      return {hidden:p.hidden,above:Math.round(br.top-r.bottom),left:Math.round(r.left-br.left),inWin:r.top>=0&&r.bottom<=innerHeight,w:Math.round(r.width),name:!!p.querySelector('.proj-field'),rows:p.querySelectorAll('.proj-row').length};}""")
    pg.keyboard.press('Escape'); time.sleep(.3)
    check('…and it opens upward from the chip, inside the window, with the name, what you can do and every project',
          pop['hidden'] is False and 0 <= pop['above'] <= 16 and pop['left'] == 0 and pop['inWin'] and pop['w'] >= 300 and pop['name'] and pop['rows'] >= 1, str(pop))
    check('The project sits on the bottom line with the play bar and the presets (0.17) – the same height, in that order, out of the panel; the guide has the top left to itself',
          pj['left'] == 0 and pj['bottom'] == 0 and not pj['inPanel'] and pj['clearIsl'] >= 0 and pj['clearPc'] >= 0 and pj['same'] == 0 and pj['hi'] == 0 and pj['hTop'] == 0, str(pj))
    pg.locator('#panel .media-list .slot').nth(0).locator('.slot-main').click(); time.sleep(.4)
    dg = pg.evaluate("""()=>{const row=document.querySelector('.media-list .slot.open'),rng=row.querySelector('.slot-det input[type=range]'),top=row.querySelector('.slot-top .slot-name')||row.querySelector('.slot-top');
      const pd=e=>e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));const a=row.draggable;pd(rng);const b=row.draggable;pd(top);const c=row.draggable;
      const img=[...document.querySelectorAll('.panel img')].every(i=>getComputedStyle(i).webkitUserDrag==='none'||getComputedStyle(i).getPropertyValue('-webkit-user-drag')==='none');
      return {a,b,c,img,sel:getComputedStyle(document.querySelector('.panel')).userSelect};}""")
    check('Dragging a slider in an open piece can’t pick up the row (only its top line moves it), and nothing in the panel drags out of the browser',
          dg['a'] is False and dg['b'] is False and dg['c'] is True and dg['img'] and dg['sel'] == 'none', str(dg))
    pg.evaluate("document.querySelectorAll('.media-list .slot.open .slot-main').forEach(e=>e.click())"); time.sleep(.2)
    ed = pg.evaluate("""async()=>{const sc=document.querySelector('#panelBox .scroll'),cs=getComputedStyle(sc),rights=()=>[...document.querySelectorAll('#panelBox .card')].filter(c=>c.offsetParent).map(c=>Math.round(c.getBoundingClientRect().right));
      const cards=[...document.querySelectorAll('#panelBox .card')];const shut=cards.map(c=>c.classList.contains('collapsed'));
      cards.forEach(c=>{if(!c.classList.contains('collapsed'))c.querySelector('.card-toggle')&&c.querySelector('.card-toggle').click();});await new Promise(r=>setTimeout(r,300));const a=rights();
      cards.forEach(c=>{if(c.classList.contains('collapsed'))c.querySelector('.card-toggle')&&c.querySelector('.card-toggle').click();});await new Promise(r=>setTimeout(r,300));const b=rights();
      cards.forEach((c,i)=>{if(c.classList.contains('collapsed')!==shut[i])c.querySelector('.card-toggle')&&c.querySelector('.card-toggle').click();});
      const pr=document.querySelector('#panelBox').getBoundingClientRect().right,cr=b[0];
      return {gutter:cs.scrollbarGutter,ov:cs.overflowY,a,b,lane:Math.round(pr-cr)};}""")
    check('The panel keeps its scrollbar lane whether it scrolls or not: every section ends at the same right edge, shut or open, with room either side of the bar',
          ed['gutter'].startswith('stable') and ed['ov'] == 'scroll' and len(set(ed['a'] + ed['b'])) == 1 and ed['lane'] >= 14, str(ed))
    dots = pg.evaluate("()=>{const v=getComputedStyle(document.querySelector('#view')).backgroundImage;return v;}")
    check('Sparse dots round the canvas mark the pasteboard', 'radial-gradient' in dots, dots[:80])
    fo = pg.evaluate("""()=>{const vis=()=>[...document.querySelectorAll('#panel .fold-head span:first-child')].filter(e=>!e.closest('[hidden]')).map(e=>e.textContent);
      segue.set('capOn',false);segue.set('ovOn',false);const off=vis().includes('Fonts');segue.set('capOn',true);const on=vis().includes('Fonts');segue.set('capOn',false);
      segue.set('layout','grid');segue.set('ratio','media');const sh=k=>segue.ui.controls.some(x=>x.d.k===k&&x.w&&x.w.isConnected&&!x.w.hidden&&!x.w.closest('[hidden]'));const fit=sh('fit');segue.set('ratio','4:5');const fit2=sh('fit');
      return {off,on,fit,fit2};}""")
    check('Settings that would do nothing step aside: Fonts only with captions or overlay type; Media fit only when shapes aren’t the media’s own',
          fo['off'] is False and fo['on'] is True and fo['fit'] is False and fo['fit2'] is True, str(fo))
    # Safari 17.6 (Steve's note): the sheets' 0fr-to-1fr row stayed shut. A stuck row is caught and sheets open flat
    pg.keyboard.press('Escape'); time.sleep(.3)
    pg.evaluate("()=>{const st=document.createElement('style');st.id='stuck';st.textContent='.sheets{grid-template-rows:0fr!important}';document.head.append(st);}")
    pg.locator('#pcap .pc-row').first.click(); time.sleep(1)
    fl = pg.evaluate("()=>{const r=document.querySelector('#pcap .sheet').getBoundingClientRect();return {flat:document.documentElement.classList.contains('flat-sheets'),h:Math.round(r.height),top:Math.round(r.top),rows:[...document.querySelectorAll('#pcap .preset-row')].filter(e=>{const q=e.getBoundingClientRect();return q.height>10&&q.top>=r.top&&q.bottom<=r.bottom+1;}).length,note:!!document.querySelector('.err-note:not([hidden]),#errNote:not([hidden])')};}")
    pg.keyboard.press('Escape'); time.sleep(.4)
    shut = pg.evaluate("Math.round(document.querySelector('#pcap .sheets').getBoundingClientRect().height)")
    pg.evaluate("()=>{document.querySelector('#stuck').remove();document.documentElement.classList.remove('flat-sheets');}")
    check('Sheets whose slide never runs (Safari 17) open flat instead – the presets are there to pick, and shut again', fl['flat'] and fl['h'] > 300 and fl['rows'] >= 3 and shut == 0, f'{fl} {shut}')

    # ---- 0.12: Pile up – each slide lands on the last and stays; back round by Cover, Clear or Unbuild ----
    pl = pg.evaluate("""()=>{const c=document.createElement('canvas').getContext('2d'),[W,H]=segue.E.canvasSize(segue.S),out={};
      segue.applyPreset('Build up');const sc=t=>segue.E.scene(segue.S,segue.items,c,segue.fonts,W,H,t);
      const vis=t=>sc(t).ops.filter(o=>o.item&&!o.layer&&o.alpha>.01&&o.rect.x<W&&o.rect.x+o.rect.w>0&&o.rect.y<H&&o.rect.y+o.rect.h>0).map(o=>({i:o.i,x:o.rect.x,y:o.rect.y,w:o.rect.w,h:o.rect.h,a:o.alpha,r:o.rot||0}));
      const same=(a,b)=>a.length===b.length&&a.every((o,j)=>o.i===b[j].i&&Math.abs(o.x-b[j].x)<.5&&Math.abs(o.y-b[j].y)<.5&&Math.abs(o.w-b[j].w)<.5&&Math.abs(o.a-b[j].a)<.02&&Math.abs(o.r-b[j].r)<1e-3);
      const P=segue.plan(),n=P.stops,h=P.segs.filter(g=>g.k==='hold');out.n=n;out.pile=P.pile;
      out.built=h.map(g=>vis((g.t0+g.t1)/2).length);out.full=vis((h[n-1].t0+h[n-1].t1)/2).every(o=>o.a===1);{const v=vis(h[n-1].t0+.01);out.turned=new Set(v.map(o=>Math.round(o.x+o.w/2))).size>1&&v.every(o=>!o.r);}
      out.loops={};for(const e of ['clear','cover','unbuild']){segue.set('pileEnd',e);const L=segue.plan().L;out.loops[e]=same(vis(0),vis(L-1e-5))&&same(vis(L*.25),vis(L*1.25));}
      segue.set('pileBack',1);const L1=segue.plan().L;segue.set('pileBack',4);const L4=segue.plan().L;const un=segue.plan().segs.filter(g=>g.k==='unmove').map(g=>g.s);
      out.faster=L4<L1;out.order=un.join(',');segue.set('pileEnd','clear');segue.set('pileKeep',2);const P2=segue.plan(),h2=P2.segs.filter(g=>g.k==='hold');out.keep=vis((h2[n-1].t0+h2[n-1].t1)/2).length;
      segue.set('pileKeep',0);segue.set('pileScatter',0);out.flat=vis(segue.plan().segs.find(g=>g.k==='hold'&&g.s===n-1).t0+.01).every(o=>o.r===0);segue.set('pileScatter',40);
      segue.set('pile',false);const P0=segue.plan();out.off=!P0.pile&&!P0.segs.some(g=>g.k==='unmove');segue.applyPreset('Build up');return out;}""")
    check('Build up (0.12): each slide lands on the last and stays – 1, 2, 3… on screen, none dimmed, scattered a little and kept straight (0.13)', pl['pile'] == 'clear' and pl['built'] == list(range(1, pl['n'] + 1)) and pl['full'] and pl['turned'], str(pl))
    check('…and comes back round seamlessly whichever way – Clear, Cover or Unbuild', all(pl['loops'].values()), str(pl['loops']))
    check('Unbuild goes last first, and Unbuild speed shortens it; Keep holds the pile to so many; Scatter 0 leaves them straight; Pile up off is Slides as before',
          pl['faster'] and pl['order'] == ','.join(str(i) for i in range(pl['n'] - 1, 0, -1)) and pl['keep'] == 2 and pl['flat'] and pl['off'], str(pl))
    pu = pg.evaluate("""()=>{const sh=k=>segue.ui.controls.some(x=>x.d.k===k&&x.w&&x.w.isConnected&&!x.w.hidden&&!x.w.closest('[hidden]'));const o={};
      o.on=[sh('pile'),sh('pileKeep'),sh('pileScatter'),sh('pileEnd'),sh('after'),sh('pileBack')];segue.set('pileEnd','unbuild');o.un=sh('pileBack');
      segue.set('pile',false);o.off=[sh('pile'),sh('pileKeep'),sh('pileEnd'),sh('after')];segue.set('layout','grid');o.grid=sh('pile');segue.applyPreset('Build up');return o;}""")
    check('In the panel: Pile up sits with Slides’ transition (Keep and Scatter when it’s on); After the last offers Cover, Clear, Unbuild (and Unbuild speed) in place of Carry on and Pull back',
          pu['on'] == [True, True, True, True, False, False] and pu['un'] and pu['off'] == [True, False, False, True] and not pu['grid'], str(pu))

    # ---- 0.13: In a shape – the shape itself moves and sizes on the canvas; Alt moves the picture inside it ----
    pg.keyboard.press('Escape'); time.sleep(.2)
    pg.evaluate("()=>{segue.applyPreset('Straight cuts');segue.set('oneFit','shape');segue.set('ratio','4:5');segue.set('size',60);segue.set('fit','fill');segue.items.forEach(i=>{i.join='own';i.zm=100;i.fz=100;i.ox=0;i.oy=0;i.px=0;i.py=0;});segue.refresh();segue.setPlaying(false);segue.setClock(segue.momentOf(segue.items[0]));}"); time.sleep(.5)
    cvb = pg.locator('#cv').bounding_box(); mx, my = cvb['x'] + cvb['width'] / 2, cvb['y'] + cvb['height'] / 2
    pg.mouse.move(mx, my); pg.mouse.down(); pg.mouse.move(mx + 40, my + 25, steps=6); pg.mouse.up(); time.sleep(.3)
    s1 = pg.evaluate("(()=>{const i=segue.items[0];return {ox:i.ox,oy:i.oy,px:i.px||0,py:i.py||0,fz:i.fz||100,zm:i.zm||100}})()")
    rr = pg.evaluate("(()=>{const c=document.createElement('canvas').getContext('2d'),[W,H]=segue.E.canvasSize(segue.S),o=segue.E.scene(segue.S,segue.items,c,segue.fonts,W,H,segue.clock).ops.find(o=>o.item&&o.item.id===segue.items[0].id),b=document.querySelector('#cv').getBoundingClientRect(),k=b.width/segue.E.canvasSize(segue.S)[0];return {x:b.x+(o.rect.x+o.rect.w)*k,y:b.y+(o.rect.y+o.rect.h)*k,cx:b.x+(o.rect.x+o.rect.w/2)*k,cy:b.y+(o.rect.y+o.rect.h/2)*k}})()")
    pg.mouse.move(rr['x'], rr['y']); pg.mouse.down(); pg.mouse.move(rr['x'] + 30, rr['y'] + 30, steps=6); pg.mouse.up(); time.sleep(.3)
    s2 = pg.evaluate("(()=>{const i=segue.items[0];return {fz:i.fz||100,zm:i.zm||100}})()")
    # 0.15: no Alt – the ring at the shape's centre moves the picture inside; a double-click goes in to crop (drag, corners zoom), Esc comes out
    rr = pg.evaluate("(()=>{const c=document.createElement('canvas').getContext('2d'),[W,H]=segue.E.canvasSize(segue.S),o=segue.E.scene(segue.S,segue.items,c,segue.fonts,W,H,segue.clock).ops.find(o=>o.item&&o.item.id===segue.items[0].id),b=document.querySelector('#cv').getBoundingClientRect(),k=b.width/W;return {x:b.x+(o.rect.x+o.rect.w)*k,y:b.y+(o.rect.y+o.rect.h)*k,cx:b.x+(o.rect.x+o.rect.w/2)*k,cy:b.y+(o.rect.y+o.rect.h/2)*k,w:o.rect.w*k,h:o.rect.h*k}})()")
    pg.evaluate("()=>{segue.items[0].zm=150;segue.refresh();}"); time.sleep(.3)
    pg.mouse.move(rr['cx'], rr['cy']); pg.mouse.down(); pg.mouse.move(rr['cx'] + 30, rr['cy'] + 20, steps=6); pg.mouse.up(); time.sleep(.3)
    s3 = pg.evaluate("(()=>{const i=segue.items[0];return {ox:i.ox,px:i.px||0,py:i.py||0}})()")
    pg.mouse.dblclick(rr['cx'] - rr['w'] / 4, rr['cy'] - rr['h'] / 4); time.sleep(.4)
    hint15 = pg.evaluate("document.querySelector('#selHint').textContent")
    pg.mouse.move(rr['cx'] - rr['w'] / 4, rr['cy'] + rr['h'] / 4); pg.mouse.down(); pg.mouse.move(rr['cx'] - rr['w'] / 4 - 25, rr['cy'] + rr['h'] / 4, steps=6); pg.mouse.up(); time.sleep(.3)
    s4 = pg.evaluate("(()=>{const i=segue.items[0];return {ox:i.ox,px:i.px||0}})()")
    pg.keyboard.press('Escape'); time.sleep(.2)
    pg.mouse.move(rr['cx'] - rr['w'] / 4, rr['cy'] + rr['h'] / 4); pg.mouse.down(); pg.mouse.move(rr['cx'] - rr['w'] / 4 + 20, rr['cy'] + rr['h'] / 4, steps=6); pg.mouse.up(); time.sleep(.3)
    s5 = pg.evaluate("(()=>{const i=segue.items[0];return {ox:i.ox,px:i.px||0}})()")
    check('Cropping without Alt (0.15): double-click a shape and a drag moves the picture inside it; Esc, and a drag moves the shape again',
          'corners zoom' in hint15 and s4['px'] != s3['px'] and s4['ox'] == s3['ox'] and s5['px'] == s4['px'] and s5['ox'] != s4['ox'], f'{hint15} {s3} {s4} {s5}')
    grp = pg.evaluate("[...document.querySelectorAll('.media-list .slot.open .slot-det .sub-h, .media-list .slot.open .slot-det .grp-h, .media-list .slot.open .slot-det h4')].map(e=>e.textContent.trim())")
    check('In a shape (0.13): dragging a slide moves its shape, a corner sizes it, and the ring at its centre moves the picture inside (0.15) – its row has Position as well as Crop',
          s1['ox'] > 0 and s1['oy'] > 0 and s1['px'] == 0 and s1['py'] == 0 and s2['fz'] > 100 and s2['zm'] == 100 and s3['ox'] == s1['ox'] and (s3['px'] != 0 or s3['py'] != 0), f'{s1} {s2} {s3} {grp}')
    pg.evaluate("()=>{segue.items.forEach(i=>{i.fz=100;i.ox=0;i.oy=0;i.px=0;i.py=0;});segue.refresh();}")

    # ---- 0.14: the review – Layout apart from Motion, one word each, the pile in one place, quieter rows, a hint on the canvas ----
    pg.keyboard.press('Escape'); time.sleep(.2)
    rv = pg.evaluate("""()=>{const q=(c,sel)=>!!document.querySelector(`#panel section.card[data-id=${c}] ${sel}`),o={};segue.applyPreset('Build up');segue.set('oneFit','shape');
      const folds=c=>[...document.querySelectorAll(`#panel section.card[data-id=${c}] .card-body>.fold`)].filter(f=>!f.hidden).map(f=>f.querySelector('.fold-head span').textContent);
      o.layout=[q('layout','.kinds'),q('layout','.seg[aria-label="Each slide"]'),folds('layout').join()];o.motion=[q('motion','.kinds'),q('motion','.seg[aria-label="Each slide"]'),folds('motion').join()];
      const m=document.querySelector('#panel section.card[data-id=motion] .card-body'),labs=[...m.children].filter(e=>!e.hidden&&!e.classList.contains('fold')).map(e=>(e.querySelector('.ctl-head label,.ctl-head span,.toggle span:last-child')||{}).textContent).filter(Boolean);
      o.pile=labs.join();segue.set('pile',false);o.after=folds('motion').join();segue.set('pile',true);
      o.format=!!document.querySelector('#panel section.card[data-id=canvas] .seg[aria-label=Format]');
      o.shift=segue.ui.controls.find(c=>c.d&&c.d.k==='nudgeX').w.closest('.fold').querySelector('.fold-head span').textContent+' in '+segue.ui.controls.find(c=>c.d&&c.d.k==='nudgeX').w.closest('section.card').dataset.id;
      const sh=[...document.querySelectorAll('#panel section.card[data-id=layout] .fold-head')].find(h=>h.getAttribute('aria-expanded')==='false');o.sum=sh?[sh.querySelector('.sum').textContent,getComputedStyle(sh.querySelector('.sum')).display]:null;return o;}""")
    check('Layout holds the Kind, what each slide is and the Shapes; Motion holds only what moves – and the pile’s Then sits with Pile up, After the last only without it',
          rv['layout'] == [True, True, 'Shapes,Placement'] and rv['motion'][:2] == [False, False] and rv['motion'][2] == 'Timing,Character'
          and 'Pile up' in rv['pile'] and rv['pile'].index('Pile up') < rv['pile'].index('Then') and 'After the last' in rv['after'], str(rv))
    check('Names that meant two things: the canvas has a Format, the whole layout is moved by Layout’s Placement (0.16); a shut group says what it holds',
          rv['format'] and rv['shift'] == 'Placement in layout' and rv['sum'] and rv['sum'][0] and rv['sum'][1] != 'none', str(rv))
    pg.evaluate("document.querySelectorAll('.media-list .slot.open .slot-main').forEach(e=>e.click())"); time.sleep(.2)
    pg.locator('#panel .media-list .slot').nth(1).locator('.slot-main').click(); time.sleep(.6)
    pr = pg.evaluate("""()=>{const d=document.querySelector('.media-list .slot.open .slot-det');return {labels:[...d.querySelectorAll('.ctl.sel label')].map(e=>e.textContent),sw:d.querySelector('.layer-sw .toggle span:last-child').textContent,
      sums:[...d.querySelectorAll('.det-fold .fold-head')].map(h=>h.querySelector('span').textContent+':'+h.querySelector('.sum').textContent),hint:document.querySelector('#selHint').textContent,hidden:document.querySelector('#selHint').hidden};}""")
    check('A piece’s row speaks the panel’s words – Transition and Movement, “Layer on above” – its groups say what they hold, and the canvas says what a drag does',
          'Transition' in pr['labels'] and 'Movement' in pr['labels'] and 'Arrives by' not in pr['labels'] and pr['sw'] == 'Layer on above' and 'Timing:As set' in pr['sums'] and 'Look:Normal' in pr['sums']
          and pr['hint'].startswith('Drag to move') and 'Alt' not in pr['hint'] and pr['hidden'] is False, str(pr))
    ctx2 = b.new_context(viewport={'width': 1440, 'height': 900}); p2 = ctx2.new_page(); p2.goto(url); time.sleep(1.2); p2.set_input_files('#mediafile', IMGS[:2]); time.sleep(1.5)
    p2.evaluate("segue.applyPreset('Straight cuts')"); p2.locator('#panel .media-list .slot').nth(0).locator('.slot-main').click(); time.sleep(.6)
    op = p2.evaluate("[...document.querySelectorAll('.media-list .slot.open .det-fold .fold-head')].map(h=>h.querySelector('span').textContent+':'+h.getAttribute('aria-expanded'))"); ctx2.close()
    check('…and opens on what you drag: Position and Crop open, Timing and Look shut until wanted', 'Timing:false' in op and 'Look:false' in op and any(x in op for x in ('Crop:true', 'Position:true')), str(op))

    # ---- 0.16: the audit – Frames that change whatever the count, a frame of a piece's own, one way to switch things on ----
    pg.keyboard.press('Escape'); time.sleep(.2)
    fr = pg.evaluate("""()=>{const o={},three=segue.items.slice(0,3),E=segue.E,S=segue.S;segue.applyPreset('Posters');
      const P3=E.plan(S,three);o.three=[P3.kind,P3.n,JSON.stringify(P3.seqs)];
      const all=segue.items,Pa=E.plan(S,all);o.share=Pa.seqs.map(q=>q.join('')).join(' ');segue.set('fFill','all');o.all=E.plan(S,all).seqs.map(q=>q.length).join();segue.set('fFill','share');
      all.forEach(i=>delete i.slot);all[0].slot='2';all[1].slot='2';const Pp=E.plan(S,all);o.pin=JSON.stringify(Pp.seqs[1]);o.others=Pp.seqs[0].concat(Pp.seqs[2]).some(i=>i<2);
      const c=document.createElement('canvas').getContext('2d'),[W,H]=E.canvasSize(S),ops=t=>E.scene(S,all,c,segue.fonts,W,H,t).ops.filter(q=>q.item).map(q=>q.i+':'+Math.round(q.rect.x)+','+Math.round(q.rect.y)+':'+(q.alpha==null?1:q.alpha).toFixed(2)).join('|');
      o.loop=ops(0)===ops(Pp.L-1e-6)||ops(1e-4)===ops(Pp.L+1e-4);o.L=Pp.L;all.forEach(i=>delete i.slot);segue.refresh();return o;}""")
    check('Frames (0.16): three pictures in three frames change places (they used to sit still); more media are dealt round, or every frame goes through them all',
          fr['three'][0] == 'fstep' and fr['three'][1] == 3 and fr['three'][2] == '[[0,1,2],[1,2,0],[2,0,1]]' and len(set(fr['all'].split(','))) == 1, str(fr))
    check('…and a piece can have a frame of its own: that frame shows only its pieces, the rest go round the others, and it still loops', fr['pin'] == '[0,1]' and not fr['others'] and fr['loop'], str(fr))
    sw = pg.evaluate("""()=>{const o={},S=segue.S,row=k=>segue.ui.controls.find(c=>c.d&&c.d.k===k&&c.d.t==='toggle'),vis=(k,t)=>segue.ui.controls.some(c=>c.d&&c.d.k===k&&c.d.t===t&&!c.w.hidden&&!c.w.closest('[hidden]'));
      segue.applyPreset('Posters');segue.set('mat',0);o.off=[vis('mat','range'),vis('matC','colour')];row('mat').w.querySelector('.toggle').click();o.on=[S.mat>0,vis('mat','range'),vis('matC','colour')];segue.set('mat',40);
      row('mat').w.querySelector('.toggle').click();o.off2=S.mat;row('mat').w.querySelector('.toggle').click();o.back=S.mat;
      o.grp=['mat','edge'].map(k=>row(k).w.classList.contains('sw-grp'));segue.applyPreset('Build up');o.pile=row('pile').w.classList.contains('sw-grp');
      segue.set('oneFit','bleed');o.bleed=vis('pile','toggle');segue.applyPreset('Float with title');o.float=[S.ovOn,S.ovText];segue.applyPreset('Posters');return o;}""")
    check('One way to switch a thing on (0.16): Border, Edge and Pile up each head their group with a box – Border’s width comes back as it was; Pile up isn’t offered for full bleed; Float with title shows a title',
          sw['off'] == [False, False] and sw['on'] == [True, True, True] and sw['off2'] == 0 and sw['back'] == 40 and sw['grp'] == [True, True] and sw['pile'] and not sw['bleed'] and sw['float'][0] is True and sw['float'][1], str(sw))

    # ---- 0.17: Export as one control, the bottom line, the guide, chips of one family, drawings that move ----
    pg.keyboard.press('Escape'); time.sleep(.2)
    keepX = pg.evaluate("()=>({f:segue.S.xFormat,sc:segue.S.xGifScale,fps:segue.S.xGifFps})")
    pg.evaluate("()=>{segue.applyPreset('Masonry drift');segue.set('xFormat','gif');segue.set('xGifScale',1);segue.set('xGifFps',25);}"); time.sleep(.5)
    eo = pg.evaluate("()=>{const e=document.querySelector('#exportOpen');return {t:e.textContent.trim(),chev:!!e.querySelector('.chev'),tip:e.dataset.tip,stop:document.querySelector('#exportStop').hidden};}")
    check('Export says it opens a choice – a chevron, and a tip that says so – rather than looking like the download itself', eo['t'] == 'Export' and eo['chev'] and 'Choose a format' in eo['tip'] and eo['stop'], str(eo))
    pg.locator('#exportOpen').click(); time.sleep(.6)
    pg.evaluate("document.querySelector('.sheet .xgo').click()"); time.sleep(2.2)
    run = pg.evaluate("""()=>{const g=document.querySelector('.sheet .xgo'),e=document.querySelector('#exportOpen'),s=document.querySelector('#exportStop'),xs=document.querySelector('.sheet .xstop');
      const h=x=>Math.round(x.getBoundingClientRect().height);return {go:g.textContent,p:parseFloat(g.style.getPropertyValue('--p')),run:g.classList.contains('run'),isl:e.textContent.trim(),islRun:e.classList.contains('run'),
        stopShown:!s.hidden&&!xs.hidden,same:h(s)===h(e)&&h(xs)===h(g),busy:segue.busy};}""")
    live = pg.evaluate("()=>{segue.setPlaying(true);const t0=segue.clock;segue.set('bg','#123456');return new Promise(r=>setTimeout(()=>{const m=segue.clock!==t0;segue.setPlaying(false);r({moved:m,bg:segue.S.bg});},500));}")
    check('The Export button is the progress while it works – the fill, the per cent and the time left – and the island says the same, with Stop beside it at the same height',
          run['run'] and run['islRun'] and run['p'] > 0 and 'GIF' in run['go'] and '%' in run['go'] and '%' in run['isl'] and run['stopShown'] and run['same'], str(run))
    check('…and the work carries on while it runs: the loop still plays and settings still change (the file is made from a copy taken when it started)',
          live['moved'] and live['bg'] == '#123456', str(live))
    pg.keyboard.press('Escape'); time.sleep(.3)
    shut = pg.evaluate("()=>({sheetShut:document.querySelector('.sheet[data-sheet=export]').hidden,still:segue.busy,isl:document.querySelector('#exportOpen').textContent.trim()})")
    pg.evaluate("document.querySelector('#exportStop').click()"); time.sleep(1.4)
    note = pg.evaluate("()=>{const n=document.querySelector('#notice');return {shown:!n.hidden,quiet:n.classList.contains('quiet'),t:n.textContent,back:document.querySelector('#exportOpen').textContent.trim(),busy:segue.busy};}")
    check('The sheet can be shut while it works – the island keeps the progress and Stop – and a note says how it ended',
          shut['sheetShut'] and shut['still'] and '%' in shut['isl'] and note['shown'] and note['quiet'] and 'stopped' in note['t'] and note['back'] == 'Export' and not note['busy'], f'{shut} {note}')
    pg.evaluate("()=>{document.querySelector('#notice').hidden=true;segue.set('bg','#F5F5F3');segue.applyPreset('Straight cuts');}"); time.sleep(.4)
    pg.locator('#exportOpen').click(); time.sleep(.5)
    ch = pg.evaluate("""()=>{const r=e=>e.getBoundingClientRect(),f=[...document.querySelectorAll('.stage-foot span')].filter(e=>e.offsetParent);
      const sh=document.querySelector('.xinfo .chip');const g=e=>{const c=getComputedStyle(e);return [Math.round(r(e).height),c.borderRadius,c.fontSize,c.fontWeight].join()};
      return {foot:f.map(g),chip:sh?g(sh):null,act:f.map(e=>e.classList.contains('typable')),tips:f.map(e=>!!e.dataset.tip)};}""")
    check('The chips over the canvas and the ones in Export are one family – same height, shape, type – and each one up there does something when you point at it',
          ch['chip'] and all(x == ch['chip'] for x in ch['foot']) and all(ch['act']) and all(ch['tips']), str(ch))
    pg.keyboard.press('Escape'); time.sleep(.3)
    pg.evaluate("document.querySelector('#dims').click()"); time.sleep(.6)
    jump = pg.evaluate("!document.querySelector('#panel section.card[data-id=canvas]').classList.contains('collapsed')")
    check('…the size chip opens Canvas, where the size is set', jump is True)
    # 0.17.1 – Steve's Safari 26.5: the Projects panel opened before start-up had the projects in, and threw.
    # Here IndexedDB is slowed so the race happens every time.
    slow = """(()=>{const open=indexedDB.open.bind(indexedDB);indexedDB.open=function(...a){const r=open(...a);let f=null;
      Object.defineProperty(r,'onsuccess',{configurable:true,get(){return f;},set(fn){f=fn;r.addEventListener('success',e=>{setTimeout(()=>fn&&fn.call(r,e),1600);});}});return r;};})()"""
    ctx3 = b.new_context(viewport={'width': 1400, 'height': 900}); ctx3.add_init_script(slow)
    p3 = ctx3.new_page(); e3 = []; p3.on('pageerror', lambda e: e3.append(str(e))); p3.goto(url); time.sleep(.6)
    p3.click('#projBtn'); time.sleep(.3)
    waiting = p3.evaluate("[document.querySelector('#projPop').hidden,document.querySelector('#projPop').textContent]")
    time.sleep(3.5)
    ready = p3.evaluate("[!!document.querySelector('#projPop .proj-field'),document.querySelector('#projName').textContent]")
    ctx3.close()
    check('Projects opened before start-up has them in says so and fills itself in when they arrive, rather than going wrong (0.17.1)',
          waiting[0] is False and 'Getting your projects' in waiting[1] and ready[0] and ready[1] and not e3, f'{waiting} {ready} {e3[:1]}')
    pg.locator('#pcapOpen').click(); time.sleep(.8)
    an = pg.evaluate("""()=>{const ks=[...document.querySelectorAll('.kind')].map(k=>k.dataset.k),ps=[...document.querySelectorAll('.preset-row .pk')].map(k=>k.dataset.anim);
      return {ks,kinds:ks.every(Boolean),anims:[...new Set(ps)].sort(),all:ps.every(Boolean)};}""")
    pg.keyboard.press('Escape'); time.sleep(.3)
    check('Every Kind tile and every preset drawing knows how to move when you point at it – slides swap, strips travel, a pile builds',
          an['kinds'] and an['all'] and 'swap' in an['anims'] and 'shift' in an['anims'] and 'pile' in an['anims'], str(an))
    pg.evaluate("k=>{segue.set('xFormat',k.f);segue.set('xGifScale',k.sc);segue.set('xGifFps',k.fps);}", keepX); time.sleep(.3)
    pg.evaluate("segue.applyPreset('Card stack');segue.set('ovOn',false);segue.set('capOn',false)")

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
    # 0.4.4: 2× – twice the pixels each way, the same picture
    pg.evaluate("segue.set('xScale',2)"); got2 = {}
    for fmt in ['png', 'mp4']:
        pg.evaluate("f=>segue.set('xFormat',f)", fmt); sheet(pg, 'export')
        with pg.expect_download(timeout=240000) as d:
            pg.get_by_role('button', name='Download ' + fmt.upper()).click()
        path = os.path.join(OUT, d.value.suggested_filename); d.value.save_as(path); got2[fmt] = path
    pg.evaluate("segue.set('xScale',1)")
    im2 = Image.open(got2['png']).convert('RGB'); m2 = probe(got2['mp4'])
    same = float(np.sqrt(((np.asarray(im2.resize((540, 676), Image.LANCZOS), float) - np.asarray(im.convert('RGB'), float)) ** 2).mean()))
    check('2×: PNG and MP4 at twice the pixels each way, named for it – the same picture, drawn finer', im2.size == (1080, 1352) and m2.get('width') == 1080 and m2.get('height') == 1352 and os.path.basename(got2['png']) == 'Test_reel_1080x1352.png' and same < 12,
          f"PNG {im2.size}, MP4 {m2.get('width')}×{m2.get('height')}, {os.path.basename(got2['png'])}; shrunk back to 1×, {same:.1f} levels RMS from the 1× PNG")

    # ---- it all comes back ----
    pg.reload(); time.sleep(2.5); pg.evaluate(OPEN_TIER); time.sleep(.3)
    back = pg.evaluate("[segue.items.length,segue.items[0].title,segue.S.cW,segue.S.name,!!segue.pics.bg,!!segue.pics.ov]")
    check('after a reload: the media, captions, settings and both images are back', back == [4, 'Title 1', 540, 'Test reel', True, True], str(back))
    check('no errors on the page', not errs, '; '.join(errs[:3]))
    b.close()

fails = [r for r in results if not r[0]]
print(f'\n{len(results) - len(fails)} of {len(results)} passed')
sys.exit(1 if fails else 0)

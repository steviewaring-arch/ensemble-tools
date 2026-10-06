from playwright.sync_api import sync_playwright
import time,sys
OT=open('/tmp/claude-0/-home-claude/11f26eca-7a5c-5626-9279-fe8fb479a6a9/scratchpad/ot2/node_modules/opentype.js/dist/opentype.min.js').read()
POP=['/usr/share/fonts/truetype/google-fonts/Poppins-Regular.ttf','/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf']
src=sys.argv[1];tag=sys.argv[2]
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1440,'height':960},accept_downloads=True)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/opentype*.js', lambda r: r.fulfill(body=OT, content_type='application/javascript'))
    for u in ['https://fonts.googleapis.com/**','https://use.typekit.net/**']: pg.route(u, lambda r: r.abort())
    pg.goto('file://'+src); time.sleep(.8)
    pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('rubato')"); pg.reload(); time.sleep(1)
    pg.set_input_files('#fontfile',POP); time.sleep(1.2)
    pg.get_by_role('button',name='Screensaver',exact=True).click(); time.sleep(.5)
    pg.evaluate("document.querySelectorAll('section.card.collapsed .card-toggle').forEach(b=>b.click())")
    with pg.expect_download() as d: pg.get_by_role('button',name='Download HTML file').click()
    d.value.save_as(f'ss_{tag}.html')
    pg.goto(f'file:///home/claude/tests/ss_{tag}.html'); time.sleep(.6)
    res=pg.evaluate("""()=>{const C=window.__RUBATO__,e=createEngine();
      e.setFaces(C.fonts.map(d=>({id:d.id,face:e.makeBaked(d),swap:true})));
      const S=Object.assign({},C.base,{seq:false,rOn:false,tightMask:true,stretch:false,qClear:false,fit:'cap',size:62,align:'left',valign:'top',margin:8,tabular:true,
        qStyle:'roll',qEase:'snappy',qStagger:.3,qDir:'up',texts:['12,08,05'],mode:'none',vMode:'off',axOn:false,dur:60,bg:'#5B23F0',ink:'#FFF35C',transparent:false,leading:1,tracking:0});
      e.use(S);const cv=document.createElement('canvas');cv.width=1680;cv.height=1050;const ctx=cv.getContext('2d');const out=[];
      for(const t of [0.004,0.05,0.5,0.95,0.996,1]){e.setLive(t<1?{from:'12,08,04',to:'12,08,05',t}:null);S.texts[0]='12,08,05';e.renderFrame(ctx,1680,1050,0,1,true);out.push(cv.toDataURL('image/png'));}
      return out;}""")
    import base64
    for i,u in enumerate(res): open(f'f_{tag}_{i}.png','wb').write(base64.b64decode(u.split(',')[1]))
    b.close()
print('ERRS',errs)

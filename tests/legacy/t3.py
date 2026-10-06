from playwright.sync_api import sync_playwright
import time,base64,json
OT=open('/tmp/claude-0/-home-claude/11f26eca-7a5c-5626-9279-fe8fb479a6a9/scratchpad/ot2/node_modules/opentype.js/dist/opentype.min.js').read()
errs=[]
R=base64.b64encode(open('/usr/share/fonts/truetype/google-fonts/Poppins-Regular.ttf','rb').read()).decode()
B=base64.b64encode(open('/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf','rb').read()).decode()
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1440,'height':960},accept_downloads=True)
    pg.on('pageerror', lambda e: errs.append('PAGE '+str(e)))
    pg.on('console', lambda m: errs.append('CON '+m.text) if m.type=='error' and 'ERR_' not in m.text else None)
    pg.route('**/opentype.min.js', lambda r: r.fulfill(body=OT, content_type='application/javascript'))
    for u in ['https://fonts.googleapis.com/**','https://use.typekit.net/**']: pg.route(u, lambda r: r.abort())
    pg.goto('file:///home/claude/src/rubato.html'); time.sleep(.8)
    # simulate v0.6 storage
    pg.evaluate("""async ([r,b])=>{localStorage.clear();await new Promise(res=>{const d=indexedDB.deleteDatabase('rubato');d.onsuccess=d.onerror=d.onblocked=res;});
      const toBuf=s=>{const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer;};
      const db=await new Promise((res,rej)=>{const q=indexedDB.open('rubato',1);q.onupgradeneeded=()=>q.result.createObjectStore('fonts');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});
      await new Promise(res=>{const tx=db.transaction('fonts','readwrite');const st=tx.objectStore('fonts');st.put({name:'Poppins-Regular.ttf',buf:toBuf(r)},'slot1');st.put({name:'Poppins-Bold.ttf',buf:toBuf(b)},'slot2');tx.oncomplete=res;});db.close();
      localStorage.setItem('rubato:settings',JSON.stringify({texts:['Lazaar'],baseSlot:2,fit:'stretch',vMode:'both',picks:{a:['1:200','2:200']}}));}""",[R,B])
    pg.reload(); time.sleep(2)
    print('migrated styles:', pg.locator('.font-list .slot-name').all_inner_texts())
    st=pg.evaluate("JSON.parse(localStorage.getItem('rubato:settings')||'{}')")
    print('fit',st.get('fit'),'stretch',st.get('stretch'),'baseSlot',st.get('baseSlot'),'picks',st.get('picks'))
    print('default pressed:', pg.locator('.font-list .slot-top button[aria-pressed=true]').all_inner_texts(), pg.locator('.font-list .slot').nth(1).locator('.slot-name').inner_text())
    # screensaver tab exports
    pg.get_by_role('button',name='Screensaver',exact=True).click(); time.sleep(1)
    pg.evaluate("document.querySelectorAll('section.card.collapsed .card-toggle').forEach(b=>b.click())")
    with pg.expect_download() as d: pg.get_by_role('button',name='Download HTML file').click()
    d.value.save_as('ss.html')
    with pg.expect_download(timeout=60000) as d: pg.get_by_role('button',name='Download for Mac').click()
    d.value.save_as('mac.zip');print('mac',d.value.suggested_filename)
    pg.locator('#cv').screenshot(path='ss_prev.png')
    pg.get_by_role('button',name='Studio',exact=True).click(); time.sleep(.4)
    pg.evaluate("document.querySelectorAll('section.card.collapsed .card-toggle').forEach(b=>b.click())")
    with pg.expect_download(timeout=90000) as d: pg.get_by_role('button',name='Make GIF').click()
    d.value.save_as('out.gif')
    with pg.expect_download() as d: pg.get_by_role('button',name='PNG frame').click()
    d.value.save_as('out.png')
    b.close()
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1280,'height':800})
    pg.on('pageerror', lambda e: errs.append('SS '+str(e)))
    pg.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
    pg.goto('file:///home/claude/tests/ss.html'); time.sleep(1.2); pg.screenshot(path='ss_run.png'); b.close()
print('ERRS',errs)

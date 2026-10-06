from playwright.sync_api import sync_playwright
import time
OT=open('/tmp/claude-0/-home-claude/11f26eca-7a5c-5626-9279-fe8fb479a6a9/scratchpad/ot2/node_modules/opentype.js/dist/opentype.min.js').read()
errs=[]
POP=['/usr/share/fonts/truetype/google-fonts/Poppins-Regular.ttf','/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf']
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1440,'height':960},accept_downloads=True)
    pg.on('pageerror', lambda e: errs.append('PAGE '+str(e)))
    pg.on('console', lambda m: errs.append('CON '+m.text) if m.type=='error' and 'ERR_' not in m.text else None)
    pg.route('**/opentype.min.js', lambda r: r.fulfill(body=OT, content_type='application/javascript'))
    for u in ['https://fonts.googleapis.com/**','https://use.typekit.net/**']: pg.route(u, lambda r: r.abort())
    pg.goto('file:///home/claude/src/rubato.html'); time.sleep(.8)
    pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('rubato')"); pg.reload(); time.sleep(1)
    pg.set_input_files('#fontfile',POP); time.sleep(1.2)
    pg.get_by_role('button',name='Screensaver',exact=True).click(); time.sleep(.6)
    pg.evaluate("document.querySelectorAll('section.card.collapsed .card-toggle').forEach(b=>b.click())")
    cards=[t.split('\n')[0] for t in pg.locator('section.card:visible h2').all_inner_texts()]
    print('saver cards:',cards)
    pg.get_by_role('switch',name='Seconds').click()
    pg.evaluate("const i=document.querySelector('#c_ssLen');i.value=.95;i.dispatchEvent(new Event('input'))")
    pg.evaluate("const i=document.querySelector('#c_ssDrift');i.value=0;i.dispatchEvent(new Event('input'))")
    time.sleep(1.2)
    for k,ms in enumerate((150,450,750,880,930)):
        pg.wait_for_function(f"(Date.now()%1000)>={ms}&&(Date.now()%1000)<{ms+25}",polling=2)
        pg.locator('#cv').screenshot(path=f'roll_{k}.png')
    # looks mode: Position card still visible with drift
    pg.get_by_role('group',name='Show').get_by_role('button',name='Saved looks').click();time.sleep(.3)
    print('looks cards:',[t.split('\n')[0] for t in pg.locator('section.card:visible h2').all_inner_texts()])
    print('drift visible in looks:',pg.locator('#c_ssDrift').is_visible())
    pg.get_by_role('group',name='Show').get_by_role('button',name='The time').click();time.sleep(.3)
    with pg.expect_download(timeout=60000) as d: pg.get_by_role('button',name='Download for Windows').click()
    d.value.save_as('win.zip');print('win',d.value.suggested_filename)
    with pg.expect_download(timeout=60000) as d: pg.get_by_role('button',name='Download for Mac').click()
    d.value.save_as('mac.zip');print('mac',d.value.suggested_filename)
    b.close()
print('ERRS',errs)

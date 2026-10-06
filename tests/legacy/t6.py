from playwright.sync_api import sync_playwright
import time
OT=open('/tmp/claude-0/-home-claude/11f26eca-7a5c-5626-9279-fe8fb479a6a9/scratchpad/ot2/node_modules/opentype.js/dist/opentype.min.js').read()
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1440,'height':960},accept_downloads=True)
    pg.on('pageerror', lambda e: print('PAGEERR',e))
    pg.on('console', lambda m: print('CON',m.type,m.text[:300]) if m.type in ('error','warning') else None)
    pg.route('**/opentype.min.js', lambda r: r.fulfill(body=OT, content_type='application/javascript'))
    for u in ['https://fonts.googleapis.com/**','https://use.typekit.net/**']: pg.route(u, lambda r: r.abort())
    pg.goto('file:///home/claude/src/rubato.html'); time.sleep(.8)
    pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('rubato')"); pg.reload(); time.sleep(1)
    pg.set_input_files('#fontfile',['/usr/share/fonts/truetype/google-fonts/Poppins-Regular.ttf']); time.sleep(1)
    pg.get_by_role('button',name='Screensaver',exact=True).click(); time.sleep(.5)
    pg.evaluate("document.querySelectorAll('section.card.collapsed .card-toggle').forEach(b=>b.click())")
    with pg.expect_download(timeout=15000) as d: pg.get_by_role('button',name='Download for Mac').click()
    d.value.save_as('mac2.zip')
    with pg.expect_download(timeout=15000) as d: pg.get_by_role('button',name='Download for Windows').click()
    d.value.save_as('win2.zip')
    b.close()
print('ERRS',errs)

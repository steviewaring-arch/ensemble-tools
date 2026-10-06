from playwright.sync_api import sync_playwright
import time
OT=open('/tmp/claude-0/-home-claude/11f26eca-7a5c-5626-9279-fe8fb479a6a9/scratchpad/ot2/node_modules/opentype.js/dist/opentype.min.js').read()
errs=[]
POP=['/usr/share/fonts/truetype/google-fonts/Poppins-Regular.ttf','/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf']
def scrub(pg,v,name):
    pg.evaluate(f"document.querySelector('#scrub').value={v};document.querySelector('#scrub').dispatchEvent(new Event('input'))");time.sleep(.12);pg.locator('#cv').screenshot(path=name)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1440,'height':960},accept_downloads=True)
    pg.on('pageerror', lambda e: errs.append('PAGE '+str(e)))
    pg.route('**/opentype.min.js', lambda r: r.fulfill(body=OT, content_type='application/javascript'))
    for u in ['https://fonts.googleapis.com/**','https://use.typekit.net/**']: pg.route(u, lambda r: r.abort())
    pg.goto('file:///home/claude/src/rubato.html'); time.sleep(.8)
    pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('rubato')"); pg.reload(); time.sleep(1)
    pg.evaluate("document.querySelectorAll('section.card.collapsed .card-toggle').forEach(b=>b.click())")
    pg.set_input_files('#fontfile',POP); time.sleep(1.2)
    pg.get_by_role('button',name='Still',exact=True).click()
    pg.get_by_role('switch',name='Sequence of texts').click(); time.sleep(.2)
    t=pg.locator('#panel textarea');t.nth(0).fill('Lazaar');t.nth(1).fill('Display')
    pg.evaluate("const i=document.querySelector('#c_qStagger');i.value=.5;i.dispatchEvent(new Event('input'))")
    pg.evaluate("const i=document.querySelector('#c_qDur');i.value=.6;i.dispatchEvent(new Event('input'))")
    tr=pg.get_by_role('group',name='Transition')
    for style in ['Roll','Stretch','Fade','Cut']:
        tr.get_by_role('button',name=style).click();time.sleep(.1)
        for v in (300,350,400,450): scrub(pg,v,f'q_{style}_{v}.png')
    pg.get_by_role('group',name='Handover').get_by_role('button',name='Together').click()
    tr.get_by_role('button',name='Roll').click()
    for v in (300,350,400,450): scrub(pg,v,f'q_Together_{v}.png')
    # stretch toggle
    pg.get_by_role('switch',name='Sequence of texts').click()
    pg.locator('#panel textarea').nth(0).fill('LOVE\nHATE')
    pg.get_by_role('switch',name='Stretch to fill').click();time.sleep(.2);pg.locator('#cv').screenshot(path='st_on.png')
    pg.get_by_role('switch',name='Stretch to fill').click();time.sleep(.2);pg.locator('#cv').screenshot(path='st_off.png')
    pg.get_by_role('switch',name='Repeat rows').click();time.sleep(.2);pg.locator('#cv').screenshot(path='rep_off.png')
    pg.get_by_role('switch',name='Stretch to fill').click();time.sleep(.2);pg.locator('#cv').screenshot(path='rep_on.png')
    # tooltip
    q=pg.locator('.q').first;q.scroll_into_view_if_needed();time.sleep(.3);pg.mouse.move(5,5);time.sleep(.1);q.hover();time.sleep(.3)
    print('tip visible',pg.locator('.tip.on').count(),pg.locator('.tip').inner_text()[:60])
    print('q count',pg.locator('.q').count())
    pg.locator('section.card').filter(has_text='Movement').first.screenshot(path='motioncard.png')
    # randomise menu
    pg.click('#randOpt');time.sleep(.3)
    print('pop visible',pg.locator('.rand-pop').is_visible())
    pg.screenshot(path='randpop.png')
    pg.get_by_role('button',name='Everything',exact=True).click()
    pg.locator('.rand-pop').get_by_role('switch',name='Colour').click();pg.locator('.rand-pop').get_by_role('switch',name='Layout').click()
    for i in range(6):
        pg.locator('.rand-pop').get_by_role('button',name='Randomise').click();time.sleep(.25)
    pg.locator('#cv').screenshot(path='rand_full.png')
    pg.keyboard.press('Escape');time.sleep(.1);print('pop after esc',pg.locator('.rand-pop').is_visible())
    pg.get_by_role('button',name='Undo',exact=True).click()
    pg.click('#randOpt');pg.get_by_role('button',name='Within limits',exact=True).click();pg.keyboard.press('Escape')
    for i in range(5):
        pg.keyboard.press('r');time.sleep(.2)
    print('rand settings',pg.evaluate("localStorage.getItem('rubato:rand')"))
    b.close()
print('ERRS',errs)

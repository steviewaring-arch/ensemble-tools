from playwright.sync_api import sync_playwright
import time,sys
OT=open('/tmp/claude-0/-home-claude/11f26eca-7a5c-5626-9279-fe8fb479a6a9/scratchpad/ot2/node_modules/opentype.js/dist/opentype.min.js').read()
errs=[]
POP=['/usr/share/fonts/truetype/google-fonts/Poppins-Regular.ttf','/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf']
LORA='/usr/share/fonts/truetype/google-fonts/Lora-Variable.ttf'
def setup(p):
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1440,'height':960},accept_downloads=True)
    pg.on('pageerror', lambda e: errs.append('PAGE '+str(e)))
    pg.on('console', lambda m: errs.append('CON '+m.text) if m.type=='error' and 'ERR_' not in m.text else None)
    pg.route('**/opentype.min.js', lambda r: r.fulfill(body=OT, content_type='application/javascript'))
    for u in ['https://fonts.googleapis.com/**','https://use.typekit.net/**']: pg.route(u, lambda r: r.abort())
    return b,pg
with sync_playwright() as p:
    b,pg=setup(p)
    pg.goto('file:///home/claude/src/rubato.html'); time.sleep(.8)
    pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('rubato')"); pg.reload(); time.sleep(1)
    pg.evaluate("document.querySelectorAll('section.card.collapsed .card-toggle').forEach(b=>b.click())")
    pg.set_input_files('#fontfile',POP+[LORA]); time.sleep(1.5)
    print('styles:', pg.locator('.font-list .slot-name').all_inner_texts())
    print('axes sliders:', pg.locator('.axes input[type=range]').count(), 'select:', pg.locator('.axes select').count())
    pg.locator('.font-list').screenshot(path='fonts.png')
    # add another instance of Lora
    pg.get_by_role('button',name='+ Another instance').click(); time.sleep(.5)
    print('after instance:', pg.locator('.font-list .slot-name').all_inner_texts())
    # make Lora default and animate axis
    pg.get_by_role('button',name='Set text in Lora Regular').click(); time.sleep(.4)
    print('axis section visible:', pg.get_by_role('switch',name='Animate an axis').is_visible())
    pg.get_by_role('switch',name='Animate an axis').click(); time.sleep(.3)
    pg.get_by_role('button',name='Still',exact=True).click()
    for v in (0,250,500):
        pg.evaluate(f"document.querySelector('#scrub').value={v};document.querySelector('#scrub').dispatchEvent(new Event('input'))"); time.sleep(.15)
        pg.locator('#cv').screenshot(path=f'ax{v}.png')
    # SVG export with axis
    with pg.expect_download() as d: pg.get_by_role('button',name='SVG frame').click()
    d.value.save_as('ax.svg')
    # axis slider on font card changes name
    sl=pg.locator('.axes input[type=range]').first
    sl.evaluate("e=>{e.value=650;e.dispatchEvent(new Event('input'))}"); time.sleep(.3)
    print('after slider:', pg.locator('.font-list .slot-name').all_inner_texts())
    # styles swap
    pg.get_by_role('switch',name='Animate an axis').click()
    pg.get_by_role('group',name='Swap').get_by_role('button',name='Styles').click(); time.sleep(.4)
    print('picker rows',pg.locator('.pick-row').count(),'tiles',pg.locator('.tile').count())
    # reload persistence
    pg.reload(); time.sleep(2)
    print('after reload:', pg.locator('.font-list .slot-name').all_inner_texts())
    pg.screenshot(path='full.png')
    b.close()
print('ERRS',errs)

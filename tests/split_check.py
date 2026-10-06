"""Checks for the parts that are new in the split: Rubato and Tempo sharing one
browser's fonts and looks, while keeping their own settings.

    python3 tests/split_check.py

Same requirements as parity.py.
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start
from parity import POP, OPENTYPE

results = []
def check(name, ok, detail=''):
    results.append((ok, name, detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f' – {detail}' if detail else ''))

def main():
    base = start()
    ot = open(OPENTYPE).read()
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1440, 'height': 960}, accept_downloads=True)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/opentype.min.js', lambda r: r.fulfill(body=ot, content_type='application/javascript'))
        for u in ['https://fonts.googleapis.com/**', 'https://use.typekit.net/**']:
            pg.route(u, lambda r: r.abort())
        expand = "document.querySelectorAll('section.card.collapsed .card-toggle').forEach(b=>b.click())"

        # 1. An existing v0.8.1 user: screen saver settings live in rubato:settings
        pg.goto(base + 'docs/rubato/'); time.sleep(.6)
        pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('rubato')")
        pg.evaluate("localStorage.setItem('rubato:settings',JSON.stringify({texts:['Hello there'],ssSecs:true,ssBg:'#000000',tab:'saver'}))")
        pg.reload(); time.sleep(1)
        check('Rubato has no Screensaver tab', pg.get_by_role('button', name='Screensaver', exact=True).count() == 0)
        check('Rubato opens on Studio even if v0.8.1 was left on Screensaver',
              pg.locator('section.card:visible h2').first.inner_text().startswith('Fonts') and pg.locator('#scrub').is_visible())
        pg.set_input_files('#fontfile', POP); time.sleep(1.5)
        pg.evaluate(expand)
        pg.get_by_label('Preset name').fill('Night look')
        pg.get_by_role('button', name='Save', exact=True).click(); time.sleep(.5)

        # 2. Tempo picks up fonts, looks and the v0.8.1 screen saver settings
        pg.goto(base + 'docs/tempo/'); time.sleep(1.5)
        pg.evaluate(expand); time.sleep(.2)
        names = pg.locator('.font-list .slot-name').all_inner_texts()
        check('Fonts loaded in Rubato appear in Tempo', names == ['Poppins Regular', 'Poppins Bold'], json.dumps(names))
        check('Tempo has no Studio controls', pg.locator('#scrub').count() == 0 and pg.get_by_role('button', name='Studio', exact=True).count() == 0)
        check('Seconds carried over from v0.8.1 settings', pg.get_by_role('switch', name='Seconds').get_attribute('aria-checked') == 'true')
        pg.get_by_role('group', name='Show').get_by_role('button', name='Saved looks').click(); time.sleep(.3)
        looks = pg.locator('section.card').filter(has_text='Screensaver').first.locator('.btn-row button').all_inner_texts()
        check('A look saved in Rubato shows in Tempo', 'Night look' in looks, json.dumps(looks))
        pg.get_by_role('group', name='Show').get_by_role('button', name='The time').click()

        # 3. Tempo saves only its own settings
        before = pg.evaluate("localStorage.getItem('rubato:settings')")
        pg.get_by_role('switch', name='Leading zero').click(); time.sleep(.6)
        after = pg.evaluate("localStorage.getItem('rubato:settings')")
        own = json.loads(pg.evaluate("localStorage.getItem('tempo:settings')") or '{}')
        check("Tempo doesn't write Rubato's settings", before == after)
        check('Tempo keeps its settings under tempo:settings', own.get('ssZero') is False and 'texts' not in own and all(k.startswith('ss') or k == 'baseSlot' for k in own), ', '.join(sorted(own))[:120])

        # 4. Rubato's text still reaches the clock's second line
        pg.get_by_role('group', name='Second line').get_by_role('button', name='Rubato text').click(); time.sleep(.3)
        with pg.expect_download() as d:
            pg.get_by_role('button', name='Download HTML file').click()
        html = open(d.value.path(), encoding='utf-8').read()
        marker = 'window.__TEMPO__=' if 'window.__TEMPO__=' in html else 'window.__RUBATO__='  # renamed in Tempo 0.2
        cfg = json.loads(html.split(marker)[1].split(';</script>')[0].replace('\\u003c', '<'))
        check("Clock's second line uses Rubato's text", cfg['clock']['text'] == 'Hello there' and cfg['clock']['line2'] == 'text')
        check('Export carries baked outlines, not font files', len(cfg['fonts']) == 2 and all('glyphs' in f and 'buf' not in f for f in cfg['fonts']))

        # 5. Reload Tempo: its own change sticks, Rubato's unchanged
        pg.reload(); time.sleep(1.2); pg.evaluate(expand)
        check('Tempo remembers its own settings', pg.get_by_role('switch', name='Leading zero').get_attribute('aria-checked') == 'false')
        pg.goto(base + 'docs/rubato/'); time.sleep(1)
        check("Rubato's text unchanged", pg.locator('#panel textarea').first.input_value() == 'Hello there')
        check('No page errors', not errs, '; '.join(errs[:3]))
        b.close()
    bad = [r for r in results if not r[0]]
    print(f'\n{len(results) - len(bad)} of {len(results)} checks passed.')
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()

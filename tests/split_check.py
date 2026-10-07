"""Checks that Rubato and Tempo are kept apart (from Tempo 0.3): each keeps its
own settings and fonts, Tempo carries over what an earlier version left once,
and nothing done in one shows up in the other.

    python3 tests/split_check.py

Same requirements as parity.py.
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start
from parity import POP, OPENTYPE, FONTS

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
        names = lambda: pg.locator('.font-list .slot-name').all_inner_texts()
        def export():
            with pg.expect_download() as d:
                pg.get_by_role('button', name='Download HTML file').click()
            html = open(d.value.path(), encoding='utf-8').read()
            return html, json.loads(html.split('window.__TEMPO__=')[1].split(';</script>')[0].replace('\\u003c', '<'))

        # 1. Someone who used v0.8.1 and Rubato: screen saver settings in rubato:settings, fonts in Rubato
        pg.goto(base + 'docs/rubato/'); time.sleep(.6)
        pg.evaluate("localStorage.clear();indexedDB.deleteDatabase('rubato');indexedDB.deleteDatabase('tempo')")
        pg.evaluate("localStorage.setItem('rubato:settings',JSON.stringify({texts:['Hello there'],ssSecs:true,ssBg:'#000000',tab:'saver'}))")
        pg.reload(); time.sleep(1)
        check('Rubato has no Screensaver tab', pg.get_by_role('button', name='Screensaver', exact=True).count() == 0)
        check('Rubato opens on Studio even if v0.8.1 was left on Screensaver',
              pg.locator('section.card:visible h2').first.inner_text().startswith(('Presets', 'Fonts')) and pg.locator('section.card:visible h2', has_text='Motion').count() == 1 and pg.locator('#scrub').is_visible())
        pg.set_input_files('#fontfile', POP); time.sleep(1.5)
        pg.evaluate(expand)
        pg.get_by_label('Preset name').fill('Night look')
        pg.get_by_role('button', name='Save', exact=True).click(); time.sleep(.5)

        # 2. Tempo, the first time: fonts and the screen saver settings come over once
        pg.goto(base + 'docs/tempo/'); time.sleep(1.5)
        pg.evaluate(expand); time.sleep(.2)
        check('The first time, Tempo copies the fonts loaded in Rubato', names() == ['Poppins Regular', 'Poppins Bold'], json.dumps(names()))
        check('Tempo keeps its fonts in its own store', pg.evaluate("new Promise(res=>{const q=indexedDB.open('tempo',1);q.onsuccess=()=>{const t=q.result.transaction('fonts').objectStore('fonts').get('styles');t.onsuccess=()=>res((t.result||[]).length)}})") == 2)
        check('Seconds carried over from v0.8.1 settings', pg.get_by_role('switch', name='Seconds').get_attribute('aria-checked') == 'true')
        panel = pg.locator('#panel').inner_text()
        check('Nothing of Rubato in Tempo: no Studio, Saved looks, Rubato text, Rubato motion or image',
              pg.locator('#scrub').count() == 0 and 'Rubato' not in panel and 'Saved looks' not in panel and 'Night look' not in panel and 'Include the image' not in panel)

        # 3. Tempo saves only its own settings
        before = pg.evaluate("localStorage.getItem('rubato:settings')")
        pg.get_by_role('switch', name='Leading zero').click(); time.sleep(.6)
        after = pg.evaluate("localStorage.getItem('rubato:settings')")
        own = json.loads(pg.evaluate("localStorage.getItem('tempo:settings')") or '{}')
        check("Tempo doesn't write Rubato's settings", before == after)
        check('Tempo keeps its settings under tempo:settings', own.get('ssZero') is False and 'texts' not in own and all(k.startswith('ss') or k == 'baseSlot' for k in own), ', '.join(sorted(own))[:120])
        html, cfg = export()
        check("Tempo's export carries nothing of Rubato's settings", 'Hello there' not in html and cfg['base']['texts'] != ['Hello there'])
        check('Export carries baked outlines, not font files', len(cfg['fonts']) == 2 and all('glyphs' in f and 'buf' not in f for f in cfg['fonts']))

        # 4. From then on they're separate: fonts added or removed in one stay out of the other
        pg.goto(base + 'docs/rubato/'); time.sleep(1); pg.evaluate(expand)
        pg.set_input_files('#fontfile', [f'{FONTS}/Poppins-LightItalic.ttf']); time.sleep(1.2)
        pg.locator('#panel textarea').first.fill('Changed in Rubato'); time.sleep(.6)
        pg.goto(base + 'docs/tempo/'); time.sleep(1.5); pg.evaluate(expand)
        check('A font added in Rubato later stays in Rubato', names() == ['Poppins Regular', 'Poppins Bold'], json.dumps(names()))
        pg.get_by_role('button', name='Remove Poppins Bold').click(); time.sleep(.6)
        _, cfg2 = export()
        check("Rubato's later changes don't reach Tempo's export", 'Changed in Rubato' not in json.dumps(cfg2) and len(cfg2['fonts']) == 1)

        # 5. Reload each: its own changes stick, the other's untouched
        pg.reload(); time.sleep(1.2); pg.evaluate(expand)
        check('Tempo remembers its own settings and fonts', pg.get_by_role('switch', name='Leading zero').get_attribute('aria-checked') == 'false' and names() == ['Poppins Regular'])
        pg.goto(base + 'docs/rubato/'); time.sleep(1); pg.evaluate(expand)
        check("Rubato keeps its fonts and text", names() == ['Poppins Regular', 'Poppins Bold', 'Poppins Light Italic'] and pg.locator('#panel textarea').first.input_value() == 'Changed in Rubato', json.dumps(names()))
        check('No page errors', not errs, '; '.join(errs[:3]))
        b.close()
    bad = [r for r in results if not r[0]]
    print(f'\n{len(results) - len(bad)} of {len(results)} checks passed.')
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()

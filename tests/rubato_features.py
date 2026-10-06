"""Checks for what's new in Rubato 1.0: blocks and lockups, physics, kerning on
the preview, Jitter / Assemble / Scramble, the new controls, the Presets front
door, and exports and saving with all of it.

    python3 tests/rubato_features.py

Same requirements as parity.py.
"""
import hashlib, json, os, sys, time
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start
from parity import POP, OPENTYPE, SEED

results = []
def check(name, ok, detail=''):
    results.append((ok, name, detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f' – {detail}' if detail else ''))

CARDS = ['start', 'font', 'text', 'layout', 'motion', 'variants', 'physics', 'colour', 'export']
LOCKUP = {'texts': ['SUMMER SOCIAL'], 'mode': 'none', 'align': 'left',
          'blocks': [{'text': '', 'font': '', 'size': 1, 'dest': 'auto', 'kern': {}},
                     {'text': 'Friday 8 August', 'font': '', 'size': .5, 'dest': 'auto', 'kern': {}},
                     {'text': '7pm till late', 'font': '', 'size': .4, 'dest': 'auto', 'kern': {}}]}

def main():
    base = start(); ot = open(OPENTYPE).read()
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1440, 'height': 2400}, accept_downloads=True); ctx.add_init_script(SEED)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/opentype.min.js', lambda r: r.fulfill(body=ot, content_type='application/javascript'))
        for u in ['https://fonts.googleapis.com/**', 'https://use.typekit.net/**']:
            pg.route(u, lambda r: r.abort())

        def fresh(settings=None, more=None):
            pg.goto(base + 'docs/rubato/')
            pg.evaluate("([s,c,m])=>{localStorage.clear();if(s)localStorage.setItem('rubato:settings',JSON.stringify(s));localStorage.setItem('rubato:collapsed',JSON.stringify(c));localStorage.setItem('rubato:more',JSON.stringify(m||{}))}",
                        [settings, {k: False for k in CARDS}, more])
            pg.goto(base + 'docs/rubato/'); time.sleep(.5)
            pg.set_input_files('#fontfile', POP); time.sleep(1)
            if pg.inner_text('#play') == 'Pause': pg.click('#play')
        def S():
            time.sleep(.4); return pg.evaluate("JSON.parse(localStorage.getItem('rubato:settings'))")
        def at(ph):
            pg.evaluate("v=>{const s=document.querySelector('#scrub');s.value=Math.round(v*1000);s.dispatchEvent(new Event('input'))}", ph); time.sleep(.12)
            return hashlib.sha1(pg.evaluate("document.querySelector('#cv').toDataURL()").encode()).hexdigest()
        def box(loc):
            loc.scroll_into_view_if_needed(); return loc.bounding_box()
        def download(name):
            with pg.expect_download(timeout=90000) as dl: pg.get_by_role('button', name=name, exact=True).click()
            return dl.value.suggested_filename, open(dl.value.path(), 'rb').read()

        # 1. panel and presets
        fresh()
        titles = [t.strip() for t in pg.locator('section.card h2 .card-toggle span:first-child').all_inner_texts()]
        check('Panel order', titles == ['Presets', 'Fonts', 'Text', 'Layout', 'Motion', 'Variants', 'Physics', 'Colour', 'Export'], ' / '.join(titles))
        time.sleep(.6)
        drawn = pg.evaluate("[...document.querySelectorAll('.thumb canvas')].map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]<128)n++;return n>50})")
        check('Twelve live preset tiles, all drawing', len(drawn) == 12 and all(drawn), f'{sum(drawn)} of {len(drawn)}')
        pg.get_by_role('button', name='Use the Jitter preset').click()
        check('A preset tile applies its look', S()['mode'] == 'jitter')

        # 2. blocks and lockups
        fresh({'texts': ['SUMMER SOCIAL'], 'mode': 'none'})
        pg.get_by_role('button', name='+ Add block').click(); pg.keyboard.type('Friday 8 August')
        st = S()
        check('Add block', len(st['blocks']) == 2 and st['blocks'][1]['text'] == 'Friday 8 August')
        pg.get_by_label('Block 2 font').select_option(label='Poppins Bold'); st = S()
        check('A block can have its own font', st['blocks'][1]['font'] != '')
        check('Sequence and Repeat step aside for blocks', pg.get_by_role('switch', name='Sequence of texts').count() == 0 or not pg.get_by_role('switch', name='Sequence of texts').is_visible())
        name, svg = download('SVG frame')
        check('Lockup exports both blocks to SVG', svg.decode().count('<path') == len('SUMMERSOCIAL') + len('Friday8August'), f"{svg.decode().count('<path')} paths")

        # 3. physics
        fresh(LOCKUP)
        rest = at(0); pg.get_by_role('switch', name='Pull apart').click(); pg.mouse.move(1300, 50); time.sleep(1.8)  # guides fade after a change
        check('Physics leaves the lockup untouched at rest', at(0) == rest)
        check('Physics pulls blocks apart mid-loop', at(.35) != rest)
        apart = at(.4); pg.evaluate("()=>{const i=document.querySelector('#c_phSpace');i.value=6;i.dispatchEvent(new Event('input'))}")
        check('Personal space changes the layout when blocks would meet', at(.4) != apart)
        pg.locator('section.card:has(.dests)').hover(); time.sleep(.3)
        g1 = at(.4); pg.mouse.move(1300, 50); time.sleep(1.9)
        check('Guides show while hovering the Physics card', g1 != at(.4))
        pg.get_by_label('Block 2 destination').get_by_role('button', name='bottom right').click()
        check('Choose where a block goes', S()['blocks'][1]['dest'] == 'br')

        # 4. kerning on the preview
        fresh({'texts': ['WAVE'], 'mode': 'fluid'})
        bx = pg.locator('#cv').bounding_box(); y = bx['y'] + bx['height'] / 2; x = None
        for i in range(400):
            xx = bx['x'] + bx['width'] * (.05 + .9 * i / 400); pg.mouse.move(xx, y)
            if pg.evaluate("document.querySelector('#cv').style.cursor") == 'text': x = xx; break
        check('Hovering between letters shows a kerning caret', x is not None)
        before = at(.25); pg.mouse.click(x, y); time.sleep(.2)
        for k in ['ArrowLeft', 'ArrowLeft', 'Shift+ArrowLeft']: pg.keyboard.press(k)
        kern = S()['blocks'][0]['kern']
        check('Arrows kern the pair, Shift for bigger steps', kern == {'WA': -70}, json.dumps(kern))
        check('Kerning shows in the Text card', 'WA' in pg.inner_text('.kern-list'))
        pg.get_by_role('button', name='Tighten').click(); pg.get_by_role('button', name='Loosen').click(modifiers=['Shift'])
        check('The stage note kerns by click too', S()['blocks'][0]['kern'] == {'WA': -30})
        pg.get_by_role('button', name='Finish kerning').click(); time.sleep(.2)
        check('Kerning changes the drawing', at(.25) != before)
        pg.keyboard.press('Control+z'); time.sleep(.4)
        check('Undo takes the kerning back', S()['blocks'][0]['kern'] == {})

        # 5. the three tricks: they move, and every loop joins up
        for label, st in [('Jitter', {'mode': 'jitter'}), ('Assemble – scatter', {'mode': 'assemble', 'aExit': 'scatter'}),
                          ('Assemble – go back', {'mode': 'assemble', 'aExit': 'reverse', 'aFeel': 'elastic'}),
                          ('Scramble', {'mode': 'none', 'vMode': 'scramble'}), ('Physics', dict(LOCKUP, phOn=True, phSpace=4))]:
            fresh(dict({'texts': ['Lazaar']}, **st))
            frames = [at(ph) for ph in (0, .2, .45, .7)]
            check(f'{label} animates', len(set(frames)) >= 3)
            check(f'{label} loops seamlessly', at(0) == at(1))

        # 6. the new controls
        fresh({'mode': 'fluid', 'axOn': True}, {'motion': True})
        pg.set_input_files('#fontfile', [POP[0].replace('Poppins-Regular', 'Lora-Variable')]); time.sleep(1)
        d = box(pg.locator('.dial[aria-label="Tilt"][aria-valuemax="45"]'))
        pg.mouse.move(d['x'] + 24, d['y'] + 24); pg.mouse.down(); pg.mouse.move(d['x'] + 24, d['y'] - 40, steps=5); pg.mouse.up()
        check('Dial drags', S()['fRot'] > 10)
        v0 = S()['fRot']; pg.locator('.dial[aria-label="Tilt"][aria-valuemax="45"]').press('Shift+ArrowDown'); check('Dial keys, Shift for bigger steps', abs(S()['fRot'] - (v0 - 5)) < 1e-6)
        pg.locator('.dial-row:visible label', has_text='Tilt').dblclick(); check('Double-click resets', S()['fRot'] == 0)
        pg.get_by_role('button', name='Cycles per loop up').first.click(); check('Stepper', S()['fCycles'] == 2)
        pd = box(pg.locator('.pad').first); pg.mouse.click(pd['x'] + pd['width'] * .9, pd['y'] + pd['height'] * .1)
        st = S(); check('Path pad sets rise and drift together', st['fX'] > 20 and st['fY'] > 40, f"drift {st['fX']}, rise {st['fY']}")
        pg.get_by_role('button', name='Set text in Lora Regular').click(); time.sleep(.3)
        tr = box(pg.locator('.pair-track')); pg.mouse.move(tr['x'] + tr['width'] - 15, tr['y'] + 17); pg.mouse.down(); pg.mouse.move(tr['x'] + tr['width'] / 2, tr['y'] + 17, steps=4); pg.mouse.up()
        st = S(); check('Range pair drags one end', st['axFrom'] == 0 and .4 < st['axTo'] < .6, f"{st['axFrom']} → {st['axTo']}")
        pg.get_by_role('button', name='Transitional', exact=True).click()
        bar = box(pg.locator('.lbar:visible').first); s0 = S(); x0 = bar['x'] + bar['width'] * s0['tIn']
        pg.mouse.move(x0, bar['y'] + 17); pg.mouse.down(); pg.mouse.move(x0 + bar['width'] * .1, bar['y'] + 17, steps=4); pg.mouse.up(); st = S()
        check('Loop bar moves one join, trading In for Hold', st['tIn'] > s0['tIn'] and st['tHold'] < s0['tHold'] and st['tOut'] == s0['tOut'])
        n0 = pg.locator('.more-body:visible').count(); pg.locator('section.card:has(#c_dur) .more-toggle').click(); time.sleep(.2)
        check('More folds away', pg.locator('.more-body:visible').count() == n0 - 1 and S() is not None and json.loads(pg.evaluate("localStorage.getItem('rubato:more')")).get('motion') is False)

        # 7. randomise everything, many times
        pg.evaluate("localStorage.setItem('rubato:rand',JSON.stringify({level:'full',groups:{motion:true,variants:true,sequence:true,repeat:true,physics:true,layout:true,colour:true}}))")
        pg.reload(); time.sleep(1); worst = 0
        for i in range(25):
            pg.click('#rand'); time.sleep(.05)
            if i % 5 == 4:
                st = S(); worst = max([worst] + [sum(st[k] for k in ks) for ks in (['tIn', 'tHold', 'tOut'], ['aIn', 'aHold', 'aOut'], ['scIn', 'scHold', 'scOut'], ['phIn', 'phHold', 'phOut'])])
        check('Randomise keeps shared timings within the loop', worst <= 1.0001, f'largest {worst:.2f}')

        # 8. exports, settings file, saved looks
        fresh(dict(LOCKUP, mode='jitter', phOn=True, vMode='scramble', gScale=.25, gFps=12.5, dur=1.5))
        at(.4); outs = {}
        for n in ('SVG frame', 'PNG frame', 'Make GIF'):
            fn, data = download(n); outs[n] = (fn, len(data))
        check('SVG, PNG and GIF export with blocks and physics', all(v[1] > 1000 for v in outs.values()), ', '.join(v[0] for v in outs.values()))
        check('Exports are named after the trick', outs['PNG frame'][0].endswith('-jitter-frame.png'))
        pg.get_by_label('Preset name').fill('Party'); pg.get_by_role('button', name='Save', exact=True).click()
        fn, data = download('Save settings file'); path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'features-settings.json')
        os.makedirs(os.path.dirname(path), exist_ok=True); open(path, 'wb').write(data)
        pg.evaluate("localStorage.setItem('rubato:settings','{}')"); pg.reload(); time.sleep(1)
        pg.set_input_files('#jsonfile', path); time.sleep(.5); st = S()
        check('Settings file keeps blocks', len(st['blocks']) == 3 and st['blocks'][2]['text'] == '7pm till late')
        pg.get_by_role('button', name='Remove block 3').click(); time.sleep(.3)
        pg.locator('.preset-item', has_text='Party').get_by_role('button', name='Load').click(); time.sleep(.4)
        check('A saved look brings blocks back', len(S()['blocks']) == 3)

        # 9. the archived 0.9 keeps its own settings
        pg.goto(base + 'docs/rubato/0.9/'); time.sleep(.8)
        pg.evaluate("document.querySelectorAll('section.card.collapsed .card-toggle').forEach(b=>b.click())")
        pg.get_by_role('button', name='Snappy', exact=True).click(); time.sleep(.5)
        old = pg.evaluate("JSON.parse(localStorage.getItem('rubato-0.9:settings')||'{}')"); new = pg.evaluate("JSON.parse(localStorage.getItem('rubato:settings'))")
        check('0.9 saves its own settings and leaves 1.0’s alone', old.get('mode') == 'snappy' and new.get('mode') == 'jitter' and len(new['blocks']) == 3)

        check('No page errors', not errs, '; '.join(errs[:3]))
        b.close()
    n = sum(1 for r in results if r[0])
    print(f'\n{n} of {len(results)} checks passed.')
    sys.exit(0 if n == len(results) else 1)

if __name__ == '__main__':
    main()

"""Segue's interface, element by element (the round 4 kit, Segue 0.5).

    python3 tests/segue_ui_check.py

Drives every control a person can reach, in every kind of motion, the way a person would –
mouse, keyboard and typing – and checks that each one does what it says, shows that it has
moved, can be put back, and undoes. Then the Export bar (every format, Stop, the progress and
the file it saves), Presets, media, pictures, fonts, Preview, the panel's width, light and dark,
and a phone. Needs Playwright's Chromium and Pillow; the fixtures are made in tests/out/segue-ui/.
segue_check.py covers what Segue draws and exports; this covers how it's worked.
"""
import json, os, sys, time
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out', 'segue-ui')
os.makedirs(OUT, exist_ok=True)
results = []
def check(name, ok, detail=''):
    results.append((bool(ok), name, detail))
    print(('PASS ' if ok else 'FAIL ') + name + (f' – {detail}' if detail else ''), flush=True)

from PIL import Image, ImageDraw
IMGS = []
for i, (a, b) in enumerate([('#EA2631', '#F5F5F3'), ('#2F5DA8', '#F4F1EA'), ('#3C6E5A', '#E9EEE4'), ('#E2552D', '#111111'), ('#111111', '#F4FD5F')]):
    p = os.path.join(OUT, f'img{i+1}.png'); im = Image.new('RGB', (1200, 800), b); d = ImageDraw.Draw(im)
    d.rectangle([90, 90, 700, 480], fill=a); d.ellipse([760, 220, 1100, 560], fill=a); im.save(p); IMGS.append(p)
FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
PRESETS_FILE = os.path.join(OUT, 'presets.json')
json.dump({'segue': 1, 'presets': [{'name': 'Loaded one', 's': {'layout': 'grid', 'gap': 20}}]}, open(PRESETS_FILE, 'w'))

base = start() + 'docs/segue/'
errs = []
MOD = 'Meta' if sys.platform == 'darwin' else 'Control'

# ---------------- page helpers ----------------
LIST = """()=>{const P=document.querySelector('#panel');let n=0;const out=[];document.querySelectorAll('[data-tid]').forEach(e=>delete e.dataset.tid);
  for(const c of segue.ui.controls){const d=c.d;if(!d||!c.w||!P.contains(c.w)||!c.w.isConnected)continue;if(!(d.k||d.keys)||d.head)continue;
    if(!c.w.offsetParent||!c.w.getClientRects().length)continue;
    const w=c.w;w.dataset.tid=++n;let t=null;
    if(w.querySelector(':scope>.rng-box,:scope>.ctl-head>input[type=range]')||w.querySelector(':scope input[type=range]'))t='rng';
    else if(w.classList.contains('stp'))t='stp';
    else if(w.querySelector(':scope>.seg'))t=w.classList.contains('as-menu')?'menu':'seg';
    else if(w.classList.contains('toggle-row'))t='tog';
    else if(w.classList.contains('colour-row'))t='col';
    else if(w.classList.contains('sel'))t='sel';
    else if(w.classList.contains('nums'))t='nums';
    else if(w.classList.contains('txt'))t='txt';
    const inp=w.querySelector('input[type=range]');
    let opts=null;try{opts=(d.opts||(d.optsFn&&d.optsFn())||null);}catch(e){}
    out.push({tid:n,t,k:d.k,keys:d.keys||null,label:d.label||'',min:inp?+inp.min:d.min,max:inp?+inp.max:d.max,step:inp?+inp.step:d.step,
      opts:opts?opts.map(o=>o[0]):null,pick:!!d.pick,val:!!d.val,card:(w.closest('section.card')||{}).dataset?.id||''});}
  return out;}"""
VAL = "([k])=>segue.S[k]"
def S(pg, k): return pg.evaluate(VAL, [k])
def base_of(pg, k): return pg.evaluate("k=>segue.ui.base(k)", k)
def close(a, b, tol=1e-6):
    try: return abs(float(a) - float(b)) <= tol * max(1, abs(float(a)), abs(float(b)))
    except Exception: return a == b
def open_all(pg):
    pg.evaluate("""()=>{const t=document.querySelector('.tier');if(t&&!t.classList.contains('open'))t.querySelector('.tier-head').click();
      document.querySelectorAll('#panel section.card.collapsed>h2 .card-toggle').forEach(b=>b.click());
      document.querySelectorAll('#panel .fold-head[aria-expanded=false]').forEach(b=>b.click());}"""); time.sleep(.5)
def loc(pg, tid, sel=''): return pg.locator(f'[data-tid="{tid}"] {sel}'.strip()).first
def into_view(pg, tid): pg.evaluate("t=>document.querySelector(`[data-tid='${t}']`).scrollIntoView({block:'center'})", tid); time.sleep(.05)

def pick_kind(pg, name):
    pg.evaluate("""n=>{const c=document.querySelector('#panel section.card[data-id=motion]');if(c.classList.contains('collapsed'))c.querySelector('.card-toggle').click();}""", name)
    time.sleep(.3); pg.locator('.kinds .kind', has_text=name).click(); time.sleep(.3)

# ---------------- each kind of control ----------------
def try_slider(pg, c, tally):
    k, tid = c['k'], c['tid']; mn, mx, st = c['min'], c['max'], c['step'] or 1; span = mx - mn
    start_v = S(pg, k); b = base_of(pg, k); into_view(pg, tid)
    box = loc(pg, tid, '.rng-box'); bb = box.bounding_box()
    ok = {}
    # the handle never hides
    ok['handle'] = pg.evaluate("t=>{const h=document.querySelector(`[data-tid='${t}'] .rng-tick`);const s=getComputedStyle(h);return s.opacity==='1'&&h.offsetWidth===3;}", tid)
    # type a value: exact, kept to the range, units optional
    target = round(mn + span * 0.37, 4)
    loc(pg, tid, '.rng-box .val').click(); time.sleep(.05)
    pg.keyboard.press(f'{MOD}+A'); pg.keyboard.type(f'{target}'); pg.keyboard.press('Enter'); time.sleep(.12)
    ok['type'] = close(S(pg, k), target, 1e-4)
    loc(pg, tid, '.rng-box .val').click(); time.sleep(.05); pg.keyboard.press(f'{MOD}+A'); pg.keyboard.type(str(mx + span)); pg.keyboard.press('Enter'); time.sleep(.1)
    ok['clamp'] = close(S(pg, k), mx)
    loc(pg, tid, '.rng-box .val').click(); time.sleep(.05); pg.keyboard.press(f'{MOD}+A'); pg.keyboard.type('abc'); pg.keyboard.press('Enter'); time.sleep(.1)
    ok['nonsense ignored'] = close(S(pg, k), mx)
    # moved: the dot shows; click it and it's back where it started
    if not close(mx, b):
        ok['dot shows'] = pg.evaluate("t=>document.querySelector(`[data-tid='${t}']`).classList.contains('chg')", tid)
        pg.locator(f'[data-tid="{tid}"] > .cx').click(); time.sleep(.15)
        ok['dot puts it back'] = close(S(pg, k), b) and not pg.evaluate("t=>document.querySelector(`[data-tid='${t}']`).classList.contains('chg')", tid)
    else:
        pg.evaluate("([k,v])=>segue.set(k,v)", [k, b]); time.sleep(.05)
    # click to jump: a press that doesn't move goes to that point
    box.scroll_into_view_if_needed(); bb = box.bounding_box()
    # (0.6, clear of the value at the right end – a click on the value is for typing)
    pg.mouse.click(bb['x'] + 5 + (bb['width'] - 10) * 0.6, bb['y'] + bb['height'] / 2); time.sleep(.15)
    want = mn + span * 0.6; ok['click jumps'] = abs(S(pg, k) - want) <= st * 1.01 + span * 0.02
    # drag from where you press: it moves by how far you go; Shift is finer
    v0 = S(pg, k); x = bb['x'] + bb['width'] * 0.3; y = bb['y'] + bb['height'] / 2
    pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x - 50, y, steps=6); pg.mouse.up(); time.sleep(.1)
    v1 = S(pg, k); dv = v0 - v1
    ok['drag moves by the distance'] = (v1 < v0 or close(v0, mn)) and abs(dv - 50 / (bb['width'] - 10) * span) <= span * 0.05 + st * 1.01
    pg.keyboard.down('Shift'); pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 60, y, steps=6); pg.mouse.up(); pg.keyboard.up('Shift'); time.sleep(.1)
    v2 = S(pg, k); fine = v2 - v1
    ok['Shift is finer'] = fine >= 0 and fine <= 60 / (bb['width'] - 10) * span * 0.1 + st * 1.01 + 1e-9
    # keys: arrows step, Shift + arrows step ten
    pg.evaluate("([k,v])=>segue.set(k,v)", [k, b]); time.sleep(.05)
    pg.evaluate("t=>document.querySelector(`[data-tid='${t}'] input[type=range]`).focus()", tid)
    pg.keyboard.press('ArrowRight'); time.sleep(.05); v3 = S(pg, k)
    ok['arrow steps'] = close(v3, min(mx, b + st), 1e-4) or close(b, mx)
    pg.keyboard.press('Shift+ArrowLeft'); time.sleep(.05); v4 = S(pg, k)
    ok['Shift+arrow steps ten'] = close(v4, max(mn, round(v3 - 10 * st, 6)), 1e-4)
    # double-click puts it back
    pg.mouse.dblclick(bb['x'] + bb['width'] * 0.5, bb['y'] + bb['height'] / 2); time.sleep(.15)
    ok['double-click puts it back'] = close(S(pg, k), b)
    pg.evaluate("([k,v])=>segue.set(k,v)", [k, start_v]); time.sleep(.05)
    for n, v in ok.items(): tally.setdefault(n, []).append((c['label'], v))

def try_stepper(pg, c, tally):
    k, tid = c['k'], c['tid']; start_v = S(pg, k); b = base_of(pg, k); into_view(pg, tid); ok = {}
    pg.evaluate("([k,v])=>segue.set(k,v)", [k, c['min']]); time.sleep(.05)
    ok['− off at the least'] = pg.evaluate("t=>document.querySelector(`[data-tid='${t}'] .stp-g button`).disabled", tid)
    pg.locator(f'[data-tid="{tid}"] .stp-g button').last.click(); time.sleep(.1)
    ok['+ adds one'] = close(S(pg, k), c['min'] + 1)
    pg.locator(f'[data-tid="{tid}"] .stp-g button').first.click(); time.sleep(.1)
    ok['− takes one'] = close(S(pg, k), c['min'])
    pg.evaluate("([k,v])=>segue.set(k,v)", [k, c['max']]); time.sleep(.05)
    ok['+ off at the most'] = pg.evaluate("t=>[...document.querySelectorAll(`[data-tid='${t}'] .stp-g button`)].pop().disabled", tid)
    loc(pg, tid, '.stp-g .val').click(); time.sleep(.05); pg.keyboard.press(f'{MOD}+A'); pg.keyboard.type(str(c['min'] + 1)); pg.keyboard.press('Enter'); time.sleep(.1)
    ok['type a count'] = close(S(pg, k), c['min'] + 1)
    if not close(S(pg, k), b):
        pg.locator(f'[data-tid="{tid}"] > .cx').click(); time.sleep(.1); ok['dot puts it back'] = close(S(pg, k), b)
    pg.evaluate("([k,v])=>segue.set(k,v)", [k, start_v]); time.sleep(.05)
    for n, v in ok.items(): tally.setdefault(n, []).append((c['label'], v))

def cur_choice(pg, c):
    return pg.evaluate("t=>{const c=segue.ui.controls.find(c=>c.w&&c.w.dataset.tid==t);return c.d.val?c.d.val(segue.S):segue.S[c.d.k];}", str(c['tid']))
def try_seg(pg, c, tally):
    tid = c['tid']; start_v = cur_choice(pg, c); into_view(pg, tid); ok = {'pick': True, 'highlight follows': True}
    n = pg.locator(f'[data-tid="{tid}"] .seg > button').count()
    for i in range(n):
        btn = pg.locator(f'[data-tid="{tid}"] .seg > button').nth(i)
        if not btn.is_visible(): continue
        btn.click(); time.sleep(.5)
        if not pg.locator(f'[data-tid="{tid}"]').is_visible(): break
        want = c['opts'][i] if c['opts'] else None
        got = cur_choice(pg, c)
        if want is not None and got != want: ok['pick'] = False
        hl = pg.evaluate("t=>{const g=document.querySelector(`[data-tid='${t}'] .seg`),h=g.querySelector(':scope>.hl'),b=[...g.querySelectorAll(':scope>button')].find(b=>b.getAttribute('aria-pressed')==='true');return h&&b?[parseFloat(h.style.left),b.offsetLeft,parseFloat(h.style.width),b.offsetWidth]:null}", tid)
        if not hl or abs(hl[0] - hl[1]) > 1 or abs(hl[2] - hl[3]) > 1: ok['highlight follows'] = False
    restore_choice(pg, c, start_v)
    for k2, v in ok.items(): tally.setdefault(k2, []).append((c['label'], v))
def try_menu(pg, c, tally):
    tid = c['tid']; start_v = cur_choice(pg, c); into_view(pg, tid); ok = {'menu picks': True}
    ok['shown as a menu, the row hidden'] = pg.evaluate("t=>{const w=document.querySelector(`[data-tid='${t}']`);return getComputedStyle(w.querySelector('.seg-menu')).display!=='none'&&getComputedStyle(w.querySelector('.seg')).display==='none';}", tid)
    n = pg.evaluate("t=>document.querySelector(`[data-tid='${t}'] .seg-menu`).options.length", tid)
    for i in range(n):
        if not pg.locator(f'[data-tid="{tid}"] .seg-menu').is_visible(): break
        pg.locator(f'[data-tid="{tid}"] .seg-menu').select_option(index=i); time.sleep(.12)
        if c['opts'] and cur_choice(pg, c) != c['opts'][i]: ok['menu picks'] = False
    restore_choice(pg, c, start_v)
    for k2, v in ok.items(): tally.setdefault(k2, []).append((c['label'], v))
def restore_choice(pg, c, v):
    pg.evaluate("([t,v])=>{const c=segue.ui.controls.find(c=>c.w&&c.w.dataset.tid==t);if(c.d.pick)c.d.pick(v);else segue.set(c.d.k,v);}", [str(c['tid']), v]); time.sleep(.1)

def try_toggle(pg, c, tally):
    k, tid = c['k'], c['tid']; start_v = S(pg, k); b = base_of(pg, k); into_view(pg, tid); ok = {}
    loc(pg, tid, '.toggle').click(); time.sleep(.12)
    ok['toggle flips'] = S(pg, k) == (not start_v)
    if pg.locator(f'[data-tid="{tid}"]').is_visible():
        if S(pg, k) != b:
            ok['toggle dot'] = pg.evaluate("t=>document.querySelector(`[data-tid='${t}']`).classList.contains('chg')", tid)
            pg.locator(f'[data-tid="{tid}"] > .cx').click(); time.sleep(.12); ok['toggle put back'] = S(pg, k) == b
    pg.evaluate("([k,v])=>segue.set(k,v)", [k, start_v]); time.sleep(.05)
    for n, v in ok.items(): tally.setdefault(n, []).append((c['label'], v))

def try_colour(pg, c, tally):
    k, tid = c['k'], c['tid']; start_v = S(pg, k); b = base_of(pg, k); into_view(pg, tid); ok = {}
    f = loc(pg, tid, 'input.hexin'); f.click(); f.fill('2f5da8'); f.press('Enter'); time.sleep(.12)
    ok['hex typed'] = S(pg, k) == '#2F5DA8'
    f.fill('#abc'); f.press('Enter'); time.sleep(.1); ok['short hex'] = S(pg, k) == '#AABBCC'
    f.fill('nope'); f.press('Enter'); time.sleep(.1); ok['bad hex ignored'] = S(pg, k) == '#AABBCC' and f.input_value().upper() == '#AABBCC'
    if b != '#AABBCC':
        pg.locator(f'[data-tid="{tid}"] > .cx').click(); time.sleep(.12); ok['colour put back'] = S(pg, k) == b
    pg.evaluate("([k,v])=>segue.set(k,v)", [k, start_v]); time.sleep(.05)
    for n, v in ok.items(): tally.setdefault(n, []).append((c['label'], v))

def try_select(pg, c, tally):
    k, tid = c['k'], c['tid']; start_v = S(pg, k); into_view(pg, tid); ok = {'select picks': True}
    vals = pg.evaluate("t=>[...document.querySelector(`[data-tid='${t}'] select`).options].map(o=>o.value)", tid)
    for v in vals[:6]:
        loc(pg, tid, 'select').select_option(v); time.sleep(.1)
        if str(S(pg, k)) != v: ok['select picks'] = False
    pg.evaluate("([k,v])=>segue.set(k,v)", [k, start_v]); time.sleep(.05)
    for n, v in ok.items(): tally.setdefault(n, []).append((c['label'], v))

def try_text(pg, c, tally):
    k, tid = c['k'], c['tid']; start_v = S(pg, k); into_view(pg, tid); ok = {}
    f = loc(pg, tid, 'input,textarea'); f.click(); f.fill('Typed 1'); f.press('Tab'); time.sleep(.12)
    ok['text typed'] = S(pg, k) == 'Typed 1'
    pg.evaluate("([k,v])=>segue.set(k,v)", [k, start_v]); time.sleep(.05)
    for n, v in ok.items(): tally.setdefault(n, []).append((c['label'], v))

def try_nums(pg, c, tally):
    tid = c['tid']; into_view(pg, tid); ok = {}
    ins = pg.locator(f'[data-tid="{tid}"] input[type=number]')
    ins.nth(0).fill('640'); ins.nth(0).press('Enter'); ins.nth(1).fill('99999'); ins.nth(1).press('Enter'); time.sleep(.15)
    ok['number pair'] = S(pg, c['keys'][0]) == 640 and S(pg, c['keys'][1]) == c['max']
    for n, v in ok.items(): tally.setdefault(n, []).append((c['label'], v))

TRY = {'rng': try_slider, 'stp': try_stepper, 'seg': try_seg, 'menu': try_menu, 'tog': try_toggle, 'col': try_colour, 'sel': try_select, 'txt': try_text, 'nums': try_nums}

n_tried = [0]
def sweep(pg, setup, label, tally, seen):
    pg.evaluate(setup); time.sleep(.3); open_all(pg)
    for c in pg.evaluate(LIST):
        fn = TRY.get(c['t'])
        if not fn: tally.setdefault('every control is one of the kit’s', []).append((c['label'], False)); continue
        # the list can change as things are tried: only try what's still there
        if not pg.evaluate("t=>{const e=document.querySelector(`[data-tid='${t}']`);return !!(e&&e.offsetParent);}", c['tid']): continue
        key = (c['t'], c['k'] or ','.join(c['keys'] or []))
        if key in seen: continue   # each control is tried once, in the first set-up that shows it
        t0 = time.time()
        try: fn(pg, c, tally)
        except Exception as e: tally.setdefault('no control throws', []).append((f"{label}/{c['label']}: {str(e)[:80]}", False))
        seen.add(key); n_tried[0] += 1
        if time.time() - t0 > 8: print(f'  slow: {label}/{c["label"]} {time.time() - t0:.1f} s', flush=True)
    print(f'  {label}: {n_tried[0]} tried so far', flush=True)
    alive = pg.evaluate("(()=>{const L=segue.plan().L;return Number.isFinite(L)&&L>0;})()")
    tally.setdefault('the loop still plays after every control in every kind', []).append((label, alive))

def summarise(tally, name, keys=None):
    for k in (keys or sorted(tally)):
        if k not in tally: continue
        bad = [l for l, v in tally[k] if not v]
        check(f'{name}: {k}', not bad, f'{len(tally[k]) - len(bad)} of {len(tally[k])}' + (f' – not: {", ".join(map(str, bad[:6]))}' if bad else ''))

def tk(route):
    h = dict(route.request.headers); h['referer'] = 'https://steviewaring-arch.github.io/'; route.continue_(headers=h)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.set_default_timeout(4000)
    pg.route('https://use.typekit.net/**', tk); pg.route('https://p.typekit.net/**', lambda r: r.abort())
    pg.goto(base); time.sleep(1.5)

    # ---- the kit: corners, weights, no shadows ----
    look = pg.evaluate("""(()=>{const r=s=>{const e=document.querySelector(s);return e?getComputedStyle(e).borderTopLeftRadius:null};const w=s=>{const e=document.querySelector(s);return e?getComputedStyle(e).fontWeight:null};
      const shadows=[...document.querySelectorAll('.panel,.island,.pcap,.card,.pill,.seg,.rng-box,.kind,.tools,.stage-foot span')].map(e=>getComputedStyle(e).boxShadow).filter(s=>s&&s!=='none'&&!/inset|0px 0px 0px/.test(s));
      return {panel:r('.panel'),card:r('#panel section.card'),island:r('.island'),pcap:r('.pcap'),rng:r('.rng-box'),seg:r('.seg'),hl:r('.seg>.hl'),pill:r('.btn-row>.pill:not(.small)'),chip:r('.pill.small:not(.icon)'),sel:r('select'),kind:r('.kind'),chipTop:r('.stage-foot span'),
        title:w('.card-toggle'),body:w('.ctl-head label'),val:w('.rng-box .val'),chosen:w('.seg>.pill[aria-pressed=true]'),shadows}})()""")
    check('corners step down with the levels: surfaces 12 px, cards 10, controls 8, inside a control 6, chips 6 – nothing a lozenge',
          [look['panel'], look['island'], look['pcap']] == ['12px'] * 3 and look['card'] == '10px' and [look['rng'], look['seg'], look['pill'], look['sel'], look['kind'], look['chipTop']] == ['8px'] * 6 and look['hl'] == '6px' and look['chip'] == '6px', json.dumps(look))
    check('weights: section titles Bold, labels and the chosen option Medium, values Regular', look['title'] == '700' and look['chosen'] == '500' and look['body'] == '500' and look['val'] == '400', f"{look['title']} {look['chosen']} {look['body']} {look['val']}")
    check('no drop shadows – hairlines only', not look['shadows'], '; '.join(look['shadows'][:3]))
    nums = pg.evaluate("[...document.querySelectorAll('#panel section.card:not([hidden])>h2 .num')].map(e=>e.textContent)")
    titles = pg.evaluate("[...document.querySelectorAll('#panel section.card>h2 .card-toggle>span:first-child')].map(e=>e.textContent)")
    shown_nums = pg.evaluate("[...document.querySelectorAll('#panel section.card>h2 .num')].filter(e=>e.offsetWidth).length")
    check('sections: titles as they were (Captions, Overlay and Position under Additionals), no numbers shown', shown_nums == 0 and titles == ['Media', 'Canvas', 'Motion', 'Shapes', 'Captions', 'Overlay', 'Position'], f'{shown_nums} numbers showing, {titles}')

    # ---- sections open and shut, smoothly, and stay as left ----
    sec = pg.locator('#panel section.card[data-id=shapes]')
    if 'collapsed' not in (sec.get_attribute('class') or ''): sec.locator('.card-toggle').click(); time.sleep(.6)
    shut = pg.evaluate("document.querySelector('#panel section.card[data-id=shapes] .card-anim').hidden")
    sec.locator('.card-toggle').click(); time.sleep(.05)
    mid = pg.evaluate("(()=>{const a=document.querySelector('#panel section.card[data-id=shapes] .card-anim');return [a.hidden,a.offsetHeight,a.scrollHeight]})()")
    time.sleep(.5)
    end = pg.evaluate("(()=>{const a=document.querySelector('#panel section.card[data-id=shapes] .card-anim');return [a.hidden,a.offsetHeight]})()")
    check('a section opens with the Smooth curve and shuts out of the way', shut and not mid[0] and mid[1] < end[1] and end[1] > 100, f'shut hidden {shut}, part way {mid[1]} px, open {end[1]} px')

    # ---- media in ----
    pg.set_input_files('#mediafile', IMGS); time.sleep(2)
    check('five images in, as soft rows with a grip', pg.locator('.media-list .slot').count() == 5 and pg.locator('.media-list .slot .grip').count() == 5)

    # ---- every control, in every kind ----
    tally = {}; seen = set()
    KINDS = [('Slides full bleed', "segue.set('layout','one');segue.set('oneFit','bleed');segue.set('kb','in')"),
             ('Slides as it is', "segue.set('layout','one');segue.set('oneFit','own');segue.set('oneMove','slide')"),
             ('Slides in a shape', "segue.set('layout','one');segue.set('oneFit','shape');segue.set('after','pull')"),
             ('Line', "segue.set('layout','column');segue.set('trackMove','step');segue.set('after','pull')"),
             ('Line drifting', "segue.set('layout','row');segue.set('trackMove','drift')"),
             ('Grid', "segue.set('layout','grid');segue.set('trackMove','step')"),
             ('Columns', "segue.set('layout','columns');segue.set('trackMove','drift')"),
             ('Rows, each its own', "segue.set('layout','rows');segue.set('trackMove','step');segue.set('colDir','own');segue.set('colSpeed','own')"),
             ('Frames', "segue.set('layout','frames');segue.set('fCols',2)"),
             ('Float', "segue.set('layout','float');segue.set('trackMove','step')"),
             ('Wall stepping', "segue.set('layout','wall');segue.set('trackMove','step');segue.set('wPath','stairs');segue.set('wOff',30)"),
             ('Wall drifting', "segue.set('layout','wall');segue.set('trackMove','drift');segue.set('wPath','square');segue.set('wOff',0)"),
             ('Captions fixed, overlay text', "segue.set('layout','one');segue.set('oneFit','shape');segue.set('capOn',true);segue.set('capWhere','fixed');segue.set('ovOn',true);segue.set('ovKind','text');segue.set('cSize','custom')"),
             ('Overlay image, border and edge', "segue.set('ovKind','image');segue.set('mat',20);segue.set('edge',true);segue.set('cSize','4:5')")]
    if os.environ.get('QUICK'): KINDS = KINDS[:1]   # QUICK=1: one set-up only, while working on the rest
    for label, setup in KINDS:
        sweep(pg, setup, label, tally, seen)
    kinds_seen = {t for t, k in seen}
    check('the sweep reached every kind of control', {'rng', 'stp', 'seg', 'menu', 'tog', 'col', 'sel', 'txt', 'nums'} <= kinds_seen, str(sorted(kinds_seen)))
    check('controls tried', len(seen) >= 70, f'{len(seen)} different controls across {len(KINDS)} set-ups')
    summarise(tally, 'every control')
    check('no errors while trying every control', not errs, '; '.join(errs[:3]))

    # ---- undo and redo ----
    pg.evaluate("segue.applyPreset('Card stack')"); time.sleep(.4); open_all(pg)
    s0 = pg.evaluate("[segue.S.hold,segue.S.feel,segue.S.creep]")
    pg.evaluate("segue.set('hold',3.3)"); time.sleep(.9); pg.evaluate("segue.set('feel','spring')"); time.sleep(.9); pg.evaluate("segue.set('creep',40)"); time.sleep(.1)
    pg.mouse.click(5, 450); pg.keyboard.press(f'{MOD}+z'); time.sleep(.2); a1 = pg.evaluate("[segue.S.hold,segue.S.feel,segue.S.creep]")
    pg.keyboard.press(f'{MOD}+z'); time.sleep(.2); pg.keyboard.press(f'{MOD}+z'); time.sleep(.2); a3 = pg.evaluate("[segue.S.hold,segue.S.feel,segue.S.creep]")
    pg.keyboard.press(f'{MOD}+Shift+z'); time.sleep(.2); r1 = pg.evaluate("[segue.S.hold,segue.S.feel,segue.S.creep]")
    check('⌘Z undoes one change at a time, ⇧⌘Z redoes', a1 == [3.3, 'spring', s0[2]] and a3 == s0 and r1 == [3.3, s0[1], s0[2]], f'{s0} → {a1} → {a3} → {r1}')
    # a drag is one step
    open_all(pg); pg.evaluate("document.querySelector('#panel section[data-id=motion]').scrollIntoView()")
    box = pg.locator('#panel section[data-id=motion] .ctl[data-k=dur]:not([hidden]) .rng-box').first; box.scroll_into_view_if_needed(); bb = box.bounding_box()
    d0 = S(pg, 'dur'); n0 = pg.evaluate("segue.ui.undoSteps")
    pg.mouse.move(bb['x'] + 60, bb['y'] + 15); pg.mouse.down()
    for i in range(12): pg.mouse.move(bb['x'] + 60 + i * 6, bb['y'] + 15); time.sleep(.03)
    pg.mouse.up(); time.sleep(.1); d1 = S(pg, 'dur'); n1 = pg.evaluate("segue.ui.undoSteps")
    pg.keyboard.press(f'{MOD}+z'); time.sleep(.2)
    check('a whole drag undoes as one step', d1 != d0 and n1 == n0 + 1 and close(S(pg, 'dur'), d0), f'{d0} → {d1}, {n1 - n0} step, back to {S(pg, "dur")}')
    # typing in a field doesn't undo the page
    pg.evaluate("ensembleUI.open('export')"); time.sleep(.5)
    h_before = S(pg, 'hold'); n_before = pg.evaluate("segue.ui.undoSteps")
    f = pg.locator('#islandSheets input[type=text]').first; f.click(); f.press('End'); pg.keyboard.type('X'); f.press(f'{MOD}+z'); time.sleep(.2)
    check('⌘Z while typing in a field is the field’s own – the settings stay', S(pg, 'hold') == h_before and pg.evaluate("segue.ui.undoSteps") >= n_before, f"hold {S(pg, 'hold')}")
    pg.keyboard.press('Escape'); time.sleep(.3)

    # ---- moved from the preset: dots, section Reset, and "changed" ----
    pg.evaluate("segue.set('ovOn',false);segue.set('ovKind','text');segue.set('cSize','4:5');segue.applyPreset('Phone swipe')"); time.sleep(.4); open_all(pg)
    clean = pg.evaluate("[[...document.querySelectorAll('#panel .chg')].filter(e=>e.offsetParent).map(e=>e.dataset.k||e.className).length,segue.ui.edited]")
    pg.evaluate("segue.set('hold',2.2);segue.set('lag',.2)"); time.sleep(.2)
    mot = pg.evaluate("(()=>{const c=document.querySelector('#panel section[data-id=motion]');return [c.classList.contains('chg'),!!c.querySelector(':scope>h2>.reset')&&getComputedStyle(c.querySelector(':scope>h2>.reset')).display!=='none',document.querySelectorAll('#panel section[data-id=motion] .chg').length,segue.ui.edited,document.querySelector('#pcapName').textContent]})()")
    pg.locator('#panel section[data-id=motion]>h2>.reset').click(); time.sleep(.3)
    after = pg.evaluate("[segue.S.hold,segue.S.lag,document.querySelector('#panel section[data-id=motion]').classList.contains('chg'),segue.ui.edited,document.querySelector('#pcapName').textContent,document.querySelector('#toast').textContent]")
    base_hold, base_lag = base_of(pg, 'hold'), base_of(pg, 'lag')
    check('a preset in use: nothing marked until something moves', clean[0] == 0 and clean[1] is False, str(clean))
    check('moved: the rows show dots, the section offers Reset, the preset says changed', mot[0] and mot[1] and mot[2] >= 2 and mot[3] and 'changed' in mot[4], str(mot))
    check('Reset puts the section back – and the preset is no longer changed', close(after[0], base_hold) and close(after[1], base_lag) and not after[2] and after[3] is False and 'changed' not in after[4] and 'Undo' in after[5], str(after))
    pg.locator('#toast .undo').click(); time.sleep(.3)
    check('…and Undo in the island brings the changes back', close(S(pg, 'hold'), 2.2) and close(S(pg, 'lag'), .2), f"{S(pg, 'hold')} {S(pg, 'lag')}")
    pg.evaluate("document.querySelector('#panel section[data-id=motion] .card-toggle').click()"); time.sleep(.5)
    check('a shut section with something moved shows a dot', pg.evaluate("getComputedStyle(document.querySelector('#panel section[data-id=motion] .cdot')).transform!=='matrix(0, 0, 0, 0, 0, 0)'"))
    pg.evaluate("document.querySelector('#panel section[data-id=motion] .card-toggle').click()"); time.sleep(.5)

    # ---- presets ----
    pg.locator('#pcapOpen').click(); time.sleep(.5)
    check('Presets opens from its capsule', pg.evaluate("!document.querySelector('[data-sheet=presets]').hidden&&document.querySelector('#pcapOpen').getAttribute('aria-expanded')==='true'"))
    names = pg.evaluate("[...document.querySelectorAll('#pcapSheets .preset-row .slot-name')].map(e=>e.textContent)")
    ok_all = True; bad = []
    for n in names:
        pg.evaluate("ensembleUI.open('presets')"); time.sleep(.15)
        row = pg.locator('#pcapSheets .preset-row', has=pg.locator('.slot-name', has_text=n)).first
        row.locator('.slot-main').click(); time.sleep(.25)
        st = pg.evaluate("n=>[segue.ui.preset,document.querySelector('#toast').textContent,[...document.querySelectorAll('#pcapSheets .preset-row.on .slot-name')].map(e=>e.textContent)]", n)
        if st[0] != n or n not in st[1] or st[2] != [n]: ok_all = False; bad.append(n)
    check('every built-in preset applies, says so with Undo, and is marked In use', ok_all and len(names) >= 14, f'{len(names)} presets' + (f', not: {bad}' if bad else ''))
    pg.evaluate("ensembleUI.open('presets')"); time.sleep(.2)
    lay = S(pg, 'layout'); pg.evaluate("segue.applyPreset('Rows up')"); time.sleep(.2); pg.keyboard.press(f'{MOD}+z'); time.sleep(.3)
    check('Undo takes a preset off again', S(pg, 'layout') == lay and pg.evaluate("segue.ui.preset") != 'Rows up', f"{lay} {S(pg, 'layout')} {pg.evaluate('segue.ui.preset')}")
    pg.evaluate("ensembleUI.open('presets')"); time.sleep(.3)
    pg.get_by_label('Preset name').fill('Mine'); pg.locator('#pcapSheets .save-row .pill').click(); time.sleep(.3)
    check('Save keeps your own, under Yours', 'Mine' in pg.evaluate("[...document.querySelectorAll('#pcapSheets .preset-row .slot-name')].map(e=>e.textContent)") and pg.evaluate("[...document.querySelectorAll('#pcapSheets .preset-list .sub-head')].map(e=>e.textContent)")[-1] == 'Yours')
    with pg.expect_download() as dl: pg.get_by_role('button', name='Download presets').click()
    check('Download presets saves a file', dl.value.suggested_filename == 'segue-presets.json')
    pg.set_input_files('#presetfile', PRESETS_FILE); time.sleep(.4)
    check('Load presets adds them', 'Loaded one' in pg.evaluate("[...document.querySelectorAll('#pcapSheets .preset-row .slot-name')].map(e=>e.textContent)"))
    pg.get_by_role('button', name='Delete Mine').click(); time.sleep(.3)
    check('Delete takes one of yours away', 'Mine' not in pg.evaluate("[...document.querySelectorAll('#pcapSheets .preset-row .slot-name')].map(e=>e.textContent)"))
    pg.keyboard.press('Escape'); time.sleep(.4)
    check('Esc shuts the sheet', pg.evaluate("document.querySelector('[data-sheet=presets]').hidden"))

    # ---- media: rows, reorder, a slide's own controls, remove and Clear all with Undo ----
    pg.evaluate("segue.applyPreset('Straight cuts')"); time.sleep(.3); open_all(pg)
    pg.evaluate("document.querySelector('#panel section[data-id=media]').scrollIntoView()")
    pg.locator('.media-list .slot-main').first.click(); time.sleep(.3)
    op = pg.evaluate("(()=>{const r=document.querySelector('.media-list .slot.open'),c=document.querySelector('.media-list .slot:not(.open)'),k=r&&r.querySelector('.slot-det .rng-box');return r?[getComputedStyle(r).backgroundColor,c?getComputedStyle(c).backgroundColor:null,getComputedStyle(r).boxShadow,k?getComputedStyle(k).backgroundColor:null]:null})()")
    check('a row opens in the soft grey of a closed one, no keyline – its controls white inside it (0.10)', op and op[0] == op[1] and op[2] == 'none' and op[3] == 'rgb(255, 255, 255)', str(op))
    det = pg.locator('.media-list .slot.open .ctl', has=pg.locator('label', has_text='On screen')).first
    det.locator('.val').click(); pg.keyboard.press(f'{MOD}+A'); pg.keyboard.type('2.5'); pg.keyboard.press('Enter'); time.sleep(.2)
    det = pg.locator('.media-list .slot.open .ctl', has=pg.locator('label', has_text='On screen')).first
    h1 = pg.evaluate("segue.items[0].hold"); dotted = 'chg' in (det.get_attribute('class') or '')
    det.locator(':scope > .cx').click(); time.sleep(.2)
    check('a slide’s own time: typed, dotted, put back by its dot', h1 == 2.5 and dotted and pg.evaluate("segue.items[0].hold") == 0, f"{h1} {dotted} {pg.evaluate('segue.items[0].hold')}")
    order0 = pg.evaluate("segue.items.map(i=>i.name)")
    pg.get_by_role('button', name='Move down').first.click(); time.sleep(.3)
    order1 = pg.evaluate("segue.items.map(i=>i.name)")
    check('Move down', order1[:2] == [order0[1], order0[0]], str(order1[:2]))
    pg.locator('.media-list .slot.open .slot-main').first.click(); time.sleep(.3)   # shut the open row first: a piece's detail (0.9, in groups) is taller than the panel's view
    src = pg.locator('.media-list .slot').nth(3); dst = pg.locator('.media-list .slot').nth(0)
    src.drag_to(dst); time.sleep(.4)
    order2 = pg.evaluate("segue.items.map(i=>i.name)")
    check('drag a row to reorder', order2[0] == order1[3], f'{order1} → {order2}')
    gone = order2[1]
    pg.get_by_role('button', name=f'Remove {gone}').click(); time.sleep(.6)
    mid = pg.evaluate("[segue.items.length,document.querySelector('#toast').textContent]")
    pg.locator('#toast .undo').click(); time.sleep(1.2)
    back = pg.evaluate("segue.items.map(i=>i.name)")
    check('remove a file – Undo puts it back where it was', mid[0] == 4 and 'Undo' in mid[1] and back == order2, f'{mid} → {back}')
    pg.get_by_role('button', name='Clear all').click(); time.sleep(.8)
    n_clear = pg.evaluate("segue.items.length"); pg.keyboard.press(f'{MOD}+z'); time.sleep(1.8)
    check('Clear all – and ⌘Z brings every file back, in order', n_clear == 0 and pg.evaluate("segue.items.map(i=>i.name)") == order2, f"{n_clear} → {pg.evaluate('segue.items.length')}")

    # ---- pictures and fonts ----
    pg.evaluate("document.querySelector('#panel section[data-id=canvas]').scrollIntoView()")
    pg.set_input_files('#bgfile', IMGS[2]); time.sleep(.6)
    had = pg.evaluate("!!segue.pics.bg")
    pg.get_by_role('button', name='Remove the background image').click(); time.sleep(.5)
    off = pg.evaluate("!segue.pics.bg"); pg.locator('#toast .undo').click(); time.sleep(.8)
    check('background image: in, out, and back with Undo', had and off and pg.evaluate("!!segue.pics.bg"))
    pg.set_input_files('#fontfile', FONT); time.sleep(1.2)
    fonts = pg.evaluate("Object.values(segue.fonts).filter(f=>f.own).map(f=>f.label)")
    if fonts: pg.get_by_role('button', name=f'Remove {fonts[0]}').click(); time.sleep(.4)
    check('a font of your own: added to every Font menu, and removed', len(fonts) == 1 and pg.evaluate("Object.values(segue.fonts).filter(f=>f.own).length") == 0, str(fonts))

    # ---- the frame: Preview, the panel, its width, light and dark ----
    pg.mouse.click(900, 450); pg.keyboard.press('f'); time.sleep(.7)
    pv = pg.evaluate("[document.querySelector('.app').classList.contains('preview'),getComputedStyle(document.querySelector('.panel')).visibility]")
    pg.locator('#panelBtn').click(); time.sleep(.6); peek = pg.evaluate("getComputedStyle(document.querySelector('.panel')).visibility")
    pg.keyboard.press('Escape'); time.sleep(.6)
    check('Preview hides the panel; the panel button brings it back; Esc leaves', pv == [True, 'hidden'] and peek == 'visible' and not pg.evaluate("document.querySelector('.app').classList.contains('preview')"), f'{pv} {peek}')
    rz = pg.locator('#resizer').bounding_box(); pg.mouse.move(rz['x'] + 4, rz['y'] + 300); pg.mouse.down(); pg.mouse.move(rz['x'] + 200, rz['y'] + 300, steps=8); pg.mouse.up(); time.sleep(.5)
    wide = pg.evaluate("[document.querySelector('#panelBox').offsetWidth,document.querySelector('#c_cSize')?0:0,[...document.querySelectorAll('#panel .ctl')].find(w=>w.querySelector('.seg[aria-label=Size]')).classList.contains('as-menu')]")
    rz = pg.locator('#resizer').bounding_box(); pg.mouse.move(rz['x'] + 4, rz['y'] + 300); pg.mouse.down(); pg.mouse.move(rz['x'] - 260, rz['y'] + 300, steps=8); pg.mouse.up(); time.sleep(.5)
    narrow = pg.evaluate("[document.querySelector('#panelBox').offsetWidth,[...document.querySelectorAll('#panel .ctl')].find(w=>w.querySelector('.seg[aria-label=Size]')).classList.contains('as-menu')]")
    check('the panel’s width drags (280–480), and choices re-fit: a row when there’s room, a menu when not', wide[0] == 480 and wide[2] is False and narrow[0] == 280 and narrow[1] is True, f'{wide} {narrow}')
    pg.locator('#themeBtn').click(); time.sleep(.3)
    dark = pg.evaluate("[document.body.dataset.theme,localStorage.getItem('segue:mode')]")
    pg.locator('#themeBtn').click(); time.sleep(.2)
    check('light and dark, remembered', dark == ['dark', '"dark"'], str(dark))

    # ---- the Export bar ----
    pg.evaluate("segue.set('cSize','custom');segue.set('cW',270);segue.set('cH',338);segue.set('name','Bar test');segue.applyPreset('Card stack')"); time.sleep(.5)
    pg.locator('#play').click(); time.sleep(.2); p1 = pg.evaluate("segue.playing")
    pg.locator('#play').click(); time.sleep(.2); p2 = pg.evaluate("segue.playing")
    check('the island: Play and Pause', p1 != p2 and pg.locator('#play').text_content() in ('Play', 'Pause'), f'{p1} {p2}')
    sb = pg.locator('#scrub').bounding_box(); pg.mouse.click(sb['x'] + sb['width'] * .5, sb['y'] + sb['height'] / 2); time.sleep(.3)
    L = pg.evaluate("segue.plan().L"); ck = pg.evaluate("segue.clock"); tm = pg.locator('#time').text_content()
    check('the scrubber moves through the loop and the time says where', not pg.evaluate("segue.playing") and abs(ck - L / 2) < L * .08 and f'{L:.1f}' in tm, f'{ck:.2f} of {L:.2f} – “{tm}”')
    pg.locator('#exportOpen').click(); time.sleep(.6)
    check('Export opens its sheet from the island', pg.evaluate("!document.querySelector('[data-sheet=export]').hidden&&document.querySelector('#exportOpen').getAttribute('aria-expanded')==='true'&&document.querySelector('#island').classList.contains('open')"))
    vis = {}
    for fmt in ['MP4', 'GIF', 'PNG']:
        pg.locator('#islandSheets .seg[aria-label=Format] > button', has_text=fmt).click(); time.sleep(.3)
        vis[fmt] = pg.evaluate("""[...document.querySelectorAll('#islandSheets .ctl,#islandSheets .toggle-row')].filter(e=>e.offsetParent).map(e=>{const h=e.querySelector('.ctl-head>span,.ctl-head>label,.toggle span:last-child');return h?h.textContent:''})""")
        vis[fmt].append(pg.locator('#islandSheets .btn-row .pill.primary').text_content())
    tops = []
    for fmt in ['MP4', 'GIF', 'PNG', 'MP4']:
        pg.locator('#islandSheets .seg[aria-label=Format] > button', has_text=fmt).click(); time.sleep(.35)
        tops.append(pg.evaluate("(()=>{const f=document.querySelector('#islandSheets .seg[aria-label=Format]').getBoundingClientRect(),d=document.querySelector('#islandSheets .btn-row .pill.primary').getBoundingClientRect();return [Math.round(f.top),Math.round(d.top)]})()"))
    check('the Export sheet holds still as the format changes – Format and Download stay where they are', all(t == tops[0] for t in tops), str(tops))
    chips = pg.evaluate("[...document.querySelectorAll('#islandSheets .xinfo .chip')].map(e=>e.textContent)")
    check('what you’ll get shows as chips', len(chips) >= 2 and '×' in chips[0], str(chips))
    check('Format shows only what each format uses, and the button says what it makes',
          'Quality' in vis['MP4'] and 'Loops in the file' in vis['MP4'] and 'Download MP4' in vis['MP4'] and 'GIF size' in vis['GIF'] and 'Dither' in vis['GIF'] and 'Download GIF' in vis['GIF']
          and 'Quality' not in vis['PNG'] and 'GIF size' not in vis['PNG'] and 'Download PNG' in vis['PNG'], json.dumps(vis))
    got = {}
    for fmt in ['png', 'gif', 'mp4']:
        pg.locator('#islandSheets .seg[aria-label=Format] > button', has_text=fmt.upper()).click(); time.sleep(.2)
        if fmt == 'gif':
            pg.locator('#islandSheets .seg[aria-label="GIF size"] > button', has_text='Full').click(); pg.locator('#islandSheets .seg[aria-label="GIF frame rate"] > button', has_text='12').click(); time.sleep(.2)
        if fmt == 'mp4':
            pg.locator('#islandSheets .seg[aria-label=Quality] > button', has_text='Standard').click(); time.sleep(.1)
        prog = []
        with pg.expect_download(timeout=240000) as d:
            pg.locator('#islandSheets .btn-row .pill.primary').click()
            for i in range(30):
                time.sleep(.15); st = pg.evaluate("[document.querySelector('#islandSheets .btn-row .pill.primary').disabled,document.querySelector('#islandSheets .progress>i').style.width,document.querySelector('#toast').textContent]")
                prog.append(st)
                if not st[0]: break
        path = os.path.join(OUT, d.value.suggested_filename); d.value.save_as(path); got[fmt] = (d.value.suggested_filename, os.path.getsize(path))
        time.sleep(.4); got[fmt] += (pg.locator('#toast').text_content(), any(s[0] for s in prog), pg.locator('#islandSheets .btn-row .pill.primary').is_disabled())
    check('Download PNG, GIF and MP4: each saves, named from File name and size, and says so in the island',
          all(got[f][0] == f'Bar_test_270x338.{f}' and got[f][1] > 200 and 'Saved' in got[f][2] and not got[f][4] for f in got), json.dumps({k: v[:3] for k, v in got.items()}))
    check('while one is being made the button waits and the island shows how far it’s got', got['gif'][3] or got['mp4'][3], json.dumps({k: v[3] for k, v in got.items()}))
    gim = Image.open(os.path.join(OUT, got['gif'][0])); check('the GIF is the canvas size, the PNG too', gim.size == (270, 338) and Image.open(os.path.join(OUT, got['png'][0])).size == (270, 338), str(gim.size))
    # Stop
    pg.evaluate("segue.set('cSize','4:5');segue.applyPreset('Zoom through')"); time.sleep(.3)
    pg.evaluate("ensembleUI.open('export')"); time.sleep(.3)
    pg.locator('#islandSheets .seg[aria-label=Format] > button', has_text='GIF').click(); pg.locator('#islandSheets .seg[aria-label="GIF size"] > button', has_text='Full').click(); time.sleep(.1)
    pg.locator('#islandSheets .btn-row .pill.primary').click(); time.sleep(.8)
    stop_shown = pg.locator('#islandSheets .btn-row .pill.small', has_text='Stop').is_visible()
    # a full-size GIF frame keeps the page busy for most of a second here, and a robot's click takes several round trips
    t_stop = time.time(); pg.locator('#islandSheets .btn-row .pill.small', has_text='Stop').click(timeout=20000)
    for i in range(80):
        if not pg.evaluate("segue.busy"): break
        time.sleep(.25)
    t_stop = time.time() - t_stop
    st = pg.evaluate("[segue.busy,document.querySelector('#islandSheets .btn-row .pill.primary').disabled,document.querySelector('#islandSheets .btn-row .pill.small').hidden,document.querySelector('#toast').textContent]")
    check('Stop: shown while a GIF or MP4 is made, and it stops – the button is back', stop_shown and st[:3] == [False, False, True] and 'Stopped' in st[3] and t_stop < 6, f'{st}, stopped in {t_stop:.1f} s')
    pg.mouse.click(1380, 200); time.sleep(.5)
    check('a click on the work shuts the sheet', pg.evaluate("document.querySelector('[data-sheet=export]').hidden"))
    check('no errors on the page', not errs, '; '.join(errs[:3]))
    ctx.close()

    # ---- a browser that used an earlier Segue: sections it had shut, Presets and Export among them ----
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append('older: ' + str(e))); pg.set_default_timeout(4000)
    pg.goto(base); time.sleep(.8)
    pg.evaluate("localStorage.setItem('segue:collapsed',JSON.stringify({presets:true,export:true,media:true,canvas:true,motion:false}))"); pg.reload(); time.sleep(1.5)
    pg.locator('#pcapOpen').click(); time.sleep(.5); n_rows = pg.evaluate("[...document.querySelectorAll('#pcapSheets .preset-row')].filter(e=>e.offsetParent).length")
    pg.keyboard.press('Escape'); time.sleep(.3); pg.locator('#exportOpen').click(); time.sleep(.5)
    dl_ok = pg.evaluate("!!document.querySelector('#islandSheets .btn-row .pill.primary').offsetParent")
    check('a browser with sections shut by an earlier Segue: Presets lists every preset and Export shows its Download', n_rows >= 14 and dl_ok, f'{n_rows} presets showing, Download showing: {dl_ok}')
    ctx.close()

    # ---- a phone ----
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append('phone: ' + str(e))); pg.set_default_timeout(4000)
    pg.goto(base); time.sleep(1.2); pg.set_input_files('#mediafile', IMGS[:3]); time.sleep(1.2)
    ph = pg.evaluate("(()=>{const e=document.querySelector('#exportOpen').getBoundingClientRect(),i=document.querySelector('#island').getBoundingClientRect();return [e.right<=390&&e.bottom<=844&&e.width>0,i.left>=0&&i.right<=390,document.documentElement.scrollWidth<=390]})()")
    pg.locator('#exportOpen').tap(); time.sleep(.6)
    check('a phone: the island fits, Export is in reach and opens its sheet, nothing scrolls sideways', all(ph) and pg.evaluate("!document.querySelector('[data-sheet=export]').hidden"), str(ph))
    check('no errors on a phone', not [e for e in errs if e.startswith('phone')])
    ctx.close(); b.close()

fails = [r for r in results if not r[0]]
print(f'\n{len(results) - len(fails)} of {len(results)} passed')
sys.exit(1 if fails else 0)

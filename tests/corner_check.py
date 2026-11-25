"""The house, by machine.

It started as corners. The ladder is 4 · 6 · 8 · 10 · 12, plus the few things
that are truly round, and the rule that kept drifting was corners inside
corners: an inner radius is the outer one less the gap between them. A leftover
calc from before the kit put 6 px pills inside a 17 px box in Rubato and Tempo,
which Steve spotted on 12 November.

From 25 November it reads four more things, because the same drift happens to
all of them and none of it shows at a glance:

  heights   the heights the kit and the tokens set – 16, 24, 26, 28, 30, 36,
            38, 40, 44, 46/48. A one-off height is a control that was built
            rather than taken.
  type      five sizes and three weights. Anything else is a number somebody
            typed in.
  colour    every colour on the page resolves to one of the kit's tokens.
            Colours that are the work rather than the house – a swatch, a font
            preview, a band – are left alone.
  spacing   padding, gaps and the margins that are decisions. The house moves
            in 2s to 16, then 20, 24, 32, and a row's right padding is a step
            plus the change column.

Corners fail the run. The other four report, and fail only with --strict,
so a tool still queued for the house style doesn't hold the suite red.

Nothing here looks at behaviour.
"""
import sys
from serve import start
from playwright.sync_api import sync_playwright

LADDER = {4, 6, 8, 10, 12}
ROUND = 25
HEIGHTS = {16, 24, 26, 28, 30, 36, 38, 40, 44, 46, 48}
SIZES = {11.5, 12, 12.5, 13, 15, 20}
WEIGHTS = {400, 500, 700}
STEPS = {0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32}
GUTTER = 20
SPACING = STEPS | {s + GUTTER for s in STEPS}
# ui/kit is the component page: every house part on one screen, including the ones
# no tool happens to show. That is where a stray hides – the wrapped choice group
# sat at 17px for weeks and appears in two panels out of four.
APPS = ('segue', 'tutti', 'rubato', 'tempo', 'ui/kit')
# The bench at ui/kit/ frames the components in iframes at real viewport widths, so read the
# specimen itself - the bench's own chrome is not a component and its frames are not ours.
PATH = {'ui/kit': 'ui/kit/specimen.html'}
CONTROL_CLASS = ['pill', 'seg', 'rng-box', 'tab', 'lane', 'stp-g', 'ebtn', 'chip',
                 'toggle', 'card-toggle', 'fold-head', 'more-toggle', 'val-in', 'cx']
# 'sample' – a font list draws each name in that font's own face, so its weight is the
# font's, not a choice of ours (Segue's slot-name.sample came up as weight 800).
DATA_CLASS = ['swatch', 'cswatch', 'tt-prev', 'sw', 'chip-pic', 'thumb', 'pic', 'feel-pic',
              'sample']

READ = r"""([CONTROL, DATA]) => {
  const rs = getComputedStyle(document.documentElement);
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;left:-9999px';
  document.body.appendChild(probe);
  const key = v => {
    const t = String(v || '').trim(); if (!t || t === 'transparent') return null;
    const m = t.match(/[0-9.]+/g); if (!m || m.length < 3) return null;
    const n = m.slice(0, 3).map(Number);
    return (t.startsWith('color(') ? n.map(x => Math.round(x * 255)) : n.map(Math.round)).join(',');
  };
  const resolve = v => { probe.style.color = 'rgb(1,2,3)'; probe.style.color = v;
    return key(getComputedStyle(probe).color); };
  const byColour = {};
  for (const n of ['--k-panel','--k-card','--k-fill','--k-fill-2','--k-fill-hover','--k-raise',
                   '--k-num','--k-handle','--k-dot','--ink','--ink-strong','--muted','--hair',
                   '--keyline','--app','--bg','--line']) {
    const v = rs.getPropertyValue(n).trim(); if (!v) continue;
    const k = resolve(v); if (k && !(k in byColour)) byColour[k] = n;
  }
  probe.remove();

  const cls = e => (typeof e.className === 'string' ? e.className : '').trim().split(/\s+/).filter(Boolean);
  const name = e => e.tagName.toLowerCase() + (cls(e).length ? '.' + cls(e).slice(0, 3).join('.') : '');
  const num = v => Math.round((parseFloat(v) || 0) * 10) / 10;

  /* Anything you have to open - a popover, a menu, the colour picker - is display:none until
     you open it, and the pickers hang off <body>, outside the panel. So the whole overlay layer
     went unread in every tool: it could drift as far as it liked and this check stayed green.
     Open them (remembering how they were) so their corners, colour and type are read too. */
  const OVERLAY = '.pop,.cpk,.cpick,.menu,[role="dialog"]';
  const shut = [];
  document.querySelectorAll(OVERLAY).forEach(o => {
    const cs = getComputedStyle(o);
    if (!(o.hasAttribute('hidden') || cs.display === 'none' || cs.visibility === 'hidden')) return;
    shut.push([o, o.getAttribute('hidden'), o.style.cssText]);
    o.removeAttribute('hidden');
    o.style.display = 'block'; o.style.visibility = 'visible'; o.style.opacity = '1';
    o.style.left = '20px'; o.style.top = '20px';
  });

  const out = [];
  document.querySelectorAll('.panel *, .island *, .pcap *, .topbar *, ' + OVERLAY + ', ' +
                            OVERLAY.split(',').map(s => s + ' *').join(',')).forEach(e => {
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.opacity === '0' || cs.display === 'none') return;
    const b = e.getBoundingClientRect(); if (b.width < 4 || b.height < 4) return;
    const c = cls(e), p = e.parentElement;
    const r = num(cs.borderTopLeftRadius);
    let pr = 0, inset = null;
    if (p) { pr = num(getComputedStyle(p).borderTopLeftRadius);
      if (pr) { const pb = p.getBoundingClientRect();
        inset = Math.round(Math.min(b.left - pb.left, b.top - pb.top,
                                    pb.right - b.right, pb.bottom - b.bottom) * 10) / 10; } }
    /* a text area grows with what is typed in it, so its height says nothing */
    const isControl = ['BUTTON','INPUT','SELECT'].includes(e.tagName) ||
                      CONTROL.some(x => c.includes(x));
    /* a file or colour input is a hit target behind something else, not a control */
    const isData = DATA.some(x => c.includes(x)) || e.type === 'color' || e.type === 'file' ||
                   e.type === 'range' || !!e.closest('[data-colour],.states,.sheet,.preset-list');
    const bgRaw = cs.backgroundColor, fgRaw = cs.color;
    /* see-through at all? then it is a tint over a surface, or nothing at all */
    const translucent = v => { const m = String(v).match(/[0-9.]+/g);
      return !!(m && m.length >= 4 && Number(m[3]) < 1); };
    out.push({
      el: name(e), parent: p ? name(p) : null, r, pr, inset,
      h: isControl ? Math.round(b.height * 10) / 10 : null,
      size: num(cs.fontSize), weight: parseInt(cs.fontWeight, 10) || 400,
      hasText: [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()),
      bg: (translucent(bgRaw) || e.style.background || e.style.backgroundColor) ? null : key(bgRaw),
      bgTok: byColour[key(bgRaw)] || null,
      fg: (translucent(fgRaw) || e.style.color) ? null : key(fgRaw),
      fgTok: byColour[key(fgRaw)] || null,
      data: isData,
      ov: !!e.closest(OVERLAY),
      pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft,
            cs.rowGap === 'normal' ? '0px' : cs.rowGap,
            cs.columnGap === 'normal' ? '0px' : cs.columnGap].map(num)
             .filter(v => Math.abs(v) <= 64),   /* above that it is a column, not spacing */
      mar: [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft]
             .map(num).filter(v => Math.abs(v) <= 24)
    });
  });
  for (const [o, h, css] of shut) {
    o.style.cssText = css;
    if (h !== null) o.setAttribute('hidden', h);
  }
  return out;
}"""


def near(v, allowed, slack=0.6):
    return any(abs(v - a) <= slack for a in allowed)


def main():
    strict = '--strict' in sys.argv
    url = start()
    found = {k: [] for k in ('corner', 'height', 'type', 'colour', 'space')}
    n = 0
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        for app in APPS:
            pg = br.new_page(viewport={'width': 1500, 'height': 1200})
            pg.goto(url + 'docs/' + PATH.get(app, app + '/')); pg.wait_for_timeout(1800)
            pg.evaluate("document.querySelectorAll('.card.collapsed>h2,.card.collapsed .card-toggle')"
                        ".forEach(b => b.click && b.click())")
            pg.wait_for_timeout(900)
            # A shut group hides its body, so everything in it went unread: Tutti's Jitter and
            # Thresholds had never been checked at all. Open every one of them, twice over in
            # case opening one puts another on screen.
            for _ in range(2):
                pg.evaluate("document.querySelectorAll('.fold-head[aria-expanded=\"false\"],"
                            ".more-toggle[aria-expanded=\"false\"]').forEach(b => b.click())")
                pg.wait_for_timeout(500)
            rows = pg.evaluate(READ, [CONTROL_CLASS, DATA_CLASS])
            pg.close()
            n += len(rows)
            for x in rows:
                at = f"{app}: {x['el']}" + (' (behind a click)' if x['ov'] else '')
                if x['r'] and x['r'] < ROUND and x['r'] not in LADDER:
                    found['corner'].append(f"{at} has a {x['r']}px corner – off the ladder")
                if x['r'] and x['pr'] and x['inset'] is not None and 0 <= x['inset'] <= 4 \
                        and x['r'] < ROUND and x['pr'] < ROUND:
                    want = max(0, x['pr'] - x['inset'])
                    if abs(x['r'] - want) > 1.2:
                        found['corner'].append(
                            f"{at} is {x['r']}px inside {x['parent']} "
                            f"({x['pr']}px, {x['inset']}px in) – wants {want}px")
                if x['h'] and x['h'] < 60 and not near(x['h'], HEIGHTS) and not x['data']:
                    if 'seg' in x['el'] and 'wrap' in x['el']:
                        why = ' – a choice group on two rows; it wants a menu'
                    elif 'toggle' in x['el'] and 26 < x['h'] < 34:
                        why = ' – a switch whose label runs to two lines; the name is too long'
                    else:
                        why = ' – not a house height'
                    found['height'].append(f"{at} is {x['h']}px tall{why}")
                if x['hasText']:
                    if not near(x['size'], SIZES, 0.3):
                        found['type'].append(f"{at} sets {x['size']}px type")
                    if x['weight'] not in WEIGHTS and not x['data']:
                        found['type'].append(f"{at} sets weight {x['weight']}")
                if x['bg'] and not x['bgTok'] and not x['data']:
                    found['colour'].append(f"{at} paints its own background rgb({x['bg']})")
                if x['fg'] and not x['fgTok'] and x['hasText'] and not x['data']:
                    found['colour'].append(f"{at} paints its own text colour rgb({x['fg']})")
                for v in x['pad'] + x['mar']:
                    if v and not near(abs(v), SPACING, 0.6):
                        found['space'].append(f"{at} uses {v}px of space")
                        break
        br.close()

    label = {'corner': 'Corners', 'height': 'Heights', 'type': 'Type',
             'colour': 'Colour', 'space': 'Spacing'}
    for k in ('corner', 'height', 'type', 'colour', 'space'):
        rows = sorted(set(found[k]))
        hard = (k == 'corner' or strict) and rows
        print(f'\n{"FAIL" if hard else "    "} {label[k]}: {len(rows)} '
              f'{"stray" if len(rows) == 1 else "strays"}')
        for line in rows:
            print('       ' + line)
    print(f'\n{n} elements read across {len(APPS)} tools.')
    hard = found['corner'] if not strict else [v for vs in found.values() for v in vs]
    return 1 if hard else 0


if __name__ == '__main__':
    sys.exit(main())

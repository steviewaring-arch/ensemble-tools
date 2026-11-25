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
APPS = ('segue', 'tutti', 'rubato', 'tempo')
CONTROL_CLASS = ['pill', 'seg', 'rng-box', 'tab', 'lane', 'stp-g', 'ebtn', 'chip',
                 'toggle', 'card-toggle', 'fold-head', 'more-toggle', 'val-in', 'cx']
DATA_CLASS = ['swatch', 'cswatch', 'tt-prev', 'sw', 'chip-pic', 'thumb', 'pic', 'feel-pic']

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

  const out = [];
  document.querySelectorAll('.panel *, .island *, .pcap *, .topbar *, .pop *').forEach(e => {
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
                   !!e.closest('[data-colour],.states,.sheet,.preset-list');
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
      pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft,
            cs.rowGap === 'normal' ? '0px' : cs.rowGap,
            cs.columnGap === 'normal' ? '0px' : cs.columnGap].map(num)
             .filter(v => Math.abs(v) <= 64),   /* above that it is a column, not spacing */
      mar: [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft]
             .map(num).filter(v => Math.abs(v) <= 24)
    });
  });
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
            pg.goto(url + f'docs/{app}/'); pg.wait_for_timeout(1800)
            pg.evaluate("document.querySelectorAll('.card.collapsed>h2,.card.collapsed .card-toggle')"
                        ".forEach(b => b.click && b.click())")
            pg.wait_for_timeout(900)
            rows = pg.evaluate(READ, [CONTROL_CLASS, DATA_CLASS])
            pg.close()
            n += len(rows)
            for x in rows:
                at = f"{app}: {x['el']}"
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
                    if x['weight'] not in WEIGHTS:
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

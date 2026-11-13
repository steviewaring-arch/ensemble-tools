"""Corners, by machine.

The house ladder is 4 · 6 · 8 · 10 · 12, plus the few things that are truly round
(a dot, a knob, a switch). The rule that keeps drifting is the one about corners
inside corners: an inner radius is the outer one less the gap between them. A
leftover calc from before the kit put 6 px pills inside a 17 px box in Rubato and
Tempo, which Steve spotted on 12 November, so it is checked here from now on.

Nothing here looks at behaviour – it reads every radius on the page.
"""
import sys
from serve import start
from playwright.sync_api import sync_playwright

LADDER = {4, 6, 8, 10, 12}          # the steps
ROUND = 25                          # anything above this is a dot, a knob or a switch
APPS = ('segue', 'tutti', 'rubato', 'tempo')

READ = """() => {
  const out = [];
  const r = e => parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0;
  const name = e => e.tagName.toLowerCase() +
    (typeof e.className === 'string' && e.className.trim()
      ? '.' + e.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
  document.querySelectorAll('.panel *, .island *, .pcap *, .topbar *, .pop *').forEach(e => {
    const rr = r(e); if (!rr) return;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.opacity === '0') return;
    const b = e.getBoundingClientRect(); if (b.width < 4 || b.height < 4) return;
    const p = e.parentElement, pr = p ? r(p) : 0;
    let inset = null;
    if (p && pr) { const pb = p.getBoundingClientRect();
      inset = Math.round(Math.min(b.left - pb.left, b.top - pb.top,
                                  pb.right - b.right, pb.bottom - b.bottom) * 10) / 10; }
    out.push({el: name(e), r: Math.round(rr * 10) / 10, parent: p ? name(p) : null,
              pr: Math.round(pr * 10) / 10, inset});
  });
  return out;
}"""


def main():
    url = start()
    bad, n = [], 0
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        for app in APPS:
            pg = br.new_page(viewport={'width': 1500, 'height': 1200})
            pg.goto(url + f'docs/{app}/'); pg.wait_for_timeout(1800)
            pg.evaluate("document.querySelectorAll('.card.collapsed>h2,.card.collapsed .card-toggle')"
                        ".forEach(b => b.click && b.click())")
            pg.wait_for_timeout(900)
            rows = pg.evaluate(READ)
            pg.close()
            n += len(rows)
            for x in rows:
                if x['r'] < ROUND and x['r'] not in LADDER:
                    bad.append(f"{app}: {x['el']} has a {x['r']}px corner – off the ladder "
                               f"({'·'.join(str(v) for v in sorted(LADDER))})")
                # a child hugging its parent's corner follows it
                if x['pr'] and x['inset'] is not None and 0 <= x['inset'] <= 4 \
                        and x['r'] < ROUND and x['pr'] < ROUND:
                    want = max(0, x['pr'] - x['inset'])
                    if abs(x['r'] - want) > 1.2:
                        bad.append(f"{app}: {x['el']} is {x['r']}px inside {x['parent']} "
                                   f"({x['pr']}px, {x['inset']}px in) – wants {want}px")
        br.close()
    for line in sorted(set(bad)):
        print('FAIL', line)
    print(f'{n} corners read across {len(APPS)} tools: '
          f'{"all on the ladder and nested right." if not bad else str(len(set(bad))) + " off."}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())

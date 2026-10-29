"""Decentish against the real services – no fakes. For checking what the page actually finds, not how it words it.

    python3 tests/decentish_live.py                 # the standard places
    python3 tests/decentish_live.py "M30 9LR" SK1   # just these

Runs in GitHub Actions (Run workflow on "Decentish live check"), because the services it calls
(OpenStreetMap, Open-Meteo, postcodes.io) need the open internet. For each place it runs Now, next
Friday at 18:00 and next Saturday at 13:00, reads every dial and distance, and writes:

  tests/out/decentish-live.md    – what it found, what looks wrong, and every plan
  tests/out/decentish-live.json  – the facts pack behind every plan

Be kind to the map service: one run at a time, a pause between each.
"""
import datetime as dt, json, os, sys, time
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
LONDON = ZoneInfo('Europe/London')
PLACES = [
    ('Monton', 'M30 9LR'), ('Northern Quarter', 'M4 1HN'), ('Chorlton', 'M21'), ('Didsbury', 'M20'),
    ('Salford Quays', 'M50'), ('Altrincham', 'WA14'), ('Stockport', 'SK1'), ('Bolton', 'BL1'),
]
MOODS = ['Blair', 'Three pints', 'Mad one']
DISTS = ['Doorstep', 'Nearby', 'Further afield']

def next_at(dow, h, m):
    now = dt.datetime.now(LONDON)
    d = now + dt.timedelta(days=(dow - now.weekday()) % 7)
    d = d.replace(hour=h, minute=m, second=0, microsecond=0)
    if d < now: d += dt.timedelta(days=7)
    return d.strftime('%Y-%m-%dT%H:%M')

def wait_done(pg, timeout=120):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if pg.evaluate('window.decentish&&window.decentish.done()'): return True
        time.sleep(.5)
    return False

def set_range(pg, sel, n):
    pg.evaluate(f"(()=>{{const d=document.querySelector('{sel}');d.value={n};d.dispatchEvent(new Event('input'))}})()")

def problems(f):
    """Things in the data that look wrong. The point of the exercise."""
    out = []
    if not f: return ['No facts – the run failed']
    a = f['around']
    for t in f['timings']:
        if t['status'] != 'ok': out.append(f"{t['source']} {t['status']}")
        elif t['seconds'] and t['seconds'] > 8: out.append(f"{t['source']} slow: {t['seconds']}s")
    if f['unmatchedTramStops']: out.append('Tram stops not on the network list: ' + ', '.join(f['unmatchedTramStops']))
    if a['badHours']: out.append(f"{len(a['badHours'])} places with hours the engine can't read, e.g. {a['badHours'][0]}")
    if a['placesHere'] and a['withHours'] / a['placesHere'] < .4:
        out.append(f"Only {a['withHours']} of {a['placesHere']} places here have opening hours on the map")
    if f['where']['inGM'] and not f['around']['destinations']: out.append('In Greater Manchester but no destinations fetched')
    for d in f['around']['destinations']:
        if d['places'] < 5: out.append(f"Destination {d['name']} has only {d['places']} places – centre point may be off")
    return out

def main():
    picked = [p for p in PLACES if p[1] in sys.argv[1:]] or ([('', pc) for pc in sys.argv[1:]] if sys.argv[1:] else PLACES)
    times = [('Now', ''), ('Friday 18:00', next_at(4, 18, 0)), ('Saturday 13:00', next_at(5, 13, 0))]
    os.makedirs(OUT, exist_ok=True)
    url = start() + 'decentish/'
    report, data, summary = [], [], []
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/London', locale='en-GB')
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
        pg.route('**/ABCDiatype-Bold.woff2', lambda r: r.abort())
        pg.goto(url); time.sleep(1)
        pg.click('#labToggle')
        for name, pc in picked:
            report.append(f'## {name or pc} ({pc})\n')
            for tlabel, at in times:
                errs.clear()
                pg.fill('#tPostcode', pc); pg.fill('#tAt', at)
                pg.click('#labForm button[type=submit]'); time.sleep(.5)
                ok = wait_done(pg)
                set_range(pg, '#dial', 1); set_range(pg, '#dist', 1); pg.click('[data-when="now"]')
                base = pg.evaluate('window.decentish.facts()')
                probs = problems(base) + ([] if ok else ['Did not finish in 2 minutes']) + [e for e in errs if 'woff2' not in e]
                report.append(f'### {tlabel}\n')
                if base:
                    a = base['around']; w = base['where']
                    report.append(f"- **Where:** {w['place']}, {w['postcode']} · in Greater Manchester: {w['inGM']}")
                    report.append(f"- **Here:** {a['placesHere']} places, {a['withHours']} with hours · " +
                                  ', '.join(f'{k} {v}' for k, v in sorted(a['byRole'].items(), key=lambda x: -x[1])))
                    report.append(f"- **Open within 15 minutes at the start:** {len(a['openNearbyAtStart'])} – " + ', '.join(a['openNearbyAtStart'][:12]))
                    report.append('- **Tram stops:** ' + (', '.join(f"{s['name']} {s['walk']} min" + ('' if s['onNetwork'] else ' (NOT MATCHED)') for s in w['tramStops']) or 'none'))
                    report.append('- **Further afield:** ' + (', '.join(f"{d['name']} {d['km']} km, {d['places']} places" for d in a['destinations']) or 'none'))
                    report.append('- **Timings:** ' + pg.inner_text('#timings'))
                report.append('- **Looks wrong:** ' + ('; '.join(probs) if probs else 'nothing flagged'))
                summary.append((name or pc, tlabel, probs))
                report.append('')
                for n in range(3):
                    for d in range(3):
                        set_range(pg, '#dial', n); set_range(pg, '#dist', d)
                        lines = pg.locator('#lines p').all_inner_texts()
                        f = pg.evaluate('window.decentish.facts()')
                        data.append({'place': name or pc, 'postcode': pc, 'time': tlabel, 'mood': MOODS[n], 'distance': DISTS[d], 'lines': lines, 'facts': f})
                        report.append(f'**{MOODS[n]} · {DISTS[d]}**\n')
                        report.extend('> ' + l + '  ' for l in lines)
                        rc = pg.inner_text('#receipts')
                        if rc: report.append('\n`' + rc + '`')
                        report.append('')
                time.sleep(4)
        b.close()
    head = ['# Decentish – live check', '', f"Run {dt.datetime.now(LONDON):%A %-d %B %Y, %H:%M}. Real services, no fakes.", '',
            '## What looks wrong', '']
    for place, t, probs in summary:
        head.append(f"- **{place}, {t}:** " + ('; '.join(probs) if probs else 'nothing flagged'))
    head.append('')
    with open(os.path.join(OUT, 'decentish-live.md'), 'w') as fh: fh.write('\n'.join(head + report) + '\n')
    with open(os.path.join(OUT, 'decentish-live.json'), 'w') as fh: json.dump(data, fh, indent=1, ensure_ascii=False)
    print('\n'.join(head))

if __name__ == '__main__':
    main()

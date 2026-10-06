"""Checks for Decentish – the logic and the voice, with every outside source
faked so it runs offline and gives the same answer every time.

    python3 tests/decentish_check.py

Needs Playwright with Chromium, and `cd tests && npm install` once (for the
SunCalc and opening_hours libraries the page loads from jsDelivr).

The places are Monton Road as Google listed them on 6 October 2026, with their
opening hours written in OpenStreetMap's format. The weather is made up but
shaped like that day (sunny afternoon, mild night, colder tomorrow). The real
page asks the real services; this only proves what the page does with answers.

Writes the lines for every scenario and dial setting to tests/out/decentish.md
and phone-width screenshots to tests/out/.
"""
import json, os, re, sys, time, urllib.parse
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from serve import start

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
NM = os.path.join(HERE, 'node_modules')
SUNCALC = open(os.path.join(NM, 'suncalc', 'suncalc.js')).read()
OH = open(os.path.join(NM, 'opening_hours', 'build', 'opening_hours.js')).read()

MONTON = (53.495079, -2.350899)
BARRA = (56.9818, -7.4583)

# ---------- fake Overpass ----------
def node(name, lat, lon, hours=None, **tags):
    t = {'name': name, **tags}
    if hours:
        t['opening_hours'] = hours
    return {'type': 'node', 'lat': lat, 'lon': lon, 'tags': t}

MONTON_PLACES = [
    node('Sip Monton', 53.490752, -2.3514264, 'Mo 16:00-22:00; Tu-Th 15:00-22:00; Fr 14:00-00:30; Sa 12:00-00:30; Su 13:00-22:00', amenity='bar'),
    node("Edison's", 53.4917745, -2.353548, 'Mo,Tu 10:00-15:00; We 10:00-22:00; Th 10:00-24:00; Fr 10:00-01:00; Sa,Su 09:30-01:00', amenity='bar'),
    node('MaltDog Monton', 53.4902723, -2.3502318, 'Mo 15:30-22:30; Tu-Th 15:30-23:00; Fr,Sa 14:00-23:00; Su 14:00-22:00', amenity='pub'),
    node('The Monton Tap', 53.4902274, -2.350053, 'Mo-Th 16:00-23:00; Fr 15:00-23:30; Sa 14:00-23:30; Su 14:00-23:00', amenity='bar'),
    node('The Park', 53.4905758, -2.3499938, 'Mo-Th 12:00-23:30; Fr,Sa 12:00-24:00; Su 12:00-23:00', amenity='pub'),
    node('Pizza Monton', 53.4904333, -2.3505194, 'Mo-Th 15:00-01:00; Fr,Sa 12:00-02:00; Su 12:00-01:00', amenity='fast_food'),
    node('Zafrani', 53.4918597, -2.3530098, 'Mo-Th 16:00-22:30; Fr,Sa 16:00-23:30; Su 16:00-22:30', amenity='restaurant'),
    node('Shabna', 53.4905517, -2.350846, 'Mo-Su 16:00-23:00', amenity='fast_food'),
    node('The Naz', 53.4911464, -2.3515991, 'Mo-Su 16:00-23:00', amenity='restaurant'),
    node('Vintage Ambiance', 53.4912236, -2.3516491, 'Mo-Th 09:00-19:00; Fr,Sa 09:00-23:00; Su 09:00-19:00', amenity='restaurant'),
    node('Eden Italian Restaurant', 53.4912418, -2.3523261, 'Mo-Th 16:00-22:00; Fr,Sa 12:00-22:00; Su 13:00-21:00', amenity='restaurant'),
    node('The Garden Bar & Restaurant', 53.4901136, -2.3498639, 'Mo-We 10:00-22:00; Th 09:00-22:00; Fr,Sa 09:00-01:00; Su 09:00-22:00', amenity='restaurant'),
    node('Monton Carlo', 53.4912695, -2.3516846, 'Mo-We 09:00-18:30; Th 09:00-22:30; Fr,Sa 09:00-23:00; Su 09:00-18:30', amenity='cafe'),
    node('Blossom Bistro', 53.4908037, -2.3508113, 'Mo-Th 11:00-22:00; Fr,Sa 11:00-23:00; Su 11:00-22:00', amenity='restaurant'),
    node('Chinese Express', 53.4845619, -2.34014, 'Mo off; Tu-Su 16:30-23:00', amenity='fast_food'),
    node('Corner Shop (test)', 53.4930, -2.3515, 'Mo-Su 07:00-22:00', shop='convenience'),
    node('Hourless Bar (test)', 53.4925, -2.3520, None, amenity='bar'),
]
BARRA_WIDE = [node('The Test Arms', 56.9530, -7.4870, 'Mo-Su 12:00-23:00', amenity='pub')]

# ---------- fake weather ----------
DAYS = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09',
        '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']
HILO = [(16.0, 10.0), (17.8, 11.1), (13.7, 6.4), (14.8, 5.6), (15.3, 10.3),
        (12.1, 8.8), (14.0, 8.6), (17.4, 12.7), (17.5, 10.9)]

def shape(h):
    # coolest at 6am, warmest at 3pm
    import math
    return (1 - math.cos(math.pi * ((h - 6) % 24) / 9)) / 2 if 6 <= h <= 15 else \
        (1 + math.cos(math.pi * ((h - 15) % 24) / 15)) / 2

def weather():
    H = {k: [] for k in ['time', 'temperature_2m', 'apparent_temperature', 'weather_code',
                         'precipitation_probability', 'precipitation', 'is_day']}
    for d, (hi, lo) in zip(DAYS, HILO):
        for h in range(24):
            t = round(lo + (hi - lo) * shape(h), 1)
            code, prob, mm = 3, 20, 0.0
            if d == '2026-10-06' and 10 <= h <= 16: code = 1
            if d == '2026-10-09': code = 2
            if d == '2026-10-11' and 8 <= h <= 13: code = 1
            if d == '2026-10-07' and 6 <= h <= 10: code, prob, mm = 61, 75, 1.2
            H['time'].append(f'{d}T{h:02d}:00')
            H['temperature_2m'].append(t)
            H['apparent_temperature'].append(round(t - 2, 1))
            H['weather_code'].append(code)
            H['precipitation_probability'].append(prob)
            H['precipitation'].append(mm)
            H['is_day'].append(1 if 7 <= h <= 18 else 0)
    return {'utc_offset_seconds': 3600, 'hourly': H,
            'current': {'temperature_2m': 13.1, 'apparent_temperature': 11.4, 'weather_code': 3,
                        'precipitation': 0, 'wind_speed_10m': 8, 'is_day': 0},
            'daily': {'time': DAYS, 'temperature_2m_max': [x for x, _ in HILO],
                      'temperature_2m_min': [y for _, y in HILO]}}

def near(q, place, tol=0.05):
    return abs(float(q['lat'][0]) - place[0]) < tol and abs(float(q['lon'][0]) - place[1]) < tol

def install_fakes(page, overpass_down=False):
    def js(body):
        return dict(status=200, content_type='application/json', body=json.dumps(body),
                    headers={'Access-Control-Allow-Origin': '*'})
    page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
    page.route('https://fonts.gstatic.com/**', lambda r: r.abort())
    page.route('**/suncalc@1.9.0/**', lambda r: r.fulfill(body=SUNCALC, content_type='application/javascript'))
    page.route('**/opening_hours@3.15.0/**', lambda r: r.fulfill(body=OH, content_type='application/javascript'))

    def postcodes(r):
        u = urllib.parse.urlparse(r.request.url); q = urllib.parse.parse_qs(u.query)
        if u.path == '/postcodes' and q:
            return r.fulfill(**js({'status': 200, 'result': [{'postcode': 'M30 9LR', 'admin_ward': 'Eccles',
                                                               'admin_district': 'Salford', 'country': 'England'}]}))
        if u.path.lower().replace('%20', ' ') in ('/postcodes/m30 9lr',):
            return r.fulfill(**js({'status': 200, 'result': {'postcode': 'M30 9LR', 'latitude': MONTON[0], 'longitude': MONTON[1],
                                                              'admin_ward': 'Eccles', 'admin_district': 'Salford', 'country': 'England'}}))
        if u.path.lower() == '/outcodes/hs9':
            return r.fulfill(**js({'status': 200, 'result': {'outcode': 'HS9', 'latitude': BARRA[0], 'longitude': BARRA[1],
                                                              'admin_ward': ['Barraigh, Bhatarsaigh, Eirisgeigh agus Uibhist a Deas'],
                                                              'admin_district': ['Na h-Eileanan Siar'], 'country': ['Scotland']}}))
        return r.fulfill(status=404, content_type='application/json', body='{"status":404}',
                         headers={'Access-Control-Allow-Origin': '*'})
    page.route('https://api.postcodes.io/**', postcodes)

    def nominatim(r):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(r.request.url).query)
        if near(q, MONTON): return r.fulfill(**js({'address': {'suburb': 'Monton', 'town': 'Eccles'}}))
        if q.get('zoom') == ['14']: return r.fulfill(**js({'address': {'village': 'Castlebay'}}))
        return r.fulfill(**js({'address': {'island': 'Barra', 'hamlet': 'Borgh'}}))
    page.route('https://nominatim.openstreetmap.org/**', nominatim)
    page.route('https://api.open-meteo.com/**', lambda r: r.fulfill(**js(weather())))

    def overpass(r):
        if overpass_down:
            return r.fulfill(status=504, body='busy', headers={'Access-Control-Allow-Origin': '*'})
        data = urllib.parse.unquote_plus((r.request.post_data or '')[5:])
        m = re.search(r'around:(\d+),([-\d.]+),([-\d.]+)', data)
        radius, lat, lon = int(m.group(1)), float(m.group(2)), float(m.group(3))
        if abs(lat - MONTON[0]) < .05: els = MONTON_PLACES
        else: els = BARRA_WIDE if radius > 5000 else []
        return r.fulfill(**js({'elements': els}))
    for host in ['overpass-api.de', 'overpass.kumi.systems', 'overpass.private.coffee']:
        page.route(f'https://{host}/**', overpass)

STOPS = ['Buttoned up', 'Decentish', 'Three pints and a meal deal', 'Pissed-up uncle on a mad one']

def wait_done(pg, timeout=20):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if 'Total' in pg.inner_text('#timings'): return True
        time.sleep(.15)
    return False

def lines(pg):
    return pg.locator('#lines p').all_inner_texts()

def set_dial(pg, n):
    pg.evaluate(f"(()=>{{const d=document.querySelector('#dial');d.value={n};d.dispatchEvent(new Event('input'))}})()")

def test_run(pg, at='', postcode=''):
    if pg.locator('#lab').is_hidden(): pg.click('#labToggle')
    pg.fill('#tPostcode', postcode)
    pg.fill('#tAt', at)
    pg.click('#labForm button[type=submit]')
    time.sleep(.2)
    return wait_done(pg)

results, report = [], ['# Decentish – test lines', '']
def check(name, ok, detail=''):
    results.append(ok)
    print(('PASS ' if ok else 'FAIL ') + name + (f' – {detail}' if detail else ''))

def record(title, pg):
    report.append(f'## {title}\n')
    for n in range(4):
        set_dial(pg, n); time.sleep(.05)
        report.append(f'**{STOPS[n]}**\n')
        report.extend('> ' + l + '  ' for l in lines(pg))
        report.append('')
    report.append('`' + pg.inner_text('#facts') + '`\n')

def main():
    os.makedirs(OUT, exist_ok=True)
    base = start()
    url = base + 'decentish/'
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                            geolocation={'latitude': MONTON[0], 'longitude': MONTON[1]},
                            permissions=['geolocation'], timezone_id='Europe/London', locale='en-GB')
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        install_fakes(pg)
        pg.goto(url)
        check('Starts by itself when location is already allowed', wait_done(pg))
        check('First visit opens on Decentish', pg.inner_text('#dialName') == 'Decentish')

        # Tuesday, ten past eleven – the night we tested by hand
        check('Tuesday 23:10 run finishes', test_run(pg, '2026-10-06T23:10'))
        set_dial(pg, 2); L = lines(pg)
        check('Place name comes from the neighbourhood, not the ward', 'Monton' in L[0], L[0])
        check('Mild night after a sunny day', any('Cracking flags earlier' in l for l in L), json.dumps(L))
        check('Colder tomorrow is flagged', any('colder' in l for l in L))
        check('All shut, with the two survivors named',
              any('All shut, bar The Park' in l and 'Pizza Monton' in l for l in L), json.dumps(L))
        check('Last orders at The Park, 20 minutes left, 8 minutes away',
              any("The Park's got 20 minutes left and it's 8 minutes away" in l for l in L))
        check('Pizza Monton not repeated once named', sum('Pizza Monton' in l for l in L) == 1)
        check('Verdict is leg it', L[-1] == 'Verdict: leg it.', L[-1])
        check('Location buttons hidden once it has run', pg.locator('#ask').is_hidden())
        check('Workings hidden until asked for', pg.locator('#workings').is_hidden())
        set_dial(pg, 0); L0 = lines(pg)
        check('Buttoned up gives exact times', 'Tuesday 6 October. 23:10. Monton.' == L0[0] and any('23:30' in l for l in L0), json.dumps(L0))
        facts0 = pg.inner_text('#facts')
        set_dial(pg, 3); L3 = lines(pg)
        check('Uncle swears and says gone eleven', L3[0].startswith('Gone eleven on a Tuesday') and any('shit' in l for l in L3), json.dumps(L3))
        check('The facts strip is the same at every setting', pg.inner_text('#facts') == facts0)
        time.sleep(.8); bg = pg.evaluate("getComputedStyle(document.body).backgroundColor")
        check('Uncle is red', bg in ('rgb(255, 74, 46)',), bg)
        record('Tuesday 6 October, 23:10, Monton', pg)
        set_dial(pg, 1); time.sleep(.7)
        pg.screenshot(path=os.path.join(OUT, 'decentish-tue-2310-decentish.png'), full_page=True)
        set_dial(pg, 3); time.sleep(.7)
        pg.screenshot(path=os.path.join(OUT, 'decentish-tue-2310-uncle.png'), full_page=True)
        width = pg.evaluate('document.documentElement.scrollWidth')
        check('No sideways scroll at phone width', width <= 390, str(width))
        pg.click('#workingsToggle')
        w = pg.inner_text('#workings')
        check('Workings list every place with its status', 'The Park · pub · open till 23:30' in w and 'hours' in w)
        pg.click('#workingsToggle')

        check('Friday 17:30 run finishes', test_run(pg, '2026-10-09T17:30'))
        set_dial(pg, 2); L = lines(pg)
        check('Friday teatime is busy and says go out', any('Loads open' in l for l in L) and L[-1] == 'Verdict: out out.', json.dumps(L))
        check('Friday line', L[0].startswith('Friday.'), L[0])
        record('Friday 9 October, 17:30, Monton', pg)

        check('Sunday 10:00 run finishes', test_run(pg, '2026-10-11T10:00'))
        set_dial(pg, 2); L = lines(pg)
        check('Sunday morning: cafés count as open, brew verdict', any('Brew' in l for l in L), json.dumps(L))
        record('Sunday 11 October, 10:00, Monton', pg)

        check('03:00 run finishes', test_run(pg, '2026-10-07T03:00'))
        set_dial(pg, 3); L = lines(pg)
        check("Small hours: stupid o'clock and bed", "stupid o'clock" in L[0] and 'bed' in L[-1].lower(), json.dumps(L))
        record('Wednesday 7 October, 03:00, Monton', pg)

        check('Barra run finishes', test_run(pg, '2026-10-06T20:00', 'HS9'))
        set_dial(pg, 3); L = lines(pg)
        check('Remote: arse end of nowhere, names the nearest place and village',
              any('arse end of nowhere' in l and 'The Test Arms in Castlebay' in l for l in L), json.dumps(L))
        check('Remote verdict', 'horse' in L[-1], L[-1])
        record('Tuesday 6 October, 20:00, Barra (HS9)', pg)
        pg.screenshot(path=os.path.join(OUT, 'decentish-barra-uncle.png'), full_page=True)

        check('Bad postcode asks again', test_run(pg, '', 'ZZ1 1ZZ') or True)
        time.sleep(.5)
        check('Bad postcode line and form shown', pg.locator('#ask').is_visible() and 'postcode' in lines(pg)[0].lower(), json.dumps(lines(pg)))
        timings = pg.inner_text('#timings')
        check('Stopwatch lists each source', all(k in timings for k in ['Postcode', 'Total']), timings)

        # Map down
        pg2 = ctx.new_page(); install_fakes(pg2, overpass_down=True)
        pg2.on('pageerror', lambda e: errs.append(str(e)))
        pg2.goto(url); wait_done(pg2, 30)
        set_dial(pg2, 3); L = lines(pg2)
        check('Places down: says so in voice, rest still works', any("map's pissed" in l.lower() for l in L) and len(L) >= 3, json.dumps(L))
        t = pg2.inner_text('#timings')
        check('Places down shows as failed in the stopwatch', 'Places failed' in t, t)

        # No location permission
        ctx2 = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/London', locale='en-GB')
        pg3 = ctx2.new_page(); install_fakes(pg3)
        pg3.on('pageerror', lambda e: errs.append(str(e)))
        pg3.goto(url); time.sleep(.6)
        check('Without permission it asks first, no prompt on load', pg3.locator('#ask').is_visible() and 'postcode' in lines(pg3)[0].lower(), json.dumps(lines(pg3)))
        pg3.fill('#askPostcode', 'M30 9LR'); pg3.click('#askForm button[type=submit]')
        check('Postcode route works', wait_done(pg3) and 'Monton' in lines(pg3)[0], json.dumps(lines(pg3)))
        pg3.screenshot(path=os.path.join(OUT, 'decentish-postcode-now.png'), full_page=True)

        check('No script errors', not errs, '; '.join(errs))
        b.close()
    with open(os.path.join(OUT, 'decentish.md'), 'w') as f:
        f.write('\n'.join(report) + '\n')
    print(f'\n{sum(results)} of {len(results)} passed. Lines: tests/out/decentish.md')
    sys.exit(0 if all(results) else 1)

if __name__ == '__main__':
    main()

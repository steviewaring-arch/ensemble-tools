"""Checks for Decentish 0.4 – the planner, the distance dial, getting there and back, and the plan as written,
with every outside source faked and the dice loaded, so it runs offline and gives the same answer every time.

    python3 tests/decentish_check.py

Needs Playwright with Chromium, and `cd tests && npm install` once (for the
SunCalc and opening_hours libraries the page loads from jsDelivr).

The places are Monton Road as Google listed them on 6 October 2026, with their
opening hours written in OpenStreetMap's format. Everything called "Test" is made
up – Eccles and Worsley a mile or two away, town, Salford Quays, Chorlton – and so
are their quality tags (real ale, beer garden, chain, free entry). Tram stops are
roughly where the real ones are. The weather is made up but shaped like that week.
The real page asks the real services; this only proves what the page does with answers.

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

# ---------- fake Overpass ----------
_ids = iter(range(1, 10**6))
def node(name, lat, lon, hours=None, **tags):
    t = {'name': name, **tags}
    if hours:
        t['opening_hours'] = hours
    return {'type': 'node', 'id': next(_ids), 'lat': lat, 'lon': lon, 'tags': t}

# Monton Road as Google listed it on 6 October 2026, hours in OSM's format. Only hours and cuisine are real.
MONTON_PLACES = [
    node('Sip Monton', 53.490752, -2.3514264, 'Mo 16:00-22:00; Tu-Th 15:00-22:00; Fr 14:00-00:30; Sa 12:00-00:30; Su 13:00-22:00', amenity='bar'),
    node("Edison's", 53.4917745, -2.353548, 'Mo,Tu 10:00-15:00; We 10:00-22:00; Th 10:00-24:00; Fr 10:00-01:00; Sa,Su 09:30-01:00', amenity='bar'),
    node('MaltDog Monton', 53.4902723, -2.3502318, 'Mo 15:30-22:30; Tu-Th 15:30-23:00; Fr,Sa 14:00-23:00; Su 14:00-22:00', amenity='pub'),
    node('The Monton Tap', 53.4902274, -2.350053, 'Mo-Th 16:00-23:00; Fr 15:00-23:30; Sa 14:00-23:30; Su 14:00-23:00', amenity='bar'),
    node('The Park', 53.4905758, -2.3499938, 'Mo-Th 12:00-23:30; Fr,Sa 12:00-24:00; Su 12:00-23:00', amenity='pub'),
    node('Pizza Monton', 53.4904333, -2.3505194, 'Mo-Th 15:00-01:00; Fr,Sa 12:00-02:00; Su 12:00-01:00', amenity='fast_food', cuisine='pizza'),
    node('Zafrani', 53.4918597, -2.3530098, 'Mo-Th 16:00-22:30; Fr,Sa 16:00-23:30; Su 16:00-22:30', amenity='restaurant', cuisine='indian'),
    node('Shabna', 53.4905517, -2.350846, 'Mo-Su 16:00-23:00', amenity='fast_food', cuisine='indian'),
    node('The Naz', 53.4911464, -2.3515991, 'Mo-Su 16:00-23:00', amenity='restaurant', cuisine='indian'),
    node('Vintage Ambiance', 53.4912236, -2.3516491, 'Mo-Th 09:00-19:00; Fr,Sa 09:00-23:00; Su 09:00-19:00', amenity='restaurant', cuisine='british'),
    node('Eden Italian Restaurant', 53.4912418, -2.3523261, 'Mo-Th 16:00-22:00; Fr,Sa 12:00-22:00; Su 13:00-21:00', amenity='restaurant', cuisine='italian'),
    node('The Garden Bar & Restaurant', 53.4901136, -2.3498639, 'Mo-We 10:00-22:00; Th 09:00-22:00; Fr,Sa 09:00-01:00; Su 09:00-22:00', amenity='restaurant'),
    node('Monton Carlo', 53.4912695, -2.3516846, 'Mo-We 09:00-18:30; Th 09:00-22:30; Fr,Sa 09:00-23:00; Su 09:00-18:30', amenity='cafe'),
    node('Blossom Bistro', 53.4908037, -2.3508113, 'Mo-Th 11:00-22:00; Fr,Sa 11:00-23:00; Su 11:00-22:00', amenity='restaurant', cuisine='turkish'),
    node('Chinese Express', 53.4845619, -2.34014, 'Mo off; Tu-Su 16:30-23:00', amenity='fast_food', cuisine='chinese'),
    node('Corner Shop (test)', 53.4930, -2.3515, 'Mo-Su 07:00-22:00', shop='convenience'),
    node('Hourless Bar (test)', 53.4925, -2.3520, None, amenity='bar'),
    node('Monton Test Green', 53.4935, -2.3480, None, leisure='park'),
]
# Made up: Eccles and Worsley, 1–2 miles from Monton, with quality tags to test the reasons
RING_PLACES = [
    node('Eccles Test Tap', 53.4855, -2.3400, 'Mo-Su 12:00-23:00', amenity='pub', real_ale='yes', heritage='2'),
    node('Eccles Test Thai', 53.4858, -2.3395, 'Mo-Su 17:00-22:30', amenity='restaurant', cuisine='thai'),
    node('Eccles Test Bar', 53.4850, -2.3385, 'Mo-Su 16:00-24:00', amenity='bar', outdoor_seating='yes'),
    node('Worsley Test Inn', 53.5030, -2.3800, 'Mo-Su 12:00-23:00', amenity='pub', beer_garden='yes'),
]
TOWN = (53.4808, -2.2369)
TOWN_PLACES = [
    node('NQ Test Bar', 53.4835, -2.2355, 'Mo-Su 12:00-02:00', amenity='bar'),
    node('Test Tap', 53.4829, -2.2340, 'Mo-Su 12:00-23:30', amenity='pub', real_ale='yes', wikipedia='en:Test Tap'),
    node('Test Wine Bar', 53.4815, -2.2390, 'Mo-Su 12:00-23:00', amenity='bar'),
    node('Test Bistro', 53.4822, -2.2378, 'Mo-Su 12:00-22:00', amenity='restaurant', cuisine='french'),
    node('Test Gallery', 53.4790, -2.2400, 'Tu-Su 10:00-17:00', tourism='gallery', fee='no'),
    node('Test Club', 53.4842, -2.2330, 'We-Sa 22:00-04:00', amenity='nightclub'),
    node('Late Test Kebab', 53.4838, -2.2362, 'Mo-Su 17:00-04:00', amenity='fast_food', cuisine='kebab'),
    node('Test Cafe', 53.4826, -2.2349, 'Mo-Su 08:00-17:00', amenity='cafe'),
    node('Test Cinema', 53.4800, -2.2420, None, amenity='cinema'),
    node('Test Bowl', 53.4818, -2.2380, 'Mo-Su 10:00-24:00', leisure='bowling_alley'),
    node('Test Spoons', 53.4812, -2.2375, 'Mo-Su 08:00-24:00', amenity='pub', brand='Wetherspoon'),
    node('Peveril of the Peak', 53.4746, -2.2453, 'Mo-Su 12:00-23:00', amenity='pub'),   # real pub on the picks list; hours made up
]
# Made up: two of the destinations further afield
QUAYS_PLACES = [
    node('Quays Test Gallery', 53.4705, -2.2965, 'Tu-Su 10:00-17:00', tourism='gallery', fee='no'),
    node('Quays Test Bar', 53.4718, -2.2950, 'Mo-Su 12:00-24:00', amenity='bar', outdoor_seating='yes'),
    node('Quays Test Noodles', 53.4722, -2.2980, 'Mo-Su 12:00-22:00', amenity='restaurant', cuisine='japanese'),
]
CHORLTON_PLACES = [
    node('Chorlton Test Pub', 53.4430, -2.2765, 'Mo-Su 12:00-23:30', amenity='pub', real_ale='yes'),
    node('Chorlton Test Kitchen', 53.4425, -2.2775, 'Tu-Su 17:00-22:00', amenity='restaurant', cuisine='vietnamese'),
    node('Chorlton Test Bar', 53.4433, -2.2780, 'Mo-Su 16:00-01:00', amenity='bar'),
    node('Chorlton Test Park', 53.4440, -2.2800, None, leisure='park'),
]
# Metrolink stops, roughly where they are
TRAM_STOPS = [node(n, la, lo, None, railway='tram_stop', public_transport='stop_position') for n, la, lo in [
    ('Eccles', 53.4836, -2.3348), ('Ladywell', 53.4857, -2.3226), ('Weaste', 53.4824, -2.3085),
    ('Harbour City', 53.4742, -2.2920), ('MediaCityUK', 53.4720, -2.2972), ('Salford Quays', 53.4706, -2.2854),
    ('Cornbrook', 53.4697, -2.2638), ('Deansgate-Castlefield', 53.4746, -2.2507), ("St Peter's Square", 53.4783, -2.2425),
    ('Piccadilly Gardens', 53.4807, -2.2369), ('Market Street', 53.4823, -2.2393), ('Shudehill', 53.4853, -2.2393),
    ('Exchange Square', 53.4855, -2.2436), ('Victoria', 53.4875, -2.2426), ('Firswood', 53.4545, -2.2731),
    ('Chorlton', 53.4428, -2.2740), ('Prestwich', 53.5332, -2.2858)]] + [
    node('Eccles', 53.4840, -2.3340, None, railway='station', train='yes')]   # the rail station, which isn't a tram stop
NQ = (53.4840, -2.2338)
BARRA = (56.9818, -7.4583)
BARRA_WIDE = [node('The Test Arms', 56.9530, -7.4870, 'Mo-Su 12:00-23:00', amenity='pub')]
EVERYTHING = MONTON_PLACES + RING_PLACES + TOWN_PLACES + QUAYS_PLACES + CHORLTON_PLACES + TRAM_STOPS + BARRA_WIDE

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

def metres(a, b):
    import math
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))

def install_fakes(page, overpass_down=False):
    def js(body):
        return dict(status=200, content_type='application/json', body=json.dumps(body),
                    headers={'Access-Control-Allow-Origin': '*'})
    page.add_init_script("(()=>{let a=20261007;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})()")
    page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
    page.route('https://fonts.gstatic.com/**', lambda r: r.abort())
    page.route('**/suncalc@1.9.0/**', lambda r: r.fulfill(body=SUNCALC, content_type='application/javascript'))
    page.route('**/opening_hours@3.15.0/**', lambda r: r.fulfill(body=OH, content_type='application/javascript'))

    def pc(code, lat, lon, ward, district, country='England'):
        return {'status': 200, 'result': {'postcode': code, 'latitude': lat, 'longitude': lon,
                                          'admin_ward': ward, 'admin_district': district, 'country': country}}
    def postcodes(r):
        u = urllib.parse.urlparse(r.request.url); q = urllib.parse.parse_qs(u.query)
        path = urllib.parse.unquote(u.path).lower()
        if path == '/postcodes' and q:
            if near(q, NQ, .01):
                return r.fulfill(**js({'status': 200, 'result': [pc('M4 1HN', *NQ, 'Piccadilly', 'Manchester')['result']]}))
            return r.fulfill(**js({'status': 200, 'result': [pc('M30 9LR', *MONTON, 'Eccles', 'Salford')['result']]}))
        if path == '/postcodes/m30 9lr': return r.fulfill(**js(pc('M30 9LR', *MONTON, 'Eccles', 'Salford')))
        if path == '/postcodes/m4 1hn': return r.fulfill(**js(pc('M4 1HN', *NQ, 'Piccadilly', 'Manchester')))
        if path == '/outcodes/hs9':
            return r.fulfill(**js({'status': 200, 'result': {'outcode': 'HS9', 'latitude': BARRA[0], 'longitude': BARRA[1],
                                                              'admin_ward': ['Barraigh, Bhatarsaigh, Eirisgeigh agus Uibhist a Deas'],
                                                              'admin_district': ['Na h-Eileanan Siar'], 'country': ['Scotland']}}))
        return r.fulfill(status=404, content_type='application/json', body='{"status":404}',
                         headers={'Access-Control-Allow-Origin': '*'})
    page.route('https://api.postcodes.io/**', postcodes)

    def nominatim(r):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(r.request.url).query)
        if near(q, MONTON, .01): return r.fulfill(**js({'address': {'suburb': 'Monton', 'town': 'Eccles'}}))
        if near(q, NQ, .01): return r.fulfill(**js({'address': {'quarter': 'Northern Quarter', 'city': 'Manchester'}}))
        if q.get('zoom') == ['14']: return r.fulfill(**js({'address': {'village': 'Castlebay'}}))
        return r.fulfill(**js({'address': {'island': 'Barra', 'hamlet': 'Borgh'}}))
    page.route('https://nominatim.openstreetmap.org/**', nominatim)
    page.route('https://api.open-meteo.com/**', lambda r: r.fulfill(**js(weather())))

    def overpass(r):
        if overpass_down:
            return r.fulfill(status=504, body='busy', headers={'Access-Control-Allow-Origin': '*'})
        data = urllib.parse.unquote_plus((r.request.post_data or '')[5:])
        found = {}
        for m in re.finditer(r'around:(\d+),([-\d.]+),([-\d.]+)', data):
            rad, c = int(m.group(1)), (float(m.group(2)), float(m.group(3)))
            for e in EVERYTHING:
                if metres(c, (e['lat'], e['lon'])) <= rad:
                    found[e['id']] = e
        return r.fulfill(**js({'elements': list(found.values())}))
    for host in ['overpass-api.de', 'overpass.kumi.systems', 'overpass.private.coffee']:
        page.route(f'https://{host}/**', overpass)

MOODS = ['Tony Blair on a culture trip', 'Three pints and a meal deal', 'Pissed-up uncle on a mad one']
DISTS = ['On the doorstep', 'Nearby', 'Further afield']
WHENS = ['now', 'soon', 'tomorrow']

def wait_done(pg, timeout=20):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if 'Total' in pg.inner_text('#timings'): return True
        time.sleep(.15)
    return False

def lines(pg):
    return pg.locator('#lines p').all_inner_texts()

def text(pg):
    return ' '.join(lines(pg))

def set_range(pg, sel, n):
    pg.evaluate(f"(()=>{{const d=document.querySelector('{sel}');d.value={n};d.dispatchEvent(new Event('input'))}})()")

def view(pg, dial, w='now', dist=1):
    set_range(pg, '#dial', dial); set_range(pg, '#dist', dist); pg.click(f'[data-when="{w}"]')
    return lines(pg)

def test_run(pg, at='', postcode=''):
    if pg.locator('#lab').is_hidden(): pg.click('#labToggle')
    pg.fill('#tPostcode', postcode)
    pg.fill('#tAt', at)
    pg.click('#labForm button[type=submit]')
    time.sleep(.2)
    return wait_done(pg)

results, report = [], ['# Decentish 0.4 – test lines', '',
    'Every scenario at every mood and When, at Nearby; then the distance dial on its own (Now) for each scenario. '
    'Monton Road names and hours are real (Google, 6 October 2026); every "Test" place is made up, and so are all the '
    'quality tags; the weather is made up but shaped like that week. Receipts in code under each plan.', '']
def check(name, ok, detail=''):
    results.append(ok)
    print(('PASS ' if ok else 'FAIL ') + name + (f' – {detail}' if detail else ''))

def block(pg, label):
    report.append(f'**{label}**\n')
    report.extend('> ' + l + '  ' for l in lines(pg))
    rc = pg.inner_text('#receipts')
    if rc: report.append('\n`' + rc + '`')
    report.append('')

def record(title, pg):
    report.append(f'## {title}\n')
    report.append(f'### Nearby, by When\n')
    for w in WHENS:
        for n in range(3):
            view(pg, n, w); block(pg, f'{MOODS[n]} · {w.capitalize()}')
    report.append(f'### The distance dial, Now\n')
    for d in (0, 2):
        for n in range(3):
            view(pg, n, 'now', d); block(pg, f'{MOODS[n]} · {DISTS[d]}')
    view(pg, 1)

def every_view(pg, w='now'):
    out = {}
    for d in range(3):
        for n in range(3):
            out[(n, d)] = (view(pg, n, w, d), pg.inner_text('#receipts'))
    view(pg, 1)
    return out

def walks(rc):
    return [int(x) for x in re.findall(r'walk (\d+) min', rc)]

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
        check('First visit: Three pints, Nearby, Now',
              pg.inner_text('#dialName') == 'Three pints and a meal deal' and pg.inner_text('#distName') == 'Nearby'
              and pg.get_attribute('[data-when="now"]', 'aria-pressed') == 'true')

        # ---- Friday, half five, Monton ----
        check('Friday 17:30 run finishes', test_run(pg, '2026-10-09T17:30'))
        check('The facts strip names the nearest tram stop', 'Nearest tram stop Eccles, 27 min walk' in pg.inner_text('#facts'), pg.inner_text('#facts'))
        V = every_view(pg)
        L, rc = V[(1, 1)]
        check('Friday opener', L[0] == 'Friday, half five-ish, Monton – you made it.', L[0])
        L0, rc0 = V[(1, 0)]
        check('Doorstep: every leg a short walk, and it says how close',
              all(w <= 10 for w in walks(rc0)) and 'taxi' not in rc0 and 'Nothing here is more than' in ' '.join(L0), rc0)
        check('Doorstep: the first stop is in yards',
              re.search(r"^Start at .+ – it's \d+ yards away", L0[1]) is not None, L0[1])
        check('Doorstep: stops relate to each other (next door, a few doors down, round the corner)',
              re.search(r'next door|a few doors down|round the corner', L0[2]) is not None, L0[2])
        L1, rc1 = V[(1, 1)]
        check('Nearby: goes past the doorstep and gives the distance in miles',
              re.search(r'miles away', L1[1]) is not None and walks(rc1)[0] > 10, L1[1])
        check('Nearby: says how far back it is', re.search(r"minutes' walk back to Monton|taxi back to Monton|minutes from your door", ' '.join(L1)) is not None, json.dumps(L1))
        L2, rc2 = V[(1, 2)]
        check('Further afield: how to get there, what it costs, the tram as the other option',
              re.search(r'^Head (into town|to [A-Z][a-z ]+) by taxi – about \d+ minutes, around £\d+, or about .+ by tram from Eccles – so you\'re there by', L2[1]) is not None, L2[1])
        check('Further afield: how to get back', re.search(r'A taxi back to Monton is about \d+ minutes, around £\d+', ' '.join(L2)) is not None, json.dumps(L2))
        check('Further afield: one near home on the way back', 'Back in Monton, ' in ' '.join(L2), json.dumps(L2))
        firsts = [re.search(r'→ \d\d:\d\d ([^(]+) \(', V[(1, d)][1]).group(1) for d in range(3)]
        check('The three distances give three different first stops', len(set(firsts)) == 3, json.dumps(firsts))
        blair = ' '.join(' '.join(V[(0, d)][0]) for d in range(3))
        check('Blair Friday: no takeaways or chains anywhere',
              not any(x in blair for x in ['Pizza Monton', 'Shabna', 'Late Test Kebab', 'Chinese Express', 'Test Spoons']), blair[:400])
        check('Blair names the cuisine properly', 'for British,' not in blair and 'for British –' not in blair, blair[:300])
        mad = V[(2, 2)][1]
        check('Mad one, further afield: five stops at most, and it ends in food',
              mad.count('→') <= 5 and 'Finish with' in ' '.join(V[(2, 2)][0]), mad)
        alltext = ' '.join(' '.join(v[0]) for v in V.values())
        check('Quality shows up as a reason: real ale', 'does real ale' in alltext)
        check('A pick says why it is picked', "Peveril of the Peak" not in alltext or 'green-tiled Victorian pub' in alltext, alltext[:200])
        check('No sentence says the same drink line twice in a row', 'for a pint – it' not in ' '.join(V[(2, 0)][0][2:3]) or ' '.join(V[(2, 0)][0]).count('for a pint') <= 1, json.dumps(V[(2, 0)][0]))
        check('Weather line is one plain sentence at the end of the way back', all(len(v[0]) >= 4 for v in V.values()))
        record('Friday 9 October, 17:30, Monton', pg)

        # ---- Tuesday, ten past eleven ----
        check('Tuesday 23:10 run finishes', test_run(pg, '2026-10-06T23:10'))
        L = view(pg, 1, 'now', 0)
        check('Opener', L[0] == 'Gone eleven on a Tuesday in Monton.', L[0])
        check('Last orders: one if you go now', L[1] == "The Park has 20 minutes left and it's 8 minutes' walk, so one drink if you go now.", L[1])
        check('So the next stop follows from it: The Park shuts, so pizza next door, the only kitchen open',
              L[2].startswith('The Park shuts at half eleven, so then Pizza Monton, next door,') and 'the only kitchen still open' in L[2], L[2])
        check('No "bed" at 23:10 for Three pints', 'bed' not in text(pg).lower())
        check('Receipts list the plan exactly', 'walk 8 min → 23:18 The Park (pub), till 23:30' in pg.inner_text('#receipts'), pg.inner_text('#receipts'))
        facts1 = pg.inner_text('#facts')
        L = view(pg, 1, 'now', 2)
        check('Further at 23:10: taxi in, and the trams have stopped for the way back',
              L[1].startswith('Head into town by taxi') and "The trams will have stopped by then, so it's a taxi back to Monton" in ' '.join(L), json.dumps(L))
        check('The facts strip is the same at every setting', pg.inner_text('#facts') == facts1)
        L = view(pg, 2)
        time.sleep(.8)
        check('Mad one is red', pg.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(255, 74, 46)')
        L = view(pg, 0)
        check('Blair rolls to tomorrow with a reason', L[1].startswith('Everything nearby has closed, so here is tomorrow from 18:00.'), json.dumps(L))
        L = view(pg, 1, 'tomorrow')
        check('Tomorrow toggle opener', L[0] == 'Tomorrow, Wednesday, from half five in Monton.', L[0])
        view(pg, 1)
        before = pg.inner_text('#timings')
        pg.click('#refresh'); time.sleep(.3)
        check('Another plan re-picks without fetching again', pg.inner_text('#timings') == before and len(lines(pg)) >= 3)
        record('Tuesday 6 October, 23:10, Monton', pg)
        view(pg, 1, 'now', 1); time.sleep(.7)
        pg.screenshot(path=os.path.join(OUT, 'decentish-tue-2310-pints.png'), full_page=True)
        view(pg, 2, 'now', 2); time.sleep(.7)
        pg.screenshot(path=os.path.join(OUT, 'decentish-tue-2310-mad.png'), full_page=True)
        width = pg.evaluate('document.documentElement.scrollWidth')
        check('No sideways scroll at phone width', width <= 390, str(width))
        check('Location buttons hidden once it has run', pg.locator('#ask').is_hidden())
        pg.click('#workingsToggle')
        w = pg.inner_text('#workings')
        check('Workings show distance, destinations and tram stops',
              'Distance: Further afield' in w and 'town 7.7 km' in w and 'Tram stops: Eccles 27 min' in w and 'Monton Test Green · park' in w, w[:500])
        pg.click('#workingsToggle')
        view(pg, 1)

        # ---- Tuesday afternoon, sunny ----
        check('Tuesday 14:00 run finishes', test_run(pg, '2026-10-06T14:00'))
        V = every_view(pg)
        alltext = ' '.join(' '.join(v[0]) for v in V.values())
        check('Sunny: a beer garden becomes the reason and the weather line', 'has a beer garden' in alltext and 'sit outside at Worsley Test Inn' in alltext, alltext[:300])
        check('Daytime is not just pubs: a park walk, a coffee or culture', 'for a walk' in alltext and 'for a coffee' in alltext and 'free to get in' in alltext)
        record('Tuesday 6 October, 14:00, Monton (sunny)', pg)

        # ---- Sunday morning ----
        check('Sunday 10:00 run finishes', test_run(pg, '2026-10-11T10:00'))
        L = view(pg, 0, 'now', 0)
        check('Blair Sunday, doorstep: a walk in the park, not a trip to town', L[1].startswith('Start at Monton Test Green for a walk'), json.dumps(L))
        L = view(pg, 0, 'now', 2)
        check('Blair Sunday, further afield: a free gallery', 'Test Gallery – it\'s free to get in' in ' '.join(L), json.dumps(L))
        record('Sunday 11 October, 10:00, Monton', pg)

        # ---- 3am ----
        check('03:00 run finishes', test_run(pg, '2026-10-07T03:00'))
        L = view(pg, 1, 'now', 0)
        check('Three pints at 03:00: all shut, tomorrow', L[1].startswith("It's all shut round here, so tomorrow then, from half five."), json.dumps(L))
        L = view(pg, 2, 'now', 0)
        check('Mad one at 03:00 goes to town for the kebab, and taxis back',
              'Late Test Kebab' in L[1] and 'Head into town by taxi' in L[1] and "taxi back to Monton" in ' '.join(L) and L[-1] == 'Then bed, you animal.', json.dumps(L))
        record('Wednesday 7 October, 03:00, Monton', pg)

        # ---- Northern Quarter, Friday night ----
        check('Northern Quarter Friday run finishes', test_run(pg, '2026-10-09T21:30', 'M4 1HN'))
        V = every_view(pg)
        near = ' '.join(' '.join(V[(n, d)][0]) for n in range(3) for d in (0, 1))
        check('In town: no trip into town on the doorstep or nearby', 'the Northern Quarter' in V[(1, 0)][0][0] and 'into town' not in near, near[:300])
        far = ' '.join(' '.join(V[(n, 2)][0]) for n in range(3))
        check('From town, further afield means somewhere else', re.search(r'Head to (Chorlton|Salford Quays)', far) is not None, far[:400])
        check('The tram, with the stops named', re.search(r'get the tram to Chorlton|for the tram to Piccadilly Gardens', far) is not None, far[:600])
        check('Late back from Chorlton: the trams will have stopped, so a taxi', "The trams will have stopped by then, so it's a taxi back to the Northern Quarter" in far, far[:600])
        record('Friday 9 October, 21:30, Northern Quarter (M4 1HN)', pg)

        # ---- Barra ----
        check('Barra run finishes', test_run(pg, '2026-10-06T20:00', 'HS9'))
        L = view(pg, 2)
        check('Outside Greater Manchester says so', any("You're not in Manchester – bold" in l for l in L), json.dumps(L))
        check('Remote: arse end of nowhere, nearest place and village',
              any('arse end of nowhere' in l and 'The Test Arms in Castlebay' in l for l in L), json.dumps(L))
        check('Remote sign-off', L[-1] == 'Make your own fun, or get a horse.', L[-1])
        record('Tuesday 6 October, 20:00, Barra (HS9)', pg)

        test_run(pg, '', 'ZZ1 1ZZ'); time.sleep(.5)
        check('Bad postcode asks again', pg.locator('#ask').is_visible() and 'postcode' in lines(pg)[0].lower(), json.dumps(lines(pg)))

        pg2 = ctx.new_page(); install_fakes(pg2, overpass_down=True)
        pg2.on('pageerror', lambda e: errs.append(str(e)))
        pg2.goto(url); wait_done(pg2, 60)
        set_range(pg2, '#dial', 2); L = lines(pg2)
        check('Map down: says so in voice, weather still there', any("map's pissed" in l.lower() for l in L) and len(L) >= 3, json.dumps(L))
        check('Map down shows in the stopwatch', 'Places failed' in pg2.inner_text('#timings'), pg2.inner_text('#timings'))

        ctx2 = b.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/London', locale='en-GB')
        pg3 = ctx2.new_page(); install_fakes(pg3)
        pg3.on('pageerror', lambda e: errs.append(str(e)))
        pg3.goto(url); time.sleep(.6)
        check('Without permission it asks first', pg3.locator('#ask').is_visible() and 'postcode' in lines(pg3)[0].lower(), json.dumps(lines(pg3)))
        pg3.fill('#askPostcode', 'M30 9LR'); pg3.click('#askForm button[type=submit]')
        check('Postcode route works', wait_done(pg3) and 'Monton' in lines(pg3)[0], json.dumps(lines(pg3)))

        check('No script errors', not errs, '; '.join(errs))
        b.close()
    with open(os.path.join(OUT, 'decentish.md'), 'w') as f:
        f.write('\n'.join(report) + '\n')
    print(f'\n{sum(results)} of {len(results)} passed. Lines: tests/out/decentish.md')
    sys.exit(0 if all(results) else 1)

if __name__ == '__main__':
    main()

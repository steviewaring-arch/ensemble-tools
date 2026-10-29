"""Is the map service up, and how long do Decentish's queries take? Tries each Overpass mirror with a
tiny query and then with the real 'here' query for Monton and the Northern Quarter. Prints status,
seconds and size. Run by the Decentish live check before anything else."""
import json, time, urllib.parse, urllib.request

MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
           'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
AMEN = 'pub|bar|biergarten|nightclub|restaurant|fast_food|food_court|cafe|ice_cream|cinema|theatre|arts_centre|music_venue|karaoke_box'
LEIS = 'bowling_alley|miniature_golf|escape_game|amusement_arcade'

def here(lat, lon, near=1300, ring=3000):
    a = lambda r: f'(around:{r},{lat},{lon})'
    return ('[out:json][timeout:30];(' + f'nwr{a(near)}[amenity~"^({AMEN})$"][name];' + f'nwr{a(near)}[shop~"^(convenience|alcohol)$"][name];'
            + f'nwr{a(ring)}[amenity~"^({AMEN})$"][name][opening_hours];' + f'nwr{a(ring)}[tourism~"^(gallery|museum)$"][name];'
            + f'nwr{a(ring)}[leisure~"^({LEIS})$"][name][opening_hours];' + f'nwr{a(ring)}[leisure=park][name];'
            + f'nwr{a(ring + 800)}[railway~"^(tram_stop|station)$"][name];' + ');out center tags;')

def go(url, q):
    t0 = time.time()
    try:
        req = urllib.request.Request(url, data=('data=' + urllib.parse.quote(q)).encode(), headers={'User-Agent': 'decentish-live-check'})
        body = urllib.request.urlopen(req, timeout=60).read()
        n = len(json.loads(body).get('elements', []))
        return f'200 {time.time() - t0:.1f}s {len(body) // 1024} KB {n} elements'
    except Exception as e:
        return f'{getattr(e, "code", type(e).__name__)} {time.time() - t0:.1f}s {str(e)[:80]}'

if __name__ == '__main__':
    tiny = '[out:json];node(53.48,-2.24,53.481,-2.239);out 1;'
    for m in MIRRORS:
        print(m.split('/')[2], '· tiny:', go(m, tiny), flush=True)
        print(m.split('/')[2], '· Monton:', go(m, here(53.495, -2.351)), flush=True)
        print(m.split('/')[2], '· Northern Quarter:', go(m, here(53.484, -2.234)), flush=True)
        time.sleep(3)

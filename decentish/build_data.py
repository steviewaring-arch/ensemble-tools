"""Decentish's own copy of the map: every place it can use in Greater Manchester, in small area files.

Run by the "Decentish data" workflow every Monday (and on demand). It downloads the Greater Manchester
extract of OpenStreetMap from Geofabrik, keeps only what Decentish uses, and writes:

  decentish/data/manifest.json     what's here, when it was built, the grid
  decentish/data/cells/<key>.json  the places in each grid cell (about 2.2 km × 2 km)
  decentish/data/seen.json         the date each place first appeared in a build – how "new" is spotted

The page loads the cells around you instead of asking the public map servers, which were failing in the
live check (29 October 2026). Outside Greater Manchester it still asks the map servers.

    python3 decentish/build_data.py places.geojsonseq

The input is `osmium export` output (see .github/workflows/decentish-data.yml). Map data © OpenStreetMap
contributors, ODbL – the page credits it.
"""
import datetime as dt, json, math, os, sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'data')
CELL = (0.02, 0.03)          # degrees of latitude, longitude: about 2.2 km × 2 km in Manchester
KEEP = {                     # the tags the page reads; everything else is dropped
    'amenity', 'tourism', 'leisure', 'shop', 'railway', 'station', 'public_transport', 'tram', 'network', 'train',
    'cuisine', 'opening_hours', 'real_ale', 'drink:real_ale', 'microbrewery', 'outdoor_seating', 'beer_garden',
    'heritage', 'heritage:operator', 'listed_status', 'wikipedia', 'fee', 'brand', 'brand:wikidata', 'food',
    'website', 'contact:website', 'addr:city', 'addr:town', 'addr:village', 'addr:suburb', 'sport', 'live_music',
    'reservation', 'check_date', 'check_date:opening_hours', 'opening_hours:check_date', 'start_date', 'diet:vegan',
    'description', 'wheelchair',
}

def centre(geom):
    t, c = geom['type'], geom['coordinates']
    if t == 'Point': return c[1], c[0]
    if t == 'Polygon': ring = c[0]
    elif t == 'MultiPolygon': ring = max((p[0] for p in c), key=len)
    elif t == 'LineString': ring = c
    else: return None
    return sum(p[1] for p in ring) / len(ring), sum(p[0] for p in ring) / len(ring)

def area(geom):
    """Square metres of a polygon's outer ring, roughly – enough to tell a park from a square of grass."""
    t, c = geom['type'], geom['coordinates']
    rings = [c[0]] if t == 'Polygon' else [p[0] for p in c] if t == 'MultiPolygon' else \
        [c] if t == 'LineString' and len(c) > 3 and c[0] == c[-1] else []    # osmium can give a closed way as a line
    total = 0
    for ring in rings:
        lat0 = math.radians(ring[0][1]); kx, ky = 111320 * math.cos(lat0), 110540
        pts = [(x * kx, y * ky) for x, y in ring]
        total += abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts)))) / 2
    return round(total) if total else None

def main(src):
    today = dt.date.today().isoformat()
    seen_path = os.path.join(OUT, 'seen.json')
    seen = json.load(open(seen_path)) if os.path.exists(seen_path) else {'baseline': today, 'ids': {}}
    cells, kinds, kept = defaultdict(list), Counter(), set()
    lat0 = lon0 = 90; lat1 = lon1 = -180
    with open(src, encoding='utf-8') as f:
        for line in f:
            line = line.strip().lstrip('\x1e')
            if not line: continue
            feat = json.loads(line)
            props = feat.get('properties', {})
            if not props.get('name') or not feat.get('geometry'): continue
            c = centre(feat['geometry'])
            if not c: continue
            lat, lon = round(c[0], 6), round(c[1], 6)
            oid = props.get('@type', 'n')[0] + str(props.get('@id'))
            if oid in kept: continue
            kept.add(oid)
            tags = {k: v for k, v in props.items() if k in KEEP}
            first = seen['ids'].setdefault(oid, today)
            ts = props.get('@timestamp')    # osmium gives seconds since 1970; other tools an ISO date
            edited = dt.datetime.fromtimestamp(ts, dt.timezone.utc).date().isoformat() if isinstance(ts, (int, float)) else (ts or '')[:10]
            rec = {'i': oid, 'n': props['name'], 'a': lat, 'o': lon, 't': tags, 'v': props.get('@version'), 'e': edited, 's': first}
            if tags.get('leisure') == 'park': rec['m2'] = area(feat['geometry'])
            cells[f'{math.floor(lat / CELL[0])}_{math.floor(lon / CELL[1])}'].append(rec)
            kinds[tags.get('amenity') or tags.get('tourism') or tags.get('leisure') or tags.get('shop') or tags.get('railway') or '?'] += 1
            lat0, lat1, lon0, lon1 = min(lat0, lat), max(lat1, lat), min(lon0, lon), max(lon1, lon)
    # forget places that have gone, so a place that comes back counts as new again
    seen['ids'] = {k: v for k, v in seen['ids'].items() if k in kept}
    cdir = os.path.join(OUT, 'cells')
    os.makedirs(cdir, exist_ok=True)
    for old in os.listdir(cdir):
        if old[:-5] not in cells: os.remove(os.path.join(cdir, old))
    for key, recs in cells.items():
        recs.sort(key=lambda r: r['i'])
        with open(os.path.join(cdir, key + '.json'), 'w', encoding='utf-8') as f:
            json.dump(recs, f, ensure_ascii=False, separators=(',', ':'))
    manifest = {'built': today, 'source': 'OpenStreetMap via Geofabrik (Greater Manchester extract), © OpenStreetMap contributors, ODbL',
                'baseline': seen['baseline'], 'cell': list(CELL), 'bbox': [lat0, lon0, lat1, lon1],
                'places': len(kept), 'cells': {k: len(v) for k, v in sorted(cells.items())}, 'kinds': dict(kinds.most_common())}
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    with open(seen_path, 'w', encoding='utf-8') as f:
        json.dump(seen, f, separators=(',', ':'), sort_keys=True)
    print(f"{len(kept)} places in {len(cells)} cells, bbox {manifest['bbox']}")
    print(', '.join(f'{k} {v}' for k, v in kinds.most_common(25)))

if __name__ == '__main__':
    main(sys.argv[1])

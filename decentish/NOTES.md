# Decentish – notes (0.1, 6 October 2026)

A website that works out where you are and tells you what's going on round you – the time, the weather, what's open, what's on – in short sentences, in a voice you set with a dial. Fun on the surface, properly useful underneath. Live (unlisted) at https://steviewaring-arch.github.io/ensemble-tools/decentish/.

0.1 is a test build: real data from the sources that need no keys, a stopwatch to see how long each takes on a real phone, and a first go at the voice. The lines are placeholders for Steve to rewrite.

## How it works

`index.html` is the whole site – one file, no build step. `build.py` copies it to `docs/decentish/` after a syntax check.

1. **Locate.** The phone's location (only once the visitor taps *Use my location*, or straight away if they've allowed it before), or a postcode. Coordinates are rounded to about 100 m before they go to any other service.
2. **Gather**, all at once:
   - Postcode – postcodes.io (no key)
   - Place name – OpenStreetMap's Nominatim, so it says *Monton*, not the ward (*Eccles*)
   - Weather – Open-Meteo (no key; free for non-commercial use, needs a credit line before launch). Pulls yesterday to a week ahead, so it knows what earlier today was like and what tomorrow brings.
   - Sunrise and sunset – worked out on the phone, no service
   - Places – OpenStreetMap via Overpass (no key): pubs, bars, restaurants, cafés, takeaways, shops, cinemas within about a 20-minute walk, with opening hours. Falls back to two mirror servers.
   - Opening hours are read by the opening_hours library (from jsDelivr) at the visitor's time.
3. **Judge.** Local means 15 minutes on foot. The moment is one of: *buzzing* (4+ places open), *all shut* (plenty about, little open), *quiet* (under 6 places), *far* (nothing within 15 minutes, something within 20), *remote* (nothing at all – then it searches 10 miles out for the nearest pub or café and the village it's in), or *busy, hours unknown*. Plus: last orders (nearest open pub closing within 45 minutes, and whether you'd make it), the first place to open again, time of day, Friday, weekend.
4. **Write.** Slots in a fixed order: when and where, weather, tomorrow, what's about, last orders, food, verdict. Each slot is a list of rules, most specific first; the first one that fits writes the line. Every rule has four versions, one per dial setting.
5. **Show.** Lines appear as their source lands; until then each slot shows a loading line in the dial's voice. The facts strip at the foot is exact and never changes colour.

## Editing the lines

Everything Steve needs is in `BANK`, `LOADING`, `FAILED`, `START` and `DENIED` in `index.html`. A rule looks like:

```js
R('lastOrders',()=>!!F.sit.lastOrders,
  "{drink} closes at {drinkCloses}. It's {drinkWalk} minutes' walk.",          // Buttoned up
  "{drink} shuts at {drinkCloses}. {drinkWalk} minutes' walk. Doable.",         // Decentish
  "{drink}'s got {drinkMinsLeft} minutes left and it's {drinkWalk} minutes away. That's one if you leg it.",  // Three pints
  "{drink} shuts in {drinkMinsLeft} minutes. {drinkWalk} minutes away. RUN.")   // Uncle
```

- Any of the four can be a list – `["line one", "line two"]` – and one is picked at random each refresh.
- `{word}` fills from the facts. `{Word}` with a capital fills and capitalises. `{drink}'s` turns into *is* or *has* after a name that already ends in s (*Edison's is…*).
- Times in useful facts (closing, sunset, rain) are exact at every setting – *23:30* when buttoned up, *half eleven* above that. The clock in the opening line gets vaguer as the dial goes up: *23:10*, *ten past eleven*, *gone eleven*, *stupid o'clock*.
- Fills available: place, weekday, date, time24, timeWords, timeVague, temp, feels, cond, condShort, sunset, sunrise, tomMax, tomMin, drop, rise, rainAt, drink, drinkWalk, drinkCloses, drinkMinsLeft, food, foodShort, foodWalk, foodCloses, cafe, cafeWalk, shop, shopCloses, anyOpen, anyWalk, nOpen, nShut, nKnown, nTotal, openList, firstOpen, firstOpenTime, nearest, nearestIn, nearestMiles, nearestWalk.

After changing lines: `python3 build.py`, `python3 tests/decentish_check.py` (it writes every line for every scenario to `tests/out/decentish.md` – the easiest way to read them all), commit, push.

## Testing on a phone

Open the link, tap *Use my location*. The stopwatch under the facts shows each source's time and the total. *Test* lets you run any postcode at any time (Friday 17:30, Saturday 23:00, Sunday 10:00, 03:00, a remote Hebridean postcode). *Workings* lists every place it found with its open/shut status and raw hours – the way to check it against the street.

## Known gaps in 0.1

- Not wired up yet (they need keys, so they need a small server-side function first): trams (TfGM), trains (Rail Data Marketplace), gigs (Skiddle, Ticketmaster), film times, Google ratings, food hygiene (FSA – no key, but it needs a version header, untested from a browser, so it goes through the function too).
- Opening hours are only as good as OpenStreetMap. Places with no hours on the map count as unknown, never as open.
- No caching yet, so every refresh asks every service. Fine for testing; not for launch.
- Overpass's public servers are shared and sometimes slow or busy. The stopwatch will show how bad that is from a phone.
- Diatype Bold is used only where it's installed on the device. For everyone else it's Hanken Grotesk Bold. To serve Diatype, drop `ABCDiatype-Bold.woff2` next to `index.html` – only if the licence covers web use.

## Next

1. Steve tests on his phone in a few places and times; check the stopwatch and the Workings list against reality.
2. Domain and hosting: decentish.co.uk, on Cloudflare (static page plus a small function for the keyed sources, with caching by grid square).
3. Keyed sources through that function: trams, trains, gigs, Google ratings, hygiene.
4. Line bank v1 – Steve rewrites, more variants per rule so refreshes don't repeat.

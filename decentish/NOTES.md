# Decentish – notes (0.4, 7 October 2026)

A website that works out where you are and gives you a plan – what to do, where, in what order, how to get there and back – the way a friend would lay it out. Fun on the surface, properly useful underneath. Live (unlisted) at https://steviewaring-arch.github.io/ensemble-tools/decentish/.

**Who it's for:** office workers and the design crowd in and around Manchester – Northern Quarter, Ancoats, Spinningfields, MediaCity, and the suburbs they go home to. No kids yet. The moments that matter most: home time (weekdays 17:00–19:30), Thursday and Friday after work, dinner breaks, Saturday.

**Where it works:** Greater Manchester. Elsewhere the basics still work and it says so in voice.

## The controls

- **Where** – your location, or a postcode.
- **When** – Now · Soon · Tomorrow.
- **How far** – three settings that now give three different kinds of plan:
  - **On the doorstep** – what's right here. First stop within 10 minutes' walk, the rest within 6 minutes of each other, nothing more than 12 from your door. Distances in yards. Ends "Nothing here is more than 9 minutes from your door."
  - **Nearby** – somewhere you wouldn't call the doorstep, up to about two miles. The first stop has to be past the doorstep (11 minutes' walk or more); it gives the distance in miles and how to get there – walk, or a taxi (with the cost) if it's over 25 minutes on foot. Then stops within 15 minutes of each other, and when there's nothing more out there it heads back towards home ("Then it's 14 minutes' walk back to Monton for a last one at MaltDog Monton"). Ends with the walk or taxi back. If nothing further out beats the doorstep, it says so ("Nothing better a bit further out, so stay close").
  - **Further afield** – a destination: town, plus the two nearest of Salford Quays, Chorlton, Didsbury, Prestwich, Sale, Altrincham, Stockport, Levenshulme, Monton, Bury and Ramsbottom that are 3.5–16 km away. There by tram or taxi (with the other as the fallback), stops within 15 minutes' walk of each other, and back the same way – with the last tram, or a taxi if the trams have stopped. From the Northern Quarter, further afield means Chorlton or the Quays, not town.
  - If nothing fits, it goes one further and says so, and only then rolls to tomorrow.
- **The dial** – three stops. Each is a profile, not just a tone of voice:

| | Tony Blair on a culture trip | Three pints and a meal deal | Pissed-up uncle on a mad one |
|---|---|---|---|
| Picks by day | A gallery or a walk in the park, coffee, more culture | Pub, a park or bowling or culture, food, pub | Pubs and bars |
| Picks by night | A gallery or park if it's light, a proper dinner, a glass of something | Pub, food, then bowling or another pub | Pubs, bars, a club, then food |
| Stops | Up to 3 | Up to 4 | Up to 5, ending in food |
| Until | 22:30 | 00:30 | Until it shuts. Won't eat before 23:00 if there's a bar open |
| Avoids | Takeaways, shops, chains | Chains, a bit | – |
| Likes | Heritage, free entry, real ale a little | Real ale, beer gardens | Staying out |
| Taxi or tram | Taxi unless the tram is within 10 minutes of it | Tram if it's within 20 minutes of the taxi | Same |

The words for the plan itself are plain for now – one voice at every setting – while the stitching gets sorted. Openers, weather lines and sign-offs keep their three voices.

## How a plan reads

Each stop is one sentence, and each sentence says how it relates to the one before:

> Start at MaltDog Monton for a pint – it's 600 yards away and is open till eleven.
> When you're hungry, Eden Italian Restaurant is round the corner for your tea – it's open till ten. Finish at The Park, round the corner – it's open till midnight.
> Nothing here is more than 9 minutes from your door. Mild enough at 15 degrees, so no need for a coat.

> Head into town by taxi – about 25 minutes, around £20, or about an hour and a quarter by tram from Eccles – so you're there by 5:55pm. Start at Test Tap for a pint – it does real ale and is open till half eleven.
> When you're hungry, Test Bistro is round the corner for French food – it's open till ten. Finish at Test Bowl, next door, for a game of bowling – it's open till midnight.
> A taxi back to Monton is about 24 minutes, around £20, or about an hour and a quarter by tram from Piccadilly Gardens. Back in Monton, Edison's is open till midnight if you want one more.

Four short paragraphs: getting there and the first stop; the rest; the way back and the weather; the sign-off.

- **How close:** next door (60 m), a few doors down (160 m), round the corner (350 m), then minutes' walk.
- **Why this one** (one reason, two at most): the only one still serving or the only kitchen still open (late, when it's true); a pick from the list below; does real ale or brews its own; in a listed building; notable enough for Wikipedia; free to get in; has a beer garden or seats outside (only said when it's dry, light and 13°C or more – and then the weather line becomes "sit outside at …"); open latest.
- **What follows from what:** when the last place shuts within 20 minutes of leaving, the next sentence starts from that ("The Park shuts at half eleven, so then Pizza Monton, next door…"). Food after drinks is "When you're hungry…"; drinks after food is "After that…". The last stop is "Finish at…" or "Finish with a curry at…".
- **The way back:** walk, taxi (minutes and rough cost) or tram (walk to which stop, which stop to, minutes, any change, then the walk). "The last tram is around midnight" after 23:00; "The trams will have stopped by then, so it's a taxi" after 23:30. If you've gone further afield or a long walk out, one near home that's still open: "Back in Monton, Edison's is open till midnight if you want one more."

## How it works

`index.html` is the whole site – one file. `build.py` copies it to `docs/decentish/` after a syntax check.

1. **Locate.** Location (only after a tap, or straight away if allowed before) or a postcode. Coordinates rounded to about 100 m before they go anywhere.
2. **Gather**, all at once: postcode and borough (postcodes.io), place name (OpenStreetMap Nominatim), weather from yesterday to a week ahead (Open-Meteo), and two map queries (OpenStreetMap via Overpass):
   - **Here:** everything within 1.3 km (hours or not – for the doorstep and the workings), anything with opening hours out to 3 km, galleries and museums, bowling, crazy golf, escape rooms, arcades and karaoke, parks, and tram stops.
   - **Further afield:** the same around town and two other destinations, if you're in Greater Manchester.
3. **Plan.** For the distance you asked for: the profile's steps in order. For each step, a place of the right kind that's within reach, open when you'd arrive and open long enough to be worth it. Scored by preference, quality, distance and a seeded bit of luck. It tries the four best first stops and keeps the best whole plan, so it doesn't strand you at a pub with nothing near it. Further afield tries each destination and keeps the best. If nothing works for Now or Soon, it rolls to tomorrow and says why – "all shut" only when most places really are.
4. **Getting about.** Tram stops come from the map; which stop follows which is a list in the page (`METROLINK`). Every line runs into town, so a trip that goes in and back out changes where it turns – at a junction (Cornbrook, Trafford Bar, St Werburgh's Road, Pomona, Harbour City) for certain, and "you may need to change in town" across the city. A ride is 2.2 minutes a stop, plus a 6-minute wait and 8 for a change; first trams 6am, last about 23:30 for planning. A taxi is the straight line × 1.3 at 28 km/h plus 3 minutes, £3.50 plus £1.60 a kilometre, rounded to £5. All estimates – there are no live times yet. Stops on the map that aren't on the list fall back to a distance estimate.
5. **Write.** The opener, the plan sentence by sentence, the way back, one weather sentence, a sign-off. Loading lines in the dial's voice until each source lands.
6. **Show.** One face, one weight. The dial changes the background: white, amber, red. The receipts at the foot – each leg, arrival time, place, kind, closing time, the way back and the time you're home – are exact and never change colour. The facts strip names the nearest tram stop.

*Another plan* re-picks from the same data straight away. After five minutes it fetches everything again.

## Quality: what counts as good

There are no ratings yet (see below), so it uses what the map knows, weighted per profile (`q` in `PROFILES`): chains (by brand tag or name, `CHAINS`), independents, real ale, own brewery, heritage, Wikipedia, free entry, beer gardens and seats outside.

**Picks** (`PICKS`) are Steve's list of places worth saying something about, keyed by name, each with a verb phrase that follows "it": `'Peveril of the Peak':'is a green-tiled Victorian pub'`. A pick scores higher and the phrase becomes the reason. Seeded with a few long-standing city-centre places (Peveril of the Peak, Sam's and Mr Thomas's chop houses, Marble Arch, the Briton's Protection, Mackie Mayor, the free galleries and museums) – check them and add your own.

## Editing the words

- **The plan:** `firstSentence`, `nextSentence` and `backSentence` in *Write: the plan, sentence by sentence*. Plain for now, on purpose – this is where the dialect pass goes once the stitching is right. What you go for is `forWhat` (a pint, another, one more, the next one, a last one; a curry; for your tea; for a game of bowling). Food words are in `FOOD`, activities in `ACT`.
- **Everything else** is in *Write: the line bank*, three versions per entry (Blair → Three pints → Mad one): `OPEN`, `OUTSIDE`, `ROLL`, `STAYLOCAL`, `WIDER`, `WEATHER`, `SIGN`, `NOPLAN`, `LOADING`, `FAILED`, `START`, `DENIED`. Any version can be a list. `{word}` fills from the facts; `{Word}` capitalises.
- **Profiles** (steps, stays, stops, quality weights) are in `PROFILES`; the distance settings in `DIST`; destinations in `HUBS`; tram and taxi estimates in `TRAM` and `TAXI`.

After changing anything: `python3 build.py`, then `python3 tests/decentish_check.py` – it writes every plan for every scenario, dial, When and distance to `tests/out/decentish.md`, the quickest way to read them all. Commit, push.

## Testing on a phone

Open the link and tap *Use my location*. The stopwatch in the small print shows each source and the total. *Test* runs any postcode at any time (shortcuts: Friday 17:30, Saturday 23:00, Sunday 10:00, 03:00, the Northern Quarter, Barra). *Workings* lists every place it found here with its status at the plan's start time and its quality tags, the destinations further afield and how many places each has, and the nearest tram stops – any marked "not on the network list" means the stop's map name doesn't match `METROLINK`, so tell me.

## Known gaps in 0.4

- **Buses.** From Monton the bus is the real way into town, and the page doesn't know buses exist, so it says taxi or an hour-plus by tram. Biggest gap. Needs Bee Network/TfGM data.
- **Live trams and the real last tram.** Times are estimates; "around midnight" is a hedge. Needs TfGM.
- **Ratings and reviews.** Needs Google Places (a Google Maps key restricted to the site works from the browser; ratings sit in Google's priciest tier, with the smallest free allowance – about 1,000 calls a month when we looked). The scoring already has a slot for it.
- Not wired up yet: trains, film times, gigs, food hygiene. Cinemas, theatres and music venues stay out of plans until their listings are in.
- The tram network list (`METROLINK`) is written from the network map; check it against TfGM's. Destination centres in `HUBS` are approximate.
- Opening hours are only as good as OpenStreetMap. No hours means it won't use the place. Parks count as open from sunrise to half an hour before sunset, when it's dry.
- The bigger map query (3 km of places with hours) is heavier in the city centre. Untested on a real phone signal.
- No caching yet: every fetch asks every service.
- Diatype Bold only where it's installed; Hanken Grotesk Bold otherwise. Drop `ABCDiatype-Bold.woff2` next to `index.html` if the licence covers web use.

## Action points

**7 October 2026, after 0.3 – make the stitching smarter (Steve).** Tone and dialect are parked until this is right.

- Lay the plan out the way a friend would: "it's this, so we can do this next, and just next door is this, then the tram home is this" – not a list of places. *0.4: one sentence per stop, each relating to the last; the way back; one near home.*
- Reviews and the best places, not just the nearest open one. *0.4: quality from the map and a picks list; ratings need Google – still to do.*
- Where I am, the nearest tram stop, how to get there and how to get back. *0.4: nearest tram stop, tram and taxi there and back, the last tram. Buses and live times still to do.*
- Not just pubs. *0.4: parks, culture, coffee, bowling and the like in the steps.*
- The distance dial has to mean something. Doorstep: what's right here. Nearby (a couple of miles): say the distances and how to get there. Further afield: same again, with the transport. *0.4: done as above.*

## Next

1. Steve: check plans against reality on the phone – especially the tram stops in *Workings* and whether the Nearby plans pick somewhere you'd actually go.
2. Then the voice: dialect and tone for the plan sentences, per dial.
3. Buses, live trams and ratings: domain and hosting (decentish.co.uk on Cloudflare) with a small server-side function and caching, then TfGM/Bee Network, Google Places ratings, gigs and a film-listings trial.
4. A hand-picked list of Manchester venues (cinemas, galleries, gig venues, the good pubs) with their own listings – grows out of `PICKS`.

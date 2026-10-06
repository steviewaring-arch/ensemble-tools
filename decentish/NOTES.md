# Decentish – notes (0.3, 7 October 2026)

A website that works out where you are and gives you a plan – what to do, where, in what order – in short sentences, in a voice you set with a dial. Fun on the surface, properly useful underneath. Live (unlisted) at https://steviewaring-arch.github.io/ensemble-tools/decentish/.

**Who it's for:** office workers and the design crowd in and around Manchester – Northern Quarter, Ancoats, Spinningfields, MediaCity, and the suburbs they go home to. No kids yet. The moments that matter most: home time (weekdays 17:00–19:30), Thursday and Friday after work, dinner breaks, Saturday.

**Where it works:** Greater Manchester. Elsewhere the basics still work and it says so in voice.

## The controls

- **Where** – your location, or a postcode.
- **When** – Now · Soon · Tomorrow.
- **How far** – On the doorstep (6 min on foot) · Walking distance (15 min) · Worth the trip (25 min, or into town). If nothing fits, it widens and says so ("Nowt on the doorstep, so a bit further"), and only then rolls to tomorrow.
- **The dial** – three stops. Each is a profile, not just a tone of voice:

| | Tony Blair on a culture trip | Three pints and a meal deal | Pissed-up uncle on a mad one |
|---|---|---|---|
| Picks | Galleries and museums by day; a proper sit-down dinner, then a glass of something | Pub, food, pub | Pubs, bars, clubs, then food – as late as it goes |
| Town | Likes it for galleries | Stays local unless it has to | Heads there in the evening, if the distance dial allows |
| Until | 22:30 | 00:30 | Until it shuts. Won't eat before 23:00 if there's a bar open |
| Avoids | Takeaways; anything it can't stay at properly | – | – |
| Precision | 23:30 | half eleven | half eleven / stupid o'clock |
| Swearing | None | Mild | Yes |
| Dialect | None | Northern (tea, dinner, a brew, owt) | Broad |
| Sentences | Full and proper, "followed by", "which is open until" | Chatty, commas and "then" | One long shout, "GO", "RUN", "non-negotiable" |

## How it works

`index.html` is the whole site – one file. `build.py` copies it to `docs/decentish/` after a syntax check.

1. **Locate.** Location (only after a tap, or straight away if allowed before) or a postcode. Coordinates rounded to about 100 m before they go anywhere.
2. **Gather**, all at once: postcode and borough (postcodes.io), place name (OpenStreetMap Nominatim – says *Monton*, not the ward), weather from yesterday to a week ahead (Open-Meteo), and every pub, bar, club, restaurant, café, takeaway, gallery, museum and shop within about 20 minutes' walk, with opening hours (OpenStreetMap via Overpass). If you're in Greater Manchester but more than 2.5 km from Piccadilly Gardens, it also fetches the city centre, and reckons the trip in at 8 minutes plus 2.6 a kilometre (Monton: about 30).
3. **Plan.** The profile's steps, in order. For each step it looks for a place of the right kind that's within reach, open when you'd arrive, and open long enough to be worth it. Scores by preference, distance and a seeded bit of luck; town gets a bonus where the profile likes town. After each step the clock moves on by a typical stay. If nothing works for Now or Soon, it rolls forward to Tomorrow and says why – "all shut" only when most places really are.
4. **Write.** Three lines: an opener (when and where, one sentence), the plan paragraph, and a sign-off. The plan paragraph is the reason if it had to widen or roll forward, then every step as one stitched sentence, then one weather sentence for the plan's hours. Loading lines in the dial's voice until each source lands.
5. **Show.** One face, one weight. The dial changes the background: white, amber, red. The receipts at the foot – each step's time, place, distance and closing time – are exact and never change colour.

*Another plan* re-picks from the same data straight away. After five minutes it fetches everything again.

## Editing the lines

All the copy is in `index.html` under *Write: the line bank*. Every entry has three versions, Blair → Three pints → Mad one.

**Plan steps are clauses, not sentences** – no capital, no full stop. The stitcher joins them and punctuates:

```js
rushed:L3(
  "{name} closes at {closes} and is {m} minutes' walk away, so one drink if you leave now",
  "{name}'s got {left} minutes left and it's {m} minutes away, so that's one if you leg it",
  "{name} shuts in {left} minutes and it's {m} minutes away, so RUN"),
```

`JOIN` sets the connectors for each stop: second step, middle steps (a list, picked at random), last step. Blair: ", followed by" … ", and finally". Three pints: ", then" … ", and". Mad one: ", then" / ", on to" … ", and". So a three-step Three pints plan comes out as *"A pint at MaltDog Monton first, 9 minutes away and open till eleven, then a curry at The Naz, just round the corner, and one for the road at The Park before it shuts at midnight."*

Everything else (openers, roll-forward, widening, weather, sign-offs) is whole sentences.

- Any version can be a list – `["Sorted.","Decent-ish."]` – and one is picked per plan.
- `{word}` fills from the facts; `{Word}` fills and capitalises. `{name}'s` becomes *is* or *has* after a name ending in s.
- Sets: `OPEN` (opening line by When, with Friday and small-hours specials), `T` (plan step clauses by kind – culture, cafe, food, pub, bar, club, shop – and position: first, next, last; plus `rushed` for last orders and `townHop` for the trip into town), `JOIN`, `TRAVEL`, `ROLL` (rolling forward), `WIDER` (widening the distance), `WEATHER` (rain now, rain later, cold, sunny, sunny earlier, mild, anything else), `SIGN` (small hours, tomorrow, day, evening), `NOPLAN` (remote, hours unknown, nothing), `OUTSIDE`, `LOADING`, `FAILED`, `START`, `DENIED`.
- Fills in step clauses: name, m (minutes), travel, left, closes, townWords (*half an hour*), what (cuisine: *Indian* for Blair, *a curry* otherwise; *chippy tea*; *scran* when the map doesn't say), whatParen (Blair's " (Indian)", dropped when the name already says it), meal (Blair: lunch/dinner; otherwise dinner/tea), mealFor (*for your tea*).
- Profiles (who picks what, how late) are in `PROFILES` at the top of the script; distances in `DIST`.

After changing anything: `python3 build.py`, then `python3 tests/decentish_check.py` – it writes every line for every scenario, dial and When to `tests/out/decentish.md`, which is the quickest way to read them all. Commit, push.

## Testing on a phone

Open the link and tap *Use my location*. The stopwatch in the small print shows each source and the total. *Test* runs any postcode at any time (shortcuts: Friday 17:30, Saturday 23:00, Sunday 10:00, 03:00, the Northern Quarter, Barra). *Workings* lists every place it found with its status at the plan's start time, so you can check it against the street.

## Known gaps in 0.2

- Not wired up yet (they need keys, so they need a small server-side function): film times, gigs, trams, trains, Google ratings, food hygiene. Cinemas, theatres and music venues are left out of plans until their listings are in – an open cinema says nothing about what's on.
- Opening hours are only as good as OpenStreetMap. No hours means it won't use the place.
- The trip into town is an estimate, not a timetable.
- No caching yet: every fetch asks every service.
- Diatype Bold only where it's installed; Hanken Grotesk Bold otherwise. Drop `ABCDiatype-Bold.woff2` next to `index.html` if the licence covers web use.

## Next

1. Steve: check plans against reality on the phone, and rewrite the line bank.
2. A hand-picked list of Manchester venues (cinemas, galleries, gig venues, the good pubs) with their own listings – the way to get films and exhibitions in.
3. Domain and hosting (decentish.co.uk on Cloudflare) with the server-side function and caching; then gigs, trams, ratings and a film-listings trial.

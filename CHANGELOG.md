# Changelog

## 7 October 2026 – Tempo 0.2

**Tempo 0.2**
- New: **In words**, a third option under Show. The time is written out as a sentence and set Swiss-style – flush left, ragged right, tight leading: “It is eleven forty seven and fifty nine seconds on Wednesday the twenty eighth of October twenty twenty six”.
  - Always the time and date of the computer it's on, so a screen saver downloaded in New York shows New York's. Nothing is fetched; it works offline.
  - Looks: six starting points for the screen savers Ensemble ships – Reference, Stack, Poster, Night, Typewriter, Hours – each one click. Exports are named after the look (“Tempo Stack”) unless you type a name, so variants don't replace each other when installed.
  - Sentence: every part switches on and off – It is, time, seconds, day, date, month, year, full stop – and the grammar closes up around what's left (“It is nine forty in November”, “It is Tuesday the third of November”).
  - Typesetting: lines break only between phrases (“eleven forty seven”, “the twenty eighth”, “twenty twenty six” stay whole) and never end on “on”, “the”, “of”, “in” or “and”. A phrase too long for the line gives way after “It is” first, then between hours and minutes. A short last phrase pulls a neighbour down rather than sitting alone. Optical margin lines each line's ink up on the margin. Word spacing.
  - Layout: Paragraph, or Stacked (one phrase to a line). Size: set it, or Fit the screen – sized for the longest sentence the settings can make, so the type never changes size as the time does.
  - Type: sentence case, lower case or capitals; numbers in words or figures; highlight the time, the latest change, the time and date in their own colours, or nothing, optionally in another loaded style (a bold, say); line spacing, tracking and line length. Always one typeface and one size.
  - Tried and set aside for now: place, sunrise and sunset, and weather. A screen saver can't ask where it is, and Ensemble's variants must be right wherever they're installed. The working version is in commit `c0cc72c` for the planned website.
  - Change: Roll, Fade, Type or Cut; whole words or only the letters that changed; small reflows glide, bigger ones leave and arrive like a departure board. Play a change replays one in the preview.
  - Position and colour: align, vertical position, margin and drift; six starter themes (Apricot, from Steve’s reference, then Red, Paper, Night, Signal, Ultraviolet) or your own three colours; optional theme change on the hour.
  - Exports to HTML, Mac and Windows as the clock does. Every letter and figure the sentence can use is baked in.
- New: **Mixed type**, a fourth option under Show (the four now sit two by two). The time in words, carried by a plain base face (a Swiss face such as Diatype), with display faces coming in and out of it. A first pass with options to try, for Steve to refine.
  - Typefaces card: the base face, then how the display faces come in – **Each part** (It is, time, seconds, day, date, month and year each set to the base face, a face of its own, or Shuffle), **Latest change** (whatever just changed arrives in a display face and goes back at the next change) or **One part at a time** (a single part featured, moving on each change, minute or hour).
  - Shuffle takes a new face when the part's words change, or every minute or hour, and never the same face twice running. Display faces are the styles ticked “Use in style swaps” in Fonts, apart from the base face.
  - Options: a face for each word; little words (on, the, of, in, and) stay in the base face; match cap heights, so every face's capitals stand as tall as the base face's. Tracking tightens the base face only – display faces keep their own spacing.
  - Highlight can colour the display faces. Fit leaves room for the widest display face a word could take, so the size still never changes.
  - Four looks to start: Social (after Steve's Summer Social posters: Acid grey and yellow, stacked, the time and the day shuffled), Latest, Spotlight and Medley. New Acid theme (#D5D7D6 and #F7FD70).
  - Exports to HTML, Mac and Windows with every face baked in. In words and clock exports carry nothing of it.
- Fixed: Laptop, Display and Portrait now move their highlight when clicked.
- Exports say Tempo, not Rubato: “Made with Tempo by Ensemble” in the read-mes, Tempo as the name when no font is loaded, `window.__TEMPO__` inside the page, and the Windows host’s about box and folder (`%LOCALAPPDATA%\Tempo Screen Savers`). The Windows host was rebuilt with zig 0.16.0, which rebuilds the 0.1 source byte for byte, so only the wording changed.
- Clock and Saved looks work and look exactly as before. `tests/parity.py` now maps Tempo 0.2’s intended changes back (renames, the new runtime inside exports, the rebuilt Windows host, the extra Show option) and then requires an exact match with 0.8.1. New `tests/tempo_check.py` covers 0.2: sentences at pinned moments, line breaks across a year of times, fit, optical margin, looks and export names, and the same export read in New York.
- A Windows screen saver installed from 0.1 keeps its files in `Rubato Screen Savers`. That folder can be deleted once a 0.2 export is installed.

**Rubato** – unchanged. **Shared core** – unchanged: Tempo adds its own settings from `tempo/app.js`.

## 7 October 2026 – Decentish 0.4

**Decentish 0.4** – plans laid out like a friend would, with the way there and back. No changes to Rubato, Tempo or Tutti.
- **The distance dial means something now.** On the doorstep: what's right here, in yards, nothing more than 12 minutes from your door. Nearby: somewhere past the doorstep, up to about two miles, with the distance in miles and how to get there (walk, or a taxi with the cost), and back towards home when there's nothing more out there. Further afield: town or another destination (Salford Quays, Chorlton, Didsbury…), by tram or taxi, there and back.
- **Getting about:** tram stops from the map and the Metrolink network in the page – which stop, which stop to, minutes, any change, the walk at each end, the last tram, and a taxi when the trams have stopped. Taxi minutes and rough cost. Nearest tram stop in the facts strip. All estimates – no live times yet.
- **The writing:** one sentence per stop, each relating to the last – next door, a few doors down, round the corner; "The Park shuts at half eleven, so then Pizza Monton, next door…"; "When you're hungry…"; "Finish at…". Then the way back, and one near home if the night allows. Plain voice for now, on purpose; openers, weather and sign-offs keep their three voices.
- **What counts as good:** real ale, own brewery, listed buildings, Wikipedia, free entry, beer gardens when the weather's right, chains marked down (hard for Blair), "the only one still serving", "open latest", and a picks list (`PICKS`) for places worth a line. No ratings yet.
- **Not just pubs:** parks while it's light and dry, galleries and museums, coffee, bowling, crazy golf, escape rooms, arcades and karaoke. Stops capped at 3, 4 and 5 by profile.
- It tries several first stops and keeps the best whole plan, so it doesn't strand you at a pub with nothing near it.
- Tested: `tests/decentish_check.py`, 60 of 60, all sources faked and the dice loaded (Monton Road's real hours; made-up places in Eccles, Worsley, town, the Quays and Chorlton; tram stops roughly where the real ones are). `tests/out/decentish.md` has every plan by When and by distance. Not tested: the real services from a phone, the bigger map query on a real signal, and whether the real map's tram stop names match the network list.

## 7 October 2026 – Decentish 0.3

**Decentish 0.3** – a distance dial, and a voice that flows. No changes to Rubato, Tempo or Tutti.
- **How far:** On the doorstep · Walking distance · Worth the trip (the only setting that goes into town). If nothing fits, it widens and says so before rolling to tomorrow.
- **The voice, rewritten:** plan steps are now clauses stitched into one sentence with each stop's own connectors, instead of a run of full stops. Three lines on screen: opener, plan paragraph (reason, plan, weather), sign-off. "A pint at MaltDog Monton first, 9 minutes away and open till eleven, then a curry at The Naz, just round the corner, and one for the road at The Park before it shuts at midnight."
- Small fixes to the words: no "an Italian at Eden Italian Restaurant", "scran" when the map doesn't say what's served, "the Northern Quarter".
- Tested: `tests/decentish_check.py`, 42 of 42, all sources faked. `tests/out/decentish.md` now also shows each scenario across the distance dial.

## 7 October 2026 – Decentish 0.2

**Decentish 0.2** – from a status report to a plan. No changes to Rubato, Tempo or Tutti.
- **When:** Now · Soon · Tomorrow. If nothing fits, it rolls forward to tomorrow and says why.
- **The dial is now three profiles**, not just three voices: Tony Blair on a culture trip (galleries by day, dinner and a glass of something by night, no takeaways), Three pints and a meal deal (pub, food, pub, on foot), Pissed-up uncle on a mad one (pubs, bars, clubs, into town in the evening, food after 23:00). Each picks different places, goes different distances and stops at a different time – so late at night it's no longer "bed" at every setting.
- **Stitched plans:** steps chained by time – open when you'd arrive, open long enough to be worth it – written as one paragraph, with last orders ("The Park's got 20 minutes left…"), the trip into town, and a weather line for the plan's hours.
- **Manchester focus:** Greater Manchester only for the full experience; outside it, the basics and a line saying so. From the suburbs it also looks in town (Piccadilly Gardens), about 30 minutes from Monton.
- Receipts at the foot: each step's time, place, distance and closing time. *Another plan* re-picks without fetching again.
- Tested: `tests/decentish_check.py`, 40 of 40, all sources faked (Monton Road's real hours, made-up town venues, the Northern Quarter, Barra, map down, no permission, bad postcode). Every line for every scenario, dial and When is written to `tests/out/decentish.md`. Not tested: the real services from a phone.

## 6 October 2026 – Decentish 0.1

**Decentish 0.1** – new, unlisted prototype at `/decentish/`. No changes to Rubato, Tempo or Tutti.
- Asks for your location (or a postcode), then pulls the time, the place name, the weather (with earlier today and tomorrow), sunset, and everything open within a 15-minute walk from OpenStreetMap, with its opening hours.
- Sorts the moment into busy, all shut, quiet or remote, and writes a few short lines and a verdict. A dial sets the voice, from Buttoned up to Pissed-up uncle on a mad one. The dial changes the words and the background colour; the facts strip at the foot never changes.
- Talks while it loads, in the dial's voice. A stopwatch shows how long each source took.
- Test switches for any postcode and time. Workings lists every place it found and why it's open or shut.
- One typeface: ABC Diatype Bold if it's installed on the device, Hanken Grotesk Bold otherwise.
- Tested: `tests/decentish_check.py`, 36 of 36, with every source faked (Monton Road as Google listed it on 6 October, a made-up remote pub on Barra, the map service down, location refused, a bad postcode). Not tested: the real services from a phone – that's what this version is for.
- `build.py` copies it into `docs/decentish/` after a syntax check.

## 6 October 2026 – Rubato 1.0

**Rubato 1.0** – lockups, physics, kerning, three new tricks and a calmer panel. Everything 0.9 could do still works and draws the same.

New
- **Blocks.** Up to four blocks of text, each with its own font and size, stacked as a lockup. Fit sizes the lockup to the frame; Fill width makes every line full width; Manual sets block 1's size. *Text › + Add block.* Sequence and Repeat stay single-block for now.
- **Physics.** *Pull apart* sends each block to a point in the frame – picked on a 3×3 pad, or Auto (each to its own corner) – holds, then lets the lockup snap back. Feel: Magnetic, Smooth or Elastic. *Personal space* keeps blocks from overlapping on the way. Hover the Physics card to see each block's point and space on the preview. Works on a single block too (it drifts to its point and back).
- **Kerning.** Hover between two letters on the preview for a caret, click to pick the pair, then ←/→ (10/1000 em), Shift for 50, Backspace to clear, Esc to finish – or the −/+ buttons on the stage. The type settles while you kern so you see true spacing. Kerning belongs to a block, applies wherever the pair appears in it, and is listed (and removable) in Text › Kerning.
- **Jitter** (Motion) – nervous, twitching type, with Glitch for whole-line jumps.
- **Assemble** (Motion) – letters scatter across the frame, fly in and lock into place, hold, then scatter again.
- **Scramble** (Variants › Swap) – letters cycle through random letters, numbers or symbols, decode into your text, hold, then scramble again.
- **Presets as the front door.** Twelve live tiles at the top of the panel, each playing your own word in your fonts and colours. Added Wave, Pulse, Jitter, Assemble and Scramble to the seven starting points (all still placeholders until Steve curates them).

Changed
- **Panel regrouped:** Presets, Fonts, Text, Layout, Motion, Variants, Physics, Colour, Export. Sequence's handover controls moved into Text, Repeat into Layout, Image into Colour, Loop length and seed into Motion.
- **Fewer sliders, nothing removed.** One kind of control per kind of value: steppers for counts, dials for angles (Tilt, Twist, Rotate, Spin, Sway), a two-handled slider for the variable-axis range, one In/Hold/Out bar instead of three sliders (Transitional, Assemble, Scramble, Physics), and a path pad for Rise + Drift (Fluid) and Jump + Shift (Snappy). Fine controls fold under *More* in Motion, Variants and Physics, and stay open or closed as you left them. Every control still resets on a double-click of its label.
- Randomise includes the new tricks and a Physics area (off by default), and keeps shared timings within the loop.
- Exports from Jitter and Assemble are named after the trick. Settings files are version 3 (they load in the same way; 0.9 ignores the new parts).

Under the hood
- Rubato has its own copy of the type engine (`rubato/engine.js`), so none of this reaches Tempo. The only change in `shared/` is Rubato's one-line description on the index page (`shared/home.html`); Tempo's build is byte-identical.
- 0.9 stays live at /rubato/0.9/ (from `archive/rubato-0.9.html`). It keeps its own settings (`rubato-0.9:…`), reading 1.0's the first time, so opening it never overwrites 1.0's blocks or kerning.

Tests
- New `tests/rubato_regress.py`: 14 looks covering every 0.9 feature, each compared with 0.9 at six points in the loop plus SVG and PNG exports – all byte-identical. A control case (kerning) proves the comparison can tell.
- New `tests/rubato_features.py`: 43 checks on everything above, including that every new trick and physics loop joins up seamlessly.
- `tests/split_check.py`: 13 of 13. One check updated, because Presets now sits above Fonts.
- `tests/parity.py` (against 0.8.1): every Tempo result matches. Rubato's intended differences: the panel read-out (regrouped), the tip count (92 → 110), and Randomise results (new modes and control order mean different random draws). One Tempo live-preview frame in t3 differed once and matched on two reruns – the reference varies on that frame too.
- Not tested: video recording (real time, unchanged code), Adobe Fonts (blocked in the test browser), real touch devices.

## 6 October 2026 – live on GitHub Pages

No app changes – Rubato 0.9, Tempo 0.1 and Tutti 6.0 as below.
- GitHub Pages is on, serving `docs/` from `main` at https://steviewaring-arch.github.io/ensemble-tools/.
- Rechecked from a fresh clone: `build.py` reproduces `docs/` exactly; `tests/parity.py` 87 of 87 byte-identical to 0.8.1; `tests/split_check.py` 13 of 13. `reference/rubato-0.8.1.html` matches the live v0.8.1 artifact byte for byte, and `tutti/index.html` (spot-checked) is Tutti 6.0 as uploaded, served unchanged.

## 6 October 2026 – repo set up

**Rubato 0.9** – Rubato 0.8.1's Studio tab as its own app.
- No changes to how anything works or what it exports. Proven against 0.8.1 by `tests/parity.py`.
- The Screensaver tab has moved to Tempo, so the Studio/Screensaver switch is gone.

**Tempo 0.1** – Rubato 0.8.1's Screensaver tab as its own app.
- Same controls, previews and exports (HTML, Mac `.saver`, Windows `.scr`) – the exported files are byte-for-byte what 0.8.1 makes.
- Reads Rubato's fonts, saved looks, texts and glyph picks from the same browser. Keeps its own settings under `tempo:` keys; the first time it opens it picks up any screen saver settings saved by Rubato 0.8.1.
- Wording that pointed to "the Studio tab" now points to Rubato (eight labels and tips).

**Tutti 6.0** – copied in unchanged.

**Shared core** – design tokens, components, type engine, font loading, control builders, tooltips, downloads and the GIF encoder now live in `shared/` and are built into each app by `build.py`.

# Changelog

## 9 October 2026 – one interface: Tempo 0.8, Rubato 1.1, Tutti 6.1

The UI stream's system on all three tools (`shared/UI.md`; the reasoning and mock-ups are at `/ui/review/`). Every control does what it did; it has only moved or been restyled.

**All three**
- **The work fits, then fills.** The work sits in the clear space beside the panel. **Preview** (the expanding arrows top right, or F) fills the window with it. The panel and controls stay where they are; Esc or F comes back.
- **A frosted panel floats on the left**, top to bottom. Its right edge drags (280–440 px). The header stacks: name and version, then By ENSEMBLE in grey.
- **Top right:** chips with the size and one fact ("1680 × 1050", "Your local time", "Demo face"), then Preview and light/dark. Light or dark follows the computer the first time, then is remembered.
- **The island**, bottom centre, holds what you do to the view, then **Export**, which grows into a sheet. Status ("Saved …") shows in the island.
- **Cards say what's set when shut** ("24-hour · Comma · Leading zero"), and folds inside cards do too. Most cards start shut, except the one for what you're working on. Chevrons replace + and –.
- **One of each control.**
  - The slider has its label and value inside the track. The fill carries the value, and the tick steps aside where it would cross the words.
  - Segmented controls sit in one row or an even grid.
  - Controls are 32 px high on a 15 px base (was 16.75).
  - Corners are 12, 6 and 4 px, or fully round.
  - Grey text is darker in light mode (4.8:1, was 3.3:1).
- **Tooltips on every control:** hover a row and its tip appears; the ? shows only on hover, or for touch and keyboards.

**Tempo 0.8**
- **Show** is in the island. **Export** is a sheet from the island. **Presets** has its own capsule bottom right, which names the preset open.
- Mixing in Fonts starts shut and says how the other fonts come in.
- The preview chip reads "1680 × 1050"; the full sentence is its tooltip.
- Inline styles moved into classes.

**Rubato 1.1**
- The transport is the island: Pause, scrub, Randomise and its options, Undo. **Export** and **Randomise's options** are sheets from the island. **Presets** (starting points and saved looks) has its own capsule.

**Tutti 6.1**
- On the shared tokens and components (`build.py` puts them in at build time, with `tutti/frame.css` and `tutti/frame.js`). Its exports are unchanged: PNG, SVG and the canvas checked byte for byte against 6.0.
- Cards fold and say what's set. Randomise, Random and Reset shapes are quiet buttons in their cards.
- Export (Still or Motion) is a sheet from the island. Recording shows in the island. Pause joins the island for a video.

**Tests**
- Updated for sheets: `tests/ui_helpers.py` opens the sheet a control is in, as a person would.
- Card lists no longer include Presets, Screensaver and Export.
- The chip check reads the tooltip.
- Mixing is opened before it's used.

Results:
- `tempo_check` 119 of 119.
- `rubato_features` 43 of 43.
- `rubato_regress` all 14 looks identical to 0.9.
- `split_check` 15 of 15.
- `parity`: frames and exports as before; panel results differ on purpose.

## 8 October 2026 – Tempo 0.7

**Tempo 0.7** – Timeless built in, and Lazaar Soft drawn properly.
- **Timeless Sans is Tempo's font.** It comes with Tempo – no loading needed – and is the core font the first time 0.7 opens, also for anyone who used Tempo before. Your own fonts and font packs work as always. On: Sans Regular (core), Sans Medium, Grotesk Medium, Semibold and Black; the variable font (every weight, italics, Grotesk to Sans) is listed, off. The Fonts card credits it: free from timeless.co, under the Timeless Free Font License.
- **Kept to its licence.** The licence forbids public repositories and servers, so the fonts are never in this repo or `docs/`. They're embedded inside Tempo's page only in a private build (`site/`) – see `LICENCES.md`, including the hosting decision still to make before the live site has them. `tests/licence_check.py` fails if any trace of them reaches the repo.
- **No more screen savers named after their font.** Unnamed exports are Tempo, Tempo Words or Tempo Dial (or the preset's name).
- **Fixed: parts of glyphs going missing** – Lazaar Soft's N, M, T, n, t, k, r, 4 and more looked clipped. The font is fine; the path data Tempo made from it wasn't. A coordinate a hair below zero ran two numbers together. Fixed in the shared font loader, so Rubato too. Re-export any screen saver made with Lazaar Soft.
- A licence or read-me inside a .zip of fonts no longer counts as a font it couldn't read.
- Tests: `tests/tempo_check.py` 119 of 119 (new: exported outlines draw exactly as the font does, glyph by glyph; fonts embedded in the page load once, as the core, with their credit, and never reach exports; export names); `tests/licence_check.py` 4 of 4.

**Rubato 1.0** – the path fix above (parts of some glyphs no longer go missing); nothing else.

## 8 October 2026 – Tempo 0.6

**Tempo 0.6** – presets: save a screen saver, come back to it, and open the ones you've downloaded.
- **Presets**, the first card. Save what's on screen with a name and it joins **Yours** as a live tile – the screen saver drawn as it plays, redrawn each minute. Click a tile to open it. The card says which one is open and whether it has **changed since saved**; **Save changes** keeps the changes, **Save as new** makes another (a name already used saves over it), **Download** saves that preset as a file, **Delete** asks twice.
- **Nothing lost.** Open a preset over work that isn't saved and **Back to what you had** brings it back – kept, even across a reload, until it's used or replaced. **Download all** saves every preset in one file; opening it brings them all back. Presets live in this browser, so download now and then.
- **A preset is the whole screen saver:** every setting for the time, the words and the dial, the export name, which fonts are on and which shuffle in, each font's tracking and your saved colour themes. Fonts are named, not tied to this browser, so a preset opens the same elsewhere once its fonts are loaded – and says which are missing if not.
- **Open a file** (or drop it on the page) brings back a screen saver you downloaded – the HTML, the Mac or Windows zip, or a `.scr` – ready to edit. Downloads from 0.6 carry their own preset (`edit` in the config); earlier ones are read back from their settings, so files from 0.2 to 0.5 open with everything they show (checked with real 0.4 downloads: the Lazaar look, and a clock with numerals mixed, HTML and Mac). A file that matches a preset you have opens that preset rather than a copy.
- **Built in:** presets listed in `tempo/presets.json` (the same form as a Download all file) show under **Built in** – where the twelve that ship will go. They open like yours; changes are saved as your own.
- Exports are named after the preset open, unless you type a name.
- Shared core: an optional `appDropFiles` hook lets an app take files dropped on the page before they go to Fonts (Rubato doesn't use it).
- Tests: `tests/tempo_check.py` 115 of 115 (new: save, change, save changes, open, the fonts' shuffle and tracking coming back, Back to what you had, reload, a download opened in another browser, pre-0.6 downloads for the words, the dial and the time, Mac, Windows and `.scr`, a non-Tempo file turned away, dropping a file, Delete twice, Download all and back, one preset's file, tiles drawn, built-in presets).

**Rubato 1.0** – unchanged.

## 7 October 2026 – Tempo 0.5

**Tempo 0.5** – a dial, a Noon colour theme, no more Looks.
- **As a dial**, a third option under Show, after Steve's two drawings: no type, only lines. **Marks:** Rays (running out from a space in the middle, hours and quarters standing out nearer the centre), Ticks (running in from the edge – minutes short, hours longer, quarters almost to the middle), Dots, or Hands only. **Detail:** minutes, hours or quarters. **Line weight** for the minute marks, the hours and quarters, and the hands, each on its own. An outer ring, tails, a centre dot.
- **How the hands move:** the second hand sweeps, ticks, or goes round in 58.5 seconds and waits at 12 for the minute, like a station clock; the minute hand glides or steps on the minute, and the hour hand follows it. A hand that jumps lands Snappy, Smooth or Elastic (springs past and settles), over a length you set. **Marks follow the second hand:** they light up in its colour as it passes – filling the minute, or fading behind it.
- **Colour:** Paper (the red-handed drawing), Dawn (cyan, apricot and pink hands, after the other), Noon, Night (white hands, a yellow second hand) and Signal, or your own colours for the background, the minute, hour and quarter marks and each hand. Change theme every hour works as it does for the time and the words. **Size** and **Drift** under Position.
- A dial carries no fonts: the export is small (about 70 KB), named **Tempo Dial** unless you type a name, and Fonts steps aside while the dial is showing.
- **Noon:** the pale grey, acid yellow and near-black of Steve's 16,00 grab – numerals yellow, the comma dark. The first theme for The time and what it opens in; in the words it replaces Acid (the time yellow, the rest dark). **Ultraviolet** has gone from both. Colours already chosen stay as they were.
- **Looks are gone** from In words – the panel is the settings themselves. Exports are named after the core font unless you type a name.
- Wording for anyone to use: Display faces is now **Other fonts**; Rotate themes every hour is **Change theme every hour**, as it is elsewhere; the page title takes an en dash, and the site's front page says Tempo does words and a dial too.
- A change made just before the page closes is saved (it used to wait 300 ms).
- Tests: `tests/tempo_check.py` 94 of 94 (new: the dial's cards, export, where the hands point for each way of moving – sweep, tick, elastic, stop at 12, step – every face and detail, trail, ring, weights, themes on the hour, the exported page drawing the same frame, Mac and Windows exports, settings remembered; Noon and no Ultraviolet; no Looks). `tests/parity.py` sets 0.8.1's colours before comparing Tempo's frames, since Tempo now opens in Noon.

**Rubato 1.0** – unchanged.

## 7 October 2026 – Tempo 0.4

**Tempo 0.4** – a font library, more ways to mix, words or figures part by part.
- **Font library.** Fonts can be switched on and off without removing them (off: kept in the list, out of the preview, the mixing and exports). Drop in a **.zip of fonts** and they all come in at once; a font already in the list (same family and style) is skipped, and so are a zip's Mac leftovers and old Mac fonts with no outlines – the toast says how many. A zip can carry `tempo-fonts.json` saying which fonts start on, which is the core, which shuffle in and each one's tracking. Fonts listed in `tempo/fonts/fonts.json` are **built in**: they show in the list, those marked on load the first time Tempo opens, the rest are one click away. Nothing is built in yet – everything in `docs/` is public, so only fonts cleared to publish go there.
- **Fonts card, tidier.** One row per font: name, Use as core, an on/off switch. Click the name for Shuffle in, its tracking and Remove. The list runs core first, then the fonts on, then those off.
- **Mixing:** fonts can come **In turn** (through the list in order) as well as **Shuffled**; a new way in, **A few at random**, with **How many** from the odd one to all – for the numerals of The time (the odd figure in a display face, or every one) and for the words. Per-numeral and per-part choices are as in 0.3.
- **Words or figures, part by part:** the time, seconds, date and year each in words or figures (“It is 11.47pm and fifty nine seconds on Wednesday the twenty eighth of October 2026”). **Say 0 as** oh or zero (“nine oh five”, “nine zero five”).
- **A Lazaar look**: the time, the day and the month in Lazaar, the rest in the core font. Looks can name fonts; a font that isn't switched on is replaced by Shuffle.
- **Panel:** The time or In words comes first. Folds inside the cards (Mixing, Words or figures, Spacing, Your colours) open and shut and remember it.
- Line spacing follows the core font whichever fonts come in, and capitals match the core font's height (as in 0.3).
- 0.3's settings carry over (numbers in figures become figures for every part).
- A pressed small button no longer loses its label under the pointer (shared stylesheet, so Rubato too).
- Tests: `tests/tempo_check.py` 80 of 80 (new: zip packs with duplicates and leftovers, a pack's settings, on and off, built-in fonts, in turn, a few at random, words or figures, zero, folds).

**Rubato 1.0** – no change to how it works, apart from the hover fix. **Shared core:** a style can be off (`off` saved with it, left out of the engine); `loadFiles()` reads a .zip and skips fonts already loaded; new optional hooks `appFontList`, `appFontsLoaded`, `appFontsRestored`. Rubato never switches a font off and has no hooks, so for Rubato the only differences are a .zip working and a font already loaded being skipped rather than added twice.

## 7 October 2026 – Tempo 0.3

**Tempo 0.3** – stands on its own, one Fonts card, fonts mixed into the time as well as the words.
- **Apart from Rubato.** Tempo keeps its own fonts (in its own browser store) and its own settings, and reads nothing of Rubato's. Gone: Saved looks, the Rubato text second line, Add Rubato motion, the Rubato image, and reading Rubato's settings. The first time 0.3 opens it copies the fonts loaded in Rubato, and anything an earlier version left only under Rubato's settings, so nothing goes missing – after that a font added in one doesn't appear in the other.
- **Show is The time or In words.** Mixed type is part of In words: with one font it's the plain In words, with more the other fonts mix in. The looks are Reference, Stack, Poster, Typewriter, Hours, Social, Latest and Medley – Night and Spotlight are gone.
- **Fonts, at the top, is one card.** Each font has **Use as core** (the font that carries the time and the sentence – what was the default style and Mixed type's base face), **Shuffle in** (what was "Use in style swaps"), and its own **Tracking**, which goes with that font wherever it's used – Lazaar can be opened up once and stays right in every look. The Tracking under Type and Clock tightens the core font on top of that. Under the list, **Mixing** holds what was the Typefaces card: how the other fonts come in, each part's font, when they change, a font for each word, little words staying in the core font, matching cap heights. The Highlight style option has gone – set the time's own font under Mixing instead.
- **The time: a font for each numeral.** Hours, minutes and seconds (tens and units) and the second line can each be the core font, a font of their own, or Shuffle; or the numerals that just changed come in another font; or one numeral at a time stands out. Cap heights match, fixed-width numerals stay fixed within each font, and the size holds whichever font comes in.
- **The preview takes the shape of the screen Tempo is open on.** The Laptop, Display and Portrait buttons have gone.
- Settings from 0.2 carry over: Mixed type opens as In words with its base face as the core and its parts as they were; In words with a highlight style sets the time in that font; plain In words stays plain; Saved looks opens on The time; a Rubato-text second line becomes none.
- Exports carry each numeral's and each part's font, each font's tracking, and name the core font. Files are named after the screen saver (“tempo-stack-screensaver.html”, “poppins-screensaver.html”).
- Tempo's type engine moved from `shared/engine.js` to `tempo/engine.js` (Rubato has had its own since 1.0). It learnt to set a character in another font, scaled to the core font's cap height, with each font's tracking. With one font it draws exactly as before.
- Tests: `tests/tempo_check.py` 67 of 67; `tests/split_check.py` now checks the two apps are kept apart, 15 of 15. `tests/parity.py` names the results that differ on purpose and why (Tempo's exports and panel); the clock frames and the exported engine's frames still match 0.8.1.

**Rubato 1.0** – no change to how it works. **Shared core:** each app now has its own font store and its own storage keys, with no fallback to Rubato's (`store()`, `fontStore()`), and an app can draw its own font-row controls (`appFontRow`). Rubato's store and keys are the same as before, so nothing moves for Rubato.

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
- New: **Mixed type**, a fourth option under Show (the four now sit two by two). The time in words, carried by a plain base face (a Swiss grotesk), with display faces coming in and out of it. A first pass with options to try, for Steve to refine.
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

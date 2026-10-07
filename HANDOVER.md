# Ensemble Tools – handover (7 October 2026, updated for Rubato 1.0 and Tempo 0.2)

Read this and `README.md` before changing anything. Tutti's own notes are in `tutti/HANDOVER.md`.

## Where things are
- **Repo:** `ensemble-tools` – source of truth for Rubato, Tempo and Tutti.
- **Live:** https://steviewaring-arch.github.io/ensemble-tools/ – GitHub Pages from `docs/` on `main`. Each push to `main` redeploys in a minute or two.
- **Last combined app:** `reference/rubato-0.8.1.html` – byte-identical to the v0.8.1 Claude artifact (rechecked 6 October against the live artifact). Kept so the parity tests have something to compare against. Don't edit it.
- **Versions:** Rubato 1.0, Tempo 0.1, Tutti 6.0. Rubato 0.9 is still live at /rubato/0.9/ (`archive/rubato-0.9.html`).

## What changed in the split
Rubato 0.8.1 was one app with two tabs. It's now two apps on one shared core:

| v0.8.1 file | Now |
|---|---|
| `head.html` | `shared/tokens.css`, `shared/components.css`, `shared/page.html`, plus `rubato/app.html` and `tempo/app.html` for each app's markup |
| `rubato-engine.js` | `shared/engine.js` (unchanged) |
| `rubato-saver.js` | `tempo/saver.js` (unchanged) |
| `rubato-mac.js` | `tempo/mac/packager.js` (unchanged) |
| `rubato-win.js`, `win/` | `tempo/win/host.js`, `tempo/win/rubato_scr.c`, `.exe` (unchanged) |
| `ui.js` | `shared/core.js` + `shared/core-end.js` (shared), `shared/gif.js`, `rubato/app.js` + `rubato/export.js`, `tempo/app.js` |
| `fonts_mod.js`, `tips.js` | dropped – they were out-of-date copies of sections of `ui.js` |

Code was moved, not rewritten. The only edits were the seams: each app supplies a few functions the core calls (listed at the top of `shared/core.js`), the tab switch is gone, and storage is split as below.

## Rubato 1.0 (6 October 2026)
Blocks and lockups, Physics (pull apart, personal space), kerning on the preview, Jitter, Assemble, Scramble, the Presets front door with live tiles, and a regrouped panel with steppers, dials, a range pair, In/Hold/Out bars, path pads and More folds. Details in `CHANGELOG.md`; the decisions behind it are in the Claude Project doc `claude/rubato-next.md`.

How it's built:
- **Own engine.** `rubato/engine.js` started as a copy of `shared/engine.js` and is now Rubato's alone. With 1.0's new settings at their defaults it draws exactly what 0.9 drew (`tests/rubato_regress.py`). Tempo keeps `shared/engine.js`, untouched; the only `shared/` edit in 1.0 is Rubato's description on the index page.
- **New settings** are added to the shared defaults inside Rubato only (`rubatoDefaults()` in `rubato/app.js`). Flat ones go through the shared sanitiser; `blocks` (text, font, size, destination and kerning per block) is checked by `sanitiseR()`. Block 1's text is still `texts[0]` and its font is the default style, so anything reading 0.9's keys still works.
- **New files:** `rubato/controls.js` (the new control types – each pushes stand-in entries so Randomise still reaches multi-setting controls), `rubato/stage.js` (kerning, physics guides, preset tiles – one small engine per tile, paused when the Presets card is shut or off screen), `rubato/app.css`.
- **Loops stay seamless:** every new trick and physics returns to its start at the end of the loop; `tests/rubato_features.py` compares frame 0 with frame 1 for each.

## Storage
Everything is per browser and per site, so on GitHub Pages Rubato and Tempo share it.

| Key | Owner | Notes |
|---|---|---|
| `rubato:settings` | Rubato | Every setting, as before, plus 1.0's (`blocks`, `ph…`, `j…`, `a…`, `sc…`, `lkGap`). Tempo reads it for texts, glyph picks, motion, variants and colours, and ignores the new keys. |
| `rubato:presets` | Rubato | Saved looks. Tempo reads them for Saved looks mode. |
| `rubato:rand`, `rubato:collapsed`, `rubato:theme`, `rubato:panelW`, `rubato:more` | Rubato | `more` remembers which More folds are open (1.0). |
| `rubato-0.9:…` | Rubato 0.9, archived | Reads `rubato:` the first time, then keeps its own, so opening 0.9 never overwrites 1.0's settings. |
| `tempo:settings` | Tempo | Only the screen saver settings (`ss…`, including the time in words' `ssW…` and Mixed type's `ssM…`) and Tempo's own default style (`baseSlot`). |
| `tempo:themes`, `tempo:ssPicked`, `tempo:collapsed`, `tempo:theme`, `tempo:panelW` | Tempo | Each falls back to the `rubato:` key the first time, so v0.8.1 themes and choices carry over. |
| IndexedDB `rubato` › `fonts` | Shared | Font files, styles and the image. Load a font in either app and it's in both. |

## Behaviour notes (all as in v0.8.1 unless marked)
- **New:** Tempo reads Rubato's settings when it opens. Change something in Rubato, then reload Tempo to see it. (In v0.8.1 both were tabs of one page, so it was instant.)
- **New:** the default style is chosen separately in each app.
- **Moving to GitHub Pages is a new site**, so fonts, looks and themes saved in the Claude artifact won't be there. Load fonts again; carry current settings across with Presets › Save settings file.
- **Tempo 0.2:** exports say Tempo (read-mes, no-font name, `window.__TEMPO__`, Windows about box and `Tempo Screen Savers` folder). The preview shape buttons now follow the click.
- Found while testing, present in 0.8.1 too, **not fixed** (it's in `shared/`): a small pressed pill loses its label while the pointer is over it – `.pill.small:hover` in `components.css` beats `.seg .pill[aria-pressed="true"]` on colour. Shows on any segmented control you've just clicked. One-line fix for whichever chat next touches `shared/`: `.seg .pill[aria-pressed="true"]:hover{color:var(--on-ink)}`.

## Working in separate chats
One chat per stream: **Tutti**, **Rubato**, **Tempo**, **Decentish**. Each starts by cloning this repo and reading this file.

What's linked:

| Change made in… | Affects |
|---|---|
| `rubato/` | Rubato only |
| `tempo/` (incl. `saver.js`, `mac/`, `win/`) | Tempo only |
| `tutti/` | Tutti only – it shares nothing yet |
| `decentish/` | Decentish only – it shares nothing with the tools |
| `rubato/engine.js` | Rubato only (from 1.0) |
| `shared/engine.js` | Tempo only now – and every screen saver Tempo exports from then on |
| `shared/core.js`, `core-end.js`, `tokens.css`, `components.css`, `page.html` | Rubato **and** Tempo (controls, font loading, look and feel) |
| Rubato's settings (`D` in `core.js`, e.g. renaming a setting) | Tempo too – it reads Rubato's texts, glyph picks, motion and saved looks. Rubato 1.0's new modes mean nothing to Tempo's engine: "Add Rubato motion" shows no movement for Jitter or Assemble, and treats Scramble as alternates. Tempo's to-do already includes taking Rubato out of Tempo. |

Rules:
1. Pull before you start; push when you finish. Don't have two chats editing `shared/` at the same time.
2. Any change to `shared/` means running both `tests/parity.py` and `tests/split_check.py`, rebuilding both apps, and noting it in `CHANGELOG.md` under both apps. Any change to `rubato/` means running `tests/rubato_regress.py` and `tests/rubato_features.py`.
3. Once an app deliberately changes behaviour, its parity scenarios against 0.8.1 will start to differ – that's expected. Say which differences are intended in the changelog.

## Tempo's time in words (0.2)
- **Steve's direction (6 Oct):** Ensemble ships In words as a handful of pre-made screen savers (variants), so each must be right wherever it's installed: always the computer's own time and date, nothing fetched. Put the effort into the typography.
- `tempo/saver.js` builds the sentence (`sentence()`), sets it (`wSet()`, sized by `fitSize()` when Fit is on, cached by `wLayout()`) and animates changes (`wordsFrame()`, `typed()`). It draws glyph outlines itself rather than through the engine's single-block layout, but uses the same faces, so baked fonts in exports draw identically.
- Every word has a key for its place in the sentence (`WKEYS`), so a change knows which words stay, change, arrive or leave. Words that keep their line and shift less than two ems glide; anything else rolls or fades out where it was and in where it lands.
- Line breaks: each word has a phrase (`GRP`) and the little words in `STICKY` hold on to the next, so lines break only between phrases. In Paragraph, a short lone last phrase pulls one down from the line above. Stacked puts each phrase on its own line. Optical margin uses each glyph's side bearing (`bearings()`, from the outline).
- Fit sizes the type for the longest sentence the settings can make (a Wednesday the twenty seventh of September at twelve fifty seven and fifty seven seconds) and keeps it – the size only changes when a setting does.
- Its settings (`ssW…`, plus `ssName` for the export name) are added to the defaults by `wordsDefaults()` in `tempo/app.js`, so `shared/core.js` is untouched. They go into exports as a `words` block only when Show is In words, so clock and looks exports are as they were.
- Looks are `WORD_LOOKS` in `tempo/app.js`: each sets the whole of In words. Starter themes are `WORD_THEMES`. Both are placeholders for Steve's curated set (and his fonts – check the licence allows embedding outlines before shipping a face publicly).
- Exports are named by `exportName()`: the typed name, else “Tempo <look>”, else the font as before. Variants need different names, or installing one replaces another. The Mac bundle identifier still says `uk.co.ensemble.rubato…` – invisible to people, left alone.
- **Set aside:** place, sunrise and sunset, and weather were built and tested (commit `c0cc72c`: NOAA sun maths, Open-Meteo place search and weather, place time zones) and then taken out, because a screen saver can't ask where it is. Starting point for the planned website, where the browser can ask.
- **Queued for that website (Steve, 6 Oct):** two dials – Accuracy (exact to vague: “about midday”) and Personality (deadpan to Northern to sweary). Needs a phrase bank written and approved before it's built. Paused.

## Tempo's Mixed type (0.2, first pass)
- **Steve's brief (6 Oct):** odd, quirky, retro display faces sitting within a Swiss aesthetic, grounded by Diatype. Don't take the Summer Social posters too literally; lines needn't stack; sentence case is fine. A dropdown to set each time or date part to a face, or switch per change. “How we feature the typefaces coming in and out is the key” – not decided, so the UI offers several ways to try. Display faces to come: Shatter, Brush Script, Frankfurter, Cortez, Balloon.
- It's In words with `show:'mixed'` and a `words.mixed` block: `{base, mode:'parts'|'latest'|'one', parts:{lead,time,sec,weekday,day,month,year}, when:'change'|'minute'|'hour', each, little, match}`. Settings are `ssM…`, added by `wordsDefaults()` like `ssW…`.
- `tempo/saver.js`: `assignFaces()` gives each word a face id (`fid`) when the sentence is built; `wSet()` sets each word in its face, scaled to the base face's cap height when `match` is on (`capScale()`), with tracking on the base face only. A word whose face changes rolls or fades out and in like a changed word. `fitVariants()` puts each word in the widest face it could take before Fit sizes the sentence.
- Display faces are the loaded styles with “Use in style swaps” ticked, minus the base. Load Diatype Regular plus the display faces, and untick other Diatype weights if they shouldn't shuffle in.
- Looks (`MIXED_LOOKS` in `tempo/app.js`) set how faces are used, not which faces – those depend on what's loaded.
- **Lazaar in In words (Steve's “clipping, uneven”):** Lazaar has no lower case (the lower-case keys draw capitals), side bearings of 10/1000 and ascent equal to cap height. In words' looks track tight (−20 to −40), so Lazaar's letters touch and merge. Mixed type now leaves display faces at their own spacing; for In words with Lazaar as the only face, set Tracking to 0 or above. Worth a per-face spacing fix next round.

## Tests
- `tests/parity.py` – the six v0.8.1 handover tests (`tests/legacy/`), rewritten to drive both the reference and the new apps with randomness and the clock pinned. Compares 87 results: canvas frames, SVG/PNG/GIF, screen saver HTML, Mac and Windows zips, panel text, storage. Last run (`tests/PARITY-REPORT.md`, 6 October, fresh clone): 87 of 87 byte-identical. Two live-preview frames are timing-sensitive and can vary a little between runs of 0.8.1 itself – the test allows for that, but this run didn't need it.
- Script-level check (6 October): the engine, saver runtime and Windows host blocks in the built Tempo and Rubato are byte-identical to 0.8.1's. The Mac packager block is one trailing newline shorter (`build.py` trims it); nothing reads that block as text, and the Mac zips still match byte for byte.
- `tests/split_check.py` – 13 checks on the new sharing between Rubato and Tempo. Last run (Rubato 1.0): 13 of 13.
- `tests/rubato_regress.py` – Rubato 1.0 against the archived 0.9: 14 looks covering every 0.9 feature, six points in the loop each plus SVG and PNG. Last run: all byte-identical, and the kerning control case differed as it should.
- `tests/rubato_features.py` – 43 checks on 1.0's new features, including seamless loops. Last run: 43 of 43.
- Since Rubato 1.0, `tests/parity.py`'s Rubato steps differ from 0.8.1 where intended (panel read-out, tip count, Randomise draws).
- Since Tempo 0.2, the new build's exports and Show control differ from 0.8.1 on purpose; `tempo02()` in `parity.py` maps those changes back and then requires an exact match, and the report says which change each result carried. Last run, with Mixed type: 76 byte-identical, 9 identical once mapped back, 2 live-preview frames within 0.8.1's own run-to-run variation.
- `tests/tempo_check.py` – Tempo 0.2: preview shape buttons, Tempo naming in all three exports, the time in words (cards, sentences at pinned moments with parts on and off, line breaks across 200 random layouts, Stacked, Fit holding one size all year, optical margin, looks and export names, every change style, exported page draws the same frame, fonts baked, the same export read in New York shows New York's time, clock exports untouched), and Mixed type (card and face lists, looks, export, faces per part, shuffle never repeating, every hour holding, latest change, one part at a time, a face per word, Fit with display faces, In words exports untouched). 54 checks.
- Not tested: video recording (real-time MediaRecorder, not comparable byte for byte – the code is unchanged), the Windows `.scr` on a real PC, the Mac `.saver` on a real Mac since the split (bytes match 0.8.1, which Steve confirmed works), Adobe Fonts loading (blocked in the test browser).

## Known limits (carried over)
- Windows `.scr`: untested on a real machine; main display only; unsigned (SmartScreen warns once).
- Mac `.saver`: needs "install for all users"; notarisation needs the Apple Developer Program.
- Variable fonts: TrueType (gvar) tested with Lora; CFF2 untested. Axis animation doesn't carry into screen saver exports.

## To do
1. Tempo: optionally pick up Rubato changes without a reload. (0.2 did the shape highlight and the rename.)
2. Steve to curate Rubato's built-in presets (the twelve are placeholders) and do a cut pass on the panel.
3. Test the Windows `.scr` on a real PC.
4. Tempo: Steve to curate the In words looks and themes that ship as pre-made screen savers. Six starter looks are in place.
   **Steve's next list for Tempo (6 Oct, noted, not started):**
   - Take Rubato out of Tempo: no Saved looks from Rubato, no "Rubato text" second line, no "Add Rubato motion", no reading Rubato's settings.
   - Preview shapes: drop Portrait if it isn't needed. Laptop (16:10) and Display (16:9) are nearly the same, so consider dropping the toggle and previewing at the shape of the screen Tempo is open on.
   - Clock, second line: weekday and date together; the ordinal ending (6th) on or off; time, day and date over several lines; an optional GMT / time zone label.
   - In words looks: only Reference is liked so far – rework the rest.
   - A third screen saver kind alongside The time and In words: time as data – minutes left in the year, seconds through the day, percentages.
   - Lazaar looks wrong in In words (clipping, uneven). Next round; needs the font file to reproduce.
   - Preload a few fonts that pick out the different parts, grounded by a plain Swiss face in the spirit of ABC Diatype (Diatype is commercial – check the licence covers outlines in a distributed screen saver).
   - Third Show option (Steve's reference, 6 Oct – the "Ensemble Summer Social" posters): a plain Swiss face (ABC Diatype, Steve holds a commercial licence) carrying the time and date, with one line swapped into a retro display face (Lazaar Soft / Block and others to come). Steve likes the pale grey with acid-yellow pairing; ignore the all caps for now. Diatype and Lazaar files were supplied in the Tempo chat – ask for them again in a new chat. **Started as Mixed type** (see above): Steve to try the three ways of featuring faces and say which to keep, then curate the looks once the other display faces arrive.
   **Steve to come back to: fonts for the screen saver.** Which faces ship, and whether their licences allow their outlines inside a distributed screen saver (Steve's own faces avoid the question; Adobe Fonts faces such as Aktiv Grotesk can't be loaded into Tempo as files anyway).
7. A website version of In words that uses the browser's location (place, sun, weather) and the Accuracy and Personality dials – its own project. Code for place, sun and weather is in commit `c0cc72c`.
5. Tutti onto the shared tokens and UI kit (see `tutti/HANDOVER.md`).
6. Develop each app in its own chat, from this repo.
7. Rubato, noted for later: physics per letter (blocks only in 1.0); Lottie export; transparent WebM / PNG sequence; more kinetic tricks and refinements to the three; a trick per block; dragging destinations on the canvas; Sequence and Repeat with blocks; preloaded / Google Fonts; a layers panel; anonymous analytics with an opt-in gallery. Full list in the Project doc `claude/rubato-next.md`.

## Rebuilding the Windows host
```
pip install ziglang
python3 -m ziglang cc -target x86_64-windows-gnu -Os -s -Wl,--subsystem,windows tempo/win/rubato_scr.c -o tempo/win/rubato_scr.exe -luser32 -lgdi32 -ladvapi32 -lshell32
```
Then base64 the `.exe` into `tempo/win/host.js` (`window.SAVER_WIN="…"`).

# Ensemble Tools – handover (7 October 2026, updated for Rubato 1.0 and Tempo 0.3)

Read this and `README.md` before changing anything. Tutti's own notes are in `tutti/HANDOVER.md`.

## Where things are
- **Repo:** `ensemble-tools` – source of truth for Rubato, Tempo and Tutti.
- **Live:** https://steviewaring-arch.github.io/ensemble-tools/ – GitHub Pages from `docs/` on `main`. Each push to `main` redeploys in a minute or two.
- **Last combined app:** `reference/rubato-0.8.1.html` – byte-identical to the v0.8.1 Claude artifact (rechecked 6 October against the live artifact). Kept so the parity tests have something to compare against. Don't edit it.
- **Versions:** Rubato 1.0, Tempo 0.3, Tutti 6.0. Rubato 0.9 is still live at /rubato/0.9/ (`archive/rubato-0.9.html`).

## What changed in the split
Rubato 0.8.1 was one app with two tabs. It's now two apps on one shared core:

| v0.8.1 file | Now |
|---|---|
| `head.html` | `shared/tokens.css`, `shared/components.css`, `shared/page.html`, plus `rubato/app.html` and `tempo/app.html` for each app's markup |
| `rubato-engine.js` | `shared/engine.js` at the split; since then Rubato has its own (`rubato/engine.js`, 1.0) and so has Tempo (`tempo/engine.js`, 0.3) |
| `rubato-saver.js` | `tempo/saver.js` (unchanged) |
| `rubato-mac.js` | `tempo/mac/packager.js` (unchanged) |
| `rubato-win.js`, `win/` | `tempo/win/host.js`, `tempo/win/rubato_scr.c`, `.exe` (unchanged) |
| `ui.js` | `shared/core.js` + `shared/core-end.js` (shared), `shared/gif.js`, `rubato/app.js` + `rubato/export.js`, `tempo/app.js` |
| `fonts_mod.js`, `tips.js` | dropped – they were out-of-date copies of sections of `ui.js` |

Code was moved, not rewritten. The only edits were the seams: each app supplies a few functions the core calls (listed at the top of `shared/core.js`), the tab switch is gone, and storage is split as below.

## Rubato 1.0 (6 October 2026)
Blocks and lockups, Physics (pull apart, personal space), kerning on the preview, Jitter, Assemble, Scramble, the Presets front door with live tiles, and a regrouped panel with steppers, dials, a range pair, In/Hold/Out bars, path pads and More folds. Details in `CHANGELOG.md`; the decisions behind it are in the Claude Project doc `claude/rubato-next.md`.

How it's built:
- **Own engine.** `rubato/engine.js` started as a copy of `shared/engine.js` and is now Rubato's alone. With 1.0's new settings at their defaults it draws exactly what 0.9 drew (`tests/rubato_regress.py`). Tempo kept `shared/engine.js` (moved to `tempo/engine.js` in Tempo 0.3); the only `shared/` edit in 1.0 is Rubato's description on the index page.
- **New settings** are added to the shared defaults inside Rubato only (`rubatoDefaults()` in `rubato/app.js`). Flat ones go through the shared sanitiser; `blocks` (text, font, size, destination and kerning per block) is checked by `sanitiseR()`. Block 1's text is still `texts[0]` and its font is the default style, so anything reading 0.9's keys still works.
- **New files:** `rubato/controls.js` (the new control types – each pushes stand-in entries so Randomise still reaches multi-setting controls), `rubato/stage.js` (kerning, physics guides, preset tiles – one small engine per tile, paused when the Presets card is shut or off screen), `rubato/app.css`.
- **Loops stay seamless:** every new trick and physics returns to its start at the end of the loop; `tests/rubato_features.py` compares frame 0 with frame 1 for each.

## Storage
Everything is per browser and per site. From Tempo 0.3 each app keeps to its own keys and its own font store; neither reads the other's.

| Key | Owner | Notes |
|---|---|---|
| `rubato:settings` | Rubato | Every setting, as before, plus 1.0's (`blocks`, `ph…`, `j…`, `a…`, `sc…`, `lkGap`). |
| `rubato:presets` | Rubato | Saved looks. |
| `rubato:rand`, `rubato:collapsed`, `rubato:theme`, `rubato:panelW`, `rubato:more` | Rubato | `more` remembers which More folds are open (1.0). |
| `rubato-0.9:…` | Rubato 0.9, archived | Reads `rubato:` the first time, then keeps its own, so opening 0.9 never overwrites 1.0's settings. |
| IndexedDB `rubato` › `fonts` | Rubato | Font files, styles and the image. |
| `tempo:settings` | Tempo | The screen saver settings (`ss…`: the time, `ssW…` the words, `ssM…` mixing into the words, `ssN…` mixing into the numerals, `ssVer` – 3 once 0.2's settings have been moved up) and the core font (`baseSlot`). |
| `tempo:tracks` | Tempo | Each font's own tracking, by style id. |
| `tempo:themes`, `tempo:collapsed`, `tempo:theme`, `tempo:panelW` | Tempo | |
| `tempo:own` | Tempo | Set once 0.3 has copied whatever earlier versions left only under `rubato:` (settings, themes, light/dark, panel width). |
| IndexedDB `tempo` › `fonts` | Tempo | Font files and styles. The first time Tempo 0.3 opens, it copies the fonts in IndexedDB `rubato` (not the image); after that the two are separate. |

## Behaviour notes (all as in v0.8.1 unless marked)
- **Tempo 0.3:** Rubato and Tempo are separate apps that happen to share a core. Nothing done in one shows up in the other (`tests/split_check.py`).
- **Moving to GitHub Pages is a new site**, so fonts, looks and themes saved in the Claude artifact won't be there. Load fonts again; carry current settings across with Presets › Save settings file.
- **Tempo 0.2:** exports say Tempo (read-mes, no-font name, `window.__TEMPO__`, Windows about box and `Tempo Screen Savers` folder).
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
| `tempo/engine.js` | Tempo only – and every screen saver Tempo exports from then on |
| `shared/core.js`, `core-end.js`, `tokens.css`, `components.css`, `page.html` | Rubato **and** Tempo (controls, font loading, look and feel) |
| Rubato's settings (`D` in `core.js`, e.g. renaming a setting) | Rubato only from Tempo 0.3, which reads none of them. Tempo's engine still uses the shared defaults for the settings it draws with, so don't remove a key from `D` without checking `tempo/engine.js`. |

Rules:
1. Pull before you start; push when you finish. Don't have two chats editing `shared/` at the same time.
2. Any change to `shared/` means running `tests/parity.py`, `tests/split_check.py`, `tests/rubato_regress.py`, `tests/rubato_features.py` and `tests/tempo_check.py`, rebuilding both apps, and noting it in `CHANGELOG.md` under both apps. Any change to `rubato/` means running `tests/rubato_regress.py` and `tests/rubato_features.py`; any change to `tempo/` means `tests/tempo_check.py`.
3. Once an app deliberately changes behaviour, its parity scenarios against 0.8.1 will start to differ – that's expected. Say which differences are intended in the changelog.

## Tempo's time in words (0.2)
- **Steve's direction (6 Oct):** Ensemble ships In words as a handful of pre-made screen savers (variants), so each must be right wherever it's installed: always the computer's own time and date, nothing fetched. Put the effort into the typography.
- `tempo/saver.js` builds the sentence (`sentence()`), sets it (`wSet()`, sized by `fitSize()` when Fit is on, cached by `wLayout()`) and animates changes (`wordsFrame()`, `typed()`). It draws glyph outlines itself rather than through the engine's single-block layout, but uses the same faces, so baked fonts in exports draw identically.
- Every word has a key for its place in the sentence (`WKEYS`), so a change knows which words stay, change, arrive or leave. Words that keep their line and shift less than two ems glide; anything else rolls or fades out where it was and in where it lands.
- Line breaks: each word has a phrase (`GRP`) and the little words in `STICKY` hold on to the next, so lines break only between phrases. In Paragraph, a short lone last phrase pulls one down from the line above. Stacked puts each phrase on its own line. Optical margin uses each glyph's side bearing (`bearings()`, from the outline).
- Fit sizes the type for the longest sentence the settings can make (a Wednesday the twenty seventh of September at twelve fifty seven and fifty seven seconds) and keeps it – the size only changes when a setting does.
- Its settings (`ssW…`, plus `ssName` for the export name) are added to the defaults by `tempoDefaults()` in `tempo/app.js`, so `shared/core.js` is untouched. They go into exports as a `words` block only when Show is In words.
- Looks are `WORD_LOOKS` in `tempo/app.js`: each sets the whole of In words, mixing included. Eight from 0.3 (Night and Spotlight dropped at Steve's ask). Starter themes are `WORD_THEMES`. Both are placeholders for Steve's curated set (and his fonts – check the licence allows embedding outlines before shipping a face publicly).
- Exports are named by `exportName()`: the typed name, else “Tempo <look>”, else the core font; the HTML file name follows it. Variants need different names, or installing one replaces another. The Mac bundle identifier still says `uk.co.ensemble.rubato…` – invisible to people, left alone.
- **Set aside:** place, sunrise and sunset, and weather were built and tested (commit `c0cc72c`: NOAA sun maths, Open-Meteo place search and weather, place time zones) and then taken out, because a screen saver can't ask where it is. Starting point for the planned website, where the browser can ask.
- **Queued for that website (Steve, 6 Oct):** two dials – Accuracy (exact to vague: “about midday”) and Personality (deadpan to Northern to sweary). Needs a phrase bank written and approved before it's built. Paused.

## Tempo 0.3: fonts and mixing
- **Steve's direction (7 Oct):** take Rubato out of Tempo completely; drop the preview shapes; one Fonts card at the top with a "use as core" toggle; fold Mixed type into In words; lose Night and Spotlight; tracking per font; a font for each numeral in The time; keep the UI logical and keep earlier choices working.
- **Mixed type's brief (6 Oct), still open:** odd, quirky, retro display faces sitting within a Swiss aesthetic, grounded by Diatype. Don't take the Summer Social posters too literally; lines needn't stack; sentence case is fine. “How we feature the typefaces coming in and out is the key” – the three ways (each part, latest change, one at a time) are there to try. Display faces to come: Shatter, Brush Script, Frankfurter, Cortez, Balloon.
- **Fonts card:** drawn by `shared/core.js`, with Tempo's own row controls from `appFontRow()` in `tempo/app.js`: Use as core (sets `baseSlot`), Shuffle in (the style's `swap` flag – the pool for Shuffle, Latest change and One at a time) and Tracking (`tempo:tracks`). **Mixing** sits under the list in the same card, showing the words' settings (`ssM…`) or the numerals' (`ssN…`) depending on Show.
- **Words:** `words.mixed` = `{mode:'parts'|'latest'|'one', parts:{lead,time,sec,weekday,day,month,year}, when, each, little, match}`. `assignFaces()` in `tempo/saver.js` gives each word a font id (`fid`); `wSet()` sets it in that font at the core font's cap height (`capScale()`), with the core's tracking only on the core font and each font's own tracking (`C.tracks`) on top. `fitVariants()` puts each word in the widest font it could take before Fit sizes the sentence.
- **Numerals:** `clock.mixed` = `{mode, parts:{h1,h2,m1,m2,s1,s2,line2}, when, each, match}`. `clockFaces()` in `tempo/saver.js` picks a font per character of the time; the engine asks for it through `hooks.face(g)` and sets that character in that font (`charOptions(ch,id)`, scaled by cap height, `S.faceMatch`), with per-font tracking (`S.faceTrack`). `hooks.fitSlots()` lists every font a numeral could take, so the size holds. The outgoing time keeps its fonts during a change, and a character that only changes font still rolls.
- **Upgrade:** `upgrade()` in `tempo/app.js` runs once for settings without `ssVer:3` – Mixed type → In words with its base face as the core; In words with a highlight style → the time in that font; plain In words stays plain (0.2 saved Mixed type's defaults, including a shuffled time, for everyone, so those are reset); Saved looks → The time; a Rubato-text second line → none.
- **Lazaar (Steve's “clipping, uneven”):** Lazaar has no lower case (the lower-case keys draw capitals), side bearings of 10/1000 and ascent equal to cap height. The looks track tight (−20 to −40) and that tracking now only applies to the core font, so Lazaar mixed in keeps its spacing; as the core, give it its own tracking in Fonts (+30 to +60 looks right).

## Tests
- `tests/parity.py` – the six v0.8.1 handover tests (`tests/legacy/`), rewritten to drive both the reference and the new apps with randomness and the clock pinned. Compares 87 results: canvas frames, SVG/PNG/GIF, screen saver HTML, Mac and Windows zips, panel text, storage. Results that differ on purpose are named with the reason in `ON_PURPOSE` (Rubato 1.0's panel, tips and Randomise; Tempo 0.3's exports and panel) and everything else must match. Last run (`tests/PARITY-REPORT.md`, 7 October): 65 byte-identical, 1 live-preview frame within 0.8.1's own run-to-run variation, 21 on purpose; Rubato's results identical to a run on `main` before Tempo 0.3.
- Script-level check (6 October): the engine, saver runtime and Windows host blocks in the built Tempo and Rubato are byte-identical to 0.8.1's. The Mac packager block is one trailing newline shorter (`build.py` trims it); nothing reads that block as text, and the Mac zips still match byte for byte.
- `tests/split_check.py` – 15 checks that Rubato and Tempo are kept apart (from Tempo 0.3): fonts and v0.8.1 settings come over once, then nothing done in one reaches the other.
- `tests/rubato_regress.py` – Rubato 1.0 against the archived 0.9: 14 looks covering every 0.9 feature, six points in the loop each plus SVG and PNG. Last run: all byte-identical, and the kerning control case differed as it should.
- `tests/rubato_features.py` – 43 checks on 1.0's new features, including seamless loops. Last run: 43 of 43.
- `tests/tempo_check.py` – Tempo: the preview at the screen's shape, nothing of Rubato in the panel or exports, Tempo naming in all three exports, the time in words (sentences at pinned moments with parts on and off, line breaks across 200 random layouts, Stacked, Fit holding one size all year, optical margin, the eight looks, export names, every change style, exported page draws the same frame, the same export in New York shows New York's time), other fonts mixed into the words (each part, shuffle never repeating, every hour holding, latest change, one part at a time, a font per word, Fit allowing for the widest font), Use as core, each font's tracking, a font for each numeral (each numeral, shuffle, latest change, one at a time, exported page draws the same), and 0.2's settings carried over. Last run: 67 of 67.
- Not tested: video recording (real-time MediaRecorder, not comparable byte for byte), the Windows `.scr` on a real PC, the Mac `.saver` on a real Mac since Tempo 0.2 (the packager is unchanged; 0.1's bytes matched 0.8.1, which Steve confirmed works), Adobe Fonts loading (blocked in the test browser), the one-time copy of fonts on Steve's own browser (tested with fresh stores).

## Known limits (carried over)
- Windows `.scr`: untested on a real machine; main display only; unsigned (SmartScreen warns once).
- Mac `.saver`: needs "install for all users"; notarisation needs the Apple Developer Program.
- Variable fonts: TrueType (gvar) tested with Lora; CFF2 untested. Axis animation doesn't carry into screen saver exports.

## To do
1. Steve to try Tempo 0.3's mixing – which of the three ways (each part, latest change, one at a time) to keep, in the words and the numerals – and curate the looks once the other display faces arrive (Shatter, Brush Script, Frankfurter, Cortez, Balloon).
2. Steve to curate Rubato's built-in presets (the twelve are placeholders) and do a cut pass on the panel.
3. Test the Windows `.scr` on a real PC, and a 0.3 Mac `.saver` on a real Mac.
4. **Steve's list for Tempo (6 Oct), still to do:**
   - Clock, second line: weekday and date together; the ordinal ending (6th) on or off; time, day and date over several lines; an optional GMT / time zone label.
   - In words looks: only Reference is liked so far – rework the rest (Night and Spotlight dropped 7 Oct).
   - A third screen saver kind alongside The time and In words: time as data – minutes left in the year, seconds through the day, percentages.
   - Preload a few fonts grounded by a plain Swiss face in the spirit of ABC Diatype (Diatype is commercial – check the licence covers outlines in a distributed screen saver).
   **Steve to come back to: fonts for the screen saver.** Which faces ship, and whether their licences allow their outlines inside a distributed screen saver (Steve's own faces avoid the question; Adobe Fonts faces such as Aktiv Grotesk can't be loaded into Tempo as files anyway).
   Done in 0.3 (7 Oct): Rubato taken out of Tempo, the preview shapes, Mixed type folded into In words, tracking per font (Lazaar), a font for each numeral, the Fonts card with Use as core.
5. A website version of In words that uses the browser's location (place, sun, weather) and the Accuracy and Personality dials – its own project. Code for place, sun and weather is in commit `c0cc72c`.
6. Tutti onto the shared tokens and UI kit (see `tutti/HANDOVER.md`).
7. Develop each app in its own chat, from this repo.
8. Rubato, noted for later: physics per letter (blocks only in 1.0); Lottie export; transparent WebM / PNG sequence; more kinetic tricks and refinements to the three; a trick per block; dragging destinations on the canvas; Sequence and Repeat with blocks; preloaded / Google Fonts; a layers panel; anonymous analytics with an opt-in gallery. Full list in the Project doc `claude/rubato-next.md`.

## Rebuilding the Windows host
```
pip install ziglang
python3 -m ziglang cc -target x86_64-windows-gnu -Os -s -Wl,--subsystem,windows tempo/win/rubato_scr.c -o tempo/win/rubato_scr.exe -luser32 -lgdi32 -ladvapi32 -lshell32
```
Then base64 the `.exe` into `tempo/win/host.js` (`window.SAVER_WIN="…"`).

# Ensemble Tools – handover (6 October 2026, updated for Tempo 0.2)

Read this and `README.md` before changing anything. Tutti's own notes are in `tutti/HANDOVER.md`.

## Where things are
- **Repo:** `ensemble-tools` – source of truth for Rubato, Tempo and Tutti.
- **Live:** GitHub Pages from `docs/` on `main` (see README for switching it on).
- **Last combined app:** `reference/rubato-0.8.1.html` – identical to the v0.8.1 Claude artifact (checked line by line). Kept so the parity tests have something to compare against. Don't edit it.

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

## Storage
Everything is per browser and per site, so on GitHub Pages Rubato and Tempo share it.

| Key | Owner | Notes |
|---|---|---|
| `rubato:settings` | Rubato | Every setting, as before. Tempo reads it for texts, glyph picks, motion, variants and colours. |
| `rubato:presets` | Rubato | Saved looks. Tempo reads them for Saved looks mode. |
| `rubato:rand`, `rubato:collapsed`, `rubato:theme`, `rubato:panelW` | Rubato | |
| `tempo:settings` | Tempo | Only the screen saver settings (`ss…`, including the time in words' `ssW…`) and Tempo's own default style (`baseSlot`). |
| `tempo:themes`, `tempo:ssPicked`, `tempo:collapsed`, `tempo:theme`, `tempo:panelW` | Tempo | Each falls back to the `rubato:` key the first time, so v0.8.1 themes and choices carry over. |
| IndexedDB `rubato` › `fonts` | Shared | Font files, styles and the image. Load a font in either app and it's in both. |

## Behaviour notes (all as in v0.8.1 unless marked)
- **New:** Tempo reads Rubato's settings when it opens. Change something in Rubato, then reload Tempo to see it. (In v0.8.1 both were tabs of one page, so it was instant.)
- **New:** the default style is chosen separately in each app.
- **Moving to GitHub Pages is a new site**, so fonts, looks and themes saved in the Claude artifact won't be there. Load fonts again; carry current settings across with Presets › Save settings file.
- **Tempo 0.2:** exports say Tempo (read-mes, no-font name, `window.__TEMPO__`, Windows about box and `Tempo Screen Savers` folder). The preview shape buttons now follow the click.
- Found while testing, present in 0.8.1 too, **not fixed** (it's in `shared/`): a small pressed pill loses its label while the pointer is over it – `.pill.small:hover` in `components.css` beats `.seg .pill[aria-pressed="true"]` on colour. Shows on any segmented control you've just clicked. One-line fix for whichever chat next touches `shared/`: `.seg .pill[aria-pressed="true"]:hover{color:var(--on-ink)}`.

## Working in separate chats
One chat per stream: **Tutti**, **Rubato**, **Tempo**. Each starts by cloning this repo and reading this file.

What's linked:

| Change made in… | Affects |
|---|---|
| `rubato/` | Rubato only |
| `tempo/` (incl. `saver.js`, `mac/`, `win/`) | Tempo only |
| `tutti/` | Tutti only – it shares nothing yet |
| `shared/engine.js` | Rubato **and** Tempo – and every screen saver Tempo exports from then on |
| `shared/core.js`, `core-end.js`, `tokens.css`, `components.css`, `page.html` | Rubato **and** Tempo (controls, font loading, look and feel) |
| Rubato's settings (`D` in `core.js`, e.g. renaming a setting) | Tempo too – it reads Rubato's texts, glyph picks, motion and saved looks |

Rules:
1. Pull before you start; push when you finish. Don't have two chats editing `shared/` at the same time.
2. Any change to `shared/` means running both `tests/parity.py` and `tests/split_check.py`, rebuilding both apps, and noting it in `CHANGELOG.md` under both apps.
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

## Tests
- `tests/parity.py` – the six v0.8.1 handover tests (`tests/legacy/`), rewritten to drive both the reference and the new apps with randomness and the clock pinned. Compares 87 results: canvas frames, SVG/PNG/GIF, screen saver HTML, Mac and Windows zips, panel text, storage. Last run (`tests/PARITY-REPORT.md`): 85 byte-identical; the other two are live-preview frames that vary a little between runs of 0.8.1 itself, and the new build matched 0.8.1 exactly on both.
  Since Tempo 0.2 the new build's exports and Show control differ from 0.8.1 on purpose; `tempo02()` in `parity.py` maps those changes back and then requires an exact match, and the report says which change each result carried.
- `tests/split_check.py` – 13 checks on the new sharing between Rubato and Tempo.
- `tests/tempo_check.py` – Tempo 0.2: preview shape buttons, Tempo naming in all three exports, the time in words (cards, sentences at pinned moments with parts on and off, line breaks across 160 random layouts, Stacked, Fit holding one size all year, optical margin, looks and export names, every change style, exported page draws the same frame, fonts baked, the same export read in New York shows New York's time, clock exports untouched).
- Not tested: video recording (real-time MediaRecorder, not comparable byte for byte – the code is unchanged), the Windows `.scr` on a real PC, the Mac `.saver` on a real Mac since the split (bytes match 0.8.1, which Steve confirmed works), Adobe Fonts loading (blocked in the test browser).

## Known limits (carried over)
- Windows `.scr`: untested on a real machine; main display only; unsigned (SmartScreen warns once).
- Mac `.saver`: needs "install for all users"; notarisation needs the Apple Developer Program.
- Variable fonts: TrueType (gvar) tested with Lora; CFF2 untested. Axis animation doesn't carry into screen saver exports.

## To do
1. Tempo: optionally pick up Rubato changes without a reload. (0.2 did the shape highlight and the rename.)
2. Steve to curate Rubato's built-in presets (the current seven are placeholders).
3. Test the Windows `.scr` on a real PC.
4. Tempo: Steve to curate the In words looks and themes that ship as pre-made screen savers. Six starter looks are in place.
   **Steve to come back to: fonts for the screen saver.** Which faces ship, and whether their licences allow their outlines inside a distributed screen saver (Steve's own faces avoid the question; Adobe Fonts faces such as Aktiv Grotesk can't be loaded into Tempo as files anyway).
7. A website version of In words that uses the browser's location (place, sun, weather) and the Accuracy and Personality dials – its own project. Code for place, sun and weather is in commit `c0cc72c`.
5. Tutti onto the shared tokens and UI kit (see `tutti/HANDOVER.md`).
6. Develop each app in its own chat, from this repo.

## Rebuilding the Windows host
```
pip install ziglang
python3 -m ziglang cc -target x86_64-windows-gnu -Os -s -Wl,--subsystem,windows tempo/win/rubato_scr.c -o tempo/win/rubato_scr.exe -luser32 -lgdi32 -ladvapi32 -lshell32
```
Then base64 the `.exe` into `tempo/win/host.js` (`window.SAVER_WIN="…"`).

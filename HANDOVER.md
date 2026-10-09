# Ensemble Tools – handover (8 October 2026, updated for Rubato 1.0 and Tempo 0.7)

Read this and `README.md` before changing anything. Tutti's own notes are in `tutti/HANDOVER.md`.

## Where things are
- **Repo:** `ensemble-tools` – source of truth for Rubato, Tempo and Tutti.
- **Live:** https://steviewaring-arch.github.io/ensemble-tools/ – GitHub Pages from `docs/` on `main`. Each push to `main` redeploys in a minute or two. Moving to a GitHub Actions deploy of `site/` (docs/ plus Tempo's built-in fonts from a private repo) once Steve has set it up – see `LICENCES.md`.
- **Last combined app:** `reference/rubato-0.8.1.html` – byte-identical to the v0.8.1 Claude artifact (rechecked 6 October against the live artifact). Kept so the parity tests have something to compare against. Don't edit it.
- **Versions:** Rubato 1.1, Tempo 0.8, Tutti 6.1 (all three on the UI system, 9 Oct). Rubato 0.9 is still live at /rubato/0.9/ (`archive/rubato-0.9.html`).

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
| `tempo:settings` | Tempo | The screen saver settings (`ss…`: the time, `ssW…` the words, `ssM…` mixing into the words, `ssN…` mixing into the numerals, `ssDial…` the dial, `ssVer` – 4 once earlier versions' settings have been moved up) and the core font (`baseSlot`). Saved 300 ms after a change, or as the page closes. |
| `tempo:tracks` | Tempo | Each font's own tracking, by style id. |
| `tempo:themes`, `tempo:collapsed`, `tempo:theme`, `tempo:panelW` | Tempo | |
| `tempo:own` | Tempo | Set once 0.3 has copied whatever earlier versions left only under `rubato:` (settings, themes, light/dark, panel width). |
| `tempo:builtinsDone` | Tempo | Built-in fonts already offered, by file (0.7) – each is switched on once, the first time Tempo opens with it. (0.4–0.6 kept a single `tempo:builtins` flag, now ignored.) |
| `tempo:folds` | Tempo | Which folds inside the cards are shut. |
| `tempo:presets` | Tempo | Saved screen savers (0.6): `{id, name, exportName, settings, fonts:{id:{name,family,file}}, on, pool, tracks, themes, saved}`. |
| `tempo:active`, `tempo:back` | Tempo | The preset open and its signature when opened or saved (for “changed since saved”); what was on screen, unsaved, before a preset was opened over it. |
| IndexedDB `tempo` › `fonts` | Tempo | Font files and styles (a style can be `off`: kept, but not used). The first time Tempo 0.3 opens, it copies the fonts in IndexedDB `rubato` (not the image); after that the two are separate. |

## Behaviour notes (all as in v0.8.1 unless marked)
- **Tempo 0.3:** Rubato and Tempo are separate apps that happen to share a core. Nothing done in one shows up in the other (`tests/split_check.py`).
- **Moving to GitHub Pages is a new site**, so fonts, looks and themes saved in the Claude artifact won't be there. Load fonts again; carry current settings across with Presets › Save settings file.
- **Tempo 0.2:** exports say Tempo (read-mes, no-font name, `window.__TEMPO__`, Windows about box and `Tempo Screen Savers` folder).
- Fixed in Tempo 0.4 (shared, so Rubato too): a small pressed pill lost its label while the pointer was over it.

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
- **Mixed type's brief (6 Oct), still open:** odd, quirky, retro display faces sitting within a Swiss aesthetic, grounded by a plain Swiss core font (Timeless Sans from 0.7). Don't take the Summer Social posters too literally; lines needn't stack; sentence case is fine. “How we feature the typefaces coming in and out is the key” – the three ways (each part, latest change, one at a time) are there to try. Display faces to come: Shatter, Brush Script, Frankfurter, Cortez, Balloon.
- **Fonts card:** drawn by `shared/core.js`, with Tempo's own row controls from `appFontRow()` in `tempo/app.js`: Use as core (sets `baseSlot`), Shuffle in (the style's `swap` flag – the pool for Shuffle, Latest change and One at a time) and Tracking (`tempo:tracks`). **Mixing** sits under the list in the same card, showing the words' settings (`ssM…`) or the numerals' (`ssN…`) depending on Show.
- **Words:** `words.mixed` = `{mode:'parts'|'latest'|'one', parts:{lead,time,sec,weekday,day,month,year}, when, each, little, match}`. `assignFaces()` in `tempo/saver.js` gives each word a font id (`fid`); `wSet()` sets it in that font at the core font's cap height (`capScale()`), with the core's tracking only on the core font and each font's own tracking (`C.tracks`) on top. `fitVariants()` puts each word in the widest font it could take before Fit sizes the sentence.
- **Numerals:** `clock.mixed` = `{mode, parts:{h1,h2,m1,m2,s1,s2,line2}, when, each, match}`. `clockFaces()` in `tempo/saver.js` picks a font per character of the time; the engine asks for it through `hooks.face(g)` and sets that character in that font (`charOptions(ch,id)`, scaled by cap height, `S.faceMatch`), with per-font tracking (`S.faceTrack`). `hooks.fitSlots()` lists every font a numeral could take, so the size holds. The outgoing time keeps its fonts during a change, and a character that only changes font still rolls.
- **Upgrade:** `upgrade()` in `tempo/app.js` runs once for settings without `ssVer:3` – Mixed type → In words with its base face as the core; In words with a highlight style → the time in that font; plain In words stays plain (0.2 saved Mixed type's defaults, including a shuffled time, for everyone, so those are reset); Saved looks → The time; a Rubato-text second line → none.
- **Lazaar (Steve's “clipping, uneven”):** Lazaar has no lower case (the lower-case keys draw capitals), side bearings of 10/1000 and ascent equal to cap height. The looks track tight (−20 to −40) and that tracking now only applies to the core font, so Lazaar mixed in keeps its spacing; as the core, give it its own tracking in Fonts (+30 to +60 looks right).

## Tempo 0.4: the font library
- **Steve (7 Oct):** the retro classics plus a plain Swiss core font as defaults, each switchable on and off, with uploads alongside; fonts transitioning through on change or by the minute; the odd numeral or all in another font; The time / In words first; folds inside the cards; zero or oh; words or figures for each part. Context: the end product is about half a dozen screen savers – a simple Swiss one, one celebrating Lazaar (where this started), one that mixes things up, and so on.
- **Built-in fonts:** the repo and site are public, so a font in `docs/` is downloadable by anyone. `tempo/fonts/fonts.json` (copied by `build.py` with the files it lists) is for fonts cleared to publish as files – none yet. From 0.7, fonts whose licence allows them only inside the app (Timeless) are embedded in the page from `private/fonts/` into `site/` – see Tempo 0.7 below and `LICENCES.md`. Entries: `{file, name, on, core, shuffle, tracking, credit}`.
- **The pack:** Steve has `Tempo fonts 0.7.zip` (sent in the Tempo chat, 8 Oct, not in the repo – it replaces 7 Oct's): Timeless Sans (core, with the licence), Lazaar Soft and Block (tracking +40), and 18 retro faces after duplicates were dropped. Collage and Traffic were pulled out of old Mac suitcases. Sinaloa is on but out of the shuffle (nearly twice as wide, so Fit would set everything small); Kwarthel (its layers overlap in one colour) and Ransite Medieval (a personal-use copy whose figures are a licence notice) start off. Not usable from his zip, bitmaps only: Blippo, Brush Script, Banco, Choc D, Deco Geometric, Die Nasty, Gill Kayo, Gillies Gothic.
- **Code:** `loadFiles()` in `shared/core.js` reads zips (`unzip()`), skips fonts already loaded by family and style, and hands a zip's JSON to `appFontsLoaded()`. Tempo's rows are `appFontRow()`, built-in rows `appFontList()`, first-run built-ins `appFontsRestored()`, the order `sortFonts()`. Mixing gained `order` ('shuffle' | 'turn', `pickFace()` in `saver.js`) and the mode 'some' with `amount`. Words take `nums:{time,sec,date,year}` and `zero`. Looks may name fonts (`fonts:` in `WORD_LOOKS`, resolved by `fontNamed()`). Folds: `fold()` in `tempo/app.js`.
- **Fit and wide fonts:** Fit leaves room for the widest font any word or numeral could take, so one very wide face in the shuffle makes everything smaller. Keep such faces out of the shuffle and pick them for a part instead.

## Tempo 0.5: the dial
- **Steve (7 Oct):** a third Show option, As a dial – no type, variants on his two drawings (rays from a space in the middle with red hands; ticks in from the edge with cyan, apricot and pink hands): colour, transition, detail, key line weights, “real Braun level minimalism”. Also: add his 16,00 grab (grey, acid yellow, a dark comma) as a colour theme with a time name, drop Ultraviolet, remove Looks, and word the panel so it could be public.
- **Code:** `dialFrame()` in `tempo/saver.js` – plain canvas lines, no engine. `dMarks()` lists every mark (minute, kind, from and to, or a dot's radius); `dHands()` says where each hand points from the local time, with the milliseconds, so nothing is kept between frames (sweep, tick, stop at 12 in 58.5 s; glide or step; `dEase()` for Snappy, Smooth, Elastic – a damped spring). The trail redraws the marks the second hand has passed in its colour. Weights are thousandths of the radius, so a dial looks the same at any size. Config: `dial:{face, detail, hole, tick, ring, line, key, hand, secs, secMove, minMove, feel, len, trail, tails, centre, size, colours:{bg,min,hour,quarter,handH,handM,handS}, rotate, themes}`; exports bake no fonts. Panel: Face and Hands cards, Size under Position, a Colour card with `DIAL_THEMES`, in `tempo/app.js`.
- **Hands per face** (share of the radius – hour, minute, second): rays .36/.66/.99, ticks .5/.79/1, dots .5/.78/.9, hands only .5/.8/.95. Rays: hours run to 60 % of the way out from the middle space, quarters 26 %. Ticks: hours 3× the tick length, quarters 5×.
- **Noon** is `#D3D5D5` / `#F4FD5F` / `#1E2023`, sampled from the grab. Tempo's defaults open The time in Noon; saved colours are untouched. `tests/parity.py` sets 0.8.1's colours before it compares Tempo's frames.
- **Looks** (and `fontNamed`, `applyLook`) are gone; the nine looks' settings are in git history (`tempo/app.js` at 0.4, `WORD_LOOKS`) if any become one of the shipped screen savers.

## Tempo 0.6: presets
- **Steve (8 Oct):** “The key thing is the saving aspect – build in a save presets aspect – or seed, where I can develop the 12 styles and know nothing is lost.” He has downloads he likes and no way to edit them – hence opening HTML files.
- **What a preset is:** `snapshot()` in `tempo/app.js` – every Tempo setting (all three kinds of screen saver, so switching Show inside a preset loses nothing), the export name, the fonts on (described by name, family and file, since style ids are per browser), the shuffle pool, each font's tracking, the user's colour themes. `resolveFonts()` finds them again – by id and name in the same browser, then file, then name – and `openPreset()` applies settings, remaps font ids, switches on the preset's fonts, sets Shuffle in and tracking. “Changed since saved” compares `sigOf()` (settings, export name, fonts on, pool, tracking) with the signature taken when it was opened or saved.
- **No seed:** nothing in Tempo is seeded – Shuffle and Random colour follow the clock – so the settings are the whole recipe. A seed only matters if a seeded random variant is added.
- **Files:** exports carry `cfg.edit` (the preset). `presetFromPage()` reads it from an HTML page, a Mac zip (`*.saver/Contents/Resources/index.html`), a Windows zip or `.scr` (page before the 24-byte `RBTOSCR1` footer); without it, `presetFromConfig()` rebuilds the settings from the config's blocks (`base` holds the time's settings; `words`, `clock.mixed`, `dial` are mapped back key by key – `W_MAP`, `MX_MAP`, `DL_MAP` and friends). Checked against real 0.4 downloads. A file whose preset matches one already saved opens that one.
- **Built in:** `tempo/presets.json` (copied by `build.py`, `{"presets":[]}` if absent) in the same form as a Download all file. To ship the twelve: curate them in Tempo, Download all, trim to the ones that ship, save as `tempo/presets.json`. Their fonts must be loaded (or built in) to look right.
- **Tiles:** each drawn by its own saver at 384 × 240 (dial line weights × 2.5, or hairlines vanish), a few at a time, redrawn each minute.

## Tempo 0.7: Timeless built in, and a path fix
- **Steve (8 Oct):** remove the old core font from Tempo entirely and bake in Timeless Sans, with adding your own fonts still there; why does Lazaar Soft look clipped when Block doesn't; the Timeless terms, and how they're kept on GitHub.
- **Timeless:** Steve's files are six cuts of Timeless Sans: Sans Regular and Medium, Grotesk Medium, Semibold and Black (CFF), and the variable font (TrueType, `wght` 300–800, `ital`, `STYL` from Grotesk to Sans; its file is named Grotesk Light). Kept as WOFF in `private/fonts/` (git-ignored), originals in `private/fonts/originals/`, licence text alongside. On in Tempo: Sans Regular (core), Sans Medium and the three Grotesk weights, none shuffling in. The variable font is listed, off. The licence's terms and what they mean for the repo are in `LICENCES.md`.
- **How built-ins load:** `EMBEDDED` (the `#tempo-builtin-fonts` JSON block `build.py` writes into `site/tempo/index.html`) plus `fonts/fonts.json`; `builtinFile()` turns either into a File for `loadFiles()`. Each built-in is offered once, by file (`tempo:builtinsDone`), so the first open of 0.7 also makes Timeless the core for someone who used Tempo before; their own fonts stay in the list. The Fonts card shows each built-in's `credit`. Exports carry outlines only – the embedded block never goes into them.
- **Names:** exports are named after the preset open, else Tempo, Tempo Words or Tempo Dial – never the core font's family any more (Timeless's licence forbids naming a product after it).
- **Lazaar Soft “clipped”:** not the font – ours. opentype.js writes a coordinate a hair below zero (−1e-13 from CFF arithmetic) as “0” with no separator, so two numbers run together in the SVG path (`227.370` for `227.37 0`) and parts of a glyph vanish. 37 of Lazaar Soft's glyphs were hit (N, M, T, t, n, m, k, r, 4 and alternates), two of Block's (#, ‡). `snap()` in `shared/core.js` sets such values to 0 before `toPathData`. It's the shared font loader, so Rubato is fixed too. Exports made before 0.7 with Lazaar Soft carry the broken outlines – open them as presets and export again.
- **Guard:** `tests/licence_check.py` – no font files tracked, no embedded-fonts block, no stretch of any private font's data in any tracked file. Run before pushing.

## Tests
- `tests/licence_check.py` – keeps licensed fonts out of the public repo (see `LICENCES.md`). Last run: 4 of 4.
- `tests/parity.py` – the six v0.8.1 handover tests (`tests/legacy/`), rewritten to drive both the reference and the new apps with randomness and the clock pinned. Compares 87 results: canvas frames, SVG/PNG/GIF, screen saver HTML, Mac and Windows zips, panel text, storage. Results that differ on purpose are named with the reason in `ON_PURPOSE` (Rubato 1.0's panel, tips and Randomise; Tempo 0.3's exports and panel) and everything else must match. Tempo opens in Noon from 0.5, so the run sets 0.8.1's colours before comparing Tempo's frames. Last run (`tests/PARITY-REPORT.md`, 8 October, Tempo 0.7): 59 byte-identical, 1 live-preview frame within 0.8.1's own run-to-run variation, 27 on purpose (five more than 0.6: Tempo's export file names no longer use the font's name); Rubato's results identical to a run on `main` before Tempo 0.3.
- Script-level check (6 October): the engine, saver runtime and Windows host blocks in the built Tempo and Rubato are byte-identical to 0.8.1's. The Mac packager block is one trailing newline shorter (`build.py` trims it); nothing reads that block as text, and the Mac zips still match byte for byte.
- `tests/split_check.py` – 15 checks that Rubato and Tempo are kept apart (from Tempo 0.3): fonts and v0.8.1 settings come over once, then nothing done in one reaches the other.
- `tests/rubato_regress.py` – Rubato 1.0 against the archived 0.9: 14 looks covering every 0.9 feature, six points in the loop each plus SVG and PNG. Last run: all byte-identical, and the kerning control case differed as it should.
- `tests/rubato_features.py` – 43 checks on 1.0's new features, including seamless loops. Last run: 43 of 43.
- `tests/tempo_check.py` – Tempo: the font library (zip packs, duplicates, a pack's settings, on and off, built-in fonts), in turn and a few at random, words or figures and zero or oh, folds, the preview at the screen's shape, nothing of Rubato in the panel or exports, Tempo naming in all three exports, the time in words (sentences at pinned moments with parts on and off, line breaks across 200 random layouts, Stacked, Fit holding one size all year, optical margin, export names, every change style, exported page draws the same frame, the same export in New York shows New York's time), other fonts mixed into the words (each part, shuffle never repeating, every hour holding, latest change, one part at a time, a font per word, Fit allowing for the widest font), Use as core, each font's tracking, a font for each numeral (each numeral, shuffle, latest change, one at a time, exported page draws the same), 0.2's and 0.3's settings carried over, and the dial (cards, export without fonts, the hands for each way of moving, every face and detail, trail, ring, weights, themes on the hour, the exported page drawing the same frame, Mac and Windows exports, settings remembered), and presets (save, change, save changes, open with fonts' shuffle and tracking, Back to what you had, reload, a download opened in another browser, pre-0.6 downloads for words, dial and the time, Mac, Windows and `.scr`, other files turned away, dropping, Delete, Download all and back, one preset's file, tiles, built-ins), plus exported outlines drawing exactly as the font does, fonts embedded in the page, and export names. Last run: 119 of 119.
- Not tested: video recording (real-time MediaRecorder, not comparable byte for byte), the Windows `.scr` on a real PC, the Mac `.saver` on a real Mac since Tempo 0.2 (the packager is unchanged; 0.1's bytes matched 0.8.1, which Steve confirmed works), Adobe Fonts loading (blocked in the test browser), the one-time copy of fonts on Steve's own browser (tested with fresh stores).

## Known limits (carried over)
- Windows `.scr`: untested on a real machine; main display only; unsigned (SmartScreen warns once).
- Mac `.saver`: needs "install for all users"; notarisation needs the Apple Developer Program.
- Variable fonts: TrueType (gvar) tested with Lora; CFF2 untested. Axis animation doesn't carry into screen saver exports.

## To do
0. **Timeless on the live site – option B chosen (8 Oct).** Steve to set up the private fonts repo, the `FONTS_TOKEN` secret and Pages from Actions (steps in `LICENCES.md`); then run `.github/workflows/pages.yml` by hand, check the live Tempo, and switch its `push` trigger on. Also: ask Timeless (hello@timeless.co) to confirm that a free tool may embed Timeless and export screen savers carrying its outlines. Until then the live Tempo has no built-in font; Steve's pack has Timeless for his own browser.
1. **Next Tempo round: the dials** (Steve, 8 Oct: “work into the dials a little more”) – Steve to review 0.5's dial first: which faces, movements and themes to keep, and what else the Braun-minimal direction wants (see the dial ideas below). Then **curate the twelve** with 0.6's presets – open the downloads he likes, refine, save – and ship them as built-in presets (`tempo/presets.json`). Tempo 0.4 with the font pack: which ways of mixing to keep (each part, latest change, one at a time, a few at random; shuffled or in turn), in the words and the numerals, and curate the half-dozen screen savers. Decide which fonts, if any, are built in publicly (Lazaar?) – and, for the screen savers Ensemble ships, whether each font's licence allows its outlines inside a distributed file.
2. Steve to curate Rubato's built-in presets (the twelve are placeholders) and do a cut pass on the panel.
3. Test the Windows `.scr` on a real PC, and a 0.3 Mac `.saver` on a real Mac.
4. **Steve's list for Tempo (6 Oct), still to do:**
   - Clock, second line: weekday and date together; the ordinal ending (6th) on or off; time, day and date over several lines; an optional GMT / time zone label.
   - Looks removed in 0.5 (the panel is the settings); the shipped screen savers will be curated as saved settings or exports instead.
   - A third screen saver kind alongside The time and In words: time as data – minutes left in the year, seconds through the day, percentages.
   - Preload a few fonts grounded by a plain Swiss face – Timeless Sans from 0.7 (built in once its hosting is settled, see `LICENCES.md`).
   **Steve to come back to: fonts for the screen saver.** Which faces ship, and whether their licences allow their outlines inside a distributed screen saver (Steve's own faces avoid the question; Adobe Fonts faces such as Aktiv Grotesk can't be loaded into Tempo as files anyway).
   Done in 0.3 (7 Oct): Rubato taken out of Tempo, the preview shapes, Mixed type folded into In words, tracking per font (Lazaar), a font for each numeral, the Fonts card with Use as core. In 0.4: the font library and pack, in turn, a few at random, words or figures per part, zero or oh, The time / In words first, folds.
   - Alternates: with Rubato gone, Tempo's clock uses every alternate the core font has – there's no way yet to pick which (Rubato's glyph picker did that).
   - Old Mac bitmap fonts can't be used; they need OTF or TTF versions.
5. **Steve's notes for Tempo from the car (8 Oct)**, in rough priority:
   - **Saving – done in 0.6:** presets, a file per preset and one for all, downloads reopened (HTML, Mac, Windows), built-in presets ready for the twelve. A seed isn't needed (nothing is seeded – see Tempo 0.6 above).
   - **“Everything is twelve”:** twelve screen savers to give away (or six to start), twelve colour themes within a style, twelve dials. The built-in presets above are where this lands.
   - **Pulse variants** for the separator (now one fade): keep the fade, add a clean tick (hard on and off), and a colon whose top and bottom dots take turns.
   - **Default font: Timeless** – done in 0.7 (Steve, 8 Oct: Timeless Sans replaces the old core font everywhere). Its licence forbids public repositories and servers, so it's embedded only in `site/`, from `private/fonts/` – live once hosting is decided (`LICENCES.md`, A or B).
   - **Lyrics, a fourth style** (or part of In words): sixty time-related song lyrics, one a minute through the hour, set big, with artist and year small bottom left. **Licensing is the blocker** – lyrics are copyright, and a screen saver given away is publishing them; even short lines need the publisher's permission. Alternatives: lyrics cleared or written for it, or public-domain lines (published before 1929).
   - **Mac options:** can the screen saver's settings show in macOS's own Options sheet (colour every minute or second, monochrome)? Not with the current bundle – it's a re-signed WebViewScreenSaver whose sheet only takes a URL. It needs a native screen saver built in Xcode reading the options and passing them to the page (Windows' Settings button is the same story). Scope before promising it in promotion.
   - **Promotion (later, wants a light roadmap):** give the screen savers away free first and gauge pickup, then perhaps the tool; trackable download links (Bitly or similar); paid Instagram ads; screen recordings of favourites in a clean device mock-up (Apple Studio Display), stitched into motion – nothing fussy.
   - **UI, parked:** the left panel is long; move Export (and maybe Show) to a right-hand panel and keep the left for tweaking; a touch smaller overall. Not to be done in isolation – one refined UI style shared by Tutti, Tempo, Rubato and what comes next (see 7: its own stream).
   - The dial (“time dial looks to come back”) went in as 0.5 on 7 Oct – Steve to review it.
6. A website version of In words that uses the browser's location (place, sun, weather) and the Accuracy and Personality dials – its own project. Code for place, sun and weather is in commit `c0cc72c`.
7. **UI as its own stream** (Steve, 8 Oct) – brief in `UI-BRIEF.md`: one refined UI style across all the tools rather than redesigning each on its own – its own chat in this Project, working in this repo. It owns `shared/tokens.css`, `shared/components.css` and a component page (all the parts, both themes) that the apps are checked against; app streams don't restyle in the meantime, they log requests for it. Agree the layout pattern first (controls on the left, output and Export on a right-hand panel, scale), then move Rubato and Tempo (already on the shared files), then Tutti (see `tutti/HANDOVER.md`). Behaviour stays the same – the parity and app tests hold it.
8. Develop each app in its own chat, from this repo.
9. Rubato, noted for later: physics per letter (blocks only in 1.0); Lottie export; transparent WebM / PNG sequence; more kinetic tricks and refinements to the three; a trick per block; dragging destinations on the canvas; Sequence and Repeat with blocks; preloaded / Google Fonts; a layers panel; anonymous analytics with an opt-in gallery. Full list in the Project doc `claude/rubato-next.md`.

## UI requests
For the UI stream (`UI-BRIEF.md`). App chats add what they'd like changed in the interface here instead of restyling.
- Done 9 Oct: Tempo's long panel, with Export, Show and Presets moved out and everything a touch smaller – see the UI system below.

**UI system (9 Oct): live on all three tools.** Tempo 0.8, Rubato 1.1 and Tutti 6.1 are on it. The rules are in `shared/UI.md`; the three rounds of mock-ups and the reasoning are at `ui/review/` (built to `docs/ui/review/`, unlisted).
- **The frame.** The work fits the clear space; **Preview** (the arrows top right, or F) fills the window with it and leaves the controls in place.
  - The frosted panel floats on the left.
  - Top right: chips, then Preview and light/dark.
  - The island, bottom centre, holds the view's controls and Export, which opens as a sheet. Status shows in the island.
  - Presets has its own capsule bottom right.
- **Cards** say what's set when shut. Most start shut (`appCollapseDefault()`); write `SUMMARY[id]` where the automatic line isn't clear.
- **For app chats:**
  - Build cards with `card()`. Put a card in a sheet with `cardToSheet(body, 'export' | 'presets')`. Put view controls in the island with `toIsland(node)`. Sheets open with `openSheet(name)`.
  - A range in a `.ctl` becomes the system slider and segmented controls lay themselves out, so don't restyle these by hand.
  - Add UI wants here under UI requests.
- **Tutti** keeps its own page and script. `build.py` puts `shared/tokens.css`, `shared/components.css`, `tutti/frame.css` and `tutti/frame.js` into it. Moving onto the shared core (fonts, controls) is still to do. Its exports were checked byte for byte against 6.0.
- **Tests** open sheets through `tests/ui_helpers.py`. Labels and accessible names are the contract: rename one only together with its test.
- **Still to do:**
  - Check the Squarespace embed of Tutti at its real size.
  - Decentish takes the tokens only (type and colour).
  - A component page at /ui/ with every part in every state, if wanted beyond the review page.
  - Tempo's Fonts card hints are long; trim them with the Tempo chat.

## Dial ideas not built yet (0.5)
- Hand shapes: tapered or rounded ends, a counterweight on the second hand, a ring at the centre instead of a dot.
- Marks: numerals or a single 12 (would bring type back), a second ring inside, a 24-hour dial, a minute track of dashes.
- Movement: the face turning instead of the hands, marks drawing in when the screen saver starts, a theme cross-fading on the hour rather than switching.
- Two dials (another time zone) – out of scope while the screen saver shows only the computer's own time.

## Rebuilding the Windows host
```
pip install ziglang
python3 -m ziglang cc -target x86_64-windows-gnu -Os -s -Wl,--subsystem,windows tempo/win/rubato_scr.c -o tempo/win/rubato_scr.exe -luser32 -lgdi32 -ladvapi32 -lshell32
```
Then base64 the `.exe` into `tempo/win/host.js` (`window.SAVER_WIN="…"`).

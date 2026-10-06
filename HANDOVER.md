# Ensemble Tools – handover (6 October 2026, updated for Rubato 1.0)

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
| `tempo:settings` | Tempo | Only the screen saver settings (`ss…`) and Tempo's own default style (`baseSlot`). |
| `tempo:themes`, `tempo:ssPicked`, `tempo:collapsed`, `tempo:theme`, `tempo:panelW` | Tempo | Each falls back to the `rubato:` key the first time, so v0.8.1 themes and choices carry over. |
| IndexedDB `rubato` › `fonts` | Shared | Font files, styles and the image. Load a font in either app and it's in both. |

## Behaviour notes (all as in v0.8.1 unless marked)
- **New:** Tempo reads Rubato's settings when it opens. Change something in Rubato, then reload Tempo to see it. (In v0.8.1 both were tabs of one page, so it was instant.)
- **New:** the default style is chosen separately in each app.
- **Moving to GitHub Pages is a new site**, so fonts, looks and themes saved in the Claude artifact won't be there. Load fonts again; carry current settings across with Presets › Save settings file.
- Exports still say "Rubato" in a few places (the read-mes' "Made with Rubato", the fallback name when no font is loaded, the Windows folder `Rubato Screen Savers`, `window.__RUBATO__` inside the HTML). Left alone so Tempo's exports match 0.8.1 exactly. Rename in Tempo 0.2.
- Found while testing, present in 0.8.1 too: Tempo's Laptop/Display/Portrait buttons don't move their highlight when clicked (the preview does change). In 0.8.1 switching tabs repainted them; now only a reload does. One-line fix – worth doing first in Tempo 0.2.

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

## Tests
- `tests/parity.py` – the six v0.8.1 handover tests (`tests/legacy/`), rewritten to drive both the reference and the new apps with randomness and the clock pinned. Compares 87 results: canvas frames, SVG/PNG/GIF, screen saver HTML, Mac and Windows zips, panel text, storage. Last run (`tests/PARITY-REPORT.md`, 6 October, fresh clone): 87 of 87 byte-identical. Two live-preview frames are timing-sensitive and can vary a little between runs of 0.8.1 itself – the test allows for that, but this run didn't need it.
- Script-level check (6 October): the engine, saver runtime and Windows host blocks in the built Tempo and Rubato are byte-identical to 0.8.1's. The Mac packager block is one trailing newline shorter (`build.py` trims it); nothing reads that block as text, and the Mac zips still match byte for byte.
- `tests/split_check.py` – 13 checks on the new sharing between Rubato and Tempo. Last run (Rubato 1.0): 13 of 13.
- `tests/rubato_regress.py` – Rubato 1.0 against the archived 0.9: 14 looks covering every 0.9 feature, six points in the loop each plus SVG and PNG. Last run: all byte-identical, and the kerning control case differed as it should.
- `tests/rubato_features.py` – 43 checks on 1.0's new features, including seamless loops. Last run: 43 of 43.
- Since Rubato 1.0, `tests/parity.py`'s Rubato steps differ from 0.8.1 where intended (panel read-out, tip count, Randomise draws); its Tempo results all match.
- Not tested: video recording (real-time MediaRecorder, not comparable byte for byte – the code is unchanged), the Windows `.scr` on a real PC, the Mac `.saver` on a real Mac since the split (bytes match 0.8.1, which Steve confirmed works), Adobe Fonts loading (blocked in the test browser).

## Known limits (carried over)
- Windows `.scr`: untested on a real machine; main display only; unsigned (SmartScreen warns once).
- Mac `.saver`: needs "install for all users"; notarisation needs the Apple Developer Program.
- Variable fonts: TrueType (gvar) tested with Lora; CFF2 untested. Axis animation doesn't carry into screen saver exports.

## To do
1. Tempo 0.2: fix the preview shape highlight; rename "Rubato" in exports; optionally pick up Rubato changes without a reload.
2. Steve to curate Rubato's built-in presets (the twelve are placeholders) and do a cut pass on the panel.
3. Test the Windows `.scr` on a real PC.
4. Tempo: Swiss-style looks from Steve, with a small set of variations.
5. Tutti onto the shared tokens and UI kit (see `tutti/HANDOVER.md`).
6. Develop each app in its own chat, from this repo.
7. Rubato, noted for later: physics per letter (blocks only in 1.0); Lottie export; transparent WebM / PNG sequence; more kinetic tricks and refinements to the three; a trick per block; dragging destinations on the canvas; Sequence and Repeat with blocks; preloaded / Google Fonts; a layers panel; anonymous analytics with an opt-in gallery. Full list in the Project doc `claude/rubato-next.md`.

## Rebuilding the Windows host
```
pip install ziglang
python3 -m ziglang cc -target x86_64-windows-gnu -Os -s -Wl,--subsystem,windows tempo/win/rubato_scr.c -o tempo/win/rubato_scr.exe -luser32 -lgdi32 -ladvapi32 -lshell32
```
Then base64 the `.exe` into `tempo/win/host.js` (`window.SAVER_WIN="…"`).

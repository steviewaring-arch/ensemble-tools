# Ensemble Tools

Ensemble's in-house creative tools. Each one is a single HTML file that runs in the browser – no install, no server, fonts stay on your computer.

| Tool | What it does | Live |
|---|---|---|
| **Tutti** 6.1 | Halftones from images, video, your camera or type | [/tutti/](https://steviewaring-arch.github.io/ensemble-tools/tutti/) |
| **Rubato** 1.1 | Type in motion – lockups that pull apart, kinetic tricks, kerning, alternates, styles and variable axes, out as PNG, SVG, GIF or video | [/rubato/](https://steviewaring-arch.github.io/ensemble-tools/rubato/) (0.9 at [/rubato/0.9/](https://steviewaring-arch.github.io/ensemble-tools/rubato/0.9/)) |
| **Tempo** 0.8 | A clock screen saver for Mac and Windows – the time in your own typefaces, as figures or written out in words with other fonts mixed in, or as a dial with no type at all. Save presets and reopen anything you've downloaded | [/tempo/](https://steviewaring-arch.github.io/ensemble-tools/tempo/) |

All three are linked from https://steviewaring-arch.github.io/ensemble-tools/.

**Decentish** 0.4 is also in here, unlisted: a prototype website that gives you a plan for where you are – now, soon or tomorrow, on the doorstep, nearby or further afield, with the way there and back – in a voice you set with a dial. Greater Manchester first. https://steviewaring-arch.github.io/ensemble-tools/decentish/ – see `decentish/NOTES.md`.

Rubato and Tempo share one core (font loading, controls, design system) and nothing else: each has its own type engine, settings and fonts in the browser, so a change in one never reaches the other. All three share one interface system (`shared/tokens.css`, `shared/components.css`, described in `shared/UI.md`): Tutti keeps its own page and script and takes the shared styles at build time; it moves onto the shared core (fonts, controls) later.

## How the repo is laid out

```
shared/        used by more than one app
  tokens.css       the UI system's tokens: colour, type, sizes, radii, space – light and dark
  components.css   the frame (stage, floating panel, top bar, island, sheets, Presets capsule, Preview) and every control
  UI.md            the UI system: what each part is for, when to use it, and the wording rules
  page.html        the page shell every app is poured into
  core.js          settings, storage, font loading, image layer, control builders, cards and their summaries, sheets, Preview, tooltips, Fonts card
  core-end.js      downloads, status in the island, drag and drop, light/dark, Preview and keys, panel width, start-up
  gif.js           GIF encoder
  home.html        the index page that links to all three tools
rubato/        engine.js (Rubato's type engine: blocks, physics, kerning, Jitter/Assemble/Scramble)
               controls.js (steppers, dials, range pair, loop bar, path pad, More folds)
               stage.js (kerning on the preview, physics guides, preset tiles)
               app.js (cards, picker, randomise, presets), export.js, app.html, app.css
tempo/         engine.js (Tempo's type engine), app.html, app.js (screen saver cards and exports), saver.js (clock, words and dial runtime)
  mac/             Mac .saver packager (WebViewScreenSaver, Apache 2.0)
  win/             Windows .scr host – C source, built .exe, and its base64 copy (host.js)
tutti/         index.html – Tutti 6.1 (its own page and script); frame.css and frame.js put it on the shared tokens, components and frame
decentish/     index.html – Decentish prototype, one self-contained page; NOTES.md
reference/     rubato-0.8.1.html – the last combined app, kept for the parity tests
archive/       earlier versions still served live – rubato-0.9.html → docs/rubato/0.9/
tests/         parity.py, split_check.py, tempo_check.py, rubato_regress.py, rubato_features.py, legacy/ (the v0.8.1 handover tests)
docs/          the built apps – what GitHub Pages serves. Don't edit by hand.
build.py       stitches each app into one file in docs/
```

`core.js` and the app files aren't separate scripts – `build.py` places them inside one wrapper, in order, so they share a scope exactly as the old single file did. The top of `core.js` lists the few functions each app has to provide.

## Build

```
python3 build.py
```

Writes `docs/rubato/index.html`, `docs/tempo/index.html`, `docs/tutti/index.html`, `docs/decentish/index.html`, `docs/index.html` and the archived `docs/rubato/0.9/`, and checks every script for syntax errors. Commit `docs/` along with the source – it's what gets published.

## Test

One-off setup:

```
pip install playwright
cd tests && npm install && cd ..
```

Then:

```
python3 tests/parity.py        # Rubato and Tempo against v0.8.1 – writes tests/out/report.md
python3 tests/split_check.py   # Rubato and Tempo kept apart
python3 tests/tempo_check.py   # Tempo: the time in words, fonts mixed in, tracking per font, the dial, presets, preview, exports
python3 tests/licence_check.py # licensed fonts kept out of this public repo – run before every push
python3 tests/rubato_regress.py   # Rubato 1.0 draws exactly what 0.9 drew, for 0.9's settings
python3 tests/rubato_features.py  # Rubato 1.0's new features
python3 tests/decentish_check.py  # Decentish logic and voice, all sources faked
```

Export and Presets live in sheets (the island, the Presets capsule), so the tests open the sheet a control is in before using it – `tests/ui_helpers.py`. Labels and accessible names are the contract between the interface and the tests.

The parity tests drive the v0.8.1 reference and the new apps through the same steps, with randomness and the clock pinned, and compare every frame, download and panel read-out byte for byte. They need Chromium (via Playwright) and the Poppins and Lora fonts – set `FONTS=/path/to/folder` if they're not in `/usr/share/fonts/truetype/google-fonts`.

## Publish on GitHub Pages

Pages is on: **Settings › Pages** deploys branch **main**, folder **/docs**. So publishing is just:

1. Change the sources, run `python3 build.py`, run the tests.
2. Commit `docs/` with the sources and push to `main`.
3. A minute or two later it's live at https://steviewaring-arch.github.io/ensemble-tools/ (the *pages build and deployment* run under **Actions** shows when it's done).

All three live on the same site. From Tempo 0.3 Rubato and Tempo keep their fonts and settings apart in each browser (Tempo copies Rubato's fonts once, the first time it opens).

## House rules

- Change the sources, then run `build.py`. Never edit `docs/`.
- Test in a headless browser before publishing, exports included, and say what was and wasn't tested.
- Version every publish and add a line to `CHANGELOG.md`.
- UK English. En dashes with spaces ( – ). UI copy short, plain and specific.
- Fonts stay in the user's browser. Exports carry only the glyph outlines they need, never a font file.
- Licensed fonts never go in this public repo: they live in `private/` (git-ignored) and are embedded only in `site/` – see `LICENCES.md`. `tests/licence_check.py` must pass before every push.
- The look and layout of the tools is one system, owned by the UI stream – see `UI-BRIEF.md`. App chats log UI wants under UI requests in `HANDOVER.md` rather than restyling.

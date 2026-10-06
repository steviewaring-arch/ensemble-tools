# Ensemble Tools

Ensemble's in-house creative tools. Each one is a single HTML file that runs in the browser – no install, no server, fonts stay on your computer.

| Tool | What it does | Live (once Pages is on) |
|---|---|---|
| **Tutti** 6.0 | Halftones from images, video, your camera or type | `/tutti/` |
| **Rubato** 0.9 | Type in motion – alternates, styles and variable axes, out as PNG, SVG, GIF or video | `/rubato/` |
| **Tempo** 0.2 | A clock screen saver for Mac and Windows, set in your own typeface – as figures, or the time written out in words, with display faces mixed in if you like | `/tempo/` |

Rubato and Tempo share one core (type engine, font loading, controls, design system). Tutti is copied in as it is, and moves onto the shared core later.

## How the repo is laid out

```
shared/        used by more than one app
  tokens.css       colours, type, shadows – light and dark
  components.css   cards, pill sliders, toggles, segmented buttons, tooltips, capsule
  page.html        the page shell every app is poured into
  engine.js        the type engine – createEngine()
  core.js          settings, storage, font loading, image layer, control builders, tooltips, Fonts card
  core-end.js      downloads, toasts, drag and drop, light/dark, panel resizing, start-up
  gif.js           GIF encoder
  home.html        the index page that links to all three tools
rubato/        app.html (markup), app.js (Studio cards, picker, randomise, presets), export.js
tempo/         app.html, app.js (screen saver cards and exports), saver.js (clock and words runtime)
  mac/             Mac .saver packager (WebViewScreenSaver, Apache 2.0)
  win/             Windows .scr host – C source, built .exe, and its base64 copy (host.js)
tutti/         index.html – Tutti 6.0, unchanged
reference/     rubato-0.8.1.html – the last combined app, kept for the parity tests
tests/         parity.py, split_check.py, tempo_check.py, legacy/ (the v0.8.1 handover tests)
docs/          the built apps – what GitHub Pages serves. Don't edit by hand.
build.py       stitches each app into one file in docs/
```

`core.js` and the app files aren't separate scripts – `build.py` places them inside one wrapper, in order, so they share a scope exactly as the old single file did. The top of `core.js` lists the few functions each app has to provide.

## Build

```
python3 build.py
```

Writes `docs/rubato/index.html`, `docs/tempo/index.html`, `docs/tutti/index.html` and `docs/index.html`, and checks every script for syntax errors. Commit `docs/` along with the source – it's what gets published.

## Test

One-off setup:

```
pip install playwright
cd tests && npm install && cd ..
```

Then:

```
python3 tests/parity.py        # Rubato and Tempo against v0.8.1 – writes tests/out/report.md
python3 tests/split_check.py   # Rubato and Tempo sharing fonts and looks
python3 tests/tempo_check.py   # Tempo 0.2: the time in words, Mixed type, preview shapes, Tempo naming in exports
```

The parity tests drive the v0.8.1 reference and the new apps through the same steps, with randomness and the clock pinned, and compare every frame, download and panel read-out byte for byte. They need Chromium (via Playwright) and the Poppins and Lora fonts – set `FONTS=/path/to/folder` if they're not in `/usr/share/fonts/truetype/google-fonts`.

## Publish on GitHub Pages

1. Push this repo to GitHub as `ensemble-tools`.
2. On GitHub: **Settings › Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch **main**, folder **/docs**, then **Save**.
3. After a minute or two the tools are live at `https://<your-username>.github.io/ensemble-tools/` – with `/tutti/`, `/rubato/` and `/tempo/` after it.

All three live on the same site, so Rubato and Tempo share fonts and saved looks in each browser.

## House rules

- Change the sources, then run `build.py`. Never edit `docs/`.
- Test in a headless browser before publishing, exports included, and say what was and wasn't tested.
- Version every publish and add a line to `CHANGELOG.md`.
- UK English. En dashes with spaces ( – ). UI copy short, plain and specific.
- Fonts stay in the user's browser. Exports carry only the glyph outlines they need, never a font file.

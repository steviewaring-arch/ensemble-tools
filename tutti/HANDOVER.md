# Tutti – handover (v6.3)

**6.3 (11 Nov 2026) – the house style.** No section named for nothing: "Advanced" is gone – Opacity sits in **Shape**, **Rotation** is a group inside it, **Thresholds** a shut group inside Mapping, and **Presets** is a section of its own. **Warp** in Source is a group rather than a plain label used as a heading, and groups remember whether they are open. Names that fit the label column and say one thing: Ratio → **Format**, Canvas colour → **Colour**, Zoom → **Source zoom**, Fill shapes solid → **Filled**, Invert mapping → **Invert**, Scale with midtones → **Size by tone**, Min size → **Smallest**, Shape size / overlap → **Mark size**, Mark opacity → **Opacity**, Keep SVG colours → **SVG colours**. The colour row is the house's – a hex field you can type into with the swatch at its end – the Mapping band rows have room left and right, and the top bar carries the view's **zoom** (`shared/view.js`: Fit, 100%, ⌘ and a scroll). Nothing of this reaches a render: 84 of 84 checks pass and the 12 export hashes are byte-identical to 6.2. Rules: `shared/UI.md`.

**6.2 (6 Nov 2026) – the house kit.** `build.py` adds `shared/kit.css` after the shared tokens and components; `tutti/frame.css` ends with Tutti's parts in kit terms (rows on the label column, switches, buttons, choices, bands, Edges, the Export sheet); `tutti/frame.js` has the house slider (drag by distance, Shift finer, click to jump, label beside the bar; the Edges keep their label inside) and keyboard-only focus rings; the panel drags 280–480. It only moves and dresses controls – the 12 export hashes in `tests/tutti_check.py` match 6.1.1, and 84 of 84 checks pass, framed (`?embed`) and edge to edge (`?app`). Rules: `shared/UI.md`.

**Status, 6 October 2026:** step 1 of "Joining the repo" is done – `tutti/index.html` is Tutti 6.0 byte for byte, and `build.py` copies it to `docs/tutti/index.html` for GitHub Pages. Point the Squarespace embed at `https://<username>.github.io/ensemble-tools/tutti/`.

## Where things are
- **Source:** `tutti/index.html` v6.3 – its own page and script; `build.py` adds the shared tokens and components, `tutti/frame.css` and `tutti/frame.js`, and the shared GIF encoder (`shared/gif.js`). Only the Adobe Fonts kit (`rhx3hsl`) is loaded from outside, for Aktiv Grotesk.
- **Checks:** `python3 tests/tutti_check.py` (every part, on its own, framed and full screen; add `firefox webkit` for other engines) and `python3 tests/xbrowser.py` (Export across engines).
- **Build history:** the chat "Building a pixel art converter tool" (started as a pixel/ASCII idea before becoming Tutti).
- **Hosting:** GitHub Pages, iframe-embedded on weareensemble.co.uk (Squarespace).

## What it does
A halftone tool: image, video, webcam or live type in; marks mapped from tone out. Panels:
- **Source** – image/video file, camera, or Type (text, upload a typeface, size, line height, align, tracking, gradient fill, warp: width, height, slant).
- **Canvas** – colour, format (incl. custom W:H), grid, resolution, source zoom, source blur.
- **Shape** – filled or outline, invert, size by tone, smallest, mark size, opacity, and a **Rotation** group (rotation, rotation jitter, position jitter).
- **Mapping** – the tonal bands (colour and shape, including custom SVGs), SVG colours, band count, and a **Thresholds** group (master, per band, Even).
- **Presets** – save and load every setting as a JSON file.
- **Export capsule** – Still (PNG, SVG) or Motion (MP4, GIF with ping-pong), countdown before recording.

## Its role in Ensemble Tools
Tutti is the reference for the shared design system. Rubato's interface was rebuilt from Tutti 6.0's styles: tokens, the inset rounded app, brand header, resizable panel, cards with keyline titles, pill sliders, round tick toggles, segmented buttons, ? tooltips, the floating export capsule, light and dark modes. Those now live in `shared/tokens.css` and `shared/components.css`.

When Tutti joins the shared core:
- **Tutti gives:** its recording flow (countdown, ping-pong GIF).
- **Tutti gains:** the shared font engine (alternates, multiple styles, variable fonts) for its Type source, Rubato's levelled randomiser, and shared exporters.
- **Tutti keeps its own:** the halftone engine and its panels.

## Roadmap (from Steve, carried over)
- Audio-reactive mode (react to sound).
- Global randomise across all settings, not just band colours – Rubato's "Within limits / Everything" randomiser is a ready model.
- Video timeline/scrub controls (play/pause exists).
- Ways to animate still sources (image, type) – the old Auto-spin was removed in 5.4 pending a better approach. Rubato's motion engine is a candidate.
- 3D type; stretching live type further.
- Small explainer visuals (in the style of the dynamic-island mockup) to show what Tutti does.
- Done in 6.0: master threshold control.

## Joining the repo
1. ~~Day one: copy `tutti.html` into `ensemble-tools/tutti/index.html` unchanged.~~ Done.
2. In its own chat: move Tutti onto the shared tokens and UI kit only. Check it looks and exports exactly as before.
3. Then pick roadmap items one at a time.

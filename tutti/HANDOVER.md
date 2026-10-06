# Tutti – handover (v6.0)

**Status, 6 October 2026:** step 1 of "Joining the repo" is done – `tutti/index.html` is Tutti 6.0 byte for byte, and `build.py` copies it to `docs/tutti/index.html` for GitHub Pages. Point the Squarespace embed at `https://<username>.github.io/ensemble-tools/tutti/`.

## Where things are
- **Source:** `tutti/index.html` v6.0 – one self-contained file, about 64 KB, no external scripts. Only the Adobe Fonts kit (`rhx3hsl`) is loaded from outside, for Aktiv Grotesk. If Steve has a newer copy than 6.0, that one replaces this.
- **Build history:** the chat "Building a pixel art converter tool" (started as a pixel/ASCII idea before becoming Tutti).
- **Hosting:** GitHub Pages, iframe-embedded on weareensemble.co.uk (Squarespace).

## What it does
A halftone tool: image, video, webcam or live type in; marks mapped from tone out. Panels:
- **Source** – image/video file, camera, or Type (text, upload a typeface, size, line height, align, tracking, gradient fill, warp: width, height, slant).
- **Canvas** – canvas colour, ratio (incl. custom W:H), grid, resolution, zoom, source blur.
- **Shape** – the marks: tonal bands mapped to shapes (including custom SVGs), band count.
- **Mapping** – min size, shape size/overlap, invert mapping, keep SVG colours.
- **Advanced** – mark opacity, thresholds (master + per band, Even), rotation and jitter, presets.
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

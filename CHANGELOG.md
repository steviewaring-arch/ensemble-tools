# Changelog

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

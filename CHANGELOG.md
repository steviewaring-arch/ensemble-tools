# Changelog

## 6 October 2026 – Tempo 0.2

**Tempo 0.2**
- New: **In words**, a third option under Show. The time is written out as a sentence and set Swiss-style – flush left, ragged right, tight leading: “It is eleven forty seven and fifty nine seconds on Wednesday the twenty eighth of October twenty twenty six”.
  - Always the time and date of the computer it's on, so a screen saver downloaded in New York shows New York's. Nothing is fetched; it works offline.
  - Looks: six starting points for the screen savers Ensemble ships – Reference, Stack, Poster, Night, Typewriter, Hours – each one click. Exports are named after the look (“Tempo Stack”) unless you type a name, so variants don't replace each other when installed.
  - Sentence: every part switches on and off – It is, time, seconds, day, date, month, year, full stop – and the grammar closes up around what's left (“It is nine forty in November”, “It is Tuesday the third of November”).
  - Typesetting: lines break only between phrases (“eleven forty seven”, “the twenty eighth”, “twenty twenty six” stay whole) and never end on “on”, “the”, “of”, “in” or “and”. A phrase too long for the line gives way after “It is” first, then between hours and minutes. A short last phrase pulls a neighbour down rather than sitting alone. Optical margin lines each line's ink up on the margin. Word spacing.
  - Layout: Paragraph, or Stacked (one phrase to a line). Size: set it, or Fit the screen – sized for the longest sentence the settings can make, so the type never changes size as the time does.
  - Type: sentence case, lower case or capitals; numbers in words or figures; highlight the time, the latest change, the time and date in their own colours, or nothing, optionally in another loaded style (a bold, say); line spacing, tracking and line length. Always one typeface and one size.
  - Tried and set aside for now: place, sunrise and sunset, and weather. A screen saver can't ask where it is, and Ensemble's variants must be right wherever they're installed. The working version is in commit `c0cc72c` for the planned website.
  - Change: Roll, Fade, Type or Cut; whole words or only the letters that changed; small reflows glide, bigger ones leave and arrive like a departure board. Play a change replays one in the preview.
  - Position and colour: align, vertical position, margin and drift; six starter themes (Apricot, from Steve’s reference, then Red, Paper, Night, Signal, Ultraviolet) or your own three colours; optional theme change on the hour.
  - Exports to HTML, Mac and Windows as the clock does. Every letter and figure the sentence can use is baked in.
- Fixed: Laptop, Display and Portrait now move their highlight when clicked.
- Exports say Tempo, not Rubato: “Made with Tempo by Ensemble” in the read-mes, Tempo as the name when no font is loaded, `window.__TEMPO__` inside the page, and the Windows host’s about box and folder (`%LOCALAPPDATA%\Tempo Screen Savers`). The Windows host was rebuilt with zig 0.16.0, which rebuilds the 0.1 source byte for byte, so only the wording changed.
- Clock and Saved looks work and look exactly as before. `tests/parity.py` now maps Tempo 0.2’s intended changes back (renames, the new runtime inside exports, the rebuilt Windows host, the extra Show option) and then requires an exact match with 0.8.1. New `tests/tempo_check.py` covers 0.2: sentences at pinned moments, line breaks across a year of times, fit, optical margin, looks and export names, and the same export read in New York.
- A Windows screen saver installed from 0.1 keeps its files in `Rubato Screen Savers`. That folder can be deleted once a 0.2 export is installed.

**Rubato 0.9** – unchanged. **Shared core** – unchanged: Tempo adds its own settings from `tempo/app.js`.

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

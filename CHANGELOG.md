# Changelog

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

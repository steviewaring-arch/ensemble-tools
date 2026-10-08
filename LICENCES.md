# Fonts and licences

This repo and the site built from it (GitHub Pages, from `docs/`) are **public**: anything committed can be downloaded by anyone. So font files only go in the repo when their licence allows publishing them, and none do yet.

## Timeless (Tempo's built-in font, from 0.7)

Timeless Sans comes from Timeless (timeless.co) under the **Timeless Free Font License 1.2**. The licence is free and perpetual, for personal and commercial use. What it means here:

- **Allowed:** embedding the fonts in websites and apps, and converting them (subsetting, WOFF) so they can be delivered as part of the work – "provided the resulting files are delivered only as part of the work and are not offered for download on their own" (5.3). The things people make with Tempo are theirs (5.6).
- **Not allowed:**
  - putting the fonts on "a font service, a public server or a public repository"
  - redistributing them in whole or in part, including as a WOFF conversion
  - renaming them, or using the Timeless name for any font, product or service
  - using them to train AI
  - giving them to anyone without the licence

So, in this repo:

1. **The fonts are never committed.** They live in `private/fonts/` (git-ignored) with the licence text, as WOFF conversions, plus the originals in `private/fonts/originals/`. `private/fonts/fonts.json` lists them (`file, name, on, core, shuffle, credit`).
2. **They're embedded only in `site/`** (git-ignored). `build.py` writes `docs/` as always, without them. When `private/fonts/` exists, it also writes `site/`: the same pages, but with the fonts embedded inside Tempo's page as part of the app, never as separate files.
3. **`tests/licence_check.py` guards it.** It fails if a font file is tracked, if any tracked file carries the embedded-fonts block, or if any tracked file holds a stretch of a private font's data (bytes or base64). Run it before every push.
4. **No product named after the font.** Exports are called Tempo, Tempo Words or Tempo Dial (or a preset's name, or the name typed) – never a font's name.
5. **Credit.** Tempo's Fonts card says "Timeless Sans is free from timeless.co, under the Timeless Free Font License." The licence asks that anyone who wants the fonts is sent to timeless.co.

### Getting Timeless onto the live site – to decide

`docs/` is public, so the live site can't get Timeless from it. Two ways that keep the fonts out of a public repository:

- **A. Make this repo private** and keep publishing with GitHub Pages. A private repo's Pages site needs GitHub Pro (or a paid organisation plan); the site itself stays public. The fonts could then sit in the repo itself, and `site/` would be what's published.
- **B. Keep this repo public; keep the fonts in a separate private repo.** A GitHub Actions workflow checks out both, runs `build.py`, and deploys `site/` to Pages. Nothing with the fonts in it is ever committed here. It's free, but needs a little setting up: the private repo, a read-only access token saved as an Actions secret, and Pages switched to "GitHub Actions".

**Still to confirm with Timeless** (hello@timeless.co): that a free public tool may embed Timeless and let people export screen savers that carry its outlines – the digits and letters a screen saver needs, as drawing paths rather than a font file. Our reading is that this is embedding within a work (5.3), but the licence doesn't mention tools, so it's worth asking before the screen savers are given away.

## Other fonts

- **Fonts people load themselves** stay in their own browser and are never uploaded anywhere. Exports carry only the outlines of the glyphs they need, never a font file.
- **Lazaar** (Ensemble, From Parts Unknown) is free for non-commercial use. It could be built in like Timeless if Ensemble chooses.
- The **retro display faces** in Steve's font pack are retail or personal-use fonts. Several aren't cleared for distributing (Ransite Medieval is personal use only; imajix 16 dot is non-commercial). They stay in his own browser.

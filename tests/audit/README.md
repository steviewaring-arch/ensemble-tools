# The Segue audit

Does every setting do something? These scripts answer it by machine: they change each setting that's showing to its other
values and compare frames of the loop with before. Run them after a round that adds or moves settings (about 25 minutes;
they are not part of the ordinary test run).

- `python3 audit.py` – every preset: each setting showing in the panel. `python3 audit.py "Posters" "Build up"` for some.
- `python3 extra.py` – set-ups no preset reaches (overlay text and image, a background image, Edge, Unbuild, Frames with more media than frames, Still, captions over the media).
- `python3 pieces.py` – each piece's own settings (a slide, a layer, a build, the other kinds, a clip).

"No effect" isn't always a fault – Sizes does nothing when the media are all one size, a background colour nothing behind
full-bleed cuts – but each one should be explainable, and a setting that never has an effect is dead.
Last run 11 Nov 2026 (0.16): 100 settings across 32 set-ups, none dead.

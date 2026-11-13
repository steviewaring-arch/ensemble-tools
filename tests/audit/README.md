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

## Tutti

`python3 tutti.py` (about two minutes) – every control showing, in five set-ups (a picture; a picture with SVG marks on three
bands; a picture in a Custom format; Type; Type with Gradient fill), moved to its other values and the canvas compared; each
change is taken back with `putState`, the snapshot Undo uses, and checked to come back exactly.

Last run 13 Nov 2026 (6.4, six set-ups including Mixed sizes with every size, a house mark and a big mark): 35–46 settings a set-up, none dead. The ones with no effect, and why:
- **Own colours, Reset shapes** – nothing to act on until a band has an SVG mark (with marks, both act).
- **Even** – the edges are already even; it acts once an edge has moved.
- **Line height** (Type) – one line of type has no second line to space.
- **Edges and some band colours** (Type) – black type on white is two tones, so most bands are never used; with Gradient fill more are, and the gradient's darkest end can sit outside the word.
- **Mixed sizes** (Type) – at the default size and grid, the letters' strokes are under two cells wide, so no block fits; larger type or a coarser grid gives it room.

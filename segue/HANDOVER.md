# Segue – handover (4 November 2026, Segue 0.2)

For the Segue chat. Read this, then the repo's `README.md` and `HANDOVER.md` (how the repo, the build, storage and the other streams work). Segue is internal for now: built to `docs/segue/`, live at https://steviewaring-arch.github.io/ensemble-tools/segue/, and not linked from the index page.

## What it is

Framed loops of images and video, for case studies, social reels and decks – the kind of thing The Brand Identity's motion packs do in After Effects, without After Effects. Media goes into **shapes** (the frames it sits in) on a **canvas**; the shapes move in one of six **kinds** of motion with a **feel**, and everything **loops** exactly. A background image can sit behind it all and text or an image over it. Captions are optional. Out as MP4, GIF or a PNG of the frame on the stage.

Steve's brief (4 Nov), in his words where they matter:
- 0.1: "a) the overall output size / canvas. b) the option to change the ratio and amount of 'shapes' (which are invariably the mockup elements) – rounded corners also. c) the transition type (and ability to loop)." Slides "could have an inertia to them, or just glide". Motion or statics, or both. Captions with "own font, colour in own way (per word / line) and be specific about kerning, letterspacing and position". Keep it simple; transitions "not overly crazy – swipes, zoom out (maybe the ability to join up transitions)". Presets you can alter; change the output size without starting again.
- 0.2 (same day, with four screen recordings): a background image fixed; "an image (or text) over the top also"; "wrap 'fonts' module into captions"; "if each preset has its own controls, they should be obvious … canvas size and uploaded elements a given, but how we show the variables in each 'preset'"; "making each column move up or down (at different times) independently"; "really study the attached – the motion quality, the variances (the smoothness of transitions – zooming in and out, even the phone UI example and the slight lag on the next one coming in)"; then audit the UI for function and usability – "it can be easy to get lost in the modules and their sub parameters"; and "the frame / poster is static and the elements can move within them". The house UI style is being audited in another thread – this stream is about the tool and its parameters.
- Name: Segue. Internal only for now.

## The references (measured 4 Nov – slit-scans and edge tracking, not by eye)
Steve's recordings are 554 × 370 at 60 fps, variable frame rate (two of the five files are the same clip). What each does, and where it went:

| Recording | What it does | In Segue |
|---|---|---|
| Phone swipe (16.42.53) | A row of phone screens steps left. Each sets off ~75 ms after the one ahead (left edges at one moment moved 39, 25, 15, 8 px), so the gaps open from ~40 to ~54 px and close as they land. A short push, then a long glide that only just stops before the next (cycle ~2.4 s) | **Lag**, the **Coast** feel (`bezier(.18,0,.02,1)`, fitted to the tracked edges), the **Phone swipe** preset |
| Columns (16.41.27) | Three columns drifting at steady speeds, down, up, down, about 1 : 1.37 : 2.3 (60, 82, 139 px/s on a 370-px frame) | **Columns** kind, Varied speeds (2, 3, 4 laps → 1 : 1.5 : 2; ours measured 60, 90, 120 at the same scale), the **Wall** preset |
| Posters (16.39.23) | Three white-bordered posters stay put; inside each the work pushes up with a slow–fast–slow ease (~0.8 s), each poster at its own moment | **Frames** kind, **Border**, the **Posters** preset |
| Milky Way (16.35.11) | Cards at different sizes step upward – a fast move, a long slow drift, a fast move – nearer cards further; a fixed title between the near and far cards in difference blend (cyan over red) | **Float** kind, **Keep drifting**, **Overlay** in Difference among the shapes, the **Milky Way** preset |

`compare.py`-style checks (render a preset at the reference's shape, slit-scan the same row or column) put the phone swipe's cycle and S-curve and the wall's speeds close to the recordings; the reference's knee into the push is a touch sharper than Coast's, partly the recording's dropped frames.

## The model

| Part | Settings |
|---|---|
| **Canvas** | 4:5 1080 × 1350, 9:16 1080 × 1920, 1:1, 16:9 1920 × 1080, 4:3 1440 × 1080, or custom (made even for video); background colour; **background image** (fill or fit, strength); 24/25/30/60 fps |
| **Motion** | **Kind** first, as six tiles; then only that kind's controls, in the same order – how many, what moves and which way, timing, the feel, then its character (below) |
| **Shapes** | Shape ratio (the media's own – per shape in Columns and Float – 16:10, 16:9, 4:3, 3:2, square, 4:5, 3:4, 2:3, 9:16, 9:19.5 phone, A4 either way, custom); size (Width for Grid and Columns; Float's own); gap; corners; fill (crop) or fit with a colour behind; **Border and edge** fold: border (a mount inside the shape), its colour and inner corners, edge; **Position** fold: nudge (not Float) |
| **Captions** | Under, above, on the shape, or fixed on the canvas (One, Line, Grid only); align; space; nudge. Title, Line and Tags each with font, size, tracking (thousandths of the size), leading, colour, case; tags as outline or filled chips, or plain. Accent for `*starred*` words; `{#hex:words}` for any colour. Font kerning on/off and kerning pairs (`AV -40, To -30`). Arrives: as it is, fade, rise, scramble (not Columns or Float). **Fonts** fold: built in (Aktiv Grotesk via the Adobe Fonts kit, Inter Tight 400/600/800, IBM Plex Mono 400/500, Helvetica) and your own (OTF, TTF, WOFF, WOFF2, kept in the browser) – every Font menu lists them |
| **Overlay** | Over the top: Text (font, size, tracking, leading, colour, case, rich colours, the Captions kerning pairs) or Image (width); Place on a 3 × 3 pad, margin, nudge; Blend: Normal, Difference, Multiply, Screen; opacity; in Float with depth, Sits over everything or among the shapes |
| **Media** | Images and video mixed. Drag to reorder (or Move up/down); per shape: Title, Line, Tags, Start at (video), Arrives by (One), Lift washed-out colours (video) |
| **Presets** | Card stack, Phone swipe, Carousel, Columns, Wall, Posters, Milky Way, Deck, Stack, Fade, Grid, and your own (save, delete, download, load). Each lists its kind. A preset carries the look and motion – not the media, captions, canvas size, frame rate, or what's over the top (on/off, text or image, the text itself – it does carry the overlay's font, blend and place) – and its px values are kept for a 1080 short side and scaled to the canvas |
| **Export** | MP4 (H.264, 1–3 loops, named from File name and size), GIF (full, half or quarter size, 12–25 fps, each frame its own 256 colours), PNG of the frame on the stage. Background and overlay go into all three |

### The kinds and their controls
| Kind | Engine `layout` | Controls (in order) |
|---|---|---|
| **One** | `one` | Move (Slide, Stack, Fade, Zoom, Cut, Still), Direction, Rest, Move time, Feel, After the last (+ Pull back fold) |
| **Line** | `row` / `column` – Direction picks | Move (Step, Drift, Still), Direction (left/right → row, up/down → column), Rest, Move time / Each shape, Feel, **Lag**, **Keep drifting**, After the last (+ Pull back) |
| **Grid** | `grid` | Columns, Move, Direction (up/down), Rest, Move time / Each shape, Feel, Lag (row by row), Keep drifting |
| **Columns** | `columns` | Columns, Move, Directions (Alternate – down, up, down…, All up, All down), Rest, Move time, Feel, **Out of step**, Keep drifting / Each shape, **Speeds** (Same, Varied), **Offset** |
| **Frames** | `frames` | Across, Down, Change (Push, Cover, Fade, Cut, Still), Direction, Rest, Move time, Feel, **Lag** between frames. With as many frames as media: a note, and Length only |
| **Float** | `float` | Move, Direction, **Depth**, **Spread**, Shuffle, Rest, Move time / Each shape, Feel, Keep drifting |

### How the loop works (`segue/engine.js`)
- **One, Line, Grid** – as 0.1: shapes on a track (or a grid scrolling a row at a time); a camera visits each stop, rest then move with the feel. Loop = shapes × rest + moves (+ pull back), or shapes × Each shape for Drift.
- **Lag:** each shape's step is read a beat late – `stepAbs(t − lag × rank)` – rank counted from the leading edge of what's visible, so the one ahead sets off first and the one coming in last. The reference stop for the ranks only changes once every shape has landed, so nothing jumps; the beat is capped (`0.9 × rest ÷ shapes in view`) so the last lands before the next move. Lag is shown in the Lag control but takes from the rest.
- **Keep drifting:** the camera is `(1 − k) × the step path + k × a steady drift`, the drift advancing a stop each rest-and-move, so the two meet at every stop and the loop stays exact. Not in the last rest before a pull back.
- **Columns:** each column runs through all the media from its own starting point (`round(N × c / C)`), so the loop is N steps (Step) or N × Each shape (Drift; Varied doubles it, laps 2, 3, 4). Out of step offsets each column's clock; Offset shifts every other column's start by part of a shape. Heights per shape when the shape is the media's own.
- **Frames:** fixed rectangles (Across × Down, fitted inside Size); frame f shows media f, f + F, f + 2F… (N ÷ gcd(N, F) entries), changing every rest + move, each frame Lag later. Push and cover slide the media inside the frame (`slide` on the op); fade crossfades; captions crossfade at the halfway point. Video in a frame plays from its start point as it arrives.
- **Float:** one, or three, depths (Depth > 0), sized 1 − 0.6 × Depth for the farthest. Each depth is a strip of K places; its length is in proportion to its size, and every strip goes round once a loop – so speed is in proportion to size and everything joins up. K is enough places that the farthest strip covers the canvas with nothing shown twice. Places are scattered across by a seeded hash (Shuffle changes the seed). Step moves the whole field a place at a time.
- **Feels:** Glide (ease in and out), **Soft** (`bezier(.42,0,.58,1)`, the pull back's default from 0.2), **Coast** (`bezier(.18,0,.02,1)`), Inertia, Spring, Linear.
- **Drawing order:** background colour, background image, shapes (each: border, inner clip, behind colour, media – slid within the frame if Frames is changing – edge), captions, fixed caption, overlay. In Float with Sits among the shapes, the overlay is drawn before the nearest depth (`SC.mid`).
- Every op carries a `key` (its place: `t12`, `g3.1`, `c0.4`, `l2.7`), so tests can follow a shape from frame to frame.
- **Exports** draw every frame at full size at its own moment, seeking each video first – as 0.1.

## Colour – the range business
Unchanged from 0.1: Segue converts each frame to BT.709 video range itself, labels the file to match and sets the H.264 stream's own range flag to agree (`spsVideoRange`, `avcCVideoRange`, `chunkVideoRange` in `export.js`); a video whose stream says full range while its file says video range is put right as it's added (`fixSourceRange`); Lift washed-out colours reads any other lifted video as video range. Tempo's own MP4 export still writes the mismatched flag – logged in the Project doc `claude/tempo-promo-log.md`, for the Tempo chat.

## Files
| File | What |
|---|---|
| `segue/engine.js` | `SegueEngine`: sizes and ratios, feels, kinds, the plan for each kind, the camera, lag and keep drifting, geometry, the scene (every shape's rect, alpha, scale, slide, caption reveal, video time, key), captions and the overlay's text (glyph layout), drawing (background image, border, overlay and blends). No DOM beyond the canvas |
| `segue/frame.js` | The UI system's parts (a copy of `shared/core.js`'s – see 0.1). 0.2: a seg can `pick` (run a function instead of setting a key) and show a `val` other than its key; folds can have their own summary |
| `segue/app.js` | Settings (`D`, `LOOK`, `PX`), fonts, IndexedDB, media, the background and overlay pictures (`PICS`, `setPic`, `clearPic`, `restorePics`), the preview, the cards (kind tiles, the place pad, picture rows), presets |
| `segue/export.js` | Frames, MP4, GIF, PNG, the Export sheet, start-up, `window.segue` (for tests and scripted renders – now with `pics`, `setPic`, `clearPic`) |
| `segue/app.html`, `app.css` | The frame's markup (plus `#bgfile`, `#ovfile`), the extra Google Fonts link, Segue's own styles (0.2: `.kinds`, `.kind`, `.place`, `.spot`) |
| `tests/segue_check.py` | 54 checks – see below |

`build.py` builds it with `build_segue()` (version in `SEGUE`). Segue needs `tempo/vendor/mp4-muxer.js` – keep it (or move it to `shared/`) if Tempo's promo tools come out.

## Storage
`localStorage` `segue:settings`, `segue:items`, `segue:fonts`, `segue:presets`, `segue:preset`, `segue:presetEdited`, `segue:collapsed`, `segue:folds`, `segue:mode`, `segue:panelW`, and from 0.2 `segue:pic:bg`, `segue:pic:ov` (the image's name). IndexedDB `segue` › `media` (the media by id, and the two pictures as `pic:bg`, `pic:ov`) and `fonts`. Settings from 0.1 load as they were: every new key has a default, and 0.1's layouts are 0.2's One, Line (row/column) and Grid. Nothing is shared with the other tools.

## Tests
`python3 tests/segue_check.py` – Playwright's Chromium, ffmpeg (libx264, libvpx) and Pillow. Last run 4 Nov: 54 of 54. 0.2 adds: Motion's six kinds; each kind shows only its own controls in order; Line's Direction picks row or column; the fonts are in Captions; lag (the one ahead sets off first, gaps open mid-move and close on landing, none without lag); keep drifting (moves while resting, still meets each stop); Columns (down, up, down; Varied speeds 2 : 3 : 4; out of step by half a second); Frames (the frames never move; the media changes, each frame later); Float (three depths, size and speed in proportion); the new kinds loop exactly; background image; overlay image in Difference (white over red → cyan); border colour; overlay text bottom centre on its margin; a preset keeping the overlay; both pictures back after a reload. Every kind × move × direction × caption place (with lag and keep drifting) draws all the way round. Run `tests/licence_check.py` before every push.

Not tested here: H.264 in a real Chrome or Safari (the test browser now makes H.264 too, but Steve's Mac is the one that matters), Adobe Fonts in captions, MOV files, very long or 4K exports.

## The first job – Tempo Series 1 reel (4 Nov)
`Tempo_Series1_Segue_4x5.mp4` – made with 0.1; see the Project doc `claude/tempo-promo-log.md`. Settings: Line (column) stepping up, Inertia, rest 1.0 s, move 0.65 s, pull back 3 columns, Glide; Timeless Sans captions under. Settings saved by 0.1 open in 0.2 unchanged and make the same reel (lag and keep drifting default to none). Applying the Card stack preset now gives the pull back the Soft feel – set Pull back › Feel to Glide to match the reel exactly.

## Backlog – not in 0.2
- **Project files:** save a job (settings, order, captions, start points, media names, background and overlay) and reopen it, matching media by name.
- **More sizes at once:** export the same job at 4:5, 9:16 and 1:1 in one go; for 9:16, extend the ground rather than reflow.
- Overlay: more than one layer; an arrival (fade or scramble in); video as a background.
- Per-shape rest time; a focal point for cropping each piece; title cards (a shape that's just type).
- Frames: a mosaic inside a poster (Steve: not needed now); Ken Burns inside a still frame.
- Float: depth blur or dimming for the far shapes; more than three depths.
- The pull back still crossfades the shapes that aren't neighbours (so nothing flies across the one in focus) – if zooms still don't feel smooth enough, try flying them instead and judge it on the reel.
- Shadows and device frames (left out on purpose); background gradient.
- More joins: a list of moves that repeats (slide, slide, zoom, pull back…).
- Faster video export: decode with WebCodecs (needs a demuxer, e.g. mp4box.js).
- Move onto the shared core once it's split from Rubato's settings.
- Public release: decide on built-in fonts (Aktiv Grotesk is Adobe Fonts – fine in the browser on Ensemble's kit, not as a file), then list it on the index page.

# Segue – handover (4 November 2026, Segue 0.1)

For the Segue chat. Read this, then the repo's `README.md` and `HANDOVER.md` (how the repo, the build, storage and the other streams work). Segue is internal for now: built to `docs/segue/`, live at https://steviewaring-arch.github.io/ensemble-tools/segue/, and not linked from the index page.

## What it is

Framed loops of images and video, for case studies, social reels and decks – the kind of thing The Brand Identity's motion packs do in After Effects, without After Effects. Media goes into **shapes** (the frames it sits in) on a **canvas**; the shapes move with a **feel**, and everything **loops** exactly. Captions are optional. Out as MP4, GIF or a PNG of the frame on the stage.

Steve's brief (4 Nov), in his words where they matter:
- "a) the overall output size / canvas. b) the option to change the ratio and amount of 'shapes' (which are invariably the mockup elements) – rounded corners also. c) the transition type (and ability to loop)." Slides "could have an inertia to them, or just glide".
- Motion or statics, or both, in any arrangement.
- Captions with or without: "own font, colour in own way (per word / line) and be specific about kerning, letterspacing and position".
- Keep it simple; transitions "not overly crazy – swipes, zoom out (maybe the ability to join up transitions)".
- Presets you can alter, and change the output size without starting again.
- References: Steve's screen recording of a card stack that pulls back to a grid (→ the Card stack preset and Pull back), and `MinImp_Social_Carousel` on Dropbox (a row of tall cards drifting left, 9:20 cards 361 × 800 with a 49 px gap on 1080 × 1350, #1D1C23, 2.67 s a card, 16 s for six – → the Carousel preset). The Brand Identity's packs for the standard.
- Name: Segue. Internal only for now.

## The model

| Part | Settings |
|---|---|
| **Canvas** | 4:5 1080 × 1350, 9:16 1080 × 1920, 1:1, 16:9 1920 × 1080, 4:3 1440 × 1080, or custom (made even for video); background; 24/25/30/60 fps |
| **Shapes** | Layout (One, Row, Column, Grid); shape ratio (the media's own, 16:10, 16:9, 4:3, 3:2, square, 4:5, 3:4, 2:3, 9:16, 9:19.5 phone, A4 either way, custom); size; columns (Grid); gap; corners; fill (crop) or fit (no crop) with a colour behind; edge; nudge across and up/down |
| **Motion** | One: Slide, Stack, Fade, Zoom, Cut, Still – and each shape can arrive by its own move (Media › Arrives by). Row/Column/Grid: Step, Drift, Still. Direction. Feel: Glide, Inertia, Spring, Linear. Rest and Move times; Drift's "Each shape"; Still's length. After the last: Carry on round, or Pull back to them all (grid columns, gap, how much it fills, out / all in view / in times, its own feel) |
| **Captions** | Under, above, on the shape, or fixed on the canvas (top or bottom, margin); align; space from the shape; nudge. Title, Line and Tags each with font, size, tracking (thousandths of the size), leading, colour, case; tags as outline or filled chips, or plain. Accent colour for `*starred*` words; `{#hex:words}` for any colour. Font kerning on/off and your own kerning pairs (`AV -40, To -30`, thousandths). Arrives: as it is, fade, rise, scramble, over a set time |
| **Media** | Images and video mixed. Drag to reorder (or Move up/down); per shape: Title, Line, Tags, Start at (video), Arrives by (One), Lift washed-out colours (video) |
| **Fonts** | Built in: Aktiv Grotesk (Adobe Fonts kit, regular and bold), Inter Tight (400/600/800), IBM Plex Mono (400/500), Helvetica. Add your own (OTF, TTF, WOFF, WOFF2) – kept in the browser |
| **Presets** | Card stack, Carousel, Deck, Stack, Fade, Grid, and your own (save, delete, download, load). A preset carries the look and motion – not the media, captions, canvas size or frame rate – and its px values are kept for a 1080 short side and scaled to the canvas it lands on |
| **Export** | MP4 (H.264, 1–3 loops, named from File name and size), GIF (full, half or quarter size, 12–25 fps, each frame its own 256 colours), PNG of the frame on the stage |

### How the loop works (`segue/engine.js`)
- **Stops.** Shapes sit on a track (One, Row, Column) or in a grid that scrolls a row at a time. The camera visits each stop: rest, then move to the next with the feel. One's pitch is the whole canvas, so the next shape starts off screen; Row and Column's is the shape plus the gap (neighbours show). A grid steps until its rows repeat (10 shapes, 3 across: 10 rows).
- **Loop length** = shapes × rest + moves (+ out, all in view and in for Pull back), or shapes × "Each shape" for Drift. Shown in the top bar.
- **Feels:** Glide is an ease in and out; Inertia a push that coasts to a stop (cubic-bezier .35, .85, .2, 1 – softened on 4 Nov after the first render jumped 200 px in its first frame at 30 fps); Spring overshoots about 5% and settles, pinned to land exactly; Linear.
- **Video timing.** On a stepping track each video plays from its Start at as its shape starts to arrive, and keeps going (wrapping round its own length); in a grid, drifting or still it runs from Start at with the loop. Set Start at so a transition lands while the shape rests – about Move + a third of Rest after its start point.
- **Pull back.** One camera move from the shape in focus to every shape in a grid and back in to the first. Shapes that are neighbours on the track and in the grid (the grid is filled along the track's direction) just ride the camera; the rest fade out where they were and fade up in the grid. The shape in focus is drawn last. The grid is centred however many columns it ends up with.
- **Captions** are laid out a glyph at a time: each glyph's advance, the font's kerning (measured as the pair's width minus the two glyphs'), your kerning pair and the tracking. So tracking and kerning are exact, scramble doesn't jitter, and per-word colour is free. Under/above captions take the height of the tallest caption in the set, so every shape sits the same.
- **Exports** draw every frame at full size at its own moment, seeking each video to the frame wanted before drawing – the file is the loop frame for frame, however slow the machine. If the loop isn't a whole number of frames long, each frame's moment is stretched by a fraction of a frame so the file still loops exactly.

## Colour – the range business

The background of Tempo's promo MP4s showed as #E2E2E0 instead of #F5F5F3 in anything ffmpeg-based (Instagram among them) but looked right in QuickTime. Cause: the H.264 that Chrome's encoder makes on a Mac (Apple's VideoToolbox) says "full range" in the stream's own header (the SPS), while the frames are video range and the MP4's `colr` box says so. QuickTime reads the box; ffmpeg reads the stream.

Segue deals with it at both ends:
1. **Out:** it converts each frame to BT.709 video range itself (as Tempo 0.9.2 does, picking the codes that play back nearest for flat colours), labels the file to match (`colr`: BT.709, sRGB transfer, video range), and **sets the SPS range flag to video range** in the avcC and in any SPS inside the frames (`spsVideoRange`, `avcCVideoRange`, `chunkVideoRange` in `export.js`). Checked on Steve's Dial 01 Motion_01: with the fixed header, ffmpeg decodes the background as 245 instead of 226.
2. **In:** a video whose stream says full range while its file says video range is put right as it's added (`fixSourceRange` in `app.js` – one bit, same length; the Media row says "range put right"). All twelve Tempo Motion clips have this.
3. **Lift washed-out colours** per video, for anything else that looks lifted: reads it as video range when drawing.

Tempo's own MP4 export still writes the mismatched flag – the fix for `tempo/promo.js` is logged in the Project doc `claude/tempo-promo-log.md` (Steve said log, don't action, 3 Nov). It's the same three functions.

## Files

| File | What |
|---|---|
| `segue/engine.js` | `SegueEngine`: sizes and ratios, feels, the plan (stops, segments, arrival times), the camera, geometry, the scene for a moment (every shape's rect, alpha, scale, caption reveal, video time), captions (rich text, glyph layout, blocks), drawing. No DOM beyond the canvas. Its own `<script id="segue-engine">` |
| `segue/frame.js` | The UI system's parts – cards, folds, summaries, sheets, Preview, sliders, segmented controls, toggles, colours (with a hex field), menus, number pairs, text fields, tooltips, theme, keys, panel width, status, downloads. A copy of `shared/core.js` / `core-end.js`'s, because the shared core is still tied to Rubato's settings and type engine (Tutti does the same with `tutti/frame.js`). Move onto the core when it's split |
| `segue/app.js` | Settings (`D`, `LOOK`, `PX`), fonts, IndexedDB, media (adding, the range fix, restoring, reordering, drawing into a shape), the preview and video sync, the cards, presets |
| `segue/export.js` | Frames, MP4 (WebCodecs + mp4-muxer, I420 conversion, the SPS fix), GIF, PNG, the Export sheet, start-up, `window.segue` (for tests and scripted renders) |
| `segue/app.html`, `app.css` | The frame's markup (Tempo's), an extra Google Fonts link (Inter Tight 400/600/800, IBM Plex Mono), and Segue's own styles |
| `tests/segue_check.py` | 35 checks – see below |

`build.py` builds it with `build_segue()`: shared tokens and components + `segue/app.css`; tagged scripts `segue-engine` and `segue-mp4` (Tempo's `tempo/vendor/mp4-muxer.js`, MIT); `shared/gif.js` before the wrapper; then `frame.js`, `app.js`, `export.js` in one scope. Version in `SEGUE` in `build.py`. If Tempo's promo tools come out before a public launch, keep `tempo/vendor/mp4-muxer.js` (or move it to `shared/`) – Segue needs it.

## Storage
`localStorage` `segue:settings`, `segue:items` (the media list – name, kind, size, length, start, captions, arrive, levels, fixed – the files themselves are in IndexedDB), `segue:fonts` (ids of fonts added), `segue:presets`, `segue:preset`, `segue:presetEdited`, `segue:collapsed`, `segue:folds`, `segue:mode`, `segue:panelW`. IndexedDB `segue` › `media` and `fonts`, by id. Nothing is shared with the other tools.

## Tests
`python3 tests/segue_check.py` – Playwright's Chromium, ffmpeg (libx264, libvpx) and Pillow. Makes its own fixtures in `tests/out/segue/`. Playwright's Chromium has no H.264, so the MP4 export comes out as VP9 there (as Tempo's does) and the H.264 parts are checked against streams made by x264. Last run 4 Nov: 35 of 35. Also run `tests/licence_check.py` before every push.

Not tested here: H.264 decoding and encoding in a real Chrome or Safari (Steve's Mac), Adobe Fonts in captions (works in the test browser, but the kit is tied to the site), MOV files, very long or 4K exports.

## The first job – Tempo Series 1 reel (4 Nov)
`Tempo_Series1_Segue_4x5.mp4`, 1080 × 1350, 23.7 s, 30 fps, H.264. Rendered from Segue in the test browser (frames piped to x264 there, because that browser can't encode H.264 – Steve's Chrome on a Mac makes the same file from Export).
- Media: the twelve Motion_01 clips (screen only, 16:10; Face 02's is 16:9 and is cropped to fill), in the naming order – Numeral 01 Mono, Numeral 01 Colour, Stack 01 Mono, Stack 02 Mono, Face 01 Colour, Face 02 Colour, Block 01 Mono, Dial 01 Mono, Form 01 Mono, Form 01 Colour, Form 02 Mono, Index 01 Light. Range put right on all twelve.
- Start at (s): 9.3, 3.1, 0, 1.4, 0.1, 0, 4.7, 2.4, 0, 13.1, 0.9, 4.1 – chosen from where each clip changes most (theme changes in Numeral 01 Mono and Colour, Block 01 and Form 01 Colour), so the change lands while the shape rests. Numeral 01 Mono arrives by the zoom back in, so its change lands just after the camera settles.
- Canvas 4:5, background #E4E4E0 (on #F5F5F3 the light savers – Dial, Index, Stack 02 – vanish into the ground). Column, 16:10, size 84%, gap 72, corners 10. Step up, Inertia, rest 1.0 s, move 0.65 s, Pull back: 3 columns, gap 36, fills 90%, out 1.15 s, all in view 2.25 s, in 1.15 s, Glide.
- Captions under, left, space 26, Timeless Sans Regular 40 px, tracking -12, #1E1D23 (the lockup's ink), the variant in {#808286:grey} – "Numeral 01 {#808286:Mono}". Scramble over 0.7 s.

## Backlog – ideas not in 0.1
- **Overlay layer:** a PNG fixed on the canvas (lockups like Tempo's "Tempo / A collection of twelve…") with its own position – the obvious next one.
- **Project files:** save a job (settings, order, captions, start points, media names) and reopen it, matching media by name.
- **More sizes at once:** export the same job at 4:5 and 9:16 (and 1:1) in one go; for 9:16, extend the ground rather than reflow.
- Per-shape rest time; a focal point for cropping each piece of media; title cards (a shape that's just type).
- Shadows and device frames (left out on purpose – "not in the mockup device"); background image or gradient.
- More joins: a list of moves that repeats (slide, slide, zoom, pull back…), beyond each shape's own Arrives by.
- Faster video export: decode with WebCodecs (needs a demuxer, e.g. mp4box.js) instead of seeking a `<video>` per frame. Today the speed depends on how often the video has a keyframe – Tempo's exports have one a second, which is fine; camera footage with a keyframe every few seconds will be slow.
- Move onto the shared core once it's split from Rubato's settings; tags that wrap onto a second row; captions on the grid only when pulled back.
- Public release: decide on built-in fonts (Aktiv Grotesk is Adobe Fonts – fine in the browser on Ensemble's kit, not as a file), then list it on the index page.

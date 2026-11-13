# UI stream – to do

## Done 13 Nov – Tutti 6.3: change dots, Reset, Undo and Redo; its settings audit

Steve, 13 Nov: "Yes get started" (the Tutti plan, `claude/tutti-next-plan.md` in the Project – 6.3 first). The blue dot per row moved from where it started (each input's value when the page opened), click to put back; Reset chip on an open card, a dot on a shut card or group; Undo and Redo in the top bar and on ⌘Z / ⇧⌘Z. In `tutti/frame.js` over `snapState()`/`putState()` in `index.html`. 12 export hashes identical to 6.2; 90 of 90. `tests/audit/tutti.py`: none dead, every "no effect" explained (`tests/audit/README.md`). **Still open from C6:** row notes in place of Tutti's "?" (see History, 13 Nov).

## Done 12 Nov – the Segue 1.0 round, taken across (Steve: "run any and all aspects that may impact Tutti and Rubato through their UI, test and update the house style … supersede [Tutti's pending round] and implement")

Done in the Segue chat, in one pass, because the parts are shared. Nothing here changes what a tool makes: Tutti's 12 export hashes are identical to 6.2's, Rubato's 14 looks identical to 0.9, Tempo's exports unchanged.

- **Section titles 15 px** (`--fs-title` in `kit.css`) – every tool.
- **The bottom line stays put** – Rubato and Tempo: the island is anchored bottom left beside the panel, Presets bottom right (`layoutUI` in `shared/core.js`, `#island` rules in `kit.css`). It used to sit centred and slide 127 px sideways when Presets opened. Tutti's export bar is alone on its line and was already still – unchanged.
- **The page never scrolls on a desktop** – Rubato and Tempo had the same stray pixel as Segue (a window scrollbar that did nothing); fixed in each tool's `app.css`. Tutti didn't have it.
- **The house colour picker** (`shared/colour.js`) – Rubato and Tutti (item C4 and E's "colour picker in house terms"): every swatch opens it; pipette, Hex, R G B, the colours in use. **Tempo keeps its own** (RGB/CMYK sliders, saved colours) – see below.
- **Moving a row** – the slim focus-colour line in `kit.css` (was a black inset edge).
- **Tests added**: Rubato 45 (was 43), Tempo 125 (was 124), Tutti 87 (was 84).
- **Versions**: Rubato 1.2.1, Tempo 0.18.1; Tutti stays 6.2 (its version is written into what it saves, so it only moves with a behaviour change).

**Still open from this round:**
- **One picker, not two.** Tempo's has CMYK and saved colours; the house one has the shade field, RGB typing and colours in use. Merge into `shared/colour.js` (add a CMYK tab and saved colours), then switch Tempo over (`picker=False` in `build.py` comes out).
- **Rule change to carry:** one **More** per section is now allowed (UI.md, The panel). Rubato's three "More" groups (B4) are fine *if* each is the only one in its section and says what it holds; A4 below is amended.
- **13 Nov – Tutti's C1, C2, C3 and C5 are done** (Steve: "yes, implement"): Colour, Format, Scale, Solid fill, Invert, Size by tone, Shape size, Own colours; "Advanced" is **Fine tuning** and says what it holds; band rows have more room. Words and padding only – ids, behaviour and the 12 export hashes unchanged, 87 of 87. **C6** – change dots and undo done in 6.3 (13 Nov); zoom and guides were already in; row notes for the "?" still open. Was: untouched – label wraps, "Advanced", "Ratio"/"Zoom" names, band rows, change dots. They rename labels on a live public tool, so they still want Steve's yes; C4 is done.
- Rubato: turning and sizing a lockup on the canvas could take Segue's handles (corner sizes, outside a corner turns) – its Tilt dial is the candidate.

## Done 13 Nov – one corner logic, and zoom and guides everywhere (this chat)

- **One corner logic.** A wrapped row of choices kept a 17 px lozenge radius from before the kit (Steve spotted it in Tempo, 12 Nov); Rubato's XY pad was 14, Segue's placement spots 5, and every plain slider was still a lozenge. All on the ladder now. **`tests/corner_check.py`** reads every radius in all four tools and fails on one off the ladder, or one that doesn't follow its parent – this is not a thing to check by eye.
- **Zoom in all four** – `shared/view.js` (`mountZoom`); Tempo took it on the 13th, Rubato and Tutti on the 11th.
- **Guides in Tutti, Rubato and Tempo** – `mountGuides` lays a margin and cells over the canvas rather than drawing them in, so no export has them. Segue keeps its own, because it also snaps to them.
- **The pop is in the kit** – the small panel under a top-bar button was Segue-only CSS, so the first guides pop in Tutti had no surface under it at all.
- **Rubato 1.3** – the panel in the order of work (Canvas, Text, Fonts, Layout, Motion, Variants, Physics), groups instead of plain headings, the More sections named, switches heading what they turn on, Undo and Redo in the top bar, the dial out of the label column.
- **Tutti** – Warp is a group rather than a plain label used as a heading; the band rows keep their room.

**Open question for Steve:** C2 has two readings. The Segue chat renamed "Advanced" to **Fine tuning** and you said yes on the 13th; the house rule as written says a section named for how much you care is a structure fault, and would put Opacity in Shape, Rotation and Thresholds in groups, and Presets in a section of its own. The rename is what shipped. Say the word and the dissolve is half an hour.

## GO: the house sync (Steve, 10 Nov 23:30 – "after this run, I think now is the time")

Steve, 11 Nov: "following the latest release of Segue, we need to update the house UI style, consolidating rules, hierarchy logic and anything else to ensure a robust guide on any new developments or updates. equally, these should be rolled through Tutti and Rubato, with testing (especially on Tutti as that is live)."

`shared/UI.md` (the Project's `claude/house-ui-rules.md`) is the guide – read it first. It now carries the ladder of levels, **Where a new thing goes**, **Naming, before building** and **Taking a tool onto the house style**. Segue is still the reference build; the parts it proved are in the kit now, so take them, don't rebuild them.

### Done, 13 November

- **One corner logic.** A wrapped row of choices kept a 17 px lozenge radius from before the kit (Steve spotted it in Tempo, 12 Nov); Rubato's XY pad was 14, Segue's placement spots 5, and every plain slider was still a lozenge. All on the ladder now. **`tests/corner_check.py`** reads every radius in all four tools and fails on one off the ladder, or one that doesn't follow its parent – this is not a thing to check by eye.
- **Zoom in Tempo**, so all four have `shared/view.js`.
- **Guides in Tutti, Rubato and Tempo** – `mountGuides` lays a margin and cells over the canvas rather than drawing them in, so no export has them. Segue keeps its own, because it also snaps to them.
- **The pop is in the kit** – the small panel under a top-bar button was Segue-only CSS, so the first guides pop in Tutti had no surface under it at all.

### Done, 11 November

- **The kit holds the house parts** – the pasteboard's dots, switch groups (`.toggle-row.sw-grp`), the long-job button and its note, the group (`fold()` in `shared/core.js`, `grp:true` on a switch), the base grey `#F6F5F4` and its darker tones, the slider handle that fades where it crosses a bar's words, and the view's zoom (`shared/view.js`).
- **Tutti 6.3** – Advanced dissolved (Opacity into Shape, Rotation a group, Thresholds a group in Mapping, Presets its own section); Warp a group instead of a plain heading; the renames (Format, Colour, Source zoom, Filled, Invert, Size by tone, Smallest, Mark size, Opacity, SVG colours); the house colour row (hex field and swatch); room in the band rows; the top bar's zoom.
- **Rubato 1.3** – the panel in the order of work (Canvas, Text, Fonts, Layout, Motion, Variants, Physics); groups instead of plain headings; the "More" sections named; switches heading what they turn on; Undo and Redo in the top bar with ⇧⌘Z; the dial out of the label column; the top bar's zoom.

1. **Top bar** – keyline groups top right: info chips, Undo and Redo, zoom (−, value, +; fit and 100%), Guides (on/off, an arrow to Margin, Grid, Snap). View settings live here, never in exports.
2. **Change dots and undo** – blue `--k-dot`, click to put back, section Reset, ⌘Z / ⇧⌘Z and the top-bar buttons. Each tool needs "where a setting started": Tempo – the preset open, else defaults; Rubato – defaults; Tutti – each input's starting value. **Tutti done (6.3, 13 Nov).**
3. **Switches** (new, Segue 0.16) – anything optional with settings of its own is a switch that heads them: a switch section (box in the card's head, no arrow) or a switch group (`grp:true` on a toggle in Segue's `frame.js`; `.toggle-row.sw-grp` in its `app.css` – move both to the shared kit). No feature turned on by raising a slider from 0.
4. **Shut groups say what they hold**; no group called "Advanced", and at most one "More" in a section, at its foot (amended 12 Nov, Segue 1.0); no fifth level (plain labels used as mini-headings).
5. **The pasteboard's dots**, the panel edge with no mark, the kept scrollbar lane (already in the kit), **one outline** on the canvas, no modifier keys for main actions.
6. **Choices that become menus** when they won't fit (update Tempo's and Rubato's tests to use the menu where needed).
7. **The order of work** – lay each panel out again from the top (see B–D).
8. **A settings audit** for each tool, on the model of `tests/audit/` – every setting changed and the output compared. Fix or hide what it finds before polishing anything.

**Change dots and undo** – Tutti has them (6.3, 13 Nov); Rubato and Tempo not yet. Each still needs "where a setting started": Rubato – defaults (undo and redo are in its top bar now, the dots are not); Tempo – the preset open, else defaults. With it come the blue dot per changed setting, click to put back, and a section Reset.

**Rubato**
1. **Long choice grids become menus** – Movement (six), Order (five), Swap (five); with a drawing where the choice has a shape (Movement, Order).
2. **Kerning by drag** on the canvas – it is keyboard only; keep the keys as the extra.
3. **The guide, top left** (`#selHint`) – Rubato's canvas (kerning, dragging a lockup) is the obvious home for it.
4. **Three settings called "Stretch"** – the Layout switch and the two Variants ranges. One word, one idea.

**Tutti**
5. **The colour picker in house terms** (Steve, 6 Nov) – the hex field and swatch are in; what opens from the swatch is still the browser's own.

**Tempo**
6. Section names repeat (four "Change", five "Colour") – one word, one idea; fifteen-plus sections – the order of work, and what could be groups.
7. The colour picker, as above.

**Every tool**
8. **The machine's eye, wider than corners.** `tests/corner_check.py` is the model: read what is on the page and compare it with the house, rather than looking. Heights, type sizes and the greys would all take the same treatment.
9. **A settings audit** on the model of `tests/audit/` – every setting changed and the output compared – for Rubato and Tempo. Segue and Tutti (6.3, `tests/audit/tutti.py`) have one.

1. **Labels that wrap:** "Canvas colour" (inside Canvas → "Colour"), "Fill shapes solid", "Invert mapping", "Scale with midtones", "Shape size / overlap", "Keep SVG colours".
2. **"Advanced"** – a section named for nothing; name it by what's in it or move its settings to what they're settings of.
3. **Names across the tools:** "Ratio" → Format; "Zoom" in Canvas is the source's zoom, which will clash with the top bar's view zoom once that arrives – "Source zoom" or "Scale".
4. ~~**Colour rows** have a swatch only~~ – done 12 Nov: the swatch opens the house picker, which has the hex field.
5. **Mapping's band rows** – more room left and right (Steve's 6 Nov note).
6. **Missing house parts:** change dots and undo, top-bar zoom and guides, pasteboard dots.

Every suite green against the baselines on main, `tests/corner_check.py` included (11 Nov: Tutti 84/84 with its 12 export hashes identical, Tempo 124/124, Rubato features 43/43 and 14 looks identical to 0.9, split 15/15, parity all results match, Segue 186/186 and 83/83, licence 4/4); the WebKit probe on GitHub Actions; screenshots light, dark and phone; Tutti on weareensemble.co.uk/tutti and /tutti/app. Then push, confirm live, and report as hitlist / to-do / status / versions.

## Who does what

- The **UI stream chat** owns `shared/` and the panels' layout. Behaviour stays with each tool's chat.
- The **Segue chat** keeps `shared/UI.md` current as Segue moves.
- Renaming a section or label needs its test changed in the same commit, and the tool's own chat told – labels are the tests' contract.

## History

- **13 Nov:** Tutti 6.4 – Mixed sizes (a switch group in Shape), the house set of marks and big marks in a drawer under each band row, all drawn from one placement list.
- **13 Nov:** Tutti 6.3 – change dots, Reset, Undo and Redo; its settings audit; marks redrawn for a new cell size.
- **13 Nov:** Segue 1.2 – Blur behind fixed; no "?" marks where rows explain themselves (Rubato 1.3.1, Tempo 0.18.2); Tutti's "?" centred. Tutti could take row notes too (then lose its "?") – part of C6.
- **13 Nov:** one corner logic across all four; `tests/corner_check.py`; zoom in Tempo; guides in Tutti, Rubato and Tempo; the pop lifted into the kit. Segue 1.1 – stand-ins for big pictures, Glass, Focus, packed Lines, still two-colour drawings, calmer presets; Tutti's labels (C1–C3, C5).
- **12 Nov:** Segue 1.0 – the hitlist (turning, endings, a video behind, frosted type, own shapes everywhere, the deck, the house picker, a still bottom line, sixteen presets). The shared parts taken to Rubato 1.2.1, Tempo 0.18.1 and Tutti in the same pass; `UI.md` revised.
- **11 Nov:** Segue 0.11–0.17 (in the Segue chat) – blends that make layers, the project chip, Layout apart from Motion, Pile up, cropping by double-click, the settings audit, switch groups, no Additionals, the export as one control and the bottom line. `shared/UI.md` rewritten. Safari 17 sheet fallback shared with Rubato and Tempo.
- **10 Nov 12:03:** Steve: "wait for now until Segue is in a place, then we can run through the hitlist above on all in one clean go."
- **6–9 Nov:** Segue 0.6–0.10 – layers, guides, the Snap, the Wall, Rows, projects, the top bar; thin scrollbars on every tool.
- **6 Nov 09:30 – released:** the house kit on every tool. Segue 0.5.3, Tempo 0.12, Rubato 1.2, Tutti 6.2. All suites green, Tutti's 12 export hashes identical to 6.1.1, Tutti checked on weareensemble.co.uk/tutti and /tutti/app.
- **5 Nov:** Segue 0.5 → 0.5.2 – round 4 kit trialled on Segue; the ladder of levels and the row grammar.
- **Round 4 (5 Nov):** review page at /ui/review/round4/ – Steve chose A's look in our frame with B's slider and change column.
- **13 Oct notes:** sliders, Aktiv Medium for hierarchy, fluid motion, Tutti's hierarchy – all covered by round 4 and the kit. Site: delete the stray "<" in Squarespace's site-wide Footer code injection (causes the grey strip on /tutti/app).

# UI stream – to do

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
- **Tutti's list (C1–C3, C5, C6) is untouched** – label wraps, "Advanced", "Ratio"/"Zoom" names, band rows, change dots. They rename labels on a live public tool, so they still want Steve's yes; C4 is done.
- Rubato: turning and sizing a lockup on the canvas could take Segue's handles (corner sizes, outside a corner turns) – its Tilt dial is the candidate.

## GO: the house sync (Steve, 10 Nov 23:30 – "after this run, I think now is the time")

Segue is in place (0.17, 11 Nov): every setting audited by machine, the panel in the order of work, one way to switch things on, no bolt-on tier, the export as one control and the work on the bottom line. `shared/UI.md` was rewritten on 11 Nov as the current house rules (the Project's `claude/house-ui-rules.md` is the same file) – read it first; it now has ten principles and three new sections (The panel as a whole, Switches, On the canvas, Checking a tool).

Run this in one pass across **Rubato** (first – it's being shared next), **Tempo** and **Tutti**. Not Decentish or Patch – they're websites. Segue is the reference: copy its parts, don't reinvent them.

**First:** `git pull`; read `shared/UI.md`, Segue's `frame.js`, `app.css` and the kit; take baselines of every suite on main (11 Nov: Tutti 84/84, Tempo 124/124, Rubato features 43/43 and 14 looks identical, Segue 171/171 and 83/83).

### A. Bring Segue's house parts across (all three tools)

0. **New since this list was written (Segue 0.17, 11 Nov)** – all four of these are house rules now:
   - **The bottom line**: the project chip moves out of the top left and on to the bottom line with the play bar and the presets, the same height and shape; the line gives way in order (project name, then the play bar, then a note – never one with an Undo). Tempo and Rubato have no projects yet, so this is Segue-only until they do.
   - **The guide, top left** (`#selHint` + `topFit` in Segue's `frame.js`): one line saying what the selected thing does under the pointer; the panel's rows say the keyboard. Rubato's canvas (kerning, dragging a lockup) is the obvious next home for it.
   - **Long jobs** (Export): the opening button carries a chevron; the doing button becomes the progress (fill, per cent, time left) with Stop beside it at the same height; the job runs from a copy so the person can carry on; a note top right (`notice()` in Segue's `frame.js`) when the sheet is shut as it ends. Tutti's recorder and Rubato's exports both want this; `notice()` and the `.run` button CSS should move to the shared kit when the second tool needs them.
   - **Drawings that move** on hover (preset pictures, Kind tiles). Rubato's Movement and Order drawings are the candidates.


1. **Top bar** – keyline groups top right: info chips, Undo and Redo, zoom (−, value, +; fit and 100%), Guides (on/off, an arrow to Margin, Grid, Snap). View settings live here, never in exports.
2. **Change dots and undo** – blue `--k-dot`, click to put back, section Reset, ⌘Z / ⇧⌘Z and the top-bar buttons. Each tool needs "where a setting started": Tempo – the preset open, else defaults; Rubato – defaults; Tutti – each input's starting value.
3. **Switches** (new, Segue 0.16) – anything optional with settings of its own is a switch that heads them: a switch section (box in the card's head, no arrow) or a switch group (`grp:true` on a toggle in Segue's `frame.js`; `.toggle-row.sw-grp` in its `app.css` – move both to the shared kit). No feature turned on by raising a slider from 0.
4. **Shut groups say what they hold**; no group called "Advanced", and at most one "More" in a section, at its foot (amended 12 Nov, Segue 1.0); no fifth level (plain labels used as mini-headings).
5. **The pasteboard's dots**, the panel edge with no mark, the kept scrollbar lane (already in the kit), **one outline** on the canvas, no modifier keys for main actions.
6. **Choices that become menus** when they won't fit (update Tempo's and Rubato's tests to use the menu where needed).
7. **The order of work** – lay each panel out again from the top (see B–D).
8. **A settings audit** for each tool, on the model of `tests/audit/` – every setting changed and the output compared. Fix or hide what it finds before polishing anything.

### B. Rubato 1.2 – action points (reviewed 11 Nov against the rules)

Nothing is broken; this is structure, names and the missing house parts. In order of value:

1. **Order of work.** Now: Fonts, Text, Layout, Motion, Variants, Physics, Colour. The canvas's format is "Shape" inside Layout and its background is in Colour, at the foot. Proposed: **Canvas** (Format, Background, Transparent) → **Text** (the words; type colour here) → **Fonts** → **Layout** → **Motion** → Variants → Physics.
2. **Names doing two jobs across the tools.** "Shape" is the canvas's format (Segue: Format; Shapes are the pieces). "Position" (Top / Middle / Bottom) – Segue's Placement. "Size" (Fit / Fill width / Manual) reads as a canvas size.
3. **A fifth level.** "Spacing", "Kerning", "Repeat", "Glyphs", "Image" are plain labels used as mini-headings – make them groups (rule, 13 Bold, saying what they hold) or drop them.
4. **Three groups called "More".** Name each by what's in it.
5. **Switches.** Physics is a section whose only first row is "Pull apart" – a switch section. "Sequence of texts", "Repeat rows", "Stretch to fill", "Transparent background" – switch rows or groups by the rule.
6. **Labels that wrap:** "Sequence of texts", "Transparent background" – shorten.
7. **Kerning on the canvas** is keyboard only (click between two letters, then arrow keys) – add a drag; keep the keys as the extra.
8. **Long choice grids** (Movement: six; Order: five; Swap: five) – menus, with a drawing where the choice has a shape (Movement, Order).
9. **Missing house parts:** top-bar Undo/Redo and zoom (Undo is a disabled button in the island now), change dots, pasteboard dots, Tilt's dial off the label column.
10. **Safari 17:** done 11 Nov – the sheet fallback is in `shared/core.js`.

### C. Tutti 6.2 – action points (live on weareensemble.co.uk – change with care, hashes identical)

Tutti is the simplest and the closest to the rules; nothing urgent, nothing broken.

1. **Labels that wrap:** "Canvas colour" (inside Canvas → "Colour"), "Fill shapes solid", "Invert mapping", "Scale with midtones", "Shape size / overlap", "Keep SVG colours".
2. **"Advanced"** – a section named for nothing; name it by what's in it or move its settings to what they're settings of.
3. **Names across the tools:** "Ratio" → Format; "Zoom" in Canvas is the source's zoom, which will clash with the top bar's view zoom once that arrives – "Source zoom" or "Scale".
4. ~~**Colour rows** have a swatch only~~ – done 12 Nov: the swatch opens the house picker, which has the hex field.
5. **Mapping's band rows** – more room left and right (Steve's 6 Nov note).
6. **Missing house parts:** change dots and undo, top-bar zoom and guides, pasteboard dots.

### D. Tempo 0.16 – seen in passing (not asked for; for the pass)

Section names repeat (four "Change", five "Colour", "From your other designs" × 5) – one word, one idea; fifteen-plus sections – check the order of work and what could be groups.

### E. Steve's open list from 6 Nov (every tool)

- **Slider handle over words** – fade or sort the line where it crosses a bar's text (his grab: Tutti's Edges).
- **Colour picker in house terms** – Tutti's and Tempo's; function unchanged.
- **Base grey #F6F5F4** (sampled 246, 245, 244; a touch warm) – derive the darker tones from it; update `kit.css` tokens and `UI.md`. Still to confirm with Steve: `UI.md` says neutral greys.
- Done since: sparse dots behind the canvas (Segue 0.11 – bring across); list rows' room (Segue 0.11's lane; Tutti's bands still to do).

**Checks before release:** every suite green against the baselines; Tutti's 12 export hashes identical; Tempo and Rubato exports unchanged; WebKit probe (Safari); screenshots light, dark, phone; Tutti on weareensemble.co.uk/tutti and /tutti/app. Then push, confirm live, report as hitlist / to-do / status / versions.

## Who does what

- The **UI stream chat** runs this sync (it owns `shared/` and the panels' layout). Behaviour stays with each tool's chat.
- The **Segue chat** keeps `shared/UI.md` current as Segue moves, and wrote this list.
- Renaming a section or label needs its test changed in the same commit, and the tool's own chat told (labels are the tests' contract).

## History

- **12 Nov:** Segue 1.0 – the hitlist (turning, endings, a video behind, frosted type, own shapes everywhere, the deck, the house picker, a still bottom line, sixteen presets). The shared parts taken to Rubato 1.2.1, Tempo 0.18.1 and Tutti in the same pass; `UI.md` revised.
- **11 Nov:** Segue 0.11–0.17 (in the Segue chat) – blends that make layers, the project chip, Layout apart from Motion, Pile up, cropping by double-click, the settings audit, switch groups, no Additionals, the export as one control and the bottom line. `shared/UI.md` rewritten. Safari 17 sheet fallback shared with Rubato and Tempo.
- **10 Nov 12:03:** Steve: "wait for now until Segue is in a place, then we can run through the hitlist above on all in one clean go."
- **6–9 Nov:** Segue 0.6–0.10 – layers, guides, the Snap, the Wall, Rows, projects, the top bar; thin scrollbars on every tool.
- **6 Nov 09:30 – released:** the house kit on every tool. Segue 0.5.3, Tempo 0.12, Rubato 1.2, Tutti 6.2. All suites green, Tutti's 12 export hashes identical to 6.1.1, Tutti checked on weareensemble.co.uk/tutti and /tutti/app.
- **5 Nov:** Segue 0.5 → 0.5.2 – round 4 kit trialled on Segue; the ladder of levels and the row grammar.
- **Round 4 (5 Nov):** review page at /ui/review/round4/ – Steve chose A's look in our frame with B's slider and change column.
- **13 Oct notes:** sliders, Aktiv Medium for hierarchy, fluid motion, Tutti's hierarchy – all covered by round 4 and the kit. Site: delete the stray "<" in Squarespace's site-wide Footer code injection (causes the grey strip on /tutti/app).

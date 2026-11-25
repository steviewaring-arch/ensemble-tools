# UI stream – to do

## The 25 November rollout (Steve's five steps, one at a time, each tested before it goes live)

1. **The house check, widened** – done, and widened again to everything behind a click. 2. Tutti: break up Fine tuning – done. 3. Tempo onto the house style – the picker is on the house looks (0.18.4); change dots, Reset and undo still to come. 4. Rubato: menus, one "Stretch", change dots, kerning by drag, an audit. 5. Tutti: row notes instead of "?", and the house colour picker.

### Done 25 Nov – the component page, at /ui/kit/

Every house part on one screen, built from `shared/tokens.css`, `components.css` and `kit.css` – the same files the tools load, in the same order – so it cannot drift into a parallel truth. `ui/kit/body.html` is the only hand-written part; `ui/kit/make.py` runs from `build.py` after the tools. **`tests/corner_check.py` reads it as a fifth tool**, which is the point: a component only gets checked when a panel happens to show it, and the wrapped choice group that sat at 17px for weeks appears in two panels out of four.

**The inventory it generates is the refactor queue.** 424 classes in all: **191 are the house's**, and **238 belong to one tool** – Segue 75, Tutti 58, Tempo 55, Rubato 41. Those are the components that cannot be refined from the kit. Of the 238, 209 are visibly in the markup and 29 are not, which is a dead-code list worth a look rather than proof.

Two cautions, learned the hard way building it:
- A specimen that does not match the real markup gives false confidence. The first draft wrote the stepper's – and + as text where the tools use SVG icons, and duly "found" a type stray that was mine.
- The "seen in the markup" column reads class attributes and the `el(tag, class)` helpers. Rubato and Tempo build most of their DOM through those helpers, so before it knew about them it called 142 live classes dead.

### Done 25 Nov – mobile tidied, the pre-kit leftovers cleared, and a bench to judge the kit on

Steve, 25 Nov: "mobile has not been a priority, this is a bit of a mess – padding off (too thin on
right hand side), then '?' scattered and misaligned … it still needs to look and feel right
regardless."

Three causes, all in the kit, none of them Tutti's:
- **The right edge had no padding.** `.scroll` carries `scrollbar-gutter:stable` and
  `padding-right:0`, which is right on a desktop – the scrollbar fills that lane. A touch screen
  draws its scrollbar over the content, so the lane was simply missing padding. Given back under
  `@media (hover:none)`, so a narrow *desktop* window, which does have a real scrollbar, keeps the
  reserved lane.
- **The panel sat off to the left.** `.card-body` reserves `16px + --gutter` on the right for the
  change column – 36px of a 390px screen, holding nothing in Tutti. The gutter is 10px on a phone
  now; the dot is 6px, and 9px when pressed, so it still fits. Rows went from 288px wide to 304px.
- **The `?` was in two places at once.** Every row puts it after its label – except a slider row on
  a touch screen, which `@media (hover:none)` pulled out to `left:-24px`. On a desktop the slider's
  `?` is hidden altogether, so this only ever showed on a phone, which is why it survived. It now
  follows its label like every other row. The reason it was parked outside was presumably the
  slider's label doubling as a drag handle – but the handler has always treated `.q` and `label` as
  "soft" (`const soft = !!e.target.closest('.q,label')`), so a tap there never moved the value.

**The pre-kit leftovers, cleared.** Four one-liners in the kit, each a house value the kit had not
finished taking over: `.tab`/`.lane` kept 13.5px type because the kit took over their corner and
height but not their size; `.st-btn` was 14px; `.sheet` was padded 18px, which is not on the step;
and `button{padding:0}` now says once that a button has no padding of its own, so Chrome's `1px 6px`
cannot show through again.

**A bench at `/ui/kit/`.** The page was an inventory; it is now something to test on. Every
component sits in a real iframe at a real viewport width, so the panel's own breakpoints fire as
they do on a phone – a width set on a div does not fire them, which is exactly how the mobile
layout drifted unseen. Light and dark side by side, Desktop / Tablet / Phone, and a Touch switch
that serves the kit's own `hover:none` rules, lifted out of `kit.css` at build time so the bench
cannot drift from the rule it is showing. `tests/corner_check.py` reads `specimen.html` rather than
the bench, because the bench's own chrome is not a component.

Two things the bench taught us while it was being built, both worth keeping:
- **Its chrome must not borrow a house class name.** `.stage` is one the kit pins to `inset:0`, so
  the frames covered the controls. Everything the bench draws for itself is `bx-*` now, and
  `make.py` fails the build if that slips.
- **Squeezing two frames side by side was a lie.** A desktop pair at 700px each sits under the
  860px breakpoint and quietly shows the tablet layout. Each frame keeps the width you asked for
  and they wrap instead.

Still open on mobile, both design calls rather than faults: the lone `?` in a card's tools row
(Mapping, Thresholds) sits correctly against the labels below it but alone on its row, which reads
as orphaned – step 5's "row notes in place of the ?" settles it; and a stepper right-aligns while
every other control starts at the label column, which is the same on a desktop.

### Done 25 Nov – the house check reads what you have to open

It only ever read what was on screen. Everything behind a click went unchecked in every tool:
closed popovers and menus, **both colour pickers** (they hang off `<body>`, outside the panel, so
the selector never reached them), and **shut groups** – Tutti's new Jitter and Thresholds had never
been read once. The green line said "corners 0, spacing 0" across 1,584 visible elements and
nothing you had to open.

It now opens the overlay layer (`.pop, .cpk, .cpick, .menu, [role=dialog]` – remembering how each
one was and putting it back) and clicks every shut `.fold-head` twice over, in case opening one
puts another on screen. **2,202 elements, up from 1,584**: a third of the UI had never been looked
at. A stray found in there is marked *(behind a click)*, because it is the kind nobody spots by eye.

What it found at once, all in Tempo's own colour picker: three `3px` corners, a choice-group track
painted in Tempo's `--seg` instead of the house fill, and `1px` of padding on two buttons – which is
**Chrome's default button padding showing through**, because neither reset it. A `padding:0` in the
kit's button reset would stop that happening again anywhere.

Two limits, so the green line is not over-read:
- A revealed picker is not an *opened* one: anything built as it opens is not in the DOM. Tempo's
  saved-colour swatches were absent, so their `3px` corners were caught by reading the CSS, not by
  the check. Opening each picker for real is the next step.
- It cannot tell a round button from a round dot – any radius of 25 or more passes as round. The
  pipette being a circle broke "round is for dots, knobs and switches" and the check said nothing.

### Rule gaps found 25 Nov – for Steve

Four places where the tool is not so much wrong as the written rule has nothing to say. Flagged
rather than bodged, per Steve: "house rules stuck to or flagged as something we need to adjust or
add to."

1. **Bars and ticks have no corner.** The ladder is 4·6·8·10·12, round only for dots, knobs and
   switches. The kit itself rounds a bar to half its thickness in **seven** places – the slider tick
   (3px wide, 2px radius), the drop indicator, the progress bar, the scrub track, a focus ring. That
   is a consistent practice the ladder does not allow, and `corner_check` only agrees with it by
   accident, because it drops anything under 4px. Proposed: **a bar or tick is rounded to half its
   thickness**, a third category beside boxes and dots.
2. **Type inside a preview has no size.** The scale is 11.5·12·12.5·13·15·20. Tempo's theme tiles
   hold a ~9px mock-up of the clock, and its histogram axis sits at ~10px. Those are pictures of
   content at small scale, not panel chrome, and nothing on the scale fits. Proposed: name them as
   outside the scale rather than drag them onto it. (Tempo's three *real* labels that were on rem –
   12.16, 13.12 and 12.8px – are now on the scale; the six that remain are all previews or an axis.)
3. **`--r-card` is not the card radius, and is declared twice.** `tokens.css` says 6px, `kit.css`
   says 8px, and kit loads later so 8px wins. The real card radius is a third token,
   `--r-cardk:10px`, with `.card-body` hardcoding 10px beside it. Eight things use `var(--r-card)`
   and not one is a card: a picker panel, Tempo's thumbs and theme tiles, Tutti's state rows, gif
   module and markbox. Worth untangling before anything more is built on it.
4. **Two house popovers, two materials.** `.pop` is flat `--k-card` with a keyline; `.cpk` is
   translucent with a 24px blur and a 12/36 lift. Same role, different material. Tempo's picker is
   matched to `.cpk` for now, because that is the picker three tools out of four show – but one of
   the two should win.

And one that is a decision rather than a gap: **the house colour picker cannot simply replace
Tempo's.** Tempo's has RGB *and* CMYK, and 48 deliberately saved colours (`+`/`×`, kept across
designs); the house one is RGB-only with 16 automatic recents. Step 3 asked for the house picker in
Tempo, and giving it would delete CMYK and the saved-colour library from the one tool whose whole
subject is colour. So Tempo keeps its workings and has been given the house looks, and the house
picker wants a CMYK mode and saved colours before any colour-heavy tool adopts it wholesale.

### Done 25 Nov – Tutti 6.7: Fine tuning broken up

Steve: "Fine tuning: break it up... No exceptions to the naming rule from here on."

- **Opacity** and **Rotation** are properties of a mark, like its size, so they sit in Shape with the rest – above the Mixed switch, which heads only what it turns on. Below it they read as its own; that only shows on screen, not in a diff.
- **Jitter** is a group in Shape holding **Angle** and **Position**. "Rotation & jitter" was two ideas in one heading.
- **Thresholds** is a group in Mapping, where the bands are. "Master" is **Shift**, which is what it does; **Even** sits in the group's own tools row.
- **Presets** is a section of its own, because it is not a setting of anything.
- **Three "size" in one card** became **Smallest**, **Size** and **Mixed**. Scale was the obvious middle word but Canvas already uses it for the source scale, and the rule is no word twice in a panel.

Every suite green, the 12 export hashes byte-identical, corners, colour and spacing clean.

**Two things the testing itself turned up**, both older than this round:
- Tutti's test helpers used the page's locator, so in embed and app modes – where the app is in an iframe – they waited 30 seconds for an element that was never there.
- The settings audit read each setting's path *after* changing it, so anything in a list that gets rebuilt (bands, thresholds) had no card to name: eleven came back as "? › Edge 1". And it judged a reset against the pristine baseline, which is the one thing a reset returns to, so Even and Reset shapes reported "no effect" on every run. Both fixed; a check that cries wolf every run teaches people to skim past the real ones.

### Done 25 Nov – spacing on one scale (Segue 1.3.2, Rubato 1.3.2, Tempo 0.18.3)

48 strays, about twenty declarations, most of them shared through the kit: the chip's optical padding (9/8/5 → 8 and 6), the switch row's 9px gap, the slider head's 3, the typable value's 7, the text area's 7, the brand's 1, the hints' and card body's 18, the slot rows' 7, the tiles' and labels' 5 and 3; Segue's Kind tiles, placement grid, scrub ticks, card head and empty media; Tempo's switch set, theme tiles, clock and name (the last two were rem against a 15px root, which is where 18.8px and 10.8px type came from); Tutti's empty mark, GIF sub-title, Edges head, SVG chips and the two buttons still taking the browser's own 1px padding.

Snapping the placement grid and the theme tiles to a 4px inset broke the nesting rule – a 6px corner wants a 2px inset – so those two inner corners are 4px now. **Corners 0, colour 0, spacing 0.** Every suite green, Tutti's 12 export hashes byte-identical.

**Carried forward, worded as what they are:** three wrapped choice groups want menus and Rubato's pre-kit `.st-*` stepper sets 14px type (step 4); one Tempo switch runs to two lines because its name is too long (step 3).

### Done 25 Nov – `tests/corner_check.py` reads the whole house, not just corners

It now reads **heights, type, colour and spacing** as well, resolving the kit's tokens in the page so a near-miss grey has nowhere to hide. Corners still fail the run; the other four report and fail only with `--strict`, so a tool still queued doesn't hold the suite red. Proved by planting a wrong colour, height and size in a page and watching it catch all three.

**1,495 elements across the four tools. Corners 0. Colour 0** – every opaque background and text colour resolves to a kit token.

**Heights – 8**
- A choice group that wraps to two rows is 58 px, in Rubato (×2) and Tempo. Not a height fault as such: it wants a menu (step 4).
- `segue: button.spot` 22 – the placement grid.
- `tempo: button.toggle` 31.2 – a switch row half a pixel off 30.
- `tutti: button.svgbtn.markbtn` 19.8, `tutti: input` 21, `tutti: input.stColor` 32 – the last still on `tokens.css`'s old `--h-ctl:32px` rather than the kit's 30.

**Type – 3**
- `rubato: button.st-btn` 14 px; `tempo: span` 18.8 px; `tempo: span.tt-name` 10.8 px. The house has five sizes and none of them is any of these.

**Spacing – 48, and they fall into eight numbers**
- **9 px** (15, all four tools) – `.pill.small`'s optical padding, Tutti's links, Segue's Kind tiles.
- **3 px** (9, all four) – `.ctl-head`, Tempo's theme tiles, Tutti's rows.
- **18 px** (8, all four) – `.card-body` and the hints.
- **1 px** (5, all four) – `.brand`.
- **7 px** (5) – the typable values and the text areas.
- **5 px** (3) – `.pill.small` again.
- **−5 px** `segue: span.ticks`, **37.2 px** `segue: span.sum`, **42 px** `segue: button.card-toggle`.

Most of these are one declaration each, shared by every tool through the kit, so they are a handful of edits rather than 48.

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
6. ~~Section names repeat (four "Change", five "Colour")~~ – **wrong, corrected 25 Nov.** That note was written from a static read of `tempo/app.js` without checking which cards are ever on screen together. Each is built per screensaver kind with a `show` predicate (`clk`, `wd`, `dl`, `stk`, `ty` on `s.ssShow`), and those are mutually exclusive, so **one Change and one Colour are ever visible**. Seven sections are on screen at once: Fonts, Clock, Numerals, Change, Position, Colour, Promo – no repeat among them. Audited against what the panel actually shows, the only name used twice is **Length** (Change, and the internal Promo card). The twenty-three sections in the source are not twenty-three sections in the panel.
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

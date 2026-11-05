# The Ensemble tools interface

One system for Tutti, Rubato, Tempo and whatever comes next. Swiss in spirit:
one weight of Aktiv Grotesk, monochrome, few sizes, nothing decorative. The work
is the only colour on screen. Settled with Steve over three rounds, 8–9 October
2026. The live reference is `ui/review/` (built to `docs/ui/review/`).

Files: `shared/tokens.css` (the values), `shared/components.css` (the frame
and every control), the layout parts of `shared/core.js` (cards and their
summaries, sheets, Preview, tooltips, the slider and segmented-control
upgrades) and `shared/core-end.js` (theme, keys, panel width). Tutti keeps its own
page and script and takes the same styles at build time, with
`tutti/frame.css` and `tutti/frame.js` for its own parts.

## The frame

- **The work fits, then fills.** By default the work sits in the clear space:
  right of the panel, under the top bar and above the island, on the app's own
  colour. **Preview** (the expanding arrows, or F) fills the window with it, and
  the panel slides away to the left. The island, Presets and top bar stay. The
  panel button (top left, Preview only) brings the panel back over the work;
  a click on the work puts it away again. Esc or F leaves Preview.
- **Four things float**, 12 px from the edges, frosted (the app colour at 92%,
  24 px blur) and edged with a hairline. **No drop shadows anywhere**: surfaces
  are told apart by hairlines and fills, never by shadow.
  - **Panel**, left, top to bottom – making. Its right edge drags (280–440 px,
    remembered).
  - **Top bar**, top right – chips, then Preview and light/dark. The same place
    in every app.
  - **Island**, bottom centre – what you do to the view, and what you take away.
  - **Presets**, bottom right, the island's height – choosing. Only in apps that
    have presets.
- **The island holds** what changes the view (Tempo's Show; Rubato's Pause,
  scrub, Randomise and Undo; Tutti's Pause when the source moves), then
  **Export**. Status lives here too ("Saved tempo.html", "Recording 0:03"). The
  island centres under the work and moves aside for Presets.
- **Sheets** grow out of whatever opened them: Export and Randomise's options
  from the island, Presets from its capsule. One at a time. Esc, or a click on
  the work, closes them – and that click only closes; it never reaches the work
  (it won't start Rubato's kerning, say). An open sheet's surface goes almost
  solid, so the work behind doesn't smudge its text. A card built with `card()` becomes a sheet with
  `cardToSheet(body, 'export' | 'presets')`, with the same controls and labels.
- **Light and dark:** light by default. Dark only once someone chooses it with the
  button, then remembered per tool (`<app>:mode`, written only by the button).
- **Phones** (860 px and under): the stage sits on top and the panel runs below
  it. The island runs along the bottom: its view controls scroll sideways (the
  far end fades when there's more), Export stays at its right end, and Presets
  shrinks to its icon beside it. An open sheet takes the full width.
- **Embedded:** in an iframe on another page (the Ensemble site), a tool shows as
  a framed object – rounded, hairline, on that page's colour (`html.embed`, set in
  the page's head). `?app` in its URL opts out, for a full-page embed that should
  fill its iframe edge to edge. Embed code for the site is in `tutti/EMBED.md`.

## Depth – three levels, never four

1. **Card** (`card(id, title)`). One of the panel's chapters. Shut, its title row
   says what's set – "24-hour · Comma · Leading zero". The line is built from the
   card's own choices and switches (`autoSummary`), or `SUMMARY[id] = s => '…'`
   when the app knows better. Which cards start shut: `appCollapseDefault()`. The
   card for what you're working on starts open; the rest start shut.
2. **Group** (`fold()` in Tempo, More in Rubato). The part of a card you don't
   always need. A small grey label over a hairline, with its own summary when
   shut.
3. **Detail.** Belongs to one row, such as a font's role and tracking. It opens in
   place, under its row.

Things that change nothing float instead and close when you click away: a
tooltip, a sheet.

## Controls – one of each

- **Slider.** The label and value sit inside the track. The fill carries the
  value. The tick shows only where it won't cross the words. Any `.ctl` holding
  an `input[type=range]` is upgraded automatically. Double-click resets.
- **Segmented control.** Up to four short options in one row. Otherwise an even
  grid, and the last row's options share its width, so none is left on its own.
  Each control is laid out to fit from its labels (`fitSeg`). Long labels or
  many options: use a menu. A row of pill buttons that pick one thing (colour
  themes) gets the class `choice` and looks and lays out the same.
- **Pairs.** A handful of one-off actions (Rubato's colour presets) sit in an even
  two-column grid (`btn-row pairs`), never a ragged wrap.
- **Menu** (`select`). Under its label when the label is long, beside it when it's
  short.
- **Toggle.** The round tick. Anything that depends on it appears only while it's
  on, and the space closes up.
- **Buttons.**
  - Primary: one per place – the main action in a sheet.
  - Standard.
  - Quiet: secondary actions.
  - Icon buttons always carry a tooltip and a spoken label.
- **List row.** A name, a short grey summary, then a switch, swatch or tag at the
  end. Fonts, mapping bands and text blocks all use it.
- **Chips.** Facts in two or three words ("1680 × 1050", "Demo face"). The
  sentence goes in the chip's tooltip.

## Sizes

- **Type:** one weight.
  - 22 px – name and version, and "By ENSEMBLE" under them in grey, the same
    size and tracking.
  - 16 px – card titles.
  - 14 px – everything you read or set.
  - 12 px – summaries, hints, chips.
- **Heights:**
  - 44 px – island and Presets capsule.
  - 40 px – a card's title row; the one big action in a sheet.
  - 36 px – controls in the island.
  - 32 px – controls in the panel.
  - 28 px – chips and the top-right buttons.
- **Corners:**
  - 12 px – panel and sheets.
  - 6 px – cards and wells.
  - 4 px – tiles and swatches.
  - Round – every control, the island and the capsule.
- **Space:** a 4 px step – 4 and 8 inside controls, 12 between them and from the
  edges, 16 inside sheets.
- **Grey text:** at least 4.5:1 in both themes (#67656B light, #A3A1A8 dark).
- **Motion:** one curve, 0.42 s, for every grow and shrink. None with reduced
  motion.

## Help

- Every control has a tooltip. Hovering the row shows it after a beat; tabbing
  to it shows it at once. A click always clears it, and a control you've just
  pressed stays quiet until the pointer leaves it. The ? stays for touch screens
  and keyboards, and on screens with a pointer it shows only when its row is
  hovered.
- A hint is one line and explains a situation ("No font loaded yet"). Anything
  longer is a detail or a tooltip.

## Wording

- One weight: emphasis is colour (ink against grey), never bold. `b` and `strong`
  are set to the surrounding weight.
- Plain and short, UK English, en dashes with spaces.
- Name things by what people see, not how they're built.
- A button says what it does ("Download for Mac"). Status says what happened
  ("Saved tempo.html").
- Labels and accessible names are the contract with the tests (`tests/`): rename
  one only with its test and the app's chat in step.

## Adding an app

1. Use `shared/page.html` and an `app.html` with the frame: stage, panel, top bar,
   island, Presets. Copy Tempo's.
2. Build cards with `card()`, and sheets with `cardToSheet()`. Put the view's own
   controls in the island with `toIsland()`.
3. Choose which cards start shut. Write a `SUMMARY` line wherever the automatic
   one isn't clear.
4. Check it in both themes at 1440 × 900, 1280 × 800 and phone width.

## The round 4 kit – on Segue first (5 November 2026)

Steve's review of round 4: A's look, our frame. `shared/kit.css` sits on top of
`tokens.css` and `components.css` and changes how things look and behave, not
where they are – the panel stays left, the island bottom centre, Presets bottom
right, chips top right. It's in Segue 0.5 only (`build_segue()` in `build.py`);
Tempo, Rubato and Tutti move onto it once Steve signs it off. Where this section
and the ones above disagree, this one is where the system is going.

- **One corner logic.** A corner is the corner around it, less the space between.
  - 12 px – surfaces: panel, island, Presets, sheets, tooltips.
  - 8 px – controls: buttons, sliders, menus, fields, segmented tracks, list rows.
  - 6 px – anything set 2 px inside a control (the chosen option, a value being
    typed) and keyline chips.
  - 4–6 px – thumbnails and swatches.
  - Round – only true dots: the tick, the change dot, the scrubber, the place pad.
  No lozenges.
- **Two weights.** Aktiv Medium for section titles, the chosen option and button
  words; Regular for everything else. 20 px name, 14 px section titles, 13 px
  what you read and set, 12 px summaries, hints and chips. Section numbers in
  light grey before each title.
- **Sections are hairlines, not boxes.** Open and shut on the Smooth curve. Shut,
  a section shows a red dot if anything in it is changed; open, a **Reset** chip
  by its chevron puts the whole section back.
- **Black is for the main action** (Export, Download). Everything else is a grey
  fill; a choice is shown **white on grey**, and the white slides to the option
  you pick. When the options won't fit one row at the panel's width – the
  longest word, in Medium, with 8 px either side – the same control becomes a
  menu (`fitSeg`), and goes back when there's room.
- **Keyline chips** – 24 px, a hairline, 6 px corners, an icon – for quiet actions:
  Shuffle, Clear all, Reset, Replace, + Add. Icon-only chips (remove) have no
  keyline until hovered.
- **The slider** is a grey 30 px bar with 8 px corners: label inside on the left,
  value inside on the right, a darker fill for the value and a 3 px handle that
  splits into two short ticks where it would cross the words. A notch marks the
  start value (the preset's, or the default). A range that runs through zero
  fills from zero.
  - **Drag** moves by distance from where you press, not to where you press;
    **Shift** makes it ten times finer. It catches lightly at the start value.
    A drag can start anywhere on the bar, the ? included.
  - **Click** without moving jumps to that point. **Double-click** puts it back.
  - **Click the value** to type it (units optional, kept to the range).
  - **Arrow keys** step; **Shift + arrow** ten steps.
- **Steppers** (− 3 +) for small whole counts – columns, across, down.
- **The change column.** A narrow column on the right of every row: a red dot when
  the row differs from where it started (the preset in use, or the default).
  Click the dot to put that row back. Changed values are in ink and Medium.
- **Undo.** ⌘Z / Ctrl+Z undoes, ⇧⌘Z (or Ctrl+Y) redoes – every setting, a preset
  applied, a section Reset, files removed. A drag is one step; quick changes to
  the same control join up. Not while typing in a field (that's the field's own).
  Anything that removes something says so in the island, with **Undo**.
- **Motion:** Snap 140 ms for presses, Smooth 360 ms for opening and shutting,
  Morph 420 ms with a touch of overshoot for the white choice and the dots, Roll
  260 ms for numbers that change. Nothing moves with reduced motion.
- **Tests:** `tests/segue_ui_check.py` goes through every control in every set-up,
  the undo, presets, media, the island and the Export sheet.

### The ladder of levels and the row grammar (Segue 0.5.2)

Steve, 5 Nov: "a clear defined logic of category, sub parameter, sub sub… so it's not a constant scramble to understand where I am." Every part of the panel is one of four levels, and each level looks one way only.

1. **Section** – a white card on the panel's 4% grey (the cards are back). Number and title the same size (14), the title Bold, the number Regular grey; a chevron; Reset when anything inside has moved. No summary line.
2. **Group** – inside a card, under a hairline: title 13 Bold, a chevron. 16 px before it.
3. **Setting** – one row, 30 px high: the label (13 Medium) in a fixed column on the left (`--lc`, 104 px), the control in the column to its right. Sliders, menus, fields, colours, steppers and switches all start at the same left edge. A slider's label sits in that column too, and a press on it drags the slider (a click there does nothing; double-click resets).
   - When the control needs the full width, the label goes above it and the control takes the width: a row of choices that won't fit beside the label, tiles (Kind), lists (media, fonts, presets), a text box of more than one line.
   - Choices: beside the label if each option fits its share with 8 px either side, else full width under it, else a menu beside it.
4. **Detail** – belongs to one row: a slide's own settings open inside its row; a note sits under what it explains.

- **Space:** an 8 px step – 8 between settings, 6 from a label to a control under it, 16 before a group, 8 between cards.
- **Corners step down with the levels:** panel 12, card 10, control 8, inside a control 6 (and chips), swatch 4.
- **Greys** are neutral (no warmth) and quiet: panel #F4F4F4, controls #F2F2F2, hover #ECECEC, a slider's value #E2E2E2.
- **Weights:** Bold for section and group titles; Medium for labels, buttons and the chosen option; Regular for values, options and notes.
- **Panel:** 360 px by default, dragged 280–480.
- **Focus rings** show only when working from the keyboard (a press on a slider used to leave a blue ring in Safari).

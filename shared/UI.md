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

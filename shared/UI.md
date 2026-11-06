# The Ensemble tools interface – house rules

One system for every browser tool Ensemble makes: Tutti, Rubato, Tempo, Segue and
whatever comes next. Decentish and Patch are websites, not tools, and keep their own
look. These rules are the brief for every future build; when a tool and this file
disagree, the tool is wrong.

Settled with Steve over rounds 1–4 (October–November 2026). The kit lives in
`shared/kit.css`; the mock-ups and reasoning are at `ui/review/` (round 4 at
`ui/review/round4/`). Last revised 6 November 2026 (Segue 0.5.3, Tempo 0.12,
Rubato 1.2, Tutti 6.2).

## Principles

1. **The work is the only colour on screen.** The interface is neutral greys, black
   and white, and one blue for "changed".
2. **Clean, then usable, then clever.** Every element earns its place; if a label,
   rule or note doesn't help someone find or set something, it goes.
3. **One logic everywhere.** Where you are, what level you're on and what a control
   does should be readable at a glance, the same in every tool.
4. **Give it room.** Space is the main tool for grouping – more of it, not more lines.
5. **Details are moments.** Small facts (sizes, durations, states) are designed as
   chips and tags, not left as sentences.
6. **Nothing is lost.** Changes show, and can be put back or undone.
7. **Behaviour holds.** A UI change never changes what a tool makes – exports are
   checked byte for byte where they can be.

## The frame

- **Panel** on the left: making. A 4% grey surface (`--k-panel`), 360 px by default,
  dragged 280–480 px by its right edge (remembered per tool).
- **Top bar**, top right: chips (facts about the work), then Preview and light/dark.
- **Island**, bottom centre: what changes the view (Play, Show, scrub) and **Export**,
  which opens its sheet upward. Status and Undo show here.
- **Presets**, bottom right, the island's height – where a tool has presets.
- **The work** fits the clear space; **Preview** (F) fills the window and slides the
  panel away; Esc leaves.
- **Sheets** (Export, Presets) grow out of what opened them; one at a time; Esc or a
  click on the work closes them, and that click never reaches the work.
- **No drop shadows anywhere.** Surfaces are told apart by fills and hairlines.
- **Light by default**; dark only once chosen with the button, then remembered.
- **Phones** (≤ 860 px): the work on top, the panel below; the island along the
  bottom with Export pinned at its end; Presets as an icon.
- **Embedded** (weareensemble.co.uk): framed on the page's colour, unless `?app`
  asks for edge to edge. Embed code: `tutti/EMBED.md`.

## The ladder of levels

Every part of the panel is one of four levels. Each level looks one way only.

1. **Section** – a white card (`--k-card`) on the panel's grey, 10 px apart.
   Title 14 px **Bold**, lined up with everything under it (no numbers, no summary
   line beside it), a chevron on the right. Opens and shuts on the Smooth curve.
   Shut, a blue dot says something inside has changed; open, a **Reset** chip
   puts the whole section back.
2. **Group** – inside a card: one hairline, then a title 13 px **Bold** and a
   chevron. 20 px of space before it. One rule per edge – never a rule on the group
   and on its head.
3. **Setting** – one row, 30 px high (see the row grammar).
4. **Detail** – belongs to one row: a slide's own settings open inside its row; a
   note sits under what it explains.

Sheets speak the same language: the sheet's title is set as a section title
(14 Bold), its groups as labels (13 Medium) with one rule between groups.

## The row grammar

- **A setting sits on one line:** its label (13 px **Medium**, ink) in a fixed
  left column (`--lc`, 104 px), its control in the column to the right. Sliders,
  menus, fields, colours, steppers and switches all start at the same left edge.
- **When the control needs the width** – a row of choices that won't fit beside
  its label, tiles (Kind), lists (media, fonts, presets, bands), a text box of more
  than one line – the label goes above and the control takes the full width.
- **Choices:** beside the label when each option fits its share with 8 px either
  side; otherwise full width under it; otherwise (Segue) a menu beside the label, or
  (Tempo, Rubato) an even grid. The island's choices keep their own widths.
- **Long labels wrap** onto two lines in the label column rather than squeeze the
  control.
- **Hints** are 12 px grey, one or two short lines, with room after them and a
  right margin that keeps lines short. If it needs more, it's a tooltip.

## Controls

- **Slider:** a grey bar (8 px corners) with its value inside on the right, its
  label in the label column. A darker fill shows the value (from zero when the
  range runs through zero); a 3 px handle that splits into two short ticks where it
  would cross the value; a notch where it started.
  - Drag moves it by how far you go, not to where you press; **Shift** is ten times
    finer; it catches lightly at the start value.
  - A press that doesn't move jumps there. A press on the label drags it too.
  - Click the value to type one (units optional, kept to the range, Escape cancels).
  - Double-click resets. Arrow keys step; Shift + arrow steps ten.
- **Choice (segmented):** a grey track; the chosen option white, raised by a
  hairline, Medium; the white slides to what you pick (Morph).
- **Stepper** (− 3 +) for small whole counts.
- **Menu, field, colour:** grey fills, 8 px corners. A colour is its hex field
  across the control column and a swatch at its end.
- **Switch:** the round tick, in the control column; what depends on it appears
  only while it's on.
- **Buttons:** grey fill, 8 px, Medium. **Black only for the main action** in a
  place (Export, Download, Save PNG). A pressed toggle button is white on grey.
- **Keyline chips** (24 px, a hairline, 6 px corners, an icon) for quiet actions:
  Shuffle, Clear all, Reset, Replace, + Add, Randomise.
- **List rows:** soft grey fills, 8 px; a grip where they reorder; the open or
  chosen one white with its keyline **inside** (so a scrolling sheet never clips it).
- **Presets:** a list of names (13 Medium) under their kind; a small picture of the
  kind only where the list mixes kinds (yours); what a preset does goes in its
  tooltip; "In use" as a tag.

## What's changed, and undo

- **The change column:** a narrow column at the right of every row. A **blue** dot
  (`--k-dot`) when the row differs from where it started (the preset in use, or the
  default); click it to put the row back. Changed values read in ink, Medium.
- **Undo:** ⌘Z / Ctrl+Z, ⇧⌘Z / Ctrl+Y – settings, presets, section resets, removed
  files. A drag is one step. Removing something says so in the island, with Undo.
- In Segue now; Tempo, Rubato and Tutti take it next (their state needs a "where it
  started" first).

## Details as moments

Facts are chips, not sentences: Export's "what you'll get" (`540 × 675` · `18.6 s` ·
`20 fps` · `Loops`), the top bar's size and loop length, "In use", "Yours". The
first chip (the size) is white; the rest grey. A chip's sentence goes in its tooltip.

## Steadiness

- A sheet keeps its height while you work in it: Export is measured at its tallest
  format on opening, so the choice you pressed stays under the pointer and Download
  stays put.
- Nothing jumps: new rows fade in; choices re-fit only when their width changes.
- Focus rings show only when working from the keyboard (Tab or arrows).

## Type

Aktiv Grotesk (Adobe Fonts kit `rhx3hsl`), three weights with three jobs:

| | Size | Weight |
|---|---|---|
| Tool name and version, "By ENSEMBLE" | 20 | Medium / Regular grey |
| Section and group titles | 14 / 13 | **Bold** |
| Labels, buttons, the chosen option, chips | 13 / 12 | Medium |
| Values, options, notes | 13 / 12 | Regular |

UK English, en dashes with spaces, plain words. Name things by what people see.
A button says what it does ("Download GIF"); status says what happened ("Saved …").

## Colour

Neutral greys only (no warmth): panel `#F4F4F4`, card `#FFFFFF`, controls `#F2F2F2`,
hover `#ECECEC`, a slider's value `#E2E2E2`, grey text ≥ 4.5:1. Black for the main
action. Blue `#2F6BFF` (dark `#6B95FF`) for "changed". Dark mode mirrors these
(`body[data-theme=dark]` in `kit.css`).

## Corners, space, motion

- **Corners step down with the levels:** panel and surfaces 12, cards 10, controls
  8, anything 2 px inside a control 6 (and chips), swatches and thumbnails 4.
  Only true dots are round. No lozenges.
- **Space** on a 4/8 px step: 10 between settings, 6 from a label to a control
  under it, 20 before a group, 10 between cards, 16 inside a card (plus the change
  column on the right), 18 inside a sheet.
- **Motion:** Snap 140 ms for presses, Smooth 360 ms for opening and shutting,
  Morph 420 ms with a touch of overshoot for the white choice and dots, Roll 260 ms
  for numbers. None with reduced motion.

## Building a tool

1. Start from Segue (the most complete): `shared/page.html`, the frame markup, a
   frame script with `card()`, `fold()`, `addRange/Seg/Toggle/Colour/Select/Text`,
   `cardToSheet()`. Build CSS: `tokens.css` + `components.css` + `kit.css` + the
   tool's own, written in kit terms (`--k-*` tokens, the ladder, the row grammar).
2. Use the ladder: sections for chapters, groups for what you don't always need,
   rows for settings, details inside rows. Don't invent a fifth level.
3. Write labels short enough for the label column; put explanations in tooltips.
4. Give every setting a default (for the change dot and Reset).
5. Check it at 1440 × 900, 1280 × 800 and 390 px, light and dark, and in Safari.
6. **Test it the way a person works it** (`tests/segue_ui_check.py` is the model:
   every control typed, clicked, dragged, reset and undone; the Export bar in every
   format; a phone), plus a check that exports are unchanged. Labels and accessible
   names are the contract with the tests – rename one only with its test.
7. Tutti is live on weareensemble.co.uk – check `/tutti` and `/tutti/app` after any
   change to it or to the shared files it takes.

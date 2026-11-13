# The Ensemble tools interface – house rules

One system for every browser tool Ensemble makes: Tutti, Rubato, Tempo, Segue and
whatever comes next. Decentish and Patch are websites, not tools, and keep their own
look. These rules are the brief for every future build; when a tool and this file
disagree, the tool is wrong.

Settled with Steve over rounds 1–4 (October–November 2026) and then worked hard in
Segue (0.5 to 1.1, 5–13 November), which is the reference build: where a rule here
needs an example, look at Segue. The kit lives in `shared/kit.css`; the mock-ups and
reasoning are at `ui/review/` (round 4 at `ui/review/round4/`). The history of each
rule is in `CHANGELOG.md`; this file says only what holds now.

Last revised 13 November 2026 (Segue 1.1, Tempo 0.18.1, Rubato 1.3, Tutti 6.3) – Segue 1.1:
drawings that don't move, in two colours; calm presets; a stand-in for big pictures. Before
that, the 1.0 round: the bottom line that stays put, the house colour picker, one "More" per
section, turning on the canvas, a short list of presets, 15 px section titles. And on the 13th,
one corner logic across all four, with zoom and guides shared by every tool.
What each tool still has to take up is in `shared/UI-TODO.md` (the Project's `claude/ui-todo.md`).

## Principles

1. **The work is the only colour on screen.** The interface is neutral greys, black
   and white, and one blue for "changed".
2. **Clean, then usable, then clever.** Every element earns its place; if a label,
   rule or note doesn't help someone find or set something, it goes.
3. **One logic everywhere.** Where you are, what level you're on and what a control
   does should be readable at a glance, the same in every tool. **The same thing is
   done the same way** – if two settings are the same kind of thing (two things you
   switch on, two amounts, two choices), they are the same component.
4. **Give it room.** Space is the main tool for grouping – more of it, not more lines.
5. **Details are moments.** Small facts (sizes, durations, states) are designed as
   chips and tags, not left as sentences.
6. **Nothing is lost.** Changes show, and can be put back or undone.
7. **Behaviour holds.** A UI change never changes what a tool makes – exports are
   checked byte for byte where they can be.
8. **Nothing is bolted on.** A new setting goes with what it is a setting *of*. If
   the *panel* needs a heading like "Advanced" or "Additionals" to hold it, the
   panel's structure is wrong – fix the structure. (Inside a section, the settings
   reached for least may sit in one shut group called **More** – see The panel.)
9. **Direct, and no secret handshakes.** What you can see, you can drag. The main
   things never need a modifier key or a manual; the interface says, quietly and in
   the moment, what a drag will do.
10. **Every setting earns its place by doing something.** A setting that can't
    change the picture in the state it's shown in isn't shown. This is checked by
    machine (see Checking a tool), not by eye.

## The frame

- **Panel** on the left: making. A 4% grey surface (`--k-panel`), 360 px by default,
  dragged 280–480 px by its right edge (remembered per tool). The edge has no mark –
  the resize pointer is the sign – and its strip is thin enough (4 px) to stay clear
  of the scrollbar.
- **The project**, bottom left, on the line with the play bar and the presets and the
  same height and shape as both – its name, how it's saved, and a list of every
  project with a picture. The work belongs with the work, not among the view's
  settings, and the top left is left for the guide. (Tools that keep projects.)
- **The guide**, top left: one quiet line saying what the thing you've selected does
  under the pointer, and nothing when there's nothing to say. It is said there, once:
  the panel's own rows say what the keyboard does instead.
- **Top bar**, top right, in keyline groups: the info chips (facts about the work),
  then Undo and Redo, zoom (−, the value, +), Guides (on and off, an arrow to its
  settings), Preview and light or dark. A setting that belongs to the *view*, not the
  work, lives here and never reaches an export. Its settings open in a small panel
  under the button – the panel's own surface and rows, shut by a click outside or
  Esc. Anything up there you can act on says so when you point at it, and everything
  up there can be acted on: the value types, the facts take you to the section that
  sets them.
- **Zoom is the same part in every tool** – `shared/view.js` (`mountZoom`): Fit, or a
  set size, a screen pixel for each canvas pixel so 100% is actual size. ⌘ and a
  scroll zooms where the pointer is, ⌘+ and ⌘− step, ⌘0 fits; past the view's edge
  the view scrolls. It sizes the canvas on screen and nothing else – the canvas keeps
  its own pixels, so no render and no export can tell. A tool passes its view, its
  canvas and its size, and calls `fit()` wherever it used to size the canvas itself.
  (Rubato 1.3 and Tutti 6.3 took it on 11 November; Segue has its own, from which it
  came.)
- **Island**, bottom left, beside the panel: what changes the view (Play, Show, scrub)
  and **Export**, which opens its sheet upward. Status and Undo show here. A play bar
  is long enough to aim at (300 px, less on a narrow window), with a fine tick where
  each step starts.
- **The project, then Presets**, bottom right, the island's height – where a tool has
  them. Each opens upward from where it is.
- **The bottom line stays put** (Segue 1.0). Nothing on it moves because something
  else opened, a preset was chosen or a save began: the island is anchored left, the
  project and Presets right, and only the scrub gives way – to the width of the
  window, never to its neighbours. (It used to sit centred between them and slid
  sideways. Tutti's export bar, alone on its line, stays centred.)
- **The page never scrolls on a desktop** – the window is the workspace; only the
  panel and an open sheet scroll.
- **Back and forward sit either side of Play** where the work has steps of its own, and
  go where it hasn't. (Segue 0.18.)
- **The bottom line gives way in order** when the window is narrow: the project keeps
  its mark and loses its name, then the play bar shortens, then a note in the bar –
  and never a note carrying an Undo, because that is the only way back.
- **The work** fits the clear space, on a **pasteboard** of sparse, faint dots (24 px
  apart) so the canvas reads as the canvas. **Preview** (F) fills the window, slides
  the panel away and drops the dots; Esc leaves.
- **Sheets** (Export, Presets) grow out of what opened them; one at a time; Esc or a
  click on the work closes them, and that click never reaches the work. Where a
  browser can't run the slide (Safari 17), they open flat – `shared/core.js` sees to it.
- **No drop shadows anywhere.** Surfaces are told apart by fills and hairlines.
- **Light by default**; dark only once chosen with the button, then remembered.
- **Scrollbars:** a 6 px soft grey thumb that darkens under the pointer, no track, in
  a 16 px lane that's always kept (`overflow-y:scroll`, `scrollbar-gutter:stable`),
  so nothing shifts when a section opens and every section ends at the same right
  edge. (Chrome ignores `::-webkit-scrollbar` wherever `scrollbar-width` is set, so
  the kit sets it back to `auto` there; Firefox keeps thin.)
- **Phones** (≤ 860 px): the work on top, the panel below; the island along the
  bottom with Export pinned at its end; Presets as an icon.
- **Embedded** (weareensemble.co.uk): framed on the page's colour, unless `?app`
  asks for edge to edge. Embed code: `tutti/EMBED.md`.

## The panel, as a whole

- **Sections follow the order of work.** In Segue: Canvas (the page: its format and
  what's behind it), Media (what goes on it), Layout (how it's arranged), Motion (how
  it moves), then Captions and Overlay (type over it). Each tool has its own chapters,
  but the test is the same: someone starting cold should be able to work down the
  panel once and have made something.
- **No tier of leftovers.** Sections used now and then are sections like the rest,
  shut while they're off (see Switches) – not gathered under "Additionals" or
  "Advanced".
- **One "More" inside a section, at its foot** (Segue 1.0, Steve: "potentially just
  'more'"). The settings of that section that most work never touches – Layout's
  Border, Edge and Placement – sit in one shut group called More, which says what's
  on in it when something is ("Border · Moved 0, 40 px") and what it holds when
  nothing is. Never two in a section, never a section of its own, and never a home
  for something new that has a better one.
- **One word for one idea, and one idea per word** – across the panel, a row's own
  detail, the tooltips and the other tools. Transition is getting from one thing to
  the next; Movement is what happens within one; Format is the canvas's size and
  shape; Placement moves a whole layout; Position is one piece's own. No two controls
  share a label unless they sit in different, named groups (Border › Width, Edge ›
  Width).
- **A setting sits with what it's a setting of.** The shape of things is with the
  layout that arranges them, not in a section further down; how a pile ends is with
  the switch that makes the pile.
- **Settings that would do nothing aren't shown** – and nor are handles on the canvas.
  An empty group hides its heading.
- **Where a choice has a shape, draw it** (an easing curve, a route, a transition, a
  preset) – from the same settings the tool uses, as a picture that isn't itself a
  control. A number already says what a slider does.

## The ladder of levels

Every part of the panel is one of four levels. Each level looks one way only.

1. **Section** – a white card (`--k-card`) on the panel's grey, 10 px apart.
   Title 15 px **Bold** (1.0 – a point up, so the section reads at a glance), lined up with everything under it (no numbers, no summary
   line beside it), a chevron on the right. Opens and shuts on the Smooth curve.
   Shut, a blue dot says something inside has changed; open, a **Reset** chip
   puts the whole section back.
2. **Group** – inside a card: one hairline, then a title 13 px **Bold** and a
   chevron. 20 px of space before it. One rule per edge – never a rule on the group
   and on its head. **A shut group says what it holds** – its value, quietly, beside
   the chevron – so a panel can open on the few groups that matter.
3. **Setting** – one row, 30 px high (see the row grammar).
4. **Detail** – belongs to one row: a piece's own settings open inside its row; a
   note sits under what it explains. When a detail has groups of its own (a piece's
   Timing, Look, Caption…), they are groups in the level-2 style, each saying what it
   holds when shut; the row opens on the groups tied to what you drag on the canvas
   (Position, Crop) and keeps the rest shut. An open row keeps the soft grey of a
   closed one, with no keyline: inside it, fills go white (a lighter grey in dark)
   and segment tracks a shade darker than the row, the chosen part white. Its foot: a
   keyline chip on the left (Duplicate), small arrow buttons bottom right.

Don't invent a fifth level. A plain label acting as a mini-heading ("Spacing",
"Kerning") is a fifth level – make it a group, or let the rows speak for themselves.

Sheets speak the same language: the sheet's title is set as a section title
(15 Bold), its groups as labels (13 Medium) with one rule between groups.

### Where a new thing goes

Work down these questions; the first yes decides it. This is the whole of the
hierarchy logic – there is no judgement call left over, and no new shape to invent.

1. **Is it a setting of something already in the panel?** Then it goes with that
   thing – in its section, its group, or inside its row – however far down the panel
   that is. Never at the end because the end had room.
2. **Is it optional, with settings of its own?** Then it is a **switch** that heads
   those settings (below), at whichever level they sit: a switch section, a switch
   group or a switch row. Never a tick beside a slider that does the same job.
3. **Does it belong to the view rather than the work?** (zoom, guides, Preview,
   light or dark, what the canvas shows while you work.) Then it is in the **top
   bar**, and it never reaches an export.
4. **Is it a new chapter of the work?** Then it is a **section**, placed in the
   order of work – not appended. Adding a section means reading the whole panel
   again (see The panel, as a whole).
5. **Is it one of several things of the same kind?** Then it is a **row in a list**,
   and its own settings open inside that row as a detail.
6. **Otherwise it is a setting** – one row, in the group it belongs to.

And two that decide the component, not the place:

- **Same kind, same control.** Two things you switch on are both switches; two
  amounts are both sliders; two choices are both segmented (or both menus, if they
  don't fit). The shape is set by what a thing *is*, never by how much room is left.
- **If it needs a heading to hold it, the structure is wrong.** "More", "Advanced",
  "Additionals", "Other", "Options" – each of these is the panel telling you a
  setting has no home. Find its home; the heading goes.

### Naming, before building

A name is part of the hierarchy: two levels that share a word read as one. Before
anything is built, write the section and group names out and check:

- **One word, one idea, across all four tools.** Format is the canvas's size and
  shape; Shape is a thing on it. Transition is getting from one to the next;
  Movement is what happens within one. Placement moves a whole layout; Position is
  one piece's own. Colour is a colour; Look is a set of them.
- **No word twice in one panel** unless the two sit in different, named groups
  (Border › Width, Edge › Width), and never a section repeating a word of another
  section's group.
- **A label is one or two words that fit the label column.** If it wraps, rewrite
  it; the sentence goes in its tooltip. "Sequence of texts" is a wrapped label;
  "Sequence" with a tooltip is a label.
- **A group says what it holds**, not what sort of thing it is: "Kerning", not
  "Spacing"; "Repeat rows", not "More".

## Switches – one way to turn a thing on

Anything optional that has settings of its own is **a switch that heads those
settings**: the round box, then its name in the weight of its level; its settings
appear beneath while it's on, and it's shut while it's off. No arrow, no line of
text explaining how to turn it on, no first row repeating its name – and the name
does what the box does.

- **A switch section** (level 1): Captions, Overlay.
- **A switch group** (level 2): Border, Edge, Pile up.
- **A switch row** (level 3) for something with no settings of its own, in the
  control column.

Never turn a feature on by raising a slider from 0 while its neighbour has a tick. A
switch remembers what it was set to (Border's width comes back as you left it). A
plain amount whose zero is naturally "none" (Lag, Scatter) stays a slider.

A switch says what it does in words ("Layer on above"), never a menu of states that
need explaining. Where a choice only works with another, it brings that one with it
and says so (a blend makes its slide a layer, with a note, and one Undo takes back
both).

## The row grammar

- **A setting sits on one line:** its label (13 px **Medium**, ink) in a fixed
  left column (`--lc`, 104 px), its control in the column to the right. Sliders,
  menus, fields, colours, steppers and switches all start at the same left edge.
- **When the control needs the width** – a row of choices that won't fit beside
  its label, tiles (Kind), lists (media, fonts, presets, bands), a text box of more
  than one line – the label goes above and the control takes the full width.
- **Choices:** beside the label when each option fits its share with 8 px either
  side; otherwise full width under it; otherwise a menu beside the label. (Tempo and
  Rubato still use an even grid for long sets – to move to menus.)
- **Labels are short** – one or two words that fit the label column. A label that
  wraps is a label to rewrite; the explanation goes in its tooltip.
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
- **Buttons:** grey fill, 8 px, Medium. **Black only for the main action** in a
  place (Export, Download, Save PNG). A pressed toggle button is white on grey.
- **Keyline chips** (24 px, a hairline, 6 px corners, an icon) for quiet actions:
  Shuffle, Clear all, Reset, Replace, + Add, Randomise, Duplicate.
- **List rows:** soft grey fills, 8 px; a grip where they reorder; the open or
  chosen one keeps its fill with its settings inside. A row picks up only from its
  top line, never from a control inside it.
- **Presets:** a list of names (13 Medium) under their kind, each with a small
  drawing of itself – all on one white ground in the interface's greys, the piece in
  focus dark, each kind drawn one way, no arrows or colour; what a preset does goes
  in its tooltip; "In use" as a tag. A preset shows what its name promises (one
  called "with title" turns a title on).
- **Nothing drags or selects by accident:** panel labels and pictures don't select
  or drag out of the browser (inputs do).

## On the canvas

- **One outline, never two** – a single line that shows on anything (white through
  "difference"); thinner and fainter for what's under the pointer.
- **A drag moves; corners size; a double-click goes inside.** A piece that shows
  whole (or sits in a shape of its own) moves and sizes directly. A picture cropped
  by its frame: double-click and you're working on the picture – all of it shows
  faintly, a drag moves it, its corners zoom it; click away, Esc or Enter to finish.
  Where a shape can also be moved, a ring at its centre moves the picture inside
  without going in.
- **No modifier keys for the main things.** Shift for finer, arrows to nudge and
  ⌘Z are extras, never the only way.
- **Handles only where they work.** A piece that fills its frame has no corners.
- **A corner holds the corner opposite still** while it sizes something; the middle of
  a side grows it about the centre. Both keep the shape. (Segue 0.18.)
- **Just outside a corner turns it** (Segue 1.0), as in Figma: the pointer becomes a
  curved arrow, the angle shows beside it as you go, it catches on every 45° and
  Shift goes in 15s. A turned piece keeps all of this in its own turned space – its
  corners still hold the opposite corner, the cursors point the way the corner does.
  Inside a frame (after the double-click) the same gesture turns the picture, which
  grows just enough to keep the frame covered. Every one of these also has a row in
  the panel (Turn, Size, Position) for typing.
- **An empty slot is designed too**: its number sits top left in Aktiv Bold, the
  same tight margin across as down.
- **Moving a row in a list**: the row in hand fades; where it will land is a slim
  line in the gap, the full width, in the focus colour. The grip has room either side.
- **A list where one row opens at a time** – opening one shuts the last.
- **It says what a drag will do** – the guide, top left, for the selected piece,
  where there's room.
- **Clicking a piece's row takes the work to that piece**, and the other way round.
- **Guides** are a margin and a grid (cells across, rows dividing evenly), with snap;
  they belong to the view.

## Long jobs

- **The button that starts it is the one that reports it.** A button that opens a
  choice says so with a chevron; the one that does the thing does only that. While it
  works, that button *is* the progress – it fills from the left and reads what it's
  making, how far it's got and roughly how long is left ("Making the GIF · 23% ·
  about 40 s left"), with a thin line marking the exact point. Where the same job can
  be started from the bar, the bar shows it too, shorter.
- **Stop sits beside it**, the same height, and appears only while there's something
  to stop.
- **Nothing is frozen.** A long job works from a copy of the state taken when it
  started, so the person can carry on – play, drag, change settings, shut the sheet –
  and what comes out is what they asked for.
- **A note when it lands.** If the sheet that started it is shut when it finishes, a
  small note appears top right – what happened, and the detail under it – and goes by
  itself after a few seconds; a click sends it sooner. A tick when it worked, a dash
  and grey when it was stopped or failed. With the sheet open, the bar says it.

## What's changed, and undo

- **The change column:** a narrow column at the right of every row. A **blue** dot
  (`--k-dot`) when the row differs from where it started (the preset in use, or the
  default); click it to put the row back. Changed values read in ink, Medium.
- **Undo:** ⌘Z / Ctrl+Z, ⇧⌘Z / Ctrl+Y, and the buttons in the top bar – settings,
  presets, section resets, removed files, a piece's own settings. A drag is one
  step; a change that brings another with it is one step. Removing something says so
  in the island, with Undo.
- In Segue now; Tempo, Rubato and Tutti take it next (their state needs a "where it
  started" first).

## Details as moments

Facts are chips, not sentences: Export's "what you'll get" (`540 × 675` · `18.6 s` ·
`20 fps` · `Loops`), the top bar's size and loop length, "In use", "Yours". One
family wherever they appear – same height, shape, type and numerals – with the ones
over the work keeping a keyline, since they sit on the picture. The first chip (the
size) is white; the rest grey. A chip's sentence goes in its tooltip.

## Drawings that move

A drawing that stands for a choice – a preset's picture, a Kind's tile, a transition's
or a curve's sketch – **doesn't move** (Segue 1.1; Steve, 12 Nov: "remove animations to
the little illustrations"). They tried moving on hover from 0.17 to 1.0 and read as
motion for its own sake. And they are drawn in **two colours and no black**, the same
two everywhere (`--ill-1` for the piece in question, `--ill-2` for the rest; flat
fills, nothing part-see-through in between).

## Presets

A short list: about three to a group, each one a thing someone would actually pick –
calm by default (long rests, unhurried moves – it's easier to speed one up than to see
past one that's frantic) –
a reference, a request, or the plainest good version of that kind. Named for what
they do. A preset retired from the list still resolves by name, so older work knows
where its settings started.

## Steadiness

- A sheet keeps its height while you work in it: Export is measured at its tallest
  format on opening, so the choice you pressed stays under the pointer and Download
  stays put.
- Nothing jumps: new rows fade in; choices re-fit only when their width changes; the
  panel's scrollbar lane is always there.
- Focus rings show only when working from the keyboard (Tab or arrows).

## Type

Aktiv Grotesk (Adobe Fonts kit `rhx3hsl`), three weights with three jobs:

| | Size | Weight |
|---|---|---|
| Tool name and version, "By ENSEMBLE" | 20 | Medium / Regular grey |
| Section and group titles | 15 / 13 | **Bold** |
| Labels, buttons, the chosen option, chips | 13 / 12 | Medium |
| Values, options, notes | 13 / 12 | Regular |

UK English, en dashes with spaces, plain words. Name things by what people see.
A button says what it does ("Download GIF"); status says what happened ("Saved …").

## Colour

**One grey, and the tones under it.** The base is Steve's `#F6F5F4` (6 November) – a
touch warm. Every other grey is that same colour darkened, never a neutral grey
mixed in beside it: panel `#F6F5F4`, card `#FFFFFF`, controls `#F4F3F1`, hover
`#EEEDEB`, a slider's value `#E4E3E0`. Grey text ≥ 4.5:1. Black for the main action.
Blue `#2F6BFF` (dark `#6B95FF`) for "changed", and nothing else is blue. Dark mode
mirrors the set (`body[data-theme=dark]` in `kit.css`).

Where a tone is missing, derive it from the base rather than picking a new one: the
warmth has to run all the way through, or the hovers read pink against the panel.

**The colour picker is the house's own** (`shared/colour.js`, Segue 1.0) – never the
browser's. A swatch opens it beside itself: a field of shade and strength, a hue
bar, a pipette (the browser's where it has one, otherwise from the canvas – which is
what works in Safari), **Hex and R, G, B to type into**, and the colours already in
use in the piece, so colours can be matched rather than guessed. Its surface,
corners and fields are the kit's. It takes the place of the native picker on every
`<input type="color">` just by being included: the input stays what the tool reads.
Segue, Rubato and Tutti use it; Tempo has its own (RGB and CMYK sliders, saved
colours) – the two should become one (see `UI-TODO.md`).

Open with Steve: his sampled base grey
`#F6F5F4` (a touch warm) as the reference the other tones derive from – see
`shared/UI-TODO.md`.

## Corners, space, motion

- **Corners step down with the levels:** panel and surfaces 12, cards 10, controls
  8, anything 2 px inside a control 6 (and chips), swatches and thumbnails 4.
  Only true dots are round. No lozenges – a slider is a control, so it takes the
  control's corner.
- **A corner inside a corner follows it:** the inner radius is the outer one less
  the gap between them. A pill 2 px inside an 8 px group is 6. Nothing is exempt
  for being wider or taller than usual: a row of choices that runs on to a second
  row is still a control, not a lozenge. This is worth a machine's eye rather than
  a designer's – read every radius on the page and compare each one with its
  parent's, less the inset, because it was a leftover calc nobody looked at that
  put a 6 px pill inside a 17 px box in two tools (Steve, 12 November).
- **Space** on a 4/8 px step: 10 between settings, 6 from a label to a control
  under it, 20 before a group, 10 between cards, 16 inside a card (plus the change
  column on the right), 18 inside a sheet.
- **Motion:** Snap 140 ms for presses, Smooth 360 ms for opening and shutting,
  Morph 420 ms with a touch of overshoot for the white choice and dots, Roll 260 ms
  for numbers. None with reduced motion.

## Checking a tool

1. **Work it the way a person does** – `tests/segue_ui_check.py` is the model: every
   control typed, clicked, dragged, reset and undone; the Export bar in every format;
   a phone. Labels and accessible names are the contract with the tests – rename one
   only with its test.
2. **Audit the settings by machine** – `tests/audit/` is the model: for every preset
   and every state a setting can show in, change it to its other values and compare
   frames of the output with before. A setting that never changes anything is dead; a
   setting shown where it can't change anything should step aside. Run it after any
   round that adds or moves settings.
3. **Exports unchanged** where the work shouldn't have changed – byte for byte where
   they can be (Tutti's twelve export hashes; Rubato's looks; Tempo's parity).
4. **At 1440 × 900, 1280 × 800 and 390 px, light and dark, and in Safari** (the
   WebKit probe, `tests/webkit_probe.py`; Safari 17 is the one that bites).
5. **Tutti is live on weareensemble.co.uk** – check `/tutti` and `/tutti/app` after
   any change to it or to the shared files it takes (`tokens.css`, `components.css`).

## Taking a tool onto the house style

For a tool that already exists – the order to work in, because each step makes the
next one obvious. Nothing here changes what the tool makes.

1. **Read the panel out loud, top to bottom.** Write down every section, group and
   label in order. Most of what's wrong is visible in that list alone: words doing
   two jobs, a section that's really a group, a group called "More".
2. **Put the sections in the order of work** – someone starting cold works down the
   panel once and has made something. Move whole sections before touching anything
   inside them.
3. **Fix the names** (above), and change each one in its test in the same commit:
   labels and accessible names are the contract with the tests.
4. **Flatten the fifth level** – plain labels used as mini-headings become groups or
   go away.
5. **One way to switch things on** – every optional thing with settings of its own
   becomes a switch that heads them.
6. **Take the house parts** from the reference build rather than writing them again:
   the kit's components, the top bar, the change column and undo, the pasteboard,
   the long-job button. If a part has to be written twice, it belongs in
   `shared/kit.css` or `shared/core.js` first.
7. **Audit the settings by machine**, then check the tool (below). Fix what the
   audit finds before polishing anything.

## Building a tool

1. Start from Segue (the most complete): `shared/page.html`, the frame markup, a
   frame script with `card()`, `fold()`, `addRange/Seg/Toggle/Colour/Select/Text`,
   `cardToSheet()`. Build CSS: `tokens.css` + `components.css` + `kit.css` + the
   tool's own, written in kit terms (`--k-*` tokens, the ladder, the row grammar).
2. Lay the panel out in the order of work before building any of it; name each
   section and group once, and check no word is doing two jobs.
3. Use the ladder and the switches. Write labels short enough for the label column;
   put explanations in tooltips. Settings that take a number in steps start where
   the sliders do, so a column of them lines up.
4. Give every setting a default (for the change dot and Reset), and every preset the
   settings its name promises.
5. **Look at the whole panel whenever you add to it.** The way panels go wrong is one
   reasonable addition at a time.
6. Pin the order and the names in the tool's tests, then check it (above).

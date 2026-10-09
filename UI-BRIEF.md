# UI stream – brief

8 October 2026. For the chat that takes on the interface across Ensemble's tools. Read this first, then `HANDOVER.md`, `README.md`, `tutti/HANDOVER.md`, and `shared/tokens.css` and `shared/components.css`.

## Why
The tools grew one panel at a time. In Tempo, the left-hand panel has become long and cumbersome. Steve wants Export (and possibly the display toggles) moved out to a right-hand panel, with the left kept for tweaking sizes, spacing and animation, and everything a touch smaller. The bigger decision, in his words, is to not redesign Tempo in isolation. Instead, look across Tutti, Tempo, Rubato and the tools still to come and make **one refined, universal UI style** they all share. It gets developed once, then moved onto each web app.

## The job
Design and build one interface system for Ensemble's tools, prove it on a component page, then move each app onto it – **without changing what any app does**.

## Where things stand
- **Tutti 6.0 is where the style comes from.** It uses Ensemble's house style: monochrome (white, paper, grey, black) and Aktiv Grotesk with tight letterspacing in mixed case, via the Adobe Fonts kit `rhx3hsl`. It has pill buttons, round tick toggles, and cards with 18 px titles over hairline rules. There is a black brand module and light and dark modes. The references were Porta Rocha and Apple's own UI.
- **Rubato and Tempo already share it.** `shared/tokens.css` is 20 lines: surfaces, ink, keylines, focus and the typeface. `shared/components.css` is about 16 KB and covers:
  - the app frame and brand header
  - the resizable panel
  - cards
  - sliders, segmented pills, toggles and colour rows
  - hints and `?` tooltips
  - font rows and tiles
  - the floating export capsule

  Rubato adds `rubato/app.css` (steppers, dials, path pads, preset tiles, text blocks, chips). Tempo adds `tempo/app.css`, whose preset tiles are a copy of Rubato's.
- **Tutti has its own copy** of the same styles inside `tutti/index.html`. It isn't on the shared files yet (step 2 in `tutti/HANDOVER.md`).
- **Decentish** is a phone-first website with its own styles and its own look. It is not part of this system (Steve, 9 Oct).
- **Layout today:** an inset, rounded app with a resizable panel on the left holding every card stacked, and the stage on the right. Rubato and Tutti take their exports from a floating capsule on the stage; Tempo has an Export card at the bottom of the panel. All three open in dark mode. The base type size is `html{font-size:16.75px}`.
- **Panel length:**
  - Rubato has 9 cards: Presets, Text, Layout, Motion, Variants, Physics, Colour, Export, Fonts.
  - Tempo shows up to 9 of its 15: Presets, Screensaver, Fonts, the cards for what's showing, Position, Colour, Export.
- **Debt:** around 16 inline styles in Tempo's app code and 18 across Rubato's files bypass the system.

## Principles
1. **Refine Ensemble's house style, don't reinvent it.** Tutti's language is the starting point.
2. **The output is the hero.** The preview gets the space; controls recede.
3. **Left for making, right for showing and taking away.** This is Steve's split.
4. **Shorter panels.** The first screen shows what matters, and depth folds away (cards, folds inside cards, details under a name).
5. **One way to do each thing.** One slider, one toggle, one segmented control, one tile, one fold – the same in every tool.
6. **Wording anyone could read.** Plain and short, UK English, en dashes with spaces, no internal terms.
7. **Accessible.** Keyboard, visible focus, and contrast in both themes. The labels the tests rely on stay.
8. **No behaviour changes.** This stream moves and restyles controls; it never changes what they set.

## Decide with Steve before building
Bring mock-ups (rendered HTML with Tempo's real panel), not descriptions.
1. **The two-panel layout.**
   - (a) A fixed right-hand panel.
   - (b) A right-hand panel that collapses to the export capsule on smaller screens.
   - (c) Keep the capsule and move more into it.

   Suggested: (b). It's Steve's split, and it keeps the capsule that Rubato and Tutti already have.
2. **What goes on the right.** Suggested rule: right is for *choosing and taking away* – presets, what's showing (Tempo's Show), export and files. Left is for *adjusting*. Each app maps its cards to that rule.
3. **Scale.** Try a smaller base (around 15 px) with tighter cards and pill heights. Judge it on a 13-inch laptop as well as a big display.
4. **Panel widths.** Defaults, minimums and maximums, and whether both panels resize.
5. **Theme.** One default for every tool (all open dark today), remembered per tool.
6. **The brand header.** Tempo and Rubato have a wordmark, version and "By ENSEMBLE"; Tutti has a black module with its logo. Settle on one header.
7. **Type.** Aktiv Grotesk through the Adobe kit, with its domain allow-list covering GitHub Pages and the Squarespace embed, plus a fallback that doesn't jump.

## What to make
1. **A component page**, built to `docs/ui/` from `shared/`. It shows every control in every state, in light and dark, plus the two-panel skeleton. It's the reference the apps are checked against, so send Steve screenshots of it for sign-off.
2. **`shared/tokens.css` v2.** Colour, a short type scale, spacing, radii and control sizes, each named, and few of them.
3. **`shared/components.css` v2.** The two-panel frame. Preset tiles move in from the apps. Anything an app builds with inline styles becomes a class.
4. **`shared/UI.md`.** What each component is for, when to use it, and the wording rules.
5. **The apps moved across one at a time:** Tempo first (it has the pain), then Rubato, then Tutti (the biggest move – it follows step 2 in `tutti/HANDOVER.md` and gains the shared files).

## Working alongside the other chats
- **Ownership:**
  - The UI stream owns `shared/tokens.css`, `shared/components.css`, `shared/page.html`, the component page, and the layout parts of `shared/core.js` (`card()`, the panel and the resizer).
  - App chats don't restyle while it runs; they add UI wants to `HANDOVER.md` under **UI requests**.
  - Behaviour stays with the app chats. When the UI chat moves a control (Tempo's Show to the right, say), it changes where the control is built, not what it sets.
- **Timing:** start once Tempo's dial round has landed, since both would edit Tempo's panel.
- **Branching:** work on a `ui` branch and merge one app at a time. Rebase on `main` before pushing, because the other chats push there too.
- **Tutti's embed:** after Tutti moves, check the Squarespace iframe at its real size.

## Done means
- Steve has signed off the component page.
- For each app moved, the same tests pass:
  - `tests/parity.py` (Rubato and Tempo against v0.8.1)
  - `tests/rubato_regress.py` and `tests/rubato_features.py`
  - `tests/tempo_check.py` and `tests/split_check.py`

  The tests find controls by their labels, so labels are the contract. Rename one only with the test and the app chat updated together.
- Before and after screenshots of each app at 1440 × 900 and 1280 × 800, in light and dark.
- No inline styles left in app code for things the system has a class for.
- Tempo's main choices fit on the first screen at 1440 × 900 without scrolling.

## Not in scope
- New features or controls, or changes to behaviour.
- Tempo's dials and presets, Rubato's roadmap and Tutti's roadmap – those stay with their own chats.
- Decentish, entirely – a website with its own look, not a tool (Steve, 9 Oct).

## First steps
1. Clone the repo and read the files listed at the top.
2. Take baseline screenshots of Tutti, Rubato and Tempo in both themes. List every control type in use, by class or inline style, with where it appears.
3. Bring Steve two or three mock-ups of the two-panel layout and scale, using Tempo's real panel, and agree one.
4. Build tokens v2 and the component page, and get sign-off.
5. Move Tempo, then Rubato, then Tutti – testing and showing before-and-after screenshots each time.

# Changelog

## 10 November 2026 – Segue 0.11: a blend that just works, the project chip top left, movement in every kind, a cleaner canvas

Steve, 9 Nov: "The left hand side modules dont align on the right… the bar sometimes moves when a module is expanded. Add more space both sides of the scrollbar. On media, the multiply is not intuitive. an image blend should automatically just interact with the layer below it. No idea what the 'sits on its own slide' etc is. Add subtle / sparse dots around the canvas… Sometimes when dragging a slider it grabs the whole section… when clicking on a media, the main canvas should automatically take me to that section… the 'movement' in slides… implement in other 'kinds'… the play bar… longer with vertical subtle keylines to show the amount of slides… The top module (including saved and export) should probably sit out of this – aligned to the zoom etc, but top left. Grids and columns is good – remove the need for columns though – just grids and margins… remove features that are redundant / do not work when some parameters are set." 10 Nov, his Safari note: "Presets didn't show – … sheets 0px … Version/17.6 Safari".

- **Presets in Safari 17.** His note found it: the sheets' row stayed at 0 (`grid-template-rows` never slid from 0fr to 1fr in Safari 17.6), so the sheet opened below the window. Safari before 18 now opens sheets flat (no slide), and any browser whose row is still shut once the slide should be over switches to flat sheets too. Neither WebKit here (16.4, 26.6) has the fault, so it's tested by forcing the row shut.
- **A blend works on what's beneath it.** In Slides, choosing Multiply (or any blend) on a slide of its own makes it a layer on the piece above, filling it – with a note saying so – so there is something to mix with. One Undo takes back both. The "Sits" menu is gone: a piece from the second on has one switch, **Layer on the piece above** (its tooltip names the piece); its row says "Layer".
- **Clicking a piece's row** (opening or shutting it) or its picture takes the playhead to it.
- **The panel's edges:** the scrollbar has its own lane, always kept (so nothing shifts when a section opens and the panel starts to scroll), with room either side of the bar; every section ends at the same right edge, shut or open. Every tool on the house kit.
- **No stray drags:** a piece's row only picks up from its top line, so dragging a slider in it can't drag the row (or a picture out of the browser); the panel's labels and pictures don't select or drag (inputs still do) – every tool on the house kit.
- **The project chip** (name, Saved, the Projects list) has left the panel for the top left of the canvas, in line with the top bar. Where the window is tight, the size, loop and count chips step aside first, then "Saved" – never the name or the tools.
- **Dots round the canvas** – a sparse 24 px grid of faint dots on the pasteboard, so the canvas reads as the canvas. None in Preview.
- **Movement in the other kinds:** Character › **Movement** – None, Zoom or Drift, with Amount (1–20%) – a gentle zoom or drift inside each picture, each on its own phase, about 8 s a breath, a whole number of them in the loop so it stays loop-exact. Off by default; hidden where it can't work (pictures fitted inside their shapes). Slides keeps its own.
- **The play bar** is longer (300 px, less where the window is narrow), with a fine tick where each slide (or step) starts.
- **Guides are a margin and a grid:** Margin, Grid (cells across; rows divide the space evenly into near-square cells; 0 for none) and Snap. Columns, Rows and Gutter are gone.
- **What does nothing steps aside:** no corner handles on a piece that fills its frame (full bleed, cropped – its crop zoom does that), and no Position section for full bleed; Media fit and Behind the media only when shapes aren't the media's own shape; Fonts only when captions or overlay type are on; the crop hint says what dragging does there.
- Tests: `tests/segue_check.py` – 12 new (blend making a layer and the switch back, ticks, movement, the grid, no handles on a full-bleed slide, the project chip, the drag guard, the panel's lane, the dots, settings stepping aside, flat sheets) and 4 updated (a piece's detail, guides, a piece's undo with the blend, each kind's controls).

## 9 November 2026 – Segue 0.10: projects, the top bar, Additionals, a piece's copy

Steve, 8 Nov: "The ability to save and come back to a project is key. Build in now." 9 Nov: "move guides up to top right, along side the info / dark mode etc. keep the settings but ensure it feels refined. add zoom and undo up here too. Hide Captions, Overlay and Position in 'Additionals' at the bottom. no need for a radio button to repeat 'captions on' and 'overlay' then 'over the top' simplify this … Also add in ability to duplicate a layer in the media section. When you expand a media section, have it sit in a light grey box (not the key line) … the buttons and UI should then adapt to ensure visible – white or a very subtly darker tint. Move up and move down buttons can be smaller (just arrows in little key line boxes (or white boxes bottom right). always align to our set UI principles."

- **Projects.** What's open is always a project, saved in the browser as you work (a moment after each change – "Saving…", then "Saved" beside its name at the top of the panel). The name opens **Projects**: rename it, **New** (an empty one; the last stays in the list), **Duplicate**, **Save as file**, **Open file**, and every project kept in this browser with a small picture of its frame, how many pieces, its length and when it was last changed – click one to open it, × to remove it (Undo puts it back). A project holds the settings, the media in order with every piece's own settings, the background and overlay pictures, and the preset it came from. Opening one starts its own undo history.
- **The project as a file.** Save as file packs a project – its files too – into a `.segue` file (a plain zip: `project.json` and the files, stored as they are), to keep anywhere or open in another browser (Chrome and Safari keep their own storage). Open file, or dropping a `.segue` on the window, adds it as a new project and opens it; files already in the browser aren't stored twice; fonts of your own that it uses come with it.
- **Files are shared, and cleared when nothing uses them.** A copied piece or a copied project points at the same stored file; removing a piece or a project no longer deletes its file straight away (so Undo, and every other project, keep working); at start-up, any stored file that neither the open project nor any saved one uses is cleared.
- **The top bar, top right:** beside the size, the loop and the count – **Undo** and **Redo** (off when there's nothing to undo; the tooltip says what), **zoom** (− and +, and the value: click it for 100% – one canvas pixel a screen pixel – and again to fit; ⌘+, ⌘−, ⌘0; pinch or ⌘-scroll zooms where the pointer is; zoomed in, the stage scrolls), and **Guides** (the button shows and hides them, ⌘; too; its arrow opens their settings – Margin, Columns, Rows, Gutter, Snap to guides – in a small panel; changing one shows them). Guides have left Canvas. Alt-scroll over a piece still zooms the piece.
- **Additionals.** Captions, Overlay and the shapes' **Position** (from Shapes) sit at the foot of the panel under one quiet heading, shut until wanted – its summary says what's on. Captions and Overlay switch on and off by the **box beside their name**, in the section's head: on opens it, off shuts it. The "Captions" and "Over the top" rows are gone.
- **A piece's copy:** **Duplicate** at the foot of an open row (or ⌘D with the piece selected on the canvas) – a copy, settings and all, straight after it (after a slide's layers, so they stay on their slide; a layer's copy is another layer). One Undo takes it away.
- **An open row** stays in the soft grey of a closed one, with no keyline, so it reads as one box; inside it, fills turn white (a lighter grey in dark), segments and the way arrows sit a shade darker with the chosen part white. **Move up and Move down** are two small arrow buttons, bottom right, with Duplicate on the left.
- If Segue is open in another tab while the browser's storage is updated for projects, a note asks to close it.
- Tests: `tests/segue_check.py` – 10 new (a project saved as you work; rename, New and opening again; the file both ways; removing with Undo; clearing unused files; duplicating a piece; the head switches; undo and redo buttons; zoom; guides in the top bar) and 4 updated (the panel with Additionals; Canvas without Guides; Captions and Overlay without their on rows) – 146 of 146. `tests/segue_ui_check.py`: Additionals opened with the rest; the open row's grey and white controls; head switches left out of the generic sweep (they have their own check).

## 7 November 2026 – Segue 0.9: Rows, each column its own, a piece's detail in house order, builds; thin scrollbars on every tool

Steve, on 0.8: "A little more flex on the columns one – so left and right not just up and down. Ensure the examples I shared are achievable (isolation on parameters per row or column may be needed?) When you align with the examples, show me the settings so I can replicate." The blend in a piece's detail "does not seem to interact with the layer below"; hide titles "behind a dropdown or on off button … keep this clean and all about the image / motion in the frame"; "'Look' and 'Timing' should be more prominent than the features"; preset pictures "simplify … by group … the colours can be a little more unified … remove the red arrows"; "make the scroller on the UI thinner – actioned on all tools"; Presets still not appearing in his Safari. Then: "check through the backlog and wrap in anything outstanding … review the UI and functionality. Don't bolt on when it can be integrated intuitively."

- **Rows – an eighth kind,** beside Columns: strips of work running left and right on their own. Same controls as Columns (Rows 1–8, Move, Directions, Speeds, Offset, Lag, Keep drifting); Height (10–160%) instead of Width. The kind tiles are now two even rows of four.
- **Each column (or row) its own way and speed.** Directions: Alternate, All up, All down (All left, All right for Rows) or **Each its own**; Speeds: Same, Varied (drifting) or **Each its own**. Choosing Each its own starts from what the pattern was doing, so nothing jumps, and opens a list – **Each column** / **Each row** – with each one's way (two arrows) and speed (Still, 1× to 8×: times round a loop drifting, shapes a move stepping). Touching a row of the list makes that pattern your own, in one undo step. Drifting, the slowest moving strip sets the pace (Each shape) and the loop is as long as it needs to be to join up. Columns' **Width** and Rows' **Height** go to 160%, so the outer ones run off the edges as Steve's reference does.
- **The references, matched.** Steve's Columns recording measured 60, 82 and 139 px/s (1 : 1.37 : 2.3); Each its own at 3, 4 and 7 gives 1 : 1.33 : 2.33, and with Each shape 2.8 s and 3:2 pieces Segue's columns run at 60, 80 and 140 px/s at the recording's scale. **Masonry drift** now uses 3, 4 and 7 (Width 128%, Gap 10). Two new presets: **Rows side to side** (stepping, alternate, on the snap) and **Rows drift**.
- **A piece's detail, in the panel's own terms.** Its groups – Timing, Crop or Position, Look, Plays, Caption, and a layer's Layer – are now groups as the ladder has them: a rule, a bold title and a chevron, each remembered open or shut for every piece, a blue dot when shut with something changed inside. **Caption** starts shut (with a dot once it has words). In Slides, **Sits** comes first – whether a piece is a slide of its own or sits on the one before is what everything else follows from (0.7 had put it last).
- **Blend says what it blends with.** Steve's Multiply on a slide of its own was mixing with the background – correct, but invisible on a light ground. Once a piece blends, its Look says what with: "Over the background – set Sits to On the one before to blend it with that slide", or, for a layer, "Mixes with <the slide>, beneath it" (or Behind it).
- **Builds (backlog):** a layer can arrive on its own once its slide has landed – **Arrives**: With the slide, Fades in, Rises in, Grows in, Cuts in – **After** (0–8 s) and **Over** (0.1–2 s); it leaves with its slide. This is the deck-style "previous underneath" reading of Steve's 0.6 note.
- **Undo for a piece's own settings (backlog):** blend, opacity, Sits, order, fit, position, crop, In and Out, its time on screen, captions – each a step, the same setting within 0.8 s or one drag joined up, with what and whose in the toast. Dragging and scaling on the canvas undo too.
- **The arrow keys nudge the selected piece (backlog):** a px at a time, ten with Shift; a cropped piece moves its picture inside its frame.
- **Media drawn bigger than its own pixels says so (backlog):** its Media row reads "shown at 125%" (the most it's ever drawn at, across the loop, at the export's scale), with the size it would need in the tooltip.
- **The loop's length can be typed (backlog, from SOH Motion):** click "8.8 s loop" in the top bar and type 15 – every time in the loop (rests, moves, each shape, the pull back, lags, each slide's own time) is scaled to fit, in one undo step.
- **Preset drawings:** one small white canvas for every preset, in the interface's greys – the piece in focus dark, the rest light – and each kind drawn one way, so within a group only what tells the presets apart changes. No arrows.
- **Safari:** Presets list in Safari's engine at 16.4 and 26.6 (both run here, all 23 presets), so Steve's Safari differs in a way the engine doesn't show. Each preset row now draws on its own (one that fails can't stop the list), and if the list can't be seen 0.45 s after the sheet opens, a red note on the panel says so with what the browser reports – a list that's there but invisible throws no error, so before now nothing would have said.
- **Thin scrollbars on every tool** (`shared/kit.css`): 6 px, a soft grey thumb that darkens under the pointer, no track – in Chrome and Safari; Firefox keeps its own thin one. Tempo, Rubato and Tutti take it with no other change.
- Tests: `tests/segue_check.py` – 4 checks updated for the new panel (eight kinds, Columns' Speeds, the drawings, a piece's detail) and 15 new (Rows each way, Varied, 3 : 4 : 7 joining up, a held column, stepping two at a time, Width past 100%, the list appearing and one undo step, the presets, a build, a piece's undo and the blend note, nudging, the loop's length, the enlarged flag, the Presets note) – 136 of 136. `tests/segue_ui_check.py`: a Rows set-up with each its own, and the drag-to-reorder check shuts the open row first (a piece's detail in groups is taller than the panel's view) – 83 of 83. `tests/licence_check.py` 4 of 4. Every tool loads without errors in WebKit 16.4 (now run here as well as on GitHub's machines).

## 6 November 2026 – Segue 0.8: the Wall, drawings that show, and a tidier panel

Steve, after 0.7: "I think it's the essence and flex of the examples that are good. The ability to do similar with a similar quality, but the flex to alter columns, rows etc. … Continue to audit and refine against best practice and usability. Further additions you think would benefit, again without over bloating … Add in little diagrammatic shapes to help presets and other areas that would benefit showcasing a tool, whilst being selective."

- **Wall – a seventh kind.** A camera snapping across a wall of shapes, the columns and rows yours. It moves rigidly – everything together, nothing lagging, exactly the Snap that was measured – along a **Path**: **Across** (the way Direction says), **Diagonal**, **Stairs** (along, a quarter turn, again) or **Square** (round and back). Settings: **Columns** (1–8) and **Rows** (1–6) that fit the canvas (the wall carries on past every edge), **Offset** (every other column down part of a tile, like brickwork), **Move** (Step, Drift, Still), **Direction**, **Distance** (tiles a move, 1–4), then the usual Timing (Rest, Move time, or Each move for Drift) and Character (Feel, Keep drifting). Media run in reading order, a row after the last (one on from the columns, so no two rows ever line up exactly); the loop closes after as many moves as it takes the pattern to come round – a diagonal or stairs often fewer than the media, a square four – and brickwork with an odd number of media takes two laps, which the panel says. Drift along a path with corners is eased through them. Three presets: **Wall snap**, **Wall stairs**, **Brick wall**.
- **Drawings, where a drawing says it faster – and only there.** Every preset, yours too, now carries a small drawing of itself: its shapes where they sit, on its own ground (dark or light), with an arrow the way it moves (dashed when it never stops). Slides gets a three-frame picture under **Transition** – before, halfway, after (a cut has no halfway) – that follows the choice and the direction. The Wall gets a picture of its **route**. All are drawn from the settings, so none can disagree with what the tool does. Not added: pictures for ordinary sliders, where the number already says it.
- **The kind tiles** are four to a row and grouped: what a camera moves across (Slides, Line, Grid, Wall) above the kinds with a clock each (Columns, Frames, Float).
- **Audit, with fixes.** Every control has a name, no ids repeat, no errors on the page (checked on desktop and a 390 px phone, in every kind). Steppers (Columns, Rows, Across, Down, Distance) now start where the sliders do, with their labels level – they had been floating after the label, a different place on every row. The small round buttons (remove a piece) keep their look but get a finger-sized target on touch screens. The route picture reads at a glance (it was cramped at first).
- `tests/segue_check.py`: 121 checks (13 new) – the Wall's every route, direction and number of media joins up with or without offset, the moves each route needs, the Snap curve on the camera, rigid gaps in the rest and the throw, columns and offset, drift through a corner; the Wall's presets and the kind order; a drawing for every preset; the transition and route pictures; the brickwork note; steppers lined up. `tests/segue_ui_check.py`: two Wall set-ups added (stepping with offset, drifting on a square).
- Seen and left: `drawCrisp` rounds a picture's position to whole pixels when it is drawn at exactly its own size, so the settle at the end of a move would step by a pixel in that one case; any other size keeps its sub-pixel position. Not built: lag across a wall (the references are rigid), columns drifting in alternate directions inside a wall (Columns does that), a random-walk path (it couldn't promise to loop).

## 6 November 2026 – Segue 0.7: the Snap, and the panel looked at as a whole

Steve, with two iPhone screen recordings of a motion pack's mosaics: "Appreciate that things move in them, but more about the transitions of the elements. The snap, the fluidity. Can you bake this in? Whilst there, revisit the hi [UI] and ensure things are intuitive, logical and grouped properly. It's easy to bolt on without holistically checking things make sense. This should be a given."

- **Snap, measured not guessed.** Both recordings were taken apart frame by frame (the content runs at 30 Hz inside a 60 Hz recording; phase correlation on every changed frame, then a least-squares fit over six moves). The camera is rigid – everything moves as one, no lag, no blur, no overshoot – each move is a slow start, a fast throw across the middle and a long settle, and between moves it keeps drifting. Best fit to both: `cubic-bezier(.84, .11, .01, .98)`, about 0.9 s, 1% rms error. It is the new **Snap** feel, first in the list and the default for new work; saved settings and every existing preset keep the feel they had.
- **Snap along** and **Snap up** presets (Line, a row and a column): Lag 0 so it stays rigid, Keep drifting 12–15% so a rest is never dead, a 2.2–2.4 s rest, a 0.9 s move.
- **Feel is drawn.** Under the Feel menu, the curve it makes and what it is in words – six vague names are now something you can see. The pull back's feel is **Pull feel**, with its own curve.
- **The panel, regrouped.** The audit found controls where there happened to be room. Now: **Motion** is the kind and what moves, then three groups that mean the same in every kind – **Timing**, **Character** (Feel, Lag, Keep drifting; Slides' Movement), **After the last** (with **Pull back**, its settings, a group that appears only when you pull back). **Canvas** is Size, then a **Background** group (Colour and Image together, with clear Image fit and Image strength) and Guides. **Frame rate** moved to **Export**, where it belongs with the MP4 (and Export's 1×/2× is **Scale**, so it no longer clashes with the canvas's Size). **Captions** are behaviour first (Where, Sits, Align, Arrives, Over), then **Position and spacing** – the nudge and Between lines no longer hide in a drawer with the kerning – then each role's type, then **Kerning and accent**, then Fonts. **Overlay** puts the pad, margin and nudge together in **Position** (the old Nudge fold is gone), then **Blend and opacity**. A piece's detail goes **Timing, Position or Crop, Look, Plays, Caption**, with the rare **Layer** choice last (a layer's own detail opens with it). **Lag** is one word in Line, Columns and Frames (Columns' was Out of step); Shapes' fit is **Media fit**.
- `shared/UI.md` gets the rule these followed: look at the whole panel whenever something is added.
- `tests/segue_check.py`: 108 checks (14 new) – the Snap curve against the measurements, a Snap row moving rigidly, one shape's travel along the curve in time, Keep drifting, the loop closing, and the group order of every card, kind by kind, plus Export, Feel's curve, the Snap presets and a piece's detail. `tests/segue_ui_check.py`: still 83 – it drives every control generically, so it passed the regrouped panel unchanged (every control typed, clicked, dragged, reset and undone, in every kind).

## 6 November 2026 – Segue 0.6: layers, blends, a clip's In and Out, working on the canvas, guides

Steve: "better control over certain elements" – click an image and the timeline snaps to it; see clearly where a video starts and ends; hover the artboard and see the slide on the left; move and scale pieces on the artboard ("showing previous underneath"), video too; grids and margins; and, since he can't use After Effects, clips that interact with statics – scaling, cropping, blends (multiply), behind or in front. Segue only.

- **Layers (Slides):** a piece set to sit **On the one before** joins that slide rather than being its own: **In front** or **Behind** (behind shows where the slide is see-through or blended), **As it is** (fitted inside, at its own size) or **Fill the slide**, placed anywhere with Across, Up and down and Size (5–400%), and it arrives, moves (Zoom, Drift…) and leaves with its slide. In a frame (full bleed, In a shape) it's clipped to it; As it is lets it go anywhere. Its row sits in under its slide's; the top bar counts pieces and slides.
- **Blend and Opacity on every piece**, in every kind: Normal, Multiply, Screen, Overlay, Darken, Lighten, Difference – drawn straight onto what's beneath.
- **A clip's In and Out:** a bar the length of the clip with its frames along it, the part that plays lit – drag either end, or the lit part to slide both – with the frames at In and Out under it, chips for In, Out and length, and a tick following the clip while it's on the canvas. **Start at** and the new **End at** take typing; the clip loops between them. Whole clip uses In to Out.
- **The canvas:** hover a piece and it's outlined and its row in Media lights up (and the other way round); click it to select it – Media opens at its row; drag it (a cropped piece shows the rest of its picture faintly while you do); drag a corner to scale it. Opening a row takes the playhead to that piece and selects it. Click the empty canvas or press Esc to let go.
- **Guides** (Canvas › Guides): margin, columns, rows and gutter, and the centre – on the preview only, never in an export; whole pieces catch on them as you drag (hold Alt to place freely).
- `tests/segue_check.py`: 94 checks (12 new) – layers joining a slide, Multiply, Behind showing through, placing and sizing, opacity, moving with the slide, In and Out looping, a row taking the playhead to its piece, hover and click, scaling by a corner, catching on the centre (and Alt), guides only on the preview. `tests/segue_ui_check.py`: 83 of 83 (the Guides controls included).

## 6 November 2026 – the house kit on every tool: Tempo 0.12, Rubato 1.2, Tutti 6.2

Steve's review of Segue 0.5.2: blue dots with more room; no double rules; care over Presets (type, spacing, a picture where it helps; the chosen one's keyline was clipped) and Export (it jumped as rows came and went); more space and shorter lines; the Presets title as a section title and its groups as labels; Export's summary as chips – details as moments; no section numbers; then the same through every tool (not Decentish or Patch), tested – Tutti above all, as it's live – and the rules written down for future builds. Rules: `shared/UI.md` (rewritten as the house rules).

- **All four tools** (Segue from 0.5.3, below) now build with `shared/kit.css`: sections as white cards on a 4% grey panel (360 px, 280–480), titles Bold with no numbers or summaries, one rule per group, the label column, neutral greys, corners 12 / 10 / 8 / 6 / 4, Medium labels, the white choice that slides, keyline chips, black only for the main action, focus rings for the keyboard only.
- **The house slider in every tool** (`shared/core.js` for Tempo and Rubato, `tutti/frame.js` for Tutti): label beside the bar, value inside, drag by distance with Shift finer, a press that doesn't move jumps, a notch at the default; Tempo and Rubato's values can be typed. Each sets only its range's value and fires its own input event, so nothing a tool makes changes.
- **Tempo 0.12, Rubato 1.2:** choices that won't fit sit full width or as an even grid (never a menu – their tests press them); Rubato's stepper and More in house terms. Change dots and undo come to them next.
- **Tutti 6.2:** its rows, switches, buttons, choices, bands, Edges, Advanced and the Export sheet in house terms; exports unchanged (`tests/tutti_check.py` hashes against 6.1.1).
- Tests: see the handover.

## 6 November 2026 – Segue 0.5.3: Steve's notes on 0.5.2, and Safari

Steve: blue dots, not red, with more room either side; no double rules above titles; care over Presets (type, spacing, a picture where it helps; the chosen one's keyline was clipped) and Export (it jumped as rows came and went); more space and shorter lines; no section numbers; Export's summary as chips – details as moments. And in his Safari, Presets and Export still didn't work. Segue only – Tempo, Rubato and Tutti wait for Safari to be right.

- **Change dots blue** (`--k-dot`), centred in a wider change column, so there's room between a control and its dot and between the dot and the card's edge.
- **One rule per edge:** a group's line no longer doubles with its head's.
- **No section numbers;** titles line up with everything under them.
- **Presets sheet:** titled as a section (14 Bold), groups as labels (13 Medium) with one rule between; presets as names (a picture of the kind only among yours, which mix kinds; what each does in its tooltip); the chosen one white with its keyline inside, so a scrolling sheet can't clip it; "In use" as a tag.
- **Export sheet:** holds one height whatever the format (measured at its tallest on opening), so the choice you press stays under the pointer and Download stays put; what you'll get as chips – size, length, frame rate, Loops, the most it can weigh, the last one made.
- **More room:** 10 px between settings, 20 before a group, 16 inside a card, cards 10 apart; notes with a right margin for shorter lines.
- **Safari:** in Safari's engine (WebKit 27, run on GitHub's machines with `tests/webkit_probe.py`) both 0.5.2 and 0.5.3 list every preset and download PNG and GIF – so what fails is particular to Steve's Safari (its version or what it has saved). 0.5.3: sheets hold the card's body directly (no open-and-shut wrapper, as in 0.4); start-up runs in separate steps so one failing can't stop Presets or Export; saved presets from earlier versions are tidied as they're read (one without settings stopped the list); and anything that goes wrong shows as a red note at the top of the panel with the browser's name, to send back.
- Tests: `tests/segue_ui_check.py` 83 checks (Export holding still, chips, no numbers); `tests/segue_check.py` 82 of 82.

## 5 November 2026 – Segue 0.5.2: cards back, and one ladder of levels

Steve's review of 0.5: titles up a weight, labels more obvious, it still felt bitty; the panel a 4–5% grey, a touch wider; no summaries beside the section titles, numbers the size of the titles; quieter, neutral greys (the hover read warm); a considered use of rules and space; "we have definitely lost something with the loss of these cards as sections"; "a clear defined logic of category, sub parameter, sub sub". Segue only; rules in `shared/UI.md` (the ladder of levels).

- **Sections are cards again** – white on the panel's 4% grey, 8 px apart. Titles Bold, numbers the same size in grey, no summary line.
- **Four levels, each with one look:** section (card), group (hairline and Bold title), setting (one row: label column, control column), detail (inside or under its row).
- **One row grammar:** every setting's label sits in a fixed left column and its control to the right, so controls share a left edge – sliders included (their label now sits beside the bar, and dragging it drags the slider). Controls that need the width – choices that won't fit, tiles, lists, text boxes – take it with the label above.
- **Greys** neutral and quieter; corners step down with the levels (12, 10, 8, 6, 4); space on an 8 px step.
- **Panel** 360 px by default (was 300), up to 480.
- **No blue ring** after pressing a slider (it focused its hidden range – Safari showed the ring); focus rings now only when using the keyboard.
- Tests: `tests/segue_ui_check.py` 81 of 81 (weights and corners updated to the ladder, panel 280–480); `tests/segue_check.py` 82 of 82.

## 5 November 2026 – Segue 0.5.1: Presets and Export empty after an earlier Segue

Steve, in Safari: "export doesn't work. The presets have no presets in them." Not Safari – any browser that had used an earlier Segue. 0.5 hides a shut section's contents once it has closed; Presets and Export were sections early on, and a browser that remembered them as shut (`segue:collapsed`) opened their sheets with the contents still hidden. Sheets now always open in full. `tests/segue_ui_check.py`: 81 checks (1 new) – a browser with Presets, Export and others saved as shut.

## 5 November 2026 – Segue 0.5: the round 4 kit (UI stream)

Steve's picks from round 4: A's look, our frame (no right-hand inspector), keyline chips, rounded rectangles rather than lozenges with one corner logic, and the white choice tied to how things are picked. Tried on Segue first; the other tools follow once it's signed off. Nothing about what Segue makes has changed.

- **`shared/kit.css`** (new, Segue only for now): one corner logic – 12 px surfaces, 8 px controls, 6 px for what sits inside a control and for chips, round only for true dots; Aktiv Medium for titles, the chosen option and buttons, Regular for the rest (20 / 14 / 13 / 12 px); sections as hairlines with grey numbers; black only for Export and Download; no shadows. Rules in `shared/UI.md`.
- **The slider:** a grey bar with the label and value inside, a darker fill, a 3 px handle that splits into two ticks over the words, and a notch at the start value. Drag moves by distance (Shift finer, a catch at the start value), a click jumps, the value types, double-click resets, Shift + arrow steps by ten. Ranges through zero fill from zero.
- **Choices** white on grey, the white sliding to what you pick; a choice that won't fit the panel's width becomes a menu, and back when there's room (Size, Feel, After the last, Arrives).
- **Steppers** for small counts (Columns, Across, Down).
- **Keyline chips** with icons for quiet actions (Shuffle, Clear all, Reset, Replace, + Add); media, fonts and presets as grey rows with a grip, the open one white.
- **What's changed shows:** a red dot on every row that differs from the preset in use (or the default) – click it to put the row back; changed values in ink; a dot on a shut section, and **Reset** on an open one. A preset counts as edited only while something differs from it.
- **Undo:** ⌘Z / Ctrl+Z and ⇧⌘Z / Ctrl+Y for every setting, presets, section resets and removing files (the files come back too); a drag is one step. Removing something says so in the island, with Undo.
- **Motion:** three named curves (Snap, Smooth, Morph) and numbers that roll; sections open and shut smoothly. None with reduced motion.
- `window.segue.ui` (controls, undo, redo, base, moved) for tests.
- **Export bar:** a full-size GIF used to hold the page for 5–6 s at a time (it only let go every sixth frame), so the progress and Stop lagged; it now lets go every 50 ms or each frame, whichever is longer – the longest hold here is now under a second. Nothing about the file changes.
- `tests/segue_ui_check.py` (new): 80 checks – every control a person can reach (100 across 11 set-ups: sliders typed, clamped, clicked, dragged, Shift-dragged, stepped, reset by the dot and by double-click; steppers; choices and the white that follows; menus; switches; colours; fields), undo and redo, presets, media, pictures, fonts, Preview, the panel's width, light and dark, the island, the Export bar (every format, the files it saves, progress, Stop) and a phone. `QUICK=1` runs one set-up. Found and fixed on the way: slider values had stopped taking clicks, a drag from a slider's ? did nothing, the white choice lagged a growing sheet. `tests/segue_check.py`: 82 of 82, unchanged.

## 5 November 2026 – Segue 0.4.4: coloured type stays crisp in MP4, and a 2× size

Steve's 0.4.3 MP4: "hazy around edges on some, even when the source material is not" – magenta 22,41 on orange (Numeral 01 Colour) and green on pale grey. Segue only.

- **The cause:** H.264 keeps colour at half size each way (4:2:0). Where two colours meet with little difference in brightness, the edge is carried by the colour alone, and Segue made that half-size colour by simply averaging each 2 × 2 block – so the edge went soft and spread. The drawn frame was right (as crisp as a Lanczos resample of the source), and the encoder wasn't it: on Steve's iMac it keeps colour at 64 dB. Reproduced here with his clip: 8.0 levels RMS from the drawn frame.
- **Now:** where the colour changes, each colour sample is refined against what a player will rebuild from it, and each pixel's brightness is corrected halfway towards what brings the rebuilt colour closest to the drawn one; the stream's header now says the colour sits in the middle of each block, so players put it back there. 5.5 levels on his 22,41; flat colour is untouched (#F5F5F3 still exact). About 20 ms a frame more here.
- **Size: 1× or 2×** (Export, MP4 and PNG): the same layout drawn at twice the pixels each way – 2160 × 2700 for 4:5. Type and media are drawn finer, and the colour is as fine as a 1× file's pixels: 2.5 levels from the drawn frame when shown at 1080 wide. About 2.7× the time; Instagram shrinks it to 1080 wide. Steve's Mac encodes up to 3840 × 2160 and 2160 × 3840.
- `tests/segue_check.py`: 82 checks (3 new) – colour edges nearer the drawn frame (17.9 → 13.9 levels at the edges of a magenta-on-orange and green-on-grey card), the stream says centre, 2× PNG and MP4 at twice the pixels with the same picture.

## 5 November 2026 – Segue 0.4.3: crisp media, really – drawn on the pixel grid

Steve's MP4 from Chrome: "not as crisp as it could be", and only ~4 MB against an estimate of 300+. Measured on his iMac (Chrome 152, through the Claude app's browser) and here. Segue only.

- **The cause was the drawing, not the encoder.** 0.4.1 shrank each piece carefully, then drew the result at wherever the layout put it – x + 0.6 px, say – and the browser blurred it again to get it there; anything enlarged was stretched with a plain bilinear filter. Measured with fine type against a Lanczos resample: Card stack kept 55–65% of the edge detail, Phone swipe 63–73%, Push and drift 70–87%, Straight cuts with a 16:10 piece in 4:5 (enlarged 1.125×) 79%.
- **Now** each piece is resampled once, straight onto the pixel grid, with the fraction of a pixel built into that one step (so movement stays smooth): stepped down to within 2× (kept, for stills), drawn to its exact size and place, sharpened (half strength shrunk, a third enlarged) and copied on 1:1; the same size as its own pixels is copied straight, untouched. Card stack 91–92%, Phone swipe 83–86%, Push and drift 98%, Straight cuts 93%. Turned media keeps 0.4.1's path. Full-frame video costs about 90 ms a frame more on the test machine.
- **The encoder was fine:** on Steve's iMac, Chrome's hardware encoder held to 32 Mbps gives 52 dB on busy test footage, and a Segue export of promo-like clips came back 56–59 dB from the frames it drew – visually identical. Flat colour and type cost little to encode, so the file is small: the Export sheet now says "up to" the size, not "about".
- **Encoder test:** 0.4.2's test footage panned by whole pixels, which encoders predict almost for nothing; it now zooms and drifts by fractions of a pixel, so one that follows the bitrate shows it plainly (3.1× the bytes for 3× the bitrate, here).
- `tests/segue_check.py`: 79 checks (1 new) – fine type in a card at x + 0.6 px keeps 90% or more of a Lanczos resample's edge detail with no aliasing (0.4.2: 65%).

## 5 November 2026 – Segue 0.4.2: an MP4 encoder that follows Quality

Steve's three MP4s at Standard, High and Best all came out at 16.5 MB (Safari, Intel iMac): the encoder kept its own quality whatever it was asked for. Segue only.

- **Why:** Safari makes H.264 with WebKit's video-call encoder (libwebrtc on Apple's VideoToolbox), which settles its own quality rather than taking the bitrate as a target; Chrome's hardware encoder on a Mac does the same in variable mode (w3c/webcodecs#430). Not the source clips, and not Crisp scaling.
- **Segue tests the encoder first:** each setup the browser offers (hardware or software, constant or variable bitrate, then real-time) encodes a second of panning fine detail at the bitrate asked for and at a third of it, and the first whose file grows with the bitrate is used – if none does, the one that spends the most, and it says so. Each setup gets a few seconds (some Safari versions stall for good in quality mode), and an encoder that stalls mid-export stops it with a message rather than hanging.
- **In Safari** the Export sheet says so for MP4: Quality makes no difference there, and for the crispest MP4, export in Chrome. GIF and PNG come out the same in both.
- After an MP4 the toast gives the rate it came out at, so whether Quality took is plain; the console names the encoder.
- `tests/segue_check.py`: 78 checks (1 new) – the encoder picked is one whose file grows with the bitrate.

## 5 November 2026 – Segue 0.4.1: crisp exports

Steve's MP4 of Tempo promo clips wasn't as crisp as it should be. Two causes, both fixed. Segue only.

- **Crisp scaling** (Export, on by default): media scaled down – a 16:10 screen recording into a card is 2–5× smaller – was drawn in one go on the export canvas, which softens fine type at 2× and aliases it beyond (measured: 38 levels RMS from a Lanczos resample at 4.4×). Now it's halved step by step to within 2× of its size, drawn to size, then sharpened lightly (centre-weighted 3×3, half strength) – 16 from Lanczos at 4.4×, and 98% of Lanczos's edge detail at 2.3×, much as Photoshop's Bicubic Sharper. Stills are kept once made; video is done afresh each frame (~20 ms a frame). The paused preview shows it too.
- **MP4 Quality:** Standard, High (default), Best – 16, 32, 50 Mbps at 1080 × 1350 and 30 fps, scaled to the size and frame rate (0.4 held everything to 24 Mbps, where Apple's encoder behind Chrome on a Mac softens detail). The Export sheet gives the file's size before you make it. The encoder is also told the content is detail.
- What's left is H.264 itself: colour is kept at half resolution (4:2:0), so fine coloured type on a coloured ground is a touch softer than black on white – every MP4 player and Instagram expect it.
- `tests/segue_check.py`: 77 checks (2 new) – crisp scaling nearer a Lanczos resample than a plain draw, and the three bitrates.

## 5 November 2026 – Segue 0.4: literal names, a looser pull back, artwork you can drag, values you can type

Segue only.

- **Presets are named for what they do** (the musical names were one puzzle too many): Straight cuts, Slow fades, Push and drift, Open and zoom, Zoom through, Flick across, Spring up, Fade with caption (Slides); Card stack, Phone swipe, Carousel (Line); Rows up (Grid); Columns up and down, Masonry drift (Columns); Posters (Frames); Float with title (Float). Any earlier name in use carries over.
- **Pull back, less rigid:** **Stagger** – each shape settles into the grid a beat after the one before, nearest the focus first, and the ones fading up drift in from a little further out, so the grid gathers rather than arriving as one sheet (the furthest leave first on the way back in). **Float** – every shape drifts gently on its own path while they're pulled back. Both start from nothing, so the pull back still joins the steps exactly. With Feel (Inertia, Spring and the rest) beside them in the Pull back fold. On by default (40% and 30%); 0 for the old rigid move.
- **Grab the artwork:** drag a piece on the canvas to position it – where it's cropped (full bleed, or a shape it fills) the picture pans inside its frame, only the way it has to spare; shown as it is, the slide itself moves. Ctrl or Alt and scroll zooms it; double-click resets. The same values are in its row in Media – Crop (Across, Up and down, Zoom) or Position (Across, Up and down, Size), with Reset – and the row opens when you let go. It pauses the preview while you hold it.
- **Type a value:** click the number on any slider (or Tab to it and press Enter), type, Enter. Units are optional ("2.5 s", "80%"), it's kept to the slider's range but not rounded to its steps, and Escape leaves it as it was. Every slider in Segue, the media rows included. (A first step – the sliders themselves are for the house UI thread.)
- `tests/segue_check.py`: 75 checks (5 new) – typing a value, the pull back's stagger and float, dragging a full-bleed slide (pan, crop edge) and an as-it-is slide (moves it).

## 5 November 2026 – Segue 0.3: Slides, the showcase kind, and GIFs made for it

Built around Steve's showcase GIFs (usually made in Photoshop) and his zoom-through reference, measured frame by frame – "at the more extreme end", so with cleaner options below it. Segue only.

- **One is now Slides** – a slide at a time, with its own controls in Motion:
  - **Each slide:** **Full bleed** (fills the canvas, cropped to it – the Shapes card goes, as nothing in it applies), **As it is** (each keeps its own shape on the background – **Fit each**, or **True to scale** so a smaller piece shows smaller) or **In a shape** (as before).
  - **Transition**, simplest first: Cut, Fade, **Dip** (out to the background and up), **Wipe**, Push, Cover, **Open** (a window opens from the middle onto the next), Zoom, **Through** (the next comes up from a 12% card in the middle as this one carries on past – the reference, on its own fitted curve). Feel only shows for the ones that travel; Direction only when something does.
  - **On screen** and **Transition time** – the pacing.
  - **Movement** in every slide while it's on screen, running through the transitions so it never stops: Zoom in, Zoom out, Drift, **Parallax** (the frame one way, the picture the other), **Vary** (in, across, out, back), with an **Amount**. As it is moves the whole slide, so nothing of the work is cropped; full bleed and In a shape move the picture inside its frame.
  - **Per slide** (open a row in Media): its own time on screen, transition and movement – each says what it falls back to – and **Whole clip** for a video. Caption fields only show when captions are on.
  - A single slide just stays, its movement going in and back out, so it loops.
- **GIFs made for showcasing:** a frame that doesn't change isn't written again – the one before is held longer, as Photoshop's delays do – so a Semplice GIF of eight still slides is 0.85 MB at half size. A frame that changes in part writes only the rectangle that changed, the unchanged pixels inside it see-through. Flat colours come out exact (#F5F5F3 was 247, 247, 247). Optional **Dither**. Loops in the file is gone for GIF (a GIF loops for ever); a note says what movement costs; the file's size shows after each export.
- **Presets in our own names** – musical terms, like the tools – and grouped by kind. Five new showcase presets climb in tempo and set the export to GIF: **Semplice** (straight cuts, nothing moving), **Adagio** (slow dissolves, gentle movement), **Andante** (each piece at its own shape, pushed and drifting), **Allegro** (opening from the middle, zooming in), **Presto** (through, fast – the reference). Renamed: Card stack → Coda, Phone swipe → Canon, Carousel → Ostinato, Grid → Chorale, Columns → Counterpoint, Wall → Polyrhythm, Posters → Fermata, Milky Way → Nocturne, Deck → Staccato, Stack → Pizzicato, Fade → Dolce. A 0.2 name in use carries over.
- Fixes: in One/Slides, Zoom, Cover and Fade no longer leave the outgoing slide showing round the edge for a frame when the next doesn't cover it exactly; shapes that only touch the canvas edge aren't drawn.
- `tests/segue_check.py`: 70 checks (16 new) – the presets and their groups, Slides showing only what each choice needs, framings (bleed, fit each, true to scale), movement through transitions and per slide, own time on screen, a single slide, Through and Open, Slides looping exactly in every framing, GIF frames held (one per still slide, the loop's length exactly), exact flat colour, partial frames.

## 4 November 2026 – Segue 0.2: kinds of motion, lag and depth, over and under

Built from Steve's four screen recordings (phone swipe, columns, posters, Milky Way), measured frame by frame, and his notes on the panel. Segue only – nothing shared changed.

- **The panel follows the work:** Media, Canvas, Motion, Shapes, Captions, Overlay. Motion opens on six **kinds** as tiles – One, Line (a row or a column: Direction decides), Grid, Columns, Frames, Float – and shows only that kind's controls, always in the same order: how many, what moves and which way, timing, the feel, then its character. Columns and frame counts moved into Motion; Fonts moved into Captions.
- **Columns** (new): every column runs through all the media on its own – down, up, down (or all one way), drifting at its own speed (Varied: two, three and four laps in a loop twice as long, about the 1 : 1.4 : 2.3 of the reference) or stepping a shape at a time, each column a beat **out of step** with the last. Offset sets every other column down by part of a shape. "The media's own" shape gives each piece its own height – a wall.
- **Frames** (new): the frames stay put and the media changes inside them – push, cover, fade or cut, each frame a beat after the last. With as many frames as media nothing changes and video plays inside them: static posters with motion in them.
- **Float** (new): shapes scattered at three depths – nearer is bigger and faster, in proportion – drifting or stepping past. Depth, Spread and Shuffle.
- **Lag** (Line and Grid): each shape sets off a beat after the one ahead, so the gaps open as they move and close as they land – the phone reference sets off about 75 ms apart.
- **Keep drifting** (stepping kinds): everything keeps moving gently while it rests, and still meets each stop exactly.
- **Feels:** **Coast** (a short push, then a long glide in – fitted to the phone reference) and **Soft** (a gentle ease in and out). The pull back now eases with Soft, for smoother zooms out and in.
- **Background image** behind everything (fill or fit, strength), and **Overlay**: text (any font, size, tracking, leading, colour, case, *stars* and {#hex:} colours) or an image, placed on a 3 × 3 pad with a margin and a nudge, in Normal, Difference, Multiply or Screen, at any opacity – and in Float, among the shapes so the nearest pass in front of it. Presets set the overlay's look but never remove what you've put there.
- **Border:** a mount inside each shape, in its own colour, with its own inner corners (the posters' white border).
- **Presets:** Phone swipe, Columns, Wall, Posters and Milky Way join Card stack, Carousel, Deck, Stack, Fade and Grid. Each shows its kind in the list.
- Folds say what's set when shut (Border and edge, Position, Pull back, Nudge, Fonts).
- `tests/segue_check.py`: 54 checks (19 new) – each kind's controls, lag, keep drifting, columns' directions, speeds and timing, frames that never move, float depths, every new kind looping exactly, background, overlay in Difference, border, text placement, presets keeping the overlay, both images back after a reload.

## 4 November 2026 – Segue 0.1: framed loops for case studies

A new tool, internal for now (unlisted at /segue/). Images and video in; framed loops and stills out – the kind of thing brand identity packs do in After Effects, for showing decks, guides, screens and social posts in case studies. Built for Tempo's promo reel first.

- **Canvas:** 4:5, 9:16, 1:1, 16:9, 4:3 or any size; background colour; 24, 25, 30 or 60 fps.
- **Shapes** – the frames the media sits in: their ratio (the media's own, 16:10, 16:9, 4:5, 9:16, phone, A4 and more, or custom), size, gap, corners, fill or fit, a colour behind, an optional edge, and a nudge for the lot.
- **Layouts:** One (a shape at a time), Row, Column, Grid.
- **Moves:** One slides, stacks (the next over this one), fades, zooms or cuts – and each shape can arrive by its own move. Row, Column and Grid step a shape (or a row) at a time, or drift without stopping. Still holds everything while the video plays.
- **Feels:** Glide, Inertia (a flick that coasts to a stop), Spring (a touch past, then settles), Linear.
- **Loops:** always exact. After the last shape, carry on round, or **pull back** to show every shape in a grid and come back in to the first – one camera move, with shapes that aren't neighbours fading rather than flying across.
- **Captions,** with or without: under, above, on the shape, or fixed on the canvas; title, line and tags (chips), each with its own font (yours or built in), size, tracking, leading, colour and case. *Stars* colour words with the accent, {#hex:words} with any colour. The font's kerning on or off, plus your own kerning pairs. They arrive as they are, fading, rising or scrambling.
- **Media:** images and video, mixed; drag to reorder; each video's start point (to catch a transition); captions per shape. Kept in the browser, so it's all there next time.
- **Presets** that keep to the canvas size you've set and scale to it: Card stack, Carousel, Deck, Stack, Fade, Grid, and your own.
- **Exports:** MP4 (H.264, 1–3 loops), GIF (each frame its own colours), PNG of the frame on the stage.
- **True colour.** Segue converts every frame to video colours itself and labels the file to match, and it sets the range flag inside the H.264 stream to agree – Apple's encoder writes "full range" there, which is why Tempo's MP4s show #F5F5F3 as #E2E2E0 in ffmpeg-based players (Instagram among them). Video added to Segue that has the same mismatch (Tempo's promo MP4s up to 0.11.1) is put right as it comes in; "Lift washed-out colours" is there for anything else that looks lifted.
- `tests/segue_check.py` (35 checks).

## 29 October 2026 – Decentish 0.5: our own map, and the first live checks

**Decentish 0.5** – getting the raw data right. No changes to Rubato, Tempo or Tutti.
- **Our own copy of the map.** Every place Decentish can use in Greater Manchester (8,586 of them), rebuilt every Monday from OpenStreetMap by the *Decentish data* workflow and served in small area files. Inside Greater Manchester the page no longer asks the public map servers, which failed every request in the first live check (502s and minute-long timeouts). Monton now loads its places in under a tenth of a second. Outside Greater Manchester it still asks the servers. Each place records when it first appeared, which is how "new" will be spotted.
- **Live check.** *Actions › Decentish live check* runs the real page against the real services for eight places at three times, and lists what looks wrong. A map-service probe runs first.
- **The facts pack.** Everything a plan was built from, as plain data (`window.decentish.facts()`) – what the live check reads now, and what a writer will write from later.
- **Less weather and transport.** Weather only when it changes something (sunny, raining, cold, sit outside). Getting there in a few words ("Head into town – about 25 minutes in a taxi"); the way back only when it matters.
- **Fixes from real data:** Metrolink stops only (the Heaton Park heritage tramway's stops were counting); the Trafford Park line as it is on the map (Trafford Palazzo); parks must be over 2 hectares to be "a walk"; no "open all night" when the map simply doesn't say; "the Northern Quarter" rather than "City Centre"; "an 11-minute taxi".
- Map data and weather are credited at the foot of the page.
- **Found, not fixed:** only 16% of Greater Manchester's food and drink places have opening hours on OpenStreetMap (Bolton: 0 of 45 pubs and bars). Outside town and Didsbury the planner has very little it can safely use. Opening hours from Google are the next job – see the roadmap in `decentish/NOTES.md`.
- Tested: `tests/decentish_check.py`, 63 of 63, now through the same area-file path the live page uses; plans read against the real map data for Monton.

## 29 October 2026 – Tempo 0.11.1: Mac savers install for one user or all

- **The Mac screen saver engine is rebuilt** (WebViewScreenSaver 2.5 with one change): the saver finds its page inside itself, so it plays whether it's installed for one user or for all. Before, "this user only" gave a blank screen.
- **Mac read-mes updated:** install either way, where to find it on macOS Tahoe (Wallpaper › Screen Saver), and remove it by right-clicking it in that list.
- **Signing:** the private repo `tempo-savers` signs and notarises the savers with Steve's Developer ID, so they install with one click. The 12 on the site went through it on 29 October.

## 20 October 2026 – Tempo 0.11: Orbit and Tuner

Two new faces, picked by Steve from the six on the concept canvas (Tempo – type face concepts).

- **Orbit:** Rings' words run round each ring like a line of type set on a curve, a word space apart, letter by letter. Each ring turns until the word true now stands upright at twelve o'clock, so the hour, minute and second stack into one column down the middle – centred, or with their first letters in line. Same words, options and date rings as Rings (they're checked to say exactly the same). Position: size, space between rings, space in the middle, a mark at the top and a dot in the middle, both in the new accent colour.
- **Tuner:** the hours (in words), minutes and seconds as three scales sliding under a needle that stays still, like an old radio dial or a slide rule. Glide moves every scale all the time; Step jumps each to its mark with the Change card's feel. The label in the Now colour is the one whose stretch the needle is in (Ten until eleven o'clock). Position: size, space between scales, spread, the names Hour, Minute, Second, and a dot on the needle. Towards the edges: full strength or fade out; labels fade before they reach the end of a scale rather than being cut.
- **Accent colour** for Columns, Rings, Orbit and Tuner's themes (shown for Orbit and Tuner): Drawn and Paper red, Night yellow, Noon orange, Signal white. Themes saved before carry on; copying a theme to the other designs now takes the accent with it.
- Exports, presets and Open a file carry both; the screen saver is named Tempo Orbit or Tempo Tuner.

## 20 October 2026 – Tempo 0.10.2

- **Centre dot on its own:** its own size (it used to grow with the hands' widths) and always its own colour.
- **Ring:** its own colour (it used to share the hour marks'), and **Fill inside the ring** – a disc in its own colour, its own layer (Ring fill, at the back to start).
- **Every dial colour independent:** background, ring fill, minute, hour and quarter marks, ring, each hand, centre dot and fill each have their own row.
- Older designs open as they were: the centre dot keeps its size and colour, the ring its colour (checked frame for frame).
- Opening an older download now also resets the dial's 0.10 settings to how it drew, rather than keeping whatever was on screen.

## 19 October 2026 – Tempo 0.10.1

- **Sturdier start-up:** each card in the panel is built on its own, so if one ever fails the rest – Export and Presets included – still work, and a red note says what went wrong (click it to hide). Steve saw Export and Presets stop responding after 0.10; not reproduced here yet – this keeps them working and shows the cause.
- The dial's hand-length table moved earlier in the file, so the preset code can never reach it before it exists.

## 19 October 2026 – Tempo 0.10: the dial, element by element

- **Each hand on its own:** pick Hour, Minute or Second and set its reach, where it starts (at the centre, out from it as a floating bar, or behind it as a tail), width (now up to 250 – much thicker), corners (square to fully round, anything between), taper, or draw it as a dot – placed and sized freely. Each has its own opacity and blend.
- **Motion and trails, hand by hand:** a hand moves with the time or turns freely at its own speed (0 holds it still), so a dial can become pure form and colour. Trails: echoes of the hand fading behind it, or a sweep of colour – length, number of echoes and strength each set.
- **Custom marks:** minutes, hours and quarters set separately – shown or not, lines (from, to, weight) or dots (where, size), and whether a mark also sits under a bigger one. Custom starts from the marks you had, exactly.
- **Layers card:** every element – fill, marks, ring, each hand, centre dot – switched on or off and moved up or down. The fill's place now lives here.
- **Centre dot:** its own colour if you want it; the ring's position can be set too.
- **Nothing lost:** every earlier setting is still there (Ends became each hand's Corners). Designs made before draw exactly as they did – checked frame for frame across 55 dials.

## 16 October 2026 – Tempo 0.9.8

- **Each side its own margin** (Position card, for The time, In words and Stack): switch on Each side its own and set top, right, bottom and left separately. They start from the single margin; switch it off and the one margin rules again. Downloads and presets carry them.

## 15 October 2026 – Tempo 0.9.7

- **Space around the separator** (The time: Clock card; Stack: Setting card, under Optical spacing): the room either side of the comma, colon or stop, against the space between two figures – 100% by default (as between figures), down to 0% tight. Set once for the font, so the time never moves.
- **A leading 1** (same cards): In its cell (as before – the time never moves, but a 1 sits in from the edge) or On the edge (a leading 1 lines up with the margin; the time glides over when the hour does, at 10:00 and 20:00). Left-aligned only in The time.
- **Stack's date and year** use the font's own figures and kerning – they change once a day, so a 1 sits on its own ink (15 October lines up with 26).
- Stack's day now hangs exactly from the last figure's ink (it sat a hair to the right).

## 15 October 2026 – Tempo 0.9.6

- **Optical spacing** (on by default, in The time and Stack): fixed-width figures meant the font's kerning never reached the separator, so 7, left a hole and the comma hugged the next figure. Tempo now reads each glyph's shape and sets the separator by eye – optically centred between the figures either side, judged where the separator itself sits. The figures never move; only the separator settles as its neighbours change.
- **Figures never touch:** however tight the tracking, two figures keep a hair apart at every height (in Univers at −65, 44 used to join; the figures now stop at the tightest that clears every pair).
- **Stack:** where a figure meets a letter (30September) the join is spaced by eye too. Letters keep the font's own kerning.

## 15 October 2026 – Tempo 0.9.5

- **Colour picker, refined:** the wheel and brightness slider are gone. Now: the colour, RGB or CMYK sliders (each track shows where it'll take the colour, with the value beside it to type into), the hex (#abc works too), a dropper and your saved colours – on a plain panel rather than see-through.
- **Dropper everywhere:** in Chrome and Edge it picks from anywhere on screen; in other browsers it picks from the preview.
- CMYK is the plain screen conversion – handy for thinking in ink, not a print profile.

## 15 October 2026 – Tempo 0.9.4

- **Stack, closer leading:** lines now close up against the letters' actual shapes rather than their boxes – the tail of a y, the stem of a p – so the time sits right down on the day, and nothing touches.
- **Even spacing, rethought:** one regular step for every pair, set by caps and ascenders, and more only where a descender really hangs over the line below (September over the year on five lines). Before, one descender opened up every gap.
- **Tracking per line:** the time, the day, the date and month, and the year can each go a little tighter or looser than the overall tracking.
- Flush-right day: its spacing is now worked out where it actually sits.

## 15 October 2026 – Tempo 0.9.3

- **Stack, a new design** (Show → Stack), from Steve's Univers mock-up: the time on top, the day hanging from the time's last figure (a Swiss offset), the date run into the month, the year below – 08.03.49 / Wednesday / 30September / 26.
- **Nothing moves as the days change.** The block is sized and placed for the worst case – every day, every date of every month, every time – so its size, its corner and the time's position hold all year. Figures are set to one width so the time never shifts as it ticks.
- **As tight as it can go without touching.** Lines sit as close as they can with no ink meeting: each pair is checked glyph by glyph over everything they could ever show, so a descender can hang into the line below only where nothing is there. Line spacing (default 0.18 of a cap height between them) and Even spacing are in Setting.
- **Lines:** four as drawn, five (the month on its own line) or three (the year after the month); 24- or 12-hour, seconds on or off, the separator as a stop, colon, comma or space; Wednesday, Weds or Wed; September, Sept or Sep; the year as 26 or 2026; a leading zero on the date; a space between date and month.
- **Position:** latch to any corner or the centre, with size and margin. Drift moves Stack slowly away from its corner and never past the margin.
- **Colour:** five colours (background, time, day, date, year), Stack's own themes, and changing theme each hour as in the other designs. Change: roll (each changed character in its own window), fade or cut.
- **Univers Next Pro Light** is built into this internal version only, from the private fonts repo (Steve's licence). Any loaded font works too.

## 14 October 2026 – Tempo 0.9.2

- **Colour picker:** clicking any colour opens Tempo's own picker beside it – a colour wheel, brightness, the hex, a dropper (Chrome and Edge) and **saved colours**, kept for every design. + saves the colour in hand; × removes one.
- **Themes across designs:** Copy to the other designs puts a theme into The time, In words, the dial and Columns and Rings at once, its colours matched by role (background, ink, accent, soft). Each Colour card lists the themes made for the other designs under From your other designs – click one to bring it in.
- **Promo – several devices:** add as many device PNGs as you like (a 16:9 screen, a 4:5 crop for social …), switch each on or off; every export makes a set per device on, each at its own size and shape. Kept in this browser.
- **Promo – MP4 colour:** the browser used to convert frames to video colour its own way and label them loosely, so players showed them duller. Tempo now converts each frame itself (BT.709) and labels the file to match, with the sRGB tone curve; flat colours are set to the nearest code 8-bit video allows – #F5F5F3 plays back within one step in 255.
## 14 October 2026 – Tutti 6.1.1

A robustness pass on Export after a report that it wasn't working on the live site. It couldn't be reproduced afterwards (most likely a stale copy or a deploy in progress), but checking every path – Chromium, Firefox and WebKit (Safari's engine), on its own, framed (`?embed`) and full screen (`?app`) – turned up these, all fixed. Still exports (PNG, SVG) are byte for byte the same as 6.1.

- **Every save says so.** Save PNG, Save SVG and Save preset show "Saved Tutti_byENSEMBLE_….png" above the island; MP4 and GIF show it in the island. Before, a still save gave no sign at all, so a download the browser held back looked like Export doing nothing.
- **Recording puts the sheet away.** Starting a countdown or a recording closes the Export sheet; the island shows Get ready, the time and Stop, then Saved …, and Export comes back shut. Before, the sheet hid behind the recording and sprang open again by itself a few seconds after saving – a click on Export in that moment closed it instead.
- **GIF needs nothing from outside.** GIFs are made by the shared encoder (`shared/gif.js`, the one Rubato and Tempo use, put in by `build.py`) instead of gif.js fetched from cdnjs when Record was pressed – so no "GIF needs an internet connection", nothing from a third party. Frames that don't change are merged into one longer frame: a GIF of a still source went from about 4 MB to a few KB. The island counts up while it's made ("Making the GIF – 60%").
- **MP4 only where the browser can record video.** Where it can't (older Safari, without MediaRecorder), MP4 is greyed with a tooltip and GIF is the format, instead of "This browser can't record" after pressing Record.
- **Tracking in older Safari.** Browsers without canvas letter-spacing (Safari before 18.4) now space the letters too, placed one by one with the font's own kerning kept. Elsewhere tracking is drawn exactly as before.
- **The recording timer** has fixed-width figures, so the island no longer shifts every second and Stop stays put.
- **Downloads** go through one path that adds the link to the page for the click and keeps its address for a minute, as the shared core does.
- **Export's state** (counting down, recording, making a file) is a class on the island set by the script, not CSS reading the text of an inline style.

**Tests**
- `tests/tutti_check.py` – every part of Tutti on its own, framed and full screen: 84 of 84 in Chromium; still-export hashes identical to 6.1.
- `tests/xbrowser.py` – Export by what a person sees (the sheet's real height, Export showing), before and after a countdown, a recording and a GIF, in Chromium, Firefox and WebKit.

## 13 October 2026 – Tempo 0.9.1

- **Columns and Rings:** Tracking now works (their own, plus each font's from Fonts), a touch tighter to start, with Space between – the gap between columns and between rings is a word space that follows the tracking. Rings sit one space apart measured from the longest word on each, so the worst case is always one space and shorter words get more room. Rings can add the date: day, date, month and year, a ring each, outwards.
- **The dial's fill** has its own card under Face and sits in front of everything to start (or behind the hands, or behind the marks). It sweeps, moves in sections, or in fading sections – sixty for the minute and second hands, twelve for the hour.
- **Promo GIF rebuilt:** the same size and drawing as the stills (the device at its full 1920 × 1080; the screen at the MP4's size), the main colours kept exact – background, device, theme – so a still and its GIF swap in a gallery without a jump; each frame stores only what changed. **Real time:** stills now follow the moment shown too – the first still is that moment, the rest drawn from it – and every export uses the moment shown until Another moment picks a new one.
- **Promo (internal):** a still for every theme in the day (at least three); everything again inside a device – a transparent PNG you load once, its size and placing kept, on #F5F5F3 – as stills, GIF and MP4; Real time plays from a random moment; files are named Tempo_ScreenSaver_Ensemble_Design_Studio_<name>_<number>.

## 13 October 2026 – Tempo 0.9

**Colour**
- **Themes you can see.** The Colour card shows every theme as a tile in its own colours, built in and yours, with the one in use ringed and its colours always listed below – no more hunting in a fold. The same for The time, In words, the dial, and Columns and Rings.
- **Change any theme.** Change a colour of a built-in theme and it's kept as a copy among yours (My Noon), the built-in one untouched. Your themes save as you go, and can be renamed or deleted.
- **Every hour, your way.** Tick the themes to play through the day, in order, and say how long each lasts (1 to 12 hours). A strip shows the whole day; click an hour, or a theme, to see it in the preview and change it. The colours fade across over a second and a half when the hour turns.
- **Older downloads keep their colours.** A screen saver downloaded before 0.6 whose colours change every hour now opens with its themes, in order, ready to change (they were lost before, and the colour controls hidden).

**The time and In words**
- A figure rolling in is no longer cut flat at the bottom as it settles, Elastic's overshoot isn't clipped, and figures that stay glide to their new places. In words, descenders roll through whole.

**Columns and Rings** – two new ways to show the time, from Steve's mock-ups: the time and date as columns of words with today's on one line, or hours, minutes and seconds as rings of words – one ring each, or tens and units apart. Timeless Sans Medium when it's loaded; their own themes, starting white, black and warm grey. The mock-ups' wording was checked and corrected (Seventeen, not Seventeen Seven; Forty; Twenty Twenty Six; ordinals for dates).

**The dial**
- **Fill:** the face fills behind the hour, minute or second hand like a pie chart – filling then emptying, or starting empty each turn – with its reach, opacity, blend and colour.
- **Hands:** a weight for each, square or round ends, a dot or ring at the tip, a counterweight on the second hand, the centre dot's size, and opacity and blend (multiply, screen, overlay, difference).

**Export**
- **Download everything:** one zip named as the screen saver, with the Mac and Windows screen savers, the HTML file and one read-me – Made with Tempo by ENSEMBLE, how to install each, the web address and email.

**Promo (internal – comes out before Tempo goes public)**
- A Promo card: a sheet of each screen saver's settings and colours, three stills on three dates (one per colour change), and a seamless 5, 10 or 20-second loop through the hours (or round the clock) as GIF and MP4 – or all of them in one zip. Play the loop runs it in the preview; with Preview it fills the window.

## 10 October 2026 – the interface, refined (same versions: Tempo 0.8, Rubato 1.1, Tutti 6.1)

A refining pass on the system that went live on 9 October, with a glitch review of all three tools in light, dark, Preview, phone width and embedded. No tool does anything new; exports are unchanged.

**All three**
- **Light by default.** Dark only once someone chooses it with the button, then remembered (it no longer follows the computer).
- **No drop shadows anywhere.** Surfaces are told apart by hairlines and fills.
- **Preview slides the panel away.** A panel button top left brings it back over the work; a click on the work puts it away.
- **A click on the work only closes** an open sheet or panel – it no longer reaches the work too (it used to start Rubato's kerning).
- **Open sheets go almost solid**, so the work behind doesn't smudge their text.
- **Tooltips:** a control you've just pressed stays quiet until the pointer leaves it (Preview's tip used to pop up again under the pointer), and the button that opened a sheet doesn't put its tip over it.
- **Sliders:** the tick hides at either end of the track.
- **Segmented controls** that wrap share the last row's width, so no option is left on its own; one-column lists size to their labels.
- **Colour swatches** keep their hairline, so white on white still shows.
- **Phones:** the island runs along the bottom – view controls scroll sideways (the far end fades when there's more), Export stays at its right end, and Presets shrinks to an icon beside it. An open sheet takes the full width.
- **Embedded on the Ensemble site:** in an iframe, a tool shows as a framed object on the page's colour; `?app` in the URL keeps it edge to edge. Embed code for both Tutti pages is in `tutti/EMBED.md`.
- Sheets have their sections divided by hairlines; em dashes are en dashes throughout.

**Tutti 6.1**
- Export sheet rebuilt on the system: no bold, labelled Format and Countdown, a round tick for Ping-pong. PNG and SVG read **Save PNG** and **Save SVG**, so they read as actions, not a choice.
- Threshold edges use the system slider; an odd edge out takes the full row.
- Preview fills the window with the canvas; an empty canvas no longer shows as a blank box.
- The empty stage says "from the panel" on phones, where the panel is below.

**Rubato 1.1**
- Font rows: Remove is a small × with a tooltip, so long names have room.
- The image row's empty state wraps instead of running off.

**Tests**
- `tempo_check` 119 of 119, `rubato_features` 43 of 43, `rubato_regress` all 14 looks identical to 0.9, `split_check` 15 of 15, `licence_check` 4 of 4, `parity` all match.
- Tutti's PNG, SVG and canvas are byte for byte the same as 6.0.

## 9 October 2026 – one interface: Tempo 0.8, Rubato 1.1, Tutti 6.1

The UI stream's system on all three tools (`shared/UI.md`; the reasoning and mock-ups are at `/ui/review/`). Every control does what it did; it has only moved or been restyled.

**All three**
- **The work fits, then fills.** The work sits in the clear space beside the panel. **Preview** (the expanding arrows top right, or F) fills the window with it. The panel and controls stay where they are; Esc or F comes back.
- **A frosted panel floats on the left**, top to bottom. Its right edge drags (280–440 px). The header stacks: name and version, then By ENSEMBLE in grey.
- **Top right:** chips with the size and one fact ("1680 × 1050", "Your local time", "Demo face"), then Preview and light/dark. Light or dark follows the computer the first time, then is remembered.
- **The island**, bottom centre, holds what you do to the view, then **Export**, which grows into a sheet. Status ("Saved …") shows in the island.
- **Cards say what's set when shut** ("24-hour · Comma · Leading zero"), and folds inside cards do too. Most cards start shut, except the one for what you're working on. Chevrons replace + and –.
- **One of each control.**
  - The slider has its label and value inside the track. The fill carries the value, and the tick steps aside where it would cross the words.
  - Segmented controls sit in one row or an even grid.
  - Controls are 32 px high on a 15 px base (was 16.75).
  - Corners are 12, 6 and 4 px, or fully round.
  - Grey text is darker in light mode (4.8:1, was 3.3:1).
- **Tooltips on every control:** hover a row and its tip appears; the ? shows only on hover, or for touch and keyboards.

**Tempo 0.8**
- **Show** is in the island. **Export** is a sheet from the island. **Presets** has its own capsule bottom right, which names the preset open.
- Mixing in Fonts starts shut and says how the other fonts come in.
- The preview chip reads "1680 × 1050"; the full sentence is its tooltip.
- Inline styles moved into classes.

**Rubato 1.1**
- The transport is the island: Pause, scrub, Randomise and its options, Undo. **Export** and **Randomise's options** are sheets from the island. **Presets** (starting points and saved looks) has its own capsule.

**Tutti 6.1**
- On the shared tokens and components (`build.py` puts them in at build time, with `tutti/frame.css` and `tutti/frame.js`). Its exports are unchanged: PNG, SVG and the canvas checked byte for byte against 6.0.
- Cards fold and say what's set. Randomise, Random and Reset shapes are quiet buttons in their cards.
- Export (Still or Motion) is a sheet from the island. Recording shows in the island. Pause joins the island for a video.

**Tests**
- Updated for sheets: `tests/ui_helpers.py` opens the sheet a control is in, as a person would.
- Card lists no longer include Presets, Screensaver and Export.
- The chip check reads the tooltip.
- Mixing is opened before it's used.

Results:
- `tempo_check` 119 of 119.
- `rubato_features` 43 of 43.
- `rubato_regress` all 14 looks identical to 0.9.
- `split_check` 15 of 15.
- `parity`: frames and exports as before; panel results differ on purpose.

## 8 October 2026 – Tempo 0.7

**Tempo 0.7** – Timeless built in, and Lazaar Soft drawn properly.
- **Timeless Sans is Tempo's font.** It comes with Tempo – no loading needed – and is the core font the first time 0.7 opens, also for anyone who used Tempo before. Your own fonts and font packs work as always. On: Sans Regular (core), Sans Medium, Grotesk Medium, Semibold and Black; the variable font (every weight, italics, Grotesk to Sans) is listed, off. The Fonts card credits it: free from timeless.co, under the Timeless Free Font License.
- **Kept to its licence.** The licence forbids public repositories and servers, so the fonts are never in this repo or `docs/`. They're embedded inside Tempo's page only in a private build (`site/`) – see `LICENCES.md`, including the hosting decision still to make before the live site has them. `tests/licence_check.py` fails if any trace of them reaches the repo.
- **No more screen savers named after their font.** Unnamed exports are Tempo, Tempo Words or Tempo Dial (or the preset's name).
- **Fixed: parts of glyphs going missing** – Lazaar Soft's N, M, T, n, t, k, r, 4 and more looked clipped. The font is fine; the path data Tempo made from it wasn't. A coordinate a hair below zero ran two numbers together. Fixed in the shared font loader, so Rubato too. Re-export any screen saver made with Lazaar Soft.
- A licence or read-me inside a .zip of fonts no longer counts as a font it couldn't read.
- Tests: `tests/tempo_check.py` 119 of 119 (new: exported outlines draw exactly as the font does, glyph by glyph; fonts embedded in the page load once, as the core, with their credit, and never reach exports; export names); `tests/licence_check.py` 4 of 4.

**Rubato 1.0** – the path fix above (parts of some glyphs no longer go missing); nothing else.

## 8 October 2026 – Tempo 0.6

**Tempo 0.6** – presets: save a screen saver, come back to it, and open the ones you've downloaded.
- **Presets**, the first card. Save what's on screen with a name and it joins **Yours** as a live tile – the screen saver drawn as it plays, redrawn each minute. Click a tile to open it. The card says which one is open and whether it has **changed since saved**; **Save changes** keeps the changes, **Save as new** makes another (a name already used saves over it), **Download** saves that preset as a file, **Delete** asks twice.
- **Nothing lost.** Open a preset over work that isn't saved and **Back to what you had** brings it back – kept, even across a reload, until it's used or replaced. **Download all** saves every preset in one file; opening it brings them all back. Presets live in this browser, so download now and then.
- **A preset is the whole screen saver:** every setting for the time, the words and the dial, the export name, which fonts are on and which shuffle in, each font's tracking and your saved colour themes. Fonts are named, not tied to this browser, so a preset opens the same elsewhere once its fonts are loaded – and says which are missing if not.
- **Open a file** (or drop it on the page) brings back a screen saver you downloaded – the HTML, the Mac or Windows zip, or a `.scr` – ready to edit. Downloads from 0.6 carry their own preset (`edit` in the config); earlier ones are read back from their settings, so files from 0.2 to 0.5 open with everything they show (checked with real 0.4 downloads: the Lazaar look, and a clock with numerals mixed, HTML and Mac). A file that matches a preset you have opens that preset rather than a copy.
- **Built in:** presets listed in `tempo/presets.json` (the same form as a Download all file) show under **Built in** – where the twelve that ship will go. They open like yours; changes are saved as your own.
- Exports are named after the preset open, unless you type a name.
- Shared core: an optional `appDropFiles` hook lets an app take files dropped on the page before they go to Fonts (Rubato doesn't use it).
- Tests: `tests/tempo_check.py` 115 of 115 (new: save, change, save changes, open, the fonts' shuffle and tracking coming back, Back to what you had, reload, a download opened in another browser, pre-0.6 downloads for the words, the dial and the time, Mac, Windows and `.scr`, a non-Tempo file turned away, dropping a file, Delete twice, Download all and back, one preset's file, tiles drawn, built-in presets).

**Rubato 1.0** – unchanged.

## 7 October 2026 – Tempo 0.5

**Tempo 0.5** – a dial, a Noon colour theme, no more Looks.
- **As a dial**, a third option under Show, after Steve's two drawings: no type, only lines. **Marks:** Rays (running out from a space in the middle, hours and quarters standing out nearer the centre), Ticks (running in from the edge – minutes short, hours longer, quarters almost to the middle), Dots, or Hands only. **Detail:** minutes, hours or quarters. **Line weight** for the minute marks, the hours and quarters, and the hands, each on its own. An outer ring, tails, a centre dot.
- **How the hands move:** the second hand sweeps, ticks, or goes round in 58.5 seconds and waits at 12 for the minute, like a station clock; the minute hand glides or steps on the minute, and the hour hand follows it. A hand that jumps lands Snappy, Smooth or Elastic (springs past and settles), over a length you set. **Marks follow the second hand:** they light up in its colour as it passes – filling the minute, or fading behind it.
- **Colour:** Paper (the red-handed drawing), Dawn (cyan, apricot and pink hands, after the other), Noon, Night (white hands, a yellow second hand) and Signal, or your own colours for the background, the minute, hour and quarter marks and each hand. Change theme every hour works as it does for the time and the words. **Size** and **Drift** under Position.
- A dial carries no fonts: the export is small (about 70 KB), named **Tempo Dial** unless you type a name, and Fonts steps aside while the dial is showing.
- **Noon:** the pale grey, acid yellow and near-black of Steve's 16,00 grab – numerals yellow, the comma dark. The first theme for The time and what it opens in; in the words it replaces Acid (the time yellow, the rest dark). **Ultraviolet** has gone from both. Colours already chosen stay as they were.
- **Looks are gone** from In words – the panel is the settings themselves. Exports are named after the core font unless you type a name.
- Wording for anyone to use: Display faces is now **Other fonts**; Rotate themes every hour is **Change theme every hour**, as it is elsewhere; the page title takes an en dash, and the site's front page says Tempo does words and a dial too.
- A change made just before the page closes is saved (it used to wait 300 ms).
- Tests: `tests/tempo_check.py` 94 of 94 (new: the dial's cards, export, where the hands point for each way of moving – sweep, tick, elastic, stop at 12, step – every face and detail, trail, ring, weights, themes on the hour, the exported page drawing the same frame, Mac and Windows exports, settings remembered; Noon and no Ultraviolet; no Looks). `tests/parity.py` sets 0.8.1's colours before comparing Tempo's frames, since Tempo now opens in Noon.

**Rubato 1.0** – unchanged.

## 7 October 2026 – Tempo 0.4

**Tempo 0.4** – a font library, more ways to mix, words or figures part by part.
- **Font library.** Fonts can be switched on and off without removing them (off: kept in the list, out of the preview, the mixing and exports). Drop in a **.zip of fonts** and they all come in at once; a font already in the list (same family and style) is skipped, and so are a zip's Mac leftovers and old Mac fonts with no outlines – the toast says how many. A zip can carry `tempo-fonts.json` saying which fonts start on, which is the core, which shuffle in and each one's tracking. Fonts listed in `tempo/fonts/fonts.json` are **built in**: they show in the list, those marked on load the first time Tempo opens, the rest are one click away. Nothing is built in yet – everything in `docs/` is public, so only fonts cleared to publish go there.
- **Fonts card, tidier.** One row per font: name, Use as core, an on/off switch. Click the name for Shuffle in, its tracking and Remove. The list runs core first, then the fonts on, then those off.
- **Mixing:** fonts can come **In turn** (through the list in order) as well as **Shuffled**; a new way in, **A few at random**, with **How many** from the odd one to all – for the numerals of The time (the odd figure in a display face, or every one) and for the words. Per-numeral and per-part choices are as in 0.3.
- **Words or figures, part by part:** the time, seconds, date and year each in words or figures (“It is 11.47pm and fifty nine seconds on Wednesday the twenty eighth of October 2026”). **Say 0 as** oh or zero (“nine oh five”, “nine zero five”).
- **A Lazaar look**: the time, the day and the month in Lazaar, the rest in the core font. Looks can name fonts; a font that isn't switched on is replaced by Shuffle.
- **Panel:** The time or In words comes first. Folds inside the cards (Mixing, Words or figures, Spacing, Your colours) open and shut and remember it.
- Line spacing follows the core font whichever fonts come in, and capitals match the core font's height (as in 0.3).
- 0.3's settings carry over (numbers in figures become figures for every part).
- A pressed small button no longer loses its label under the pointer (shared stylesheet, so Rubato too).
- Tests: `tests/tempo_check.py` 80 of 80 (new: zip packs with duplicates and leftovers, a pack's settings, on and off, built-in fonts, in turn, a few at random, words or figures, zero, folds).

**Rubato 1.0** – no change to how it works, apart from the hover fix. **Shared core:** a style can be off (`off` saved with it, left out of the engine); `loadFiles()` reads a .zip and skips fonts already loaded; new optional hooks `appFontList`, `appFontsLoaded`, `appFontsRestored`. Rubato never switches a font off and has no hooks, so for Rubato the only differences are a .zip working and a font already loaded being skipped rather than added twice.

## 7 October 2026 – Tempo 0.3

**Tempo 0.3** – stands on its own, one Fonts card, fonts mixed into the time as well as the words.
- **Apart from Rubato.** Tempo keeps its own fonts (in its own browser store) and its own settings, and reads nothing of Rubato's. Gone: Saved looks, the Rubato text second line, Add Rubato motion, the Rubato image, and reading Rubato's settings. The first time 0.3 opens it copies the fonts loaded in Rubato, and anything an earlier version left only under Rubato's settings, so nothing goes missing – after that a font added in one doesn't appear in the other.
- **Show is The time or In words.** Mixed type is part of In words: with one font it's the plain In words, with more the other fonts mix in. The looks are Reference, Stack, Poster, Typewriter, Hours, Social, Latest and Medley – Night and Spotlight are gone.
- **Fonts, at the top, is one card.** Each font has **Use as core** (the font that carries the time and the sentence – what was the default style and Mixed type's base face), **Shuffle in** (what was "Use in style swaps"), and its own **Tracking**, which goes with that font wherever it's used – Lazaar can be opened up once and stays right in every look. The Tracking under Type and Clock tightens the core font on top of that. Under the list, **Mixing** holds what was the Typefaces card: how the other fonts come in, each part's font, when they change, a font for each word, little words staying in the core font, matching cap heights. The Highlight style option has gone – set the time's own font under Mixing instead.
- **The time: a font for each numeral.** Hours, minutes and seconds (tens and units) and the second line can each be the core font, a font of their own, or Shuffle; or the numerals that just changed come in another font; or one numeral at a time stands out. Cap heights match, fixed-width numerals stay fixed within each font, and the size holds whichever font comes in.
- **The preview takes the shape of the screen Tempo is open on.** The Laptop, Display and Portrait buttons have gone.
- Settings from 0.2 carry over: Mixed type opens as In words with its base face as the core and its parts as they were; In words with a highlight style sets the time in that font; plain In words stays plain; Saved looks opens on The time; a Rubato-text second line becomes none.
- Exports carry each numeral's and each part's font, each font's tracking, and name the core font. Files are named after the screen saver (“tempo-stack-screensaver.html”, “poppins-screensaver.html”).
- Tempo's type engine moved from `shared/engine.js` to `tempo/engine.js` (Rubato has had its own since 1.0). It learnt to set a character in another font, scaled to the core font's cap height, with each font's tracking. With one font it draws exactly as before.
- Tests: `tests/tempo_check.py` 67 of 67; `tests/split_check.py` now checks the two apps are kept apart, 15 of 15. `tests/parity.py` names the results that differ on purpose and why (Tempo's exports and panel); the clock frames and the exported engine's frames still match 0.8.1.

**Rubato 1.0** – no change to how it works. **Shared core:** each app now has its own font store and its own storage keys, with no fallback to Rubato's (`store()`, `fontStore()`), and an app can draw its own font-row controls (`appFontRow`). Rubato's store and keys are the same as before, so nothing moves for Rubato.

## 7 October 2026 – Tempo 0.2

**Tempo 0.2**
- New: **In words**, a third option under Show. The time is written out as a sentence and set Swiss-style – flush left, ragged right, tight leading: “It is eleven forty seven and fifty nine seconds on Wednesday the twenty eighth of October twenty twenty six”.
  - Always the time and date of the computer it's on, so a screen saver downloaded in New York shows New York's. Nothing is fetched; it works offline.
  - Looks: six starting points for the screen savers Ensemble ships – Reference, Stack, Poster, Night, Typewriter, Hours – each one click. Exports are named after the look (“Tempo Stack”) unless you type a name, so variants don't replace each other when installed.
  - Sentence: every part switches on and off – It is, time, seconds, day, date, month, year, full stop – and the grammar closes up around what's left (“It is nine forty in November”, “It is Tuesday the third of November”).
  - Typesetting: lines break only between phrases (“eleven forty seven”, “the twenty eighth”, “twenty twenty six” stay whole) and never end on “on”, “the”, “of”, “in” or “and”. A phrase too long for the line gives way after “It is” first, then between hours and minutes. A short last phrase pulls a neighbour down rather than sitting alone. Optical margin lines each line's ink up on the margin. Word spacing.
  - Layout: Paragraph, or Stacked (one phrase to a line). Size: set it, or Fit the screen – sized for the longest sentence the settings can make, so the type never changes size as the time does.
  - Type: sentence case, lower case or capitals; numbers in words or figures; highlight the time, the latest change, the time and date in their own colours, or nothing, optionally in another loaded style (a bold, say); line spacing, tracking and line length. Always one typeface and one size.
  - Tried and set aside for now: place, sunrise and sunset, and weather. A screen saver can't ask where it is, and Ensemble's variants must be right wherever they're installed. The working version is in commit `c0cc72c` for the planned website.
  - Change: Roll, Fade, Type or Cut; whole words or only the letters that changed; small reflows glide, bigger ones leave and arrive like a departure board. Play a change replays one in the preview.
  - Position and colour: align, vertical position, margin and drift; six starter themes (Apricot, from Steve’s reference, then Red, Paper, Night, Signal, Ultraviolet) or your own three colours; optional theme change on the hour.
  - Exports to HTML, Mac and Windows as the clock does. Every letter and figure the sentence can use is baked in.
- New: **Mixed type**, a fourth option under Show (the four now sit two by two). The time in words, carried by a plain base face (a Swiss grotesk), with display faces coming in and out of it. A first pass with options to try, for Steve to refine.
  - Typefaces card: the base face, then how the display faces come in – **Each part** (It is, time, seconds, day, date, month and year each set to the base face, a face of its own, or Shuffle), **Latest change** (whatever just changed arrives in a display face and goes back at the next change) or **One part at a time** (a single part featured, moving on each change, minute or hour).
  - Shuffle takes a new face when the part's words change, or every minute or hour, and never the same face twice running. Display faces are the styles ticked “Use in style swaps” in Fonts, apart from the base face.
  - Options: a face for each word; little words (on, the, of, in, and) stay in the base face; match cap heights, so every face's capitals stand as tall as the base face's. Tracking tightens the base face only – display faces keep their own spacing.
  - Highlight can colour the display faces. Fit leaves room for the widest display face a word could take, so the size still never changes.
  - Four looks to start: Social (after Steve's Summer Social posters: Acid grey and yellow, stacked, the time and the day shuffled), Latest, Spotlight and Medley. New Acid theme (#D5D7D6 and #F7FD70).
  - Exports to HTML, Mac and Windows with every face baked in. In words and clock exports carry nothing of it.
- Fixed: Laptop, Display and Portrait now move their highlight when clicked.
- Exports say Tempo, not Rubato: “Made with Tempo by Ensemble” in the read-mes, Tempo as the name when no font is loaded, `window.__TEMPO__` inside the page, and the Windows host’s about box and folder (`%LOCALAPPDATA%\Tempo Screen Savers`). The Windows host was rebuilt with zig 0.16.0, which rebuilds the 0.1 source byte for byte, so only the wording changed.
- Clock and Saved looks work and look exactly as before. `tests/parity.py` now maps Tempo 0.2’s intended changes back (renames, the new runtime inside exports, the rebuilt Windows host, the extra Show option) and then requires an exact match with 0.8.1. New `tests/tempo_check.py` covers 0.2: sentences at pinned moments, line breaks across a year of times, fit, optical margin, looks and export names, and the same export read in New York.
- A Windows screen saver installed from 0.1 keeps its files in `Rubato Screen Savers`. That folder can be deleted once a 0.2 export is installed.

**Rubato** – unchanged. **Shared core** – unchanged: Tempo adds its own settings from `tempo/app.js`.

## 7 October 2026 – Decentish 0.4

**Decentish 0.4** – plans laid out like a friend would, with the way there and back. No changes to Rubato, Tempo or Tutti.
- **The distance dial means something now.** On the doorstep: what's right here, in yards, nothing more than 12 minutes from your door. Nearby: somewhere past the doorstep, up to about two miles, with the distance in miles and how to get there (walk, or a taxi with the cost), and back towards home when there's nothing more out there. Further afield: town or another destination (Salford Quays, Chorlton, Didsbury…), by tram or taxi, there and back.
- **Getting about:** tram stops from the map and the Metrolink network in the page – which stop, which stop to, minutes, any change, the walk at each end, the last tram, and a taxi when the trams have stopped. Taxi minutes and rough cost. Nearest tram stop in the facts strip. All estimates – no live times yet.
- **The writing:** one sentence per stop, each relating to the last – next door, a few doors down, round the corner; "The Park shuts at half eleven, so then Pizza Monton, next door…"; "When you're hungry…"; "Finish at…". Then the way back, and one near home if the night allows. Plain voice for now, on purpose; openers, weather and sign-offs keep their three voices.
- **What counts as good:** real ale, own brewery, listed buildings, Wikipedia, free entry, beer gardens when the weather's right, chains marked down (hard for Blair), "the only one still serving", "open latest", and a picks list (`PICKS`) for places worth a line. No ratings yet.
- **Not just pubs:** parks while it's light and dry, galleries and museums, coffee, bowling, crazy golf, escape rooms, arcades and karaoke. Stops capped at 3, 4 and 5 by profile.
- It tries several first stops and keeps the best whole plan, so it doesn't strand you at a pub with nothing near it.
- Tested: `tests/decentish_check.py`, 60 of 60, all sources faked and the dice loaded (Monton Road's real hours; made-up places in Eccles, Worsley, town, the Quays and Chorlton; tram stops roughly where the real ones are). `tests/out/decentish.md` has every plan by When and by distance. Not tested: the real services from a phone, the bigger map query on a real signal, and whether the real map's tram stop names match the network list.

## 7 October 2026 – Decentish 0.3

**Decentish 0.3** – a distance dial, and a voice that flows. No changes to Rubato, Tempo or Tutti.
- **How far:** On the doorstep · Walking distance · Worth the trip (the only setting that goes into town). If nothing fits, it widens and says so before rolling to tomorrow.
- **The voice, rewritten:** plan steps are now clauses stitched into one sentence with each stop's own connectors, instead of a run of full stops. Three lines on screen: opener, plan paragraph (reason, plan, weather), sign-off. "A pint at MaltDog Monton first, 9 minutes away and open till eleven, then a curry at The Naz, just round the corner, and one for the road at The Park before it shuts at midnight."
- Small fixes to the words: no "an Italian at Eden Italian Restaurant", "scran" when the map doesn't say what's served, "the Northern Quarter".
- Tested: `tests/decentish_check.py`, 42 of 42, all sources faked. `tests/out/decentish.md` now also shows each scenario across the distance dial.

## 7 October 2026 – Decentish 0.2

**Decentish 0.2** – from a status report to a plan. No changes to Rubato, Tempo or Tutti.
- **When:** Now · Soon · Tomorrow. If nothing fits, it rolls forward to tomorrow and says why.
- **The dial is now three profiles**, not just three voices: Tony Blair on a culture trip (galleries by day, dinner and a glass of something by night, no takeaways), Three pints and a meal deal (pub, food, pub, on foot), Pissed-up uncle on a mad one (pubs, bars, clubs, into town in the evening, food after 23:00). Each picks different places, goes different distances and stops at a different time – so late at night it's no longer "bed" at every setting.
- **Stitched plans:** steps chained by time – open when you'd arrive, open long enough to be worth it – written as one paragraph, with last orders ("The Park's got 20 minutes left…"), the trip into town, and a weather line for the plan's hours.
- **Manchester focus:** Greater Manchester only for the full experience; outside it, the basics and a line saying so. From the suburbs it also looks in town (Piccadilly Gardens), about 30 minutes from Monton.
- Receipts at the foot: each step's time, place, distance and closing time. *Another plan* re-picks without fetching again.
- Tested: `tests/decentish_check.py`, 40 of 40, all sources faked (Monton Road's real hours, made-up town venues, the Northern Quarter, Barra, map down, no permission, bad postcode). Every line for every scenario, dial and When is written to `tests/out/decentish.md`. Not tested: the real services from a phone.

## 6 October 2026 – Decentish 0.1

**Decentish 0.1** – new, unlisted prototype at `/decentish/`. No changes to Rubato, Tempo or Tutti.
- Asks for your location (or a postcode), then pulls the time, the place name, the weather (with earlier today and tomorrow), sunset, and everything open within a 15-minute walk from OpenStreetMap, with its opening hours.
- Sorts the moment into busy, all shut, quiet or remote, and writes a few short lines and a verdict. A dial sets the voice, from Buttoned up to Pissed-up uncle on a mad one. The dial changes the words and the background colour; the facts strip at the foot never changes.
- Talks while it loads, in the dial's voice. A stopwatch shows how long each source took.
- Test switches for any postcode and time. Workings lists every place it found and why it's open or shut.
- One typeface: ABC Diatype Bold if it's installed on the device, Hanken Grotesk Bold otherwise.
- Tested: `tests/decentish_check.py`, 36 of 36, with every source faked (Monton Road as Google listed it on 6 October, a made-up remote pub on Barra, the map service down, location refused, a bad postcode). Not tested: the real services from a phone – that's what this version is for.
- `build.py` copies it into `docs/decentish/` after a syntax check.

## 6 October 2026 – Rubato 1.0

**Rubato 1.0** – lockups, physics, kerning, three new tricks and a calmer panel. Everything 0.9 could do still works and draws the same.

New
- **Blocks.** Up to four blocks of text, each with its own font and size, stacked as a lockup. Fit sizes the lockup to the frame; Fill width makes every line full width; Manual sets block 1's size. *Text › + Add block.* Sequence and Repeat stay single-block for now.
- **Physics.** *Pull apart* sends each block to a point in the frame – picked on a 3×3 pad, or Auto (each to its own corner) – holds, then lets the lockup snap back. Feel: Magnetic, Smooth or Elastic. *Personal space* keeps blocks from overlapping on the way. Hover the Physics card to see each block's point and space on the preview. Works on a single block too (it drifts to its point and back).
- **Kerning.** Hover between two letters on the preview for a caret, click to pick the pair, then ←/→ (10/1000 em), Shift for 50, Backspace to clear, Esc to finish – or the −/+ buttons on the stage. The type settles while you kern so you see true spacing. Kerning belongs to a block, applies wherever the pair appears in it, and is listed (and removable) in Text › Kerning.
- **Jitter** (Motion) – nervous, twitching type, with Glitch for whole-line jumps.
- **Assemble** (Motion) – letters scatter across the frame, fly in and lock into place, hold, then scatter again.
- **Scramble** (Variants › Swap) – letters cycle through random letters, numbers or symbols, decode into your text, hold, then scramble again.
- **Presets as the front door.** Twelve live tiles at the top of the panel, each playing your own word in your fonts and colours. Added Wave, Pulse, Jitter, Assemble and Scramble to the seven starting points (all still placeholders until Steve curates them).

Changed
- **Panel regrouped:** Presets, Fonts, Text, Layout, Motion, Variants, Physics, Colour, Export. Sequence's handover controls moved into Text, Repeat into Layout, Image into Colour, Loop length and seed into Motion.
- **Fewer sliders, nothing removed.** One kind of control per kind of value: steppers for counts, dials for angles (Tilt, Twist, Rotate, Spin, Sway), a two-handled slider for the variable-axis range, one In/Hold/Out bar instead of three sliders (Transitional, Assemble, Scramble, Physics), and a path pad for Rise + Drift (Fluid) and Jump + Shift (Snappy). Fine controls fold under *More* in Motion, Variants and Physics, and stay open or closed as you left them. Every control still resets on a double-click of its label.
- Randomise includes the new tricks and a Physics area (off by default), and keeps shared timings within the loop.
- Exports from Jitter and Assemble are named after the trick. Settings files are version 3 (they load in the same way; 0.9 ignores the new parts).

Under the hood
- Rubato has its own copy of the type engine (`rubato/engine.js`), so none of this reaches Tempo. The only change in `shared/` is Rubato's one-line description on the index page (`shared/home.html`); Tempo's build is byte-identical.
- 0.9 stays live at /rubato/0.9/ (from `archive/rubato-0.9.html`). It keeps its own settings (`rubato-0.9:…`), reading 1.0's the first time, so opening it never overwrites 1.0's blocks or kerning.

Tests
- New `tests/rubato_regress.py`: 14 looks covering every 0.9 feature, each compared with 0.9 at six points in the loop plus SVG and PNG exports – all byte-identical. A control case (kerning) proves the comparison can tell.
- New `tests/rubato_features.py`: 43 checks on everything above, including that every new trick and physics loop joins up seamlessly.
- `tests/split_check.py`: 13 of 13. One check updated, because Presets now sits above Fonts.
- `tests/parity.py` (against 0.8.1): every Tempo result matches. Rubato's intended differences: the panel read-out (regrouped), the tip count (92 → 110), and Randomise results (new modes and control order mean different random draws). One Tempo live-preview frame in t3 differed once and matched on two reruns – the reference varies on that frame too.
- Not tested: video recording (real time, unchanged code), Adobe Fonts (blocked in the test browser), real touch devices.

## 6 October 2026 – live on GitHub Pages

No app changes – Rubato 0.9, Tempo 0.1 and Tutti 6.0 as below.
- GitHub Pages is on, serving `docs/` from `main` at https://steviewaring-arch.github.io/ensemble-tools/.
- Rechecked from a fresh clone: `build.py` reproduces `docs/` exactly; `tests/parity.py` 87 of 87 byte-identical to 0.8.1; `tests/split_check.py` 13 of 13. `reference/rubato-0.8.1.html` matches the live v0.8.1 artifact byte for byte, and `tutti/index.html` (spot-checked) is Tutti 6.0 as uploaded, served unchanged.

## 6 October 2026 – repo set up

**Rubato 0.9** – Rubato 0.8.1's Studio tab as its own app.
- No changes to how anything works or what it exports. Proven against 0.8.1 by `tests/parity.py`.
- The Screensaver tab has moved to Tempo, so the Studio/Screensaver switch is gone.

**Tempo 0.1** – Rubato 0.8.1's Screensaver tab as its own app.
- Same controls, previews and exports (HTML, Mac `.saver`, Windows `.scr`) – the exported files are byte-for-byte what 0.8.1 makes.
- Reads Rubato's fonts, saved looks, texts and glyph picks from the same browser. Keeps its own settings under `tempo:` keys; the first time it opens it picks up any screen saver settings saved by Rubato 0.8.1.
- Wording that pointed to "the Studio tab" now points to Rubato (eight labels and tips).

**Tutti 6.0** – copied in unchanged.

**Shared core** – design tokens, components, type engine, font loading, control builders, tooltips, downloads and the GIF encoder now live in `shared/` and are built into each app by `build.py`.

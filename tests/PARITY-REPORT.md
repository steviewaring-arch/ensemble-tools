# Parity report – Rubato 0.9 and Tempo 0.2 vs Rubato v0.8.1

Run on 6 October 2026 against docs/ as committed (Tempo 0.2 with In words, its looks and the export name). 87 results:

- 78 byte-identical to two runs of the reference.
- 9 differ only by Tempo 0.2's intended changes. `tempo02()` in `parity.py` undoes them – the Rubato → Tempo renames, the 0.2 screen saver runtime inside each export, the rebuilt Windows host, the extra Show option and the Export card's Name field, and the Mac re-signing that follows from the page changing (only code-signature bytes differ in the binary) – and the result then matches 0.8.1 byte for byte.

Two live-preview frames (screen saver preview, roll at 150 ms) catch a drift or roll mid-step, so 0.8.1 lands on one of two frames from run to run. `KNOWN_NOISE` in `parity.py` allows each the largest difference measured between two runs of 0.8.1 itself. In this run both matched exactly.

`tests/tempo_check.py` (35 checks) covers what's new in 0.2; `tests/split_check.py` (13 checks) passes, reading the export's settings from `window.__TEMPO__`.

## t1 – Fonts: styles, variable axes, instances, axis animation, SVG, picker, reload.

- same: styles – ["Poppins Regular", "Lora Regular", "Poppins Bold"]
- same: axis controls – 1 sliders, 1 menus
- same: after + Another instance – ["Poppins Regular", "Lora Regular", "Lora Medium", "Poppins Bold"]
- same: axis switch visible – True
- same: axis frame 0 – 51893 bytes, sha256 9c399fd009e8
- same: axis frame 250 – 52520 bytes, sha256 822b7b5b9675
- same: axis frame 500 – 51961 bytes, sha256 39d96c305885
- same: axis SVG – 4125 bytes, sha256 92ca7c44c110
- same: axis SVG (file name) – lazaar-still-frame.svg
- same: after axis slider – ["Poppins Regular", "Lora wght 650", "Lora Medium", "Poppins Bold"]
- same: picker – 4 rows, 16 tiles
- same: Studio panel – Fonts / – / Poppins Regular / Alternates for 28 characters / Use / Remove / Use in styl...
- same: after reload – ["Poppins Regular", "Lora wght 650", "Lora Medium", "Poppins Bold"]
- same: after reload frame – 50997 bytes, sha256 c0da00cab7e2

## t2 – Sequence transitions, stretch and repeat, tooltips, randomise and undo.

- same: Roll 300 – 29975 bytes, sha256 c32b23f20158
- same: Roll 350 – 27110 bytes, sha256 67ee32fce49d
- same: Roll 400 – 32496 bytes, sha256 fc97a0afff52
- same: Roll 450 – 44431 bytes, sha256 9ade4c50cec6
- same: Stretch 300 – 40128 bytes, sha256 2b6cf6c6bf26
- same: Stretch 350 – 27110 bytes, sha256 67ee32fce49d
- same: Stretch 400 – 42302 bytes, sha256 2812263baa1e
- same: Stretch 450 – 51772 bytes, sha256 14e5d4f34fe5
- same: Fade 300 – 37696 bytes, sha256 499252289b3e
- same: Fade 350 – 27110 bytes, sha256 67ee32fce49d
- same: Fade 400 – 39739 bytes, sha256 e1b22dafee61
- same: Fade 450 – 51073 bytes, sha256 5f7a0a5bd983
- same: Cut 300 – 41330 bytes, sha256 38d34ffaadc2
- same: Cut 350 – 28627 bytes, sha256 b1bd9f537f93
- same: Cut 400 – 43142 bytes, sha256 326dc90b2bbb
- same: Cut 450 – 52088 bytes, sha256 18b1360a2af2
- same: Together 300 – 49968 bytes, sha256 e427c4c2d6b4
- same: Together 350 – 51063 bytes, sha256 74ef61520344
- same: Together 400 – 46699 bytes, sha256 38626ab6c013
- same: Together 450 – 50455 bytes, sha256 609414ac8e57
- same: stretch on – 58730 bytes, sha256 2f4a6cfad481
- same: stretch off – 54707 bytes, sha256 f3bd812ef009
- same: repeat, stretch off – 67950 bytes, sha256 e97b0fe30fe9
- same: repeat, stretch on – 86224 bytes, sha256 d41ce8512bb0
- same: tooltip – 1 shown: When Variants is set to Styles or Both, letters can change into this style. Un...
- same: ? count – 92
- same: randomise menu open – True
- same: randomised (everything) – 48521 bytes, sha256 c954ea75f074
- same: settings after randomise – {"texts":["LOVE\nHATE","Display"],"seq":false,"tracking":200,"leading":1.97,"aspect":"1...
- same: menu after Escape – False
- same: settings after undo – {"texts":["LOVE\nHATE","Display"],"seq":false,"tracking":-45,"leading":1.69,"aspect":"1...
- same: randomised (within limits, R key) – 263285 bytes, sha256 57fb41c5f02a
- same: settings after R – {"texts":["LOVE\nHATE","Display"],"seq":false,"tracking":5,"leading":0.93,"aspect":"1:1...
- same: randomise options – {"level":"gentle","groups":{"motion":true,"variants":true,"sequence":true,"repeat":true...

## t3 – v0.6 font migration, then screen saver HTML + Mac exports, then GIF + PNG.

- same: migrated styles – ["Poppins Regular", "Poppins Bold"]
- same: migrated settings – {"fit": "block", "stretch": true, "baseSlot is 2nd style": true, "picks": {"a": ["200",...
- same: default style – [["Default"], "Poppins Bold"]
- same: screen saver preview – 81249 bytes, sha256 a71e2418067f
- same apart from Tempo 0.2 changes: screen saver HTML – export renamed to Tempo and carries the 0.2 runtime
- same: screen saver HTML (file name) – lazaar-screensaver.html
- same apart from Tempo 0.2 changes: Mac zip – only signature bytes differ in the binary; page and read-me renamed to Tempo; re-signed over the new page
- same: Mac zip (file name) – Poppins screen saver for Mac.zip
- same: GIF – 943987 bytes, sha256 32d695e39775
- same: GIF (file name) – lazaar-fluid.gif
- same: PNG – 66611 bytes, sha256 177c4dd86599
- same: PNG (file name) – lazaar-fluid-frame.png
- same: exported page errors – []

## t4 – Screen saver panels, digit roll timing, looks mode, Windows + Mac exports.

- same: saver cards – ["Fonts", "Screensaver", "Clock", "Numerals", "Change", "Position", "Colour", "Export"]
- same apart from Tempo 0.2 changes: Screensaver panel – Show now also offers In words; Export has a Name field
- same: roll at 150 ms – 89876 bytes, sha256 de0eb35f5350
- same: roll at 450 ms – 94219 bytes, sha256 a5fb685ba7b0
- same: roll at 750 ms – 93996 bytes, sha256 ff11d4c2a495
- same: roll at 880 ms – 93996 bytes, sha256 ff11d4c2a495
- same: roll at 930 ms – 93996 bytes, sha256 ff11d4c2a495
- same: looks cards – ["Fonts", "Screensaver", "Position", "Export"]
- same: drift visible in looks – True
- same apart from Tempo 0.2 changes: Screensaver panel, saved looks – Show now also offers In words; Export has a Name field
- same apart from Tempo 0.2 changes: Windows zip – Windows host rebuilt with Tempo wording; page and read-me renamed to Tempo
- same: Windows zip (file name) – Poppins screen saver for Windows.zip
- same apart from Tempo 0.2 changes: Mac zip – only signature bytes differ in the binary; page and read-me renamed to Tempo; re-signed over the new page
- same: Mac zip (file name) – Poppins screen saver for Mac.zip

## t5 – The exported screen saver page renders the same frames.

- same apart from Tempo 0.2 changes: screen saver HTML – export renamed to Tempo and carries the 0.2 runtime
- same: screen saver HTML (file name) – lazaar-screensaver.html
- same: engine frame 0 – 84847 bytes, sha256 a8c1d23b4bf1
- same: engine frame 1 – 84767 bytes, sha256 ba9a238ade55
- same: engine frame 2 – 87762 bytes, sha256 8594e4f3c439
- same: engine frame 3 – 87823 bytes, sha256 01e7e83b0dff
- same: engine frame 4 – 87823 bytes, sha256 01e7e83b0dff
- same: engine frame 5 – 88146 bytes, sha256 d2fd9ed6ff2d

## t6 – Mac and Windows exports with a single font.

- same apart from Tempo 0.2 changes: Mac zip – only signature bytes differ in the binary; page and read-me renamed to Tempo; re-signed over the new page
- same: Mac zip (file name) – Poppins screen saver for Mac.zip
- same apart from Tempo 0.2 changes: Windows zip – Windows host rebuilt with Tempo wording; page and read-me renamed to Tempo
- same: Windows zip (file name) – Poppins screen saver for Windows.zip

**All results match.**

# Parity report – Rubato 1.1 and Tempo 0.9 vs Rubato v0.8.1
Run on 13 October 2026 against docs/ as built. 89 results, all accounted for:
- 57 byte-identical to the reference – Rubato's fonts, variable axes, sequence transitions, stretch and repeat, GIF and PNG exports and v0.6 font migration; Tempo's settled clock frames and the settled frames its exported engine draws.
- 2 within the difference 0.8.1 shows between its own runs.
- 30 on purpose, named with the reason – three more than 0.7: Tempo 0.9's mid-roll frames (the roll window reaches past the ink, and figures that stay glide).
`tests/tempo_check.py` 119 of 119, `tests/tempo09_check.py` 23 of 23, `tests/split_check.py` 15 of 15, `tests/licence_check.py` 4 of 4.

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
- differs on purpose: Studio panel – Rubato 1.0 regrouped the panel (Presets first, new controls)
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
- differs on purpose: ? count – Rubato 1.0 has more controls with tips
- same: randomise menu open – True
- differs on purpose: randomised (everything) – Rubato 1.0's Randomise reaches its new settings, so the draws differ – rubato_regress.py proves 1.0 against 0.9
- differs on purpose: settings after randomise – Rubato 1.0's Randomise reaches its new settings, so the draws differ – rubato_regress.py proves 1.0 against 0.9
- same: menu after Escape – False
- differs on purpose: settings after undo – Rubato 1.0's Randomise reaches its new settings, so the draws differ – rubato_regress.py proves 1.0 against 0.9
- differs on purpose: randomised (within limits, R key) – Rubato 1.0's Randomise reaches its new settings, so the draws differ – rubato_regress.py proves 1.0 against 0.9
- differs on purpose: settings after R – Rubato 1.0's Randomise reaches its new settings, so the draws differ – rubato_regress.py proves 1.0 against 0.9
- differs on purpose: randomise options – Rubato 1.0's Randomise reaches its new settings, so the draws differ – rubato_regress.py proves 1.0 against 0.9

## t3 – v0.6 font migration, then screen saver HTML + Mac exports, then GIF + PNG.

- same: migrated styles – ["Poppins Regular", "Poppins Bold"]
- same: migrated settings – {"fit": "block", "stretch": true, "baseSlot is 2nd style": true, "picks": {"a": ["200",...
- same: default style – [["Default"], "Poppins Bold"]
- same within run-to-run variation: screen saver preview – ref vs ref: 565 px differ by up to 9/255; ref vs new: 565 px by up to 9/255
- differs on purpose: screen saver HTML – Tempo 0.3 stands apart from Rubato (its own fonts and settings, no Saved looks or Rubato text, faces per numeral; from 0.5 a dial, and Noon in for Ultraviolet; from 0.6 presets, and exports carry theirs) – covered by tempo_check.py
- differs on purpose: screen saver HTML (file name) – Tempo 0.3 names the file after the screen saver, not Rubato's text
- differs on purpose: Mac zip – Tempo 0.3 stands apart from Rubato (its own fonts and settings, no Saved looks or Rubato text, faces per numeral; from 0.5 a dial, and Noon in for Ultraviolet; from 0.6 presets, and exports carry theirs) – covered by tempo_check.py
- differs on purpose: Mac zip (file name) – Tempo 0.7 never names a screen saver after its font (Timeless's licence forbids naming a product after it) – Tempo, Tempo Words or Tempo Dial
- same: GIF – 943987 bytes, sha256 32d695e39775
- same: GIF (file name) – lazaar-fluid.gif
- same: PNG – 66611 bytes, sha256 177c4dd86599
- same: PNG (file name) – lazaar-fluid-frame.png
- same: exported page errors – []

## t4 – Screen saver panels, digit roll timing, looks mode, Windows + Mac exports.

- differs on purpose: saver cards – Tempo 0.4 puts the Screensaver card (The time, In words or, from 0.5, As a dial) first; from 0.6 Presets comes before it
- differs on purpose: Screensaver panel – Tempo 0.3 stands apart from Rubato (its own fonts and settings, no Saved looks or Rubato text, faces per numeral; from 0.5 a dial, and Noon in for Ultraviolet; from 0.6 presets, and exports carry theirs) – covered by tempo_check.py
- same within known run-to-run variation: roll at 150 ms – 1708 px differ by up to 187/255 (0.8.1 against itself: 1845 px, 208/255)
- differs on purpose: roll at 450 ms – Tempo 0.9's roll is smoother mid-change: the window reaches past the ink (no figure cut flat as it settles) and figures that stay glide to their new place – stills and settled frames still match
- same: roll at 750 ms – 93996 bytes, sha256 ff11d4c2a495
- same: roll at 880 ms – 93996 bytes, sha256 ff11d4c2a495
- same: roll at 930 ms – 93996 bytes, sha256 ff11d4c2a495
- gone on purpose: looks cards – Saved looks left Tempo in 0.3
- gone on purpose: drift visible in looks – Saved looks left Tempo in 0.3
- gone on purpose: Screensaver panel, saved looks – Saved looks left Tempo in 0.3
- differs on purpose: Windows zip – Tempo 0.3 stands apart from Rubato (its own fonts and settings, no Saved looks or Rubato text, faces per numeral; from 0.5 a dial, and Noon in for Ultraviolet; from 0.6 presets, and exports carry theirs) – covered by tempo_check.py
- differs on purpose: Windows zip (file name) – Tempo 0.7 never names a screen saver after its font (Timeless's licence forbids naming a product after it) – Tempo, Tempo Words or Tempo Dial
- differs on purpose: Mac zip – Tempo 0.3 stands apart from Rubato (its own fonts and settings, no Saved looks or Rubato text, faces per numeral; from 0.5 a dial, and Noon in for Ultraviolet; from 0.6 presets, and exports carry theirs) – covered by tempo_check.py
- differs on purpose: Mac zip (file name) – Tempo 0.7 never names a screen saver after its font (Timeless's licence forbids naming a product after it) – Tempo, Tempo Words or Tempo Dial

## t5 – The exported screen saver page renders the same frames.

- differs on purpose: screen saver HTML – Tempo 0.3 stands apart from Rubato (its own fonts and settings, no Saved looks or Rubato text, faces per numeral; from 0.5 a dial, and Noon in for Ultraviolet; from 0.6 presets, and exports carry theirs) – covered by tempo_check.py
- differs on purpose: screen saver HTML (file name) – Tempo 0.3 names the file after the screen saver, not Rubato's text
- same: engine frame 0 – 84847 bytes, sha256 a8c1d23b4bf1
- differs on purpose: engine frame 1 – Tempo 0.9's roll is smoother mid-change: the window reaches past the ink (no figure cut flat as it settles) and figures that stay glide to their new place – stills and settled frames still match
- differs on purpose: engine frame 2 – Tempo 0.9's roll is smoother mid-change: the window reaches past the ink (no figure cut flat as it settles) and figures that stay glide to their new place – stills and settled frames still match
- same: engine frame 3 – 87823 bytes, sha256 01e7e83b0dff
- same: engine frame 4 – 87823 bytes, sha256 01e7e83b0dff
- same: engine frame 5 – 88146 bytes, sha256 d2fd9ed6ff2d

## t6 – Mac and Windows exports with a single font.

- differs on purpose: Mac zip – Tempo 0.3 stands apart from Rubato (its own fonts and settings, no Saved looks or Rubato text, faces per numeral; from 0.5 a dial, and Noon in for Ultraviolet; from 0.6 presets, and exports carry theirs) – covered by tempo_check.py
- differs on purpose: Mac zip (file name) – Tempo 0.7 never names a screen saver after its font (Timeless's licence forbids naming a product after it) – Tempo, Tempo Words or Tempo Dial
- differs on purpose: Windows zip – Tempo 0.3 stands apart from Rubato (its own fonts and settings, no Saved looks or Rubato text, faces per numeral; from 0.5 a dial, and Noon in for Ultraviolet; from 0.6 presets, and exports carry theirs) – covered by tempo_check.py
- differs on purpose: Windows zip (file name) – Tempo 0.7 never names a screen saver after its font (Timeless's licence forbids naming a product after it) – Tempo, Tempo Words or Tempo Dial

**All results match.**

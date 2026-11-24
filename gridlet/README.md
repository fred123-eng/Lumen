# Gridlet: Daily Mini Crossword

An original 5x5 daily mini crossword. A new puzzle drops at local midnight. It's free of ads and in-app purchases, so it's ready to wrap as a $0.99 iOS app later.

## Files
| File | What it is |
|---|---|
| `index.html` | App shell (all paths relative, so it works from a subfolder) |
| `styles.css` | Visuals, light and dark themes, animations |
| `game.js` | Game logic: grid, keyboard, timer, check and reveal, stats, archive, share, confetti |
| `puzzles.js` | Puzzle bank (`window.GRIDLET_PUZZLES`), 66 original puzzles |
| `gridlet.html` | Single-file bundle (CSS and JS inlined), made by `tools/bundle.py` |
| `tools/validate.js` | Puzzle validator |
| `tools/make_puzzles.py` | Builds `puzzles.js` from `tools/puzzles_src.json` (grids) and `tools/clues.json` |
| `tools/merge_clues.py` | Merges the hand-written clues in `tools/clues/*.txt` (`word|clue|alt clue`) into `clues.json` |
| `tools/bundle.py` | Makes `gridlet.html` |
| `tools/wordlist.txt` | ENABLE word list (172k words) used by the validator |
| `tools/generator/` | Grid-fill generator used to draft grids (frequency-ranked vocabulary plus blocklist) |
| `tools/iphone-test.js` | Headless Chromium iPhone 13 test (needs `playwright-core`) |
| `screenshots/` | Test screenshots |

## Daily puzzle
Day 0 is Nov 1, 2026 (Gridlet #1). Today's puzzle is `PUZZLES[daysSinceEpoch % 66]`, using the device's local date, so everyone gets the same puzzle on the same calendar day. The bank lasts 66 days before it repeats. Add grids to `puzzles_src.json` and clues to `tools/clues/`, then rebuild.

## Rebuild and validate
```
python3 tools/merge_clues.py && python3 tools/make_puzzles.py && node tools/validate.js && python3 tools/bundle.py
```
The validator checks:
- 5 rows of 5 `[a-z#]`, at most 6 blocks
- every white square is in both a 3+ letter Across and Down entry
- the clue count matches the grid entries, and the clue numbers and answers match what the grid spells (crossing consistency)
- every entry is in the word list
- no empty clues, no clue containing its own answer, no duplicate clue text
- no repeated entries in a puzzle, and no entry hidden inside another or sharing a 4-letter stem (e.g. RISE/ARISE)
- no duplicate grids or ids

It warns when a word is used more than 3 times across the bank.

## Features
- Tap a square to select it, and tap again to switch Across/Down. The active word is highlighted and the crossing clue is marked in the lists.
- Clue bar above a custom on-screen keyboard (no iOS keyboard pop-up, no inputs). Tap the bar to switch direction, or use the arrows for previous/next clue.
- Auto-advance to the next empty square or word, and smart backspace.
- Desktop keys: letters, Backspace/Delete, arrows (NYT-style: an arrow perpendicular to the current direction switches direction first), Tab/Shift+Tab, Enter, Space.
- Tap any clue in the lists to jump to it.
- Timer with a start screen and pause/resume. It pauses automatically when the tab is hidden or a modal is open.
- Check and Reveal for a letter, word or the whole puzzle, plus Clear. Wrong letters get a red slash, checked letters lock in blue, and revealed letters get a coral corner.
- Solves are detected automatically and trigger a gold wave across the grid, confetti and stars, a chime and haptics, then a results card. A full but wrong grid gets a gentle shake and a hint.
- Countdown to the next puzzle, auto-rollover at midnight.
- Daily streak (solved on the day itself), gold streak chip.
- Stats: played, solved %, current and max streak, average and best time (unassisted), time distribution chart.
- Archive calendar: every past day is playable, with solved and in-progress markers.
- Share text with the puzzle number, date, time and streak, and an emoji outline of the grid's shape (no letters). It copies to the clipboard, with a fallback.
- Progress saved in localStorage (wrapped in try/catch), so half-finished puzzles survive a reload.
- Light and dark modes (follows the system setting, with a toggle), 100dvh, safe areas, no pinch zoom, reduced-motion support.

Original name, branding and puzzles. Not affiliated with any newspaper's puzzles.

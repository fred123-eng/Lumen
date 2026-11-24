# Auric

Auric is an original drop-and-fuse puzzle. You pour glowing ingots into a five-column crucible. Equal neighbors fuse into the next power of two — two tiles become one doubled tile, three become a quadruple, and longer groups climb even higher. Chain reactions cascade across the well. The run ends when a column overflows the rim and the last fuse cannot save it.

**Drop · Fuse · Ascend.** Positioned as a paid $0.99 iOS game: no ads, no in-app purchases, no pay-to-win. Cosmetics only.

This is not a clone of Drop Merge or Drop the Number. The theme, name, art, and reward loop are original, and every visual is drawn in code — no copyrighted assets.

## How to play

- Open `index.html` or the single-file `Auric.html` in Safari (or any modern browser).
- Tap **Tap to pour**, then tap a column to drop the next ingot. A ghost preview follows the column; **Next** and **Then** show the upcoming pieces.
- Adjacent equal ingots (up, down, left, right) fuse. Multi-merges and chain cascades score more and sing higher.
- You may drop into a full column as a clutch play. If the overflow tile fuses away, you are saved. If it stays above the rim, the crucible overflows.
- Power-ups (Undo, Smash, Swap, Bomb, Clear) are earned in play — never bought. Each run starts with one Undo.
- From the game-over screen, one tap restarts in under a second.

On a phone, open the page in Safari. iOS Mail, Files, and Quick Look often show an HTML file as a still screen and will not run JavaScript.

To preview locally:

```
python3 -m http.server 8766 --directory /workspace/dropmerge
```

Then visit `http://localhost:8766/`.

Keys on a computer: `1`–`5` drop into a column, `Z` undoes, `Space` / `Enter` starts or restarts, `Escape` returns to the menu.

## What is in the game

1. **Instant one-tap restart (under 1s)** — after a short beat (~280ms), a single tap starts the next pour. No ads, no countdown.
2. **Next-block preview** — Next and Then, plus a ghost tile over the aimed column.
3. **Chain-combo cascades** — merging waves escalate score, pitch, particles, and screen shake. Multi-merges (3+) jump two tiers.
4. **Near-miss and “So close!”** — nearly-full columns glow red. A cascade that clears an overflow toasts “Saved!”. Game over can say “So close!” when a neighboring match almost worked, or when you were close to your best.
5. **New best** — kicker, fanfare, fireworks, and a longer haptic.
6. **Daily streak + rewards calendar** — first open of the day advances the streak (it resets if you skip a day). A 7-day reward track (jackpot on day 7) and a month calendar. Play is never locked behind the streak.
7. **Daily missions** — three challenges rolled from the date. Claim cosmetic currency when complete.
8. **Milestone achievements** — 20 badges (first pour, score marks, play counts, currency, streak, chains, and high tiles).
9. **Cosmetic shop** — 8 block themes and 7 backgrounds bought with earned coins and gems. Nothing in the shop changes rules, scoring, or difficulty.
10. **Variable rewards** — gilded bonus tiles, fortune tiles that match the board, and treasure chests after strong runs.
11. **Power-ups earned in play** — Undo, Smash, Swap, Bomb, and Column Clear, granted on longer chains and sometimes in chests. Not for sale.
12. **End-of-run count-up tally** — score, coins, and gems count up; peak fuse and longest chain are highlighted (peak-end rule).
13. **Progress bar toward the next unlock** on game over.
14. **Color psychology** — number tiers climb from cool moonlight through teal, lime, gold, copper, rose, and orchid to prismatic high tiers. Gold marks rewards. Red marks overflow danger. Backgrounds stay deep and calm, and the well shifts through five color zones as the max tile rises.
15. **Visual juice** — glowing gradient blocks, merge bursts, shockwaves, particles, screen shake, milestone fireworks, an animated title of falling ingots, and smooth easing.
16. **Forgiving start** — the first drops are mostly 2s, then 2s and 4s. Gaps are generous (5×7 well). Difficulty ramps only after the board has grown. Each run starts with a free Undo.
17. **Ethical constraints** — paid $0.99 positioning, no ads, no IAP, no pay-to-win, no energy gates. Progress is in `localStorage` under `auric.save.v1`.

## iPhone Safari notes

Touch, pointer, and click handlers are bound with a 260ms debounce. The viewport uses `100dvh` and safe-area insets. `AudioContext` is created and resumed on the first gesture inside try/catch. `localStorage` is wrapped in try/catch for private mode. Rendering uses `devicePixelRatio` with a quality scaler that drops bloom and particle counts if the frame rate falls below 60fps.

## Files

- `index.html` — shell and menus
- `styles.css` — layout and UI
- `game.js` — simulation, juice, shop, dailies, and persistence
- `Auric.html` — single-file bundle (safe concatenation of the three files above; asset paths stay relative)
- `screenshots/` — title, gameplay, a chain combo, the shop, and the end-of-run tally

Sound and mute/haptics toggles live in Settings.

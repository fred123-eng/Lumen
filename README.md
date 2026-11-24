# Lumen

A one-tap arcade flyer meant to be played in short sessions. You are a light drifting through neon gates. Tap to flap, thread the gaps, and chase a slightly better score than last time.

This is positioned as a paid **$0.99** game: **no ads, no in-app purchases, and no pay-to-win**. Coins and gems only unlock cosmetic skins and trails. Everything is saved in the browser with `localStorage`.

## Play

### iPhone

iOS Mail, Files, and Quick Look often show an HTML attachment as a still screen and do not run JavaScript, so buttons appear but do nothing. Open `Lumen.html` **in Safari** (Files → Share → Open in Safari), or use a public HTTPS link once one is hosted.

On a computer, open `index.html` or `Lumen.html` in a modern browser, or from this folder run: in a modern browser, or from this folder run:

```bash
python3 -m http.server 8765
```

Then visit http://localhost:8765/

- **Tap**, click, or press **Space / Enter** to flap.
- From the game-over screen, one tap starts the next flight immediately (about 280ms after you crash, well under a second).
- Works on phones and desktops. Haptics use `navigator.vibrate` where the browser allows it (usually on phones, over http/https — not always on `file://`).

## What is in the game

Every mechanic Fred asked for is implemented:

1. **Instant one-tap restart (under 1s)** — after a short crash beat (~280ms), a single tap or Space starts the next flight and is also the first flap. No ads, no countdown, no forced wait.
2. **Near-miss feedback** — squeeze past a gate edge and you get a “So close!” toast, bonus point, sound, shake, and haptic. Crash just shy of a gap and the game-over screen says “So close!”
3. **“New best is X away”** — if you did not beat your best, the game-over screen tells you exactly how many points short you were (or “Tied your best — one more!”).
4. **Smooth difficulty ramp with flow-state pacing** — speed and gap size ease in with a smoothstep curve, then creep after the mid-game. Every seventh gate is a slightly wider “breath” gate so the run stays in flow instead of only tightening.
5. **Variable rewards** — random coin pickups (sometimes clusters), rarer gems, and occasional bonus items: 2× score, a coin magnet, or a one-hit shield. Shields and multipliers cannot be bought.
6. **Currency + cosmetic shop** — coins and gems unlock skins and trails only. Nothing in the shop changes physics, score, or difficulty.
7. **Milestone achievements** — 20 badges (first flight, score 10/25/50/100, play counts, currency, streak, near-miss, combo, and lifetime gates).
8. **Daily streak + daily reward + login calendar** — first open of the day advances the streak (it resets if you skip a day). A 7-day reward track (jackpot on day 7) and a month calendar of logins. Play is never locked behind the streak.
9. **Daily missions** — three challenges rolled from the date, e.g. “Score 20 three times,” collect coins, hit a combo, or land near-misses. Claim cosmetic currency when complete.
10. **Progress bar toward the next unlock on game over** — shows coins/gems toward the next cheapest cosmetic, or a score milestone if you own everything. If you can already afford the next item, it says to visit the shop.
11. **Heavy juice** — particles, screen shake, a combo multiplier (coins 2× at 5 combo, 3× at 10), escalating gate/flap sounds, and haptics via `navigator.vibrate`.
12. **Best-score celebration** — “New best!” kicker, confetti, flash, fanfare, and a longer haptic pattern.
13. **Short sessions** — a typical flight is tens of seconds; instant restart is the loop.
14. **Ethical constraints** — paid $0.99 positioning, no ads, no IAP, no pay-to-win, no energy gates. All progress is in `localStorage` under the key `lumen.save.v1`.

## Files

- `index.html` — shell and menus
- `styles.css` — layout and UI
- `game.js` — simulation, juice, shop, dailies, and persistence

Sound and mute/haptics toggles live in Settings.

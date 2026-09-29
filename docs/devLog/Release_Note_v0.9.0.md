# Earth & Beyond — Release Note v0.9.0

**Date:** 2026-09-29
**Platform:** Playgama

> Versioning reset: this is the build submitted for Playgama review as **v0.9**. Once it passes,
> the live build becomes **v1.0**; leaderboard additions and patches bump from there.
> Earlier rejected submissions are kept in `archive/` (v1.0.0, v1.1.0 under the old numbering).

## Overview

New mechanics: Comet tiles (merge within 6 moves for ×3), Observatory cells (×2 per merge, ×6 for caught comets), and stacking (×6 multiplier). Observatory cell placement is now seeded per day. First-appearance tips added (EN/KO). Playgama submission zip no longer uses backslash separators — theme images now load correctly.

Platform compliance: player data is saved and restored through Bridge Storage, the platform language is applied, fonts ship inside the build, and game audio (including BGM) pauses during ads and platform pauses.

## Platform & Storage

- **Bridge Storage:** all progress is restored with one `storage.get` at boot and saved with one `storage.set` (debounced, flushed on game over and when the tab is hidden). Existing local progress is migrated once.
- **Boot order:** SDK init → storage restore → menu → `game_ready`. A failing or hanging SDK step (10 s timeout) no longer blocks the game; menu buttons are disabled until boot completes.
- **Language:** `platform.language` is applied when the player has not picked a language (ko → Korean, otherwise English).
- **Audio:** sound = player setting AND `platform.isAudioEnabled` AND not paused AND no ad showing. BGM is suspended during ads / platform pauses and resumes where it stopped.
- **No external resources:** Google Fonts replaced with bundled woff2 files (Rajdhani 600/700, Share Tech Mono — SIL OFL).

## Leaderboards

- **Daily:** ranked by the day's best game score (was stars × 10000 + score). A lower retry never overwrites the day's best. Endless follows the same rule.
- **Playgama SaaS leaderboards** enabled (`playgama`, `qa_tool`).
- **No dummy rows:** the ranking is hidden without a backend and shows "No scores yet — be the first!" when empty.

## Chronicles

- **START WITH ⭐×2 (AD):** the game-over reward is now a buff — watch an ad, start a new run of the chapter, and every star earned in that run counts double. A free **PLAY AGAIN** is always offered.
- Fixed: after game over there was no way to start again (only GALLERY / MENU).

## Visual & Audio

- Merge particles are bigger, longer-lived, leave trails, draw on top, and use bright colours over themed tiles (they were dark navy and invisible on the board).
- Daily HUD shows the run SCORE; the game-over line shows score and stars.
- Fixed: BGM never played unless the settings panel had been opened that session; new players now start with BGM on.
- Fixed: Endless AGAIN (and ENDLESS from chapter complete) lost the theme skin and showed number tiles.

## New Mechanics

**Comet Tiles:** A comet streaks onto the board during Daily and Endless play. Merge it within 6 moves for ×3 points before it flies away. Comets never appear in Chronicles mode.

**Observatory Cells:** One cell on every Daily and Endless board acts as an Observatory. Merges that land there score ×2 points. If you catch a comet on the Observatory, it scores ×6 instead. Daily players all see the same Observatory cell, keeping the leaderboard fair. Chronicles is unchanged.

**Stacking:** Stacking multipliers now reach ×6 in Daily and Endless modes.

**Daily Seeded Placement:** Observatory cell location is seeded per day, ensuring consistency across all players.

**First-Appearance Tips:** Tutorials for Comet and Observatory are shown to players on their first encounter, in both English and Korean.

## Fixes

- Fixed: Playgama submission zip used backslash (`\`) path separators on Windows, blocking theme image loads in production. Now built with `npm run build:playgama`, which uses forward slashes (`/`) for correct asset serving.

## Balance

Simulator: `docs/sims/cosmic_sim.js`. Reproduce: `node docs/sims/cosmic_sim.js`

```
BASELINE    score 4404.14 stars 11.28 moves 211.85 comets 0.00 caught 0.00 expired 0.00 catchRate -
WITH cosmic score 5080.14 stars 12.06 moves 222.72 comets 15.31 caught 13.32 expired 1.81 catchRate 87.0%
```

The incidental catch rate (87%) exceeds the plan's 75% target. This is a bot-measurement artifact: the greedy sweep bot never deliberately chases comets, only catches them when they are incidentally swept into merges. The values are held at `chance: 0.08 / ttl: 6` pending a design decision on whether to revise the acceptance bound for this bot shape or build a bot variant that sometimes declines available merges.

## Scope

Daily Challenge and Endless modes include all new features. Chronicles mode remains unchanged.

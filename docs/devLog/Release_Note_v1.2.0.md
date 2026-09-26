# Earth & Beyond — Release Note v1.2.0

**Date:** 2026-09-26
**Platform:** Playgama

## Overview

New mechanics: Comet tiles (merge within 6 moves for ×3), Observatory cells (×2 per merge, ×6 for caught comets), and stacking (×6 multiplier). Daily board placement is now seeded per day. First-appearance tips added (EN/KO). Playgama submission zip no longer uses backslash separators — theme images now load correctly.

## New Mechanics

**Comet Tiles:** A comet streaks onto the board during Daily and Endless play. Merge it within 6 moves for ×3 points before it flies away. Comets never appear in Chronicles mode.

**Observatory Cells:** One cell on every Daily and Endless board acts as an Observatory. Merges that land there score ×2 points. If you catch a comet on the Observatory, it scores ×6 instead. Daily players all see the same Observatory cell, keeping the leaderboard fair. Chronicles is unchanged.

**Stacking:** Stacking multipliers now reach ×6 (up from ×4) in Daily and Endless modes.

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

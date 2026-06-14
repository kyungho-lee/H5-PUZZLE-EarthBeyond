# Neon Drift — Daily Mode Design Spec

- **Date:** 2026-06-12
- **Status:** Draft — pending user review, then implementation plan
- **Feature:** A daily, deterministic, leaderboard-ranked **classic-2048** challenge mode added alongside the main 8×8 Neon Drift game.
- **Related:** [neon-drift-spec.md](../../Tech/neon-drift-spec.md), [neon-drift-architecture.md](../../Tech/neon-drift-architecture.md). Pattern reference: sibling SameGame `daily-protocol-design.md` (dateSeed + deterministic board).

---

## 1. Goal & Locked Decisions

Daily Mode is a **separate game variant** from the main game: a 4×4 **classic 2048** (merge by size only, color is cosmetic) where every player worldwide plays the **same deterministic board for the day**, competing on a daily leaderboard by stars earned.

**Decisions locked during brainstorming:**

| Topic | Decision |
|-------|----------|
| Board | 4×4 |
| Merge rule | **Same `size` only** (classic 2048). Color is cosmetic, derived from size — NOT a merge condition. (Main game stays `color AND size`.) |
| Color scheme | Classic-2048 style per-size palette: low = pale beige → high = deep orange/red, in neon tone. |
| 1024 completed | **⭐+1**, block **stays** on the board (occupies a cell). |
| 2048 completed | **⭐+5**, block **removed** (pops), game continues. |
| Run score | `(#1024 made × 1) + (#2048 made × 5)` stars. |
| Game over | Board full && no move/merge possible (any direction). |
| Daily attempts | 1 base run + **up to 5 retries** (rewarded ad each). Retry = **fresh run**. |
| Stars aggregation | **Daily cumulative** across all runs that day (base + retries). |
| Difficulty | **7 fixed types on weekday rotation**, date-seeded → everyone gets the identical board for the day (fair ranking). |
| Reset | **UTC midnight** (KST 09:00). |
| Exhausted (5 retries used) | Menu shows **countdown to next daily** + steers to base 8×8 mode. No daily play until reset. |
| Ads | Game over → **Playgama interstitial** (SDK min-delay throttled). Retry → **Playgama rewarded**. |
| Leaderboard | **Daily leaderboard** keyed by UTC date, separate from main hall-of-fame. Ranked by daily cumulative stars. |
| Menu | New **DAILY** entry on the START screen. |

**Non-goals (this phase):** streak tracking, share-strings, ghost replay, per-difficulty separate boards (one board/day), backend (uses Playgama leaderboard SDK only).

---

## 2. Game Rules (Daily = classic 2048)

```
Board:        4×4 (16 cells)
Tile:         { size }  (color is a pure function of size — display only)
Merge:        adjacent same size → size ×2   (NO color condition)
No re-merge:  a tile formed this push can't merge again this push (2048 rule, kept)
Spawn:        after a push that changed the board, spawn one tile in a random
              empty cell. Spawn value (2 or 4) per the day's difficulty type.
1024 made:    star += 1, tile REMAINS on board
2048 made:    star += 5, tile is REMOVED (pop FX), board continues
Game over:    no empty cell AND no adjacent same-size pair (any direction)
Run stars:    sum of the above as merges happen
```

**Color by size (classic-2048 neon palette), display only:**
```
2,4    → pale beige / soft cyan-white
8,16   → light amber
32,64  → orange
128,256→ deep orange
512    → red-orange
1024   → red (with strong glow — it's a star source)
2048   → white-hot / rainbow pulse (celebration)
```
Exact hex values are a tuning detail decided in the plan; the size→color mapping table is the contract.

---

## 3. Difficulty — 7 Weekday Types

`dailyType(dayOfWeekUTC)` is a **pure function** returning the day's config. The board and full spawn sequence are derived deterministically from `dateSeed(utcDateStr)` so every player gets the identical board.

| Day | Type | Start board | Spawn (2:4) | Character |
|-----|------|-------------|-------------|-----------|
| Mon | **WARMUP** | empty + two `2` | 90:10 | Easiest, roomy start |
| Tue | **STEADY** | empty + two `2` | 80:20 | Standard; 4s appear often |
| Wed | **SEEDED** | one `4` + one `8` preset | 85:15 | Big-number start, merge strategy |
| Thu | **SCARCE** | empty + one `2` | 95:5 | 4s rare → slow patient build |
| Fri | **FLOOD** | six `2` preset (board half full) | 80:20 | Fast-cleanup pressure |
| Sat | **HIGHROLL** | empty + two `4` | 70:30 | 4-rich, explosive but tight |
| Sun | **GAUNTLET** | one `8` + one `16` preset | 88:12 | Hardest: big numbers + tight |

- Numeric values (ratios, preset counts) are **playtest-tunable**; the 7-type structure is fixed.
- `dailyType` returns `{ startTiles: [{size,count}], spawnFourProb, label }`.
- Star scoring is identical across types; difficulty changes how reachable 1024/2048 are.

---

## 4. Architecture

**Reuse the existing pure core by parameterizing it.**

```
src/
├── neon-drift.js   [MODIFY] generalize:
│     - N (board size) as a parameter (default 8 → main unchanged)
│     - mergeRule: 'colorAndSize' (main) | 'sizeOnly' (daily)
│     - target-block handling hook: onComplete(size) → {removed, stars}
│   New pure helpers (added, non-breaking):
│     - dateSeed(dateStr)           string-hash → uint32 (port from SameGame)
│     - dailyType(dayOfWeek)        pure config table (§3)
│     - applyMove(grid, dir, rng, opts) gains opts.mergeRule, opts.N,
│                                   opts.targets (sizes that score/remove)
├── daily.js        [NEW] Daily controller logic (pure where possible):
│     - DailyState: today's date key, retries used, cumulative stars
│     - localStorage persistence (key: neondrift_daily_<UTCdate>)
│     - run lifecycle: startRun / onGameOver / canRetry / retry
├── palette.js      [MODIFY] add SIZE_PALETTE (size→color, classic-2048 neon)
├── grid-render.js  [MODIFY] support N=4 board + size-based color + target FX
└── index.html      [MODIFY] DAILY menu entry, daily game screen, daily
                     game-over modal, countdown-when-exhausted, ad wiring
test/
└── daily.test.js   [NEW] node:test for sizeOnly merges, target scoring,
                     dailyType table, dateSeed determinism, DailyState
```

**Determinism (fair leaderboard):**
`utcDateStr → dateSeed → seededRandom → injected rng` drives start board + every spawn. Same UTC day = identical board + spawn order for all players. (Core is already RNG-injected and `Date`/`Math.random`-free — this slots in cleanly.)

**Boundary clarity:**
- `neon-drift.js` stays the pure rules engine; Daily adds *options*, not a fork.
- `daily.js` owns daily meta (attempts, stars, date, persistence) — no DOM, no ads.
- `index.html` owns DOM, ads (`SG.CG.requestMidgameAd` / `requestRewardedAd`), leaderboard (`SG.PG.leaderboard`), and wiring.

---

## 5. UI / Screen Flow

**START menu** — add DAILY above START:
```
NEON DRIFT
[ DAILY ]    ← shows "TUE · STEADY" + ⭐today + retries left
[ START ]    (base 8×8)
[ SETTINGS ]
```
- If today's 5 retries are used: DAILY becomes a disabled **countdown** ("NEXT DAILY 07:32:10"), nudging START.
- Keyboard nav reuses the existing modal-nav (↑↓ + Enter).

**Daily game screen (4×4):** reuses the d-pad and renderer (N=4).
```
DAILY · STEADY    ⭐3   R 2/5
   [ 4×4 board ]
      [↑]
   [←][↓][→]
```
- 1024 made → "⭐+1" float. 2048 made → big glow pop + "⭐+5" + screen flash (reuse intensity FX).

**Daily game-over modal:**
```
GAME OVER
This run:    ⭐4
Today total: ⭐7
Retries:     3/5
[ RETRY (AD) ]   ← rewarded ad → fresh run (-1 retry); hidden when 0 left
[ MENU ]
```
- **Interstitial policy:** request `SG.CG.requestMidgameAd()` when leaving to MENU (not on every game-over), and rely on Playgama's `setMinimumDelayBetweenInterstitial` to throttle. Rewarded (retry) and interstitial never fire back-to-back.
- Rewarded retry: `requestRewardedAd(pid)` → if `granted`, start fresh run and decrement retries; if not granted (cancel/no-fill), restore button, no penalty.
- Keyboard nav applies.

**Leaderboard submit:** on each game-over (and on exhaustion), submit **today's cumulative stars** to the daily leaderboard id. Submit is non-blocking; failure is silent + retried via notify.

---

## 6. Data / Persistence

`localStorage` key `neondrift_daily_<UTCdate>`:
```json
{ "date": "2026-06-12", "retriesUsed": 2, "stars": 7, "bestRun": 5 }
```
- On load: if stored date ≠ today (UTC) → fresh daily state (old keys may be pruned).
- Stars submitted to Playgama daily leaderboard (`SG.PG.leaderboard.submit`) keyed per UTC date. A separate leaderboard id from the main `_HOF_LB_ID` (provisioned on Playgama; placeholder until then).

---

## 7. Testing (TDD, node:test)

Pure, deterministic targets in `daily.test.js`:
- `sizeOnly` merge: `[2,2]→[4]` regardless of (cosmetic) color; `colorAndSize` path unchanged for main.
- Target scoring: completing 1024 → stars+1, tile stays; completing 2048 → stars+5, tile removed.
- `dailyType(0..6)` returns the 7 configs; values match §3 table.
- `dateSeed` determinism: same date string → same seed; different date → different.
- Deterministic board: same seed → identical start board + spawn sequence.
- `DailyState`: retry decrement, cap at 5, cumulative stars, date rollover resets.
- Regression: all 33 existing main-game tests still pass (N defaults to 8, mergeRule defaults to colorAndSize).

Out of scope for unit tests: Canvas pixels, ad SDK (manual QA Tool), leaderboard network.

---

## 8. Open / Tuning (post-playtest)

- 1024 "stays" may make 4×4 fill too fast → may switch to remove-at-1024 or cap; decided after playtest.
- Difficulty numeric values (spawn ratios, preset counts) tuned after playtest.
- Daily leaderboard id provisioning on Playgama (placeholder until registered).
- Interstitial frequency may be reduced further if Playgama policy flags it.

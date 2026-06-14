# Neon Drift — Playgama Submission Copy

_Last updated: 2026-06-12_

---

## Game Title

**Neon Drift**

---

## Short Description
_(~150 chars — shown in catalog cards)_

Slide neon blocks to merge them. Hit daily targets, earn stars, and climb the ranking in this sleek cyberpunk puzzle.

---

## Full Description
_(~500–800 chars)_

Neon Drift is a daily slide-and-merge puzzle set in a glowing cyberpunk grid. Each day brings a new 4×4 board — slide the blocks in any direction, merge matching tiles, and chase star milestones before the board fills up.

**Daily Mode** gives you a fresh challenge every 24 hours with a seeded board and up to 5 retry attempts. Hit target tile values (64 → 128 → 256 → 512) to earn ⭐ stars, and check today's leaderboard after each run.

**Practice Mode** is an unlimited free-play sandbox — same mechanics, no ranking pressure. A 1024 Collapse resets the board and keeps the momentum going, letting you chase ever-higher combos without starting over.

Simple controls, satisfying merge animations, neon particle effects, and a crisp cyberpunk aesthetic make every run feel rewarding — whether you have 2 minutes or 20.

---

## How to Play
_(player-facing instructions)_

**Goal:** Slide tiles and merge them to hit star milestones. Earn as many ⭐ stars as possible before the board fills.

**Controls:**
- Tap the arrow buttons (↑ ↓ ← →) or swipe to slide the entire board
- Use keyboard arrow keys on desktop

**Rules:**
- All tiles slide together in the chosen direction
- Two tiles of the **same value** that collide merge into one (e.g. 4 + 4 → 8)
- A new tile spawns after every valid move
- The run ends when no more moves are possible

**Star milestones (Daily & Practice):**
- Merge a **64** tile → ⭐ ×1
- Merge a **128** tile → ⭐ ×2
- Merge a **256** tile → ⭐ ×3
- Merge a **512** tile → ⭐ ×5
- Each milestone can be earned repeatedly — keep merging!

**1024 Collapse (Practice only):**
- Creating a 1024 tile triggers a Collapse: the board resets and play continues with your stars and score intact.

**Daily Mode specifics:**
- One seeded board per day (same for all players)
- Up to 5 retries per day — retry costs a rewarded ad
- Your total daily stars are submitted to the leaderboard

**Tips:**
- Build toward corners to keep large tiles from blocking merges
- Chain multiple merges in one move for combo bonuses
- Use the Undo button (↩) once per move if you misfire

---

## Tags / Genre

- **Genre:** Puzzle
- **Sub-genre:** Merge, Slide, Number puzzle
- **Tags:** 2048, puzzle, merge, daily challenge, neon, cyberpunk, casual, leaderboard

---

## Technical Info

| Field | Value |
|---|---|
| Engine | Vanilla JS (no framework) |
| SDK | Playgama Bridge v1 |
| Orientation | Portrait |
| Devices | Mobile, Tablet, Desktop |
| Languages | English |
| Ads | Interstitial (level transitions), Rewarded (Daily retry) |
| Leaderboard | Daily star score (per-day, mode-namespaced) |

---

## Screenshot Guide

| File | Scene |
|---|---|
| `ss-01-menu.png` | Main menu — DAILY / PRACTICE / SETTINGS |
| `ss-02-daily-play.png` | Daily mode mid-game, tiles on board with score FX |
| `ss-03-star-fx.png` | Star-gain float animation (⭐+N) on merge |
| `ss-04-gameover-lb.png` | Game over overlay with today's leaderboard |
| `ss-05-practice.png` | Practice mode in play (PRACTICE · FLOOD label) |

Screenshots located at: `scripts/_submit/`

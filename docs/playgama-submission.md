# Earth & Beyond — Playgama Submission Copy

_Last updated: 2026-06-15_

---

## Game Title

**Earth & Beyond**

---

## Short Description
_(~150 chars — shown in catalog cards)_

Merge cosmic tiles to travel 13.8 billion years — from a molten Earth to the edge of the Universe. Collect 33 hand-curated scenes across 3 epic eras.

---

## Full Description
_(~500–800 chars)_

Earth & Beyond is a slide-and-merge puzzle built around a curated cosmic journey. Merge matching tiles to unlock hand-picked scenes from Earth's formation, human history, and solar system exploration — each era telling a real story, step by step.

**Chronicles (Collection Mode)** is the heart of the game. Three eras, each with 11 carefully chosen scenes — from the Magma Ocean and Cambrian Explosion, through the Apollo Moon Landing, to Voyager's Pale Blue Dot. Every merge advances you through 13.8 billion years of real history and science.

**Daily Challenge** brings a fresh seeded board every 24 hours. Earn stars by hitting tile milestones, compare your score on the leaderboard, and retry for a higher best — one run at a time.

**Practice Mode** is a pressure-free sandbox. Merge freely, trigger the 1024 Collapse to reset the board and keep your momentum going, and experiment without any ranking pressure.

Art direction draws from NASA, ESA, Hubble, JWST, Cassini, Voyager, and Apollo photography — reinterpreted and sequenced by hand into a progression that doubles as a timeline of the universe.

---

## How to Play
_(player-facing instructions)_

**Goal:** Slide tiles to merge them and unlock cosmic scenes. In Daily mode, earn as many ⭐ stars as possible before the board fills.

**Controls:**
- Tap the arrow buttons (↑ ↓ ← →) or swipe to slide the entire board
- Keyboard arrow keys work on desktop

**Basic Rules:**
- All tiles on the board slide together in the chosen direction
- Two tiles of the **same value** that collide merge into one (e.g. 4 + 4 → 8)
- A new tile spawns after every valid move
- The run ends when no moves remain

**Chronicles — Collection Mode:**
- Play through 3 eras: Primordial Earth → Human Civilization → Solar System
- Each era has 11 scenes unlocked by reaching tile milestones (2 → 4 → 8 → … → 2048)
- Merging a tile unlocks its matching scene in your collection gallery
- Complete an era by creating a 1024 tile — the next era unlocks automatically
- Progress is saved; you can continue from where you left off

**Daily Challenge:**
- One seeded board per day, shared by all players
- Hit tile milestones to earn ⭐ stars: 64 → ★×1 / 128 → ★×2 / 256 → ★×3 / 512 → ★×5
- Each milestone can be earned multiple times per run
- Up to 3 retries per day (watch a rewarded ad to unlock each retry)
- Your best run score is submitted to today's leaderboard

**Practice Mode:**
- Unlimited play, no leaderboard pressure
- Creating a 1024 tile triggers the **1024 Collapse**: board resets and play continues with stars intact
- Ideal for experimenting with merge strategies

**Tips:**
- Keep your highest tile in a corner to avoid blocking future merges
- Chaining multiple merges in one move earns combo bonuses
- Check your collection gallery (⭐ icon) to see which scenes you've unlocked

---

## Tags / Genre

- **Genre:** Puzzle
- **Sub-genre:** Merge, Slide, Collection, Casual
- **Tags:** merge puzzle, 2048, cosmic, space, history, collection, daily challenge, leaderboard, casual, educational

---

## Why Earth & Beyond Is Not AI-Generated Content

The Playgama review team flagged our previous submission (NeonDrift) for appearing to be raw generative output. Earth & Beyond is a fundamentally different product — here is what we built by hand:

- **33 scene images, hand-curated and sequenced** across 3 thematic eras. Each image corresponds to a specific, named moment in real astronomical or human history — chosen, ordered, and described by us, not generated randomly.
- **Original game design** — the 3-mode structure (Chronicles / Daily / Practice), the Era unlock chain, the star-milestone economy, and the 1024 Collapse mechanic are all original design decisions, not templates.
- **Curated art direction per era** — each of the 3 eras has its own board background, slot textures, and color palette (lava-orange for Primordial Earth; warm stone for Human Civilization; deep-space black for Solar System). These were specified and produced to reflect the visual identity of each historical period.
- **Real science as content** — scene titles and descriptions are drawn from actual astronomical events (Cambrian Explosion, Great Oxidation Event, Pale Blue Dot, Oort Cloud) with educational intent. The progression mirrors the real timeline of the universe.

---

## Technical Info

| Field | Value |
|---|---|
| Engine | Vanilla JS (no framework, no build step) |
| SDK | Playgama Bridge v1 |
| Orientation | Portrait |
| Devices | Mobile, Tablet, Desktop |
| Languages | English |
| Ads | Rewarded (Daily retry) |
| Leaderboard | Daily star score — Firebase Firestore + Playgama score API |
| Save State | localStorage (collection progress, best scores) |

---

## Content Eras — Scene List

### Era 1: Primordial Earth (13.8 billion years ago → 60,000 years ago)

| Step | Tile | Scene Name |
|---|---|---|
| 01 | 2 | Stardust & Molecular Cloud |
| 02 | 4 | Protoplanetary Disk |
| 03 | 8 | Magma Ocean Earth |
| 04 | 16 | Moon-Forming Impact |
| 05 | 32 | First Oceans |
| 06 | 64 | Stromatolites (First Life) |
| 07 | 128 | Great Oxidation Event |
| 08 | 256 | Cambrian Explosion |
| 09 | 512 | Age of Dinosaurs |
| 10 | 1024 | K-Pg Extinction |
| 11 ✨ | 2048 | Rise of Mammals |

### Era 2: Human Civilization (250,000 years ago → 1969)

| Step | Tile | Scene Name |
|---|---|---|
| 01 | 2 | Stone Age Cave Art |
| 02 | 4 | Agricultural Revolution |
| 03 | 8 | Ancient Civilizations |
| 04 | 16 | Classical Antiquity |
| 05 | 32 | Age of Exploration |
| 06 | 64 | Scientific Revolution |
| 07 | 128 | Industrial Revolution |
| 08 | 256 | Electrical Age |
| 09 | 512 | Atomic Age |
| 10 | 1024 | Digital Revolution |
| 11 ✨ | 2048 | Apollo Moon Landing |

### Era 3: Solar System (1969 → present)

| Step | Tile | Scene Name |
|---|---|---|
| 01 | 2 | Moon Surface (Apollo 11) |
| 02 | 4 | Mars Surface (Perseverance) |
| 03 | 8 | Jupiter's Great Red Spot (Juno) |
| 04 | 16 | Saturn's Rings (Cassini) |
| 05 | 32 | Titan's Methane Lakes (Cassini) |
| 06 | 64 | Europa's Ice Shell (Galileo) |
| 07 | 128 | Pluto's Heart (New Horizons) |
| 08 | 256 | Solar Corona (SOHO / Solar Orbiter) |
| 09 | 512 | Pale Blue Dot (Voyager 1, 1990) |
| 10 | 1024 | Interstellar Space (Voyager 1, 2012) |
| 11 ✨ | 2048 | Oort Cloud — Edge of the Solar System |

---

## Screenshot Guide

| File | Scene |
|---|---|
| `ss-01-hero.png` | Hero main screen — 3-panel era background + title |
| `ss-02-era1.png` | Era 1 (Primordial Earth) — full board in play |
| `ss-03-era2.png` | Era 2 (Human Civilization) — full board in play |
| `ss-04-era3.png` | Era 3 (Solar System) — full board in play |
| `ss-05-gameover-lb.png` | Daily game-over with leaderboard |

Screenshots located at: `scripts/_submit/`

## Cover Images

| File | Size | Format |
|---|---|---|
| `cover-square.png` | 800×800 | 1:1 |
| `cover-portrait.png` | 1080×1920 | 9:16 |
| `cover-landscape.png` | 1920×1080 | 16:9 |

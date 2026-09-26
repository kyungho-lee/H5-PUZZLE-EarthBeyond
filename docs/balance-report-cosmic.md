# Comet/Observatory balance report

Simulator: `docs/sims/cosmic_sim.js` (Node-loadable, not part of `npm test` — only `test/**/*.test.js` is picked up).
Reproduce: `node docs/sims/cosmic_sim.js`

Bot: fixed greedy-corner preference `['down','left','right','up']`. It never deliberately
chases the comet tile — it always tries the same direction order regardless of where the
comet or observatory cell is. So "catch rate" below measures **incidental** catches only
(the comet happens to be swept into a merge before its TTL expires), not a strategy result.

## Acceptance bounds

- Comets per run: **≥ 2**
- Stars average (WITH cosmic vs BASELINE): within **±10%**
- Catch rate (caught / spawned): between **25% and 75%**
- If a bound is missed: adjust only `chance` or `ttl` (never `mult`, `minTurn`, or star
  targets), in both `src/index.html` `COMET_OPTS` and the sim's `COMET`, rerun.
- Retuning is restricted to `chance` in `0.05–0.20` and `ttl` in `4–10`. If no combination
  in that space satisfies all bounds, stop and report `DONE_WITH_CONCERNS`.

## Final two output lines (COMET = { chance: 0.08, ttl: 6, minTurn: 5, mult: 3 })

```
BASELINE    score 4404.14 stars 11.28 moves 211.85 comets 0.00 caught 0.00 expired 0.00 catchRate -
WITH cosmic score 5080.14 stars 12.06 moves 222.72 comets 15.31 caught 13.32 expired 1.81 catchRate 87.0%
```

Bound checks against this run:
- Comets per run: 15.31 ≥ 2 → **pass**
- Stars: 12.06 vs baseline 11.28 → +6.9% → within ±10% → **pass**
- Catch rate: 87.0% → **fails** (must be 25–75%)

## Retuning attempts (chance/ttl only, all other fields unchanged)

All runs use N = 1000, seeds 1..1000, same BASE/targets as the brief's sim.

| # | chance | ttl | comets | stars (Δ vs 11.28) | catchRate | comets≥2 | stars±10% | catch 25–75% |
|---|--------|-----|--------|---------------------|-----------|----------|-----------|--------------|
| 1 | 0.08 | 6 (original) | 15.31 | 12.06 (+6.9%) | 87.0% | pass | pass | **fail** |
| 2 | 0.08 | 4 (ttl floor) | 16.20 | 12.36 (+9.6%) | 78.8% | pass | pass | **fail** |
| 3 | 0.05 | 4 | 10.00 | 11.46 (+1.6%) | 78.8% | pass | pass | **fail** |
| 4 | 0.12 | 4 | 23.58 | 12.56 (+11.3%) | 78.4% | pass | **fail** | **fail** |
| 5 | 0.20 (chance ceiling) | 4 | 37.96 | 13.57 (+20.3%) | 78.2% | pass | **fail** | **fail** |
| 6 | 0.08 | 5 | 15.28 | 11.71 (+3.8%) | 83.6% | pass | pass | **fail** |
| 7 | 0.08 | 10 (ttl ceiling) | 14.80 | 11.86 (+5.1%) | 93.8% | pass | pass | **fail** |

Full output lines for each attempt:

```
#1 chance=0.08 ttl=6 (original defaults)
BASELINE    score 4404.14 stars 11.28 moves 211.85 comets 0.00 caught 0.00 expired 0.00 catchRate -
WITH cosmic score 5080.14 stars 12.06 moves 222.72 comets 15.31 caught 13.32 expired 1.81 catchRate 87.0%

#2 chance=0.08 ttl=4
BASELINE    score 4404.14 stars 11.28 moves 211.85 comets 0.00 caught 0.00 expired 0.00 catchRate -
WITH cosmic score 5125.74 stars 12.36 moves 227.64 comets 16.20 caught 12.77 expired 3.28 catchRate 78.8%

#3 chance=0.05 ttl=4
BASELINE    score 4404.14 stars 11.28 moves 211.85 comets 0.00 caught 0.00 expired 0.00 catchRate -
WITH cosmic score 4814.22 stars 11.46 moves 216.75 comets 10.00 caught 7.88 expired 2.03 catchRate 78.8%

#4 chance=0.12 ttl=4
BASELINE    score 4404.14 stars 11.28 moves 211.85 comets 0.00 caught 0.00 expired 0.00 catchRate -
WITH cosmic score 5282.14 stars 12.56 moves 231.26 comets 23.58 caught 18.49 expired 4.88 catchRate 78.4%

#5 chance=0.20 ttl=4
BASELINE    score 4404.14 stars 11.28 moves 211.85 comets 0.00 caught 0.00 expired 0.00 catchRate -
WITH cosmic score 5713.25 stars 13.57 moves 244.93 comets 37.96 caught 29.67 expired 7.97 catchRate 78.2%

#6 chance=0.08 ttl=5
BASELINE    score 4404.14 stars 11.28 moves 211.85 comets 0.00 caught 0.00 expired 0.00 catchRate -
WITH cosmic score 4921.47 stars 11.71 moves 219.51 comets 15.28 caught 12.77 expired 2.35 catchRate 83.6%

#7 chance=0.08 ttl=10
BASELINE    score 4404.14 stars 11.28 moves 211.85 comets 0.00 caught 0.00 expired 0.00 catchRate -
WITH cosmic score 5044.94 stars 11.86 moves 219.19 comets 14.80 caught 13.88 expired 0.73 catchRate 93.8%
```

Diagnostic-only point (outside the allowed retune range, kept for reference — **not**
applied to `COMET_OPTS`): `chance=0.08, ttl=3` gives catch rate 71.8% (comets 16.43, stars
12.04, +6.7%), which would satisfy all three bounds. But `ttl=3` is below the allowed floor
of 4, so it is out of scope for this task.

## Analysis

Catch rate rises monotonically with `ttl` (71.8% at ttl=3, 78.8% at ttl=4, 83.6% at ttl=5,
87.0% at ttl=6, 93.8% at ttl=10) and is essentially insensitive to `chance` (78.2–78.8%
across chance 0.05–0.20 at fixed ttl=4). This is expected given the note above: the bot is
a fixed-direction greedy sweeper on a 4x4 `sizeOnly` board, so almost every active tile —
comet or not — gets folded into a merge within a few turns regardless of spawn probability.
`ttl=4` (the lowest allowed value) is the best point in the allowed search space and still
only gets catch rate down to 78.2–78.8%, above the 75% ceiling. Raising `chance` at ttl=4
only adds more comets (and, at chance ≥ 0.12, also pushes the stars delta outside ±10%,
so it is strictly worse, not better).

## Conclusion: DONE_WITH_CONCERNS

No `(chance, ttl)` combination with `chance` in `0.05–0.20` and `ttl` in `4–10` satisfies
all three bounds simultaneously — catch rate cannot be brought under 75% without going
below the allowed `ttl` floor of 4. `COMET_OPTS` / `COMET` are left at the brief's original
values (`chance: 0.08, ttl: 6, minTurn: 5, mult: 3`); `src/index.html` was not modified.

This is a bot-measurement artifact, not evidence the comet mechanic itself is unbalanced:
per the note above, the greedy bot never deliberately chases comets, so "catch rate" here
only reflects incidental catches from a fixed sweep pattern on a small, fast-merging board.
A bot (or human) that actively routes toward the comet/observatory would very plausibly
catch it less often — this simulator has no way to model deliberately *avoiding* the
comet's cell, so it cannot lower the measured rate below what "always merge everything
you can, every turn" produces. Recommend either revisiting the acceptance bound for this
particular bot shape, or building a bot variant that sometimes declines an available merge,
before drawing conclusions from this metric alone.

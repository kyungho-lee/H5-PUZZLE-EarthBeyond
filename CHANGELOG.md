# Earth & Beyond — Changelog

## v1.1 (2026-06-16)
**Bug fixes & improvements**
Daily tile images now display correctly on first play. Chapter intro screens, ad-continue flow, and leaderboard scoring have been polished.

- Fixed: Daily board tile images not showing on first play (async re-draw on image load)
- Fixed: Broken image icons in chapter intro / complete modals (removed empty `src=""`)
- Fixed: Daily HUD showing raw numbers — now displays "PLAYED #N"
- Fixed: Ad-continue button unresponsive after quota exhausted — button now hides correctly
- Changed: Daily retries unlimited (practice concept); star claim limited to best-run delta
- Changed: Leaderboard score = `stars × 10000 + gameScore`; Playgama Bridge takes priority over Firebase

---

## v1.0 (2026-06-15)
**Initial Playgama submission**
First public release of Earth & Beyond.

- Core merge puzzle on 4×4 board with era-based tile themes (Primordial Earth, Human Civilization, Solar System)
- Daily Challenge mode with date-seeded board and leaderboard
- Chronicles mode with 11-step chapter progression per era
- Endless mode with gallery theme selection
- Rewarded ad system (3 continues per Chronicles session)
- EN / KO language support
- Playgama Bridge SDK integration (ads, leaderboard, audio, pause)
- Firebase Firestore leaderboard fallback
- Web Audio synthesized sound pack

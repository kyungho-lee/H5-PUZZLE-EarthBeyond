# Earth & Beyond — Release Note v1.1.0

**Date:** 2026-06-16
**Platform:** Playgama

## Overview
Bug fixes & improvements. Daily tile images now display correctly on first play. Chapter intro screens, ad-continue flow, and leaderboard scoring have been polished.

## Bug Fixes
- Fixed: Daily board tile images not showing on first play (async re-draw on image load)
- Fixed: Broken image icons in chapter intro / complete modals (removed empty `src=""`)
- Fixed: Daily HUD showing raw numbers — now displays "PLAYED #N"
- Fixed: Ad-continue button unresponsive after quota exhausted — button now hides correctly

## Changes
- Daily retries unlimited (practice concept); star claim limited to best-run delta
- Leaderboard score = `stars × 10000 + gameScore`; Playgama Bridge takes priority over Firebase

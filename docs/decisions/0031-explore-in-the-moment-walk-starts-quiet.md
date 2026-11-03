# 0031. Explore gives discoveries in the moment, and a walk starts quiet

Date: 2026-11-01 · Status: accepted · Area: explore

## Context
Explore (slice 5, the spec's E1-E23 in the v1 tab) replaces scan and ambient. The owner wanted discoveries in the moment, not a planned list (Nov 1).

## Decision
A walk starts quiet. Quiet is navigation plus captures: no "?" marks, magenta, strip chip or dead-zone pill. Explore starts from the home's Explore button beside Start walk, or the switch in the walk's options; either sets `explored:<walk>` to the time it began, so the replay counts only what it passed from then.

Checklists build on every walk, quiet too, so a capture can find a place. Busy streets are saved only on an exploring walk. Finding is a capture within 60 m of an unfound place, any kind, any walk; walking past only names it. A find is a memory, never a count.

## Consequences
- `explore/explore.ts` (pure), `exploreRun.ts`, `useExplore.ts`, `settings.ts`; meta `explore_walk` holds the exploring walk's id.
- `readCentre` decides when to read; `buildChecklists`, `visibleMarks`, `routeMarks` and `routeProbes`, `findFor`; `retryAllowed` (2 min and 100 m after a failure); `exploreBuild` checks the build at most every 10 min.
- Storage: `checklist_area`, `checklist_item`, `find` (kept), `explore_read` (derived); SQLite migration 9, IndexedDB v8.
- Settings are a panel (`ExploreSettings`): what I'm into (meta `explore_hidden`), the range (`explore_range`, 60-300 m, 100 by default), the pocket alert (`explore_haptic`, phone only). The range preview is a ring on the map already on screen, never a second map.
- Quiet or Explore moved off the walk into Navigate's extras (0021), now a dialog (0056). Reminders fire on every walk (0032). Marks are attractions only (0044).
- Deferred and native items: `docs/DEFERRED.md`, `docs/NATIVE_UNVERIFIED.md`. Open: two things are named Explore (0020).

# 0060. A gap in the trace is filled with the streets most likely walked

Date: 2026-11-03 · Status: accepted · Area: trace, gaps

## Context
The concept doc's "Filling gaps" tab, G1-G14; the owner's calls, Nov 3. A closed app or lost GPS left a gap in the trace.

## Decision
A gap is filled with the streets most likely walked: map matching across a gap, with the time as the limit. It is opt-in unless the answer is obvious. An uncertain stretch is drawn faint and counts for nothing until kept; a kept or self-filled stretch is walked trace in every way. The app-closed / GPS-lost case only; dead reckoning from the phone's sensors is a later slice.

## Consequences
- `gaps/infer.ts` (pure), `gaps/rules.ts` (`GAP_RULES`), `gaps/index.ts`: `gapsOf` (60 s to 30 min, 40 m or more), A* with banned pieces, two budgets; 90%+ certain fills by itself, 50%+ is offered (`PieceGraph.split`, `readBounds`, `fetchTiles`).
- `readTrace(..., stills, fills)`, `withFilled`; `snap` and `assignAreas` take `fills`; `loadReplay` with `{ readGaps: true }`.
- `gap_fill` truth (SQLite migration 14, IndexedDB v12, `KEPT_STORES`); `sameGap`, `meets`; `deleteWalk` removes its rows.
- UI: `useLiveStretches` in `OpenWalkProvider`, `GapCard` (`stretchAt`), Keep and Not this way; `tileCollector()`, `tilesNear`, `MAX_DERIVE_VIEWS`; faint is `FAINT_OPACITY`.
- Audit (Nov 3): 17 findings, 12 fixed (`gaps audit N` in `gaps.test.ts`). Deferred and native items: `docs/DEFERRED.md`, `docs/NATIVE_UNVERIFIED.md`.

# 0041. Three deletes, to free storage, as if it never happened, with Undo in memory

Date: 2026-11-01 · Status: accepted · Area: deletion

## Context
The concept doc's "Clearing walks and moments" tab, D1-D11. Walks, traces and captures were append-only truth with no way to free storage.

## Decision
The owner's calls, Nov 1: three deletes, to free storage: a whole walk, a walk's photos, videos and memos (the walk stays), or one moment. A walk's actions are its More (⋯) button on its home-sheet row (walks list and a day's timeline) and on its replay card (`WalkActions`). A moment's is Delete in the capture viewer's More (⋯) menu, wherever the viewer opens. No Storage screen.

As if it never happened: a deleted walk takes its trace, pauses, captures and files, summary, visited and area rows, finds, reminders, marks and `explored:<walk>`; later walks' new streets are recounted. Removing a walk's media keeps its finds. Offered places, checklists and busy areas never move. Undo is memory, not storage: a delete hides its ids at once and runs after 5 s.

## Consequences
- `db.deleteWalk`, `db.deleteCaptures` (one transaction each; web `atomically`), `removeMedia`, `filesOf`, `recountNewStreets`, `keepFinds`.
- `deletion/pending.ts` (pure), `deletion/index.ts`; every list filters by `useHidden` / `useVisible`; `UndoToast` in each screen and the viewer; `useOnDeleted`.
- "Truth is append-only" now reads "deletes aside".
- Audit (Nov 1): 13 findings, 8 fixed; regression tests in `deletion.test.ts`.
- Deferred: a sweep for a phone's leftover files, and the rest in `docs/DEFERRED.md`. Native unverified: `docs/NATIVE_UNVERIFIED.md`.

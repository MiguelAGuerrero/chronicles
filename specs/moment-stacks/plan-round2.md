# Plan: moment stacks, round 2 (MS16-MS21)

For the owner's review before any code. Decision 0106; spec `specs/moment-stacks/spec.md`. Rounds 0 and 1 are built
on this branch. **No migration**: a split moves a piece row (SQLite) or a piece between records (IndexedDB).

## What the walker sees

- **Split out** (MS16): in a stacked moment's viewer, More offers "Split this photo out" (by kind) on every piece but
  the first. The piece leaves the stack and shows at once as its own moment, with an Undo for 5 s; after the window it
  is stored as a moment of its own, with its own time, placed
  on the walk's trace at that time (at a pause's start inside one, at the last fix before a gap), or at the original's
  place off a walk. The original keeps its threads, replies, reminder and find.
- **One beat in the replay** (MS17): a stacked moment is one stop at its one pin. Its photos and videos come up as **one
  grid** (closest square up to 3×3, square crops), each swiping in a beat after the last, held one photo slot, scrolling
  slowly past nine; videos play muted in their cells. Its memos and notes are bubbles beside it, memos one after
  another. The pile gets **one card per moment** (its face). Nothing waits for a tap.
- **The setting** (MS18): Navigate's settings (the ready bar pulled up) gain **Group captures into one moment**, off by
  default, with one line saying what it does. Kept on the device.
- **Grouping by itself** (MS19-MS21): with it on, the edge stack's captures join the open moment, and the pill's place
  shows "Adding to this moment" beside **New moment**, in words that never change. With it off, round 1 as built.

## Files

| Where | What |
|---|---|
| `src/lib/splitPlace.ts` (new, core) | Where a split piece goes: on a walk, the trace at its time; inside a pause, the pause's start; inside a gap in the fixes (none within `GAP_MS` on either side), the last fix before it; off a walk, or with no fix, the original's place. |
| `src/lib/db/*`, `fakes/memoryDb.ts`, `dbContract.ts` | `splitPiece(pieceId, moment)`: one transaction that takes a piece out of its moment and keeps it as a new moment (the moment's id, walk, time and place given). Rejects for a moment's last piece, and for a missing piece. Contract case first. |
| `src/lib/split/shell.ts` + `index.ts` (new) | Split out through the Undo window: the piece leaves its moment on screen at once and a pending moment shows in its place (a store the lists and the viewer read), stored after 5 s; Undo drops the pending one. The new moment's id is the piece's (never the first piece, MS16). |
| `src/components/CaptureView.tsx` | More: "Split this photo out" (by kind) on a stacked moment; the toast says "Photo split out" with Undo. |
| `src/lib/ceremony/grid.ts` (new, core) | The grid's layout: columns and rows for n (closest square, at most 3×3 shown), each cell's swipe-in time, the scroll past nine, and the hold. |
| `src/lib/ceremony/rhythm.ts` | A stop's slots from its moments: a stacked moment's photos and videos make one `grid` slot (swipe-ins, then the photo slot, or the longest muted video if longer), its memos and notes their bubble slots in capture order, at the same time. One pile entry per moment. `fitCap` floors a grid at its swipe-ins plus the photo floor. |
| `src/components/ceremony/Grid.tsx` (new), `overlays.tsx`, `Pile.tsx` | The grid overlay: square cells (`facedAt` per piece, small copies for photos), swipe-in by `motionTokens`, muted videos, the slow scroll, no dots, position or progress bar (steward S3); the pile shows the moment's face. |
| `src/lib/ceremony/story.ts`, `components/ceremony/StepThrough.tsx` | A stop spans from a stack's first piece to its last (steward S7: `walkStory` read `Faced.t`, the first). The screen reader's path steps through a moment's pieces in capture order, with no position over them (steward S2, MS9). |
| `src/lib/momentPill/shell.ts` | `grouping` (meta `group_captures`, declared in `META`), loaded and saved; `newMoment()` (New moment closes the open moment, MS19). |
| `src/components/StartSettings.tsx` | The switch under "Walk settings" (the sheet's own title, as MS18 says), its line saying the cost plainly: "Captures join the moment just made; a separate moment takes New moment first." (steward on Q3) |
| `src/components/walk/AddToMomentPill.tsx`, `MomentBar.tsx`, `src/app/walk.tsx` | With grouping on: the pill gives way to "Adding to this moment · New moment" (MS19, MS21), held to MS6's restraint and with no timer, countdown or fill; New moment is spoken "Start a new moment" (steward S5); the edge buttons pass `momentPill.target()`. |

## Tests (todos first, one commit)

| Id | Test | Where |
|---|---|---|
| MS16 | `MS16: a split piece goes on the trace at its time, at a pause's start, at the last fix before a gap, or at the original's place off a walk` (`splitPlace`); contract `FC7 splitPiece, MS16`; `MS16: splitPlace gives a lone capture's place as today's placer does` (steward S6); `MS16: Split out keeps the original's threads, replies, reminder and find, and Undo leaves both as they were` (shell over `fakePorts()`); journey: More → Split this note out, Undo, then again and wait | `moments/splitPlace.test.ts`, `dbContract.ts`, `moments/split.test.ts`, `stacks.js` |
| MS17 | `MS17: the grid is the closest square up to 3×3 and scrolls past nine` (`grid.ts`); `MS17: a stacked moment is one stop with one grid that holds one photo slot after its swipe-ins, or a muted video's length; memos one after another beside it; the pile holds one card per moment; the plan stays under the cap`; `MS17: built through walkStory, a stack and the same pieces apart give the same passed lines in the same order, and the stop spans first piece to last` (S7); `MS17: the screen reader's steps go through a stack's pieces with no position` (S2); journey: the replay of a walk with a stack shows one grid with a cell per photo and no dots, numbers or bar (S3) | `replay/stacks.test.ts`, `stacks.js` |
| MS18 | `MS18: Group captures is off by default, saved and read back` (shell over `fakePorts()`); journey: the switch and its line | `moments/momentPill.test.ts`, `stacks.js` |
| MS19 | `MS19: with grouping on, an edge capture joins the open moment until it closes or New moment`; journey: "Adding to this moment" and New moment in ink, its words the same after a second capture and ten seconds on, no timer; two edge notes make one moment, New moment then a third makes another | `moments/momentPill.test.ts`, `stacks.js` |
| MS20 | `MS20: off a walk, grouping closes by time, a tap or leaving; nothing reads the location` (reducer and the journey's location count) | `moments/openMoment.test.ts`, `stacks.js` |
| MS21 | journey: with grouping on, no Add to this moment pill; off, the pill as in round 1 | `stacks.js` |

## Deferred

- The day's replay gets the same one beat from the same rhythm (MS17 covers both), but the e2e checks the walk's.
- A split while offline from the trace (a walk with no fixes at the piece's time) uses the original's place.

## Native that will not run on a device

The turning card on MapLibre RN's stage, a split's Undo on a phone, the switch on a phone (`docs/NATIVE_UNVERIFIED.md`).

## Steward (Nov 10) and triage

S1 (a capped stack's photos flash past): accepted, each photo its own floor in `fitCap`, a test. S2 (the screen reader hears only a stack's face): accepted, `StepThrough` and `storySteps` step through pieces with no position. S3 (nothing rules out dots on the card): accepted, a crossfade with no position, checked in the journey. S4 (a split piece vanishes for 5 s): the owner's call, question 1. S5 (the automatic label's restraint): accepted, MS6's terms, no timer, New moment spoken by what it does. S6 (links missing from MS16's test; a second placer): accepted. S7 (the whispers' test compared the input with itself; a stack's stop ended at its first piece): accepted, built through `walkStory`, the stop spans first to last. None rejected.

## The owner's answers (Nov 10)

1. A split piece shows at once as its own moment during the Undo window, and is stored after it.
2. The replay shows a stack as a **grid**, not a turning card (the owner's own design): the closest square up to 3×3,
   square crops, each piece swiping in, the grid held one photo slot, scrolling slowly past nine; videos muted in their
   cells; notes and memos stay bubbles beside it. Steward S1 (photos flashing past in a squeezed card) no longer applies.
3. Split out is not offered on a moment's first piece.
4. Off a walk, a split piece takes the original moment's place.
5. The setting sits under "Walk settings", worded as the steward suggested.

MS16 and MS17 in the spec carry these.

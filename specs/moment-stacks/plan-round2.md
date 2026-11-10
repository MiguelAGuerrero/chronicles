# Plan: moment stacks, round 2 (MS16-MS21)

For the owner's review before any code. Decision 0106; spec `specs/moment-stacks/spec.md`. Rounds 0 and 1 are built
on this branch. **No migration**: a split moves a piece row (SQLite) or a piece between records (IndexedDB).

## What the walker sees

- **Split out** (MS16): in a stacked moment's viewer, More offers "Split this photo out" (by kind). The piece leaves the
  moment at once, with an Undo for 5 s; after the window it is stored as a moment of its own, with its own time, placed
  on the walk's trace at that time (at a pause's start inside one, at the last fix before a gap), or at the original's
  place off a walk. The original keeps its threads, replies, reminder and find.
- **One beat in the replay** (MS17): a stacked moment is one stop at its one pin. Its photos turn in **one card**, each
  in turn, within the rhythm's photo slot; a video in it plays its length in that card. Its memos are bubbles that play
  one after another, its notes bubbles. The pile gets **one card per moment** (its face). Nothing waits for a tap.
- **The setting** (MS18): Navigate's settings (the ready bar pulled up) gain **Group captures into one moment**, off by
  default, with one line saying what it does. Kept on the device.
- **Grouping by itself** (MS19-MS21): with it on, the edge stack's captures join the open moment, and the pill's place
  shows "Adding to this moment" beside **New moment**, in words that never change. With it off, round 1 as built.

## Files

| Where | What |
|---|---|
| `src/lib/splitPlace.ts` (new, core) | Where a split piece goes: on a walk, the trace at its time; inside a pause, the pause's start; inside a gap in the fixes (none within `GAP_MS` on either side), the last fix before it; off a walk, or with no fix, the original's place. |
| `src/lib/db/*`, `fakes/memoryDb.ts`, `dbContract.ts` | `splitPiece(pieceId, moment)`: one transaction that takes a piece out of its moment and keeps it as a new moment (the moment's id, walk, time and place given). Rejects for a moment's last piece, and for a missing piece. Contract case first. |
| `src/lib/split/shell.ts` + `index.ts` (new) | Split out through the Undo window: hidden at once by `pieceKey`, stored after 5 s; the new moment's id is the piece's (a new id when the piece shares the original's). |
| `src/components/CaptureView.tsx` | More: "Split this photo out" (by kind) on a stacked moment; the toast says "Photo split out" with Undo. |
| `src/lib/ceremony/rhythm.ts` | A stop's slots from its moments: each stacked moment's photos and videos make one `stack` card slot (photo slot, plus each video's length), its memos and notes their slots in capture order. `cards` gain the turn list; one pile entry per moment. Under the 60 s cap as today (`fitCap` floors the card at the photo floor). |
| `src/components/ceremony/Cards.tsx`, `Pile.tsx` | The card turns through its photos and videos (each `facedAt`) by the card's own time; the pile shows the moment's face. |
| `src/lib/momentPill/shell.ts` | `grouping` (meta `group_captures`, declared in `META`), loaded and saved; `newMoment()` (New moment closes the open moment, MS19). |
| `src/components/StartSettings.tsx` | The switch and its line (MS18). |
| `src/components/walk/AddToMomentPill.tsx`, `MomentBar.tsx`, `src/app/walk.tsx` | With grouping on: the pill gives way to "Adding to this moment · New moment" (MS19, MS21); the edge buttons pass `momentPill.target()`. |

## Tests (todos first, one commit)

| Id | Test | Where |
|---|---|---|
| MS16 | `MS16: a split piece goes on the trace at its time, at a pause's start, at the last fix before a gap, or at the original's place off a walk` (`splitPlace`); contract `FC7 splitPiece, MS16`; `MS16: Split out keeps the original's threads, reminder and find, and Undo leaves both as they were` (shell over `fakePorts()`); journey: More → Split this note out, Undo, then again and wait | `moments/splitPlace.test.ts`, `dbContract.ts`, `moments/split.test.ts`, `stacks.js` |
| MS17 | `MS17: a stacked moment is one stop with one card that turns through its photos within the photo slot; memos one after another; the pile holds one card per moment; the plan stays under the cap; the whispers are the same as with the pieces apart` | `replay/stacks.test.ts` |
| MS18 | `MS18: Group captures is off by default, saved and read back` (shell over `fakePorts()`); journey: the switch and its line | `moments/momentPill.test.ts`, `stacks.js` |
| MS19 | `MS19: with grouping on, an edge capture joins the open moment until it closes or New moment`; journey: "Adding to this moment" and New moment; two edge notes make one moment, New moment then a third makes another | `moments/momentPill.test.ts`, `stacks.js` |
| MS20 | `MS20: off a walk, grouping closes by time, a tap or leaving; nothing reads the location` (reducer and the journey's location count) | `moments/openMoment.test.ts`, `stacks.js` |
| MS21 | journey: with grouping on, no Add to this moment pill; off, the pill as in round 1 | `stacks.js` |

## Deferred

- The day's replay gets the same one beat from the same rhythm (MS17 covers both), but the e2e checks the walk's.
- A split while offline from the trace (a walk with no fixes at the piece's time) uses the original's place.

## Native that will not run on a device

The turning card on MapLibre RN's stage, a split's Undo on a phone, the switch on a phone (`docs/NATIVE_UNVERIFIED.md`).

## Questions for the owner

1. **Split's Undo.** I'd follow deletes (D5): the piece leaves at once and the new moment is stored after 5 s, so Undo
   never has to join two moments back. The cost: for those 5 s the split piece is nowhere on screen. Or store it at
   once and have Undo put it back (a "join" in storage, which MS14 keeps out).
2. **How long a stack's card lasts.** MS17 says the photos turn "within the rhythm's photo slot": 2.4 s for all of
   them, so five photos get half a second each. I'd give each photo at least the photo floor (1.2 s), so a big stack
   runs longer than one slot (still under the 60 s cap, which squeezes it back toward the floor). A video in it plays
   its own length, as a lone video does. This changes MS17's wording, so it's your call.
3. **Where the setting lives.** Navigate's settings (the ready bar pulled up), beside the pocket alert. It applies on a
   walk too.

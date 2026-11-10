# Plan: moment stacks, round 1 (MS1-MS15)

For the owner's review before any code. Decision 0106; spec `specs/moment-stacks/spec.md`. Round 0 (`specs/moment-table`)
built the storage: a moment already holds its pieces, so **this round needs no migration**.

## What the walker sees

- After any capture on Navigate (ready or walking), an **Add to this moment** pill sits in the pills, left of the stack:
  camera, mic, note, and a quiet ×. It goes after two minutes without a capture, after 100 m of walked trace (on a walk),
  on ×, on leaving the screen, opening another moment, or Start/Stop. The edge stack is untouched: one tap, a new moment.
- A moment with several pieces shows once everywhere, by its first photo or video, with a small stacked mark.
- The viewer steps through a moment's pieces (swipe, ←/→, Previous/Next piece); its existing moment-to-moment buttons
  are renamed Previous/Next moment. More offers **Delete this piece** and **Delete this moment**.
- Nothing says how many pieces a moment holds.

## Files

| Where | What |
|---|---|
| `src/lib/openMoment.ts` (new, core) | The pill's life as a reducer (100 m from the moment's first capture; a capture begun while open joins): `step(state, event, now)` over `kept`, `pieceAdded`, `walked(m)`, `tick`, `dismiss`, `leave`, `walkStarted`, `walkStopped`, `opened(otherId)`. Closes at `OPEN_MS` (2 min) or `WALK_ON_M` (100 m, the walk's own trace since the last capture). A dismissed moment never reopens. No clock: `now` is passed in (MS4, MS5, MS20 later). |
| `src/lib/openMoment/shell.ts` + `index.ts` (new) | The open moment as a `Store`, with its timer and the walk's trace distance fed in; the viewer reads it for MS12. |
| `src/lib/moment.ts` | `withPiece`, `withoutPiece` (the next face by MS8), `hasMore(m)`. |
| `src/lib/db/*`, `fakes/memoryDb.ts`, `dbContract.ts` | Two new `Db` methods, each a contract case first: `addPiece(momentId, piece)` (the moment's place and time untouched, MS3) and `deletePieces(ids)` (a moment's last piece is never deleted this way: the shell deletes the moment instead, MS13). The walk's counts follow, as `deleteMoments` does. |
| `src/lib/pieceStamp.ts` (new, core) | The stamp of a capture made for an open moment: its own time, **no location fix** (MS3), no reply. Pure, so `npm test` holds it (steward S5: `useCaptures` loads React Native). |
| `src/lib/useCaptures.ts` | An `into` option that uses `pieceStamp` and `addPiece`. |
| `src/components/walk/AddToMomentPill.tsx` (new) | The pill: ink colour, `LiftIn` with `motionTokens`, no pulse, sound or extra haptic (MS6); spoken names "Add a photo to this moment" etc. (MS2). |
| `src/app/walk.tsx`, `components/walk/useReady.tsx` | Show the pill from the open-moment store; a memo started from it records as the stack's does (Stop & save in the mic's slot, NR10); feed `walked` from the live trace; `leave` on blur/minimize. |
| `src/components/CaptureView.tsx` | Pieces paging (swipe, arrow keys, Previous/Next piece); moment paging renamed; no position or total for pieces, and the footer's `{} of {}` is dropped whenever the moment shown holds more than one piece (MS9; steward S1, and `scripts/vision.allow.json`'s reason narrowed to one-piece moments); Add to this moment while open, else Respond (MS12); Delete this piece / this moment (MS13). Edit, caption, Save and note text act on the piece shown; Respond, thread, Remind me here and Open in Maps on the moment (MS11). |
| `src/components/chronicle/MomentPicture.tsx`, `MomentCard.tsx`, pins (`components/map/*`), `MemoryPreview.tsx`, `ReminderCard.tsx` | The stacked mark when `hasMore` (MS8): a small two-card glyph in ink, never the accent colour, never beside a number; "with more in this moment" appended to the row's or pin's spoken label (steward S7). |
| `src/lib/deletion/{core,index}.ts`, `deletion/pending.ts` | `deletePiece` through the Undo window (hidden by piece id); its words ("Delete this photo from the moment?"). A stacked moment's own delete says "Delete this moment and everything in it?", toasts "Moment deleted" and counts every piece's size (steward S2). |
| `src/lib/ceremony/story.ts` | **Interim until round 2's one beat (MS17):** a stacked moment stays one event and one pile card (its face), as MS7 says; its card opens the viewer, which turns its pieces, so no piece is hidden and the path and the lows play exactly as before (steward S4). |

## Tests (todos first, one commit)

| Id | Test | Where |
|---|---|---|
| MS1 | journey: an edge tap after a pill shows makes a new moment (two moments stored) | `scripts/e2e/journeys/stacks.js` |
| MS2 | journey: the pill's three buttons, their names, one tap each | `stacks.js` |
| MS3 | `MS3: a piece added keeps its own time; the moment's place and time stay` (contract `FC7 addPiece`); `MS3: a piece's stamp asks for no fix` (`pieceStamp`); journey: no `navigator.geolocation` call while a piece is added on the ready screen | `dbContract.ts`, `captures/pieceStamp.test.ts`, `stacks.js` |
| MS4 | `MS4: the pill closes at 2 min, 100 m walked, dismiss, leave, start/stop, another moment; not on the camera, a memo, a note, the editor or the background` | `moments/openMoment.test.ts` |
| MS5 | `MS5: a piece keeps the pill and restarts its time; an edge capture moves it to the new moment` | `moments/openMoment.test.ts` |
| MS6 | journey: the pill's colour is the ink token; its labels and the saved toast are identical after the first and the third piece, with no digit; one `feedback()` call per capture; `MS6: the pill's timing comes from motionTokens` (source check) | `stacks.js`, `walk-screen/addPill.test.ts` |
| MS7 | `MS7: a three-piece moment is one entry` for every surface's reader (`toMomentViews`, `buildDays`, `memoriesNear`, `pinsFor`, `placedMoments`, `capturesHere`, finds, the pile) | `moments/oneMoment.test.ts` |
| MS8 | `MS8: the face is the first photo or video`; journey: the mark shows on a stacked row and pin only | `moments/moment.test.ts`, `stacks.js` |
| MS9 | journey: a stacked moment opened **from a list of several**: no digit, "+N" or "of" in its viewer, row or pin, read from text and labels | `stacks.js` |
| MS10 | journey: swipe, ←/→ and the buttons step through pieces in order; moment buttons renamed | `stacks.js` |
| MS11 | journey: an edit lands on the piece shown, a reminder on the moment | `stacks.js` |
| MS12 | `MS12: the viewer offers Add only while that moment is open` (store); journey | `moments/openMoment.test.ts`, `stacks.js` |
| MS13 | `MS13: deleting a piece keeps the rest and the moment's threads, reminder, find; the last piece takes the moment` (shell over `fakePorts()`); `MS13: a stacked moment's delete names the moment and counts every piece` (core words); contract `FC7 deletePieces` | `deletion/deletion.test.ts`, `dbContract.ts` |
| MS14 | `MS14: no Db method or control merges two moments` (the Db interface has no such method; the viewer's menu lists none) | `moments/oneMoment.test.ts`, `stacks.js` |
| MS15 | `MS15: a stacked moment survives a reload` (journey) and the contract over three stores | `stacks.js`, `dbContract.ts` |

A new journey, `stacks`, covers the walk screen's pill and the viewer (registered in `scripts/features.js`).

## Deferred to round 2

MS16-MS21 (Split out, the replay's one beat, the setting). Until MS17, the replay plays a moment's pieces one after
another at its place (above), never hiding one.

## Native that will not run on a device

The pill over the system camera's return on iOS and Android, a memo started from the pill, swiping pieces in the
viewer on a phone. Each becomes a `docs/NATIVE_UNVERIFIED.md` item (MS2, MS10).

## Steward (Nov 10) and triage

S1 (the footer's "2 of 5" over pieces): accepted, the footer drops its position for a stacked moment; MS9's journey opens one from a list. S2 (a stack's delete worded as one photo's): accepted, MS13. S3 (100 m from the last capture lets a moment chain along the walk): the owner's call, question 3. S4 (the interim replay against MS7, and the path's stand): accepted, a stacked moment stays one event and one card until MS17. S5 (the no-fix test cannot load `useCaptures`): accepted, `pieceStamp` core and a journey count of location calls. S6 (MS6's test missed the words and the haptics): accepted. S7 (the mark's spoken name): accepted. None rejected.

## The owner's answers (Nov 10)

1. A piece is named by its kind on screen ("Delete this photo", spoken "Next in this moment"); "piece" never appears, and the two pairs of arrows are drawn apart.
2. The mark is a two-card glyph in ink, spoken "with more in this moment".
3. The 100 m runs from the moment's first capture (steward S3): `openMoment` takes the first capture's trace position, and its test has three pieces 60 m apart, the third closing the pill.
4. A capture begun from the open pill joins the moment even if the pill closes before it is kept (`openMoment` hands the moment's id to the capture at its start).

All four are in the spec's MS4, MS8, MS10, MS13 and MS16.

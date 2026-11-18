<!-- Empty walk. Written in the repo first (2026-11-16) from the owner's ask in session: "There has to be a way for a walk to be
     dropped if no actions has happened. Sometimes a walk starts, but I didn't move, and there's no streets or actions or moments,
     but it has to go through the whole replay sequence." then their calls below. To be copied into the concept doc as a tab.
     The doc wins once it exists. -->

# Empty walk: a walk with nothing in it is dropped, not replayed (EW)

Nov 16, 2026 · @Miguel Guerrero

A walk started by mistake, where the walker never moved and kept nothing, still ends in the full replay. Stopping such a walk
drops it instead: no replay, the walk deleted, one quiet line with Undo.

## Vision

```
Idea: stopping a walk that is empty (no moments, no streets, no real movement) skips the replay and deletes the walk, with an Undo notice
Verb: honour (it keeps the record to what happened; a mistaken start is not a memory)
Touches: Never "Editing out the lows" (a low is a walk that happened; this has no trace, street or moment, so only a strict test is
  allowed); Always "Moments and the trace are truth" (a delete the owner did not ask for: Undo waits and a kill restores);
  Always "Counts are words" and "Restraint" (no figure, no celebration in the notice); 0041 (a walk delete is as if it never
  happened); 0113 (Undo waits for the owner, a kill completes the delete)
Verdict: aligned if reshaped
Shape: a strict pure test, uncertain means keep; Stop on an empty walk goes back where the walker was; one line in words with Undo
  that waits; one decision shared by both stop paths
Criteria: EW1-EW12 below
Open: none (the owner's calls are in Decisions)
```

## Decisions

- Nov 16, the owner: empty means no moments or captures, no streets, no real distance. Stopping an empty walk skips the replay and
  deletes it with a short Undo notice. Stop paths only: no sweep of existing walks.
- Nov 16, the owner: movement is the **spread of the read fixes within 15 m** (farthest pair), whatever the time spent. Time never
  decides: a long stand with no capture and no movement is dropped, a 40 m stroll is kept. The 15 m is a named constant in core,
  checked against `jitter.test.ts` fixtures before the test-first commit.
- Nov 16, the owner: the notice reads "Walk not kept." with Undo (a plain fact, no verdict on the walk).
- Nov 16, the owner: a killed app **restores** the walk. A drop is the app's call, not the owner's, so unlike 0113 it is never
  finished by a launch; it is not written to `pending_delete`. The 0113 whole-walk confirm is waived: the walk holds nothing, and Undo
  is offered.
- Nov 16, the owner: a narrow exception to 0113's "flush on every route change": the navigation Stop itself causes does not store the
  drop; any later route change does. To be recorded as a decision amending 0113 when the slice ships.
- Steward (Nov 16), accepted: absence of data is uncertainty, not emptiness (S1); spread, not distance from the first fix (S6);
  neutral copy (S5). The drop leaves no trace in Chronicle afterwards, which is the point.

## Criteria

- **EW1 (the task, in the owner's words: "drop a walk where nothing happened").** Stopping a walk with no moments, no street and
  no real movement does not play the replay and removes the walk. *Finding criterion:* the walker does nothing new: the same Stop
  that ended walks before; the result is seen on the screen they were on, in one line, with Undo.
- **EW2.** `isEmptyWalk` is a pure function of the walk's moments, pauses, stills, fills and read trace. It is true only when there is
  no moment, no pause, still or fill, at least one read fix, and every read fix lies within `EMPTY_WALK_M` (15 m) of every other.
- **EW3.** Any moment (photo, video, memo, note, text) keeps the walk, however short. One test per kind.
- **EW4.** Movement past the threshold, or a street derived from the trace, keeps the walk and plays the replay. A courtyard stroll of
  about 40 m is kept.
- **EW5.** A walk with a pause, a still or a gap fill is never empty. The pause still open at Stop is not counted: the walk screen shows Stop only while paused, so that pause is the way to Stop (the owner, Nov 18, decision 0220); a pause resumed from still keeps the walk.
- **EW6.** A walk with no read fixes (none stored, or all gated out by `readTrace` for accuracy or staleness) is kept and replays,
  moments or not.
- **EW7.** Both stop paths (walk screen hold-to-stop, recording bar Stop) reach the same decision in core; neither view duplicates it.
- **EW8.** The notice says "Walk not kept." with Undo, names no count and no judgement ("nothing", "empty", "wasted"), and waits for the
  owner: it is stored only when dismissed or on a later route change.
- **EW9.** Undo brings the walk back whole (trace, pauses, anything the delete took), in the lists and as an ordinary walk with its
  replay. A killed app after an empty stop leaves the walk in place: the drop is not saved for the next launch.
- **EW10.** The decision is made after the stop is written, so a failure to read the trace keeps the walk and plays the replay.
- **EW11.** A cold-start jump in the first fix does not by itself decide empty versus kept.
- **EW12.** Time spent does not decide: a walk of any length with one place and nothing else is dropped; the same with movement past
  the threshold is kept.

## Surfaces (from the code)

Hosts of a stop: `src/app/walk.tsx` (hold-to-stop) and `src/components/RecordingBar.tsx`. Any other route to `stopWalk`: none
(`grep stopWalk src`). The notice's host is the screen the walker lands on.

## Record (2026-11-17)

- EW1-EW12 pass: `src/lib/__tests__/deletion/emptyWalk.test.ts` (core, shell over `fakePorts()`, the Undo window) and the `capturehome` journey (EW1, EW7, EW8, EW9 on both stop paths).
- Steward (Nov 16): S1-S6 accepted. Decision 0187 records the calls and the amendment to 0113.
- Deferred: a sweep of walks already saved (the owner chose stop paths only); the UI review with screenshots did not run (the pill and its Undo are the existing component; only its words and the screen change are new).
- Native has never run on a device: see `docs/NATIVE_UNVERIFIED.md`, "Deletion".

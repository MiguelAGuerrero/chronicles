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
  allowed); Always "Moments and the trace are truth" (a delete the owner did not ask for, so Undo must wait, 0113);
  Always "Counts are words" and "Restraint" (no figure, no celebration in the notice); 0041 (a walk delete is as if it never
  happened); 0113 (Undo waits for the owner, a kill completes the delete)
Verdict: aligned if reshaped
Shape: a strict pure test, uncertain means keep; Stop on an empty walk goes back where the walker was; one line in words with Undo
  that waits; one decision shared by both stop paths
Criteria: EW1-EW10 below
Open: threshold (see Decisions)
```

## Decisions

- Nov 16, the owner: empty means no moments or captures, no streets, no real distance. Stopping an empty walk skips the replay and
  deletes it with a short Undo notice. Stop paths only: no sweep of existing walks.
- Recommended, not yet the owner's: the movement threshold is a named constant in core, **30 m** farthest from the first walked fix,
  checked against `jitter.test.ts` fixtures; a walk stopped within seconds but with real movement is kept (content, never time).
  The notice shows on the tab the walker is on.

## Criteria

- **EW1 (the task, in the owner's words: "drop a walk where nothing happened").** Stopping a walk with no moments, no street and
  no real movement does not play the replay and removes the walk. *Finding criterion:* the walker does nothing new: the same Stop
  that ended walks before; the result is seen on the screen they were on, in one line, with Undo.
- **EW2.** `isEmptyWalk` is a pure function of the walk's moments, pauses, stills, fills and read trace. It is true only when there is
  no moment, no pause, still or fill, and every walked fix lies within the threshold of the first.
- **EW3.** Any moment (photo, video, memo, note, text) keeps the walk, however short. One test per kind.
- **EW4.** Movement past the threshold, or a street derived from the trace, keeps the walk and plays the replay.
- **EW5.** A walk with a pause, a still or a gap fill is never empty.
- **EW6.** Fixes the reader gates out (stale, poor accuracy) do not count as movement, and a walk with no fixes at all and no moments is empty.
- **EW7.** Both stop paths (walk screen hold-to-stop, recording bar Stop) reach the same decision in core; neither view duplicates it.
- **EW8.** The notice says "Nothing to keep. Walk dropped." with Undo, names no count and no judgement, and waits for the owner (0113).
- **EW9.** Undo brings the walk back whole (trace, pauses, anything the delete took); a killed app after an empty stop completes the
  delete on the next launch (0113).
- **EW10.** The decision is made after the stop is written (`stopWalk`), so a failure to read the trace keeps the walk and plays the replay.

## Surfaces (from the code)

Hosts of a stop: `src/app/walk.tsx` (hold-to-stop) and `src/components/RecordingBar.tsx`. Any other route to `stopWalk`: none
(`grep stopWalk src`). The notice's host is the screen the walker lands on.

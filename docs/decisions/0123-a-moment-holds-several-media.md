# 0123. A moment holds several media: a moment table with captures under it, grouped explicitly at capture

Date: 2026-11-09 · Status: accepted · Area: captures, storage, chronicle, vision

## Context
The owner wants several shots of one subject (an oddity looked at from different angles) to be one moment rather than one
moment per shot: "the capture context serves as one moment, and any media produced within that context or session" belongs
to it. Today a `Capture` row is a moment: one piece of media, with its own walk, time and place, and every thread, reply,
reminder, find and the resurfaced card points at its id.

The gate (`/vision`, decision 0094) found it **aligned if reshaped**: it serves Honour ("Does the moment arrive whole?"),
and must keep capture one tap away, counts in words, one fix per moment (0036), and threads (0104) for groups of separate
moments. The owner was shown how other apps store it: a group key on each media row (Apple Photos' bursts, Lightroom's
stacks), or a container with children (Day One's entries, Instagram's carousels), and chose the container, accepting a
risky change if it is capable and fast.

## Decision
The owner's calls, Nov 9:
- **Every kind of media can share a moment**: photo, video, voice memo, note.
- **Grouping is explicit by default.** The edge stack's camera, mic and note each make a new moment, one tap, as now. After a
  capture, an **Add to this moment** pill offers each kind, one tap each; what it saves joins that moment. The pill closes
  when the walker leaves the screen, walks on (on a walk), or dismisses it.
- **Automatic grouping is a setting**, off by default: while on, the edge stack's captures join the open moment until two
  minutes pass with no capture, or a one-tap **New moment**. The screen says in words that a moment is open.
- **Split out**: a piece can be moved out of a moment into a moment of its own, keeping its own capture time.
- **Separate moments are never merged** into one. Grouping separate moments stays a thread (0104, `Add to a thread`).
- **The data model is a container**: a `moment` table (its walk, time and place: one row, one fix, 0036) with captures as its
  media (`capture.moment_id`, each keeping its own capture time). Existing captures migrate to one moment each, under the
  same id, so threads, replies, reminders, finds and the resurfaced card keep pointing at the same ids, now a moment's.
- **Three rounds**: round 0 (`specs/moment-table`) adds the table, migrates, and moves every screen to read moments, with no
  visible change, verified by the full e2e; round 1 (`specs/moment-stacks`) the pill, the viewer's pieces, one row and one
  pin per moment, deleting a piece; round 2 the replay's one beat, Split out, and the automatic setting.

## Consequences
- Decision 0104's "a moment is a node and gets no new field" holds for the moment row: adding or removing a piece never
  edits it, its memberships or its links. "Moments stay whole" holds more strongly: the angles are the moment.
- Moments and captures are both truth. A capture's own `t` stays its own; the moment's place is its one fix (or its walk's
  trace at its time), never recomputed from the pieces.
- Deleting the last piece of a moment deletes the moment, with its memberships, links, reminder and find (OT16's cascade).
- Storage: a new `MIGRATIONS` entry (SQLite) and an IndexedDB `VERSION` bump with an `oldVersion < N` step; no existing
  migration is edited.
- **Proposed edit to `docs/VISION.md`** (the owner makes it): a Shapes row, "Several shots of one subject | aligned if
  reshaped | One moment holding several media, grouped explicitly by a pill after a capture (automatically only by a
  setting); separate moments are grouped by a thread, never merged; its size never a number", and 0123 in Precedents.

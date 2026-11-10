# Plan: moment table (round 0 of moment stacks, MT1-MT10)

For the owner's review before any code. Decision 0106; spec `specs/moment-table/spec.md`. Nothing on screen changes.

## The model

```ts
// src/lib/types.ts (core)
interface Moment {                 // truth: the moment, its one place and time (0036)
  id: string;                      // existing captures' ids, so threads, replies, reminders, finds keep pointing
  walk_id: string | null;
  t: number;                       // the moment's time: its first piece's
  lat: number | null; lon: number | null;
  segment_id: string | null;
  pieces: Capture[];               // in capture order; round 0: always exactly one
}
interface Capture {                // truth: one piece of media (the name stays, to keep the diff honest)
  id: string; moment_id: string; t: number; kind: CaptureKind;
  file_path; body; caption?; caption_y?; thumb_path?; edit?;   // unchanged
}                                  // walk_id, lat, lon, segment_id move to Moment
```

`src/lib/moment.ts` (new, core): `face(m)` (the first photo or video, else the first piece), `pieceOf(m, id)`,
`withPiece`/`withoutPiece` (round 1), `momentOfCapture` (for the migration and the fake). Removing the moment-level fields
from `Capture` makes TypeScript list every reader that has to move, so nothing is missed silently.

## Storage

**SQLite, migration 23** (`MIGRATIONS[23]`, `src/lib/db/index.native.ts`; no earlier entry edited):

```sql
CREATE TABLE moment (id TEXT PRIMARY KEY, walk_id TEXT, t INTEGER NOT NULL, lat REAL, lon REAL, segment_id TEXT);
INSERT INTO moment (id, walk_id, t, lat, lon, segment_id) SELECT id, walk_id, t, lat, lon, segment_id FROM capture;
ALTER TABLE capture ADD COLUMN moment_id TEXT;
UPDATE capture SET moment_id = id;
CREATE INDEX moment_walk ON moment(walk_id, t); CREATE INDEX moment_place ON moment(lat, lon);
CREATE INDEX moment_t ON moment(t); CREATE INDEX capture_moment ON capture(moment_id, t);
```

The capture table's old `walk_id`, `lat`, `lon` and `segment_id` columns stay, unread and unwritten (dropping columns
means rebuilding the table, a second risk for no gain; `docs/DEFERRED.md`). Reads are one statement each:
`SELECT … FROM moment m JOIN capture c ON c.moment_id = m.id WHERE … ORDER BY m.t, c.t`, folded into moments by a core
`foldRows` (MT7).

`MIGRATIONS` moves to `src/lib/db/migrations.ts` (plain strings, no React Native) so a unit test can run every migration
in Node's built-in `node:sqlite` (Node 22): the first time the SQLite path is tested at all.

**IndexedDB, version 18** (`src/lib/db/index.web.ts`, `oldVersion < 18`): a `moment` store, keyPath `id`, with each moment's
pieces **inside its record** (`pieces: Capture[]`) and indexes `walk_id`, `t`, `lat` (as the capture store had) and
`piece_ids` (multiEntry, for a piece's own updates). The step copies every capture into a one-piece moment, in the upgrade
transaction, then deletes the `capture` store. One record per moment means every read is one request, and a moment with
its pieces is written atomically (MT3, MT7). The physical shape differs from SQLite; the Db contract (FC7) holds both to
the same behaviour.

**The Db interface** (`src/lib/db/types.ts`), each method a contract case in `dbContract.ts`:

| Today | Round 0 |
|---|---|
| `addCapture(c)` | `addMoment(m)` (the moment and its first piece, one transaction) |
| `updateCapture(id, patch)` | `updateMoment(id, {lat, lon, segment_id})` (place) and `updatePiece(id, patch)` (media) |
| `getCaptures(walkId)` | `getMoments(walkId)` |
| `capturesBetween`, `getCapturesByIds`, `capturesIn` | `momentsBetween`, `getMomentsByIds`, `momentsIn` |
| `deleteCaptures(ids)` | `deleteMoments(ids)` (pieces, memberships, links, recall, finds unless `keepFinds`) |
| `deleteWalk`, `saveSnap` counts | via moments; counts are still of pieces by kind (identical in round 0) |

The fake (`__tests__/fakes/memoryDb.ts`) follows the web store, as it does today.

## Readers (every file the refactor map found; one line each)

| Area | Files | What changes |
|---|---|---|
| Capture flow | `lib/useCaptures.ts`, `lib/captureBus.ts`, `components/MomentBar.tsx`, `RecordingBar.tsx`, `components/walk/useReady.tsx`, `lib/ready/shell.ts` | write `addMoment`; `placeMoment` writes the moment's place (MT5); the bus carries moments and two patch kinds (place, piece) |
| Placement at stop | `lib/finish.ts` | `placeCaptures` → `placeMoments`, `updateMoment` (MT5) |
| Viewer | `components/CaptureView.tsx`, `MemoryPreview.tsx`, `chronicle/MomentPicture.tsx`, `edit/MediaEditor.tsx`, `lib/captureEdits/shell.ts`, `lib/export/index.*.ts` | pages through moments, shows `face(m)`; edits and keepers act on the piece |
| Chronicle, days | `app/(tabs)/chronicle.tsx`, `components/HomeSheet.tsx`, `lib/days.ts`, `app/day/[key].tsx`, `chronicle/MemoriesScreen.tsx`, `lib/memories.ts` | moments in; counts in words unchanged (one piece each) |
| Pins | `lib/pins.ts`, `lib/momentPins.ts`, `components/map/*` | one pin per moment, kind from `face(m)` |
| Replay | `lib/replay.ts`, `lib/summary.ts`, `lib/ceremony/{story,rhythm,types}.ts`, `components/ceremony/*`, `app/replay/[id].tsx` | moments in; a one-piece moment is one slot, as today |
| Threads | `lib/threads/shell.ts`, `components/threads/AddToThread.tsx` | `getMomentsByIds`; `moment_id` already means the moment |
| Resurface | `lib/resurface/{views,shell,types}.ts` | `MomentView.moment`; card text from `face(m)` |
| Discovery | `lib/discovery/{recall,recallCheck}.ts`, `components/ReminderCard.tsx`, `lib/explore/useExplore.ts`, `lib/explore/momentFind/shell.ts` | recall and finds keyed by the moment id (same values) |
| Deletion | `lib/deletion/{index,core}.ts`, `deletion/pending.ts` | `deleteMoments`; `filesOf` over every piece |
| Here, walk | `lib/here/shell.ts`, `app/walk.tsx` | `momentsIn` |
| Export, log | `lib/export/bundle/shell.ts`, `lib/gpsLog.ts`, `lib/shareLog/shell.ts` | walk.json lists moments with their pieces; media files still named by piece id (MT8) |

Thumbnails and media files are named by the piece's id, which is unchanged, so no file moves.

## Tests per criterion (todos first, in one commit)

| Id | Test | Where |
|---|---|---|
| MT1 | `MT1: a v17 IndexedDB upgrades to one-piece moments`; `MT1: SQLite migration 23 over seeded rows in node:sqlite`; `MT1: no earlier migration changed` (hash of entries 0-22) | `__tests__/storage/momentMigration.test.ts` |
| MT2 | `MT2: threads, links, recall, finds and resurface prefs read the same after the upgrade` | same file |
| MT3 | `FC7 addMoment, MT3: the moment and its first piece are one write` (+ a failing put leaves nothing) | `dbContract.ts` |
| MT4 | `FC7 getMoments / momentsBetween / getMomentsByIds / momentsIn, MT4: …` (today's capture cases, carried over) | `dbContract.ts` |
| MT5 | `MT5: placing at stop writes the moment's place`; `MT5: a piece's update never moves the place` | `__tests__/recording/finish…`, `dbContract.ts` |
| MT6 | `MT6: deleting a moment takes its pieces, files, memberships, links, recall and find`; `MT6: deleteWalk takes its moments` | `__tests__/deletion/deletion.test.ts`, `dbContract.ts` |
| MT7 | `MT7: SQLite reads are one statement` (count over the node:sqlite adapter); `MT7: 5,000 moments read within twice a flat store's read` | `__tests__/storage/momentPerf.test.ts` |
| MT8 | `MT8: the bundle records each piece's moment` | `__tests__/captures/bundle.test.ts` |
| MT9 | `check(…, 'MT9: …')` in a new journey **`upgrade`**: the browser is seeded with a version-17 database (captures, a thread, a reminder) before the app loads; Chronicle, a day, a pin, the viewer and the thread show them as before | `scripts/e2e/journeys/upgrade.js` |
| MT10 | `MT10: moment.ts is core and tested` (the layer check), `face`/`foldRows` unit tests | `__tests__/moments/moment.test.ts` |

**An extra, recommended:** run the native store (`index.native.ts`) under the same Db contract through a small
`node:sqlite` adapter that mimics the handful of `expo-sqlite` calls it uses (`getAllAsync`, `getFirstAsync`, `runAsync`,
`execAsync`, `withTransactionAsync`). Today SQLite is "held to the same behavior by hand"; with this every migration and query of
the native store would run in `npm test`. About a day's work. The owner can cut it.

Before done: typecheck, lint, `npm test`, the journeys `check:affected` names, then the **full e2e flow** (the owner's call in 0106).

## Deferred

- Dropping the SQLite capture table's dead `walk_id`, `lat`, `lon`, `segment_id` columns (a table rebuild for no
  behaviour).
- Everything with more than one piece: `specs/moment-stacks` rounds 1 and 2.

## Native that will not run on a device

- Migration 23 on a phone with existing walks and moments (`docs/NATIVE_UNVERIFIED.md`: **Do:** update the app over a
  phone with walks, moments, a thread and a reminder. **Expect:** every one is there and opens as before (MT1, MT2)).
- The joined reads on expo-sqlite (covered in Node only if the extra above is taken).

## Round 1's open questions

None. The steward reviewed `specs/moment-stacks/spec.md`. Its ten findings were accepted into MS1-MS21, and the owner
answered the four it left open on Nov 10 (see that spec's Decisions and Steward sections). Round 1 gets its own plan once
round 0 is merged.

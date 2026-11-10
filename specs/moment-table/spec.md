<!-- Repo only: round 0 of moment stacks (decision 0106), an engineering slice with no visible change. Not a concept-doc tab. -->

# Moment table: a moment holds its media (round 0 of moment stacks)

Nov 9, 2026 · @Miguel Guerrero

Today a `Capture` row is a moment: one piece of media with its own walk, time and place. Decision 0106 makes the moment a
container: a `moment` row (its walk, time and place, its one fix) with captures under it as its media, each keeping its own
capture time. This round moves the storage and every reader to that model **with nothing on screen changing**: every
existing capture becomes a moment of one piece, under the same id, so threads, replies, reminders, finds and the resurfaced
card keep pointing where they did. Stacks themselves (more than one piece) come in `specs/moment-stacks/spec.md`.

## Vision

Verdict: no surface (storage and readers move to moments; every screen shows what it showed before, MT9).

## Decisions (the owner's calls, Nov 9, decision 0106)

- A container model (like Day One's entries or Instagram's carousels) over a group key on each media row (Apple Photos' bursts): moment-level facts have one home, and "one fix per moment" (0036) is one row.
- A risky change is accepted if it is capable and fast; this round goes first, with no visible change, so a regression shows before stacks exist.
- Existing captures migrate to one moment each under the same id.
- The native store runs under the Db contract in Node (Nov 10, MT11).

## Criteria

### Storage

1. **MT1 · Every capture becomes a moment.** On upgrade (a new SQLite `MIGRATIONS` entry; an IndexedDB `VERSION` bump with an `oldVersion < N` step), every existing capture becomes one moment with the same id, carrying its walk, time, place and street segment, and the capture becomes that moment's only piece with its own time and media fields unchanged. No capture is lost or duplicated, and no earlier migration is edited.
2. **MT2 · Ids keep pointing.** After the upgrade, every record keyed by a capture id (thread memberships, replies, reminders, finds, the resurfaced card's state, and the rest MT's plan lists) reaches the same moment and reads the same as before.
3. **MT3 · One write.** Keeping a capture writes its moment and its first piece in one transaction; if either fails, neither is kept.
4. **MT4 · Moments with their pieces.** Every store read that returned captures returns moments, each with its pieces in capture order; for a corpus of one-piece moments every read returns what it returned before (the Db contract, FC7, against the fake and the IndexedDB store).
5. **MT5 · Place belongs to the moment.** Placing a moment (at a walk's stop, or its one fix outside a walk, 0036) writes the moment's place; no piece's write moves it.
6. **MT6 · Deletes.** Deleting a moment deletes its pieces, their media files, its memberships, links, reminder and find (D2, D3, OT16); deleting a walk deletes its moments and their pieces (D1, OT17), as before.
7. **MT7 · Fast.** A read of a walk's, a day's or an area's moments is one statement on SQLite (moments joined to their pieces) and one transaction on IndexedDB, never one query per moment; over a corpus of 5,000 one-piece moments, the IndexedDB store's reads take no more than twice today's capture reads, measured in the same run.
8. **MT8 · The bundle.** A walk's bundle (`writeWalkBundle`, deferred in the UI) keeps every piece's media and records which moment each piece belongs to.

### Nothing on screen changes

9. **MT9 · No visible change.** Every e2e journey passes unchanged, run as the full flow once at the end of the round (the owner's call, decision 0106), and every unit test's expected values are unchanged apart from the shape of a moment.
10. **MT10 · Layers.** The moment's shape and the pure readers over it are core modules with tests first; views read moments through the existing shells and never import the `db` (functional core).

### The native store, tested

11. **MT11 · SQLite under the contract.** The native store (`db/index.native.ts`) runs under the same Db contract (FC7) as the fake and the IndexedDB store, in `npm test`, over Node's built-in SQLite through an adapter for the `expo-sqlite` calls it uses; every migration runs from an empty database and from one at `user_version` 22, today's schema (the owner's call, Nov 10).

## Record

Built 2026-11-10 on `claude/wizardly-mayer-k9vmge` (tests first `135809f`, code `43d02cc`, journeys `cc84ad7`).

- MT1-MT8, MT10, MT11: unit tests in `src/lib/__tests__/storage/` (`momentMigration`, `momentPerf`, `db.contract`), `moments/moment.test.ts`, `captures/bundle.test.ts`, `deletion/deletion.test.ts`; the Db contract runs over the fake, IndexedDB and SQLite (node:sqlite). 5,000 moments read from IndexedDB in about 33 ms against about 25 ms for a flat store (MT7).
- MT9: the `upgrade` journey (a version-17 database seeded before the app loads) passes on its own (5 checks), and the full e2e flow passes on the web build: 447 checks, none failed, about 19 minutes (2026-11-10).
- Every reader moved to moments as `Faced` rows (the moment's place and time with its face's media); expected values of existing unit tests unchanged apart from the shape of a moment.
- Deferred: dropping the SQLite capture table's dead columns (`docs/DEFERRED.md`).
- Native: migration 22 and expo-sqlite itself have never run on a phone (`docs/NATIVE_UNVERIFIED.md`, MT1, MT2, MT9, MT11).

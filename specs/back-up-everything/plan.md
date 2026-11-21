# Back up everything: plan

From G10, answered yes in person 2026-11-20 (`/tend inbox G10 yes`); decision 0241, brief
`docs/research/app-backup.md`. Read by the steward, not held for the owner (decision 0130); the steward's findings
are triaged at the end.

## Files

Source (13, `npm run book:files -- --max-src`; the tripwire of this run is about twelve, see "Size" below):

- New `src/lib/backup/core.ts` (core): the format (`BACKUP_FORMAT = 'chronicles-backup'`, `BACKUP_VERSION = 1`), the
  manifest, the classification of every store and meta key (`STORES`, `META_KEYS`, `META_FAMILY_KEYS`: `backup` or
  `cache`, each with its reason), the zip's entry names (`entryOf(ref, pieceId)`: `media/<ref>`, a legacy `file://` or
  odd ref under `media/legacy/<piece id>.<ext>`, a `data:` ref none, since its bytes are in the row), the upgrade chain
  (`UPGRADES`, one step per version, empty while only version 1 is released) and the reader `readBackup(entries)`
  that gives today's rows or a refusal in words; the page's words (`backupWords`: the line of what the file is, the
  "Last backup made" line from date parts, the missing files in words, the refusals).
- New `src/lib/backup/shell.ts` (shell): `createBackupWriter(p: Pick<Ports, 'db' | 'clock'>)`: `writeBackup(io)` reads
  every truth store through the `Db`, one walk's trace at a time, streams the zip through fflate's `Zip` and
  `ZipPassThrough` to `io.write` as `writeWalkBundle` does, media in chunks from `io.readMedia`; asks `io.room` first
  when given (native); sets `backup_last` only after `io.deliver()` resolves; `lastBackedUp()` reads it. The page's
  state (idle, busy, the last line, the after line) is a `Store` (`lib/store.ts`).
- New `src/lib/backup/index.ts` (shell, `@instance`): `backup = createBackupWriter(ports)`.
- `src/lib/export/index.native.ts` (adapter): `backUpEverything()`: the room (`probe.free()` from `lib/space/probe`
  against `mediaBytes(refs)` from `lib/media`), the zip written to a file under `Paths.cache/exports`, the share sheet
  (`Sharing.shareAsync`, `application/zip`, `public.zip-archive`), then the file deleted, whatever the sheet did; the
  app's version from `expo-constants` (`Constants.expoConfig?.version`), the store's schema version
  `MIGRATIONS.length`. Reuses `chunksOf` and `resolveMedia`.
- `src/lib/export/index.web.ts` (adapter): `backUpEverything()`: Blob parts, one `download()`; reuses `mediaBlob`,
  `chunksOf`, `download`; the schema version from `indexedDB.databases()` where the browser has it, else null.
- `src/lib/export/index.ts`: the shim names `backUpEverything`.
- `src/lib/db/types.ts`, `src/lib/db/sqliteStore.ts`, `src/lib/db/index.web.ts`: two reads, each a contract case
  first (`dbContract.ts`) and in the fake (`memoryDb.ts`, `DB_READS`): `looseMoments()` (the moments of no walk, in
  time order: `.claude/rules/storage.md` forbids `momentsBetween(0, MAX)` in new code) and `listOffered()` (the retired
  scan's offered places: truth by `KEPT_STORES`, named by 0241's Consequences, and read by nothing today). No schema
  change, no migration, no index: `moment.walk_id IS NULL ORDER BY t` on SQLite (the `moment_walk (walk_id, t)` index
  serves it); IndexedDB leaves a null `walk_id` out of its `walk_id` index, so the web walks the `t` index and keeps
  `walk_id === null` (one pass over the moment store, once per backup).
- `src/lib/meta.ts`: `backup_last` (`number`, ms), owner `backup`.
- New `src/app/your-data.tsx` (view): the page. `<Stack.Screen options>` in the route (title "Your data", Back), as
  `into.tsx` does, so `_layout.tsx` is not touched; Escape goes back on the web.
- `src/components/StartSettings.tsx`: after Distances, a rule and a row, "Your data" and a chevron, `router.navigate`
  (a second tap pushes nothing).
- `scripts/features.js`: a feature `backup` (its source, the `backup` journey, this spec, rule `backup`) and the spec in
  `IN_PROGRESS`.

Not source: `src/lib/__tests__/backup/*.test.ts` and `fixtures/backup-v1.zip`; `src/lib/__tests__/dbContract.ts`,
`fakes/memoryDb.ts`; `scripts/e2e/journeys/backup.js`; `.claude/rules/backup.md` (new, `paths:` `src/lib/backup/**`,
`src/app/your-data.tsx`: this slice has its own decision and folder, slice step 7); `docs/ARCHITECTURE.md` (the codemap,
and the "Data model" brought level with the classification, as the brief asks), `docs/PRODUCT.md`,
`docs/NATIVE_UNVERIFIED.md`, `docs/DEFERRED.md`, `docs/STATUS.md` through `npm run records`; `docs/expectations/backup.md`
through `npm run expectations`.

## Data

No new truth, no migration, no IndexedDB version. One meta key, `backup_last` (cache: it says when this device last
made a file, so it is not in the file). The file's format, version 1:

```
manifest.json     { format: "chronicles-backup", version: 1, app: { version, platform }, schema: { store, version },
                    made_at (ISO), stores: [names held], media_missing: [piece ids] }
walks.json        Walk[]
trace/<walk id>.json   TracePoint[] in the store's order, one file per walk
moments.json      Moment[] with pieces, walks' and loose; each piece without thumb_path, with media: <entry> | null and
                  media_missing: true when its file was gone
pauses.json, stills.json, gap_fills.json   all walks' rows
reactions.json, threads.json ({ threads, members, links }), recalls.json, finds.json, checklist_areas.json,
checklist_items.json, marks.json (each walk's and the home's), offered.json, transcripts.json
meta.json         { keys: { <META key>: raw }, walks: { <family>:<walk id>: raw } }   backed-up keys only, non-empty
media/<ref>       each piece's original, stored as is (ZipPassThrough)
```

The classification (BK3), each with its reason in `core.ts`:

- Backed up: `walk`, `trace_point`, `moment`, `capture`, `pause`, `still`, `gap_fill`, `reaction`, `thread`,
  `thread_member`, `moment_link`, `recall`, `find`, `checklist_area`, `checklist_item`, `mark`, `offered`,
  `transcript` (a cache, 0169, and the one carried: the web has no recognizer to make it again, and the phone would
  recognise every memo again; named so in BK3 and `core.ts`, audit 3), `meta`
  (by key, below), the web `media` store (as files).
- Cache: `street_segment`, `place`, `explore_read`, `atlas_area`, `outline_tile`, `walk_tile`, `complex`, `area`,
  `walk_area`, `walk_summary`, `visited_segment`, `walk_line`, `walk_line_tile`, `landing`; migration scratch
  `capture_new`, `find_new` (renamed away).
- Meta keys backed up (the person's choices): `units`, `route_leanings`, `explore_hidden`, `explore_kinds_known`,
  `explore_range`, `explore_pass`, `complex_hidden`, `explore_haptic`, `map_layers`, `walk_layer`, `kindwalk_*`,
  `outing_chains`, `resurface_prefs`, `gallery_view`, `group_captures`, `notify_off`, `transcript_off` (audit 9: a
  refusal the person made, as `notify_off` is); families `explored`,
  `places_spans`, `walk_pass`, `walk_layers`, `gaps_asked` (per walk, read as `<family>:<walk id>` for each walk).
- Meta keys left out (this device's state or a cache): the tile and data keys (`tile_build`, `tile_url`, `snap_rules`,
  `street_code`, `overture_*`, `places_archive_*`, `outline_nested`), what is open now (`nav`, `way_back`,
  `outing_journey`, `pending_delete`), what this device asked or showed (`space_said`,
  `space_persist`, `recall_open`, `web_note_dismissed`, `deadzone_walk`, `hint_go`, `atlas_press_seen`), `backup_last`,
  and the families `day_watched` (keyed by day, not by walk) and `atlas_near`.

A test reads every `CREATE TABLE` in `MIGRATIONS` (less those renamed away), every `createObjectStore` in
`db/index.web.ts`, every key of `META` and `META_FAMILIES`, and fails on one the classification does not name, and on
a cache store (`DERIVED_STORES`) named as backed up or a `KEPT_STORES` one named as cache.

A delete waiting for Undo (BK14, audit 2): the writer reads `pending_delete` (the jobs saved for a relaunch, 0113)
and a core function lists what they name: a walk (and everything of it), moments, pieces, a thread, a membership; a
split or a join waiting changes nothing stored that a person lost, so the file holds the moment as stored. Rows that
hang on a left-out moment or piece (its reactions, reminder, find, transcript, memberships, links) and its files are
left out too.

## Tests per criterion

`src/lib/__tests__/backup/` (a new feature folder):

- `core.test.ts`: BK3 (the classification against the schema and the meta), BK4 (a newer version refused in those
  words; a chain of injected steps runs in order from an older version; the frozen `fixtures/backup-v1.zip`, pinned by
  its sha-256, reads into today's rows), BK8 and BK9 (the words: "Last backup made October 3", another year with its
  year, "Not backed up yet"; the page's one line; no numeral in any word the page can show), BK6's words (missing
  files: "Two photos could not be found and were left out", one kind and mixed kinds).
- `shell.test.ts` over `fakePorts()`: BK2 (the entries and the manifest), BK5 (the seeded library read back by the
  core: the same rows, ids and trace order; thumb_path left out), BK6 (media through in chunks: a reader that yields
  several chunks gives one entry with every byte; a gone file left out, marked, counted), BK7 (`io.room` saying too
  little: nothing written, nothing delivered, the words), BK8 (`backup_last` set only after delivery), BK11 (a write
  that throws: the refusal words, `backup_last` unchanged, the adapter's discard called), BK12 (a second call while
  one runs makes no second file).
- `dbContract.ts`: `looseMoments` and `listOffered` cases (fake, IndexedDB, SQLite).
- BK14 in `shell.test.ts` (a waiting walk delete and a waiting moment delete: neither, nor their rows and files, in
  the file), and the core's list in `core.test.ts`.
- BK13: the journey (the row and its second line drawn in view at the drawer's foot, from launch) and the ux-reviewer's
  cold find at the diff pause.
- Journey `scripts/e2e/journeys/backup.js` (new): BK1 (the row at the foot of Walk settings, in ink, the page, Back to
  the drawer still raised), BK9 (the page's line; no numeral on the page), BK10 (the download unzipped in the page:
  the manifest's format and version, walks.json, the trace and moments.json match the walk the journey seeded, a
  media entry's bytes equal the stored blob; the line reads today's date), BK12 (the button says "Backing up…" while
  it works). Shots at 390 and 320 px: the drawer's foot with the row, the page before, the page after.
- BK6 native and BK7 native: items in `docs/NATIVE_UNVERIFIED.md`; `UNTESTED` gets none, since each criterion has a
  test of its logic.

## The testing's size

Flow (a new route reached from a row; the page reads and writes meta). Journeys: `backup` (new, about 2 minutes),
alone until green; `launch` as the smoke before publishing. No control is removed or renamed (grep of `start-settings`,
`units-km`: the row is added after them, so the `ready` and `into` journeys' checks are not reached; a check that
counts the drawer's rows would be: none found).

## Deferred, and why

- Restore from a backup: the second slice (0241).
- A passphrase: the owner's call, a plain zip (0241).
- The web's whole zip is held as Blob parts until the download (as `exportWalk` does); a library of long videos on
  iPhone Safari may fail there (brief, engineering unknowns): filed in `docs/DEFERRED.md` with what a test would need.
- The native zip in the cache doubles the library's space while it exists: the room check counts it (BK7).

## Native paths that will not run on a device

`expo-file-system`'s file handle under `Paths.cache`, `Sharing.shareAsync` with a zip, the delete after the sheet,
`Paths.availableDiskSpace` against the media's size, `Constants.expoConfig.version`. Each a `NATIVE_UNVERIFIED` item.

## Cost

Reads every truth row once per tap: walks, then each walk's trace, pauses, stills, gap decisions and marks, and its
five per-walk meta keys, one walk at a time (a library of years: about a thousand walks, so some eight thousand small
reads, a few seconds on a phone, once per tap); moments of every walk plus `looseMoments()` (a few thousand rows of a
few hundred bytes); the rest whole tables of a few hundred rows. Only one walk's trace is in memory at a time (a
four-hour walk at a fix a second, about 15,000 points, a few MB of JSON). Media are streamed in 1 MB chunks; nothing
per frame or per fix. The web's zip is held as Blob parts (the browser may page them to disk). Harness: none in the
repo measures a backup; the shell test times nothing. Device only.

## The screens

Walk settings (the ready bar's pulled-up drawer), the new row:

- Goal: keep a copy of everything; rare (now and then, before changing phones). Control: a row with its words and a
  chevron that pushes a page (matrix row 11; "Navigate to a related item": a row with a disclosure indicator, pushed
  with the standard Back). Adjacent apps: Apple Journal's and Day One's export sit in their settings, a row that opens
  a page.
- Where the owner looks first: Walk settings, the app's only settings panel (0241, the owner's own choice); the row is
  its last, after Distances, under a rule, as the brief says ("Walk settings ends with").

The "Your data" page:

- Goal: make the file; rare. Control: one button, "Back up everything", the page's only prominent action (matrix row
  22's "one prominent control", not on the move: the page is reached only off a walk). Day One's "Export Day One
  JSON" and Apple Journal's "Export" are each one button.
- Status: the "Last backup made" line under the button (matrix row 19, inline status near the thing it describes; spoken
  as a polite live region when it changes).
- Success: the line changes to today's date and nothing else (matrix row 20: an inline change; no toast, no
  celebration).
- Failure: one inline line under the button in words, why and what to do (matrix row 21).
- Back: the stack's Back (matrix row 23), and Escape on the web.

Against precedent: Apple Journal and Day One export from their settings screens directly; here the action sits one
row further, on a page of its own: the owner's call (0241, "a small Your data page"), so Restore can join it.

Defaults that make something quieter, named so the owner can overrule them:

- The row's words are in ink at the switch rows' size with a chevron, never muted (Found before quiet, 0167); it is
  the drawer's last row, so it is below the fold of the raised drawer at 390 x 844: a person scrolls Walk settings to
  reach it, as they do for Distances.
- The line of what the file is sits above the button in the muted secondary style of the drawer's notes.
- No icon on the button.

## The steward's review (Nov 20), triaged

Ten findings, all accepted before any code (the orchestrator's rulings; S1, S4 and the three silent questions answered
by the owner in person, 2026-11-20, decision 0247). Folded into the criteria; each test named `back-up-everything audit
N` for the record: S1 audit 1 (BK8 "Last backup made"), S2 audit 2 (BK14), S3 audit 3 (BK3 names the transcript), S4
audit 4 (BK1's second line, BK13), S5 audit 5 (BK7's words, verbatim), S6 audit 6 (BK11's words), S7 audit 7 (BK6, each
kind named), S8 audit 8 (BK9, no numeral but a date's), S9 audit 9 (`transcript_off` carried), S10 audit 10 (the spec's
Apple Journal precedent as recorded). The expectation lines: the steward's corrections taken. Restore-slice notes in
the spec. The 13 source files: the orchestrator's go-ahead (the tripwire was about architecture; two read-only Db
methods with contract cases are not a data-model change).

## Judgement calls for the steward (as asked; settled by the triage above)

1. **"Last backed up" on native is set when the share sheet closes**, whether the file was saved or the sheet was
   dismissed: iOS `shareAsync` resolves either way (brief, engineering unknowns). The alternative, never setting it on
   native, leaves the line "Not backed up yet" there for good. Recommended: set it when the sheet closes, the line in
   BK8's words; the native item records that a dismissed sheet also moves the date.
2. **The zip is named** `chronicles-backup-2026-11-20.zip` (the date only, no count, no size).
3. **The missing-files words** name each kind ("A photo and two memos could not be found and were left out", audit
   7); said once, after, under the line, until the page is left.
4. **The 13 source files** (Size, below).

## Size

13 source files against the run's tripwire of about twelve. Without the two Db reads it is 10, but then `offered`
(truth by `KEPT_STORES`, named by 0241) would be left out of "everything", and loose moments read by
`momentsBetween(0, MAX)`, which the storage rule forbids in new code. Recommended: build the 13, the three db files
carrying one read each beside a contract case.

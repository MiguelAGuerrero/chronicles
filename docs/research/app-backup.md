# Backing up the whole app and restoring it: investigation (2026-11-20)

From: the owner's /investigate, 2026-11-20: "As the app grows, and I've been using it, I've been growing a little bit
more concerned by the lack of the ability to export out all my media moments and effectively app data into a
compressed, I guess, backup that I can export out and save wherever, effectively just one big zip or some other
structured file that the app can read in and read out to restore the state effectively. How would that best be
performed?" Queued as G10. Status: queued.

## What the owner saw

No picture: an absence. What the app has today, mark by mark.

| What | Where | State |
|---|---|---|
| A zip of one walk (walk.json, version 2, plus `media/<piece id>.<ext>`) | `src/lib/export/bundle/shell.ts` (`writeWalkBundle`) | Built in Round 3; no screen calls it (`exportWalk` has no caller outside `lib/export`); decision 0007 |
| The share sheet (native) or a download (web) for that zip | `src/lib/export/index.native.ts:51-76`, `index.web.ts:54-65` | Unreached |
| Saving one photo or video from the viewer | `saveKeeper`, same files | Shipped: the only thing that leaves the app today, one file at a time |
| Reading any zip back | nowhere | No import, no file picker, no `unzip` call in `src/` |
| A settings page | none | The only settings panel is "Walk settings" (`src/components/StartSettings.tsx:51`), in the walk screen's pulled-up drawer: units, notifications, group captures; decision 0041: "No Storage screen" |

## Why it reads wrong

Ranked, most to least.

1. **Nothing reaches the export, and it covers one walk.** 0007 held it back "until the export system has a proper
   place in the app"; no place was ever made, so every walk, moment and memo lives only in the app's own store.
2. **There is no restore.** Nothing reads a bundle (`docs/DEFERRED.md`, "Captures, media and export": "There is no
   import of the backup bundle yet"), so even the per-walk zip is a copy, not a backup.
3. **The per-walk bundle leaves truth out.** Stills, gap decisions (`DEFERRED.md`, same section), threads, links,
   finds, recalls, checklists, transcripts and every preference are not in it; loose moments (no walk) cannot be in it
   at all.
4. **The store has no path to put rows back as they were.** `createWalk` and `addMoment` are plain `INSERT`s
   (`src/lib/db/sqliteStore.ts:170-174`, `:217-222`), so a second restore fails on the first existing id;
   `appendPoints` (`:198`) has no key, so restoring a walk twice doubles its trace; nothing writes `offered` or
   `mark`; each write is its own exclusive transaction on the one queue, too slow for a library.
5. **Where the bytes live differs by platform.** Native media are files under `Paths.document/walks/<walk>/`
   (`src/lib/media/index.native.ts:13-21`, refs relative, `walks/moments/` for loose moments); web media are blobs in
   IndexedDB's `media` store keyed by the same ref (`src/lib/db/index.web.ts:55`, `:917`). A file that holds refs and
   bytes restores on either.
6. **On purpose, kept:** caches are not truth (`src/lib/db/stores.ts:7`, `DERIVED_STORES`; summaries, visited rows,
   areas, walk lines, landing), and small copies (`thumb_path`) are rebuilt (0038). The file carries neither.

What the phone itself does: an iPhone or Android device backup probably carries the app's documents and its SQLite
file whole, but only as a whole-phone restore, never on the web, and never seen on a device here (unverified).

## How adjacent apps do it

Recorded in `docs/research/adjacent-apps.md`, "Back up everything and restore it".

- **Apple Journal**: "Export All Journal Entries" in its settings, one ZIP with photos and locations; no import back.
  https://support.apple.com/121822 . **Verified**.
- **Day One**: "Export Day One JSON", all data and media, re-imported with "Import JSON"; merge or replace not said.
  https://dayoneapp.com/guides/tips-and-tutorials/transitioning-day-one-data-to-a-new-device . **Verified**.
- **Organic Maps**: every bookmark and track as one KMZ the app reads back. From memory, **unverified**.
- **Polarsteps**: "Download my data" on the website, a zip of JSON and photos; no import. Search summary,
  **unverified**.

## Options

| # | The change | Answers | Vision risk | Rough cost |
|---|---|---|---|---|
| A | **Leave it**: the phone's own device backup is the only copy | none | none | nothing; a lost or replaced phone, or a cleared browser, loses every moment; no copy you hold yourself |
| B | Ship 0007's per-walk zip on each walk's More (⋯) menu | 1 | low | S; one menu row, native share unverified; still no restore and most truth missing (3) |
| C | **Back up everything** to one versioned zip, from a small page | 1, 3, 5 | low: leaves only on a tap | M; about 8 files, a new route, a new `lib/backup`, Db reads per store; native share and file handle |
| D | C plus **Restore**, adding what the device lacks by id | 1-5 | low | L; C plus a picker (`File.pickFileAsync`, already in expo-file-system 58; a file input on the web as a listed exception), bulk Db writes, media placement, caches recomputed |
| E | C plus a replacing restore (wipe, then load) | 1-5 | medium: a whole library deleted by one tap | L; D's cost plus a "clear all" path and its confirmation |

**Recommendation: D, in two slices** (L). First slice (G10, M): the "Your data" page, Back up everything, the
versioned format and its reader core proven by a round trip in `npm test`, so the file is restorable the day it is
made. Second slice (M): Restore from a backup, on the reader core.

## The owner's calls

Asked in this run with AskUserQuestion, four at once.

1. **Restore onto a device that already has walks.** Offered: add what's missing (recommended; Day One's import,
   verified), replace everything, ask each time. **Answer: add what's missing.**
2. **Where the two actions live.** Offered: the foot of Walk settings (recommended), Chronicle's header menu, a small
   "Your data" page. **Answer: a small "Your data" page** (opened from Walk settings). Amends 0041.
3. **Protection of the file.** Offered: a plain zip said plainly (recommended; Apple Journal's and Day One's exports,
   verified), passphrase-locked, an optional passphrase. **Answer: a plain zip, "and ensure we have best practices for
   data versioning so in case the [schema] must change between the times of the backup and the current iteration of
   the app that we're backwards compatible".**
4. **A reminder to back up.** Offered: a quiet line by the button (recommended), nothing, a monthly notification.
   **Answer: a quiet line by the button.**

Written: decision 0241 (amends 0007, 0041).

## The recommendation

D in two slices, as answered. The gate on the reshaped shape:

```
## Vision
Idea: A small "Your data" page, opened from Walk settings, to back up everything into one plain, versioned zip and later restore from it, with a quiet "last backed up" line.
Verb: return, and honour (keeps the corpus that every Return feature gives back; "want to keep what they found")
Touches: Never, "Data leaving the device without a tap" (fit: "The share sheet on a tap"); Never, "Nagging"; Always, "Moments and the trace are truth; streets, areas and summaries are recomputed. A map update never loses a memory"; Always, "Counts are words, in a clause"; Always, "Restraint in motion, colour and copy"; decisions 0005, 0007 (amended), 0041 (amended), 0107 ("Never a gauge, a number or a limit on capturing; no Storage screen").
Verdict: aligned
Shape: as asked. The page shows two actions, one line of what the file holds, and the date of the last backup; it never shows a size, a count of files, a percentage or a storage gauge.
Precedent: Apple Journal, "Export All Journal Entries", a ZIP with media, no import (verified); Day One, "Export Day One JSON" and "Import JSON" (verified); Organic Maps, a single KMZ it reads back (unverified).
Criteria: The file leaves only from a tap. No cache in the file; caches recomputed after restore. A restore never overwrites or deletes. Results in words. The page shows no size, count, percentage or gauge. No notification or prompt about backing up anywhere but the page's line. Nothing celebrates a finished backup.
Open: none
```

**Size: L**, never queued whole. Its first slice, G10 (M, ten criteria):

1. Walk settings ends with a "Your data" row that opens a "Your data" page on the root stack; Back returns to the
   drawer as it was.
2. "Back up everything" writes one zip: `manifest.json` (format `chronicles-backup`, its format version, the app's
   version and its store's schema version, when it was made, the stores it holds), one JSON file per truth store
   (the trace one file per walk, so no walk's trace sits in memory beside another's), the preferences and per-walk
   meta, and every piece's original file under `media/` at its stored ref.
3. No cache is in the file: no derived store, summary, visited row, area, walk line, landing, tile or small copy;
   a test lists every store and every meta key as backed up or cache and fails on one it does not know.
4. Versioning: format versions are whole numbers; a pure core reads any older version through a chain of upgrade
   steps, one per version, into today's rows, and refuses a newer one with words ("This backup was made by a newer
   Chronicles. Update the app to restore it."); a sample file of each released format version is kept in the tests,
   frozen, and must read into today's rows.
5. Round trip: a library seeded in the store contract's fake (every truth store, a loose moment, an edited photo,
   a thread, a reaction), backed up and read by the core, gives back the same rows, ids and trace order.
6. Media are streamed in chunks and never held whole; on native the zip is written under the cache, opened in the
   share sheet, and deleted after; on the web it downloads. A file that is gone is left out, marked in its piece, and
   said after in words ("Two photos could not be found and were left out").
7. Before writing on native, the room left is read (`lib/space`); too little for the media, it says so in words and
   writes nothing.
8. Under the button, a quiet line: "Last backed up October 3", or "Not backed up yet"; nothing else in the app ever
   reminds, prompts or notifies about backing up.
9. The page says in one line what the file is: "One zip of every walk, moment and photo. Anyone with the file can see
   them." It shows no size, count, percentage or gauge, and nothing celebrates when it finishes; the app sends the
   file nowhere by itself.
10. An e2e journey (`backup`) on the web build: open the page, back up, the download is a zip whose manifest and
    data parse and whose rows match the seeded walk; the line then reads today's date. Native share and file handle
    recorded in `docs/NATIVE_UNVERIFIED.md`.

The rest (the second slice, M): "Restore from a backup" on the same page: the picker (`File.pickFileAsync` on native;
a file input on the web, added to ARCHITECTURE's web exceptions); the zip read in a stream; the reader core's
upgrade; every row the device lacks added by id in bulk store writes (new `Db` methods with contract cases first),
a walk's trace only when the walk is new; media placed at their refs; restored walks unsnapped, so streets,
summaries and areas are recomputed from their trace; the result in words; a restore stopped halfway safe to run
again.

## Done when

On the web build at 390 px, from the walk screen's Walk settings, the owner opens "Your data", taps "Back up
everything", gets one zip holding every walk, moment and file the app holds, and the page then says when; and after
the second slice, that zip restored into an empty browser shows the same walks, moments and replays.

## What the slice will touch

- New: `src/app/your-data.tsx` (route; root stack in `src/app/_layout.tsx`), `src/lib/backup/` (`core.ts`: the
  format, the manifest, which stores and meta keys are backed up, the upgrade chain, the reader; `shell.ts`: the
  writer over `ports`; `index.native.ts` and `index.web.ts`: share sheet and download, over `lib/export`'s chunking),
  tests in `src/lib/__tests__/backup/` (a new feature in `scripts/features.js`), the frozen sample under its fixtures,
  an e2e journey `backup`.
- Changed: `src/components/StartSettings.tsx` (the row), `src/lib/meta.ts` (`backup_last`), `src/lib/db/types.ts` and
  both stores if a store has no read of all its rows (each new read a contract case first).
- Layers: core for the format and the upgrade chain (test first), shell for the writer, adapters per platform, a view
  for the page; views never import `ports` or the `db`.
- Native paths: expo-file-system's file handle, expo-sharing's share sheet, `Paths.availableDiskSpace`; none has run
  on a device.
- First: `npm run check:affected`; read `.claude/rules/storage.md`, `captures-and-media.md`, `functional-core.md`,
  `walk-screen.md`.

## Open for the owner

None: the four calls are answered (decision 0241). The page's words are the builder's to draft from criteria 8-9 and
show in the plan.

## Engineering unknowns

- The share sheet does not say whether the file was saved or the sheet was dismissed; whether "Last backed up" is
  set on the sheet closing or only on a confirmed save is the builder's (iOS `shareAsync` resolves either way).
- On iPhone Safari a download of several hundred megabytes from Blob parts may fail or be slow; web photos are
  stored at 2048 px, so the web's library is smaller, but videos are not.
- On native the zip in the cache doubles the library's space while it exists; on iOS `File.pickFileAsync` makes a
  temporary copy of a picked file (`node_modules/expo-file-system/build/File.d.ts:107`), doubling it again on restore.
- Android's picker may return a `content://` uri, where `FileMode.ReadWrite` is not allowed (`File.types.d.ts`).
- `docs/ARCHITECTURE.md`'s "Data model" is behind the code (SQLite 30 migrations and IndexedDB 23, not 23 and 18;
  about 45 meta keys, not 12; `transcript`, `complex`, `atlas_area`, `walk_tile`, `walk_line_tile` and the web `media`
  store unlisted): criterion 3's classification is the moment to bring it level.
- `transcript` is called a cache in its migration but rebuilding it means recognising every memo again on the phone;
  the brief counts it as backed up.
- Nothing here has run on a phone.

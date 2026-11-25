<!-- Repo first: from the owner's proposal G10 (docs/STATUS.md, "Next evolutions"), answered yes in person 2026-11-20 (/tend inbox G10 yes); decision 0241, brief docs/research/app-backup.md. The first slice of an L (Back up); Restore from a backup is the second. Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Back up everything: the "Your data" page and one versioned zip

Nov 20, 2026 · @Miguel Guerrero

## Vision

Idea: A small "Your data" page, opened from Walk settings, to back up everything into one plain, versioned zip and later restore from it, with a quiet "last backed up" line (G10; the owner's /investigate, 2026-11-20).
Verb: return, and honour (keeps the corpus that every Return feature gives back; "want to keep what they found")
Touches: Never, "Data leaving the device without a tap" (fit: "The share sheet on a tap"); Never, "Nagging"; Always, "Moments and the trace are truth; streets, areas and summaries are recomputed. A map update never loses a memory"; Always, "Counts are words, in a clause"; Always, "Restraint in motion, colour and copy"; decisions 0005, 0007 (amended by 0241), 0041 (amended by 0241), 0107 ("Never a gauge, a number or a limit on capturing; no Storage screen").
Verdict: aligned
Shape: as asked. The page shows two actions (this slice builds the first), one line of what the file holds, and the date of the last backup; it never shows a size, a count of files, a percentage or a storage gauge.
Precedent: Apple Journal, "Export All Journal Entries", a ZIP with media, no import (verified); Day One, "Export Day One JSON" and "Import JSON" (verified); Organic Maps, a single KMZ it reads back (unverified).
Criteria: The file leaves only from a tap (BK6). No cache in the file; caches recomputed after restore (BK3; the recompute is the restore slice's). A restore never overwrites or deletes (the restore slice's). Results in words (BK6, BK7, BK11). The page shows no size, count, percentage or gauge (BK9). No notification or prompt about backing up anywhere but the page's line (BK8). Nothing celebrates a finished backup (BK9).
Open: none (G10 answered yes; decision 0241).

## What it is

Everything a person keeps in Chronicles lives only in the app's own store: a lost phone or a cleared browser loses
every walk, moment and memo. 0007's per-walk zip was never reached from a screen and leaves most truth out. This slice
gives the app one place for its data, a "Your data" page opened from the foot of Walk settings, and one action on it:
**Back up everything**, which writes one plain zip of every walk, trace, moment, piece's file and kept row, with the
preferences, and hands it to the person (the share sheet on a phone, a download on the web). The file names its format
and its format version, and a pure reader in the app reads any version it has ever written into today's rows, so the
file is restorable the day it is made. Restoring it is the next slice.

## Decisions

- **The G10 entry** (the owner's yes, in person, 2026-11-20: "Yes, build it this session"): its ten criteria, below as
  BK1-BK10; decision 0241's four calls (restore adds what is missing; a small "Your data" page from Walk settings,
  amending 0041; a plain zip, versioned so older backups always restore; a quiet "Last backed up" line, no reminder).
- **States the criteria imply** (slice step 2): a backup that fails says so and keeps nothing (BK11); a second tap
  while one is being made makes no second file (BK12).
- **Only from the ready bar.** Walk settings (`StartSettings`) has one host, the ready bar's pulled-up drawer on the
  walk screen (`src/components/walk/useReady.tsx`). During a walk the drawer holds This walk, not Walk settings, so the
  page is not reached mid-walk: a backup made then would leave out the walk being made.
- **Restore is not here.** The page names no Restore until the restore slice builds it.
- **The owner's answers in person, 2026-11-20** (to the steward's plan review; decision 0249, amending 0241's words):
  - the line under the button reads "Last backup made October 3" ("Not backed up yet" before any), set when the share
    sheet closes or the download is handed over: it claims only that a file was made (BK8; Silent 2);
  - the page's line also says the file shows where you walked, in one clause and no warning colour (BK9; Silent 3);
  - the "Your data" row carries a muted second line, "Back up every walk and moment", and someone told only "make a
    backup of everything" finds it from launch (BK1, BK13; the steward's S4).
- **The plan review** (the steward, Nov 20; ten findings, all accepted before any code, folded into the criteria and
  each test named `back-up-everything audit N`): audit 1 the line's words (BK8); 2 a delete waiting for Undo is left out
  of the file (BK14); 3 transcripts the one carried cache, named (BK3); 4 the row's second line and its finding
  criterion (BK1, BK13); 5 the no-room words, no nudge to free or delete (BK7, decision 0107); 6 the failure words
  (BK11); 7 missing files named by kind, never as "files" (BK6); 8 no numeral but the date's (BK9); 9 `transcript_off`
  carried, as `notify_off` is (BK2); 10 the Apple Journal precedent quoted as recorded.

- **The owner's answers in person, 2026-11-21** (to the diff review; decision 0249): "Add a door in Chronicle": the
  Walk settings row stays, and Chronicle's Contents gains a "Your data" entry opening the same page (BK13; the cold
  find had failed from launch); "Last backup made" is the date alone and never mentions pieces left out.
- **The diff review** (Nov 21; the auditor, the ux-reviewer with the cold find, the steward; one round): twelve
  accepted and fixed, each behind its test: audit 11 the door in Chronicle's Contents; 12, 13 a backup past what one
  plain zip holds (65,535 files or 4 GiB; fflate 0.8.2 writes no ZIP64) refused in words before it is handed over,
  no date kept; 14, 15 a waiting delete's reminders and finds read by their moment; 16 every moment read once, an
  orphan written as loose; 17 focus back on the row after Back (`PageRow`, shared with What I'm into's row); 18 Back
  names the screen beneath (Navigate, Chronicle), Android's own spoken Back; 19 the file's line in ink, the last
  backup's line muted; 20 the share-sheet-missing and too-large lines held to BK11; 21 nothing leaves the page before
  the tap; 22 nothing outside the page reads the date or notifies about backing up. Eight lows filed `[loop]` in
  `docs/DEFERRED.md`; one rejected (a second backup the same day changes nothing on the page: BK9 and matrix row 20,
  the download or the share sheet is the change). The `[arch]` question of a backup past one zip is filed for the
  owner (a ZIP64 writer and reader of our own, or parts).
- **The too-large line, gated** (`/vision`, Nov 21): "This backup would be too large for one file, so it was not
  made." Verb: honour (says truthfully why no file was made). Touches: Always, "Counts are words" and "Restraint";
  decision 0107 (no nudge to free or delete). Verdict: aligned. No number, no nudge, the failure line's register.

## For the restore slice (not built here)

- **Bring them back** (the owner, in person, 2026-11-20, Silent 1; decision 0249): a restore adds what is in the file,
  moments deleted since it was made included; it never overwrites or deletes what is there (0241).
- **No list of what is left** (the steward's condition, Never and decision 0230): neither `offered` nor the checklists
  may come back as a list of what is left to find.
- **A carried transcript stays a cache** (audit 3): restored beside its memo, stale when the memo is trimmed, rebuilt
  as any transcript is.
- **A newer backup is refused without a version number** (the owner, in person, 2026-11-21): "This backup was made by a
  newer Chronicles. Update the app to restore it." names no version.
- **A damaged backup** (the steward's S13): a file that names `chronicles-backup` but whose version cannot be read says
  "Chronicles can't read this backup."; "This file isn't a Chronicles backup." only when the format is absent or another.
- **Read nothing on trust** (the auditor's A10): refuse a file whose entries do not match its manifest's `stores` (a
  truncated file), and treat every `file_path` as untrusted on the way back (`\`, `..`, absolute).

## How adjacent apps do it

From `docs/research/adjacent-apps.md`, "Back up everything and restore it".

- **Apple Journal** (iOS): Settings > Apps > Journal > "Export All Journal Entries", then "Export": one ZIP,
  "AppleJournalEntries", in Files, with photos, locations and other media. The page describes no import back into
  Journal; its restore is an encrypted device backup through Finder. Source: https://support.apple.com/121822 , read
  2026-11-20 (`/investigate` app-backup). **Verified**. (As recorded in `docs/research/adjacent-apps.md`, l.444-447;
  back-up-everything audit 10.)
- **Day One** (iOS, macOS, Android, web): Settings > Import/Export, "Export Day One JSON": "exports all data and media
  and can be re-imported into Day One"; back in with "Import JSON". Source:
  https://dayoneapp.com/guides/tips-and-tutorials/transitioning-day-one-data-to-a-new-device . **Verified**.
- **Organic Maps**: every bookmark and track as a single KMZ the app reads back. Source: from memory and a search
  summary. **Unverified**.
- **Polarsteps** (counter-example for the read back): "Download my data" on the website, a zip of JSON and photos; no
  import. Source: a search summary. **Unverified**.

Where this departs: from Apple Journal and Polarsteps, the file is made to be read back (BK4); from all of them, the
action sits on a page of its own reached from Walk settings, the app's only settings panel (0241).

## Acceptance criteria

1. **BK1** The owner's task, in their words: "export out all my media moments and effectively app data into a
   compressed backup that I can export out and save wherever". Walk settings ends with a "Your data" row, its words and
   a chevron in ink and a muted second line "Back up every walk and moment" (audit 4), that opens a "Your data" page on
   the root stack; Back returns to the drawer as it was.
2. **BK2** "Back up everything" writes one zip: `manifest.json` (format `chronicles-backup`, its format version, the
   app's version and its store's schema version, when it was made, the stores it holds), one JSON file per truth store
   (the trace one file per walk, so no walk's trace sits in memory beside another's), the preferences and per-walk
   meta (the person's choices, `transcript_off` among them as `notify_off` is: audit 9), and every piece's original file
   under `media/` at its stored ref.
3. **BK3** No cache is in the file but one, named: no derived store, summary, visited row, area, walk line, landing,
   tile or small copy; memo transcripts are the one cache carried, with its reason (the web has no recognizer to make
   them again; audit 3). A test lists every store and every meta key as backed up or cache and fails on one it does not
   know.
4. **BK4** Versioning: format versions are whole numbers; a pure core reads any older version through a chain of
   upgrade steps, one per version, into today's rows, and refuses a newer one with words ("This backup was made by a
   newer Chronicles. Update the app to restore it."); a sample file of each released format version is kept in the
   tests, frozen, and must read into today's rows.
5. **BK5** Round trip: a library seeded in the store contract's fake (every truth store, a loose moment, an edited
   photo, a thread, a reaction), backed up and read by the core, gives back the same rows, ids and trace order.
6. **BK6** Media are streamed in chunks and never held whole; on native the zip is written under the cache, opened in
   the share sheet, and deleted after; on the web it downloads. A file that is gone is left out, marked in its piece,
   and said after in words, each kind named ("Two photos could not be found and were left out"; "A photo and two memos
   could not be found and were left out"), never as "files" (audit 7).
7. **BK7** Before writing on native, the room left is read (`lib/space`); too little for the media, it says so in words
   and writes nothing: "There isn't room on this phone to make the backup: it needs as much room again as your photos,
   videos and memos. Try again when the phone has more room." No nudge to free or delete (decision 0107; audit 5).
8. **BK8** Under the button, a quiet line: "Last backup made October 3", or "Not backed up yet" (the owner's words,
   2026-11-20, decision 0249; audit 1): set when the share sheet closes or the download is handed over, it claims only
   that a file was made; nothing else in the app ever reminds, prompts or notifies about backing up.
9. **BK9** The page says in one line what the file is and who can see it: "One zip of every walk and moment you kept.
   Anyone with the file can see your walks, where they went, and your photos, videos and memos." (the owner, 2026-11-20:
   one clause, no warning colour). It shows no size, count, percentage or gauge, and no numeral but a date's day and year
   (audit 8); nothing celebrates when it finishes; the app sends the file nowhere by itself.
10. **BK10** An e2e journey (`backup`) on the web build: open the page, back up, the download is a zip whose manifest
    and data parse and whose rows match the seeded walk; the line then reads "Last backup made" and today's date. Native share and file handle
    recorded in `docs/NATIVE_UNVERIFIED.md`.
11. **BK11** A backup that fails part way says so in words, "The backup could not be made, and no file was kept. Try
    again." (audit 6), keeps no file behind, and leaves the "Last backup made" line as it was. Its other refusals, in the
    same register and with no numeral: "This phone has no way to share the file, so the backup was not made." (audit
    20) and "This backup would be too large for one file, so it was not made." (audit 12, 13).
12. **BK12** While a backup is being made the button says so and a second tap makes no second file.
13. **BK13** The finding criterion (decision 0167; audit 4, audit 11): someone told only "make a backup of everything"
    finds it from launch: Chronicle's Contents holds "Your data" and "Back up every walk and moment" (the owner's door,
    2026-11-21), and Walk settings, scrolled to its foot, holds the same row; both open the page; the ux-reviewer's
    cold find places it.
14. **BK14** A delete waiting for Undo is not in the file (decisions 0041, 0113; audit 2): the walks, moments, pieces,
    thread memberships and threads a waiting delete names, and the rows and files that hang on them, are left out.

## Record

Built Nov 20-21 (from G10, `/tend inbox G10 yes`, branch `tend/inbox-20261120-2335`), on the web build; the share
sheet, the cache file and the room on a phone have never run on a device (`docs/NATIVE_UNVERIFIED.md`, "Media and
capture").

- **Past one plain zip** (Nov 25, `specs/backup-zip64`, decisions 0256, 0266): the zip's records are ours, ZIP64 past
  65,535 entries or 4 GiB; audit 12 and 13's tests now hold the backup written and read back whole (BZ1, BZ2). BK11's
  too-large line is said only on the web past 4 GiB, which holds the file in memory; a phone makes the file (BZ5).

- **BK1-BK14 pass**: tests first `21227ba` (`check:test-first` 14 of 14); the Db reads `f796ea1` (contract cases over
  the fake, IndexedDB and SQLite); the format, reader and writer `08099eb` (`src/lib/__tests__/backup/core.test.ts`,
  `shell.test.ts`, the frozen `fixtures/backup-v1.zip` pinned by `backup-v1.sha256`); the page, the row and the
  platform io `e03a2b7`; the `backup` journey (BK1, BK8-BK10, BK12, BK13) green on its first run, pictures at 390 and
  320 px.
- **The steward's plan review** (Nov 20): ten findings accepted before any code and folded into the criteria, each test
  named `back-up-everything audit N` (1-10); the owner's answers in person, decision 0249.
- **The cold find after the door** (a fresh ux-reviewer, Nov 21, told only "make a backup of everything", pictures
  of launch, Contents open and the page): found, with hesitation at launch, Contents chosen by elimination; from the
  sheet on, clear. BK13 is met so, not cleanly: the Contents label and the sheet's mixed grouping are filed for the
  owner (a `T` entry, area memories); text drawn under Memories' sticky date header is filed `[loop]` low.
- **Deferred** (`docs/DEFERRED.md`, "Back up everything"): Restore, the second slice; the web's whole zip in memory on
  iPhone Safari untested; the app's own drop of an empty walk and a waiting split or join backed up as stored.

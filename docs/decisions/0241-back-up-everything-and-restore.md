# 0241. Back up everything into one versioned zip, and restore by adding what is missing, on a "Your data" page

Date: 2026-11-20 · Status: accepted, waits on G10's build · Area: export, storage · Amends: 0007, 0041 · From: `/investigate` (app-backup)

## Context
The owner, Nov 20: "I've been growing a little bit more concerned by the lack of the ability to export out all my
media moments and effectively app data into a compressed, I guess, backup that I can export out and save wherever,
effectively just one big zip or some other structured file that the app can read in and read out to restore the state."

0007 deferred backing up a walk "until the export system has a proper place in the app"; its code (`writeWalkBundle`)
writes one walk and nothing reads it back. 0041 said "No Storage screen". The brief is
`docs/research/app-backup.md`. Adjacent apps: Apple Journal exports every entry as one ZIP with its media from its
settings, with no import (verified); Day One exports a JSON zip with all data and media and imports it again
(verified); Organic Maps backs up every bookmark and track as one KMZ it reads back (unverified).

## Decision
The owner's answers in the `/investigate` run:

- **Restore adds what is missing** (recommended): every walk, moment, file and kept row the device lacks, by id; it
  never overwrites or deletes what is there, so the same file restored twice changes nothing.
- **A small "Your data" page**, opened from a row in Walk settings (chosen over the foot of Walk settings and over a
  menu on Chronicle's header). It holds "Back up everything", later "Restore from a backup", and one line saying what
  the file holds. Amends 0041: this is a page, but not a Storage screen in 0041's and 0107's sense: it never shows a
  size, a count of files, a percentage, a gauge or a limit.
- **A plain zip, versioned for backwards compatibility** (the owner: "ensure we have best practices for data
  versioning so in case the [schema] must change between the times of the backup and the current iteration of the app
  that we're backwards compatible"): the file names its format and format version; every app reads every older
  format through a chain of upgrade steps, held by a frozen sample file per released format version in the tests; a
  file from a newer app is refused in words, never half read. No passphrase.
- **A quiet line beside the button** (recommended): "Last backed up October 3" or "Not backed up yet". Nothing
  reminds anywhere else; no notification.

## Consequences
- Truth only in the file (the walk, the raw trace, moments with their pieces and edits, pauses, stills, gap
  decisions, reactions, threads, finds, recalls, checklists, the legacy marks and offers, transcripts, the
  preferences and per-walk meta); caches are recomputed from the restored trace (VISION.md Always).
- Every store and meta key is classified as backed up or cache by a test, so a new table cannot be added without
  saying which it is.
- The file leaves only from a tap: the share sheet on native, a download on the web (0005).
- 0007's per-walk bundle stays unreached; the whole-app writer replaces it as the export's place.
- Built in two slices: G10, the page and the backup with its versioned reader core; then the restore.

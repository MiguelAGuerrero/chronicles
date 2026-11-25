<!-- Repo first: from the owner's proposal G14 (docs/STATUS.md, "Next evolutions"; filed 2026-11-21 from T52), answered
     yes in person 2026-11-22 ("Yes, queue it (Recommended)"), built under `/tend inbox G14 yes` (decision 0256). An
     engineering slice of the backup: nothing a person sees changes. Not a tab of the concept doc. -->

# Backup past one plain zip: a ZIP64 writer and reader of our own (BZ)

Nov 25, 2026 · @Miguel Guerrero

The whole-app backup (`specs/back-up-everything`, decisions 0241, 0249) is one zip streamed by fflate 0.8.2, which
writes no ZIP64: 70,000 entries written by it read back as 4,464 in fflate's own reader, and past 4 GiB its 32-bit
offsets wrap. So a backup past 65,535 entries or 4 GiB is refused today in words ("This backup would be too large for
one file, so it was not made.", back-up-everything audit 12, 13), and a person with a library of years cannot back up
at all. The owner chose a ZIP64 writer and reader of our own around fflate's streams, one file whatever its size, over
splitting it into parts (decision 0256).

## Vision

```
Idea: one backup zip past 65,535 files or 4 GiB, by a ZIP64 writer and reader of our own (G14; T52, the owner's yes in person, 2026-11-21, decision 0256)
Verb: Return, Honour (the file carries the truth whole and is read back; the steward's plan review, backup-zip64 audit 3); nothing a walker sees changes but BZ5's retired refusal
Touches: decision 0241 ("every walk, moment and file", one plain zip, versioned), 0249; back-up-everything audit 12, 13 (the refusal this replaces); BK7 (room on the device, unchanged). The file's name, the page's words and the line beside the button stay.
Verdict: no surface
Shape: as asked
Criteria: none beyond G14's
Open: none (G14 answered yes in person, 2026-11-22)
```

## Criteria

G14's seven, in its words, numbered with the slice's prefix.

1. **BZ1 · More than 65,535 entries.** A backup of more than 65,535 entries is one zip whose every entry reads back
   whole, by our reader and by one system archive tool (checked first which: Info-ZIP UnZip 6.00's `unzip -t`, the
   tool decision 0256 names; backup-zip64 audit 2).
2. **BZ2 · Past 4 GiB.** A backup past 4 GiB in total, or holding one file past 4 GiB, does the same, where the
   platform writes the file (a phone; on the web see BZ5), and so does one past both limits at once (backup-zip64
   audit 6). The system tool for a file past 4 GiB is Python's `zipfile` (`testzip()` reads 4 GiB in about 2 s, UnZip's
   `-t` in about 25 s).
3. **BZ3 · Within both limits, today's bytes.** A backup within both limits is byte-for-byte what it is today (no
   ZIP64 records where none are needed).
4. **BZ4 · One reader for both.** Our reader reads a ZIP64 backup and a plain one alike, for the restore slice.
5. **BZ5 · The refusal is gone, but on the web past 4 GiB.** The refusal "This backup would be too large for one
   file" is gone past 65,535 entries everywhere, and past 4 GiB where the platform writes the file to disk (a phone);
   the web, which holds the file in the tab's memory until it downloads, keeps it past 4 GiB in bytes, with no file
   kept and "Last backup made" as it was (the owner, decision 0266; backup-zip64 audit 1). Which side a backup is on is
   decided in core from the platform its `BackupIO` names, never from `Platform`. A phone without room still says so
   (BK7); a phone whose write fails part way says the failure line and keeps no file (BK11).
6. **BZ6 · No new dependency.** The records are written and read by a module of ours around fflate's streams, held by
   tests that write and read back a file past each limit (in memory or streamed to a temporary file, never committed).
7. **BZ7 · Nothing a person sees changes.** The file's name, the page's words, the line beside the button and the
   backup journey's result are as they are today, but for BZ5's refusal, retired on phones and past 65,535 entries
   (backup-zip64 audit 4).

States the criteria imply (slice step 2): a backup past either limit that fails part way says so and keeps no file, as
any backup does (BK11, unchanged; its test holds); a file that is not a zip, or whose directory disagrees with its own
end (a count or a size that does not add up, as fflate's file of 70,000 does), is refused by our reader, never half
listed (BZ4).

## Decisions

- **The web keeps a refusal** (the owner, in person, 2026-11-25, "Web keeps a refusal (Recommended)"; decision 0266,
  amending 0256): past 4 GiB in bytes the web refuses in today's words; phones get ZIP64. BZ5.
- **No more words for a large backup** (the owner, in person, 2026-11-25): "Busy button is enough (Recommended)": a
  backup of tens of gigabytes says only "Backing up…" on its button; "Enough that we read it (Recommended)": nothing is
  said if a system archive tool cannot open a large file. Decision 0266. Nothing filed.
- **The container is not the format** (the steward, backup-zip64 audit 7): ZIP64 is the container's, outside
  `BACKUP_VERSION`; the format stays version 1, its entries and JSON unchanged, and every reader of a backup goes
  through `backup/zip.ts`.
- **Own records over fflate's streams** (the owner, in person, 2026-11-21, "Own ZIP64 writer/reader (Recommended)";
  decision 0256): one file whatever its size; parts were declined.
- **Where ZIP64 goes** (this slice, by APPNOTE 6.3.x, 4.3.9, 4.4.1.4, 4.5.3): the local header is written before an
  entry's size is known, as today (sizes after it, in a data descriptor), and never carries a ZIP64 field. An entry whose
  size reaches 0xFFFFFFFF gets a data descriptor with eight-byte sizes, as Go's `archive/zip` writes one ("write 8 byte
  sizes if needed without adding a zip64 extra in the local header (too late anyway)"); its central header carries the
  ZIP64 extra field with only the values it set to all ones, in the order the note gives (size, compressed size,
  offset). The ZIP64 end record and its locator are written only when the plain end cannot hold the count (more than
  65,535 entries) or the directory's size or place (at or past 0xFFFFFFFF), and then only those fields read all ones.
  A zip of exactly 65,535 entries stays plain: today's writer makes it so and today's readers read it (BZ3).
- **Each header's time** is read from the clock port as the header is written, in the device's own time, where fflate
  read `Date.now()`: the local header as its entry begins, the central ones at the end. Within limits the bytes are then
  fflate's for the same clock.
- **The system archive tool** (BZ1, BZ2; checked first, Nov 25): the container has Info-ZIP UnZip 6.00 (with
  `ZIP64_SUPPORT`) and Python 3.13's `zipfile`; no `bsdtar` or `7z`. Both read fflate's file of 70,000 entries without
  complaint (they walk the directory and ignore the wrapped count); only fflate's reader stops at 4,464, so BZ1 is also
  read by fflate's `unzipSync`. BZ1 is checked by `unzip -t`, the tool 0256 names (the steward's audit 2); a file past
  4 GiB by Python's `zipfile` (`python3 -I`), which reads it whole in about 2 s to UnZip's 25 s. Both are on CI's
  `ubuntu-latest`. macOS's Archive Utility and Windows' Explorer have never opened one: `docs/NATIVE_UNVERIFIED.md`.

## How adjacent apps do it

The job: a whole-library export larger than one plain zip holds.

- **Google Takeout**: an export larger than the size the person picks (1, 2, 4, 10 or 50 GB) is split into several
  files; above 2 GB it says the zip may need a newer archive tool, as it is ZIP64. Source: from memory, unverified (not
  yet recorded in `docs/research/adjacent-apps.md`). **Unverified**.
- **Apple Journal**: "Export All Journal Entries" makes one ZIP of every entry with its photos and other media; no split is described. Source: https://support.apple.com/121822 , read 2026-11-20
  (`docs/research/adjacent-apps.md`, "Back up everything and restore it"). **Verified** (the one ZIP; its size limits
  unverified).
- **Day One**: "Export Day One JSON" exports all data and media as one zip that Day One imports back. Source:
  https://dayoneapp.com/guides/tips-and-tutorials/transitioning-day-one-data-to-a-new-device
  (`docs/research/adjacent-apps.md`). **Verified** (the one zip; its size limits unverified).

Where this departs: from Takeout, no parts: one file the app reads back whole (0241, 0256), like Journal and Day One.

## Tests

Unit, in `src/lib/__tests__/backup/` (feature `backup`): `zip.test.ts` for the records (BZ3, BZ4, BZ6 and the
boundaries, sizes and offsets synthesized where no data is needed; audit 3, 5, 7); `shell.test.ts` for the backup
itself (BZ1 and BZ2 as back-up-everything audit 12 and 13's tests, now "written and read back whole", decision 0256,
with audit 2 and 6; BZ3 on the seeded library; BZ5 with audit 1); `core.test.ts` for the words (BZ7 with audit 4). The
backup journey runs as it is (BZ7).

## Record

Built 2026-11-25 under `/tend inbox G14 yes` on `tend/inbox-20261125-1923`, from `origin/main` 842dc419.

- **Passed:** BZ1-BZ7 and backup-zip64 audit 1-7, each written first as a todo (`check:test-first backup-zip64`: 7 of
  7) and its wiring reverted once to see it fail (the ZIP64 end forced off: BZ1, BZ4; `byteLimit` forced to none: BZ5,
  BZ7; a fixed header time: BZ3; the 8-byte descriptor off: BZ2, once its descriptor check was added). BZ7's words pass
  before and after by design. `npm test` (3,969), typecheck, lint, `check:docs`, `check:vision`.
- **Past the limits:** a backup of 70,000 photos (web io), read back whole by our reader, `unzip -t` and fflate's
  `unzipSync`; one with a video of 4 GiB and a MiB before 70,000 photos, and one of two videos of 2 GiB and a MiB (phone
  io), read back whole by our reader and Python's `zipfile`, sparse on disk and removed. `shell.test.ts` takes about 80 s.
- **Within them:** an old/new differential (main's writer against this one, the clock held) over an empty library, a
  seeded library, odd refs, a waiting delete and an empty file, and exactly 65,535 entries, on a web and a phone io:
  0 bytes differ, and the page's state the same after no room and a failed write (the run's scratchpad, for the review).
- **Journeys:** `backup` green, its file untouched (BZ7); `launch` stopped once on the branch at the Layers click
  ("Past the sights" over it), green on its rerun; on `main` (842dc419) it failed 1 of 3 (`e2e:baseline`), at another
  step. No screen changed.
- **Left the backup area no rougher** (`node scripts/tend.js base --here backup`: unseen, nothing above low open).
- **The diff review** (the auditor, 2026-11-25, one round): correct within and past both limits for every reader that
  runs here, the differential a real comparison with main. Eight findings: seven accepted, six fixed test first (backup-zip64
  audit 8 a leftover file swept before the room is read, the phone's io in `lib/export/index.native.ts` the one file
  outside `backup/`; 9 the reader refuses a ZIP64 value it does not carry, a short ZIP64 field, an extra field past its
  header, bytes past the directory and a short read; 11 a clock moving on every read, in zones far from UTC; 12 the web
  at exactly 4,294,967,295 bytes and one more; 13 the boundary records by Python's `zipfile`, 65,536 entries by `unzip
  -t`; 14 the directory written in one array). F3, the web refusing before anything is written, needs the web's io to
  report sizes: filed `[loop]` low in `docs/DEFERRED.md` instead (audit 10 not built). Keeping the screen awake while
  making: `[owner]` medium in `docs/DEFERRED.md`, not built. F8 (a streaming reader past 4 GiB) rejected as a change,
  noted for the device. BZ5's phone half now writes past 4 GiB before its write fails; the text checks say they are.
  The differential now holds the clock apart (a moving clock, `Date.now()` held far off for the branch), runs in UTC and
  Chatham, checks the old writer is main's, and compares six failures: 0 bytes differ, the same state.
- **Native:** never run on a phone; four items in `docs/NATIVE_UNVERIFIED.md`, "Media and capture" (a phone's write
  past 4 GiB and 65,535 files; Archive Utility and Explorer, and a streaming reader; a full disk and a killed run; 20 GB
  with the screen locking and each share target).

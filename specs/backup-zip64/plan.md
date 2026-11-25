# Backup past one plain zip: the plan (BZ1-BZ7)

Built under `/tend inbox G14 yes` (`/slice backup-zip64 --from=G14`): read by the steward, not held for the owner. No
screen, no stored field, no migration, no dependency. The base it lands on: `node scripts/tend.js base backup` reads
"backup is unseen: nothing above low open (never swept)".

## Files

| File | Change |
|---|---|
| `src/lib/backup/zip.ts` (new, `@layer core`) | The zip's records, ours: `dosTime`, the writer `createZipWriter(out, stamp)` (one entry at a time, each a fflate `ZipPassThrough` for its bytes and CRC), the record encoders it is built from (`localHeader`, `descriptor`, `centralHeader`, `endRecords`), and the reader `zipEntries(read, size)`, `zipEntryChunks(read, entry)` over a `ReadAt` callback (a file handle, a Blob's slice, an array). Imports only `fflate`, which core may (`.claude/rules/functional-core.md`). |
| `src/lib/backup/shell.ts` | The writer drives `createZipWriter` in place of fflate's `Zip`, entries in the same order and pushed the same way; each header's DOS time from `p.clock.now()` in the device's own time (`dosStamp`, the shell's, since core reads no time zone); the `limits` argument, the entry count's refusal and the 4 GiB cut are gone. |
| `src/lib/backup/core.ts` | `ZIP_LIMITS` and `TOO_LARGE` removed. |
| `src/lib/__tests__/backup/zip.test.ts` (new) | BZ3, BZ4, BZ6, the boundaries. |
| `src/lib/__tests__/backup/shell.test.ts` | Audit 12 and 13's tests become BZ1 and BZ2 ("written and read back whole", decision 0256); BZ3 on the seeded library; BZ5. |
| `src/lib/__tests__/backup/core.test.ts` | BK11's failure lines (audit 20) without the too-large one; BZ5, BZ7. |
| `.claude/rules/backup.md` | Lines added: the records are ours, where ZIP64 goes, never fflate's `Zip` or `unzipSync` for a backup. |
| `docs/ARCHITECTURE.md` | The backup's codemap line names `zip.ts`. |
| `specs/back-up-everything/spec.md` | A line in its record: BK11's too-large line and audit 12, 13's refusal retired by BZ5 (decision 0256). |

`your-data.tsx`, `lib/export` (the platform's `backupIO`) and the journey are not touched: the `BackupIO` interface stays
as it is (`write(chunk)` in order), so nothing outside `backup/` changes.

## The records

Within a plain zip's limits each record is fflate 0.8.2's `Zip` with `ZipPassThrough` entries, byte for byte (read from
`node_modules/fflate/esm/index.mjs`, `wzh`, `wzf`, `Zip.prototype.add`, `Zip.prototype.e`):

- local header: version 20, flags 0x0008 (sizes after the data) with 0x0800 when the name is not ASCII (fflate's test: its
  UTF-8 length differs from its length), stored, the DOS time, CRC and sizes zero, the name, no extra field;
- data descriptor: signature, CRC, size, size (16 bytes);
- central header: made by 20 (os byte 0), version 20, the same flags, the DOS time read at the end, CRC, size, size,
  no extra, comment, disk or attributes, the local header's offset, the name;
- end of central directory: the count twice, the directory's size and offset, no comment.

Past them (decision 0256; APPNOTE 4.3.9.2, 4.4.1.4, 4.5.3):

- an entry of 0xFFFFFFFF bytes or more: its descriptor's sizes take eight bytes each (24 bytes), the local header as
  before (it is written before the size is known; Go's `archive/zip` writes the same); its central header's two sizes
  read 0xFFFFFFFF and its ZIP64 extra field (0x0001) carries them, version 45;
- an entry whose local header begins at 0xFFFFFFFF or past: its central offset reads 0xFFFFFFFF and the extra field
  carries it (after the sizes, when both);
- more than 65,535 entries, or a directory whose size or offset reaches 0xFFFFFFFF: the ZIP64 end record (version 45,
  the count, size and offset in eight bytes) and its locator before the plain end, whose fields that overflow read all
  ones (0xFFFF, 0xFFFFFFFF), the others their values. Exactly 65,535 entries stays plain, as today.

The reader finds the end within the last 65,557 bytes, follows the locator when there is one, reads the directory in
one read (about 100 bytes an entry: 7 MB for 70,000), takes each header's ZIP64 values for the fields set to all ones,
and refuses a directory whose count or size disagrees with its end (fflate's file of 70,000 entries: 4,464 by its
count, 70,000 by its bytes), a method other than stored, and an entry whose local header names another. An entry's
bytes come in chunks with its CRC checked at the end.

## Tests per criterion

| Id | Test (file, name) | What it proves |
|---|---|---|
| BZ1 | `shell.test.ts`, "BZ1, back-up-everything audit 12: a library of more than 65,535 files is one zip, written and read back whole" | 70,000 moments, each with its own photo of distinct bytes, through `createBackupWriter` over the fake db: by our reader every entry (70,000 files, the traces, the JSON, the manifest) read back with its CRC and its bytes the seeded ones, and `readBackup` gives the rows; by `python3 -I` `zipfile` the same count, names and `testzip()` clean; by fflate's `unzipSync` (the reader of the auditor's probe) every entry; the date kept. |
| BZ2 | `shell.test.ts`, "BZ2, back-up-everything audit 13: a backup holding one file past 4 GiB, and one past 4 GiB in total, is one zip read back whole" | Two backups through `createBackupWriter`: one video of 4 GiB + 1 MiB, then a photo and the JSON past it (sizes and offsets past 0xFFFFFFFF); one of two videos of 2 GiB + 1 MiB each (offsets only). Media come as one shared 64 MiB zero buffer pushed again and again; the test's `io` keeps a reused zero chunk as a run, not a copy, so nothing holds 4 GiB. By our reader every entry whole (CRC); the rows by `readBackup`; the file written sparse to a temporary directory (only the real bytes reach the disk), read by Python's `zipfile` (`testzip()`, sizes, names), then removed. |
| BZ3 | `zip.test.ts`, "BZ3 within both limits the bytes are fflate's Zip's, for the same clock" | The writer and fflate's `Zip` (with `Date.now` held) over representative entry sets: none, one empty entry, JSON, a non-ASCII name, a file in many chunks with an empty last push, a 70 KB file: equal bytes. And 65,535 entries: equal bytes, no ZIP64 signature in the file. |
| BZ3 | `shell.test.ts`, "BZ3 the seeded library's backup is fflate's Zip's bytes, entry by entry" | The seeded backup through the new writer, and fflate's `Zip` fed the same entries in the same order with `Date.now` held to the fake clock: equal bytes. |
| BZ4 | `zip.test.ts`, "BZ4 our reader lists a plain zip and a ZIP64 one alike" | The frozen `backup-v1.zip` (fflate's, plain) and a ZIP64 zip of the same entries read into the same names, bytes and `readBackup` rows; synthesized directories at the boundaries (sizes and offsets of 0xFFFFFFFE and 0xFFFFFFFF, 65,535 and 65,536 entries) over a sparse `ReadAt`, no data written. |
| BZ4 | `zip.test.ts`, "BZ4 a zip whose directory disagrees with its end is refused, never half listed" | fflate's file of 70,000 entries (its wrapped count), a cut tail, a wrong CRC, a local header naming another entry: each refused with a `ZipError`. |
| BZ5 | `core.test.ts`, "BZ5 the too-large refusal is gone from the app; a phone without room still says so" | No `TOO_LARGE` or `ZIP_LIMITS` export, the words "too large for one file" in no file under `src/`, `NO_ROOM` as BK7 has it; and `shell.test.ts`'s BK7 test unchanged. |
| BZ6 | `zip.test.ts`, "BZ6 the records are ours, over fflate's streams: no new dependency, no file past a limit committed" | The backup's modules import no package but `fflate`; `package.json`'s `fflate` is `^0.8.2`; `backup/zip.ts` neither imports nor names fflate's `Zip` or `unzip`; the fixtures folder holds only `backup-v1.zip` and its hash. |
| BZ7 | `core.test.ts`, "BZ7 the page's words and the file's name are today's" | Every word the page reads from `backup/core` (title, row lines, button, its making line, the file's line, the failure and refusal lines but the retired one), `backupName` and `lastLine`, as today; and `your-data.tsx` reads no new export. With the backup journey run unchanged (its file untouched). |

Each is written first as a todo and seen failing for its reason (BZ5 fails while the words are there, BZ6 while
`zip.ts` is missing), then made real with its code; each wiring reverted once to see it fail.

## The testing's size

None, by `docs/TESTING.md`, "Size the testing to the change" (decision 0223): logic a unit test proves, so `npm test`,
typecheck and lint are the proof. No control is removed or renamed (no journey names the too-large words: grep
`scripts/e2e`). Journeys all the same: `backup` (it covers `src/lib/backup/**`; its file is not touched, and its result
must not move: BZ7, and the run's tripwire) and `launch` (`/tend`'s smoke before publishing), about 3 minutes together.
The big tests take about a minute of CPU in `shell.test.ts` (4 GiB through fflate's CRC at about 3 s a GiB, twice each
way); the suite's files run side by side.

## Data

No truth or cache changes, no migration, no IndexedDB version: the zip's records change only past the limits. The
format version stays 1 (`BACKUP_VERSION`): the file's entries and their JSON are the same; ZIP64 is the container's,
which any reader of version 1 written by us reads (BZ4), and no file version 1 written so far had it.

## Deferred

- A restore (the reader is built for it; the restore slice uses `zipEntries`, `zipEntryChunks`).
- Reading a directory larger than memory in windows: the reader reads it in one read (7 MB at 70,000 entries); a
  library of a million files would be 100 MB. Filed for the restore slice if it reads one.
- Deflated entries in the reader: ours are stored; the reader refuses another method.

## Native paths that will not run on a device

The writer is the same JavaScript on both; on a phone it writes through `backupIO()`'s `FileHandle.writeBytesSync`, and
nothing there has written a file past 4 GiB (a FAT32 card or a full disk fails the backup with FAILED, as any write
error does). An item in `docs/NATIVE_UNVERIFIED.md`: back up a library past 4 GiB (or past 65,535 files) on a phone and
open the zip in the Files app and on a computer.

## Cost

- Writer: per byte, fflate's CRC as today; per entry, one central record kept (the name and four numbers: about the
  bytes fflate's `Zip` kept per entry, without its chunk arrays); the directory built at the end in one buffer (n times
  about 100 bytes). No change per frame, per fix or per focus.
- Reader: the directory in one read, one pass; an entry's bytes in 1 MiB chunks and one CRC pass.
- Measured by the tests' own timings (the 4 GiB write); on a phone, device only.

## Screens

None. No control, words or picture changes (BZ7).

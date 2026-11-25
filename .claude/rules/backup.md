---
paths:
  - "src/lib/backup/**"
  - "src/app/your-data.tsx"
  - "src/lib/__tests__/backup/**"
---
# Backup

Your data: the whole-app backup zip (decision 0241; specs/back-up-everything, BK1-BK12). The codemap is in
`docs/ARCHITECTURE.md`; the brief is `docs/research/app-backup.md`.

- **Truth only.** Every store and meta key is classified as backed up or cache in `backup/core.ts`; a new table, object
  store or meta key fails `npm test` until it is classified there (BK3).
- **The format is versioned and never rewritten.** `BACKUP_VERSION` is a whole number; a change to the file adds a
  version, an `UPGRADES` step from the one before, and a frozen sample beside `fixtures/backup-v1.zip` (its sha-256
  pinned). Never make a released sample again (BK4).
- **One walk's trace at a time**, and media through `ZipPassThrough` in chunks (BK2, BK6): never collect every trace or
  file before writing.
- **The date only after the hand-over** (`backup_last`, decision 0249): set once `io.deliver()` resolves; the words
  claim only that a file was made ("Last backup made").
- **A delete waiting for Undo is left out** (BK14): the writer reads `pending_delete` and `withoutPending` drops what it
  names and what hangs on it; a thread left with fewer than two moments goes, as the delete would (OT15).
- **The meta reads are dynamic** (`getMeta(k)` over `BACKED_KEYS`, `getMeta(key)` per walk family): listed in
  `arch/meta.test.ts`'s `UNREADABLE` with where the keys come from.
- **The platform's side is `backupIO()` in `lib/export`** (reusing the walk bundle's chunking and download): the
  share sheet, the cache file deleted after it and the room on a phone; Blob parts and one download on the web.
- The page's state says `making`, never `busy` (SF13).
- **The zip's records are ours** (`backup/zip.ts`, specs/backup-zip64, decisions 0256, 0266): entries go through
  `createZipWriter`, never fflate's `Zip`; within 65,535 entries and 4 GiB the bytes are fflate 0.8.2's for the same
  clock (BZ3), past them the ZIP64 records only where needed (an 8-byte data descriptor past 4 GiB, the extra field with
  only the fields that read all ones, ZIP64's end and locator past the count or the directory's place). Each header's
  time is read from `p.clock` as it is written. The web keeps the 4 GiB refusal (`byteLimit`), since it holds the file
  in memory; a phone does not.
- ZIP64 is the container's, outside `BACKUP_VERSION`; every reader of a backup goes through `backup/zip.ts`
  (`zipEntries`, `zipEntryChunks`), never fflate's `unzip`, which stops at a wrapped count (4,464 of 70,000).
- A test past 4 GiB pushes one shared zero buffer again and again and keeps it as runs (`shell.test.ts`, `runIO`);
  the file goes to disk sparse in a temporary folder and is removed. Python's `zipfile` reads 4 GiB in about 2 s,
  `unzip -t` in about 25 s.

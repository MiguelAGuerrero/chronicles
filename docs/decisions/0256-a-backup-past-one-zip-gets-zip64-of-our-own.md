# 0256. A backup past what one plain zip holds: a ZIP64 writer and reader of our own over fflate

Date: 2026-11-21 · Status: accepted, waits on G14's build · Area: backup, export · Amends: back-up-everything audit 12, 13 (the refusal of a backup past one zip's limits) · From: `/tend inbox` (T52)

## Context
The whole-app backup (0241, 0249) is one plain zip, streamed by fflate 0.8.2. fflate neither writes nor reads ZIP64
(`node_modules/fflate/lib/index.cjs` l.942, l.1887-1893): the auditor wrote 70,000 `ZipPassThrough` entries and read
back 4,464, with no error. So a backup past 65,535 entries or 4 GiB is refused in words before the file is handed over
(`ZIP_LIMITS`, `src/lib/backup/core.ts`; "This backup would be too large for one file, so it was not made."), and a
person with a library of years cannot back up at all. The restore slice will read the same file. Filed as T52 [arch]
by the back-up-everything diff review, Nov 21.

## Decision
The owner's answer, in person, Nov 21: **"Own ZIP64 writer/reader (Recommended)"**.

- The backup stays **one plain zip** (0241). Past 65,535 entries or 4 GiB it carries the ZIP64 records (the ZIP64
  end of central directory record and locator, and the ZIP64 extra field on each entry whose size or offset does not fit
  32 bits), written by a module of our own around fflate's streams. **No new dependency.**
- **The reader comes with it**: the restore slice reads a ZIP64 backup through the same module, so the app never writes
  a file it cannot read back.
- A test writes and reads back a file past both limits (entries and bytes), its contents checked, not only its count.
- Nothing a person sees changes: the file's name, the page's words and the line beside the button stay as they are. The
  refusal in words goes, except where the device lacks room (BK7, unchanged).

## Consequences
- Not built here: the work is G14 (`docs/STATUS.md`, "Next evolutions"), a slice of its own on a yes.
- `ZIP_LIMITS` and its refusal are removed by that slice; audit 12 and 13's tests change from "refused" to "written
  and read back whole".
- Vision: no surface. A zip that opens in the system's own archive tools is kept: macOS's Archive Utility, Windows'
  Explorer and `unzip` 6 read ZIP64 (from memory, unverified; the slice checks one of them first).

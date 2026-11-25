# 0266. The web keeps the backup's refusal past 4 GiB; phones get ZIP64

Date: 2026-11-25 · Status: accepted · Area: backup · Amends: 0256 ("The refusal in words goes, except where the device lacks room") · From: the steward's plan review of `backup-zip64` (G14), Silent 1-3

## Context
G14 (decision 0256) lifts the backup's two plain-zip limits, 65,535 entries and 4 GiB, by ZIP64 records of our own,
and 0256 said the refusal in words goes. The steward's plan review (Nov 25, finding 1) read the web's side: the web's
`backupIO()` (`src/lib/export/index.web.ts`) holds every chunk of the zip in the tab's memory until it downloads the file
whole, so a library past 4 GiB on the web would not be refused in words but would fail as it may, crashing the tab or
saying "The backup could not be made, and no file was kept. Try again." however often it is tried. A phone writes the
zip to a file under its cache, chunk by chunk, so it can hold one past 4 GiB.

## Decision
The owner's answers in person, 2026-11-25:

- **"Web keeps a refusal (Recommended)"**: on the web, a backup past 4 GiB in bytes keeps today's refusal in words,
  "This backup would be too large for one file, so it was not made.", no file kept and "Last backup made" as it was;
  phones get ZIP64 past 4 GiB. The 65,535-entry limit is lifted everywhere (a zip of many small files is no larger in
  memory than one of few). Which side a backup is on is decided in `backup/core` from what the platform's `BackupIO`
  says it is (`app.platform`), never from `Platform` in core.
- **"Busy button is enough (Recommended)"**: a backup of tens of gigabytes says nothing more while it is made than
  "Backing up…" on its button. No new words.
- **"Enough that we read it (Recommended)"**: if a system's own archive tool cannot open a large file, the page says
  nothing of it; it is enough that Chronicles reads it back (0256's reader). No new words.

## Consequences
- `specs/backup-zip64` BZ5 and BZ7 say so: the refusal is retired on phones and past 65,535 entries, kept on the web
  past 4 GiB in bytes; its test is `backup-zip64 audit 1`.
- The web's memory below 4 GiB stays as `docs/DEFERRED.md` records it (Back up everything): a library past what the tab
  holds fails with the failure line.
- Nothing a person sees changes but the refusal's absence where a phone now makes the file.

# 0249. The backup page's words, its row's second line, and a restore that brings deleted moments back

Date: 2026-11-20 · Status: accepted · Area: backup · Amends: 0241 (its words) · From: `/tend inbox G10 yes`, the
steward's plan review of `specs/back-up-everything`

## Context
Building G10 (decision 0241), the steward read the plan before any code and asked the owner three questions the vision
does not settle, and found the "Your data" row hard to find (S4). The owner answered in person, 2026-11-20.

## Decision
The owner's answers, in person, 2026-11-20:

- **"Last backup made October 3"**, not 0241's "Last backed up October 3" ("Not backed up yet" before any). The share
  sheet cannot say whether the file was saved, so the date is set when the sheet closes or the download is handed over,
  and the words claim only that a file was made.
- **The page says the file shows where you walked**, in one clause and no warning colour: "Anyone with the file can see
  your walks, where they went, and your photos, videos and memos." The home mark is covered by "where they went".
- **The row carries a muted second line**, "Back up every walk and moment", under "Your data"; someone told only "make
  a backup of everything" finds it from launch, and the ux-reviewer's cold find checks it.
- **Bring them back** (for the restore slice): a restore adds what is in the file, moments deleted since it was made
  included. It still never overwrites or deletes what is there (0241).

The owner's answers, in person, 2026-11-21 (to the diff review):

- **"Add a door in Chronicle"**: the Walk settings row stays, and Chronicle's Contents gains a "Your data" entry that
  opens the same page (the cold find from launch had failed).
- **The date alone**: "Last backup made" never mentions pieces a backup left out; they are said once, after it.
- **No version number** (for the restore slice): a newer backup is refused in words that name no version.

## Consequences
- `specs/back-up-everything` BK1, BK8, BK9 and BK13 carry these words; its "For the restore slice" notes carry the
  last answer, beside the steward's condition that neither `offered` nor the checklists come back as a list of what is
  left (Never; decision 0230).
- A delete waiting for Undo is left out of the file (0113): the steward's S2, the orchestrator's ruling, not an owner's
  answer.
- A share sheet dismissed on a phone deletes the file from the cache, and the line still reads "Last backup made" with
  that day: these words claim only that a file was made, as the owner chose them (the auditor's note, Nov 21; no
  change).

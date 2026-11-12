# 0154. Agents change the record documents only through `scripts/records.js`

Date: 2026-11-12 · Status: accepted · Area: process · Amends: 0128, 0129, 0130 (how a run writes its record) · From: the owner, after `/tend replay`'s record commit (Nov 12)

## Context
A `/tend replay` record commit (`6af0c01f` on `tend/replay-20261112-1652`) was meant to replace only the "Last tend"
section of `docs/STATUS.md`. It deleted about 100 lines with it: the whole "Open before the loop", the owner's open
items. `check:docs` and `check:tend` both passed it: neither reads what a commit does inside a document. Agents were
free-editing three files the owner reads as the state of the work.

## Decision
The owner's three answers:
- **A script and a verify gate.** The documents stay markdown the owner reads and edits by hand. `scripts/records.js`
  (`npm run records -- <op>`) offers named operations: the inbox's `T` and `G` entries (add, note, set, remove),
  "Last tend" (set), "Open before the loop" (add, note, remove), the "In flight" and "Slices" rows, and the items of
  `docs/DEFERRED.md` and `docs/NATIVE_UNVERIFIED.md` (add, remove, tag, note, split). Each parses the document,
  changes one entry, parses it again and refuses to write unless every other block is byte-identical.
  `npm run check:records -- <range>` fails a diff to these documents that is not a sequence of whole operations.
- **Scope:** `docs/STATUS.md`, `docs/DEFERRED.md` and `docs/NATIVE_UNVERIFIED.md`. The ledger is already JSON
  written by `scripts/tend.js` and stays as it is (`inbox add` writes its `lastT` and `lastG` only).
- **Landing:** on the orchestrator's session branch, for the owner to review and merge; never pushed to `main` by
  the session.

The rule: **agents change `docs/STATUS.md`, `docs/DEFERRED.md` and `docs/NATIVE_UNVERIFIED.md` only through
`scripts/records.js`.** Every skill that writes them names the operation and runs `check:records` before the commit.
`scripts/tend.js commits` runs the verify on each `tend …` commit that touches them, so CI holds every loop push to
it; a run may amend or remove what an earlier commit of the same run filed. The script, its tests and `tend.test.ts`
are in the loop's FORBIDDEN list. The owner's own hand edits are not gated.

## What verify allows
A whole entry added or removed where an operation would; lines appended to an entry (`note`); a tag put on an
untagged item; an inbox entry rewritten under its own number (`inbox set`, a reshaping the owner asked for); a row of
"In flight" or "Slices" set; "Last tend" replaced, its heading kept; a bullet split into bullets that keep every word;
a new section of `docs/DEFERRED.md` or `docs/NATIVE_UNVERIFIED.md` with its intro. Everything else fails: a heading
or paragraph changed, a bullet rewritten or cut short where it stood (read by the words it shares with what replaced
it), a section emptied at once, an entry number used twice or given out again, a "Slices" row removed, the head of
`docs/STATUS.md` or its branch table touched.

## Consequences
- What used to be an edit in place is now a `note`, or a `remove` and an `add`: the record says which.
- A shipped `[loop]` item is removed, not struck through (`tend map 3` struck one through; under this rule it fails).
- Calibrated over `main`'s last 45 commits to the three files: every inbox, "Last tend", tag and append change
  passes; what fails is in-place rewrites, strike-throughs and the `/fix` inbox section of Nov 11 (the run's report).

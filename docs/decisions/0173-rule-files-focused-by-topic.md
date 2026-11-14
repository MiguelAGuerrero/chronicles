# 0173. Rule files: focused by topic, a warning at 20,000 characters

Date: 2026-11-14 · Status: accepted · Area: process · Extends: 0135

## Context
`.claude/rules/explore-and-discovery.md` grew from about 9,000 characters (Nov 3) to 39,936, against the 40,000
cut-off `check:docs` fails at, because each Explore slice (atlas, places archive, presence, presence and kinds,
remarkable and public, whole towns, community parks, presence readers) appended to its area's file and nothing warned
before the hard cap. It loaded for 11 path globs, so most of its roughly 10,000 tokens were irrelevant to any one
change. Decision 0135 makes rule files add-only for the loop, so `/tend` could not split it, yet a run filed the split
as `[loop]`.

## Decision
The owner, in person on Nov 14:

- **The split.** The file becomes five, each with `paths:` narrowed to its code and every line moved word for word:
  `presence.md` (what a place is, its readers, the kinds and community parks), `explore-marks.md` (places of
  interest, marks, checklists, finds, Remind me here), `explore-atlas.md` (the Explore tab), `explore-towns.md`
  (towns and neighborhoods on the atlas) and `explore-places-archive.md` (the places archive).
- **The three other files past the warning are split the same way** (the owner's second answer, Nov 14):
  `map.md` into `map.md`, `map-reactivity.md` and `map-staples.md`; `captures-and-media.md` into
  `captures-and-media.md`, `media-editing.md`, `note-pages.md` and `memo-transcripts.md`; `journal.md` into
  `journal.md`, `journal-rest.md` and `journal-note-types.md`.
- **AGENTS.md points at the folder** (the owner's choice, Nov 14): its "Rule areas" list is replaced by one line,
  "Each area's rules are in `.claude/rules/<area>.md` and load by themselves when you read or edit that area's files;
  `ls .claude/rules/` lists them." A new rule file needs no line in AGENTS.md, and the list can no longer go stale.
- **A warning.** `scripts/check-docs.js` warns, without failing, for a rule file past `ruleWarnChars` (20,000),
  naming the file and its size; `ruleChars` (40,000) stays the failure.
- **`/slice`:** a slice with its own decision record and its own code folder gets its own `.claude/rules/<topic>.md`,
  `paths:` narrowed to that folder, rather than appending to its area's file; a rule file past the warning size is
  split by topic before more is added.
- **`/docs-gc`:** lists rule files past the warning size and splits them, or in a loop run files a `T [owner]` entry.
- **`/tend`:** a rule file past the warning size is never a `[loop]` item (the loop only adds to rule files, 0135);
  it is a `T [owner]` entry, so it is asked rather than left in the ledger.
- **`/tend-orchestrator`:** an item that blocks the loop and waits only on the owner is put to the owner as a
  question at the next report, not merely listed.

## Consequences
- No rule file is over 20,000 characters after the splits, so `check:docs` prints no warning.
- Records that name a rule file by a line it held (in `docs/STATUS.md`) may now find that line in one of the new
  files; the paths they name still exist.

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
  (towns and neighborhoods on the atlas) and `explore-places-archive.md` (the places archive). AGENTS.md's rule
  areas name them `explore-*` and `presence`.
- **A warning.** `scripts/check-docs.js` warns, without failing, for a rule file past `ruleWarnChars` (20,000),
  naming the file and its size; `ruleChars` (40,000) stays the failure.
- **`/slice`:** a slice with its own decision record and its own code folder gets its own `.claude/rules/<topic>.md`,
  `paths:` narrowed to that folder and a line in AGENTS.md's rule areas, rather than appending to its area's file;
  a rule file past the warning size is split by topic before more is added.
- **`/docs-gc`:** lists rule files past the warning size and splits them, or in a loop run files a `T [owner]` entry.
- **`/tend`:** a rule file past the warning size is never a `[loop]` item (the loop only adds to rule files, 0135);
  it is a `T [owner]` entry, so it is asked rather than left in the ledger.
- **`/tend-orchestrator`:** an item that blocks the loop and waits only on the owner is put to the owner as a
  question at the next report, not merely listed.

## Consequences
- After the split no rule file it made is over 20,000 characters; `captures-and-media.md`, `journal.md` and `map.md`
  are, and the warning names them.
- AGENTS.md is within a few bytes of its 12 KB budget, so a new rule area's line there needs room made first.

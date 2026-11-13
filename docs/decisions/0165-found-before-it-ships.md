# 0165. A feature is found before it ships: the owner's task, every surface, a cold find, the live task

Date: 2026-11-13 · Status: accepted · Area: process, ui · Amends: decisions 0074 (the audit), 0114 (UI patterns), 0145 (the UI review)

## Context
Note types at capture (NY18-NY25) was specified, built, audited by three reviewers and deployed, and the owner
could not find it: "I don't see any place to put a note type on the notes or pages at all." Two faults, both
confirmed on the live build in two minutes once someone did the task there: the journal's slot was a muted grey tag
with no word, and the page a note opens into from the journal's line had no Type tool, only a brand-new page did.
The owner asked for the skills to be audited for why it was missed.

Why it passed every check:
- The criteria described the mechanism ("a slot named Type sits at the end of the dateline"), and their tests found
  it by test id and spoken name. Nothing asked whether a person could find it.
- The pages were listed from memory ("a new note's page"), not from the code. The page has four hosts.
- The reviewers' briefs said where the control was, so none of them had to look for it; the UX reviewer passed it.
- The deploy's live check was a search of the bundle for the new code.
- The owner was never shown where it was.
- The vision gate asked for a quiet slot, and nothing weighed quiet against findable.

## Decision
The owner's call, Nov 13:
- **The owner's task comes first in a spec**, in their words, with a finding criterion: someone not told where the
  control is can find it (`/slice` 2a).
- **Every surface is listed from the code**, each with a criterion or a reason it is left out (`/slice` 2b; the
  auditor's "Every host").
- **A cold find** runs before any review: the `ux-reviewer` with pictures and the task in a sentence, and nothing
  that says where the control is. Not found is a high finding (`/slice` 9, `/audit` 2).
- **The deploy's check is the task done on the live build**, in a phone-size browser, with pictures (`/deploy` 3.4).
- **The owner is shown where it is**: pictures of each new control, and "Where to find it" in the report.
- **Found before quiet**: a control a person must find is in ink with a word or a known symbol
  (`.claude/rules/ui-patterns.md`).

## Consequences
- A slice that changes a screen costs one more reviewer pass and one live walk. Both are minutes.
- Reviewer briefs for the informed passes may still describe the controls; the cold find is what must not.
- These are steps in skills, held by whoever runs them: nothing mechanical fails a slice that skips one.

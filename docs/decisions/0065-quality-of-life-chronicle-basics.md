# 0065. Quality of life round 3: the Chronicle basics

Date: 2026-11-03 · Status: accepted · Area: quality of life, Chronicle, captures, map

## Context
After the walk basics (0064), the owner asked for the next round of the quality-of-life list, run end to end with a checkpoint per feature, as before.

## Decision
Round 3 is: rename a walk later from its More menu (QL22, QL23), edit a note's text from the viewer (QL24, QL25), a photo's small copy on its pin (QL26, QL27), and the walks list under month headers (QL28). Round 4 (keep awake, GPX export, the current street as a chip, dark mode) waits; each of those needs the owner's call first.

## Consequences
- A walk's title and its one line, and a note's body, become editable after the fact: truth edited in place, like a caption, never derived.
- Pins show only the small copy, never the full photo, so a map stays cheap on an iPhone.
- The capture bus takes a patch with no sender, for screens that keep their own list.
- Navigate's live walk opens no viewer, so it has no Edit note; QL24 was corrected in the spec.

# 0180. Colours come from a palette of semantic tokens

Date: 2026-11-14 · Status: accepted · Area: ui

## Context
The code-quality report (decision 0178) found 297 hard-coded colour literals in 71 files and no palette
module, while timings already come from `lib/motionTokens`.

## Decision
The owner, Nov 14: a colour palette module, "if it alleviates hard-coded constants in favor of semantic
tokens". Tokens are named for what they mean (the trace, a faint offer, ink, a divider), not for their hue.

## Consequences
- Its own slice: a module beside `lib/motionTokens`, the literals moved over by catalog move R16, a journey
  and the UI review, since every screen's colours pass through it.
- Until then the code-quality gate fails a new colour literal in a file.

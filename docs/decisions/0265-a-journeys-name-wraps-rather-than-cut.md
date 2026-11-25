# 0265. A journey's name wraps rather than being cut or reworded

Date: 2026-11-25 · Status: accepted · Area: outing · Relates to: 0210, 0264

## Context
T64 named the outing's leaning over parks and viewpoints "Through green and views", the owner's words (in person,
2026-11-25: "T64 as a quick batch (Recommended)"; "Through green and views (Recommended)"). The batch's review found
that while a walk records, the capture stack narrows the outing's sheet by 76 px, so at 320 px the opened journey's
title, held to one line, was cut to "Through green an…" and the card's name wrapped; with no walk, the title cut at
about 112% text (the auditor's A1 and A2, the `ux-reviewer`'s U1). `.claude/rules/ui-patterns.md` asks that nothing
wrap on a 320 px phone at the default text size.

## Decision
The owner's answer in person, 2026-11-25: "Keep words, allow wrapping (Recommended)".

- The owner's words stay. A journey's name may wrap on its card and as the opened journey's title, at 320 px, while a
  walk records and at larger text, rather than be cut or reworded. The opened title keeps Back beside its first line.
- At the default text size with no walk recording, both stay on one line at 320 and 390 px, as before.
- This departs from ui-patterns' "nothing wraps at 320 px at the default text size" for a journey's name only.

## Consequences
- `tend outing audit 1` lets the opened title wrap beside Back, and the outing journey holds the name whole on its card
  and as the title with a walk recording at 390 and 320 px, the line count logged.
- `.claude/rules/outing.md` notes it, and `docs/NATIVE_UNVERIFIED.md` asks for it on a phone at the first larger text
  step.

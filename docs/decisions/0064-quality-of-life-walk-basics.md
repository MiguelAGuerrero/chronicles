# 0064. Quality of life round 2: the walk basics, with a checkpoint per feature

Date: 2026-11-03 · Status: accepted · Area: quality of life, walk screen, navigation, tabs

## Context
After the map staples (0063), the owner chose the next round from the quality-of-life list: the walk basics. The owner also asked for a checkpoint after each implemented feature, deployed to main for manual verification, with only the smallest tests during the work and the full suite once at the end of the round.

## Decision
Round 2 is: a km or miles setting (QL13-QL16), the time left beside the distance left while navigating (QL17, QL18), and a way to Settings from the "Not recording" chip, with the recorder tried again when the app comes back to the front (QL19-QL21). Rounds 3 (rename later, note editing, pin thumbnails, month headers) and 4 (keep awake, GPX, the street chip, dark mode) wait.

## Consequences
- A units store read synchronously by every formatter (`lib/units.ts`), defaulting from the locale; the setting lives in the Start dialog's "Distances" segment.
- A Locate-style pure pace estimate (`lib/nav/eta.ts`), never a fitness number: a time, not a speed, is shown.
- The chip re-raises the recorder's own notice; a return to the front retries `recorder.start` once (`restartRecording`).
- Checkpoints go to main per feature without the full suite; the full suite runs once at the round's end (the owner's instruction, Nov 3, over 0018's "deploy after the full suite").

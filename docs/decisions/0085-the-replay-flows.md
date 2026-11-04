# 0085. The replay flows: glide to the moments, zip through the rest, tap to hold

Date: 2026-11-04 · Status: accepted · Area: replay · Supersedes: 0002, 0004 · Amends: 0003 (in the replay), M10-M12

## Context
The owner, Nov 4: the replay was "a very slow trace that has no rhythm". The path ran at an even pace over the minutes walked and stopped dead at every capture until Continue, each capture full screen. A prototype (https://claude.ai/artifact/XouW4WPy8e2yPQWYsYDUNc) was tuned first; the owner chose from it.

## Decision
- The path's time goes to the stretches between moments, not the minutes walked: a glide between nearby moments, a zip (the camera pulled back) through a long empty stretch, a cut with "N min later" across a gap.
- Nothing waits for a tap. A tap, or Hold, holds everything; Skip still jumps to the card. The first watch and re-watches play the same.
- A time-of-day clock rolls with the walker; no elapsed counter.
- Notes and memos are speech bubbles stacking in a corner; photos and videos are a card that grows from the pin and tucks into a pile; the pile opens them full screen.
- Places passed without stopping whisper by; the card keeps its low.
- A soft cap of about 60 s; memos and videos play in full.
- The day's replay gets the same treatment. The screen reader's path is unchanged.

## Consequences
- `specs/replay-rhythm/spec.md` (RR1-RR22). The five beats keep their order (0001); the card and naming are unchanged; the capture viewer stays full screen (0003 outside the replay).
- The meta `day_watched:<key>` no longer changes anything.

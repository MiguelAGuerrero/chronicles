# 0001. The replay has five beats in fixed order, with restraint, and the lows stay in

Date: 2026-10 (v0) · Status: accepted · Area: replay

## Context
The spec is the owner's "Explorer App Concept" doc in Claude Docs. This app is its v0, "the chronicle": start, walk, capture (photo, voice, text), stop, replay. The replay is the make-or-break.

## Decision
Respect the replay's rules: five beats in fixed order, restraint (no confetti, streaks or badges), and the lows stay in.

## Consequences
- `replay.ts`: change the beat and its start time together (`phase = { beat, t0 }`), beat transitions in the clock's tick. A separate clock state once skipped the fog beat on "Watch again".
- The low is `passedLine`, in words (0052). "Nothing is a score" (0020) follows the same restraint.
- With a screen reader on (native only), the replay skips the fog and path and goes through the captures, then the card.

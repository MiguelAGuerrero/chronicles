# 0009. Pause stops recording, is a break in the trace however short, and captures still work while paused

Date: 2026-10 (v0) · Status: accepted · Area: recording

## Context
Round 3 (the owner's calls): pause, standstills, place memory, captions, export.

## Decision
Pause stops recording. A pause is a break in the trace however short. Captures still work while paused (the owner's call); an unstamped one is placed where the pause began, not on a line across it.

## Consequences
- `pauseWalk` writes the pause row, then stops the recorder. `resumeWalk` starts the recorder first (via `start`, which asks for location again) and ends the pause only if that worked.
- `isBreak(a, b, pauses)` in `geo.ts` is used by `splitAtGaps`, `traceDistanceM`, the snapper, `timedRuns` and the replay's `activeClock`; pass the walk's pauses everywhere a trace is drawn, measured or replayed. `useLiveTrace` takes the pauses too.
- Pause sits beside Hold (48 px, 20 px apart), Resume is filled orange, Stop is disabled while a pause or resume is in flight; a sticky reminder after 10 min paused, with a local notification on a phone (`lib/notify`), permission asked at the first pause.

# 0036. No all-day tracking: a moment gets one fix, and nothing tracks between moments

Date: 2026-11-01 · Status: accepted · Area: moments and days, location

## Context
Moments may belong to no walk (0035), so a capture from the home needs a position without a walk's recorder running.

## Decision
The owner's rule: no all-day tracking. `lib/locate` watches until a fix ≤ 50 m or 10 s, then clears the watch: nothing tracks between moments.

## Consequences
- `lib/locate` (`locate/index.native.ts` and the web's), `placeMoment`. The save never waits on the fix.
- Location is asked only after the camera permission resolves (two prompts at once fail on Android). The web's 10 s starts once the permission prompt is answered (capped at 60 s). Native refuses a cached fix older than 15 s.
- The Locate button (QL, 0063) reads one fresh fix the same way; nothing tracks after.
- Deferred: Remind me here firing outside a walk, which needs background location; quick capture outside the app (widget, lock screen, share sheet).

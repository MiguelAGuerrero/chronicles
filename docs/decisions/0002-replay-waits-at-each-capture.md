# 0002. The replay waits at each capture until Continue

Date: 2026-10 (v0) · Status: accepted · Area: replay

## Context
The concept doc had a fixed ~40 s replay. The owner's call, over the doc's fixed ~40 s.

## Decision
The path runs in a fixed 30 s, but stops at every capture until Continue. Photos stay up; voice memos and videos play to the end. Skip jumps to the card.

## Consequences
- `schedule` in `replay.ts`; the path runs in active time (gaps over 60 s collapse to a 5 s hop, `activeClock`).
- At a stop the clock stands still: `stop.atMs` holds the path time, resuming sets `t0 = now - atMs`; `shown` counts the groups visited and is reset on "Watch again".
- Taps in the first 600 ms after a capture appears are ignored, so a double tap never skips one unseen.
- `CaptureContent` is keyed by capture id, so moving on unmounts the player and stops the sound.
- Amended for re-watches by 0004.

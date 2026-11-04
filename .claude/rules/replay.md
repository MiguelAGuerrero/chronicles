---
paths:
  - "src/lib/__tests__/replay/**"
  - "src/app/replay/**"
  - "src/app/day/**"
  - "src/lib/{replay,quietLines,summary}.ts"
  - "src/components/CaptureView.tsx"
---
# Replay

A walk's replay and the day replay: the five beats, the stops at captures, re-watches, the card's wording, and the clock. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

## Rules

- **The replay waits at each capture** (the owner's call, over the doc's fixed ~40 s):
  the path runs in a fixed 30 s, but stops at every capture until Continue. Photos
  stay up; voice memos and videos play to the end. Skip jumps to the card.
- **Photos and videos are full screen** (the owner's call): the media fills
  everything above a thin dark strip with the details and the actions (‹ ›, or the
  replay's Continue). Notes and memos keep their card. The replay uses the same
  layout at its photo and video stops.
- **Re-watches move on by themselves** (the owner's call): "Watch again", and replays
  opened from the log, advance after 4 s for a photo or note, and when a memo or
  video ends. Only the first replay after a walk waits for taps.
- **Video** comes from the camera button (the system camera's own video mode),
  capped at 30 s on phones and 15 s on web. The mic stays the separate pocket
  recorder.

## The card

- **Counts are words** (U13, `lib/quietLines`): the card's new streets are a
  clause in its line ("your first time down Elm Street", "3 streets new to
  you"), from `ReplayData.newStreets` (visited named keys not walked
  before); the fog beat says the same, or "Familiar ground". The low names
  one or two places, else "a few places" (`passedPlaces`, `passedLine`).
  The walks list row is date, distance, time and captures (`walkRowMeta`).
  No accent colour or large number on the card; the e2e scans for both.

## Gotchas

- Change the beat and its start time together (`phase = { beat, t0 }`) and do beat
  transitions in the clock's tick. A separate clock state once skipped the fog beat
  on "Watch again".
- The path runs in active time: gaps over 60 s collapse to a 5 s hop
  (`activeClock` in `replay.ts`).
- At a stop the clock stands still. `stop.atMs` holds the path time, and resuming
  sets `t0 = now - atMs`. `shown` counts the groups already visited; reset it on
  "Watch again".
- `CaptureContent` plays a voice memo or video itself and is keyed by capture id, so
  moving on or skipping unmounts the player and stops the sound.
- Taps in the first 600 ms after a capture appears are ignored, so a double tap never
  skips one unseen.
- A capture after the last fix stops the path at its end. The path span is the trace;
  captures are clamped to it.
- With a screen reader on (native only, since react-native-web always says yes), the
  replay skips the fog and path and goes through the captures, then the card.
- The replay sets `playsInSilentMode` when it mounts, or memos are silent with the
  iPhone's ringer switch off.

# 0037. Memories on revisit: earlier captures nearby show as faint pins that never buzz

Date: 2026-11-01 · Status: accepted · Area: memories

## Context
The concept doc's "Memories on revisit" tab. "Remind me here" already fires loudly for a flagged capture; the question was how the rest of the past shows up on a walk.

## Decision
The owner's call, Nov 1: earlier walks' captures nearby show as faint pins, on every walk, quiet or exploring. They never buzz and never notify; "Remind me here" stays the loud, flagged version. The pins hold captures within 100 m of the latest accepted fix, at most 6, nearest first, never this walk's own. Moments made outside any walk count as earlier memories too.

## Consequences
- `lib/memories.ts` (pure); `memoryReader` reads with `db.capturesIn` in a 150 m box, once per 50 m walked, one read at a time; on web through the capture store's `lat` index (IndexedDB v9).
- The pins are the same `CapturePinView`, `faint` (75%, 55% opacity), on their own map layer (`memories`, `onMemoryPress`), never mixed into `captures` or Explore's `discoveries`; under this walk's pins.
- A tap previews (`MemoryPreview`), opening a second `CaptureViewer` titled "Memories here".
- After the audit, a clock badge (MR10) marks a memory pin as from the past.
- Thumbnails for the preview (0038). Native unverified: the memory Markers.

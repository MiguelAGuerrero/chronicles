---
paths:
  - "src/lib/memories.ts"
  - "src/components/MemoryPreview.tsx"
  - "src/lib/__tests__/memories.test.ts"
---
# Memories on revisit

Earlier walks' captures shown as faint pins on a walk (`lib/memories`) and the memory preview. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

- **Earlier walks' captures nearby show as faint pins** (`lib/memories.ts`, pure),
  on every walk, quiet or exploring (the owner's call, Nov 1). They never buzz
  and never notify; "Remind me here" stays the loud, flagged version.
  - The pins hold captures within 100 m of the latest accepted fix, at most 6,
    nearest first, never this walk's own.
  - A capture whose reminder card is up has no pin meanwhile.
  - Moments made outside any walk (`walk_id` null) count as earlier memories too.
- **Cheap:** `memoryReader` reads the area with `db.capturesIn` in a 150 m box,
  once per 50 m walked, one read at a time.
  - A slow read is never dropped when a fix comes in, a failed one is tried
    again on the next fix, and it sends only a changed set.
  - On web, `capturesIn` uses the capture store's `lat` index (IndexedDB v9),
    never `getAll` over the store.
- **The pins:** the same round `CapturePinView`, `faint` (75%, 55% opacity), on
  their own map layer (`memories`, `onMemoryPress`). They are not mixed into
  `captures` or Explore's `discoveries`.
  - On web both pin layers go through the module-level `usePinMarkers`, whose
    key includes the member ids. Memory pins carry `data-testid=memory-pin` and
    `data-ids`.
- **A tap previews** (`MemoryPreview`, above the capture row).
  - It shows the tapped pin's own captures first (`groupFirst`), read far enough
    to reach the group's farthest member (`groupRadiusM`), never this walk's.
  - It closes on a map tap, ✕, Back or Escape, or after walking 30 m. A long
    press, a mark, or the options card replace it, and it hides while a memo
    records. The Undo, Retry and caption pills hide under it.
  - It opens a second `CaptureViewer` titled "Memories here".
  - A photo that won't load falls back to the kind's icon.

- **Under this walk's pins:** memory markers get z-index 0 on web and are drawn
  first on native. A faint pin shrinks toward its stem's foot. Its label is "N
  memories here".
- **A clock badge** (MR10, after the audit: a faded pin read as "my pin, faded")
  marks a memory pin as from the past. It is a solid ink disc with a white clock,
  outside the fade, unlike a find's white check.
- **Native** (unverified on a device): the memory Markers.

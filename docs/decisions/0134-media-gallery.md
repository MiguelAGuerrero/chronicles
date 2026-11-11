# 0134. Media: every photo, video and memo in a grid, the context in the day's header

Date: 2026-11-11 · Status: accepted · Area: chronicle, ui, vision

## Context
The owner asked for "a grid or gallery view of all my moments, pictures, and voice memos without the captions ... a
media gallery much similar to iPhone to quickly scroll through" (Nov 11). VISION.md's Always says a moment "never
appears as a bare thumbnail, filename or count", and Apple Photos heads a day with a count. The gate found it aligned
if reshaped (`specs/media-gallery`); the steward read the spec twice (S1-S14, all accepted).

## Decision
The owner's calls, Nov 11:
- **A fifth section, Media**: Memories | Walks | Days | Map | Media, as Day One's List, Calendar, Media, Map. The
  pills share the row so five fit a 320 px phone.
- **Bare tiles, the context in a pinned day header** (the gate's reshaping): no caption, note, date or place on a
  tile; the day and where in words above, pinned while its tiles scroll (the steward's S1); a tile opens its moment
  whole. No count anywhere.
- **One tile per piece**: a moment of three photos is three tiles. Notes have no tile.
- **Newest on top**, and **iOS Photos' basic sorting and view controls**: Newest or Oldest First; Years, Months and
  Days; pinch to change the size (with Zoom In and Out in the menu); Square or Aspect Ratio Grid. A kind filter (All
  Items, Photos, Videos, Memos). Recently Added is not offered: it would sort as Newest First here.
- **The look of a photo gallery**: tiles edge to edge with hairline gaps and square corners.
- **Video thumbnails are the next slice**; here a video tile is its glyph and length, and a memo tile a mic and its
  length.
- A month's or year's cover is a fixed rule (its first photo in the Sort's order), never a "best" one; its line names
  places latest first, never by how often they were walked.

## Consequences
- `specs/media-gallery` (MG1-MG22) carries these. Nothing new is stored but one meta key, `gallery_view` (sort,
  size, shape).
- The viewer gains `startAt`, `position={false}` and `onShown`; its other callers are unchanged.

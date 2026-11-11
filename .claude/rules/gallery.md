---
paths:
  - "src/lib/gallery/**"
  - "src/lib/__tests__/gallery/**"
---
# Media gallery (Chronicle's Media)

Every photo, video and memo piece in an edge-to-edge grid under day headers, with Years, Months and Days, a View menu
(Sort, Show, Zoom, Square or Aspect) and pinch. The spec is `specs/media-gallery/spec.md` (MG1-MG22). The codemap is in
`docs/ARCHITECTURE.md`.

- **A tile is bare; its context is the header** (the gate, Nov 11): never draw a caption, note, date or place on a
  tile. The day's header stays pinned (MG16), so no screen is only bare thumbnails.
- **Nothing counts** (MG7): numbers are words; the only digits are dates, times and lengths. The viewer opened from
  here shows no "i of n".

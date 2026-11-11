---
paths:
  - "src/lib/gallery/**"
  - "src/components/gallery/**"
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
- **One tile per piece, the moment whole in the viewer** (MG3, MG8): the filter picks tiles and which moments the
  viewer steps to, never what a moment shows. The viewer gets `startAt` (moment and piece), `position={false}` and
  `onShown`, which reads the moment's context line through `resurface.contextFor` (Memories' line, MC1-MC5).
- **Every row's offset is known** (`dayRows`, `blockRows`): the list uses `getItemLayout`, and the day headers are
  `stickyHeaderIndices`. A header has a fixed height (`HEADER_H`), so its place line is at most two lines.
- **Traps:**
  - A pinch on the web is the browser's page zoom unless the grid says otherwise: the grid's View has
    `touch-action: pan-y` (one finger still scrolls). The e2e pinches with CDP touch events.
  - Years, Months and Days remount the list (`key={zoom}`): a month's tap lands through `initialScrollIndex`, not a
    `scrollToOffset` after the change, which the remount loses. Size and Sort changes keep the list and scroll in an effect.
  - On the web, sticky headers stack at the top as they pass; the last drawn is the one seen. A check of "the header at
    the top" takes the last one there.
  - **A fixed row height is made from its type, never picked** (fix gallery-header): `HEADER_TYPE`, `BLOCK_TYPE`,
    `headerHeight(fontScale)` and `blockTextHeight(fontScale)` give both the view's styles and the row's height. On
    the web a column too short for its content shrinks its children (min-height 0), and a one-line `Text` clips: a
    64 pt header with a two-line place line cut the title. Texts in a fixed box have `flexShrink: 0`; the journey
    seeds a place line that wraps and checks no title is cut.
  - The meta key scan (FC8) reads only `getMeta` / `setMeta`: the shell calls them, not `metaStore`.
  - An icon draws a private-use glyph: a tile's text in the e2e strips `[-]` before comparing.
- **Native** (unverified on a device): the grid's fling, the pinch, TalkBack's list size (`docs/NATIVE_UNVERIFIED.md`).

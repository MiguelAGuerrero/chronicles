---
paths:
  - "src/components/GoHere.tsx"
  - "src/components/GoHereSheet.tsx"
  - "src/lib/atlas/goHere.ts"
  - "src/lib/__tests__/explore/goHere.test.ts"
  - "scripts/e2e/journeys/gohere.js"
  - "scripts/e2e/journeys/gohere-chronicle.js"
---
# Go here (decisions 0189, 0190)

A quiet way to a place from every surface that shows one and a way to start a walk to it: one hook, one sheet of two choices. The specs: `specs/explore-go-here/spec.md` (GH1-GH15) and `specs/go-here-everywhere/spec.md` (GE1-GE13). The area's own rules are in `.claude/rules/explore-atlas.md` and `navigation.md`.

- **Go here on a tile** (GH1-GH15, decision 0189): `AtlasTile` takes `onGoHere`; its button (`atlas-go-here`) is a sibling of the tile's pressable, absolutely placed over a 44 px `goSlot` every tile reserves (so the row stays one height, and a button never nests in the tile's button on the web). `goHere.ts` (core) holds `canGoHere` (not `here`, needs `area.at`; a tile with no fix still has it), the two choices (Chronicles first, then `mapsAppName()`), `goHereDo` (maps / later / start, no distance read). The sheet (`GoHereSheet`, `go-here-sheet`) is a plain card over the row, never a Modal and with no scrim; Back and Escape close it (a separate effect in `explore.tsx`). Chronicles is `useStartWalk().later`, or `startWalk` with a walk open (NV10). A Playwright `click` scrolls the button into view and the row then selects that tile: the journey taps with `mouse.click` at a visible point.

- **Go here on the rest of the surfaces** (GE1-GE13, decision 0190): one hook, `useGoHere` (`components/GoHere.tsx`), serves the tile, the card's footer (`atlas-card-go-here`, hidden while the far question is open and on the area you are in: `cardCanGoHere`), the storefront and complex rows (`atlas-storefront-go-here`, `atlas-complex-go-here`; `rowActions`: Go here shows when Walk to doesn't), the long-press card (`spot-go-here`, `spotCanGoHere`: zoom 12 and not asking) and Chronicle's star sheet (`place-go-here`) and long-press card. The card passes `covered` while the sheet is open, so Back and Escape close the sheet alone; Chronicle's `HomeSheet` takes `ownKeys` false for the same reason. The maps link carries `shareLabel`: an area's name, else "Destination". Audit traps (go-here-everywhere audit 1-9): any host that listens for Escape or Back itself must stand down while the sheet is open (`pageBack` takes `goHere`, the card gets `covered`, Chronicle's `HomeSheet` gets `ownKeys` false), or one Escape closes two things; every `openInMaps` call passes its label through `shareLabel` (a unit test greps for it, the walk screen included); the maps hint says "Recording pauses" only with a walk open on the web (`goHereMapsHint`); the sheet's edge comes from `sheetEdge`; a sheet is cleared when its tab loses focus (adjusted during render in `useGoHere`, not in an effect, for the React Compiler lint).

---
paths:
  - "src/components/OpenInMapsButton.tsx"
  - "src/lib/atlas/mapsButton.ts"
  - "src/lib/__tests__/explore/mapsButton.test.ts"
  - "scripts/e2e/journeys/openmaps.js"
  - "scripts/e2e/journeys/openmaps-chronicle.js"
  - "specs/open-in-maps-here/**"
---
# Open in Maps beside Walk (decision 0194)

Every place shown with a way to walk there has two controls named for where you end up: the host's walk action (the accent: Chronicles guides and records) and "Open in Maps ↗" (outlined, never the accent: the phone's maps app, nothing recorded). It replaced "Go here" and its two-choice sheet (0189, 0190). The spec: `specs/open-in-maps-here/spec.md` (OM1-OM14). Area rules: `.claude/rules/explore-atlas.md`, `navigation.md`.

- **One hook, one button.** `useOpenInMaps(onFail)` (`components/OpenInMapsButton.tsx`) is `feedback('tap')` then `openInMaps(at, shareLabel(kind, label))` straight from the tap (a browser opens a window only from one). It saves nothing, starts no walk, opens no sheet. `OpenInMapsButton` has three looks: `half` (a tile's right button), `button` (an outlined pill: the card footer, the star sheet, the long-press cards) and `link` (a text link under a storefront or complex row's name, so the name keeps the width Walk to leaves it). Test ids: `tile-maps`, `atlas-card-maps`, `atlas-storefront-maps`, `atlas-complex-maps`, `spot-maps` (Explore and Chronicle), `place-maps`.
- **Where it shows** (`mapsButton.ts`, core): `canOpenInMaps` (not the area you are in, needs `area.at`; a tile with no fix still has it), `cardCanOpenInMaps` (not the area you are in, not while the far question is open), `spotCanOpenInMaps` (zoom 12 and not asking, Walk here's own condition), `rowActions` (Walk to only when walkable; Open in Maps always).
- **What leaves the device is the destination.** `shareLabel`: an area's name for an area, a complex or a street, else "Destination", because a star's title or "Your spot" is the owner's own and Android's `geo:` link carries a label. Every `openInMaps` caller passes it (`mapsButton.test.ts` greps for it, the walk screen's hand-off included).
- **The tile's foot** (`AtlasTile`): two half-width 44 px buttons in an absolutely placed row over a 52 px slot every tile reserves, outside the tile's pressable (a button in a button is invalid on the web, and a tap on the buttons must not select the tile). The walk button is accent-filled only on the selected tile (OM8); the rest are outlined. Its label is known at render only as far as "too far to walk" (`canWalkTo`: "Set as destination"); whether a tap starts the walk or opens the card asking depends on the clock and the last fix, so `onTileWalk` (`explore.tsx`) decides at the tap with `walkToChoice` and `tileWalk` (never read a ref or `Date.now()` in render). Asking is `askKey` plus `AtlasCard`'s `askOnOpen`, cleared by `onAsked` once the card has mounted.
- **The journeys tap with `mouse.click`** at a visible point: a Playwright `click` scrolls the button into view and the row then selects that tile.
- **The walk screen's own routing** says "Route here" (OM13): the long-press card, the open "?" mark's button and the pin viewer's menu item. Their test ids (`go-here`, `mark-go`, `viewer-go`) kept their names.

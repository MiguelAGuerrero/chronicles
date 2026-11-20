# The walk's map under its raised drawer: investigation (2026-11-20)

From: the owner's /investigate, 2026-11-20, picking the walk drawer's deferred item: "With This walk or the settings
menu up, your dot and trace sit under the raised drawer, so the visible map is mostly empty ground; only the Explore
section's ring is fitted. The riding capture buttons can also cover a pin." Queued as G9. Status: queued.

The drawer this is about is the walk drawer sections slice (`specs/walk-drawer-sections`, built Nov 19 on
`claude/serene-sagan-lz8nzp`, not yet on `main`). On `main` the same raised drawer holds the walk's settings in one
list, so the cause below is already there; the slice makes it matter, since This walk is read mid-walk.

## What the owner saw

From the slice's pictures (`walkdrawer-01-details.png`, `-02-menu.png`, `-04-*.png`, 390 x 844, web build).

| Mark | What it is | Drawn by |
|---|---|---|
| Plain beige ground above the drawer | The base map, with nothing on it: the walker is under the drawer | `components/map/WalkMap.web.tsx` (the canvas runs under the strip and the drawer) |
| The drawer, from 338 px down | `ReadyBar` raised to `liftedHeight` (60% of the screen) | `components/walk/ReadyBar.tsx`, `lib/walkDrawer.ts` `liftedHeight` (slice branch) |
| The camera, mic and note just above it | `CaptureStack` riding the drawer's edge (WD17) | `components/walk/CaptureStack.tsx` `lift` (slice branch) |
| "Weak GPS" chip, the chevron | The top row, unchanged | `app/walk.tsx` |
| (Explore section only) the walker, a pin and the cone above the drawer | The range ring's fit, the one camera that knows the drawer | `app/walk.tsx` `fitPadding`, bottom `drawerH - BAR_H - insets.bottom + 16` |
| (Explore section) a pin half under the note button | The fit's right padding is 24 px; the riding column is 56 + 16 | the same `fitPadding`, `right: 24` |

## Why it reads wrong

Ranked, most to least.

1. **The follow camera centres the walker on the whole canvas, never on the part the drawer leaves.** The web map
   follows with `map.jumpTo({ center: to })` (`WalkMap.web.tsx:1564`, and per frame of the glide at `:486`); the native
   map with `cameraRef.current?.jumpTo(to)` (`WalkMap.native.tsx:301`, from `GlideFollow`, `:961-971`). Neither takes a
   padding, so with the drawer at 60% of an 844 px screen the dot sits at y 422, 84 px under the drawer's top (338).
2. **The map runs under the strip and the drawer by design** (`.claude/rules/walk-screen.md`, "The scale bar's inset is
   measured from the map's own bottom": "on the walk it runs under the strip"). A choice, kept: resizing the canvas at
   each raise would redraw it and move every pin.
3. **The one camera that knows the drawer is the ring's fit** (`app/walk.tsx`, `fitPadding` for `ringFit`, slice WD11),
   so only the Explore section shows you; This walk, the menu and the other sections fall back to cause 1.
4. **No padding clears the riding capture column** (cause of the UI review's U6): the ring's fit pads 24 px at the right
   while the column takes `CAP + GUTTER` (72 px) once it rides above the drawer.
5. **A trap for the fix, not a cause:** maplibre-gl keeps an ease's padding on the map and adds the next one on top
   (`absolutePadding` is false by default in 6.16, `node_modules/maplibre-gl/src/ui/camera.ts:173-175`), which is why
   `showPoint` uses an offset and never `padding` (`WalkMap.web.tsx:1659-1663`, fix 2, the owner's iPhone, Nov 4). A
   follow padding must be set absolutely, and cleared on lowering, or later fits land off.

Never seen on a phone: all of it. The native follow (`GlideFollow`) and its `jumpTo` with a padding have never run on a
device.

## How adjacent apps do it

The docs hosts (developers.google.com, maplibre.org, docs.mapbox.com) are blocked from cloud sessions (Nov 20); the
library line is read from the installed source.

- **Google Maps** (iOS, Android): pulled up, a place's or a trip's sheet leaves the map above it, and the blue dot or
  the place is moved into that part, not left under the sheet. Source: from memory, unverified. **Unverified**.
- **Apple Maps** (iOS): the card at the bottom; with it raised, the map's centre sits in the part left above it.
  Source: from memory, unverified. **Unverified**.
- **AllTrails** (iOS): recording, the stats sheet pulled up over the map; whether the dot is kept above it is not
  recorded. Source: from memory, unverified. **Unverified**.
- **maplibre-gl 6.16** (the web map's library, not an app): a camera's `padding` is "Dimensions in pixels applied on
  each side of the viewport for shifting the vanishing point" (`src/ui/camera.ts:146-149`), the means the shape uses;
  `@maplibre/maplibre-react-native` 11.5's `jumpTo` takes the same `padding` (`CameraOptions.padding`, "The viewport
  padding in points", `lib/typescript/.../components/camera/Camera.d.ts:24-26`). Source: the installed packages, read
  Nov 20. **Verified** (source read).

## Options

| # | The change | Answers | Vision risk | Cost |
|---|---|---|---|---|
| A | A follow padding: while the drawer is up, the follow camera keeps the walker in the middle of the part above it and left of the capture column; lowered, the padding goes | 1, 3, 4, 5 | none: the map shows what it always did | a `followPadding` prop in `map/types.ts`, both renderers' follow, `walk.tsx`; native |
| B | The same by an offset per follow jump, no padding kept on the map | 1, 3, 5 | none | web `jumpTo` takes no offset (only `easeTo`): an ease per fix fights the glide |
| C | This walk frames the whole trace so far above the drawer, following again when lowered | 1 (This walk only) | none | a fit per raise; the owner chose against it (Nov 20) |
| D | The canvas shrinks to the part above the drawer while it is up | 1, 3, 4 | none | a resize and full redraw at each raise, pins and labels jumping; reverses rule 2's choice |
| E | Leave it | none | none | the owner chose against it (Nov 20) |

**Recommendation: A, size S.** One prop, both follows, the walk screen passing the drawer's height and the column's
width, cleared on lowering. Three criteria and a native device check.

### Vision

```
## Vision
Idea: with the walk's drawer up, the map keeps you in the middle of the part left above it, instead of under it.
Verb: earn (the map you walk by stays readable while you read This walk or change a setting) and honour (This walk is
read beside the place it describes).
Touches: Always, "Restraint in motion, colour and copy" (the camera moves with the drawer's own spring, never on its
own); Always, "Capture is one tap away" (unchanged: the riding stack, WD17); decision 0076 (one screen, one geometry).
Verdict: aligned
Shape: as asked: following, the walker's dot sits in the middle of the map above the raised drawer and left of the
capture column; lowered, it is in the middle of the screen as today; nothing new is drawn or said.
Precedent: Google Maps and Apple Maps keep the focus above their sheets (from memory, unverified); maplibre's padding
shifts the vanishing point (source read, verified).
Criteria: below, 1-3.
Open: none.
```

## The owner's calls

Asked Nov 20 with AskUserQuestion; both answers took the recommendation, so no decision record is written.

1. "What should the map show above the raised drawer?" Offered: keep you centred above it (recommended); show the
   whole walk so far while This walk is up; leave it as it is. **Answer: keep you centred above it.**
2. "How tall should This walk open?" Offered: keep 60% for every view (recommended: one height, so the riding
   capture buttons never jump between views); This walk shorter, about 40%. **Answer: keep 60% for every view.**

## The recommendation

Option A. The slice's criteria:

1. Following, with the walk's drawer up on any view (This walk, the menu, a section), the walker's dot is drawn in the
   middle of the map above the drawer's top edge and left of the riding capture column (within 8 px); lowered, it is in
   the middle of the screen as today.
2. The camera moves with the drawer, not after it: a raise or a lowering shifts the view in the same motion (with
   reduced motion, at once); a pan while it is up stops following as today.
3. Nothing is left on the map: after the drawer is lowered, a later fit (the route preview, the Explore section's ring,
   a mark's card) lands where it does today; the ring's fit also keeps clear of the riding column (the UI review's U6).

## What the slice will touch

- `components/map/types.ts`: `followPadding?: Padding` beside `fitPadding`.
- `components/map/WalkMap.web.tsx`: the follow's `jumpTo` (`:486`, `:1564`) sets the padding absolutely (maplibre 6.16:
  `absolutePadding`, or `setPadding` once per change) and clears it; `showPoint` and the fits unchanged.
- `components/map/WalkMap.native.tsx`: `GlideFollow`'s `jump` passes `padding`.
- `app/walk.tsx`: `followPadding` from `drawerH` and the column (`at.right + CAP + STACK_GAP`) while `options`; the
  ring's `fitPadding.right` the same.
- A core helper for the padding (a pure function of the screen, the drawer and the column), unit-tested first.
- Journeys: `walkdrawer` (a check of the dot's place per view: `window.__project` the walker and read its y); `walk`
  and `layers` for the follow and the fits. Size: small (decision 0223), about 10 minutes.
- Native: never run on a device; an item in `docs/NATIVE_UNVERIFIED.md` ("the dot above the raised drawer").
- Cost: one padding per raise or lowering, nothing per frame beyond today's follow.

## Not settled

- **Order:** it builds on the walk drawer sections slice, which is not on `main` yet (`claude/serene-sagan-lz8nzp`).
- Whether maplibre RN 11.5 keeps a `jumpTo`'s padding for later moves, as maplibre-gl does: to read in its source
  first, and on a device.
- The glide: the web follow jumps per frame (`:486`); setting the padding there per frame would be a cost. Set once
  per change and leave the per-frame jump bare, if maplibre keeps it (it does on the web).

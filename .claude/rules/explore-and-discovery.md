---
paths:
  - "src/lib/discovery/**"
  - "src/lib/explore/**"
  - "src/lib/db/{exploreRow,placeRow,stores}.ts"
  - "src/app/(tabs)/index.tsx"
  - "src/lib/atlas/**"
  - "src/components/atlas/**"
  - "src/components/{MarkPinView,ExploreSettings,ReminderCard,RemindEditor}.tsx"
  - "src/lib/__tests__/explore/**"
---
# Explore and discovery

Places of interest from the tiles, marks, checklists and finds (Explore), and Remind me here. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

## Places of interest and marks

- **Places of interest** come from the tiles' `poi` layer, read in the same z14
  reads as streets (`collectView`, `collect`, so `snapWalk` and the walk screen),
  into a `place` cache tagged with the build. `discovery/tilePois.ts` is the only
  file that knows the poi classes; its table is the tab's. Sources sit behind
  `PlaceSource`.
- **Keys:** category + name (NFC, trimmed, `toLowerCase`, never the locale's) +
  position to 4 decimals. One POI can straddle a rounding line and get two keys,
  so a checklist build runs its pool through `isOffered` against itself.
  - **Unnamed:** only subclass `artwork` ("Public art") and `viewpoint` ("A viewpoint")
    are kept. Two unnamed artworks in one ~10 m cell are one place (accepted).
- **A mark is for an attraction** (the owner's call, Nov 2: scans kept offering
  food, bars and a Domino's). The ordinary activity of an area shows as its busy
  streets instead.
  - `MARK_CATEGORIES` (`discovery/noise.ts`): art, history, parks, culture,
    viewpoints. Food, shops and nightlife stay in the place cache for the
    atlas's bars. Busy-street density has its own table and sources
    (`activity/`, AD1-AD2): every kind of place, OSM and Overture, never marks.
  - `tilePois` sets `markable` per place. Cinemas, dog parks and picnic sites are
    never marks. Places of worship, town halls, courthouses, cemeteries and
    libraries are marks only when the name holds a word from `notable.json`
    (whole words after `normalizeBrand`).
  - Chains (`chains.json`, per category, whole leading words) are never marks.
  - `isMarkable` gates what goes on a checklist. A row without
    `markable` (cached before it) is not a mark until read again. SQLite
    migration 8 adds the column (`db/placeRow.ts` maps it); IndexedDB stores
    the whole object.
  - Food courts are dropped in `tilePois`.
- **Truth vs cache:** `DERIVED_STORES` (`db/stores.ts`: street segments, places,
  explore reads) are cleared by `purgeDerived`; `KEPT_STORES` (offered, mark,
  recall, checklist areas and items, finds) never are.
  SQLite migration 6, IndexedDB v5. Cached places are used only for the current
  build (`candidatesFrom`), since a purge can race a live read.
- **Parent tiles:** maplibre-gl's `querySourceFeatures` returns parent tiles still
  standing in while z14 loads; `toRoadFeature` carries `_z` as `zoom`, and POIs
  off z14 are dropped. Native features carry no zoom (unverified on a device).
- **Native:** the invisible `q-pois` layer makes the poi source layer load; whether
  it's needed (or costs layout) is unverified on a device.
- **Deferred:** an index for Offered (it's read whole; fine for thousands).

- **Explore** (slice 5, replaces scan and ambient; the spec is E1-E23 in the
  v1 tab; `explore/explore.ts` pure, `exploreRun.ts`, `useExplore.ts`,
  `settings.ts`). The owner wanted discoveries in the moment, not a planned list
  (Nov 1).
  - **A walk starts quiet** (meta `explore_walk` holds the exploring walk's id).
    Quiet is navigation plus captures: no "?" marks, magenta, strip chip or
    dead-zone pill. Reminders fire on every walk (the owner's call, after the
    audit: a reminder is set on purpose). Explore starts from the home's
    Explore button beside Start walk, or the switch in the walk's options;
    either sets `explored:<walk>` to the time it began, so the replay counts
    only what it passed from then.
  - **Checklists build on every walk, quiet too** (so a capture can find a place):
    `readCentre` decides when (a fix 1 km from every read of this build, or in
    an area with no checklist of this build). One decoder read of 1.5 km around
    the area's point (else the fix), plus a z11 read for towns, builds the
    checklists of the areas it saw whole (`buildChecklists`: an area's reach,
    capped at 1.5 km, inside the read), never rebuilding or taking from an area
    already built for this build (`built`, `known`). Busy streets are saved only
    on an exploring walk (`remember`); switching Explore on reads them at once
    where a quiet read skipped them. One read at a time; a failure waits 2 min
    and 100 m (`retryAllowed`), route reads too. The build is checked at most
    every 10 min (`exploreBuild`), never per fix.
  - **Membership:** nearest neighborhood point within 1 km inside the place's
    town, else the town whose outline holds it (TO11, decision 0083), else the
    town or city within its reach capped at 1.5 km (closer for its size). A
    place inside an outline but past 1.5 km from its town's point is an
    orphan, never the neighbor's; else an orphan
    (`area_key` null: shown, never counted). One area is one level and name
    within 1 km (`sameArea`): a town's point moves with the zoom it was read at,
    so the home matches by that, not by the key (`placeCount`).
  - **Storage:** `checklist_area`, `checklist_item`, `find` (kept), `explore_read`
    (derived: a build change clears it, so areas are read again and rebuilt,
    E4). SQLite migration 9, IndexedDB v8. Items snapshot the place; `kind` is
    set only on fresh reads (`tilePois` `kindFor`), never cached in `place`.
  - **What shows** (`visibleMarks`): found places at any distance; unfound ones of
    shown kinds within the range (60-300 m, 100 by default), nearest 8, named
    within 60 m or once revealed this walk. On a route, `routeMarks` adds up to
    20 faint ones within range of the route ahead; the route's areas are read
    first (`routeProbes`, every 500 m).
  - **Finding:** a capture within 60 m of an unfound place, any kind, any walk
    (`findFor`); the first find of a place stands. Walking past only names it.
    Captures that already found a place are handled before any other is
    looked at, so a reload never finds a second place for them. A found pin is
    small, nameless and lets taps through to the capture beside it.
  - **Web reads by latitude** (`checklist_item` index `lat`), never `getAll()`
    over the kept store.
  - **Deferred:** an unstamped capture can't find a place (it has no position
    until stop); a place moved by a new build can be found twice; the pocket
    alert likely needs the screen on (native); the home preview ignores the
    kind switches and doesn't restore the view after.
  - **Settings** (no panel of their own: inline in the walk's drawer, `walk.tsx`, and the ready bar's, `StartSettings`; pieces in `ExploreSettings.tsx`, saved as they change, the ring shown while the drawer is up on an exploring walk): what I'm into (8
    kinds, meta `explore_hidden`), the range (`explore_range`), the pocket alert
    (`explore_haptic`, a double-tap once per place per walk, one for places
    coming into range together; `pocketAlert` decides, `feedback('nudge')`
    plays; on phones and on a touch-screen browser, `canBuzz()`, 0079). Every
    unfound mark counts, named or "?" (`alertKeys`): at the 60 m range a place
    is never a bare "?". No alert while a range is previewed; the alerted set
    is kept per walk (`alertedFor`), so a minimize doesn't alert twice. The
    range preview is a ring (`ring` prop, `ringGeoJSON`) on the map already on
    screen, never a second map: the walk's around you, the home's around your
    last walk's most-walked area.
  - **The Explore tab honours "What I'm into"** (Nov 2, after its "?" never
    showed on an exploring walk with kinds switched off): the atlas's
    `waitingKinds` and `waitingMarks` take the hidden kinds, so a "?" on the tab
    is one a walk can show. A find shows whatever its kind.
  - **Home:** no "?" and no count on the overview; a place view shows
    "N of M · list from <date>" and its finds. **Replay:** finds by name
    (`foundList`) and "Passed Hessian Memorial without stopping", or "a few places"
    (`passedLine`, never a count since tabs audit U13).
    Marks found before explore stay in their replays; old open marks are not
    read.
  - **Native** (unverified on a device): the background read on a quiet walk,
    the ring layers, migration 9, the pocket alert.

- **Remind me here** (`discovery/recall.ts` pure, `recallCheck.ts`):
  - Every write goes through `saveRecall`/`stopRecall`, which keep the
    in-memory copy honest.
  - A check runs after 10 m walked. On web, the walk screen checks each fix. On
    a phone, the location task checks every accepted fix of each batch
    (`filterFixes` + `withoutPauses`).
  - Where a fire goes is decided when it is shown (`deliver`): the walk
    screen's card if it is in front and listening, else a notification with a
    fixed `recall-<walk>` identifier.
  - A flag set during a walk counts as fired in it (`newRecall`). An edit
    keeps what firing wrote (`editedRecall`).
  - A tapped notification stores its ids in meta `recall_open`. The next
    screen to mount opens them, playing: the walk, or the home with no walk
    open.
  - Notification permission is asked when a reminder is saved (in front),
    never from the task. "Stop reminding me" opens the app, because with the
    app killed a background action reaches no listener.
  - The card goes after 30 s or 100 m. Repeat fires merge into it.
  - **Deferred:** clearing flags whose capture is gone (there is no delete
    yet). Reminders fire on every walk, quiet or exploring.
  - **Native** (unverified on a device): the task's check, notifications,
    actions and cold-start taps.

## The Explore tab is an atlas (AT1-AT14, decision 0066)

- **`atlas/atlas.ts` is pure:**
  - `ATLAS_RULES`: the 800 m ring, neighborhoods within 2.5 km, towns within 12 km, 12 tiles at most.
  - `STEPS` per category, and `presenceSteps`.
  - `nearList`, `newRows`, `readQueue` and `needsNear`.
  - `familiarity`, from the home's `Area` and `WalkArea`.
  - `waitingKinds` and `waitingMarks`: kinds and positions, never names.
  - `sketchOf` and `sketchPaths`: a 200 x 150 frame, with the ring 64 units across its radius on every tile.
  - `tileLabel`.
  - Change what a read keeps, or how it is judged, and bump `ATLAS_CODE`.
- **Atlas grading (AG1-AG6, decision 0084):** the five findable kinds (`MARK_CATEGORIES`) count only places with `markable` true (`read.ts` sets it from `isMarkable`, chains included), so the dots and the "?" agree. Food, shops and nightlife count all. `profile.thin` (fewer than `ATLAS_RULES.thinPlaces` places in the ring): the tile shows no kinds or character line, the card no kind rows. `MARKABLE_CLASSES` (`tilePois.ts`) is pinned by AG5's test: a new markable class is a change to the spec's definition of a mark. Next: whole areas (DEFERRED).
- **Presence, not quality.** Bars come only from places inside the ring, against fixed steps. They are never relative to the neighbors, and every level uses the same ring (a town's is around its point). Green counts park places, not park area (deferred).
- **Reads** (`atlas/read.ts`) decode tiles in code, like every read:
  - the near read: z14 place points for neighborhoods, z11 for towns, recorded in meta `atlas_near:<level>`;
  - the ring read: the z14 tiles of the picture's frame, with Overture's places for the same tiles (AD3). It takes strips from `analyzeArea`, keeping those whose peak is inside the ring, and the graded stretches for the sketch (one path per grade, AD14). `profile.overture` names the release; `readQueue` reads a ring again when it differs from the one known (`rereadAt`: after `retryMs` for an older release, `overtureRetryMs` (30 min) when measured without Overture), and `atlasStep` waits for the next one due. A read without Overture keeps a profile measured with it (`keptProfile`). `ATLAS_CODE` a2.
  - `one()` keeps it to one read at a time; a second ask resolves `null` and is retried 1.5 s later.
  - A failed ring stores `failed_at` and waits `retryMs`.
- **The loop** (`useAtlas`) runs only while the tab is focused and a position is known. It does one step per effect run and asks for the next with a timer. Moving 1 km, a new build or a new `ATLAS_CODE` lists again.
- **Storage:** `atlas_area` is in `DERIVED_STORES` (SQLite migration 15, IndexedDB v13), so `purgeDerived` clears it.
- **The hierarchy is the grid** (round 2, the owner, Nov 3; AT2): no level switch. The page near you lists the neighborhoods around you, then "Towns nearby". A town's tile opens its page (`useAtlas(..., town)`): its wide tile, then `townNeighborhoods`, which are within its reach (capped at 5 km) and belong to it (`townOf`: the nearest town, closer for its size). Near reads are kept per level as a list (`atlas_near:<level>`, `withNear`, newest 12, each with its radius), so going into a town and back reads nothing twice.
- **The title floats over the map** (AT15): the map starts under the status bar; the title card has a shadow. Tiles carry `characterLine` (AT16) and the busiest strip. On web the map has no top inset (`lib/mapTopInset`): iOS Safari reports a status-bar inset although the tab starts below its toolbar, which pushed the chip down from the corner (Nov 4). The 0 holds while the page has no `viewport-fit=cover` and the PWA status bar style is `default`; if either changes, the web inset becomes real.
- **The town page's wide tile takes its content's height** (`outerWide`, never `flex: 0`): collapsed, its heading and empty line drew over it on an iPhone (Nov 3). The e2e checks the tile ends above `atlas-town-section`.
- **The area card is sized in pixels** from the screen's measured height: sized by percent and insets, it showed only its header on an iPhone's Safari (Nov 3).
- **Round 3 (decision 0067, the design review):**
  - Presence is dots (`KindStrip`'s `Dots`). A tile shows only the kinds present; the card's `KindRow` shows all eight, with "none" at full ink. `MARKS_EXPLAINED` has no numbers, and the e2e checks it.
  - Walk to is the card's footer (`walkTarget` → `label`, `via`). The card is a side panel from 1000 px; on a phone it is a full-screen drawer (the owner, Nov 4, replacing the 58% / 90% sheet): it covers the tabs, which fold away while it is open (`lib/tabsHidden`, read by the tab layout; the card clears it on unmount, so a card that closes any way brings them back). A pull down closes it progressively: from the handle or header at any time, from the content only when scrolled to the top and the move is clearly downward (`createPull` in `AtlasCard`). It follows the finger, never above full screen (pulling back up stops at the top and never closes); let go past 30% of the screen or in a downward fling it finishes closing, else it springs back. Tap-outside is gone (nothing is outside).
  - The long press's choices (`atlas-spot`) sit over the map, and `spot` clears on `pick`, `enterArea`, `leave` and blur. Below z10 a toast shows. Meta `atlas_press_seen` ends the hint.
  - `otherTowns` drops your town; the title (`atlas-title`) opens it.
  - A town's page has one way back, the pill low on the screen (`atlas-back-pill`), with Back and Escape; the title card has no arrow (decision 0077, Nov 4).
  - Area points are the map's `areaPoints` prop (`components/AreaPoint.tsx`, DOM markers on web, Markers on native), with names for the nearest three and the selected one. Never `marks`, which stay for the pressed spot.
- **Busy areas are streets** (Nov 4): `busyAreas` lists only pockets with a street name; one without is dropped, never shown as a placeholder (TP7). Two pockets named for the same street list it once, at the busier (read-time, no `ATLAS_CODE` bump).
- **Your town is the outline you are in** (TO10, decision 0083): `useAtlas` reads the kept outlines under you (`outlines.known`, no network) on each new z12 tile, reads the tile once when missing (backing off `retryMs` after a failure), and `nearList(..., outlines)` marks the town whose outline holds you, or none while its row isn't listed: never the nearest point instead. The town near read adds outline-only towns (`listable`). `ATLAS_CODE` a3.
- **Position:** one fix read as the app opens (NV16, `launchFix`; the owner's call, Nov 3, since Explore is the opening tab), then the last fix, or a Locate tap. Until that fix comes, or if it fails, the tab opens where it last listed areas, from `atlas_near:neighborhood`, never saying "You're here", and the title says "Near you".
- **Kept from the old tab:** the long press on the small map (What's good here, Walk here). The drawer's "?" and find pins on the map are gone; finds are on the cards.
- **Discrete navigation** (DN1-DN13, decision 0092, an experiment): Explore's map steps from area to area instead of panning.
  - `atlas/snap.ts` is pure: `swipeOf` (24 px, never a long press or two fingers), `swipeHeading` (the way a pan would have gone, turned by the map's bearing), `landing` (where the pan would put the map's middle: the drag times metres a pixel, plus `coastPx`, maplibre's own inertia for a flick), `nextArea` (the nearest area to the landing, on the side swiped toward, never the selected one; with nothing selected, from where areas are framed and past 100 m of it; the owner's amendment, Nov 4: the old 45° cone never reached Bethlehem from Fountain Hill), `snapScope` (a town's page steps towns until one of its neighborhoods is selected; from the map's framed middle there), `arrowSwipe` (a slow 48 px swipe), `zoomStart` (shift box zoom, tap-drag zoom), `releaseSwipe` (native), `tapClears`, `revealTo`.
  - The screen passes `onSwipe` to `WalkMap`, which reports the drag, its speed at release (web: the last 100 ms of moves, none if the finger rested 50 ms; native: PanResponder's `vx`, `vy`), the framed middle and metres a pixel. A neighborhood step sets `selected` and closes any open card (a side panel on a wide screen would show the area left; it also blocked Escape on a town's page, audit 1), eases to the point at the current zoom with the fit's padding (`showPoint(at, mapPad)`), and brings its tile into view (`createGridRows`). A town step is `enterArea`. There is no trail (DN5 retired): a swipe back lands back by itself.
  - **Reveal measures, never remembers** (audit 4): on web a row moved by a banner or the press hint above it never reports `onLayout` again (react-native-web's is a ResizeObserver), so `reveal` measures the row and the grid with `measureInWindow` when asked, and keeps clear of a town's back pill (audit 8).
  - A tap on the map closes the long press's choices if they are open, else clears the selection (DN9), but never within the tap's reach of an area's point (`tapClears`, audit 6).
  - The web's live region alternates a zero-width space, so the same name twice in a row is said again (audit 7).
  - Refs and the React Compiler: a closure object made once with `useState(createX)` (as `createPull`), never a ref read from a function called in render (`grid()`). Each row registers through a stable callback ref, `gridRows.rowRef(keys)`; the ScrollView keeps a real `useRef`, passed to `reveal` at call time.
  - E2E: `E2E_ONLY=snap` adds four neighborhoods and Cranston (`serveSnap`); area points carry `data-selected`; the selected tile is checked by its accent border (react-native-web drops `aria-selected` on a button).
- **E2E:** tiles carry `data-name` and `data-read`; kind slots carry `data-kind` and `data-step`. The long press goes near the small map's middle, since a pixel there is more ground than on the old full-screen map.
- **A town is graded across its outline** (TP1-TP12, decision 0089; `ATLAS_CODE` a5): a town with an outline counts places inside the whole-town z10 outline (`outlines.borders`, never the clipped z12 pieces, `atlas/extent.ts`: at most `TILE_BUDGET` 60 z14 tiles, nearest its point first, `partial` says so). Neighborhoods keep the 800 m ring and their a4 rows stay current (`CARRIED`). `atlas/pockets.ts` finds its pockets by peak picking on a smoothed 400 m grid (never connected cells: a city is one blob); `read.ts` names each for the busiest street within 800 m, and draws the picture around the busiest (`sketchAt`). A town whose outline can't be read is graded by the ring with `outlineRetry` and read again after `retryMs`. Fixtures: `scripts/fixture-town-points.mjs`. Shops hold a mall and a department store only; supermarkets and errand shops stay out (v1 spec).

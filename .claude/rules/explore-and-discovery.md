---
paths:
  - "src/lib/discovery/**"
  - "src/lib/presence/**"
  - "src/lib/__tests__/presence/**"
  - "src/lib/explore/**"
  - "src/lib/db/{exploreRow,placeRow,stores}.ts"
  - "src/app/(tabs)/explore.tsx"
  - "src/lib/atlas/**"
  - "src/components/atlas/**"
  - "src/components/{MarkPinView,ExploreSettings,ReminderCard,RemindEditor}.tsx"
  - "src/lib/__tests__/explore/**"
---
# Explore and discovery

Places of interest from the tiles, marks, checklists and finds (Explore), and Remind me here. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

## Presence: what a place is (PR1-PR8, decision 0140)

- **One classification.** `presence/presence.ts` (core) is the only table from OpenMapTiles poi classes, Overture's taxonomy, the places archive's classes (`classesOfArchive`, PS1) and landcover (`classesOfLandcover`, PS4) to what a place is: `classesOfOsm(cls, sub)` (a class's own rules, then a subclass the same under any class, then the class's default) and `classesOfOverture(hierarchy)` give classes from one vocabulary (`CLASSES`: each a density weight and, where it has one, a category and kind). Density reads `densityWeight` (the greatest), marks and bars `markClassOf` (the first with a category). A feature may carry several classes.
- **Curation is apart.** `discovery/curation.ts` decides what is a mark over classes (`NEVER_MARK`, `BY_NAME`, `MARK_CATEGORIES`); presence says what a place is, never whether it is worth finding. Presence records two facts curation judges (PS3, PS6, PS10): `recorded` (the archive holds it) and `historic_name` (`presence/notable.ts`, the one word list and rule); a `BY_NAME` class is a mark with either. Both weigh nothing; nothing sorts by them (0103: a gate, never a measure).
- **Change a class or a table, bump `PRESENCE_CODE`.** It is part of `ATLAS_CODE` (`a9.p2`) and `LANDING_VERSION`, so atlas and landing rows are read again; when the golden tables show nothing derived changed, carry the last code's rows: `PRESENCE_CARRIED` beside the code, read by the atlas's `CARRIED` and the landing's `LANDING_CARRIED` (PS9: `a9.p1` under `a9.p2`, by `ATLAS_OWN`); only ever the code just before, emptied when a bar, mark or weight changes (presence-readers audit 2). Rows and near reads judge a code alike (`codeCurrent`, audit 4). Cached places keep their read's category (nothing reads them); checklists take a new class at the next tile build.
- **Every reader is on presence** (specs/presence-readers): the archive, bars, notable names, greens and the planner. A place carries `classes` on a fresh read, never stored. It also holds `unnamedLabel` (D4) and `isTransitStop` (L7), and lists every tag it reads (`SOURCE_TAGS`), which the guard (presence-readers audit 1) holds no module outside presence spells, the kind pipeline's among them. Lookups read own entries (`own`, audit 5: `constructor` threw). "Busy" is not presence: traffic, if ever, is a signal of its own (0140).
- **Readers' golden:** `__tests__/presence/readers.golden.json` (captured on main before the slice's code) holds the archive's classes, the poi pairs under three names, the landcover greens and the atlas's marks with their kinds over presenceSample and presenceTowns, also fed outlines (PS8, audit 8). A deliberate change re-captures it, listed in a spec.
- **Golden table:** `__tests__/presence/golden.json` holds what the two old tables answered for every realistic pair; PR8 holds every pair outside PR5's list to it. A deliberate reclassification adds the pair to the test's `CHANGED` with its new answer and to the spec's PR5 table.

## Places of interest and marks

- **Places of interest** come from the tiles' `poi` layer, read in the same z14
  reads as streets (`collectView`, `collect`, so `snapWalk` and the walk screen),
  into a `place` cache tagged with the build. `discovery/tilePois.ts` is the poi
  layer's adapter; what each poi class is lives in `presence/presence.ts` (decision 0140).
  Sources sit behind `PlaceSource`.
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
    atlas's bars. Busy-street density reads presence's class weights for both sources
    (`activity/`, AD1-AD2, PR4): every kind of place, OSM and Overture, never marks.
  - `tilePois` sets `markable` per place, from `curation.ts` over presence classes. Cinemas, dog parks and picnic sites are
    never marks. Places of worship, town halls, courthouses, cemeteries,
    libraries, community centres, memorials and nature reserves are marks only when the name holds a word from `notable.json`
    (`presence/notable.ts`, whole words; memorials and reserves since presence, PR5), or the places archive records them (PS6).
  - Chains (`chains.json`, per category, whole leading words) are never marks.
  - `isMarkable` gates what goes on a checklist. A row without
    `markable` (cached before it) is not a mark until read again. SQLite
    migration 8 adds the column (`db/placeRow.ts` maps it); IndexedDB stores
    the object as given, but for presence's `classes` (PS2).
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
    set only on fresh reads (presence's class kind), never read back from `place` (SQLite has no column; IndexedDB keeps it, unread).
  - **What shows** (`visibleMarks`): found places at any distance; unfound ones of
    shown kinds within the range (60-300 m, 100 by default), nearest 8, named
    within 60 m or once revealed this walk. On a route, `routeMarks` adds up to
    20 faint ones within range of the route ahead; the route's areas are read
    first (`routeProbes`, every 500 m).
  - **Finding:** a capture with exactly one unfound place within 60 m, any kind, any walk,
    finds it (`findFor`); with two or more in reach nothing is found: no
    "Which place?" question (removed Nov 12, the owner; the walker taps a mark to make a moment about it, so nothing is guessed). A loose moment with two in
    reach finds nothing yet (DEFERRED). The first find of a place stands. Walking past only names it.
    Captures that already found a place are handled before any other is
    looked at, so a reload never finds a second place for them. A found pin is
    small, nameless and lets taps through to the capture beside it.
  - **Web reads by latitude** (`checklist_item` index `lat`), never `getAll()`
    over the kept store.
  - **Deferred:** an unstamped capture can't find a place (it has no position
    until stop); a place moved by a new build can be found twice; the pocket
    alert likely needs the screen on (native); the home preview ignores the
    kind switches and doesn't restore the view after.
  - **Settings** (no panel of their own: inline in the walk's drawer, `walk.tsx`, and the ready bar's, `StartSettings`; pieces in `ExploreSettings.tsx`, saved as they change, the ring shown while the drawer is up on an exploring walk): what I'm into (11
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
  - **Home:** no "?" and no count on the overview; a place view names its
    finds (`placeFinds`) and never counts them (decision 0099). **Replay:** finds by name
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
- **A place may light two bars** (PK1-PK19, decision 0127): `barsOf` (`discovery/bars.ts`, core) is the one rule for both the bars and the planner: a place's category, plus History only from presence's class `historic` (PS11): a museum or gallery the archive records, or whose name is notable once a neighbourhood's “Old Town” and “old and new” are read past (`named`, audit 5; marks read the name whole, PS3). A place without `classes` lights its category alone. A plain museum stays in Culture alone, so History and Culture stay apart (PK5, held by `presenceSample.json`, recorded by `scripts/fixture-presence.mjs`). Never add a second bar to a kind wholesale without re-running PK5. History for the archive's `museum` rests on contract v2 (a museum enters only by its listing): the pinned contract's README says so (PK19).
- **Community spaces** (`community`, in Culture): `town_hall/community_centre`, `library/library` and `community_centre` by a notable name only (presence class `community`, in curation's `BY_NAME`), `art_gallery/arts_centre` and `arts_centre` as any name (class `arts_centre`). `parseHidden(raw, known)`: a choice saved before the kind existed (meta `explore_kinds_known` lacks it, written by `saveSettings`) keeps it off when Museums and galleries is off (PK18); every reader of `explore_hidden` goes through `parseHidden` (the scenic read too).
- **The kind pipeline** (PC18-PC23, decisions 0143, 0144): a registry of pure refinements splits a kind into finer subsets.
  adapter (`tilePois`) -> presence classes -> curation (marks) -> merge of sources (`mergePlaces`) -> **refinement**
  (`discovery/refine.ts` the engine, `refinements.ts` the registry) -> the reader's switches. A `Refinement` is `{ id, parent,
  child, judge(places, ctx) => (place) => boolean }`; `refine(places, ctx, refinements)` returns new places, never mutates, applies in order
  (a child may be a later parent). **A new subset is a new entry in `REFINEMENTS`** plus its child in `KINDS` (after its parent) and
  `Kind`; its words go in a JSON file. The adapter and the merge judge nothing about parks. The reads that feed checklists
  and the atlas call `refineRead(merged, { landcover, archive })` after the merge (`landing/read.ts`, `ringOf`); a read with no
  `landcover` judges by name and what is near the point. Never test a kind against the switches with `hidden.has(kind)`: use
  `isKindHidden(hidden, kind)` (a parent off hides its children, `kindChain`), and `kindSwitch` for a row (off and locked
  while a parent is off).
- **Community parks** (PC1-PC17, decision 0143): the first refinement, `discovery/parkKind.ts` (`communityParks`). A park whose
  name holds a word of `communityWords.json` (playground, tot lot, courts) is the kind `community_parks`
  when nothing notable is in or near it: a mark inside the `landcover` outline (`discovery/green.ts`, `outlinesOf`; within 60 m
  of the point with none), a notable name (presence's `notableName`) or a word of `parkNotable.json`, an outline of 5 ha or more, or an archive place
  within 150 m (the refinement's context). **Size never demotes.** The kind is of the parks category (same bar, colour, find,
  mark); a switch hides only it. **Never name an unfound place for its kind**: bars and waiting kinds are categories, so
  "Community parks" shows only in "What I'm into" and on a found place (`foundLine`). The planner and scenic routes do not
  read "What I'm into" and count both as parks. It is curation (0140), so a change to the words bumps `ATLAS_CODE`'s own
  part, never `PRESENCE_CODE`.
  Its two word files are the refinement's curation, never a second notable rule (PS3, 0146); outlines read presence (PS4).
- **Presence, not quality.** Bars come only from places inside the ring, against fixed steps. They are never relative to the neighbors, and every level uses the same ring (a town's is around its point). Green counts park places, not park area (deferred).
- **Reads** (`atlas/read.ts`) decode tiles in code, like every read:
  - the near read: z14 place points for neighborhoods, z11 for towns, recorded in meta `atlas_near:<level>`;
  - the ring read: the z14 tiles of the picture's frame, with Overture's places for the same tiles (AD3). It takes strips from `analyzeArea`, keeping those whose peak is inside the ring, and the graded stretches for the sketch (one path per grade, AD14). `profile.overture` names the release; `readQueue` reads a ring again when it differs from the one known (`rereadAt`: after `retryMs` for an older release, `overtureRetryMs` (30 min) when measured without Overture), and `atlasStep` waits for the next one due. A read without Overture keeps a profile measured with it (`keptProfile`). `ATLAS_CODE` a2.
  - `one()` keeps it to one read at a time; a second ask resolves `null` and is retried 1.5 s later.
  - A failed ring stores `failed_at` and waits `retryMs`.
- **The loop** (`useAtlas`) runs only while the tab is focused and a position is known. It does one step per effect run and asks for the next with a timer. Moving 1 km, a new build or a new `ATLAS_CODE` lists again.
- **Storage:** `atlas_area` is in `DERIVED_STORES` (SQLite migration 15, IndexedDB v13), so `purgeDerived` clears it.
- **The hierarchy is one row** (round 2, the owner, Nov 3; AT2; the row, Nov 10, decision 0124): no level switch. The page near you is one row of cards: the towns, yours leading and so selected on arrival, then the others; the neighborhoods around you only once a town read of this build has covered you and named none (`rowOf`, `townsListedAfter`, `useAtlas().townsListed`, kept until the build changes, so a failed or pending town read never shows neighborhoods in the towns' place and listing again after a walk never empties them; `atlas/carousel.ts`; one level per row, decision 0126). A neighborhood belonging to no listed town shows nowhere (accepted). A town's card opens its page (`useAtlas(..., town)`): the town's own card, then `townNeighborhoods`. **Whole towns** (WT1-WT6, WT9, decision 0132): with the town's z10 border known (`useOutlineSet([town.at], BORDER_ZOOM)` in `useAtlas`), every neighborhood row inside it that no smaller town inside it owns (`insideTown`, `atlas/hoods.ts`), however far or many; without a border, within its reach (capped at 5 km), at most 24, owned by `townOf`. The page's near read (`readNear(..., town)`) reads the border (`wholeBorder`: `outlines.borders`, then on across each z10 tile edge the border is cut at, `borderReach`, audit 1; `useAtlas` does the same with two `useOutlineSet`s), then the z14 tiles it touches (`extentTiles`, as the town's ring read) and keeps `townHoods`: neighbourhood points and hamlets (`hamletsFromTiles`, only here; walk placement takes none) inside it, never a ward (`isWard`, the whole name: "1st Ward", "Eighth Ward", "Ward 5"; wards are dropped at read time too, so old rows hide). A failed border read lists nothing and is tried again (`listingBy`); the read records the town's key (`NearRead.town`), so each town is listed once per build and a read by reach alone is listed again; a town's read never stands for the read around you (audit 8), and `withNear` keeps `NEAR_KEPT` of each kind (audit 13). Allentown: 24 listed before, 36 after (`allentownHoods.json`, `scripts/fixture-town-hoods.mjs`). Near reads are kept per level as a list (`atlas_near:<level>`, `withNear`, newest 12, each with its radius), so going into a town and back reads nothing twice.
- **The title floats over the map** (AT15): the map starts under the status bar; the title card has a shadow. Tiles carry `characterLine` (AT16) and the busiest strip. On web the map has no top inset (`lib/mapTopInset`): iOS Safari reports a status-bar inset although the tab starts below its toolbar, which pushed the chip down from the corner (Nov 4). The page has `viewport-fit=cover` since Nov 12 (fix home-indicator) and the PWA status bar style is `default`; the map still takes no top inset on web.
- **The row sizes to its cards** (`AtlasCarousel`, `rowPane`): never `flex: 1`, and `flexGrow: 0, flexShrink: 0` on the horizontal `ScrollView`, or react-native-web stretches it down the screen; the map takes what is left (`flex: 1`, `minHeight: 0`). The cards are `AtlasTile` without its picture (the area's card keeps it): at 312 px wide the 4:3 picture alone was 234 px.
- **The area card is sized in pixels** from the screen's measured height: sized by percent and insets, it showed only its header on an iPhone's Safari (Nov 3).
- **Round 3 (decision 0067, the design review):**
  - Presence is dots (`KindStrip`'s `Dots`). A tile shows only the kinds present; the card's `KindRow` shows all eight, with "none" at full ink. `MARKS_EXPLAINED` has no numbers, and the e2e checks it.
  - Walk to is the card's footer (`walkTarget` → `label`, `via`). **Drive there first** (DW1-DW14, decision 0121):
    `walkToChoice` (`startPlan.ts`, core) decides on the tap: within `GET_THERE_M` (2 km) with a fix under
    `FRESH_FIX_MS` (30 min) it starts; otherwise the footer asks Walk now (`atlas-walk-now`) or When I get there
    (`atlas-walk-later`, close `atlas-walk-cancel`; Back and Escape close the question before the card); past
    `NAV.maxM` the footer is When I get there alone. With a walk open, Walk to routes it as before (NV10). When I
    get there is `useStartWalk().later` → `saveForLater` (meta `nav`, no walk) → Navigate, ready. Nothing watches
    for arrival (the owner: "to avoid issues of finding parking"). Busy streets' Walk to asks the same way.
  - The card is a side panel from 1000 px; on a phone it is a full-screen drawer (the owner, Nov 4, replacing the 58% / 90% sheet): it covers the tabs, which fold away while it is open (`lib/tabsHidden`, read by the tab layout; the card clears it on unmount, so a card that closes any way brings them back). A pull down closes it progressively: from the handle or header at any time, from the content only when scrolled to the top and the move is clearly downward (`createPull` in `AtlasCard`). It follows the finger, never above full screen (pulling back up stops at the top and never closes); let go past 30% of the screen or in a downward fling it finishes closing, else it springs back. Tap-outside is gone (nothing is outside).
  - The long press's choices (`atlas-spot`) sit over the map, and `spot` clears on `pick`, `enterArea`, `leave` and blur. Below z10 a toast shows. Meta `atlas_press_seen` ends the hint: set after 5 s on screen (once, used or not, explore-carousel audit 10).
  - The title (`atlas-title`) is a header, never a button: "Near you · Towns around you" on the towns, the town's name on its page (decision 0126). `otherTowns` is unused by the screen.
  - A town's page has one way back, the pill low on the map above the row (`atlas-back-pill`, "Towns": it names where it goes, never the page it is on), never under a banner, with Back and Escape; it returns with the town you left selected; the title card has no arrow (decisions 0077, 0126).
  - Area points are the map's `areaPoints` prop (`components/AreaPoint.tsx`, DOM markers on web, Markers on native), with a name for the selected one only; the rest are dots (the owner, Nov 10: the nearest three named still cluttered the small map). Never `marks`, which stay for the pressed spot. Only one level is drawn (`areaPins`, fix map-levels): the selected area's, else neighborhoods, so a town's name never overlays its neighborhoods' (the framing's `points` still include the town). With nothing selected every point is a dot.
- **Busy areas are streets** (Nov 4): `busyAreas` lists only pockets with a street name; one without is dropped, never shown as a placeholder (TP7). Two pockets named for the same street list it once, at the busier (read-time, no `ATLAS_CODE` bump).
- **Your town is the outline you are in** (TO10, decision 0083): `useAtlas` reads the kept outlines under you (`outlines.known`, no network) on each new z12 tile, reads the tile once when missing (backing off `retryMs` after a failure), and `nearList(..., outlines)` marks the town whose outline holds you, or none while its row isn't listed: never the nearest point instead. The town near read adds outline-only towns (`listable`). `ATLAS_CODE` a3.
- **Position:** one fix read as the app opens (NV16, `launchFix`; the owner's call, Nov 3, since Explore is the opening tab), then the last fix, or a Locate tap. Until that fix comes, or if it fails, the tab opens where it last listed areas, from `atlas_near:neighborhood`, never saying "You're here", and the title says "Near you". A Locate tap is a way back to you (fix locate-selection): it leaves a town's page, drops the reader's pick (so your own town leads the row, selected again) and closes any card or press choices.
- **Kept from the old tab:** the long press on the small map (What's good here, Walk here). The selected area's places are over the map again (fix area-marks, the owner, Nov 10: the row's cards have no picture, so the map is the preview): every place still to find (WT7, decision 0132), never named (AT7), and no find (WT10: presence, not completion; the card keeps its "Found" list). `areaMapMarks(level, ...)` (`atlas/waitingPins.ts`) decides at the settled camera's own zoom (`onCameraChange`, half levels; native's `onViewChange` reports only every 0.25, audit 6): a town under `PIN_ROOM.townPinZoom` (14) is every findable place as the same dot, found or not, and no "?" (audit 14, the owner: the field never thins as you find); otherwise the unfound split nearest the area's middle first, a "?" (`discoveries`, `MarkPinView`, `quiet`) where its drawn box (48 x 48 px, standing above its point) has room and the place is in view (`viewOf`, the map's measured size, audit 3), else a dot in its kind's colour with a dark edge (`waitingDots`, one circle layer on both maps, colour its only property, WT14, audit 18). A "?" with a dot under its box is `crowded`: a tap zooms in to `roomZoom` (at most 17) instead of opening the card (audit 4). A tap on the map is one thing (`tapDoes`, audit 9): close Layers, else the long press's choices, else a dot within 44 px (`dotAt` at the settled zoom, audit 2) zooms in. A screen reader hears one button (`atlas-waiting-said`, `waitingLabel`: "Waiting in X: art, green. Opens its card", which opens the selected area's card, audits 5 and 15), the pins `aria-hidden` (WT11). Only the selected area's, never every place in view. A plain "?" opens the area's card, where the kinds are named; the card's "Waiting to be found" stays one per kind (`waitingMarks` without `all`). **Trap:** a pin stands above its point (the web marker's box is 48 wide, 42 above, 6 below), so overlap and "under" are judged on that box, never a square around the point.
- **The row of cards** (EC1-EC20, decision 0124; it replaces the grid under a short map, the wide panes and the directional swipe of 0092): the map fills the screen and one row of area cards sits at the bottom, above the tabs.
  - `atlas/carousel.ts` is pure: `rowOf` (the row's order), `firstSelection` (the selected area is the reader's pick while it is in the row, else the first: derived in render, never an effect, so something is always selected), `rowStep` (a swipe in row steps by what is on screen: left next, right previous, a drag more vertical than horizontal or under 24 px nothing, the bearing never enters), `stepKey` (no wrap at the ends), `settledIndex` and `offsetOf` (the card a scroll stopped on), `busyNamesNear` (the Busy layer's names kept only near the selected area, `busyRadiusM`: a neighborhood's ring, a town's own reach, and from zoom 13, `busyNamesOn`: one boolean, so a camera move is never a new view for the map; its lines are untouched, they are `graded`), `liveReport` (the card nearest the middle is selected as the reader's own scroll passes it, not once it settles; never while the row scrolls itself), `settleStep` (a settled scroll while the row is scrolling itself to a card never selects: it aims on; a reader's drag clears the row's target), `cardFooter` (a footer only on the selected card).
  - `AtlasCarousel` is a horizontal `ScrollView` with `snapToInterval` on a phone. Each card selects as the reader's scroll passes it (`onScroll` → `liveReport` → `onSettle`, so the map previews it at once; `lastReported` keeps the effect from scrolling back to a card the reader's scroll chose). Web has no snap prop, so a scroll that has been still 120 ms settles: it is eased onto the nearest card. A selection made elsewhere scrolls the row to its card, and the settle that ends that scroll is not reported back (`intended`), so the two never fight.
  - Selecting (`selectKey`: the row, a swipe, an arrow key, a tap on another card) closes any card and the long press's choices, eases the map to the area keeping its zoom (a town is framed whole each time it is selected, `townPicked`: its border when known, else its reach and the border once known; fix town-fit, the owner, Nov 13: a town selected again kept the last town's zoom, since `nextFrame` frames a town once a visit), and announces its name (web's live region alternates a zero-width space). A tap on the selected card opens it (a town's its page, `enterArea`). A tap on the map never clears the selection.
  - The map draws the selected neighborhood's ring, or the selected town's tinted border (`lit`, so a town selected in the row reads its outline), and only the selected area is named (`areaPins`).
  - The map's layers (Walkability, Busy) read around the selected area, but on the page near you around you while your own town is selected, as on arrival (`layerCentre`, fix explore-town-scope audits 8, 11): a town's label point can be kilometres off. The Busy names stay near the selected area's point (audit 12).
  - `onSwipe` stays on `WalkMap` (one finger never pans Explore's map, `snap.ts`: `swipeOf`, `arrowSwipe`, `zoomStart`, `releaseSwipe`), and the screen turns it into a row step. The pure directional code of 0092 (`nextArea`, `landing`, `swipeHeading`, `coastPx`, `snapScope`, `revealTo`, `tapClears`) is deleted.
  - Over the map above the row, at most one of an error, a notice, "Looking around…" or the press hint shows (`overlay`); it keeps clear of the Locate column and, on a town's page, of the back pill. With no area to show, one status card (`atlas-empty`) takes the row's place. So does a town's note (`atlas-town-note`, `townNote`: "The map names no neighborhoods in X.", what the map lacks, never a claim about the town) on a town's page with no neighborhoods: its own card alone would repeat the page, so the note takes the row's place (fix town-note-card; the town stays selected; its "What's here" card opens only from a "?" on the map; after a failed read there is no note and the town's card stays).
  - E2E: a journey reaches a neighborhood through its town's page with the harness's `areaTile(pg, name)` (it opens the selected town's page while the card is not in the row). `E2E_ONLY=carousel` is the row; `E2E_ONLY=snap` keeps the gestures (DN1, DN10, DN12, DN13). Both add four neighborhoods and Cranston (`snapWorld`); area points and cards carry `data-selected` and `data-name`. The world has no busy streets to name, so EC7's distance and zoom rule is the unit test; the journey checks the map is bare zoomed out.
- **E2E:** tiles carry `data-name` and `data-read`; kind slots carry `data-kind` and `data-step`. The long press goes near the small map's middle, since a pixel there is more ground than on the old full-screen map.
- **A town is graded across its outline** (TP1-TP12, decision 0089; `ATLAS_CODE` a5): a town with an outline counts places inside the whole-town z10 outline (`outlines.borders`, never the clipped z12 pieces, `atlas/extent.ts`: at most `TILE_BUDGET` 60 z14 tiles, nearest its point first, `partial` says so). Neighborhoods keep the 800 m ring and their a4 rows stay current (`CARRIED`). `atlas/pockets.ts` finds its pockets by peak picking on a smoothed 400 m grid (never connected cells: a city is one blob); `read.ts` names each for the busiest street within 800 m, and draws the picture around the busiest (`sketchAt`). A town whose outline can't be read is graded by the ring with `outlineRetry` and read again after `retryMs`. Fixtures: `scripts/fixture-town-points.mjs`. Shops hold a mall and a department store only; supermarkets and errand shops stay out (v1 spec).

## Places worth the stop: the places archive (PW1-PW19, decision 0103)

- **The archive adds to the map's places; it never replaces them.** `readAround` (every walk, quiet too) and the atlas ring read ask `placesArchive.read(tiles, centre)` beside the tiles; `mergePlaces` keeps one mark per place (same name within 50 m, any category, or within 200 m with the same category, decision 0111; the archive's kind winning). The owner's edits are applied when the archive is built, in chronicles-data, never in the app. Only the map's places are cached (`putPlaces`); the archive's are never stored.
- **Schema and classes:** `archivePois.ts` is the only file that knows the archive's schema (name, class, src, id and nothing else, PW7); `ARCHIVE_CLASSES` lists presence's archive table and is pinned by a test (PW5). The class names are chronicles-data's contract (decision 0108), which the app pins (`__tests__/explore/contract/`, PP17); there the Wikidata adapter's classes are fixed lists pinned on Nov 6; type decides, never age; a listed building enters only as a National Historic Landmark (the owner, Nov 6), districts never. The listing rule of Remarkable and public (a National Register listing when public, decisions 0109-0111) was built here and moves there with its tests: `specs/remarkable-and-public/handoff.md`.
- **Remarkable and public (RP1-RP20, decisions 0109-0111; the rule itself in chronicles-data, its RD1-RD14):** the archive's classes by type since contract v2: `church` (Places of worship), `cemetery`, `theatre`, `museum`, `historic_site` (Monuments and memorials), and `building_structure`, the kind `structures`, "Buildings and structures" (`heritage_building` until v2; no kind or class is named for significance, RP18). The US pack is ODbL once OpenStreetMap changed it (the manifest's `license`); the map's credits name OpenStreetMap (PW15).
- **Reachability is said, never filtered (RP20):** `explore/reach/rule.ts` (`wayNear`: a street or path within 60 m, null with none cached within 300 m), its shell over `db.getSegmentsIn` (`ask` answers only the latest place, audit 6); the walk's place card says "No street or path close by" (`mark-reach`). Nothing is removed for it. Trap (audit 7): cached segments are clipped to their z14 tile, so a missing street may be an unread neighbour: "far" is said only when every tile under the 60 m disc holds a cached line, judged by its pieces' midpoints (an end can sit on the shared edge).
- **The benchmark:** `npm run places:coverage` (network, never in CI) runs the app's own rules over OpenFreeMap's tiles and Wikidata for seven areas, per area in lists (RP17); destinations are structural (a listing or a Landmark, standing, not a district), never sitelinks.
- **Curiosities** are a kind of `viewpoints` (Viewpoints & oddities), on by default (PW4). Attractions (`attraction/attraction`) are places to find of kind viewpoints, "Viewpoints and attractions" (RP13, pinned with a fixture of the SteelStacks tiles); `zoo/aviary` too (RP15).
- **Versions:** a checklist area records the archive version it was built with (`archive`, SQLite migration 21) and is rebuilt when a newer one is known (`archiveStale`, PW12). The atlas profile records it too (`profile.archive`): stale and re-read 30 min after one is known, never replaced by a read without it; `thin` is judged from the map's places alone (`ringOf`, PW10). `ATLAS_CODE` a7 (a6 rows stood until an archive was known); a8 since presence and kinds, no older a-code carried (PK7); a9 since community parks (PC13), none carried; a9.p2 carries a9.p1 (PS9, 0146).
- **Silent and off by default:** any failure is no archive (PW3); `PLACES_BASE` is the chronicles-data Pages site (PW16, recorded Nov 10; the host is in `ALLOWED_HOSTS` and `lib/net`). The e2e build sets `EXPO_PUBLIC_PLACES_BASE=/places-e2e/`, which the harness serves (an empty manifest unless the `curiosities` journey sets one).
- **Meta:** `places_archive_manifest`, `places_archive_checked_at`, read and written with direct `getMeta`/`setMeta` so the meta scan sees them.
- **The build is chronicles-data's** (decision 0108): the pipeline, its schemas and class names, and the owner's edits live there, as the interface the app consumes; a new contract version fails PP17 until the app takes its copy (`__tests__/explore/contract/`) and its class table follows. Only a `locates` source puts a place on the map; a community source only reaches the owner's review list, never a pack. Place IDs are opaque (`p_` + 16 hex). The manifest's `blocks` (z8 tile to a hash of its places) let `versionAt` tag an area with its block's hash (`b:<hash>`), and Explore tags and judges each area at its own point, so an area is rebuilt only when its block's places change (PP13).

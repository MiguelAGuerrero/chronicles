---
paths:
  - "src/lib/discovery/{tilePois,curation,noise,categories,places,tileDecode,tileFetch,types,recall,recallCheck}.ts"
  - "src/lib/discovery/chains.json"
  - "src/lib/explore/*.ts"
  - "src/lib/explore/momentFind/**"
  - "src/lib/db/{exploreRow,placeRow,stores}.ts"
  - "src/components/{MarkPinView,ExploreSettings,ReminderCard,RemindEditor}.tsx"
  - "src/lib/__tests__/explore/{discovery,explore,exploreStore,markNames,noise,recall,reminderBell,scanAudit}.test.ts"
---
# Explore: places of interest, marks, finds and reminders

Places of interest from the tiles, marks, checklists and finds (Explore), and Remind me here. The codemap is in `docs/ARCHITECTURE.md`; the decisions and their history are in `docs/decisions/`.

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

- **Explore** (slice 5, replaces scan and ambient; the spec is E1-E23 in the
  v1 tab; `explore/explore.ts` pure, `exploreRun.ts`, `useExplore.ts`,
  `settings.ts`).
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
    A read asked for another centre while one runs waits for it, then reads its own unless its caller stopped meanwhile; only the same centre (`readKey`) shares it (`readJoin`, `createReadQueue` in `explore/exploreQueue.ts`, tested with a fake read; tend explore 15, audit 13), so a route probe is never told a fix's read was its area's. A read its caller stopped says `stopped` and sets no failure's wait; a route's reads stop with the route.
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
    A capture with nothing in reach is not handled while a read runs or is on its way (`maybeRead` and the route loop hold the queue while they decide, `exploreHold`, `explorePending`): the items that read loads look at it again (`capturesToFind`, `createCaptureFinds`; tend explore 14, audits 11, 12). A place being recorded counts as taken until the finds hold it, so it is never reported twice.
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

---
paths:
  - "src/lib/discovery/{tilePois,curation,noise,categories,places,tileDecode,tileFetch,types,recall,recallCheck}.ts"
  - "src/lib/discovery/chains.json"
  - "src/lib/explore/*.ts"
  - "src/lib/db/{exploreRow,placeRow,stores}.ts"
  - "src/components/{MarkPinView,ExploreSettings,ReminderCard,RemindEditor}.tsx"
  - "src/lib/__tests__/explore/{discovery,explore,exploreStore,markNames,markOverlap,noise,recall,reminderBell,scanAudit}.test.ts"
  - "src/lib/markNames.ts"
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
  food, bars and a Domino's). The ordinary activity of an area shows as its
  storefronts instead.
  - `MARK_CATEGORIES` (`discovery/noise.ts`): art, history, parks, culture,
    viewpoints. Food, shops and nightlife stay in the place cache for the
    atlas's bars. Storefront density reads presence's storefront weights (SF10) for both sources
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

- **Marks that share a spot stand side by side** (fix mark-overlap, Nov 18; the owner's photo of a library over a
  ticket), on the walk screen only (`spreadMarks`; Explore lays its "?" out itself by `halfZoom`, WT12, audit 4):
  `declutterMarks` (`markNames.ts`) puts non-found marks whose 48 px tap rooms would overlap at the drawn zoom and
  bearing (a turned map's screen, audit 1) in one row, 56 px apart (8 px between tap rooms, ux U2), centred on their
  points and 12 px above the highest, each on a thin leg to a small square on its own point (`spread`, drawn by
  `MarkPinView`; a square, never the walker's round dot, ux U1; the web marker's offset is `[dx, 6 + dy]`, native's
  `[dx, dy]`). A row that lands on another mark takes it in while it stays short (`ROW_MAX` 4, every point within a
  pitch of its middle, audit 2); a row that still lands on a mark it could not take in goes back to its points, so a
  spread is never worse than the points (audits 7, 8: two full rows of a chain interleaved). Grouped in id order, so the
  marks' order never changes it (audit 3). The outer marks write their names beside the head, outward; a middle one's
  name is only spoken; names are then judged where the heads stand. Never a count on the row (nothing is a score),
  never one hidden. A found mark stays on its point. The web moves a marker in place when only its spread changes
  (audit 6); native keys it. The precedent (Leaflet's spiderfy) is in `docs/research/adjacent-apps.md`, "Places that
  share a spot on the map".
- **Explore** (slice 5, replaces scan and ambient; the spec is E1-E23 in the
  v1 tab; `explore/explore.ts` pure, `exploreRun.ts`, `useExplore.ts`,
  `settings.ts`).
  - **There is no Explore mode** (decision 0234, modes-to-layers MD1-MD19; it replaces 0031's mode and `explore_walk`,
    `start_mode`, which are retired and left unread). The walk draws the layers every map shares (`map_layers`, decision 0260:
    it starts with what the ready map shows, and its switches are remembered); the "?" marks, the range
    ring, the place card and the pocket alert follow **Places**, the strip chip and the dead-zone pill follow **Storefronts**
    (`walk.tsx`: `placesOn`, `storefrontsOn`; `useExplore` takes `places` and `storefronts`). A find needs Places on, since
    the capture row is on a place's card (MD8). Turning Places on or off keeps its spans (`places_spans:<walk>`, `explore/placesSpans.ts`),
    and the replay names what the walk passed only within them (`passedAlong` `spans`); a walk recorded before 0234 reads
    `explored:<walk>` as it did. The old rule, kept for what it still says: quiet is navigation plus captures: no "?" marks, magenta, strip chip or
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
    already built for this build (`built`, `known`). Storefronts are saved only
    while Places or Storefronts is on (`rememberStorefronts`); switching either on reads them at once
    where a read skipped them. One read at a time; a failure waits 2 min
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
  - **A retired kind is stale too** (tend explore T65, decision 0267, amending E4): an area whose items hold a kind a split
    retired (`retiredAreas`, `RETIRED`) is read again on entry beside `archiveStale` (`readCentre`'s `retired`), and the read
    leaves it out of `built`, looking at items within twice its reach so it sees every area it builds. One the read leaves
    as it was is not asked again on that screen (`retiredTried`), so it never reads per check. Nothing is stored anew.
  - **What shows** (`visibleMarks`): found places at any distance; unfound ones of
    shown kinds within the range (60-300 m, 100 by default), nearest 8, named
    within 60 m or once revealed this walk. On a route, `routeMarks` adds up to
    20 faint ones within range of the route ahead; the route's areas are read
    first (`routeProbes`, every 500 m).
  - **Finding** (0155, TC1, TC5; capture-at-a-place CA1-CA12, decisions 0246, 0247): a capture never finds a place by itself. A
    place's card at any distance, a "?" included except on a ride (R12) (`cardCapture`, `explore/placeCard.ts`; decision 0247,
    fix poi-any-distance: a place is a point, and a long bridge's far end is still the bridge; its line never says "here"),
    carries `PlaceCaptureRow` (`mark-camera`, `mark-voice`,
    `mark-note`), first, with Route here secondary (a "?" row speaks "this place", never its name); a tap closes the card and begins the capture with the place's key on its stamp
    (`stampFor`'s `place`; never on a piece). `useCaptures`' `onKept(id, piece, place)` hands it back, and the walk screen calls
    `explore.keptAtPlace`, which records the find only through `findOnKept` (a new moment, the place unfound; the first find stands;
    a "?" kept once a ride has begun names nothing, R12, fix poi-any-distance audit 7).
    Nothing is armed: a cancelled camera, a discarded memo or a note closed empty leaves nothing waiting. **Trap:** the stamp is
    the only carrier, so a capture path that builds its own stamp (not `stampNow`) never finds. A found pin takes taps again and is drawn as a
    place is, full size in the found green with its name (ui 4, ui 5, the owner's "Drawn with its name"; its name joins
    `hiddenNames`, it still never spreads), under the moments' pins on the web so theirs keep their taps, and opens its card: "Moments here" (`mark-moments`, `mark-moment`) lists the
    moments within 60 m by spot (`momentsHere`, `db.momentsIn(hereBounds)`; no stored link, the owner's call) and the moment that
    found it wherever taken (the find's `capture_id`, `db.getMomentsByIds`, its failure alone leaving the near list; 0247),
    newest three with the finder always among them, in
    words (`momentHereLine`, `dayPartLine`'s words), and the row again; a capture from it is a plain moment. No chip, no
    loose-moment find, no inference from nearness.
  - **A place offered after the moment** (moment-assignment-fallback PO1-PO12, decision 0251): a moment kept on the walk
    screen, not begun on a card, is handed over by `onKept` (`explore.offerAfter(id, atPlace)`); once it is in the walk's
    captures, `offerFor` (`explore/placeOffer.ts`, core) offers the unfound places of `shown` within 30 m of its fix, never
    one left on the walk (`offer_left:<walk>`, `explore/offer/`), nearest first. The line (`place-offer`, `place-offer-yes`,
    `place-offer-leave`) asks "Was this photo about X?"; several are choices on the map (`MarkPin.choice`: a ring, the name
    always written, `markLabel` "… Tie this photo to it", on the web over the moments' pins at z 2), and a tap ties without
    a card (`explore.take`, before the card opens). A tie is `record`'s ordinary find (`onFound`'s `via: 'offer'`), with
    "Found: X" and Undo (`found-line`, `found-undo`: `db.removeFind(key, captureId)`, the moment kept). `offerStill` lets it
    go past 60 m, paused, Places off, the moment gone or every place found; a newer moment replaces it. **Trap:** the
    offer's effect hands the moment over once and its `setTimeout` is never cancelled by a re-render (`shown` changes every
    fix): cancelled, the moment was taken off `pending` and never asked about. Nothing in the offer may call `feedback()`
    (`placeOffer.test.ts` PO7 scans `useExplore`).
  - **Passing** (TC6-TC9): `passedPlaces`/`passedAlong` take `passM` (`explore_pass`, 4-20 m by 2, 8 default), judged along the
    line between fixes under 15 s apart; naming on the map stays at 60 m. `walk_pass:<id>` is written when exploring begins
    and by the drawer's slider, read by the replay (`passFor`); a walk without it keeps 60 m. `passNote` says no number.
  - **Web reads by latitude** (`checklist_item` index `lat`), never `getAll()`
    over the kept store.
  - **Deferred:** a place moved by a new build can be found twice; the pocket
    alert likely needs the screen on (native); the home preview ignores the
    kind switches and doesn't restore the view after.
  - **Settings** (inline in the walk's drawer, `walk.tsx`, and the ready bar's, `StartSettings`; pieces in `ExploreSettings.tsx`, saved as they change, the ring shown while the drawer is up with Places on; the range and "Passing a place" are always there, MD6): what I'm into (its own page since decision 0192, reached by one row in each drawer;
    meta `explore_hidden`), the range (`explore_range`), the pocket alert
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
  - **Native** (unverified on a device): the background read on a walk with no layer on,
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
  - **Where a fire goes, since tend explore 21-23 and their review** (Nov 17; where it differs, this line holds): every
    place listens (`createRecallPlaces`, `discovery/recall.ts`), each saying whether it is in front now (the walk screen
    asks its navigator at fire time; the recording bar is mounted only over the focused tabs), and the newest in front
    shows it (`firePlace`), else a notification. A walk screen kept behind the tabs after a reload never takes one. The
    bar holds a fire out of sight (folded under a full-screen card, a Modal up, the keyboard up, the app behind:
    `barInSight`); its half-minute is time in sight (`reminderSight`). A bar that goes with one in sight for under
    `RECALL_RULES.glanceMs` hands it on (`handOnRecall`): the next place in front of the same walk takes it as it listens
    or comes to the front, the walk screen merging it into its card; the walk ended, it is dropped.
    - **Trap:** a fire is marked fired (a "once" flag cleared) before it is shown, so a place must never take one it
      cannot show, and a place that goes must hand on what it did not show. With no place in front (a replay or a day
      over the tabs, the launch cover) the web's notification shows nothing in front: filed in docs/DEFERRED.md.
    - **Since tend explore 24** (Nov 18; this holds over the line above): a fire no place in front takes with the app in
      front (a replay or a day over the tabs, the launch cover) waits as a handed-on one does (`take`), for the next place
      in front of its walk; only with the app behind is it a notification. It is still marked fired as it comes, so the
      walk ended before a place came to the front drops it unseen, as a handed-on one is dropped.
    - **Since tend explore audits 28-31** (Nov 18; this holds over the line above, which wrongly names the launch cover:
      the walk screen under it is focused and takes the fire): what waits (`take`'s or a hand-on's) becomes a
      notification as the app goes to 'background' (`drain`; not iOS's passing 'inactive'; the web's hidden page too),
      merged with what was notified of the walk since the app was last in front, as a fire with the app behind is: the
      notification's id is one a walk, so a lone later one would replace it. What waits leaves out moments gone into
      Undo meanwhile (`offer`'s `hidden`). Kept in memory only: a kill while in front with one waiting still loses it.
    - The precedent (iPhone Notification Center, Android notifications, read Nov 18) is recorded in
      `docs/research/adjacent-apps.md`, "A reminder that arrives while you are busy".
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

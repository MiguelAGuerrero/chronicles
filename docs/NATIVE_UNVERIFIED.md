# Native, unverified on a device

Native has never run on a device. This is every native path AGENTS.md marks "unverified on a device" or "not tried on a device", as a checklist to tick on the first phone runs; the web build is what the e2e exercises.
The concept doc's first milestone, a pocketed walk whose trace survives the screen being off, is still open. The owner's rule: say so in any report that touches native code.

## Migrations (SQLite, `db/index.native.ts` `MIGRATIONS`, tracked with `PRAGMA user_version`)

The web's IndexedDB steps (`db/index.web.ts` `migrate()`) run in the e2e; each SQLite migration below has run only in code review. Migrations 1-4 (v0: the base tables, the versioned cache with `walk_summary` and `meta`, videos, pauses and captions) never ran on a device either.

- [ ] Migration 5: `area` and `walk_area`, written with the walk's snap (IndexedDB v4)
- [ ] Migration 6: the `place` cache and the kept `offered`, `mark` and `recall` tables (IndexedDB v5)
- [ ] Migration 7: the `landing` store of remembered busy areas (IndexedDB v6)
- [ ] Migration 8: `place.markable`, mapped by `db/placeRow.ts` (IndexedDB stores the whole object, no bump)
- [ ] Migration 9: `checklist_area`, `checklist_item`, `find`, `explore_read` (IndexedDB v8)
- [ ] Migration 10: `walk_summary.ride_m`, nullable (no IndexedDB bump; absent on older rows)
- [ ] Migration 11: `capture` and `find` rebuilt with a nullable `walk_id`, plus `capture_t` (IndexedDB v10, the capture `t` index)
- [ ] Migration 12: `capture.thumb_path` (no IndexedDB bump)
- [ ] Migration 13: the `still` table of still spells (IndexedDB v11)
- [ ] Migration 14: the `gap_fill` table of kept and dismissed stretches (IndexedDB v12)
- [ ] Migration 15: the `atlas_area` cache of the Explore atlas (IndexedDB v13)

## Map layers and markers (MapLibre RN v11)

- [ ] Layer order without `beforeId`, and the busy-area markers (v1.5 landing)
- [ ] The invisible `q-pois` layer: whether it is needed to load the poi source layer, or costs layout (v1 discovery)
- [ ] Native source features carry no zoom, so POIs off z14 can't be dropped by `zoom` (v1 discovery)
- [ ] Explore's range ring layers, `ringGeoJSON` (v1 Explore)
- [ ] The memory Markers, drawn first under this walk's pins (Memories on revisit)
- [ ] The dashed ride layer, `RIDE_DASH` (Rides)
- [ ] The live link line from the trace's end to the dot, `setData:trace-link` (Motion)
- [ ] The faint gap layer, `FAINT_OPACITY`, and `GapCard` over the native map (Filling gaps)
- [ ] The dotted gap joins (`GAP_LINK_DASH`), the dashed drawing line (`DRAWING_DASH`), map taps while drawing, and the `GapDraw` bar over the native map (Gap drawing, GW2-GW8)
- [ ] Reading tiles in code for drawing on Hermes (`useGapDraw`, `readDrawTiles`), and the k-shortest search's cost on a phone (Gap drawing, GW7, GT2)
- [ ] `LiveWalk`'s Markers and dot on Navigate (Navigation & tabs)
- [ ] `capFitBounds` widening MapLibre RN's fitBounds (Navigation & tabs, U15)

## Notifications (`notify/transport.native.ts`, expo-notifications)

- [ ] The transport behind the contract, including the early-tap queue for a cold start and the test banner (Notifications)
- [ ] Reminder notifications, their actions and cold-start taps (Remind me here)

## Sensors and motion

- [ ] DeviceMotion's units and update interval on iOS and Android, `motionSource`, `steps.ts` (Motion)
- [ ] The iOS motion permission text, `askMotion` (Motion)
- [ ] AppState `inactive` ending still spells, `useWalkMotion` (Motion)
- [ ] The pocket alert, a light tap once per place per walk, `explore_haptic` (v1 Explore)
- [ ] The native-driver press (`Button`) and lift (`LiftIn`), and the `HomeSheet` spring (Polish: motion)

## Recording and the background task

- [ ] A pocketed walk whose trace survives the screen being off: the location task registered from `index.js` (the concept doc's first milestone)
- [ ] The task's reminder check over each batch of accepted fixes, `recallCheck.ts` (Remind me here)
- [ ] The task's two-minute `tail`, so reminders fire from a ride (Rides)
- [ ] Explore's background read on a quiet walk, `exploreRun.ts` (v1 Explore)
- [ ] One fix per moment, `locate/index.native.ts`, refusing a cached fix older than 15 s (Moments and days)

## Media and capture

- [ ] Native caption baking: the view sized in points (`px / PixelRatio`), pixel `width`/`height` to `captureRef`, `useRenderInContext` on iOS, behind the viewer's cover, one bake at a time (Round 3, captions)
- [ ] The thumbnail copy through expo-image-manipulator, `media/thumb.ts`, and whether EXIF orientation survives it (Memories on revisit, thumbnails)
- [ ] The home's capture row, `MomentBar` and `CaptureRow` (Moments and days)
- [ ] Navigate's moment pins as MapLibre RN Markers, and their `CaptureViewer` over the tab map (moment pins 1-2)
- [ ] The backup zip written to a file handle, `writeWalkBundle`, to be tested on a phone before it reaches the UI (Product, backing up)

## Deletion (`db.deleteWalk`, `db.deleteCaptures`, `removeMedia`)

- [ ] The SQLite deletes (Clearing walks and moments)
- [ ] File and folder removal, and `Directory.size` (Clearing walks and moments)
- [ ] The Undo pill over the viewer's Modal, `UndoToast` (Clearing walks and moments)
- [ ] The background commit of a waiting delete, `deletion/index.ts` (Clearing walks and moments)
- [ ] `router.dismissTo` right after the actions Modal closes; iOS can drop a navigation during a Modal's dismissal, `WalkActions` (Clearing walks and moments)

## Navigation and tabs

- [ ] Open in Maps: Apple Maps from the app, `nav/openInMaps.ts` (Open in Maps)
- [ ] Open in Maps: the Android `geo:` chooser (Open in Maps)
- [ ] Open in Maps: an iPhone Home Screen app's `window.open` reaching Apple Maps (Open in Maps)
- [ ] The docked drawer on Navigate (Navigation & tabs, U1)
- [ ] `dangerouslySingular` on the native stack's `walk`, `showWalk()` (Navigation & tabs)
- [ ] The memo saved when Navigate blurs mid-memo (Navigation & tabs)
- [ ] The replay's `BackHandler`, ending on Chronicle (Navigation & tabs, audit 6)
- [ ] `StartDialog`, the Modal over the tab map (Navigate's settings are a dialog)

## Quality of life

- [ ] The `ends` layer's `match` stroke colour, `lib/traceEnds.ts` (Quality of life)
- [ ] The scale bar over the native map, `components/map/ScaleBar.tsx` (Quality of life)
- [ ] `locateOnce` fresh on expo-location, `lib/useLocate.ts` (Quality of life)
- [ ] The Locate edge button over the native sheet, `components/LocateButton.tsx` (Quality of life)
- [ ] The recorder retried on a return to the front through expo-location's permission request and the background task, `session.restartRecording` beside the recorder's own AppState listener (Quality of life, QL20)
- [ ] The pressable "Not recording" chip over the native map, and its Open Settings action (Quality of life, QL19)
- [ ] The Distances segment inside the native Start dialog Modal, and `Intl` on Hermes for the locale default (Quality of life, QL13, QL16)
- [ ] The rename editor and its keyboard inside the native actions Modal, and Android Back stepping out of it, `components/WalkActions.tsx` (Quality of life, QL22)
- [ ] The note editor inside the native viewer Modal, `components/NoteEditor.tsx` (Quality of life, QL24)
- [ ] The round picture inside a MapLibre RN Marker, its `onLoad`/`onError`, and the Marker remounting when the copy arrives, `components/CapturePinView.tsx` (Quality of life, QL26, QL27)

## Explore atlas

- [ ] react-native-svg mini-maps on iOS and Android (12 tiles, an even-odd veil, dashed strokes)
- [ ] The atlas card's Back (BackHandler) and its layout over the tab bar
- [ ] The small map's long press and the ring layer at its height
- [ ] The atlas card's drag (responder props on the handle) and its two heights; the side panel on a tablet
- [ ] Area points as MapLibre RN Markers (anchor top, offset) on the small map

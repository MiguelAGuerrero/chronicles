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
- [ ] Migration 17: `capture.edit`, JSON through `serializeEdit`/`parseEdit` on every capture read (no IndexedDB bump; Media editing, ME21)

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
- [ ] While drawing: whether a Marker tap also fires the map's onPress, `display: 'none'` on the capture row, `GapDraw`'s BackHandler against the screen's own, and `accessibilityViewIsModal` on the bar (Gap drawing)
- [ ] Reading tiles in code for drawing on Hermes (`useGapDraw`, `readDrawTiles`), and the k-shortest search's cost on a phone (Gap drawing, GW7, GT2)
- [ ] `capFitBounds` widening MapLibre RN's fitBounds (Navigation & tabs, U15)
- [ ] The cone through `coneHeading` on the native glide (`useGlidingWalker`'s frames, ~15 fps), hidden while the dot holds still (decision 0075)

## Activity density (AD1-AD16)

- [ ] `pmtiles` under React Native: `fetch` with a `Range` header, a 206 response's `arrayBuffer()`, `Headers`, and `AbortSignal` passed through (`activity/overture.ts`); whether iOS's URL cache answers a range request with a cached 200
- [ ] `AbortSignal.throwIfAborted`, which pmtiles calls, on Hermes
- [ ] `OvertureReader`'s deadline against a header fetch that never ends on a phone (pmtiles' header takes no signal; the e2e doesn't stall it)
- [ ] `fflate`'s gunzip on Hermes, where `DecompressionStream` is missing (Overture's directories and tiles are gzip)
- [ ] Decoding a 0.5 MB Overture tile (about 1,000 places) on a phone: time and memory, and the 2-5 MB a read downloads on cellular
- [ ] The release listing (`ensureOvertureRelease`) parsed from S3's XML on device
- [ ] The native `strips` layer's data-driven width and opacity (`['get', 'width']` inside a zoom interpolation)
- [ ] The graded paths in the atlas's react-native-svg mini-map (`strokeOpacity`)

## Notifications (`notify/transport.native.ts`, expo-notifications)

- [ ] The transport behind the contract, including the early-tap queue for a cold start and the test banner (Notifications)
- [ ] Reminder notifications, their actions and cold-start taps (Remind me here)

## Sensors and motion

- [ ] DeviceMotion's units and update interval on iOS and Android, `motionSource`, `steps.ts` (Motion)
- [ ] The iOS motion permission text, `askMotion` (Motion)
- [ ] AppState `inactive` ending still spells, `useWalkMotion` (Motion)
- [ ] The pocket alert, a double-tap once per place per walk, `explore_haptic` (v1 Explore; PA1)
- [ ] Whether the double-tap (two `impactAsync(Medium)` 120 ms apart, `HAPTIC_PATTERNS.nudge`) reads as one nudge on an iPhone and an Android phone, and whether Android's Vibrator merges them (Pocket alert nudge)
- [ ] On the web: Android Chrome's vibrate for the pocket alert (it needs a tap on the page first, which Start gives); iPhone Safari's switch haptic, fired from a location update rather than a tap, may do nothing (Pocket alert nudge, 0079)
- [ ] Success and warning feedback after the refactor through `HAPTIC_PATTERNS` (`haptics.ts` `playStep` → `notificationAsync`); an iPad offered the pocket alert on the web (a coarse pointer, no Taptic Engine); the 120 ms timer with the app backgrounded mid-pattern (pocket-alert-nudge audit)
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

## Media editing (ME1-ME23, decision 0084)

- [ ] `FeColorMatrix` on an SVG `Image` (react-native-svg) on iOS and Android, its speed on a full-size photo, and whether the colours match the web's sRGB matrix (CoreImage may filter in linear light)
- [ ] The native baker over `EditedPicture`: view-shot capturing the SVG, the 15 s load timeout, the clear PNG overlay for a video
- [ ] The editor's filter row: nine full-size SVG images at once (memory)
- [ ] `VideoView` turned and clipped by view transforms (`VideoPicture`), with native controls off when turned or cropped
- [ ] The trim kept through `timeUpdate` (0.1 s) and `currentTime`, and Android/iOS seeking precision
- [ ] `useVideoSize` and `probeVideoSize`: a first-frame thumbnail as the upright size (the track reports the encoded one)
- [ ] The local module `modules/chronicles-video-edit` (never compiled): Swift (AVMutableComposition, AVMutableVideoComposition with preferredTransform then our rotation, AVVideoCompositionCoreAnimationTool overlay, `isGeometryFlipped`, export on iOS 16.4+), Kotlin (Media3 Transformer at expo-video's 1.9.1: the rotation's sign, the crop's NDC mapping, `OverlayEffect`), audio kept, partial output removed
- [ ] The remade small copy (`keepEditedThumb`) and the lazy copy's crop and rotation through the manipulator (`media/thumb.ts`)
- [ ] The editor as its own Modal from the recording bar and Navigate's ready screen; Android Back through `requestClose`
- [ ] The video module's crop is in pixels against `probeVideoSize`'s thumbnail; a downscaled thumbnail would mis-crop, and Kotlin rejects a frame off by more than 2 px (audit)
- [ ] `VideoPicture` on Android: expo-video's default `surfaceView` may ignore the view's rotation and clipping (`textureView` may be needed); AVPlayerLayer under a transform on iOS (audit)
- [ ] `SvgImage` `onLoad` firing twice in the native baker (a second capture of a finished job) (audit)
- [ ] `Image.getSize` with EXIF orientation on Android against how the SVG draws the photo (audit)
- [ ] The edited copy under its new name (`editedThumbName`) and the old copy's removal (audit 3)

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
- [ ] The app opening on Explore at `/` on the native stack and tabs, and Android back on Navigate or Chronicle returning to Explore (NV2, NV5, 0070)
- [ ] A deep link to a missing replay or day at launch, `router.dismissTo('/')` reaching Explore on the native stack (NV2, 0070)
- [ ] Explore's one fix at launch, and the location prompt it raises before any tap (NV16, 0070)
- [ ] An iPhone Home Screen app reopening on its last page (the `/explore` redirect, a stale replay link) (NV2, 0070)
- [ ] The launch cover over the native stack while the open walk is read, and the walk screen coming up under it before the recorder resumes (NV2 launch 1-5)

## Quality of life

- [ ] The `ends` layer's `match` stroke colour, `lib/traceEnds.ts` (Quality of life)
- [ ] The scale bar over the native map, `components/map/ScaleBar.tsx` (Quality of life)
- [ ] `locateOnce` fresh on expo-location, `lib/useLocate.ts` (Quality of life)
- [ ] The Locate edge button over the native sheet, `components/LocateButton.tsx` (Quality of life)
- [ ] The recorder retried on a return to the front through expo-location's permission request and the background task, `session.restartRecording` beside the recorder's own AppState listener (Quality of life, QL20)
- [ ] The pressable "Not recording" chip over the native map, and its Open Settings action (Quality of life, QL19)
- [ ] The Distances segment inside the native ready bar pulled up, and `Intl` on Hermes for the locale default (Quality of life, QL13, QL16)
- [ ] The rename editor and its keyboard inside the native actions Modal, and Android Back stepping out of it, `components/WalkActions.tsx` (Quality of life, QL22)
- [ ] The note editor inside the native viewer Modal, `components/NoteEditor.tsx` (Quality of life, QL24)
- [ ] The round picture inside a MapLibre RN Marker, its `onLoad`/`onError`, and the Marker remounting when the copy arrives, `components/CapturePinView.tsx` (Quality of life, QL26, QL27)
- [ ] The reminder bell over a pin's corner inside a MapLibre RN Marker: not clipped by the annotation's bounds or `pinHit`, drawn above the head's Android `elevation`, `components/map/WalkMap.native.tsx` (Reminder bell, RB1, RB4)
- [ ] A capture Marker re-keyed with a new `id`, and a memory Marker re-keyed keeping its `id`, when a reminder is set or stopped: a clean remount with no stale annotation (Reminder bell, RB5)
- [ ] ", reminder set" in the pins' labels read by VoiceOver and TalkBack (Reminder bell, RB7)
- [ ] The bell following a fire or expiry from the background location task, after a cold background launch, and the notification's Stop action, once the app is back in front (Reminder bell, RB5)
- [ ] expo-sqlite ordering: `listRecalls` reads outside the write queue (`db/index.native.ts`); a read started before a queued `setRecall`/`clearRecall` must not finish with the older rows (`recallCheck`'s cache, `useReminded`) (Reminder bell audit 11)

## Town outlines (TO1-TO12)

- [ ] SQLite migration 16 (`outline_tile`) and `putOutlineTiles` / `getOutlineTiles` (`IN (...)` with up to 64 keys)
- [ ] Overture's divisions.pmtiles read by byte range on a phone (`areas/overtureOutlines.ts`, the same `pmtiles` path as the places reader), inside the replay's snap and the backlog's pass

## Explore atlas

- [ ] react-native-svg mini-maps on iOS and Android (12 tiles, an even-odd veil, dashed strokes)
- [ ] The atlas card's Back (BackHandler) and its layout over the tab bar
- [ ] The small map's long press and the ring layer at its height
- [ ] The atlas card's drag (responder props on the handle) and its two heights; the side panel on a tablet
- [ ] Area points as MapLibre RN Markers (anchor top, offset) on the small map

## Navigate, ready

- [ ] The Navigate tab's `tabPress` `preventDefault` and `showWalk()` on the JS tabs, iOS and Android (`(tabs)/_layout.tsx`, NR1)
- [ ] The entry route's launch sequence on the native stack: Explore beneath, then the walk screen (`(tabs)/index.tsx`, NR3)
- [ ] The ready bar's drag and spring over MapLibre RN, and Android Back lowering it (`components/walk/ReadyBar.tsx`, NR7), now also the walk strip's options drawer (`walk-bar`)
- [ ] The capture stack and edge buttons against the home indicator's safe area (`components/walk/layout.ts`, NR9, NR11)
- [ ] Starting in place: the background location task and the pocket alert taking over a walk screen already mounted (`useStartWalk` with `inPlace`, NR6)
- [ ] Moment pins and the one-fix dot on the walk screen's MapLibre RN map; the long press for a destination there (`components/walk/useReady.tsx`, NR1, NR8); the one MapLibre RN map kept across Start (NR6)
- [ ] The chevron mid-memo: the memo finished as `useCaptures` unmounts, on expo-audio (NR10)
- [ ] Android Back with `backBehavior="initialRoute"` and Explore as the tabs' initial route (NR4)
- [ ] A cold start's order: the entry route's `showWalk`, the root layout's, and a tapped notification's (`onRecallWaiting`), with `/walk` on top (NR3)
- [ ] VoiceOver and TalkBack on the ready bar's summary button, its `activate` action and its name (navigate-ready audit 6)
- [ ] One MapLibre RN `MapView` kept across Start while its props swap (static dot to the glide, `follow`, marks, moment pins) (NR6)
- [ ] `locateOnce` each time the ready screen comes to the front, on expo-location (NV17)
- [ ] `Linking.openSettings` from the ready screen's banner (NR13)
- [ ] After a denied microphone or camera request on iOS, the banner offers Open Settings (`canAskAgain` is no longer trusted), and Settings lets the permission back on

## Functional core (slice 1, FC1-FC10)

- [ ] `lib/ports/index.ts` builds the real ports from the native db, recorder and notifier at module load; its first user is the ready walk screen's shell (`lib/ready`, Navigate, ready), so a phone's first run of it is the ready screen opening
- [ ] The SQLite adapter (`db/index.native.ts`) against the Db contract (`src/lib/__tests__/dbContract.ts`): the suite runs only over the fake and IndexedDB in Node, so SQLite's match to it is by reading

## Replay rhythm (RR1-RR22)

- [ ] `followZoom` on MapLibre RN's Camera: `jumpTo` with a zoom every frame while the walker moves; whether it keeps up and doesn't fight the follow
- [ ] The overlays' motion with `Animated` and per-frame styles (the rolling clock's reels, the card's flight, the bubbles)
- [ ] A memo pausing and resuming with Hold (expo-audio), and a video in its card (expo-video `VideoView`, `nativeControls={false}`)
- [ ] The screen reader's steps (RR17), unchanged in behaviour but moved into `StepThrough`
- [ ] The whisper's place on screen, projected from the map's centre and zoom (`layout.project`), against the native map's own tile size
- [ ] `useMediaWait` on native: expo-video's `playingChange`, `playToEnd` and `currentTime`, expo-audio's status, holding the stage until a medium catches up
- [ ] A memo started by hand resuming after Hold, and pausing under the native viewer Modal
- [ ] MapLibre RN's camera going where `follow` says when it isn't gliding (`WalkMap.native`, audit 25)
- [ ] `VideoView` inside a `pointerEvents="none"` wrapper on iOS, with Tap for sound above it
- [ ] The bubbles' column (`maxHeight`, `overflow: hidden`) clipping Android elevation shadows; the card and corner with side safe-area insets in landscape
- [ ] `tickClock`'s 250 ms cap when iOS suspends JS timers with the app in the background
- [ ] `toLocaleTimeString` under Hermes against iOS's 24-Hour Time switch (RR8, "the device's own clock format")


- **The area card's full-screen drawer** (Nov 4): `AtlasCard`'s `PanResponder` taking the touch from its `ScrollView` when the content is at the top (`onMoveShouldSetPanResponderCapture`), the JS-driven transform, and the tab bar folding away (`lib/tabsHidden`). On a touch browser the page's own scroll may take the touch before the capture does. Never run on a device; the e2e's drawer checks (full flow) use a mouse and did not run in the cloud session (no tiles).

## Compass (CP1-CP8, decision 0082)

- [ ] Two-finger rotate on MapLibre RN (`touchRotate`, `touchPitch={false}`) and the bearing in `onRegionDidChange`'s `ViewStateChangeEvent`
- [ ] `resetNorth()` through the Camera ref's `setStop({ bearing: 0, duration })`: that centre and zoom stay
- [ ] The compass button over the native map, above Locate and in the walk's column
- [ ] expo-keep-awake through a replay (RR24): the screen held from reading the streets to the card, let go on the card and on leaving, taken again on AppState `active`
- [ ] The loading skeleton's pulse with the native driver (RR23)


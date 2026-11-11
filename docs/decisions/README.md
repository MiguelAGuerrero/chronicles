# Decision records

One decision per file, numbered in date order; never edit an accepted record, but supersede it with a new one that links back to it.

An owner's call made during a slice gets its record in the same commit as the slice's work.

| # | Date | Decision | Area |
|---|------|----------|------|
| [0001](0001-replay-five-beats.md) | 2026-10 (v0) | The replay has five beats in fixed order, with restraint, and the lows stay in | replay |
| [0002](0002-replay-waits-at-each-capture.md) | 2026-10 (v0) | The replay waits at each capture until Continue | replay |
| [0003](0003-photos-and-videos-full-screen.md) | 2026-10 (v0) | Photos and videos are full screen; notes and memos keep their card | replay, viewer |
| [0004](0004-rewatches-advance-by-themselves.md) | 2026-10 (v0) | Re-watches move on by themselves; only the first replay waits for taps | replay |
| [0005](0005-local-only.md) | 2026-10 (v0) | Local-only: no accounts, no backend, nothing leaves the device | storage, architecture |
| [0006](0006-native-first.md) | 2026-10 (v0) | Native first: web gets its own code only where no Expo module covers the feature | platform |
| [0007](0007-backup-deferred.md) | 2026-10 (v0) | Backing up a walk is deferred until the export system has a proper place | export |
| [0008](0008-walk-screen-layout.md) | 2026-10 (v0) | Walk screen layout: a centered capture row, a thin bottom strip with Stop at the right | walk screen |
| [0009](0009-pause-stops-recording.md) | 2026-10 (v0) | Pause stops recording, is a break in the trace however short, and captures still work while paused | recording |
| [0010](0010-standstills.md) | 2026-10 (v0) | Standstills: a stay is two minutes within 25 m, never a slow drift or circling | trace |
| [0011](0011-unwalked-streets-named-only.md) | 2026-10 (v0) | "Unwalked streets near me" counts named streets only | streets, fog |
| [0012](0012-captions-are-data.md) | 2026-10 (v0) | Captions are data, baked in only when saved out | captures, media |
| [0013](0013-ask-before-architectural-decisions.md) | 2026-10 (v0) | Ask the owner before architectural decisions | process |
| [0014](0014-walking-along-not-across.md) | 2026-10 (v0) | Walking along, not across: a street counts once about a block of it was walked in its direction | streets, snapping |
| [0015](0015-deploy-from-main-only.md) | 2026-10 (v0) | The web build deploys to GitHub Pages from main only | deploy |
| [0016](0016-no-dataset-hard-coded.md) | 2026-10 (v0.5) | No dataset is hard-coded in the places assignment | places |
| [0017](0017-navigation-inside-a-walk.md) | 2026-10 (v0.5) | Navigation runs inside a walk, which keeps recording, with routes computed on the device | navigation |
| [0018](0018-spec-first-test-first-audit.md) | 2026-10 (v0.5) | Build each vertical slice spec-first and test-first, then audit it adversarially | process |
| [0019](0019-home-is-the-places-map.md) | 2026-10 (v0.5) | Home is the places map; the log screen is gone | home |
| [0020](0020-positioning.md) | 2026-11-01 | Positioning: a companion for wandering towns and cities, in three tabs | product |
| [0021](0021-start-just-starts.md) | 2026-11-01 | Start just starts; the drawer holds the extras (the extras became a dialog: 0056) | navigation tab |
| [0022](0022-suggested-routes-deferred.md) | 2026-11-01 | Suggested routes are deferred to their own later slice | navigation |
| [0023](0023-walk-options-in-bottom-strip.md) | 2026-11-01 (v1) | Walk options sit in the bottom strip, left of Pause | walk screen |
| [0024](0024-settle-gps-wander.md) | 2026-11-01 | GPS wander is settled when a trace is read | trace |
| [0025](0025-live-dot-kalman.md) | 2026-11-01 | The live dot is a Kalman filter fed per fix, glided by the map without re-rendering the screen | walk screen, trace |
| [0026](0026-motion-steps.md) | 2026-11-01 | Motion: steps from DeviceMotion decide still from walking, on every platform | sensors, trace |
| [0027](0027-share-gps-log.md) | 2026-11-01 | Share GPS log from the walk's options | walk screen, diagnostics |
| [0028](0028-green-trace-quiet-fog.md) | 2026-11-01 | The trace is green, on a white edge, and the fog is quiet | map, fog |
| [0029](0029-walk-me-back-shorter-way.md) | 2026-11-01 | Walk me back takes the shorter way | navigation |
| [0030](0030-map-stays-north-up.md) | 2026-11-01 | The map stays north-up; a soft cone shows the way you're going | navigation, map |
| [0031](0031-explore-in-the-moment-walk-starts-quiet.md) | 2026-11-01 | Explore gives discoveries in the moment, and a walk starts quiet | explore |
| [0032](0032-reminders-fire-on-every-walk.md) | 2026-11-01 | Reminders fire on every walk, quiet or exploring | explore, reminders |
| [0033](0033-notifications-one-contract.md) | 2026-11-01 | Notifications: one contract on both platforms, local only | notifications |
| [0034](0034-busy-areas-information-only.md) | 2026-11-01 | Busy areas are information only | landing |
| [0035](0035-moments-without-a-walk.md) | 2026-11-01 | A capture is a moment that may belong to no walk; days are never stored | moments and days |
| [0036](0036-no-all-day-tracking.md) | 2026-11-01 | No all-day tracking: a moment gets one fix, and nothing tracks between moments | moments and days, location |
| [0037](0037-memories-on-revisit-faint-pins.md) | 2026-11-01 | Memories on revisit: earlier captures nearby show as faint pins that never buzz | memories |
| [0038](0038-thumbnails-small-copy.md) | 2026-11-01 | Thumbnails: each photo gets a small copy, made with expo-image-manipulator | captures and media |
| [0039](0039-animated-not-reanimated.md) | 2026-11-01 | React Native's own Animated, not Reanimated | motion polish |
| [0040](0040-rides.md) | 2026-11-01 | A bus, trolley or train inside a walk is a ride | rides, trace |
| [0041](0041-three-deletes.md) | 2026-11-01 | Three deletes, to free storage, as if it never happened, with Undo in memory | deletion |
| [0042](0042-home-map-down-while-unfocused.md) | 2026-11-01 | The home map is taken down while the home isn't focused | home, map |
| [0043](0043-far-averaged-position-is-travel.md) | 2026-11-02 | An averaged position more than 75 m away is travel, not a jump | trace |
| [0044](0044-a-mark-is-for-an-attraction.md) | 2026-11-02 | A mark is for an attraction | explore, discovery |
| [0045](0045-trace-hides-while-navigating.md) | 2026-11-02 | The trace hides while navigating | navigation, map |
| [0046](0046-docked-drawer.md) | 2026-11-02 | Navigate's drawer docks Start and the capture row low at every height | tabs, navigate |
| [0047](0047-navigate-live-view-of-minimized-walk.md) | 2026-11-02 | Navigate with a walk minimized is a live view of it | tabs, navigate |
| [0048](0048-recording-bar-has-its-own-stop.md) | 2026-11-02 | The recording bar has its own Stop | tabs, recording bar |
| [0049](0049-explore-tab-hint-and-long-press-card.md) | 2026-11-02 | Explore's hint sits in its drawer's header; What's good here? leads its long-press card | tabs, explore tab |
| [0050](0050-chronicle-peek.md) | 2026-11-02 | Chronicle's peek: an empty line and Navigate before any walk, else a Walks \| Days switch | tabs, chronicle |
| [0051](0051-recording-bar-glyphs-options-icon.md) | 2026-11-02 | The recording bar shows pause and a forward chevron; walk options is always `options-outline` | tabs, walk screen |
| [0052](0052-counts-are-words.md) | 2026-11-02 | Counts are words | replay, tabs |
| [0053](0053-first-replay-not-now-ends-on-chronicle.md) | 2026-11-02 | The first replay's card has a quiet "Not now", and every way out ends on Chronicle | replay, tabs |
| [0054](0054-chronicle-fits-capped-z15.md) | 2026-11-02 | Chronicle's fits are capped at z15 | tabs, map |
| [0055](0055-explore-tab-honours-what-im-into.md) | 2026-11-02 | The Explore tab honours "What I'm into" | explore tab |
| [0056](0056-navigate-settings-are-a-dialog.md) | 2026-11-03 | Navigate's settings are a dialog; the drawer stays at its peek | tabs, navigate |
| [0057](0057-bridges-and-tunnels-leave-the-ground.md) | 2026-11-03 | Only a bridge or tunnel leaves the ground; lines on different levels meet only where one lands on the other | streets, navigation |
| [0058](0058-open-in-maps.md) | 2026-11-03 | Open in Maps hands the destination to the phone's maps app | navigation |
| [0059](0059-no-open-in-maps-on-off-your-route.md) | 2026-11-03 | No Open in Maps on "Off your route" (NH4 retired) | navigation |
| [0060](0060-filling-gaps.md) | 2026-11-03 | A gap in the trace is filled with the streets most likely walked | trace, gaps |
| [0061](0061-filled-stretches-styled-as-trace.md) | 2026-11-03 | Filled stretches stay styled as trace | trace, gaps, map |
| [0062](0062-no-drawer-with-walk-minimized.md) | 2026-11-03 | No drawer at all with a walk minimized | tabs, navigate |
| [0063](0063-quality-of-life-map-staples.md) | 2026-11-03 | Quality of life: this round takes the map staples only; the rest waits in the owner's order | quality of life, map |
| [0064](0064-quality-of-life-walk-basics.md) | 2026-11-03 | Quality of life round 2: the walk basics, with a checkpoint per feature | quality of life, walk screen, navigation, tabs |
| [0065](0065-quality-of-life-chronicle-basics.md) | 2026-11-03 | Quality of life round 3: the Chronicle basics | quality of life, Chronicle, captures, map |
| [0066](0066-explore-is-an-atlas.md) | 2026-11-03 | Explore is an atlas of the areas near you: same-scale tiles, presence bars, familiarity only | explore, tabs |
| [0067](0067-atlas-presence-as-dots.md) | 2026-11-03 | Atlas round 3: presence as dots, explained in words; "Quiet" stays the walk mode's | explore |
| [0068](0068-uncertain-gaps-are-offered.md) | 2026-11-03 | An uncertain gap is offered faint, never left blank | trace, gaps |
| [0069](0069-draw-a-gaps-way.md) | 2026-11-03 | A gap's way can be drawn (taps snapped to paths), and the guess fits the time | trace, gaps, map |
| [0070](0070-app-opens-on-explore.md) | 2026-11-03 | The app opens on Explore, at `/`; a stale replay link at launch goes there too, and Explore reads one fix per launch (supersedes NV2's Navigate default) | tabs, navigation |
| [0071](0071-every-break-is-a-gap.md) | 2026-11-03 | Every break in the trace is a gap, and settling never breaks the line | trace, gaps |
| [0072](0072-hidden-notice-only-when-hidden.md) | 2026-11-03 | "Tracing paused while this page was hidden" only when the page was hidden | recording, walk screen |
| [0073](0073-functional-core-checked.md) | 2026-11-03 | A functional core, imperative shell: four layers tagged per module, checked by tests and lint, baselines that only shrink | architecture, process |
| [0074](0074-fast-iteration-scoped-checks.md) | 2026-11-03 | Fast iteration: affected checks and the slice's own e2e journey; the full e2e and `/audit` only when the owner asks (supersedes 0018's audit on every slice) | process, testing |
| [0075](0075-the-cone-is-checked-by-the-trace.md) | 2026-11-03 | The cone is checked by the trace over 20 m; the live dot's direction alone is never drawn (amends 0030) | navigation, map |
| [0076](0076-navigate-opens-the-walk-screen-ready.md) | 2026-11-03 | Navigate opens the walk screen, ready; captures stack at the right edge; the bar pulls up | tabs, navigate, walk screen |
| [0077](0077-one-way-back-from-a-town.md) | 2026-11-04 | A town's page has one way back, the pill low on the screen; the title card has no arrow | explore, atlas |
| [0078](0078-reminder-bell-on-pins.md) | 2026-11-04 | A pin with a reminder wears a bell (any kind; a merged pin if any; top left on a memory pin) | map, notifications, memories |
| [0079](0079-pocket-alert-double-tap-and-web.md) | 2026-11-04 | The pocket alert is a double-tap, and the web gives it too on a touch screen (amends NV21, E19) | explore, motion |
| [0080](0080-activity-density.md) | 2026-11-03 | Busy streets measure the density of places, of every kind, from OpenStreetMap and Overture Places, graded along each street against the town itself (supersedes L4 and L5's fixed thresholds) | landing, explore |
| [0081](0081-fix-skill-grants-deploy.md) | 2026-11-04 | `/fix`: one issue end to end in a worktree, deployed by default (typing it is the grant; `--deploy=branch` stops at a pushed branch); flags set the test level, review and loops; a red deploy is reverted, then diagnosed; the worktree is cleaned up | process, deploy |
| [0082](0082-compass-and-rotation.md) | 2026-11-04 | The map can be turned by two fingers; a compass shows while it is and sets north again (amends 0030) | map, navigation |
| [0084](0084-atlas-grading.md) | 2026-11-04 | The findable kinds' dots count only places that could be found; a thin ring says nothing; a written definition of a mark; whole areas and density next (amends AT4) | explore, atlas |
| [0083](0083-town-outlines.md) | 2026-11-04 | The town you are in is the one whose border (Overture's locality outline) you are inside; label points only where no outline was read; neighborhoods only inside their town | places-and-areas, explore |
| [0085](0085-the-replay-flows.md) | 2026-11-04 | The replay flows: glide to the moments, zip through the rest, tap to hold (supersedes 0002, 0004) | replay |
| [0086](0086-ceremonies-are-views.md) | 2026-11-04 | A ceremony is a view of the story, swapped without changing the code around it | replay, architecture |
| [0087](0087-loading-skeleton-and-keep-awake.md) | 2026-11-04 | A skeleton while a replay's memo or video loads; the screen stays awake through a replay | replay |
| [0088](0088-town-borders.md) | 2026-11-04 | Town borders are drawn on every map that shows a town: yours (or a walk's) tinted, the others lined; drawn from Overture's z10 tile, decided on z12 | map, places-and-areas |
| [0090](0090-media-edits-are-data.md) | 2026-11-04 | Photo and video edits (crop, rotate, nine filter presets, Markup-style drawing, text, trim) are data on the untouched original, rendered into one file when saved out; a local Expo module makes edited videos on phones | captures, media |
| [0091](0091-tests-by-feature.md) | 2026-11-04 | Tests are organized by feature (one map in `scripts/features.js`, a folder per feature, one e2e file per journey); a change maps to its feature's suites and a coverage hole is named | process, testing |
| [0092](0092-discrete-navigation.md) | 2026-11-04 | Explore's map steps from area to area: a swipe selects the next neighborhood (or town) that way, never panning; an experiment, to revert if it doesn't feel right | explore, map |
| [0094](0094-the-vision-gate.md) | 2026-11-05 | Features answer to `docs/VISION.md`: `/vision` gates an idea before its spec, the steward attacks the spec, `check:vision` blocks what a script can catch; the gate advises and the owner decides | product, process |
| [0095](0095-scenic-routes.md) | 2026-11-04 | Scenic routes: Go here offers the direct way and one route per leaning (green, sights, streets with life) side by side, at most 30% longer; the leanings are settings | navigation |
| [0098](0098-chronicle-opens-on-memories.md) | 2026-11-05 | Chronicle opens on Memories: a resurfaced moment, threads from the user's own words, and Lately; Walks, Days and Map stay as sections; the choices are kept in meta | chronicle, product |
| [0099](0099-place-sheet-names-finds-never-counts.md) | 2026-11-05 | A place's sheet names its finds and never counts them: no "N of M", no total; answers VISION.md open question 6 (the found tally) | explore, vision |
| [0100](0100-shared-network-rules.md) | 2026-11-05 | Every outside request goes through `lib/net`: one host table, a phone's requests name the app (amends WK18), a refusing host is left alone, a per-host off switch; a new Overture release whose places don't decode is passed over | network, walkability, landing |
| [0101](0101-kind-walk-pulls-a-slice-of-0022.md) | 2026-11-05 | A kind-scoped suggested walk pulls one slice of 0022 forward: Explore only, one way, a distance never a time, walkability said before commit, density not named stops | explore, navigation |
| [0102](0102-the-kind-walk-is-a-walk-planner.md) | 2026-11-06 | The kind walk is a walk planner: a loop or a one-way, a distance as a ceiling, a few routes by street and direction, no pin for an unfound place, and a feel for the commitment shown as density, not locations (amends 0101) | explore, navigation |
| [0103](0103-places-archive-and-curiosities.md) | 2026-11-05 | A static places archive (Wikidata, National Register, OSM tags) on the Pages site, read by tile; significance is a gate, never a measure; Curiosities are a kind of Viewpoints & oddities, chosen by type, not age; reverses 0084's "no host" | explore, discovery |
| [0104](0104-threads-the-owner-makes.md) | 2026-11-06 | Threads the owner makes: moments stay whole; a thread, its membership and a directed reply are separate stored records, a thread only from connecting existing moments and dissolving below two; the Chronicle's suggested threads stay a separate, computed environment | chronicle, storage, vision |
| [0105](0105-threads-one-word-two-marks.md) | 2026-11-09 | Threads keep one word for both kinds, the owner's and the Chronicle's; an icon tells them apart (a link for made, a repeat for suggested); an unnamed thread's heading follows its moments and may be renamed at will | chronicle, vision |
| [0106](0106-planner-opens-selected-and-names-the-kinds-along-it.md) | 2026-11-09 | The planner opens with the first route selected, as Apple and Google Maps do, and names the other kinds a route passes, by kind never by place (amends 0102) | explore, navigation |
| [0107](0107-storage-awareness.md) | 2026-11-09 | Storage awareness: the room left is read on the device (Expo's `Paths.availableDiskSpace`; the browser's storage API on the web) and said in words beside the captures before it loses a moment; a failed save is kept for Retry; never a gauge or a limit on capturing; no Storage screen (0041 stands) | storage, captures |
| [0108](0108-places-pipeline-adapters-and-roles.md) | 2026-11-09 | The places archive becomes a pipeline of adapters (Node only, Zod 4, own place IDs, tile-list packs); a community source may only nominate, and a nomination reaches only the owner's review list, never a pack | explore, discovery, data |
| [0109](0109-listed-places-remarkable-and-public.md) | 2026-11-09 | Listed places enter when remarkable and public (reachable from public ground; never a mundane building or a closed place on a listing alone; NHL houses yes); the archive reads OSM tags; attractions pinned; Overture stays for busy streets (amends 0103) | explore, discovery |
| [0110](0110-remarkable-and-public-the-slice-calls.md) | 2026-11-09 | Remarkable and public, the slice's calls: OSM only corroborates (supersedes 0109's OSM-only line); the kind is Buildings and structures, never named for significance; the replay's whispers follow the card (amends RR15); reachability said to the owner and the walker, never filtered | explore, discovery, replay |
| [0111](0111-remarkable-and-public-audit-calls.md) | 2026-11-09 | Remarkable and public, the audit's calls: the same name and category are one place within 200 m (amends PW8's 50 m); listed sites, battlefields and wrecks are Monuments and ruins | explore, discovery |
| [0112](0112-the-app-opens-on-chronicle.md) | 2026-11-09 | The app opens on Chronicle's Memories (supersedes 0070's opening tab); the tabs read Chronicle · Explore · Navigate; Memories carries the capture row, which files into an open walk | tabs, chronicle, capture, vision |
| [0113](0113-undo-waits-and-a-kill-completes-the-delete.md) | 2026-11-10 | No confirm before a moment or thread delete (a walk and its media still ask); Undo waits until used, dismissed or another delete, through a lock; a killed app completes the waiting delete (`pending_delete`) | deletion, ui, storage |
| [0114](0114-viewer-actions-toolbar-and-menu.md) | 2026-11-09 | The viewer's actions are a docked toolbar (Respond, Edit) and a More menu, never controls over the moment; "capture one tap away" is the capture stack, not actions on a moment; screens follow standard UI patterns (`.claude/rules/ui-patterns.md`) and an audit looks at screenshots | captures, chronicle, process, vision |
| [0115](0115-out-of-town-places.md) | 2026-11-09 | Places out of town: kinds filter what you see, never what exists; an "Other places" switch; the type-to-kind mapping in the app; one-of-a-kind businesses only by a structural signal; "?" within 50 km grouped into countless stars, named on a tap (amends 0103 and 0044) | explore, discovery, vision |
| [0116](0116-kinds-for-shrines-and-historic-businesses.md) | 2026-11-09 | Shrines under Monuments, pilgrimage sites under Historic churches, grottoes under Curiosities; historic businesses under Monuments, relabelled "Monuments and landmarks", shown wherever in range; explicit data first, inference only from name words and a recorded date (threshold measured first; amends 0103's "never age") | explore, discovery |
| [0117](0117-showing-a-place-is-the-value-its-kind-a-bonus.md) | 2026-11-09 | Showing a place is the value; its kind is a bonus: no data fetched only to sort a place, cheap inferences from values already read, no age threshold and no measuring step (amends 0115 and 0116) | explore, discovery |
| [0118](0118-out-of-town-plan-choices.md) | 2026-11-09 | Places out of town, the plan's choices: out of town is a build flag with the app's reach numbers; OpenStreetMap from Geofabrik extracts; Other places get an atlas dot and row (`ATLAS_CODE` bump); the owner's add file needs no stated reason | explore, discovery, atlas |
| [0119](0119-staged-places-build-choices.md) | 2026-11-09 | A staged places build: Wikidata asked for changes first (by class and country), kept outputs on a `sources` prerelease, a daily assemble that checks the app's edits and class lists, the first archive from the new pipeline's full first run | explore, discovery, data |
| [0120](0120-staged-build-folded-into-the-pipeline.md) | 2026-11-10 | The staged places build is folded into the places pipeline (0108): only the changes-first Wikidata fetch, the safety sweep, a sweep by hand and a no-fetch rebuild on edits are ported; the rest of 0119 is the pipeline's own | explore, discovery, data |
| [0121](0121-drive-there-walk-back.md) | 2026-11-10 | Drive there, walk back: on Explore's area card a place past 2 km (or with no fresh fix) asks "Walk now" or "When I get there", and past 10 km offers "When I get there" alone; the walk starts only on Start, never on arrival; Walk me back leads to where the last ride ended, or to a spot chosen with "Walk back here"; no waypoints (amends 0021, 0049) | explore, navigation |
| [0122](0122-labels-plain.md) | 2026-11-10 | Plain labels: the History category is "History", the worship kind "Places of worship", the Monuments switch "Monuments and memorials" (amends 0116); no label names significance or age | explore, discovery |
| [0123](0123-a-moment-holds-several-media.md) | 2026-11-09 | A moment holds several media: a moment table with captures under it (existing captures migrate under the same ids); grouping is explicit by an Add to this moment pill, automatic only by a setting; Split out; separate moments are threaded, never merged; three rounds | captures, storage, chronicle, vision |
| [0124](0124-explore-carousel.md) | 2026-11-10 | Explore is a map with a row of area cards: the selected area is highlighted and the only one named, a swipe on the map steps the row, the first area is selected on arrival; supersedes 0066's grid and 0092's directional swipe, amends 0034's names on the map | explore, map |
| [0125](0125-a-note-references-moments-with-at.md) | 2026-11-10 | A note references other moments with @: the reference lives in the note's text, drawn as a card of its kind; it touches no thread or link |
| [0126](0126-explore-one-level-per-row.md) | 2026-11-10 | Explore's row is one level at a time: near you the towns, yours leading and selected (the neighborhoods only where no town is named); a town's page its own card, then its neighborhoods; the title names the level, the back pill reads "Towns" (amends 0124's EC3 and 0077's pill) | explore |
| [0127](0127-presence-by-bars.md) | 2026-11-10 | Presence by bars: kinds are the switches, a place may light two bars, never making two redundant (a museum lights History too only when the archive's class or a notable name says it is historic); a route from a bar leans on places you pass; Community spaces in Culture (presence and kinds, PK1-PK19) | explore, discovery, walk-planner |
| [0128](0128-whole-towns.md) | 2026-11-11 | Whole towns: a town's page lists every neighborhood inside its border (hamlets inside it too, wards never), nearest you first; every place still to find on the selected area's map, a "?" where it has room and a kind-coloured dot where not; Explore's map draws no found place: presence, not completion (amends AT2, EC3, fix area-marks) | explore, vision |

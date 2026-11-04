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
| [0072](0072-navigate-opens-the-walk-screen-ready.md) | 2026-11-03 | Navigate opens the walk screen, ready; captures stack at the right edge; the bar pulls up | tabs, navigate, walk screen |

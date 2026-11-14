# Chronicles: where the work stands

The state of the work: which slices are shipped, in progress or queued, what
every branch holds and what is waiting on the owner. Update it at the start and
end of every slice, and whenever a branch is opened, merged or abandoned. For
what the app is, read `docs/PRODUCT.md`; for the decisions behind it, `AGENTS.md`.

- **As of:** 2026-11-05
- **`origin/main` head:** `28c7417` (2026-11-03, the filling-gaps merge). Since
  `7a34666` main gained Bridges and Open in Maps (`82186db`, `67b7c9d`), the
  Start dialog (`6fb2572`, `9f547bd`), no Open in Maps on "Off your route"
  (`1ead218`) and Filling gaps (`2a0501e`, `3a08a53`).
- **Spec:** the owner's "Explorer App Concept" doc in Claude Docs, mirrored tab by
  tab under `specs/<slug>/spec.md`. The status words in the doc's tab names
  ("queued", "in progress", "spec draft") lag the code; this table is judged from
  the git log and `AGENTS.md`, with the evidence commit beside each status.

## Slices

| Slice (spec tab) | Status | Evidence (last related commit on main) | Spec | Audited |
|---|---|---|---|---|
| Note types (a note carries one of eight ink marks the owner chooses: question, emphasis, idea, happy, neutral, sad, like, dislike; set from the note page's Type tool, and since Nov 13 by choice at capture: a slot in the corner of the journal's entry being written that opens the eight, named, above the bar; Type in an entry's More; the Type tool on a new note's page; on the viewer's note, the single-note pin and the thread bubble; NY1-NY27, decisions 0161, 0166) | built 2026-11-12 and audited twice (11 findings, 4 fixed, 3 deferred, 4 rejected; then 14 findings, 7 fixed, 2 deferred, 5 rejected; NY18-NY25 with the journal's bar, 26 findings: 21 fixed, 3 deferred, 2 rejected); merged with note pages 2026-11-13: unit tests, `dbContract` on all three stores, the `qol`, `threads` and `responses` journeys; native unverified | `claude/note-types-custom-icons-22hkgd` | `specs/note-types/spec.md` | yes (tests `note-types audit 1, 3, 8, 9, 12-16, 20, 21`) |
| Explorer App Concept (v0: record, capture, replay, storage; round 3) | shipped | `7cf5ab1` 2026-10-31 round 3; `565b244` 2026-10-31 | `specs/concept/spec.md` | yes (two audit rounds `7936f48`, `ce6dd26`; round-3 audit `712fdf8`) |
| Explore in a dense city (busy names drawn by the map with collision, one per street within 300 m, none under a "?" pin or a control; on the walk maps only within 800 m of you; the Busy read and the atlas's ring reads in a web worker, the Busy read after the map settles; fewer renders per switch; DC1-DC19, decision 0160; the owner's Baltimore report, Nov 12) | shipped 2026-11-13 (web verified by the e2e `dense` on the /chronicles build; native unverified); a first read's longest task 3.3-3.8 s to 0.2 s at 4x CPU, the first Busy switch-on 600-700 ms to 90-170 ms; switches between read areas unchanged in Chromium; first "?" pins about 1 s later | branch `claude/trusting-cannon-f5wdhg`, merged 2026-11-13 | `specs/explore-dense-city/spec.md` | yes (19 findings: 12 fixed, 1 rejected, 3 deferred, 6 folded in) |
| v0.5: memory and places (areas, the home map, navigate) | shipped (AGENTS.md's "in progress" is stale) | `9abcea3` 2026-10-31 navigate audit fixes; `f522c2d` 2026-10-31 walk me back | `specs/v0.5-places/spec.md` | yes (`5581fa7`, `2c98466`, `9abcea3`) |
| v1: discovery (places, Explore, Remind me here, notifications) | shipped (AGENTS.md's "in progress" is stale) | `ddf9cf9` 2026-11-01 Explore audit fixes; `df7ffa7` 2026-11-01 notifications; `bf310ea` 2026-11-02 | `specs/v1-discovery/spec.md` | yes (`ddf9cf9`, `6cca86f`, `b9ba5c0`) |
| v1.5: landing (What's good here, on the walk) | shipped; L10, L13, L16 retired by Explore | `2372244` 2026-10-31 slice 3 audit fixes; `fe365ab` 2026-10-31 | `specs/v1.5-landing/spec.md` | yes (`819d02f`, `2372244`) |
| Chronicle journal, cut 1 (Memories as a journal page in book order; the open line where writing is the capture, kept as typed, with @ references; the slip; the contents; the line opens into the note's page and the sheet draws a page's shape; since Nov 13 the words are written on the page, the page opens on the last entry with the empty page as the pen, and the day's entries stack and slide up; a voice note plays in line with its bar; JN1-JN33, decision 0155) | built and audited 2026-11-12; merged with note pages and deployed by `/fix`; JN28-JN33 built 2026-11-13 from the owner's phone and calls and deployed by `/deploy`, audited 2026-11-13 with the owner's answers built (the pen in the bar when the page is pulled down, fixed places for the camera and the mic, an edge under the held date, the recording's mark while writing); the in-line voice note built and audited 2026-11-13 from the owner's request (web verified by the e2e `journal`, `notepage` and seven more on the sub-path build; native unverified) | `fix/journal-note-pages`, `fix/write-on-the-page`, `claude/determined-heisenberg-b894d7`, `fix/journal-audit-2` | `specs/chronicle-journal/spec.md` | yes (39 findings: 25 fixed, 6 deferred, 7 rejected; the `/fix` review, 19: 11 fixed, 6 deferred; JN28-JN33, 23: 15 fixed, 4 deferred, 4 rejected; the in-line voice note, 19: 12 fixed, 3 deferred, 3 rejected, 1 a pass) |
| Free look (Explore: Move map frees one-finger panning, Show areas here lists the areas around the map's middle; FL1-FL21, decision 0150, amends EC10) | built 2026-11-11 on `slice/free-look`; not deployed | `slice/free-look` | `specs/free-look/spec.md` | plan audited (16 findings: 15 accepted, 1 rejected); the built slice not audited |
| Polish: motion (timings, press, sheet spring, the deferred four) | shipped | `e59460d` 2026-11-01 deferred four; `2ef7257` 2026-11-01 audit fixes | `specs/polish-motion/spec.md` | yes (`40bf9ea`, `2ef7257`) |
| Memories on revisit (faint pins, previews, thumbnails) | shipped | `0db86c7` 2026-11-01 audit fixes; `61dc468` 2026-11-01 thumbnails audit | `specs/memories-on-revisit/spec.md` | yes (`0db86c7`, `61dc468`) |
| Rides | shipped | `8e49c9c` 2026-11-01 rides audit fixes | `specs/rides/spec.md` | yes (14 findings, 11 fixed, `8e49c9c`) |
| Moments and days | shipped | `03e801d` 2026-11-01; `1b4853e` 2026-11-02 day replay fix | `specs/moments-and-days/spec.md` | yes ("After the audit" in AGENTS.md; `9187b3c`) |
| Navigation & tabs (three tabs, drawer, minimize, recording bar; the Start dialog) | shipped | `6fe5a2a` 2026-11-01 phase 1; `2cc38d7` 2026-11-02 audit; `d3b9770` 2026-11-03; the settings dialog `6fb2572`, `9f547bd` 2026-11-03; opens on Explore (NV2, 0070) 2026-11-03; an open walk at launch comes straight up, no Explore first (NV2 launch 1-5) 2026-11-03 | `specs/navigation-and-tabs/spec.md` | yes, two batches (`2cc38d7`, `a3bdc45`..`0a79e05`) |
| Clearing walks and moments | shipped | `b2bfcf7` 2026-11-01 audit fixes; `e59d65f` 2026-11-01 | `specs/clearing-walks-and-moments/spec.md` | yes (13 findings, 8 fixed, `b2bfcf7`) |
| Places worth the stop | live: PW16 recorded 2026-11-10 on main (`7e6f168`), the address set and the host allowed; the first archive published 2026-11-10 (`places-us-20261110.3.pmtiles`) | `339caf7` 2026-11-09 (PW1-PW19, audit 1-7); `7e6f168` 2026-11-10 (PW16) | `specs/places-worth-the-stop/spec.md` | yes (10 findings: 7 fixed, the rest deferred) |
| Remarkable and public (attractions pinned; the aviary; Buildings and structures; one place within 200 m for the same name and kind; bounded whispers; reachability said, never filtered; RP11, RP13-RP20, decisions 0109-0111; the listing rule RP1-RP8, RP10, RP12 moves to chronicles-data, `specs/remarkable-and-public/handoff.md`) | shipped 2026-11-10, app side (web verified by the e2e on the sub-path build; native unverified) | branch `claude/gallant-maxwell-hp14jb`, merged 2026-11-10 | `specs/remarkable-and-public/spec.md` (repo first) | yes, at the owner's request (19 findings: 17 fixed, 1 in part and deferred in part, 1 rejected; decision 0111) |
| Places out of town (rural and roadside places as "?" within 50 km, countless stars, an "Other places" switch, more sources and Canada; decision 0115) | queued after Places worth the stop goes live (PW16); gated aligned if reshaped, Nov 9 | none | none yet (the gate's criteria are in decisions 0115-0117) | no |
| Motion (steps from the phone's sensors, MO1-MO10) | shipped | `09f504a` 2026-11-01; `8edc09b` 2026-11-01 audit fixes; `93ef082` 2026-11-01 | `specs/motion/spec.md` | yes (11 findings, 9 fixed, `8edc09b`) |
| Quality of life | shipped in rounds: QL1-QL12 (markers, scale bar, Locate), QL13-QL21 (km or miles, time left, the denied-location chip and retry), QL22-QL28 (rename later, edit a note, photos on pins, months in the walks list); round 4 waits on the owner's calls (decisions 0063-0065) | round 1 `dc8f249`..`7a34666`; round 2 `1910a2d`, `c7539b1`; round 3 `48adb36`, `3a721ed`, `cdf2961`, `2799fa9`; all 2026-11-03 (branch `docs/product-synopsis`) | `specs/quality-of-life/spec.md` | no (the owner chose checkpoints per feature over an audit pass; an audit is still owed) |
| Navigate, ready (Navigate is the walk screen, ready; the capture stack; the bar pulls up to the settings, NR1-NR13) | shipped (web verified by the e2e; native unverified); the launch follows 0070 (the owner, Nov 4) | branch `claude/navigate-ready`, merged 2026-11-04 | `specs/navigate-ready/spec.md` (repo first; to be copied into the concept doc as a tab) | yes (13 findings, 12 fixed, 1 deferred) |
| Filling gaps (streets walked across a gap in the trace, G1-G14) | shipped | `2a0501e`, `3a08a53`, merged as `28c7417` 2026-11-03 | `specs/filling-gaps/spec.md` | yes (17 findings, 12 fixed, `3a08a53`) |
| Gap drawing (draw a gap's way; a guess that fits the time, GW1-GW8, GT1-GT3) | shipped | branch `claude/gap-drawing`, merged 2026-11-03 | `specs/gap-drawing/spec.md` | yes (14 findings, 11 fixed, 3 deferred) |
| Reminder bell (a pin with a reminder wears a bell, RB1-RB7, decision 0078) | shipped (web verified by the e2e; native unverified) | branch `claude/reminder-bell`, 2026-11-04 | `specs/reminder-bell/spec.md` | yes (11 findings: 8 fixed, 1 deferred, 2 rejected) |
| Hidden-page notice (a fix: "Tracing paused … while this page was hidden" only when it was, decision 0072) | shipped (web verified by the e2e `hidden`; native never shows it) | branch `claude/hidden-notice-0072`, 2026-11-03 | none (a local fix after the owner's screenshot; decision 0072) | no (a local fix, not a slice) |
| Town outlines (the town you're in is the border you're inside, Overture's divisions; TO1-TO12, decision 0083) | shipped (web verified by the e2e `outlines`, `marks`, `nudge` on the /chronicles build; native unverified) | branch `claude/town-outlines`, merged 2026-11-04 | `specs/town-outlines/spec.md` (repo first) | no |
| Town borders (the outlines drawn: yours tinted, the others lined, on every map that shows a town; TB1-TB9, decision 0088) | shipped (web verified by the e2e `outlines`, `edit`, `tabs`, `ready`, `marks`, `reload`, `gaps`, `replay`, `hidden`, `qol` on the /chronicles build; native unverified) | branch `claude/town-borders`, merged 2026-11-04; fix explore-fit-area 2026-11-04 (a town's page, and Explore near you, frame the whole town: `nextFrame`, audited, 7 fixed, 2 deferred) | `specs/town-borders/spec.md` (repo first) | no |
| Discrete navigation (Explore's map steps from area to area: a swipe selects the next neighborhood that way, or opens the next town's page; DN1-DN13, decision 0092, an experiment to revert if it doesn't feel right) | shipped 2026-11-04 (web verified by the e2e `snap`, `tabs`, `outlines`, `marks`, `replay`, `qol`, `ready` on the /chronicles build; native unverified) | branch `claude/discrete-navigation`, merged 2026-11-04 | `specs/discrete-navigation/spec.md` (repo first) | yes, at the owner's request (12 findings: 11 fixed, one in part; 1 deferred) |
| iPhone video and white page (a fix: the replay's video waited for a ready that iOS never gives before `play()`; a tab that throws shows `ScreenError` instead of a white page; `fix ios-video 1, 2`, audit 1-5) | shipped (web verified by the e2e `chronicle` with iOS's loading rule copied in, and `replay`, `edit`, `tabs`, `ready`, `launch`, `qol`, `snap`, `walkability` on the /chronicles build; WebKit not run; native unverified); why Chronicle threw after Keep it is not known yet (DEFERRED) | branch `fix/ios-video-blank`, 2026-11-05 | none (a local fix after the owner's screenshot) | yes (7 findings: 4 fixed, 2 deferred, 1 rejected) |
| Map credits start closed (a fix: the web map's attribution no longer opens itself across the map's bottom; the (i) button opens it) | shipped (web verified by the e2e `qol`, `map attribution` checks; native's own (i) untouched) | branch `claude/attribution-closed`, 2026-11-04 | none (a local fix after the owner's screenshot) | no (a local fix, not a slice) |
| Navigate drawer lifts by touch (a fix: a finger's drag on the ready bar's handle went to the map beneath; the grip is focusable now; `navigate-ready touch 1`) | shipped (web verified by the e2e `ready`; iOS WebKit not run) | branch `claude/navigate-drawer-touch`, 2026-11-04 | none (a local fix after the owner's screenshot) | no (a local fix, not a slice) |
| Town page fix (a town's tile no longer collapses under its heading; one way back, decision 0077) | shipped (web verified by the e2e; the collapse reproduced in Chromium before the fix) | branch `fix/town-page-tile`, 2026-11-04 | `specs/explore-atlas/spec.md` (AT2's way back) | no (a local fix after the owner's screenshot) |
| Area card as a full-screen drawer (covers the tabs, which fold away; a progressive pull down closes it, from the content only at the top) | built; `tabs`, `ready`, `marks` pass on the sub-path build; its own e2e checks are in the full flow, not yet run; native unverified | branch `area-card-fullscreen-drawer`, 2026-11-04 | `.claude/rules/explore-and-discovery.md` (round 3) | no (a local fix at the owner's request) |
| Bridges and Open in Maps (NB1-NB7, NH1-NH8; NH4 retired) | shipped | `82186db`, `67b7c9d`, `d16c7c4`; `1ead218` retired NH4, all 2026-11-03 | `specs/bridges-and-open-in-maps/spec.md` | yes (bridges: 11 findings, 7 fixed, `67b7c9d`) |
| Explore atlas (the Explore tab as a grid of area tiles, AT1-AT16) | shipped (web verified by the e2e; native unverified); round 2 after the owner's iPhone look: the hierarchy in the grid, the title over the map, tiles in words; round 3, the design review's fixes (decision 0067) | `d1080e7`, `d3158aa`, `18c0feb`, `06726be` 2026-11-03 (branches `explore-atlas`, `explore-atlas-2`) | `specs/explore-atlas/spec.md` (repo first; to be copied into the concept doc as a tab) | yes (14 findings: 11 fixed, 1 partly, 1 deferred, 1 rejected; `d3158aa`) |
| Functional core, slice 1 (layer tags and checks, ports, fakes, the Db contract, typed meta; FC1-FC10) | shipped 2026-11-04 (engineering; no behaviour change; native unverified) | branch commits 2026-11-03 | `specs/functional-core/spec.md` (repo only: not a concept-doc tab) | yes (14 findings: 12 fixed, 1 deferred, 1 fixed in part) |
| Affected checks (run what a change can break: affected tests, lint, typecheck, e2e journeys; AC1-AC11) | shipped 2026-11-04 (engineering; no behaviour change) | branch commits 2026-11-03 | `specs/affected-checks/spec.md` (repo only) | no (decision 0074: audits on the owner's request) |
| Test gaps, round 1 (retired ids counted only where a test names them; `test:coverage` per feature; what happened here, the GPS log, a walk's bundle and the replay's tile reads as factories over fakes; TD1-TD8) | shipped 2026-11-04 (engineering; no app behaviour change; native unverified) | branch commits 2026-11-04 | `specs/test-gaps/spec.md` (repo only) | no (decision 0074) |
| Test trim and device acceptance (repeated, unfailable and dead-code tests cut; twelve out-of-date criteria retired, the baseline 40 → 27; `docs/NATIVE_UNVERIFIED.md` as the device acceptance suite, each item a Do/Expect test with its criteria, gated; `npm run check:device`; DV1-DV7) | shipped 2026-11-05 (engineering; unit tests, typecheck, lint, the edited journeys pass; native unverified, and the suite has never run on a phone) | branch `claude/shells-saved-settings`, 2026-11-05 | `specs/device-acceptance/spec.md`, `specs/test-gaps/trim.md` (repo only) | no (decision 0074) |
| Saved-settings shells (the units, the navigation destination, the notification switches and a moment's find as factories tested over `fakePorts()`; `@instance` files; SH1-SH9) | shipped 2026-11-04 (engineering; no app behaviour change; native unverified): 811 unit tests, typecheck, lint and the seven journeys it touches green; merges after the test organization | branch commits 2026-11-04 | `specs/shells-saved-settings/spec.md` (repo only) | no (decision 0074) |
| Test organization (tests by feature: one map in `scripts/features.js`, a folder per feature, `test:feature`, coverage holes named, one e2e file per journey, the full flow cut into journeys; TG1-TG12, decision 0091; the procedures that hold other agents to it, the Stop hook on script changes, prefix and decision-number collisions, `move-test`, TG13-TG19) | shipped 2026-11-04 (engineering; no app behaviour change; deployed with `claude/shells-saved-settings`): the full flow ran green once on the branch (399 checks, 19 min). An unmerged branch's tests land at the test folder's root; `npm run move-test` puts each in its feature folder | branch commits 2026-11-04 | `specs/test-organization/spec.md` (repo only) | no (decision 0074) |
| Heading cone fix (the cone checked by the trace over 20 m; heading 1-5, decision 0075) | shipped (web verified by the e2e; native unverified) | branch `claude/heading-cone-rebased`, 2026-11-04 | none (a regression fix; criteria in `heading.test.ts`) | no (on request only, decision 0074) |
| Pocket alert nudge (a double-tap as a "?" comes into range; the web too, on a touch screen; PA1-PA6, decision 0079) | shipped 2026-11-04 (web verified by the e2e; native unverified) | branch `claude/pocket-alert-nudge`, squashed onto main 2026-11-04 | `specs/pocket-alert-nudge/spec.md` (repo first; to be copied into the concept doc as a tab) | yes, before 0074 (7 findings: 7 fixed, one in part; 2 parts deferred) |
| Atlas grading (the findable kinds count only findable places; thin rings say nothing; what a mark is; AG1-AG6, decision 0084) | shipped 2026-11-04 (unit tests, typecheck, lint, e2e `grading`, `marks`, `outlines` pass on the sub-path build; native unverified) | branch `claude/atlas-grading`, merged 2026-11-04 | `specs/atlas-grading/spec.md` (repo first; from the research doc https://claude.ai/artifact/KbWci9Guj4XcamTNqow8oC) | no (decision 0074) |
| Activity density (busy streets as graded density of places, OSM + Overture, AD1-AD16) | shipped 2026-11-04 (web verified by the e2e; native unverified) | `829016e` and the audit fixes, 2026-11-04, branch `claude/busy-streets-calculator-accuracy-tk03rr` | `specs/activity-density/spec.md` (repo first) | yes (14 findings, 14 fixed) |
| Media editing (crop, rotate, nine filters, Markup-style drawing, text, video trim; edits are data, saved out in one file; ME1-ME23, decision 0090) | shipped 2026-11-04 (web verified by the e2e `edit`; native unverified, the video module never compiled) | branch `claude/media-editing-spec`, 2026-11-04 | `specs/media-editing/spec.md` (repo first) | yes (16 findings: 12 fixed, 2 deferred, 2 rejected) |
| Compass (the map turns by two fingers; a compass shows while it is and sets north again, CP1-CP8, decision 0082) | shipped 2026-11-04 (web verified by the e2e `qol` and `ready`; native unverified; the live walk's compass slot is not covered by an e2e step) | branch `claude/compass-spec`, 2026-11-04 | `specs/compass/spec.md` (repo first) | no (on request only, decision 0074) |
| Replay rhythm (the replay as a story told by a ceremony; glide to the moments, zip through the rest, tap to hold; RR1-RR22, decisions 0085, 0086; then a loading skeleton and the screen kept awake, RR23-RR24, decision 0087) | shipped 2026-11-04 (web verified by the e2e `replay` journey, against the `/chronicles` build too; native unverified) | branch `claude/replay-rhythm`, 2026-11-04 | `specs/replay-rhythm/spec.md` (repo first) | yes, three rounds at the owner's request (19 findings: 16 fixed, 1 deferred, 2 rejected; 10: 9 fixed, 1 in part; 9: 8 fixed, 1 deferred to the owner) |
| Town presence (a town graded across its whole outline; its pockets of activity listed as Busy areas; malls count as Shops; TP1-TP12, decision 0089) | built 2026-11-04 (unit tests, typecheck, lint, `npm test`, e2e `outlines`, `grading`, `marks`, `tabs` pass on the web build; native unverified; the tile class names for a mall are unconfirmed) | branch `claude/town-presence-spec` | `specs/town-presence/spec.md` (repo first) | no (decision 0074) |
| Walkability (a band per street as an icon with a tooltip; the layer on the Explore and Navigate maps; the area card's "On foot" line; a silent heads-up on a navigated route; WK1-WK23, WH1-WH13, decision 0093) | shipped 2026-11-04 (web verified by the e2e `walkability` and `headsup` on the /chronicles build; native unverified) | branch `claude/walkability-spec`, merged 2026-11-04; audit fixes after | `specs/walkability/spec.md`, `specs/walkability-headsup/spec.md` (repo first) | yes (14 findings: 10 fixed, 3 deferred, 1 rejected) |
| Map layers (one Layers button; Walkability, Busy streets, Town borders; ML1-ML13, decision 0097) and Walkability by urban form (cells judged by street junctions, tinted areas, the card's words, an area-entry heads-up; UF1-UF20, decision 0096) | shipped 2026-11-05 (web verified by the e2e `layers`, `walkability`, `headsup` on the /chronicles build; native unverified) | branch `claude/walkability-urban-form` | `specs/map-layers/spec.md`, `specs/walkability-urban-form/spec.md` (repo first) | yes: a UI audit, 2026-11-05 (auditor: 14 findings, 10 fixed, 3 in part, 1 deferred; steward: 8, the owner's calls made) |
| Vision gate (`docs/VISION.md`, the `/vision` skill, the `steward` subagent, `npm run check:vision` in CI and the Stop hook; VG1-VG12, decision 0094) | shipped 2026-11-05 (process; no app behaviour change): unit tests, typecheck, lint, `npm test` | branch `claude/vision-gate`, 2026-11-05 | `specs/vision-gate/spec.md` (repo only) | no (decision 0074) |
| Scenic routes (Go here offers Direct and one route per leaning: green, sights, streets with life, at most 30% longer, in words; SR1-SR15, decision 0095) | shipped 2026-11-05 (web verified by the e2e `scenic`, `walkability`, `headsup`, `walk`, `memories`, `launch`, `ready`, `tabs`, `reload`, `qol`, `marks`, `edit`, `gaps`, `hidden`, `nudge`, `outlines`, `replay`, `snap` on the /chronicles build, merged with main; 1124 unit tests; native unverified) | branch `claude/scenic-routes`, merged and deployed 2026-11-05 (`28af9a2`, Pages run 116); reshaped at the vision gate (no minutes compared, decision 0095) | `specs/scenic-routes/spec.md` (repo first) | no (decision 0074) |
| Drive there, walk back (a far Walk to on Explore's card asks Walk now or When I get there, past 10 km When I get there alone; the walk starts only on Start, never on arrival; Walk me back leads to where the last ride ended, or a spot chosen with Walk back here; DW1-DW14, decision 0121) | shipped 2026-11-10 (web verified by the e2e `drive` and the nineteen journeys it touches on the /chronicles build; 1545 unit tests; native unverified); test-first by history but for DW13, whose todo check sat on two lines (recorded in the spec, shipped at the owner's call) | branch `claude/gracious-hopper-34sdrs`, merged 2026-11-10 | `specs/drive-then-walk/spec.md` (repo first) | no (decision 0074) |
| Whole towns (a town's page lists every neighborhood inside its border, hamlets in, wards out, nearest you first; the selected area's places still to find as "?" where they have room and kind-coloured dots where not, a tap on a dot zooms in; found places off the map; WT1-WT14, decision 0132) | shipped 2026-11-11 (web verified by the e2e `carousel`, `atlas`, `marks`, `snap`, `outlines`, `grading`, `chronicle` on the /chronicles build; native unverified); Allentown lists 36 neighborhoods where it listed 24 | branch `claude/cool-shannon-p9gph3`, merged and deployed 2026-11-11 (`83a3f25`, Pages run 180) | `specs/whole-towns/spec.md` (repo first) | yes, at the owner's request (23 findings: 16 fixed, 2 of them in part; 2 deferred; 5 rejected; the owner's calls in 0132) |
| The section bar names what Chronicle shows (the sheet's Walks, Days, Map, a drag and a long press move the bar; the bar's press, even on the selected section, moves the sheet; one map across Walks, Days and Map; SB1-SB5, decision 0136, from G1) | shipped 2026-11-11 by `/tend inbox G1 yes` (web verified by `resurface/section.test.ts` and the e2e `chronicle`, `capturehome`, `qol`, `resurface`, `tabs`) | `eb40c5c` | `specs/section-bar/spec.md` | the run's review (see Last tend) |
| Presence: one system says what a place is (one table from poi classes and Overture's taxonomy to classes; density and marks read them; curation apart; PRESENCE_CODE in the atlas and landing codes; PR1-PR8, decision 0140; the first of two slices) | shipped | from G3 (`/tend inbox G3 yes`), Nov 11 | `specs/presence/spec.md` | review in the `/tend` run |
| Presence readers: the archive, bars, notable names, greens and the planner read presence's classes (a place carries its classes, never stored; `recorded` and `historic_name` judged by curation; History beside a category only from `historic`; nothing a person sees changes, held by golden tables; PS1-PS11, decision 0140; the second of two slices) | shipped 2026-11-11 by `/tend inbox G4 yes`, parked beside community parks, resumed on main by `/tend inbox T8 yes` (decision 0146: greens and community parks read presence, the carry a9.p1 under a9.p2; golden tables captured again on main; 1918 unit tests, typecheck, lint; e2e `marks`, `atlas`, `grading`, `curiosities`, `outlines`, `planner`, `upgrade`; native untouched) | from G4; parked as `slice/presence-readers-parked`, landed from `tend/inbox-t8-20261111-2103` | `specs/presence-readers/spec.md` (repo first) | review in the `/tend` runs (`presence-readers audit 1-6`, then one round over the resolution, `audit 7-12`, one filed as T9) |
| Smooth neighborhood switches (a switch redraws nothing it already showed: the neighborhood's outline kept and derived after the move, unchanged Busy lines never resent, the names once at the settle, the lines held on a town's page, markers kept, a cut read retried; one Explore render per move, costing what the camera alone does; SS1-SS10, decision 0166) | shipped 2026-11-14 | `4e9a496` 2026-11-14 (Pages run 254) | `specs/smooth-switches/spec.md` | no (UI review: 1 finding, fixed) |

Not a tab, but tracked: **suggested routes** shipped as scenic routes (decision 0095);
Explore's route preview and "Walk this way" stay deferred.
**Backup and export** has code (`lib/export`) and no UI (deferred, `565b244`).

**Native has never run on a device.** Every slice above is verified on the web
build only; each AGENTS.md section lists its unverified native parts.

## Branches

Every `origin/*` branch as of 2026-11-03 (dates are the last commit's).
"Ahead" is `git log origin/main..<branch>`; "merged" is `git branch -r --merged
origin/main`. A clone of this repo may be shallow (history before Nov 1 missing),
which reports "no merge base" and inflated counts; run `git fetch --unshallow`
first.

| Branch | Last commit | Ahead | Merged | Holds | Disposition |
|---|---|---|---|---|---|
| `claude/places-archive` | 2026-11-09 | 0 | yes | Places worth the stop (PW1-PW19) and its audit fixes | merged (`339caf7`) |
| `claude/bridges-open-in-maps` | 2026-11-03 | 3 | no | the first copy of Bridges and Open in Maps; main took the `-rebased` copy | superseded by `-rebased` (one commit not patch-identical; its content reached main reworked) |
| `claude/bridges-open-in-maps-rebased` | 2026-11-03 | 0 | yes | Bridges and Open in Maps as merged | merged |
| `claude/clear-storage` | 2026-11-01 | 0 | yes | Clearing walks and moments (D1-D11) with its audit fixes | merged |
| `claude/filling-gaps` | 2026-11-03 | 0 | yes | Filling gaps (G1-G14) and its audit fixes | merged (`28c7417`) |
| `claude/gap-drawing` | 2026-11-03 | 0 | yes | Gap drawing (GW1-GW8, GT1-GT3) and its audit fixes | merged |
| `claude/functional-core-foundations` | 2026-11-01 | 3 | no | `Ports` type and real instance, in-memory fakes with one call log, a `Db` contract suite, typed `meta.ts`, `Store`/`useStore`, ESLint boundary rules, an AGENTS.md style section; plus its own copy of the fog-streak fix (`98faa36`), which main has as `2b0cdfe` | taken: `561b439` cherry-picked into `claude/functional-core-slice1` and brought up to main, without its `LEGACY_*` lists or its AGENTS.md section (decision 0073); safe to delete once slice 1 merges |
| `claude/navigate-ready` | 2026-11-04 | 0 | yes | Navigate, ready (NR1-NR13) and its audit fixes, merged over main's launch on Explore | merged |
| `claude/rides` | 2026-11-01 | 0 | yes | Rides (R1-R14) and its audit fixes | merged |
| `docs/product-synopsis` | 2026-11-03 | 0 | yes | `docs/PRODUCT.md` and the QL section of AGENTS.md; fast-forwarded, it is main's head | merged |
| `explore` | 2026-11-01 | 0 | yes | Explore (v1 slice 5) and its audit fixes | merged |
| `fix-standstill-jitter` | 2026-11-01 | 0 | yes | GPS wander settled when a trace is read | merged |
| `foundation` | 2026-10-29 | 2 | no | the first prototype: a Swift walk-recorder Expo module, an unsigned-IPA workflow, `docs/concept.md` and implementation research (27 files, +7920); main restarted from a new Expo app the next day (`a14483e`) and holds none of it | unknown (looks abandoned; nothing on main records why, and `docs/concept.md` never reached main) |
| `gps-log` | 2026-11-01 | 0 | yes | Share GPS log in the walk options | merged |
| `live-dot` | 2026-11-01 | 1 | no | the live dot (Kalman per axis, glide) | superseded: its one commit is patch-identical to main's `7263546` (merged through `motion`/`web-prototype`) |
| `moments-and-days` | 2026-11-01 | 0 | yes | Moments and days (M1-M17), thumbnails, audit fixes | merged |
| `motion` | 2026-11-03 | 0 | yes | Motion (MO1-MO10), the live dot, then the tabs audit and "no drawer with a walk minimized" | merged |
| `navigate-start-dialog` | 2026-11-03 | 2 | no | Navigate's settings as one dialog; its commits reached main by patch | superseded (`git cherry` shows none left) |
| `claude/offroute-no-handoff` | 2026-11-03 | 1 | no | no Open in Maps on "Off your route" | superseded by `-rebased` |
| `claude/offroute-no-handoff-rebased` | 2026-11-03 | 0 | yes | the same change as merged (`1ead218`) | merged |
| `notifications` | 2026-11-01 | 1 | no | "Replay opens at once after Stop, even when the tile host stalls" | superseded: patch-identical to main's `2195bb5`; the notifications slice itself is on main (`df7ffa7`) |
| `smooth-walker-dot` | 2026-10-31 | 1 | no | the first smoothed walker dot (glide, replay dot at ~30 fps) | superseded by main's `8e77db9` (same title, reworked on `web-prototype`), then by the live dot `7263546` |
| `web-prototype` | 2026-11-02 | 0 | yes | the long-running web branch: tabs, the recording bar, the tabs audits | merged |

| `claude/agent-friendly-bootstrap` | 2026-11-03 | 0 | yes | AGENTS.md as an index; `.claude/` rules, skills, hooks and the auditor; the docs split out of AGENTS.md; the specs mirror | merged |
| `explore-atlas` | 2026-11-03 | 0 | yes | Explore atlas (AT1-AT14) and its audit fixes | merged |
| `claude/pocket-alert-nudge` | 2026-11-03 | 0 | yes | Pocket alert nudge (PA1-PA6) and its audit fixes, squashed onto main | merged |
| `claude/scenic-routes` | 2026-11-05 | 0 | yes | Scenic routes (SR1-SR15) and its reshape at the vision gate | merged |

## Needs the owner

This section is the owner's inbox (decision 0128). `/tend` files here what it may not ship: additions, phone-only
findings, opinions and architectural calls, each numbered `T<n>` with a recommended shape, and its proposals for the next iteration (`G<n>`, decision 0129).
Answer with `/tend inbox T3 yes, G2 yes, T4 no: <reason>`.

### From the journal and note pages `/fix` (2026-11-12, `specs/chronicle-journal/spec.md`, "The line and the page")

- **Note pages rewrites `_` and `*` in what you wrote** (the review's 2 and 9; on `main` before this fix): a URL such as `https://ex.com/a_b_c` is saved as `a\_b\_c` and gains more backslashes on each edit; a line broken with Shift+Enter that looks like a table row reopens as an empty page. Recommended: `/fix` it next, in `src/lib/notePage/schema.ts`, with round-trip tests.
- **The page's words are sans; the sheet's are serif** (ui 3). Recommended: set the editor's body in the owner's serif at the sheet's size.
- **A new page from the line reads a location even on a walk** with a stale fix, where the line reads none. Recommended: the page follows the line's rule when it is opened from the journal.

### From the journal's audit (2026-11-12, `specs/chronicle-journal/spec.md`, Audit)

- **A moment's link to its walk as an inference** (your direction, Nov 12, decision 0155): a data-model change across the replay, the walk screen and deletion. It needs `/vision` and a spec of its own. Recommended: after cut 2, which makes walks chapters and will show what the page needs from a walk.
- **More on every entry** (audit 18): the steward asks to take it off the page and put "Show less like this" and "Not this one" in the viewer's More. It now trails the dateline. Recommended: keep it until cut 3 designs the contents, then decide.
- **Three bars at the foot with a walk minimized** (ui 1): the open line, the recording bar and the tab bar. Recommended: fold the walk's time, distance and Stop into the line's own row in cut 2.
- **The dateline's tap lands on a cluster** (audit 19): the Map frames 150 m around the moment, but entries made at one spot share a pin with a count. Recommended: arrive with that moment's preview open.
- **JN19 on your phone**: the line above a real keyboard, in Safari and the Home Screen app, is the first thing to try (`docs/NATIVE_UNVERIFIED.md`).
- **(Nov 13) A note's reaction: its word** (decision 0166; the first cold find): the journal's sign is a face with a plus, but the page's tool, More and the spoken names still say "Type", which a cold reader took for typing or typeface. Yours: "Reaction" everywhere, or keep "Type". (Answered the same evening: the sign on today's entries only, NY27; ink glyphs, not colour emoji.)

### From /tend

- **T11 [owner] Voice and note are two taps away while a walk is minimized, off Memories** (2026-11-11)
  Area: tabs. Seen: `tabs-2-recording-bar`, `probe-explore-minimized` (pictures): on Explore and Chronicle's other sections the
  recording bar offers the camera only. Rests on: VISION.md Always, "Capture is one tap away on every screen you walk or capture
  from", and Never, "A capture behind a menu, a drawer or an extra tap" (steward S2). NV9 (your call, Nov 1) settled the camera on
  the bar; the voice memo and the note were never ruled.
  Recommended: a mic beside the bar's camera, the same 44 pt ink-on-white button, hidden on Memories as the camera is (the band
  has one there); a memo records in place with Stop & save, Discard and its timer, as on the walk screen, and leaving the tab saves
  it (`memoGate`); the bar's line shortened to fit at 320 px (the time alone, the distance still spoken). It extends NV9 and
  decision 0048 and reverses neither. More than one commit: on a yes it is built as a slice. /vision: aligned (honour), with no
  accent and no count on the bar.
  Otherwise: the mic and the pencil both; or record the camera as the bar's whole stack in VISION.md's Shapes; or leave it.
- **T13 [phone] The tabs at the largest text size** (2026-11-11)
  Area: tabs. Seen: `probe-minimized-200pct` (the web at zoom 2, a rough stand-in: react-native-web sizes text in px): the section
  bar read "M… / W. / D.", the band lost Note off the screen, the bar's line read "0:07 …" (UX review U6; WCAG 1.4.4).
  Do: on an iPhone, Settings › Accessibility › Display & Text Size › Larger Text at the largest size; open Chronicles on Memories
  with a walk minimized, then Explore.
  Expect: the section names, the band's Photo, Voice and Note, the recording bar's time and distance and the tab labels are all
  there, wrapping where they must, none cut to a letter or pushed off the screen.
- **T18 [phone] The map's text and buttons at the largest text size** (2026-11-12)
  Area: map. Seen: not on the web (react-native-web sizes text in px; the web cannot picture it).
  Do: on an iPhone, Settings › Accessibility › Display & Text Size › Larger Text at the largest size; open a walk with two
  moments kept at one place, turn the map, then open its replay and Explore.
  Expect: the scale bar's label stays whole beside its line, a pin's count or kinds stay inside its head, the compass and
  Locate stay 44 pt and in their column, and the map's (i) stays reachable, none cut or pushed under the strip or a card.
- **T19 [owner] Replay: the cards say their counts in words, with one hint** (2026-11-12)
  Area: replay (the walk's card and the day's). Seen: `rr-day-card` ("5 moments · 5 places", now 16 px regular after
  `tend replay 12`), `probe-390r-card` ("1 photo · 1 video · 1 voice memo · 1 note · tap a pin to open"); the hint
  worded two ways, "· tap a pin to open" and "Tap a pin to open it" (UX U11). Rests on: VISION.md Always, "Counts are
  words, in a clause"; the replay rule, "No accent colour or large number on the card" (steward S3). M13 shipped
  "\<weekday\> · N moments · P places", so this amends a shipped criterion. Your answer of Nov 12 (decision 0153):
  "places" on the day's card are named places only, said in words.
  Recommended: the day's line a clause, "Four moments, around Wickenden Street and the Old Mill" (up to two named
  places, else "Four moments around Fox Point", the day's area, else "Four moments"); the walk's captures line a
  clause, "Two photos, a video, a voice memo and a note"; one hint on both, "Tap a pin to open it". /vision: aligned
  (return; "Counts are words, in a clause"), amends M13.
  Otherwise: the numbers as words only ("Four moments · two places"); or leave it.
  **Answered** by the owner in person (Nov 12; decision 0165): "Clauses, one hint", the recommended shape. Recorded
  Nov 13; waits for the next `/tend inbox`, one build per run (T28 was built first).
- **T20 [owner] Replay: "Back to the map" and "Back to walks" both go to Chronicle** (2026-11-12)
  Area: replay. Seen: `src/app/day/[key].tsx` (a day with nothing kept: "Back to the map"), `src/app/replay/[id].tsx`
  (a walk not found: "Back to walks"); both `router.dismissTo('/')`, which is Chronicle since decision 0112. Rests on:
  VISION.md, "Chronicle first ... the map is one view of it, not its home" (steward S4). New words, so yours.
  Recommended: both read "Back to Chronicle". /vision: aligned (return; the place's own name, nothing new).
  Otherwise: "Back" alone; or leave it.
  **Answered** by the owner in person (Nov 12; decision 0165): "Back to Chronicle", the recommended shape. Recorded
  Nov 13; waits for the next `/tend inbox`, one build per run (T28 was built first).
- **T21 [owner] Replay: the name step's only way on is Keep it** (2026-11-12)
  Area: replay (beat five). Seen: `probe-390r-name`, `probe-320r-name` (two fields and Keep it, no Cancel or back).
  Rests on: NN/g H3, "a clearly marked 'emergency exit'"; the goal-to-control matrix, row 18, "Text view in a sheet
  with Cancel and Done" (UX U8). Since `tend replay 4` and `5`, Android's Back and the web's Escape return to the card
  with the words kept; an iPhone has neither. A control on beat five is yours.
  Recommended: a quiet "Back" in the name sheet's top row, in the card's "Not now" style, returning to the card with
  the words kept. /vision: aligned (return; restraint: one quiet text control, no new colour).
  Otherwise: leave it (Keep it with the suggested name loses nothing).
  **Answered** by the owner in person (Nov 12; decision 0165): "A quiet Back", the recommended shape. Recorded Nov 13;
  waits for the next `/tend inbox`, one build per run (T28 was built first).
- **T22 [owner] The walked colour is separate from the accent** (2026-11-12)
  Area: replay, and every map that draws walked streets (Chronicle's map, the walk's end marker, any map given
  `walked`). Seen: `probe-390r-fog` (beat one lights the walked streets in `COLORS.walked`, `#c2410c`, the same hex as
  `theme.accent`; they stay lit through the path; steward Q2). Rests on: your answer of Nov 12 (decision 0153), "the
  replay must never light anything in the accent"; VISION.md Never, "Celebration: ... accent-coloured wins". The
  palette is not chosen.
  Recommended: a walked colour of its own in `COLORS.walked` (`components/map/types.ts`), a deep ochre or brick at
  3:1 or more against the map's ground and apart from the accent and the kinds' colours, so every map follows at
  once; the trace's green unchanged; QL2's end ring ("in the walked orange") takes it too. Not built until you pick
  the hue. /vision: aligned (return; restraint in colour), amends QL2's colour word.
  Otherwise: keep the hue but draw the walked streets lighter in the replay only; or leave it.
  Since `tend places T15` (Nov 13): a walked place's star is ink (`#1d2430`), beside T14's pin of several on its dark neutral head (`#3f3f46`); the two grounds are about 1.5:1, told apart by the star's white glyph and the pin's kind discs and stem, not by hue (the T15 probe's `after-fit-390-close`; the T15 review's F5, no action). A walked hue picked here would not reach the stars, which are ink by your answer.
  **Answered** by the owner in person (Nov 12; decision 0165): "Show me swatches", not a yes to a hue: a later run
  renders three walked hues apart from the accent, the owner picks one, then it is built. Recorded Nov 13; waits for
  the next `/tend inbox`, one build per run (T28 was built first).
- **T23 [phone] The replays at the largest text size** (2026-11-12)
  Area: replay. Seen: not on the web (react-native-web sizes text in px; the web cannot picture it).
  Do: on an iPhone, Settings › Accessibility › Display & Text Size › Larger Text at the largest size; finish a walk
  with a photo, a note and a memo, watch its replay to the card, Name it, then open its day's replay to its card.
  Expect: the fog's headline and "Reading the streets you walked…" wrap inside their boxes, clear of Skip; Hold, the
  clock and Skip stay on one row; "20 min later" and "Held · tap to go on" stay whole; a card's caption, "Tap for
  sound" and the memo's line ("Voice memo · 0:03 · 4:37 PM") stay inside their card and bubble; the walk card's two
  buttons and Not now, and the name step's fields and Keep it, stay on screen above the keyboard; the day's card
  (which does not scroll) keeps Watch again and Done on screen.
- **T24 [phone] The replays with a screen reader, and Android's Back** (2026-11-12)
  Area: replay. Seen: not on the web (react-native-web's announcement does nothing; the steps never mount there).
  Do: with VoiceOver, then TalkBack, finish a walk and let its replay play; on the card edit a note; open its day's
  replay and Skip; on Android with no screen reader, Name it, type a name, press Back.
  Expect: "Reading the streets you walked", the headline and "Summary" are each said once (not again after the note's
  edit, `tend replay 9`); the steps go through the moments with Continue, then the card (RR17); the day's card is said
  after Skip; Back on the name step returns to the card with the name kept (`tend replay 4`), and Back on the card
  leaves for Chronicle.
- **T27 [owner] VISION.md's "Never likes" line disagrees with note types** (2026-11-13)
  Area: captures, vision. Seen: the steward's second pass on `specs/note-types` (audit 18): the app ships a Like and a Dislike on a note (decision 0161), while VISION.md's Never table still reads "A feed, followers, likes, public profiles". Rests on: your call in 0161; the gate may not edit the Never list.
  Recommended: in that row's "nearest thing that fits" column add "a mark on your own note, shown to no one and read by no feature about a place, a route or a recommendation (0161)". The page is at its size budget (12,000 bytes): shorten another row to fit.
- **T29 [owner] Reminders say their counts in digits beside pins that say words** (2026-11-13)
  Area: notifications, memories (the T14 sibling lens). Seen: two memories in reach are the reminder "2 memories here"
  with the body "2 voice memos and a note" (`discovery/recall.ts` l.99 and `kindsOf` l.114, its kinds in a fixed
  order), on the reminder card (R7, `ReminderCard.tsx`) and in the announcements of the recording bar and the walk
  screen (`RecordingBar.tsx` l.106, `walk.tsx`); since `tend map T14` the memory pin at that place says "Memories: a
  photo and a note" (the T14 review's F6), from a second copy of the kinds' words. "What happened here" says
  "Tuesday evening in Fox Point · 12 min in" (`here/shell.ts` l.50) where a pin says "twelve minutes in" (F7). Rests
  on: VISION.md Always, "Counts are words, in a clause. Distances and times are fine."
  Recommended: a reminder of several says "Two memories here", and its body the pin's words from one table
  (`pinKindsWords`, its kinds in the order taken): "Two voice memos and a note"; the announcements say the same.
  "What happened here" keeps "12 min in": the page allows times in digits. /vision: aligned (honour; "Counts are
  words"); F7 is no breach ("Distances and times are fine"), so it is left. It amends v1-discovery R7's example "2
  memories here".
  Otherwise: also "twelve minutes in" for "What happened here", one voice with the pins; or leave them.
  **Answered yes** by the owner in person (`/tend inbox T25 yes, T28 yes, T29 yes`, Nov 13; decision 0164): "Words;
  keep '12 min in'", the recommended shape: a reminder of several says "Two memories here" and its body takes the
  pins' words from one table (`pinKindsWords`, in the order taken); the announcements say the same; "What happened
  here" keeps "12 min in". Waits for the next `/tend inbox`, one build per run (T25 was built first).

### Next evolutions

The loop's proposals for what to build next (`G<n>`, three at most, decision 0129). Answer with `/tend inbox G1 yes`.

- **G2 [M] Explore: "busy" becomes "storefronts", listed nearest first** (2026-11-11) · Earn · aligned
  Area: explore (and layers, landing, the route leaning). From: T4, reshaped by the owner Nov 11: "busy" implies traffic,
  which depends on the time of day; the concept is the density of non-residential places you can walk into, for a downtown
  strip and a small corner pocket alike. The owner chose the word, the order and the reach.
  Touches: VISION.md Never, "Popularity, trending, foot traffic, other people's activity" (nearest fit "Presence of places
  from open data") and "rankings of places"; decisions 0034 (information only), 0080, 0127, 0109 (the source stays
  Overture and OpenStreetMap; only the word changes).
  The slice: 1. The map layer "Busy streets" is "Storefronts". 2. An area's card says "Storefronts" for its areas and
  streets, listed nearest you first. 3. The walk line reads "Starts you on {street}", with no superlative. 4. "What's good
  here?" names the street or pocket where storefronts gather, never "Busiest area". 5. "A busy pocket" becomes a pocket
  of storefronts. 6. The walk's help line and the route leaning ("Along the busy streets") say storefronts. 7. No line or
  label for this concept says busy, busiest or most, and none counts storefronts. 8. Walkability's "Streets far apart and
  busy" (traffic) is unchanged. 9. Decisions 0080 and 0127 and the specs that pin the old words are amended in the slice.
  Builds on presence (decision 0140; its first slice shipped Nov 11, PR1-PR8): Storefronts is a presence class and its density, not a
  renamed busy table. G4 (presence's second slice) first is better, not required.
  Payoff: every visit to Explore, and every route that leans; the word stops promising people the data cannot see.
  Cost: M, copy across about eight screens and modules plus the specs and tests that pin it, no native code, no data
  change. Reopens: explore (rough), layers, landing, scenic routes. After it: the pocket alert and the Navigate line can
  say the same word. Instead: rename the card's sections only (the layer and the card would then disagree).

### Last tend

**Nov 13, `/tend inbox T28 yes, T19 yes, T20 yes, T21 yes, T22 swatches`** (from `63cf0214`, rebased on `da529bad`; the
owner's own answers, in person: T28 on Nov 13 in decision 0164; T19-T22 on Nov 12 and the T28 review's ux 1 and ux 2
on Nov 13, recorded in decision 0165; one build per run, so T19, T20 and T21 wait, marked answered, and T22 waits for
its swatches).
- `tend map T28`: every pin says when: a pin of one moment its minutes too ("Photo, twelve minutes in. Open"); a pin
  whose moments lie more than ten walked minutes apart the span ("A photo and a note, from the start to fifty-eight
  minutes in. Open"); a pin no walk clock holds the part of the day of its first moment, in the moment's own line's
  words ("A photo and a note, Tuesday evening. Open"). Nothing drawn changed. Sibling lens: the walk screen and the
  replay have a clock; the walk screen after Stop, the ready screen, Chronicle's map and memory pins have none; a day
  replay's pin of two walks, or of a moment outside a walk, has none either; Explore and the planner draw no pins of
  moments.
The review's fixes (one round of the auditor and the ux-reviewer, decision 0145):
- `tend map audit 27`: a pin whose moments fall on different days says the span of their days ("from three weeks ago
  to Tuesday evening"; the owner's answer to ux 1).
- `tend map audit 28`: on a map of several walks every pin says its part of the day (the owner's answer to ux 2).
- `tend map audit 29`: the walk screen renews its pins' `now` on return to the front and at the next boundary the
  words turn on (`nextDayPartBoundary`; auditor 1, ux 3); the e2e for it is a `[loop]` item in `docs/DEFERRED.md`.
- `tend map audit 30`: the span is said in the minutes it names, its unit once ("from twelve to fifty minutes in");
  `pinInto` deleted (auditor 3, ux 5, auditor 6).
- `tend map audit 31`: `qol` reads a one-photo pin's minutes whole; the `days` checks keep to the map and take
  "yesterday night" (auditor 4, auditor 7).
Review: 9 accepted, 2 recorded (auditor 2: a native check for the new names, the two old checks noted superseded;
auditor 5: the map rule's "kinds alone" lines, noted under "Open before the loop"), 1 deferred `[owner]` (ux 4, the
long-ago line's comma), 0 rejected. Each check was seen failing first: the unit tests on the code before each fix,
the journeys' T28 and audit 31 checks on main's build (`E2E_SOFT`).
Not a sweep: no lens ran and no area changed state. Journeys green on the final code: `days`, `qol`, `walk`, `edit`,
`launch`, `ready`. Nothing here has run on a phone; the spoken names on native are unverified
(`docs/NATIVE_UNVERIFIED.md`). QL26's, NY10's, MR2's and RB7's words, and the map rule's "kinds alone" lines, wait for
your edit (noted under "Open before the loop").

### Open before the loop

- **v0.5-places' "merge with a count" after T15** (Nov 13; decision 0154): since `tend places T15` every walked-place
  star is a white star on an ink disc, one size, and a merged star draws no numeral; its spoken name says its places
  and walks in words ("Two places, two walks. Zoom in"; a lone star "Fox Point, one walk. Open", `tend places audit
  5`); a selected star keeps its disc and gains an ink ring outside its white edge (`tend places audit 1`). Amend, in
  the doc and its mirror (the loop may not edit a spec): `specs/v0.5-places/spec.md` l.109 ("A star is the same size
  and colour everywhere ... Stars within 44 px merge into one with a count"; the colour is ink now), criterion 13
  (l.224, "must merge into one star with a count"), its test row (l.269, "`places: stars within 44 px merge with a
  count`") and H7 (l.306, "They merge within 44 px with a count"). The unit test's name says it too
  (`src/lib/__tests__/places/places.test.ts` l.84, "stars within 44 px merge into one with a count"; `Star.count` is
  still the number of places, now only spoken). Decision 0154's "Amends" names 0019 only. No rule line said the
  accent or the numeral; `.claude/rules/places-and-areas.md` has a "Since `tend places T15`" line under "Stars".
- **QL26's, NY10's, MR2's and RB7's words after T14** (Nov 13; decision 0154): since `tend map T14` a pin of several
  moments shows its kinds (the first two taken, fanned discs on the neutral head, one kind twice) and never a numeral,
  and says them in words with the minutes in ("A photo and a note, twelve minutes in. Open"; a memory pin "Memories: a
  photo and a note"; with a bell ", reminder set"); since `tend map audit 19` a pin whose moments lie more than ten
  walked minutes apart, or one on a map with no walk clock, says its kinds alone. Amend, in the docs and their
  mirrors (the loop may not edit a spec): QL26 (`specs/quality-of-life/spec.md` l.72, "A pin of several captures keeps
  its count"; since video thumbnails a pin of one photo or one video shows its copy or still, VS3, VS4, and a pin of
  several shows neither); NY10 (`specs/note-types/spec.md` l.42 and its record l.58, "a pin of several captures keeps
  its kind's glyph and its count"); MR2 (`specs/memories-on-revisit/spec.md` l.37, "a group shows its count"); RB7's
  example (`specs/reminder-bell/spec.md` l.26, "3 captures here, reminder set. Open"). The rule lines that say the old
  shape, which the loop rewords not: `.claude/rules/captures-and-media.md` (Note types, "a pin of several keeps its
  count") and `.claude/rules/memories.md` ("Its label is "N memories here""); a "Since `tend map T14`" line under each
  says what is true, and `.claude/rules/map.md` has the new "A pin of several moments" bullet.
  Since `tend map T28` (Nov 13; decision 0164) every pin says when: a pin of one moment its minutes too ("Photo, twelve
  minutes in. Open"); a pin whose moments lie more than ten walked minutes apart the span ("A photo and a note, from
  the start to fifty-eight minutes in. Open"); a pin no walk clock holds (Chronicle's map, the ready screen, memory
  pins, moments of two walks on a day, a moment outside a walk) the part of the day of its first moment ("A photo and
  a note, Tuesday evening. Open"; "Memories: a photo and a note, Tuesday evening"). So the amended examples of QL26,
  NY10 and RB7 take the time too (RB7's "A photo and a note, twelve minutes in, reminder set. Open"), and MR2's memory
  pin its part of the day. `.claude/rules/map.md` has a "When a pin says it" bullet, which supersedes the "kinds
  alone" cases in the T14 bullet above it, and `.claude/rules/memories.md` a "Since `tend map T28`" line.
  Since the T28 review (`tend map audit 27`-`30`; the owner's answers in decision 0165): a pin whose moments fall on
  different days says the span of their days ("Memories: a photo and a note, from three weeks ago to Tuesday
  evening. Open"); on a map of several walks every pin says its part of the day; a span under an hour shares its unit
  ("from twelve to fifty minutes in"). And `.claude/rules/map.md`'s "A pin of several moments" bullet and its
  sub-bullet (l.153-163: "without it (Chronicle's map, memory pins, moments of two walks) the name says the kinds
  alone", "says its kinds alone (`tend map audit 19`)", `pinInto`, now deleted) contradict the "When a pin says it"
  bullet under them (the T28 review's auditor 5): reword them when you amend the specs; the loop rewords no rule line.
- **QL11's and the map rule's words after T17** (Nov 13; decision 0154): QL11 in the quality-of-life doc (mirrored in
  `specs/quality-of-life/spec.md`) says "Denied location shows the error banner a moment's placement shows"; since
  `tend map T17` a refused location is the quiet notice (the cream banner, its text the dark brown `#6b4500`, no
  alert), "Location is off for this site.
  Turn it on in the browser's settings to see where you are." on the web, and with no fix and no tiles drawn Navigate and
  Explore show no scale bar. Amend QL11 to say so, in the doc and the mirror; the loop may not edit a spec. Decision 0154
  calls T17's words "the words the recorder's start uses", which they never were: the web recorder's start says "Location
  permission was denied. Allow location for this site in the browser settings, then try again." (`recorder/index.web.ts`),
  Locate's old line. So `.claude/rules/map.md`'s "Denied says what the recorder's start says" (the Locate line) is no
  longer true on the web until the inbox entry "Walk: Start refused still reads as a fault" is answered; the loop
  rewords no rule line.
  QL5 is amended too (the T17 review's F2): it says "Every map shows a scale bar in its bottom-left corner"; since
  `tend map T17` Navigate and Explore show none with no fix and no tiles drawn. Amend QL5 beside QL11, in the doc and
  the mirror, so a sweep does not read the hidden bar as a regression; decision 0154's header names neither.
  True again on the web since `tend recording T26` (the owner's yes, Nov 13; decision 0162): Start, refused, reads its
  line from `locate/notice.ts` beside Locate's, "Location is off for this site. Turn it on in the browser's settings to
  record a walk.", as the same quiet notice on the ready screen and in the walk's "Not recording" notice. So QL19 and
  the map rule's "Denied says what the recorder's start says" hold on the web again, the two lines sharing their
  beginning and each its own end. QL11's and QL5's wording still wait for your edit.
- **Since Nov 13, 2026 (decision 0156): the record gate is on `main`.** Agents change `docs/STATUS.md`,
  `docs/DEFERRED.md` and `docs/NATIVE_UNVERIFIED.md` only through `npm run records -- <op>`, and CI replays every
  agent commit (a `Claude-Session:` or `Co-Authored-By: Claude` trailer); your own hand edits are not gated. A
  session that was in flight merges `origin/main` (on a conflict in these three, `npm run records -- redo` takes
  main's side, and the session files its entries again after the merge); a hand edit it commits after that, or one
  made before and rebased on, is refused by name with its fix (`.claude/skills/ship.md`, "The record documents").
- **QL2's wording after T16** (Nov 12; decision 0154): the quality-of-life doc (mirrored in
  `specs/quality-of-life/spec.md`) says the end marker is "a white disc with a thick ring in the walked orange"; since
  `tend map T16` it is solid, a disc filled in the walked colour with a white ring, the start still hollow. Amend QL2 to
  "a disc filled in the walked colour with a white ring, so shape, not colour alone, tells it from the start", in the
  doc and the mirror; the loop may not edit a spec. `.claude/rules/map.md` l.119-121 ("a ring in `COLORS.walked`")
  and its Native line ("the `ends` layer's `match` stroke colour") say the old paint; a "Since `tend map T16`" line
  under the first says what is true. The loop rewords no rule line. Two records say it too (the T16 review's F4):
  `docs/NATIVE_UNVERIFIED.md`'s first Quality of life check ("with the `match` stroke colour"; an indented note under
  it points to the next check), and T22 above ("QL2's end ring ('in the walked orange') takes it too": since T16 the
  end is a fill, which takes it the same way).
  Since `tend map T25` (Nov 13; decision 0162): the end is a bullseye, a walked centre, a white band and a walked
  outer ring with a thin white edge, as wide as the start (22 px); the start and the walker's dot are unchanged. Amend
  QL2 instead to "a bullseye in the walked colour (a walked centre, a white band, a walked outer ring), so shape, not
  colour alone, tells it from the start and from the walker's dot", in the doc and the mirror. `.claude/rules/map.md`
  has a "Since `tend map T25`" line under the T16 one, whose "the end solid" now says the old paint, as does
  `docs/NATIVE_UNVERIFIED.md`'s T16 check (noted there).
- **The map's rule lines after `/tend map`** (Nov 12): `.claude/rules/map.md` says "`fitBounds` keeps the current
  bearing in maplibre; never pass a bearing to a follow or a fit" (l.68), but maplibre-gl 6's fit turns the map to
  north unless given one; since `tend map 2` the web's fit passes the map's own bearing, and since `tend map audit 4`
  north while the compass's ease runs. Reword it to "a fit keeps the bearing the map has (the web passes
  `map.getBearing()`, or 0 while the compass turns it north; maplibre's default is north); never a fixed one".
  Its scale-bar line says the walk screen's map "bottom edge is the strip's top", but the live walk's runs under the
  strip (`mapEndsAtStrip: false`, `walk.tsx`; only the ready screen's ends there). And it has no line yet for two
  things this run shipped: only a map given `onBearingChange` (one with a compass) turns (`tend map 1`), and the credits
  (i) sit beside the scale bar on every map but Chronicle's, with a 44 px target (`creditsAt`, `tend map 3`); opened,
  the box starts at `openLeft`, clear of a 44 px control over the scale bar, keeps the (i) on its bottom row and says so
  through `onCreditsOpen` (`tend map audit 1`, `2`); and a trap: `window.__turn` turns the map mounted last, which on
  Explore can be another screen's, so a journey turns Explore with two real touches. The loop rewords no rule line, and
  adds none to a file its commits cite.
- **QL8's and QL11's wording** (Nov 12; `/tend map`): QL8 says the scale bar "reads at AA: ink text on a white pill,
  like the status chips"; the owner chose a white halo with no background (Nov 4, `ScaleBar.tsx`). QL11 says Locate is
  "disabled" while it reads the fix; since `tend map 5` it is not `disabled` (a disabled button loses the keyboard's
  focus): a press while busy does nothing, and it says busy (`aria-busy`). Amend both in the quality-of-life doc and its mirror; the loop may not edit a spec.
- **ME23's wording after T12** (Nov 12): `specs/media-editing/spec.md` ME23 says every place offers Edit for 6 seconds;
  since `tend tabs T12` (decision 0149) the recording bar's offer is a pill above the bar that waits for Edit, Close or
  the next capture (or the tabs leaving the screen). Amend ME23 with "Amended (owner, Nov 12, decision 0149): on the
  recording bar, a pill above it that waits", in the doc and the mirror; the loop may not edit a spec.
- **Chronicle's empty peek after T10** (Nov 12; the T10 review's F4): decision 0148 amends 0050, but three texts still
  say the old peek. `docs/decisions/0050-chronicle-peek.md` line 3 has no "Amended by [0148](0148-the-empty-peek-one-way-and-a-true-line.md)"
  (as 0030's names 0082); `specs/v0.5-places/spec.md` criterion 19 wants an "Amended (owner, Nov 12, decision 0148): with
  a walk open and none finished, the line is 'This walk is starred here when it ends'" (as criterion 25's); and
  `.claude/rules/tabs-and-home.md` lines 123-125 state U7 in the present tense (a "Since T10" line under them says
  what is true). The loop edits no decision record, no spec and no rule line already there.
- **Community parks' wording after T9** (Nov 12; the T9 review's F4, F5): `specs/presence-readers/spec.md` line 26 (the
  read-past "stays only in the step that makes a museum historic"), line 30 and PS3 (parkKind asks `notableName`), and
  `specs/community-parks/spec.md` PC2 (lists "Heritage" as a keeping word; any `notable.json` word keeps a park). Since
  `tend explore T9` and `audit 1`, community parks reads presence's `notableName` past a neighbourhood's "Old
  Town/City/Quarter/Village" or "old and new" only just before a community word, and "heritage" keeps no park. Amend PS3,
  the Decisions line and PC2 to say so (and PS8: one listed change, Heritage Park Playground); the loop may not edit a spec.
  `.claude/rules/explore-and-discovery.md` lines 22 and 253 name `a9.p2` and the a9 carry (now `a10.p2`, carrying `a10.p1`),
  line 196 names `notableName` without the read-past: reword them in the split of that file (its [loop] item in
  `docs/DEFERRED.md`, "Explore and discovery"); the loop may not reword a rule line and the file has no room for one.
- **SB3's wording after T6** (Nov 11): `specs/section-bar/spec.md` SB3 says "the bar's Walks still does not, as
  before"; since T6 (decision 0141) it zooms out as the sheet's does. Amend SB3 to "the walks list's zoom-out (0054),
  by either Walks, from the sheet at rest, and once as the map mounts on Walks" and point it to `tend chronicle T6`
  and `tend chronicle T7` (decision 0142); the loop may not edit a spec.
- **NV9's wording after 0048** (Nov 11): `specs/navigation-and-tabs/spec.md` NV9 says the recording bar "has no Stop";
  decision 0048 gave it a held Stop (`bar-stop`). Amend NV9 to "It has a held Stop (decision 0048)", in the doc and the mirror;
  the loop may not edit a spec.
- **QL23's wording after T1** (Nov 11): the quality-of-life doc (mirrored in `specs/quality-of-life/spec.md`) says "an
  empty title becomes the suggested one"; the build now stores no title for an empty one or the suggestion kept as it
  was, shown as the suggestion. Amend the doc to "an empty title, or the suggestion unchanged, is no title, shown as
  the suggested one", and the mirror with it; the loop may not edit a spec.
- **Explore, a neighborhood past its town's reach** (fix explore-town-scope audit 3, decision 0126): answered by Whole towns (decision 0132, shipped Nov 11): a town's page takes every neighborhood inside its border.
- **History reads thin in a city** (Whole towns, Nov 11): Allentown's map has 122 history places and 2 count, because AG1 counts worship and memorials only with a notable word in their name. Keep the rule, or widen it?

- **VISION.md and the Explore carousel:** decision 0124 (the row of cards; it supersedes 0066's grid and 0092's swipe and amends 0034's names on the map only) is not yet in the page's Precedents, and 0034's row does not mention the amendment. The page is yours to edit.
- **The vision review of Nov 10** (`0a254ba` to `b7b28c2`, 260 commits; no breach, every change serves a verb):
  1. **The page trails its decisions (drift):** the Shapes rows "Suggested routes" and "Several routes … Apple Maps
     style | out" against the scenic rows (0095) and the planner's three routes (0102, 0106); line 88's [proposed] and
     open question 1, which 0104 answered; Precedents rows missing for 0098, 0102, 0104, 0105, 0106 and 0122. Amend?
  2. **Public data read by tile** (the map, Overture, the places archive, now live): should the page say that a read
     carrying no identifier is not data leaving the device, with `ALLOWED_HOSTS` as the list? Only 0103 says it now.
  3. **"Viewpoints and attractions":** "attraction" is a draw on visitors, the nearest word to the Never on popularity;
     keep it, or "Viewpoints & oddities" at both levels?
  4. **The accent at launch:** "A year ago today" and "Relive it" carry the accent on the screen the app opens on,
     while capture is plain ink (also the "Thread" labels and MomentCard's play button). Muted ink and a secondary
     button?
  5. ~~**"Placing your walks (N of M)"**~~: answered Nov 11 (decision 0137): no cover, no count; walks are placed in
     the background and the walk at hand says "Placing…" on its row.
  6. **Open question 5**, "nothing is ever calculated for you", against resurfacing and suggested threads (0098):
     where is the line?
  - Note: the commits `2a00092` and `29dac68` cite decisions 0112 and 0121 for the plain labels; the record is 0122.

- **Remarkable and public in chronicles-data:** built on its `claude/gallant-maxwell-hp14jb` (RD1-RD14) and merged with the app's contract v2. Run the weekly build by hand once (Actions, "Weekly places build", Run workflow): until it publishes a v2 archive, the live v1 archive's `heritage_building` places (the Landmark buildings) are not shown by the app, which now reads v2's `building_structure`. The first run is also the first real OSM fetch; its `report` artifact is your review.
- **VISION.md and scenic routes:** decision 0095 proposes amending the Shapes rows "Suggested routes" and "Several routes to one point, Apple Maps style" to fit the row per leaning you kept at the gate (Nov 5); only you edit the page.
- **The vision's open questions** (`docs/VISION.md`, decision 0094): likeness made by you or suggested; voice
  memos searchable on the phone only; the cloud as a mirror or a place where work happens; browse standard, dwell
  diegetic; where "nothing is calculated for you" ends. The found tally (open question 6) is answered: removed (decision 0099),
  and the page's question waits on your edit. Lines marked [proposed] on the page wait on these.
- **Functional core, next:** the walk screen's fog refresh moves to a shell (the first shell, and the rules for shells with it).
- **The web and native stores disagree** in five places the Db contract found (`docs/DEFERRED.md`, Functional core): which side is right, per case.
- **`WALKED_THRESHOLD` (0.5)** in snapping is "still an open product decision"
  (AGENTS.md, Streets, fog and snapping).
- **Two things are named Explore:** the tab and the walk's mode (AGENTS.md,
  Positioning, "Open (in the doc)").
- **The replay's "Passed ... without stopping" low:** whether it stays (now in
  words, U13).
- **What the Explore tab lists in a city** where AllTrails lists trails.
- **The device milestone:** native has never run on a phone. The concept doc's
  first milestone, a pocketed walk whose trace survives the screen being off, is
  open; every "Native (unverified on a device)" list in AGENTS.md waits on it.
- **`foundation`:** keep as history or delete; its `docs/concept.md` is the
  only copy of the concept in the repo.
- **Branch clean-up:** nine branches are merged and five superseded (see the
  table); deleting them is the owner's call.
- **The rest of Quality of life**
  (QL13+, in the owner's order: units, time left, a Settings link when location is
  denied, renaming a walk, editing a note, thumbnails on pins, month headers,
  keep awake, GPX export, the current street chip, dark mode): when, and which next.

- **The Navigation & tabs doc** (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7)
  still says NV2 opens on Navigate and NV5's paths are `/` Navigate and
  `/explore`. The mirror (`specs/navigation-and-tabs/spec.md`) has the owner's
  Nov 3 call (0070); the doc needs the same edit.

## In flight

Other sessions edit this table. Add a row when you start a slice (session title,
branch, what you are doing); remove it when the branch is merged or abandoned,
and move its row to Branches with a disposition. Pre-filled from the branches
active on 2026-11-02 and 2026-11-03 and the session list of 2026-11-03.

| Session | Branch | Doing |
|---|---|---|
| Smooth neighborhood switches (a switch redraws nothing it already showed: the outline kept and derived after the settle, unchanged Busy lines never resent, the names sent once at the settle, lines held on a town's page, markers not rebuilt, a cut read retried; SS1-SS10, after Explore in a dense city) | `claude/trusting-cannon-f5wdhg` | built 2026-11-13, test-first by history (10 of 10): unit tests (2344), typecheck, lint, docs and vision checks; the `switches` journey (at 4x CPU each switch paired with the camera alone's move) and the 16 journeys `check:affected` names pass on the merged build; steward read (S1-S3 accepted); UI review: U1 fixed, then superseded by main's fix carousel-height on the merge; SS9 amended on the owner's call (decision 0166); native unverified; not audited; merged to main and deployed 2026-11-14 (`4e9a496`, Pages run 254; the live bundle carries the slice). Late border fixed on the way (`readerTook`; the dense journey's DC17 now zooms on the selected area). Spec `specs/smooth-switches/spec.md` |
| Voice trim (a voice memo trimmed with start and end handles, as data on the untouched recording; Edit in the viewer; the kept part plays everywhere, its length said in words; VT1-VT12, decision 0090) | `claude/upbeat-gates-s6xy90` | built 2026-11-12, test-first by intent, the owner waived `check:test-first` for it (6 of 11 criteria report todo-before-real: the unit tests' todos used a constant the history check does not read; VT7 is device-only): unit tests (2072), typecheck, lint, docs and vision checks; the `voicetrim` journey and the nine journeys `check:affected` named (edit, notepage, qol, replay, responses, resurface, stacks, threads, walk) pass on the web build; a first sweep failed on a build whose map worker was missing (`npm ci --ignore-scripts` skipped `copy-maplibre-worker.js`), so it is not the slice's; steward read once (6 findings, triaged in the plan); native unverified; audited 2026-11-13 at the owner's request (12 findings: 6 fixed, 2 deferred, 4 rejected; tests `voice-trim audit 1-4, 9, 10`; the UI review before it: `voice-trim ui 1, 3` fixed, `ui 4, 6` guards); spec `specs/voice-trim/spec.md` |
| Video thumbnails (a video's still where its kept part starts, in every preview under a play mark: the gallery, Memories, a walk's memory preview, a one-video pin, the replay's pile; a web exception for the frame; VS1-VS9) | `claude/intelligent-galileo-4ptpyf` | built 2026-11-13, test-first by history (9 of 9): unit tests (2140), typecheck, lint, docs and vision checks; the `videothumbs` journey (14 checks, green four runs in a row) and the eleven journeys `check:affected` names pass; steward read (S1-S4 accepted); UI review (decision 0145): 5 findings, 3 fixed (`video-thumbnails ui 1, 3, 4`), 1 deferred (U1, older), 1 rejected; audited 2026-11-13 at the owner's request (13 findings: 9 fixed, tests `video-thumbnails audit 1-9`; 2 deferred; 2 rejected); merged with main (its ids renamed VS1-VS9, voice trim holding VT; `RENAMED` in scripts/features.js), 2323 unit tests, and twelve of the thirteen journeys `check:affected` names pass on the /chronicles build; `voicetrim` fails on main too (a test id the journal page dropped; DEFERRED); native unverified; merged to main on the owner's go-ahead (Nov 13, `b67935a`); its Pages run (243) was refused by the record gate (decision 0156): the merge's documents and one commit after it were hand-edited, mine; the fix-forward set this row through `npm run records` (`d5cab8b`); deployed by Pages run 244 (Nov 13), live check done (a video recorded on the live site gets its still under the play mark in Media). Spec `specs/video-thumbnails/spec.md` |
| Neighborhood boundaries (real Overture neighborhood shapes replace the 800 m ring and the 1 km nearest-point placement; a nearest-point share where a town has none; one rule draws and places; HB1-HB16) | `claude/elegant-brahmagupta-ficipi` | built 2026-11-12, test-first by history (16 of 16): HB1-HB16 and the `outlines` journey's HB9/HB10 checks; steward read twice; audited at the owner's request (12 accepted, 1 rejected, 2 deferred, 5 questions for the owner; tests `neighborhood-boundaries audit 1-9, 11-13`); native unverified (the ground line layer, SQLite migration 26); not merged or deployed; spec `specs/neighborhood-boundaries/spec.md` |
| Note pages (a note is a journal entry in Apple Journal's manner: the pencil opens its page, TipTap through Expo DOM, Aa Format and @ and a camera above the keyboard, kept as it is written, older notes literal; NP1-NP14, decision 0151) | `claude/blissful-ptolemy-o3q79x` | built 2026-11-12, test-first by history (14 of 14): unit tests, typecheck, lint, docs and vision checks; the `notepage` journey and the 30 journeys `check:affected` named pass on the web build (one batch on the first build, then the twelve the audit's fixes touched, once, on the final build; `notepage` ran nine times in all while the audit's checks were written, its NP9 Undo check failing once); audited at the owner's request (27 findings: 20 fixed, two in part; 3 deferred; 4 merged; `note-pages audit N`); native unverified (a WebView editor never run on a phone); merged with main (decision renumbered 0151) and deployed 2026-11-12 (`92f021c`, Pages run 222; the live page opens the note page from Memories' pencil); spec `specs/note-pages/spec.md` |
| Community parks and the kind pipeline (Parks gets a subset, "Community parks", the reader can switch off: a park whose name says playground or the like with nothing notable in or near it; size never demotes; never described; built as the first entry of a registry of pure refinements, kinds know their parent so a parent switch hides its children; PC1-PC23, decisions 0143, 0144) | `claude/confident-mendel-gf0ck0` | built 2026-11-11, test-first by history (23 of 23): unit tests, typecheck, lint, layers; merged with main (presence); the journeys `check:affected` names pass on the web build (marks, with its new PC6 check, atlas, grading, curiosities, outlines, replay, nudge) except `scenic`, whose check "fix preview-clutter audit 1" (the trace drawn again as the preview closes) fails the same way on `origin/main` (3 of 3 runs of `e2e:baseline`), so it is main's, not this slice's; steward read once (10 findings, triaged in the plan); the sub-path build passes marks, atlas, grading, curiosities, outlines, chronicle, replay, scenic and nudge, where nudge's PA2 counted the double-tap's taps at the instant the first "?" showed and read 1 when its 1 s poll fell between the two (about 150 ms apart): it now counts after the pair, 8 of 8 runs; native unverified; not audited (decision 0074); spec `specs/community-parks/spec.md` |
| Complexes (a named, bounded place made of other places: a mall, a market, a campus, a station, a civic centre; on Explore's area card and map and in a moment's arrival line; information only; CX1-CX16, decision 0147) | `claude/affectionate-hawking-3geuox` | built 2026-11-11, test-first by history (16 of 16): unit tests (1894), typecheck, lint, docs and vision checks; the `complexes` journey and the 24 journeys `check:affected` names pass on the /chronicles build (`nudge` once flaky, 3 of 3 on main); the owner's calls: all five kinds from building type, nearest first with See more, the derived `complex` store; steward read and accepted; audited 2026-11-12 (29 findings: 18 fixed, 1 in part, 2 duplicates, 5 deferred, 3 rejected, 1 to the owner; tests `complexes audit 1-28`); deployed 2026-11-11 (main `820957a`, Pages run 215), the audit's fixes not yet deployed; native unverified; spec `specs/complexes/spec.md` |
| Media gallery (Chronicle's fifth section: every photo, video and memo in an edge-to-edge grid under pinned day headers; Years, Months, Days; Sort, Show, Zoom and pinch, Square or Aspect; MG1-MG22, decision 0139) | `claude/intelligent-galileo-4ptpyf` | built 2026-11-11, test-first by history (22 of 22): unit tests (1814), typecheck, lint, docs and vision checks; the eleven journeys `check:affected` names (gallery, capturehome, chronicle, edit, qol, responses, resurface, stacks, tabs, threads, walk) pass on the /chronicles build, `resurface` run twice (its RM1 check counted four sections; now five); steward read twice (S1-S14 accepted); merged with main and deployed 2026-11-11 (`498e412`, Pages run 43050937634, the live page shows Media); not audited (decision 0074); native unverified. Video thumbnails are the next slice (the owner, Nov 11); spec `specs/media-gallery/spec.md` |
| Response thread (a moment's responses in a sheet over the viewer; RT1-RT14, decision 0131) | `claude/elegant-cannon-gs9yrk` | built 2026-11-11: RT1-RT14 tested first (unit and the `responses` journey), typecheck, lint, 1741 unit tests; the nine journeys `check:affected` names pass on the /chronicles build; deployed 2026-11-11 (`9ed9a15`, Pages run 42957716629); not audited; native unverified; spec `specs/response-thread/spec.md` |
| Presence and kinds (a museum the data calls historic lights History too, the bars kept apart; routes from a bar lean on places you pass; a Community spaces kind; the needsOpen gate measured; PK1-PK19, after the Coplay Kilns diagnosis) | `claude/dazzling-fermat-ws5c6a` | built 2026-11-10, test-first by history (19 of 19): PK1-PK19 pass (1715 unit tests with main's, merged at `0f3f216`); typecheck, lint, docs and vision checks clean; journeys atlas, curiosities, grading, marks, nudge, outlines, planner, replay pass, and scenic on the merged tree (its one failure before the merge was the old base's, passing 3 of 3 on main); audited 2026-11-11 at the owner's request (14 findings: 8 fixed, one in part, two at the owner's call (the icons); 3 deferred; 3 rejected, one at the owner's call (the label kept); tests `presence-and-kinds audit 1-3, 5, 6, 8, 10, 13`); nothing native new; not merged or deployed. For the owner: the live places archive is still v1, so the Kilns show only once a v2 archive publishes; decision 0127. Spec `specs/presence-and-kinds/spec.md` |
| Explore carousel: a row of area cards under a full-height map; the selected area highlighted and the only one named; a map swipe steps the row (EC1-EC20, decision 0124) | `claude/keen-maxwell-5rxhkx` | built 2026-11-10, test-first by intent (the first commit's todos were in a form the history check does not read: 9 of 20 criteria report "real before todo"); EC1-EC20 tested (1503 unit tests; journeys carousel, snap, atlas, grading, marks, outlines, layers, walkability, qol, tabs, launch, planner pass; `chronicle` and `atlas` pass but the walk journey's video-pin check, a timing check, fails now and then); audited 2026-11-10 (16 findings: 9 fixed, 2 deferred, 3 rejected, 1 for the owner, 1 in part); not deployed; native unverified. Spec `specs/explore-carousel/spec.md` |
| Places worth the stop (curiosities and the places archive, PW1-PW19, decision 0103) | `claude/places-archive`, merged to main 2026-11-09 (`339caf7`) | shipped 2026-11-09, live from 2026-11-10 (PW16 recorded, the address set); built 2026-11-06: PW1-PW19 tested (1399 unit tests with main's; journeys curiosities, marks, atlas); audited (10 findings: 7 fixed, the rest deferred). Its tests came with the code; on Nov 9 the owner had the branch rebuilt from `claude/places-archive-decision` with the todos committed first, so the history's test-first order was made after the code was written. Live since PW16 (Nov 10). |
| Places pipeline, slice 1: the frame with Wikidata behind it (PP1-PP17, decision 0108) | `claude/places-pipeline-frame` here (the app's side: block tags, PP13; PP16; the pinned contract, PP17), with chronicles-data's `claude/places-pipeline-contract` (the pipeline, its contract, tests and docs); merge both together | built 2026-11-09, test-first by history; the pipeline moved to chronicles-data the same day (the owner's call); no audit yet; native unverified (PP13's device check). Old branches to delete: `claude/places-pipeline` in both repos |
| Storage awareness (the room left said in words beside the captures before it loses a moment; a failed save kept for Retry; the web asks to be kept; SA1-SA10, decision 0107) | `claude/quirky-ramanujan-5z25ga` | built 2026-11-09: SA1-SA10 tested first (1421 unit tests; the `space` journey and the twelve it touches, `ready`, `walk`, `edit`, `days`, `tabs`, `reload`, `hidden`, `gaps`, `layers`, `marks`, `headsup`, `walkability`, pass); steward read accepted whole (7 findings); native unverified; not audited (decision 0074) |
| Wikidata changes first in the places pipeline (from the staged places build, SB3, SB4, SB8, SB11, SB12, decision 0120): the weekly fetch asks only what changed since the last run, a safety sweep of one cell in thirteen, a rebuild with no fetch when the edits change | `claude/youthful-einstein-go1xie` (decisions, the app's notes) and chronicles-data `main` (the pipeline) | built 2026-11-10 on chronicles-data's `claude/youthful-einstein-go1xie` (CF1-CF6, 31 tests passing, typecheck and contract check clean); not merged to its `main`, which runs the weekly job and Pages: the owner's call. The first real run sweeps every cell; never yet run against the query service |
| Moment stacks, rounds 0-2 (a moment holds its media; Add to this moment; Split out; the replay's grid; Group captures; MT1-MT11, MS1-MS21, decision 0123) | `claude/wizardly-mayer-k9vmge`, merged with main and deployed 2026-11-10 | shipped: 1660 unit tests, typecheck, lint, test-first (11/11, 21/21) and the 29 journeys `check:affected` names pass on the /chronicles build (the walk check on a video's pin now held to the pins' reach); main's own walk journey had failed at NV23 before the merge; not audited (decision 0074); native unverified |
| Bug fixes (open since Oct 31) | unknown | unknown |
| Memories in context and under your control (MC1-MC16: place, time of day and minutes in; Hidden, a switch, Forget; Lately newest first) | `claude/memories-context` | built 2026-11-05: unit tests, typecheck, lint and the `resurface` e2e pass; spec `specs/memories-context/spec.md`; native unverified; audited 2026-11-05 (24 findings: 23 fixed, one in part; 1 rejected) |
| Resurfaced moments (Chronicle opens on Memories, RM1-RM25, decision 0098) | `claude/resurfaced-moments-spec`, merged to main 2026-11-05 (`aac7d9d`) | shipped 2026-11-05: unit tests, typecheck, lint and the e2e journeys `resurface`, `chronicle`, `tabs`, `launch`, `qol`, `reload`, `replay`, `walk`, `gaps` pass on the /chronicles build; Pages run 125 succeeded; native unverified; audited 2026-11-05 (16 findings: 12 fixed, 3 deferred, 1 rejected); spec `specs/resurfaced-moments/spec.md` |
| Walk planner (a page of its own for a kind: up to three routes on the map, a loop or one-way, a distance ceiling, density, a feel for the commitment; WP1-WP27, decision 0102) | `claude/walk-planner` | built 2026-11-09; web verified by the e2e `planner` (28 checks, with a walk recording too), unit tests, typecheck and lint green; native unverified (the map's `routeGrades` and `foundPins`, the drawer over a second map, the loop's arrival); audited at the owner's request, 2026-11-09 (21 findings: 20 fixed, 1 deferred to the owner); replaces the kind walk's in-card panel |
| Owner threads (respond to a moment; connect moments across walks as threads the owner makes; OT1-OT24, decision 0104) | `claude/owner-threads-decision` | built 2026-11-06, audited 2026-11-09 (19 findings: 14 fixed in full, 2 in part, 3 deferred; the steward found no breach; deployed 2026-11-09; round 2 the same day: both kinds are Threads, told apart by an icon, OT12/OT25/OT26, decision 0105): unit tests, typecheck, lint and the e2e `threads`, `resurface`, `deletion`, `edit`, `qol`, `walk` pass on the web build; native unverified; spec `specs/owner-threads/spec.md` |
| UI conformance (Undo that waits, deletes that don't ask, a viewer that steps aside, quieter success; UC1-UC13, decisions 0114, 0113) | `claude/ui-conformance` | built 2026-11-10: unit tests, typecheck, lint, the e2e `threads`, `edit`, `qol`, `resurface`, `chronicle`, `deletion`, `memories`, `walk` (see the record for the walk's video step); deployed 2026-11-10 with main merged in; native unverified; audited Nov 10: 31 findings, 24 fixed, 4 duplicates, 1 deferred, 2 rejected; spec `specs/ui-conformance/spec.md` |
| Moment references (a note mentions other moments with @, drawn as cards; RF1-RF8, decision 0125) | `claude/ui-conformance` | built and deployed 2026-11-10: unit tests (1695), typecheck, lint, the `threads` journey; @ in the capture stack's quick note deferred; native unverified; not audited; spec `specs/moment-references/spec.md` |
| Capture from Chronicle (the app opens on Memories; a capture band there, one tap from launch; HC1-HC15, decision 0112) | `claude/eager-fermat-6bcwrd` | built 2026-11-10: HC1-HC15 tested (unit, the `capturehome` journey, `launch`, `reload`); audited 2026-11-10 (13 findings: 11 fixed, 1 deferred, 1 rejected; tests `capture-from-chronicle audit 1-9, 11`); typecheck, lint, `npm test` and every affected journey pass on their latest run; native unverified; not merged or deployed. For the owner: the note editor's placeholder (spec, Audit) |

## Updating this file

- Head and dates: `git fetch origin --prune` (and `git fetch --unshallow` in a
  shallow clone), then `git log -1 --format='%h %ad %s' --date=short origin/main`.
- The branch table, one line per branch:
  ```
  for b in $(git branch -r | grep -v 'origin/main$' | grep -v HEAD); do
    echo "$b | ahead=$(git log --oneline origin/main..$b | wc -l) \
    | last=$(git log -1 --format='%ad %s' --date=short $b) \
    | merged=$(git branch -r --merged origin/main | grep -qx "  $b" && echo yes || echo no) \
    | $(git diff --stat origin/main...$b | tail -1)"; done
  ```
  `git cherry origin/main <branch>` tells a superseded branch (every commit
  `-`, already on main by patch) from one with real work (`+`).
- Slice status: the spec tabs' numbered criteria against `git log --grep` for
  their prefixes (QL, NB, G, M, R, D, U, NV, MO), and AGENTS.md's "After the
  audit" / "Audited" lines for the audited column.
- Needs the owner: AGENTS.md's "Open (in the doc)", "open product decision",
  "Deferred" and "the owner's call" lines, plus any branch whose session ended on
  a question.

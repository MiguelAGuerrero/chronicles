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
| Explorer App Concept (v0: record, capture, replay, storage; round 3) | shipped | `7cf5ab1` 2026-10-31 round 3; `565b244` 2026-10-31 | `specs/concept/spec.md` | yes (two audit rounds `7936f48`, `ce6dd26`; round-3 audit `712fdf8`) |
| v0.5: memory and places (areas, the home map, navigate) | shipped (AGENTS.md's "in progress" is stale) | `9abcea3` 2026-10-31 navigate audit fixes; `f522c2d` 2026-10-31 walk me back | `specs/v0.5-places/spec.md` | yes (`5581fa7`, `2c98466`, `9abcea3`) |
| v1: discovery (places, Explore, Remind me here, notifications) | shipped (AGENTS.md's "in progress" is stale) | `ddf9cf9` 2026-11-01 Explore audit fixes; `df7ffa7` 2026-11-01 notifications; `bf310ea` 2026-11-02 | `specs/v1-discovery/spec.md` | yes (`ddf9cf9`, `6cca86f`, `b9ba5c0`) |
| v1.5: landing (What's good here, on the walk) | shipped; L10, L13, L16 retired by Explore | `2372244` 2026-10-31 slice 3 audit fixes; `fe365ab` 2026-10-31 | `specs/v1.5-landing/spec.md` | yes (`819d02f`, `2372244`) |
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
| Presence readers: the archive, bars, notable names, greens and the planner read presence's classes (a place carries its classes, never stored; `recorded` and `historic_name` judged by curation; History beside a category only from `historic`; nothing a person sees changes, held by golden tables; PS1-PS11, decision 0140; the second of two slices) | shipped 2026-11-11 by `/tend inbox G4 yes` (unit tests, typecheck, lint; e2e `atlas`, `curiosities`; native untouched) | from G4, branch `tend/inbox-20261111-1904` | `specs/presence-readers/spec.md` (repo first) | review in the `/tend` run |

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

### From /tend

Nothing open.

### From /fix

- **[owner] Process: a slice that changes a screen is not done until its pictures are reviewed, with long text** (2026-11-11)
  From: fix gallery-header (the media gallery's day header cut its title on the owner's iPhone, a day after it shipped).
  Missed because: the slice's fixtures had only short place lines, so no header wrapped; its screenshots were taken
  but the `ux-reviewer` only runs inside `/audit`, which runs only when the owner asks (decision 0074), and the media
  gallery was shipped unaudited; no check tied a fixed row height to the text it holds. Recommended: (1) `/slice`
  step 9 runs the `ux-reviewer` on the slice's own shots (report-only, a few minutes) whenever it changes a screen,
  audit or not; (2) a journey that draws text in a fixed box seeds the longest text it can meet and checks nothing is
  cut (as the gallery journey now does). Otherwise: keep 0074 as it is and ask for `/audit` on each screen slice.

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

- **G4 [M] Presence, its second slice: the archive, bars, notable names, greens and the planner read classes** (2026-11-11) · Earn · aligned · decision 0140
  Area: explore, places, scenic routes, walk planner. From: G3, whose first slice shipped Nov 11 (specs/presence, PR1-PR8); decision 0140's
  "consumers read its classes, never source tags".
  Touches: decisions 0127 (a place may light two bars: from its classes), 0103 and 0108 (the archive's classes are chronicles-data's
  contract; the app maps them into presence, the contract is unchanged), 0109 (Overture never makes a mark).
  The slice: 1. The places archive's classes map into presence classes; `archivePois.ts` holds no category or kind of its own.
  2. A place may carry several classes (a museum the data calls historic: museum and history), and `barsOf` reads them, so a second bar
  comes from classes, not from `alsoBars` and a name. 3. Whether a name is notable is decided once, for marks and bars alike. 4. Scenic
  routes' greens read presence classes from landcover features, not raw tags. 5. The planner reads classes. 6. The same place is a mark
  or not alike from the tiles and the archive (a plain-named memorial, presence review F3). 7. PR2's guard holds with no exception left.
  8. Nothing else a person sees changes, held by golden tables of the archive's classes and the bars, captured first.
  Payoff: one place to refine what a street holds, and Storefronts (G2) then reads one answer everywhere. Cost: M, about eight modules and
  their tests, no native code, no stored field. Reopens: explore, places, scenic routes, walk planner. After it: G2, then new kinds of
  presence (institutions, rural activity) as classes.
  Instead: build G2 now on what shipped (density already reads presence's classes) and leave the rest.

### Last tend

**Nov 11, `/tend inbox T7 yes`** (from `4e138f2`). T7 built, decision 0142: a map that mounts on Walks (the bar's Walks
from Memories or Media) zooms out once, by 0054's rule, when a place walked is out of the kept view; a read that frames
the places itself needs none, and Days and Map mount as before. Commits: `tend chronicle T7` (the mount's zoom-out, in
`ChronicleMap`; the chronicle journey checks one fit from Memories with the star dragged away, none from Media with it
in view, pictured before and after) and `tend chronicle audit 1` (the review: the zoom-out frames only the walks shown,
never one deleted while its Undo waits; `shownPlaces`). T7 leaves the inbox; nothing filed. The balance: unchanged by an
inbox run (outgrowing its base: four areas rough). Not run: the journeys `capturehome`, `qol` and `tabs`, reached but
holding no check on the change. Nothing here has run on a phone.

### Open before the loop

- **SB3's wording after T6** (Nov 11): `specs/section-bar/spec.md` SB3 says "the bar's Walks still does not, as
  before"; since T6 (decision 0141) it zooms out as the sheet's does. Amend SB3 to "the walks list's zoom-out (0054),
  by either Walks, from the sheet at rest, and once as the map mounts on Walks" and point it to `tend chronicle T6`
  and `tend chronicle T7` (decision 0142); the loop may not edit a spec.
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

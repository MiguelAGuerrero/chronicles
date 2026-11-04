# Chronicles: where the work stands

The state of the work: which slices are shipped, in progress or queued, what
every branch holds and what is waiting on the owner. Update it at the start and
end of every slice, and whenever a branch is opened, merged or abandoned. For
what the app is, read `docs/PRODUCT.md`; for the decisions behind it, `AGENTS.md`.

- **As of:** 2026-11-04
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
| Places worth the stop | queued (no commit on main mentions it) | none | `specs/places-worth-the-stop/spec.md` | no |
| Motion (steps from the phone's sensors, MO1-MO10) | shipped | `09f504a` 2026-11-01; `8edc09b` 2026-11-01 audit fixes; `93ef082` 2026-11-01 | `specs/motion/spec.md` | yes (11 findings, 9 fixed, `8edc09b`) |
| Quality of life | shipped in rounds: QL1-QL12 (markers, scale bar, Locate), QL13-QL21 (km or miles, time left, the denied-location chip and retry), QL22-QL28 (rename later, edit a note, photos on pins, months in the walks list); round 4 waits on the owner's calls (decisions 0063-0065) | round 1 `dc8f249`..`7a34666`; round 2 `1910a2d`, `c7539b1`; round 3 `48adb36`, `3a721ed`, `cdf2961`, `2799fa9`; all 2026-11-03 (branch `docs/product-synopsis`) | `specs/quality-of-life/spec.md` | no (the owner chose checkpoints per feature over an audit pass; an audit is still owed) |
| Navigate, ready (Navigate is the walk screen, ready; the capture stack; the bar pulls up to the settings, NR1-NR13) | shipped (web verified by the e2e; native unverified); the launch follows 0070 (the owner, Nov 4) | branch `claude/navigate-ready`, merged 2026-11-04 | `specs/navigate-ready/spec.md` (repo first; to be copied into the concept doc as a tab) | yes (13 findings, 12 fixed, 1 deferred) |
| Filling gaps (streets walked across a gap in the trace, G1-G14) | shipped | `2a0501e`, `3a08a53`, merged as `28c7417` 2026-11-03 | `specs/filling-gaps/spec.md` | yes (17 findings, 12 fixed, `3a08a53`) |
| Gap drawing (draw a gap's way; a guess that fits the time, GW1-GW8, GT1-GT3) | shipped | branch `claude/gap-drawing`, merged 2026-11-03 | `specs/gap-drawing/spec.md` | yes (14 findings, 11 fixed, 3 deferred) |
| Reminder bell (a pin with a reminder wears a bell, RB1-RB7, decision 0078) | shipped (web verified by the e2e; native unverified) | branch `claude/reminder-bell`, 2026-11-04 | `specs/reminder-bell/spec.md` | yes (11 findings: 8 fixed, 1 deferred, 2 rejected) |
| Hidden-page notice (a fix: "Tracing paused … while this page was hidden" only when it was, decision 0072) | shipped (web verified by the e2e `hidden`; native never shows it) | branch `claude/hidden-notice-0072`, 2026-11-03 | none (a local fix after the owner's screenshot; decision 0072) | no (a local fix, not a slice) |
| Town outlines (the town you're in is the border you're inside, Overture's divisions; TO1-TO12, decision 0083) | shipped (web verified by the e2e `outlines`, `marks`, `nudge` on the /chronicles build; native unverified) | branch `claude/town-outlines`, merged 2026-11-04 | `specs/town-outlines/spec.md` (repo first) | no |
| Map credits start closed (a fix: the web map's attribution no longer opens itself across the map's bottom; the (i) button opens it) | shipped (web verified by the e2e `qol`, `map attribution` checks; native's own (i) untouched) | branch `claude/attribution-closed`, 2026-11-04 | none (a local fix after the owner's screenshot) | no (a local fix, not a slice) |
| Navigate drawer lifts by touch (a fix: a finger's drag on the ready bar's handle went to the map beneath; the grip is focusable now; `navigate-ready touch 1`) | shipped (web verified by the e2e `ready`; iOS WebKit not run) | branch `claude/navigate-drawer-touch`, 2026-11-04 | none (a local fix after the owner's screenshot) | no (a local fix, not a slice) |
| Town page fix (a town's tile no longer collapses under its heading; one way back, decision 0077) | shipped (web verified by the e2e; the collapse reproduced in Chromium before the fix) | branch `fix/town-page-tile`, 2026-11-04 | `specs/explore-atlas/spec.md` (AT2's way back) | no (a local fix after the owner's screenshot) |
| Area card as a full-screen drawer (covers the tabs, which fold away; a progressive pull down closes it, from the content only at the top) | built; `tabs`, `ready`, `marks` pass on the sub-path build; its own e2e checks are in the full flow, not yet run; native unverified | branch `area-card-fullscreen-drawer`, 2026-11-04 | `.claude/rules/explore-and-discovery.md` (round 3) | no (a local fix at the owner's request) |
| Bridges and Open in Maps (NB1-NB7, NH1-NH8; NH4 retired) | shipped | `82186db`, `67b7c9d`, `d16c7c4`; `1ead218` retired NH4, all 2026-11-03 | `specs/bridges-and-open-in-maps/spec.md` | yes (bridges: 11 findings, 7 fixed, `67b7c9d`) |
| Explore atlas (the Explore tab as a grid of area tiles, AT1-AT16) | shipped (web verified by the e2e; native unverified); round 2 after the owner's iPhone look: the hierarchy in the grid, the title over the map, tiles in words; round 3, the design review's fixes (decision 0067) | `d1080e7`, `d3158aa`, `18c0feb`, `06726be` 2026-11-03 (branches `explore-atlas`, `explore-atlas-2`) | `specs/explore-atlas/spec.md` (repo first; to be copied into the concept doc as a tab) | yes (14 findings: 11 fixed, 1 partly, 1 deferred, 1 rejected; `d3158aa`) |
| Functional core, slice 1 (layer tags and checks, ports, fakes, the Db contract, typed meta; FC1-FC10) | shipped 2026-11-04 (engineering; no behaviour change; native unverified) | branch commits 2026-11-03 | `specs/functional-core/spec.md` (repo only: not a concept-doc tab) | yes (14 findings: 12 fixed, 1 deferred, 1 fixed in part) |
| Affected checks (run what a change can break: affected tests, lint, typecheck, e2e journeys; AC1-AC11) | shipped 2026-11-04 (engineering; no behaviour change) | branch commits 2026-11-03 | `specs/affected-checks/spec.md` (repo only) | no (decision 0074: audits on the owner's request) |
| Heading cone fix (the cone checked by the trace over 20 m; heading 1-5, decision 0075) | shipped (web verified by the e2e; native unverified) | branch `claude/heading-cone-rebased`, 2026-11-04 | none (a regression fix; criteria in `heading.test.ts`) | no (on request only, decision 0074) |
| Pocket alert nudge (a double-tap as a "?" comes into range; the web too, on a touch screen; PA1-PA6, decision 0079) | shipped 2026-11-04 (web verified by the e2e; native unverified) | branch `claude/pocket-alert-nudge`, squashed onto main 2026-11-04 | `specs/pocket-alert-nudge/spec.md` (repo first; to be copied into the concept doc as a tab) | yes, before 0074 (7 findings: 7 fixed, one in part; 2 parts deferred) |
| Atlas grading (the findable kinds count only findable places; thin rings say nothing; what a mark is; AG1-AG6, decision 0084) | shipped 2026-11-04 (unit tests, typecheck, lint, e2e `grading`, `marks`, `outlines` pass on the sub-path build; native unverified) | branch `claude/atlas-grading`, merged 2026-11-04 | `specs/atlas-grading/spec.md` (repo first; from the research doc https://claude.ai/artifact/KbWci9Guj4XcamTNqow8oC) | no (decision 0074) |
| Activity density (busy streets as graded density of places, OSM + Overture, AD1-AD16) | shipped 2026-11-04 (web verified by the e2e; native unverified) | `829016e` and the audit fixes, 2026-11-04, branch `claude/busy-streets-calculator-accuracy-tk03rr` | `specs/activity-density/spec.md` (repo first) | yes (14 findings, 14 fixed) |
| Compass (the map turns by two fingers; a compass shows while it is and sets north again, CP1-CP8, decision 0082) | shipped 2026-11-04 (web verified by the e2e `qol` and `ready`; native unverified; the live walk's compass slot is not covered by an e2e step) | branch `claude/compass-spec`, 2026-11-04 | `specs/compass/spec.md` (repo first) | no (on request only, decision 0074) |

Not a tab, but tracked: **suggested routes** (interesting ways, route preview,
"Walk this way") are deferred as their own later slice (`749811d` 2026-11-01).
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

## Needs the owner

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
- **Suggested routes** (deferred Nov 1) and the rest of Quality of life
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
| Bug fixes (open since Oct 31) | unknown | unknown |
| Replay rhythm (RR1-RR22, decisions 0085, 0086) | `claude/replay-rhythm` | built test-first; audit round 1: 19 findings, 16 fixed, 1 deferred, 2 rejected; round 2: 10 findings, 9 fixed, 1 in part; round 3: 9 findings, 8 fixed, 1 deferred to the owner; web verified by the e2e (`replay` journey), native unverified; waiting on the owner's review |

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

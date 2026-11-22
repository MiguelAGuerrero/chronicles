<!-- Repo first: from the owner's answers in a session (Nov 19, decision 0234), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). The doc wins once it exists. DRAFT: waits on the owner's review of plan.md. -->

# Modes to layers: no Explore mode, only views and layers the person opens and closes

Nov 19, 2026 · @Miguel Guerrero

## Vision

Idea: "I want to collapse quiet and explore mode and move to just tolerable views and layers that the user can choose to open and close instead of having dedicated modes" (the owner, Nov 19), after the Places layer shipped on Explore's map only and the owner expected it on every map.
Verb: earn (the way, the places and the streets worth noticing are things you open, not a state you are in)
Touches: decision 0031, "A walk starts quiet. Quiet is navigation plus captures: no '?' marks, magenta, strip chip or dead-zone pill" (superseded in part by 0234: the quiet start stays as the default view, the mode goes); decision 0230 (Places on Explore, on by default); ML7 (one saved setting for every map: amended, one per kind of map); Always, "Capture is one tap away" and ML4 (nothing covers the capture stack); Always, "Restraint"; Never, "Tallies" and decision 0132 (found places are not drawn; nothing says what is left to find); decision 0224 (a place passed within a few metres is named in the replay, never counted); decision 0121.
Verdict: aligned if reshaped
Shape: no mode control anywhere; a walk starts with every layer off (as quiet does today); the walk's Layers panel lists Places and Storefronts beside the others, and each draws what Explore mode drew while on; the pocket alert and the "?" range and passing settings are settings, not a mode; the replay names what a walk passed once Places was first on, as it did once Explore was first on.
Precedent: Google Maps (along-the-route pins on request); Komoot (places on the planning map, a quieter recording); AllTrails (map layers chosen before and during a recording). All from memory, unverified; none supports "?" drawn on the move, so that part rests on no precedent (decision 0193).
Criteria: MD1-MD19 (the gate's are MD3, MD4, MD14, MD15 and MD16; the steward's S1-S6 are MD3, MD6-MD10, MD16-MD19).
Open: the defaults in the plan for the owner to overrule (per-walk layers; the replay counting only the spans Places was on; the pocket alert needing Places).

## What it is

Today a walk is either quiet (the way and your captures) or exploring, a switch kept for that walk in `explore_walk`, chosen on the start drawer (Mode: Quiet / Explore) and again in the walk's "This walk" card. Only an exploring walk shows the "?" marks within range, the range ring, the strip chip on a storefront street, the pocket alert and the dead-zone nudge, the "Found:" announcement, and the replay's "passed without stopping" lines (counted from the first time Explore was switched on).

This slice removes the mode. Each piece becomes a layer or a setting the person opens and closes, and a walk starts with every layer off, as quiet does now.

## Decisions (the owner's calls, Nov 19, decision 0234)

- **No dedicated modes.** The mode control on the start drawer and the Explore switch in "This walk" are gone. Each piece of Explore mode is a layer or a setting: the "?" and the range ring are the Places layer; the strip chip is the Storefronts layer's; the pocket alert and the dead-zone nudge are settings in "Reminders and alerts"; Capture here and finding a place work on every walk, as they already do.
- **A walk starts quiet by default.** Every layer is off on the live walk at the start. Places is on by default on Explore's map and the ready map.
- **The saved layers setting is per kind of map.** Explore's map and the ready map share one; the live walk has its own, all off.

## How adjacent apps do it

- **Google Maps** (iOS, Android): while following a route, "Add stop" and a search along the route by category show results as pins on the map, on request, not on by default. Source: `docs/research/adjacent-apps.md`, "Suggest a way on foot", from memory, unverified. **Unverified**.
- **Komoot** (iOS, Android): places along a planned route are highlights on the planning map; the recording map is quieter. Source: from memory, unverified. **Unverified**.
- **AllTrails** (iOS, Android): map layers are chosen on the map before and during a recording; there is no mode for them. Source: from memory, unverified. **Unverified**.

## Acceptance criteria

1. **MD1** The owner's task: "open and close the places on the walk's map, as a layer, instead of switching a mode". On the live walk, the Layers button opens a panel that lists "Places" with its "?" icon and a switch, beside the other layers. Found by someone not told where it is: the Layers button, the panel, the row (a finding criterion, checked in the journey by names and text, never by a test id alone).
2. **MD2** No screen has a mode control or says a walk is quiet or exploring: the Walk settings have no Quiet / Explore choice, "This walk" has no Explore switch, and no text says "quiet walk", "exploring" or "The walk, exploring".
3. **MD3** (Amended by decision 0260, Nov 22: a walk starts with the layers the ready map shows, one setting everywhere; with them off it is quiet as below; `walkLayersRemembered.test.ts`.) A fresh walk starts with every layer off: no "?", no range ring, no strip chip, no tint or line from any layer, as a quiet walk does today. After a walk with Places on, the next walk starts with every layer off again (the steward's S1): the live walk's layers are that walk's own.
4. **MD4** On the live walk with Places on, the "?" for places within the range draw as Explore mode drew them (unnamed; found places not drawn), with the range ring while the drawer is up and the "Found:" announcement on a find; with it off, none of these show.
5. **MD5** On the live walk with Storefronts on, the strip chip shows while you are on a storefront street; with it off, never.
6. **MD6** The "?" range slider and "Passing a place" are in the walk's options always, saved settings as before; the range row says it is for Places (the steward's S6: a saved setting is never unreachable).
7. **MD7** The pocket alert and its nudge fire only while Places is on and the pocket alert setting (in "Reminders and alerts", off by default) is on; the setting's row says in words that it needs Places (the steward's S6).
8. **MD8** A capture finds a place only after "Capture here" on a place's card (decision 0224), and that card is reached from a "?": so a find needs Places on (the steward's S3). With Places off no armed line shows and no capture finds a place; plain capture is unchanged and stays one tap. A capture after arming shows its "Found:" line.
9. **MD9** A walk's replay names what it passed without stopping only within the spans Places was on during that walk (kinds shown as today, minus its own finds, riding names nothing); a walk that never had Places on names none; a toggle after the walk ended adds no line. Replays of walks recorded before this slice are unchanged (the steward's S2).
10. **MD10** (Amended by decision 0260, Nov 22: the live walk shares `map_layers` too; only its Places spans are its own; `walkLayersRemembered.test.ts`.) Explore's map and the ready map share one saved setting, `map_layers`, with Places on by default. The live walk's layers belong to that walk, `walk_layers:<walk>`: every layer off at its start, kept if the walk is resumed after a reload, removed with the walk, never carried to the next walk (the steward's S1). A change on one never changes the other. A setting saved before this slice reads as it did for Explore and the ready map.
11. **MD11** The ready map draws the "?" and the range ring while Places is on, with the range slider where it was; it has no mode control.
12. **MD12** Start, from the ready map or Walk to, writes no `explore_walk` and no `start_mode`, and the walk screen reads neither; rows left from before are unread.
13. **MD13** Every map's Layers panel lists Places: Explore, the ready map and the live walk (amends PL9, which listed it on Explore only). The "On the map" key in the walk's settings lists the layers that are on for the walk (the one setting every map shares since decision 0260).
14. **MD14** The recorder, the trace and `readTrace` are unchanged, and no stored walk, capture or find is changed or deleted.
15. **MD15** Nothing on any map or card counts places or says what is left to find, and the "?" are never named (WT8, PL7, AT7).
16. **MD16** No "?", dot, ring, armed line, "Found:" line or open Layers panel on the live walk covers the capture stack, the edge buttons or the bottom strip, and the capture stack's three kinds stay one tap with the panel open (journey); the armed and "Found:" lines are plain ink, no accent, no motion, no number (the steward's S4).
17. **MD17** Storefront streets are remembered on the live walk while Places or Storefronts is on, and never otherwise (the steward's S6: what Explore mode's "remember" did).
18. **MD18** The start drawer's and the walk's "What I'm into" row shows while Places or Sights is on (the steward's S6).
19. **MD19** No copy on the walk or the ready map says what is left, how many, or "nearby to find"; the Places row has no count; the range ring shows only while the range is being previewed (the drawer up), never as a standing shape (the steward's S5).

## Surfaces, from the code

`grep -rn "exploring\|EXPLORE_KEY\|START_MODE_KEY\|mode === 'explore'"`: `app/walk.tsx` (the live walk: the switch, the "This walk" card, the range preview, the strip chip, the found announcement, the summary label), `lib/explore/useExplore.ts` (marks, storefront reads `remember`, the pocket alert), `lib/explore/explore.ts` (`pocketAlert`, `armedStill`, `exploredKey`), `lib/startPlan.ts` and `lib/useStartWalk.ts` (the start meta), `lib/ready/shell.ts` and `components/walk/useReady.tsx` (the ready map's mode and ring), `components/StartSettings.tsx` (the mode control, the range and passing rows), `lib/summary.ts` (the replay's passed lines), `lib/layers/*` (per-kind-of-map saving), `components/LayersControl.tsx` (per map lists). Each host has a criterion above or is listed in the plan. There is no home "Explore" button beside Start walk in the code today (decision 0031 named one; the drawer's Mode control was the only start-time mode), so nothing to remove there; the ready map's "Explore" is the tab beneath.

## Out of scope

- The area card and Explore's tab: unchanged (decision 0230 stands).
- Any new layer beyond Places and Storefronts' existing one.
- A migration of old walks' stored marks: truth is untouched (MD14).

## Record

- **Built** on `claude/presence-things-found-discrepancy-1kmhu5`: MD1-MD19, tests first in `56360a1` (the failing todos), then the code. Unit tests: `src/lib/__tests__/layers/modesToLayers.test.ts` (MD1, MD2, MD10, MD12-MD15), `explore/passedByLayer.test.ts` (MD9), `explore/placesOnWalk.test.ts` (MD3-MD8, MD11, MD17-MD19); the new `modes` journey (MD1-MD4, MD16, MD19) and the reworked `walk`, `ready`, `tabs`, `launch`, `into`, `nudge`, `marks`, `complexes`, `curiosities`, `small-places`, `subtypes` and `days` journeys on the web build.
- **Changed from the plan:** the dead-zone pill follows Storefronts (it speaks of storefront pockets), not Places; the legend row's key is `worth` (a `places` row key collides with the block's test id); no `maps` field on a layer any more (every map lists Places, MD13).
- **Retired by decision 0234:** v1-discovery E1 and navigation-and-tabs NV26 (the Explore switch and mode), in `scripts/features.js`; old tests of the mode's copy (SF7, storefronts ui 1, PA5, NV22, NV25) were rewritten to what now carries the meaning, none deleted.
- **UI review** (the cold find and the review, decision 0145): the cold find placed task 1 (the Layers button, then "Places") but not task 2 (the range) from the walk: accepted, fixed behind `modes-to-layers ui 1` (the Places row says how far a "?" shows and that it is set in Walk settings). U1 (no picture of the range rows) accepted: a shot added. U2 and U3 are opinion, rejected (a hint banner would be a new feature; the panel order stays). U4 (the open panel over the map), U5 (Storefronts is both a route leaning and a layer) and U6 (the off switch's contrast) are older than this slice: deferred (`docs/DEFERRED.md`). U7 none.
- **A gap in the test-first record, mine:** the failing todos were committed first (`56360a1`), but I marked them with a shared constant (`T`), which `npm run check:test-first modes-to-layers` cannot read (it looks for a literal `{ todo: ... }`), so it reports 18 of 19 as never todo first; MD14 and MD15 were written with their code. The history is true; the checker's pattern is what it cannot see. The owner waived the gate for this slice, once, at /deploy (Nov 19, decision 0234): no rewrite, the checker unchanged.
- **Not run:** `scripts/perf-walk.js` never turns Explore on (its default walk is the quiet case, unchanged), so there is no Places-on number; the cost is one boolean gating existing work, and with Places off the marks are not computed. Native has never run on a device: two items in `docs/NATIVE_UNVERIFIED.md`.

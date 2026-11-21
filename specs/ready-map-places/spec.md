<!-- Repo first: from the owner's report and answers in a session (Nov 21), completing modes-to-layers MD11 (decision 0234). Not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7); the doc wins once it exists. Plan approved by the owner, Nov 21. -->

# Places on the ready map: the "?" around you before you start

Nov 21, 2026 · @Miguel Guerrero

## Vision

Idea: "I'm in the state capital of Virginia at Richmond, and I'm in the plaza. And I would have expected some points of interest to pop up, especially historical ones, but I see absolutely nothing" (the owner, Nov 21, on Navigate's map before Start, with Places on by default).
Verb: earn (the places worth the stop are a layer you can see before the walk, as on Explore; nothing is counted or urged)
Touches: decision 0234 and modes-to-layers MD11 ("The ready map draws the '?' and the range ring while Places is on": the ring was built, the "?" never were); decision 0230 (Places, on by default on Explore's map and the ready map); MD19 (no copy says what is left; the ring only while the range is previewed); decision 0132 and Never, "Tallies" (nothing says how many); decision 0247 (a place is a point; its card at any distance); Always, "Capture is one tap away" (the ready map's capture stack is unchanged); decision 0224 (a find comes from a capture on a walk).
Verdict: aligned (the shape was gated with 0234: Places on by default on the ready map, its "?" drawn; this slice builds the half MD11 named and its test never checked)
Shape: on Navigate's map before Start, with Places on, the "?" within your range around you, as a walk draws them; a tap on one opens its card with "Set as destination" and Open in Maps, no capture row (a find belongs to a walk); nothing is counted.
Precedent: Komoot (pins on the planning map before a recording, a counter-example for what they are: other walkers' picks); AllTrails (points on the map before you start); Google Maps (places on the map around you before a route). From memory, unverified (decision 0193).
Criteria: RQ1-RQ18 (the steward's S1-S6 are RQ13-RQ17 and the Komoot entry; RQ18 is the owner's answer to its question).
Open: the defaults in the plan for the owner to overrule (the read on the ready map building checklists outside a walk; no pocket alert before Start; the "?" unnamed beyond 60 m, as on a walk); the steward's question is answered: MD3 holds, the destination excepted (RQ18).

## What it is

Navigate's map before Start (the ready map) lists Places in its Layers panel, on by default (MD10, MD13), and draws its
range ring while the bar is up (MD11). It draws no "?": the walk's places hook (`useExplore`) runs on that screen with no
walk and reads nothing, and the ready map is given no pins. Standing in Capitol Square in Richmond, with about forty
places worth the stop within 400 m (the State Capitol, the Washington Monument, the Governor's Mansion, the Civil Rights
Memorial, Mile Marker 0), the map shows none. Explore's map, zoomed in on the same square, shows them.

This slice draws the "?" on the ready map as a walk draws them, and gives each a card that leads to a walk there.

## Decisions (the owner's calls, Nov 21)

- **Within my range.** The ready map draws the places within your range around you (the range slider already on that
  screen, 100 m by default), nearest first, by the walk's own rule, never everything on screen.
- **A tap on a "?" opens its card with "Set as destination" and Open in Maps.** No capture row before Start: a find
  belongs to a walk (decision 0224), and there is none yet.
- **A slice, not a fix** (the owner, Nov 21, at `/fix`): the work is the unbuilt half of MD11.
- **MD3 holds, with one exception** (the owner's "Proceed" to the plan's recommendation, Nov 21): a walk still starts
  with every layer off, but a walk started to a ready "?" keeps that one place drawn and its card reachable, so you
  can capture there and find it (RQ18). The plan's defaults stand: the ready map's reads build checklists outside a
  walk; no pocket alert before Start; "?" unnamed beyond 60 m; at most 8.

## How adjacent apps do it

- **Komoot** (iOS, Android): on the planning map, before a tour is recorded, highlights show as pins around you; a tap
  opens a card that adds it to the route. Source: from memory, unverified. **Unverified**. A counter-example in part:
  its highlights are places other walkers marked and recommended (Never, "Popularity ... other people's activity");
  ours come from open data, the map's own places and the places archive (decisions 0080, 0103). It is cited for the
  how (pins on the planning map, a card that leads to the route), never the what.
- **AllTrails** (iOS, Android): the map before a recording shows points of interest along trails; a tap opens a sheet
  with directions. Source: from memory, unverified. **Unverified**.
- **Google Maps** (iOS, Android): places around you show on the map before any route; a tap opens a card whose first
  action is Directions. Source: `docs/research/adjacent-apps.md`, "Suggest a way on foot", from memory, unverified.
  **Unverified**. A counter-example in part: its card leads with ratings and busy times, which Chronicles never shows.

## Acceptance criteria

1. **RQ1** The owner's task: "see the places worth the stop around me before I start a walk". On Navigate's map before
   Start, with Places on (its default there), the "?" for unfound places within the range around you are drawn, as a walk
   draws them. Found by someone not told where they are: they are on the map in front of them; and, if they were turned
   off, the Layers button, the panel, the Places row (a finding criterion, checked in the journey by names and words).
2. **RQ2** Which places: the walk's own rule (`visibleMarks`) around the ready map's fix: unfound places of the kinds shown
   in "What I'm into", within the range (60-300 m, 100 by default), nearest 8; named within 60 m, else "?". Found places
   are drawn as found, full size in the found green with their name, as on a walk.
3. **RQ3** The range slider on the ready bar moves the "?" with it while it is dragged, as the ring does (MD11); the ring
   still shows only while the bar is up (MD19).
4. **RQ4** With Places off on the ready map, no "?" is drawn and no read for places starts from that screen.
5. **RQ5** Where nothing of this build has been read around the fix, the ready map reads the area once (the walk's read,
   the same rules: one read at a time, a failure waiting 2 min and 100 m, never per fix), then draws its "?"; until then it
   draws none, and the Places row says it is reading (RQ17).
6. **RQ6** A tap on a "?" or a found place opens its card in the ready map's card place: its name and kind when named,
   else "A place to find"; how far away in words; "Set as destination" (primary) and Open in Maps; a close button. No
   capture row.
7. **RQ7** "Set as destination" sets the ready map's destination to the place (its name, or "A place to find"), as a long
   press does (NV23): the destination's card shows and Start walks there. Open in Maps opens the place in the phone's maps
   app as Explore's cards do.
8. **RQ8** No pocket alert, nudge or "Found:" line on the ready map: those belong to a walk (MD7, MD8). A capture from the
   ready map's stack finds nothing.
9. **RQ9** Starting a walk from the ready map leaves the walk's own layers as they are (every layer off, MD3): the "?"
   drawn on the ready map do not follow onto the walk unless Places is turned on for it, but for RQ18's one place.
10. **RQ10** The "?" never cover the capture stack, the Locate button or the bar; with the bar up they stay under it, as
    the moments' pins do (ML4).
11. **RQ11** No copy on the ready map or the card says how many places, what is left, or "nearby to find" (MD19, Never,
    "Tallies"); the card has no count.
12. **RQ12** The spoken map: each "?" is a button spoken "A place to find" (or its name and kind when named), and its card
    is announced as a dialog, as on a walk.

13. **RQ13** A found place's ready card lists "Moments here" as the walk's card does (CA11, decision 0247): the moments
    within 60 m and the one that found it, newest three, in words, each opening it; never counted (the steward's S1).
14. **RQ14** "Set as destination" keeps the place: the destination is the place itself (as the walk's Route here sets
    it, `kind: 'find'` with its key), so the walk started to it says "A place to find" until it is within 60 m, then its
    name, as a walk routed to a "?" does (E12; the steward's S2).
15. **RQ15** The ready card sits where the walk's cards sit: above the bar, left of the capture stack's column. With it
    open, each button of the capture stack and Locate is the topmost element at its centre and takes one tap (Always,
    "Capture is one tap away"; the steward's S3).
16. **RQ16** The ready card says when a place may not be reachable from public ground, as the walk's card does
    (`mark-reach`, decision 0110: said, never a filter; the steward's S4).
17. **RQ17** While a ready read runs, or after it failed, the Places row of the ready map's Layers panel says so in words
    ("Reading…", "Not available now"), with no count; once places are drawn, the row says its range as today (`layerNotes`;
    the steward's S5: a failed read must not look like an empty square).
18. **RQ18** A walk whose destination is a place (set from a ready "?", or the walk's own Route here) draws that one
    place's pin with Places off, and a tap on it opens its card with its capture row, so it can be found there; the
    other "?" stay off until Places is turned on (MD3 holds otherwise; the owner, Nov 21).

## Surfaces, from the code

`grep -rn "discoveries=\|<WalkMap" src`: `app/walk.tsx` has two `WalkMap`s, the ready map (`ready.mapProps`, built by
`components/walk/useReady.tsx`) and the live walk's; only the live one is given `discoveries` (`explore.pins`) and
`onDiscoveryPress`. The place card is drawn in `app/walk.tsx` (`mark-card`) for the live walk only (`placesOn`, the
walk's layers). `lib/explore/useExplore.ts` gates its reads on a walk (`if (!here || !opts.walkId) return`). Explore's
own map draws its "?" from the area profile (`app/(tabs)/explore.tsx`), a separate path this slice leaves alone.

## Out of scope

- Explore's map and its cards: unchanged (decision 0230).
- The live walk: unchanged; its layers still start off (MD3).
- A find without a walk, a capture row on the ready card, and any change to what a find stores.
- Places along a destination's route before Start (the walk's `routeMarks`): a later slice if wanted.

## Record

- **Built** on `slice/ready-map-places`: tests first in `48e039b` (ten unit todos, MD11's other half, the `readyplaces`
  journey's checks), then the code. Unit tests: `src/lib/__tests__/explore/readyPlaces.test.ts` (RQ2, RQ4, RQ5, RQ8,
  RQ9, RQ11, RQ14, RQ17, RQ18) and `explore/placesOnWalk.test.ts` (MD11's "?"); the `readyplaces` journey (RQ1, RQ3,
  RQ6, RQ7, RQ10, RQ12-RQ16, RQ18).
- **Changed from the plan:** the read's state is a small store, `placesReadState` (`exploreRun.ts`), a seventh source
  file: the ready map's Layers panel renders before the places hook, so the state could not be passed down. The card
  is a dialog by role and name, never `aria-modal` (which would hide the capture stack beside it from a screen reader,
  against RQ15); the journey checks that. The card's moments are worded from the screen's `pinNow`. The journey is its
  own file, not a section of `marks`.
- **Amended, by the owner's RQ18:** MD8's test and tap-to-capture-places audit 3 now allow the walk's one place to
  keep its card with Places off; every other place still has none (both tests keep the rule's text).

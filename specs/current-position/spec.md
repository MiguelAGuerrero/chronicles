<!-- Repo first: from the owner's proposal G17 (docs/STATUS.md, "Next evolutions"; filed 2026-11-27 from the owner's
     /investigate), answered yes in person 2026-11-27 ("G17 current position, G16 forgotten stop, T67-T69 walkability,
     TF27 follow-up"; built first: "G17 first (Recommended)"), built under `/tend inbox G17 yes` (decision 0273). Not a tab
     of the concept doc. -->

# Where you are, now: a fresh fix when Explore or Navigate comes to the front, location off said (YH)

Nov 27, 2026 · the owner

The owner's words (/investigate, Nov 27): "we should ensure any location, sensitive journey is updated to the users
current position, and if location services are off, that should be prompted for a accurate assessment for accuracy".

The brief is `docs/research/current-position.md` (what the owner saw, the causes ranked, `file:line` references and the
owner's four calls); this slice builds G17's seven criteria and no more. Its first part, the outing and planner pages
reading their own fix, shipped as fix outing-current-position (`src/lib/locate/pagePosition.ts`,
`src/lib/locate/usePagePosition.ts`); this slice reuses that core.

## Vision

```
Idea: "ensure any location, sensitive journey is updated to the users current position, and if location services are off, that should be prompted"; "allow the app to always constantly track your location by the fault or turn it off and repro when a user enters navigation mode"
Verb: earn (Explore and Navigate list, frame and plan from where you are, so what they raise is what is around you)
Touches: Never "All-day tracking | One fix per moment (0036)"; 0036 "nothing tracks between moments"; NV17 "the owner's rule: no tracking outside a walk"; NV16 and 0070 "once per launch … Locate stays the way to read another"; AGENTS.md "No simulation" (a position the app did not read drawn as you); 0005 local-only (a fix never leaves the device); Always "Restraint" (a notice said quietly, once)
Verdict: aligned if reshaped
Shape: no tracking by default and no watch outside a walk (out: All-day tracking, 0036); "on when you enter navigation" is already so (a walk's recorder watches from Start). What fits: one fresh fix each time a screen that lists or plans from where you are opens or comes to the front, and when the app returns to the front; none between; a refusal said in the quiet notice with the way to turn it on; a position the app did not read is never drawn or planned from as you
Precedent: Apple Maps, the position on a tap and an alert with instructions when location is off (support.apple.com, verified); Google Maps, a gray dot for the last location when the current one cannot be found (support.google.com, verified); Apple HIG, ask when a feature needs it, one-time location at the moment of the task (verified)
Criteria: Explore reads one fix each time it comes to the front and when the app returns to the front, and lists and frames from it; no watch is open between reads; with location refused or off Explore says so quietly with the way to turn it on; with no fix read since the app came back, no walker dot is drawn and nothing says "You're here"; a planning page plans only from a fix it read, or from one under 30 minutes old
Open: none (the four questions answered in person, decision 0273)
```

## Decisions

- **"Fresh fix when needed (Recommended)"** (the owner, in person, 2026-11-27, decision 0273, amending 0070/NV16): one
  fresh fix whenever a screen that uses your position opens or comes to the front, and when the app returns to the
  front; nothing watches in between. Not a watch while Explore or Navigate is on screen; not all-day tracking (0036).
- **"Fix it now (Recommended)"**: the outing and planner pages, built in fix outing-current-position (before this slice).
- **"Quiet notice each time (Recommended)"**: with location off or refused, Explore says so in the quiet notice each time
  it comes to the front (`LOCATION_OFF`, Open Settings on a phone); with no fix read, no walker dot and no "You're here".
- **"Up to 30 min, said (Recommended)"**: when a fresh fix does not come in time, a screen that lists or plans from
  where you are may use one up to 30 minutes old (`FRESH_FIX_MS`) and says so in a line; older is no position.
- Kept: **"Card only on Explore"** (the owner, Nov 14, tend walk-screen audit 10): while Explore's empty card says
  location is blocked (`BLOCKED_LINE`), no banner says it again. YH4's notice is that card's line there.

## Mock-up

Not needed: the existing quiet notice and its words (`LOCATION_OFF`), a dot removed or drawn in the existing muted stone (`walkerMuted`, fix outing-current-position audit 11), and one line of words in the existing notice slot (decision 0259: no new screen, sheet, dialog, flow, transition or component, no regrouping; G17 filed "Mock-up: not needed").

## How adjacent apps do it

The job: know where you are when a screen lists or plans from it, and say so when it cannot.

- **Apple Maps** (iOS 27): "Tap [the Tracking Off button]. Your position is marked in the middle of the map."; when
  Location Services or Precise Location is off, an alert says so and "follow the onscreen instructions to turn it on".
  Source: https://support.apple.com/en-am/guide/iphone/iph10d7bdf26/ios , read Nov 27. **Verified**.
- **Google Maps** (computer): "If the blue dot isn't visible or is gray, Maps can't find your current location. Maps
  shows the last location you visited."; with no permission, "In your browser, give Maps location permission." Source:
  https://support.google.com/maps/answer/2839911?hl=en , read Nov 27. **Verified**.
- **Apple Human Interface Guidelines, Privacy**: "Ideally, wait to request permission until people actually use an app
  feature that requires access"; the location button gives one-time access at the moment a task needs it. Source:
  https://developer.apple.com/design/human-interface-guidelines/privacy , read Nov 27. **Verified**.
- **Komoot**: the route planner starts from "Current location", read as the planner opens. Source: from memory,
  unverified. **Unverified**.

All four in `docs/research/adjacent-apps.md`, "Know where you are when a screen lists or plans from it". Where this
departs: none of them reads on the app's return by itself as this does (Apple Maps follows you while it is open, which
is a watch, out here: 0036); like Google's gray dot, a fix that is not current is drawn muted and said, never as you; like
Apple's alert, location off says how to turn it on, but quietly, in the notice slot, never a dialog (Always,
"Restraint").

## Every surface (decision 0167)

From the code (`grep -rn "locateOnce\|getLastFix()\|walker=" src`):

- **Explore** (`src/app/(tabs)/explore.tsx`): the read (was `launchFix`, once per launch), the walker dot (`WalkMap`'s
  `walker`, `walkerMuted`), "You're here" (the title card's distance words and the row's `here`, from `stale`), the
  notice slot (the Banner over the map above the row), the empty card's blocked line (`findYou`, `BLOCKED_LINE`).
  YH1, YH3-YH6.
- **Navigate's ready map** (`src/components/walk/useReady.tsx`): its focus read (NV17), now also on the app's return.
  YH2, YH3. Its dot and words are not changed by this slice (G17 names Explore's dot and notice only).
- **Plan an outing and the walk planner** (`OutingPage`, `PlannerDrawer`, through `usePagePosition`): already read their
  own fix as they open and when the app returns (fix outing-current-position); unchanged here, and YH6's line is theirs.
- **The walk screen while recording**: its recorder watches from Start (0036's walk); nothing here reads or changes.
- **Place search and a look** (`youFresh(getLastFix(), …)`, explore.tsx): read the fix the app holds, which these reads
  keep current; unchanged.

## Criteria

G17's seven, in its words, numbered with the slice's prefix; the states they imply are in YH1, YH4 and YH6 (slice step 2).

1. **YH1** (the owner's task: "ensure any location, sensitive journey is updated to the users current position") Explore
   reads one fresh fix (`lib/locate`) each time it comes to the front, by its tab's focus or the app's return to the
   front, and lists, frames and says "You're here" from it; no longer once per launch (NV16 amended). A fix within
   100 m of where the page already has you (`PAGE_MOVE_M`) moves nothing and frames nothing; a farther one, on the page
   of the areas near you with no look and Move map off, frames you and selects your own town again, as Locate does.
   **Finding:** someone back from a drive opens Explore and sees the town they stand in lead the row, "You're here" on
   it, with no tap.
2. **YH2** Navigate's ready map reads one fix when the app returns to the front, as it does on its focus (NV17).
3. **YH3** Between reads nothing watches: each read ends its own watch on a fix, its timeout, or the screen leaving the
   front, and a test holds that no watch outlives a read on either screen (0036).
4. **YH4** With location refused or off, each time Explore comes to the front it says the quiet notice in `LOCATION_OFF`'s
   words (the empty card's `BLOCKED_LINE` where the card says it, "Card only on Explore"), with Open Settings on a phone,
   said to a screen reader; a timeout stays quiet (O21), and a fix that comes takes the notice away.
5. **YH5** With no fix read, no walker dot is drawn on Explore and nothing says "You're here"; the areas stay where it
   last listed them (AT1), never drawn as you.
6. **YH6** When a fresh fix does not come in time, a screen that lists or plans from where you are uses one up to 30
   minutes old (`FRESH_FIX_MS`) and says so in one line ("From where you were twenty minutes ago."); on Explore its dot is
   drawn muted and nothing says "You're here"; an older one is no position (YH5).
7. **YH7** The e2e moves the GPS with the page in the back and brings it to the front (the Done when), and refuses
   location for the notice and the missing dot.

Done when (G17): on the web build at 390 x 844, launched at Fox Point and the GPS moved to Cranston while the page is in
the back, brought to the front: Explore leads with Cranston, "You're here", and Plan an outing proposes around Cranston;
with location refused, Explore says location is off and how to turn it on, and draws no dot.

## Amends

- specs/navigation-and-tabs NV16 ("it reads one fix the first time it comes to the front in a launch and frames it, once
  per launch"): amended by decision 0273 to YH1; its text says so, and its unit test (`tabs/launchRoute.test.ts`) moves
  to the new read.
- specs/explore-atlas AT1 ("Explore reads one fix as the app opens"): amended the same; its text says so.
- The owner's concept doc's "Navigation & tabs (spec draft)" tab holds NV16 (this mirror last exported Nov 3), and AT1
  was written in the repo first; the doc's wording is the owner's to change ("Open before the loop", this run's record).

## Not in this slice

- Navigate's ready map with no fix, or an old one, still draws its dot at the fix the app holds (G17 names Explore's dot
  only).
- Sharing one read between Explore and a planning page opened within seconds (the brief's engineering unknown): each
  reads its own.

## Tests

Unit, in `src/lib/__tests__/explore/currentPosition.test.ts` (feature `explore`): YH1, YH4, YH5, YH6 (the decision after
a read, `atlas/hereNow.ts`), YH2 and YH3's return (`locate/appReturn.ts`), and NV16 (amended) in
`src/lib/__tests__/tabs/launchRoute.test.ts`. The journey `position` (new): YH1-YH7 on the web build at 390 and 320 px.

## Record

Built 2026-11-27 under `/tend inbox G17 yes`.

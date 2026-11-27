# Where you are, now: investigation (2026-11-27)

From: the owner's /investigate, 2026-11-27: "And planning an outing I noticed that I don't think the app updates the
position to currently where I'm at for example I'm in Allentown and it's showing me a plan from all the way from
Catasauqua or Coplay. I think it might be easy to just allow the app to always constantly track your location by the
fault or turn it off and repro when a user enters navigation mode so bugs like these don't or less likely to happen but
we should ensure any location, sensitive journey is updated to the users current position, and if location services
are off, that should be prompted for a accurate assessment for accuracy". Queued as G17, after fix
outing-current-position. Status: queued.

## What exists already

No inbox entry, `docs/DEFERRED.md` item, ledger `declined` line or decision is about a page planning from an old
position (searched `docs/`, `specs/`, `.claude/rules/`, the ledger, Nov 27). Near it: the journal's "A new page from the
line reads a location even on a walk with a stale fix" ("From the journal and note pages `/fix`"), another page and
another rule. What the app decided on purpose, and is the owner's:

- **Explore reads one fix per launch** (NV16, decision 0070: "Explore reads one fix as the app opens and frames it, once
  per launch. Nothing tracks after; Locate stays the way to read another"; moved to Explore's first focus by 0112).
- **Navigate reads one fix each time it comes to the front** (NV17: "Nothing tracks while you stay on the tab (the
  owner's rule: no tracking outside a walk)").
- **No all-day tracking** (decision 0036; VISION.md, Never: "All-day tracking | One fix per moment (0036)").
- **With no fix, Explore lists around where it last listed areas, without "You're here"** (AT1, 0070).
- **A fix older than 30 minutes is no position for Walk to** (DW5, `FRESH_FIX_MS`, `src/lib/startPlan.ts:46`); place
  search and a look use the same age (`youFresh`, `src/lib/atlas/freeLook.ts:81`).
- **The outing page's spec already asks for a read of its own**: OJ10, "With no position the page says it needs one and
  proposes nothing (no simulation); the page reads a position only while it is open"; QC30 the same; the walk planner's
  WP3, "From where you are … With no position it says so in words and plans nothing".

## What the owner saw

Pictured on the web build at 390 x 844 (device scale 1), with the e2e's mocked GPS and street grid: the app opened at
Fox Point, the phone then moved 4 km west to Cranston (as Catasauqua to Allentown), Plan an outing opened
(`docs/mockups/current-position/`, `before-*` and `expected-*`).

| Mark | What it shows | Drawn by |
|---|---|---|
| Explore after the move: "Providence · You're here" (`before-explore-moved-390.png`) | the launch's fix, 4 km behind | `src/app/(tabs)/explore.tsx:316` (one fix per launch), `:222` (a newer fix only from Navigate) |
| The outing page: "Around here", a loop of three stops around the dark dot (`before-outing-moved-390.png`) | planned around Fox Point, where the app opened | `src/app/(tabs)/explore.tsx:1082` (`you={getLastFix()?.at ?? you}`), `src/lib/outing/useJourney.ts:69-71` (`origin`) |
| The dark dot on the outing map | the same old point, drawn as you | `src/components/outing/OutingPage.tsx:186` (`walker={props.you}`) |
| A wider reach: "Looked in East Providence, Seekonk, Cranston, …" | towns around the old point | `useJourney.ts:118` (`areasAround(rows.towns, origin, …)`) |
| What a fresh launch at Cranston proposes: "Little of that close by … Look further" (`expected-outing-fresh-390.png`) | the truth for where the phone is | the same page, with a fix taken there |
| After a reload with location refused: Explore draws the dot and the outing page plans "Around here" again (`before-explore-nofix-390.png`, `before-outing-nofix-390.png`) | no fix at all; the area Explore last listed stands in for you, and nothing says location is off | `explore.tsx:143-148` (`nearReads` fallback), `:764` (`walker={you}`), `:317-318` (the launch fix's refusal dropped) |

## Why it reads wrong

1. **Plan an outing (and the walk planner) take Explore's held position and read none of their own.**
   `src/app/(tabs)/explore.tsx:1082-1084` and `:1107-1109` hand both pages `getLastFix()?.at ?? you`: the one fix
   kept in memory (`src/lib/lastFix.ts:9-13`, any age), else the area Explore last listed. `useJourney` keeps the
   first as `origin` (`useJourney.ts:69-71`), and Start routes from `fixNow()`, the same value
   (`OutingPage.tsx:166`). Against OJ10, QC30 and WP3. This is one cause with one place: a `/fix` (below).
2. **Explore's own "where you are" is the launch's fix** (`explore.tsx:316`, NV16, 0070): a phone that keeps the app
   (or the Home Screen web app) in memory across a drive keeps "You're here" on the town it opened in until Locate is
   tapped or Navigate is visited. On purpose (the owner, Nov 3); its cost is this report.
3. **Coming back to the app reads nothing.** Explore and Navigate read on a tab's focus only
   (`useFocusEffect`, `explore.tsx:219`, `src/components/walk/useReady.tsx:97`); unlocking the phone or returning from
   another app is not a focus, and no location read listens for the app's return (`AppState` is heard by the walk
   screen, the recording bar, the note page and the reminder check, none of them for a fix outside a walk).
4. **With no fix, the last listed area is drawn as you.** AT1 keeps "You're here" off, but the walker dot is drawn at
   it (`explore.tsx:764`), and the planning pages plan "Around here" from it (cause 1): a position the app did not read.
5. **Location off is silent at Explore's open.** The launch fix's refusal or timeout is dropped (`explore.tsx:317-318`);
   only a Locate tap or Start says "Location is off for this site. Turn it on …" (`src/lib/locate/notice.ts`,
   `LOCATION_OFF`, T17, 0154, 0172).

Never seen on a phone: the case the owner met (a launch fix kept across a drive in a backgrounded app) is reproduced
here only by moving the mocked GPS within one page load.

## How adjacent apps do it

From `docs/research/adjacent-apps.md`, "Know where you are when a screen lists or plans from it" (added by this run):

- **Apple Maps** (iOS 27): your position marked on a tap; when Location Services or Precise Location is off, an alert
  with instructions to turn it on. **Verified** (support.apple.com).
- **Google Maps** (computer): the blue dot, its circle of doubt, and "If the blue dot isn't visible or is gray, Maps
  can't find your current location. Maps shows the last location you visited." **Verified** (support.google.com).
- **Apple HIG, Privacy**: ask when a feature needs it, not at launch; the location button gives one-time access at the
  moment a task needs it. **Verified** (developer.apple.com).
- **Komoot**: the planner starts from "Current location", read as it opens. **Unverified**.

None tracks between uses to know where you are; each reads when asked and marks what is not current.

## Options

| # | The change | Answers | Vision risk | Cost |
|---|---|---|---|---|
| A | **Leave it** (after the `/fix`) | 1 only | none | nothing; Explore keeps saying "You're here" on the launch town after a drive, and location off stays silent |
| B | **A fresh fix when a screen that uses it comes to the front**: Explore on every focus and when the app returns to the front, Navigate's ready map on the app's return too; one fix each (`lib/locate`), no watch; location off said in the quiet notice with Open Settings on a phone; no walker dot and no plan from a position the app did not read | 2-5 | low: amends NV16 (0070), keeps 0036 and NV17 | about four source files (`explore.tsx`, `useReady.tsx`, a small shell hook for the app's return, `locate/notice.ts`); native `AppState` path unverified |
| C | **A watch while Explore or Navigate is on screen**, stopped when they leave or the app goes to the back | 2-4 | medium: amends NV17 ("Nothing tracks while you stay on the tab") and 0036's "nothing tracks between moments"; battery | as B, plus a watch's lifecycle on both tabs |
| D | **Track all day by default**, a switch to turn it off (the owner's first idea) | 2-3 | **out**: VISION.md Never, "All-day tracking", decision 0036 | "Always" permission (best effort on iOS, AGENTS.md), the background task outside walks (`index.js`), native code never run on a phone |
| E | **Keep one fix per launch, but mark an old one**: past 30 minutes the dot greys and "You're here" goes, as Google's gray dot | 2, 4 | low | small; nothing is updated, only labelled |

## The owner's calls

Asked in person, Nov 27; every answer the recommended one. Decision 0273 records them, amending 0070 (NV16).

1. **Outside a walk, how should Chronicles know where you are?** Offered: one fresh fix whenever a screen that uses your
   position opens or the app comes back to the front, nothing tracking between (recommended; amends 0070/NV16 only); a
   watch while Explore or Navigate is on screen (amends NV17 and 0036's "nothing tracks between moments"); tracking all
   day by default with a switch (reverses 0036, VISION.md Never "All-day tracking"; argued against plainly). Answer:
   "Fresh fix when needed (Recommended)".
2. **The Plan an outing bug itself.** Offered: `/fix` it now, ahead of the wider entry (recommended); fold it into the
   entry. Answer: "Fix it now (Recommended)". Built as fix outing-current-position (the outing and planner pages each read
   one fresh fix as they open, say they need your location when refused, route Start from it, and take the fourth answer).
3. **Location off on Explore.** Offered: the quiet notice each time Explore comes to the front with location off, Open
   Settings on a phone, no dot or "You're here" without a fix (recommended); a one-time explainer screen before the system
   prompt (Apple HIG's pre-alert, a new screen); today's silence. Answer: "Quiet notice each time (Recommended)".
4. **An older fix when a fresh one does not come.** Offered: up to 30 minutes old, said in a line (recommended; Google's
   gray dot); up to 30 minutes, said nothing (DW5 today); never. Answer: "Up to 30 min, said (Recommended)".

Engineering choices made here, not asked: the app's return is heard through React Native's `AppState`; the 30 minutes
are `FRESH_FIX_MS`; the notice is `LOCATION_OFF`'s existing words; no mock-up (`mockup.md`: an existing notice, a dot
removed, a line of words).

## The recommendation

The `/fix` first (cause 1, fix outing-current-position), then **B** as one slice, G17, with the fourth answer's said
fallback wherever a screen plans from a position. Size and `/vision` block below (as gated; the owner's answers kept the
shape).

```
## Vision
Idea: "ensure any location, sensitive journey is updated to the users current position, and if location services are off, that should be prompted"; "allow the app to always constantly track your location by the fault or turn it off and repro when a user enters navigation mode"
Verb: earn (Explore and Navigate list, frame and plan from where you are, so what they raise is what is around you)
Touches: Never "All-day tracking | One fix per moment (0036)"; 0036 "nothing tracks between moments"; NV17 "the owner's rule: no tracking outside a walk"; NV16 and 0070 "once per launch … Locate stays the way to read another"; AGENTS.md "No simulation" (a position the app did not read drawn as you); 0005 local-only (a fix never leaves the device); Always "Restraint" (a notice said quietly, once)
Verdict: aligned if reshaped
Shape: no tracking by default and no watch outside a walk (out: All-day tracking, 0036); "on when you enter navigation" is already so (a walk's recorder watches from Start). What fits: one fresh fix each time a screen that lists or plans from where you are opens or comes to the front, and when the app returns to the front; none between; a refusal said in the quiet notice with the way to turn it on; a position the app did not read is never drawn or planned from as you
Precedent: Apple Maps, the position on a tap and an alert with instructions when location is off (support.apple.com, verified); Google Maps, a gray dot for the last location when the current one cannot be found (support.google.com, verified); Apple HIG, ask when a feature needs it, one-time location at the moment of the task (verified)
Criteria: Explore reads one fix each time it comes to the front and when the app returns to the front, and lists and frames from it; no watch is open between reads; with location refused or off Explore says so quietly with the way to turn it on; with no fix read since the app came back, no walker dot is drawn and nothing says "You're here"; a planning page plans only from a fix it read, or from one under 30 minutes old
Open: none (the four questions answered in person, decision 0273)
```

Size: **M** (small): about seven criteria over four source files (`src/app/(tabs)/explore.tsx`,
`src/components/walk/useReady.tsx`, a new shell hook for the app's return in `src/lib/`, `src/lib/locate/notice.ts`);
native path: `AppState` on iOS and Android, never run on a phone.

## Done when

The owner, in Allentown with the app last opened in Catasauqua, opens Explore and Plan an outing: Explore leads with
the town they stand in, and the outing proposes around it. With location off, the screen says so and how to turn it
on. In the e2e: launched at Fox Point, moved to Cranston, back to the front: Explore's lead is Cranston's and the
outing plans around Cranston.

## What the slice will touch

`src/app/(tabs)/explore.tsx` (the launch fix, the focus read, the walker dot, the refusal), `src/components/walk/useReady.tsx`,
a small `// @layer shell` hook for the app's return (React Native's `AppState`, which react-native-web serves from
`visibilitychange`, so no web exception), `src/lib/locate/notice.ts`. Journeys: `atlas`,
`ready`, `outing`, `planner`, `launch`. Read first: `.claude/rules/explore-atlas.md`, `navigation.md`, `outing.md`,
`walk-planner.md`; specs `navigation-and-tabs` (NV16, NV17), `explore-atlas` (AT1), `outing-journey` (OJ10).

## Open for the owner

None. The specs' NV16 and AT1 still say "one fix as the app opens": reworded in the owner's doc by the slice and
re-exported (the specs mirror it).

## Engineering unknowns

- How often an `AppState` return fires on iOS for a Home Screen web app vs Safari (`visibilitychange`), and whether the
  browser's permission prompt can be raised from it without a tap (iOS asks once per site).
- The read's cost on a phone: one high-accuracy fix of up to 10 s at each return; never measured on a device.
- Whether a fix read for Explore should be shared with a planning page opened within seconds (no second read).

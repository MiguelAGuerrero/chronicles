# A far outing starts with the drive: investigation (2026-11-27)

From: the owner's /investigate, 2026-11-27: "When planning an outing and I select start when I until I get there, the outing
is lost it assumes that nothing happened. I at least expected like a Matthew of all the stops on the way and the walk or the
session starts when I get to my destination." ("Matthew" read as "map", confirmed by the owner's answer, "A map of the drive's
stops".) Queued as G18, with drive-in-the-outing part 2 as G19. Status: queued.

## What exists already

No inbox entry, ledger `declined` line or `docs/DEFERRED.md` item is about "When I get there" on Plan an outing (searched Nov 27).
Near it: drive-in-the-outing parts 2-4 are specced and not started (`docs/STATUS.md`, Slices; `docs/DEFERRED.md`, "The drive in the
outing, part 1"); G17 (a fresh fix when a screen needs where you are) mends the page's position, not its footer.

## What the owner saw

No picture. The page's far footer, from the code (on the web build the `journey` e2e reaches it: `scripts/e2e/journeys/journey.js:131`):

| Mark | What it is | Drawn by |
|---|---|---|
| "Start records from here, toward <Town>." | the line over Start, a named first town not yet a "later" | `components/outing/OutingPage.tsx:402`, `startLine` (`lib/outing/journeyWords.ts:94`) |
| "\"When I get there\" keeps <Town> only." | the line over the second button, a journey of several towns | `OutingPage.tsx:403`, `laterLine` (`journeyWords.ts:96`) |
| Start (primary) | begins the session now, the journey as its plan, no way on foot when far | `OutingPage.tsx:404`, `useJourney.ts:337` `start()` |
| When I get there (secondary; primary when alone) | saves the first chapter as Navigate's destination, opens Navigate ready, records nothing | `OutingPage.tsx:405`, `useJourney.ts:349` `later()`, `useStartWalk.ts:74`, `nav/store/shell.ts:48` |
| "With no position yet, it waits in Navigate until you are there." | the line when the page has no position: "When I get there" alone | `OutingPage.tsx:398`, `TOO_FAR_LINE` (`journeyWords.ts:63`) |

The owner tapped "When I get there", drove, and found nothing of the drive kept (their answer: "Nothing of the drive kept").

## Why it reads wrong

1. **"When I get there" records nothing, on purpose** (DW3, decision 0121: "\"When I get there\" starts nothing"). The trip there
   and its stops are never in a session, so no map of them can exist afterwards. `useStartWalk.ts:74-81`.
2. **The two buttons read as one choice about when, not about what is kept.** Start already records the drive as a ride and carries
   every town (OJ28, OJ48, DO7), and on arrival the bar says "<Town> is here." with "Show the way", nothing routed until the tap
   (`useJourneyBar`, the outing's second audit 33): what the owner wanted. "When I get there" names the owner's intent ("the session
   starts when I get to my destination") while doing the opposite of what they wanted kept. The line above it ("keeps <Town> only")
   shows only for journeys of several towns and says nothing of the drive.
3. **With no position, "When I get there" is the only button** (`choice.ts:13`, `TOO_FAR_LINE`), so the trap is the page's sole
   way forward then.
4. **Even with Start, the drive in the replay is thin**: a ride takes a fixed four seconds (R10) whatever its length, and a stop on the
   way is the walker standing on the dashed line, with no more said. Drive-in-the-outing part 2 (DO18-DO23) is specced and unbuilt.
5. **A later Start far from the saved place loses even the first town**: Navigate's Start past 10 km fails "Too far to walk from here"
   and forgets the destination (`nav/useNavigation.ts:176-180, 196`). Not what the owner hit, and gone from the outing page with the
   button; Explore's card keeps it (DW3, kept).

Chosen on purpose, the owner's to revisit: 0121's far ask (mirrored by `startChoice`, audit 9) and DO6 ("asks Start now or When I get
there, at every distance"). Never seen on a phone: a session begun in the car with the screen locked, its ride, the bar on arrival.

## How adjacent apps do it

From `docs/research/adjacent-apps.md`, "Keep a drive as part of the day" (two lines added by this run):

- **Google Maps Timeline**: "off by default … can only be turned on if you opt in"; then "automatically saving your visits and
  routes", the drive and its stops kept together. **Verified** (support.google.com/maps/answer/6258979). A counter-example in its
  recording unasked once on.
- **Polarsteps**: the Travel Tracker is turned on when you create a trip and keeps the route between places; it does not start by
  itself. **Unverified** (a search result's summary; the support pages returned 403).
- **Polarsteps**, already there: users report straight lines between stops. **Unverified**. What DO20 avoids.

None defers the start to the arrival: each keeps the travel because recording begins before it. The shape follows them in that and
departs from Timeline in that nothing records until the person's tap.

## Options

| # | The change | Causes | Vision risk | Cost |
|---|---|---|---|---|
| A | Leave it | none | none | nothing; the next far outing loses its drive the same way |
| B | Reword both buttons ("Start, with the drive" / "Only when I'm there") | 2 | low | S, words; the trap stays |
| C | Start alone on the outing page; "When I get there" stays on Explore's card | 1, 2, 3, 5 | low: 0121's tap kept | S; `choice.ts`, `useJourney.ts`, `OutingPage.tsx`, `journeyWords.ts`, `explore.tsx`; no native |
| D | Start alone everywhere a far place is offered | 1, 2, 3, 5 | low | M; C plus `AtlasCard`, Explore's tiles and spot, the `drive` and `startfar` journeys |
| E | Drive-in-the-outing part 2 (DO18-DO23): the ride's share by its length, along the road, its distance in words | 4 | medium: the replay (steward) | M; `ceremony/rhythm.ts`, the card's words, the `replay` journey |
| F | A mark at each stop on the way | 4 | high: 0121's "no pins that are not moments" | M, a new look |

## The owner's calls

Asked in person, Nov 27 (AskUserQuestion), recommended option first:

1. What happened? Offered: nothing of the drive kept; the outing gone on arrival; Start tapped before arriving; didn't know Start
   records. **"Nothing of the drive kept".**
2. What "Matthew" meant. Offered: a map of the drive's stops; the planned stops kept; both. **"A map of the drive's stops".**
3. At arrival. Offered: record from the start, my tap (Recommended, 0121 kept); start by itself on arrival (reverses 0121); ask me on
   arrival (reverses 0121). **"Record from the start, my tap (Recommended)".**
4. The far footer. Offered: Start alone, outing page (Recommended); Start alone, everywhere; keep both, reword them. **"Start alone,
   outing page (Recommended)".**
5. No position yet. Offered: Start, waits for a fix (Recommended); Start disabled, said why. **"Start, waits for a fix (Recommended)".**
6. The drive's stops. Offered: as today, then DO18-DO23 (Recommended); a small mark at each stop; only this slice for now. **"As
   today, then DO18-DO23 (Recommended)".**

Written: decision 0274, amending 0121 (its far ask on the outing page) and 0218 (DO6 there). No mock-up: a button and its line
removed from an existing footer (`mockup.md`, "Not needed").

## The recommendation

Shape C, then E as its own entry (G19).

```
## Vision
Idea: on Plan an outing, a far journey offers Start alone: the session records from your tap, the drive as a ride with its stops, every town carried, and on arrival the way begins only on your tap
Verb: honour (the drive and its stops are what came before the outing's moments) and return (the drive is there to replay)
Touches: Never "All-day tracking" (0036: nothing records before the tap), "Nagging" (nothing on arrival); Always "A route is a suggestion"; decisions 0121 (its tap kept, its far ask amended on this page by 0274), 0209, 0213, 0218 (DO1, DO2, DO6 amended here, DO7)
Verdict: aligned
Shape: as asked
Precedent: Google Maps Timeline keeps visits and routes together once on (verified); Polarsteps turns tracking on when a trip is made and keeps the route between places (unverified); neither waits for the arrival to begin
Criteria: nothing starts, offers or sounds on arrival beyond the bar's "<Town> is here." and "Show the way"; no speed or driving time (DO3); Start begins at once wherever you are, with no position too
Open: none
```

Size **S**: four criteria over five source files (`lib/outing/choice.ts`, `lib/outing/useJourney.ts`, `lib/outing/journeyWords.ts`,
`components/outing/OutingPage.tsx`, `app/(tabs)/explore.tsx`), no native path.

1. On Plan an outing, a journey whose first town is past 2 km, or a page with no position yet, shows Start alone in the footer with
   "Start records from here, toward <Town>."; no "When I get there", no "keeps <Town> only" and no "waits in Navigate" line (0274,
   OJ28 and DO6 amended for this page).
2. That Start begins the session at once with the whole journey as its plan and no way on foot; the ride is recorded inside it and
   every town is carried by the session's bar; reaching the first town the bar says "<Town> is here." with "Show the way", and
   nothing routes, starts, sounds or notifies until that tap (0121, DO1, DO2).
3. With no position yet, Start begins the session, which records from its first fix with the plan carried; the session's screen
   says nothing new about the missing fix (what it shows today for a session with no fix yet).
4. Explore's area card, tiles and pressed spot still ask Walk now / Start now or When I get there as today (DW3, DO6); the `drive`
   and `startfar` journeys pass unchanged, and the `journey` journey shows the far footer at 390 and 320 px.

G19 [M], drive-in-the-outing part 2 as specced (DO18-DO23, gated there: aligned if reshaped): the ride's share of the path beat by
its length under the soft cap, drawn dashed along the road, a capture on it stopping the replay, "+ 84 km by ride" in words on the
card and the replay, a mostly-drive replay ending on the rest and the title.

## Done when

On the web build at 390 x 844, Plan an outing toward a town past 2 km shows Start alone; tapped, a drive of 45 s at 12 m/s to the town
is recorded as a ride in the session (the `drive` journey's world), the bar says "<Town> is here." with "Show the way" and routes
nothing until tapped, and after Stop the replay draws the dashed drive and the walk after it.

## What the slice will touch

`src/lib/outing/choice.ts` (core: `startChoice` loses `ask` and `later`, or the page stops reading it), `useJourney.ts` (view:
`later()` goes; `start()` already returns `{ dest: null, plan }` with no position), `journeyWords.ts` (`LATER_LABEL`, `laterLine`,
`TOO_FAR_LINE` gone where unused; `AtlasCard` spells its own), `OutingPage.tsx` (footer; `onLater` prop), `app/(tabs)/explore.tsx`
(its `onLater` for the page). Tests: `src/lib/__tests__/outing/` (the `startChoice` cases, audit 9, 47, 48). Journeys: `journey`
(l.131-132 read `outing-later`), `outing`, `drive`, `startfar`, `launch`. Rules: `.claude/rules/outing.md`'s two lines. Checks first:
`npm run test:feature outing`, `E2E_ONLY=journey`.

## Open for the owner

None.

## Engineering unknowns

- Since fix outing-current-position (`de15f41`, on main after this brief was begun) the page reads its own fix and, with none,
  says it needs your location: whether a named destination is still planned with no position (`startChoice`'s `later`); if
  not, criterion 3 only holds for a fix lost between planning and Start.
- Whether anything else reads `startChoice`'s `ask` (Explore's card has its own `walkToChoice`).
- A session started with no fix and a plan whose first town is far: the plan store's two-minute window (`planStore.ts`) against a
  slow first fix; the session takes the plan at its start, not its first fix, which is believed fine.
- What the session's screen shows today before a first fix when no destination waits (`useNavigation`'s "Waiting for your position"
  is said only for a destination): seen on the web build before criterion 3 is written as a check.
- Native, never on a phone: the ride recorded with the screen locked in the car, the bar's arrival line, a session begun with no fix.

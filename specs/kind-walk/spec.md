<!-- Kind walk. Written in the repo first (2026-11-05) from the owner's ask in session: "the explorer's page when clicking on a
     tab in what's here such as green space should offer a tour ... or some way to navigate and propose a walk for that town
     or neighbourhood's features", then their calls below. To be copied into the concept doc as a tab. The doc wins once it
     exists. Decision 0095. -->

# Kind walk: a suggested walk through where a kind is dense (KW)

Nov 5, 2026 · @Miguel Guerrero

On an area's card in Explore, tapping a kind under "What's here" (Green, History, ...) opens it in place. It offers one
suggested walk through where that kind is concentrated in this town or neighbourhood, with its distance and its
walkability said before the walker commits. It is a suggestion, never a tour: accepting it opens the walk screen ready,
and from then on it is an ordinary walk.

## Vision

```
Idea: tapping a kind under "What's here" offers a suggested walk through that town's or neighbourhood's features
Verb: earn (it helps the walker notice where a kind is concentrated, and gives them a way in)
Touches: decision 0022 (suggested routes deferred; this pulls a narrow slice forward, decision 0095);
  Shapes, "Suggested routes": "One way ... within a stated budget; no 'fastest' and no minutes compared; drifting never
  nagged; Walk me back stays shortest";
  Never: "Several ways ranked by minutes; 'fastest' as a label"; tallies ("12 of 87"); scores, completion; ratings, "best of";
  nagging ("off-route alarms"); a capture behind an extra tap;
  Always: "A route is a suggestion; drifting is never nagged"; "Guidance is structural"; "Distance and time, said plainly";
  precedent: 0093 walkability, 0017 RouteSource, 0029 Walk me back, 0076 Navigate ready, and the owner's Nov 1 call that
  discoveries come in the moment, not as a planned list
Verdict: aligned if reshaped
Shape: one suggested way through where the kind is dense, no named stops; its length a number in the displayed unit, never
  a duration; walkability said in words before commit; accepting it opens the walk screen ready
Criteria: KW1-KW14 below
Open: none (defaults chosen for a quick iteration, the owner, Nov 5)
```

## Decisions

- **Pulled out of 0022** (the owner, 2026-11-05; decision 0095): Explore only, and only from a kind. A route to a destination,
  quick actions from place to place and avoiding car-oriented streets stay deferred. The broader suggested-routes work is on a
  separate worktree; this uses its `RouteSource` rather than building another.
- **Distance, not minutes** (the owner, 2026-11-05): a number in the displayed unit (km or miles, from the existing setting).
  A walker's speed changes when they stop to look, so the app claims no duration, ETA or pace. The budget is also a distance.
- **Walkability is a decision point** (the owner, 2026-11-05): said before commit. If a way needs running, a stretch built
  around cars, or a car to get to, the walker is told, or the way is not suggested, by a setting.
- **Density, not stops** (the owner, 2026-11-05): "?" marks stay hidden until reached, so the way passes through where a kind
  is concentrated and names no place.
- **In place, in the card** (the owner, 2026-11-05): tapping a kind row expands it; no new screen or route.
- **Defaults for a quick iteration** (the owner, 2026-11-05: "proceed with reasonable defaults"): a budget of about 2 km
  (its miles equivalent when the unit is miles); the walkability setting defaults to warn; the settings are the Start
  settings dialog's.

## Acceptance criteria

### Where it lives

1. **KW1 · A kind row opens in place.** On an area's card (a neighborhood or a town), tapping a kind row under "What's here"
   expands it inside the card; tapping it again closes it. No new screen, route or modal opens.
2. **KW2 · A thin or empty kind offers no walk.** A ring the map knows almost nothing about (AG3), or a kind with no presence
   (its word is "none"), shows no walk and says so in words.
3. **KW3 · On web, where no streets can be routed, it says why.** The kind row still opens. Where routing is not available the
   walk is absent and the row says so in words. Nothing is simulated.

### The suggestion

4. **KW4 · One way.** An open kind shows exactly one suggested walk. No screen shows several routes, a ranking, "fastest", or a
   distance compared or saved against another.
5. **KW5 · Through where the kind is dense.** The way passes through the place or places in the area where the kind is most
   concentrated (found places counted too), drawn from presence in the cache. No rating, popularity or "best" input exists
   in the choice.
6. **KW6 · No place is named.** The suggestion names no place of the kind and marks none on the map. A "?" mark still appears
   only as it does today, when the walker reaches it.
7. **KW7 · A distance, never a time.** The suggestion states its length as a number in the displayed unit ("about 2 km" or
   "about 1.2 mi", following km or miles). No minutes, duration, ETA or pace appears on the suggestion, on its walk, or in a
   setting.
8. **KW8 · It fits a distance budget.** The suggested length is near the walker's budget (setting, default about 2 km, or its
   miles equivalent), and a shorter and a longer step change the one suggestion; they never show alternatives.
9. **KW9 · The start is said.** If the way begins away from the walker, the suggestion says how far it is to get there (a
   distance, in words). It never silently becomes a drive.

### Walkability

10. **KW10 · Said before commit.** Before the walker starts it, the suggestion says in words whether it can be walked the whole
    way, and names any stretch built around cars (0093), by street where known. "No data" says it is not known; it never claims
    the way is fine.
11. **KW11 · The walker chooses what to do about it.** A setting, warn (the default) or don't suggest. With warn, the walk is
    offered with the stretch named. With don't suggest, a way that needs a stretch built around cars is left out, and if none
    remains the row says so in words instead of staying blank.

### Starting it

12. **KW12 · Accepting opens the walk screen ready, and it is an ordinary walk.** The button opens the walk screen with the
    route ready (0076, `showWalk()`). No tour mode, progress, stop tally or tick is kept before, during or after; the replay
    treats it like any walk.
13. **KW13 · Drifting is never nagged.** Leaving the suggested way raises no alarm, nag or notification; the only response is
    the quiet re-route that navigation already does. Walk me back stays the shortest way (0029).

### Data

14. **KW14 · Nothing leaves the device and nothing is stored as truth.** The way is derived from the cached atlas profile and
    streets and recomputed, never saved as a walk, a moment or a find. Only the two settings are stored.

## Out (decision 0095 keeps these deferred, `docs/DEFERRED.md`)

A route to a destination; quick actions from one place to another; routing that avoids car-oriented streets; a "walk this way
instead" alternative; a route preview on the map for any other screen; mixed-kind walks from the card's head.

## Record

Not started (2026-11-05).

<!-- Repo first: written from the owner's request in a session (Nov 10, 2026), judged at the vision gate the same day. Not a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Drive there, walk back (DW)

Nov 10, 2026 · @Miguel Guerrero

Sometimes the place you pick on Explore is a drive away. Today the area card's Walk to starts a walk at once, so the drive is recorded inside it. Then Walk me back leads to where you got in the car, not to where you got out. This slice does two things. A far place asks whether to walk now or when you get there. Walk me back leads to where you last got off a ride, and you can set the point yourself from the walk map's press-and-hold card.

## Vision

```
Idea: Picking a place on Explore's place card starts a walk at once, so when the owner drives there the drive is recorded and Walk me back leads to where they started driving, not where they got out. Fix it with waypoints, or with a choice of the walk-back point (the owner, Nov 10).
Verb: earn (Navigate: a walk you can find your way back from frees you to wander).
Touches: 0021 and 0049, "Walk here stays a one-tap start from Chronicle and Explore" (amended for far places only, by the owner's call, Nov 10). Never "All-day tracking", whose fitting shape is "A walk you start" (waiting for you to arrive reads no location before a walk). Never "Several ways ranked by minutes", whose fitting shape is "only Walk me back is the shortest (0029)" (it holds). 0040, rides: Walk me back never follows a ride (R13); a drive meets RIDE_RULES. 0058: Open in Maps stays deferred on Explore's card. "Who it is for": not "tourists working through a list" (no waypoints).
Verdict: aligned if reshaped
Shape: On Explore's area card, Walk to on a near place starts at once, as today; on a place beyond a set distance it asks "Walk now" or "When I get there". "When I get there" saves the place as the destination and starts nothing. Walk me back goes on its own to where the last ride in the walk ended, or to the start if there was none. The walk map's press-and-hold card gains "Walk back here", which sets the walk-back point by hand for this walk. No waypoints, pins or lists.
Criteria: DW1-DW14.
Open: none (the owner, Nov 10: 2 km; towns past 10 km offer When I get there). Explore's long press, Chronicle's Walk here and the walk planner stay as they are.
```

## Decisions (the owner's calls, Nov 10)

- **The shape: automatic, plus an override** (at the gate). Walk me back finds where you got off by itself; "Walk back here" on the walk map's press-and-hold card sets it by hand.
- **Several rides: the end of the last one** (at the gate). It is the furthest point back you can reach on foot.
- **The pain is the walk starting at once** (at the gate: "The navigate automatically starts a 'walk' is the pain point"). The fix is on Explore's area card, the place the owner picks from.
- **Walk to asks only when far** (at the gate, over always asking and over a separate Open in Maps). Near places stay a one-tap start (0021 holds for them).
- **The walk starts on your tap, never on arrival** (the owner, Nov 10: "not when the app detects they're at the place … to avoid issues of finding parking and such"). Being near or at the saved place starts nothing, offers nothing and says nothing; only Start does (DW4).
- **The steward's read (Nov 10):** S1 (DW13), S2 (DW7's notice, DW8's spoken label), S3 (DW3's test), S4 (DW11), S5 (Amended, below), S6 (DW5) and S8 ("where the ride ended", true of a car, a bus or a train) accepted; S7 answered by the owner (DW14).
- **2 km, and towns past 10 km** (the owner, Nov 10, on the plan): Walk to asks past 2 km in a straight line; a place too far to walk (past 10 km, N5) offers When I get there alone, in place of "Too far to walk from here" (DW14). The plan was approved the same day.

## Criteria

### Getting there first (Explore's area card)

1. **DW1 · Near starts at once.** On Explore's area card, Walk to (the footer's, and a busy street's) for a place within 2 km in a straight line of where you are starts the walk in one tap, exactly as today.
2. **DW2 · Far asks.** For a place more than 2 km away, the tap asks first, on the card: "Walk now" and "When I get there". "Walk now" starts the walk exactly as DW1. Back, Escape or the choice's close button cancels: nothing is saved and no walk starts.
3. **DW3 · When I get there starts nothing.** "When I get there" saves the place as Navigate's destination and opens Navigate, ready, whose bar says "To <place> · <distance> away". No walk starts, nothing is recorded, no location is read in the background, and nothing alerts you on arrival.
4. **DW4 · Start on your own terms.** The walk begins only when you tap Start on Navigate, ready, wherever you are then (parked a street away, or past the place), routed to the place, as Navigate's Start does with any destination (NV25). Reaching the place, or any distance from it, never starts a walk, raises a prompt or a notification, or opens a screen: the app doesn't watch for your arrival at all.
5. **DW5 · No fresh position asks.** With no position known, or one older than 30 minutes, Walk to asks as DW2 does: a wrong one-tap start would record a drive, which a question never does. (The steward's S6; Explore reads a fix as it opens, NV16, so this is rare.)

### The way back

6. **DW6 · Back to where you got off.** When the walk has a ride that has ended, Walk me back leads to where the last such ride ended: the first walked point after it. With none, it leads to the walk's start, as today. A ride still under way doesn't count until it ends.
7. **DW7 · Walk back here.** The walk map's press-and-hold card offers "Walk back here". It makes that spot Walk me back's target for this walk, and says so once, in the walk's notice: "Walk me back now leads here." A later "Walk back here" replaces it, a reload keeps it, and Stop clears it. Another walk never sees it.
8. **DW8 · Said in words.** Walk me back shows once you are more than 50 m from its target. The button stays the `arrow-undo` icon; its spoken label names the target: "Walk me back to the start", "Walk me back to where the ride ended", "Walk me back to the spot you chose". Once tapped, the navigation bar shows the name: "Start", "Where the ride ended" or "The spot you chose". No minutes or distances are compared.
9. **DW9 · The way stays the way back.** Walk me back never follows a ride (R13), and takes the shorter of the trace and the streets (0029), whatever its target.

### Truth and restraint

10. **DW10 · Worked out from the trace.** Where you got off is read from the trace each time (`readTrace`'s rides), never stored, so a change to `RIDE_RULES` moves it with the trace. Only the spot chosen by hand is saved, with the open walk.
11. **DW11 · No waypoints.** No pin, ring, list or saved place marks the walk-back point on any map, and no new screen lists one, unless you are being led back: then it is the route's end, marked like any destination's.
12. **DW12 · Nothing leaves the device.** Saving a destination for later, and the walk-back point, stay on the device; nothing is sent anywhere.
13. **DW13 · Capture stays one tap away.** With the press-and-hold card open and all its actions shown, at 320 px wide, the camera, mic and note buttons stay visible, where they were, one tap each.
14. **DW14 · Too far to walk, not too far to go.** On the area card of a place too far to walk (past 10 km in a straight line, N5), the footer offers "When I get there" alone, in place of "Too far to walk from here", and it behaves as DW3. There is no Walk now. A busy street too far to walk still has no Walk to.

### Amended

- NV23 and NR8 in the navigation-and-tabs and navigate-ready specs ("a long press on Navigate's map sets the destination … the only way the drawer's destination is filled"): "When I get there" (DW3) is a second way. Decision 0121 records it.
- Decisions 0021 and 0049 ("Walk here stays a one-tap start"): for Explore's area card, only for places past 2 km or with no fresh position (DW2, DW5). Decision 0121.
- The area card's "Too far to walk from here" (explore-atlas, round 3): replaced by When I get there (DW14). Decision 0121.

## Routes and data

- No new route, truth or cache, no migration and no new dependency.
- Meta: `nav` (existing: the destination held for no walk, NV23, written by "When I get there"); new `way_back` (`{ walk_id, at }`, the spot chosen by hand, owner `nav`).

## Tests

See `plan.md`.

## Record

Built Nov 10, test-first by history (`4ca031f` the todos, `16ea035` the code). Every criterion has a test:

- Unit (`src/lib/__tests__/navigation/wayBack.test.ts`, `wayBackStore.test.ts`): DW1, DW2, DW3, DW4, DW5, DW6, DW7, DW8, DW9, DW10, DW14.
- E2E (`E2E_ONLY=drive`, 19 checks, green on the web build): DW1-DW4, DW6-DW8, DW11-DW14.
- `check:test-first`: DW13's todo check at `4ca031f` put its id on the line after `check.todo(`, so the line-based check can't see it was first; the check is one line now.
- The steward's read (8 findings): 7 accepted into criteria, S7 answered by the owner (DW14).
- Deferred: Explore's long press, Chronicle's Walk here and the walk planner still start at once; Open in Maps on the card (0058); undoing a chosen spot except by choosing another or Stop.
- Native: nothing native is new; the card, the meta write and the labels have never run on a device (`docs/NATIVE_UNVERIFIED.md`, "Drive there, walk back").
- Not audited (decision 0074: on the owner's request).

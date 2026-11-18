<!-- The drive in the outing (slug drive-in-the-outing, prefix DO). Written in the repo first (2026-11-18), from the vision gate another
     session ran with the owner the same day and handed to this one; not a tab of the concept doc yet, and the doc wins once it
     exists. Nothing here is built. It amends rides (R10, R12), drive-there-walk-back (DW14), 0040 and 0121 when it lands. -->

# The drive in the outing: start in the car, places you drive to, the road in the replay, capture on a ride (DO)

Nov 18, 2026 · @Miguel Guerrero

The owner, Nov 18: "The goal is not to compete with Apple Maps, Waze, or any of the big scale navigation apps. It's just enough
support so that if the user wants to capture their drive as part of the journey itself, they can." Asked which gaps they meant, they
chose all four: starting a journey in the car, places found from the road, the drive in the replay, and captures while driving; and
"Spec all four now". Asked whether that withdraws the road engine: "Keep 0215".

The owner's words reached this spec through the session that ran the gate, not from the owner in this one. They are quoted as that
session gave them, and decision 0218 says so.

## Vision

```
Idea: A drive is a full part of an outing: you can begin one in the car, the places you drove to can be found, the road comes back
  in the replay, and a moment can be made on the way
Verb: honour (the drive is what came before a moment), return (the road in the replay), earn (places only a car reaches)
Touches: Never "All-day tracking", "A capture behind a menu, a drawer or an extra tap", "Nagging", "Celebration", "Fitness numbers",
  "Tallies", "Several ways ranked by minutes"; Always "Capture is one tap away", "Restraint", "A route is a suggestion"; 0001 (five
  beats in a fixed order), 0085 (the soft cap), 0040 and rides R1-R14 (R9 captures on a ride, R10 the squeeze, R12 Explore silent
  while moving), 0115 (places reached by car), 0121 (nothing starts on arrival), 0209 (the session is an outing), 0215-0205 (the
  road engine), main's deferred "Places you can't walk to"
Verdict: aligned if reshaped
Shape: nothing starts, stops or offers itself on a car, a speed or an arrival; a place is found by a capture, never by passing or by
  minutes spent; the drive stays inside the replay's path beat; no speed anywhere; nothing new on the screen for a driver
Precedent: Apple Voice Memos (the Action button starts one, saved with the name of your location; read by the gate's session, not re-read here), Polarsteps (a trip as
  a route with steps; straight lines between stops are the thing to avoid; unverified), Google Maps Timeline (records your day
  unasked: the counter-example; read by the gate's session, not re-read here), iOS Driving Focus (silences notifications while driving; unverified)
Criteria: DO1-DO30 below, with DO12a
Open: two, at the end (the owner answered the rest on Nov 18)
```

The gate ran before it knew of decisions 0209 and 0215. Two of its eleven criteria are re-gated here: its third ("no route, turn or
re-route for the road") is withdrawn by "Keep 0215", and its fifth ("nothing new is caused by a ride") is kept with the road
engine's spoken turn as the one named exception, which is the first open question.

## How adjacent apps do it

- **Apple Voice Memos**: the Action button starts a recording without the screen, and it is saved with the name of your location. Source: from memory, unverified (read on support.apple.com by the session that ran the gate, not re-read here).
- **Polarsteps**: a trip is a route with steps along it; between stops the line is drawn straight, which users report as wrong. Source: from memory, unverified.
- **Google Maps Timeline**: kept on the device, and it records the day without being asked. Source: from memory, unverified (read by the same session). The counter-example: here nothing is started for you.

## Criteria

Everywhere:

- **DO1.** An outing begins only on the person's tap. No car, speed, parking, arrival or place ever starts, stops, pauses, offers or
  notifies anything.
- **DO2.** (the owner's safety rule) Nothing on a ride asks for a look or a tap: a ride causes no prompt, banner, sheet, sound,
  haptic or notification of its own. The one exception is a turn spoken by guiding the person started ("Drive there", decision
  0217; the owner, Nov 18: "A spoken turn is an acceptable exception"). Reminders the person set still fire; the phone's own
  driving mode quiets them.
- **DO3.** No speed, average, maximum, driving time or ranking is shown or stored as a figure, anywhere. A drive's distance is said
  in words with its unit.
- **DO4.** Nothing leaves the device and no new host is used.
- **DO5.** The words are the session's, as 0209 names it: the app says "outing" where this spec's surfaces say what is recorded;
  "ride" stays the word for a stretch not on foot.

Start a journey in the car:

- **DO6.** A place further than a walk to its start (2 km) asks "Start now" or "When I get there", at every distance, including past
  10 km where today nothing is offered (DW14).
- **DO7.** "Start now" begins the outing where you are; the drive is recorded as a ride inside it, drawn dashed, and can hold
  moments.
- **DO8.** On a ride the session's screen shows what it shows today: the "On a ride" chip and the capture stack. Nothing is added.
- **DO9.** An outing that begins in the car is titled from where you were on foot (R8); with no stretch on foot, from where it
  ended.
- **DO10.** Stop is always the person's. An outing that is all drive is kept as any other.

Places found from the road:

- **DO11.** While on a ride Explore names no place and marks none (R12 holds).
- **DO12.** A large place (a refuge, a park, a natural monument, a complex, any large open space) is found only by a capture
  inside its perimeter or within reach of one of its entrances, made after a ride has ended. A single point is never what a large
  place is judged by.
- **DO12a.** (the owner, Nov 18: "any complexes or large open spaces should ideally have their perimeters marked as if any town if
  available") Where a large place's perimeter is known it is drawn on the map as a town's border is: a thin line, no fill, no
  label of its own, and nothing where none is known. It marks where the place is, never that you have been.
- **DO13.** A capture made while riding never finds a place, and passing one never finds, names, whispers, lists or counts it:
  in the replay, on Explore, on a place's sheet and on the card.
- **DO14.** Being inside a large place's perimeter during an outing, off a ride, with no capture, names the place in the replay's
  words and does not find it. It is named by where you were, never by how you moved ("At Muir Woods", not "Walked at"): walking is
  no longer a named idea in the app (0209; the owner, Nov 18). A stretch is said to be on foot only where the trace makes that
  plain. How long counts is a rule in the code, said nowhere as a figure.
- **DO15.** Perimeters and entrances reach the app through an adapter, with an in-memory source for tests; none is hard-coded. A
  place with neither is judged as today. Where they come from is measured before this part is planned (open question 1).
- **DO16.** A large place found this way is a find like any other: a memory, with no count, badge or line of its own.
- **DO17.** This closes the deferred "Places you can't walk to".

The drive in the replay:

- **DO18.** The drive is part of the path beat. The five beats keep their order; no beat is added.
- **DO19.** A ride's share of the path beat follows its length, in place of the fixed four seconds (R10): a longer drive is given
  longer, as a zip with the camera pulled back, under the replay's soft cap.
- **DO20.** The ride is drawn dashed along the road it took, never as straight lines between its ends.
- **DO21.** A capture made on a ride stops the replay as one on foot does.
- **DO22.** The card and the replay say the drive's distance in words ("+ 84 km by ride"), and nothing else of it.
- **DO23.** A replay that is mostly drive still ends on the rest and the title as today; the lows stay in.

Captures while driving:

- **DO24.** On a ride the capture stack stays where it was, one tap each. No question ("are you a passenger?"), confirmation or
  step is added before a capture.
- **DO25.** A capture made on a ride keeps where it was made (MC18) and is placed on the ride in the replay.
- **DO26.** Nothing new appears on the screen for a driver.
- **DO27.** (the owner, Nov 18: iOS, "for all capture tools") On iOS a moment of any kind the capture stack offers (a photo or
  video, a voice memo, a note) can be begun without the app's screen, through the phone's own entry points (a spoken request, the
  Action button), and is saved into the open outing with where it was made. A kind the system cannot finish without the screen (a
  photo needs a look) opens the app at that capture and nothing else. iOS only; Android has none.
- **DO28.** A hands-free capture begins only when an outing is open; with none it does nothing and says so by the system's own
  means. It never starts an outing.
- **DO29.** A hands-free capture confirms with the system's own sound or haptic and nothing of the app's.
- **DO30.** Hands-free capture is a criterion only a phone can check.

## Surfaces (from the code, to be confirmed in the plan)

- The far-place question (`lib/startPlan.ts`, `outing/choice.ts`, the atlas card): DO6, DO7.
- The session's screen on a ride (`src/app/walk.tsx`, `lib/rides.ts`): DO8, DO24-DO26.
- Finding (`.claude/rules/explore-marks.md`'s rule: a capture with one unfound place within 60 m), the places adapter and the
  chronicles-data contract: DO11-DO17.
- The replay's path beat and the card (rides R10, 0085): DO18-DO23.
- Native entry points (a config plugin, a development build): DO27-DO30.

## Suggested order

1. Start in the car (the smallest; no data).
2. The drive in the replay (it touches the replay: the steward and the ux-reviewer).
3. Places from the road (it waits on outlines or entrances in the pack: a chronicles-data contract change; the live pack holds
   these kinds as points only).
4. Hands-free capture (iOS only, every kind of capture; native; an architecture call; cannot be finished without a phone).

## Answered by the owner (Nov 18, in this session; decision 0218)

- The safety rule: "A spoken turn is an acceptable exception." DO2 stands as written; "End" and the mute stay.
- Perimeters: the owner does not know where they come from; "any complexes or large open spaces should ideally have their
  perimeters marked as if any town if available" (DO12, DO12a, DO15).
- Naming a place: not by walking. "Walking is no longer going to be a named concept in the app. So I wouldn't lean too hard into
  refining that. Unless it's very obviously or self-evident during a session that you're walking." (DO14)
- Hands-free: "iOS. And for all capture tools." (DO27)

## Open

1. **Where perimeters come from** (ours to measure, as the road engine's step 0 did, then the owner's call). Three candidates:
   the map's own tiles, which the app already reads (their park and land-use shapes: no new host, but cut at tile edges and
   unnamed); Overture, the host town borders already come from; or the chronicles-data pack (a contract change, one build for
   every place, joined to the pack's own ids). The measurement: for the pack's large places in one region, how many have a shape
   in each source, and how many shapes can be matched to the place's point.
2. **How a named place reads in the replay** (DO14): the wording "At Muir Woods" is this spec's, not the owner's.

## Not in this spec

Detecting a car; a passenger mode; CarPlay or Android Auto; a dashboard of drives; fuel, tolls or stops suggested; telling a bus or
a train from a car; fog and streets from a driven trace and driven gap inference (0209's own slices).

## Record

Written 2026-11-18 from the gate's output; the owner's answers the same day; the plan is `plan.md`.

**Part 1, start in the car, built 2026-11-18** on `claude/determined-wright-yg1fq9`: `walkToChoice` answers `far` past what can be
walked (it was `later`: When I get there alone, DW14); the area card then asks "Start now" or "When I get there"; "Start now"
offers the place as a one-town plan (`placePlan`) and starts the session with no way on foot, so the bar says "Toward <place>"
with Open in Maps, Drive there and Pass by. "Walk now" reads "Start now" on the card and for a pressed spot.

**Passed.** Unit tests for DO5-DO7 (`navigation/wayBack.test.ts`, `outing/journeyPlan.test.ts`), failing first (`378bc44`). The
new journey `startfar` (5 checks: the question past 10 km, both answers full-size, Start now begins the outing toward the place,
nothing routed on foot, the capture stack as ever); `openmaps` and `carousel`, which use the same card, still pass.

**Not tested, and why.** DO9 and DO10 (held by rides R8 and by construction); the `drive` journey, whose DW14 check is updated,
fails earlier at a step recorded as failing on main. **Deferred** in `docs/DEFERRED.md`. **Native:** the card's change is plain
React Native and has not run on a phone.

Parts 2 to 4 are not built.

## Audit (2026-11-18, with the road engine's)

**4 findings: 2 fixed, 2 deferred.**

1. "Start now" on a far card while a session was open replaced that session's journey with a one-town plan, with nothing started: accept; with a session open the card does not offer it. `drive-in-the-outing audit 1` (journey `startfar`).
2. The card did not say that Start now records the drive (only a screen reader's hint did): accept; "Start now records from here, toward <place>." on the card. `drive-in-the-outing audit 2` (journey `startfar`).
3. A start held up past two minutes (a permission prompt) loses the plan: defer.
4. A place past 10 km reached from a row of the card that is not the card's own area gets the ordinary question, and "Start now" then routes on foot to "too far": defer.


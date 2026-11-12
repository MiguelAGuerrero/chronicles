<!-- Repo first: not yet a tab of the owner's Claude Docs doc "Explorer App Concept". Written: 2026-11-12. -->

# Tap to capture a place, and a quiet pass-by

Nov 12, 2026 · the owner

The owner's words: a moment made near a point of interest snaps to it automatically, but often the moment is about something else. Make it deliberate: tap the place, then capture the moment of it, so moments that merely happen near it stay plain moments in the vicinity. And track the places you pass with a quiet mark when you come very close (5-10 ft), as a setting.

## Vision

Idea: A moment finds a place only when the walker chose that place; passing very close to a place leaves a quiet mark, with the distance a setting.
Verb: honour (a moment tied to its place on purpose, never by accident) and earn (passing is noticed).
Touches: "A capture behind a menu, a drawer or an extra tap" (plain capture stays one tap; the place capture is an addition, never a replacement); "Counts are words" and "The lows stay in" (0052, "Passed ... without stopping"); 0031 (a walk starts quiet), 0099 (finds named, never counted), 0110 (passed places whisper as the card says them).
Verdict: aligned if reshaped
Shape: plain capture unchanged and still carrying its context (its place line stays the vicinity); "Capture here" on a place's card arms the next capture for that place; the pass-by is the existing "Passed X without stopping" line, its reach now tight and a setting; never a count, never a find.
Criteria: TC1-TC8 below.
Open: none (the owner's three answers, Nov 12).

## Decisions (the owner, Nov 12)

- Tap the place, then capture: a capture finds a place only by that tap. No automatic find, no "Which place is this moment about?" chip.
- The pass-by is a quiet mark, never a find, never counted, said in words.
- The setting is the pass-by distance, in the Explore settings, default about 8 m (saved like `explore_range`).

## Criteria

1. **TC1** A capture made on a walk with an unfound place within 60 m finds nothing by itself, with one place or several, and asks no question (no `find-choice` chip).
2. **TC2** A moment made outside a walk (`findForMoment`) finds nothing by itself either.
3. **TC3** A place's card (the `mark-card`) offers "Capture here" for an unfound named place; tapping it arms that place, the card closes, and a quiet line says the next moment is about it, with a way to cancel. The line is plain ink, no accent, neutral words ("The next moment is about the Old Bridge"); it sits above the capture stack and never moves or changes it.
4. **TC4** The next capture while armed finds that armed place (the same find as before: one find per place, the first stands, `capture_id` set) and disarms. Arming also clears when the walk ends and when the walker is farther than 60 m from the place, so an unrelated capture later is never found by it. Cancelling, ending the walk or a second tap on another place's "Capture here" replaces or clears the arming without a find.
5. **TC5** Plain capture is unchanged: still one tap, no arming needed, and a moment near a place keeps its ordinary context line.
6. **TC6** A place is passed when a trace fix comes within the pass-by distance of it (default 8 m, kinds shown), not within 60 m: a fix at 20 m passes nothing at the default. A place a capture found is not passed.
7. **TC7** The pass-by distance is a setting in the Explore settings (steps of 2 m from 4 to 20 m, default 8 m), saved in meta like the range and read back clamped; the card and replay line read it (`passedLine`). No surface shows how many places were passed and the settings copy names no number of passes.
8. **TC8** Revealing is unchanged: a place within 60 m is still named on the map; only "passed" tightened.

9. **TC9** A walk keeps the pass-by distance it was walked with (a meta value written when the walk starts, `walk_pass:<id>`): changing the setting later never changes an old replay's "Passed ... without stopping" lines; a walk with no stored value reads at the default.

## Steward (Nov 12)

S1 accepted (TC9). S2 accepted (TC3). S3 accepted (TC4). S4 accepted (TC7). Drift 3, tone 1, no breach.

## Record

(Filled as the slice is built.)

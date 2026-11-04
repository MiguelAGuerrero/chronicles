<!-- Repo first: not yet a tab of the owner's Claude Docs doc "Explorer App Concept" (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). Copy it in as a tab when the owner wants it there; from then on the doc wins. Written: 2026-11-04. -->

# Replay rhythm: glide to the moments, zip through the rest

Nov 4, 2026 · @Miguel Guerrero

The replay is the make-or-break, and today it has no rhythm. The path runs at an even pace, so every minute of the walk gets the same time on screen: a dull straight road as much as the square with six photos, and the fourteen minutes standing in a market as much as either. Then it stops dead at each moment until Continue, and a photo or note takes over the whole screen. Two speeds: crawling and stopped.

This slice gives the path beat a rhythm. The camera glides into each moment and away from it, zips through long stretches with nothing in them, and cuts across a gap. Moments stop taking over the screen: notes and memos stack up in a corner like a conversation, photos and videos pop up from their pin and tuck into a pile, places passed without stopping whisper by, and a time-of-day clock rolls forward as the day goes. The day's replay gets the same treatment.

The five beats keep their order (0001): the fog clears, the path runs, the moments come, the card, the name. Only how the second and third beats play changes. The card and naming are untouched.

The prototype the owner tuned this from: https://claude.ai/artifact/XouW4WPy8e2yPQWYsYDUNc (a made-up walk; its default numbers are this spec's numbers until the owner sends tuned ones).

## Decisions (the owner, Nov 4)

- **It flows; tap to hold.** No Continue. The replay runs from the fog to the card by itself, and a tap holds it. The first watch and every re-watch play the same way. Supersedes 0002 (waits at each capture) and 0004 (re-watches advance by themselves); amends M12.
- **A time-of-day clock** whose digits roll, slowly at a moment and quickly through a stretch; a gap says how long it was ("43 min later"). No elapsed-time counter: it would read like a stopwatch.
- **Photos and videos are a card** that grows from its pin, holds, then tucks into a pile at the screen's edge; tapping the pile opens them full screen. Amends 0003 for the replay; the capture viewer keeps its full-screen layout.
- **Notes and memos are speech bubbles** that stack in a corner, older ones drifting up and away.
- **Places passed without stopping whisper by** as the walker passes them. The lows stay in (0001); the card still says its low.
- **The day's replay gets the same treatment.** Amends M10-M12.
- **The screen reader path stays as it is**: it skips the fog and the path, goes through the moments one at a time, then the card.
- **A soft cap of about 60 s** on the path: past it, glides and holds shorten. Memos and videos are never cut short.
- **Memos and videos play in full**; the replay holds while they play.
- **A ceremony is a view of the data, never the data itself** (the owner, Nov 4, with the go-ahead): what happened is read once into a story, and the rhythm is one ceremony that shows it. A later ceremony (one for a day full of greenery, say) is a new view swapped in, with no change to how the story is read or to the screens. Decision 0082.

## Criteria

### The rhythm

1. **RR1** The path's time goes to the stretches between moments, not to the minutes walked. A stretch shorter than 450 m takes up to 1.8 s (less for a very short one, never under 0.45 of it); a longer one takes 1.8 s plus up to 0.9 s more however long it is. Time spent standing at a moment takes no path time.
2. **RR2** The walker eases: it slows into each moment and speeds away from it. On a long stretch the easing is steeper, so most of the distance goes by mid-stretch: a zip.
3. **RR3** On a long stretch the camera pulls back, up to 1.7 times wider at the middle, and closes in again at the next moment. Between nearby moments it stays at the walking zoom.
4. **RR4** A gap in the trace (the app closed, a pause; the same breaks the trace already draws) is a cut: the map dims and comes back at the far side in 1.4 s, with "N min later" (or "N h later", "N h M min later") under the clock. The walker never glides across a gap.
5. **RR5** The path beat aims to finish within 60 s. When the plan runs over, glides, zips, note pauses and photo holds shrink together until it fits, but never below their floors (a glide 0.6 s, a photo 1.2 s, a note 0.3 s). Memos and videos keep their full length, so only they can carry it past 60 s.
6. **RR6** Nothing waits for a tap. Every replay, first watch or re-watch, runs from the fog to the card by itself. There is no Continue, and no 4-second advance.
7. **RR7** A tap on the map, or the Hold button beside Skip, holds everything: the walker, the clock, the bubbles, a card, and a playing memo or video. "Held · tap to go on" shows while held, and the button reads Play. Another tap goes on. Skip still jumps to the card, stopping any sound.

### The clock

8. **RR8** A clock at the top shows the time of day where the walker is, in the device's own clock format. Through a stretch it moves with the walker; at a moment it runs from when you arrived to when you left, so a long stop rolls by; across a gap it rolls through the gap. Its digits roll as they change. It goes when the card comes.

### The moments

9. **RR9** A note appears as a speech bubble in the bottom-left corner when the walker reaches it, with its time. The walker pauses 0.8 s for a note of up to 12 words, plus 0.2 s for every 5 words more, up to 3 s. At most three bubbles show at once; each leaves after 9 s, or sooner when a fourth pushes it out, drifting up and fading. A bubble shows up to six lines; tapping one holds the replay and opens the note in the capture viewer.
10. **RR10** A voice memo appears as a bubble with its name and a waveform that fills as it plays. The replay holds where the memo was made for the memo's length. Where the browser refuses sound, the bubble shows its play button (a tap plays it) and the replay moves on when the memo's length is up.
11. **RR11** A photo grows from its pin into a card in the middle of the screen, with its caption and time, stays 2.4 s, then shrinks into a pile in the bottom-right corner. The pile shows the last three, each at a slight angle, and no count.
12. **RR12** A video comes as the same card and plays in it to the end (muted with "Tap for sound" where the browser refuses sound, as today), then tucks into the pile.
13. **RR13** Tapping the pile holds the replay and opens the photos and videos so far in the capture viewer, full screen with ‹ ›, at the latest. Closing it goes on from where it held.
14. **RR14** Moments taken together (one stop, as `groupCaptures` groups them today) come one after another in the order they were taken, at that one stop. A moment's pin appears on the map when the walker reaches it.

### The lows

15. **RR15** Each place the card's low names (passed within reach on an exploring walk, not captured; E11) whispers by as the walker passes it: "Passed Hessian Memorial without stopping", beside the place, for about 2.6 s, without slowing the walker. A quiet walk has none, as today. The card still says its low.

### The day's replay

16. **RR16** The day's replay plays with the same rhythm: the map glides (or zips) in a straight line from one moment or walk to the next, with "N h later" under the clock when more than 15 minutes pass between them; a walk inside the day plays its path with the rhythm and no fog beat (M11); a break inside a walk is a cut, as in RR4. A moment with no place is shown where the map is. One clock, one corner of bubbles and one pile run through the whole day. It runs to its card without a tap, every time; tap to hold and Skip work as in a walk's replay.

### What stays

17. **RR17** With a screen reader on (native only, as today), both replays skip the fog and the path and go through the moments one at a time with Continue, then the card, exactly as before this slice.
18. **RR18** With reduce motion on, the camera never pulls back, cards fade in at the middle and fade out instead of flying, bubbles appear and leave without moving, and the clock's digits change without rolling. The rhythm's timing is the same.
19. **RR19** Restraint: nothing during the path counts anything (no number on the pile, no "3 of 9", no progress bar), and nothing celebrates. Colours come from the theme and the kinds' own colours (photo, note, voice, video).

### Ceremonies are views

20. **RR20** What happened is read once into a story, with no timing or look of its own: each path walked (its timed runs and distance), the moments in order with when you arrived and when you left, the breaks in a trace, the travel between a day's entries, and the places passed. A walk and a day give the same kind of story. Nothing in the story depends on how it will be shown.
21. **RR21** A ceremony turns a story into frames (where the walker is, the camera, the clock, and what is drawn over the map). The rhythm is one ceremony. Both replays pick theirs by id from one registry and draw whatever its frames say, through one set of overlay views. A new ceremony is a new registry entry, plus a view for any overlay kind it adds, with no change to the story, the screens or the rhythm.
22. **RR22** The screen reader's path (RR17) is the same story shown another way: its moments, one at a time.

## Audit, round 1 (2026-11-04)

The `auditor` subagent, report-only, on `57ac857`. 19 findings (18 plus one from its UI notes): 16 accepted, 1 deferred, 2 rejected.

1. A memo over about 9 s is cut off when its bubble leaves: accept. A memo's bubble stays until it has played. `replay-rhythm audit 1`.
2. The replay sticks on the path when the plan's total is 0 or shrinks under the clock (an empty walk, a moment deleted from the viewer near the end): accept. The tick is a pure function that ends a ceremony whose time has run out. `replay-rhythm audit 2`.
3. "Tap for sound" on a video card can't be tapped (the card ignores pointer events): accept. `replay-rhythm audit 3` (e2e).
4. Opening the pile or a note holds the clock but not a playing memo or video: accept. The stage is paused while a viewer is open. `replay-rhythm audit 4` (e2e).
5. A standstill of 2 min or more with no capture plays as a cut ("14 min later"), because the trace's dwell is kept as its two end fixes: accept. A break whose ends are within the standstill radius and no pause is a stand, not a cut. `replay-rhythm audit 5`.
6. A screen lock mid-replay jumps straight to the card: accept in part. A tick longer than a quarter second doesn't advance the ceremony, so a lock holds it. Keeping the screen awake needs a new library (expo-keep-awake): deferred to the owner. `replay-rhythm audit 6`.
7. The pile opens at its oldest photo: accept. Newest first. `replay-rhythm audit 7` (e2e).
8. Media timing follows the replay's clock, not the player (a video told to play before it loads; a refused memo tapped late is stopped at its slot's end): accept. The video starts when ready; a memo the viewer started plays to its end. Covered by the e2e's flow (the full flow's video checks and `replay-rhythm audit 3`).
9. The walker and camera jump into and out of every stop: accept. A stop on a path holds the walker where the trace is, from arriving to leaving. `replay-rhythm audit 9`.
10. The modularity leaks: the screens know the rhythm's walking zoom, the camera is always on the walker, the cards assume the pin is mid-screen, the views import the rhythm's easing, and pins can only appear in story order: accept (the owner's call, 0082). The frame carries the camera (centre and zoom), the pins by id and each card's origin; easing is its own module. `replay-rhythm audit 10`, with a source scan that the screens and the stage import no ceremony.
11. Cuts, the intro and the rest never shrink under the cap: accept. They shrink too, above their floors. `replay-rhythm audit 11`.
12. Reduce motion still slides the bubbles and drops the intro: accept. Bubbles appear in place; the intro holds still for its time. `replay-rhythm audit 12`.
13. A landscape or short screen: the card covers the clock and the buttons; the bubbles run up over Hold; the notch: accept. The card is sized by the space between the top bar and the bottom; the corner keeps its height; side insets. `replay-rhythm audit 13` (e2e, landscape).
14. The trace trails the walker mid-zip (rebuilt every 66 ms): defer (DEFERRED.md; drawing per frame costs the map more than the gap shows).
15. A 449 m stretch (not "long") pulls the camera back a little: accept. `replay-rhythm audit 15`.
16. A pause inside one group of captures plays no cut: reject. The captures are one stop by the grouping rule; the clock rolls through the pause inside it, and the drawn trace still breaks there.
17. A place passed just after a gap whispers while the map is still dimming on the near side: accept. It waits for the far side. `replay-rhythm audit 17`.
18. The screen reader's steps stall when the moment showing is deleted: accept. Stepping is a pure function that skips a moment gone and ends when none is left. `replay-rhythm audit 18`.
19. Colours hard-coded in the stage (the cut's dim, the waveform's unlit bars, white): accept. From the theme and the kinds' colours. `replay-rhythm audit 19` (a source scan).

Regression tests: the unit ones (`replay-rhythm audit 1, 2, 5, 6, 9, 10, 11, 12, 15, 17, 18, 19` in `ceremony.test.ts`) were written before their fixes; the e2e ones (`audit 3, 4, 7, 13` in the `replay` journey) alongside them, run against the fixed build only. The RR5 test lost an `||` that let it pass without ever fitting the cap; the RR7 and RR13 e2e checks now compare the walker's position, not only the minute clock.

Rejected from its UI notes: the screen reader's steps saying "1 of 3" (RR17 keeps that path as it was, the owner's call). Noted: the Undo toast can sit over the clock for its 5 s after a deletion during the path (accepted as is).

## Audit, round 2 (2026-11-04)

A second `auditor` pass, independent, on `0307c75`. 10 findings (8 plus two from its UI notes): 9 accepted, 1 accepted in part, 0 rejected.

20. A video or memo loses its end: the slot follows the replay's clock, not the player (an iPhone video refused sound starts muted 0.8 s late, a memo starts after it loads, a video of unknown length gets the 1 s floor): accept. While a playing medium is behind its slot, or not finished when its slot ends, the stage waits for it (`mediaWait`), up to 2 s for one that never starts and its own length for one that does. `replay-rhythm audit 20` (unit on `mediaWait`; e2e: the card's video reaches its end before it tucks).
21. A capture at a run's end, or inside a gap or a pause, stretches its stop across the break, so no cut: accept. A stop's arriving and leaving never cross a run's edge. `replay-rhythm audit 21`.
22. Rebuilding the story mid-path (a moment deleted from the pile, Undo, a note's words edited) keeps the time into the ceremony, so the replay jumps and moments ahead are skipped: accept. The time is re-anchored to the same time of day in the new telling (`msAtClock`). `replay-rhythm audit 22`.
23. A memo started by hand is cut when its bubble leaves, and doesn't resume after Hold: accept. A memo started by hand holds the stage until it ends (with 20) and plays again after Hold. Covered with 20's `mediaWait` test and the e2e's memo check.
24. A stand with no moment makes the clock leap minutes in one frame: accept. Through a stretch the clock rolls with the stretch's time, eased as the walker is; the walker still goes by the metres. `replay-rhythm audit 24` (through `readTrace` and `smoothKept`).
25. The modularity still leaks: nothing can pick a ceremony (the screens call `ceremonyFor()` with no id, and the walk replay's `ceremony` parameter already means a re-watch); a frame with a centre and no zoom puts every projected overlay mid-screen; native centres on the walker, not the frame's camera: accept. A `style` route parameter names the ceremony; a stage with no zoom projects nothing; native follows `follow` when it isn't gliding. `replay-rhythm audit 25` (a unit test on `project`, a source scan that both screens pass a ceremony id).
26. The day's card still counts a moment deleted during its replay: accept. The card and the story read the same day, less what was deleted (`dayWithout`). `replay-rhythm audit 26`.
27. The memo's play button is 26 px on a moving bubble (hitSlop does nothing on the web): accept. 44 px. `replay-rhythm audit 27` (e2e).
28. From its UI notes: the video card's progress bar is a progress bar (RR19): accept, gone. Covered by the e2e's flow.
29. From its UI notes: rgba colours the hex scan misses (the Held pill, Tap for sound, the whisper's halo, the steps' backdrop): accept. From the theme. `replay-rhythm audit 19` now scans rgba too.

In part: a video stored with a length of 0 (its metadata unreadable) still gets the 1 s floor in the plan; `mediaWait` then lets it play on up to the 30 s camera cap.

Tests the auditor called weak, rewritten: `audit 10`'s second half asserted its own object (now `audit 25`'s `project` test); `audit 5` and the new `audit 24` run through `readTrace`, `smoothKept` and `dwellsOf` as `loadReplay` does; the rides helper passes the trace's own ride runs.

Round 2's regression tests were written before their fixes (unit) or alongside them (e2e: `audit 20`, `27`, plus RR10's first e2e check). Writing them found one more: a memo whose file won't play still reports "playing", which held the stage for 30 s; a medium stuck where it is now counts as not playing after 2 s (`mediaWait`'s `stalledMs`).

## Audit, round 3 (2026-11-04)

A third `auditor` pass, independent, on `0717fe5`, weighing what would hurt someone on the web build before it ships. 9 findings (7 plus two from its UI notes): 8 accepted, 1 deferred to the owner. It found no permanent freeze: every wait is bounded and ends on the card.

30. A capture inside a gap (taken just before the fixes came back, after a locked screen) plays at the near side, between two cuts, its card growing from a pin off screen: accept. A moment the trace doesn't cover is where it was taken: the cut before it lands there and the walker waits there; a break of under a minute between it and the trace is a step, not a second cut. `replay-rhythm audit 30`.
31. A rebuilt telling jumps back when the clock stands still (a loose moment's single time, the day's first entry): the re-anchor found the first time with that clock, the stop's start: accept. It keeps how far into that standing still it was (`reanchor`). `replay-rhythm audit 31`.
32. A memo paused with its own button isn't waited for when played again: the stall count latched, and the replay froze while it was paused: accept. Pausing by hand lets the stage go on; playing again by hand is waited for to the end; the stall count resets once the player moves (`trackWait`, in core). `replay-rhythm audit 32`.
33. The frame before the re-anchor drew the old time against the new telling, so a video's card unmounted and its video restarted: accept. The clock re-anchors in render, so the first frame is already in place. `replay-rhythm audit 33`.
34. At a video's slot end it paused for a beat and played its last part with the card shrinking: accept. A video that has started plays on past its slot until it ends (or the wait gives up), and the wait is checked every frame. `replay-rhythm audit 34` (e2e: no pause between its last play and its end, held or viewed aside).
35. A `style` that is an object's own key (`constructor`, `__proto__`) crashed the screen: accept. Only the registry's own entries count. `replay-rhythm audit 35`.
36. Tuning `REPLAY_RHYTHM` would not name the replay journey: accept. Its row covers `motionTokens.ts`, `explore.ts` and `ui.tsx`. `replay-rhythm audit 36`.
37. From its UI notes: a tap on a whisper did nothing (the text sat over the stage): accept, the whisper lets taps through. Covered by code review.
38. From its UI notes: a wait for a medium has no sign (an iPhone memo refused sound stands 2 s, a muted retry about 1 s): deferred to the owner, a new thing on screen (DEFERRED.md).

Tests it called weak, tightened: audit 21's test now checks where the walker is (with 30); audit 4's e2e check requires the card's video paused, not merely absent; the stall bookkeeping is core, tested without the hook.

## Record

2026-11-04, branch `claude/replay-rhythm`. RR1-RR22 built test-first (decisions 0081, 0082) and passing: `npm test` (the `ceremony`, `core`, `days`, `rides` and `explore` suites), typecheck, lint, and the e2e journeys `check:affected` names (`replay`, new; `tabs`, `gaps`, `qol`, `marks`, `nudge`). Three audits: round 1, 19 findings (16 fixed, 1 deferred, 2 rejected); round 2, 10 findings (9 fixed, 1 fixed in part); round 3, 9 findings (8 fixed, 1 deferred to the owner; its regression tests failed before their fixes). Deferred: the trace trailing the walker mid-zip, keeping the screen awake (a new library), the Undo toast over the clock, a sign while the stage waits for a medium. RR17 (the screen reader's steps) has never run: it is native only. The full e2e flow (its replay and day blocks rewritten) runs when the owner asks.

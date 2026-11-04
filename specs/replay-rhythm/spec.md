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

## Record

Not started: the code waits on the owner's go-ahead on `plan.md`.

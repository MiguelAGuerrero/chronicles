<!-- Repo first: not yet a tab of the owner's Claude Docs doc "Explorer App Concept". Written: 2026-11-20. -->

# A place offered after the moment

Nov 20, 2026 · the owner

The owner's words: "I recently moved the capture of a moment to having be opt-in by clicking on a point of interest. I
sometimes notice that while I take a picture of something that happens to be a moment without really looking at on the
screen. So there has to be a fallback, like a little prompt that says assign to point of interest after you take a moment
next to one, where you can choose to assign it to that point or just leave it independent."

Today (decision 0224) a moment is tied to a place only when "Capture here" on the place's card was tapped before it. A
moment taken without looking stays plain, with no way to tie it afterwards. This slice offers the tie once, after the
capture, and never makes it unasked.

## Vision

Idea: After I take a moment next to a point of interest without having tapped "Capture here", a little prompt lets me assign it to that place or leave it independent.
Verb: honour (a moment kept with the place it was about, even when the walker could not look at the screen as they took it).
Touches: decision 0224 ("no automatic find and no which-place chip": the owner reverses the chip half, never the automatic half; a decision records it); Never "Nagging" (a question after a capture can become one: it is asked once per moment, never repeated, and silence means no); Never "A capture behind a menu, a drawer or an extra tap" and Always "Capture is one tap away" (the prompt never covers, moves or waits in front of the capture stack); Always "A moment carries its context" (a moment left independent keeps its vicinity line); Always "Restraint" and Never "Celebration" (plain ink, no accent, no sound or buzz for the prompt itself); Always "Counts are words" and 0099 (places named, never counted); 0234 / MD8 (a find needs Places on).
Verdict: aligned if reshaped
Shape: on the walk screen, with Places on and no place armed, a moment whose fix is within 30 m of one or more unfound places shown on the map gets one quiet line where the armed line sits. One place: "Was this moment about the Old Bridge?" with Yes and Leave it. Several: "Was this moment about one of these? Tap it on the map." with Leave it, and only those places' pins drawn as choices (a ring and their spoken name, never colour alone); a tap on one ties the moment to it. Unanswered, the moment stays independent. The line never moves or covers the capture stack, makes no sound, buzz or accent, is asked once per moment, and never counts.
Precedent: Day One and Apple Journal offer a nearby place the writer attaches or leaves; Swarm has the person pick from the places near them and never assumes the nearest (all from memory, unverified; `docs/research/adjacent-apps.md`, "Tying a moment to a place").
Criteria: PO1-PO12 below.
Open: none (the owner's four answers, Nov 20).

## Decisions (the owner, Nov 20)

- A fallback after the capture: a prompt offers to tie a moment to a place it was taken next to; the walker ties it or leaves it independent. Arming ("Capture here") stays as it is. Amends 0224's "no which-place chip"; a capture still never finds a place by itself.
- "Next to" is within **30 m** of the moment's fix (half the 60 m that misfired; a façade across the street plus GPS error). A fixed rule, not a setting.
- **One place** in reach: the prompt names it. **Two or more**: the places in reach become active on the map and a tap on one ties the moment to it.
- **Only with Places on**: with it off, a moment stays independent and nothing is asked.
- The words say **"about"**, as the arming line does ("Was this photo about the Old Bridge?"), not "assign" (Nov 20, after the mockup).
- **Undo and the left places are kept** (Nov 20): one new `Db` method removes a single find (PO12), and the places left with Leave it are kept per walk so a reload never asks again (PO4). No migration.
- **No time limit**: sitting still within 60 m, the line stays until answered, the next moment, Pause, or 60 m away (Nov 20).
- The prompt **stays until it is answered or the walker moves on** (another moment, or 60 m away from where it was taken); going away leaves the moment independent. It never covers or moves the capture buttons.

## Criteria

1. **PO1** (the owner's task: "after I take a moment next to a point of interest, a prompt lets me assign it to that point or leave it independent") On a walk with Places on and no place armed, a moment kept within 30 m of exactly one unfound place shown on the map brings up a line naming the moment's kind and that place, "Was this photo about <name>?" (video, voice memo, note in their own words), with **Yes** and **Leave it**. Yes ties the moment to the place: the same find "Capture here" makes ("Found: <name>", the place's pin drawn found with the moment's glyph, the replay naming it among the finds), and the line goes.
2. **PO2** (finding) Someone who was not told the prompt exists sees it unasked: it appears within 2 s of the moment being kept, in white words on the ink slab at the top of the map where "The next moment is about …" appears, naming the place in words, with both choices as labelled buttons of at least 44 pt and of equal size. A screen reader hears it as it appears (polite, focus not moved), and the buttons are spoken "Yes, this <kind> is about <name>" and "Leave it, keep this <kind> on its own".
3. **PO3** (several) With two or more unfound shown places within 30 m, the line names them in words, nearest first ("Was this photo about the Old Bridge or the Corn Exchange? Tap it on the map.", the first three by name and never a number past them: "or another place nearby"), with **Leave it**, and exactly those places' pins are drawn as choices: a ring around the head (not colour alone) and the spoken name "<name>, <kind>. Tie this moment to it". A tap on one ties the moment to that place (no card opens) and the line goes; a tap on any other pin opens its card as before. With one place in reach its pin is drawn as a choice too, and a tap on it does what Yes does. "Shown" means Places is on and the place's kind is on in What I'm into, wherever the map is panned; each choice's pin is in view when the line appears (the walk's map follows the walker, and 30 m is inside its view at walking zoom).
4. **PO4** (leave it) Leave it keeps the moment independent: no find, the choices' pins drawn as before, its ordinary context line kept. The moment is never asked about again, on this walk or after a reload, and a place left with Leave it is not offered again on this walk ("Capture here" still ties it). A place whose line went unanswered (a newer moment, walking off) can be offered again.
5. **PO5** (when nothing is asked) No line appears when: Places is off; a place was armed (the capture finds the armed place, as TC4, and nothing is asked); no unfound shown place is within 30 m (a place 31 m away, a place already found, a place of a kind switched off in What I'm into); the moment has no fix; the moment was kept off the walk screen (the recording bar, Chronicle's toolbar, the ready screen, a reply). A capture still never finds a place by itself (TC1 holds).
6. **PO6** (how long it stays) The line stays until answered or: a newer moment is kept (its own line, or none, replaces it; the earlier moment stays independent); the walker is more than 60 m from where the moment was taken; Places is turned off; "Capture here" is tapped on a place (its armed line takes the slot); the moment is deleted (gone into Undo); every place it offered is found another way; the walk is paused or ends. With no fix it holds, and the 60 m rule applies once a fix returns. None of these makes a find.
7. **PO7** (capture stays one tap) While the line is up, the capture stack stays where it was, uncovered and enabled, and a photo, memo or note still takes one tap; "Add to this moment" adds to the moment as before, and a piece added to it neither asks again nor clears the line. The line itself makes no sound and no buzz (the offer never calls `feedback()`, a unit test) and uses no accent colour; only a Yes or a tap on a choice gives the find's usual feedback.
8. **PO8** (no count) No surface counts places offered, tied through the prompt or left; the line names a place or says "one of these", never a number of places.
9. **PO9** (the same find) A moment tied through the prompt is a find like any other: one find per place, the first stands; the replay never says it was passed without stopping; deleting the moment frees the place (deletion audit 6).
10. **PO10** (every kind) A photo, a video, a voice memo once saved, and a note once kept each bring the line under the same rules.
11. **PO11** (words, not tallies or nagging) The line's words are neutral and plain: no "Don't forget", no "!", no exclamation of success; Leave it is said as an equal choice, not a dismissal styled smaller than Yes.
12. **PO12** (a wrong tie undone) A tie made from the line or a choice's pin shows "Found: <name>" with **Undo**, which stays until used or dismissed (as the app's Undo, 0113). Undo removes that find and keeps the moment whole; the place can be found again, and is not offered again for that moment.

## Steward (Nov 20)

S1 accepted (PO12, Undo for a tie). S2 accepted in part (PO4: an explicit Leave it is not asked again for that place on this walk; silence is not a no, or three quick photos without looking would lose the fallback). S3 accepted (PO3: "shown" defined, names in words, pins in view). S4 accepted (PO1: the line names the moment's kind). S5 accepted (PO6: pause clears; no fix holds). S6 accepted (PO2 spoken labels and equal size; PO7 a unit test that the offer never calls `feedback()`). Silent: a moment left 15 m from a place keeps the replay's "Passed … without stopping" only within the pass-by distance (8 m default), unchanged; the decision says the prompt needs Places on, and adds a row to VISION.md's Precedents.

## How adjacent apps do it

- **Day One**: an entry's place is offered from nearby places and the writer picks one or none; the entry keeps only coordinates until then. Source: from memory, unverified. **Unverified**.
- **Apple Journal**: a suggestion carries a place the person can attach or leave; nothing is attached unseen. Source: from memory, unverified. **Unverified**.
- **Swarm (Foursquare)**: the person picks the venue from a list of places near them and checks in; it never assumes the nearest. Source: from memory, unverified. **Unverified**.

All three ask before the entry is kept, as part of writing it; none asks after a photo already taken. Ours asks after, because the capture itself must stay one tap (VISION.md, Always).

## Record

Not started: the plan waits for the owner (`plan.md`).

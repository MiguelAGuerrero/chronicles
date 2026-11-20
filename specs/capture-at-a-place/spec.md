# Capture at a place

Nov 20, 2026 · the owner

The owner's words: when capturing a point of interest, the app says that the next moment captured will be assigned to
the point of interest, which is a lot of unnecessary friction. Instead, clicking on a point of interest should just
bring up the capture actions of voice note, picture or video, or note, in line.

The owner's answers (Nov 20): the actions sit on the place's card (its name, distance and Route here stay); one camera
button for a photo or a video, as the capture stack has; only within 60 m of the place, as "Capture here" was; the
card closes once a capture starts. Amends decision 0224 (its "Capture here" arming and the armed line) and
`specs/tap-to-capture-places` TC3 and TC4.

## Vision

Idea: Tapping a place's pin brings up the capture actions (camera, voice memo, note) on its card; a capture from there is the place's moment at once, with no "the next moment is about" step.
Verb: honour (a moment kept for its place on purpose, one tap from the place's card instead of two taps and a wait).
Touches: Always "Capture is one tap away on every screen you walk or capture from" (the stack is unchanged; the card's row is an addition, never a replacement); Never "A capture behind a menu, a drawer or an extra tap" (this removes a step: Capture here, then the stack); Always "A moment carries its context" (the moment keeps its place line, time and walk); Never "Celebration" (no toast, accent or count for a find; the pin turns found as today); 0224 (a capture finds a place only by the walker's choice; kept: the choice is now the tap on the card's button itself); 0099 (finds named, never counted).
Verdict: aligned
Shape: as asked. The card keeps its name, distance and Route here; "Capture here" becomes a labelled row of three (Camera, Voice, Note), the stack's own three kinds in plain ink; a tap closes the card and starts that capture; the moment it keeps finds the place. A capture cancelled or discarded finds nothing. Plain capture from the stack is unchanged and never finds. No armed line, no "next moment" anywhere.
Precedent: Google Maps (a place's sheet has "Add photos", which takes the photo for that place in one step; from memory, unverified); Swarm (the check-in screen for a chosen venue has a camera button in line, and the photo belongs to that check-in; from memory, unverified); Apple Journal (a place is attached to the entry the person is writing, never to a later one; from memory, unverified).
Criteria: CA1-CA12 below; the gate's own: the stack stays one tap and never finds (CA6), no "next moment" words anywhere (CA5), no celebration (CA8).
Open: none (the owner's four answers, Nov 20).

## Decisions (the owner, Nov 20)

- The capture actions are on the place's card; its name, distance and Route here stay.
- One camera button (photo or video, the system camera), then Voice, then Note: the capture stack's kinds.
- Only within 60 m of the place, as before; farther, the card says so in words.
- The card closes once a capture starts; more pieces go through the usual "Add to this moment" pill.
- A found place offers the row again (steward S4, the owner's answer): its pin opens its card, which lists the moments
  taken here, in words, each opening it.
- No new stored link (the owner, after an audit of `moment` and `find`): a moment already keeps its spot, so a found
  place's card lists the moments within 60 m of it, read by spot; a capture from a found place's card is a plain moment
  there. Only the first card capture at an unfound place writes the `find` row, as today. No schema change.

## How adjacent apps do it

- **Google Maps**: a place's sheet carries "Add photos"; the photo taken or picked is posted for that place, with no step that ties the next one. Source: from memory, unverified. **Unverified**.
- **Swarm (Foursquare)**: the person picks the venue, and its check-in screen has a camera button in line; the photo belongs to that check-in. Source: from memory, unverified. **Unverified**.
- Not taken: Swarm's streaks and stickers (`docs/research/adjacent-apps.md`, counter-examples), Google Maps' contributor points and levels (from memory, unverified). A find stays unannounced (CA8) (steward S6).
- **Apple Journal**: a place is attached to the entry being written, never carried over to the next one. Source: from memory, unverified. **Unverified**.

## Criteria

1. **CA1** The owner's task, "capture a moment for this place": on a walk, a tap on an unfound named place within 60 m opens its card, and the card shows three capture buttons in one row, each in ink with an icon and a word people know for the job ("Camera", "Voice", "Note"), each at least 44 pt, above Route here. Finding: someone who was not told where they are finds them on the card the pin opens.
1b. **CA1b** Within 60 m the capture row comes first on the card, in ink, and Route here follows it as a secondary button; nothing on the card is accent-filled. Farther than 60 m, Route here keeps its look as today (steward S1).
2. **CA2** Camera on the card closes the card and opens the camera; the photo or video it keeps is a new moment of the walk, and that moment finds the place (one find per place, the first stands, its `capture_id` the moment).
3. **CA3** Voice on the card closes the card and starts a voice memo with the stack's usual Stop and save and Discard; the memo saved is a new moment that finds the place.
4. **CA4** Note on the card closes the card and opens the note's page; the note kept is a new moment that finds the place.
5. **CA5** Nothing says "the next moment": no armed line, no Cancel for it, no "Capture here" button and no "ties the next moment" sub-line on any screen; the card's line for a named unfound place describes, never urges: "A moment taken here is kept with Hessian Memorial." Neither the card's lines nor anything after a capture says find, collect or unlock (steward S5).
6. **CA6** A capture the card did not start never finds a place: a capture from the stack, the Add to this moment pill or Memories, before or after a card capture, keeps its ordinary context line and finds nothing (TC1, TC5 stand).
7. **CA7** A card capture that keeps nothing finds nothing, and leaves nothing pending: the camera cancelled, a memo discarded or too short, a note closed empty. The next stack capture after it finds nothing.
8. **CA8** No celebration and no count: the find is said as a find is today (the plain-ink "Found: <name>" line and the pin's one pulse, decision 0172, M12) and nothing more: no accent colour, sound beyond the capture's own, or count of finds or places. The moment's own time and distance are said as for any moment (steward S3, narrowed: the "Found" line predates this slice and the owner did not ask to change it).
9. **CA9** Farther than 60 m from a named place, the card shows no capture row and says in words, describing ("Moments are kept with it from within 60 m."); Route here stays. 

10. **CA10** A card capture's moment arrives whole: the same context line as a stack capture at the same spot and minute (its street or place, its time, its walk), its place in the walk's order kept; the place's name is added where a find names it today, never replacing that line. A held capture kept by Retry finds the place too (steward S2).

11. **CA11** The owner's task, "see and add to the moments at a place I found": a found place's pin opens its card (it no longer opens the finding moment directly). Under the name, "Moments here" lists the moments taken within 60 m of the place, newest first, at most three, each a line in words saying its kind and when ("A video, Nov 12, 40 minutes in"), each opening that moment in the viewer; no count of them anywhere. Within 60 m the capture row shows as on an unfound place's card (CA1, CA1b). Finding: someone who was not told finds the earlier moment by tapping the found pin.
12. **CA12** A capture from a found place's card is a plain moment at that spot: it writes no second find, the place's pin keeps the glyph and spoken name of the moment that found it, and the new moment is listed on the card's "Moments here" the next time it opens.

## Not here, and why

- **The ready screen and Explore**: a place's card opens only on a walk's map (`walk.tsx`, `onDiscoveryPress`); the
  ready screen and Explore's map have no place card with capture today. Not changed.
- **"About" a place**: the found card's list is by spot, so a moment taken within 60 m about something next door is
  listed too; the words say "Moments here", never "about it" (the owner's call, Nov 20).
- **Older moments at a place**: past the newest three they are not on the card; Chronicle and the map hold them.
- **A piece added to the moment**: the card's capture is always a new moment; adding to it is the pill's job (MS1-MS6).

## Record (2026-11-20)

CA1-CA12 pass: unit `explore/captureAtPlace.test.ts` (CA1-CA12, ui 2, ui 3); journey `walk` (CA1, CA1b, CA2-CA5, CA7,
CA8, CA11, CA12, ui 1, ui 4) and `unsaved` (a held capture's Retry keeps its stamp) on the web build. CA9 and CA10 are
held by unit tests only. CA3 and CA4 are proven in the journey up to the capture each opens (a memo begun, the note's
page open), and in the unit tests through the keep path all three kinds share. TC3 and TC4 are retired; TC1, TC5 and
tap-to-capture-places audits 2-5, MD8, tend walk-screen 13, MS3 and the native-map-frames guard are re-held on the new
code. `check:test-first` reads 9 of 12: in the tests-first commit (`4ec84b7`), the comments "(CA1-CA8)" and "(CA2)" sit
on the line after a real `check(`, which the script joins to it, so CA1, CA2 and CA8 read as real there. Their todos
(lines 307, 403 and 405 of that commit) did come first. The walk journey's render budget sets the new card taps (steps
14 and 27) aside and says both rates: 1.84/s without them (1.78 to 1.91 before), 2.04/s with them.

Native: the card's row, the stamp's place through the camera, recorder and note page, and the found pin's tap have
never run on a device (`docs/NATIVE_UNVERIFIED.md`, three CA items). Decision 0240.

### The UI review and the cold find (2026-11-20)

The cold find placed all three tasks (Voice on the card; Camera on the card; the found pin, then a line and Note). Its
doubts: two look-alike sets of capture buttons (the card's and the stack's), "Camera" not naming video, and which
marker a found card belongs to.

- Before the review: "Camera" was cut at its button's edge at 390. **Fixed**, `capture-at-a-place ui 1` (icon over word,
  whole at 390 and 320).
- U1 (medium; and the cold find's two mics): the card's line now names the card's own buttons: "Camera, Voice or
  Note here keeps the moment with <place>." **Fixed**, `ui 2`.
- U2 (medium): the found pin answered only on its own 20-odd px. **Fixed**, `ui 4`: 44 px round its head, under the
  moments' pins, which keep their taps. Its look (small, nameless) is **for the owner** (docs/STATUS.md).
- U3 (medium): moments from a minute ago read "late last night". **Fixed**, `ui 3`: a moment of the walk in progress
  is "on this walk".
- U4 (200% text), U5 (the X beside Route here, older than this slice), U6 (two note glyphs, older), U9
  (the card over its pin), and the cold find's "Camera" without video: **deferred** (docs/DEFERRED.md).
- U7 (a memo begun on the card shows only its timer): **rejected by the owner** (Nov 20, "keep it as is"): the timer pill
  stays as it is, the live sign that the mic is recording, with no place name in it.
- U8 (the 20 s refusal beside "Video saved here"): **rejected**, the journey's own order (a refused clip, then the kept one).

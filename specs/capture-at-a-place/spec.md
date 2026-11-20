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
Criteria: CA1-CA9 below; the gate's own: the stack stays one tap and never finds (CA6), no "next moment" words anywhere (CA5), no celebration (CA8).
Open: none (the owner's four answers, Nov 20).

## Decisions (the owner, Nov 20)

- The capture actions are on the place's card; its name, distance and Route here stay.
- One camera button (photo or video, the system camera), then Voice, then Note: the capture stack's kinds.
- Only within 60 m of the place, as before; farther, the card says so in words.
- The card closes once a capture starts; more pieces go through the usual "Add to this moment" pill.

## How adjacent apps do it

- **Google Maps**: a place's sheet carries "Add photos"; the photo taken or picked is posted for that place, with no step that ties the next one. Source: from memory, unverified. **Unverified**.
- **Swarm (Foursquare)**: the person picks the venue, and its check-in screen has a camera button in line; the photo belongs to that check-in. Source: from memory, unverified. **Unverified**.
- **Apple Journal**: a place is attached to the entry being written, never carried over to the next one. Source: from memory, unverified. **Unverified**.

## Criteria

1. **CA1** The owner's task, "capture a moment for this place": on a walk, a tap on an unfound named place within 60 m opens its card, and the card shows three capture buttons in one row, each in ink with an icon and a word people know for the job ("Camera", "Voice", "Note"), each at least 44 pt, beside Route here. Finding: someone who was not told where they are finds them on the card the pin opens.
2. **CA2** Camera on the card closes the card and opens the camera; the photo or video it keeps is a new moment of the walk, and that moment finds the place (one find per place, the first stands, its `capture_id` the moment).
3. **CA3** Voice on the card closes the card and starts a voice memo with the stack's usual Stop and save and Discard; the memo saved is a new moment that finds the place.
4. **CA4** Note on the card closes the card and opens the note's page; the note kept is a new moment that finds the place.
5. **CA5** Nothing says "the next moment": no armed line, no Cancel for it, no "Capture here" button and no "ties the next moment" sub-line on any screen; the card's line for a named unfound place says what the row does in plain words ("Capture it here, and the moment is this place's.").
6. **CA6** A capture the card did not start never finds a place: a capture from the stack, the Add to this moment pill or Memories, before or after a card capture, keeps its ordinary context line and finds nothing (TC1, TC5 stand).
7. **CA7** A card capture that keeps nothing finds nothing, and leaves nothing pending: the camera cancelled, a memo discarded or too short, a note closed empty. The next stack capture after it finds nothing.
8. **CA8** No celebration and no count: after the find, the place's pin turns found as it does today; no toast, accent colour, sound beyond the capture's own, or count says it.
9. **CA9** Farther than 60 m from a named place, the card shows no capture row and says in words why ("Within 60 m, you can capture it here."); Route here stays. A place found while its card is open shows "Found." and no row.

## Not here, and why

- **The ready screen and Explore**: a place's card opens only on a walk's map (`walk.tsx`, `onDiscoveryPress`); the
  ready screen and Explore's map have no place card with capture today. Not changed.
- **A found place**: its pin opens the capture that found it, never the card (unchanged); a second moment about it is a
  plain capture near it.
- **A piece added to the moment**: the card's capture is always a new moment; adding to it is the pill's job (MS1-MS6).

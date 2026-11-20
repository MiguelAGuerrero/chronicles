# 0240. The editor opens by itself after a photo or video, before it is looked at on the map

Date: 2026-11-20 · Status: accepted · Area: captures, media editing, tabs · Amends: ME23 (`specs/media-editing`) · Supersedes: 0149 · From: `/fix` (edit-after-capture)

## Context
ME23 offered Edit for six seconds wherever a photo or video was just kept (the walk screen, Navigate's ready screen,
Memories' line), and 0149 made the recording bar's offer a pill above the bar that waited. Either way the photo landed
on the map first, and editing it took a second tap on a pill. The owner, Nov 20: "the anticipated flow is that I should
be able to edit after I accept the photo and confirm that's what I want. Before it lands into the map, rather than it
landing on the map and then choosing to edit it afterwards."

Adjacent apps: Instagram and Snapchat open their editor straight after the shutter (from memory, unverified); Apple
Photos and Google Photos keep the shot first and edit it later from the photo's own toolbar
(`docs/research/adjacent-apps.md`).

## Decision
The owner's answers to `/fix`'s question, each its recommended option (the first two bullets), with what the fix's
review added within them (the rest):

- **The editor opens by itself** once the system camera's photo or video is accepted and kept, as a new moment or as
  a piece of an open one (`editAfter`, `editingOf`, `lib/editOffer`; `useEditAfterCapture`, `components/edit/EditOffer`). The capture is stored first, as
  every capture is (a save never waits, and nothing is lost if the app dies mid-edit); the editor, a Modal of its own
  on Crop, covers the screen, so the moment is first seen on the map with its edits. Done saves them (ME2, ME20,
  ME21); Close with no change keeps it as taken, and Close after a change asks first (ME2).
- **Photos and videos, on the four places the question named:** the walk screen, Navigate's ready screen, the
  minimized walk's recording bar and Memories' line. The Edit pill goes from all of them (`capture-offer`,
  `bar-edit-offer`). A piece added to an open moment opens its editor too, on that piece (the review's audit 2: on
  Memories a second photo joins the open entry by default, JN15, and stayed two taps away).
- The editor says the shot is kept ("Photo kept", where the disabled Revert sits until the first edit) and its ✕ is
  named "Close, the photo stays as it is" (audit 1), so ✕ never reads as "throw it away".
- No editor opens while the walk is stopping or once it has ended (the walk screen's Stop, the bar's), or once the bar
  has asked for the walk screen (0149's tend tabs audit 19 kept; audits 3, 5, 6). In Memories' composer it is drawn
  inside the composer's Modal, never over it, the field letting go of its focus meanwhile (audits 4, 7).
- The other places a photo is taken (the walk planner's capture stack, Respond in the viewer, the note page's camera)
  were not in the question: they open none, and the owner is asked (`docs/STATUS.md`, "From /fix").

The owner was told the cost once (0094): several photos in a row now each need the editor closed between them; the
shutter is still one tap.

## Consequences
- 0149's pill, its rules (`barOffer*` in `lib/recordingBar`) and its words are gone; the bar's line kept its time and
  distance through the pill and still does. `tabsHidden.barOfferUp` is no longer set, and its readers (Explore's press
  hint, the storage notice's sight) read it false: removing them waits in `docs/DEFERRED.md`.
- The web's "keep this app's data" refusal (SA10), asked after a moment kept off a walk, now comes while the editor is
  up; a refusal is never owed (tend tabs audit 31), so it is said at the next look off the walk (Navigate, ready shown
  again, or Memories), as it already was behind Memories' pills. The `space` journey steps away and back for it.
- The spec's ME23 text still describes the six seconds' offer; this record amends it, as 0149 did, until the owner's
  doc and its mirror are amended (`docs/STATUS.md`, "Open before the loop").
- Checks: `captures/editAfterCapture.test.ts` (the rule and every host), the `edit` journey (each place opens its
  editor, no pill after), and the journeys that take a photo close the editor where they once waited for the pill.
- Native: the editor's Modal opening as the system camera closes has never run on a device (`docs/NATIVE_UNVERIFIED.md`).

## Addendum (the owner, Nov 20: fix planner-edit)
The open question above, answered: **the walk planner's camera yes; Respond and the note page's camera no.** The
planner's capture stack (`planner/PlannerCapture`, WP23, on the walk planner and the outing page while a walk records)
keeps a new moment of the walk, so its editor opens by itself as on the walk screen, behind the same stop guard as
Memories' line. Respond's camera (a reply, inside the viewer) and the note page's (a photo mentioned in a note, NP14)
open none: they are edited later from the viewer. The planner and the outing page close on Escape from a window
listener of their own; with a Modal up over them (the editor, the note's page) Escape is now that Modal's, so it never
closes the page and its editor's unsaved edits with it (ME2). Checks: `editAfterCapture.test.ts` (`fix planner-edit`)
and the `planner` journey.

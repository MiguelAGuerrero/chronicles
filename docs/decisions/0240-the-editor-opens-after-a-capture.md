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
The owner's answers to `/fix`'s question, each its recommended option:

- **The editor opens by itself** once the system camera's photo or video is accepted and kept as a new moment
  (`editAfter`, `lib/editOffer`; `useEditAfterCapture`, `components/edit/EditOffer`). The capture is stored first, as
  every capture is (a save never waits, and nothing is lost if the app dies mid-edit); the editor, a Modal of its own
  on Crop, covers the screen, so the moment is first seen on the map with its edits. Done saves them (ME2, ME20,
  ME21); Close with no change keeps it as taken, and Close after a change asks first (ME2).
- **Photos and videos, everywhere a photo is taken:** the walk screen, Navigate's ready screen, the minimized walk's
  recording bar and Memories' line. The Edit pill goes from all of them (`capture-offer`, `bar-edit-offer`).
- A piece added to an open moment (Add to this moment, Group captures) opens none, as it was offered none: its moment
  is already on the map, and Edit stays in the viewer.
- On the recording bar, no editor opens while the walk is being stopped from the bar (0149's tend tabs audit 19 kept).

The owner was told the cost once (0094): several photos in a row now each need the editor closed between them; the
shutter is still one tap.

## Consequences
- 0149's pill, its rules (`barOffer*` in `lib/recordingBar`) and its words are gone; the bar's line kept its time and
  distance through the pill and still does. `tabsHidden.barOfferUp` is no longer set, and its readers (Explore's press
  hint, the storage notice's sight) read it false: removing them waits in `docs/DEFERRED.md`.
- The spec's ME23 text still describes the six seconds' offer; this record amends it, as 0149 did, until the owner's
  doc and its mirror are amended (`docs/STATUS.md`, "Open before the loop").
- Checks: `captures/editAfterCapture.test.ts` (the rule and every host), the `edit` journey (each place opens its
  editor, no pill after), and the journeys that take a photo close the editor where they once waited for the pill.
- Native: the editor's Modal opening as the system camera closes has never run on a device (`docs/NATIVE_UNVERIFIED.md`).

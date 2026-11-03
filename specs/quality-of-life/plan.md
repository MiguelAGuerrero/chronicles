# Quality of life, round 3: plan (Chronicle basics, QL22-QL28)

The owner asked for the round to run end to end without stopping (Nov 3: "work autonomously";
checkpoints per feature are for manual checks, never blockers), so this plan is recorded rather
than held for review.

## Files

| Criterion | Files |
|---|---|
| QL22, QL23 rename | `lib/rename.ts` (new, pure), `components/WalkActions.tsx` (Rename item and editor), `app/(tabs)/chronicle.tsx` and `app/replay/[id].tsx` (show the new name: `onDone('rename', walk)`) |
| QL24, QL25 edit a note | `lib/noteEdit.ts` (new, pure), `components/CaptureView.tsx` (Edit note item, an overlay editor like `CaptionEditor overlay`), `lib/useCaptures.ts` (`setNote`), the viewer's callers (walk screen, Navigate's live walk, replay, Chronicle, day) pass `onSaveNote` |
| QL26, QL27 pin thumbnails | `lib/pins.ts` (`pinThumb`), `components/CapturePinView.tsx` (round picture via `useMediaUri`), `components/map/WalkMap.web.tsx` (marker key includes the thumb), `WalkMap.native.tsx` |
| QL28 months | `lib/months.ts` (new, pure), `components/HomeSheet.tsx` |

## Data

No new storage. Rename writes `walk.title` and `walk.epilogue` (fields that exist); a note edit
writes `capture.body`; a capture's own fields stay truth, edited in place like a caption.

## Tests per criterion

- QL23 `src/lib/__tests__/rename.test.ts`; QL25 `noteEdit.test.ts`; QL26 `pins.test.ts` (pinThumb);
  QL28 `months.test.ts`.
- QL22, QL24, QL26, QL27, QL28 on screen: the `qol` e2e (`E2E_ONLY=qol`).

## Deferred

- Editing a voice memo's or video's words (they have none); renaming a day.

## Native (unverified on a device)

The rename editor inside the actions Modal and the note editor inside the viewer Modal (iOS
can't stack Modals: both are overlays inside the one Modal), the round picture inside a
MapLibre RN Marker.

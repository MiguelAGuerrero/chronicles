# Plan: capture at a place

Spec: `specs/capture-at-a-place/spec.md` (CA1-CA9). Amends decision 0224 and `specs/tap-to-capture-places` TC3, TC4.

## The idea in one line

Today: pin, then card, then **Capture here**, then a line "The next moment is about X", then a capture from the stack;
whichever capture comes next finds the place. After: pin, then card, then **Camera**, **Voice** or **Note** on the card;
the place goes with *that* capture, carried on its stamp, so there is no "next" to get wrong and nothing left armed.

## Files to touch

| File | Change |
|---|---|
| `src/lib/pieceStamp.ts` (core) | `stampFor(t, pos, into, place?)`: a stamp carries the place key it was taken for (`place: string \| null`), never with `into` (a card capture is a new moment) |
| `src/lib/useCaptures.ts` (view hook) | `takePhoto(into, place?)`, `startVoice(into, place?)`, `beginNote(into, place?)` pass it to `stampNow`; `onKept(momentId, piece, place)` hands it back when a moment is kept. A held capture keeps its stamp, so a Retry finds too |
| `src/lib/explore/explore.ts` (core) | Out: `Armed`, `armedLine`, `armedFind`, `armedStill`. In: `cardCapture(item, here, found)` → `{ row: boolean, line: string }` (the row within 60 m and unfound; the words for CA5 and CA9), and `findOnKept({ place, piece, momentId }, items, found)` → the find to record or `null` (CA2-CA4, CA6, CA7). `canArm` folds into `cardCapture` |
| `src/lib/explore/useExplore.ts` (view hook) | Out: `armed`, `arm`, `disarm`, the arming effects and `handled`. In: `findFor(placeKey, momentId)`, which calls the existing `record` (one find per place, the first stands) |
| `src/app/walk.tsx` | The card: "Capture here" and the "ties the next moment" sub-line out; within 60 m, a row of three labelled buttons (`mark-camera`, `mark-voice`, `mark-note`; icon and word, 44 pt+, ink) first, then Route here as a secondary button (CA1b); farther, Route here as today; each closes the card and calls `photo(null, key)`, `startVoice(null, key)`, `openNote(null, key)`. The armed line and its Cancel out; the pill's `!!explore.armed` out. `onKept` calls `explore.findFor` when `place` is set |
| `src/components/notePage/NewNotePage.tsx` | A `place` prop passed to `cap.beginNote` |
| `scripts/features.js` | `IN_PROGRESS` entry; `RETIRED['tap-to-capture-places']`: TC3, TC4 (superseded by CA1-CA9) |
| Tests and docs | below |

No new screen, route or component file. `components/walk/CaptureStack` is not reused for the row: it is a vertical column
of round icon buttons at the edge; the card wants a horizontal row with words (ui-patterns: labelled toolbars, T5).

## Data

None new. The find is today's `place_finds` row (`capture_id` the kept moment), written by today's `record`. No SQLite
migration, no IndexedDB `VERSION`. The stamp's `place` lives only in memory and in a held capture's record in
`unsaved` (it is part of `Stamp`, already serialised whole; an old held capture reads `place` as missing, so null).
No derivation rule changes: `SNAP_RULES`, `STREET_CODE`, `LANDING_CODE` untouched.

## Tests per criterion

New unit file `src/lib/__tests__/explore/captureAtPlace.test.ts` (feature `explore`):

| Id | Test |
|---|---|
| CA1 | `cardCapture`: an unfound named place within 60 m gives the row; journey `walk`: the card shows Camera, Voice, Note, each visible, in ink, ≥ 44 px, one row at 390 and 320 |
| CA1b | journey `walk`: within 60 m the row's top is above Route here, Route here is the secondary variant, no accent fill on the card; past 60 m (Fox Point Museum or a far "?") Route here is primary as today |
| CA2 | `findOnKept` for a new photo/video moment with a place → that place's find with the moment's id; `stampFor(.., place)` carries it; journey `walk`: card Camera, the video, "Found with a video: Hessian Memorial" |
| CA3 | `findOnKept` for a voice moment with the place; journey `walk`: card Voice on a second place (Grace Church, if within 60 m on the route; else a fixture place added off the other journeys' paths) starts the memo, Stop and save, found with a voice memo |
| CA4 | as CA3 for a text moment; journey `walk`: card Note on a third place (Coffee Exchange, same proviso), write a line, keep, found with a note |
| CA5 | `cardCapture(...).line` words; a source scan of `walk.tsx` and `explore.ts`: no `armed`, "next moment" or "Capture here"; journey: no `armed-line`, no text "next moment" after a card tap |
| CA6 | `findOnKept` with no place, and with a piece (`into`), → null; `stampFor` with `into` drops the place; journey: a stack capture after a card capture finds nothing new |
| CA7 | `findOnKept` is only called on a kept moment (nothing kept, nothing found); journey: card Camera then the chooser cancelled, then a stack capture near the same place: not found |
| CA8 | journey: after the find, no toast saying found, no accent fill, no count of finds or places (the moment's own time and distance allowed); the pin's spoken name is the found one, as today |
| CA10 | journey `walk`: the card's video and a stack capture's context lines in the viewer share their form (street, minutes in, the walk); unit: `stampFor` with a place keeps `t`, `at`, `walk` as without; `unsaved` journey run once (Retry keeps the stamp) |
| CA9 | `cardCapture` past 60 m: no row, the line "Within 60 m, you can capture it here."; found: "Found.", no row |

Rewritten or removed with the arming: `explore/tapToCapture.test.ts` TC3, TC4 and audits 2-5 (they test the arming,
which goes; each audit's concern is re-held: audit 2 by CA9, audits 3-5 by CA6 and CA7, since nothing is left armed to
outlive Places off, a find elsewhere or an earlier capture); `explore/placesOnWalk.test.ts` MD8 (the card's row needs
Places on, as the card itself does: kept as a check on `cardCapture`'s caller); `walk-screen/sweep.test.ts` "tend
walk-screen 13" (the pill no longer has an armed state to hide for). Each removal is named in the commit.

## Testing's size

**Flow** (decision 0223): one screen's controls change, and the capture's stamp is wiring between the card, the camera,
the memo and the note page. Journeys:
- `walk` (2 to 5 min): holds TC1, TC3, TC4 today and gets CA1-CA8; it is the only journey naming `mark-capture`,
  `armed-line` or `armed-cancel` (grep).
- `unsaved` (the held-capture path carries the stamp; about 2 min, unmeasured): run once, no new check.
About 7 minutes in all. `edit`, `space`, `threads` import `useCaptures` but hold no check on the stamp: reach, not run.

## Deferred

- The ready screen and Explore's map have no place card with capture today; not added (spec, "Not here").
- A second moment about a place already found: a plain capture; the found pin keeps opening its capture.
- Reload with a card capture in flight (the camera open): the capture keeps its stamp only in memory; a reload drops
  the capture itself, so nothing is tied silently.

## Native, never run on a device

The card's three buttons opening the system camera, the recorder and the note page on iOS and Android; the find after
each. Items in `docs/NATIVE_UNVERIFIED.md`: **Do:** on a walk, tap a place within 60 m, then Camera, take a photo.
**Expect:** the card closes, the photo is kept, the place's pin turns found with a photo (CA2). The same for Voice (CA3)
and Note (CA4). The old "Capture here" item is removed.

## Cost

A tap's work: one stamp field, one `record` per kept card capture (one `addFind`, as today). Removes the per-fix
`armedStill` memo and the per-capture-list `armedFind` effect. Nothing per frame or per fix is added. No harness:
there is nothing at scale to measure.

## The screen, action by action

| Action | Goal, how often, situation | Control | Matrix (ui-references §2) | Adjacent apps |
|---|---|---|---|---|
| Photo or video for this place | keep what the place looks like; once per place, standing in front of it, one hand | `mark-camera`, icon camera + "Camera" | Row 5 (choose a kind to create) says a pull-down menu for three or more kinds; **departed**, as the capture stack does: a menu is "a capture behind a menu" (VISION.md, Never). Row 22 (capture while walking): 44 pt or more | Google Maps: "Add photos" on the place's sheet |
| Voice memo for this place | say what it is like; occasional, walking | `mark-voice`, mic + "Voice" | same row | Swarm: the check-in's own composer |
| Note for this place | a line about it; occasional, stopped | `mark-note`, pencil + "Note" | same row | Apple Journal: the place is on the entry being written |
| Go to it (unchanged) | reach a place seen on the map | Route here, primary | one primary per bar | as today |

**Against precedent:** none of the three apps arms a "next" capture; this shape now matches all three. Departures:
Google Maps posts the photo publicly, ours stays on the device (Never: data leaving the device); and the matrix's row 5
would put three kinds behind a + menu, which the vision forbids for capture (the stack already departs the same way).

**Where the owner will look first:** on the card the pin opens, where "Capture here" was. They see three labelled
buttons in a row, in ink, under the place's name and distance, above Route here.

**Defaults that make a control quieter (the owner can overrule):**
1. Within 60 m the three capture buttons lead the card, in ink, and Route here drops to secondary (steward S1, CA1b);
   farther away the card is as today. Nothing on it is accent-filled.
2. Words are short ("Camera", "Voice", "Note"), the spoken names long ("Take a photo or video of Hessian Memorial").
3. No haptic on the card's tap beyond the capture's own (the stack's `feedback('tap')` after a keep, as today).

## Decision record

The owner's Nov 20 answers (the row on the card, one camera, 60 m, the card closes) and whatever they answer on S4
become a decision of their own, amending 0224, numbered with `npm run book:next-decision` when written (steward,
silent 2).

## Steward (Nov 20)

No breach, four drifts, one tone.

- **S1** Route here primary while you stand at the place: **accepted**, CA1b.
- **S2** No criterion held the moment's context: **accepted**, CA10.
- **S3** "No digits" would fail on a moment's own time or pass by hiding it: **accepted**, CA8 reworded.
- **S4** Capture only for unfound places reads as collecting: **for the owner** (the found pin opens its capture
  today; offering the row again changes that tap).
- **S5** The card's lines urge: **accepted**, CA5 and CA9 reworded to describe.
- **S6** Precedents' counter-examples unnoted: **accepted**, "Not taken" line in the spec.

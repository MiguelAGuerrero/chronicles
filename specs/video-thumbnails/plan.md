# Video thumbnails: the plan

The spec is `specs/video-thumbnails/spec.md` (VS1-VS9). The owner reviews this before any code.

## How it works

A video's small copy is the same thing as a photo's: a 240 px JPEG stored as the piece's `thumb_path` (TH1), named by
the piece (and by its edit, ME20), made by the same job (`thumbJob`: one per piece at a time, `THUMB.none` when it
won't decode). Only the first step differs by kind: a photo is decoded bounded to 240 px; a video gives up one frame,
at its kept part's start, which then goes through the same crop, rotation and save.

- **Phones:** `createVideoPlayer(uri)`, wait for `readyToPlay`, `generateThumbnailsAsync([start], { maxWidth: 240,
  maxHeight: 240 })` (expo-video 58); the frame is a `SharedRef<'image'>`, which `ImageManipulator.manipulate` takes as
  it is; release the player.
- **The web (the exception, VS8):** expo-video's web `generateThumbnailsAsync` throws "not supported on Web yet". A
  detached `<video muted playsInline>` loads the file (from the media store's `blob:` URL), seeks to `start`, draws the
  frame to a canvas no larger than 240 px, and `toBlob` gives a `blob:` URL the manipulator and `keepFile` take. iOS
  Safari loads nothing until `play()` is called (`captures-and-media.md`), so it is played muted and paused on its
  first frame before the seek.

## Files

| File | Layer | What |
|---|---|---|
| `src/lib/thumbPlan.ts` | core | `wantsThumb` takes videos too (VS1, VS2); `thumbShown` gives a video its copy or null, never its file (VS5); `frameAt(edit)`: the kept part's start in seconds, the trim's `start_ms` or 0 (VS1, VS6) |
| `src/lib/media/index.native.ts`, `index.web.ts`, `index.ts` | adapter | `videoFrame(uri, atSec, max)`: a frame as a source the manipulator takes (`SharedRef` on phones, a `blob:` URL on the web), with its release (VS1, VS8) |
| `src/lib/media/thumb.ts` | adapter | `makeThumb` renders a video through `videoFrame` before the shared crop, rotation and save; `keepEditedThumb` unchanged |
| `src/lib/useCaptures.ts` | shell | the copy is asked for a video as it is for a photo, after the save (VS1) |
| `src/components/edit/MediaEditor.tsx` (or where a video's Done is saved, `captureEdits`) | view/shell | after a video's edit is saved, its copy is made again from the new start under `editedThumbName` (VS6) |
| `src/lib/thumbs/shell.ts`, `index.ts` (new) | shell | the gallery's `thumbFor` (fresh read, one job at a time, `updatePiece`) moved where every preview can ask, with a `Store` of the copies made this session so any mounted preview shows a new one at once (VS2, VS9); the gallery shell calls it |
| `src/lib/gallery/shell.ts` | shell | `thumbFor` goes through `thumbs` (VS2) |
| `src/components/gallery/GalleryTile.tsx`, `PeriodBlock.tsx` | view | a video's frame under its play mark and length, on a dark chip (VS3, VS4) |
| `src/components/chronicle/MomentPicture.tsx`, `src/components/MemoryPreview.tsx`, `src/components/ceremony/Pile.tsx` | view | the frame where the glyph was, with a play mark (VS3, VS4) |
| `src/lib/pins.ts` (`pinThumb`), `src/components/CapturePinView.tsx` and the map's web pin | core / view | a pin of one video shows its frame, with `pin-video-mark` clear of the stack, clock and bell corners; `pinThumb` returns a video's `thumb_path`, never its `file_path` (VS3, VS4); `.claude/rules/map.md` QL26 updated |
| `src/components/VideoMark.tsx` (new) | view | the play mark on its own dark ground, one component every preview uses (`video-mark`) (VS4) |

About fourteen files; no new dependency (expo-video and expo-image-manipulator are installed), no route.

## Data

- No new truth, no migration, no IndexedDB version: `thumb_path` exists on every piece (SQLite migration 12; the web
  stores the record whole). Videos have had it empty until now.
- Deletes already remove a piece's `thumb_path` file (`deletion/core.ts`, `filesOf`) (VS7).

## Tests, by criterion

Unit tests go in the `captures` feature folder (`src/lib/__tests__/captures/`) unless named otherwise.

| Id | Test | Name |
|---|---|---|
| VS1 | `captures/thumbModel.test.ts` (`wantsThumb`, `frameAt`), `captures/thumb.test.ts` (the job renders a video through a fake frame source) | `VS1: a video wants a copy, from its kept part's start` |
| VS2 | `gallery/shell.test.ts` over `fakePorts()` | `VS2: an older video's copy is made once, read fresh first` |
| VS3 | the `gallery` journey (a real WebM made in the page, its tile and month cover draw the frame) and `pins.test` (`pinThumb` for one video) | `VS3: every preview shows the frame` |
| VS4 | the `gallery` journey (tile, cover, and Memories' Lately card on the same seed: `video-mark` over each video, none over a photo, its ground's contrast); `memories` journey (the memory preview and a one-video pin: `pin-video-mark`, label "Video"); `replay` journey (the pile's card) | `VS4: a video's frame keeps its play mark` |
| VS5 | `captures/thumbModel.test.ts` (`thumbShown` never returns a video's file); the job marks an unreadable video `THUMB.none` | `VS5: a preview never shows the video file` |
| VS6 | `captures/thumbModel.test.ts` (`frameAt` follows the trim; the edited name changes) and the `edit` journey (a trimmed video's copy is made again) | `VS6: an edit makes a new copy` |
| VS7 | `deletion` unit test (`filesOf` takes a video's copy) | `VS7: a video's delete takes its copy` |
| VS8 | the `gallery` journey (no request leaves the page while frames are made; the harness's host check) | `VS8: the web's frame stays on the device` |
| VS9 | `captures/thumb.test.ts` (two asks share one job) and `gallery/shell.test.ts` (one at a time) | `VS9: one copy at a time` |

## Each action on the screen

No new control. Every change is what a preview draws (a frame where a glyph was), so the goal-to-control matrix is
unchanged; V4 (text over a picture needs its own ground) and X3 (never colour alone) govern the play mark and length.
Precedent: Apple Photos shows a video's frame with its length bottom-right (`docs/research/ui-teardown.md`, 1).

## The UI review (decision 0145)

The `gallery` and `edit` journeys run with `E2E_SHOTS` at 390 x 844, a video's frame among photos, light and dark
frames both, and the `ux-reviewer` reads them before the slice is done.

## Steward (Nov 13): triage

| # | Finding | Call |
|---|---|---|
| S1 | The "it's a video" signal was tested only in the gallery | Accepted: VS4 names every surface; one `VideoMark` component; checks in the gallery, memories and replay journeys |
| S2 | A one-video pin had no room for its mark | Accepted: VS4, clear of the stack, clock and bell corners; the label says Video; map.md's QL26 updated |
| S3 | VS3 could let a video's frame take a photo's cover | Accepted: VS3, the cover rule unchanged (0139) |
| S4 | VS3 promised more than VS2 for older videos | Accepted: Memories' cards make a copy too, through a shared `thumbs` shell; pins and the pile show it once made (VS2) |
| Silent | A cover up to 420 pt drawn from a 240 px frame looks soft | Put to the owner with the plan |

## Deferred, and why

- **A frame the owner picks** (a poster frame): none was asked; the kept part's start stands (the owner, Nov 13).
- **A moving preview** (a few frames on a long press): not asked.
- **Frames for videos in the reminder card**: the card shows photos only today; unchanged.

## Native, never run on a device

- `videoFrame` on phones (expo-video's `generateThumbnailsAsync` with `maxWidth`, the frame into the manipulator), the
  copy made after capture, and a trimmed video's frame. The web exception on iOS Safari (a muted play to load the
  first frame) runs only in headless Chromium here.
Each gets a `docs/NATIVE_UNVERIFIED.md` item (VS1, VS6, VS8).

<!-- Repo first: written from the owner's request in a session (Nov 11, "Thumbnail slice for this"; started Nov 13), not yet a tab of the concept doc (https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7). -->

# Video thumbnails: a video's frame wherever it is previewed

Nov 13, 2026 · @Miguel Guerrero

A photo gets a small copy as it is kept (TH1-TH5), and every preview shows it. A video has none: the media gallery's
tile, a month's cover, Memories' cards, a walk's memory preview, a map pin and the replay's pile all show a camera
glyph in its place. The owner named video thumbnails the gallery's next slice (decision 0139, Nov 11). A video now
gets a small copy too, a still of the frame where it starts playing, and every preview that shows a photo's copy shows
a video's.

## Vision

Idea: Thumbnails for videos, so the media gallery (and every preview) shows a video's picture instead of a glyph.
Verb: return (a video recognised at a glance among the moments), honour (the frame is the video's own, as kept and edited).
Touches: Always "A moment carries its context ... never a bare thumbnail" (unchanged: the gallery's headers and every preview's own words carry it, 0139); Always "Restraint" (a play mark, no badge, no animation); Never "Data leaving the device" (the frame is made on the device, on the web from the browser's own video); AGENTS.md "Native first; web is a fallback" (expo-video makes frames on phones only, so the web's frame is a listed exception).
Verdict: aligned
Shape: as asked.
Criteria: none beyond VT1-VT9.
Open: none (answered Nov 13, see Decisions).

## Decisions (the owner's calls)

- **Video thumbnails are the gallery's next slice** (Nov 11, decision 0139).
- **Every preview** shows a video's frame where it shows a photo's small copy today, not only the gallery (Nov 13).
- **The web gets frames through a web exception**: expo-video's web player cannot make one, so the browser's own video draws the frame (Nov 13).
- **The frame is where the kept part starts**: after a trim, the trim's start, with the crop and rotation applied; an edit makes a new copy (Nov 13).
- **A sharper still**: a video's copy is 720 px on its long edge, so a month's cover drawn from it is as sharp as a photo's (about 60 KB a video) (Nov 13).

## Criteria

1. **VT1 · A frame for every new video.** A video kept from now on gets a small copy: a still of the frame where its kept part starts, 720 px on its long edge (sharp enough for a month's cover; a photo's copy stays 240), on phones and on the web. It is made after the video is kept and never holds the capture up or fails it (TH2).
2. **VT2 · Older videos too.** A video kept before this slice gets its copy the first time the gallery, Memories (Lately, the resurfaced card, a thread's moments) or a walk's memory preview shows it, read fresh from storage first, as an older photo does (TH3); once made it is never made again, and every preview shows it from then on. A map pin and the replay's pile show the copy once made, and their glyph until then (they make none themselves).
3. **VT3 · Every preview shows it.** Where a video showed its glyph, these show its frame: the gallery's tile and a month's or year's cover, Memories' cards (Lately, the resurfaced card, a thread's moments), a walk's memory preview, a map pin of one video, and the replay's pile. The cover rule is unchanged (MG19, decision 0139): a video covers a month or year only when it holds no photo.
4. **VT4 · Still a video at a glance.** Over a video's frame, each of these draws a play mark on a solid ground of its own (3:1 against any frame, `ui-patterns.md` V4), and no photo does: the gallery tile (with its length) and cover, the Lately, resurfaced and thread cards, the memory preview, the pile's card and a one-video map pin. On the pin the mark sits clear of the stack, clock and bell corners, and the pin's label still says Video (never colour alone, X3). No new number: the length stays the gallery's only digit on a tile.
5. **VT5 · Never the whole video for a preview.** A preview never loads or plays the video file to show its picture. While the copy is being made, or when no frame can be made (a file that won't decode), it shows the glyph as before; one that won't decode is marked so and not tried again (`THUMB.none`).
6. **VT6 · An edit makes a new copy.** Saving a trim, crop or rotation on a video makes its copy again from the new kept part, under a new name (ME20's rule), and the previews show the new frame; undoing the edit to none makes one again.
7. **VT7 · Deletes take the copy.** Deleting a video, as a moment or one piece of a stack, removes its copy's file with its own (D2, MS13).
8. **VT8 · The web's frame stays on the device.** On the web the frame is drawn from the video in the browser and kept in the app's own media store, with nothing sent anywhere; the exception is listed in `docs/ARCHITECTURE.md`, "Web exceptions to native first", with its reason.
9. **VT9 · Cheap.** Copies are made one at a time; two asks for the same video share one job; a gallery that shows many older videos at once makes them one after another without holding up its scrolling.

## Steward (Nov 13)

S1-S4 accepted into VT2, VT3 and VT4 (the mark on every surface, the pin's room for it, the cover rule unchanged, which previews make an older video's copy). No breach.

## Record

- Built Nov 13, 2026, test-first (9 of 9 by history). Unit tests: `captures/thumbModel`, `captures/thumb`,
  `captures/thumbsShell`, `deletion`, `map/pinThumb`; the `videothumbs` journey records a real WebM and checks the
  stills by colour (red first, green after a trim) on the gallery tile, a video-only month's cover, a Lately card, a
  one-video pin, a walk's memory preview and the replay's pile, with nothing sent anywhere.
- TH3's and QL26's tests followed the owner's call (a video now has a still): a voice memo and a note still have none.
- Found while building: a MediaRecorder WebM has no duration, so the web's seek learns it first.
- Deferred: `docs/DEFERRED.md`, "video thumbnails". Native: `docs/NATIVE_UNVERIFIED.md`, "Video thumbnails".

# 0038. Thumbnails: each photo gets a small copy, made with expo-image-manipulator

Date: 2026-11-01 · Status: accepted · Area: captures and media

## Context
Memory previews (0037) and the reminder card showed full photos. TH1-TH5, the owner's calls, Nov 1: save a small copy, with expo-image-manipulator.

## Decision
Each new photo gets a 240 px JPEG copy, made after the capture is kept and never holding it up. Older photos get theirs the first time a preview shows them, read fresh from storage first. The copy is stored as `Capture.thumb_path`, named by the capture (`<id>.thumb.jpg` under its walk or `moments`), never cut from an old ref.

## Consequences
- `lib/thumbPlan.ts` (pure), `media/thumb.ts`; SQLite migration 12 (IndexedDB stores the record whole, so no version bump).
- One decode, bounded as it loads (`manipulate(uri, { maxWidth, maxHeight })`), and the manipulator's context and image released after: on iPhone web, an unreleased one leaves full-size canvases behind.
- `THUMB.none` marks a photo that won't decode; two asks share one job; `keepFile` `replace`; `thumbShown` picks the copy, the icon, or the photo.
- The backup bundle leaves `thumb_path` out.
- Deferred: a thumbnail finishing after its moment went leaves its file; photo thumbnails on pins (QL, 0063). Native unverified: migration 12, the manipulator, EXIF orientation.

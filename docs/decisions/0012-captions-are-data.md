# 0012. Captions are data, baked in only when saved out

Date: 2026-10 (v0) · Status: accepted · Area: captures, media

## Context
Round 3 (the owner's calls): a caption on a photo, kept editable, matching on screen and in the saved file.

## Decision
Captions are data (`caption`, `caption_y`) and are baked in only when saved out. Sizes are fractions of the photo's width with no pixel minimums, so the saved photo matches the screen. The bar is centered on `y` by its measured height. 80 characters at most.

## Consequences
- `CAPTION_STYLE`, `captionMetrics`, `captionTop`, shared by `CaptionBar` and both bakers; the canvas baker (`Baker.web.tsx`) breaks words too wide alone character by character (CJK).
- Native baking (`captureRef`, `useRenderInContext` on iOS, one bake at a time) is not tried on a device.
- iOS can't present a Modal over a Modal: the caption editor opens inside the viewer as an overlay (`CaptionEditor overlay`).

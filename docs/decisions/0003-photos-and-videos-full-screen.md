# 0003. Photos and videos are full screen; notes and memos keep their card

Date: 2026-10 (v0) · Status: accepted · Area: replay, viewer

## Context
The owner's call on the capture viewer's layout, shared by the replay's stops.

## Decision
The media fills everything above a thin dark strip with the details and the actions (‹ ›, or the replay's Continue). Notes and memos keep their card. The replay uses the same layout at its photo and video stops.

## Consequences
- `CaptureViewer`, `CaptureContent`.
- On web, a View React reuses from another layout never reports `onLayout`: the capture's card while its file loads and the full-screen media are each keyed so they mount fresh.
- expo-video's web `VideoView` is sized with `width`/`height` of 100% (`styles.fill`) and `playsInline`.
- Video comes from the camera button (the system camera's own video mode), capped at 30 s on phones and 15 s on web; the mic stays the separate pocket recorder.

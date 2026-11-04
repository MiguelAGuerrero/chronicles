# 0008. Walk screen layout: a centered capture row, a thin bottom strip with Stop at the right

Date: 2026-10 (v0) · Status: superseded in part by 0075 (captures stack at the right edge) · Area: walk screen

## Context
Decided with the owner, after research. Hoober's touch research shows taps are most accurate near the center and least accurate at the top and bottom edges and in corners. About half of phone use is one-handed, mostly with the right thumb, and grips change with the task. Strava, AllTrails and Komoot keep record and capture controls low on the screen, and Google Maps floats its controls at the bottom right.

## Decision
Capture controls are large icon buttons (camera, mic, pencil) in a centered row, floating in the lower-middle of the screen. Time, distance and hold-to-stop sit in a thin strip at the very bottom, with Stop at the right end, away from the captures. A centered row needs no handedness setting. Text is kept to a minimum: no header or "Recording" label, because the growing trace shows a walk is on; a status chip appears only when something is wrong.

## Consequences
- Captures are pins grouped by screen distance (`useZoomPins`, 44 px), anchored at the stem's foot.
- Pills sit above the capture row so it never moves under the thumb; edge buttons stack at the right above the row (`EDGE_BOTTOM`), inside the 640 column.
- While a memo records, Stop & save takes the mic's slot and Discard the camera's, undoable for 5 s; a quick tap on Stop shows "Hold to stop the walk" (`HoldButton`).
- Walk options joined the strip later (0023); the recording bar's Stop follows the same hold (0048).

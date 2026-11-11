# 0138. The pocket alert is not offered where the browser cannot vibrate

Date: 2026-11-11 · Status: accepted · Area: explore, motion

## Context
The owner reported the pocket alert silent on the web. The nudge reaches `navigator.vibrate` twice, 120 ms apart, in the e2e (`nudge` journey). iPhone Safari has no `navigator.vibrate`; expo-haptics' fallback clicks a hidden `<input switch>`, which iOS honours only from a tap, and the alert fires from a location update. The switch was offered and never felt.

## Decision
The owner's call, Nov 11: hide the switch where it cannot work. `buzzOffered` now needs `navigator.vibrate` and a coarse pointer. Phones keep it; Android Chrome keeps it; iPhone Safari, iPad Safari and desktop do not see it.

## Consequences
- Amends 0079 (the switch haptic fallback for iPhone Safari is no longer offered; the code in expo-haptics stays unused by us).
- A switch already saved on (`explore_haptic`) on such a browser does nothing: the alert still tries and fails silently.

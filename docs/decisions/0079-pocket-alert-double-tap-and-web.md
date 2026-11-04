# 0079. The pocket alert is a double-tap, and the web gives it too

Date: 2026-11-03 · Status: accepted · Area: explore, motion

## Context
The owner asked for "a rumble, a nudge to say something's nearby" while walking with the app open, opt-in. The pocket alert (E19) already did this on an exploring walk, but as the same light tap a button gives, and on phones only.

## Decision
The owner's calls, Nov 3 (PA1-PA6, `specs/pocket-alert-nudge/spec.md`):
- Change the pocket alert rather than add a second setting. Its rules stay: off by default, unfound "?" marks within your range only (not route marks, found places or busy streets), exploring walks only, nothing on a ride, once a place a walk.
- It feels like a distinct double-tap: two medium impacts `MOTION.nudgeGap` (120 ms) apart, one nudge for places coming into range together. The `nudge` feedback kind; every kind is a pattern in `HAPTIC_PATTERNS` (`motionTokens`).
- The web gives it too, where the browser can buzz. expo-haptics 58's web build vibrates (`navigator.vibrate`, Android Chrome) and tries iPhone Safari's switch haptic on a touch screen. The switch shows on a touch screen (`canBuzz`; desktop Chrome has `navigator.vibrate` but no motor, audit 4). Only the alert buzzes on the web; a button press gives nothing there, as before.

## Consequences
- Amends NV21 ("the pocket alert (phone only)") and E19's phone-only note. The concept doc's tabs need the same edit.
- `canBuzz.web.ts` is a web exception (`docs/ARCHITECTURE.md`): expo-haptics has no availability call.
- Not run on a device: the double-tap on an iPhone and an Android phone; Android Chrome's vibrate needs a tap on the page first; iPhone Safari's switch haptic, fired from a location update rather than a tap, may do nothing (`docs/NATIVE_UNVERIFIED.md`).

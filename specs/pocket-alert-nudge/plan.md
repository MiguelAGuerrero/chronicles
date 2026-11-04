# Pocket alert nudge: plan

Small slice: no new data, no migration, no new dependency, no new screen. The owner gave the go-ahead on Nov 3 and chose to include the web (decision 0079).

## Files

- `src/lib/motionTokens.ts` (pure): `MOTION.nudgeGap` (the gap between the two taps, 120 ms, the beat of a press) and `HAPTIC_PATTERNS`, each feedback kind as `{ at, weight }` steps: `tap` one light step, `nudge` two medium steps `nudgeGap` apart, `success`/`warning` the system's own patterns. `FeedbackKind` moves here, so tests can import it; `motion.ts` re-exports it.
- `src/lib/haptics.ts`: `nudgeFeedback()` plays the nudge pattern through `expo-haptics` `impactAsync`, on phones and on the web (expo-haptics' web build vibrates). The other kinds stay phone-only.
- `src/lib/motion.ts`: `feedback('nudge')`.
- `src/lib/canBuzz.ts` / `canBuzz.web.ts`: whether to offer the switch. Native: yes. Web: `navigator.vibrate` exists or the pointer is coarse, the same test expo-haptics uses before it does anything (it exposes no availability call). Listed as a web exception in `docs/ARCHITECTURE.md`.
- `src/lib/explore/explore.ts` (pure): `pocketAlert({ exploring, haptic, riding, unknownKeys, alerted })` returns the keys to mark and whether to nudge (one nudge per batch). It wraps `alertsDue` and holds the off/quiet/ride rules that sit in the hook today, so they can be unit-tested.
- `src/lib/explore/useExplore.ts`: the effect calls `pocketAlert`, then `feedback('nudge')`.
- `src/lib/explore/explore.ts`: `POCKET_ALERT_NOTE`, the switch's note in one place (pure, so a test can read it; `settings.ts` imports the db).
- `src/components/StartDialog.tsx`, `src/components/ExploreSettings.tsx`: the note, and `canBuzz()` in place of `Platform.OS !== 'web'`.

## Tests

| Id | Test |
|---|---|
| PA1 | `motion.test.ts`: `PA1: the nudge is two firmer taps a token gap apart; a tap is one light tap` |
| PA2 | `explore.test.ts`: `PA2: places coming into range together give one nudge; each alerts once a walk`; e2e `nudge`: one double-tap as the memorial comes into range, none after |
| PA3 | `explore.test.ts`: `PA3: no nudge with the switch off, on a quiet walk or on a ride`; e2e `nudge`: a quiet walk with the switch on never buzzes; off by default is the existing E19 test |
| PA4 | the existing lint boundary (haptics only through `feedback()`); `motion.test.ts`: `PA4: every feedback kind has a pattern` |
| PA5 | `explore.test.ts`: `PA5: the pocket alert note says two soft taps` |
| PA6 | e2e: the switch shows in the Start dialog and the Explore settings (headless Chromium has `navigator.vibrate`); e2e `nudge`: the browser is asked to vibrate twice, ~120 ms apart; no button press vibrates |

The e2e scenario `nudge` (`E2E_ONLY=nudge`) records `navigator.vibrate` calls in an init script.

## Deferred

- With the screen off or the app in the background the JS may not run, so the alert may not fire (already deferred in v1 Explore). On the web, a hidden page gets no fixes at all.
- Button haptics on the web: out of scope; only the alert buzzes there.

## Not run on a device

- Native: the double-tap itself (two `impactAsync(Medium)` 120 ms apart): whether it reads as one nudge on an iPhone and an Android phone, and whether Android's Vibrator merges them.
- Web: Android Chrome's vibrate needs a tap on the page first (sticky activation), which starting the walk gives; iPhone Safari's switch haptic, fired from a location update rather than a tap, may do nothing. Both go in `docs/NATIVE_UNVERIFIED.md`.

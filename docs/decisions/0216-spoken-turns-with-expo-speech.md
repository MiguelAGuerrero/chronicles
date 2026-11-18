# 0216. Turns are spoken with expo-speech, and guiding is offered wherever they can be

Date: 2026-11-18 · Status: accepted · Area: roads, navigation, sound, dependencies · Builds on [0214](0214-the-road-engine.md) and [0215](0215-the-road-engine-the-owners-answers.md)

## Context
0215 said turns are spoken from the tap on "Drive there", with a mute on the bar, and that guiding does not ship on a phone before
speech works. Step 3 of the road engine built guiding with the turn shown, on the web only. Asked whether to add `expo-speech` (Expo's
own module, with a web implementation over the browser's speech synthesis), to switch guiding on for phones with it, and told that
speech and the lock screen would ship unverified until run on a device, the owner answered "Proceed" (Nov 18). Another session relayed
a rule the owner is said to have chosen for the vision page, "Nothing on a ride asks for a look or a tap"; it was put to the owner in
the same question and is not yet on the page.

## Decision
- `expo-speech` is a dependency (`~58.0.3`, installed with `expo install`). It is reached only through `roads/speech.ts`.
- A turn is spoken once, when it is within 400 m, as the turn alone ("Right ahead."). Nothing else is ever spoken: not leaving the
  way, not a distance, a time or the destination.
- The mute is a control in words on the bar ("Mute turns" / "Say turns") and is kept with the session's plan.
- "Drive there" is offered on every platform. Where there is no voice (a browser without speech synthesis) it says turns are shown,
  not said.

## Consequences
- Guiding is now offered on phones, where none of it has run (`docs/NATIVE_UNVERIFIED.md`).
- With the phone locked or the app behind another, nothing is spoken: the screen's position is read only while the app is in front
  (RE33 is not met; `docs/DEFERRED.md`).
- "End" and the mute are still taps. If "Nothing on a ride asks for a look or a tap" goes onto the vision page, they are the two
  controls it would question.

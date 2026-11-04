# 0087. A skeleton while a replay's memo or video loads; the screen stays awake through a replay

Date: 2026-11-04 · Status: accepted · Area: replay

## Context
After the replay rhythm shipped (0085, 0086), two calls were left to the owner from its audits: the stage waits for a memo or video to start with no sign that it is waiting (replay-rhythm audit 38), and a minute-long replay with no touch can meet the phone's auto-lock (audit 6). The owner, Nov 4: "we can use a skeletal loader for a video or memo to load", and "add Expo Keep Awake".

## Decision
- While the stage waits for a memo or video that hasn't started, a skeleton stands where it will be (a photo's card likewise until its picture loads). Quiet: a soft pulse, still with reduce motion, no spinner, no count.
- The screen stays awake from the replay's first beat to its card, through the day's replay too, with expo-keep-awake (a new dependency, the owner's call). Let go on the card, on Skip and on leaving; taken again when the app returns to the front.

## Consequences
- RR23, RR24 in `specs/replay-rhythm/spec.md`.
- expo-keep-awake's web build uses the Screen Wake Lock API, which the browser releases while the page is hidden; the replay takes it again on AppState `active`, so no web-only code.

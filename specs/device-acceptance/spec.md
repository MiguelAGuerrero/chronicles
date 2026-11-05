<!-- Device acceptance. Written in the repo first (2026-11-05) from the owner's call in session (the test trim: "any
     tests that are device only should be kept as acceptance tests, so when the app becomes stable enough to do a
     mobile run"; the gated checklist chosen over Maestro flows). An engineering slice, not a product tab. -->

# Device acceptance: the tests only a phone can run (DV)

Native has never run on a device. The web e2e stands in for the phone where it can (a synthetic `devicemotion`, a stubbed `navigator.vibrate`, a service-worker message for a notification tap), and `docs/NATIVE_UNVERIFIED.md` listed every native path as a line to tick. A line said what had not been tried, not how to try it or what passing looks like, and nothing held a criterion that only a phone can check (RR17) to a line there. This slice makes that file the acceptance suite for the first mobile run: each item a test a person runs on a development build, each device-only criterion tied to one, and the gate holding both.

## Vision

```
Idea: keep the tests only a phone can run as an acceptance suite for the first mobile run (the owner, Nov 5)
Verb: none (engineering: a checklist, a check and a command; nothing a walker sees changes)
Touches: none
Verdict: no surface
Shape: as asked
Criteria: none
```

## Criteria

1. **DV1 · One suite.** `docs/NATIVE_UNVERIFIED.md` is the device acceptance suite: every native path the web build cannot run is an open item there, grouped by area (a `##` heading), and ticked only on a phone.
2. **DV2 · Each item is a test.** Every item reads `**Do:** … **Expect:** …`: what to do on the phone, and what must be seen, heard or read back for it to pass. The docs check fails on an item missing either, naming its line.
3. **DV3 · Criteria point at items.** An item that accepts criteria ends with their ids in parentheses, `(MO6, MO10)`. Every `device:` entry in `UNTESTED` (`scripts/features.js`) has an item naming its id, or the docs check fails naming the spec and id.
4. **DV4 · How to run it.** The suite opens with how to run it: a development build (never Expo Go), a fresh install and an upgrade from an older build (for the migrations), what some items need (a walk outdoors, a bus, the screen off, a second app), and how to record a result.
5. **DV5 · A result says when and on what.** A ticked item ends `— passed <Mon D>, <device> (<OS>)`; a failed one stays open and ends `— failed <Mon D>, <device> (<OS>): <what happened>`. The docs check fails a tick without its date and device.
6. **DV6 · The web's stand-ins each have an item.** Each place the e2e stands in for a phone has an item that names the journey faking it: haptics, the silent switch, the motion sensors, a notification the OS delivers and its tap, the background location task, the screen reader, keeping the screen awake, the camera and microphone, Open in Maps, and touch.
7. **DV7 · The list for the run.** `npm run check:device` prints the open items by area with the criteria each accepts, and the counts open and passed; `--area <words>` keeps the areas whose heading holds them. `/slice` and `/fix` say native code they write gets an item and a device-only criterion goes in `UNTESTED` as `device:`; `docs/TESTING.md` names the suite and the command.

## Tests

Unit (`src/lib/__tests__/arch/device.test.ts`): DV1-DV3 and DV5 on made-up suites and on this repo's; DV4 and DV6 on the file itself; DV7 by running the command on a made-up suite and reading the procedures.

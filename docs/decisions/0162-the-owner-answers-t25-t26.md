# 0162. The owner's answers to T25 and T26: Start refused says Locate's line quietly; the replay's end a bullseye

Date: 2026-11-13 · Status: accepted · Area: recording, map · Amends: decision 0154 (its T17 line, "the words the recorder's start uses") · From: `/tend` inbox T25, T26

## Context
`tend map T17` made a refused Locate a quiet notice in the words decision 0154 called "the words the recorder's start
uses". They never were: the web recorder's start said Locate's old line, "Location permission was denied. Allow location
for this site in the browser settings, then try again.", in the red error banner. Since T17 the web showed the two
refusals on one screen in different tones and words: Locate's cream notice, then Start's red alert in the same slot.
The run that built T17 filed this as T26 `[owner]` ("Walk: Start refused still reads as a fault, in other words than
Locate's"). The replay's sweep had filed T25 `[owner]` ("Replay: the walker's dot and the solid end differ by colour
alone"). The owner answered both in person on Nov 13. These are the owner's own answers, not a proxy's (0157).

## Decision
- **T26, yes**, its recommended shape: the recorder's web start reads its refused line from `locate/notice.ts`, beside
  Locate's, with its own end: "Location is off for this site. Turn it on in the browser's settings to record a walk.",
  as the quiet notice on the ready screen and in the walk's "Not recording" notice. On a phone the words stay
  ("Location is turned off for Chronicles. Turn it on in Settings to record a walk.", with Open Settings), quiet too.
  A screen reader hears it as it hears T17's (tend map audit 12: a polite live region kept on screen on the web,
  `announceForAccessibility` on a phone). Built in this run as `tend recording T26`.
- **T25, yes**, its recommended shape: the replay's end is a bullseye (a walked centre, a white band and a walked outer
  ring, two circle layers on the `ends` source, the outer drawn first), so it differs in shape from the hollow start and
  the solid dot; the start and the dot unchanged; no hue of its own (it takes T22's when one is picked). Amends QL2
  again. Built in a later run.

One build per run (`/tend`, section 7): T26 is built now; T25 waits in the inbox, marked answered.

## Consequences
- 0154's "the words the recorder's start uses" is read as this: Locate and Start share their beginning and differ in
  their end, each from `locate/notice.ts` (`LOCATION_OFF`, `START_OFF`).
- QL19 and the map rule's "Denied says what the recorder's start says" hold again on the web; the open item on QL11's
  and the map rule's words after T17 is noted so. QL11's and QL5's wording still wait for the owner's edit.
- A refusal of location travels as `tone: 'info'` on `RecorderError` and the recorder's error status; any other failed
  start or lost recording stays the red fault. The "Not recording" chip keeps its red dot: it says what is true.
- A refusal is the same quiet notice wherever a walk is asked for: Start, Resume on a paused walk, and Walk here (and
  Go) on Explore and Chronicle, each said to a screen reader (the review of this build, `tend recording audit 1-3`).
- The native half (the start's and the resume's refusal as a quiet notice with Open Settings, and their announcement)
  is unverified on a device (`docs/NATIVE_UNVERIFIED.md`).

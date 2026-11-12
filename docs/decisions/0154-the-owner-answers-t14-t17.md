# 0154. The owner's answers to T14-T17: the map's pins, stars, ends and refused location

Date: 2026-11-12 · Status: accepted · Area: map, places · Amends: QL2 (`specs/quality-of-life`, built in T16), QL26 (on T14's build), decision 0019 (on T15's build) · From: `/tend` inbox T14, T15, T16, T17

## Context
The map's sweep of Nov 12 filed four `[owner]` entries from the steward's and the UX review's findings: a pin of
several moments drawn as a bare numeral (T14), walked places as accent stars with a numeral where they merge (T15), a
walk's start and end told apart by colour alone (T16), and a refused location shown as a red fault (T17). The owner
answered all four in person on Nov 12. These are the owner's own answers, not a proxy's.

## Decision
- **T16, yes**, its recommended shape: the start marker stays hollow (white, ringed in the trace's green); the end is
  solid, a disc filled in the walked colour with a white ring, so shape tells the two apart (WCAG 2.2, 1.4.1). No new
  hue: the end takes `COLORS.walked`, the colour the walked streets have; T22 (a walked colour apart from the accent)
  is open and will carry the end with it. A live walk still has no end marker (QL2). Built in this run as
  `tend map T16`; it amends QL2's "a white disc with a thick ring in the walked orange".
- **T17, yes**, its recommended shape: a refused location is a quiet notice in ink, not red, in the words the
  recorder's start uses ("Location is off for this site. Turn it on in the browser's settings to see where you are.";
  on a phone "... in Settings", with Open Settings); and with no fix and no tiles drawn, no scale bar over a blank
  world. Built in a later run.
- **T14, yes**, its recommended shape: a pin of several moments shows their kinds in its head (up to two icons,
  fanned, no numeral), and its spoken name says them in words with the time in it ("A photo and a note, twelve
  minutes in. Open"): the question the entry put separately, whether the name carries the time, is answered yes.
  Amends QL26. Built in a later run.
- **T15, reshaped** by the owner: "Ink star, no numeral". A walked place keeps its star (decision 0019), drawn in ink
  rather than the accent, and a merged star draws no numeral; every star stays one size. This replaces the entry's
  recommended plain ink mark. /vision on the reshape: aligned. Built in a later run.

One build per run (`/tend`, section 7): T16 is built now; T17, T14 and T15 wait in the inbox, marked answered.

## Consequences
- `ENDS_PAINT` (`components/map/types.ts`) is the one paint of the `ends` layer on both maps (test `tend map T16`;
  the `qol` journey reads both markers' middles on the replay). The native half is unverified on a device.
- QL2's words in the quality-of-life doc and its mirror, and the map rule's marker line, still say "a ring in the
  walked orange"; the loop edits neither, so the amendment waits in `docs/STATUS.md`, "Open before the loop".
- When T22 picks a walked hue, the end marker follows it through `COLORS.walked` with no change of its own.
- T15's reshape keeps 0019's star: the Never row "Ratings, reviews, stars, 'best of', rankings of places" is read as
  ratings, which a one-size mark of "walked here" is not; the accent (Never, "accent-coloured wins") and the numeral
  (Always, "Counts are words") are what it gives up.

# The replay ceremony's rework: an audit of the direction

Nov 18, 2026. The owner asked for a fresh opinion on the prototype (https://claude.ai/artifact/7oLxtuZMhpvXd18H4BLR5P)
before any spec. Four report-only passes, none told the others' findings: a cold find from 29 phone-size stills, the
`ux-reviewer`, the `steward` and the `auditor` (against the real replay code). No spec exists, so nothing is triaged
into audit numbers and nothing was fixed; this is input for the spec. No test was run by the auditor (its checkout had
no `node_modules`); its numbers are arithmetic on the prototype's constants and `REPLAY_RHYTHM`. Motion was judged
from the source, never seen. The principles the prototype drew on: `replay-cinematography.md`.

## Defended by every pass that judged it

The break as a pull-back, a straight dotted hop and a slide with no dim. North-up, flat, no flyover. The walker at a
steady pace, easing only at stops. Walking zoom 15. A longer hold for a photo; memos and videos in full with a second
of quiet after. No music, no number, no accent. Closing on the opening's framing with the card under the walk.

## Where two or more passes agree

| # | Finding | Passes | The shape proposed |
|---|---|---|---|
| 1 | **The edge stack grows without bound** (25 px a picture: against the held card from the 8th, at Skip near the 28th), is one entry per picture where MS17 says one per moment, and reads as a count: "height is the count" (RR11 "the last three ... and no count", RR19) | ux U1, steward S2, auditor F12 | The last three or four, one entry per moment, one pressable control that opens the viewer (RR13), kept through the close. Keeping it unbounded needs a record amending RR11 |
| 2 | **"Several photos at one place" is two shapes**: separate moments at one stop (today a card each; 0123 "separate moments are never merged") and one stacked moment (today the grid, the owner's 3×3 call, MS17). The prototype dissolves both on one card: a 12-picture stack would take ~47 s against the grid's ~6 s | steward S5, auditor F3, ux U3 | Keep the grid for a stacked moment, with a longer hold; dissolve at most between lone photos at one stop. Reversing MS17 is the owner's |
| 3 | **Length has no ceiling and only Skip**: a lone photo's stop is ~6 s; 30 photos ~3.5-4 min; worst realistic (30 photos, five 2-min memos, 10 breaks) 14-18 min. Opening a walk from one moment's card (`MemoriesScreen` `relive`) means sitting through it. A reload restarts | ux U3, steward S6, auditor F4, cold find 10 | A way to the next moment (Google Photos memories: tap to advance, hold to pause; verified in `adjacent-apps.md`), dwell that decays in a run of photos, a ceiling per kind. Lifting 0085's cap needs a record |
| 4 | **The opening repeats beat one**: the fog beat already holds the whole walk ~4 s with a faint trace and a headline, so the walk host would stand ~6.5 s on the whole walk with two pills; the day host has no fog beat. The ghost trace is ~1.3:1 on the land (0188 holds 3:1) | auditor F5, ux U9, steward (silent 1) | The opening is the fog beat, not a sixth beat (0001); one pure fit function for fog, close and card |
| 5 | **The closing frame is not what the real map draws, and it flatters**: pins group within 44 px, so a fitted 3 km walk merges everything within ~440 m into pins of several ("never a still", 0154); on the prototype's frame passed places are unlabelled half-opacity rings, a note sharing a stop with a photo has no mark, nine kinds of mark with three hollow rings told apart by colour; the card's refit moves the "still" frame and puts thumbnails under the sheet | auditor F2 F5 F15, steward S1 S3, ux U11 U15, cold find 8 12 | Decide what shows at the overview and how it declutters; passed places named as firmly as kept ones; every kind has a mark; the date line returns; pull back straight to the card's framing; a 1.5-2 s hold, not a 4 s gate (ux U10) |
| 6 | **Captions**: a bubble clips at 170 px today, so a long memo loses its end and the "Read by your phone" line; the whole text shows at 0:00; on a first watch the readings are mostly not made yet (the queue is busy while a walk records), and the speech permission could be asked over the opening; "Read by your phone" can be taken as "read aloud" | ux U2, auditor F6 F13, steward S4, cold find 9 | A two-to-three-line window that advances with playback; provenance on the header line; a caption never resizes a bubble once shown; read the walk's memos before the first replay; the full text in the viewer |
| 7 | **Video captions are a new decision**: 0169 covers memos; a video's sound is often not the owner's voice; recognition on a video file has never run; the words would feed threads and search. "Word by word" needs stored timings and animates a guess | steward S4, auditor F16 | Their own gate and record; leave word-by-word out |
| 8 | **Things move at once, against the research's staging rule**: the stack copy leaves 100 ms after the shrink starts, so the photo reads as splitting in two; bubbles outlive their beat (a finished memo's caption through "43 min later"); a 900 ms re-frame overlaps a card's grow | ux U6 U7 U12, steward S9 | The copy lands after the card reaches its pin, or no flying copy; a bubble leaves when the next card opens or a break begins |
| 9 | **Breaks beyond the made-up two**: ends 3 m apart are 2.4 s of standing round a 1.6 px hop; ten pauses are 24-42 s and ten rings; ends 20 km apart pull back to ~zoom 9.4 over tiles never fetched; the hop joins three existing line vocabularies (rides dashed, gap dots that open a card, faint offers) | ux U13, auditor F9 F10, cold find 7 | Under a screen distance a break is a stand (the line and the clock only); a ceiling on breaks in a row; say whether the hop is the `gap-links` layer; one mark for a break |

## Single-pass findings worth carrying

- **The app's frame pipeline, not only the design, is choppy** (auditor F1, high): the ceremony clock is a 33 ms
  `setInterval` setting React state, then `map.jumpTo`; the trace is rebuilt at 15 Hz. The prototype's smoothness is a
  60 Hz canvas. Scripted zooms across 3-6 levels are new on that pipeline. Architecture, the owner's call: a camera
  per frame as today, or keyframes the map eases itself while `frame(ms)` still says where it should be.
- **The camera must be plan data** (auditor F11): a runtime dead-zone follow cannot survive Hold, `useMediaWait`, the
  250 ms tick cap or `reanchor`; keyframes per segment in `show()`, not a 60 Hz table rebuilt on every edit. The
  viewport becomes an input to the ceremony (auditor F5).
- **Long legs break the speed rule** (auditor F7): past ~2.7 km a leg exceeds 0.35 widths/s; rides (0040) and a day's
  travel are such legs. A test: on any leg the walker stays in the frame.
- **A rebuilt telling can jump back into the opening** if the opening's frames carry `clock: null` (auditor F8).
- **A trimmed memo or video keeps its whole stored length in the plan** (auditor F14; exists today, not in
  `docs/DEFERRED.md`, read from `rhythm.ts` `mediaLen`, not run): a 2-minute memo trimmed to 20 s leaves ~100 s of
  standing. A `/fix` on its own.
- **The cold find could not place three tasks**: how to pause (the prototype has no Hold button; the app does), how far
  through the replay is, and how to leave at the end (the end card is a placeholder). It also read two clocks (the
  pill and the card's time) and could not name four of the map's marks.
- **Notes are still rushed** (ux U8): 1.2 s flat against the research's 1.5 s + 0.3 s a word.
- **The scrim and the drift divide the passes**: the steward defends the 30% scrim as staging and would cut the drift
  first; the ux-reviewer would drop or halve the scrim ("thirty photos means thirty dims") and keep the drift.
- **Reduce motion is not designed** (ux U16, auditor F18): it plays by itself, one still framing per stop cross-faded,
  a break as one framing with the hop drawn, cards fade beside a visible pin, every dwell kept.
- **The date-and-place line** (steward S7, auditor F19): the place is one derived area for a walk that may cross
  several; the date alone, an area only when the whole trace lies inside it (T19's rule).
- **Playback chrome returns** (steward S8): the video's progress bar and ticking times were removed by RR19 audit 28.
- **Precedent is thin** (steward S10, ux U21; decision 0193): Relive, Pikmin Bloom's recap and Apple Memories'
  playback are not recorded under "Replay a walk" in `adjacent-apps.md`; add them, unverified ones marked, the
  Memories movie as a counter-example.
- **Every host** (auditor): the first replay by intent; every re-watch, the day's replay (travel legs, placeless
  moments, no fog beat) and a reopened link by accident; `StepThrough` only through captions.
- **Sound cannot be judged from a silent prototype** (auditor F17): the J-cut needs a player preloaded before its
  slot; the L-cut has nothing left to fade once the card's player unmounts. Leave both out of the first slices.

## The auditor's cut into slices

0. The owner's calls: what replaces 0085's cap; the grid; the frame driver; video captions.
1. Dwell and pace inside the present rhythm (numbers and `rhythm.ts`; ships alone), with the trimmed-length fix.
2. Breaks without the dim. 3. The camera. 4. The bookends (fog as the opening, the close into the card's framing).
5. Residue: the bounded stack first, pictures on pins second (the riskiest piece). 6. Memo captions in the replay,
then video captions as their own slice. 7. Sound cuts, last or not at all.

## Never run on a device

Per-frame `jumpTo` with a zoom across several levels (`GlideFollow`); picture markers with no culling during camera
motion; new sources (the hop, rings, a ghost trace); a core-computed overview against `capFitBounds`; speech
recognition on a video file; the permission alert at Stop; a preloaded audio player; keep-awake for 6-16 minutes.

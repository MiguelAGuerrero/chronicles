# 0242. The replay's open looks, settled by ordinary convention: the owner hands the rest of the UI review's questions to the builder

Date: 2026-11-20 · Status: accepted · Area: replay, process · Relates to: 0206 (the replay ceremony), 0203 (replay pace), 0145 (the UI review), 0193 (precedent beside a proposal) · From: the owner, in person, Nov 20

## Context
The replay ceremony's UI review round (`replay-ceremony ui 1` to `ui 8`) was built and reported on Nov 20 with questions left
for the owner, each filed `[owner]` in `docs/DEFERRED.md`: whether a hop's dots keep their white discs, what to do about the
gap question covering the walk on a 320 by 568 phone (the review's U2), whether Skip and Hold should say more (the cold finds
of Nov 18), and the rough edges of a passed place's whisper and of the last view's names on a narrow phone.

## Decision
The owner, verbatim: "Deploy and investigate the missing tone edge and proceed with reasonable default for the rest of your
concerns based on typical traditional user experience with regards to what can show on on a screen component wise".

So each open look is settled by the ordinary convention for that kind of component, built test first as
`replay-ceremony ui 9` to `ui 14`, and the owner sees the result, not the question:

- **A hop's dots have a hairline casing, not a disc** (ui 9): a pixel each side of the dot, as a map cases a line it draws
  over another. Still only while a replay tells.
- **The buttons say what they do** (ui 10): Hold is "Pause" and reads "Play" while paused, as a media control does; the line
  under the clock is "Paused · tap to play"; Skip is "Skip to end" where the top row has the room (390 px and wider) and
  "Skip", spoken "Skip to the end", where it has not. Both replays. The walk screen's own controls are untouched.
- **A question never covers what it asks about** (ui 11): where "Keep the likely way?" would leave the walk under about
  96 px of room over the card's sheet, it is asked inside the sheet, as its first block. With room it floats over the map as
  before.
- **One passed-place line at a time** (ui 12), as snackbars are: places whose lines would be up together are said as one
  line, once, as the walker reaches the last of them, as a walk's more than two already are (RP19).
- **A label stands beside its line, not across it** (ui 13): on a way running up or down the screen a whisper stands at the
  line's left, level with its place, narrowed to the room there.
- **The last view's names never stand on the walk or its pictures** (ui 14): where one or two names cannot each stand clear
  beside their place, they are said as the card's one line (RP19), under the walk.

Precedent (0193): the media player's Pause and Play pair and a labelled jump are Apple's and Material's own transport
controls; one transient message at a time is Material's snackbar rule. Of Polarsteps, the adjacent app nearest to a replay,
`docs/research/adjacent-apps.md` records users reporting photos that cover the path (from memory, unverified): the
complaint ui 13 and ui 14 keep clear of. The conventions are named from memory; no source was read for this record.

## Consequences
- The `[owner]` entries these answer are rewritten or removed in `docs/DEFERRED.md`; what each default leaves untried is filed
  there, and six phone checks in `docs/NATIVE_UNVERIFIED.md`. None of it has run on a device.
- `specs/replay-rhythm/spec.md` RR7, `specs/replay-pace/spec.md` and `specs/replay-ceremony/spec.md` (RC8, RC25, the UI
  review's table) say the new words and places.
- These are defaults, not the owner's own looks: the owner may overturn any of them on seeing it, and a reversal amends this
  record. The owner's other open calls on the replay (the frame ceiling on the iPhone, the card's map and date, captions)
  are not touched by it.

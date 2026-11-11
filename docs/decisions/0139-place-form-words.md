# 0139. Place form: plain words for how the ground is laid out, only when obvious

Date: 2026-11-11 · Status: accepted · Area: explore, walkability

## Context
The owner drove through Bethel, Pennsylvania, an I-78 interchange, and found Explore listing places there as if it were a town. They wanted any town, city or neighbourhood to carry a plain-words description of how its ground is laid out, so a person understands what shape of place they are heading into, and a precedent for later descriptions. The vision gate (aligned if reshaped, Nov 11) and three adversarial reviews shaped it.

## Decision
- **Words, descriptive and unordered, no default.** The first set is four: a street grid, a town along a main street, a village along one road, services at a highway exit. Where none fits there is no word. None is a grade, a ranking or advice, and none contains a number or a comparison (PF1, PF2, PF11, PF19). Explore says it and shows everything: no place, mark or find is hidden, thinned or reordered because of it (PF13, PF20).
- **Only positive classifications; ambiguity is silence** (the owner's policy). A word is given only when the ring's measures lie inside exactly one learned territory and the ring read from 150 m north, east, south and west gives the same word at least four times of five. Otherwise nothing shows (PF29).
- **Learned from real, owner-confirmed places, held to places it never saw.** Each territory is a box over six measures (junctions, places and buildings per km², motorway share, busy-street length, frontage) learned by one deterministic procedure from confirmed places and committed as a table; a test holds the table equal to what the procedure makes of the fixtures (PF28). The rule is held to a fresh held-out set cut after the table is pinned, used once (PF6, PF23).
- **From data the app reads.** The busy streets are the landing analysis's (a named street with a run of places along it), frontage is the share of places within 40 m of a named street, and buildings are one more tile read of Overture's buildings, by byte range from the bucket already allowed, held in memory only and never stored. A failed read is no word (PF3, PF17).
- **Where it shows.** On the area card of a neighbourhood or a town, one line worded as the ring's ("Around its middle: …"), only in the northeastern United States, where the evidence is (PF12, PF18). No layer, pin, icon, colour, setting or control.
- **The rule for such words (the precedent).** A later description of a place (its age, its use) is its own slice and its own `/vision` gate, and is held to this: descriptive, unordered, no default, never advice, derived deterministically from open data the app reads, tested against real places, silent when unsure.

## Consequences
- The third held-out look (36 places, 29 outside Pennsylvania, labels written blind by an independent agent): accuracy 0.86 (interval 0.71 to 0.94), recall 0.85. One false positive on a no-word place (a port and warehouse district read as a main street); PF7's zero tolerance fails on it and is recorded, not hidden. Overture under-records malls and outlets, so with half their places unmapped an outlet centre at an interchange reads as an exit (PF24 names it).
- The held-out labels and the 29 later calibration labels were written by independent agents and not yet confirmed by the owner; changing one changes a score, not the rule.
- Thresholds are the learner's, not hand-set: more confirmed places widen the territories and name more obvious places (a learning curve measured: recall 0.25 at 15 places, 0.57 at 45, 0.73 leave-one-out at 88).
- Not native-verified (the card line, the buildings read); see `docs/NATIVE_UNVERIFIED.md`.

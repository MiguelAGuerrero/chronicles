# 0117. Showing a place is the value; its kind is a bonus

Date: 2026-11-09 · Status: accepted · Area: explore, discovery

## Context
Decision 0116 allowed a place's kind to be inferred from name words and a recorded date, set the age threshold to be measured before it was fixed, and opened research into further signals (`docs/research/historic-signals.md`). The owner pulled that back the same day: age was an example of a cheap inference, not a line of work.

## Decision
The owner's call, Nov 9:
- **The value is that a place shows at all.** Sorting it into a kind is a bonus.
- **No extra data is fetched or joined only to sort a place.** A kind is resolved from what the archive already reads for the place to be in it: its type, its tags, its name. A place nothing sorts goes under "Other places" (0115) and is shown like any other.
- **A cheap inference from values already read is welcome**, such as a word in the name from `notable.json`, or a date the record already carries. None is required, and none is a step of its own.
- **Age is not a focus.** There is no age threshold to measure or fix; a date already on a record may sort a place, and nothing more is done for it.
- **No measuring step before the slice** for kinds or age. The test cases (a rural Saskatchewan shrine; the Sturgis Pretzel Bakery in Lititz) stay as cases to check, not studies.

## Consequences
- Supersedes in part 0116: "the age threshold is measured before it is fixed" and "the slice counts what each threshold lets in". 0116's kinds, the relabel to "Monuments and landmarks" and businesses shown wherever in range stand.
- Supersedes in part 0115: "the slice starts by measuring … the share of places each kind catches"; the "Other places" switch made that measure unnecessary.
- The registers and building-age sets in `docs/research/historic-signals.md` are parked: none is joined to sort a place. A register that adds places of its own is a source question (0115), not a sorting one.

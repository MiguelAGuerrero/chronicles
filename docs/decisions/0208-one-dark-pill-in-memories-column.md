# 0208. The storage notice waits for every dark pill in Memories' column; the journal's foot keeps room for both

Date: 2026-11-18 · Status: accepted · Area: storage, journal, tabs · Amends: chronicle-journal audit 62 (the foot's
room) · From: the review of `tend tabs T37` (`/tend inbox T37 yes`, the proxy's yes under 0157, 2026-11-18)

## Context
T37 ("Two dark pills at once on Memories: the bar's Edit pill and the storage notice") was built as the proxy's yes
under decision 0157: the storage notice (decision 0107, SA3, SA10) waits while the recording bar's Edit pill is up and
shows once it goes. Its review found three questions the proxy could not answer (0157: "a steward's Silent question"
is always the owner's): whether "one dark pill at a time" holds for the whole of Memories' column (Undo, the band's own
Edit offer after a photo, its error and Retry pills) or only for the bar's pill; whether the very-low line, which says
the next capture may fail, should wait like the low one; and whether the page should keep room at its foot for the
toolbar and the messages above it together, which reverses chronicle-journal audit 62's "whichever is taller", a
shipped practice. The coordinator put them to the owner.

## Decision
The owner's answers, in person, 2026-11-18, verbatim:

- One dark pill at a time: **"The whole column"**. The notice waits while any pill in Memories' column stands (Undo,
  the band's Edit offer, the bar's Edit pill) and shows once they go.
- The very-low line: **"Very low waits too"**. Same as low; a failed capture is still held for Retry (0107).
- The foot's room: **"Fix it in this run"**. The page pads its foot by the toolbar and its messages (`barH + aboveH`),
  in place of audit 62's `max(barH, aboveH)`.

These are the owner's calls, not the proxy's. T37 itself stays the proxy's yes under 0157.

## Consequences
- `lib/space/sight`: the open line's pills, Memories' toast and its Undo pill count themselves in `columnPills` while
  they stand and Memories is in front; the bar's Edit pill counts while it is offered. The notice steps aside while any
  stands (`tend tabs audit 33`). The walk screen and Navigate, ready keep their own pills out of the count: the answer
  covers Memories' column.
- A line is said and marked said only where a `SpaceLine` can show it, with no Modal over it (`tend tabs audit 32`), so
  waiting never loses it; a refusal waits for the next look off the walk, where SA10 says it (`tend tabs audit 31`).
- `lib/journal/bar.ts`: `footRoom` is `barH + aboveH` (`tend tabs audit 34`); audit 62's test is corrected to this
  answer. `.claude/rules/journal-rest.md`'s line that `footRoom` "is `max(barH, aboveH)`" is out of date and is reworded
  by hand (the loop adds rule lines only, 0135).
- Nothing here has run on a phone: on iOS the notice's arrival is still not announced (filed `[loop]`).

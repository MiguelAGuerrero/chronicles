# 0165. The owner's answers to T19-T22 and to T28's review: the replay's cards in clauses, "Back to Chronicle", a quiet Back, swatches for the walked colour; a pin's span of days, and the part of the day on a map of several walks

Date: 2026-11-13 · Status: accepted · Area: replay, map · Amends: decision 0164 (T28's part of the day, "of the pin's first moment") · From: `/tend` inbox T19, T20, T21, T22; the T28 review's ux 1, ux 2

## Context
The replay's sweep of Nov 12 filed four `[owner]` entries: T19 ("Replay: the cards say their counts in words, with
one hint"), T20 ("Replay: 'Back to the map' and 'Back to walks' both go to Chronicle"), T21 ("Replay: the name step's
only way on is Keep it") and T22 ("The walked colour is separate from the accent"). The owner answered all four in
person on Nov 12, in the orchestration session that ran the loop, but the answers were never recorded: no decision,
no note on the entries. They are recorded here on Nov 13, in the run that built T28 (decision 0164). These are the
owner's own answers, not a proxy's (0157).

The same run built T28 ("Time on every pin", decision 0164) as `tend map T28`. Its review (the auditor and the
ux-reviewer, decision 0145) put two questions inside the owner's own words to the owner (ux 1, ux 2): a pin whose
moments fall on different days said the first one's part of the day for all ("Memories: a photo and a note, three
weeks ago, afternoon" for a photo three weeks old and a note from Tuesday); and on a day replay of two walks a pin of
one walk said "ten minutes in" beside another walk's "fifty minutes in", never saying which walk. The owner answered
both in person on Nov 13, during the review.

## Decision
- **T19, yes**, its recommended shape, "Clauses, one hint": the day's card line a clause ("Four moments, around
  Wickenden Street and the Old Mill"; up to two named places, else "Four moments around Fox Point", the day's area,
  else "Four moments"); the walk card's captures line a clause ("Two photos, a video, a voice memo and a note"); one
  hint on both, "Tap a pin to open it". It amends M13. Built in a later run.
- **T20, yes**, its recommended shape, "Back to Chronicle": the day replay's "Back to the map" (a day with nothing
  kept) and the replay's "Back to walks" (a walk not found) both read "Back to Chronicle", where both already go.
  Built in a later run.
- **T21, yes**, its recommended shape, "A quiet Back": a quiet "Back" in the name sheet's top row, in the card's
  "Not now" style, returning to the card with the words kept. Built in a later run.
- **T22, "Show me swatches"**: not a yes to a hue. A later run renders three candidate walked hues, each apart from
  the accent (`theme.accent`) and the kinds' colours and at 3:1 or more against the map's ground, on the maps that
  draw walked streets; the owner picks one; only then is it built (`COLORS.walked`, with QL2's end taking it). Until
  the owner picks, the walked colour stays as it is.

- **ux 1, "Say the span"**: a pin whose moments fall on different days says the span of their days, as in "Memories:
  a photo and a note, from three weeks ago to Tuesday evening. Open". Each end is that moment's `dayPartLine`; where an
  end's line carries its own comma ("three weeks ago, afternoon", "March, two years ago, evening"), the span uses the
  part before the part of the day ("three weeks ago", "March, two years ago"). One day: the first moment's part, as
  T28 built it. Built in this run as `tend map audit 27`.
- **ux 2, "Part of the day"**: when a map's walk clocks hold more than one walk (a day replay of several walks), every
  pin says its part of the day. A day of one walk keeps the minutes or the span. Built in this run as `tend map audit
  28`.

One build per run (`/tend`, section 7): T28 (decision 0164) is built in this run as `tend map T28`; T19, T20 and
T21 wait for the next `/tend inbox`, and T22 waits for its swatches.

## Consequences
- The replay's cards say their counts in clauses with one hint, the two dead ends name the place they go back to,
  and the name step gains a way back on an iPhone, each in a run of its own.
- No walked hue is chosen; the swatches come first, and the entry stays open until the owner picks.
- A pin never claims one part of the day for moments of different days, and never a walk's minutes on a map where
  they would not say which walk.
- M13's example is amended by the owner when T19 is built; the loop may not edit a spec.

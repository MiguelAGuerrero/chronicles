# 0164. The owner's answers to T28 and T29: a pin says its time; reminders say their counts in words

Date: 2026-11-13 · Status: accepted · Area: map, notifications, memories · Amends: decision 0154 (the time in a pin's name, now on every pin) · From: `/tend` inbox T28, T29

## Context
Since `tend map T14` a pin of several moments says its time on the walk screen, the replay and a day's replay ("A
photo and a note, twelve minutes in. Open"), while a pin of one moment beside it says "Photo. Open". Since `tend map
audit 19` a pin whose moments lie more than ten walked minutes apart says its kinds alone, and Chronicle's map, the
memory pins and the ready screen, which have no walk clock, say their kinds alone too (`pinInto`, `src/lib/pins.ts`).
The run that built T14 filed this as T28 `[owner]` ("Map: when a pin says its time"). Its sibling lens filed T29
`[owner]` ("Reminders say their counts in digits beside pins that say words"): a reminder of two memories says "2
memories here" with the body "2 voice memos and a note" (`discovery/recall.ts`), on the reminder card and in the
announcements of the recording bar and the walk screen, beside a memory pin that says "Memories: a photo and a note"
from a second copy of the kinds' words. The owner answered both in person on Nov 13, after T14 shipped. These are the
owner's own answers, not a proxy's (0157).

## Decision
- **T28, yes**, its recommended shape, "Time on every pin": a pin of one moment says its minutes too when its walk's
  clock is known ("Photo, twelve minutes in. Open"); a pin whose moments lie more than ten walked minutes apart says
  the span ("A photo and a note, from the start to fifty-eight minutes in. Open"); a map with no walk clock says the
  part of the day of the pin's first moment, as a moment's own line does ("A photo and a note, Tuesday evening.
  Open"). It amends QL26's, NY10's and RB7's spoken examples again. Built in a later run.
- **T29, yes**, its recommended shape, "Words; keep '12 min in'": a reminder of several says "Two memories here", and
  its body takes the pins' words from one table (`pinKindsWords`, the kinds in the order taken): "Two voice memos and
  a note". The announcements of the recording bar and the walk screen say the same. "What happened here" keeps "12 min
  in" ("Distances and times are fine"). It amends v1-discovery R7's example "2 memories here". Built in a later run.

One build per run (`/tend`, section 7): T25 (decision 0162) is built in this run as `tend map T25`; T28 and T29 wait
in the inbox, marked answered.

## Consequences
- Every pin that can say when says it: its minutes on a map with a walk clock, the span when its moments are far apart
  in the walk, the part of the day on a map with none. No pin says a count in digits.
- A reminder, its card and its announcements say their counts in words, and their kinds in the words the pins use,
  from one table; "What happened here" keeps its times in digits, which the page allows.
- The criteria that pin the old examples (QL26, NY10 and RB7 for T28; v1-discovery's R7 for T29) are amended by the owner;
  the loop may not edit a spec.

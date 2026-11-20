# 0243. The tabs sweep: the owner's answers on tabs' lines, the tabs' error line, the empty peek's word, the bar's time and the replay's error line

Date: 2026-11-20 · Status: accepted · Area: tabs, process · Relates to: 0048, 0112, 0148, 0172, 0209, 0236, 0240

## Context
The third whole sweep under decision 0229, of the `tabs` area (`/tend tabs`, Nov 20), and the third run under the
expectation lens (0236), put four questions to the owner at its first review pause and two at its diff pause, through
the tend orchestrator.

At the first pause:

- **Tabs' expectation lines.** Tabs had none; the run drafted five and the `steward` reworded four of them: E1 named a
  map "loading first", which its check does not test; E3 made a stopwatch the need ("its time and distance growing"),
  which "Who it is for" leaves to hikers and runners; E4 named the photo alone, leaving out T11's question (voice and
  note two taps away on the recording bar) and so making the area look whole; E5's check never reaches "start a walk
  before pressing Save".
- **The tabs' error line.** Explore's and Chronicle's error screens said "Your walk is saved." with no walk at all, and
  under a walk minimized and still recording, where "saved" reads as ended (the `auditor`'s 1, the `ux-reviewer`'s 1,
  the `steward`'s 5). Decision 0172's O35 had put "Your walk is still recording." on the walk screen only; `tend
  walk-screen audit 5` made the walk route say nothing of a walk with none open (`walkErrorLine`).
- **"starred" in the empty peek** (0148: "Walk somewhere and it is starred here", "This walk is starred here when it
  ends"): in most apps a star is a favourite or a rating, and VISION's Never names stars (the `steward`'s silent 2).
- **The bar's seconds.** The recording bar ticked seconds over the journal on every tab (the `steward`'s silent 4).

At the diff pause:

- **The bar past the hour.** In minutes, "1 h 05 min · 4.2 km" filled the bar at 320 px and cut the distance, recording
  or paused, as the old line already had past the hour (the `auditor`'s 2, the `ux-reviewer`'s 2, the `steward`'s 2).
- **The replay's error line while another walk records.** A replay of an earlier walk that throws said "Your walk is
  saved." with a walk recording minimized and no recording bar on screen (the `steward`'s silent 1).

## Decision
The owner's answers, in person, verbatim, Nov 20.

At the first pause:

- **Tabs' lines, as the steward reworded them:** "Ratify as drafted (Recommended)". The run drafts them
  (`docs/expectations/tabs.md`); the orchestrator records the answer in its own commit after the run lands. E1: "… to
  land on Chronicle's Memories, where their moments are, not on a map", its grounds VISION's "Who it is for" and, after
  it, VISION's "Chronicle first" (0209) and 0112; E3: "a walk they leave for another tab to go on recording, with a bar
  on that tab saying so"; E4: "a photo, a voice memo or a note, each one tap from the tab they are on while a walk
  records, to join that walk without leaving the tab", its check pending and the line judged failed, its defect T11's;
  E5: "a voice memo they are still recording before a walk to be kept, not lost, when they leave that screen without
  pressing Save". E2 as drafted.
- **The tabs' error line:** "Yes, 'still recording' (Recommended)". O35 extends to the tabs: no line with no walk open,
  "Your walk is still recording." while one records, "Your walk is saved." while it is paused, as `walkErrorLine` says.
- **"starred" in the empty peek:** "Rename the mark (Recommended)". A plain word, "marked here", so nothing reads as a
  rating.
- **The bar's seconds:** "Minutes on the tabs (Recommended)". The bar above the tabs says the time walked in minutes;
  the seconds stay on the walk screen.

At the diff pause:

- **The bar past the hour:** the owner typed "1:45". Past the hour the bar reads hours:minutes ("1:45 · 4.2 km"); under
  it, "< 1 min" and "12 min" stand.
- **The replay's error line:** "Nothing while one records (Recommended)". The replay keeps "Your walk is saved." only
  while no other walk records; while one records it shows no line, and Try again and its way back stay.

## Consequences
- `tend tabs 16`: the tabs' error screens (Explore and Navigate, Chronicle's tab and the tabs' layout) take their line
  from the keeper (`walkErrorLine`): the owner's answer, amending O35's "on the walk screen only". A day, What I'm into
  and `/chronicle` follow the same line as the run's own call, not the owner's: they said "saved" with no walk at all, a
  bug, as `tend walk-screen audit 5` found on the walk route. `tend tabs audit 58`: the replay's line follows the
  owner's second answer (`replayErrorLine`).
- `tend tabs 20`: the empty peek reads "Walk somewhere and it is marked here" and "This walk is marked here when it
  ends"; this amends 0148's words, not its shape. The map's marks are unchanged.
- `tend tabs 21`, `tend tabs audit 55`: the bar's line reads "< 1 min · 18 m", "12 min · 1.3 km", "1:05 · 1.5 km"
  (`barTime`), "· Paused" after them; NV9's "elapsed time" holds, in minutes. `tend tabs audit 56`: the bar's spoken
  label says the same minutes ("under a minute", "12 min", "1 h 05 min"); the walk screen's strip keeps its own clock.
  `tend tabs audit 57`: the numbers are drawn whole and only " · Paused" shrinks.
- E-tabs-4's defect is T11, already in the inbox: a note on T11 names the line, which passes only with the mic and the
  note both on the bar (T11's Otherwise), not with its Recommended's mic alone.
- The rule files' and `specs/v0.5-places/spec.md`'s quotes of the old words, and NV9's "It has no Stop.", are the
  owner's to reword: "Open before the loop".

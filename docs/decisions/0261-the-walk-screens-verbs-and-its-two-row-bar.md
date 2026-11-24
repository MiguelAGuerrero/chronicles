# 0261. The walk screen serves Earn and Honour, its two-row bar does not fold, and a photo taken mid-memo

Date: 2026-11-23 · Status: accepted · Area: walk-screen, navigation, captures, process · Relates to: 0094, 0157, 0233, 0236, 0240, 0244, 0245 · Bends: MS3's "first capture's" (`specs/moment-stacks/spec.md`)

## Context
`tend walk-screen T42` (Nov 23) built the owner's "Two rows inside" (decision 0233): while navigating, the walk screen's
blue bar is two rows, the arrow and the line over "Open in Maps" and "End", about 104 px tall over the walking map. At
that run's diff review the `steward` left two questions it could not settle from `docs/VISION.md` (its Silent questions):

1. **Restraint:** "is a two-row, about 104 px blue bar over the walking map within 'the content is the novelty, not the
   chrome', or should it fold back to one row when the line fits?"
2. **The verb:** "Is a legible guidance bar on the walk screen Earn, or does the walk-screen feature need a verb ruling
   of its own (Earn and Honour, as the map's were ruled)…?" The run had drafted the walk screen's first expectation
   lines, and flagged E-walk-screen-1 (the way they follow stays readable at a glance on a small phone, its check
   T42's) as serving no verb: "it reads as what map apps have (a legible guidance bar), not what raises what this
   person notices" (decision 0245's flag).

The question put to the owner carried the premise "as the map's were", which was wrong (the orchestrator's error, from
the T42 steward's wording): the map's verbs are Earn and Return, the orchestrator's proxy ruling of Nov 20 (decision
0157), kept in `.claude/skills/tend/expectations.md` (l.35-37). The owner's answer, Earn and Honour for the walk screen,
stands on its own.

`/tend inbox T44 yes` (Nov 23) built the owner's "Camera stays" (0233): while a memo records, the camera keeps its slot
and a photo taken then joins the memo's moment. Its diff review (the `auditor`, the `ux-reviewer`, the `steward`) left
three more questions, and a sibling the build did not touch.

## Decision
The owner's answers, in person, verbatim, Nov 23.

- **The bar:** "Two rows always (Recommended)". Decision 0233's shape stands: the navigation bar is two rows whenever
  it shows, and it does not fold back to one row when the line would fit.
- **The verb:** "Earn and Honour (Recommended)". The walk-screen feature is ruled Earn and Honour. E-walk-screen-1, the
  bar readable, serves Earn: "the way they chose stays a glance, so their eyes go back to the street". (The record's
  own words, not the owner's: VISION's "The three verbs" places Navigate under Earn, and Capture and the walk under
  Honour.)
- **The editor mid-memo** ("While a memo records, should the editor that opens after a photo (0240) wait until the memo
  is saved or discarded, or open at once and show the memo's timer and Stop & save?"): "Editor waits (Recommended)".
  A photo taken mid-memo is kept, and joined, at once; its editor opens on it once the memo is saved or discarded.
- **The moment's time and place** ("When a photo joins a memo begun on its own, should the moment take the memo's start
  time and place rather than the photo's?"): "Keep the photo's (Recommended)". The photo, the first capture kept, is
  the moment: its time and place are the photo's, and the memo is a piece with its own earlier time. This bends MS3's
  "The moment's place and time stay its first capture's", where the first capture begun is the memo.
- **The note mid-memo** ("Mid-memo, should the note's slot stay empty?"): "Stays empty (Recommended)".
- **The recording bar's memo** (its Discard still in its camera's place, BC2): "Yes, file it as yes'd (Recommended)".
  Filed as a `T` entry of the tabs area with the owner's yes, for a build of its own.

## Consequences
- Nothing changes in the bar: it is as `tend walk-screen T42` shipped it.
- **Where a feature's verb is kept.** `scripts/features.js` has no verb field (one is proposed in an unbuilt `G` entry,
  "each area's verb in `scripts/features.js`"), and the loop may not edit it (`FORBIDDEN` in `scripts/tend.js`). The
  map's ruling is kept in `.claude/skills/tend/expectations.md`, which also says "no other feature has a ruling": now out
  of date, and a skill the loop may not edit either. Both wait in "Open before the loop"; until then this record holds
  the walk screen's verbs.
- **E-walk-screen-1's `Serves:`** is the owner's: `Earn; the way they chose stays a glance, so their eyes go back to the
  street`. It still reads `none; …` in `docs/expectations/walk-screen.md`: `npm run expectations` has no operation that
  gives a proposed line, or a line flagged `none`, a verb (`amend` takes only a ratified line, and its verb-only form
  refuses a line whose `Serves:` is set, `none` included), and `check:tend` refuses an agent's hand edit of a line's
  `Serves:` (`editProblems`). It waits in "Open before the loop" for the tooling's change or the owner's hand.
- The T44 build follows the three answers (`tend walk-screen audit 20`; the moment's anchor is the piece holding its id,
  `audit 21`). NR10's and MS3's wording, and the walk-screen rule's older line on Discard "in the camera's slot", are
  the owner's to change: "Open before the loop".

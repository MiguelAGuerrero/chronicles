# 0211. One machine for every outing, with or without a destination; a reach you set; new places first

Date: 2026-11-17 · Status: accepted · Area: explore, outing · Follows [0210](0210-outing-journey-the-owners-answers.md); amends OJ35 and the steward's S4 (`specs/outing-journey`)

## Context
Step 1 of the destination-first page was built and shown. Asked what would make it stronger, the agent proposed six things: real data
(the stores pack published, the places archive read), the towns between, a journey that mixes shops and attractions, a page that opens
with something proposed, a map that carries the preview, and a next move in place of dead ends and fixed sets.

## Decision
The owner's calls, Nov 17:
- **"Implement your suggestions."**
- **An outing needs no destination**: "if I did want to do an antique run or a vintage run, whatever dimension the app specifies, it
  would suggest within a certain radius, a kilometer, meter, what have you, a potential route".
- **Prioritize new places** "depending on how we generate those routes".
- **One machine**: "the underlying machine to produce any route should be the same, regardless if the destination is specified or not."

Taken as defaults, the owner's to overrule:
- The radius is a **reach** picked on the page (close by, then three steps out), not remembered. Within it the same machine reads the
  towns and plans a chapter in each; toward a destination it reads the towns near the straight line. Around where you stand is one area.
- **New** means: a town you have not been in on a recorded outing is looked at before one you have; an attraction you have not found is
  offered before one you have. A shop has no record of having been visited (an arrival is never kept, QC19), so shops are not told
  apart yet: what would make a shop "been there" is the owner's to decide.
- **The page proposes as it opens**, around where you stand, from the chips "What I'm into" turns on: opening it is the tap that asks
  (this sets aside the steward's S4 guard and rewrites OJ35). A town further off is read only once the reach or a destination asks.
- **A mixed journey** leads when the chips span leanings; **"Another like this"** plans the journey in view again from other places.
- Reading looks at the nearest eight towns of a reach or a way, new ones first: a bound on reading (OJ37), not on a journey, and a
  setting later (0210).
- Until the session carries a journey (step 3), Start begins the first town's chapter, and each town has Open in Maps.

## Consequences
- `planJourneys` takes areas, each with its own candidates and streets, and returns journeys of chapters; around here is the case of
  one area. No second planner.
- Not done here: publishing the stores pack (chronicles-data, a repository this session does not hold); marks per kind and town
  outlines on the page's map (the map component, on two platforms); the road engine (0210).
- Native: nothing here has run on a device.

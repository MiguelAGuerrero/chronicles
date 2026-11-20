# 0239. The presence sweep: the owner's answers on the category words, what counts toward storefronts and a complex's shopping word, presence's lines and 0230's Never line

Date: 2026-11-19, and 2026-11-20 · Status: accepted · Area: presence, explore, complexes, process · Relates to: 0140, 0180, 0191, 0200, 0230, 0236, 0237

## Context
The first whole sweep of presence (`/tend presence`, Nov 19-20, decision 0229), and the first run under the expectation
lens (0236), put questions to the owner at both its review pauses, through the tend orchestrator.

At the first pause (Nov 19):

- **Presence's expectation lines.** Presence had none; the run drafted five and the `steward` reworded them (its line 1
  expected an area's list of places waiting to be found, which 0230 removed; its line 3 was a code rule, not something a
  person sees).
- **The category words.** An area card's bars say "Green" and "Views", while "What I'm into" heads the same categories
  "Parks & green spaces" and "Viewpoints & oddities", and the card's explanation sends the reader there in the card's
  words (the `ux-reviewer`'s 1, the `steward`'s 6; two tables, `ATLAS_LABEL` in `atlas/atlas.ts` and `CATEGORIES` in
  `discovery/categories.ts`).
- **An Overture historic site.** SF10 (0180) says parks, monuments, memorials and cemeteries weigh nothing toward
  storefronts. The map's did not, but Overture's did, through their roots (`cultural_and_historic` a storefront
  `heritage`, `sports_and_recreation` a storefront `sport`): 31 historic sites, 22 parks, a memorial site and a trail in
  the three real Overture fixtures. SF10 does not say whether a historic site is a place you walk into or a monument (the
  steward's silent 2), and the fix moves `PRESENCE_CODE`, which re-derives every remembered area, as the change 0172
  settled did.
- **0230's proposed Never line** ("a card or screen that lists what is left to find; 'what's waiting' is the map's '?',
  never a list"), on which the steward's rewording of line 1 rests.

At the diff pause (Nov 20), the reviewers found that a "?" card already names no kind until it is found (PC16), which
line 1 as reworded asked the opposite of; that a castle tagged `castle` was a monument and weighed nothing, while a manor
of the castle class was a storefront and no mark (an answer of Nov 19 had been put to the owner as "a castle stays a
storefront, as 0180 has it", which 0180 does not say); that the names of Overture's taxonomy beyond the fixtures could not
be read from the session; and that a complex's shopping word weighed Overture's cemeteries and memorial sites in full (the
steward's silent 3).

## Decision
The owner's answers, in person, verbatim.

Nov 19:

- **The category words:** "Short card words (Recommended)". The card and "What I'm into" both read "Green" and "Views &
  oddities", and "What I'm into" keeps a muted line under each heading (for example "Parks, gardens and nature").
- **An Overture historic site:** "Monument, counts nothing (Recommended)". Partly revised on Nov 20, below.
- **Presence's five lines:** "Ratify as drafted (Recommended)", for the steward's reworded set. Since Nov 20 it applies to
  E-presence-2 to 5 and to E-presence-1 as reworded below.
- **0230's Never line:** "Add it (Recommended)". A `docs/VISION.md` edit, made by a run of its own, not by the loop: it
  landed while this run was open, as [0237](0237-a-list-of-what-is-left-to-find-is-a-never.md).

Nov 20:

- **E-presence-1 against PC16:** "PC16 holds; reword E1 (Recommended)". The line becomes: "A person who goes out to
  notice, using presence, would reasonably expect a "?" card to name no kind until the place is found, and the find then
  to be kept under the kind whose row in "What I'm into" hides it." Its check is pending.
- **What you can enter:** "Manners or any other monumental structures that you can enter and browse should be counted
  both as storefront and points of interest. I'm not trying to split hairs with this because I'd rather be inclusive than
  being overly dismissive." On the shape: "Enterable counts both (Recommended)". From the map, a castle, a manor, a fort
  or another house of the castle class is a place to find (a mark) and a storefront; Overture's historic site counts as a
  storefront again, with no mark (0109 stands); parks, cemeteries, memorial sites and plain monuments (statues) still
  count nothing toward storefronts. This revises Nov 19's "Monument, counts nothing" for historic sites.
- **Overture's names the session could not read:** "A loop note (Recommended)". A `[loop]` low, named as E-presence-2's
  open edge.
- **A cemetery in a complex's shopping word:** "Never (Recommended)". Cemeteries, memorial sites and parks weigh
  nothing toward a complex's shopping word either; a mall's own art still counts.

## Consequences
- `tend presence 2`, `tend presence audit 2`: Overture's memorial sites (and their cemeteries), parks and trails weigh
  nothing toward storefronts; its historic site is `heritage`, a storefront with no category; a castle-class poi from the
  map (never `castle/ruins`, a Ruin) is `monument` and `heritage`, read first as the monument by marks and bars and as
  the storefront by density. `PRESENCE_CODE` p11, nothing carried, so every remembered area and atlas row is derived
  again. A park or a trail from Overture is `open_space`, which has no category, so no reader of Overture's classes could
  make a mark of one (0109).
- `tend presence audit 3`: parks, cemeteries and memorial sites carry `ground`, which `densityWeight` reads as nothing,
  so they never help call a complex shopping; `COMPLEX_CODE` c2, and stored complexes are read again (CX14).
- The category words are the owner's direction for a build that did not fit this run (it reaches every reader of the
  two tables and the planner's and the kind walk's sentences): T49, with the owner's yes noted.
- Overture's other names for SF10's kinds wait in `docs/DEFERRED.md`, "Presence and kinds", as E-presence-2's open edge.
- `specs/storefronts/spec.md` SF10 holds as written for what it names; a castle-class house the map holds is the owner's
  exception of Nov 20, beside "listed structures", which stay the archive's `structure`.

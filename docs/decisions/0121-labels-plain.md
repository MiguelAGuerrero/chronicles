# 0121. Plain labels: "History" and "Places of worship"

Date: 2026-11-10 · Status: accepted · Area: explore, discovery

## Context
The steward of Remarkable and public (decisions 0109-0111) found that the History category's label, "History & landmarks", is spoken beside every History place to screen readers ("Hessian Memorial, History & landmarks") and in the find announcement, and that "landmark" names significance, which RP18 keeps off every kind's label. The kind "Historic churches" holds every place of worship, a synagogue or a mosque included, and says the place is old.

## Decision
The owner's calls, Nov 10:
- The category `history` is labelled **"History"** ("History" (Recommended)).
- The kind `churches` is labelled **"Places of worship"** ("Places of worship" (Recommended)).
- No category's label names significance or age; the test `labels-plain 1` holds it, beside RP18 for kinds.

## Consequences
- Ids are unchanged (`history`, `churches`): saved choices in "What I'm into" stand.
- The e2e's screen-reader labels read "Hessian Memorial, History".

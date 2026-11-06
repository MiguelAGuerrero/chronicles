# 0099. A place's sheet names its finds and never counts them

Date: 2026-11-05 · Status: accepted · Area: explore, chronicle, vision

## Context
A neighborhood's or town's place view showed "12 of 87 · list from Nov 1" beside its found places (E10). It broke "counts are words" and read as a list to complete, the "tourists working through a list" `docs/VISION.md` says the app is not for. It was open in the concept doc since NV14 and as `docs/VISION.md` open question 6, carried as debt by `npm run check:vision` (decision 0094). The places archive (Places worth the stop, PW17) would have made its total grow with every source added.

## Decision
The owner's call, Nov 5 ("hide the count"):
- **The place view shows no count.** No "N of M", no total, no found count. The finds stay, named ("Found here: Hessian Memorial · …"), as before.
- `countLine` and `homeCount` are gone; `placeCount` became `placeFinds`, which returns only the place's finds.
- The checklist itself is unchanged: areas are still built, and finding still works as E9 says.

## Consequences
- E10 and E17 in `specs/v1-discovery/spec.md` are amended; the `atlas` journey checks the finds are named and nothing is counted.
- The debt entry is removed from `scripts/vision.allow.json`; `npm run check:vision` passes with no debt.
- Places worth the stop's PW17 is settled by this: the sheet shows no total, whatever the archive adds.
- **Proposed edit to `docs/VISION.md`** (the owner makes it): remove open question 6, now answered; the Never row on tallies already holds the rule. Until then the page still lists the question.

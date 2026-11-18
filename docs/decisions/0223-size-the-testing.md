# 0223. Testing is sized to the change, not to what `check:affected` reaches

Date: 2026-11-18 · Status: accepted · Area: testing, skills · Sharpens 0074 and the owner's call of Nov 10 ("Choosing the journeys"); keeps 0181 (the loop's lane) and 0204 (journeys side by side)

## Context
The where-ive-been slice (decision 0222) removed one button and added one map layer. It ran about an hour of e2e
journeys where 15 to 20 minutes proved it: its new journey ran about seven times for its own bugs; `gaps` and
`reload` ran for one-line shell wiring their unit tests already proved, and `gaps`' failure, also on `main`, cost a
solo rerun and a three-run baseline; three journeys at once on four cores failed a timing check in `walk`; and after a
merge from `main` the deploy ran all seven again on the sub-path build, `qol`'s eleven minutes twice. The owner, Nov 18:
"comprehensive testing for removal of a feature this small is unnecessary bottleneck and token waste", and asked for the
rules in `docs/TESTING.md` and in every skill where testing is a step.

## Decision
- **Size the change before running anything** (none, small, flow, build) and run only the journeys the size implies,
  with their minutes estimated from a table of measured times. A bigger set is a question for the owner.
- **A removal is found by grep** of the journeys for its test id, words and slot, not by `check:affected`'s file map.
- **Wiring a unit test proves adds no journey**, even when its file maps to one.
- **A new journey runs alone until green**, its pictures read, before any batch.
- **A failure in a journey the size did not call for is dropped, not chased**: no rerun, no baseline.
- **A timing failure in a batch is rerun alone once** before anything else.
- **After a merge from `main`, only the journeys whose files or checks the merge changed**, within the size.
- **The deploy's sub-path run is the change's own journey and `launch`**, unless the change touches base-URL or
  routing code.
- **A long journey runs once for a change**; a second run of one over five minutes is asked of the owner.

## Consequences
- `docs/TESTING.md` gains "Size the testing to the change" before "Choosing the journeys", whose rules still apply
  within the size; a report states the size, the journeys run and their minutes.
- `/slice` (the plan states the size; step 9 sizes before running), `/fix` (the `e2e` level), `/deploy` (the sub-path
  run), `/audit`, `/e2e`, `/tend` (the removed-control grep) and `ship.md` (the review's pictures) point to it.
- The measured times are a cloud container's on Nov 18; a later slice that measures differently updates the table.

# 0235. An area's state is what is left open; the balance reads shares and acts both ways; review has a budget; the whole inbox counts

Date: 2026-11-19 · Status: accepted, waits on G6 and G7's builds · Area: process, tend · Amends: 0129 (area states), 0181 (medium and above fixed in the run), 0229 (the reset stays; the state is computed) · From: the owner, in person, Nov 19, on `docs/research/tend-process-review.md`

## Context
The owner asked for a fresh-context agent to research how agentic feature work is scoped and how refinement is balanced against
growth, then to review the tend orchestration and compare its findings with the coordinating session's. Both found the same
core: in 66 runs no area ever left `rough` (it records what a sweep found, and reviewers always find a medium); the balance has
read "outgrowing its base" since Nov 12 and its only effect is to stop the loop's own proposals, while 64 slices grew in 14 days;
review fixes outnumber the fixes they review (174 against 110, 297 accepted against 8 rejected); the inbox is 81 items and the
script counts 11. Evidence and sources: `docs/research/tend-process-review.md`, `docs/research/agentic-process-framework.md`.

## Decision
The owner's answers, Nov 19, each the recommended option:
- **Rough is what is left open, with a backstop.** After a run, `scripts/tend.js` computes an area's state from what is open:
  any open high or medium of the area (not shipped, deferred by review, or a `[loop]` item in DEFERRED) is `rough`; only lows
  open, or the area's `[owner]` or `[arch]` entries waiting, is `settling`; a whole sweep that leaves nothing above low open, with
  a journey for every screen, is `polished`. A reset (0229) still makes it `rough`. After three whole sweeps of an area with no
  reset between them it is `settling` at least, and its lows go to DEFERRED instead of being found again.
- **The balance reads shares and acts both ways.** Rough is read as a share of the swept areas, never-swept shown apart as
  "unseen". Fourteen days with no loop-filed `G` while some area is settling or polished: the next run evolves that area. An owner's
  slice whose area has an open medium or high: `/slice` says "lands on a rough base" with the items, and its record says whether
  the area is left no rougher (a warning, never a block). On a shallow history the script refuses to answer.
- **Review has a budget**: at most one review-fix commit per finding shipped or entry built, plus any regression the run itself
  caused; the rest are filed with their severity (they keep the area rough, so the next sweep takes them first). `check:tend`
  counts it.
- **The whole inbox counts**: every item under "Needs the owner" is read by the balance; items unanswered for 30 days move to
  DEFERRED as `[owner]` with their words; the four oldest are asked first. A session leases the process files it is changing (a
  row in "In flight", 24 h), and decision numbers are taken at publish.
- **Not chosen:** a process share that stops the orchestrator.

## Consequences
- G6 (the states, the balance, the inbox count) and G7 (the review budget, rotation onto never-swept areas, an answer log with who
  answered and which option, expiry, the lease, numbers at publish), built after the orchestrator session's expectation lens lands.
- The starting numbers (three sweeps, 14 days, 30 days, one fix per fix) are tuned from the run log, by the owner.
- All four answers were the recommended options, as every answer in 0231-0233 was; G7's answer log measures that rate, and the
  owner, not the loop, decides what it means.

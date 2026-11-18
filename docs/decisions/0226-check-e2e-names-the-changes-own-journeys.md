# 0226. `check:e2e` names the change's own journeys; the rest are reached, not run

Date: 2026-11-18 · Status: accepted · Area: testing, tooling · Implements 0223 ("Choosing the journeys" 2) in the tool; keeps 0074, 0204

## Context
Decision 0223 says to size the testing to the change and to run only the journeys that hold its checks, but
`npm run check:e2e` still printed every journey whose `covers` reach a changed file, each as a ready command, and
`/slice` told a session to run what it printed. The tap-to-capture slice (0224) changed `walk.tsx` and a few shells: the
tool named 24 journeys, about 20 minutes in batches, where `walk`, the one journey holding TC1-TC9, proved it.
`walk.tsx` and `explore.tsx` are each in 15 journeys' `covers`; on recent commits any edit to them named 16 to 24.
Measured practice agrees (search summaries, not read in full): Google's TAP found about 1.2% of the tests its
dependency graph called affected broke; Meta's predictive selection runs about a third and catches over 99.9% of faulty
changes; both leave the rest to a later, broader pass. This repo's broader pass is the weekly `e2e:all`.

The owner, Nov 18: "The goal is faster iteration and velocity, not comprehensive, unnecessary, redundant testing when
we're in the develop phase", and chose the change's own journeys as the default.

## Decision
- `check:e2e` (and the end of `check:affected`) names to run only the change's own journeys: one whose file changed,
  and one whose checks name a criterion id from the branch's commit subjects (`TC1-TC9` expands to TC1...TC9).
  Two or more are one `npm run e2e:batch` line.
- Every other journey that covers a changed file is one line, "Reached, not run (0223)", with no command. A failure
  there is dropped, not chased.
- No own journey: the change's unit tests prove it. A change to what a screen shows adds a check, with its criterion
  id, to that screen's journey, which then becomes its own.
- `--reach` prints the old list, every covering journey to run.

## Consequences
- What a change reaches but does not check waits for the weekly `e2e:all`, or the full flow when the owner asks.
- A journey's checks should name their criterion ids (about half do today); an old journey with none is named only
  when its file changes.
- Follow-ups chosen with this: a list of journeys known red on `main`, a timing failure in a batch rerun alone, and
  `upgrade`'s MT9 compared with the store's version.

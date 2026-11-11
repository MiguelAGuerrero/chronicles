# 0130. The skills are one system: an approved proposal runs through `/slice` to `main`; the shared steps and the map are written once

Date: 2026-11-11 · Status: accepted · Area: process · Extends: 0128, 0129 · Amends: 0018 (the plan review), 0074, 0081

## Context
`/tend` routed work but each skill it leans on was written to be run alone by the owner: `/slice` stops for a plan
review and never pushes, `/deploy` and `/audit` run only when asked, `/fix` held the only copy of the worktree, push,
revert and cleanup steps, and `/tend` followed it by section number. The owner asked that an approved proposal reach
`main` without further stops, and that each skill's inputs, outputs, dependencies and assertions be assessed so the
skills fit one system. Anthropic's guidance on agents and skills was read first: compose skills, do not copy them;
keep state in files; make gates scripts; review in a fresh context and ask for evidence; one piece of work per run.

## Decision
- **A yes to a `G` entry is the go-ahead for that slice** (the owner, Nov 11): `/slice <slug> --from=G<n>` takes the
  entry's criteria and verdict as its start, writes its plan and runs the steward without holding the plan for the
  owner, gets one `auditor` pass when green, and publishes to `main`. It stops only on an architectural decision or
  a steward finding that changes what a person sees beyond the approved shape. `/slice` typed by the owner is unchanged.
- **`.claude/skills/ship.md`** holds what the publishing skills share: the worktree, the hard stops, the review, the
  push and the red-run revert, the cleanup, and a result block every report ends with. `/fix`, `/tend` and `/slice`
  name its sections by heading; `/fix` behaves as before.
- **`.claude/skills/README.md`** is the map: per skill what it takes, what it leaves, where it stops and what it may
  push, and the system's rules. A skill called by another never asks the owner and never pushes on its own
  authority; it returns its result and the caller decides. `/vision` says so for itself.
- **Scripts over prose:** `scripts/tend.js` reads growth against refinement (`npm run tend:balance`) and holds each
  loop commit to a test and a `Source:` line (`npm run check:tend`); the ledger is JSON.
- `/audit` and `/deploy` stay the owner's; `/tend`'s sweep is the standing pass and does not run `/audit`.

## Why
The owner approves what is built next and favours velocity; two more stops after a yes made that untrue for anything
larger than a fix. One copy of the publishing steps keeps a change to them from reaching one skill and not the others.

## Consequences
- A plan the owner never read can reach the live site. The slice is bounded by the approved criteria, reviewed by the
  steward and the auditor, and reverted by `ship.md`'s red-run rule; its area is rough until the loop sweeps it.
- `check:tend` runs when `/tend` runs it, not in CI: CI sees one push, not a range to read.
- The reading's thresholds live in `scripts/tend.js` (`LIMITS`); changing them is an edit there and a test.

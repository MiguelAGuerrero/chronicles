# 0134. The run log: each run of the loop adds one line of facts; nothing in the loop writes its own lessons

Date: 2026-11-11 · Status: accepted · Area: process · Extends: 0128, 0133

## Context
The owner asked how the loop could reflect, so that each iteration improves the workflow, and asked that the answer
rest on research. What was read (Reflexion, ExpeL, Voyager, ACE, GEPA and Anthropic's guidance on memory, skills and
harnesses; much of it from repository pages and summaries, since the papers' host was out of reach): reflection pays
where there is a hard outcome to learn from and fails where an agent grades its own work; instructions an agent
writes for itself have shown no average benefit; whole rewrites of a playbook decay into generalities; one case is
not a lesson; an agent that may edit its own checks has been seen to weaken them. The loop kept no history: "Last
tend" is replaced each run and the ledger holds only the present. The owner's call, Nov 11: build the run log.

## Decision
- `.claude/skills/tend/runs.jsonl` holds one line per run, added by `npm run tend:log` in the run's record commit:
  the mode, area, base and deploy; the lenses skipped; what a sweep found by class and severity, shipped or not;
  the entries filed and the owner's answers; the review's counts; the area's state before and after. The script adds
  what the commits say: findings shipped, the review's fixes, entries built, reverts.
- The log is facts only: no lesson, rating or advice. It is append-only; `check:tend`, in the loop and in CI, fails a
  commit that changes a line already there.
- The first run (`/tend chronicle`, Nov 11) is written in after the fact from its commits and its record, marked
  `backfilled`, without the counts it did not keep.

## Why
A log is the one form of reflection every source agrees on: it is the raw signal, it costs a line, and it commits
the loop to nothing. Lessons drawn from it are a second step that needs several runs to read and the owner to approve.

## Consequences
- Nothing reads the log yet. Reading it (an owner-typed reflect mode that proposes at most a few changes to a skill, a
  threshold or a check, each resting on more than one run, filed in the inbox) waits until there are runs to read.
- What the owner overrules is in the log only in part: answers to entries and reverts made by the loop. A commit the
  owner reverts by hand, or a `/fix` over the loop's lines, is in git and is for the reader to find.
- The loop may still edit the rule files it cites, other than the UI patterns; closing that is left for the owner's word.

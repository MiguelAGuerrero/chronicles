# 0126. A branch is marked ready by a commit; a failure several branches could cause is isolated

Date: 2026-11-10 · Status: accepted · Area: process, testing · Amends: 0125 (how the train finds its branches, and whom a shared failure goes to)

## Context
The deploy's train (0125) took its branches by name, from the owner or from reading STATUS.md's "In flight" notes, and nothing stopped a half-done branch from riding it. A red journey that two or more branches reached went to all of them, with no way to tell which broke it. Measured against merge queues (bors, GitHub's, Mergify, Trunk) and Uber's SubmitQueue, two things were missing: an explicit signal that a change is ready, and bisection of a failed batch. The owner's agents run both as separate cloud sessions (pushed branches) and as worktrees in one container (local branches).

## Decision
- **Ready is a commit.** `npm run ready` commits `.ready/<branch>.json` on the branch: the journeys it ran, those deferred, and a reason if forced. It refuses a dirty tree, and a journey of the branch's own (added or edited) that has not passed with its files as they are; `--force "<why>"` overrides and records why. The branch is ready while that commit is its tip; any later commit makes it stale until it is marked again. `/slice` ends with it, `/audit` marks again after its fixes, `/fix --deploy=branch` marks before it pushes.
- **The train finds them.** `npm run e2e:train -- --list` shows every branch not yet on main, local and on origin, taking whichever copy is ahead (diverged copies are neither) and its state; `--ready` runs the train of the ready ones. Branches named by hand still ride, and the report says they were not marked.
- **Markers never reach main.** One file per branch, so two never conflict; the train removes them in its last commit, the one it tests and ships.
- **A shared failure is isolated.** A red journey two or more branches named is rerun on main with each of them alone (one export per branch, that journey only). It goes to the branch whose run alone fails; a branch whose run passes is told it was cleared; when every run alone passes it stays with all of them as "only together": an interaction, or a flake. `--no-isolate` skips it.

## Why
A merge queue's two guarantees are that only changes someone vouched for are tested, and that a failed batch names its culprit. A marker in the branch works the same for a pushed cloud session and a local worktree, and is visible on GitHub; a stale marker is what keeps unvetted commits off main. Isolation costs browser minutes only when something is red, and only for the branches in question.

## Consequences
- Each branch carries one extra commit at its tip, and a commit after it needs a new marker.
- Isolation tests each branch on main alone, not on main with the other branches of the train: a failure that needs a third branch present reads as "only together".
- The owner can still name any branch; the marker is the default, not a gate.

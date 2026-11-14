# 0174. Bookkeeping by script

Date: 2026-11-14 · Status: accepted · Area: process

## Context
Agents did the loop's and the slices' bookkeeping by hand, and each step below went wrong at least once:
decision numbers collided seven times, a number claimed early and taken on `main` meanwhile; two reviewers
gave the same audit number; a file count for the size tripwire missed untracked files; landing a run (its
commits on `main`, its worktree and branch gone, the live build matching) was checked by hand; the paths in
review prompts were checked by hand; and `docs/DEFERRED.md` items were named for `scripts/records.js` with
match texts made unique by hand.

## Decision
The owner, in person on Nov 14: "Ensure we leverage scripts for deterministic output wherever we can." Repo
scripts plus skills, for bookkeeping only: numbers, counts, checks, extraction and verification, anything with
one right answer. Judgment stays with agents and reviewers.

`scripts/bookkeeping.js` (also `node scripts/tend.js <command>`; `npm run book:<command>`) reads `origin/main`
through git, not the working tree, unless a command says otherwise. Each prints plain, stable lines or `--json`,
and exits non-zero when its check fails:

- **`next-decision`**: the highest number in `docs/decisions/` plus one, padded as the files are.
  `--check <NNNN> [<file>]` fails when `main` gave that number to another file, or the number skips one, and
  prints the next free one. Run after the last fetch, just before publishing.
- **`next-audit "<prefix>"`**: the highest "<prefix> audit N" in `main`'s commit subjects and in the tests under
  `src/` and `scripts/e2e/journeys/`, ranges and lists read ("audit 1-3", "audits 27-31", "audit 1-14, 16"), and
  the next N.
- **`files [<range>]`**: this worktree's changes against the merge base with `origin/main`, committed, staged,
  unstaged and untracked, grouped as src (non-test), tests, journeys, docs and records, skills and scripts, and
  other; `--max-src N` fails past N non-test `src/` files, the runs' tripwire.
- **`landed <base>..<head> [--branch <name>] [--live <url>]`**: every commit of the range is an ancestor of
  `origin/main`; no worktree under `.claude/worktrees/` and no local branch is left for the branch; the live
  page's entry bundle, against a local `dist/` export for the same base path. It cannot see Pages, and says so:
  that check stays with the GitHub tools.
- **`review-paths <prompt.md>...`**: each prompt exists and so does every absolute path in it.
- **`items deferred|native|inbox|open [--tag <tag>] [--section <text>]`**: each item with its section, tag,
  first line and the shortest match `scripts/records.js` accepts for it, verified by records.js itself.

`/tend`, `/slice`, `/audit`, `ship.md`, the orchestrator and its run brief name these commands where they did
the step by hand.

## Consequences
- A decision number is claimed with `next-decision` after the last fetch and checked with `--check` before the
  push, never claimed early.
- An item whose words another item repeats exactly has no match; `items` names it and fails, since
  `records.js` cannot act on it until its text differs.
- The scripts are tested on repositories of their own (`src/lib/__tests__/arch/bookkeeping.test.ts`).

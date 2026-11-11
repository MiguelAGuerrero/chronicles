# 0133. The loop's limits are held outside the loop: CI reads loop commits, and reviewers cannot write

Date: 2026-11-11 · Status: accepted · Area: process · Extends: 0128, 0130 · Supersedes in part: 0130 ("`check:tend` runs when `/tend` runs it, not in CI")

## Context
After `/tend` shipped, the owner asked for a survey of how other teams run comparable agent loops. Two findings were
mechanical: the loop's denylist and its test-and-source rule ran only when the loop itself called them, so the agent
being constrained was the one running the check; and the three reviewer subagents were "report-only" by instruction
while holding a shell. Claude Code's guidance is that a rule that must always hold belongs in a hook or a gate, not a
sentence. The owner's answer to both: go ahead.

## Decision
- **CI holds loop commits.** On every push to `main`, `pages.yml` runs `scripts/tend.js commits --loop-only` over the
  pushed range before the build: each `tend …` commit must carry its own named, real test and a `Source:` line and
  touch nothing the loop may not. A failure stops the deploy, and `ship.md`'s red-run rule reverts it.
- **Reviewers cannot write.** `ux-reviewer` has no shell. `auditor` and `steward` keep one behind
  `.claude/hooks/readonly-bash.sh`, a PreToolUse hook in their own definitions that allows test runs and read-only
  commands and blocks everything else (substitution, writing redirects, anything not on its list).

## Consequences
- Only commits that say they are the loop's are held: a loop commit under another subject is not caught by CI, only by
  the loop's own run of `check:tend`, which fails any non-loop commit in a sweep's range.
- A push whose base is older than the fifty commits CI fetches is not checked, and says so in the run.
- The hook is an allowlist: a reviewer that needs another read-only command reports what it would have run.
- Left for later, from the same survey: recording how often the owner reverts or overrules loop commits, a trial
  period on `--deploy=branch` before direct pushes, and trial sweeps with known answers when the skill changes.

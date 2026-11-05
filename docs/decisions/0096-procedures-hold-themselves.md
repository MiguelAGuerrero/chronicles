# 0096. The procedures are held like code: force pushes are denied, and the live check claims only what it shows

Date: 2026-11-05 · Status: accepted · Area: process

## Context
The owner asked for an audit of the repo's procedures (the skills in `.claude/skills/` and the `auditor` and
`steward` agents) against Anthropic's published guidance for skills, subagents and hooks. The audit
(`specs/procedures-audit/audit.md`) found 17 failures a model following the procedures would hit: the Stop hook
never saw a `/fix` worktree, `/fix`'s auditor reviewed the primary checkout instead of the fix, nothing listed what
would reach `main` before a push, `check:test-first` could not pass for a continued slice, and others. Two needed the
owner's call.

## Decision
- **Force pushes and deleting `main` are denied** in `.claude/settings.json` (`permissions.deny`), for every session in
  this repo and in every permission mode: `git push --force`/`-f` (and `--force-with-lease`, which the pattern
  covers), a `+refspec`, and `--delete main`/`:main`. A session that truly needs one asks the owner to run it.
  `/fix`'s "do not stop to ask before pushing" stays: fast-forward pushes are what it is granted.
- **The live check claims only what it can show.** The web build is not stamped with its commit (the owner chose
  rewording over a build change): the Pages run's success is the evidence the build deployed, a change to a screen is
  looked for on the page, and a page the session can't reach is reported as not checked, never as passed.

## Consequences
- The deny rules match the command text (`*` anywhere, the space before it significant), so a push written another
  way (`git -C . push --force`) is not caught; the rules are a floor under the skills' wording, not a replacement.
- `procedures audit 1-17` (`src/lib/__tests__/arch/proceduresAudit.test.ts`) hold the procedures' text and the hook
  to these fixes; `procedures audit 12` holds the deny rules.

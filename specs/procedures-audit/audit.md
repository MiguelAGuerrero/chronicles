# Procedures audit (Nov 5)

The owner asked: "audit your skill against agentic best practice", meaning every procedure (`.claude/skills/`:
vision, slice, audit, e2e, deploy, docs-gc, fix; `.claude/agents/`: auditor, steward), measured against Anthropic's
published guidance, read fresh that day: [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices),
Claude Code's [skills](https://code.claude.com/docs/en/skills.md), [subagents](https://code.claude.com/docs/en/sub-agents.md),
[best practices](https://code.claude.com/docs/en/best-practices.md), [hooks](https://code.claude.com/docs/en/hooks-guide.md)
and [permissions](https://code.claude.com/docs/en/permissions.md).

The `auditor` subagent made a report-only pass. The `steward` did not run: it judges screens against
`docs/VISION.md`, and procedures have no surface. Every description is within the limits (the longest, `/vision`, is
685 characters of description and `when_to_use` together, under 1,024 and 1,536).

## Audit

17 findings, 17 fixed, 0 deferred, 0 rejected (2026-11-05). Each regression test,
`procedures audit N` in `src/lib/__tests__/arch/proceduresAudit.test.ts`, failed before its fix (all 17 red,
then green). Two were the owner's calls (decision 0096).

1. The Stop hook never saw a `/fix` worktree (it checked `$CLAUDE_PROJECT_DIR`, which gitignores `.claude/worktrees/`), nor a committed branch with no upstream: accept. The hook checks the checkout its input's `cwd` is in, and what changed comes from `affected.js changed` (the branch's commits since `main`, the working tree, new files). AGENTS.md says it blocks the first stop.
2. `/fix`'s auditor reviewed the primary checkout, not the fix, and named findings as a slice's: accept. The brief carries the worktree path and `cd` for every command (a subagent gets none of the conversation); the auditor knows a fix's input and naming.
3. Nothing listed what would reach `main` before a push: accept. `/fix` runs `git log --oneline origin/main..HEAD` and stops on a commit that is not the fix's; `/deploy` asks the owner when the list holds anything the request didn't cover, pushes `HEAD:main` and fetches once more before.
4. `check:test-first` could not pass for a continued slice (rides: 0 of 13): accept. Ids a real test already named on the base are reported as tested before the branch (rides: 12 of 13; the 13th has no test at all). `/deploy` says which specs ship.
5. `/fix` "followed /deploy steps 1-3" while its levels waived them, could not invoke the owner-only `/deploy`, and would `git checkout main`: accept. A table of the preconditions per `--tests` level; read `/deploy`, never invoke it; push from the fix branch.
6. docs-gc step 3 printed nothing (no "Shipped" heading in STATUS), reading as no drift: accept. `node scripts/shipped.js` reads the "Slices" table and exits 2 on no rows; it now finds 42 shipped slices, 13 PRODUCT.md doesn't name (for the next `/docs-gc` to read). `/slice` no longer says "move the row to Shipped".
7. A spec re-export could overwrite the repo-only Vision and audit sections: accept. docs-gc says what a re-export keeps.
8. The audit could start without the owner asking: accept. `/audit` is `disable-model-invocation`; the auditor's description says only on the owner's ask or from `/fix`.
9. `/e2e`'s sub-path line ran the full flow, and its debug step ran without an export: accept. Every `e2e:web` line in a skill names a journey and exports first, or is the owner's full flow.
10. `/slice`'s tests-first commit is red when a todo test imports a module not yet written: accept. A stub with its layer tag, throwing `not built`.
11. The invariants copied into `/slice` and the auditor had drifted from AGENTS.md (gap fills, `STREET_CODE`, `LANDING_CODE`, where web exceptions are listed): accept. Both point at AGENTS.md and match it.
12. Nothing deterministic stopped a force push or deleting `main`: accept, the owner's call. Deny rules in `.claude/settings.json` (decision 0096).
13. "Confirm the build is the new one" was a claim the page couldn't back: accept, the owner's call to reword rather than stamp the build. The run is the evidence; a screen change is looked for; an unreachable page is said so.
14. No checklist for the two longest workflows: accept. `/fix` and `/slice` open with one to copy and tick.
15. `/audit` had no commit step and no base for its diff: accept. Both added.
16. `/e2e`'s scenario table lacked seven journeys: accept. Rows for `ready`, `hidden`, `nudge`, `snap`, `walkability`, `headsup`, `scenic`; a test holds the table to the folder.
17. Small references that didn't resolve (`gh` "not available", `check:vision` missing from `/fix`'s gates, `--loops=0` undefined, `/slice` starting on no branch): accept. `/simplify` named by `/fix` is a built-in skill, so it stays.

## Not changed

- The guidance's evaluation advice (items 17-18: evaluations before documentation, watching real runs) is a practice,
  not a defect in a file: these procedures have no evals. Writing some is a next step for the owner to call.
- Skill names are not gerunds (item 16, a recommendation); renaming would break the owner's `/slice`, `/fix` habits.

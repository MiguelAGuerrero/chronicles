---
name: audit
description: Run the adversarial, report-only audit of a built slice (the auditor subagent tries to break it against its spec), then triage every finding accept/defer/reject, give each accepted one a regression test named "<slice> audit N" before its fix, and record the counts. Use only when the owner asks (decision 0074).
when_to_use: Only when the owner asks to audit, harden, or "try to break" a slice or feature (decision 0074); never by default.
argument-hint: <slice-name>
---

# Audit: $ARGUMENTS

One report-only pass that tries to break the slice, then a triage, then a
regression test for each accepted finding before its fix.

`/audit` is for one built slice against its spec, when the owner asks.
`/tend` (decision 0128) is the standing pass over an area: it gathers
pictures as section 1 does and briefs the same three subagents, but ships
only what conforms and files the rest, and its tests are named
`tend <scope> N`. Neither runs the other; a slice audited here still gets
swept later. The map of the skills is `.claude/skills/README.md`.

## 1. Gather the inputs

- the spec: `specs/<slug>/spec.md` (criteria and the decisions list);
- the rule file(s): `.claude/rules/<area>.md` whose `paths:` cover the slice;
- the changed files: `git diff --name-only <base>..HEAD` for the slice's
  commits, or the plan's file list (`specs/<slug>/plan.md`);
- **the screens as a person sees them** (decision 0114): run the journeys
  that show the changed screens (`docs/TESTING.md`, "Choosing the journeys") with `E2E_SHOTS=<scratchpad>/shots` (390 x 844), so
  every changed screen state is a PNG. A changed screen with no `shot()` in its
  journey gets one first (after the Modal's fade). List the pictures by screen.

## 2. Spawn the auditor

Run the `auditor` subagent (`.claude/agents/auditor.md`) with the Agent tool.
Give it the three inputs above and ask for a report-only pass that:

- tries to break the slice with concrete failure scenarios (inputs, the wrong
  output, the file and function), each with a severity;
- reviews the UI/UX against the spec and the product's restraint (counts are
  words, nothing is a score, no celebration), **by opening every picture** and
  judging it against `.claude/rules/ui-patterns.md` (controls over content,
  wrapped rows, more than one primary action, actions outside a bar, a menu or
  a sheet); a UI finding names its picture;
- flags every native code path the slice touches that has not run on a device.

It may run `npm test` and single test files; it edits nothing. Wait for its
report before going on.

Beside them, run the `ux-reviewer` subagent (`.claude/agents/ux-reviewer.md`) with
the pictures, the spec and the plan's goal-to-control lines: a review of every
changed screen against `docs/research/ui-references.md` (the cited patterns and
the goal-to-control matrix), `docs/research/ui-teardown.md` and
`.claude/rules/ui-patterns.md`. Each finding cites its source or is marked
opinion; an opinion is triaged as one. Its findings are numbered on after the
steward's.

Before either of them is told where anything is, run the **cold find** (decision 0167): the `ux-reviewer`
with the pictures and one sentence per task in the owner's words, and no spec, no plan and no names of
controls. Where would it tap, or can it not tell? A task it cannot place is a `high` finding. Write the
briefs for the passes above so that they do not answer this for the reviewer: describing "a small tag at
the end of the dateline" is how a control nobody could find passed three reviews (note types, Nov 13).

Ask the auditor, for a feature on a shared component, to list **every host** of that component from the
code and say for each whether the feature reaches it, by intent or by accident: a host the spec did not
name is a finding either way.

Beside it, run the `steward` subagent (`.claude/agents/steward.md`) with the spec,
its "## Vision" section, the changed screens and their pictures: does the built thing still pass
the gate it was given (decision 0094)? Its findings are triaged with the
auditor's, numbered on after them.

## 3. Triage

For each finding, write one line in the spec's "Audit" record:
`N. <title>: accept | defer | reject, <reason>`. N is the audit number, and you, the triager, give it
alone: on from `npm run book:next-audit -- <slice>` in the worktree (every number in `main`, the
branch and the working tree, files and commit messages), one per finding in the order triaged. The
reviewers' own numbering is theirs and never becomes an audit number.

- **Accept**: a real failure the slice should handle now.
- **Defer**: real, but out of this slice; add it to `docs/DEFERRED.md` with
  the finding's scenario (`npm run records -- deferred item add "<section>" --file <item>`).
- **Reject**: not a failure (by a rule, an owner's call, or the spec); say which.
- **Architectural** findings (data model, library, platform strategy,
  navigation flow) go to the owner with AskUserQuestion and a recommended
  option before any code.

## 4. Regression test, then fix

For each accepted finding, in order:

1. Write the regression test, named `<slice> audit N`, N from step 3 (`test('rides audit 3:
   ...')` in the slice's folder under `src/lib/__tests__/`, or a `step('tabs audit 5 ...')`
   check in its journey under `scripts/e2e/journeys/`). Run it; it fails.
2. Fix it. Run it; it passes.

Findings covered only by the e2e's flow and typecheck are said so in the record.

## 5. Record

- The spec's record: "N findings, M fixed, D deferred, R rejected", with the
  date and the test names.
- `docs/STATUS.md`: the counts on the slice's row (`npm run records -- slice row set <match> --file <row>`).
- `docs/DEFERRED.md`: the deferred findings (`deferred item add`).
- `docs/NATIVE_UNVERIFIED.md`: the auditor's native list, merged in (`native item add`, one per check).
- These three change only through `npm run records` (decision 0156, `.claude/skills/ship.md`, "The
  record documents"): run `npm run check:records -- origin/main` and commit with the trailers
  `npm run records -- trailers` prints. Every agent commit is gated, the audit's record too. What the
  audit leaves for the owner's call is a bullet of a "From <skill>" section (`section add "From the
  <slice>'s audit (<date>)"`, then `section item add`).
- A new rule or trap learned from a finding: `.claude/rules/<area>.md`.

## 6. Verify, then deploy

```bash
npm run typecheck && npm run lint && npm test
npm run check:affected -- --since <slice's last green commit>   # names the e2e journeys for the files the audit changed
npm run export:web && E2E_ONLY=<journey> npm run e2e:web         # those chosen as in docs/TESTING.md, "Choosing the journeys"
```

Only the journeys the audit's fixes touch: `--since` is the commit the slice last ran
green, so the slice's whole set is not run again. Each regression test's journey runs
once after its fix; a journey already green on these inputs prints "already green" and
is not run again (`E2E_FORCE=1` overrides). A failure the fixes did not touch gets one
`npm run e2e:baseline -- <journey>` on `main`, not repeated reruns on the branch: a
recorded flake is labelled and still fails the run (`docs/TESTING.md`, "The e2e's
economy"). The record says which journeys ran and how many times.

The full e2e (no `E2E_ONLY`) only when the owner asks. When all pass, the
owner decides on `/deploy`.

## Report

The counts, each accepted finding's test name, the deferred list, and the
native paths still unverified on a device.

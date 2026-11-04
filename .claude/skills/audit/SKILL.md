---
name: audit
description: Run the adversarial, report-only audit of a built slice (the auditor subagent tries to break it against its spec), then triage every finding accept/defer/reject, give each accepted one a regression test named "<slice> audit N" before its fix, and record the counts. Use only when the owner asks (decision 0074).
when_to_use: Only when the owner asks to audit, harden, or "try to break" a slice or feature (decision 0074); never by default.
argument-hint: <slice-name>
---

# Audit: $ARGUMENTS

One report-only pass that tries to break the slice, then a triage, then a
regression test for each accepted finding before its fix.

## 1. Gather the inputs

- the spec: `specs/<slug>/spec.md` (criteria and the decisions list);
- the rule file(s): `.claude/rules/<area>.md` whose `paths:` cover the slice;
- the changed files: `git diff --name-only <base>..HEAD` for the slice's
  commits, or the plan's file list (`specs/<slug>/plan.md`).

## 2. Spawn the auditor

Run the `auditor` subagent (`.claude/agents/auditor.md`) with the Agent tool.
Give it the three inputs above and ask for a report-only pass that:

- tries to break the slice with concrete failure scenarios (inputs, the wrong
  output, the file and function), each with a severity;
- reviews the UI/UX against the spec and the product's restraint (counts are
  words, nothing is a score, no celebration);
- flags every native code path the slice touches that has not run on a device.

It may run `npm test` and single test files; it edits nothing. Wait for its
report before going on.

## 3. Triage

For each finding, write one line in the spec's "Audit" record:
`N. <title>: accept | defer | reject, <reason>`.

- **Accept**: a real failure the slice should handle now.
- **Defer**: real, but out of this slice; add it to `docs/DEFERRED.md` with
  the finding's scenario.
- **Reject**: not a failure (by a rule, an owner's call, or the spec); say which.
- **Architectural** findings (data model, library, platform strategy,
  navigation flow) go to the owner with AskUserQuestion and a recommended
  option before any code.

## 4. Regression test, then fix

For each accepted finding, in order:

1. Write the regression test, named `<slice> audit N` (`test('rides audit 3:
   ...')` in `src/lib/__tests__/`, or a `step('tabs audit 5 ...')` check in
   `scripts/e2e-web.js`). Run it; it fails.
2. Fix it. Run it; it passes.

Findings covered only by the e2e's flow and typecheck are said so in the record.

## 5. Record

- The spec's record: "N findings, M fixed, D deferred, R rejected", with the
  date and the test names.
- `docs/STATUS.md`: the counts on the slice's row.
- `docs/DEFERRED.md`: the deferred findings.
- `docs/NATIVE_UNVERIFIED.md`: the auditor's native list, merged in.
- A new rule or trap learned from a finding: `.claude/rules/<area>.md`.

## 6. Verify, then deploy

```bash
npm run typecheck && npm run lint && npm test
npm run check:affected                                  # names the e2e journeys for the fixed files
npm run export:web && E2E_ONLY=<journey> npm run e2e:web   # each journey it names
```

The full e2e (no `E2E_ONLY`) only when the owner asks. When all pass, the
owner decides on `/deploy`.

## Report

The counts, each accepted finding's test name, the deferred list, and the
native paths still unverified on a device.

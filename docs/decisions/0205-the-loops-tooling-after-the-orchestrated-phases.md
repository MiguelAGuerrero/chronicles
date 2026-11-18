# 0205. The loop's tooling after the orchestrated phases: the skills and scripts take the insights

Date: 2026-11-18 · Status: accepted · Area: process · Amends: 0135 (a run may reword a rule line it added itself), 0156 (the cap skips a change settled by a decision the range adds; a `[loop]` tag may move to `[phone]`) · From: the orchestrated `/tend` sessions' insights, phases 1-6 (Nov 11-18)

## Context
On Nov 18 the owner opened `/tend-orchestrator` and asked it to "check the current insights module and amend the
current skills before you start orchestration", then chose the scope "all, scripts too" and that the orchestrator
commit the change to `main`. The insights file kept by the orchestrator over Nov 11-18 had proposals that neither
`/tend`, `ship.md`, the orchestrator's skill nor the scripts had taken: friction met by runs again and again.

## Decision
The owner's three answers, Nov 18: amend from the insights; every proposal, the scripts included; the orchestrator
lands it. What changed:

- **`check:tend`.** A loop commit's `Source:` fails only on a rule file that it or an earlier commit of the push
  touched, so a trap line added in the run's last commit no longer fails its earlier commits. A later commit of an
  unpushed run may reword or drop a rule line the push itself added; a line `main` holds stays add-only (0135).
- **The records gate (0156).** A removal or rewrite whose `--reason` names an accepted decision record the range
  itself adds does not count toward the two-per-section cap (a run that records a batch of the owner's answers in
  one decision removes the entries it settles); a decision already on `main` stays capped. A `[loop]` tag may move to
  `[phone]`; nothing moves from `[owner]` or `[arch]` to `[loop]`. `npm run records -- help` prints the usage.
- **Not changed: the add-quote rule** across commits (records audit 20). Dropping it for later commits would let a
  reworded `[owner]` item return as `[loop]` with nothing showing the move. Left to the owner: allow it only when the
  earlier removal's own reason names the move.
- **The run log and the balance.** `tend:log` counts every finding a grouped subject names; `tend:balance` reads the
  ledger and the inbox as `origin/main` holds them. A bold audit id in a spec's prose ("**F3 is …") is not a criterion.
- **`/tend`.** A slice-sized addition while the balance reads outgrowing is a held `[owner]` `T` entry, built as a
  slice on a yes (as T11 was filed). One record commit, or two around the review; every mode replaces "Last tend".
- **`ship.md`.** A conflict confined to imports and comments may be ruled through with a test proving the two sides
  independent; any other conflict pushes the branch and keeps it for the owner. A remote deletion the proxy refuses is
  reported, never retried. The remake of a failed record commit unstages its old sidecar. A red check is confirmed
  red at rest, k of n on both ends, before a cause is named or a bisect run.
- **`/tend-orchestrator` and its briefs.** Everything read from `<main-tools>`, never a stale primary checkout; other
  live sessions asked before a run touches their area; reds on `main` confirmed before new work; the owner's answers
  kept in one file for the next run's decision; a non-loop run (with its own brief) for a yes the loop cannot build;
  rulings for the run's own regressions (fixed at any severity), reviewer disagreement and dissent, a mechanical
  conflict, saying less inside an answer and keeping to the owner's scope; number ranges for two runs in one area;
  restart recovery; a brief that ends its turn at review and stops in one line on a limit; findings titled by
  reviewer, numbered by the run.

## Consequences
- CI runs `scripts/tend.js` and `scripts/records.js` as each push's base holds them: the new rules apply to pushes
  after this one lands.
- The cap's exemption needs a decision written in the same push: visible, reviewable, and the owner's to revert.
- The orchestrator's answers stay within 0157; nothing here widens the proxy.

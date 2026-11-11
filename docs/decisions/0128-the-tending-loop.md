# 0128. The tending loop: `/tend` finds the gaps, ships what conforms, and files every addition for the owner

Date: 2026-11-11 · Status: accepted · Area: process, product · Relates to: 0013, 0074, 0081, 0094

## Context
The owner is iterating fast and does not want to be the one who thinks of every corner case, missing state and
inconsistency ("oh wait, I never considered this"). They asked for an agent that infers those from the principles
the repo already cites and handles revision, cleanup, polish, performance and UI conformance by itself, while they
stay in the loop for additions, favouring velocity over process. `docs/STATUS.md`'s "Needs the owner" is to be their
inbox, drained as it fills, and every item in `docs/DEFERRED.md` is to be marked as the loop's or theirs.

## Decision
The owner's calls, Nov 11:
- **Conform, don't add.** The loop ships, without asking, whatever makes an existing element behave or look right
  against a cited source, plus bugs, performance, cleanup, tests and docs drift. A new control, screen, setting,
  stored field, host, or copy that says something new waits for the owner. A finding with no source is opinion and
  waits too.
- **Straight to `main`, one commit per finding**, each with its test and its source in the message, so the owner
  reviews after the fact and reverts one finding at a time. The terms are `/fix`'s (0081): no force push, no
  loosened test, a red deploy reverted.
- **A command the owner runs** (`/tend`, owner-invoked only); no schedule yet.
- **Phone-only findings are filed, never shipped:** the loop verifies in a browser, and native code has never run
  on a device.
- **The inbox is "Needs the owner"**, one numbered entry per finding with a recommended shape already through
  `/vision`, so the owner's answer can be a yes or a no. A no is remembered (`.claude/skills/tend/ledger.json`).
- **`docs/DEFERRED.md` is tagged** `[loop]`, `[owner]`, `[arch]`, `[phone]` or `[kept]` by `/tend triage`.

## Why
The vision gate already separates what an agent may judge from what is the owner's (0094): the identity and every
addition are theirs. Polish is different: a missing Undo or a control with no spoken name is wrong against a
published rule, not a matter of taste, so asking first only costs time. Requiring a source for each shipped
change is what keeps "polish" from becoming unreviewed product decisions.

## Consequences
- `/vision` still gates every addition, now before it reaches the inbox instead of before a spec; an **out** is
  never filed.
- The loop can only find what the web build shows. Its report says so each run.
- A wrong loop commit reaches the live site before the owner sees it; one commit per finding keeps the revert small.
- The loop never edits `docs/VISION.md`, a vision exception or a baseline. The page's own drift (STATUS, the Nov 10
  review) stays the owner's to clear, and the loop reasons from the page as it stands.
- 0074's "the audit runs only when the owner asks" holds: typing `/tend` is the ask, for its scope.

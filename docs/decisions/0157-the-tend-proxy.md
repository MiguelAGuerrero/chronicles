# 0157. The tend orchestrator may answer the inbox as the owner's proxy, within limits

Date: 2026-11-12 · Status: accepted · Area: process · Amends: 0128, 0129, 0130 (who answers the inbox) · From: the orchestrated `/tend` session of Nov 11-12

## Context
Decisions 0128-0130 keep every addition and every evolution (`G`) for the owner: the loop files, the owner answers.
On Nov 11 the owner asked an orchestrator to run `/tend` again and again through subagents and to answer what it could
"without my input unless it's a true product decision where architecture or a product change is required that might
conflict with the current feature set. Additions and enhancements do not have to go through me unless those additions
have implications on the overall architecture of the app." The session answered T7, G4, T9 and T12 that way, but no
record said the owner had delegated anything, and two decision records written by its runs credited the owner with
the proxy's yes (0158). The orchestrator is the skill `/tend-orchestrator`.

## Decision
When the owner types `/tend-orchestrator` and agrees its authority at the start, the orchestrator is the owner's proxy
for the inbox (`docs/STATUS.md`, "Needs the owner"), on these terms:

- **It may say yes** to an `[owner]` `T` entry, and to a `G` entry with no architectural impact (no dependency,
  migration or data-model change, navigation-flow change, host, or derivation-rule bump beyond what the entry names).
- **Before any yes it runs `/vision` again** on the entry as `main` holds it, against today's `docs/VISION.md`. It says
  yes only to **aligned** or **no surface** with nothing open and touching no Never line; anything else goes to the
  owner. A ruling during the build that changes what a person sees from the entry's shape is gated the same way.
- **It never says no, never reshapes, never holds for good**: those go to the owner as recommendations. Nothing it
  decides is written to the ledger's `declined`, made a rule, or makes an area `resting`.
- **Always the owner's**, whatever the entry's tag: `[arch]` and `[phone]` entries; any edit to `docs/VISION.md`; any
  entry that amends or reverses an owner's decision, a shipped spec criterion, or a rule line that records an owner's
  call; the replay's beats, order or copy; sharing or data leaving the device; notifications; a number, count or
  measure on a screen; a steward's Silent question or a finding that quotes a Never or Always line against a decision.
  When unsure, it goes to the owner.
- **It is recorded as the proxy's.** A record, entry removal or run-log line for a proxy answer says "the proxy's yes
  under the owner's delegation (0157), <date>", never "the owner's". `/vision` does not cite a proxy answer as the
  owner's precedent until the owner confirms it; the orchestrator lists every proxy answer in its closing report for
  the owner to keep or revert.
- **A screen the proxy approved** gets the `steward` with its pictures, beside the `auditor` and the `ux-reviewer`.

## Consequences
- The owner sees fewer entries, and every one that touches identity, architecture or their own earlier calls.
- `/tend` is still the owner's to type; the orchestrator runs it through subagents under the grant the owner gave at
  the start, and passes on no more.
- A proxy answer is reversible: the owner reverts it like any commit, and the record says whose it was.

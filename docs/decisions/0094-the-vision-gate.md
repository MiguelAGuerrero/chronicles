# 0094. The vision gate: features answer to docs/VISION.md; the gate advises, the owner decides, the check blocks

Date: 2026-11-05 · Status: accepted · Area: product, process

## Context
The owner wants future development to keep the product's spirit without losing its identity: an agent should
catch an idea such as ratings or reviews and push back, and should agree to suggested routes only in the shape that
fits (scenic, through places worth the stop), not as several ways to the same point. In the same session the owner
set the identity: Chronicles serves a narrow audience who value novelty and exploration, unifies features other
apps offer apart under one philosophy (every moment captured is worth remembering), and puts Chronicle first, with
moments as its spine and the map secondary. Their go-ahead ("Build this now") followed the recommendation that the
gate advise while a mechanical check blocks.

## Decision
- `docs/VISION.md` is the identity: the three verbs (earn, honour, return), Never and Always, Shapes with verdicts,
  the Chronicle, open questions, precedents. Only the owner changes its rules, each change with a decision record;
  lines not yet the owner's calls are marked [proposed].
- `/vision` gates an idea before its spec: a verdict of aligned, aligned if reshaped, not now, out or no surface,
  the shape that fits, and the criteria the spec carries. It argues once; an owner who reaffirms decides, and the
  call becomes a decision record listed in the page's Precedents.
- The `steward` subagent attacks a spec against the page in `/slice` (before the owner's plan review) and in
  `/audit` (beside the auditor). `/fix` stops on a visible change the gate rules out.
- `npm run check:vision` blocks in CI and the Stop hook: score vocabulary, tallies and percentages in copy, hosts
  off the allowlist, data-sending dependencies, a new spec without a verdict. Exceptions carry reasons
  (`vision-ok:`, `scripts/vision.allow.json`); known breaches are listed as debt and the list only shrinks.

## Consequences
- Every spec from now on has a "## Vision" section; the 36 before it are listed in `scripts/check-vision.js`.
- The found tally on a place's sheet ("12 of 87 · list from Nov 1") is carried as debt until the owner's call.
- A new outbound host or dependency that sends data is an owner's call (0005), now enforced.
- Tone, colour and celebration are not checked by script; the steward and `/vision review` cover them.

# 0143. A UI review on every screen change, audit or not

Date: 2026-11-11 · Status: accepted · Area: process, ui · Amends: 0074

## Context
The media gallery (`specs/media-gallery`) shipped with a day header whose title was cut whenever its place line
wrapped; the owner saw it on an iPhone the same day (fix gallery-header). Its journey took screenshots of every state,
but no one reviewed them with long text: the `ux-reviewer` ran only inside `/audit`, which runs only when the owner
asks (0074), and `/fix`'s adversarial review ran only the `auditor` on the diff. The owner expected a basic UI pass to
catch something as simple as that, on fixes and slices alike (Nov 11).

## Decision
The owner's call, Nov 11:
- **Every change that touches a screen gets a UI review**, whatever its test level: `/fix`, `/tend` and proposal slices
  through `.claude/skills/ship.md`, "Review"; a slice the owner runs through `/slice` step 9. The covering journeys
  run with `E2E_SHOTS` (390 x 844), and the `ux-reviewer` reads the pictures beside the auditor; findings are triaged
  like the auditor's.
- **The pictures carry the longest text the screen can meet**: a journey whose fixtures are all short gets a long
  case before its pictures count (a wrapping title, place line or label).
- `/audit` itself (the auditor, the steward and the ux-reviewer together, the full triage) still runs only when the
  owner asks; 0074's other rules stand.

## Consequences
- A screen change costs a few minutes more: an export, its journeys with pictures, one subagent.
- `/fix --review=none|self` still skips the review, the UI part included.
- The gallery journey's "no header text is cut" check (fix gallery-header) is the pattern for text in a fixed box.

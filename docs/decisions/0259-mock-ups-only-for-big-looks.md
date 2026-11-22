# 0259. Mock-ups only for big looks: new screens, flows and components; small elements are the builder's

Date: 2026-11-22 · Status: accepted · Area: process, ui · Amends: 0252 (when a mock-up is needed; "when in doubt")

## Context
Decision 0252 (Nov 21) made every change to what a screen shows wait for a mock-up the owner approved, down to one
reworded line. A day later, after approving the Explore-in-Navigate canvas (0258), the owner, Nov 22: "In the interest
of faster iteration … only provide mock ups for very big features and small additions of UI elements that [don't]
tell a sophisticated user journey or flow which involves dialogue, a transition, entirely new components being drafted
… the addition of like little snack bars, or chevrons, or small elements like that don't have to be."

## Decision
The owner's answers, Nov 22, to four questions:

- **Where the line falls:** "Flows and new parts only (Recommended)". A mock-up is needed for a new screen, sheet or
  dialog; a new flow or a transition between states; an entirely new component; moving or regrouping controls across a
  screen. Not for a small element added to or removed from an existing screen (a snackbar, a chevron, an icon, a pill,
  a label), or a restyle of colour or spacing.
- **How a small change's look reaches the owner:** "Nothing extra". It is built and shipped; the owner sees it in the
  app.
- **Words:** "Words are small: quote old and new (Recommended)". No mock-up for reworded copy; the commit or report
  quotes the old and the new words. The replay's words and lines VISION.md governs still go through the `steward`.
- **When in doubt:** "In doubt, build and show". This reverses 0252's "When in doubt, it is needed": a borderline
  change is built as a small one, and its pictures (390 and 320 px) go in the report so the owner can push back.

## Consequences
- `.claude/skills/mockup.md`, "When one is needed", carries the line; `fix`, `tend`, `audit`, `investigate`, `slice`,
  the tend orchestrator, the skills' README and `.claude/rules/ui-patterns.md` name it instead of 0252's list.
- A spec with a surface whose look needs no drawing says so in `## Mock-up` with `Not needed: <why>`;
  `scripts/mockup.js` (in `check:docs`) accepts it, and refuses an empty or placeholder reason
  (`mockup 0259` in `src/lib/__tests__/arch/mockup.test.ts`).
- The proxy (the tend orchestrator) still never approves a mock-up; it may now say yes to an entry whose only look
  change is small, under its other rules.
- Kept from 0252: what a mock-up is and where its approval is recorded; only the owner approves one; the VISION rules
  hold for any element, however small (never a count, a celebration, a capture moved behind a tap).
- A `/tend` finding that adds a small element is no longer `[owner]` for its look alone; its other rows (an addition,
  a vision touch) still classify it.

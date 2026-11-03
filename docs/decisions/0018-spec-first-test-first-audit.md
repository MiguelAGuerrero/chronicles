# 0018. Build each vertical slice spec-first and test-first, then audit it adversarially

Date: 2026-10 (v0.5) · Status: accepted · Area: process

## Context
The owner's rule, from v0.5 on. In v0 (recording, capture and media, streets/fog/snapping, replay, storage and log), tests were mostly written alongside the code rather than strictly first.

## Decision
1. Write the slice's spec as numbered, testable acceptance criteria (in the concept doc's version tab).
2. Turn each criterion into a failing test before writing the code: a unit test in `npm test` for pure logic, or an e2e check in `scripts/e2e-web.js` for screens.
3. The slice is done when those pass, along with typecheck, lint and the whole existing suite.

Audit every slice adversarially once it's built: one report-only pass that tries to break it, with concrete failure scenarios and severity, plus a UI/UX review. Triage each finding (accept, defer or reject, with a reason; architectural ones to the owner). Give every accepted finding a regression test before its fix. Flag native code that hasn't run on a device in every report. Deploy to main only after the fixes pass the full suite.

## Consequences
- Regression tests named by audit: `rides audit N` (`rides.test.ts`), `motion audit N` (`still.test.ts`, `steps.test.ts`), `deletion.test.ts`.
- Deferred findings live in `docs/DEFERRED.md`; native flags in `docs/NATIVE_UNVERIFIED.md`.

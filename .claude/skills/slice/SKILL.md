---
name: slice
description: Build a vertical slice the owner's way, spec-first and test-first - numbered acceptance criteria in specs/<slug>/spec.md, a plan the owner reviews before code, one failing test per criterion, the code, the docs, the full suite. Use for any new feature or a continued slice ("build X", "next slice", "start on the spec's Y tab").
when_to_use: Starting or resuming a feature slice; the owner names a tab of the concept doc or a feature to build; any change bigger than a local fix.
argument-hint: <slice-name>
---

# Slice: $ARGUMENTS

Spec first, tests first, then code. The slice is done when every criterion's
test passes with typecheck, lint, `npm test` and the e2e, and the docs say so.

## Standing rules

- **Ask before architectural decisions**: libraries, data model, platform
  strategy, navigation flow. Use AskUserQuestion with a recommended option.
  Local fixes don't need asking.
- **Native has never run on a device.** Say so in any report that touches
  native code, and add each untried native path to `docs/NATIVE_UNVERIFIED.md`,
  the device acceptance suite, as a test for the first phone run: one line,
  `- [ ] **Do:** … **Expect:** … (IDS)` (DV2, DV3). A criterion only a phone
  can check goes in `UNTESTED` in `scripts/features.js` as `device: <why>`,
  and gets an item naming its id; `check:docs` fails otherwise.
- Local-only, no simulation, native first: see `.claude/rules/` and
  `docs/ARCHITECTURE.md` before touching recording, streets, the replay or storage.

## 1. Read

1. `docs/STATUS.md` (what is shipped, in flight, next) and `docs/PRODUCT.md`.
2. `specs/<slug>/spec.md`, where `<slug>` is the kebab-case slice name.
3. The spec's source is the owner's concept doc,
   https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7 (read it with the
   Claude Docs tools, never WebFetch). If the slice's tab changed since the
   spec's "Last exported" date, re-export the tab into the spec; the doc wins.
4. The `.claude/rules/<area>.md` files whose `paths:` cover the files you expect
   to touch.

## 1b. Gate (decision 0094)

Run `/vision` on the slice, in the owner's words. Its block becomes the spec's
"## Vision" section (`npm run check:vision` fails a new spec without one).

- **out**: stop; show the owner the verdict and the shape that fits, and ask with
  AskUserQuestion (the shape first, recommended). Their reaffirmation is their call:
  record it in `docs/decisions/` and go on.
- **aligned if reshaped**: the reshaped version is the slice; its criteria join
  the spec's own.
- **not now**: stop and ask; a decision already says why.
- **no surface**: the section is the one line; skip the steward in step 3.

## 2. Spec

1. Write or confirm numbered, testable acceptance criteria in
   `specs/<slug>/spec.md`, each with an id (`XX1`, `XX2`, ... with the tab's
   prefix). A criterion names an observable outcome, never an implementation.
2. Put owner's calls already made in the spec's "Decisions" list, with the date.
3. Number the gate's criteria with the slice's prefix, beside the others: they
   get tests like any criterion.
4. List the spec in `IN_PROGRESS` in `scripts/features.js` (`{ branch, since }`):
   every live criterion must have a test or a recorded reason, or the docs
   check fails (TG20), and the entry exempts the slice's criteria while it is
   built, for 7 days at most.

## 3. Plan (the owner reviews it before any code)

Write `specs/<slug>/plan.md`:

- files to touch (routes in `src/app/`, modules in `src/lib/`, components);
- data: new truth or cache, SQLite migration number and IndexedDB version;
- tests per criterion: the test file in its feature folder
  (`src/lib/__tests__/<feature>/`) and the name for each id; a new feature (a
  folder and a row in `scripts/features.js`) or a new journey, if the slice needs one;
- what is deferred, and why;
- native paths that will not run on a device.

Then run the `steward` subagent (`.claude/agents/steward.md`) on the spec and
plan, unless the gate said no surface. Triage each finding in the plan (accept
into a criterion, or reject with the reason), so the owner reviews both at once.

Stop and show the owner the plan. Continue only on their go-ahead.

## 4. Track

Add a row to `docs/STATUS.md` "In flight": slice, spec path, started, state.

## 5. Tests first

For each criterion, write one failing test before its code, as a **todo**, and
commit them before any code:

- pure logic: a unit test in `src/lib/__tests__/<feature>/<module>.test.ts` (the
  feature's folder; a new feature is a folder and a row in `scripts/features.js`), run by
  `npm test` (`tsx --test`). Nothing a test imports may import React Native:
  split pure modules from ones that touch the db or the map.
- orchestration (write order, failures, guards, reload): a shell test with
  `fakePorts()` (`.claude/rules/functional-core.md`).
- screens: only for what a screen shows, a check in the slice's own e2e
  journey (a file under `scripts/e2e/journeys/` exporting its name, the files it
  covers and its run; `E2E_ONLY=<name>` runs it; see `/e2e`). A slice that changes no screen has
  no e2e step.
- Name every test by its criterion id, and mark it todo:
  `test('QL3: ...', { todo: 'test first' }, () => { ... })`, or in a journey
  `check.todo(ok, 'QL3: ...')`. A todo runs and shows `not ok ... # TODO`,
  but never fails the run, so the Stop hook lets the turn end.

Run the new tests (`npm run test:affected` picks them up) and confirm each
fails for the right reason. Commit them alone, the code untouched:
`<Slice>: tests first (QL1-QL8, failing)`. That commit is the record
`npm run check:test-first` reads (TG24). A test from a branch made before the feature
folders goes in with `npm run move-test <file> <feature>`, which keeps its
paths right.

## 6. Implement

1. Make each test pass, criterion by criterion, and make it real in the same
   commit as its code: drop `{ todo: ... }`, turn `check.todo(` into `check(`.
   A todo id counts as untested (TG23). Between criteria, run
   `npm run check:affected`: the layer check, the tests that import what
   changed, the typecheck and lint of the changed files, and the e2e
   scenarios that cover them. The whole suite is for step 9.
2. Keep truth vs cache: never patch derived data, recompute from the trace.
3. Pass the walk's pauses (and stills) everywhere a trace is read, drawn or
   measured; `tr.walked` for walked-only consumers, `smoothKept(tr)` for the
   ridden too.
4. Web-only code only where no Expo module covers the feature on web; list
   each exception, with its reason, in `docs/ARCHITECTURE.md` ("Web
   exceptions to native first"). Check `node_modules/<module>/build/*.web.*`
   first.
5. Changing a snapping, placing or reading rule: bump `SNAP_RULES`
   (`src/lib/tiles.ts`); a street-derivation change bumps `STREET_CODE`.
6. New schema: append to `MIGRATIONS` (SQLite, never edit an old one) and bump
   IndexedDB `VERSION` with an `oldVersion < N` step.

## 7. Docs as you go

- A new rule or trap: the matching `.claude/rules/<area>.md`.
- An owner's call made during the slice: `docs/decisions/` (date, the call, why).
- What was left out: `docs/DEFERRED.md`; untried native code: an item in
  `docs/NATIVE_UNVERIFIED.md` (`**Do:** … **Expect:** …`).
- A feature shipped or changed: `docs/PRODUCT.md`.
- The spec's record section: what passed, what was deferred.

## 8. Audit, when the owner asks

`/audit <slug>` runs only when the owner asks (decision 0074). Then fix the
accepted findings, each behind a regression test named `<slug> audit N`.

## 9. Before done

```bash
npm run typecheck && npm run lint && npm test
npm run check:affected                                  # names the e2e journeys for the slice's files
npm run test:feature <feature>                          # the slice's feature, whole
npm run check:test-first <slug>                         # each criterion's todo came before its real test
npm run export:web && E2E_ONLY=<journey> npm run e2e:web   # each journey it names, the slice's own included
```

All green. A "Covered by nothing" line from `check:affected` for a file the
slice wrote is a gap: give it a test (a shell over `fakePorts()`, a core unit
test, a check in the feature's journey) or record it in `docs/DEFERRED.md`.
No e2e when no journey covers the slice's files and it changes no
screen; the full flow (no `E2E_ONLY`) only when the owner asks. Then:

1. Take the spec out of `IN_PROGRESS` in `scripts/features.js`; `npm run
   check:docs` then holds every criterion to a test (TG20).
2. Update `docs/STATUS.md`: move the row to "Shipped" (or leave it in flight
   with its state), with the audit's counts if there was one.
3. Run `/docs-gc`.
4. Commit, criterion ids in the message as the repo does:
   `Navigate: a Locate button (QL9-QL12)`. Do not push to `main`; that is
   `/deploy`.

## Report

State what shipped by criterion id, what is deferred, the audit's counts, and
that native code has not run on a device.

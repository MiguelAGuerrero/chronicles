---
name: slice
description: Build a vertical slice the owner's way, spec-first and test-first - numbered acceptance criteria in specs/<slug>/spec.md, a plan the owner reviews before code, one failing test per criterion, the code, the audit, the docs, the full suite. Use for any new feature or a continued slice ("build X", "next slice", "start on the spec's Y tab").
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
  native code, and list each untried native path in `docs/NATIVE_UNVERIFIED.md`.
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

## 2. Spec

1. Write or confirm numbered, testable acceptance criteria in
   `specs/<slug>/spec.md`, each with an id (`XX1`, `XX2`, ... with the tab's
   prefix). A criterion names an observable outcome, never an implementation.
2. Put owner's calls already made in the spec's "Decisions" list, with the date.

## 3. Plan (the owner reviews it before any code)

Write `specs/<slug>/plan.md`:

- files to touch (routes in `src/app/`, modules in `src/lib/`, components);
- data: new truth or cache, SQLite migration number and IndexedDB version;
- tests per criterion: the test file and name for each id;
- what is deferred, and why;
- native paths that will not run on a device.

Stop and show the owner the plan. Continue only on their go-ahead.

## 4. Track

Add a row to `docs/STATUS.md` "In flight": slice, spec path, started, state.

## 5. Tests first

For each criterion, write one failing test before its code:

- pure logic: a unit test in `src/lib/__tests__/<area>.test.ts`, run by
  `npm test` (`tsx --test`). Nothing a test imports may import React Native:
  split pure modules from ones that touch the db or the map.
- screens: a step and its checks in `scripts/e2e-web.js` (see `/e2e` for the
  `step()`/`check()` pattern and the traps).
- Name every test by its criterion id: `test('QL3: ...')`, `check(ok, 'QL3: ...')`.

Run the suite and confirm each new test fails for the right reason.

## 6. Implement

1. Make each test pass, criterion by criterion.
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
- What was left out: `docs/DEFERRED.md`; untried native code:
  `docs/NATIVE_UNVERIFIED.md`.
- A feature shipped or changed: `docs/PRODUCT.md`.
- The spec's record section: what passed, what was deferred.

## 8. Audit

Once the slice is built and its tests pass, run `/audit <slug>`. Fix the
accepted findings, each behind a regression test named `<slug> audit N`.

## 9. Before done

```bash
npm run typecheck && npm run lint && npm test
npm run export:web && npm run e2e:web
```

All four green, plus the e2e scenario the slice added (`E2E_ONLY=<scenario>`
if it has one). Then:

1. Update `docs/STATUS.md`: move the row to "Shipped" (or leave it in flight
   with its state), with the audit's counts.
2. Run `/docs-gc`.
3. Commit, criterion ids in the message as the repo does:
   `Navigate: a Locate button (QL9-QL12)`. Do not push to `main`; that is
   `/deploy`, after the audit fixes pass.

## Report

State what shipped by criterion id, what is deferred, the audit's counts, and
that native code has not run on a device.

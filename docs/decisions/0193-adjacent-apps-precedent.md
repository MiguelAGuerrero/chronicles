# 0193. Suggestions grounded in how adjacent apps do the job

Date: 2026-11-17 · Status: accepted · Area: process, vision, ui

## Context
The skills that propose, reshape or extend a feature (`/vision`, `/slice`, `/tend`'s evolve mode and its inbox
entries, the tend orchestrator's questions) recommended a shape from the vision, the rules and the patterns
references, but rarely from how the apps our walkers already use do the same job. Only the `ux-reviewer` asked for
it, and `docs/research/ui-teardown.md` (decision 0114) covered six moment jobs, not walking, maps or check-ins. A
recommendation with no model beside it gave the owner nothing to evaluate the UI and the experience against.

## Decision
The owner, in person on Nov 17: "Ensure, moving forward, that our skills, when looking at the extending workflow,
ground suggestions in how current apps adjacent to this product implement a feature, so we have a model to evaluate
our UI and user experience."

- **One list, one record.** `docs/research/adjacent-apps.md` names the adjacent apps (walking and outdoor, maps and
  navigation, journaling and memories, photo and media, location check-ins, replies), each with why it is adjacent,
  and records their implementations by job: the app, what it does (controls, words, flow), a source (a URL, a dated
  observation, or "from memory, unverified") and whether it is verified. It was added beside the teardown, which
  stays the closed record of its pass and the evidence for the moment jobs.
- **Every suggestion carries its precedent.** `/vision`'s gate gains a `Precedent:` line (2-3 apps, or "none
  found"); a spec gains "How adjacent apps do it", and `/slice`'s plan compares our shape to it; `/tend`'s `T` and
  `G` entries and its evolve mode give the precedent beside "Recommended"; `/audit`, the `steward` and the
  `ux-reviewer` judge against what is recorded; the tend orchestrator's recommended option to the owner cites one.
- **Precedent informs how, never what.** The vision's "the overlap with adjacent apps is incidental" holds: an app
  having a feature is no reason to build it, and a precedent that breaks a Never line is recorded as a
  counter-example.
- **A script holds it (decision 0174).** `npm run check:docs` fails a spec in `IN_PROGRESS`, or written after this
  decision, that has no such section with an entry naming an app and a source (`scripts/precedent.js`). The specs
  on `main` before it are grandfathered in a list that only shrinks.

## Consequences
- Specs written before the gate on other sessions' branches in flight (open-in-maps-here, shop-marks,
  places-pipeline) are grandfathered whole, `IN_PROGRESS` included, so their rebases do not break. The
  unsaved-captures slice is not: its build adds the section.
- Web access from cloud sessions is limited: a source that cannot be fetched is written "from memory, unverified",
  never cited, and a recommendation resting only on unverified lines says so.

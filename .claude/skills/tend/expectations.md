# Lens 0: the expectation (decision 0234)

`/tend` section 2's first lens, in full. The owner's test: "given this feature, what would I, a user, expect reasonably
to be provided?" Each `/tend` run (one iteration) but a triage applies it before the other lenses, to each feature the
run touches (`scripts/features.js` names): a sweep to its area's features, an inbox build to the feature it builds,
`evolve` to the features it proposes for.

## The store

`docs/expectations/<feature>.md`, one file per feature, changed only through `npm run expectations` (the format and
the operations are in `scripts/expectations.js`'s header). A line, its text on one line:

```
- E-memories-1 [ratified 2026-11-20] A person who wanders a town to notice, using memories, would reasonably expect a capture to come back when they pass its place again.
  Check: memories:"a later walk passing a flagged capture brings it back"
  Grounds: VISION "Who it is for"; adjacent-apps "<the job>" (Day One, Apple Photos)
  Answer: "Ratify as drafted" (the owner, 2026-11-20)
```

- **Observable.** A line says what the person sees or does, and its `Check:` names what shows it: a journey check
  (`<journey>:"<check text>"`), a unit test (`test:"<test name>"`), a picture a journey takes (`picture:<shot name>`),
  or `pending "<what it will show>"` while none exists. `npm run expectations -- check`, run by `check:docs`, fails a
  named check that does not exist.
- **Grounded.** In `docs/VISION.md`, "Who it is for", first, then in how two or three adjacent apps do the job
  (`docs/research/adjacent-apps.md`, verified or not; a source the file lacks is "not yet recorded", and the loop never
  edits `docs/research/`). An app alone is no ground: a precedent informs how, never what (0193).
- **Ratified once, by the owner.** `ratify` and `decline` take `--by owner` and the answer verbatim; never the proxy
  (0157: identity is the owner's). A ratified line never changes: a better one is an `amend`, which stands beside it
  until the owner ratifies it. Five lines at most are in force per feature.

## The steps

1. **What is due.** `npm run expectations -- due <the features the run touches>` names those with no ratified line.
2. **A feature with none: draft.** Write three to five lines in the store's form. The `steward` checks them at the
   run's first review pause (an `evolve` run, before it files) against VISION's Never lines and the persona; a line
   it flags is dropped and named. Then `npm run expectations -- draft <feature> --file <lines>` with the rest. They
   are proposed: used provisionally in this run, and put to the owner to ratify (section 10, step 5: one question per
   feature, its lines grouped, "Ratify as drafted" first; under the orchestrator, its batch).
3. **A feature with ratified lines: test against them.** A line the run finds wrong or thin is answered with
   `npm run expectations -- amend <id> --file <line>`, checked by the steward the same way; never an edit.
4. **Judge each line.** `met` only with evidence: its check exists and passed in this run (the journey ran, the test
   in `npm test`), or, while its check is pending, a picture of it met. `failed` is a defect: a finding (section 3)
   that names the line's id as what it serves. `lacking` is growth: a `G` entry (section 9, source 6) naming the
   workflows it implicates, whose slice gives the line its check (`npm run expectations -- set-check <id> --check …`).
   A loop commit that adds a check a line names fills it the same way.
5. **Record** the lines in the report and the run log, beside the compass's counts: refinement shipped, refinement the
   compass filed low (section 3), the `G` entries lens 0 filed.

   ```
   "expectations":{"lines":[{"id":"E-memories-1","is":"met","evidence":"memories:\"a later walk passing a flagged capture brings it back\""},
     {"id":"E-memories-4","is":"lacking","provisional":true}],"dropped":[{"line":"A person … would reasonably expect …","never":"<the Never row>"}]},
   "compass":{"shipped":2,"filedLow":3,"lensG":["G9"]}
   ```

   `npm run tend:log` refuses a sweep or a build without them, an id the store does not hold, a proposed line not
   marked provisional, and a `met` whose evidence is not its own check (or, while that is pending, a picture).

## What the loop may not do

`check:tend` refuses a loop commit that changes, removes, ratifies or declines a store line: the loop adds proposed
lines and amendments and fills checks. The owner's answer is recorded in a commit of its own, `expectations <feature>:
the owner's answer, <date>`, never a `tend …` commit; in a `/tend inbox` run it is the run's first commit, and the
run's `check:tend` takes `--loop-only`.

## The compass

`node scripts/tend.js compass` reads the run log: per run and in sum, refinement shipped against filed low, lens-0 `G`
entries, and lines met, failed, lacking (ratified) or provisional. Over the last twelve runs that carry it, a falling
share of refinement shipped (or none shipped in the later half) is "the compass is biting"; after twelve runs,
anything else is "the compass is not biting: tighten it"; before, "too early to say". `npm run tend:balance --
--write` keeps the reading in the ledger as `compass`. There is no ten-run checkpoint (the owner): it is read at every
landing.

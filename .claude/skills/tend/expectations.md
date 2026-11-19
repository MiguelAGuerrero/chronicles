# Lens 0: the expectation (decision 0234)

`/tend` section 2's first lens, in full. The owner's test: "given this feature, what would I, a user, expect reasonably
to be provided?" Each `/tend` run (one iteration) but a triage applies it before the other lenses, to each feature the
run touches (`scripts/features.js` names): a sweep to its area, an inbox build to the feature it builds, `evolve` to the
features it proposes for. A run touches the lines of its own area only.

## The store

`docs/expectations/<feature>.md`, one file per feature, changed only through `npm run expectations` (the format and
the operations are in `scripts/expectations.js`'s header). A line, its text on one line:

```
- E-memories-1 [ratified 2026-11-20] A person who wanders a town to notice, using memories, would reasonably expect a capture to come back when they pass its place again.
  Check: memories:"a later walk passing a flagged capture brings it back"
  Grounds: VISION "Who it is for"; adjacent-apps "<the job>" (Day One, Apple Photos)
  Answer: "Ratify as drafted" (the owner, 2026-11-20)
```

- **Observable.** A line says what the person sees or does, and its `Check:` names what shows it: a journey check, by
  the whole message of a `check(` call when that message is a plain string (`<journey>:"<message>"`); a unit test, by
  its whole title (`test:"<title>"`); a shot one of the feature's own journeys takes (`picture:<shot name>`); or
  `pending "<what it will show>"` while none exists. `npm run expectations -- check`, run by `check:docs`, and by
  `check:affected` when a journey or a test changed, fails a named check it cannot find. A check moves to another
  check (`set-check`), never back to pending.
- **Grounded.** In `docs/VISION.md`, "Who it is for", first, then in how two or three adjacent apps do the job
  (`docs/research/adjacent-apps.md`, verified or not; a source the file lacks is "not yet recorded", and the loop never
  edits `docs/research/`). An app alone is no ground: a precedent informs how, never what (0193).
- **Ratified once, by the owner.** A ratified line never changes: a better one is an `amend` (one open at a time),
  which stands beside it until the owner ratifies it. Five lines at most are in force per feature.

## The steps

1. **What is due.** `npm run expectations -- due <the run's area>` prints the area if it has no line at all, or
   "awaiting the owner" if it has proposed lines only.
2. **No line at all: draft.** Write three to five lines in the store's form. The `steward` checks them at the run's
   first review pause (an `evolve` run, before it files) against VISION's Never lines and the persona; a line it flags
   is dropped and named. Then `npm run expectations -- draft <feature> --file <lines>` with the rest. They are
   proposed: used provisionally in this run, and put to the owner (section 10, step 5: one question per feature, its
   lines grouped, "Ratify as drafted" first; under the orchestrator, its batch).
3. **Awaiting the owner:** test against the proposed lines, provisionally; draft nothing more.
4. **Ratified lines: test against them.** A line the run finds wrong or thin is answered with
   `npm run expectations -- amend <id> --file <line>`, checked by the steward the same way; never an edit.
5. **Judge each line.** `met` only with evidence: its own check, which the script finds (it exists and is not todo)
   and which passed in the journeys or the tests this run ran; or, while the check is pending, a picture of it met (a
   shot of the feature's own journeys, or a `.png` under the run's shots folder, named in the log's `shots`). A line
   whose check is todo or missing is `failed` or `lacking`, never met. `failed` is a defect: a finding (section 3)
   that names the line's id as what it serves. `lacking` is growth: a `G` entry (section 9, source 6), filed
   whatever the balance reads and the area's state, whose `Workflows:` line names the existing workflows it implicates;
   its slice refines them in its own criteria (no separate sweep) and gives the line its check
   (`npm run expectations -- set-check <id> --check …`).
   A loop commit that adds a check a line names fills it the same way.
6. **Record** the lines in the report and the run log, beside the compass's counts: refinement shipped, refinement
   the compass filed low (section 3), the `G` entries lens 0 filed.

   ```
   "expectations":{"lines":[{"id":"E-memories-1","is":"met","evidence":"memories:\"a later walk passing a flagged capture brings it back\""},
     {"id":"E-memories-4","is":"lacking","provisional":true}],"dropped":[{"line":"A person … would reasonably expect …","never":"<the Never row>"}]},
   "compass":{"shipped":2,"filedLow":3,"lensG":["G9"]},"shots":"<the run's shots folder>"
   ```

   `npm run tend:log` marks the line `"lens":"0234"` and refuses a sweep, or a run whose range built an entry, without
   them; an id the store does not hold, of another area, or named twice; a proposed line not marked provisional; a
   `met` whose evidence is not its own found check (or, while that is pending, such a picture). The run's JSON never
   carries `date` or `backfilled`: the script writes the date.

## The owner's answer: one flow

A `/tend` run never records an answer to an expectation line. The owner answers the proposed lines the run put to
them, and whoever asked records it, verbatim, in a commit of its own, made in a worktree of its own from `origin/main`
and landed on `main` before or between runs, never inside one:

```
npm run expectations -- ratify|decline <ids> --by owner --date <date> --answer "<the owner's words>"
git commit -m "expectations <feature>: the owner's answer, <date>" (with the session's trailers)
```

Under the orchestrator it is the orchestrator's (its section 2); when the owner answers a run's question directly,
the next session records it the same way before its run. `check:tend`, which CI runs on every push, reads every agent
commit (by its trailers), a loop commit or not: only that answer commit changes a line's status, and only from
proposed to ratified or declined, dated as its subject says, with the line a ratified amendment replaces superseded;
any other agent commit keeps every line's words, status, grounds and answer. The scripts cannot tell the owner from an
agent: an answer is trusted as every recorded answer is under 0157, the owner's words written verbatim from the
question, and the proxy never ratifies.

## The compass

`node scripts/tend.js compass [--runs N]` reads the run log: per run and in sum, refinement shipped against filed low,
lens-0 `G` entries, and lines met, failed, lacking (ratified) or provisional. Until twelve runs carry it, it says "too
early to say". Then, over the last twelve, with at least three refinement findings in each half: a falling share of
refinement shipped (or none shipped in the later half, with refinement in both) is "the compass is biting"; anything
else is "the compass is not biting: tighten it". `npm run tend:balance -- --write` keeps the reading in the ledger as
`compass`. There is no ten-run checkpoint (the owner): it is read at every landing.

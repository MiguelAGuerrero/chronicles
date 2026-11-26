# Lens 0: the expectation (decision 0236)

`/tend` section 2's first lens, in full. The owner's test: "given this feature, what would I, a user, expect reasonably
to be provided?" Each `/tend` run (one iteration) but a triage applies it before the other lenses, to the lines of the
run's area (a sweep's area, or the area of the entry a build builds), or for an `evolve` run of the area it proposes
for. An area is a feature of `scripts/features.js`, and `tend:log` takes no other area's lines.

## The store

`docs/expectations/<feature>.md`, one file per feature, changed only through `npm run expectations` (the format and
the operations are in `scripts/expectations.js`'s header). A line, its text on one line:

```
- E-memories-1 [ratified 2026-11-20] A person who wanders a town to notice, using memories, would reasonably expect a capture to come back when they pass its place again.
  Check: memories:"a later walk passing a flagged capture brings it back"
  Grounds: VISION "Who it is for"; adjacent-apps "<the job>" (Day One, Apple Photos)
  Serves: Return
  Answer: "Ratify as drafted" (the owner, 2026-11-20)
```

- **Observable.** A line says what the person sees or does, and its `Check:` names what shows it: a journey check, by
  the whole message of a `check(` call (`<journey>:"<message>"`), or for a template message its fixed text before the
  first `${`, when that holds 12 letters of words after any leading criterion id or audit name and starts no other
  check of the journey; a unit test, by
  its whole title (`test:"<title>"`); a shot one of the feature's own journeys takes (`picture:<shot name>`); or
  `pending "<what it will show>"` while none exists. `npm run expectations -- check`, run by `check:docs`, and by
  `check:affected` when a journey or a test changed, fails a named check it cannot find. A check moves to another
  check (`set-check`), never back to pending.
- **Grounded.** In `docs/VISION.md`, "Who it is for", first, then in how two or three adjacent apps do the job
  (`docs/research/adjacent-apps.md`, verified or not; a source the file lacks is "not yet recorded", and the loop never
  edits `docs/research/`). An app alone is no ground: a precedent informs how, never what (0193).
- **Serving a verb.** `Serves:` names the VISION verb the line serves (decision 0244), at least one of Earn, Honour
  and Return ("The three verbs"), and no other word, then may say how in a clause after a `;`, on any line. A line
  that upholds an Always line names its feature's verb and says which in its clause (decision 0245):
  `Serves: Earn; upholds "Guidance is structural": a street's card says what it holds`. The `map` feature's verbs are
  Earn and Return, since it spans Explore and Navigate, and the replays: the orchestrator's ruling (decision 0157 proxy,
  Nov 20); no other feature has a ruling, and none is needed where VISION's table names one. A line drafted or amended
  names it, in its own `Serves:` or by `--serves` for each line of the file that names none; `check` fails a proposed
  line without one, and so does `check:tend` on a commit adding one by hand.
- **Serving none: flagged to the owner.** A line the steward finds serving no verb is drafted with the steward's
  reason, `Serves: none; it reads as what map apps have, not what this person needs`, and put to the owner flagged so;
  the owner's decline drops it. A line breaking a Never line is dropped by the run, whatever its `Serves:`.
- **A verb for a line answered before 0244.** It keeps its words: `npm run expectations -- amend <id> --serves <verb>`
  with no `--file` proposes a verb-only amendment (its own words, check and grounds, and the verb); the owner's answer
  supersedes the line with it, one question per feature, as for a draft. Until then `list` names it "awaiting the
  owner's verb". A declined one leaves the line awaiting, and a run may propose another verb. A ratified line the
  steward finds serving none is flagged the same way, `--serves "none; <the steward's reason>"`. The owner's answers
  to that flag: ratify it, and the amendment supersedes the line, in force and marked as serving none by the owner's
  choice; decline it, and the line stands, awaiting a verb; retire the line, which no operation records yet: the store
  has no status that takes a ratified line out of force, so that answer needs one of its own, by a decision, first.
- **A change to the store's form lands first, alone.** CI judges a push with the scripts its base held (records
  audit 19), so a push that teaches `scripts/expectations.js` a new key or form and also writes lines in it is refused
  ("<key> is no key"), and nothing deploys. Push the script change, then the lines, in a push of their own (run 17).
- **Ratified once, by the owner.** A ratified line never changes: a better one is an `amend` (one open at a time),
  which stands beside it until the owner ratifies it. Five lines at most are in force per feature.

## The steps

1. **What is due.** `npm run expectations -- due <the run's area>` prints the area if it has no line at all, or
   "awaiting the owner" if it has proposed lines only.
2. **No line at all: draft.** Write three to five lines in the store's form, each naming the verb it serves. The
   `steward` checks them at the run's first review pause (an `evolve` run, before it files) against VISION's Never
   lines and the persona, and each named verb against VISION's question to ask of it; a line breaking a Never line is
   dropped by the run and named, whatever its `Serves:`; one serving no verb is kept, `Serves: none; <its reason>`,
   for the owner. Then
   `npm run expectations -- draft <feature> --file <lines>` with the rest. They are
   proposed: used provisionally in this run, and put to the owner (section 10, step 5: one question per feature, its
   lines grouped, "Ratify as drafted" first; under the orchestrator, its batch), whose answer is recorded as "The
   owner's answer: one flow" says.
2a. **A walk's reach, whatever is due** (decisions 0238, 0270; `walks.md`). `node scripts/walks.js lens <the run's area>`
   lists the owner's "reached for" notes no line cites yet. Each is drafted as a line of its own, its `Grounds:`
   `VISION "Who it is for"; seen on a walk <day>` as printed, its words checked (`walks.js check --file`), and put to
   the owner first in the feature's question, ahead of the model-drafted lines; with no line at all it is the first of
   the three to five; with five in force it waits, said in the report, for the owner to choose which line to drop.
3. **Awaiting the owner:** test against the proposed lines, provisionally; draft nothing more but a walk's reach (2a).
4. **Ratified lines: test against them.** A line the run finds wrong or thin is answered with
   `npm run expectations -- amend <id> --file <line>`, naming its verb, checked by the steward the same way; never an
   edit.
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

   `shots` is a path: `tend:log` checks the pictures under it and leaves it out of the line it writes. A line's verb is
   in the store, by its id; a line flagged as serving none is logged `"serves":"none"` beside its `is`, and `dropped`
   names a Never line only.

   `npm run tend:log` marks the line `"lens":"0236"` and refuses a sweep, or a run whose range built an entry, without
   them; an id the store does not hold, of another area, or named twice; a proposed line not marked provisional; a
   `met` whose evidence is not its own found check (or, while that is pending, such a picture). The run's JSON never
   carries `date` or `backfilled`: the script writes the date.

## The owner's answer: one flow

A `/tend` run never records an answer to an expectation line: a drafted line is answered by the answer commit, never
`/tend inbox`, and the session that asked the owner makes the answer commit, outside any run and after its run has
landed: the orchestrator in an orchestrated session (its section 2), and a plain `/tend` session asks at its step 5 and then
commits the answer the same way, never inside the run's own commits, always in a commit of its own. It records the
owner's words verbatim, in a worktree of its own from `origin/main`, and lands it on `main` between runs:

```
npm run expectations -- ratify|decline <ids> --by owner --date <date> --answer "<the owner's words>"
git commit -m "expectations <feature>: the owner's answer, <date>" (with the session's trailers)
```

`check:tend`, which CI runs on every push, reads every agent
commit (by its trailers), a loop commit or not: only that answer commit changes a line's status, and only from
proposed to ratified or declined, dated as its subject says, with the line a ratified amendment replaces superseded;
any other agent commit keeps every line's words, status, grounds and answer. The scripts cannot tell the owner from an
agent: an answer is trusted as every recorded answer is under 0157, the owner's words written verbatim from the
question, and the proxy never ratifies.

## The compass

`node scripts/tend.js compass [--runs N]` (N a whole number, 2 at least) reads the run log: per run and in sum,
refinement shipped against filed low, lens-0 `G` entries, and lines met, failed, lacking (ratified) or provisional.
Until twelve runs carry it, it says "too early to say". Then, over the last twelve, a trend is read only when each half
holds three refinement findings at least, and a move counts only when the share of refinement shipped changes by a
tenth and by two findings at least: falling, or nothing shipped in either half, is "the compass is biting"; flat or
rising is "the compass is not biting: tighten it"; fewer findings say "too few refinement findings to say". `npm run tend:balance -- --write` keeps the reading in the ledger as `compass`. There is
no ten-run checkpoint (the owner): it is read at every landing.

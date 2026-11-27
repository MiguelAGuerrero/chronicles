# Known traps: what the gates and tools misread, and what a session cannot do

Facts runs paid for (the orchestrated session of Nov 25-27, 2026), each with what to do instead, so no run spends a
review round rediscovering one. Read it before the run's first commit, and again when a check refuses what looks
right. None of it changes what the loop decides: `SKILL.md` and `ship.md` do. A trap met that is not here goes in the
run's report as friction, facts only; the loop never edits this file.

## The record operations (`npm run records`)

- **An operation stages its sidecar and nothing else, and `tend:log` stages nothing.** `git add` the document and
  the ledger an operation wrote, and `runs.jsonl` after `tend:log`, before the commit (run 6: `inflight add` left
  STATUS unstaged); `npm run check:records -- origin/main..HEAD` after the commit names a document the replay misses.
- **A `<match>` finds a whole item, its sub-bullets included.** `deferred item set` on a sub-bullet's words replaces
  the parent item and every sub-bullet with the body (run 1). To change one sub-bullet, `set` the parent with its
  whole text changed in that one place, or `note` it.
- **`deferred|native item add --file` adds one item:** a second bullet in the file is nested under the first (run
  9). One operation per bullet.
- **`--new` makes its section at the end of the file,** not beside its kin (run 9).
- **`check:records` reads the repository it sits in** (`records.js verify` does not honour `TEND_ROOT`): run it in
  the worktree, never from an extracted copy of main's scripts (run 6).

## The run log and the commit gates

- **`tend:log` reads audit numbers at a subject's start only** (`tend <area> audit 8: …`, `audit 8, audit 9`,
  `audit 8-10`): a number in parentheses or later in the words is not counted, and two commits naming the same
  `audit N` (its fix, then a rule line for it) count it twice (runs 3, 4). One commit per audit number, its rule line
  inside it.
- **`"expectations":"none: <why>"` needs a grown slice whose spec reads `Verdict: no surface`,** and is refused for a
  sweep and for any `T` build. A build whose code is all in another repository grows no slice here and is refused it:
  log its area's lens 0 lines (run 8).
- **`review` has no field** for a finding answered only in the docs or only by a differential: count it where it
  falls (accepted, deferred, rejected) and say which in the report (runs 4, 8).
- **`commits --loop-only`, what CI runs, holds the loop's limits (FORBIDDEN, a named test, a `Source:`) to `tend …`
  subjects only** (`scripts/tend.js`, the `--loop-only` filter): a commit under any other subject that edits the
  scripts or the skills passes them there (run 5's probe, for the owner). Without `--loop-only` the same command
  refuses every non-`tend` commit. The record gate and the expectation and walk-note gates read every agent commit
  either way. A gate passing is no grant: what the loop may touch is section 1's, and a `G` build's process files
  need `ship.md`'s lease ("Open the worktree").
- **`--loop-only` reads none of a `G` build's slice commits,** and no `tend …` commit until the record commit exists
  (run 4): a clean exit before then says nothing about the run's own loop commits.

## Tests

- **`check:test-first` reads text, in the history.** A todo is a literal `{ todo:` or `check.todo(` on the line naming
  the criterion id, or on the line just before it; a shared options constant, or an id further from its call, reads
  as a real test or none (runs 2, 5). Keep the id on the call's own line. It reads each commit of the branch since
  `main`: the todos go in a commit before the code's, never the same one.
- **A tests-first commit whose test imports a module the code commit adds does not load** under `npm test` at that
  commit (run 1); `check:test-first` still counts it, since it reads the text.
- **CI's build job clones 50 commits deep** (`.github/workflows/pages.yml`; only the records job reads the whole
  history). A test that runs `tend.js next`, `balance` or anything reading history on the checkout is green here and
  refuses there, by design (AS6): run 5 turned `main` red for 21 minutes. Such a test builds a scratch repository
  (as `tend.test.ts`'s `repo()` does); reproduce CI with `git clone --depth 50 file://<worktree>`.
- **`main` goes red by the calendar.** A spec in `IN_PROGRESS` (`scripts/features.js`) fails `check:docs` and TG20
  from its eighth day (`scripts/criteria.js`), with no commit. Red at open with nothing landed: read `IN_PROGRESS`'s
  `since` dates first. Renewing or retiring an entry is the owner's (they renewed three on Nov 26).
- **`check:docs` refuses a backticked path that does not exist** in a doc it checks: each skill's `SKILL.md` (not the
  reference files beside it: `scripts/check-docs.js`, `listSkills`), the rules, the agents, DEFERRED and
  NATIVE_UNVERIFIED. Another repository's file (`chronicles-data`'s `src/…`) and a file not yet written are refused
  too: name them unquoted, or as `chronicles-data: <path>` in plain words. A reference file's paths are not checked,
  so check them by hand.
- **Guards that read names, not meaning:** `functionalCoreAudit` reads a `load('pack')`-style string as a package
  name; the PS7 guard flags a data pack's vocabulary spelled outside `src/lib/presence/` (run 4 moved the list there).
- **The skills' wording tests** (`src/lib/__tests__/arch/`) pin phrases; some read the text unflattened, so a phrase
  wrapped across two lines fails them, and a skill file that names a record document by its file name must be listed
  in records audit 14. `records.test.ts` (records, tend, walks) and `bookkeeping.test.ts` (tend, bookkeeping,
  records, walks) copy a fixed list of `scripts/` files into scratch repositories: a module those newly require is
  added to the list. (These bind a build that edits process files, as G7 and G8 did; a sweep edits none.)

## Journeys and pictures

- **Flakes and reds that are not the run's:** `atlas` (look-cancel, and its entries in `scripts/e2e/flaky.json`) and
  `launch` (the Layers click intercepted by "Past the sights"; not in `flaky.json`) fail now and then; `placeoffer`
  PO5 is red on `main` itself (filed). Confirm red at rest, k of n, on both ends (section 10, step 2) before calling
  one the run's.
- **`npm run e2e:baseline` writes `scripts/e2e/flaky.json`,** which a loop commit may not hold (FORBIDDEN: `scripts/`):
  restore it with `git checkout -- scripts/e2e/flaky.json` before committing, and name the flake in the report.
- **The harness's base-map streets are an inline GeoJSON source built at start-up** (`scripts/e2e/harness.js`,
  `style`): a scene's streets reach the base map only by joining that source (as `edgeStyle` does for G5's scene),
  not by tiles served later.
- **MapLibre evaluates a `fill-pattern` expression at whole zooms only** (`.claude/rules/walkability.md`): a look
  that changes with zoom is pictured between whole levels too.

## Looks, questions and claims

- **A look is chosen from pictures of its worst case,** not only its best: the read's edge, a zoom between whole
  levels, the longest text, the degenerate geometry. G5's approved fade already showed the cut the auditor found. A
  mock-up or a look pause shows candidates side by side, each with its worst case beside it.
- **Check a question's premise in the code before it goes to the owner,** and any claim passed on from another run
  in the file it names: the area card's "On foot" section, asked about as drawing the car icon, is words only
  (`AtlasCard.tsx`); two NATIVE_UNVERIFIED lines said to read 44 pt named no size. The owner answers what they are told.

## Data and second repositories

- **A data build is read by its log lines, not its green status:** which sources were ticked, each extract's
  answer or fallback ("using <older build>"), and "Not published". Two green manual builds (Nov 26-27) published no
  fixtures pack: Wikidata was ticked too, and OpenStreetMap fell back whole. `/data-build` holds the rest.
- **A manual workflow dispatch is the owner's click:** the session's GitHub app is refused (403 "Resource not
  accessible by integration"). The skill the owner typed asks them; a run called by another skill says so in its
  "Stopped on" and its caller asks. Never route around it.
- **A push to `chronicles-data`** is under `ship.md`'s grant paragraph: only when the owner names that repository.

## The session: restarts and refusals

- **Restarts** (about eight in two days) keep the worktree and its commits, not the rest (section 0, step 3); the
  scratchpad path may change: keep the one the run started with.
- **A reviewer cut off by a restart left no report:** a transcript of tool calls is not a report. Rerun the same
  prompt pinned to the committed range it reviews (`<base>..<sha>`), so the run can keep working meanwhile (twice:
  a G13 steward, a G5 auditor).
- **The auto-mode classifier refuses some actions** (relaying "the owner approved" to a subagent, fetching a signed
  artifact URL, `git checkout` over uncommitted new files, removing a stray file). Never route around it: the skill
  the owner typed asks them; a run called by another skill reports it in "Stopped on" for its caller to ask. The
  proxy also refuses remote branch deletion: `ship.md`, "Clean up", step 4.
- **The session's skill list may name copies scoped to worktrees that are gone:** read the skills from the run's own
  worktree.

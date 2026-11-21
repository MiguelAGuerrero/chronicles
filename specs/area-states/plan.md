# Area states: the plan (AS1-AS9)

Built under `/tend inbox G6 yes` (`/slice area-states --from=G6`): read by the steward, not held for the owner. No screen,
no stored field, no dependency, no native code. Nothing here is shown in the app (decision 0020).

## What the script reads, and what it computes

All of it in `scripts/tend.js`: the decisions pure and exported for the tests, git and the files read in `main()` as now.

**The inputs of an area's state** (AS1, AS2), each from what the repo already holds:

| Input | From | Note |
|---|---|---|
| its sweeps, oldest first: date, base, whole, `found.loop`, `shipped`, `expectations` | the run log (`runs.jsonl`), lines of mode `sweep` naming the area | no new field (the entry's "Build beside 0236") |
| open above low, by the log | the latest sweep: `found.loop.high + found.loop.medium` minus its distinct `shipped` numbers, floored at nought | J1 |
| open above low, by the ledger of what waits | `[loop]` items of `docs/DEFERRED.md` attributed to the area and rated medium or high by their words | J1 |
| a failed expectation line | the latest sweep's `expectations.lines`, `is: "failed"` | keeps it from `polished` (J2) |
| its `[owner]` and `[arch]` entries waiting | `docs/STATUS.md`, every `T` entry whose `Area:` line names the area, `[phone]` apart | answered or not: both wait |
| resets (decision 0229) since its latest sweep, and between each two whole sweeps | git, `resetsArea` over the commits from a sweep's `base` on, the loop's own left out (as `changesByArea` does now) | |
| a screen with no journey | route files the area owns (`isRoute`) that no journey's `covers` matches (`scripts/e2e-scenarios.js`) | |

**The state** (`areaState`, pure), in this order:

1. never swept in the run log: `unseen` (AS1b; not one of `STATES`, shown apart);
2. a reset since its latest sweep: `rough`;
3. the ledger says `resting`: `resting` (AS1b; only a reset ends it);
4. three or more whole sweeps at its tail with no reset between them: `settling` at least (AS2), then on to 6;
5. anything open above low: `rough` (AS1);
6. its latest sweep whole, nothing above low open, no failed line, no entry waiting, a journey for every screen:
   `polished`; otherwise `settling`.

Each state comes with its reason in words ("two mediums open", "a change since its sweep added a control", "three
whole sweeps", "entries T42, T43 wait"), printed beside it.

**The balance** (`balance`, AS3, AS4, AS7): the areas by computed state, the unseen apart, the rough share, the open
items read whole, the loop's last `G`, and the reading:

- **outgrowing its base**: more than half of the areas swept twice or more are rough, and more than three areas are
  (J3); or more than ten unanswered `[owner]` and `[arch]` entries (J4); or a red `main` (which it cannot see, as now);
- **settling**: no slice grew in the window;
- **in step**: otherwise;
- and beside the reading, whatever it is: **evolve** `<area>` when no run of the log filed a `G` in the last fourteen
  days (counted from the log's first line) and some area is settling or polished (J5).

`--write` keeps it in the run's ledger as now, and the ledger's `areas.<a>.state` becomes the script's (AS1): `tend:log`
writes it (below), and the balance reads the computed state, never the ledger's word, except for `resting`.

**`next`** (AS4, AS6): the evolve area first (`evolve <area>`), then as now: the area a change reset most, then a
computed rough, then a computed settling area.

**`tend:log`** (AS1): for a sweep it computes the area's state from the run's own worktree (its new line included, the
documents as the run left them, resets in `<base>..HEAD` that are not the loop's own) and writes it as the line's
`state.to` and the ledger's `areas.<area>.state`; a given `state.to` that differs is refused with the computed state and
its reason. `state.from` stays the run's.

**`node scripts/tend.js state [<area>…] [--here] [--at <commit>] [--fixture <file>]`** (new): each area's state and
reason; `--here` reads this checkout's documents (the run's record), `--at` main's at a commit (the replay), `--fixture`
writes the inputs it read to a file (how AS8's fixture is made).

**`node scripts/tend.js base <area>… | --spec <slug>`** (AS5): for each area (or each feature listing the spec), "lands
on a rough base" and its open medium and high items (their first line), or "<area> is <state>: nothing above low open";
always exit 0. `/slice` step 1 runs it and puts the lines in the plan; step 9 runs it again and the spec's record says
"left <area> no rougher" or what is now open above low that was not.

**The shallow guard** (AS6, AS6b): `balance` and `next` exit 1 with the reason when the clone is shallow and its
boundary is newer than the window's start, or a sweep base the reading needs is cut off by it. On a whole history a
sha that does not resolve is named on stderr once, and the area is read from its window, as now.

**The inbox read whole** (AS7, `readInbox`): every bullet under "## Needs the owner", by its `###` section, each with its
id (`T`/`G` or none), tag, areas, and whether an answer is noted on it ("the owner's yes", "Answered", "in person");
"Last tend" is the last run's digest, not an item, and is left out. The balance prints `inbox: { items, unanswered,
phone, bySection }` beside the old `open`.

## Judgement calls (the steward rules on these; none changes a criterion's words)

- **J1. What "open above low" reads.** The run log does not hold the severity of each shipped finding, nor of what a
  review deferred. The plan reads the log's latest sweep as `high + medium − distinct shipped` (sound when the run
  shipped by severity, as section 3 orders, and the review deferred only lows, as the faster lane does), and DEFERRED's
  `[loop]` items rated medium or high by their own words, attributed to an area by the `tend <area>` they name, else by
  their section heading's `/tend <area>`; it takes the larger of the two counts (each a floor of what is open; the
  log's unshipped mediums are DEFERRED's items, so they are not added). At `42d3ccd8`: 128 `[loop]` items, 26 with no
  severity word (read as not above low and listed apart as "unrated"), 47 with no area by either rule (listed apart as
  "unattributed"); two medium items unattributed (`fix mark-overlap`'s F5, the mention picker). **This is data the run
  log does not hold**: the replay reads `docs/DEFERRED.md` and `docs/STATUS.md` as main held them, and git; nothing is
  invented, and what cannot be attributed or rated is printed, not guessed.
- **J2. Lows do not block `polished`.** Decision 0235 says both "only lows open … is settling" and "a whole sweep that
  leaves nothing above low open, with a journey for every screen, is polished"; section 8's old table had polished as
  "found nothing above low". Read together: polished is the whole, covered case of nothing above low; settling the
  rest. A failed expectation line (a defect against the area's own line, decision 0236) and a waiting entry keep it
  settling.
- **J3. The share's line.** Decision 0235 sets no share. Starting value: outgrowing when more than half the areas swept
  twice or more are rough, and more than three areas are (the old `LIMITS.rough`, kept so a share of two or three cannot
  trip it). An area's first sweep shows its state and enters the share at its second, so a first sweep cannot raise the
  alarm by itself (AS3, F3). Tuned by the owner from the run log (0235, Consequences).
- **J4. AS7 against "Done when".** Read whole at `42d3ccd8`, "Needs the owner" holds 81 bullets: "Last tend" 8, "Open
  before the loop" 40, From /tend 11 (4 `[phone]`, T41-T48 answered), 22 in the other "From …" sections and "Next
  evolutions". Unanswered, phone and "Last tend" apart: 49 (22 without "Open before the loop"). Counted into the
  reading against the old line of ten, the balance reads outgrowing at Nov 19 whatever the states, and G6's own "Done
  when" cannot hold. The plan reads AS7's words as written, "reads every item": the balance reads and prints them all
  (`inbox`), and the alarm keeps section 8's words, "more than ten unanswered `[owner]` and `[arch]` entries", the `T`
  entries with no answer noted (one at Nov 19, T11). If the steward or the orchestrator reads AS7 as the alarm counting
  every item, the criteria conflict and that is the owner's: the build stops here and files it (the brief's "the whole
  inbox counts" with expiry in G7 suggests the owner meant G7's expiry to bring the count down).
- **J5. Evolve whatever the reading.** Decision 0235 states the fourteen-day actuator unconditionally ("acts both
  ways"); section 8's "outgrowing: filing no new `G`" would mute it. The plan lets it act in any reading, for a settling
  or polished area only (never on a rough base), polished first, then the one swept longest ago, ties by name; it files
  at most one `G`, held to section 9's three. At Nov 19 the last loop-filed `G` was Nov 11 (G4): not due.
- **J6. The shallow guard's test** is the clone's own state (`git rev-parse --is-shallow-repository`, the boundary's
  dates), so a whole history with one bad sha (presence's `bfb60fdb…`, 39 characters) still answers (AS6b). The
  `fatal: Not a valid object name` noise is that sha: `sweptAt` reads it with stderr inherited; it will be read quietly
  and named once.
- **J7. Lens 0 for a process build.** `tend:log` requires `expectations` of a build (decision 0236: `held` when the
  range's subjects carry criteria), and this build's commits carry `AS…`; its area, the loop, is no feature and has no
  store, so the run's record will be refused as the script stands (`a sweep or a build logs its expectations`). The
  slice does not change that on its own: it would loosen a refusal beyond G6's criteria (the brief's tripwire). **A
  call for the orchestrator, and the owner's if it is a loosening**, before the record commit. Recommended: `tend:log`
  takes, for a build whose `area` is no feature of `scripts/features.js`, `"expectations":"none: <why>"` in place of
  lines (lens 0 is about what a person expects of a feature; the loop is none), refused for any feature's build as
  now; one test, named for it. Otherwise: the record commit leaves the run log's line out and says why in "Last tend"
  (section 10 asks a line of every run), or the run is logged by hand by the owner.
- **J8. The replay's fixture** is made by the new `state --at 42d3ccd8 --fixture`: the run log's 66 lines to Nov 19,
  DEFERRED's headings and `[…]`-tagged bullets, "Needs the owner", and per area the resets and uncovered screens git
  gave; about 250 KB. CI's test job clones 50 commits deep, so the test reads the file, never git.

## Files

- `scripts/tend.js`: `areaState`, `openFromLog`, `deferredItems`, `readInbox`, `shareReading` (in `reading`),
  `evolveDue`, `historyProblems`, `baseWarning`; the commands `state` and `base`; `balance`, `next` and `log` as above.
  Exports kept; `reading`'s old inputs still work (`rough` with no `swept` reads as before).
- `src/lib/__tests__/arch/areaStates.test.ts` (new), `areaStates.replay-1119.json` (new fixture).
- `.claude/skills/tend/SKILL.md`: section 0 (the guard), 3 (a backstopped area's lows go to DEFERRED, not found
  again), 8 (the states computed, the table, the reading by shares, the evolve actuator, the inbox read whole), 9 (the
  evolve trigger), 10 (`tend:log` writes the state).
- `.claude/skills/slice/SKILL.md`: step 1 ("lands on a rough base"), step 9 (the record's "no rougher" line).
- `.claude/skills/tend-orchestrator/SKILL.md`: section 0's stop rule and section 2.4 (`next` may say `evolve <area>`).
- `scripts/features.js`: `area-states` in `arch`'s specs and in `IN_PROGRESS` while built.
- `docs/research/tend-process-review.md`: its `Status:` line, "G6 built in area-states; G7 queued" (slice, `--from`).
- Records through `npm run records`: the "In flight" row, then the "Slices" row; G6 out of "Next evolutions" at the
  run's record.

Not touched: `docs/VISION.md`, any decision (no owner's call is made here; J1-J8 are the steward's and the
orchestrator's to rule, and their rulings go in the spec's Decisions), `FORBIDDEN`, `scripts/records.js`, the
`commits` gate, test-first, any baseline, `package.json`.

## Tests per criterion (`areaStates.test.ts`)

| Id | Test |
|---|---|
| AS1 | `AS1: an area's state is what is left open` (medium open: rough; lows only: settling; whole, covered, nothing open: polished; a reset: rough; the log's line takes `state.to` from the script and refuses another) |
| AS1b | `AS1b: never swept reads unseen; resting stays until a reset` |
| AS2 | `AS2: three whole sweeps with no reset between them make an area settling at least` (and a reset between breaks the run) |
| AS3 | `AS3: rough is a share of the areas swept twice; a first sweep cannot raise the alarm by itself` |
| AS4 | `AS4: fourteen days with no loop-filed G and a settling area: evolve it, and next says so` |
| AS5 | `AS5: base names a rough base's open medium and high items, and never blocks` |
| AS6 | `AS6: a shallow history whose boundary is inside the window refuses` |
| AS6b | `AS6b: a bad sha on a whole history is named, and the area read from its window` |
| AS7 | `AS7: every item under Needs the owner is read, Last tend apart` |
| AS8 | `AS8: the Nov 11-19 log replayed: walk-screen settling, the balance not outgrowing` |
| AS9 | `AS9: tend sections 0, 8 and 9, slice step 1 and the orchestrator's stop rule say the same` |

Each written as a todo first and committed alone (`Area states: tests first (AS1-AS9, failing)`), then made real with
its code.

## The testing's size

**Small** (`docs/TESTING.md`, "Size the testing to the change"): no screen, no journey covers `scripts/tend.js`; typecheck,
lint, `npm test`, `check:docs`, `check:test-first area-states`, and the scripts run on this repo (`balance`, `next`,
`state`, `base`, `commits --loop-only`). `launch` as the run's smoke before publishing (`/tend` section 10).

## Deferred

G7's half of 0235 (the review budget, rotation onto unseen areas, the answer log, expiry, the lease, numbers at publish);
a `Kind:`-style meter of process work (not chosen, 0235); attributing DEFERRED's unattributed and unrated items (they are
printed; filing them by area and severity is a triage's job).

## Native

None.

## Cost

`balance` and `next` read git once per swept area since its sweep (as now) and once per pair of its whole sweeps: ten
areas, a few sweeps each, one batched `git log -p` limited to `src/*.tsx` and `src/app`. DEFERRED and STATUS are read
once (about 350 KB). No per-frame or per-fix work; nothing in the app.

## Screens

None: nothing a person sees changes.

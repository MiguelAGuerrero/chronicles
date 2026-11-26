# Walk notes: the plan (WN1-WN9)

Built under `/tend inbox G8 yes` (`/slice walk-notes --from=G8`): read by the steward, not held for the owner. No screen,
no stored field of the app, no dependency, no host, no native code. Nothing here is shown in the app (decision 0020).
This build makes `/walked` and never invokes it, and writes no real walk note: every note in a test is invented and
names no real place.

**The base it lands on** (slice step 1.5): `node scripts/tend.js base --spec walk-notes` names `arch`, which no sweep
reads: no area of the app is touched.

**Today's scripts** (read against the entry, filed Nov 20, before G6 and G7 landed): `next` is now `nextPick` (LB2's
two turns, decision 0269) over the states `areaState` computes (G6, decision 0250); the run log's answers carry `by`,
`pick` and `words` (LB3); a G slice's own review is outside the budget (0269); expectation lines are proposed by
`npm run expectations -- draft` and answered only by the owner's answer commit (`ratify --by owner`, decision 0236);
the orchestrator's insights are `orchestration-insights.md` (its section 9); `records audit 14` is a test in
`src/lib/__tests__/arch/records.test.ts`.

## Files

| File | What changes |
|---|---|
| `.claude/skills/walked/SKILL.md` (new) | WN1-WN3, WN3b: the owner's skill, `disable-model-invocation: true` |
| `scripts/walks.js` (new, plain Node like `records.js`) | WN4, WN4b: `add --file`, `list`, `lens <area>`, `areas`; the pure checks (`placeProblems`, `noteProblems`, `appended`), `openInTheWay`, `lensNotes`, `walkReading` |
| `scripts/tend.js` | WN6 a walk turn first in `nextPick`, fed by `documentsFrom`'s `walks`; WN8 `walks` in `balanceJson`; WN4c the append-only gate in `commits`; `PROCESS` leaves `walks.jsonl` out (no lease for a note); a `FORBIDDEN` line for `arch/walks.test.ts` |
| `scripts/features.js` | `walk-notes` in `arch`'s specs; `IN_PROGRESS` while built |
| `.claude/skills/tend/walks.md` (new) | how `/tend` reads the notes: lens 0 (WN5), `next` (WN6), the triage (WN7), the report (WN8) |
| `.claude/skills/tend/SKILL.md` | two lines point to `walks.md` (lens 0; the report); at 498 of 500 lines, no new paragraph |
| `.claude/skills/tend/expectations.md` | step 2: a walk's reach is drafted even where the area has lines, put first |
| `.claude/skills/tend-orchestrator/SKILL.md` | section 9: the insights carry the balance's walk line, once |
| `.claude/skills/README.md` | `/walked`'s row; `walks.jsonl` in "State lives in files" |
| `src/lib/__tests__/arch/walks.test.ts` (new) | WN1-WN5, WN7, WN9 and the implied states |
| `src/lib/__tests__/arch/tend.test.ts` | WN6 (`nextPick`, `next` on a scratch repository), WN8 (`balance`) |

Three source files under `scripts/`, no `src/` file.

## What each criterion builds

**WN4, the note and the place check** (`scripts/walks.js`). A line of `.claude/skills/tend/walks.jsonl` is
`{"day":"YYYY-MM-DD","area":"<feature or app>","kind":"reached for"|"got in the way"|"keep","words":"…"}`, keys in that
order and no other. `add --file <lines>` reads one JSON object per line, checks every one, and appends them all or none
(`fs.appendFileSync`, never a rewrite). A refusal names each line and the words that tripped it, with the fix ("say it
without the place: 'a busy street', not its name"). `list [--days N] [--area A] [--kind K] [--json]` reads the window
(14 days by default, today included). `areas` prints the names a note may take, with each feature's `about`.

`placeProblems(words, towns)`, pure, over the words as written:

- **a town of the gazetteer**: the shipped pack's `names` and `ascii` (not `alts`, which hold "the", "and", "it"),
  folded as `src/lib/gazetteer/normalize.ts` folds (case, diacritics, punctuation; Saint is St). A single-word town
  trips when the word is capitalised as written; a town of several words when any of its words is (J1);
- **a street**: a capitalised name or an ordinal (`5th`) before a street word (Street, St, Road, Rd, Avenue, Ave, Lane,
  Boulevard, Drive, Way, Square, Court, Terrace, Crescent, Close, Alley, Highway, Parkway, Circle, Quay, Wharf, Mews,
  Place, Row, Embankment; any case), a determiner apart ("The Way"); a capitalised street word before a capitalised
  name (Rue, Calle, Via, Avenida, Piazza, Plaza, Praça, Strada, with `de`, `del`, `di`, `du`, `des`, `la`, `le` between);
  a capitalised word ending in a street word of its own language (strasse, straße, gasse, weg, platz, allee, ufer,
  gracht, straat, laan, plein, gatan, katu, utca), its stem three letters at least;
- **coordinates**: a number with three decimals or more, a degree sign after a number, a plus code, `lat`, `lng`,
  `lon`, `latitude` or `longitude` before a number, a `geo:` link;
- **a time of day**: a clock time (`7:30`, `14h30`), am or pm after a number, o'clock, `hours` after four digits, and the
  words for a part of the day (morning, afternoon, evening, night, tonight, midnight, noon, midday, dawn, dusk,
  sunrise, sunset, twilight, daybreak, nightfall, lunchtime, dinnertime);
- **a link** (WN4b): `http`, `https` or `www.`, since a map link carries a place.

`noteProblems(note, { areas, today, towns })` adds WN4b's area, kind, day and words checks.

**WN4c, CI** (`commits`). For every agent commit of the range (`isAgent`, as the record gate and the expectation store
read them) that touches `walks.jsonl`: the file before is a prefix of the file after, ending in a newline or empty; no
delete or rename; each added line passes `noteProblems` (the day checked against the commit's own date). The pack is
read once per run of `commits`, and only when a commit touches the file. A loop commit never may touch it: `FORBIDDEN`
already holds `.claude/skills/` but the ledger and the run log.

**WN6, `next`** (`nextPick`). `openInTheWay(walks, runs, areas)`, pure: the "got in the way" notes whose area is one the
loop sweeps (`verbs`' keys: a feature but `arch`; never `app`) and that no sweep of that area follows, a sweep following
when its run-log date is after the note's day (J5). The oldest note's area first, then by name. When there is one,
`nextPick` answers it before either turn and before a due evolve: `{ area, turn: 'walk', why: "a walk note of <day>
found <area> in the way, and no sweep of it has run since" }`. `next` reads the notes as `origin/main` holds them,
beside the run log (`documentsFrom(...).walks`).

**WN5, the lens** (`walks.js lens <area>`, `lensNotes`, pure). The area's "reached for" notes that no line of
`docs/expectations/<area>.md` cites yet: a line cites a note when its `Grounds:` holds `seen on a walk <day>`, one line
for each such note of that day (J8). For each it prints the grounds to write, `VISION "Who it is for"; seen on a walk
<day>`, which `expectations.js`'s `GROUNDS` already takes, so the store's form does not change. `expectations.md`
step 2: lens 0 drafts a line for each, even where the area has lines, puts them to the owner first (one question per
feature, the walk's lines first in it), and a reach that the five in force leave no room for is said in the report.
"Never ratified by the proxy" is already so for every line: `ratify` and `decline` refuse `--by proxy` (decisions 0157,
0236), and no `/tend inbox` answers a line.

**WN7, keep** (`walks.md`, the triage). Lens 0 lists the area's keep notes (`walks.js list --area <area> --kind keep
--days 3650`: a keep holds until the owner says otherwise); a finding whose change would alter what a keep names is
filed `[owner]`, quoting the keep, never shipped. Tested as the skill's words and `list`'s filter.

**WN8, silence** (`walkReading(walks, today, 14)`, pure, in `balanceJson` as `walks`). By kind, each note's day and area
in the window, never its words (the ledger keeps the balance); `last`, the latest note's day; `silence`, "no walk note
has come in for 14 days" when the window holds none and an older one exists, "no walk note yet" when none exists, else
null. `/tend`'s report says the silence once, in the balance's sentence; the orchestrator's insights say it once.
Nothing else reminds.

**WN1-WN3, `/walked`** (`.claude/skills/walked/SKILL.md`). The owner's: `disable-model-invocation: true`, run only when
typed. In a worktree of its own from `origin/main` (`walked/<day>`, no time in the name), it:

1. takes what the owner gave: a sentence, dictation, a screenshot (read for what it shows, never saved or committed);
2. sorts it into the three kinds, each with an area (`node scripts/walks.js areas`; `app` when none fits), and rewrites
   every place and time out of the words in the app's terms ("a busy street", "the car park by a station");
3. asks once, in one round, about the kinds the line did not say, each with "nothing" (WN2); no second round;
4. shows the owner each line exactly as it will be stored and stores only on their yes (WN3);
5. runs `walks.js add --file`; a refusal is rewritten without what tripped it and shown again;
6. commits `walks.jsonl` alone, its message "walked: a note of <day>" naming no words, both dates `<day>T00:00:00Z`
   (WN3b), runs `node scripts/tend.js commits --loop-only origin/main..HEAD`, and pushes `HEAD:main` as a fast-forward
   (typing `/walked` is the owner's go-ahead for that one commit; refused, it fetches, rebases and pushes once more);
7. removes its worktree.

It names no record document, so `records audit 14` lists it neither as a writer nor a reader; a test holds that.

## The judgement calls (for the steward)

- **J1 · A town trips when written as a name.** Lowercase "paris" passes the town check (dictation and the skill's own
  words write names capitalised; the owner reads every line). Recommended over matching every word, which would refuse
  "of", "to" and "time"; over a dictionary, which would be a dependency.
- **J2 · The day only, in the commit too.** The note's commit carries `<day>T00:00:00Z` as both dates. The time the push
  reaches GitHub (the push event, the Pages run) is still public, and close to the walk's end: filed `[owner]` in
  `docs/DEFERRED.md` ("hold a note for the next push?"), not built (no criterion names it).
- **J3 · `/walked` pushes to `main` itself.** A note must be on `main` for the next `/tend` to read it; typing `/walked`
  is the go-ahead for its one commit, which CI judges like any agent commit.
- **J4 · CI judges agent commits only**, as the record gate and the store do (decisions 0156, 0236): the owner's own hand
  edit of `walks.jsonl` is left alone.
- **J5 · "Since" by date.** A sweep the same day as the note does not clear it (a note has no time to order by); the
  cost is at most one more sweep of that area.
- **J6 · A note needs no lease.** `walks.jsonl` is the owner's, not a procedure: `PROCESS` leaves it out beside the run
  log and the ledger, so `/walked` never waits on a run's lease.
- **J7 · The test that holds the gate is the loop's to leave alone.** `src/lib/__tests__/arch/walks.test.ts` gets its
  own `FORBIDDEN` line, as `records`, `tend` and `expectations` have theirs (records audit 15).
- **J8 · One line per walk's reach, by its day.** A line cites a note by `seen on a walk <day>`; two reaches of one area
  on one day need two such lines.
- **J9 · `app` notes move nothing.** A reach or an in-the-way note with `app` has no store file and no sweep: the
  balance lists it by day and kind for the report, and the owner.

## Tests per criterion

| Id | Test (`src/lib/__tests__/arch/`) |
|---|---|
| WN1 | `walks.test.ts` "WN1: /walked is the owner's, sorts into the three kinds, each with an area or app" (the skill's frontmatter and words; `areas` prints every feature and `app`) |
| WN2 | `walks.test.ts` "WN2: /walked asks once, about what is missing, with nothing an option; one kind is a whole note" |
| WN3 | `walks.test.ts` "WN3: /walked shows the stored words first, commits no screenshot, and dates the commit by the day" |
| WN4 | `walks.test.ts` "WN4: add appends a clean note and refuses a street, a town, coordinates or a time of day with the words that tripped it; list reads the window" |
| WN5 | `walks.test.ts` "WN5: a reach not yet cited is put to the lens, grounded seen on a walk <day>, which the store takes" |
| WN6 | `tend.test.ts` "WN6: a got-in-the-way note puts its area first in next until a sweep after its day" |
| WN7 | `walks.test.ts` "WN7: a keep is listed for the triage, which files a change to it [owner]" |
| WN8 | `tend.test.ts` "WN8: the balance says once when no note came in for 14 days, and nothing else reminds" |
| WN9 | `walks.test.ts` "WN9: the skills map names /walked, and records audit 14's lists need no row for it" |

The implied states go in the same files, named by their ids (WN4b, WN4c, WN3b, WN6b, WN8b). The command-line halves run
in a scratch git repository (`next`, `balance`, `commits`), never on this checkout (AS6).

## Testing's size

None for the e2e (no screen); `launch` alone as the smoke (`.claude/skills/ship.md`, "The faster lane"). Unit:
`npm run test:affected` while building, `npm test` once at the end.

## Cost

`add` and `commits` read the pack (5.6 MB, 70,042 towns) once per call, about a tenth of a second, only when a note is
added or a commit touches the file; folding its names into two sets is O(n). `next` and `balance` read `walks.jsonl`,
tens of lines a month, against the run log: O(notes × sweeps), negligible. Nothing runs in the app.

## Deferred

The push's time on GitHub (J2). "Settled after three walks" (the entry's "After it"). A note in lowercase naming a
town (J1), left to the skill's rewrite and the owner's look.

## Native

None.
